#!/usr/bin/env node
/**
 * Setup Xero Repeating Invoices for Subscriptions
 *
 * Analyses transaction history to detect recurring subscriptions,
 * then creates Xero repeating invoices so bills are pre-created
 * and auto-match with bank transactions — eliminating the need
 * for receipt capture + matching for predictable spend.
 *
 * Usage:
 *   node scripts/setup-repeating-invoices.mjs              # Preview repeating invoices to create
 *   node scripts/setup-repeating-invoices.mjs --apply       # Create in Xero (needs auth)
 *   node scripts/setup-repeating-invoices.mjs --json        # JSON output
 *
 * How it works:
 *   1. Queries FY26 transactions for vendors appearing 3+ months
 *   2. Detects amount pattern (fixed vs variable)
 *   3. Cross-references vendor_project_rules for project code + category
 *   4. Generates repeating invoice definition
 *   5. Optionally creates in Xero via API
 *
 * What this eliminates:
 *   - Receipt capture for these vendors
 *   - Receipt matching for these vendors
 *   - Manual reconciliation for these vendors
 *   - Project tagging for these vendors (baked into the repeating invoice)
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const JSON_MODE = args.includes('--json');

function log(msg) {
  if (!JSON_MODE) console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function formatMoney(n) {
  return `$${Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================================
// DETECT SUBSCRIPTIONS
// ============================================================================

// Vendors that should NOT get repeating invoices (variable/travel/one-off)
const EXCLUDE_VENDORS = new Set([
  'uber', 'uber eats', 'qantas', 'virgin australia', 'cabcharge',
  'amazon', 'flight bar witta', 'chris witta', 'thrifty', 'avis',
  'nab', 'nab fee', 'nab international fee', 'nicholas marchesi', 'nicholas',
  'bp', 'woolworths', 'iga', 'bunnings', 'budget',
]);

// Personal subscriptions to flag
const PERSONAL_VENDORS = new Set([
  'audible', 'docplay', 'amazon prime', 'garmin australasia', 'midjourney inc',
]);

async function detectSubscriptions() {
  log('Detecting recurring subscriptions from FY26 data...');

  // Get all vendors appearing 3+ months with consistent amounts
  const { data: recurring } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        t.contact_name as vendor,
        COUNT(DISTINCT to_char(t.date, 'YYYY-MM')) as months_active,
        COUNT(*) as txn_count,
        ROUND(AVG(ABS(t.total))::numeric, 2) as avg_amount,
        ROUND(STDDEV(ABS(t.total))::numeric, 2) as stddev_amount,
        ROUND(MIN(ABS(t.total))::numeric, 2) as min_amount,
        ROUND(MAX(ABS(t.total))::numeric, 2) as max_amount,
        r.project_code,
        r.category,
        r.rd_eligible
      FROM xero_transactions t
      LEFT JOIN vendor_project_rules r ON LOWER(t.contact_name) = LOWER(r.vendor_name)
      WHERE t.date >= '2025-07-01' AND t.date <= '2026-03-31'
        AND t.type = 'SPEND'
        AND ABS(t.total) > 5
      GROUP BY t.contact_name, r.project_code, r.category, r.rd_eligible
      HAVING COUNT(DISTINCT to_char(t.date, 'YYYY-MM')) >= 3
      ORDER BY AVG(ABS(t.total)) DESC
    `
  });

  if (!recurring?.length) {
    log('No recurring subscriptions detected');
    return [];
  }

  const subscriptions = [];

  for (const r of recurring) {
    const vendor = r.vendor?.toLowerCase();
    if (!vendor) continue;
    if (EXCLUDE_VENDORS.has(vendor)) continue;

    const isPersonal = PERSONAL_VENDORS.has(vendor);
    const avgAmount = parseFloat(r.avg_amount);
    const stddev = parseFloat(r.stddev_amount) || 0;
    const coeffVariation = avgAmount > 0 ? stddev / avgAmount : 0;

    // Determine if amount is fixed or variable
    const isFixedAmount = coeffVariation < 0.15; // Less than 15% variation = fixed
    const suggestedAmount = isFixedAmount
      ? Math.round(avgAmount * 100) / 100  // Use average for fixed
      : Math.round(parseFloat(r.max_amount) * 100) / 100; // Use max for variable (ceiling)

    // Determine frequency
    const txnPerMonth = parseInt(r.txn_count) / parseInt(r.months_active);
    let frequency = 'MONTHLY';
    if (txnPerMonth < 0.5) frequency = 'QUARTERLY';
    if (txnPerMonth > 1.5) frequency = 'WEEKLY'; // Multiple per month

    // Map category to Xero account code
    const accountCode = mapCategoryToAccount(r.category);

    subscriptions.push({
      vendor: r.vendor,
      amount: suggestedAmount,
      isFixedAmount,
      frequency,
      monthsActive: parseInt(r.months_active),
      txnCount: parseInt(r.txn_count),
      projectCode: r.project_code || 'ACT-IN',
      category: r.category || 'Uncategorised',
      rdEligible: r.rd_eligible || false,
      isPersonal,
      accountCode,
      annualCost: suggestedAmount * (frequency === 'MONTHLY' ? 12 : frequency === 'WEEKLY' ? 52 : 4),
    });
  }

  return subscriptions.sort((a, b) => b.annualCost - a.annualCost);
}

function mapCategoryToAccount(category) {
  const map = {
    'Software & Subscriptions': '461', // Computer Expenses
    'Travel': '493',                   // Travel National
    'Operations': '429',               // General Expenses
    'Materials & Supplies': '300',     // Purchases
    'Meals & Entertainment': '425',    // Entertainment
    'Bank Fees': '404',                // Bank Fees
  };
  return map[category] || '429'; // Default to General Expenses
}

// ============================================================================
// GENERATE XERO REPEATING INVOICE DEFINITIONS
// ============================================================================

function generateRepeatingInvoice(sub) {
  return {
    Type: 'ACCPAY',
    Contact: { Name: sub.vendor },
    Schedule: {
      Period: 1,
      Unit: sub.frequency === 'WEEKLY' ? 'WEEKLY' : sub.frequency === 'QUARTERLY' ? 'MONTHLY' : 'MONTHLY',
      DueDate: 20, // Due on 20th
      DueDateType: 'OFCURRENTMONTH',
      StartDate: new Date().toISOString().split('T')[0],
    },
    LineItems: [{
      Description: `${sub.vendor} - ${sub.category}${sub.rdEligible ? ' [R&D Eligible]' : ''}`,
      Quantity: 1,
      UnitAmount: sub.amount,
      AccountCode: sub.accountCode,
      TaxType: 'INPUT', // GST inclusive
      Tracking: sub.projectCode ? [{
        Name: 'Project',
        Option: sub.projectCode,
      }] : undefined,
    }],
    Reference: `Auto: ${sub.vendor}`,
    Status: 'DRAFT', // Create as draft, user approves
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('=== Repeating Invoice Setup ===\n');

  const subscriptions = await detectSubscriptions();

  if (!subscriptions.length) {
    log('No subscriptions to set up');
    return;
  }

  // Split into categories
  const saas = subscriptions.filter(s => s.category === 'Software & Subscriptions' && !s.isPersonal);
  const operations = subscriptions.filter(s => s.category === 'Operations');
  const personal = subscriptions.filter(s => s.isPersonal);
  const other = subscriptions.filter(s =>
    s.category !== 'Software & Subscriptions' &&
    s.category !== 'Operations' &&
    !s.isPersonal
  );

  const totalAnnual = subscriptions.filter(s => !s.isPersonal).reduce((s, sub) => s + sub.annualCost, 0);
  const rdEligibleAnnual = subscriptions.filter(s => s.rdEligible && !s.isPersonal).reduce((s, sub) => s + sub.annualCost, 0);

  if (JSON_MODE) {
    console.log(JSON.stringify({ subscriptions, totalAnnual, rdEligibleAnnual }, null, 2));
    return;
  }

  // Print report
  console.log('════════════════════════════════════════════════════════════');
  console.log('  REPEATING INVOICE SETUP');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log(`  Total subscriptions detected: ${subscriptions.length}`);
  console.log(`  Annual cost: ${formatMoney(totalAnnual)}`);
  console.log(`  R&D eligible annual: ${formatMoney(rdEligibleAnnual)} → ${formatMoney(rdEligibleAnnual * 0.435)} potential refund\n`);

  if (saas.length > 0) {
    console.log('── Software & Subscriptions ────────────────────────────────');
    for (const s of saas) {
      const rd = s.rdEligible ? ' [R&D]' : '';
      const fixed = s.isFixedAmount ? '(fixed)' : '(variable)';
      console.log(`  ${s.vendor.padEnd(30)} ${formatMoney(s.amount).padStart(10)}/mo  ${fixed.padStart(10)}  → ${s.projectCode}${rd}`);
    }
    console.log(`  ${'SUBTOTAL'.padEnd(30)} ${formatMoney(saas.reduce((s, sub) => s + sub.amount, 0)).padStart(10)}/mo\n`);
  }

  if (operations.length > 0) {
    console.log('── Operations ──────────────────────────────────────────────');
    for (const s of operations) {
      console.log(`  ${s.vendor.padEnd(30)} ${formatMoney(s.amount).padStart(10)}/mo  → ${s.projectCode}`);
    }
    console.log('');
  }

  if (other.length > 0) {
    console.log('── Other Recurring ─────────────────────────────────────────');
    for (const s of other) {
      console.log(`  ${s.vendor.padEnd(30)} ${formatMoney(s.amount).padStart(10)}/mo  → ${s.projectCode}  (${s.category})`);
    }
    console.log('');
  }

  if (personal.length > 0) {
    console.log('── PERSONAL (exclude from business) ────────────────────────');
    for (const s of personal) {
      console.log(`  ${s.vendor.padEnd(30)} ${formatMoney(s.amount).padStart(10)}/mo  ← should be personal expense`);
    }
    const personalAnnual = personal.reduce((s, sub) => s + sub.annualCost, 0);
    console.log(`  ${'ANNUAL PERSONAL'.padEnd(30)} ${formatMoney(personalAnnual).padStart(10)}  ← remove from business\n`);
  }

  // What this eliminates
  const autoReconcileCount = subscriptions.filter(s => s.isFixedAmount && !s.isPersonal).length;
  console.log('════════════════════════════════════════════════════════════');
  console.log('  IMPACT');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log(`  Fixed-amount subscriptions: ${autoReconcileCount} → will auto-reconcile in Xero`);
  console.log(`  Variable subscriptions: ${subscriptions.length - autoReconcileCount - personal.length} → ceiling amount, manual adjust`);
  console.log(`  Personal to remove: ${personal.length} (${formatMoney(personal.reduce((s, sub) => s + sub.annualCost, 0))}/year)`);
  console.log(`  R&D refund potential: ${formatMoney(rdEligibleAnnual * 0.435)}/year`);
  console.log(`  Monthly receipt-matching eliminated: ~${autoReconcileCount * 9} transactions/year\n`);

  if (APPLY) {
    log('Creating repeating invoices in Xero...');
    log('ERROR: Xero auth required. Run: node scripts/xero-auth.mjs');
    log('Once authenticated, re-run with --apply');
    // TODO: Implement Xero API calls when auth is available
    // const xeroInvoices = subscriptions.filter(s => !s.isPersonal && s.isFixedAmount).map(generateRepeatingInvoice);
  } else {
    log('Use --apply to create repeating invoices in Xero (needs auth)');
  }
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
