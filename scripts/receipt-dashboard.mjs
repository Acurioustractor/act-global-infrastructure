#!/usr/bin/env node
/**
 * Receipt Dashboard
 *
 * Live view of all receipts and their status.
 * Shows what's matched, what's missing, and what needs attention.
 *
 * Usage:
 *   node scripts/receipt-dashboard.mjs              # Full dashboard
 *   node scripts/receipt-dashboard.mjs missing      # Missing receipts only
 *   node scripts/receipt-dashboard.mjs recent       # Last 30 days
 *   node scripts/receipt-dashboard.mjs summary      # Monthly summary
 *   node scripts/receipt-dashboard.mjs project ACT-JH  # By project
 *   node scripts/receipt-dashboard.mjs sync         # Sync from Xero tables
 *   node scripts/receipt-dashboard.mjs table        # Full table view
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loadProjectsConfig } from './lib/project-loader.mjs';
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

// Load project codes for display
const projectCodes = await loadProjectsConfig();

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short'
  });
}

// Status icons
const STATUS_ICONS = {
  matched: '✅',
  pending: '⏳',
  missing: '❌',
  not_required: '🏦',
  deferred: '⏸️'
};

// Infer project code from vendor/description
function inferProjectCode(vendor, description) {
  const text = `${vendor} ${description}`.toLowerCase();

  const mappings = [
    { keywords: ['qantas', 'virgin', 'jetstar'], code: null }, // Travel needs manual assignment
    { keywords: ['notion', 'openai', 'anthropic', 'webflow', 'vercel', 'supabase', 'adobe', 'xero'], code: 'ACT-IN' },
    { keywords: ['uber'], code: null },
    { keywords: ['harvest', 'witta', 'maleny'], code: 'ACT-HV' },
    { keywords: ['goods', 'fairfax'], code: 'ACT-GD' },
  ];

  for (const mapping of mappings) {
    if (mapping.keywords.some(kw => text.includes(kw))) {
      return mapping.code;
    }
  }

  return null;
}

// Determine if receipt is required
function receiptRequired(vendor, amount) {
  const noReceiptVendors = ['nab', 'bank fee', 'interest', 'gopayid'];
  const vendorLower = (vendor || '').toLowerCase();

  if (noReceiptVendors.some(v => vendorLower.includes(v))) {
    return false;
  }

  // Small amounts under $10 often don't need receipts
  if (Math.abs(amount) < 10) {
    return false;
  }

  return true;
}

// Sync data from Xero tables to receipt_status
async function syncFromXero() {
  console.log('\n🔄 Syncing receipts from Xero...\n');

  // Get transactions
  const { data: transactions, error: txnError } = await supabase
    .from('xero_transactions')
    .select('*')
    .eq('type', 'SPEND')
    .order('date', { ascending: false })
    .limit(500);

  if (txnError) {
    console.error('Error fetching transactions:', txnError);
    return;
  }

  // Get invoices (bills from Dext)
  const { data: invoices, error: invError } = await supabase
    .from('xero_invoices')
    .select('*')
    .eq('type', 'ACCPAY')
    .order('date', { ascending: false })
    .limit(500);

  if (invError) {
    console.error('Error fetching invoices:', invError);
    return;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Process transactions
  for (const txn of transactions || []) {
    const sourceId = txn.xero_transaction_id || txn.id;
    const vendor = txn.contact_name || 'Unknown';
    const amount = Math.abs(parseFloat(txn.total) || 0);
    const needsReceipt = receiptRequired(vendor, amount);

    // Check if already exists
    const { data: existing } = await supabase
      .from('receipt_status')
      .select('id, receipt_status')
      .eq('source_type', 'xero_transaction')
      .eq('source_id', sourceId)
      .single();

    const receiptData = {
      source_type: 'xero_transaction',
      source_id: sourceId,
      transaction_date: txn.date,
      vendor_name: vendor,
      description: txn.reference || txn.description,
      amount: amount,
      project_code: txn.project_code || inferProjectCode(vendor, txn.reference || ''),
      category: txn.account_name,
      receipt_status: needsReceipt ? 'missing' : 'not_required',
      updated_at: new Date().toISOString()
    };

    if (existing) {
      // Don't overwrite if already resolved
      if (existing.receipt_status !== 'matched' && existing.receipt_status !== 'not_required') {
        await supabase
          .from('receipt_status')
          .update(receiptData)
          .eq('id', existing.id);
        updated++;
      } else {
        skipped++;
      }
    } else {
      await supabase
        .from('receipt_status')
        .insert(receiptData);
      created++;
    }
  }

  // Process invoices (these usually HAVE receipts from Dext)
  for (const inv of invoices || []) {
    const sourceId = inv.xero_invoice_id || inv.id;
    const vendor = inv.contact_name || 'Unknown';
    const amount = Math.abs(parseFloat(inv.total) || 0);

    const { data: existing } = await supabase
      .from('receipt_status')
      .select('id')
      .eq('source_type', 'xero_invoice')
      .eq('source_id', sourceId)
      .single();

    const receiptData = {
      source_type: 'xero_invoice',
      source_id: sourceId,
      transaction_date: inv.date,
      vendor_name: vendor,
      description: inv.reference || inv.invoice_number,
      amount: amount,
      project_code: inv.project_code || inferProjectCode(vendor, inv.reference || ''),
      category: inv.line_items?.[0]?.account_code,
      receipt_status: 'matched', // Invoices from Dext already have receipts
      receipt_source: 'dext',
      receipt_matched_at: inv.updated_at,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      skipped++;
    } else {
      await supabase
        .from('receipt_status')
        .insert(receiptData);
      created++;
    }
  }

  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📊 Total processed: ${(transactions?.length || 0) + (invoices?.length || 0)}`);
}

// Show full dashboard
async function showDashboard() {
  // Get summary stats
  const { data: stats } = await supabase
    .from('receipt_status')
    .select('receipt_status, amount')
    .gte('transaction_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const summary = {
    total: 0,
    matched: 0,
    missing: 0,
    pending: 0,
    not_required: 0,
    deferred: 0,
    totalAmount: 0,
    missingAmount: 0
  };

  for (const row of stats || []) {
    summary.total++;
    summary.totalAmount += parseFloat(row.amount) || 0;
    summary[row.receipt_status] = (summary[row.receipt_status] || 0) + 1;
    if (row.receipt_status === 'missing') {
      summary.missingAmount += parseFloat(row.amount) || 0;
    }
  }

  const completionPct = summary.total > 0
    ? Math.round(100 * (summary.matched + summary.not_required) / summary.total)
    : 0;

  console.log('\n📊 Receipt Dashboard (Last 90 Days)');
  console.log('━'.repeat(60));

  // Status bar
  const barLength = 40;
  const matchedBar = Math.round(barLength * (summary.matched + summary.not_required) / Math.max(summary.total, 1));
  const missingBar = Math.round(barLength * summary.missing / Math.max(summary.total, 1));
  const pendingBar = barLength - matchedBar - missingBar;

  console.log(`\n[${'█'.repeat(matchedBar)}${'░'.repeat(pendingBar)}${'▒'.repeat(missingBar)}] ${completionPct}%`);

  console.log(`
   ✅ Matched:      ${String(summary.matched).padStart(4)} receipts
   🏦 Not Required: ${String(summary.not_required).padStart(4)} receipts
   ⏳ Pending:      ${String(summary.pending).padStart(4)} receipts
   ❌ Missing:      ${String(summary.missing).padStart(4)} receipts (${formatCurrency(summary.missingAmount)})
   ⏸️  Deferred:     ${String(summary.deferred).padStart(4)} receipts
   ─────────────────────────
   📋 Total:        ${String(summary.total).padStart(4)} receipts (${formatCurrency(summary.totalAmount)})
`);

  // Top missing receipts
  const { data: missing } = await supabase
    .from('receipt_status')
    .select('*')
    .eq('receipt_status', 'missing')
    .order('amount', { ascending: false })
    .limit(10);

  if (missing && missing.length > 0) {
    console.log('🔴 Top Missing Receipts');
    console.log('─'.repeat(60));
    console.log('Date'.padEnd(10) + 'Vendor'.padEnd(25) + 'Amount'.padStart(12) + '  Project');
    console.log('─'.repeat(60));

    for (const r of missing) {
      const vendor = (r.vendor_name || 'Unknown').substring(0, 23);
      console.log(
        formatDate(r.transaction_date).padEnd(10) +
        vendor.padEnd(25) +
        formatCurrency(r.amount).padStart(12) +
        '  ' + (r.project_code || '—')
      );
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('Commands: missing | recent | summary | project <code> | sync');
}

// Show missing receipts
async function showMissing() {
  const { data: missing, error } = await supabase
    .from('receipt_status')
    .select('*')
    .in('receipt_status', ['missing', 'pending'])
    .order('amount', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n❌ Missing Receipts');
  console.log('━'.repeat(80));
  console.log('ID'.padEnd(8) + 'Date'.padEnd(10) + 'Vendor'.padEnd(25) + 'Amount'.padStart(12) + '  Project  Status');
  console.log('─'.repeat(80));

  let totalMissing = 0;

  for (const r of missing || []) {
    const id = r.id.substring(0, 6);
    const vendor = (r.vendor_name || 'Unknown').substring(0, 23);
    const icon = STATUS_ICONS[r.receipt_status] || '?';

    totalMissing += parseFloat(r.amount) || 0;

    console.log(
      id.padEnd(8) +
      formatDate(r.transaction_date).padEnd(10) +
      vendor.padEnd(25) +
      formatCurrency(r.amount).padStart(12) +
      '  ' + (r.project_code || '—').padEnd(8) +
      ' ' + icon
    );
  }

  console.log('─'.repeat(80));
  console.log(`Total: ${missing?.length || 0} receipts | ${formatCurrency(totalMissing)}`);
  console.log('\nTo resolve: node scripts/receipt-reconciliation-agent.mjs resolve <id>');
}

// Show recent transactions
async function showRecent(days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: recent, error } = await supabase
    .from('receipt_status')
    .select('*')
    .gte('transaction_date', cutoff)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n📅 Recent Receipts (Last ${days} Days)`);
  console.log('━'.repeat(80));
  console.log('Date'.padEnd(10) + 'Vendor'.padEnd(25) + 'Amount'.padStart(12) + '  Project  Status');
  console.log('─'.repeat(80));

  for (const r of recent || []) {
    const vendor = (r.vendor_name || 'Unknown').substring(0, 23);
    const icon = STATUS_ICONS[r.receipt_status] || '?';

    console.log(
      formatDate(r.transaction_date).padEnd(10) +
      vendor.padEnd(25) +
      formatCurrency(r.amount).padStart(12) +
      '  ' + (r.project_code || '—').padEnd(8) +
      ' ' + icon
    );
  }

  console.log('─'.repeat(80));
  console.log(`Total: ${recent?.length || 0} transactions`);
}

// Show monthly summary
async function showSummary() {
  const { data: summary, error } = await supabase
    .from('accounting_summary')
    .select('*')
    .limit(20);

  if (error) {
    // View might not exist yet, query directly
    const { data: receipts } = await supabase
      .from('receipt_status')
      .select('transaction_date, project_code, amount, receipt_status');

    // Group by month
    const byMonth = {};
    for (const r of receipts || []) {
      const month = r.transaction_date?.substring(0, 7) || 'Unknown';
      if (!byMonth[month]) {
        byMonth[month] = { total: 0, matched: 0, missing: 0, amount: 0 };
      }
      byMonth[month].total++;
      byMonth[month].amount += parseFloat(r.amount) || 0;
      if (r.receipt_status === 'matched' || r.receipt_status === 'not_required') {
        byMonth[month].matched++;
      } else if (r.receipt_status === 'missing') {
        byMonth[month].missing++;
      }
    }

    console.log('\n📊 Monthly Accounting Summary');
    console.log('━'.repeat(70));
    console.log('Month'.padEnd(12) + 'Transactions'.padStart(14) + 'Amount'.padStart(15) + 'Matched'.padStart(10) + 'Missing'.padStart(10) + 'Completion'.padStart(12));
    console.log('─'.repeat(70));

    const sortedMonths = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));

    for (const [month, data] of sortedMonths.slice(0, 12)) {
      const pct = data.total > 0 ? Math.round(100 * data.matched / data.total) : 0;
      console.log(
        month.padEnd(12) +
        String(data.total).padStart(14) +
        formatCurrency(data.amount).padStart(15) +
        String(data.matched).padStart(10) +
        String(data.missing).padStart(10) +
        `${pct}%`.padStart(12)
      );
    }

    return;
  }

  console.log('\n📊 Monthly Accounting Summary');
  console.log('━'.repeat(80));

  for (const row of summary || []) {
    console.log(`${row.month}: ${row.transaction_count} txns, ${formatCurrency(row.total_amount)}, ${row.completion_pct}% complete`);
  }
}

// Show by project
async function showByProject(code) {
  const { data: receipts, error } = await supabase
    .from('receipt_status')
    .select('*')
    .eq('project_code', code)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  const project = projectCodes.projects[code];
  const projectName = project ? project.name : code;

  console.log(`\n📁 Receipts for ${code}: ${projectName}`);
  console.log('━'.repeat(70));

  let totalAmount = 0;
  let matched = 0;
  let missing = 0;

  for (const r of receipts || []) {
    const icon = STATUS_ICONS[r.receipt_status] || '?';
    const vendor = (r.vendor_name || 'Unknown').substring(0, 25);

    totalAmount += parseFloat(r.amount) || 0;
    if (r.receipt_status === 'matched' || r.receipt_status === 'not_required') matched++;
    else if (r.receipt_status === 'missing') missing++;

    console.log(
      `${icon} ${formatDate(r.transaction_date).padEnd(10)} ${vendor.padEnd(25)} ${formatCurrency(r.amount).padStart(12)}`
    );
  }

  console.log('─'.repeat(70));
  console.log(`Total: ${receipts?.length || 0} transactions | ${formatCurrency(totalAmount)}`);
  console.log(`Status: ${matched} matched, ${missing} missing`);
}

// Show full table
async function showTable() {
  const { data: all, error } = await supabase
    .from('receipt_status')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📋 All Receipts (Last 100)');
  console.log('━'.repeat(100));
  console.log(
    'ID'.padEnd(8) +
    'Date'.padEnd(12) +
    'Vendor'.padEnd(22) +
    'Amount'.padStart(12) +
    '  Project'.padEnd(11) +
    'Category'.padEnd(20) +
    'Status'
  );
  console.log('─'.repeat(100));

  for (const r of all || []) {
    const id = r.id.substring(0, 6);
    const vendor = (r.vendor_name || 'Unknown').substring(0, 20);
    const category = (r.category || '—').substring(0, 18);
    const icon = STATUS_ICONS[r.receipt_status] || '?';

    console.log(
      id.padEnd(8) +
      formatDate(r.transaction_date).padEnd(12) +
      vendor.padEnd(22) +
      formatCurrency(r.amount).padStart(12) +
      '  ' + (r.project_code || '—').padEnd(9) +
      category.padEnd(20) +
      icon + ' ' + r.receipt_status
    );
  }

  console.log('─'.repeat(100));
  console.log(`Showing ${all?.length || 0} of total receipts`);
}

// Main CLI
async function main() {
  const command = process.argv[2] || 'dashboard';
  const arg1 = process.argv[3];

  switch (command) {
    case 'dashboard':
    case 'dash':
      await showDashboard();
      break;
    case 'missing':
      await showMissing();
      break;
    case 'recent':
      await showRecent(parseInt(arg1) || 30);
      break;
    case 'summary':
      await showSummary();
      break;
    case 'project':
      if (!arg1) {
        console.error('Usage: receipt-dashboard.mjs project <ACT-XX>');
        process.exit(1);
      }
      await showByProject(arg1);
      break;
    case 'sync':
      await syncFromXero();
      break;
    case 'table':
      await showTable();
      break;
    default:
      console.log('Unknown command:', command);
      console.log('\nUsage:');
      console.log('  dashboard         - Full dashboard overview');
      console.log('  missing           - Show missing receipts');
      console.log('  recent [days]     - Recent transactions (default 30 days)');
      console.log('  summary           - Monthly accounting summary');
      console.log('  project <code>    - Receipts for specific project');
      console.log('  sync              - Sync from Xero tables');
      console.log('  table             - Full table view');
  }
}

main().catch(console.error);
