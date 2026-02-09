#!/usr/bin/env node
/**
 * Project Financial Review
 *
 * Generates comprehensive financial summaries per project from Supabase data:
 * - Income and expenditure from Xero transactions
 * - Outstanding invoices (receivables & payables)
 * - Grant pipeline and status
 * - Subscriptions linked to project
 * - Cashflow scenarios with project adjustments
 *
 * Usage:
 *   node scripts/project-financial-review.mjs [PROJECT_CODE]  # Single project review
 *   node scripts/project-financial-review.mjs all              # All projects summary
 *   node scripts/project-financial-review.mjs --days=N         # Limit to N days (default 365)
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

// Parse CLI args
function parseCLIArgs() {
  const args = process.argv.slice(2);
  let days = 365;
  let projectCode = null;

  for (const arg of args) {
    if (arg.startsWith('--days=')) {
      days = parseInt(arg.split('=')[1], 10);
    } else if (!arg.startsWith('--')) {
      projectCode = arg;
    }
  }

  return { projectCode, days };
}

// Get date N days ago
function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// Group transactions by month
function groupByMonth(transactions) {
  const byMonth = {};

  for (const tx of transactions) {
    if (!tx.date) continue;
    const month = tx.date.substring(0, 7); // YYYY-MM
    if (!byMonth[month]) {
      byMonth[month] = { income: 0, spend: 0 };
    }

    const amount = parseFloat(tx.total) || 0;
    if (tx.type === 'ACCREC' || tx.type === 'ACCPAY CREDIT') {
      byMonth[month].income += amount;
    } else if (tx.type === 'ACCPAY' || tx.type === 'ACCREC CREDIT') {
      byMonth[month].spend += Math.abs(amount);
    }
  }

  return Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
}

// Fetch project transactions
async function fetchProjectTransactions(projectCode, days) {
  const cutoffDate = getDaysAgo(days);

  const { data, error } = await supabase
    .from('xero_transactions')
    .select('*')
    .eq('project_code', projectCode)
    .gte('date', cutoffDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data || [];
}

// Fetch outstanding invoices for project
async function fetchOutstandingInvoices(projectCode) {
  const { data, error } = await supabase
    .from('v_outstanding_invoices')
    .select('*')
    .eq('project_code', projectCode)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching outstanding invoices:', error);
    return [];
  }

  return data || [];
}

// Fetch grant applications for project
async function fetchGrantApplications(projectCode) {
  const { data, error } = await supabase
    .from('grant_applications')
    .select('*')
    .eq('project_code', projectCode)
    .order('amount_requested', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching grant applications:', error);
    return [];
  }

  return data || [];
}

// Fetch subscriptions for project
async function fetchSubscriptions(projectCode) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .contains('project_codes', [projectCode])
    .order('amount', { ascending: false });

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  return data || [];
}

// Fetch cashflow scenarios mentioning project
async function fetchCashflowScenarios(projectCode) {
  const { data, error } = await supabase
    .from('cashflow_scenarios')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching cashflow scenarios:', error);
    return [];
  }

  // Filter scenarios where adjustments mention this project
  const relevant = (data || []).filter(scenario => {
    if (!scenario.adjustments) return false;
    const adjString = JSON.stringify(scenario.adjustments).toLowerCase();
    return adjString.includes(projectCode.toLowerCase());
  });

  return relevant;
}

// Generate single project report
async function generateProjectReport(projectCode, days) {
  const project = projectCodes.projects[projectCode];
  if (!project) {
    console.error(`\n❌ Invalid project code: ${projectCode}`);
    console.log('\nUse: node scripts/project-financial-review.mjs all');
    return;
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`📊 Financial Review: ${project.name} (${projectCode})`);
  console.log('═'.repeat(80));

  // Project Overview
  console.log('\n## Project Overview');
  console.log('─'.repeat(80));
  console.log(`Name:        ${project.name}`);
  console.log(`Code:        ${projectCode}`);
  console.log(`Category:    ${project.category}`);
  console.log(`Status:      ${project.status}`);
  console.log(`Priority:    ${project.priority || '—'}`);
  if (project.leads && project.leads.length > 0) {
    console.log(`Leads:       ${project.leads.join(', ')}`);
  }
  if (project.description) {
    console.log(`Description: ${project.description}`);
  }

  // Fetch data
  const transactions = await fetchProjectTransactions(projectCode, days);
  const invoices = await fetchOutstandingInvoices(projectCode);
  const grants = await fetchGrantApplications(projectCode);
  const subscriptions = await fetchSubscriptions(projectCode);
  const scenarios = await fetchCashflowScenarios(projectCode);

  // Income & Expenditure
  console.log('\n## Income & Expenditure');
  console.log(`Period: Last ${days} days`);
  console.log('─'.repeat(80));

  let totalIncome = 0;
  let totalSpend = 0;

  for (const tx of transactions) {
    const amount = parseFloat(tx.total) || 0;
    if (tx.type === 'ACCREC' || tx.type === 'ACCPAY CREDIT') {
      totalIncome += amount;
    } else if (tx.type === 'ACCPAY' || tx.type === 'ACCREC CREDIT') {
      totalSpend += Math.abs(amount);
    }
  }

  console.log(`Total Income:      ${formatCurrency(totalIncome)}`);
  console.log(`Total Expenditure: ${formatCurrency(totalSpend)}`);
  console.log(`Net Position:      ${formatCurrency(totalIncome - totalSpend)}`);
  console.log(`Transactions:      ${transactions.length}`);

  // Monthly Breakdown
  if (transactions.length > 0) {
    console.log('\n### Monthly Breakdown');
    console.log('─'.repeat(80));
    console.log('Month'.padEnd(12) + 'Income'.padStart(15) + 'Spend'.padStart(15) + 'Net'.padStart(15));
    console.log('─'.repeat(80));

    const monthly = groupByMonth(transactions);
    for (const [month, data] of monthly) {
      const net = data.income - data.spend;
      console.log(
        month.padEnd(12) +
        formatCurrency(data.income).padStart(15) +
        formatCurrency(data.spend).padStart(15) +
        formatCurrency(net).padStart(15)
      );
    }
  }

  // Outstanding Invoices
  console.log('\n## Outstanding Invoices');
  console.log('─'.repeat(80));

  if (invoices.length === 0) {
    console.log('No outstanding invoices');
  } else {
    const receivables = invoices.filter(inv => inv.type === 'ACCREC');
    const payables = invoices.filter(inv => inv.type === 'ACCPAY');

    const totalReceivable = receivables.reduce((sum, inv) => sum + (parseFloat(inv.amount_due) || 0), 0);
    const totalPayable = payables.reduce((sum, inv) => sum + (parseFloat(inv.amount_due) || 0), 0);

    console.log(`Receivables: ${receivables.length} invoices, ${formatCurrency(totalReceivable)}`);
    console.log(`Payables:    ${payables.length} invoices, ${formatCurrency(totalPayable)}`);

    if (receivables.length > 0) {
      console.log('\n### Receivables (Money owed to ACT)');
      console.log('Contact'.padEnd(35) + 'Amount'.padStart(15) + '  Due Date');
      console.log('─'.repeat(70));
      for (const inv of receivables.slice(0, 10)) {
        const contact = (inv.contact_name || 'Unknown').substring(0, 33);
        const dueDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—';
        console.log(
          contact.padEnd(35) +
          formatCurrency(inv.amount_due).padStart(15) +
          `  ${dueDate}`
        );
      }
      if (receivables.length > 10) {
        console.log(`... and ${receivables.length - 10} more`);
      }
    }

    if (payables.length > 0) {
      console.log('\n### Payables (Money ACT owes)');
      console.log('Contact'.padEnd(35) + 'Amount'.padStart(15) + '  Due Date');
      console.log('─'.repeat(70));
      for (const inv of payables.slice(0, 10)) {
        const contact = (inv.contact_name || 'Unknown').substring(0, 33);
        const dueDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—';
        console.log(
          contact.padEnd(35) +
          formatCurrency(inv.amount_due).padStart(15) +
          `  ${dueDate}`
        );
      }
      if (payables.length > 10) {
        console.log(`... and ${payables.length - 10} more`);
      }
    }
  }

  // Grant Pipeline
  console.log('\n## Grant Pipeline');
  console.log('─'.repeat(80));

  if (grants.length === 0) {
    console.log('No grants tracked for this project');
  } else {
    let grantTotal = 0;
    let grantApproved = 0;

    console.log('Application'.padEnd(45) + 'Amount'.padStart(15) + '  Status');
    console.log('─'.repeat(80));

    for (const grant of grants) {
      const amount = parseFloat(grant.amount_requested) || 0;
      grantTotal += amount;

      if (grant.status === 'approved' || grant.status === 'received') {
        grantApproved += amount;
      }

      const name = (grant.application_name || 'Unnamed').substring(0, 43);
      const statusIcon = grant.status === 'approved' ? '✅' : grant.status === 'submitted' ? '🔵' : '⚪';

      console.log(
        name.padEnd(45) +
        formatCurrency(amount).padStart(15) +
        `  ${statusIcon} ${grant.status || 'unknown'}`
      );

      if (grant.notes) {
        const notes = grant.notes.substring(0, 70);
        console.log(`  └─ ${notes}`);
      }
    }

    console.log('─'.repeat(80));
    console.log(`Total Pipeline: ${formatCurrency(grantTotal)}`);
    console.log(`Approved/Received: ${formatCurrency(grantApproved)}`);
  }

  // Subscriptions
  console.log('\n## Subscriptions');
  console.log('─'.repeat(80));

  if (subscriptions.length === 0) {
    console.log('No subscriptions linked to this project');
  } else {
    let annualTotal = 0;

    console.log('Vendor'.padEnd(40) + 'Amount'.padStart(15) + '  Cycle');
    console.log('─'.repeat(80));

    for (const sub of subscriptions) {
      const amount = parseFloat(sub.amount) || 0;
      const cycle = sub.billing_cycle || 'unknown';
      const vendor = (sub.vendor_name || 'Unknown').substring(0, 38);

      // Estimate annual cost
      let annualAmount = amount;
      if (cycle === 'monthly') annualAmount = amount * 12;
      else if (cycle === 'quarterly') annualAmount = amount * 4;
      else if (cycle === 'yearly') annualAmount = amount;

      annualTotal += annualAmount;

      console.log(
        vendor.padEnd(40) +
        formatCurrency(amount).padStart(15) +
        `  ${cycle}`
      );
    }

    console.log('─'.repeat(80));
    console.log(`Estimated Annual Cost: ${formatCurrency(annualTotal)}`);
  }

  // Cashflow Scenarios
  console.log('\n## Cashflow Scenarios');
  console.log('─'.repeat(80));

  if (scenarios.length === 0) {
    console.log('No active cashflow scenarios mention this project');
  } else {
    for (const scenario of scenarios) {
      console.log(`\n### ${scenario.name}`);
      if (scenario.description) {
        console.log(`    ${scenario.description}`);
      }

      // Try to extract project-related adjustments from the jsonb field
      if (scenario.adjustments) {
        const adjString = JSON.stringify(scenario.adjustments, null, 2);
        if (adjString.toLowerCase().includes(projectCode.toLowerCase())) {
          console.log('    Adjustments mentioning this project:');
          console.log('    ' + adjString.substring(0, 300).replace(/\n/g, '\n    '));
          if (adjString.length > 300) console.log('    ...');
        }
      }
    }
  }

  console.log('\n' + '═'.repeat(80));
}

// Generate all projects summary
async function generateAllProjectsSummary(days) {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 All Projects Financial Summary');
  console.log(`Period: Last ${days} days`);
  console.log('═'.repeat(80));

  const cutoffDate = getDaysAgo(days);

  // Fetch all transactions
  const { data: allTransactions, error } = await supabase
    .from('xero_transactions')
    .select('*')
    .gte('date', cutoffDate);

  if (error) {
    console.error('Error fetching transactions:', error);
    return;
  }

  // Group by project
  const byProject = {};
  let unassigned = { income: 0, spend: 0 };

  for (const tx of allTransactions || []) {
    const code = tx.project_code;
    const amount = parseFloat(tx.total) || 0;

    if (!code) {
      if (tx.type === 'ACCREC' || tx.type === 'ACCPAY CREDIT') {
        unassigned.income += amount;
      } else if (tx.type === 'ACCPAY' || tx.type === 'ACCREC CREDIT') {
        unassigned.spend += Math.abs(amount);
      }
      continue;
    }

    if (!byProject[code]) {
      byProject[code] = { income: 0, spend: 0, txCount: 0 };
    }

    byProject[code].txCount++;

    if (tx.type === 'ACCREC' || tx.type === 'ACCPAY CREDIT') {
      byProject[code].income += amount;
    } else if (tx.type === 'ACCPAY' || tx.type === 'ACCREC CREDIT') {
      byProject[code].spend += Math.abs(amount);
    }
  }

  // Sort by total activity (income + spend)
  const sorted = Object.entries(byProject).sort((a, b) =>
    (b[1].income + b[1].spend) - (a[1].income + a[1].spend)
  );

  console.log('\nProject'.padEnd(12) + 'Name'.padEnd(30) + 'Income'.padStart(15) + 'Spend'.padStart(15) + 'Net'.padStart(15));
  console.log('─'.repeat(100));

  let totalIncome = 0;
  let totalSpend = 0;

  for (const [code, data] of sorted) {
    const project = projectCodes.projects[code];
    const name = project ? project.name.substring(0, 28) : 'Unknown';
    const net = data.income - data.spend;

    totalIncome += data.income;
    totalSpend += data.spend;

    console.log(
      code.padEnd(12) +
      name.padEnd(30) +
      formatCurrency(data.income).padStart(15) +
      formatCurrency(data.spend).padStart(15) +
      formatCurrency(net).padStart(15)
    );
  }

  if (unassigned.income > 0 || unassigned.spend > 0) {
    const net = unassigned.income - unassigned.spend;
    console.log(
      '—'.padEnd(12) +
      'Unassigned'.padEnd(30) +
      formatCurrency(unassigned.income).padStart(15) +
      formatCurrency(unassigned.spend).padStart(15) +
      formatCurrency(net).padStart(15)
    );
    totalIncome += unassigned.income;
    totalSpend += unassigned.spend;
  }

  console.log('─'.repeat(100));
  console.log(
    'TOTAL'.padEnd(42) +
    formatCurrency(totalIncome).padStart(15) +
    formatCurrency(totalSpend).padStart(15) +
    formatCurrency(totalIncome - totalSpend).padStart(15)
  );

  console.log('\n' + '═'.repeat(80));
  console.log(`Total Income:      ${formatCurrency(totalIncome)}`);
  console.log(`Total Expenditure: ${formatCurrency(totalSpend)}`);
  console.log(`Net Position:      ${formatCurrency(totalIncome - totalSpend)}`);
  console.log(`Projects Active:   ${sorted.length}`);
}

// Main CLI
async function main() {
  const { projectCode, days } = parseCLIArgs();

  if (!projectCode) {
    console.log('\n📊 Project Financial Review\n');
    console.log('Usage:');
    console.log('  node scripts/project-financial-review.mjs [PROJECT_CODE]  # Single project');
    console.log('  node scripts/project-financial-review.mjs all              # All projects');
    console.log('  node scripts/project-financial-review.mjs --days=N         # Limit to N days (default 365)');
    console.log('\nExamples:');
    console.log('  node scripts/project-financial-review.mjs ACT-HV');
    console.log('  node scripts/project-financial-review.mjs ACT-JH --days=90');
    console.log('  node scripts/project-financial-review.mjs all --days=180');
    return;
  }

  if (projectCode.toLowerCase() === 'all') {
    await generateAllProjectsSummary(days);
  } else {
    await generateProjectReport(projectCode.toUpperCase(), days);
  }
}

main().catch(console.error);
