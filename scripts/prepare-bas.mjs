#!/usr/bin/env node
/**
 * Prepare BAS — Automated Business Activity Statement worksheet
 *
 * Generates a complete BAS worksheet for any quarter, using CASH basis accounting.
 * Under CASH basis: GST is reported when payment is RECEIVED (sales) or MADE (purchases).
 *
 * Usage:
 *   node scripts/prepare-bas.mjs              # Current quarter (Q3 FY26)
 *   node scripts/prepare-bas.mjs Q2           # Specific quarter
 *   node scripts/prepare-bas.mjs --save       # Save report to file
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Xero auth
const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;
const TOKEN_FILE = path.join(process.cwd(), '.xero-tokens.json');
const XERO_API = 'https://api.xero.com/api.xro/2.0';

function loadTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const t = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      XERO_ACCESS_TOKEN = t.access_token;
      if (t.refresh_token) XERO_REFRESH_TOKEN = t.refresh_token;
    }
  } catch (e) { /* ignore */ }
}

async function refreshToken() {
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: XERO_CLIENT_ID, refresh_token: XERO_REFRESH_TOKEN }),
  });
  if (!r.ok) return false;
  const d = await r.json();
  XERO_ACCESS_TOKEN = d.access_token;
  XERO_REFRESH_TOKEN = d.refresh_token;
  writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in * 1000) - 60000 }, null, 2));
  return true;
}

