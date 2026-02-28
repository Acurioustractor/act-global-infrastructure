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

import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

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

// Fetch all transactions in range
const { data: transactions, error } = await supabase
  .from('xero_transactions')
  .select('id, date, contact_name, total, type, project_code')
  .gte('date', sinceStr)
  .order('date');

if (error) {
  console.error('Failed to fetch transactions:', error.message);
  process.exit(1);
}

console.log(`Processing ${transactions.length} transactions...`);

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
