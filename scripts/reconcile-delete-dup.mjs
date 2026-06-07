#!/usr/bin/env node
/**
 * Delete TRUE duplicate spend-money from dup-plan.json (two unreconciled txns for ONE
 * charge, NO paid-bill anchor). Tier-3 Xero write — gated on REFERENCE MATCH.
 *
 * Per pair, ALL must hold or it ABORTS (no write):
 *   - delete target: SPEND, NAB Visa #8815, recon=false, status!=DELETED
 *   - keeper:        SPEND, recon=false, status!=DELETED, SAME non-empty Reference, amount match
 *   - never delete the only receipted copy (if target has a receipt and keeper doesn't, abort)
 * Then deletes the target, re-reads to confirm, verifies the keeper survives, logs.
 *
 * Dry-run unless --apply.
 *   node scripts/reconcile-delete-dup.mjs            # preview all
 *   node scripts/reconcile-delete-dup.mjs --apply    # execute
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';
import { readFileSync, appendFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero = await createXeroClient(sb);
const plan = JSON.parse(readFileSync('thoughts/shared/recon-pack/dup-plan.json', 'utf8'));
const getTxn = async id => (await xero.get(`BankTransactions/${id}`)).BankTransactions?.[0];
const norm = s => (s || '').trim();

console.log(`${plan.length} dup pairs${APPLY ? ' — APPLYING' : ' — DRY-RUN (add --apply)'}\n`);
let ok = 0, aborted = 0, failed = 0;
for (const [i, p] of plan.entries()) {
  const tag = `[${i + 1}/${plan.length}] ${p.date} ${p.vendor} $${p.amount} ref ${p.reference}`;
  try {
    const t = await getTxn(p.deleteTxnId), k = await getTxn(p.keepTxnId);
    const fail = (() => {
      if (!t || !k) return 'txn or keeper not found';
      if (!t.Type?.startsWith('SPEND') || t.BankAccount?.Name !== 'NAB Visa ACT #8815') return 'target not SPEND in NAB Visa';
      if (t.Status === 'DELETED') return 'target already DELETED';
      if (t.IsReconciled !== false) return `target IsReconciled=${t.IsReconciled}`;
      if (k.Status === 'DELETED' || k.IsReconciled !== false || !k.Type?.startsWith('SPEND')) return 'keeper not a live unreconciled SPEND';
      if (!norm(t.Reference) || norm(t.Reference) !== norm(k.Reference) || norm(t.Reference) !== norm(p.reference)) return 'reference mismatch/empty — not a confirmed duplicate';
      if (Math.abs(Math.abs(t.Total) - Math.abs(k.Total)) > 0.02) return 'amount mismatch';
      if (t.HasAttachments && !k.HasAttachments) return 'target has receipt but keeper does not — would lose substantiation';
      return null;
    })();
    if (fail) { aborted++; console.log(`  🛑 ${tag} — ${fail}`); continue; }
    if (!APPLY) { console.log(`  ✅ ${tag} — gates pass (would delete ${p.deleteTxnId}, keep ${p.keepTxnId})`); continue; }
    await xero.post(`BankTransactions/${p.deleteTxnId}`, { BankTransactions: [{ BankTransactionID: p.deleteTxnId, Status: 'DELETED' }] });
    const after = await getTxn(p.deleteTxnId), keepAfter = await getTxn(p.keepTxnId);
    if (after?.Status !== 'DELETED') { failed++; console.log(`  ❌ ${tag} — delete did not stick (${after?.Status})`); continue; }
    if (keepAfter?.Status === 'DELETED') { failed++; console.log(`  ❌ ${tag} — keeper got deleted?! investigate`); continue; }
    appendFileSync('thoughts/shared/recon-pack/reconcile-write-log.md',
      `| ${new Date().toISOString()} | DELETE_DUP | ${p.date} | ${p.vendor} | $${p.amount} | spend-money ${p.deleteTxnId} | keeper spend-money ${p.keepTxnId} (ref ${p.reference}) | OK |\n`);
    ok++; console.log(`  ✅ ${tag}`);
  } catch (e) { failed++; console.log(`  ❌ ${tag} — ${(e.message || '').split('\n')[0]}`); }
}
console.log(`\n${APPLY ? `Done: ${ok} deleted · ${aborted} aborted (safe) · ${failed} failed` : `Dry-run: ${plan.length - aborted} would delete · ${aborted} aborted`}`);
