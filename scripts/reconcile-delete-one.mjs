#!/usr/bin/env node
/**
 * Delete ONE unreconciled NAB Visa #8815 phantom spend-money (the tracer, then the
 * DELETE_PHANTOM batch primitive). Tier-3 Xero write — gated and verified.
 *
 * Safety gates (ALL must pass or it ABORTS without writing):
 *   - the txn is a SPEND in NAB Visa #8815
 *   - live IsReconciled === false   (never delete a reconciled line)
 *   - live Status !== 'DELETED'      (idempotent)
 *   - keeper bill (--bill) is live PAID and HasAttachments === true (receipt survives the delete)
 *
 * Dry-run by default. Pass --apply to actually POST Status=DELETED, then it re-reads
 * live to confirm the delete stuck AND the keeper bill is untouched (attempted vs actual).
 *
 * Usage:
 *   node scripts/reconcile-delete-one.mjs --id <BankTransactionID> --bill <InvoiceID>
 *   node scripts/reconcile-delete-one.mjs --id <BankTransactionID> --bill <InvoiceID> --apply
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';

const args = process.argv.slice(2);
const val = f => args.includes(f) ? args[args.indexOf(f) + 1] : null;
const ID = val('--id'), BILL = val('--bill'), APPLY = args.includes('--apply');
if (!ID) { console.error('--id <BankTransactionID> required'); process.exit(1); }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero = await createXeroClient(sb);
const abort = m => { console.error(`\n🛑 ABORT (no write): ${m}`); process.exit(2); };

// --- re-read the spend-money live ---
const t = (await xero.get(`BankTransactions/${ID}`)).BankTransactions?.[0];
if (!t) abort(`BankTransaction ${ID} not found`);
console.log('SPEND-MONEY (delete target):');
console.log(`  ${t.Type} | status=${t.Status} | recon=${t.IsReconciled} | $${t.Total} | ${t.DateString?.slice(0,10)} | ${t.Contact?.Name} | ${t.BankAccount?.Name} | att=${t.HasAttachments}`);
if (!t.Type?.startsWith('SPEND')) abort(`not a SPEND txn (${t.Type})`);
if (t.BankAccount?.Name !== 'NAB Visa ACT #8815') abort(`wrong account: ${t.BankAccount?.Name}`);
if (t.Status === 'DELETED') abort('already DELETED (nothing to do)');
if (t.IsReconciled !== false) abort(`IsReconciled=${t.IsReconciled} — refusing to delete a reconciled line`);

// --- verify the keeper bill (the receipt must live on something that stays) ---
let bill = null;
if (BILL) {
  bill = (await xero.get(`Invoices/${BILL}`)).Invoices?.[0];
  if (!bill) abort(`keeper bill ${BILL} not found`);
  console.log('KEEPER BILL (must survive):');
  console.log(`  ${bill.Type} | status=${bill.Status} | $${bill.Total} | due $${bill.AmountDue} | ${bill.Contact?.Name} | ${bill.InvoiceNumber||bill.InvoiceID} | att=${bill.HasAttachments}`);
  if (bill.Status !== 'PAID') abort(`keeper bill not PAID (${bill.Status})`);
  if (!bill.HasAttachments) abort('keeper bill has NO receipt — deleting the spend-money would lose substantiation');
  if (Math.abs(Math.abs(bill.Total) - Math.abs(t.Total)) > Math.max(5, Math.abs(t.Total)*0.02)) abort(`amount mismatch txn $${t.Total} vs bill $${bill.Total} beyond surcharge tolerance`);
}

if (!APPLY) { console.log('\n✅ All gates pass. DRY-RUN — add --apply to delete.'); process.exit(0); }

// --- APPLY: delete the spend-money ---
console.log('\n→ POST BankTransactions Status=DELETED …');
await xero.post(`BankTransactions/${ID}`, { BankTransactions: [{ BankTransactionID: ID, Status: 'DELETED' }] });

// --- verify attempted vs actual ---
const after = (await xero.get(`BankTransactions/${ID}`)).BankTransactions?.[0];
console.log(`  txn now: status=${after?.Status} recon=${after?.IsReconciled}`);
if (after?.Status !== 'DELETED') abort(`delete did NOT stick (status=${after?.Status}) — investigate`);
if (BILL) {
  const billAfter = (await xero.get(`Invoices/${BILL}`)).Invoices?.[0];
  console.log(`  keeper bill now: status=${billAfter?.Status} att=${billAfter?.HasAttachments}`);
  if (billAfter?.Status !== 'PAID' || !billAfter?.HasAttachments) abort('keeper bill changed unexpectedly — investigate');
}
// audit log (append) — every Tier-3 delete recorded
import('fs').then(({ appendFileSync }) => appendFileSync('thoughts/shared/recon-pack/reconcile-write-log.md',
  `| ${new Date().toISOString()} | DELETE_PHANTOM | ${t.DateString?.slice(0,10)} | ${t.Contact?.Name} | $${t.Total} | spend-money ${ID} | keeper bill ${BILL||'-'} | OK |\n`));
console.log('\n✅ DONE — phantom deleted, keeper bill + receipt intact.');
