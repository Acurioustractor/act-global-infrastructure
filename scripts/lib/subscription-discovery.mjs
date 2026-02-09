#!/usr/bin/env node
/**
 * Subscription Discovery Service
 *
 * Unified discovery orchestrator that:
 * 1. Pulls from Xero RepeatingInvoices API
 * 2. Detects patterns in bank transactions
 * 3. Scans email receipts (via existing scan-all-subscriptions)
 * 4. Reconciles all sources
 * 5. Detects: NEW, PRICE_CHANGE, CANCELLED
 *
 * Usage:
 *   import { runDiscovery } from './lib/subscription-discovery.mjs';
 *   const results = await runDiscovery({ sources: ['xero_repeating', 'transactions'] });
 *
 * CLI:
 *   node scripts/lib/subscription-discovery.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

import { getXeroSubscriptionCandidates } from './xero-repeating-invoices.mjs';
import { getTransactionSubscriptionCandidates, detectPriceChanges } from './transaction-pattern-detector.mjs';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env.local') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Confidence thresholds
const CONFIDENCE = {
  XERO_REPEATING: 95,
  TRANSACTION_HIGH: 85,    // 6+ payments, <5% variance
  TRANSACTION_MEDIUM: 70,  // 3+ payments
  EMAIL_HIGH: 80,          // 6+ receipts
  EMAIL_MEDIUM: 70,        // 3+ receipts
  MULTIPLE_SOURCES: 10,    // Bonus for multiple source agreement
  DEXT_MATCH: 10,          // Bonus for Dext supplier rule match
};

// ============================================================================
// EXISTING SUBSCRIPTION MATCHING
// ============================================================================

/**
 * Load existing subscriptions from database
 */
