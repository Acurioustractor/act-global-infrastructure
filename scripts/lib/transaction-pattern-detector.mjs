#!/usr/bin/env node
/**
 * Transaction Pattern Detector
 *
 * Detects recurring payment patterns from Xero bank transactions.
 * Groups by vendor, calculates intervals, identifies subscriptions.
 *
 * Usage:
 *   import { detectRecurringPatterns } from './lib/transaction-pattern-detector.mjs';
 *   const patterns = await detectRecurringPatterns(180); // Last 180 days
 *
 * CLI:
 *   node scripts/lib/transaction-pattern-detector.mjs
 *   node scripts/lib/transaction-pattern-detector.mjs --days=365
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env.local') });

// Load supplier rules for vendor matching
let SUPPLIER_RULES = {};
try {
  SUPPLIER_RULES = JSON.parse(readFileSync(join(__dirname, '../../config/dext-supplier-rules.json'), 'utf8'));
} catch (e) {
  // Continue without supplier rules
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Pattern detection thresholds
const THRESHOLDS = {
  MIN_PAYMENTS: 2,           // Minimum payments to consider a pattern
  MONTHLY_MIN_DAYS: 25,      // Minimum days for monthly
  MONTHLY_MAX_DAYS: 35,      // Maximum days for monthly
  QUARTERLY_MIN_DAYS: 85,    // Minimum days for quarterly
  QUARTERLY_MAX_DAYS: 95,    // Maximum days for quarterly
  ANNUAL_MIN_DAYS: 350,      // Minimum days for annual
  ANNUAL_MAX_DAYS: 380,      // Maximum days for annual
  AMOUNT_VARIANCE_THRESHOLD: 0.05, // 5% variance threshold
};

// ============================================================================
// VENDOR NORMALIZATION
// ============================================================================

/**
 * Normalize vendor name for grouping
 */
function normalizeVendorName(name) {
  if (!name) return 'UNKNOWN';

  let normalized = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Check supplier rules for canonical name
  const allVendors = [
    ...(SUPPLIER_RULES.auto_publish_rules?.subscriptions?.vendors || []),
    ...(SUPPLIER_RULES.auto_publish_rules?.travel_review?.vendors || []),
    ...(SUPPLIER_RULES.auto_publish_rules?.supplies_review?.vendors || []),
    ...(SUPPLIER_RULES.auto_publish_rules?.project_specific?.vendors || []),
  ];

  for (const vendor of allVendors) {
    const aliases = [vendor.name, ...(vendor.aliases || [])].map(a => a.toUpperCase());
    for (const alias of aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return vendor.name.toUpperCase();
      }
    }
  }

  return normalized;
}

/**
 * Get vendor metadata from supplier rules
 */
