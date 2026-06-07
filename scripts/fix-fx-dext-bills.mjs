#!/usr/bin/env node
/**
 * Fix the Dext FX non-conversion bug — bills flagged "adjust AUD to match bank line".
 *
 * Background (see wiki/decisions/2026-05-31-q2q3-429-review-band-classification.md §2/§2b):
 * A Dext→Xero auto-push wrote each receipt's *native foreign amount* straight into the
 * AUD field and tagged the line "[native <CCY> <amt> — adjust AUD to match bank line]",
 * but the FX adjustment never ran. 90 lines / 13 vendors / $33,880 booked. Two cases:
 *   - MOL Nyrt.  : native "30691" is HUNGARIAN FORINT (a fuel receipt), real AUD 151.31.
 *                  → set AUD 151.31 AND recode 429 → 493 (travel/fuel).
 *   - 89 SaaS    : native is USD entered as AUD with no conversion (under-stated).
 *                  → set AUD to the actual NAB Visa #8815 charge it pairs with.
 *
 * SAFE BY DESIGN (mirrors apply-ge-recode-to-xero.mjs):
 *  - DRY RUN by default. Pass --apply to write.
 *  - Confidence-gated: MOL=deterministic; SaaS HIGH only when exactly ONE NAB Visa SPEND
 *    for that vendor sits in the date window within the FX band. 0 or >1 candidates → REVIEW
 *    (printed, NEVER auto-written — e.g. OpenAI's many varying charges).
 *  - Only touches single-line, AUTHORISED (unpaid) bills. PAID / multi-line → REVIEW.
 *  - GETs each bill fresh from Xero before writing; preserves LineItemID, TaxType, Tracking,
 *    Description. Changes ONLY UnitAmount+LineAmount (+ AccountCode for MOL).
 *  - Revert log to scripts/output/fix-fx-revert-<ts>.json. Throttled 2.5s (Xero 60/min).
 *
 * Usage:
 *   node scripts/fix-fx-dext-bills.mjs                      # dry run, everything
 *   node scripts/fix-fx-dext-bills.mjs --apply --band mol   # write ONLY the MOL fix (material, certain)
 *   node scripts/fix-fx-dext-bills.mjs --apply --band high  # write MOL + high-confidence SaaS matches
 *   node scripts/fix-fx-dext-bills.mjs --one <invoiceID> --apply
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : d; };
const APPLY = has('--apply');
const BAND = val('--band', 'mol');             // 'mol' | 'high' (high = mol + high-confidence SaaS)
const ONE = val('--one', null);
const CSV = has('--csv');

const FLAG = 'adjust AUD to match bank line';
const NAB = 'NAB Visa ACT #8815';
const FX_LO = 1.25, FX_HI = 1.95;              // plausible USD→AUD (incl. card margin) for the period
const WIN_BEFORE = 3, WIN_AFTER = 14;          // card settles a few days after the receipt date
const MOL = { match: /mol nyrt/i, audTarget: 151.31, acctTarget: '493' }; // from the Hungarian fuel receipt (€90.53 / HUF 30,691)

const SUPA_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPA_URL, SUPA_KEY);
const TENANT = process.env.XERO_TENANT_ID;

const chart = JSON.parse(readFileSync('config/xero-chart.json', 'utf8'));
const acctName = {};
for (const a of (chart.accounts || chart.Accounts || [])) acctName[String(a.code || a.Code)] = a.name || a.Name;

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const daysBetween = (a, b) => (new Date(a) - new Date(b)) / 86400000;

async function getAccessToken() {
  const { data: row } = await supabase.from('xero_tokens').select('refresh_token').eq('id', 'default').single();
  if (!row?.refresh_token) throw new Error('No refresh token; run node scripts/xero-auth.mjs');
  const creds = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }),
  });
  if (!r.ok) throw new Error(`Token refresh failed ${r.status}: ${await r.text()}`);
  const t = await r.json();
  const expiresAt = new Date(Date.now() + t.expires_in * 1000 - 60000);
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'fix-fx-dext' }, { onConflict: 'id' });
  if (existsSync('.env.local')) {
    let body = readFileSync('.env.local', 'utf8');
    body = /^XERO_REFRESH_TOKEN=/m.test(body) ? body.replace(/^XERO_REFRESH_TOKEN=.*/m, `XERO_REFRESH_TOKEN=${t.refresh_token}`) : `${body.trimEnd()}\nXERO_REFRESH_TOKEN=${t.refresh_token}\n`;
    writeFileSync('.env.local', body);
  }
  return t.access_token;
}
const xh = (token) => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: 'application/json', 'Content-Type': 'application/json' });

