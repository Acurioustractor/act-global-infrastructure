#!/usr/bin/env node
/**
 * Xero BAS Review — Pull P&L, Balance Sheet, and GST reports for Q3 FY26
 * This is what the accountant sees. We need to match it.
 */
import '../lib/load-env.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
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
      return true;
    }
  } catch (e) {}
  return false;
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
  if (!r.ok) { console.log(`WARN: ${endpoint} → ${r.status}`); return null; }
  return r.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function printReport(name, report) {
  if (!report?.Reports?.[0]) { console.log(`No data for ${name}`); return; }
  const rpt = report.Reports[0];
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${rpt.ReportName}`);
  console.log(`${rpt.ReportDate || ''}`);
  console.log(`${'='.repeat(70)}`);

  for (const section of rpt.Rows || []) {
    if (section.RowType === 'Header') {
      const cells = section.Cells?.map(c => c.Value) || [];
      console.log(`\n  ${cells.join('  |  ')}`);
      console.log(`  ${'-'.repeat(60)}`);
    } else if (section.RowType === 'Section') {
      if (section.Title) console.log(`\n  --- ${section.Title} ---`);
      for (const row of section.Rows || []) {
        const cells = row.Cells?.map(c => c.Value || '') || [];
        if (row.RowType === 'SummaryRow') {
          console.log(`  **${cells[0]?.padEnd(40)}  ${cells.slice(1).map(c => (c || '').padStart(12)).join('  ')}**`);
        } else {
          console.log(`  ${(cells[0] || '').padEnd(40)}  ${cells.slice(1).map(c => (c || '').padStart(12)).join('  ')}`);
        }
      }
    } else if (section.RowType === 'Row') {
      const cells = section.Cells?.map(c => c.Value || '') || [];
      console.log(`  ${(cells[0] || '').padEnd(40)}  ${cells.slice(1).map(c => (c || '').padStart(12)).join('  ')}`);
    } else if (section.RowType === 'SummaryRow') {
      const cells = section.Cells?.map(c => c.Value || '') || [];
      console.log(`\n  **${(cells[0] || '').padEnd(40)}  ${cells.slice(1).map(c => (c || '').padStart(12)).join('  ')}**`);
    }
  }
}

async function main() {
  loadTokens();
  if (!XERO_ACCESS_TOKEN) await refreshToken();

  const Q3_START = '2026-01-01';
  const Q3_END = '2026-03-31';
  const FY_START = '2025-07-01';

  console.log('=== XERO BAS REVIEW — Q3 FY26 (Jan-Mar 2026) ===');
  console.log(`Period: ${Q3_START} to ${Q3_END}`);
  console.log(`Generated: ${new Date().toISOString()}\n`);

  // 1. P&L for Q3
  console.log('Fetching P&L (Q3)...');
  const pnl = await xeroGet(`Reports/ProfitAndLoss?fromDate=${Q3_START}&toDate=${Q3_END}`);
  printReport('P&L Q3', pnl);
  await sleep(1100);

  // 2. P&L for full FY26 YTD
  console.log('\nFetching P&L (FY26 YTD)...');
  const pnlYTD = await xeroGet(`Reports/ProfitAndLoss?fromDate=${FY_START}&toDate=${Q3_END}`);
  printReport('P&L FY26 YTD', pnlYTD);
  await sleep(1100);

  // 3. Balance Sheet
  console.log('\nFetching Balance Sheet...');
  const bs = await xeroGet(`Reports/BalanceSheet?date=${Q3_END}`);
  printReport('Balance Sheet', bs);
  await sleep(1100);

  // 4. P&L by tracking category (Business Division)
  console.log('\nFetching P&L by Business Division (Q3)...');
  const pnlDiv = await xeroGet(`Reports/ProfitAndLoss?fromDate=${Q3_START}&toDate=${Q3_END}&trackingCategoryID=91448ff3-eb13-437a-9d97-4d2e52c86ca4`);
  printReport('P&L by Division Q3', pnlDiv);
  await sleep(1100);

  // 5. Trial Balance
  console.log('\nFetching Trial Balance...');
  const tb = await xeroGet(`Reports/TrialBalance?date=${Q3_END}`);
  printReport('Trial Balance', tb);
  await sleep(1100);

  // 6. GST Report (BAS)
  console.log('\nFetching GST Report (Q3)...');
  const gst = await xeroGet(`Reports/GST?fromDate=${Q3_START}&toDate=${Q3_END}`);
  if (gst) printReport('GST Report', gst);
  else console.log('  GST Report not available via API (may require AU-specific endpoint)');
  await sleep(1100);

  // 7. Aged Receivables
  console.log('\nFetching Aged Receivables...');
  const ar = await xeroGet(`Reports/AgedReceivablesByContact?date=${Q3_END}`);
  printReport('Aged Receivables', ar);
  await sleep(1100);

  // 8. Aged Payables
  console.log('\nFetching Aged Payables...');
  const ap = await xeroGet(`Reports/AgedPayablesByContact?date=${Q3_END}`);
  printReport('Aged Payables', ap);
  await sleep(1100);

  // 9. Bank Summary
  console.log('\nFetching Bank Summary (Q3)...');
  const bank = await xeroGet(`Reports/BankSummary?fromDate=${Q3_START}&toDate=${Q3_END}`);
  printReport('Bank Summary', bank);

  // 10. Budget Summary
  console.log('\nFetching Budget Summary...');
  const budget = await xeroGet(`Reports/BudgetSummary?date=${Q3_END}`);
  if (budget) printReport('Budget Summary', budget);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
