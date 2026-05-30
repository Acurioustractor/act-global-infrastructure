#!/usr/bin/env node
/**
 * One-off Tier-3 Xero re-tag: The Plasticians AP bill ($29,800, AUTHORISED, unlocked)
 * Project Tracking ACT-IN → ACT-GD (Goods HDPE materials; confirmed with Ben 2026-05-30).
 * Tracking-only, no amount change. Same safety harness as apply-xero-tracking-backfill.mjs:
 * GET-fresh → modify Tracking only (preserve Business Divisions + all other fields) →
 * revert log BEFORE write → POST → verify totals byte-identical + option set.
 *
 *   node scripts/retag-plasticians-xero.mjs            # live dry-run (no write)
 *   node scripts/retag-plasticians-xero.mjs --apply    # write
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TENANT = process.env.XERO_TENANT_ID;
const PROJECT_CAT = 'Project Tracking';
const TARGET = 'ACT-GD';
const LOCK_DATE = '2025-09-30';
const APPLY = process.argv.includes('--apply');

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

// 0. identify the invoice in the mirror (one Plasticians ACCPAY AUTHORISED)
const { data: cands } = await sb.from('xero_invoices')
  .select('xero_id,invoice_number,contact_name,type,status,date,total,project_code')
  .ilike('contact_name', '%plasticians%').eq('type', 'ACCPAY').not('status', 'in', '(VOIDED,DELETED)');
if (!cands || cands.length !== 1) { console.error(`Expected exactly 1 Plasticians AP bill, found ${cands?.length}`); process.exit(1); }
const cand = cands[0];
console.log(`Target: ${cand.contact_name} ${cand.date} ${cand.status} $${cand.total} [mirror ${cand.project_code}] xero_id ${cand.xero_id}`);

// 1. resolve Project Tracking category + ACT-GD option
const tcRes = await xero('GET', 'TrackingCategories');
if (!tcRes.ok) { console.error('TrackingCategories', tcRes.status, tcRes.text.slice(0, 200)); process.exit(1); }
const cat = (tcRes.json.TrackingCategories || []).find(c => c.Name === PROJECT_CAT);
const opt = (cat?.Options || []).find(o => o.Name.split('—')[0].trim() === TARGET);
if (!opt) { console.error(`No ${TARGET} option in Project Tracking`); process.exit(1); }
const canonical = opt.Name;

// 2. GET-fresh
const g = await xero('GET', `Invoices/${cand.xero_id}`);
if (!g.ok) { console.error(`GET ${g.status} ${g.text.slice(0, 200)}`); process.exit(1); }
const inv = g.json.Invoices?.[0];
if (!inv) { console.error('Invoice not found'); process.exit(1); }
const date = (inv.DateString || inv.Date || '').slice(0, 10);
console.log(`Live Xero: ${inv.Type} ${inv.Status} ${date} Total $${inv.Total} | current Project Tracking = "${projOption(inv.LineItems)}"`);

// 3. validate eligibility (ACCPAY/ACCREC ok; must be unlocked + active)
if (!['AUTHORISED', 'PAID'].includes(inv.Status) || date <= LOCK_DATE) {
  console.error(`Not eligible: status ${inv.Status} date ${date} (locked or wrong status)`); process.exit(1);
}
if (projOption(inv.LineItems) === canonical) { console.log(`Already ${canonical} — nothing to do`); process.exit(0); }

// 4. build modified line items — preserve everything, replace Project Tracking only
const newLines = inv.LineItems.map(li => ({
  LineItemID: li.LineItemID,
  Description: li.Description,
  Quantity: li.Quantity,
  UnitAmount: li.UnitAmount,
  AccountCode: li.AccountCode,
  TaxType: li.TaxType,
  Tracking: [
    ...(li.Tracking || []).filter(t => t.Name !== PROJECT_CAT),  // keep Business Divisions
    { TrackingCategoryID: cat.TrackingCategoryID, TrackingOptionID: opt.TrackingOptionID },
  ],
}));

if (!existsSync('scripts/output')) mkdirSync('scripts/output', { recursive: true });
const revert = [{ invoiceId: inv.InvoiceID, original: inv.LineItems, before: { Total: inv.Total, SubTotal: inv.SubTotal, AmountDue: inv.AmountDue } }];

console.log(`\nPLAN: set Project Tracking "${projOption(inv.LineItems)}" → "${canonical}" on ${newLines.length} line(s); totals must stay $${inv.Total}/${inv.AmountDue}`);
if (!APPLY) { console.log('(dry-run — pass --apply to write)'); process.exit(0); }

writeFileSync('scripts/output/retag-plasticians-revert-2026-05-30.json', JSON.stringify(revert, null, 2));
const body = { Invoices: [{ InvoiceID: inv.InvoiceID, LineAmountTypes: inv.LineAmountTypes, LineItems: newLines }] };
const p = await xero('POST', 'Invoices', body);
if (!p.ok) { console.error(`POST ${p.status} ${p.text.slice(0, 300)}`); process.exit(1); }
const u = p.json.Invoices?.[0];
const moneyOk = u && u.Total === inv.Total && u.AmountDue === inv.AmountDue;
const optSet = projOption(u?.LineItems) === canonical;
if (!moneyOk) { console.error(`CRITICAL: totals changed ${inv.Total}/${inv.AmountDue} → ${u?.Total}/${u?.AmountDue}`); process.exit(1); }
if (!optSet) { console.error('WARN: posted but option not confirmed'); process.exit(1); }
console.log(`✅ Re-tagged → ${canonical} | totals intact ($${u.Total}/${u.AmountDue}) | revert: scripts/output/retag-plasticians-revert-2026-05-30.json`);
