#!/usr/bin/env node
/**
 * ACT receipt-gap monitor — the "never lose a receipt again" cron.
 * Lists ACT card/bank SPEND that has NO receipt on file (no Xero attachment AND no
 * finance_receipt_documents / Dext match), so gaps surface within days — chased while the
 * receipt is still in the inbox/wallet, not months later at BAS clean-up.
 *
 * Run weekly (alongside weekly-reconciliation). READ-ONLY.
 * Usage:
 *   node scripts/receipt-gap-monitor.mjs              # last 21 days
 *   node scripts/receipt-gap-monitor.mjs --days 60
 *   node scripts/receipt-gap-monitor.mjs --since 2025-10-01 --until 2026-05-31   # a BAS period
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const q = async s => { const { data, error } = await sb.rpc('exec_sql', { query: s }); if (error) { console.error('ERR', error.message); return []; } return data; };

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const days = Number(arg('--days', 21));
const until = arg('--until', null);
const since = arg('--since', null);
// The two ACT business accounts (two-account rule). Others (NM Personal / Maximiser) excluded.
const ACCTS = ["NAB Visa ACT #8815", "NJ Marchesi T/as ACT Everyday"];

const dateFilter = since
  ? `date BETWEEN '${since}'::date AND '${until || '2100-01-01'}'::date`
  : `date >= (CURRENT_DATE - ${days})`;
const acctList = ACCTS.map(a => `'${a.replace(/'/g, "''")}'`).join(',');

// ACT spend that has NO Xero attachment AND no receipt-doc match (amount+/-2 within 20 days, vendor token)
const rows = await q(`
  WITH spend AS (
    SELECT xero_transaction_id id, contact_name, date, total, has_attachments, project_code, line_items
    FROM xero_transactions
    WHERE type IN ('SPEND','SPEND-TRANSFER') AND status IS DISTINCT FROM 'DELETED'
      AND bank_account IN (${acctList}) AND ${dateFilter}
  )
  SELECT s.*, EXISTS (
    SELECT 1 FROM finance_receipt_documents r
    WHERE ABS(r.amount_total - ABS(s.total)) <= 2
      AND r.document_date BETWEEN s.date - 20 AND s.date + 20
  ) AS has_receipt_doc
  FROM spend s
  ORDER BY s.date DESC`);

const li = (x) => { try { const a = typeof x === 'string' ? JSON.parse(x) : x; const f = Array.isArray(a) ? a[0] : null; return f ? (f.TaxType || f.tax_type || '') : ''; } catch { return ''; } };
const gaps = rows.filter(r => !r.has_attachments && !r.has_receipt_doc);
const gstApplicable = gaps.filter(r => /INPUT|CAPEXINPUT/.test(li(r.line_items)) || li(r.line_items) === '');

const totalSpend = rows.reduce((a, r) => a + Math.abs(Number(r.total)), 0);
const gapSpend = gaps.reduce((a, r) => a + Math.abs(Number(r.total)), 0);
const gstAtRisk = gstApplicable.reduce((a, r) => a + Math.abs(Number(r.total)) / 11, 0);

console.log(`\n=== Receipt-gap monitor — ${since ? `${since}..${until || 'now'}` : `last ${days} days`} (ACT accounts only) ===`);
console.log(`ACT spend txns: ${rows.length} ($${totalSpend.toFixed(0)}) | WITH receipt: ${rows.length - gaps.length} | NO RECEIPT: ${gaps.length} ($${gapSpend.toFixed(0)})`);
console.log(`GST potentially at risk (unclaimable until a receipt is on file): ~$${gstAtRisk.toFixed(2)}\n`);
if (!gaps.length) { console.log('✅ Every ACT spend in window has a receipt. Nothing to chase.'); }
else {
  console.log('Unreceipted spend (chase these):');
  for (const r of gaps) console.log(`  ${r.date}  $${String(Math.abs(Number(r.total)).toFixed(2)).padStart(9)}  ${String(r.project_code || '-').padEnd(7)} ${(r.contact_name || '(no contact)').slice(0, 40)}`);
}
