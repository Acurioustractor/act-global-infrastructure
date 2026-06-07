#!/usr/bin/env node
/**
 * Build the FLAG_AMBIGUOUS review surface (READ-ONLY): each unreconciled NAB Visa
 * spend-money that matches an unpaid AUTHORISED bill = the same purchase recorded
 * TWICE. Per pair the decision is pay-the-bill(+delete spend-money) vs void-the-bill
 * (+keep spend-money). This enriches each pair from LIVE Xero so Ben can decide.
 *
 * Writes recon-pack/ambiguous-review.md (grouped by $ desc) + refreshes which pairs
 * are still live-ambiguous (some may have changed since the plan was emitted).
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';
import { readFileSync, writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero = await createXeroClient(sb);
const plan = JSON.parse(readFileSync('thoughts/shared/recon-pack/ambiguous-plan.json', 'utf8'));
const acct = a => a?.Name || '';

const rows = [];
let n = 0;
for (const p of plan) {
  try {
    const t = (await xero.get(`BankTransactions/${p.txnId}`)).BankTransactions?.[0];
    const b = (await xero.get(`Invoices/${p.billId}`)).Invoices?.[0];
    const li = t?.LineItems?.[0];
    rows.push({
      ...p,
      // spend-money (live)
      sm_status: t?.Status, sm_recon: t?.IsReconciled, sm_att: t?.HasAttachments,
      sm_acct: li?.AccountCode || '', sm_acctName: li?.AccountCode ? '' : '', sm_bankAcct: acct(t?.BankAccount),
      // bill (live)
      bill_status: b?.Status, bill_due: b?.AmountDue, bill_att: b?.HasAttachments, bill_num: b?.InvoiceNumber || b?.InvoiceID,
      bill_acct: b?.LineItems?.[0]?.AccountCode || '',
    });
  } catch (e) { rows.push({ ...p, error: e.message?.slice(0, 60) }); }
  if (++n % 15 === 0) console.log(`  …${n}/${plan.length}`);
}

// classify current live state
const live = [], changed = [];
for (const r of rows) {
  if (r.error) { changed.push({ ...r, why: 'fetch error' }); continue; }
  if (r.sm_status === 'DELETED' || r.sm_recon === true) { changed.push({ ...r, why: `spend-money now ${r.sm_status}/recon=${r.sm_recon}` }); continue; }
  if (r.bill_status !== 'AUTHORISED') { changed.push({ ...r, why: `bill now ${r.bill_status}` }); continue; }
  live.push(r);
}
live.sort((a, b) => b.amount - a.amount);

const md = ['# FLAG_AMBIGUOUS review — NAB Visa #8815 (pay-the-bill vs void-the-bill)', '',
  `${live.length} still live-ambiguous · ${changed.length} changed since plan. Both records exist for one purchase → pick ONE.`,
  '', '| $ | date | vendor | spend-money (recon/att) | AUTHORISED bill (att/num) | default |', '|--:|---|---|---|---|---|'];
for (const r of live) md.push(`| ${r.amount} | ${r.date} | ${r.vendor || '(no name)'} | recon=${r.sm_recon} att=${r.sm_att} | att=${r.bill_att} ${r.bill_num} | ${r.bill_att && !r.sm_att ? 'PAY bill (it has the receipt) + del spend-money' : r.sm_att && !r.bill_att ? 'VOID bill + keep spend-money' : 'both/neither receipted — Ben decides'} |`);
if (changed.length) { md.push('', '## Changed since plan (no longer auto-ambiguous)', ''); for (const r of changed) md.push(`- ${r.amount} ${r.vendor} — ${r.why}`); }
writeFileSync('thoughts/shared/recon-pack/ambiguous-review.md', md.join('\n'));
// refresh the live-ambiguous plan for downstream action
writeFileSync('thoughts/shared/recon-pack/ambiguous-plan.json', JSON.stringify(live.map(r => ({ txnId: r.txnId, billId: r.billId, amount: r.amount, vendor: r.vendor, date: r.date, billNum: r.bill_num, sm_att: r.sm_att, bill_att: r.bill_att })), null, 2));

console.log(`\nLive-ambiguous: ${live.length} · changed: ${changed.length}`);
const sum = live.reduce((s, r) => s + r.amount, 0).toFixed(2);
console.log(`Live-ambiguous total: $${sum}`);
const recPay = live.filter(r => r.bill_att && !r.sm_att).length, recVoid = live.filter(r => r.sm_att && !r.bill_att).length, both = live.filter(r => r.bill_att === r.sm_att).length;
console.log(`Default split: PAY-bill ${recPay} · VOID-bill ${recVoid} · both/neither(Ben decides) ${both}`);