async function fetchAll(table, sel, build) {
  let out = [];
  for (let s = 0; ; s += 1000) {
    let q = supabase.from(table).select(sel).range(s, s + 999);
    q = build(q);
    const { data, error } = await q;
    if (error) throw error;
    out = out.concat(data); if (data.length < 1000) break;
  }
  return out;
}

// Decide the AUD target + confidence for one flagged bill.
function classify(bill, nabByVendor) {
  const lines = bill.line_items || [];
  const flagged = lines.filter(li => String(li.description || '').includes(FLAG));
  if (flagged.length !== 1 || lines.length !== 1) return { conf: 'review', why: 'multi-line / not single flagged line' };
  if (MOL.match.test(bill.contact_name || '')) {
    return { conf: 'mol', target: MOL.audTarget, acct: MOL.acctTarget, why: 'Hungarian fuel receipt — HUF 30,691 = €90.53 = AUD 151.31; recode →493' };
  }
  if (bill.status !== 'AUTHORISED') return { conf: 'review', why: `status ${bill.status} (only AUTHORISED auto-fixed)` };
  const native = Number(bill.total);                       // booked = the native amount
  const cands = (nabByVendor[norm(bill.contact_name)] || [])
    .filter(t => { const d = daysBetween(t.date, bill.date); return d >= -WIN_BEFORE && d <= WIN_AFTER; })
    .filter(t => { const r = Number(t.total) / native; return r >= FX_LO && r <= FX_HI; });
  if (cands.length === 1) return { conf: 'high', target: Number(cands[0].total), bank: cands[0], why: `1 NAB match @${cands[0].date}` };
  if (cands.length === 0) return { conf: 'review', why: `no NAB charge in window within FX band (expected ~$${(native * 1.55).toFixed(2)})` };
  return { conf: 'review', why: `${cands.length} NAB candidates in band — ambiguous`, cands };
}

