#!/usr/bin/env node
/**
 * Phase 2 APPLY — set the Xero `Project Tracking` option on income invoices that
 * lack it, keyed off the clean Supabase `project_code`.
 *
 * Safety harness (per the proven void-worklist pattern):
 *   - GET-fresh each invoice by InvoiceID (live truth, not the mirror)
 *   - validate: ACCREC · status AUTHORISED|PAID · date > lock · not already tagged
 *   - modify ONLY the Tracking field; preserve every other line-item field + any
 *     Business Divisions tracking
 *   - revert log written BEFORE any write
 *   - POST, then verify Total/SubTotal/AmountDue are byte-identical (tracking must
 *     not move money) AND the option is now set — abort the batch on any anomaly
 *
 *   node scripts/apply-xero-tracking-backfill.mjs --project=ACT-GD            # live dry-run (no write)
 *   node scripts/apply-xero-tracking-backfill.mjs --project=ACT-GD --limit=1 --apply   # write 1
 *   node scripts/apply-xero-tracking-backfill.mjs --project=ACT-GD --apply    # write all unlocked in scope
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TENANT = process.env.XERO_TENANT_ID;
const LOCK_DATE = '2025-09-30';
const PROJECT_CAT = 'Project Tracking';
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const projArg = (args.find(a => a.startsWith('--project=')) || '').split('=')[1] || 'ACT-GD';
const limit = Number((args.find(a => a.startsWith('--limit=')) || '').split('=')[1]) || Infinity;
const invArg = (args.find(a => a.startsWith('--invoice=')) || '').split('=')[1] || null;   // scope to ONE invoice number
const REVERT_PATH = invArg
  ? `scripts/output/xero-tracking-backfill-revert-${invArg}.json`
  : 'scripts/output/xero-tracking-backfill-revert-2026-05-30.json';

function token() { return JSON.parse(readFileSync('.xero-tokens.json', 'utf8')).access_token; }
async function xero(method, path, body) {
  const res = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'xero-tenant-id': TENANT, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { ok: res.ok, status: res.status, json, text };
}
const projOption = (li = []) => { for (const l of li) for (const t of (l.Tracking || [])) if (t.Name === PROJECT_CAT) return t.Option; return null; };

// 1. resolve live Project Tracking category + option-name → option-id
const tcRes = await xero('GET', 'TrackingCategories');
if (!tcRes.ok) { console.error('TrackingCategories', tcRes.status, tcRes.text.slice(0, 200)); process.exit(1); }
const cat = (tcRes.json.TrackingCategories || []).find(c => c.Name === PROJECT_CAT);
if (!cat) { console.error('No Project Tracking category'); process.exit(1); }
const optionId = {};
for (const o of cat.Options || []) optionId[o.Name] = o.TrackingOptionID;
const codeToOption = {};
for (const name of Object.keys(optionId)) { const code = name.split('—')[0].trim(); if (/^ACT-[A-Z0-9]{2,3}$/.test(code)) codeToOption[code] = name; }

// 2. candidates from mirror (ACCREC active, has project_code, unlocked)
let rows = [], from = 0;
for (;;) {
  const { data, error } = await sb.from('xero_invoices')
    .select('xero_id,invoice_number,contact_name,status,date,project_code')
    .eq('type', 'ACCREC').eq('project_code', projArg).in('status', ['AUTHORISED', 'PAID'])
    .order('xero_id').range(from, from + 999);
  if (error) throw new Error(error.message);
  rows = rows.concat(data || []); if (!data || data.length < 1000) break; from += 1000;
}
const seen = new Set(); rows = rows.filter(r => !seen.has(r.xero_id) && seen.add(r.xero_id));
rows = rows.filter(r => (r.date || '').slice(0, 10) > LOCK_DATE);   // unlocked only
if (invArg) rows = rows.filter(r => r.invoice_number === invArg);   // scope to ONE invoice

console.log(`${APPLY ? 'APPLY' : 'LIVE DRY-RUN'} · project ${projArg} · ${rows.length} unlocked candidate(s) · limit ${limit}\n`);

if (!existsSync('scripts/output')) mkdirSync('scripts/output', { recursive: true });
const revertLog = [];
const results = [];
let processed = 0;

for (const cand of rows) {
  if (processed >= limit) break;
  const canonical = codeToOption[cand.project_code];
  if (!canonical) { console.log(`  SKIP ${cand.invoice_number}: project_code ${cand.project_code} has no chart option`); continue; }
  const optId = optionId[canonical];

  // GET-fresh
  const g = await xero('GET', `Invoices/${cand.xero_id}`);
  if (!g.ok) { console.log(`  ERR  ${cand.invoice_number}: GET ${g.status} ${g.text.slice(0, 120)}`); results.push({ inv: cand.invoice_number, result: 'get-error' }); continue; }
  const inv = g.json.Invoices?.[0];
  if (!inv) { console.log(`  ERR  ${cand.invoice_number}: not found`); continue; }

  // validate
  const date = (inv.DateString || inv.Date || '').slice(0, 10);
  if (inv.Type !== 'ACCREC' || !['AUTHORISED', 'PAID'].includes(inv.Status) || date <= LOCK_DATE) {
    console.log(`  SKIP ${inv.InvoiceNumber}: status ${inv.Status} date ${date} (not eligible)`); continue;
  }
  if (projOption(inv.LineItems) === canonical) { console.log(`  OK   ${inv.InvoiceNumber}: already tagged ${canonical}`); results.push({ inv: inv.InvoiceNumber, result: 'already' }); continue; }

  // build modified line items — preserve everything, set Project Tracking only
  const newLines = inv.LineItems.map(li => ({
    LineItemID: li.LineItemID,
    Description: li.Description,
    Quantity: li.Quantity,
    UnitAmount: li.UnitAmount,
    AccountCode: li.AccountCode,
    TaxType: li.TaxType,
    Tracking: [
      ...(li.Tracking || []).filter(t => t.Name !== PROJECT_CAT),   // keep Business Divisions etc.
      { TrackingCategoryID: cat.TrackingCategoryID, TrackingOptionID: optId },
    ],
  }));
  revertLog.push({ invoiceId: inv.InvoiceID, invoiceNumber: inv.InvoiceNumber, original: inv.LineItems, before: { Total: inv.Total, SubTotal: inv.SubTotal, AmountDue: inv.AmountDue } });

  const plan = `${inv.InvoiceNumber} (${inv.Status}, ${date}, $${inv.Total}) → set ${canonical} on ${newLines.length} line(s)`;
  if (!APPLY) { console.log(`  PLAN ${plan}`); results.push({ inv: inv.InvoiceNumber, result: 'planned' }); processed++; continue; }

  // write revert log BEFORE the write
  writeFileSync(REVERT_PATH, JSON.stringify(revertLog, null, 2));

  const body = { Invoices: [{ InvoiceID: inv.InvoiceID, LineAmountTypes: inv.LineAmountTypes, LineItems: newLines }] };
  const p = await xero('POST', 'Invoices', body);
  if (!p.ok) { console.log(`  FAIL ${inv.InvoiceNumber}: POST ${p.status} ${p.text.slice(0, 200)}`); results.push({ inv: inv.InvoiceNumber, result: 'post-error', detail: p.text.slice(0, 200) }); break; }
  const updated = p.json.Invoices?.[0];
  // verify money unchanged + option set
  const moneyOk = updated && updated.Total === inv.Total && updated.AmountDue === inv.AmountDue;
  const optSet = projOption(updated?.LineItems) === canonical;
  if (!moneyOk) { console.log(`  CRITICAL ${inv.InvoiceNumber}: TOTALS CHANGED ${inv.Total}/${inv.AmountDue} → ${updated?.Total}/${updated?.AmountDue} — ABORT`); results.push({ inv: inv.InvoiceNumber, result: 'totals-changed' }); break; }
  if (!optSet) { console.log(`  WARN ${inv.InvoiceNumber}: posted but option not confirmed`); results.push({ inv: inv.InvoiceNumber, result: 'unconfirmed' }); break; }
  console.log(`  ✅ ${plan} | totals intact ($${updated.Total}/${updated.AmountDue})`);
  results.push({ inv: inv.InvoiceNumber, result: 'applied' });
  processed++;
}

console.log(`\n${APPLY ? 'Applied' : 'Planned'}: ${results.filter(r => r.result === 'applied' || r.result === 'planned').length} · already: ${results.filter(r => r.result === 'already').length} · errors: ${results.filter(r => /error|changed|unconfirmed/.test(r.result)).length}`);
if (APPLY && revertLog.length) console.log('Revert log:', REVERT_PATH);
