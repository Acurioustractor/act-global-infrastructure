#!/usr/bin/env node
/**
 * Pull P&L and Balance Sheet from Xero for PFI EOI
 *
 * Fetches:
 *   - Profit & Loss for FY2022-23, FY2023-24, FY2024-25
 *   - Balance Sheet at 30 Jun 2023, 30 Jun 2024, 30 Jun 2025
 *   - Invoice breakdown by contact for Goods trading revenue
 *
 * Usage:
 *   node scripts/xero-pfi-financials.mjs
 */

import '../lib/load-env.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
const TOKEN_FILE = path.join(process.cwd(), '.xero-tokens.json');

// Load tokens
function loadTokens() {
  if (existsSync(TOKEN_FILE)) {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  }
  throw new Error('No token file found. Run: node scripts/xero-auth.mjs');
}

// Refresh if expired
async function getAccessToken() {
  let tokens = loadTokens();

  if (tokens.expires_at < Date.now()) {
    console.log('Token expired, refreshing...');
    const resp = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: XERO_CLIENT_ID,
        client_secret: XERO_CLIENT_SECRET,
      })
    });
    const data = await resp.json();
    if (!data.access_token) {
      throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
    }
    tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000)
    };
    writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    console.log('Token refreshed successfully');
  }

  return tokens.access_token;
}

