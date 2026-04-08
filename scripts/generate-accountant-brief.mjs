#!/usr/bin/env node
/**
 * Generate Accountant Brief — one-page MD per quarter for accountant handoff
 *
 * Summarises the quarter so the accountant can scan in 2 minutes before
 * opening Xero. Pairs with generate-bookkeeping-workbook.mjs and
 * prepare-bas.mjs — this is the "cover sheet" for the full pack.
 *
 * Usage:
 *   node scripts/generate-accountant-brief.mjs Q2
 *   node scripts/generate-accountant-brief.mjs Q3
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
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

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n, d) => d ? Math.round((n / d) * 100) + '%' : '0%';

async function main() {
  const quarterArg = (process.argv[2] || 'Q3').toUpperCase();
  const quarter = QUARTERS[quarterArg];
  if (!quarter) { console.error('Use Q1|Q2|Q3|Q4'); process.exit(1); }

  const today = new Date();
  const due = new Date(quarter.due);
  const daysUntil = Math.round((due - today) / 86400000);
  const overdue = daysUntil < 0;
  const dueLabel = overdue ? `OVERDUE by ${Math.abs(daysUntil)} days` : `due in ${daysUntil} days`;

  // Income (PAID ACCREC, cash basis)
  const income = await q(`
    SELECT contact_name, total::numeric(12,2), total_tax::numeric(12,2), invoice_number
    FROM xero_invoices
    WHERE type = 'ACCREC' AND status = 'PAID'
      AND COALESCE(fully_paid_date, date) >= '${quarter.start}'
      AND COALESCE(fully_paid_date, date) <= '${quarter.end}'
    ORDER BY total DESC
  `);
  const incomeTotal = income.reduce((s, r) => s + Number(r.total || 0), 0);
  const incomeGST = income.reduce((s, r) => s + Number(r.total_tax || 0), 0);

  // Expenses summary
  const expensesAgg = await q(`
    SELECT
      count(*)::int as total_count,
      sum(abs(total))::numeric(12,2) as total_amount,
      count(*) FILTER (WHERE has_attachments = true)::int as with_receipts,
      count(*) FILTER (WHERE is_reconciled = true)::int as reconciled,
      count(*) FILTER (WHERE project_code IS NOT NULL)::int as tagged,
      sum(abs(total)) FILTER (WHERE has_attachments = false)::numeric(12,2) as missing_amount
    FROM xero_transactions
    WHERE type = 'SPEND' AND date >= '${quarter.start}' AND date <= '${quarter.end}'
  `);
  const e = expensesAgg[0] || {};
  const expensesTotal = Number(e.total_amount || 0);
  const estGSTOnExpenses = expensesTotal / 11;
  const netGST = incomeGST - estGSTOnExpenses;

  // Top expense categories (project codes)
  const byProject = await q(`
    SELECT COALESCE(project_code, 'UNTAGGED') as project_code,
           count(*)::int as cnt,
           sum(abs(total))::numeric(12,2) as total
    FROM xero_transactions
    WHERE type = 'SPEND' AND date >= '${quarter.start}' AND date <= '${quarter.end}'
    GROUP BY 1 ORDER BY total DESC LIMIT 8
  `);

  // Top vendors missing receipts
  const missing = await q(`
    SELECT contact_name,
           count(*)::int as cnt,
           sum(abs(total))::numeric(12,2) as total
    FROM xero_transactions
    WHERE type = 'SPEND' AND date >= '${quarter.start}' AND date <= '${quarter.end}'
      AND has_attachments = false
    GROUP BY 1 ORDER BY total DESC LIMIT 5
  `);

  // R&D summary
  const rdList = RD_PROJECTS.map(p => `'${p}'`).join(',');
  const rd = await q(`
    SELECT project_code,
           count(*)::int as cnt,
           sum(abs(total))::numeric(12,2) as total,
           count(*) FILTER (WHERE has_attachments = true)::int as with_receipts
    FROM xero_transactions
    WHERE type = 'SPEND' AND date >= '${quarter.start}' AND date <= '${quarter.end}'
      AND project_code IN (${rdList})
    GROUP BY project_code ORDER BY total DESC
  `);
  const rdTotal = rd.reduce((s, r) => s + Number(r.total || 0), 0);
  const rdReceipted = rd.reduce((s, r) => s + (Number(r.total || 0) * Number(r.with_receipts || 0) / Math.max(Number(r.cnt || 1), 1)), 0);
  const rdRefund = rdTotal * 0.435;
  const rdAtRisk = (rdTotal - rdReceipted) * 0.435;

  // Receivables + payables
  const receivablesAgg = await q(`
    SELECT count(*)::int as cnt, sum(amount_due)::numeric(12,2) as total
    FROM xero_invoices WHERE type = 'ACCREC' AND status = 'AUTHORISED' AND amount_due > 0
  `);
  const payablesAgg = await q(`
    SELECT count(*)::int as cnt, sum(amount_due)::numeric(12,2) as total
    FROM xero_invoices WHERE type = 'ACCPAY' AND status = 'AUTHORISED' AND amount_due > 0
  `);

  // Confidence score (matches prepare-bas.mjs weights)
  const totalCount = Number(e.total_count || 0);
  const receiptScore = Number(e.with_receipts || 0) / Math.max(totalCount, 1);
  const tagScore = Number(e.tagged || 0) / Math.max(totalCount, 1);
  const reconScore = Number(e.reconciled || 0) / Math.max(totalCount, 1);
  const confidence = Math.round((receiptScore * 0.4 + tagScore * 0.3 + reconScore * 0.3) * 100);
  const confLabel = confidence >= 80 ? 'HIGH' : confidence >= 60 ? 'MEDIUM' : 'LOW';

  const brief = `# Accountant Brief — ${quarter.label}

**Entity:** Nicholas Marchesi T/as A Curious Tractor | **ABN:** 21 591 780 066
**Period:** ${quarter.start} → ${quarter.end} | **BAS Due:** ${quarter.due} (${dueLabel})
**Generated:** ${new Date().toISOString().slice(0, 16)} | **Confidence:** ${confidence}% ${confLabel}

---

## BAS at a Glance

| Line | Amount |
|---|---:|
| G1 Total Sales (inc GST) | ${fmt(incomeTotal)} |
| G11 Non-capital purchases | ${fmt(expensesTotal)} |
| 1A GST collected | ${fmt(incomeGST)} |
| 1B GST paid (estimated 1/11th) | ${fmt(estGSTOnExpenses)} |
| **Net GST position** | **${fmt(netGST)} ${netGST >= 0 ? 'PAYABLE' : 'REFUND'}** |

> ⚠ **1B is estimated** as total/11. Please verify against Xero BAS report — tax-type-aware number will be more accurate. My automation doesn't currently read the tax_type column on line items.

## Top Income (${income.length} invoices paid this quarter)

${income.slice(0, 5).map(i => `- ${i.contact_name} — ${fmt(i.total)} (GST ${fmt(i.total_tax)}) · ${i.invoice_number}`).join('\n') || '- (none)'}

## Expenses by Project (top 8)

| Project | Txns | Amount |
|---|---:|---:|
${byProject.map(p => `| ${p.project_code} | ${p.cnt} | ${fmt(p.total)} |`).join('\n')}

## Data Quality

- **Transactions:** ${totalCount}
- **Project-tagged:** ${e.tagged}/${totalCount} (${pct(e.tagged, totalCount)})
- **Receipts attached:** ${e.with_receipts}/${totalCount} (${pct(e.with_receipts, totalCount)})
- **Bank-reconciled:** ${e.reconciled}/${totalCount} (${pct(e.reconciled, totalCount)})
- **GST at risk from missing receipts:** ~${fmt(Number(e.missing_amount || 0) / 11)}

## Top 5 Missing Receipts (by value)

${missing.map(m => `- ${m.contact_name} — ${m.cnt} txns, ${fmt(m.total)} (GST ~${fmt(Number(m.total) / 11)})`).join('\n') || '- (none)'}

## R&D Tax Incentive (43.5% refundable offset)

| Project | Txns | Spend | Potential refund | Receipt coverage |
|---|---:|---:|---:|---:|
${rd.map(r => `| ${r.project_code} | ${r.cnt} | ${fmt(r.total)} | ${fmt(Number(r.total) * 0.435)} | ${pct(r.with_receipts, r.cnt)} |`).join('\n') || '| — | — | — | — | — |'}

- **Total R&D spend:** ${fmt(rdTotal)}
- **Potential refund:** ${fmt(rdRefund)}
- **At risk (missing receipts):** ${fmt(rdAtRisk)}

## Outstanding Balances

- **Receivables:** ${receivablesAgg[0]?.cnt || 0} invoices, ${fmt(receivablesAgg[0]?.total || 0)}
- **Payables:** ${payablesAgg[0]?.cnt || 0} bills, ${fmt(payablesAgg[0]?.total || 0)} (some likely already paid — need reconciliation)

## Open Questions for Accountant

1. ${overdue ? `Can we request a lodgement deferral for this quarter? It's ${Math.abs(daysUntil)} days overdue.` : `Confirm on-time lodgement path — we're ${daysUntil} days from due date.`}
2. Should we adjust the 1B estimate now, or wait for Xero's tax-type breakdown to be correct?
3. Triage plan for the ${payablesAgg[0]?.cnt || 0} outstanding payables — phantom vs real?
4. Write-off vs chase decision for aged receivables (>180 days)?
5. R&D substantiation — is our current receipt coverage enough to claim the full ${fmt(rdRefund)} or should we hold back the unreceipted portion?

## Companion Files

- Full BAS worksheet: thoughts/shared/reports/bas-worksheet-${quarterArg.toLowerCase()}-fy26-${new Date().toISOString().slice(0, 10)}.md
- Bookkeeping workbook (CSVs): thoughts/shared/reports/bookkeeping-${quarterArg.toLowerCase()}-fy26-${new Date().toISOString().slice(0, 10)}/
`;

  const outPath = path.join('thoughts/shared/reports', `accountant-brief-${quarterArg.toLowerCase()}-fy26-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(outPath, brief);
  console.log(`✅ ${outPath}`);
  console.log(`   ${quarter.label} | Net GST: ${fmt(netGST)} ${netGST >= 0 ? 'payable' : 'refund'} | Confidence: ${confidence}% ${confLabel}`);
}

main().catch(e => { console.error(e); process.exit(1); });
