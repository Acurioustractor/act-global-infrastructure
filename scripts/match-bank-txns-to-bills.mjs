#!/usr/bin/env node
/**
 * Match unreconciled Xero bank transactions to Awaiting Payment bills.
 *
 * Scores each unreconciled SPEND transaction on NAB Visa 8815 against every
 * Awaiting Payment ACCPAY bill by:
 *   - amount (40%)  — exact match within $0.01
 *   - date (25%)    — proximity, ±1 day ideal
 *   - vendor (35%)  — Dice coefficient on contact names
 *
 * Outputs a ranked list + an HTML report with Xero deep-links.
 * No writes to Xero (dry-run only by design, for safety).
 *
 * Usage:
 *   node scripts/match-bank-txns-to-bills.mjs                       # Top 50 high-conf
 *   node scripts/match-bank-txns-to-bills.mjs --limit 200
 *   node scripts/match-bank-txns-to-bills.mjs --html                # Also write report
 *   node scripts/match-bank-txns-to-bills.mjs --threshold 0.75
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const args = process.argv.slice(2);
const limIdx = args.indexOf('--limit');
const LIMIT = limIdx !== -1 ? parseInt(args[limIdx + 1], 10) : 50;
const thrIdx = args.indexOf('--threshold');
const THRESHOLD = thrIdx !== -1 ? parseFloat(args[thrIdx + 1]) : 0.7;
const HTML = args.includes('--html');

function bigrams(s) {
  const clean = (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const p = [];
  for (let i = 0; i < clean.length - 1; i++) p.push(clean.slice(i, i + 2));
  return p;
}
function similarity(a, b) {
  const A = bigrams(a), B = bigrams(b);
  if (!A.length || !B.length) return 0;
  const setB = new Set(B);
  const hit = A.filter((p) => setB.has(p)).length;
  return (2 * hit) / (A.length + B.length);
}

function amountScore(a, b) {
  const diff = Math.abs(Number(a) - Number(b));
  const larger = Math.max(Math.abs(Number(a)), Math.abs(Number(b)));
  if (diff < 0.01) return 1.0;
  if (diff < 0.5) return 0.95;
  if (diff < 2) return 0.85;
  if (larger > 0 && diff / larger < 0.02) return 0.75;  // within 2% (FX rounding)
  if (larger > 0 && diff / larger < 0.10) return 0.5;   // within 10%
  return 0;
}
function dateScore(a, b) {
  const days = Math.abs((new Date(a) - new Date(b)) / 86400000);
  if (days <= 1) return 1.0;
  if (days <= 3) return 0.9;
  if (days <= 7) return 0.8;
  if (days <= 14) return 0.6;
  if (days <= 30) return 0.3;
  return 0;
}

function fmt(n) {
  return (Number(n) || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

async function main() {
  console.log(`Match unreconciled NAB Visa 8815 transactions to Awaiting Payment bills\n`);

  const txns = await q(`
    SELECT xero_transaction_id, date, contact_name, total, type
    FROM xero_transactions
    WHERE bank_account = 'NAB Visa ACT #8815'
      AND type = 'SPEND'
      AND (is_reconciled IS NOT TRUE)
      AND date >= '2025-07-01'
    ORDER BY date DESC
  `);
  const bills = await q(`
    SELECT xero_id, invoice_number, contact_name, total, date, due_date
    FROM xero_invoices
    WHERE type = 'ACCPAY' AND status = 'AUTHORISED'
      AND date >= '2025-07-01'
    ORDER BY date DESC
  `);
  console.log(`Unreconciled SPEND txns: ${txns.length}`);
  console.log(`Awaiting Payment bills:  ${bills.length}\n`);

  // Greedy match: each bill used at most once
  const usedBills = new Set();
  const matches = [];
  const unmatched = [];

  // Sort bank txns by amount desc so big-ticket items match first
  const sortedTxns = [...txns].sort((a, b) => Number(b.total) - Number(a.total));

  for (const t of sortedTxns) {
    let best = null;
    for (const b of bills) {
      if (usedBills.has(b.xero_id)) continue;
      const a = amountScore(t.total, b.total);
      if (a === 0) continue;
      const d = dateScore(t.date, b.date);
      if (d === 0) continue;
      const v = similarity(t.contact_name, b.contact_name);
      const score = a * 0.4 + d * 0.25 + v * 0.35;
      if (!best || score > best.score) best = { bill: b, score, a, d, v };
    }
    if (best && best.score >= THRESHOLD) {
      usedBills.add(best.bill.xero_id);
      matches.push({ txn: t, ...best });
    } else {
      unmatched.push(t);
    }
  }

  const high = matches.filter((m) => m.score >= 0.9).sort((a, b) => b.score - a.score);
  const mid = matches.filter((m) => m.score < 0.9 && m.score >= THRESHOLD).sort((a, b) => b.score - a.score);

  console.log(`Matched (confident ≥0.9):  ${high.length} (${fmt(high.reduce((s, m) => s + Number(m.txn.total), 0))})`);
  console.log(`Matched (review ≥${THRESHOLD}):    ${mid.length} (${fmt(mid.reduce((s, m) => s + Number(m.txn.total), 0))})`);
  console.log(`No confident match:        ${unmatched.length} (${fmt(unmatched.reduce((s, t) => s + Number(t.total), 0))})\n`);

  const show = [...high, ...mid].slice(0, LIMIT);
  console.log('─── TOP MATCHES ───');
  console.log(`Date       | Vendor              | Amount  | Score | → Bill date | Bill contact         | Bill #`);
  for (const m of show) {
    const td = t2s(m.txn.date), bd = t2s(m.bill.date);
    const tv = (m.txn.contact_name || '?').slice(0, 18).padEnd(18);
    const bv = (m.bill.contact_name || '?').slice(0, 18).padEnd(18);
    const amt = `$${Number(m.txn.total).toFixed(2)}`.padStart(8);
    const sc = m.score.toFixed(2);
    console.log(`${td} | ${tv} | ${amt} | ${sc}  | ${bd}  | ${bv} | ${m.bill.invoice_number || '—'}`);
  }

  if (HTML) {
    const file = join(process.cwd(), 'thoughts', 'shared', 'financials', 'bank-match-report.html');
    const html = buildHtml(high, mid, unmatched);
    writeFileSync(file, html);
    console.log(`\n📄 HTML report: ${file}`);
  }

  console.log(`\nNext step: open Xero → Bank Accounts → NAB Visa #8815 → Reconcile. For each match above,`);
  console.log(`find the bank line by date + amount → Find & Match → search for the bill contact → OK.`);
  console.log(`High-confidence matches (≥0.9) should be the same suggestion Xero offers.`);
}

function t2s(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function buildHtml(high, mid, unmatched) {
  const row = (m, band) => `
    <tr class="${band}">
      <td>${t2s(m.txn.date)}</td>
      <td>${(m.txn.contact_name || '?').replace(/</g, '&lt;')}</td>
      <td style="text-align:right;">$${Number(m.txn.total).toFixed(2)}</td>
      <td style="text-align:center;"><b>${m.score.toFixed(2)}</b><br><small>a${m.a.toFixed(1)} d${m.d.toFixed(1)} v${m.v.toFixed(1)}</small></td>
      <td>${t2s(m.bill.date)}</td>
      <td>${(m.bill.contact_name || '?').replace(/</g, '&lt;')}</td>
      <td>${m.bill.invoice_number || ''}</td>
      <td><a href="https://go.xero.com/app/bills/invoice?invoiceId=${m.bill.xero_id}" target="_blank">bill</a></td>
    </tr>`;
  return `<!doctype html>
<html><head>
<meta charset="utf-8"><title>Bank match report — private</title>
<style>
body{font-family:system-ui;margin:24px;max-width:1600px;color:#111}
h1{margin:0 0 4px}
.note{color:#d97706;font-size:12px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:6px 10px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
th{background:#f3f4f6;font-size:11px;text-transform:uppercase;color:#555}
.high td{background:#ecfdf5}
.mid td{background:#fffbeb}
a{color:#2563eb}
</style></head><body>
<h1>🔒 Bank match report — PRIVATE</h1>
<div class="note">Private internal tool. Do not share. Generated ${new Date().toISOString()}.</div>
<p><b>${high.length}</b> high-confidence (≥0.9), <b>${mid.length}</b> review (≥0.7), <b>${unmatched.length}</b> no match</p>
<table>
<tr><th>Txn date</th><th>Vendor</th><th>Amount</th><th>Score</th><th>Bill date</th><th>Bill contact</th><th>Invoice #</th><th>Link</th></tr>
${high.map((m) => row(m, 'high')).join('\n')}
${mid.map((m) => row(m, 'mid')).join('\n')}
</table>
</body></html>`;
}

main().catch((e) => { console.error(e); process.exit(1); });
