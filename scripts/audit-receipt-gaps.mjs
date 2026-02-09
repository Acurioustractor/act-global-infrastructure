#!/usr/bin/env node
/**
 * Receipt Gaps Audit
 *
 * Analyzes Xero SPEND transactions missing receipt attachments to identify:
 * - Total unreceipted spend by value and count
 * - Top vendors with missing receipts
 * - Monthly trends in receipt gaps
 * - Project-specific receipt compliance
 *
 * Usage:
 *   node scripts/audit-receipt-gaps.mjs                     # Last 365 days
 *   node scripts/audit-receipt-gaps.mjs --days=90           # Last 90 days
 *   node scripts/audit-receipt-gaps.mjs --project=ACT-JH    # Specific project
 *   node scripts/audit-receipt-gaps.mjs --vendor="ACME"     # Specific vendor
 *   node scripts/audit-receipt-gaps.mjs --days=180 --project=ACT-PI  # Combined filters
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
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

// Load project codes
const projectCodesPath = join(__dirname, '../config/project-codes.json');
const projectCodes = JSON.parse(readFileSync(projectCodesPath, 'utf8'));

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount || 0);
}

// Parse CLI arguments
function parseArgs() {
  const args = {
    days: 365,
    project: null,
    vendor: null
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--days=')) {
      args.days = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--project=')) {
      args.project = arg.split('=')[1];
    } else if (arg.startsWith('--vendor=')) {
      args.vendor = arg.split('=')[1];
    }
  }

  return args;
}

// Fetch missing receipts
async function fetchMissingReceipts(args) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - args.days);
  const cutoffISO = cutoffDate.toISOString().split('T')[0];

  let query = supabase
    .from('xero_transactions')
    .select('*')
    .eq('type', 'SPEND')
    .gte('date', cutoffISO)
    .order('date', { ascending: false });

  // Filter for missing receipts: has_attachments is false OR null
  query = query.or('has_attachments.is.null,has_attachments.eq.false');

  if (args.project) {
    query = query.eq('project_code', args.project);
  }

  if (args.vendor) {
    query = query.ilike('contact_name', `%${args.vendor}%`);
  }

  const { data: transactions, error } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    return null;
  }

  return transactions;
}

// Check if receipt_matches table exists and fetch matches
async function fetchReceiptMatches() {
  try {
    const { data, error } = await supabase
      .from('receipt_matches')
      .select('transaction_id, receipt_id, confidence, matched_at');

    if (error) {
      // Table doesn't exist or other error - gracefully handle
      return null;
    }

    return data;
  } catch (err) {
    return null;
  }
}

// Group by vendor
function groupByVendor(transactions) {
  const byVendor = {};

  for (const tx of transactions) {
    const vendor = tx.contact_name || 'Unknown Vendor';
    if (!byVendor[vendor]) {
      byVendor[vendor] = {
        count: 0,
        total: 0,
        transactions: []
      };
    }

    byVendor[vendor].count++;
    byVendor[vendor].total += parseFloat(tx.total) || 0;
    byVendor[vendor].transactions.push(tx);
  }

  return byVendor;
}

// Group by month
function groupByMonth(transactions) {
  const byMonth = {};

  for (const tx of transactions) {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!byMonth[monthKey]) {
      byMonth[monthKey] = {
        count: 0,
        total: 0
      };
    }

    byMonth[monthKey].count++;
    byMonth[monthKey].total += parseFloat(tx.total) || 0;
  }

  return byMonth;
}

// Group by project
function groupByProject(transactions) {
  const byProject = {};

  for (const tx of transactions) {
    const project = tx.project_code || 'Unassigned';

    if (!byProject[project]) {
      byProject[project] = {
        count: 0,
        total: 0
      };
    }

    byProject[project].count++;
    byProject[project].total += parseFloat(tx.total) || 0;
  }

  return byProject;
}

// Main audit report
async function runAudit() {
  const args = parseArgs();

  console.log('\n📎 Receipt Gaps Audit');
  console.log('━'.repeat(80));
  console.log(`Period: Last ${args.days} days`);
  if (args.project) {
    console.log(`Filter: Project = ${args.project}`);
  }
  if (args.vendor) {
    console.log(`Filter: Vendor contains "${args.vendor}"`);
  }
  console.log('━'.repeat(80));

  // Fetch data
  const transactions = await fetchMissingReceipts(args);
  if (!transactions) {
    console.error('\n❌ Failed to fetch transactions');
    return;
  }

  const receiptMatches = await fetchReceiptMatches();

  // Overall summary
  const totalCount = transactions.length;
  const totalValue = transactions.reduce((sum, tx) => sum + (parseFloat(tx.total) || 0), 0);

  console.log('\n📊 OVERALL SUMMARY');
  console.log('─'.repeat(80));
  console.log(`Total Missing Receipts: ${totalCount} transactions`);
  console.log(`Total Unreceipted Spend: ${formatCurrency(totalValue)}`);
  console.log(`Average per transaction: ${formatCurrency(totalValue / totalCount)}`);

  if (receiptMatches) {
    const matchedTxIds = new Set(receiptMatches.map(m => m.transaction_id));
    const matchedCount = transactions.filter(tx => matchedTxIds.has(tx.id)).length;
    console.log(`\n✓ Matched in receipt_matches: ${matchedCount} (pending attachment)`);
  }

  // Top vendors
  const byVendor = groupByVendor(transactions);
  const sortedVendors = Object.entries(byVendor).sort((a, b) => b[1].total - a[1].total);

  console.log('\n\n🏢 TOP 20 VENDORS BY UNRECEIPTED SPEND');
  console.log('━'.repeat(80));
  console.log('Vendor'.padEnd(40) + 'Count'.padStart(10) + 'Total'.padStart(20));
  console.log('─'.repeat(80));

  for (const [vendor, data] of sortedVendors.slice(0, 20)) {
    const displayVendor = vendor.length > 38 ? vendor.substring(0, 35) + '...' : vendor;
    console.log(
      displayVendor.padEnd(40) +
      String(data.count).padStart(10) +
      formatCurrency(data.total).padStart(20)
    );
  }

  // Monthly breakdown
  const byMonth = groupByMonth(transactions);
  const sortedMonths = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));

  console.log('\n\n📅 MONTHLY BREAKDOWN');
  console.log('━'.repeat(80));
  console.log('Month'.padEnd(15) + 'Count'.padStart(10) + 'Total'.padStart(20) + '% of Total'.padStart(15));
  console.log('─'.repeat(80));

  for (const [month, data] of sortedMonths) {
    const percentage = ((data.total / totalValue) * 100).toFixed(1);
    console.log(
      month.padEnd(15) +
      String(data.count).padStart(10) +
      formatCurrency(data.total).padStart(20) +
      `${percentage}%`.padStart(15)
    );
  }

  // Project breakdown
  const byProject = groupByProject(transactions);
  const sortedProjects = Object.entries(byProject).sort((a, b) => b[1].total - a[1].total);

  console.log('\n\n🎯 PROJECT-SPECIFIC GAPS');
  console.log('━'.repeat(80));
  console.log('Code'.padEnd(12) + 'Project Name'.padEnd(35) + 'Count'.padStart(10) + 'Total'.padStart(20));
  console.log('─'.repeat(80));

  for (const [code, data] of sortedProjects) {
    const project = projectCodes.projects[code];
    const name = project ? project.name.substring(0, 33) : 'Unknown';
    const displayName = name.length > 33 ? name.substring(0, 30) + '...' : name;

    console.log(
      code.padEnd(12) +
      displayName.padEnd(35) +
      String(data.count).padStart(10) +
      formatCurrency(data.total).padStart(20)
    );
  }

  // Recommendations
  console.log('\n\n💡 RECOMMENDATIONS');
  console.log('━'.repeat(80));

  const topVendor = sortedVendors[0];
  if (topVendor && topVendor[1].count > 5) {
    console.log(`\n1. Focus on ${topVendor[0]}: ${topVendor[1].count} missing receipts (${formatCurrency(topVendor[1].total)})`);
    console.log('   → Request bulk receipt export or establish automated receipt delivery');
  }

  const recentMonth = sortedMonths[0];
  if (recentMonth && recentMonth[1].count > 10) {
    console.log(`\n2. Recent gaps detected: ${recentMonth[1].count} transactions in ${recentMonth[0]} need receipts`);
    console.log('   → Prioritize current month before records get stale');
  }

  const highValueTxs = transactions.filter(tx => parseFloat(tx.total) > 1000);
  if (highValueTxs.length > 0) {
    const highValueTotal = highValueTxs.reduce((sum, tx) => sum + parseFloat(tx.total), 0);
    console.log(`\n3. High-value transactions: ${highValueTxs.length} over $1,000 (${formatCurrency(highValueTotal)})`);
    console.log('   → Audit compliance required for large expenses');
  }

  if (receiptMatches && receiptMatches.length > 0) {
    console.log(`\n4. Pending matches in receipt_matches table: ${receiptMatches.length} receipts ready to attach`);
    console.log('   → Run sync script to link matched receipts to transactions');
  }

  console.log('\n' + '━'.repeat(80));
  console.log('Run with --help for usage options');
  console.log('');
}

// Help text
function showHelp() {
  console.log(`
Receipt Gaps Audit - Find Xero SPEND transactions missing receipts

USAGE:
  node scripts/audit-receipt-gaps.mjs [OPTIONS]

OPTIONS:
  --days=N          Number of days to look back (default: 365)
  --project=CODE    Filter by specific project code (e.g., ACT-JH)
  --vendor=NAME     Filter by vendor name (partial match)
  --help            Show this help message

EXAMPLES:
  # Last 90 days across all projects
  node scripts/audit-receipt-gaps.mjs --days=90

  # All JusticeHub expenses missing receipts
  node scripts/audit-receipt-gaps.mjs --project=ACT-JH

  # All Bunnings transactions
  node scripts/audit-receipt-gaps.mjs --vendor=Bunnings

  # Combined: Last 6 months for Palm Island project
  node scripts/audit-receipt-gaps.mjs --days=180 --project=ACT-PI
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  await runAudit();
}

main().catch(console.error);
