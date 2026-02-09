#!/usr/bin/env node
/**
 * Subscription Discovery CLI
 *
 * Automated discovery of subscriptions from Xero, bank transactions, and email.
 *
 * Usage:
 *   node scripts/discover-subscriptions.mjs                        # Full scan, report only
 *   node scripts/discover-subscriptions.mjs --sources=xero         # Only Xero RepeatingInvoices
 *   node scripts/discover-subscriptions.mjs --sources=transactions # Only transaction patterns
 *   node scripts/discover-subscriptions.mjs --update               # Scan and apply updates
 *   node scripts/discover-subscriptions.mjs --days=365             # Look back 1 year
 *   node scripts/discover-subscriptions.mjs --status               # Show current discovery status
 *
 * Examples:
 *   # Quick check of Xero scheduled invoices
 *   node scripts/discover-subscriptions.mjs --sources=xero
 *
 *   # Full discovery from all sources
 *   node scripts/discover-subscriptions.mjs --sources=xero,transactions --days=180
 *
 *   # Update database with discoveries
 *   node scripts/discover-subscriptions.mjs --update
 */

import { runDiscovery, getDiscoveryStatus } from './lib/subscription-discovery.mjs';

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);

  const options = {
    sources: ['xero_repeating', 'transactions'],
    daysBack: 180,
    autoUpdate: false,
    showStatus: false,
    help: false
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--update' || arg === '-u') {
      options.autoUpdate = true;
    } else if (arg === '--status' || arg === '-s') {
      options.showStatus = true;
    } else if (arg.startsWith('--sources=')) {
      const sourcesStr = arg.split('=')[1];
      options.sources = sourcesStr.split(',').map(s => {
        // Map short names to full names
        const mapping = {
          'xero': 'xero_repeating',
          'xero_repeating': 'xero_repeating',
          'transactions': 'transactions',
          'txn': 'transactions',
          'email': 'email'
        };
        return mapping[s.toLowerCase()] || s;
      });
    } else if (arg.startsWith('--days=')) {
      options.daysBack = parseInt(arg.split('=')[1]) || 180;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Subscription Discovery CLI

Automated discovery of subscriptions from multiple sources.

USAGE:
  node scripts/discover-subscriptions.mjs [options]

OPTIONS:
  --sources=SOURCES   Comma-separated list of sources to check:
                      - xero, xero_repeating: Xero RepeatingInvoices API
                      - transactions, txn: Bank transaction patterns
                      - email: Email receipt scanning (not yet implemented)
                      Default: xero_repeating,transactions

  --days=N            Number of days to analyze (default: 180)

  --update, -u        Apply discovered changes to database
                      Without this flag, runs in report-only mode

  --status, -s        Show current discovery status and alerts

  --help, -h          Show this help message

EXAMPLES:
  # Quick check - Xero scheduled invoices only
  node scripts/discover-subscriptions.mjs --sources=xero

  # Full scan with transaction pattern detection
  node scripts/discover-subscriptions.mjs --sources=xero,transactions --days=180

  # Scan and update database
  node scripts/discover-subscriptions.mjs --update

  # Check for annual subscriptions (1 year lookback)
  node scripts/discover-subscriptions.mjs --days=365

  # View current status and alerts
  node scripts/discover-subscriptions.mjs --status

OUTPUT:
  - New subscriptions discovered (pending confirmation)
  - Price changes detected (>5% variance)
  - Possibly cancelled (2+ missed payments)
  - Matched existing (already tracked)

CONFIDENCE SCORING:
  95%  - Xero RepeatingInvoice (scheduled)
  85%  - Transaction pattern (6+ payments, <5% variance)
  70%  - Transaction pattern (3+ payments)
  +10% - Multiple sources agree
  +10% - Matches Dext supplier rule
`);
}

// ============================================================================
// STATUS DISPLAY
// ============================================================================

async function showStatus() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Subscription Discovery Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const status = await getDiscoveryStatus();

  if (status.error) {
    console.error('Error:', status.error);
    return;
  }

  // Pending subscriptions
  console.log(`📋 PENDING SUBSCRIPTIONS: ${status.pending_count}`);
  if (status.pending_subscriptions.length > 0) {
    console.log('─'.repeat(70));
    for (const p of status.pending_subscriptions.slice(0, 10)) {
      console.log(`  ${p.vendor_name.padEnd(30)} $${(p.detected_amount || 0).toFixed(2).padStart(10)} ${(p.detected_cycle || '?').padEnd(10)} (${p.discovery_confidence}% conf, ${p.payment_count} payments)`);
    }
    if (status.pending_count > 10) {
      console.log(`  ... and ${status.pending_count - 10} more`);
    }
  }

  // Alerts
  console.log(`\n⚠️  SUBSCRIPTION ALERTS: ${status.alerts_count}`);
  if (status.subscription_alerts.length > 0) {
    console.log('─'.repeat(70));
    for (const a of status.subscription_alerts) {
      const icon = a.alert_status === 'possibly_cancelled' ? '❌' :
                   a.alert_status === 'price_change' ? '💰' :
                   a.alert_status === 'overdue_renewal' ? '📅' : '⚠️';
      console.log(`  ${icon} ${(a.provider || a.name).padEnd(30)} ${a.alert_status.padEnd(20)} (${a.alert_priority} priority)`);
    }
  }

  // Recent events
  if (status.recent_events.length > 0) {
    console.log('\n📜 RECENT DISCOVERY EVENTS:');
    console.log('─'.repeat(70));
    for (const e of status.recent_events.slice(0, 10)) {
      const date = new Date(e.created_at).toISOString().split('T')[0];
      console.log(`  ${date}  ${e.event_type.padEnd(15)} ${(e.vendor_name || '').padEnd(25)} (${e.source})`);
    }
  }

  // Summary
  if (status.summary.length > 0) {
    console.log('\n📊 LAST 30 DAYS SUMMARY:');
    console.log('─'.repeat(70));
    for (const s of status.summary) {
      console.log(`  ${s.source.padEnd(15)} ${s.event_type.padEnd(15)} ${String(s.event_count).padStart(5)} events  (avg ${Math.round(s.avg_confidence)}% conf)`);
    }
  }

  console.log('');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  if (options.showStatus) {
    await showStatus();
    return;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Subscription Discovery');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Sources:     ${options.sources.join(', ')}`);
  console.log(`Days back:   ${options.daysBack}`);
  console.log(`Auto-update: ${options.autoUpdate ? 'YES' : 'NO (report only)'}`);
  console.log('');

  try {
    const results = await runDiscovery({
      sources: options.sources,
      daysBack: options.daysBack,
      autoUpdate: options.autoUpdate
    });

    if (!results.success) {
      console.error('❌ Discovery failed:', results.error);
      process.exit(1);
    }

    // Results summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`  From Xero RepeatingInvoices: ${results.xero_candidates.length} candidates`);
    console.log(`  From transaction patterns:   ${results.transaction_candidates.length} candidates`);
    if (options.sources.includes('email')) {
      console.log(`  From email scanning:         ${results.email_candidates.length} candidates`);
    }
    console.log('');

    // Categorized results
    const categories = [
      { label: '🆕 New subscriptions', items: results.new_subscriptions, count: results.discovered },
      { label: '✓  Matched existing', items: results.matched_existing, count: results.matched },
      { label: '💰 Price changes', items: results.price_changes },
      { label: '❌ Possibly cancelled', items: results.possibly_cancelled }
    ];

    for (const cat of categories) {
      const count = cat.count ?? cat.items.length;
      console.log(`  ${cat.label}: ${count}`);
    }

    // Details for new subscriptions
    if (results.new_subscriptions.length > 0) {
      console.log('\n\n🆕 NEW SUBSCRIPTIONS DISCOVERED:');
      console.log('─'.repeat(80));
      console.log('  ' + 'Vendor'.padEnd(30) + 'Amount'.padStart(12) + '  ' + 'Cycle'.padEnd(10) + 'Conf'.padStart(6) + '  Sources');
      console.log('─'.repeat(80));

      for (const sub of results.new_subscriptions) {
        const amount = sub.detected_amount ? `$${sub.detected_amount.toFixed(2)}` : '?';
        const cycle = sub.detected_cycle || '?';
        const conf = `${sub.discovery_confidence}%`;
        const sources = (sub.sources || []).join(', ');
        console.log(`  ${sub.vendor_name.padEnd(30)}${amount.padStart(12)}  ${cycle.padEnd(10)}${conf.padStart(6)}  ${sources}`);
      }
    }

    // Details for price changes
    if (results.price_changes.length > 0) {
      console.log('\n\n💰 PRICE CHANGES DETECTED:');
      console.log('─'.repeat(80));

      for (const pc of results.price_changes) {
        const name = pc.subscription.vendor_name || 'Unknown';
        const arrow = pc.new_amount > pc.previous_amount ? '↑' : '↓';
        console.log(`  ${name.padEnd(30)} $${pc.previous_amount.toFixed(2)} → $${pc.new_amount.toFixed(2)} (${arrow}${pc.variance_pct}%)`);
      }
    }

    // Details for possibly cancelled
    if (results.possibly_cancelled.length > 0) {
      console.log('\n\n❌ POSSIBLY CANCELLED:');
      console.log('─'.repeat(80));

      for (const c of results.possibly_cancelled) {
        const name = c.subscription.vendor_name || 'Unknown';
        console.log(`  ${name.padEnd(30)} Last: ${c.last_payment_date}  (${c.days_since_payment} days ago, ~${c.missed_payments} missed)`);
      }
    }

    // Footer
    console.log('\n');
    if (options.autoUpdate) {
      console.log('✅ Database updated with discovery results');
      console.log('   - New subscriptions added to pending_subscriptions table');
      console.log('   - Discovery events logged to subscription_discovery_events');
      console.log('   - Existing subscriptions updated with latest discovery data');
    } else {
      console.log('💡 This was a report-only run. To apply changes:');
      console.log('   node scripts/discover-subscriptions.mjs --update');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
