#!/usr/bin/env node
/**
 * VOID the auto-dext phantom bills in the ambiguous cluster (keep the spend-money).
 * Tier-3 Xero write — gated against the surviving spend-money. Dry-run unless --apply.
 *
 * Per pair, ALL must hold or it ABORTS (no write):
 *   - bill: ACCPAY, AUTHORISED (not paid/voided), payments=0
 *   - keep-txn: live unreconciled SPEND in NAB Visa, same amount (±surcharge), has receipt
 * Then voids the bill (POST Status=VOIDED), confirms VOIDED, confirms keep-txn survives, logs.
 *
 * Drives from recon-pack/ambiguous-classified.json, batched by $ desc (10/batch).
 * EXCLUDES the 3 verified false-matches (not duplicates).
 *   node scripts/reconcile-void-bills.mjs --batch 1            # dry-run batch 1 (top 10 $)
 *   node scripts/reconcile-void-bills.mjs --batch 1 --apply
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';
import { readFileSync, appendFileSync } from 'fs';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const BATCH = args.includes('--batch') ? parseInt(args[args.indexOf('--batch') + 1]) : 1;
const SIZE = 10;
// verified NOT-duplicates (D-group false matches) — never void these bills
const EXCLUDE = new Set(['Uber|42.96', 'F V Snowdon And J R Rowden|39.8', 'Railway Corporation|7.17']);

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero = await createXeroClient(sb);
const all = JSON.parse(readFileSync('thoughts/shared/recon-pack/ambiguous-classified.json', 'utf8'))
  .filter(r => !EXCLUDE.has(`${r.vendor}|${r.amount}`))
  .sort((a, b) => b.amount - a.amount);
const batch = all.slice((BATCH - 1) * SIZE, BATCH * SIZE);
console.log(`Batch ${BATCH}: ${batch.length} of ${all.length} void-able pairs${APPLY ? ' — APPLYING' : ' — DRY-RUN'}\n`);

let ok = 0, aborted = 0, failed = 0;
for (const [i, p] of batch.entries()) {
  const tag = `[${i + 1}/${batch.length}] ${p.vendor} $${p.amount}`;
  try {
    const b = (await xero.get(`Invoices/${p.billId}`)).Invoices?.[0];
    const t = (await xero.get(`BankTransactions/${p.txnId}`)).BankTransactions?.[0];
    const fail = (() => {
      if (!b || !t) return 'bill or keep-txn not found';
      if (b.Type !== 'ACCPAY') return `bill not ACCPAY (${b.Type})`;
      if (b.Status !== 'AUTHORISED') return `bill not AUTHORISED (${b.Status})`;
      if ((b.Payments || []).length) return 'bill has payments — not a phantom';
      if (!t.Type?.startsWith('SPEND') || t.BankAccount?.Name !== 'NAB Visa ACT #8815') return 'keep-txn not NAB SPEND';
      if (t.Status === 'DELETED' || t.IsReconciled !== false) return `keep-txn not live-unreconciled (${t.Status}/${t.IsReconciled})`;
      if (!t.HasAttachments) return 'keep-txn has no receipt — substantiation risk';
      if (Math.abs(Math.abs(b.Total) - Math.abs(t.Total)) > Math.max(5, Math.abs(t.Total) * 0.02)) return 'amount mismatch bill vs keep-txn';
      return null;
    })();
    if (fail) { aborted++; console.log(`  🛑 ${tag} — ${fail}`); continue; }
    if (!APPLY) { console.log(`  ✅ ${tag} — gates pass (void bill ${p.billId}, keep ${p.txnId})`); continue; }
    await xero.post(`Invoices/${p.billId}`, { Invoices: [{ InvoiceID: p.billId, Status: 'VOIDED' }] });
    const after = (await xero.get(`Invoices/${p.billId}`)).Invoices?.[0];
    const keepAfter = (await xero.get(`BankTransactions/${p.txnId}`)).BankTransactions?.[0];
    if (after?.Status !== 'VOIDED') { failed++; console.log(`  ❌ ${tag} — void didn't stick (${after?.Status})`); continue; }
    if (keepAfter?.Status === 'DELETED') { failed++; console.log(`  ❌ ${tag} — keep-txn changed?!`); continue; }
    appendFileSync('thoughts/shared/recon-pack/reconcile-write-log.md',
      `| ${new Date().toISOString()} | VOID_BILL | ${p.vendor} | $${p.amount} | bill ${p.billId} | keep spend-money ${p.txnId} (${p.sm_proj}) | OK |\n`);
    ok++; console.log(`  ✅ ${tag}`);
  } catch (e) { failed++; console.log(`  ❌ ${tag} — ${(e.message || '').split('\n')[0]}`); }
}
console.log(`\n${APPLY ? `Batch ${BATCH} done: ${ok} voided · ${aborted} aborted · ${failed} failed` : `Dry-run: ${batch.length - aborted} would void · ${aborted} aborted`}`);
