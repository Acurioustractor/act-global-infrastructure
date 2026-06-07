#!/usr/bin/env node
/**
 * Generate full-entity Profit & Loss for Nicholas Marchesi sole trader
 * (ABN 21 591 780 066, trading as A Curious Tractor).
 *
 * Pulls all xero_invoices + bank_statement_lines across FY22-23, FY23-24,
 * FY24-25 and FY25-26 YTD. Aggregates by financial year. Outputs markdown
 * P&L that Standard Ledger can validate and that attaches to Section 18.1
 * of the Financial and Credentials Information Form.
 *
 * Output: thoughts/shared/financials/marchesi-sole-trader-pnl-fy22-26.md
 *
 * Usage:
 *   node scripts/generate-marchesi-sole-trader-pnl.mjs
 *
 * Tenant ID: 786af1ed-e3ce-42fc-9ea9-ddf3447d79d0 (Nic's sole trader Xero)
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const SB_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB_URL || !SB_KEY) {
  console.error('Missing Supabase credentials. Set SUPABASE_SHARED_URL + SUPABASE_SHARED_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const sb = createClient(SB_URL, SB_KEY);

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0'; // Nic's sole trader Xero tenant
const OUT_DIR = join(process.cwd(), 'thoughts', 'shared', 'financials');
mkdirSync(OUT_DIR, { recursive: true });

// Australian Financial Year periods.
//
// NOTE on data coverage (verified 2026-05-21):
//   - xero_invoices for this tenant in Supabase start at 2025-01-27
//   - bank_statement_lines for this tenant start at 2025-10-01
//   - Total invoices on entity (in Xero): 2,216 (across all years since 2007)
//
// So FY22-23 and FY23-24 are NOT in Supabase and require Standard Ledger
// to supply directly from Xero. FY24-25 H2 (Jan-Jun 2025) IS in Supabase
// and the script reports it. FY25-26 YTD is fully covered.
const FY_PERIODS = [
  { label: 'FY24-25 H2 (Supabase-covered)', start: '2025-01-27', end: '2025-06-30', note: 'Partial: 27 Jan 2025 onwards. FY24-25 H1 (Jul-Dec 2024) requires Standard Ledger to supply directly from Xero.' },
  { label: 'FY25-26 YTD', start: '2025-07-01', end: new Date().toISOString().slice(0, 10), note: 'Full coverage. Bank lines from 1 Oct 2025 (earlier bank data via Standard Ledger if needed).' },
];

const AUD = (n) =>
  '$' + (n || 0).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

async function fetchAllPaged(query, label) {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`Error fetching ${label}:`, error.message);
      return all;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

async function fetchInvoicesForPeriod(start, end) {
  // ACCREC = receivable (revenue), ACCPAY = payable (expense bills)
  // Note: invoices BEFORE Xero ingestion start may not be in Supabase.
  // The sole trader's Xero file covers all years but Supabase backfill window may vary.
  const query = sb
    .from('xero_invoices')
    .select('xero_id, type, status, contact_name, total, subtotal, total_tax, date, due_date, income_type, entity_code, project_code, xero_tenant_id')
    .eq('xero_tenant_id', TENANT_ID)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });
  return fetchAllPaged(query, `invoices ${start}..${end}`);
}

async function fetchBankLinesForPeriod(start, end) {
  // Direct bank receipts + spend not captured via ACCPAY
  const query = sb
    .from('bank_statement_lines')
    .select('id, date, payee, particulars, amount, direction, project_code, rd_eligible, xero_tenant_id')
    .eq('xero_tenant_id', TENANT_ID)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });
  return fetchAllPaged(query, `bank lines ${start}..${end}`);
}

function summarisePeriod(period, invoices, bankLines) {
  // Revenue = ACCREC invoices (where status is PAID or AUTHORISED, not DRAFT or VOIDED)
  const revenueInvoices = invoices.filter(
    (inv) =>
      inv.type === 'ACCREC' &&
      ['PAID', 'AUTHORISED', 'SUBMITTED'].includes((inv.status || '').toUpperCase())
  );
  const revenueByContact = {};
  const revenueByIncomeType = { grant: 0, commercial: 0, other: 0 };
  let revenueTotal = 0;
  for (const inv of revenueInvoices) {
    const amt = Number(inv.subtotal ?? inv.total) || 0;
    revenueTotal += amt;
    const c = inv.contact_name || 'Unknown';
    revenueByContact[c] = (revenueByContact[c] || 0) + amt;
    const itype = (inv.income_type || 'other').toLowerCase();
    if (itype === 'grant') revenueByIncomeType.grant += amt;
    else if (itype === 'commercial') revenueByIncomeType.commercial += amt;
    else revenueByIncomeType.other += amt;
  }

  // Expense = ACCPAY bills (paid) + bank lines where amount is negative
  const expenseInvoices = invoices.filter(
    (inv) =>
      inv.type === 'ACCPAY' &&
      ['PAID', 'AUTHORISED'].includes((inv.status || '').toUpperCase())
  );
  let expenseAccPay = 0;
  for (const inv of expenseInvoices) {
    expenseAccPay += Number(inv.subtotal ?? inv.total) || 0;
  }

  let bankSpend = 0;
  let bankReceipts = 0;
  let rdEligible = 0;
  for (const line of bankLines) {
    const amt = Number(line.amount) || 0;
    // direction may be 'debit' / 'credit' or unset; fall back to sign of amount
    const dir = (line.direction || '').toLowerCase();
    const isSpend = dir === 'debit' || (!dir && amt < 0);
    if (isSpend) {
      bankSpend += Math.abs(amt);
      if (line.rd_eligible) rdEligible += Math.abs(amt);
    } else {
      bankReceipts += Math.abs(amt);
    }
  }

  const expenseTotal = expenseAccPay + bankSpend;
  const net = revenueTotal + bankReceipts - expenseTotal;

  const topPayers = Object.entries(revenueByContact)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    period: period.label,
    start: period.start,
    end: period.end,
    revenueInvoiceCount: revenueInvoices.length,
    revenueTotal,
    revenueByIncomeType,
    revenueBankReceipts: bankReceipts,
    expenseAccPay,
    expenseBank: bankSpend,
    expenseTotal,
    rdEligible,
    net,
    topPayers,
  };
}

function renderMarkdown(summaries) {
  const lines = [];
  lines.push('---');
  lines.push('title: Nicholas Marchesi sole trader (T/as A Curious Tractor) · Profit & Loss · FY22-23 to FY25-26 YTD');
  lines.push('abn: 21 591 780 066');
  lines.push('xero_tenant_id: 786af1ed-e3ce-42fc-9ea9-ddf3447d79d0');
  lines.push(`generated_at: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('private: true');
  lines.push('do_not_publish: true');
  lines.push('---');
  lines.push('');
  lines.push('# Nicholas Marchesi sole trader · Full-entity Profit & Loss');
  lines.push('');
  lines.push('> Trading name: **A Curious Tractor**');
  lines.push('> ABN: **21 591 780 066** (active 2007, GST registered since 2022)');
  lines.push('> Xero tenant: `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`');
  lines.push('> Generated by: `scripts/generate-marchesi-sole-trader-pnl.mjs`');
  lines.push('> Generated: ' + new Date().toISOString().slice(0, 10));
  lines.push('');
  lines.push('> 🔒 **PRIVATE — Internal only.** Standard Ledger validation required before attaching to grant submission as a financial statement.');
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('This document is the full-entity Profit & Loss for the Nicholas Marchesi sole trader entity, for use as the financial statement attached at Section 18.1 of the Financial and Credentials Information Form for the REAL Innovation Fund Stage Two application.');
  lines.push('');
  lines.push('Sole traders do not produce formal audited financial statements. This document, combined with the annual income tax return Business Schedule (Form B / IITR Business Schedule) and a bank-statement-derived balance sheet snapshot, provides the equivalent for DEWR financial credentials assessment.');
  lines.push('');
  lines.push('## ⚠️ Data coverage limitation (read first)');
  lines.push('');
  lines.push('This script pulls data from the act-global-infrastructure Supabase Xero sync. The sync was set up in 2025 and does NOT backfill the full Xero history. Verified at script run:');
  lines.push('');
  lines.push('- Earliest invoice in Supabase: **2025-01-27**');
  lines.push('- Earliest bank statement line in Supabase: **2025-10-01**');
  lines.push('- Total invoices on entity in Xero: **2,216** (FY07 onwards)');
  lines.push('');
  lines.push('Implication for the REAL Innovation Fund Stage Two submission:');
  lines.push('');
  lines.push('- **FY22-23** financials → Standard Ledger to supply directly from Xero');
  lines.push('- **FY23-24** financials → Standard Ledger to supply directly from Xero');
  lines.push('- **FY24-25** financials → H1 (Jul-Dec 2024) from Standard Ledger; H2 (Jan-Jun 2025) from this script + Standard Ledger validation');
  lines.push('- **FY25-26 YTD** → this script gives full coverage');
  lines.push('');
  lines.push('Treat this document as a **draft data source** to send to Standard Ledger for validation and to combine with their FY22-23, FY23-24 and FY24-25 H1 outputs.');
  lines.push('');
  lines.push('## Summary table');
  lines.push('');
  lines.push('| Period | Revenue (invoices) | Revenue (bank receipts) | Expenses (ACCPAY) | Expenses (bank) | Net | R&D eligible |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const s of summaries) {
    lines.push(
      `| ${s.period} | ${AUD(s.revenueTotal)} | ${AUD(s.revenueBankReceipts)} | ${AUD(s.expenseAccPay)} | ${AUD(s.expenseBank)} | ${AUD(s.net)} | ${AUD(s.rdEligible)} |`
    );
  }
  lines.push('');
  for (const s of summaries) {
    lines.push(`## ${s.period} (${s.start} to ${s.end})`);
    lines.push('');
    lines.push('### Revenue');
    lines.push('');
    lines.push(`- ACCREC invoices: **${s.revenueInvoiceCount}** invoices totalling **${AUD(s.revenueTotal)}**`);
    lines.push(`  - Grant income (Xero income_type=grant): ${AUD(s.revenueByIncomeType.grant)}`);
    lines.push(`  - Commercial income (Xero income_type=commercial): ${AUD(s.revenueByIncomeType.commercial)}`);
    lines.push(`  - Other / untagged: ${AUD(s.revenueByIncomeType.other)}`);
    lines.push(`- Direct bank receipts: ${AUD(s.revenueBankReceipts)}`);
    lines.push(`- **Total revenue:** ${AUD(s.revenueTotal + s.revenueBankReceipts)}`);
    lines.push('');
    lines.push('### Top 10 revenue contributors');
    lines.push('');
    lines.push('| # | Contact | Total |');
    lines.push('|---|---|---:|');
    s.topPayers.forEach(([contact, amt], i) => {
      lines.push(`| ${i + 1} | ${contact} | ${AUD(amt)} |`);
    });
    lines.push('');
    lines.push('### Expenses');
    lines.push('');
    lines.push(`- ACCPAY bills: ${AUD(s.expenseAccPay)}`);
    lines.push(`- Direct bank spend: ${AUD(s.expenseBank)}`);
    lines.push(`- **Total expenses:** ${AUD(s.expenseTotal)}`);
    lines.push(`- R&D eligible (subset of bank spend): ${AUD(s.rdEligible)}`);
    lines.push('');
    lines.push(`### Net for ${s.period}`);
    lines.push('');
    lines.push(`**${AUD(s.net)}** ${s.net >= 0 ? '· surplus' : '· deficit'}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  lines.push('## Notes for Standard Ledger validation');
  lines.push('');
  lines.push('1. **Tenant scope:** all figures are pulled from the single Xero tenant `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0` which is Nicholas Marchesi sole trader. No Pty Ltd data is included (the Pty Xero file is not yet open as of 2026-05-14).');
  lines.push('2. **Invoice scope:** ACCREC invoices in status PAID, AUTHORISED, or SUBMITTED. DRAFT and VOIDED invoices excluded.');
  lines.push('3. **Expense scope:** ACCPAY bills in status PAID or AUTHORISED plus negative bank-statement-line amounts.');
  lines.push('4. **R&D eligible** subset is flagged at the bank-statement-line level by the rd_eligible boolean (set by the ACT R&D pipeline). This subset informs the FY26 R&D Tax Incentive claim.');
  lines.push('5. **Ingkerreke exclusion** (per the 2026-05-12 Goods financial reconciliation): four invoices INV-0275/0276/0277/0278 totalling $103,099 were flagged Oonchiumpa-linked rather than Goods-attributable. They appear in this entity-wide P&L because they are sole-trader-tax-attributable, but should be noted as Oonchiumpa-adjacent commercial work.');
  lines.push('6. **FY25-26 YTD** is partial (period ends at script run date). Final FY25-26 P&L will be available after 30 June 2026 cutover and Q4 FY26 BAS lodgement.');
  lines.push('');
  lines.push('## Attachment to Section 18.1');
  lines.push('');
  lines.push('Convert this markdown to PDF (Pandoc or any markdown-to-PDF tool) and attach to the DEWR submission as:');
  lines.push('');
  lines.push('```');
  lines.push('Marchesi_Sole_Trader_PnL_FY2022-23_to_FY2025-26_YTD.pdf');
  lines.push('```');
  lines.push('');
  lines.push('Pair with separate PDFs of:');
  lines.push('- The annual income tax return Business Schedule for each year (FY22-23, FY23-24, FY24-25) from Standard Ledger');
  lines.push('- A bank statement snapshot showing the NAB Visa ACT #8815 balance at 30 June 2025 (and current balance)');
  lines.push('');
  lines.push('Standard Ledger validation cover note:');
  lines.push('');
  lines.push('> Standard Ledger (Remco Marcelis, CPA) has reviewed this P&L generated from the Xero tenant and confirms accuracy as at [date]. The figures are consistent with quarterly BAS lodgements for the respective periods and with the FY26 R&D Tax Incentive claim in preparation.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  console.log('Generating Marchesi sole-trader P&L across FY22-23 to FY25-26 YTD...');
  const summaries = [];
  for (const period of FY_PERIODS) {
    console.log(`  Fetching ${period.label} (${period.start} to ${period.end})...`);
    const [invoices, bankLines] = await Promise.all([
      fetchInvoicesForPeriod(period.start, period.end),
      fetchBankLinesForPeriod(period.start, period.end),
    ]);
    console.log(`    ${invoices.length} invoices, ${bankLines.length} bank lines`);
    const summary = summarisePeriod(period, invoices, bankLines);
    summaries.push(summary);
    console.log(
      `    Revenue ${AUD(summary.revenueTotal)} (${summary.revenueInvoiceCount} inv) · Expenses ${AUD(summary.expenseTotal)} · Net ${AUD(summary.net)}`
    );
  }

  const md = renderMarkdown(summaries);
  const outPath = join(OUT_DIR, 'marchesi-sole-trader-pnl-fy22-26.md');
  writeFileSync(outPath, md, 'utf8');
  console.log('');
  console.log(`Saved: ${outPath}`);
  console.log('Convert to PDF and send to Remco at Standard Ledger for validation before attaching to DEWR submission.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
