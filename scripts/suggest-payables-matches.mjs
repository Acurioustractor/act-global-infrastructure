#!/usr/bin/env node
/**
 * Suggest Payables Matches — phantom bills cleanup
 *
 * 262 AUTHORISED ACCPAY bills totalling $190,827 are sitting on the balance
 * sheet. Most are from auto-billing integrations (Qantas, Uber, Virgin,
 * Webflow, Booking.com) where the bill gets auto-created but the matching
 * bank transaction reconciles separately, never linking to the bill.
 *
 * This script cross-references AUTHORISED ACCPAY bills against SPEND bank
 * transactions to propose likely matches. Does NOT write to Xero — produces
 * a Remove-&-Redo checklist for the manual Xero UI loop.
 *
 * Match criteria:
 *   - Same vendor (fuzzy, ≥0.7 similarity)
 *   - Same amount (exact or within $1)
 *   - Bank txn date within ±14 days of bill date
 *
 * Output: thoughts/shared/reports/phantom-payables-matches-<date>.md
 *
 * Usage:
 *   node scripts/suggest-payables-matches.mjs             # All AUTHORISED
 *   node scripts/suggest-payables-matches.mjs --vendor Qantas
 *   node scripts/suggest-payables-matches.mjs --days 30   # Only bills from last 30 days
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function similarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const aw = new Set(a.split(/\W+/).filter(Boolean));
  const bw = new Set(b.split(/\W+/).filter(Boolean));
  let common = 0;
  for (const w of aw) if (bw.has(w)) common++;
  return common / Math.max(aw.size, bw.size, 1);
}

async function main() {
  const args = process.argv.slice(2);
  const vendorArg = args.includes('--vendor') ? args[args.indexOf('--vendor') + 1] : null;
  const daysArg = args.includes('--days') ? parseInt(args[args.indexOf('--days') + 1], 10) : null;

  const vendorFilter = vendorArg ? `AND contact_name ILIKE '%${vendorArg.replace(/'/g, "''")}%'` : '';
  const daysFilter = daysArg ? `AND date >= CURRENT_DATE - ${daysArg}` : '';

  // Fetch AUTHORISED payables
  const bills = await q(`
    SELECT xero_id, invoice_number, contact_name, date, due_date,
           total::numeric(12,2), amount_due::numeric(12,2), amount_paid::numeric(12,2)
    FROM xero_invoices
    WHERE type = 'ACCPAY' AND status = 'AUTHORISED' AND amount_due > 0
      ${vendorFilter} ${daysFilter}
    ORDER BY date DESC
  `);
  console.log(`AUTHORISED payables: ${bills.length} (${fmt(bills.reduce((s, b) => s + Number(b.amount_due), 0))} total)`);

  // Fetch all SPEND bank transactions from the widest relevant window.
  // Supabase exec_sql truncates at 1000 rows — paginate to get everything.
  const minDate = bills.length > 0
    ? bills.reduce((m, b) => b.date < m ? b.date : m, bills[0].date)
    : '2025-01-01';
  const maxDate = bills.length > 0
    ? bills.reduce((m, b) => b.date > m ? b.date : m, bills[0].date)
    : '2026-06-30';

  // Widen window ±30 days beyond bill range
  const wStart = new Date(minDate); wStart.setDate(wStart.getDate() - 30);
  const wEnd = new Date(maxDate); wEnd.setDate(wEnd.getDate() + 30);
  const wStartStr = wStart.toISOString().slice(0, 10);
  const wEndStr = wEnd.toISOString().slice(0, 10);

  // Constrain to only the amounts that appear on at least one bill — massively
  // reduces the row count since we need exact-amount matches anyway.
  const billAmounts = [...new Set(bills.map(b => Number(b.amount_due).toFixed(2)))];
  const amountsList = billAmounts.map(a => `'${a}'`).join(',');

  const txns = [];
  let offset = 0;
  while (true) {
    const page = await q(`
      SELECT xero_transaction_id, date, contact_name, abs(total)::numeric(12,2) as amount,
             bank_account, is_reconciled, has_attachments
      FROM xero_transactions
      WHERE type = 'SPEND'
        AND date >= '${wStartStr}' AND date <= '${wEndStr}'
        AND abs(total)::numeric(12,2)::text IN (${amountsList})
      ORDER BY date
      LIMIT 1000 OFFSET ${offset}
    `);
    txns.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
    if (offset > 20000) { console.warn('Hit 20k safety cap'); break; }
  }
  console.log(`SPEND bank transactions in window (${wStartStr} → ${wEndStr}, amount-constrained): ${txns.length}`);

  // Index bank transactions by rounded amount for fast lookup
  const txnsByAmount = new Map();
  for (const t of txns) {
    const amt = Number(t.amount).toFixed(2);
    if (!txnsByAmount.has(amt)) txnsByAmount.set(amt, []);
    txnsByAmount.get(amt).push(t);
  }

  // For each bill, find matching bank transaction
  const usedTxns = new Set();
  const matches = [];
  const noMatch = [];

  for (const bill of bills) {
    const billAmount = Number(bill.amount_due).toFixed(2);
    const billDate = new Date(bill.date);

    const candidates = (txnsByAmount.get(billAmount) || [])
      .filter(t => !usedTxns.has(t.xero_transaction_id))
      .map(t => {
        const dayDiff = Math.abs((new Date(t.date) - billDate) / 86400000);
        const vSim = similarity(t.contact_name, bill.contact_name);
        let score = 0;
        if (vSim >= 0.7) score += 50 * vSim;
        else if (vSim >= 0.4) score += 20 * vSim;
        if (dayDiff < 3) score += 40;
        else if (dayDiff < 7) score += 25;
        else if (dayDiff < 14) score += 15;
        else if (dayDiff < 30) score += 5;
        return { txn: t, score, vSim, dayDiff };
      })
      .filter(c => c.score >= 40)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const best = candidates[0];
      usedTxns.add(best.txn.xero_transaction_id);
      matches.push({ bill, match: best, others: candidates.slice(1, 3) });
    } else {
      noMatch.push(bill);
    }
  }

  // Group matches by vendor for the Remove & Redo batches
  const byVendor = new Map();
  for (const m of matches) {
    const v = m.bill.contact_name;
    if (!byVendor.has(v)) byVendor.set(v, []);
    byVendor.get(v).push(m);
  }
  const vendorsSorted = [...byVendor.entries()]
    .map(([vendor, matchList]) => ({
      vendor,
      count: matchList.length,
      total: matchList.reduce((s, m) => s + Number(m.bill.amount_due), 0),
      matches: matchList,
    }))
    .sort((a, b) => b.total - a.total);

  // Build report
  const lines = [];
  lines.push('# Phantom Payables Matching');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString().slice(0, 16)}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  const totalMatched = matches.reduce((s, m) => s + Number(m.bill.amount_due), 0);
  const totalUnmatched = noMatch.reduce((s, b) => s + Number(b.amount_due), 0);
  lines.push(`- **AUTHORISED bills:** ${bills.length} (${fmt(bills.reduce((s, b) => s + Number(b.amount_due), 0))})`);
  lines.push(`- **Matched to bank transactions:** ${matches.length} (${fmt(totalMatched)})`);
  lines.push(`- **No match found:** ${noMatch.length} (${fmt(totalUnmatched)})`);
  lines.push(`- **Unique vendors needing Remove-&-Redo:** ${vendorsSorted.length}`);
  lines.push('');
  lines.push('## The Fix (per vendor)');
  lines.push('');
  lines.push('In Xero: **Accounting → Bank accounts → [account] → Account Transactions**. For each matched bank transaction below:');
  lines.push('');
  lines.push('1. Open the bank transaction');
  lines.push('2. Click **Options → Remove & Redo**');
  lines.push('3. Go back to **Reconcile**');
  lines.push('4. On the bank line, click **Find & Match**');
  lines.push('5. Select the matching bill (shown below) → **Reconcile**');
  lines.push('');
  lines.push('Expect ~1 min per transaction once you get the rhythm. The vendors are grouped so you can batch through one vendor at a time (same bank account, same UI filter).');
  lines.push('');

  lines.push('## Vendors Ranked by Value');
  lines.push('');
  lines.push('| Vendor | Bills | Value | Est. time |');
  lines.push('|---|---:|---:|---:|');
  for (const v of vendorsSorted) {
    lines.push(`| ${v.vendor} | ${v.count} | ${fmt(v.total)} | ${Math.ceil(v.count * 1.5)} min |`);
  }
  lines.push('');

  // Per-vendor detail
  for (const v of vendorsSorted) {
    lines.push(`### ${v.vendor} — ${v.count} bills, ${fmt(v.total)}`);
    lines.push('');
    lines.push('| Bill # | Bill date | Amount | Bank txn date | Bank account | Score |');
    lines.push('|---|---|---:|---|---|---:|');
    for (const m of v.matches.sort((a, b) => Number(b.bill.amount_due) - Number(a.bill.amount_due))) {
      lines.push(`| ${m.bill.invoice_number || '-'} | ${m.bill.date} | ${fmt(m.bill.amount_due)} | ${m.match.txn.date} | ${m.match.txn.bank_account || '-'} | ${Math.round(m.match.score)}% |`);
    }
    lines.push('');
  }

  if (noMatch.length > 0) {
    lines.push('## ⚠️ Bills With No Bank Match');
    lines.push('');
    lines.push(`These ${noMatch.length} bills don't have an obvious matching bank transaction. Possibilities:`);
    lines.push('');
    lines.push('- Bill is a duplicate that should be voided');
    lines.push('- Bill was paid from a non-Xero account (personal card, cash)');
    lines.push('- Bill is legitimately outstanding and needs to be paid');
    lines.push('- Bill amount changed between creation and payment (FX, credit)');
    lines.push('');
    lines.push('| Vendor | Bill # | Date | Amount |');
    lines.push('|---|---|---|---:|');
    for (const b of noMatch.sort((a, b) => Number(b.amount_due) - Number(a.amount_due)).slice(0, 40)) {
      lines.push(`| ${b.contact_name} | ${b.invoice_number || '-'} | ${b.date} | ${fmt(b.amount_due)} |`);
    }
    if (noMatch.length > 40) lines.push(`| _... ${noMatch.length - 40} more_ | | | |`);
    lines.push('');
  }

  const outPath = path.join('thoughts/shared/reports', `phantom-payables-matches-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(outPath, lines.join('\n'));
  console.log(`\n✅ ${outPath}`);
  console.log(`   Matched: ${matches.length}/${bills.length} bills (${fmt(totalMatched)}) across ${vendorsSorted.length} vendors`);
  console.log(`   No match: ${noMatch.length} bills (${fmt(totalUnmatched)})`);
}

main().catch(e => { console.error(e); process.exit(1); });