// Xero API call
async function xeroGet(endpoint) {
  const token = await getAccessToken();
  const resp = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'xero-tenant-id': XERO_TENANT_ID,
      'Accept': 'application/json',
    }
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Xero API ${resp.status}: ${text.substring(0, 500)}`);
  }
  return resp.json();
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('==============================================');
  console.log('  PFI Financial Data — Xero Reports');
  console.log('==============================================\n');

  // ---- 1. PROFIT & LOSS ----
  const fyPeriods = [
    { label: 'FY2022-23', from: '2022-07-01', to: '2023-06-30' },
    { label: 'FY2023-24', from: '2023-07-01', to: '2024-06-30' },
    { label: 'FY2024-25', from: '2024-07-01', to: '2025-06-30' },
  ];

  console.log('--- PROFIT & LOSS ---\n');

  const plResults = [];

  for (const fy of fyPeriods) {
    try {
      const pl = await xeroGet(`Reports/ProfitAndLoss?fromDate=${fy.from}&toDate=${fy.to}`);
      const report = pl.Reports?.[0];

      if (!report) {
        console.log(`${fy.label}: No report data`);
        plResults.push({ fy: fy.label, totalRevenue: null, tradingRevenue: null });
        continue;
      }

      // Parse report rows
      let totalIncome = 0;
      let tradingIncome = 0;
      let totalExpenses = 0;
      let netProfit = 0;

      for (const section of report.Rows || []) {
        if (section.RowType === 'Section') {
          const title = section.Title || '';

          for (const row of section.Rows || []) {
            if (row.RowType === 'Row') {
              const cells = row.Cells || [];
              const accountName = cells[0]?.Value || '';
              const amount = parseFloat(cells[1]?.Value || '0');

              if (title.includes('Income') || title.includes('Revenue')) {
                totalIncome += amount;
                // Trading revenue = sales accounts (not grants/donations)
                const lowerName = accountName.toLowerCase();
                if (lowerName.includes('sales') || lowerName.includes('revenue') ||
                    lowerName.includes('consulting') || lowerName.includes('service') ||
                    lowerName.includes('goods') || lowerName.includes('trade')) {
                  tradingIncome += amount;
                }
              }
            }
            // Summary rows
            if (row.RowType === 'SummaryRow') {
              const cells = row.Cells || [];
              const label = cells[0]?.Value || '';
              const amount = parseFloat(cells[1]?.Value || '0');

              if (title.includes('Income') || title.includes('Revenue')) {
                totalIncome = amount; // Use summary as authoritative
              }
              if (title.includes('Expense') || title.includes('Cost')) {
                totalExpenses += amount;
              }
            }
          }
        }
        // Net profit summary
        if (section.RowType === 'Section' && (section.Title || '').includes('Net')) {
          for (const row of section.Rows || []) {
            if (row.RowType === 'SummaryRow') {
              netProfit = parseFloat(row.Cells?.[1]?.Value || '0');
            }
          }
        }
      }

      // Print all income line items for visibility
      console.log(`\n${fy.label}:`);
      for (const section of report.Rows || []) {
        if (section.RowType === 'Section') {
          const title = section.Title || '';
          if (title.includes('Income') || title.includes('Revenue') || title.includes('Cost') || title.includes('Expense')) {
            console.log(`  [${title}]`);
            for (const row of section.Rows || []) {
              if (row.RowType === 'Row') {
                const cells = row.Cells || [];
                const name = cells[0]?.Value || '';
                const val = cells[1]?.Value || '0';
                if (parseFloat(val) !== 0) {
                  console.log(`    ${name}: $${parseFloat(val).toLocaleString()}`);
                }
              }
              if (row.RowType === 'SummaryRow') {
                const cells = row.Cells || [];
                console.log(`    ** ${cells[0]?.Value}: $${parseFloat(cells[1]?.Value || '0').toLocaleString()}`);
              }
            }
          }
        }
      }

      plResults.push({
        fy: fy.label,
        totalRevenue: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(netProfit)
      });

    } catch (err) {
      console.error(`${fy.label} P&L error:`, err.message);
      plResults.push({ fy: fy.label, error: err.message });
    }
  }

  // ---- 2. BALANCE SHEET ----
  console.log('\n\n--- BALANCE SHEET ---\n');

  const bsDates = [
    { label: 'FY2022-23', date: '2023-06-30' },
    { label: 'FY2023-24', date: '2024-06-30' },
    { label: 'FY2024-25', date: '2025-06-30' },
  ];

  const bsResults = [];

  for (const period of bsDates) {
    try {
      const bs = await xeroGet(`Reports/BalanceSheet?date=${period.date}`);
      const report = bs.Reports?.[0];

      if (!report) {
        console.log(`${period.label}: No report data`);
        bsResults.push({ fy: period.label, totalAssets: null, totalLiabilities: null });
        continue;
      }

      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      console.log(`\n${period.label} (as at ${period.date}):`);

      for (const section of report.Rows || []) {
        if (section.RowType === 'Section') {
          const title = section.Title || '';
          console.log(`  [${title}]`);

          for (const row of section.Rows || []) {
            if (row.RowType === 'Row') {
              const cells = row.Cells || [];
              const name = cells[0]?.Value || '';
              const val = cells[1]?.Value || '0';
              if (parseFloat(val) !== 0) {
                console.log(`    ${name}: $${parseFloat(val).toLocaleString()}`);
              }
            }
            if (row.RowType === 'SummaryRow') {
              const cells = row.Cells || [];
              const label = cells[0]?.Value || '';
              const amount = parseFloat(cells[1]?.Value || '0');
              console.log(`    ** ${label}: $${amount.toLocaleString()}`);

              if (label.includes('Total Assets')) totalAssets = amount;
              if (label.includes('Total Liabilities')) totalLiabilities = amount;
              if (label.includes('Total Equity') || label.includes('Net Assets')) totalEquity = amount;
            }
          }
        }
      }

      bsResults.push({
        fy: period.label,
        totalAssets: Math.round(totalAssets),
        totalLiabilities: Math.round(totalLiabilities),
        totalEquity: Math.round(totalEquity)
      });

    } catch (err) {
      console.error(`${period.label} BS error:`, err.message);
      bsResults.push({ fy: period.label, error: err.message });
    }
  }

  // ---- 3. GOODS TRADING REVENUE (from invoices) ----
  console.log('\n\n--- GOODS TRADING REVENUE (Invoices) ---\n');

  try {
    // Get all ACCREC invoices
    const invoices = await xeroGet('Invoices?where=Type%3D%22ACCREC%22&Statuses=PAID,AUTHORISED');
    const goodsContacts = ['picc', 'palm island', 'centrecorp', 'homeland', 'anyinginyi', 'miwatj', 'oonchiumpa'];

    const goodsInvoices = (invoices.Invoices || []).filter(inv => {
      const name = (inv.Contact?.Name || '').toLowerCase();
      return goodsContacts.some(c => name.includes(c));
    });

    // Group by FY
    for (const fy of fyPeriods) {
      const fyInvs = goodsInvoices.filter(inv => {
        const d = inv.Date;
        return d >= fy.from && d <= fy.to;
      });

      if (fyInvs.length === 0) {
        console.log(`${fy.label}: No Goods invoices`);
        continue;
      }

      console.log(`\n${fy.label}:`);
      let fyTotal = 0;
      for (const inv of fyInvs) {
        const total = inv.Total || 0;
        fyTotal += total;
        console.log(`  ${inv.InvoiceNumber} | ${inv.Contact?.Name} | $${total.toLocaleString()} | ${inv.Status}`);
      }
      console.log(`  ** TOTAL: $${fyTotal.toLocaleString()}`);
    }
  } catch (err) {
    console.error('Invoice fetch error:', err.message);
  }

  // ---- SUMMARY TABLE ----
  console.log('\n\n============================================');
  console.log('  PFI FINANCIAL TABLE (for form)');
  console.log('============================================\n');

  console.log('Year        | Total Revenue | Trading Revenue | Total Assets | Total Liabilities');
  console.log('------------|---------------|-----------------|--------------|------------------');
  for (let i = 0; i < fyPeriods.length; i++) {
    const pl = plResults[i] || {};
    const bs = bsResults[i] || {};
    const label = fyPeriods[i].label;
    console.log(
      `${label}    | $${(pl.totalRevenue || 0).toLocaleString().padStart(11)} | ${'TBD'.padStart(15)} | $${(bs.totalAssets || 0).toLocaleString().padStart(10)} | $${(bs.totalLiabilities || 0).toLocaleString().padStart(14)}`
    );
  }

  console.log('\nNote: Trading Revenue needs manual separation (sales vs grants/donations).');
  console.log('Check income account names above to classify.\n');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