async function main() {
  console.log(`\n=== Fix Dext FX bills ${APPLY ? '*** APPLY ***' : '(DRY RUN)'} | band=${BAND}${ONE ? ` | one=${ONE}` : ''} ===\n`);

  const bills = (await fetchAll('xero_invoices', 'xero_id, contact_name, status, date, total, line_items',
    q => q.eq('type', 'ACCPAY').in('status', ['AUTHORISED', 'PAID'])))
    .filter(b => (b.line_items || []).some(li => String(li.description || '').includes(FLAG)))
    .filter(b => !ONE || b.xero_id === ONE)
    .sort((a, b) => Number(b.total) - Number(a.total));

  const nab = await fetchAll('xero_transactions', 'contact_name, date, total, is_reconciled',
    q => q.eq('bank_account', NAB).eq('type', 'SPEND'));
  const nabByVendor = {};
  for (const t of nab) (nabByVendor[norm(t.contact_name)] ||= []).push(t);

  const rows = [];
  for (const b of bills) {
    const c = classify(b, nabByVendor);
    rows.push({ b, c });
    const before = Number(b.total), after = c.target;
    const delta = after != null ? after - before : null;
    const tag = c.conf === 'mol' ? '🔧 MOL' : c.conf === 'high' ? '✅ HIGH' : '⏸ REVIEW';
    console.log(
      `${tag.padEnd(9)} ${(b.contact_name || '').slice(0, 18).padEnd(18)} ${b.date}` +
      `  $${before.toFixed(2).padStart(9)} → ${after != null ? '$' + after.toFixed(2).padStart(9) : '   (manual)'}` +
      `${delta != null ? ` (${delta >= 0 ? '+' : ''}${delta.toFixed(2)})` : ''}  ${c.why}`
    );
  }

  // summary
  const grp = (k) => rows.filter(r => r.c.conf === k);
  const sumDelta = (rs) => rs.reduce((a, r) => a + (r.c.target != null ? r.c.target - Number(r.b.total) : 0), 0);
  const mol = grp('mol'), high = grp('high'), rev = grp('review');
  console.log(`\n  MOL: ${mol.length} (Δ ${sumDelta(mol).toFixed(2)})  |  HIGH: ${high.length} (Δ +${sumDelta(high).toFixed(2)})  |  REVIEW (manual): ${rev.length}`);
  console.log(`  Net 429/total change if MOL+HIGH applied: $${(sumDelta(mol) + sumDelta(high)).toFixed(2)}`);

  if (CSV) {
    const f = `scripts/output/fix-fx-worklist-${rows.length}.csv`;
    mkdirSync('scripts/output', { recursive: true });
    writeFileSync(f, 'xero_id,vendor,date,status,booked_aud,target_aud,confidence,note\n' +
      rows.map(r => [r.b.xero_id, JSON.stringify(r.b.contact_name), r.b.date, r.b.status, r.b.total, r.c.target ?? '', r.c.conf, JSON.stringify(r.c.why)].join(',')).join('\n'));
    console.log(`  worklist: ${f}`);
  }

  if (!APPLY) { console.log('\n  (dry run — nothing written. Re-run with --apply --band mol|high)\n'); return; }

  // ---- APPLY ----
  if (!TENANT) throw new Error('XERO_TENANT_ID not set');
  const token = await getAccessToken();
  const want = (conf) => conf === 'mol' || (BAND === 'high' && conf === 'high');
  const todo = rows.filter(r => want(r.c.conf));
  const revert = []; let applied = 0, failed = 0;
  for (const { b, c } of todo) {
    await new Promise(r => setTimeout(r, 2500));
    const gr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${b.xero_id}`, { headers: xh(token) });
    if (!gr.ok) { console.log(`  ✗ GET ${b.contact_name} ${gr.status}`); failed++; continue; }
    const inv = (await gr.json()).Invoices?.[0];
    if (!inv?.LineItems?.length || inv.LineItems.length !== 1) { console.log(`  ✗ ${b.contact_name}: not single-line on fresh GET`); failed++; continue; }
    const li = inv.LineItems[0];
    const newLine = {
      LineItemID: li.LineItemID, Description: li.Description, Quantity: 1,
      UnitAmount: c.target, LineAmount: c.target, TaxType: li.TaxType,
      AccountCode: c.conf === 'mol' ? c.acct : li.AccountCode, Tracking: li.Tracking || [],
    };
    revert.push({ invoiceID: b.xero_id, contact: b.contact_name, before: { UnitAmount: li.UnitAmount, LineAmount: li.LineAmount, AccountCode: li.AccountCode } });
    const pr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${b.xero_id}`, { method: 'POST', headers: xh(token), body: JSON.stringify({ Invoices: [{ InvoiceID: b.xero_id, LineItems: [newLine] }] }) });
    if (pr.ok) { applied++; console.log(`  ✓ ${b.contact_name} → $${c.target.toFixed(2)}${c.conf === 'mol' ? ` (acct →${c.acct})` : ''}`); }
    else { failed++; const txt = await pr.text(); let msg = txt.slice(0, 200); try { const el = JSON.parse(txt).Elements?.[0]; const ve = (el?.ValidationErrors || []).concat((el?.LineItems || []).flatMap(l => l.ValidationErrors || [])); if (ve.length) msg = ve.map(v => v.Message).join(' | '); } catch {} console.log(`  ✗ POST ${pr.status} [${b.contact_name}]: ${msg}`); }
  }
  console.log(`\n  applied=${applied} failed=${failed}`);
  if (revert.length) {
    mkdirSync('scripts/output', { recursive: true });
    const f = `scripts/output/fix-fx-revert-${Date.now()}.json`;
    writeFileSync(f, JSON.stringify(revert, null, 2));
    console.log(`  revert log: ${f}\n  NOTE: Xero API cannot reconcile — match each corrected bill to its NAB Visa line via Find & Match in the Xero UI.\n`);
  }
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
