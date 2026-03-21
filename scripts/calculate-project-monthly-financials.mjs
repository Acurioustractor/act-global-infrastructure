#!/usr/bin/env node
/**
 * Calculate Project Monthly Financials
 *
 * Pre-calculates monthly P&L per project from xero_transactions.
 * Groups by contact_name for category breakdowns.
 * Computes FY year-to-date totals.
 *
 * Run: 1st of each month at 7am via PM2 (also safe to run anytime).
 *
 * Usage:
 *   node scripts/calculate-project-monthly-financials.mjs
 *   node scripts/calculate-project-monthly-financials.mjs --months 24
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const monthsBack = parseInt(process.argv.find(a => a.startsWith('--months'))?.split('=')?.[1] || '12');
const since = new Date();
since.setMonth(since.getMonth() - monthsBack);
since.setDate(1);
const sinceStr = since.toISOString().split('T')[0];

// Australian FY: Jul 1 - Jun 30
function getFYStart(date) {
  const d = new Date(date);
  const year = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${year}-07-01`;
}

console.log(`Calculating monthly financials from ${sinceStr}...`);

// Fetch all transactions in range (paginate past Supabase 1,000-row default)
let transactions = [];
let page = 0;
const pageSize = 1000;
while (true) {
  const { data, error } = await supabase
    .from('xero_transactions')
    .select('id, date, contact_name, total, type, project_code')
    .gte('date', sinceStr)
    .order('date')
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) {
    console.error('Failed to fetch transactions:', error.message);
    process.exit(1);
  }
  transactions = transactions.concat(data);
  if (data.length < pageSize) break;
  page++;
}

console.log(`Processing ${transactions.length} transactions...`);

// Also fetch paid invoices (ACCREC) — these represent revenue that may not appear as RECEIVE transactions
// when reconciled directly against invoices in Xero
let paidInvoices = [];
page = 0;
while (true) {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('id, date, contact_name, total, amount_paid, type, project_code, status, fully_paid_date')
    .eq('type', 'ACCREC')
    .eq('status', 'PAID')
    .gte('date', sinceStr)
    .order('date')
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) {
    console.error('Failed to fetch paid invoices:', error.message);
    break; // Non-fatal — continue with transactions only
  }
  paidInvoices = paidInvoices.concat(data);
  if (data.length < pageSize) break;
  page++;
}

// Build a set of transaction-based revenue by project+month+contact to avoid double-counting
// If a RECEIVE transaction already covers a paid invoice, skip the invoice
const txRevByKey = new Map(); // "PROJECT|2025-07|Contact Name" -> amount
for (const tx of transactions) {
  if (tx.type !== 'RECEIVE' || !tx.project_code) continue;
  const month = tx.date?.substring(0, 7);
  if (!month) continue;
  const key = `${tx.project_code}|${month}|${(tx.contact_name || '').toLowerCase()}`;
  txRevByKey.set(key, (txRevByKey.get(key) || 0) + Math.abs(tx.total || 0));
}

// Filter to invoices with no matching RECEIVE transaction
const invoiceRevenue = [];
for (const inv of paidInvoices) {
  if (!inv.project_code) continue;
  const month = inv.date?.substring(0, 7);
  if (!month) continue;
  const key = `${inv.project_code}|${month}|${(inv.contact_name || '').toLowerCase()}`;
  const txAmount = txRevByKey.get(key) || 0;
  const invAmount = Math.abs(Number(inv.amount_paid || inv.total || 0));
  // If transaction revenue already covers this invoice (within 10%), skip it
  if (txAmount >= invAmount * 0.9) continue;
  invoiceRevenue.push({
    project_code: inv.project_code,
    month: `${month}-01`,
    contact_name: inv.contact_name || 'Unknown',
    amount: invAmount,
  });
}

console.log(`Found ${paidInvoices.length} paid invoices, ${invoiceRevenue.length} not already in transactions.`);

// Group by project_code + month
const buckets = new Map(); // key: "PROJECT_CODE|2026-01" => { revenue, expenses, revBreakdown, expBreakdown, count, unmapped }

for (const tx of transactions) {
  const code = tx.project_code || 'UNTAGGED';
  const month = tx.date?.substring(0, 7); // "2026-01"
  if (!month) continue;

  const key = `${code}|${month}`;
  if (!buckets.has(key)) {
    buckets.set(key, {
      project_code: code,
      month: `${month}-01`,
      revenue: 0,
      expenses: 0,
      revenue_breakdown: {},
      expense_breakdown: {},
      count: 0,
      unmapped: 0,
    });
  }

  const b = buckets.get(key);
  b.count++;
  const vendor = tx.contact_name || 'Unknown';
  const amount = Math.abs(tx.total || 0);

  if (tx.type === 'RECEIVE') {
    b.revenue += amount;
    b.revenue_breakdown[vendor] = (b.revenue_breakdown[vendor] || 0) + amount;
  } else if (tx.type === 'SPEND') {
    b.expenses += amount;
    b.expense_breakdown[vendor] = (b.expense_breakdown[vendor] || 0) + amount;
  }

  if (!tx.project_code) {
    b.unmapped++;
  }
}

// Add invoice-based revenue (paid invoices not already covered by RECEIVE transactions)
for (const inv of invoiceRevenue) {
  const key = `${inv.project_code}|${inv.month.substring(0, 7)}`;
  if (!buckets.has(key)) {
    buckets.set(key, {
      project_code: inv.project_code,
      month: inv.month,
      revenue: 0,
      expenses: 0,
      revenue_breakdown: {},
      expense_breakdown: {},
      count: 0,
      unmapped: 0,
    });
  }
  const b = buckets.get(key);
  b.revenue += inv.amount;
  b.revenue_breakdown[inv.contact_name] = (b.revenue_breakdown[inv.contact_name] || 0) + inv.amount;
  b.count++;
}

// Now upsert each bucket
let upsertCount = 0;

for (const [, b] of buckets) {
  if (b.project_code === 'UNTAGGED') continue; // Skip untagged aggregate

  // Calculate FY YTD
  const fyStart = getFYStart(b.month);
  const monthDate = new Date(b.month);
  const fyStartDate = new Date(fyStart);

  // Sum all months in this FY for this project up to and including current month
  let fyYtdRevenue = 0;
  let fyYtdExpenses = 0;
  for (const [, other] of buckets) {
    if (other.project_code !== b.project_code) continue;
    const otherDate = new Date(other.month);
    if (otherDate >= fyStartDate && otherDate <= monthDate) {
      fyYtdRevenue += other.revenue;
      fyYtdExpenses += other.expenses;
    }
  }

  const row = {
    project_code: b.project_code,
    month: b.month,
    revenue: Math.round(b.revenue * 100) / 100,
    expenses: Math.round(b.expenses * 100) / 100,
    net: Math.round((b.revenue - b.expenses) * 100) / 100,
    revenue_breakdown: b.revenue_breakdown,
    expense_breakdown: b.expense_breakdown,
    fy_ytd_revenue: Math.round(fyYtdRevenue * 100) / 100,
    fy_ytd_expenses: Math.round(fyYtdExpenses * 100) / 100,
    fy_ytd_net: Math.round((fyYtdRevenue - fyYtdExpenses) * 100) / 100,
    transaction_count: b.count,
    unmapped_count: b.unmapped,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from('project_monthly_financials')
    .upsert(row, { onConflict: 'project_code,month' });

  if (upsertError) {
    console.error(`  Error upserting ${b.project_code} ${b.month}:`, upsertError.message);
  } else {
    upsertCount++;
  }
}

console.log(`Done. ${upsertCount} monthly records upserted from ${buckets.size} buckets.`);

try {
  await recordSyncStatus(supabase, 'project_monthly_financials', {
    status: upsertCount > 0 ? 'healthy' : 'error',
    recordCount: upsertCount,
    error: upsertCount === 0 ? 'No records generated' : null,
  });
} catch (e) {
  console.warn('Could not record sync status:', e.message);
}
