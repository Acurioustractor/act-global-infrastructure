#!/usr/bin/env node
/**
 * Financial Snapshots Population
 *
 * Populates the financial_snapshots table from Xero transaction data.
 * Aggregates income and expenses by month with detailed breakdowns.
 *
 * Usage:
 *   node scripts/populate-financial-snapshots.mjs          # Default: 12 months
 *   node scripts/populate-financial-snapshots.mjs --months=24  # Custom range
 *   node scripts/populate-financial-snapshots.mjs --all    # All available data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount || 0);
}

// Get first day of month
function getFirstOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

// Get top N items from breakdown
function getTopBreakdown(items, limit = 10) {
  return Object.entries(items)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, limit)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

// Aggregate transactions by month
async function aggregateTransactions(monthsBack) {
  console.log('\n📊 Aggregating Xero transaction data...');

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  if (monthsBack) {
    startDate.setMonth(startDate.getMonth() - monthsBack);
  } else {
    // Get all data by setting a very old date
    startDate.setFullYear(2000, 0, 1);
  }

  console.log(`   Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

  // Fetch transactions
  const { data: transactions, error: txError } = await supabase
    .from('xero_transactions')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (txError) {
    console.error('   ❌ Error fetching transactions:', txError);
    return null;
  }

  console.log(`   Found ${transactions.length} transactions`);

  // Check if xero_invoices table exists and fetch paid invoices
  let invoices = [];
  const { data: invoiceData, error: invError } = await supabase
    .from('xero_invoices')
    .select('*')
    .eq('type', 'ACCREC') // Accounts receivable = income
    .in('status', ['PAID', 'AUTHORISED'])
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);

  if (!invError && invoiceData) {
    invoices = invoiceData;
    console.log(`   Found ${invoices.length} income invoices`);
  }

  // Group by month
  const byMonth = {};

  // Process transactions
  for (const tx of transactions) {
    const month = getFirstOfMonth(tx.date);

    if (!byMonth[month]) {
      byMonth[month] = {
        month,
        income: 0,
        expenses: 0,
        income_sources: {},
        expense_vendors: {}
      };
    }

    const amount = parseFloat(tx.total) || 0;
    const contact = tx.contact_name || 'Unknown';

    if (tx.type === 'RECEIVE') {
      byMonth[month].income += amount;
      byMonth[month].income_sources[contact] = (byMonth[month].income_sources[contact] || 0) + amount;
    } else if (tx.type === 'SPEND') {
      byMonth[month].expenses += amount;
      byMonth[month].expense_vendors[contact] = (byMonth[month].expense_vendors[contact] || 0) + amount;
    }
  }

  // Process invoices (avoid double-counting - only include if no corresponding transaction)
  for (const inv of invoices) {
    const month = getFirstOfMonth(inv.date);

    if (!byMonth[month]) {
      byMonth[month] = {
        month,
        income: 0,
        expenses: 0,
        income_sources: {},
        expense_vendors: {}
      };
    }

    // Add invoice income (marked with "Invoice:" prefix to track source)
    const amount = parseFloat(inv.total) || 0;
    const contact = inv.contact_name || 'Unknown';
    const key = `Invoice: ${contact}`;

    byMonth[month].income += amount;
    byMonth[month].income_sources[key] = (byMonth[month].income_sources[key] || 0) + amount;
  }

  // Sort months chronologically
  const months = Object.keys(byMonth).sort();

  // Calculate opening/closing balances
  let runningBalance = 0;

  for (const month of months) {
    const data = byMonth[month];
    data.opening_balance = runningBalance;
    data.net = data.income - data.expenses;
    data.closing_balance = data.opening_balance + data.net;
    runningBalance = data.closing_balance;
  }

  return months.map(month => byMonth[month]);
}

// Upsert financial snapshots
async function upsertSnapshots(snapshots) {
  console.log(`\n💾 Upserting ${snapshots.length} monthly snapshots...`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const snapshot of snapshots) {
    // Check if snapshot exists
    const { data: existing } = await supabase
      .from('financial_snapshots')
      .select('id')
      .eq('month', snapshot.month)
      .eq('is_projection', false)
      .maybeSingle();

    const record = {
      month: snapshot.month,
      income: snapshot.income,
      expenses: snapshot.expenses,
      income_breakdown: getTopBreakdown(snapshot.income_sources),
      expense_breakdown: getTopBreakdown(snapshot.expense_vendors),
      opening_balance: snapshot.opening_balance,
      closing_balance: snapshot.closing_balance,
      source: 'xero',
      is_projection: false,
      confidence: 1.0,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('financial_snapshots')
        .update(record)
        .eq('id', existing.id);

      if (error) {
        console.error(`   ❌ Error updating ${snapshot.month}:`, error.message);
        errors++;
      } else {
        updated++;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('financial_snapshots')
        .insert(record);

      if (error) {
        console.error(`   ❌ Error inserting ${snapshot.month}:`, error.message);
        errors++;
      } else {
        created++;
      }
    }
  }

  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  if (errors > 0) {
    console.log(`   ❌ Errors: ${errors}`);
  }

  return { created, updated, errors };
}

// Display summary
function displaySummary(snapshots) {
  console.log('\n📈 Financial Summary');
  console.log('━'.repeat(90));
  console.log('Month'.padEnd(12) + 'Income'.padStart(15) + 'Expenses'.padStart(15) + 'Net'.padStart(15) + 'Balance'.padStart(15));
  console.log('─'.repeat(90));

  let totalIncome = 0;
  let totalExpenses = 0;

  // Show last 12 months (or fewer if less data available)
  const recentSnapshots = snapshots.slice(-12);

  for (const snapshot of recentSnapshots) {
    totalIncome += snapshot.income;
    totalExpenses += snapshot.expenses;

    const monthStr = new Date(snapshot.month).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' });

    console.log(
      monthStr.padEnd(12) +
      formatCurrency(snapshot.income).padStart(15) +
      formatCurrency(snapshot.expenses).padStart(15) +
      formatCurrency(snapshot.net).padStart(15) +
      formatCurrency(snapshot.closing_balance).padStart(15)
    );
  }

  console.log('─'.repeat(90));
  console.log(
    'TOTAL'.padEnd(12) +
    formatCurrency(totalIncome).padStart(15) +
    formatCurrency(totalExpenses).padStart(15) +
    formatCurrency(totalIncome - totalExpenses).padStart(15)
  );

  // Show average monthly figures
  const avgIncome = totalIncome / recentSnapshots.length;
  const avgExpenses = totalExpenses / recentSnapshots.length;

  console.log('\n📊 Averages (last ' + recentSnapshots.length + ' months)');
  console.log(`   Monthly Income:  ${formatCurrency(avgIncome)}`);
  console.log(`   Monthly Expense: ${formatCurrency(avgExpenses)}`);
  console.log(`   Monthly Net:     ${formatCurrency(avgIncome - avgExpenses)}`);

  if (recentSnapshots.length > 0) {
    const latest = recentSnapshots[recentSnapshots.length - 1];
    console.log(`\n💰 Current Cash Position: ${formatCurrency(latest.closing_balance)}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let monthsBack = 12;
  let showAll = false;

  for (const arg of args) {
    if (arg.startsWith('--months=')) {
      monthsBack = parseInt(arg.split('=')[1], 10);
      if (isNaN(monthsBack) || monthsBack < 1) {
        console.error('Invalid --months value. Must be a positive integer.');
        process.exit(1);
      }
    } else if (arg === '--all') {
      showAll = true;
      monthsBack = null;
    } else if (arg === '--help' || arg === '-h') {
      console.log('\nUsage:');
      console.log('  populate-financial-snapshots.mjs                # Default: 12 months');
      console.log('  populate-financial-snapshots.mjs --months=24    # Custom range');
      console.log('  populate-financial-snapshots.mjs --all          # All available data');
      process.exit(0);
    }
  }

  console.log('🏦 Financial Snapshots Population');
  console.log('━'.repeat(70));

  if (showAll) {
    console.log('📅 Processing: All available data');
  } else {
    console.log(`📅 Processing: Last ${monthsBack} months`);
  }

  // Aggregate data
  const snapshots = await aggregateTransactions(monthsBack);

  if (!snapshots || snapshots.length === 0) {
    console.log('\n⚠️  No transaction data found');
    return;
  }

  // Upsert to database
  await upsertSnapshots(snapshots);

  // Display summary
  displaySummary(snapshots);

  console.log('\n✅ Financial snapshots populated successfully');
}

main().catch(console.error);