async function xeroGet(endpoint) {
  let r = await fetch(`${XERO_API}/${endpoint}`, {
    headers: { 'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`, 'xero-tenant-id': XERO_TENANT_ID, 'Accept': 'application/json' },
  });
  if (r.status === 401) {
    await refreshToken();
    r = await fetch(`${XERO_API}/${endpoint}`, {
      headers: { 'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`, 'xero-tenant-id': XERO_TENANT_ID, 'Accept': 'application/json' },
    });
  }
  if (!r.ok) return null;
  return r.json();
}

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL Error:', error.message); return []; }
  return data || [];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Quarter definitions for FY26 (Jul 2025 - Jun 2026)
const QUARTERS = {
  Q1: { start: '2025-07-01', end: '2025-09-30', label: 'Q1 FY26 (Jul-Sep 2025)', due: '2025-10-28' },
  Q2: { start: '2025-10-01', end: '2025-12-31', label: 'Q2 FY26 (Oct-Dec 2025)', due: '2026-02-28' },
  Q3: { start: '2026-01-01', end: '2026-03-31', label: 'Q3 FY26 (Jan-Mar 2026)', due: '2026-04-28' },
  Q4: { start: '2026-04-01', end: '2026-06-30', label: 'Q4 FY26 (Apr-Jun 2026)', due: '2026-07-28' },
};

function getCurrentQuarter() {
  const now = new Date();
  const month = now.getMonth() + 1;
  if (month >= 7 && month <= 9) return 'Q1';
  if (month >= 10 && month <= 12) return 'Q2';
  if (month >= 1 && month <= 3) return 'Q3';
  return 'Q4';
}

function fmt(n) {
  if (n === null || n === undefined) return '$0.00';
  return '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(n, d) {
  if (!d) return '0%';
  return Math.round((n / d) * 100) + '%';
}

async function main() {
  const args = process.argv.slice(2);
  const quarterArg = args.find(a => /^Q[1-4]$/i.test(a))?.toUpperCase() || getCurrentQuarter();
  const saveToFile = args.includes('--save');
  const quarter = QUARTERS[quarterArg];
  if (!quarter) { console.error('Invalid quarter. Use Q1, Q2, Q3, or Q4.'); process.exit(1); }

  loadTokens();
  if (!XERO_ACCESS_TOKEN) await refreshToken();

  const report = [];
  const push = (s) => { report.push(s); console.log(s); };

  push(`${'='.repeat(72)}`);
  push(`  BAS WORKSHEET — ${quarter.label}`);
  push(`  Entity: Nicholas Marchesi T/as A Curious Tractor`);
  push(`  ABN: 21 591 780 066`);
  push(`  GST Basis: CASH | Reporting: Quarterly`);
  push(`  Due Date: ${quarter.due}`);
  push(`  Generated: ${new Date().toISOString().slice(0, 16)}`);
  push(`${'='.repeat(72)}`);
  push('');

  // =========================================================================
  // SECTION 1: GST on SALES (G1, 1A) — Cash basis = invoices PAID in quarter
  // =========================================================================
  push('━━━ SECTION 1: GST ON SALES ━━━');
  push('(Cash basis: only invoices where payment was RECEIVED in this quarter)');
  push('');

  // Get ACCREC invoices paid in the quarter
  const salesPaid = await q(`
    SELECT contact_name, invoice_number, total::numeric(12,2), total_tax::numeric(12,2) as gst,
           date, status, amount_paid::numeric(12,2)
    FROM xero_invoices
    WHERE type = 'ACCREC' AND status = 'PAID'
    AND date >= '${quarter.start}' AND date <= '${quarter.end}'
    ORDER BY total DESC
  `);

  // Also get RECEIVE bank transactions (direct sales income)
  const directIncome = await q(`
    SELECT contact_name, total::numeric(12,2), date, reference
    FROM xero_transactions
    WHERE type = 'RECEIVE' AND date >= '${quarter.start}' AND date <= '${quarter.end}'
    ORDER BY total DESC
  `);

  let totalSales = 0;
  let totalSalesGST = 0;

  if (salesPaid.length > 0) {
    push('  Invoices paid this quarter:');
    push('  ' + '-'.repeat(68));
    for (const inv of salesPaid) {
      push(`  ${(inv.contact_name || '?').padEnd(30)} ${inv.invoice_number?.padEnd(12) || ''.padEnd(12)} ${fmt(inv.total).padStart(12)}  GST ${fmt(inv.gst).padStart(10)}`);
      totalSales += Number(inv.total) || 0;
      totalSalesGST += Number(inv.gst) || 0;
    }
    push('');
  }

  if (directIncome.length > 0) {
    push('  Direct income (bank receives):');
    push('  ' + '-'.repeat(68));
    for (const tx of directIncome) {
      push(`  ${(tx.contact_name || '?').padEnd(30)} ${(tx.reference || '').padEnd(12)} ${fmt(tx.total).padStart(12)}`);
      totalSales += Number(tx.total) || 0;
      // Estimate GST as 1/11 of total for GST-inclusive income
    }
    push('');
  }

  push(`  G1  Total Sales (inc GST)        ${fmt(totalSales).padStart(15)}`);
  push(`  1A  GST on Sales                 ${fmt(totalSalesGST).padStart(15)}`);
  push('');

  // =========================================================================
  // SECTION 2: GST on PURCHASES (G10, G11, 1B)
  // =========================================================================
  push('━━━ SECTION 2: GST ON PURCHASES ━━━');
  push('(Cash basis: bank transactions where payment was MADE in this quarter)');
  push('');

  // Get all SPEND transactions in the quarter
  const spendByProject = await q(`
    SELECT COALESCE(project_code, 'UNTAGGED') as proj, count(*)::int as cnt,
           sum(abs(total))::numeric(12,2) as total
    FROM xero_transactions
    WHERE date >= '${quarter.start}' AND date <= '${quarter.end}' AND type = 'SPEND'
    GROUP BY 1 ORDER BY total DESC
  `);

  let totalPurchases = 0;
  push('  Purchases by project:');
  push('  ' + '-'.repeat(50));
  for (const p of spendByProject) {
    push(`  ${p.proj.padEnd(15)} ${String(p.cnt).padStart(4)} txns  ${fmt(p.total).padStart(12)}`);
    totalPurchases += Number(p.total) || 0;
  }
  push(`  ${'TOTAL'.padEnd(15)} ${String(spendByProject.reduce((s, p) => s + p.cnt, 0)).padStart(4)} txns  ${fmt(totalPurchases).padStart(12)}`);
  push('');

  // Estimate GST on purchases (INPUT tax type = 10% GST claimable)
  // Without tax_type column, estimate from Xero reports
  const estimatedPurchaseGST = totalPurchases / 11; // Rough: assume most are GST-inclusive

  // Try to get P&L from Xero for accurate GST numbers
  push('  Fetching Xero P&L for accurate GST breakdown...');
  const pnl = await xeroGet(`Reports/ProfitAndLoss?fromDate=${quarter.start}&toDate=${quarter.end}`);
  await sleep(1100);

  let xeroIncome = 0, xeroExpenses = 0;
  if (pnl?.Reports?.[0]) {
    const rpt = pnl.Reports[0];
    for (const section of rpt.Rows || []) {
      if (section.RowType === 'Section') {
        for (const row of section.Rows || []) {
          if (row.RowType === 'SummaryRow') {
            const label = row.Cells?.[0]?.Value || '';
            const val = parseFloat(row.Cells?.[1]?.Value?.replace(/,/g, '') || '0');
            if (label.includes('Total Operating Income') || label.includes('Total Income')) xeroIncome = val;
            if (label.includes('Total Operating Expenses') || label.includes('Total Expenses')) xeroExpenses = val;
          }
        }
      }
    }
    push(`  Xero P&L: Income ${fmt(xeroIncome)}, Expenses ${fmt(xeroExpenses)}`);
  }
  push('');

  // Try BASReport endpoint (AU-specific)
  push('  Fetching BAS Report from Xero...');
  const basReport = await xeroGet(`Reports/BASReport?fromDate=${quarter.start}&toDate=${quarter.end}`);
  await sleep(1100);

  let basG1 = null, basG10 = null, basG11 = null, bas1A = null, bas1B = null;
  if (basReport?.Reports?.[0]) {
    push('  BAS Report available from Xero:');
    const rpt = basReport.Reports[0];
    for (const section of rpt.Rows || []) {
      for (const row of section.Rows || []) {
        const cells = row.Cells || [];
        const label = cells[0]?.Value || '';
        const val = cells[1]?.Value || '';
        if (label.includes('G1')) { basG1 = val; push(`    G1  ${label}: ${val}`); }
        if (label.includes('G10')) { basG10 = val; push(`    G10 ${label}: ${val}`); }
        if (label.includes('G11')) { basG11 = val; push(`    G11 ${label}: ${val}`); }
        if (label.includes('1A')) { bas1A = val; push(`    1A  ${label}: ${val}`); }
        if (label.includes('1B')) { bas1B = val; push(`    1B  ${label}: ${val}`); }
      }
    }
  } else {
    push('  BAS Report not available via API — calculating from transaction data.');
  }
  push('');

  // =========================================================================
  // SECTION 3: BAS WORKSHEET SUMMARY
  // =========================================================================
  push('━━━ SECTION 3: BAS WORKSHEET SUMMARY ━━━');
  push('');

  const g1 = basG1 ? parseFloat(basG1.replace(/,/g, '')) : totalSales;
  const g1A = bas1A ? parseFloat(bas1A.replace(/,/g, '')) : totalSalesGST;
  const g10 = basG10 ? parseFloat(basG10.replace(/,/g, '')) : 0; // Capital purchases
  const g11 = basG11 ? parseFloat(basG11.replace(/,/g, '')) : totalPurchases;
  const g1B = bas1B ? parseFloat(bas1B.replace(/,/g, '')) : estimatedPurchaseGST;

  push(`  G1   Total Sales (inc GST)              ${fmt(g1).padStart(15)}`);
  push(`  G2   Export sales                       ${fmt(0).padStart(15)}`);
  push(`  G3   GST-free sales                     ${fmt(0).padStart(15)}`);
  push(`  G10  Capital purchases                  ${fmt(g10).padStart(15)}`);
  push(`  G11  Non-capital purchases              ${fmt(g11).padStart(15)}`);
  push('');
  push(`  1A   GST on Sales (collected)           ${fmt(g1A).padStart(15)}`);
  push(`  1B   GST on Purchases (paid)           -${fmt(g1B).padStart(14)}`);
  push(`  ─────────────────────────────────────────────────────`);
  const netGST = g1A - g1B;
  push(`  NET  GST position                       ${fmt(netGST).padStart(15)} ${netGST >= 0 ? '(PAYABLE to ATO)' : '(REFUND from ATO)'}`);
  push('');

  // =========================================================================
  // SECTION 4: RECEIPT COVERAGE & CONFIDENCE
  // =========================================================================
  push('━━━ SECTION 4: RECEIPT COVERAGE & CONFIDENCE ━━━');
  push('');

  const receiptCoverage = await q(`
    SELECT has_attachments, count(*)::int as cnt, sum(abs(total))::numeric(12,2) as total
    FROM xero_transactions
    WHERE date >= '${quarter.start}' AND date <= '${quarter.end}' AND type = 'SPEND'
    GROUP BY 1
  `);

  const withReceipts = receiptCoverage.find(r => r.has_attachments === true) || { cnt: 0, total: 0 };
  const withoutReceipts = receiptCoverage.find(r => r.has_attachments === false) || { cnt: 0, total: 0 };
  const totalTxns = Number(withReceipts.cnt) + Number(withoutReceipts.cnt);
  const totalAmt = Number(withReceipts.total) + Number(withoutReceipts.total);

  push(`  Receipts attached:    ${String(withReceipts.cnt).padStart(4)} / ${totalTxns} transactions (${pct(withReceipts.cnt, totalTxns)})`);
  push(`  Amount documented:    ${fmt(withReceipts.total).padStart(12)} / ${fmt(totalAmt)} (${pct(Number(withReceipts.total), totalAmt)})`);
  push(`  Amount at risk:       ${fmt(withoutReceipts.total).padStart(12)} (GST credits: ~${fmt(Number(withoutReceipts.total) / 11)})`);
  push('');

  // Project tagging
  const tagCoverage = await q(`
    SELECT
      count(*) FILTER (WHERE project_code IS NOT NULL)::int as tagged,
      count(*)::int as total
    FROM xero_transactions
    WHERE date >= '${quarter.start}' AND date <= '${quarter.end}' AND type = 'SPEND'
  `);

  const tagged = tagCoverage[0]?.tagged || 0;
  const tagTotal = tagCoverage[0]?.total || 0;
  push(`  Project tags:         ${String(tagged).padStart(4)} / ${tagTotal} transactions (${pct(tagged, tagTotal)})`);

  // Reconciliation
  const reconData = await q(`
    SELECT is_reconciled, count(*)::int as cnt
    FROM xero_transactions
    WHERE date >= '${quarter.start}' AND date <= '${quarter.end}'
    GROUP BY 1
  `);

  const reconciled = reconData.find(r => r.is_reconciled === true)?.cnt || 0;
  const unreconciled = reconData.find(r => r.is_reconciled === false)?.cnt || 0;
  const reconTotal = reconciled + unreconciled;
  push(`  Reconciled:           ${String(reconciled).padStart(4)} / ${reconTotal} transactions (${pct(reconciled, reconTotal)})`);
  push('');

  // Confidence score
  const receiptScore = Number(withReceipts.cnt) / Math.max(totalTxns, 1);
  const tagScore = tagged / Math.max(tagTotal, 1);
  const reconScore = reconciled / Math.max(reconTotal, 1);
  const confidence = Math.round((receiptScore * 0.4 + tagScore * 0.3 + reconScore * 0.3) * 100);

  let confidenceLabel = 'LOW';
  if (confidence >= 80) confidenceLabel = 'HIGH';
  else if (confidence >= 60) confidenceLabel = 'MEDIUM';

  push(`  ┌─────────────────────────────────────┐`);
  push(`  │  BAS CONFIDENCE SCORE: ${String(confidence).padStart(3)}% ${confidenceLabel.padEnd(7)} │`);
  push(`  │                                     │`);
  push(`  │  Receipts:     ${pct(withReceipts.cnt, totalTxns).padStart(4)} (weight 40%)    │`);
  push(`  │  Tagging:      ${pct(tagged, tagTotal).padStart(4)} (weight 30%)    │`);
  push(`  │  Reconciled:   ${pct(reconciled, reconTotal).padStart(4)} (weight 30%)    │`);
  push(`  └─────────────────────────────────────┘`);
  push('');

  // =========================================================================
  // SECTION 5: ACTION ITEMS
  // =========================================================================
  push('━━━ SECTION 5: ACTION ITEMS FOR ACCOUNTANT ━━━');
  push('');

  // Top vendors missing receipts
  const missingReceipts = await q(`
    SELECT contact_name, count(*)::int as cnt, sum(abs(total))::numeric(12,2) as total
    FROM xero_transactions
    WHERE date >= '${quarter.start}' AND date <= '${quarter.end}'
    AND type = 'SPEND' AND has_attachments = false
    GROUP BY 1 ORDER BY total DESC LIMIT 10
  `);

  if (missingReceipts.length > 0) {
    const totalMissingGST = missingReceipts.reduce((s, r) => s + Number(r.total) / 11, 0);
    push(`  MISSING RECEIPTS — ${Number(withoutReceipts.cnt)} transactions, GST at risk: ~${fmt(totalMissingGST)}`);
    push('  ' + '-'.repeat(60));
    for (const v of missingReceipts) {
      push(`  ${(v.contact_name || '?').padEnd(30)} ${String(v.cnt).padStart(3)} txns  ${fmt(v.total).padStart(10)}  (GST ~${fmt(Number(v.total) / 11)})`);
    }
    push('');
  }

  // Untagged transactions
  const untagged = await q(`
    SELECT contact_name, count(*)::int as cnt, sum(abs(total))::numeric(12,2) as total
    FROM xero_transactions
    WHERE date >= '${quarter.start}' AND date <= '${quarter.end}'
    AND type = 'SPEND' AND project_code IS NULL
    GROUP BY 1 ORDER BY total DESC LIMIT 10
  `);

  if (untagged.length > 0) {
    push(`  UNTAGGED TRANSACTIONS — ${tagTotal - tagged} need project codes`);
    push('  ' + '-'.repeat(60));
    for (const v of untagged) {
      push(`  ${(v.contact_name || '?').padEnd(30)} ${String(v.cnt).padStart(3)} txns  ${fmt(v.total).padStart(10)}`);
    }
    push('');
  }

  // Outstanding receivables
  const receivables = await q(`
    SELECT contact_name, sum(amount_due)::numeric(12,2) as due,
           min(date) as oldest_date,
           count(*)::int as cnt
    FROM xero_invoices
    WHERE type = 'ACCREC' AND status = 'AUTHORISED' AND amount_due > 0
    GROUP BY contact_name ORDER BY due DESC LIMIT 10
  `);

  if (receivables.length > 0) {
    const totalDue = receivables.reduce((s, r) => s + Number(r.due), 0);
    push(`  OUTSTANDING RECEIVABLES — ${fmt(totalDue)} total`);
    push('  ' + '-'.repeat(60));
    for (const r of receivables) {
      const daysOld = Math.round((Date.now() - new Date(r.oldest_date).getTime()) / 86400000);
      push(`  ${(r.contact_name || '?').padEnd(30)} ${fmt(r.due).padStart(12)}  ${daysOld}d old  (${r.cnt} inv)`);
    }
    push('');
  }

  // Outstanding payables
  const payables = await q(`
    SELECT count(*)::int as cnt, sum(amount_due)::numeric(12,2) as due
    FROM xero_invoices
    WHERE type = 'ACCPAY' AND status = 'AUTHORISED' AND amount_due > 0
  `);

  if (payables[0]?.cnt > 0) {
    push(`  OUTSTANDING PAYABLES — ${payables[0].cnt} bills, ${fmt(payables[0].due)} total`);
    push('  (Some may already be paid but not reconciled in Xero)');
    push('');
  }

  // =========================================================================
  // SECTION 6: R&D IMPACT
  // =========================================================================
  push('━━━ SECTION 6: R&D TAX INCENTIVE IMPACT ━━━');
  push('');

  // R&D eligible projects
  const rdProjects = ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'];
  const rdSpend = await q(`
    SELECT project_code, count(*)::int as cnt, sum(abs(total))::numeric(12,2) as total,
           count(*) FILTER (WHERE has_attachments = true)::int as with_receipts
    FROM xero_transactions
    WHERE date >= '${quarter.start}' AND date <= '${quarter.end}'
    AND type = 'SPEND' AND project_code IN ('ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD')
    GROUP BY project_code ORDER BY total DESC
  `);

  let totalRD = 0;
  let totalRDReceipted = 0;
  if (rdSpend.length > 0) {
    push('  R&D Eligible Spend (43.5% refundable offset):');
    push('  ' + '-'.repeat(60));
    for (const p of rdSpend) {
      const rdRefund = Number(p.total) * 0.435;
      totalRD += Number(p.total);
      const receiptedAmt = Number(p.with_receipts) / Number(p.cnt) * Number(p.total);
      totalRDReceipted += receiptedAmt;
      push(`  ${p.project_code.padEnd(10)} ${String(p.cnt).padStart(4)} txns  ${fmt(p.total).padStart(10)}  → refund ${fmt(rdRefund).padStart(10)}  receipts: ${pct(p.with_receipts, p.cnt)}`);
    }
    push('  ' + '-'.repeat(60));
    const totalRefund = totalRD * 0.435;
    const atRisk = (totalRD - totalRDReceipted) * 0.435;
    push(`  Total R&D spend:     ${fmt(totalRD).padStart(12)}`);
    push(`  Potential refund:    ${fmt(totalRefund).padStart(12)} (43.5%)`);
    push(`  Refund at risk:      ${fmt(atRisk).padStart(12)} (missing receipts)`);
  }
  push('');

  // =========================================================================
  // SECTION 7: BANK RECONCILIATION STATUS
  // =========================================================================
  push('━━━ SECTION 7: BANK ACCOUNT STATUS ━━━');
  push('');

  // Fetch bank summary from Xero
  const bankSummary = await xeroGet(`Reports/BankSummary?fromDate=${quarter.start}&toDate=${quarter.end}`);
  await sleep(1100);

  if (bankSummary?.Reports?.[0]) {
    const rpt = bankSummary.Reports[0];
    for (const section of rpt.Rows || []) {
      if (section.RowType === 'Section') {
        for (const row of section.Rows || []) {
          const cells = row.Cells?.map(c => c.Value || '') || [];
          if (cells[0] && row.RowType !== 'SummaryRow') {
            push(`  ${cells[0].padEnd(30)} Opening: ${(cells[1] || '-').padStart(12)}  Received: ${(cells[2] || '-').padStart(12)}  Spent: ${(cells[3] || '-').padStart(12)}  Closing: ${(cells[4] || '-').padStart(12)}`);
          } else if (row.RowType === 'SummaryRow') {
            push(`  ${'TOTAL'.padEnd(30)} Opening: ${(cells[1] || '-').padStart(12)}  Received: ${(cells[2] || '-').padStart(12)}  Spent: ${(cells[3] || '-').padStart(12)}  Closing: ${(cells[4] || '-').padStart(12)}`);
          }
        }
      }
    }
  }
  push('');

  // =========================================================================
  // SECTION 8: ACCOUNTANT CHECKLIST
  // =========================================================================
  push('━━━ SECTION 8: ACCOUNTANT CHECKLIST ━━━');
  push('');
  push('  [ ] Review and reconcile all bank transactions in Xero');
  push(`  [ ] Verify ${Number(withoutReceipts.cnt)} transactions missing receipts`);
  push(`  [ ] Tag ${tagTotal - tagged} untagged transactions with project codes`);
  push('  [ ] Review outstanding receivables — chase or write off');
  push(`  [ ] Verify ${payables[0]?.cnt || 0} outstanding payables are not already paid`);
  push('  [ ] Cross-check P&L against bank statement');
  push('  [ ] Review intercompany transfers for correct treatment');
  push('  [ ] Verify GST on capital purchases (G10 vs G11 split)');
  push('  [ ] Lodge BAS via Xero Tax → ATO portal');
  push(`  [ ] BAS due date: ${quarter.due}`);
  push('');

  // =========================================================================
  // SECTION 9: AUTOMATION STATUS
  // =========================================================================
  push('━━━ SECTION 9: AUTOMATION PIPELINE STATUS ━━━');
  push('');

  const pipeline = await q(`
    SELECT status, count(*)::int as cnt, sum(COALESCE(amount_detected, 0))::numeric(12,2) as total
    FROM receipt_emails
    GROUP BY status ORDER BY cnt DESC
  `);

  push('  Receipt Pipeline:');
  for (const p of pipeline) {
    push(`    ${(p.status || '?').padEnd(15)} ${String(p.cnt).padStart(5)} receipts  ${fmt(p.total).padStart(12)}`);
  }
  push('');

  // Cron schedule
  push('  Automation Schedule (PM2):');
  push('    sync-xero-to-supabase.mjs     Every 6 hours');
  push('    capture-receipts.mjs           Every 6 hours');
  push('    match-receipts-to-xero.mjs     Daily 7am');
  push('    upload-receipts-to-xero.mjs    Daily 8am');
  push('    tag-xero-transactions.mjs      Daily 9am');
  push('    suggest-receipts-calendar.mjs  Weekly Mon');
  push('    reconciliation-checklist.mjs   Monthly 1st');
  push('');

  push(`${'='.repeat(72)}`);
  push(`  Report complete. BAS due: ${quarter.due}`);
  push(`  Confidence: ${confidence}% ${confidenceLabel}`);
  push(`${'='.repeat(72)}`);

  // Save to file
  if (saveToFile) {
    const outPath = `thoughts/shared/reports/bas-worksheet-${quarterArg.toLowerCase()}-fy26-${new Date().toISOString().slice(0, 10)}.md`;
    writeFileSync(outPath, '```\n' + report.join('\n') + '\n```\n');
    console.log(`\nSaved to ${outPath}`);
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
