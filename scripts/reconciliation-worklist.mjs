#!/usr/bin/env node
/**
 * Reconciliation worklist for a single bank account, grouped by the ACTION you take in the Xero UI.
 * READ-ONLY (no writes). Re-run as you clear items — reconciled rows drop out automatically.
 *
 * Lanes:
 *   - "Reconcile as transfer"      → match each to its other-account leg (internal movement, no receipt)
 *   - "Reconcile (receipt attached)" → match to the bank-feed line; receipt is already on the txn
 *   - "Reconcile (NO receipt)"       → match + attach a receipt if it's a real purchase
 *   - "Coding review → Standard Ledger" → founder payments / possible drawings / possible duplicates
 *
 * Usage: node scripts/reconciliation-worklist.mjs ["Account Name"]
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ACCOUNT = process.argv[2] || 'NJ Marchesi T/as ACT Everyday';
const FY_START = '2025-07-01', FY_END = '2026-06-30';
const esc = (s) => s.replace(/'/g, "''");

// exec_sql silently caps the returned set at 1,000 rows. High-volume accounts (the NAB Visa has
// ~1,700 FY26 rows) MUST paginate or the worklist silently drops rows. Loop with LIMIT/OFFSET on a
// stable sort, then reconcile fetched-vs-COUNT(*) so a truncation can never pass unnoticed.
const PAGE = 1000;
let rows = [], offset = 0;
while (true) {
  const { data, error } = await sb.rpc('exec_sql', { query: `
    SELECT xero_transaction_id, date, type, contact_name, ABS(total)::numeric(12,2) amount,
           is_reconciled, has_attachments, project_code, rd_eligible
    FROM xero_transactions
    WHERE bank_account = '${esc(ACCOUNT)}' AND status IS DISTINCT FROM 'DELETED'
      AND date >= '${FY_START}' AND date <= '${FY_END}'
    ORDER BY date, xero_transaction_id
    LIMIT ${PAGE} OFFSET ${offset}` });
  if (error) { console.error('Query failed:', error.message); process.exit(1); }
  rows.push(...data);
  if (data.length < PAGE) break;
  offset += PAGE;
}
const { data: countRow } = await sb.rpc('exec_sql', { query: `
  SELECT COUNT(*) n FROM xero_transactions
  WHERE bank_account = '${esc(ACCOUNT)}' AND status IS DISTINCT FROM 'DELETED'
    AND date >= '${FY_START}' AND date <= '${FY_END}'` });
const expected = Number(countRow?.[0]?.n);
if (rows.length !== expected) { console.error(`TRUNCATION GUARD FAILED: fetched ${rows.length} of ${expected} rows`); process.exit(1); }
console.log(`Fetched ${rows.length}/${expected} rows (truncation guard OK)`);

const { data: freshRows } = await sb.rpc('exec_sql', { query:
  `SELECT MAX(synced_at) last_sync FROM xero_transactions WHERE bank_account='${esc(ACCOUNT)}'` });
const lastSync = freshRows?.[0]?.last_sync || 'unknown';

const isTransfer = (r) => (r.type || '').includes('TRANSFER');
const isFounder = (r) => /marchesi|^nicholas|^nic\b/i.test(r.contact_name || '');
const money = (n) => '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sum = (a) => a.reduce((t, r) => t + Number(r.amount), 0);

// Duplicate flag: same date+amount+contact more than once = POSSIBLE double-pay. Threshold at $500 —
// on a credit card, identical same-day charges are overwhelmingly legit (group travel: 4 Qantas tickets
// at one fare; recurring subs). The real double-pays this catches are lumpy bills (Telford Smith $19.8K).
const DUP_MIN = 500;
const dupKey = (r) => `${r.date}|${r.amount}|${r.contact_name}`;
const dupCounts = {};
for (const r of rows) dupCounts[dupKey(r)] = (dupCounts[dupKey(r)] || 0) + 1;
const isDup = (r) => dupCounts[dupKey(r)] > 1 && Number(r.amount) >= DUP_MIN;

const unrec = rows.filter((r) => !r.is_reconciled);
const transfers = unrec.filter(isTransfer);
const spendReceipted = unrec.filter((r) => !isTransfer(r) && r.type === 'SPEND' && r.has_attachments);
const spendNoReceipt = unrec.filter((r) => !isTransfer(r) && r.type === 'SPEND' && !r.has_attachments);
const incomeUnrec = unrec.filter((r) => !isTransfer(r) && r.type === 'RECEIVE');
const founderReview = rows.filter((r) => isFounder(r) && r.type === 'SPEND'); // any founder spend (recon or not) → SL coding
const dupsReview = rows.filter((r) => isDup(r) && r.type === 'SPEND' && !isFounder(r));
const reconciledClean = rows.filter((r) => r.is_reconciled && !isFounder(r));

const line = (r) => `- [ ] ${r.date} · **${money(r.amount)}** · ${r.contact_name || '(no contact)'}` +
  ` · ${r.project_code || 'UNTAGGED'}${r.rd_eligible ? ' · R&D' : ''}${isDup(r) ? ' · ⚠️ POSSIBLE DUPLICATE' : ''}`;

// Large lanes (e.g. 400 card purchases) are reconciled chronologically in Xero — a flat 400-row
// checklist is noise. Summarise by month + surface only the rows worth eyeballing.
const byMonth = (arr) => {
  const m = {};
  for (const r of arr) { const k = (r.date || '?').slice(0, 7); (m[k] = m[k] || { cnt: 0, amt: 0 }).cnt++; m[k].amt += Number(r.amount); }
  return Object.entries(m).sort().map(([k, v]) => `| ${k} | ${v.cnt} | ${money(v.amt)} |`).join('\n');
};
const exceptions = (arr) => arr.filter((r) => !r.project_code || isDup(r) || Number(r.amount) >= 2000);
const renderLane = (arr) => {
  if (arr.length === 0) return '_none_';
  if (arr.length <= 35) return arr.map(line).join('\n');
  const exc = exceptions(arr);
  return `_${arr.length} lines — reconcile chronologically in Xero. By month:_\n\n| Month | Count | Amount |\n|---|---|---|\n${byMonth(arr)}\n\n**Eyeball these (untagged · possible duplicate · ≥ $2,000): ${exc.length}**\n${exc.slice(0, 80).map(line).join('\n') || '_none_'}${exc.length > 80 ? `\n_…and ${exc.length - 80} more_` : ''}`;
};

let md = `# Reconciliation worklist — ${ACCOUNT}
**Generated:** ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · **FY:** ${FY_START} → ${FY_END}
**Source:** \`xero_transactions\` mirror (last Xero sync ${String(lastSync).slice(0, 16).replace('T', ' ')}) — confirm live in Xero before acting.

> Work top-down. Re-run \`node scripts/reconciliation-worklist.mjs "${ACCOUNT}"\` to refresh — cleared items drop off.

## Summary
| Lane | Count | Amount | Where |
|---|---|---|---|
| 🔁 Reconcile as transfer | ${transfers.length} | ${money(sum(transfers))} | Xero UI — match other-account leg |
| 🧾 Reconcile (receipt attached) | ${spendReceipted.length} | ${money(sum(spendReceipted))} | Xero UI — just match the feed line |
| 📎 Reconcile (NO receipt) | ${spendNoReceipt.length} | ${money(sum(spendNoReceipt))} | Xero UI — attach receipt if a real purchase |
| 💵 Income still unreconciled | ${incomeUnrec.length} | ${money(sum(incomeUnrec))} | Xero UI — match the deposit |
| 🧮 Coding review → Standard Ledger | ${founderReview.length} | ${money(sum(founderReview))} | SL — drawings vs expense vs R&D |
| ⚠️ Possible duplicates → Standard Ledger | ${dupsReview.length} | ${money(sum(dupsReview))} | SL — confirm before reconciling |
| ✅ Already reconciled (clean) | ${reconciledClean.length} | ${money(sum(reconciledClean))} | — |

---

## 🔁 Reconcile as transfer (${transfers.length} · ${money(sum(transfers))})
Internal movements between ACT's own accounts. In Xero, reconcile via **Transfer** (match the opposite leg). No receipt needed.
${renderLane(transfers)}

## 🧾 Reconcile — receipt already attached (${spendReceipted.length} · ${money(sum(spendReceipted))})
Real vendor bills with the receipt already on the Xero transaction. Just **match the bank-feed line** — no receipt hunt.
${renderLane(spendReceipted)}

## 📎 Reconcile — NO receipt on file (${spendNoReceipt.length} · ${money(sum(spendNoReceipt))})
${spendNoReceipt.length ? renderLane(spendNoReceipt) : '_none — every unreconciled purchase already has a receipt_'}

## 💵 Income still unreconciled (${incomeUnrec.length} · ${money(sum(incomeUnrec))})
${incomeUnrec.length ? renderLane(incomeUnrec) : '_none — all deposit income is reconciled_'}

## 🧮 Coding review → Standard Ledger (${founderReview.length} · ${money(sum(founderReview))})
Payments to the founder from this account. Confirm **drawings vs expense vs wages** — drawings should sit in equity, **excluded from project spend and from R&D**. Several are tagged ACT-CORE + R&D today.
${founderReview.map((r) => `- [ ] ${r.date} · **${money(r.amount)}** · ${r.contact_name} · ${r.project_code || 'UNTAGGED'}${r.rd_eligible ? ' · ⚠️ flagged R&D' : ''}${r.is_reconciled ? '' : ' · (also unreconciled)'}`).join('\n') || '_none_'}

## ⚠️ Possible duplicates → Standard Ledger (${dupsReview.length} · ${money(sum(dupsReview))})
Same date + amount + payee, ≥ ${money(DUP_MIN)}, more than once. On a card these are usually legit (group travel / recurring) — confirm only the lumpy ones aren't a double-pay before reconciling.
${dupsReview.map(line).join('\n') || '_none_'}
`;

const stamp = new Date().toISOString().slice(0, 10);
const fname = `scripts/output/reconciliation-worklist-${ACCOUNT.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${stamp}.md`;
writeFileSync(fname, md);
console.log(`\nWrote ${fname}\n`);
console.log(`Account: ${ACCOUNT} | last sync ${String(lastSync).slice(0,16)}`);
console.log(`UNRECONCILED → transfers ${transfers.length} (${money(sum(transfers))}), receipted spend ${spendReceipted.length} (${money(sum(spendReceipted))}), no-receipt spend ${spendNoReceipt.length}, income ${incomeUnrec.length}`);
console.log(`REVIEW → founder/coding ${founderReview.length} (${money(sum(founderReview))}), duplicates ${dupsReview.length}`);
console.log(`DONE → reconciled clean ${reconciledClean.length} (${money(sum(reconciledClean))})`);
