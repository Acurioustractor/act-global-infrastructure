#!/usr/bin/env node
/**
 * Tier-3 recode: ACT-BV → ACT-FM Project Tracking on the 4 UNLOCKED records
 * (post-2025-09-30 BAS lock) of the ACT-BV→ACT-FM merge (2026-06-08).
 *
 * Live truth (probed 2026-06-08): only the 1 invoice carries ACT-BV in Xero;
 * the 3 editable txns carry NO Project Tracking (set, not change). 5 other txns
 * are pre-lock AND untracked in Xero → nothing to recode there.
 *
 * Safety harness (proven void/backfill pattern):
 *   GET-fresh by id → assert amount matches expectation → modify ONLY the
 *   Project Tracking option (preserve all other line fields + Business Divisions)
 *   → revert log written BEFORE the write → POST → verify Total/AmountDue
 *   byte-identical AND option now ACT-FM, else ABORT the batch.
 *
 *   node scripts/recode-act-bv-to-fm-2026-06-08.mjs                       # dry-run all 4
 *   node scripts/recode-act-bv-to-fm-2026-06-08.mjs --only=e8ecec6d --apply  # tracer (the invoice)
 *   node scripts/recode-act-bv-to-fm-2026-06-08.mjs --apply                # apply all 4
 */
import '../lib/load-env.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const TENANT = process.env.XERO_TENANT_ID;
const token = () => JSON.parse(readFileSync('.xero-tokens.json', 'utf8')).access_token;
async function xero(method, path, body) {
  const res = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'xero-tenant-id': TENANT, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text(); let json; try { json = JSON.parse(text); } catch { json = null; }
  return { ok: res.ok, status: res.status, json, text };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CAT = 'Project Tracking';
const FM = { catId: '1a1ad7c5-249a-4b1f-842d-06ba2a63a0fe', optId: '5dbff1f4-8257-4d2f-adbe-553f91f4afb8', name: 'ACT-FM — The Farm' };
const projOpt = (li = []) => { for (const l of li) for (const t of (l.Tracking || [])) if (t.Name === CAT) return t.Option; return null; };

const BV = { catId: '1a1ad7c5-249a-4b1f-842d-06ba2a63a0fe', optId: '01ea8b83-b485-4fe0-acbc-fef9babb95a3', name: 'ACT-BV — Black Cockatoo Valley' };
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const only = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1] || null;
const ARCHIVE_BV = args.includes('--archive-bv');

if (ARCHIVE_BV) {
  // Retire the ACT-BV option. Now that the only live user (the invoice) is recoded
  // to ACT-FM, the option is "not in use" → Xero rejects ARCHIVE and requires DELETE
  // (reversible by recreating the option). Correct retire for a fully-merged code.
  const plan = `Delete (retire) Project Tracking option "${BV.name}" (${BV.optId})`;
  if (!APPLY) { console.log(`DRY-RUN: ${plan}`); process.exit(0); }
  const r = await xero('DELETE', `TrackingCategories/${BV.catId}/Options/${BV.optId}`);
  if (!r.ok) { console.error(`FAIL delete: ${r.status} — ${JSON.stringify(r.json?.Elements?.[0]?.ValidationErrors || r.text.slice(0, 300))}`); process.exit(1); }
  const opt = r.json?.Options?.[0];
  console.log(`✅ ${plan} → Status ${opt?.Status || 'deleted'}`);
  process.exit(0);
}

const TARGETS = [
  { kind: 'invoice', id: 'e8ecec6d-d665-4f0c-8553-a216a496c330', label: 'Dinkum Dunnies $525 bill (ACCPAY, 2025-10-26)', expectTotal: 525 },
  { kind: 'txn', id: '03005f0a-23a8-4918-ab32-b5e3e93ab458', label: 'Aleisha $655 (RECEIVE, 2025-10-10)', expectTotal: 655 },
  { kind: 'txn', id: '10d47251-3faa-4f71-83ea-ed3c5999e0cc', label: 'Aleisha $515 (RECEIVE, 2025-10-24)', expectTotal: 515 },
  { kind: 'txn', id: '64420eb6-75ef-4d54-885e-0378c7eb144c', label: 'Aleisha $725 (RECEIVE, 2025-11-21)', expectTotal: 725 },
].filter((t) => (only ? t.id.startsWith(only) : true));

