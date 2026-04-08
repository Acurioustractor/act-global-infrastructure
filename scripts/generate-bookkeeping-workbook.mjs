#!/usr/bin/env node
/**
 * Generate Bookkeeping Workbook — consolidated per-quarter CSV bundle
 *
 * For a given quarter, writes a directory of CSVs (one per "tab") plus a
 * summary.md. Tabs: income, expenses, expenses-by-project, rd-allocation,
 * missing-receipts, receivables, payables.
 *
 * Uses cash basis: income rows by fully_paid_date, expenses by bank tx date.
 *
 * Usage:
 *   node scripts/generate-bookkeeping-workbook.mjs Q2
 *   node scripts/generate-bookkeeping-workbook.mjs Q3
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const QUARTERS = {
  Q1: { start: '2025-07-01', end: '2025-09-30', label: 'Q1 FY26 (Jul-Sep 2025)', due: '2025-10-28' },
  Q2: { start: '2025-10-01', end: '2025-12-31', label: 'Q2 FY26 (Oct-Dec 2025)', due: '2026-02-28' },
  Q3: { start: '2026-01-01', end: '2026-03-31', label: 'Q3 FY26 (Jan-Mar 2026)', due: '2026-04-28' },
  Q4: { start: '2026-04-01', end: '2026-06-30', label: 'Q4 FY26 (Apr-Jun 2026)', due: '2026-07-28' },
};

const RD_PROJECTS = ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'];

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCSV(rows, columns) {
  const header = columns.join(',');
  const body = rows.map(r => columns.map(c => csvEscape(r[c])).join(',')).join('\n');
  return header + '\n' + body + '\n';
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const quarterArg = (process.argv[2] || 'Q3').toUpperCase();
  const quarter = QUARTERS[quarterArg];
  if (!quarter) { console.error('Use Q1|Q2|Q3|Q4'); process.exit(1); }

  const stamp = new Date().toISOString().slice(0, 10);
  const outDir = path.join('thoughts/shared/reports', `bookkeeping-${quarterArg.toLowerCase()}-fy26-${stamp}`);
  mkdirSync(outDir, { recursive: true });

  console.log(`Generating bookkeeping workbook: ${quarter.label}`);
  console.log(`Output: ${outDir}/`);

  // ---- INCOME (ACCREC invoices paid in quarter, cash basis) ----
  // fully_paid_date is often NULL in sync — fall back to `date` for PAID invoices (matches prepare-bas.mjs pattern)
  const income = await q(`
    SELECT contact_name, invoice_number, reference,
           COALESCE(fully_paid_date, date) as paid_date,
           total::numeric(12,2), total_tax::numeric(12,2), amount_paid::numeric(12,2),
           status, project_code, income_type
    FROM xero_invoices
    WHERE type = 'ACCREC' AND status = 'PAID'
      AND COALESCE(fully_paid_date, date) >= '${quarter.start}'
      AND COALESCE(fully_paid_date, date) <= '${quarter.end}'
    ORDER BY COALESCE(fully_paid_date, date) DESC, total DESC
  `);
  writeFileSync(
    path.join(outDir, 'income.csv'),
    toCSV(income, ['paid_date', 'contact_name', 'invoice_number', 'reference', 'total', 'total_tax', 'project_code', 'income_type', 'status'])
  );

  // ---- EXPENSES (all SPEND bank transactions in quarter) ----
  const expenses = await q(`
    SELECT date, contact_name, total::numeric(12,2), project_code, entity_code,
           bank_account, has_attachments, is_reconciled, rd_eligible, rd_category, status
    FROM xero_transactions
    WHERE type = 'SPEND' AND date >= '${quarter.start}' AND date <= '${quarter.end}'
    ORDER BY date DESC, total DESC
  `);
  writeFileSync(
    path.join(outDir, 'expenses.csv'),
    toCSV(expenses, ['date', 'contact_name', 'total', 'project_code', 'entity_code', 'bank_account', 'has_attachments', 'is_reconciled', 'rd_eligible', 'rd_category', 'status'])
  );

  // ---- EXPENSES BY PROJECT ----
  const byProject = await q(`
    SELECT COALESCE(project_code, 'UNTAGGED') as project_code,
           count(*)::int as txn_count,
           sum(abs(total))::numeric(12,2) as total,
           count(*) FILTER (WHERE has_attachments = true)::int as with_receipts,
           count(*) FILTER (WHERE is_reconciled = true)::int as reconciled,
           sum(abs(total)) FILTER (WHERE has_attachments = false)::numeric(12,2) as at_risk
    FROM xero_transactions
    WHERE type = 'SPEND' AND date >= '${quarter.start}' AND date <= '${quarter.end}'
    GROUP BY 1 ORDER BY total DESC
  `);
  writeFileSync(
    path.join(outDir, 'expenses-by-project.csv'),
    toCSV(byProject, ['project_code', 'txn_count', 'total', 'with_receipts', 'reconciled', 'at_risk'])
  );

  // ---- R&D ALLOCATION (only R&D-eligible projects) ----
  const rdList = RD_PROJECTS.map(p => `'${p}'`).join(',');
  const rd = await q(`
    SELECT project_code, date, contact_name, total::numeric(12,2),
           has_attachments, rd_category, bank_account
    FROM xero_transactions
    WHERE type = 'SPEND' AND date >= '${quarter.start}' AND date <= '${quarter.end}'
      AND project_code IN (${rdList})
    ORDER BY project_code, date DESC
  `);
  writeFileSync(
    path.join(outDir, 'rd-allocation.csv'),
    toCSV(rd, ['project_code', 'date', 'contact_name', 'total', 'has_attachments', 'rd_category', 'bank_account'])
  );

  // ---- MISSING RECEIPTS (SPEND without attachments, sorted by GST at risk) ----
  const missing = await q(`
    SELECT date, contact_name, project_code, total::numeric(12,2),
           (abs(total) / 11)::numeric(12,2) as gst_at_risk, bank_account
    FROM xero_transactions
    WHERE type = 'SPEND' AND date >= '${quarter.start}' AND date <= '${quarter.end}'
      AND has_attachments = false
    ORDER BY abs(total) DESC
  `);
  writeFileSync(
    path.join(outDir, 'missing-receipts.csv'),
    toCSV(missing, ['date', 'contact_name', 'project_code', 'total', 'gst_at_risk', 'bank_account'])
  );

  // ---- RECEIVABLES OUTSTANDING ----
  const receivables = await q(`
    SELECT date, contact_name, invoice_number, reference,
           total::numeric(12,2), amount_due::numeric(12,2),
           (CURRENT_DATE - date)::int as days_old, project_code, status
    FROM xero_invoices
    WHERE type = 'ACCREC' AND status = 'AUTHORISED' AND amount_due > 0
    ORDER BY amount_due DESC
  `);
  writeFileSync(
    path.join(outDir, 'receivables-outstanding.csv'),
    toCSV(receivables, ['date', 'contact_name', 'invoice_number', 'reference', 'total', 'amount_due', 'days_old', 'project_code', 'status'])
  );

  // ---- PAYABLES OUTSTANDING ----
  const payables = await q(`
    SELECT date, contact_name, invoice_number, reference,
           total::numeric(12,2), amount_due::numeric(12,2),
           (CURRENT_DATE - date)::int as days_old, project_code, status
    FROM xero_invoices
    WHERE type = 'ACCPAY' AND status = 'AUTHORISED' AND amount_due > 0
    ORDER BY amount_due DESC
  `);
  writeFileSync(
    path.join(outDir, 'payables-outstanding.csv'),
    toCSV(payables, ['date', 'contact_name', 'invoice_number', 'reference', 'total', 'amount_due', 'days_old', 'project_code', 'status'])
  );

  // ---- SUMMARY MD ----
  const incomeTotal = income.reduce((s, r) => s + Number(r.total || 0), 0);
  const incomeGST = income.reduce((s, r) => s + Number(r.total_tax || 0), 0);
  const expensesTotal = expenses.reduce((s, r) => s + Math.abs(Number(r.total || 0)), 0);
  const estGSTOnExpenses = expensesTotal / 11;
  const rdTotal = rd.reduce((s, r) => s + Math.abs(Number(r.total || 0)), 0);
  const missingTotal = missing.reduce((s, r) => s + Math.abs(Number(r.total || 0)), 0);
  const receiptedCount = expenses.filter(r => r.has_attachments).length;
  const reconciledCount = expenses.filter(r => r.is_reconciled).length;

  const summary = `# Bookkeeping Workbook — ${quarter.label}

**Entity:** Nicholas Marchesi T/as A Curious Tractor
**ABN:** 21 591 780 066
**Period:** ${quarter.start} → ${quarter.end}
**BAS Due:** ${quarter.due}
**Generated:** ${new Date().toISOString().slice(0, 16)}

---

## Headline Numbers (Cash Basis)

| Metric | Value |
|---|---|
| Income (invoices paid) | $${fmt(incomeTotal)} |
| GST on income | $${fmt(incomeGST)} |
| Expenses (bank SPEND) | $${fmt(expensesTotal)} |
| GST on expenses (estimated) | $${fmt(estGSTOnExpenses)} |
| **Net GST position** | **$${fmt(incomeGST - estGSTOnExpenses)}** |
| R&D-eligible expenditure | $${fmt(rdTotal)} |
| R&D refund (43.5%) | $${fmt(rdTotal * 0.435)} |

## Data Quality

| Metric | Value |
|---|---|
| Total expense transactions | ${expenses.length} |
| With receipts | ${receiptedCount} (${Math.round(receiptedCount / Math.max(expenses.length, 1) * 100)}%) |
| Reconciled | ${reconciledCount} (${Math.round(reconciledCount / Math.max(expenses.length, 1) * 100)}%) |
| Missing receipts $ | $${fmt(missingTotal)} |
| Outstanding receivables | $${fmt(receivables.reduce((s, r) => s + Number(r.amount_due || 0), 0))} |
| Outstanding payables | $${fmt(payables.reduce((s, r) => s + Number(r.amount_due || 0), 0))} |

## Files in This Workbook

- \`income.csv\` — ${income.length} invoices paid this quarter
- \`expenses.csv\` — ${expenses.length} SPEND transactions
- \`expenses-by-project.csv\` — ${byProject.length} project-code groupings
- \`rd-allocation.csv\` — ${rd.length} R&D-eligible line items
- \`missing-receipts.csv\` — ${missing.length} transactions lacking a receipt (GST at risk: ~$${fmt(missingTotal / 11)})
- \`receivables-outstanding.csv\` — ${receivables.length} unpaid customer invoices
- \`payables-outstanding.csv\` — ${payables.length} unpaid supplier bills (some likely already paid — need reconciliation)

## How to Use

Open any CSV in Numbers / Excel / Google Sheets. Each file is a "tab" of the workbook. Filters worth applying:

- **expenses.csv** → filter \`has_attachments = false\` to see what still needs a receipt
- **expenses.csv** → filter \`is_reconciled = false\` to see what needs reconciliation in Xero
- **rd-allocation.csv** → filter \`has_attachments = false\` to see R&D refund at risk
- **receivables-outstanding.csv** → sort by \`days_old\` desc to triage aged debtors
`;
  writeFileSync(path.join(outDir, 'summary.md'), summary);

  console.log(`\n✅ Wrote 8 files to ${outDir}/`);
  console.log(`   Income: $${fmt(incomeTotal)} (${income.length} invoices)`);
  console.log(`   Expenses: $${fmt(expensesTotal)} (${expenses.length} txns, ${receiptedCount} w/receipts)`);
  console.log(`   R&D eligible: $${fmt(rdTotal)} → refund $${fmt(rdTotal * 0.435)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