async function loadExistingSubscriptions() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .in('account_status', ['active', 'paused', 'trial', 'pending_migration']);

  if (error) {
    console.warn('Failed to load existing subscriptions:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Match candidate to existing subscription
 */
function matchToExisting(candidate, existingSubscriptions) {
  const candidateName = candidate.vendor_name.toUpperCase();

  for (const sub of existingSubscriptions) {
    const subName = (sub.vendor_name || '').toUpperCase();

    // Exact match
    if (subName === candidateName) {
      return sub;
    }

    // Partial match
    if (subName.includes(candidateName) || candidateName.includes(subName)) {
      return sub;
    }
  }

  return null;
}

// ============================================================================
// RECONCILIATION
// ============================================================================

/**
 * Merge candidates from multiple sources
 */
function reconcileCandidates(xeroCandidate, transactionCandidates, emailCandidates = []) {
  const merged = new Map();

  // Add Xero candidates (highest confidence)
  for (const c of xeroCandidate) {
    const key = c.vendor_name.toUpperCase();
    merged.set(key, {
      ...c,
      sources: ['xero_repeating'],
      discovery_source: ['xero_repeating']
    });
  }

  // Merge transaction candidates
  for (const c of transactionCandidates) {
    const key = c.vendor_name.toUpperCase();

    if (merged.has(key)) {
      // Already have from Xero - merge evidence and boost confidence
      const existing = merged.get(key);
      existing.sources.push('transaction');
      existing.discovery_source.push('transaction');
      existing.evidence = [...(existing.evidence || []), ...(c.evidence || [])];
      existing.discovery_confidence = Math.min(
        existing.discovery_confidence + CONFIDENCE.MULTIPLE_SOURCES,
        100
      );
      // Use transaction amount if Xero doesn't have one
      if (!existing.detected_amount && c.detected_amount) {
        existing.detected_amount = c.detected_amount;
      }
    } else {
      merged.set(key, {
        ...c,
        sources: ['transaction'],
        discovery_source: ['transaction']
      });
    }
  }

  // Merge email candidates
  for (const c of emailCandidates) {
    const key = c.vendor_name.toUpperCase();

    if (merged.has(key)) {
      const existing = merged.get(key);
      existing.sources.push('email');
      existing.discovery_source.push('email');
      existing.evidence = [...(existing.evidence || []), ...(c.evidence || [])];
      existing.discovery_confidence = Math.min(
        existing.discovery_confidence + CONFIDENCE.MULTIPLE_SOURCES,
        100
      );
    } else {
      merged.set(key, {
        ...c,
        sources: ['email'],
        discovery_source: ['email']
      });
    }
  }

  return Array.from(merged.values());
}

/**
 * Classify candidates into categories
 */
function classifyCandidates(candidates, existingSubscriptions) {
  const results = {
    new_subscriptions: [],
    matched_existing: [],
    price_changes: [],
    possibly_cancelled: []
  };

  for (const candidate of candidates) {
    const existingMatch = matchToExisting(candidate, existingSubscriptions);

    if (existingMatch) {
      // Check for price change
      const expectedAmount = existingMatch.expected_amount || existingMatch.amount;
      if (expectedAmount && candidate.detected_amount) {
        const variance = Math.abs(candidate.detected_amount - expectedAmount) / expectedAmount;
        if (variance > 0.05) {
          results.price_changes.push({
            subscription: existingMatch,
            candidate,
            previous_amount: expectedAmount,
            new_amount: candidate.detected_amount,
            variance_pct: Math.round(variance * 10000) / 100
          });
        }
      }

      results.matched_existing.push({
        subscription: existingMatch,
        candidate,
        match_type: 'vendor_name'
      });
    } else {
      results.new_subscriptions.push(candidate);
    }
  }

  return results;
}

// ============================================================================
// CANCELLATION DETECTION
// ============================================================================

/**
 * Detect possibly cancelled subscriptions
 */
async function detectCancellations(existingSubscriptions, transactionCandidates, daysBack) {
  const cancelled = [];

  for (const sub of existingSubscriptions) {
    // Skip non-active
    if (sub.account_status !== 'active') continue;

    // Skip annual subscriptions for short lookback periods
    if (sub.billing_cycle === 'annual' && daysBack < 400) continue;

    // Check if we found this vendor in recent transactions
    const found = transactionCandidates.some(c =>
      c.vendor_name.toUpperCase() === (sub.vendor_name || '').toUpperCase()
    );

    if (!found && sub.last_payment_date) {
      const lastPayment = new Date(sub.last_payment_date);
      const daysSince = (Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24);

      // Expected payment window based on billing cycle
      const expectedDays = {
        'monthly': 35,
        'quarterly': 100,
        'annual': 380
      }[sub.billing_cycle] || 35;

      if (daysSince > expectedDays * 2) {
        cancelled.push({
          subscription: sub,
          last_payment_date: sub.last_payment_date,
          days_since_payment: Math.round(daysSince),
          expected_cycle_days: expectedDays,
          missed_payments: Math.floor(daysSince / expectedDays)
        });
      }
    }
  }

  return cancelled;
}

// ============================================================================
// DATABASE UPDATES
// ============================================================================

/**
 * Log discovery event
 */
async function logDiscoveryEvent(event) {
  if (!supabase) return;

  try {
    await supabase
      .from('subscription_discovery_events')
      .insert({
        subscription_id: event.subscription_id,
        event_type: event.event_type,
        source: event.source,
        confidence: event.confidence,
        details: event.details,
        previous_amount: event.previous_amount,
        new_amount: event.new_amount,
        vendor_name: event.vendor_name
      });
  } catch (e) {
    console.warn('Failed to log discovery event:', e.message);
  }
}

/**
 * Create or update pending subscription
 */
async function upsertPendingSubscription(candidate) {
  if (!supabase) return null;

  try {
    // Check for existing pending with same vendor
    const { data: existing } = await supabase
      .from('pending_subscriptions')
      .select('id, payment_count')
      .eq('vendor_name', candidate.vendor_name)
      .eq('status', 'pending')
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('pending_subscriptions')
        .update({
          detected_amount: candidate.detected_amount,
          detected_cycle: candidate.detected_cycle,
          discovery_confidence: candidate.discovery_confidence,
          last_seen_at: new Date().toISOString(),
          payment_count: (existing.payment_count || 0) + (candidate.payment_count || 1),
          evidence: candidate.evidence
        })
        .eq('id', existing.id)
        .select()
        .single();

      return data;
    }

    // Create new
    const { data, error } = await supabase
      .from('pending_subscriptions')
      .insert({
        vendor_name: candidate.vendor_name,
        vendor_aliases: candidate.vendor_aliases,
        detected_amount: candidate.detected_amount,
        detected_currency: candidate.detected_currency || 'AUD',
        detected_cycle: candidate.detected_cycle,
        discovery_source: candidate.discovery_source?.[0] || candidate.discovery_source,
        discovery_confidence: candidate.discovery_confidence,
        payment_count: candidate.payment_count || 1,
        avg_interval_days: candidate.avg_interval_days,
        amount_variance_pct: candidate.amount_variance_pct,
        evidence: candidate.evidence
      })
      .select()
      .single();

    if (error) throw error;
    return data;

  } catch (e) {
    console.warn('Failed to upsert pending subscription:', e.message);
    return null;
  }
}

/**
 * Update subscription with discovery data
 */
async function updateSubscriptionFromDiscovery(subscriptionId, candidate) {
  if (!supabase) return;

  try {
    await supabase
      .from('subscriptions')
      .update({
        last_discovery_check: new Date().toISOString(),
        discovery_source: candidate.sources,
        discovery_confidence: candidate.discovery_confidence,
        expected_amount: candidate.detected_amount,
        last_payment_date: candidate.last_seen_at || candidate.last_payment
      })
      .eq('id', subscriptionId);
  } catch (e) {
    console.warn('Failed to update subscription:', e.message);
  }
}

// ============================================================================
// MAIN DISCOVERY FUNCTION
// ============================================================================

/**
 * Run subscription discovery
 *
 * @param {Object} options - Discovery options
 * @param {string[]} options.sources - Sources to use: 'xero_repeating', 'transactions', 'email'
 * @param {number} options.daysBack - Number of days to analyze
 * @param {boolean} options.autoUpdate - Whether to apply updates to database
 * @returns {Promise<Object>} Discovery results
 */
export async function runDiscovery(options = {}) {
  const {
    sources = ['xero_repeating', 'transactions'],
    daysBack = 180,
    autoUpdate = false
  } = options;

  const results = {
    success: true,
    timestamp: new Date().toISOString(),
    sources_used: sources,
    days_analyzed: daysBack,

    // Counts
    discovered: 0,
    matched: 0,

    // Details
    new_subscriptions: [],
    matched_existing: [],
    price_changes: [],
    possibly_cancelled: [],

    // Raw data
    xero_candidates: [],
    transaction_candidates: [],
    email_candidates: []
  };

  try {
    // Gather candidates from each source
    if (sources.includes('xero_repeating')) {
      try {
        results.xero_candidates = await getXeroSubscriptionCandidates();
      } catch (e) {
        console.warn('Xero repeating invoices fetch failed:', e.message);
        results.xero_candidates = [];
      }
    }

    if (sources.includes('transactions')) {
      try {
        results.transaction_candidates = await getTransactionSubscriptionCandidates(daysBack);
      } catch (e) {
        console.warn('Transaction pattern detection failed:', e.message);
        results.transaction_candidates = [];
      }
    }

    // Email scanning would call existing scan-all-subscriptions.mjs
    // For now, just pass empty array
    if (sources.includes('email')) {
      // TODO: Integrate with scan-all-subscriptions.mjs
      results.email_candidates = [];
    }

    // Load existing subscriptions
    const existingSubscriptions = await loadExistingSubscriptions();

    // Reconcile all candidates
    const allCandidates = reconcileCandidates(
      results.xero_candidates,
      results.transaction_candidates,
      results.email_candidates
    );

    // Classify candidates
    const classified = classifyCandidates(allCandidates, existingSubscriptions);
    results.new_subscriptions = classified.new_subscriptions;
    results.matched_existing = classified.matched_existing;
    results.price_changes = classified.price_changes;

    // Detect cancellations
    results.possibly_cancelled = await detectCancellations(
      existingSubscriptions,
      results.transaction_candidates,
      daysBack
    );

    // Update counts
    results.discovered = results.new_subscriptions.length;
    results.matched = results.matched_existing.length;

    // Apply updates if requested
    if (autoUpdate) {
      // Create pending subscriptions for new discoveries
      for (const candidate of results.new_subscriptions) {
        const pending = await upsertPendingSubscription(candidate);

        // Log discovery event
        await logDiscoveryEvent({
          event_type: 'discovered',
          source: candidate.discovery_source?.[0] || 'transaction',
          confidence: candidate.discovery_confidence,
          vendor_name: candidate.vendor_name,
          details: {
            amount: candidate.detected_amount,
            cycle: candidate.detected_cycle,
            sources: candidate.sources
          }
        });
      }

      // Update matched subscriptions
      for (const match of results.matched_existing) {
        await updateSubscriptionFromDiscovery(
          match.subscription.id,
          match.candidate
        );
      }

      // Log price changes
      for (const pc of results.price_changes) {
        await logDiscoveryEvent({
          subscription_id: pc.subscription.id,
          event_type: 'price_change',
          source: pc.candidate.discovery_source?.[0] || 'transaction',
          confidence: pc.candidate.discovery_confidence,
          vendor_name: pc.subscription.provider || pc.subscription.name,
          previous_amount: pc.previous_amount,
          new_amount: pc.new_amount,
          details: { variance_pct: pc.variance_pct }
        });
      }

      // Update missed payments for possibly cancelled
      for (const cancelled of results.possibly_cancelled) {
        await supabase
          .from('subscriptions')
          .update({
            consecutive_missed_payments: cancelled.missed_payments,
            last_discovery_check: new Date().toISOString()
          })
          .eq('id', cancelled.subscription.id);

        await logDiscoveryEvent({
          subscription_id: cancelled.subscription.id,
          event_type: cancelled.missed_payments >= 2 ? 'cancelled' : 'missed_payment',
          source: 'reconciliation',
          vendor_name: cancelled.subscription.provider || cancelled.subscription.name,
          details: {
            days_since_payment: cancelled.days_since_payment,
            missed_payments: cancelled.missed_payments
          }
        });
      }
    }

    return results;

  } catch (error) {
    results.success = false;
    results.error = error.message;
    return results;
  }
}

/**
 * Get discovery summary and alerts
 */
export async function getDiscoveryStatus() {
  if (!supabase) {
    return { error: 'Supabase not configured' };
  }

  try {
    // Get pending subscriptions
    const { data: pending } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .order('discovery_confidence', { ascending: false });

    // Get subscription alerts
    const { data: alerts } = await supabase
      .from('v_subscription_alerts')
      .select('*')
      .neq('alert_status', 'ok');

    // Get recent discovery events
    const { data: events } = await supabase
      .from('subscription_discovery_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get summary stats
    const { data: summary } = await supabase
      .from('v_discovery_summary')
      .select('*');

    return {
      pending_count: pending?.length || 0,
      pending_subscriptions: pending || [],
      alerts_count: alerts?.length || 0,
      subscription_alerts: alerts || [],
      recent_events: events || [],
      summary: summary || []
    };

  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Subscription Discovery Service');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const sourcesArg = process.argv.find(a => a.startsWith('--sources='));
  const daysArg = process.argv.find(a => a.startsWith('--days='));
  const autoUpdate = process.argv.includes('--update');

  const sources = sourcesArg
    ? sourcesArg.split('=')[1].split(',')
    : ['xero_repeating', 'transactions'];
  const daysBack = daysArg ? parseInt(daysArg.split('=')[1]) : 180;

  console.log(`Sources: ${sources.join(', ')}`);
  console.log(`Days: ${daysBack}`);
  console.log(`Auto-update: ${autoUpdate ? 'YES' : 'NO (report only)'}`);
  console.log('');

  try {
    const results = await runDiscovery({ sources, daysBack, autoUpdate });

    if (!results.success) {
      console.error('Discovery failed:', results.error);
      process.exit(1);
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Discovery Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`  Xero RepeatingInvoices: ${results.xero_candidates.length} candidates`);
    console.log(`  Transaction patterns:   ${results.transaction_candidates.length} candidates`);
    console.log('');
    console.log(`  New subscriptions:      ${results.new_subscriptions.length}`);
    console.log(`  Matched existing:       ${results.matched_existing.length}`);
    console.log(`  Price changes:          ${results.price_changes.length}`);
    console.log(`  Possibly cancelled:     ${results.possibly_cancelled.length}`);

    // New subscriptions
    if (results.new_subscriptions.length > 0) {
      console.log('\n\n🆕 NEW SUBSCRIPTIONS DISCOVERED:');
      console.log('─'.repeat(70));
      for (const sub of results.new_subscriptions) {
        console.log(`  ${sub.vendor_name.padEnd(30)} $${(sub.detected_amount || 0).toFixed(2).padStart(10)} ${(sub.detected_cycle || 'unknown').padEnd(10)} (${sub.discovery_confidence}% conf)`);
        console.log(`     Sources: ${sub.sources.join(', ')}`);
      }
    }

    // Price changes
    if (results.price_changes.length > 0) {
      console.log('\n\n💰 PRICE CHANGES DETECTED:');
      console.log('─'.repeat(70));
      for (const pc of results.price_changes) {
        const arrow = pc.new_amount > pc.previous_amount ? '📈' : '📉';
        console.log(`  ${arrow} ${(pc.subscription.provider || pc.subscription.name).padEnd(30)} $${pc.previous_amount.toFixed(2)} → $${pc.new_amount.toFixed(2)} (${pc.variance_pct}%)`);
      }
    }

    // Possibly cancelled
    if (results.possibly_cancelled.length > 0) {
      console.log('\n\n⚠️  POSSIBLY CANCELLED:');
      console.log('─'.repeat(70));
      for (const c of results.possibly_cancelled) {
        console.log(`  ${(c.subscription.provider || c.subscription.name).padEnd(30)} Last payment: ${c.last_payment_date} (${c.days_since_payment} days ago, ${c.missed_payments} missed)`);
      }
    }

    if (autoUpdate) {
      console.log('\n\n✅ Database updated with discovery results');
    } else {
      console.log('\n\n💡 Run with --update to apply changes to database');
    }

    console.log('');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