function getVendorMetadata(vendorName) {
  const normalized = vendorName.toUpperCase();

  const allVendors = [
    ...(SUPPLIER_RULES.auto_publish_rules?.subscriptions?.vendors || []),
    ...(SUPPLIER_RULES.auto_publish_rules?.travel_review?.vendors || []),
    ...(SUPPLIER_RULES.auto_publish_rules?.supplies_review?.vendors || []),
    ...(SUPPLIER_RULES.auto_publish_rules?.project_specific?.vendors || []),
  ];

  for (const vendor of allVendors) {
    const aliases = [vendor.name, ...(vendor.aliases || [])].map(a => a.toUpperCase());
    if (aliases.includes(normalized) || aliases.some(a => normalized.includes(a))) {
      return {
        name: vendor.name,
        category: vendor.category,
        expected_amount: vendor.avg_amount,
        frequency: vendor.frequency,
        is_subscription: SUPPLIER_RULES.auto_publish_rules?.subscriptions?.vendors?.includes(vendor),
        auto_publish: vendor.auto_publish
      };
    }
  }

  return null;
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

/**
 * Detect billing cycle from average interval
 */
function detectBillingCycle(avgInterval) {
  if (avgInterval >= THRESHOLDS.MONTHLY_MIN_DAYS && avgInterval <= THRESHOLDS.MONTHLY_MAX_DAYS) {
    return 'monthly';
  }
  if (avgInterval >= THRESHOLDS.QUARTERLY_MIN_DAYS && avgInterval <= THRESHOLDS.QUARTERLY_MAX_DAYS) {
    return 'quarterly';
  }
  if (avgInterval >= THRESHOLDS.ANNUAL_MIN_DAYS && avgInterval <= THRESHOLDS.ANNUAL_MAX_DAYS) {
    return 'annual';
  }
  return 'unknown';
}

/**
 * Calculate confidence score for a payment pattern
 */
function calculateConfidence(payments, avgInterval, amountVariance, vendorMeta) {
  let confidence = 70; // Base confidence

  // More payments = higher confidence
  if (payments.length >= 6) confidence += 10;
  if (payments.length >= 12) confidence += 5;

  // Consistent amounts = higher confidence
  if (amountVariance < 0.01) confidence += 15; // <1% variance
  else if (amountVariance < 0.05) confidence += 10; // <5% variance

  // Known vendor = higher confidence
  if (vendorMeta) {
    confidence += 10;
    if (vendorMeta.is_subscription) confidence += 5;
  }

  // Recognized billing cycle = higher confidence
  const cycle = detectBillingCycle(avgInterval);
  if (cycle !== 'unknown') confidence += 5;

  return Math.min(confidence, 100);
}

/**
 * Detect recurring payment patterns from transactions
 *
 * @param {number} daysBack - Number of days to analyze
 * @returns {Promise<Array>} Array of detected patterns
 */
export async function detectRecurringPatterns(daysBack = 180) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  // Fetch SPEND transactions (payments we made)
  const { data: transactions, error } = await supabase
    .from('xero_transactions')
    .select('*')
    .eq('type', 'SPEND')
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Group by normalized vendor name
  const byVendor = {};
  for (const txn of transactions) {
    const vendor = normalizeVendorName(txn.contact_name);
    if (!byVendor[vendor]) {
      byVendor[vendor] = [];
    }
    byVendor[vendor].push({
      date: new Date(txn.date),
      amount: Math.abs(txn.total), // Ensure positive
      description: txn.line_items?.[0]?.description,
      xero_id: txn.xero_transaction_id
    });
  }

  // Analyze each vendor's payment pattern
  const patterns = [];

  for (const [vendor, payments] of Object.entries(byVendor)) {
    // Skip vendors with too few payments
    if (payments.length < THRESHOLDS.MIN_PAYMENTS) {
      continue;
    }

    // Sort by date
    payments.sort((a, b) => a.date - b.date);

    // Calculate intervals between payments
    const intervals = [];
    for (let i = 1; i < payments.length; i++) {
      const daysDiff = Math.round((payments[i].date - payments[i - 1].date) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);
    }

    // Calculate average interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Calculate interval variance (consistency check)
    const intervalVariance = intervals.length > 1
      ? Math.sqrt(intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length) / avgInterval
      : 0;

    // Skip if intervals are too inconsistent (variance > 50%)
    if (intervalVariance > 0.5) {
      continue;
    }

    // Calculate amount stats
    const amounts = payments.map(p => p.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    const amountVariance = (maxAmount - minAmount) / avgAmount;

    // Get vendor metadata
    const vendorMeta = getVendorMetadata(vendor);

    // Detect billing cycle
    const billingCycle = detectBillingCycle(avgInterval);

    // Calculate confidence
    const confidence = calculateConfidence(payments, avgInterval, amountVariance, vendorMeta);

    // Only include patterns with recognized billing cycle or high payment count
    if (billingCycle === 'unknown' && payments.length < 6) {
      continue;
    }

    patterns.push({
      vendor_name: vendorMeta?.name || vendor,
      vendor_aliases: vendorMeta ? [vendor] : [],
      payment_count: payments.length,

      // Amount analysis
      avg_amount: Math.round(avgAmount * 100) / 100,
      min_amount: Math.round(minAmount * 100) / 100,
      max_amount: Math.round(maxAmount * 100) / 100,
      amount_variance_pct: Math.round(amountVariance * 10000) / 100,

      // Interval analysis
      avg_interval_days: Math.round(avgInterval),
      interval_variance_pct: Math.round(intervalVariance * 10000) / 100,
      billing_cycle: billingCycle,

      // Dates
      first_payment: payments[0].date.toISOString().split('T')[0],
      last_payment: payments[payments.length - 1].date.toISOString().split('T')[0],

      // Confidence and source
      discovery_confidence: confidence,
      discovery_source: 'transaction',

      // Vendor metadata
      known_vendor: !!vendorMeta,
      expected_amount: vendorMeta?.expected_amount,
      is_known_subscription: vendorMeta?.is_subscription || false,

      // Evidence for auditing
      evidence: payments.slice(-5).map(p => ({
        type: 'transaction',
        date: p.date.toISOString().split('T')[0],
        amount: p.amount,
        xero_id: p.xero_id
      }))
    });
  }

  // Sort by confidence descending
  patterns.sort((a, b) => b.discovery_confidence - a.discovery_confidence);

  return patterns;
}

/**
 * Convert detected pattern to subscription candidate format
 *
 * @param {Object} pattern - Detected pattern
 * @returns {Object} Subscription candidate
 */
export function toSubscriptionCandidate(pattern) {
  return {
    vendor_name: pattern.vendor_name,
    vendor_aliases: pattern.vendor_aliases,
    detected_amount: pattern.avg_amount,
    detected_currency: 'AUD',
    detected_cycle: pattern.billing_cycle,
    discovery_source: 'transaction',
    discovery_confidence: pattern.discovery_confidence,
    first_seen_at: pattern.first_payment,
    last_seen_at: pattern.last_payment,
    payment_count: pattern.payment_count,
    avg_interval_days: pattern.avg_interval_days,
    amount_variance_pct: pattern.amount_variance_pct,
    evidence: pattern.evidence
  };
}

/**
 * Get subscription candidates from transaction patterns
 *
 * @param {number} daysBack - Number of days to analyze
 * @returns {Promise<Array>} Array of subscription candidates
 */
export async function getTransactionSubscriptionCandidates(daysBack = 180) {
  const patterns = await detectRecurringPatterns(daysBack);
  return patterns.map(toSubscriptionCandidate);
}

/**
 * Detect price changes by comparing recent vs expected amounts
 *
 * @param {number} daysBack - Number of days to analyze
 * @returns {Promise<Array>} Array of price change detections
 */
export async function detectPriceChanges(daysBack = 90) {
  const patterns = await detectRecurringPatterns(daysBack);
  const priceChanges = [];

  for (const pattern of patterns) {
    // Skip if no expected amount from supplier rules
    if (!pattern.expected_amount) continue;

    const variance = Math.abs(pattern.avg_amount - pattern.expected_amount) / pattern.expected_amount;

    if (variance > THRESHOLDS.AMOUNT_VARIANCE_THRESHOLD) {
      priceChanges.push({
        vendor_name: pattern.vendor_name,
        expected_amount: pattern.expected_amount,
        actual_amount: pattern.avg_amount,
        variance_pct: Math.round(variance * 10000) / 100,
        direction: pattern.avg_amount > pattern.expected_amount ? 'increased' : 'decreased',
        billing_cycle: pattern.billing_cycle,
        last_payment: pattern.last_payment
      });
    }
  }

  return priceChanges;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const daysArg = process.argv.find(a => a.startsWith('--days='));
  const daysBack = daysArg ? parseInt(daysArg.split('=')[1]) : 180;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Transaction Pattern Detector');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Analyzing last ${daysBack} days of transactions...\n`);

  try {
    const patterns = await detectRecurringPatterns(daysBack);

    console.log(`Found ${patterns.length} recurring payment patterns:\n`);

    // Group by billing cycle
    const monthly = patterns.filter(p => p.billing_cycle === 'monthly');
    const quarterly = patterns.filter(p => p.billing_cycle === 'quarterly');
    const annual = patterns.filter(p => p.billing_cycle === 'annual');
    const unknown = patterns.filter(p => p.billing_cycle === 'unknown');

    if (monthly.length > 0) {
      console.log('📅 MONTHLY SUBSCRIPTIONS:');
      console.log('─'.repeat(80));
      for (const p of monthly) {
        const knownFlag = p.known_vendor ? '✓' : '?';
        console.log(`  ${knownFlag} ${p.vendor_name.padEnd(25)} $${p.avg_amount.toFixed(2).padStart(10)} avg  (${p.payment_count} payments, ${p.discovery_confidence}% conf)`);
        if (p.amount_variance_pct > 5) {
          console.log(`    ⚠️  Amount variance: ${p.amount_variance_pct}% ($${p.min_amount} - $${p.max_amount})`);
        }
      }
      const monthlyTotal = monthly.reduce((sum, p) => sum + p.avg_amount, 0);
      console.log('─'.repeat(80));
      console.log(`  Monthly total: $${monthlyTotal.toFixed(2)}`);
    }

    if (quarterly.length > 0) {
      console.log('\n📅 QUARTERLY SUBSCRIPTIONS:');
      console.log('─'.repeat(80));
      for (const p of quarterly) {
        const knownFlag = p.known_vendor ? '✓' : '?';
        console.log(`  ${knownFlag} ${p.vendor_name.padEnd(25)} $${p.avg_amount.toFixed(2).padStart(10)} avg  (${p.payment_count} payments, ${p.discovery_confidence}% conf)`);
      }
    }

    if (annual.length > 0) {
      console.log('\n📅 ANNUAL SUBSCRIPTIONS:');
      console.log('─'.repeat(80));
      for (const p of annual) {
        const knownFlag = p.known_vendor ? '✓' : '?';
        console.log(`  ${knownFlag} ${p.vendor_name.padEnd(25)} $${p.avg_amount.toFixed(2).padStart(10)} avg  (${p.payment_count} payments, ${p.discovery_confidence}% conf)`);
      }
    }

    if (unknown.length > 0) {
      console.log('\n❓ UNKNOWN CYCLE (needs review):');
      console.log('─'.repeat(80));
      for (const p of unknown.slice(0, 10)) {
        console.log(`  ${p.vendor_name.padEnd(25)} $${p.avg_amount.toFixed(2).padStart(10)} avg  ~${p.avg_interval_days} days interval  (${p.payment_count} payments)`);
      }
      if (unknown.length > 10) {
        console.log(`  ... and ${unknown.length - 10} more`);
      }
    }

    // Check for price changes
    console.log('\n\n💰 PRICE CHANGE DETECTION:');
    console.log('─'.repeat(80));
    const priceChanges = await detectPriceChanges(daysBack);

    if (priceChanges.length === 0) {
      console.log('  No price changes detected (vs expected amounts from config)');
    } else {
      for (const pc of priceChanges) {
        const arrow = pc.direction === 'increased' ? '📈' : '📉';
        console.log(`  ${arrow} ${pc.vendor_name.padEnd(25)} $${pc.expected_amount.toFixed(2)} → $${pc.actual_amount.toFixed(2)} (${pc.variance_pct}% ${pc.direction})`);
      }
    }

    console.log('\n✅ Done\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