const REVERT = 'scripts/output/recode-act-bv-to-fm-revert-2026-06-08.json';
if (!existsSync('scripts/output')) mkdirSync('scripts/output', { recursive: true });
const revert = [];

console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | targets: ${TARGETS.length}\n`);
for (const tg of TARGETS) {
  const epGet = tg.kind === 'invoice' ? `Invoices/${tg.id}` : `BankTransactions/${tg.id}`;
  const g = await xero('GET', epGet);
  if (!g.ok) { if (g.status === 401) { console.error('401 token expired — run sync-xero-tokens.mjs'); process.exit(1); } console.log(`FAIL GET ${tg.label}: ${g.status}`); continue; }
  const rec = tg.kind === 'invoice' ? g.json.Invoices?.[0] : g.json.BankTransactions?.[0];
  if (!rec) { console.log(`FAIL ${tg.label}: not found`); continue; }
  const { Total, SubTotal, AmountDue } = rec;
  if (Number(Total) !== Number(tg.expectTotal)) { console.log(`ABORT ${tg.label}: live total ${Total} != expected ${tg.expectTotal}`); continue; }
  const before = projOpt(rec.LineItems);
  if (before === FM.name) { console.log(`OK    ${tg.label}: already "${FM.name}"`); continue; }
  const newLines = rec.LineItems.map((li) => ({
    LineItemID: li.LineItemID,
    Description: li.Description,
    Quantity: li.Quantity,
    UnitAmount: li.UnitAmount,
    AccountCode: li.AccountCode,
    TaxType: li.TaxType,
    Tracking: [...(li.Tracking || []).filter((t) => t.Name !== CAT), { TrackingCategoryID: FM.catId, TrackingOptionID: FM.optId }],
  }));
  revert.push({ kind: tg.kind, id: tg.id, label: tg.label, original: rec.LineItems, before: { Total, SubTotal, AmountDue, proj: before } });
  const plan = `${tg.label}: ${before === null ? '(no Project Tracking)' : `"${before}"`} → "${FM.name}" on ${newLines.length} line(s)`;
  if (!APPLY) { console.log(`PLAN  ${plan}`); continue; }

  writeFileSync(REVERT, JSON.stringify(revert, null, 2));
  const body = tg.kind === 'invoice'
    ? { Invoices: [{ InvoiceID: tg.id, LineAmountTypes: rec.LineAmountTypes, LineItems: newLines }] }
    : { BankTransactions: [{ BankTransactionID: tg.id, LineItems: newLines }] };
  const key = tg.kind === 'invoice' ? 'Invoices' : 'BankTransactions';
  const p = await xero('POST', key, body);
  if (!p.ok) { const ve = p.json?.Elements?.[0]?.ValidationErrors; console.log(`FAIL POST ${tg.label}: ${p.status} — ValidationErrors: ${JSON.stringify(ve)} — ABORT`); break; }
  const u = p.json[key]?.[0];
  const moneyOk = u && Number(u.Total) === Number(Total) && (tg.kind !== 'invoice' || Number(u.AmountDue) === Number(AmountDue));
  const optOk = projOpt(u?.LineItems) === FM.name;
  if (!moneyOk) { console.log(`CRITICAL ${tg.label}: TOTAL CHANGED ${Total}→${u?.Total} — ABORT`); break; }
  if (!optOk) { console.log(`WARN ${tg.label}: posted but option not confirmed — ABORT`); break; }
  console.log(`✅ ${plan} | total intact $${u.Total}`);
  await sleep(1200);
}
console.log(`\nRevert log: ${REVERT}`);
