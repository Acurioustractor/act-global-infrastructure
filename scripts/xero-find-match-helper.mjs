#!/usr/bin/env node
/**
 * Xero Find & Match Helper — generates a clickable checklist of (bank txn, bill)
 * pairs for Nic to manually reconcile in Xero UI.
 *
 * Why: the biggest remaining value gap on the receipt side is the Qantas
 * connector pattern — ACCPAY bills with receipts exist in Xero, and bank SPEND
 * txns without receipts exist, and they need to be linked via Xero's "Find &
 * Match" UI. Our sync-bill-attachments-to-txns.mjs handles the exact-amount
 * cases, but many have small amount differences (FX, fees, rounding) that only
 * a human can confidently pair.
 *
 * Output: a sorted markdown checklist in thoughts/shared/reports/ with:
 *   - Direct URL to view the bank txn in Xero
 *   - Direct URL to view the candidate bill in Xero
 *   - Clear action for each pair (usually "Find & Match to Invoice #X")
 *
 * Safe: read-only, no API writes.
 *
 * Usage:
 *   node scripts/xero-find-match-helper.mjs Q2 Q3
 *   node scripts/xero-find-match-helper.mjs Q2 --vendors Qantas
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const VENDOR_FILTER = args.includes('--vendors') ? args[args.indexOf('--vendors') + 1].split(',').map(s => s.toLowerCase().trim()) : null;
const FY = args.includes('--fy') ? parseInt(args[args.indexOf('--fy') + 1]) : 26;

const QUARTERS = (() => {
  const y1 = 2000 + FY - 1, y2 = 2000 + FY;
  return {
    Q1: { start: `${y1}-07-01`, end: `${y1}-09-30` },
    Q2: { start: `${y1}-10-01`, end: `${y1}-12-31` },
    Q3: { start: `${y2}-01-01`, end: `${y2}-03-31` },
    Q4: { start: `${y2}-04-01`, end: `${y2}-06-30` },
  };
})();

const fmt = (n) => '$' + Number(n || 0).toFixed(2);

// Xero UI URLs — these work reliably with the old .aspx patterns
const xeroTxnUrl = (id) => `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${id}`;
const xeroInvoiceUrl = (id) => `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${id}`;

async function main() {
  const quarterArgs = args.filter(a => /^Q[1-4]$/i.test(a)).map(a => a.toUpperCase());
  if (quarterArgs.length === 0) { console.error('Specify quarters: Q1|Q2|Q3|Q4'); process.exit(1); }

  console.log(`=== Xero Find & Match Helper — ${quarterArgs.join(' + ')} ===\n`);

  // Load unreceipted bank SPEND
  const ranges = quarterArgs.map(q => QUARTERS[q]);
  const start = ranges.reduce((s, r) => r.start < s ? r.start : s, ranges[0].start);
  const end = ranges.reduce((e, r) => r.end > e ? r.end : e, ranges[0].end);

  const { data: txns } = await sb.from('xero_transactions')
    .select('xero_transaction_id, contact_name, total, date, type, bank_account, status')
    .eq('type', 'SPEND')
    .eq('status', 'AUTHORISED')
    .eq('has_attachments', false)
    .gte('date', start).lte('date', end);

  // Load ACCPAY bills ±30d around the range
  const lo = new Date(new Date(start).getTime() - 30*86400000).toISOString().slice(0,10);
  const hi = new Date(new Date(end).getTime() + 30*86400000).toISOString().slice(0,10);
  const { data: bills } = await sb.from('xero_invoices')
    .select('xero_id, contact_name, total, date, status, has_attachments, invoice_number')
    .eq('type', 'ACCPAY')
    .in('status', ['AUTHORISED', 'PAID'])
    .eq('has_attachments', true)
    .gte('date', lo).lte('date', hi);

  console.log(`Unreceipted SPEND: ${txns.length}`);
  console.log(`Bills with attachments in window: ${bills.length}`);

  // Index bills by vendor first-token for fuzzy matching
  const billsByVendor = new Map();
  for (const b of bills || []) {
    const token = (b.contact_name || '').toLowerCase().split(' ')[0];
    if (!billsByVendor.has(token)) billsByVendor.set(token, []);
    billsByVendor.get(token).push(b);
  }

  // For each unreceipted txn, find best bill candidate(s) with flexible matching
  const pairs = [];
  for (const tx of txns) {
    const name = (tx.contact_name || '').toLowerCase();
    if (VENDOR_FILTER && !VENDOR_FILTER.some(v => name.includes(v))) continue;

    const firstToken = name.split(' ')[0];
    if (!firstToken || firstToken.length < 3) continue;
    const candidates = billsByVendor.get(firstToken) || [];
    const txDate = new Date(tx.date).getTime();
    const txAmt = Math.abs(Number(tx.total));

    // Multi-tier matching with progressively wider tolerances:
    //   exact → ±0.50 amount, ±14d
    //   close → ±1% or ±$2, ±21d
    //   loose → ±5%, ±30d
    const scored = candidates.map(b => {
      const billDate = new Date(b.date).getTime();
      const dd = Math.abs(txDate - billDate) / 86400000;
      const amountDiff = Math.abs(txAmt - Number(b.total));
      const pctDiff = amountDiff / txAmt;
      let tier = null;
      if (dd <= 14 && amountDiff <= 0.50) tier = 'exact';
      else if (dd <= 21 && (amountDiff <= 2.00 || pctDiff <= 0.01)) tier = 'close';
      else if (dd <= 30 && pctDiff <= 0.05) tier = 'loose';
      return { bill: b, daysDiff: dd, amountDiff, pctDiff, tier };
    }).filter(x => x.tier !== null);

    if (scored.length === 0) continue;

    // Pick best: exact > close > loose, then closest date
    const tierOrder = { exact: 0, close: 1, loose: 2 };
    scored.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || a.daysDiff - b.daysDiff);
    pairs.push({ tx, ...scored[0] });
  }

  console.log(`\nMatched pairs: ${pairs.length}`);
  const byTier = { exact: 0, close: 0, loose: 0 };
  for (const p of pairs) byTier[p.tier]++;
  console.log(`  exact: ${byTier.exact} · close: ${byTier.close} · loose: ${byTier.loose}`);

  // Sort by value (largest first)
  pairs.sort((a, b) => Math.abs(Number(b.tx.total)) - Math.abs(Number(a.tx.total)));

  // Vendor rollup
  const byVendor = {};
  for (const p of pairs) {
    const v = p.tx.contact_name || '?';
    if (!byVendor[v]) byVendor[v] = { n: 0, total: 0 };
    byVendor[v].n++;
    byVendor[v].total += Math.abs(Number(p.tx.total));
  }

  // Render
  const totalValue = pairs.reduce((s, p) => s + Math.abs(Number(p.tx.total)), 0);
  const lines = [];
  lines.push(`# Xero Find & Match Checklist — ${quarterArgs.join(' + ')}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## For Nic`);
  lines.push(`Each row below is an unreceipted bank SPEND transaction that matches an existing bill (with attachment) in Xero. The receipt is already in Xero on the bill side — your job is to use **Find & Match** to link the two.`);
  lines.push(``);
  lines.push(`**How to do it:**`);
  lines.push(`1. Click the "Bank txn" link to open the bank transaction in Xero`);
  lines.push(`2. Click **Find & Match** in the top right`);
  lines.push(`3. Search for the invoice number listed in the "Bill #" column (or the vendor + amount)`);
  lines.push(`4. Select the matching bill and click Reconcile`);
  lines.push(`5. Check the row off in this document`);
  lines.push(``);
  lines.push(`**Priority:** work top-down by value. Exact-tier first (they're guaranteed matches), then close-tier, then loose.`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(`- Total pairs: **${pairs.length}**`);
  lines.push(`- Total value: **${fmt(totalValue)}**`);
  lines.push(`- Exact tier (guaranteed): ${byTier.exact} pairs`);
  lines.push(`- Close tier (check): ${byTier.close} pairs`);
  lines.push(`- Loose tier (verify carefully): ${byTier.loose} pairs`);
  lines.push(``);

  lines.push(`## By vendor`);
  lines.push(`| Vendor | Pairs | Value |`);
  lines.push(`|---|---:|---:|`);
  for (const [v, d] of Object.entries(byVendor).sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`| ${v} | ${d.n} | ${fmt(d.total)} |`);
  }
  lines.push(``);

  // Group by vendor for cleaner scanning
  lines.push(`## The checklist`);
  lines.push(``);
  const byVendorPairs = {};
  for (const p of pairs) {
    const v = p.tx.contact_name || '?';
    if (!byVendorPairs[v]) byVendorPairs[v] = [];
    byVendorPairs[v].push(p);
  }
  const sortedVendors = Object.entries(byVendorPairs).sort((a, b) => {
    const totalA = a[1].reduce((s, p) => s + Math.abs(Number(p.tx.total)), 0);
    const totalB = b[1].reduce((s, p) => s + Math.abs(Number(p.tx.total)), 0);
    return totalB - totalA;
  });

  for (const [vendor, vps] of sortedVendors) {
    const vTotal = vps.reduce((s, p) => s + Math.abs(Number(p.tx.total)), 0);
    lines.push(`### ${vendor} — ${vps.length} pairs, ${fmt(vTotal)}`);
    lines.push(``);
    lines.push(`| | Date | Amount | Tier | Bank txn | Bill # | Bill |`);
    lines.push(`|---|---|---:|---|---|---|---|`);
    for (const p of vps.sort((a, b) => Math.abs(Number(b.tx.total)) - Math.abs(Number(a.tx.total)))) {
      const emoji = p.tier === 'exact' ? '🟢' : p.tier === 'close' ? '🟡' : '🟠';
      const txLink = `[view](${xeroTxnUrl(p.tx.xero_transaction_id)})`;
      const billLink = `[view](${xeroInvoiceUrl(p.bill.xero_id)})`;
      const billNum = p.bill.invoice_number || p.bill.xero_id.slice(0, 8);
      lines.push(`| ☐ ${emoji} | ${p.tx.date} | ${fmt(Math.abs(p.tx.total))} | ${p.tier} | ${txLink} | ${billNum} | ${billLink} |`);
    }
    lines.push(``);
  }

  lines.push(`## Tier key`);
  lines.push(`- 🟢 **exact** — amount matches within $0.50, date within 14 days. These are guaranteed matches. Click, match, done.`);
  lines.push(`- 🟡 **close** — amount within 1% or $2, date within 21 days. Verify the invoice number before confirming.`);
  lines.push(`- 🟠 **loose** — amount within 5%, date within 30 days. Inspect carefully. Some may be wrong matches.`);
  lines.push(``);
  lines.push(`## When done`);
  lines.push(`Run \`node scripts/sync-xero-to-supabase.mjs\` to refresh the mirror, then \`node scripts/bas-completeness.mjs ${quarterArgs.join(' ')}\` to see the new coverage numbers.`);

  const tag = quarterArgs.join('-');
  const reportPath = `thoughts/shared/reports/xero-find-match-${tag}-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport: ${reportPath}`);
  console.log(`\nTotal value for Nic to reconcile: ${fmt(totalValue)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
