#!/usr/bin/env node
/**
 * Receipt Reconciliation Agent
 *
 * Smart system to identify missing receipts in Xero, match with emails,
 * and gamify the reconciliation process.
 *
 * Commands:
 *   scan              - Detect missing receipts and find email matches
 *   pending           - Show pending receipts needing attention
 *   resolve <id>      - Mark receipt as resolved (awards points)
 *   no-receipt <id>   - Mark as no receipt needed
 *   defer <id>        - Defer to next week
 *   tag <id> <code>   - Set project code
 *   stats             - Show gamification stats
 *   weekly-summary    - Generate and send weekly report
 *
 * Usage:
 *   node scripts/receipt-reconciliation-agent.mjs scan
 *   node scripts/receipt-reconciliation-agent.mjs pending
 *   node scripts/receipt-reconciliation-agent.mjs resolve abc123
 *   node scripts/receipt-reconciliation-agent.mjs stats
 *
 * Environment Variables:
 *   SUPABASE_SHARED_SERVICE_ROLE_KEY - Supabase service role key
 *   DISCORD_WEBHOOK_ENRICHMENT       - Discord webhook for notifications
 *
 * Created: 2026-01-24
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Import modules
import {
  detectMissingReceipts,
  saveMissingReceipts,
  getPendingReceipts,
  getReconciliationStats,
  categorizeVendor,
  getWeekStart
} from './lib/receipt-detector.mjs';

import {
  findEmailMatches,
  suggestEmailMatch
} from './lib/receipt-matcher.mjs';

import {
  scoreMatchWithAI,
  enhanceAllSuggestedMatches
} from './lib/receipt-ai-scorer.mjs';

import {
  POINTS,
  getStats,
  awardPoints,
  recordPerfectWeek,
  formatStatsForDisplay,
  generateStatsSummary
} from './lib/receipt-gamification.mjs';

import {
  sendWeeklySummary,
  sendAchievementNotification,
  sendStreakNotification,
  sendScanResultsNotification,
  sendResolutionNotification
} from './lib/receipt-notifications.mjs';

// Supabase client
const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: FIND RECEIPT BY ID (supports full UUID or 8-char prefix)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function findReceiptById(receiptId) {
  // Try exact match first (full UUID)
  if (receiptId.length === 36) {
    const exact = await supabase
      .from('receipt_matches')
      .select('*')
      .eq('id', receiptId)
      .maybeSingle();

    return { data: exact.data, error: exact.error };
  }

  // For short IDs (8+ chars), fetch recent receipts and filter client-side
  if (receiptId.length >= 8) {
    const { data: receipts, error } = await supabase
      .from('receipt_matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return { data: null, error };

    const match = receipts?.find(r => r.id.startsWith(receiptId));
    return { data: match || null, error: null };
  }

  return { data: null, error: { message: 'ID too short (need at least 8 characters)' } };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND: SCAN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function cmdScan(options = {}) {
  console.log('\n🔍 Scanning for missing receipts...\n');

  const { daysBack = 90, skipAI = false, notify = false } = options;

  // Step 1: Detect missing receipts
  console.log(`Step 1: Detecting missing receipts (last ${daysBack} days)...`);
  const detected = await detectMissingReceipts({ daysBack });
  const allItems = [...detected.transactions, ...detected.invoices];

  console.log(`   Found ${allItems.length} missing receipts`);
  console.log(`   Total: $${detected.summary.totalAmount.toFixed(2)}\n`);

  if (allItems.length === 0) {
    console.log('✨ No missing receipts detected!');
    if (notify) {
      await sendScanResultsNotification({ detected: 0, matched: 0, saved: 0 });
    }
    return { detected: 0, matched: 0, saved: 0 };
  }

  // Step 2: Save to database
  console.log('Step 2: Saving to database...');
  const saveResult = await saveMissingReceipts(allItems);
  console.log(`   Inserted: ${saveResult.inserted}, Skipped: ${saveResult.skipped}\n`);

  // Step 3: Find email matches
  console.log('Step 3: Finding email matches...');
  const pending = await getPendingReceipts({ statuses: ['pending'], limit: 50 });

  let matched = 0;
  for (const receipt of pending) {
    process.stdout.write('.');

    const matches = await findEmailMatches(receipt, { minScore: 30 });

    if (matches.length > 0 && matches[0].totalScore >= 40) {
      await suggestEmailMatch(receipt.id, matches[0]);
      matched++;
    }
  }
  console.log(`\n   Email matches suggested: ${matched}\n`);

  // Step 4: AI enhancement (optional)
  if (!skipAI && matched > 0) {
    console.log('Step 4: Enhancing matches with AI...');
    const aiResult = await enhanceAllSuggestedMatches({ limit: 20 });
    console.log(`   Enhanced: ${aiResult.enhanced}\n`);
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Scan Complete');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Detected: ${allItems.length} missing receipts`);
  console.log(`  Saved: ${saveResult.inserted} new items`);
  console.log(`  Email matches: ${matched}`);
  console.log('');
  console.log('  Run `receipt-reconciliation-agent pending` to review.');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (notify) {
    await sendScanResultsNotification({
      detected: allItems.length,
      matched,
      saved: saveResult.inserted
    });
  }

  return {
    detected: allItems.length,
    matched,
    saved: saveResult.inserted
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND: PENDING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function cmdPending(options = {}) {
  const { category, limit = 20 } = options;

  console.log('\n📋 Pending Receipts\n');

  const pending = await getPendingReceipts({ category, limit });

  if (pending.length === 0) {
    console.log('✨ No pending receipts! Great job!\n');
    return;
  }

  // Group by status
  const byStatus = {
    email_suggested: pending.filter(p => p.status === 'email_suggested'),
    pending: pending.filter(p => p.status === 'pending'),
    deferred: pending.filter(p => p.status === 'deferred')
  };

  // Show email suggestions first (high confidence)
  if (byStatus.email_suggested.length > 0) {
    console.log('📧 Email Matches Found:\n');

    for (const item of byStatus.email_suggested) {
      const emoji = item.category === 'travel' ? '✈️' : item.category === 'subscription' ? '💻' : '📦';
      const confidence = item.match_confidence || 0;
      const confidenceBar = '█'.repeat(Math.floor(confidence / 10)) + '░'.repeat(10 - Math.floor(confidence / 10));

      console.log(`${emoji} ${item.vendor_name || 'Unknown'}`);
      console.log(`   ID: ${item.id.substring(0, 8)}...`);
      console.log(`   Amount: $${item.amount} | Date: ${item.transaction_date}`);
      console.log(`   Confidence: [${confidenceBar}] ${confidence}%`);

      if (item.suggested_email_subject) {
        console.log(`   📧 "${item.suggested_email_subject.substring(0, 50)}..."`);
      }
      console.log('');
    }
  }

  // Show pending (no match yet)
  if (byStatus.pending.length > 0) {
    console.log('⏳ Awaiting Match:\n');

    for (const item of byStatus.pending.slice(0, 10)) {
      const emoji = item.category === 'travel' ? '✈️' : item.category === 'subscription' ? '💻' : '📦';
      const daysOld = Math.floor((Date.now() - new Date(item.transaction_date)) / (1000 * 60 * 60 * 24));

      console.log(`${emoji} ${item.vendor_name || 'Unknown'} - $${item.amount}`);
      console.log(`   ID: ${item.id.substring(0, 8)}... | ${item.transaction_date} (${daysOld}d ago)`);
      console.log('');
    }

    if (byStatus.pending.length > 10) {
      console.log(`   ... and ${byStatus.pending.length - 10} more\n`);
    }
  }

  // Show deferred
  if (byStatus.deferred.length > 0) {
    console.log(`⏸️  Deferred: ${byStatus.deferred.length} items\n`);
  }

  // Summary
  console.log('─────────────────────────────────────────');
  console.log(`Total: ${pending.length} pending receipts`);

  const totalAmount = pending.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  console.log(`Value: $${totalAmount.toFixed(2)}`);
  console.log('');
  console.log('Commands:');
  console.log('  resolve <id>     - Mark as resolved (+points)');
  console.log('  no-receipt <id>  - Mark as no receipt needed');
  console.log('  defer <id>       - Defer to next week');
  console.log('');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND: RESOLVE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function cmdResolve(receiptId, options = {}) {
  if (!receiptId) {
    console.error('Error: Receipt ID required');
    console.log('Usage: receipt-reconciliation-agent resolve <id>');
    return;
  }

  const { data: receipt, error } = await findReceiptById(receiptId);

  if (error || !receipt) {
    console.error(`Receipt not found: ${receiptId}`);
    return;
  }

  // Calculate if this is a quick resolve (within 7 days)
  const txnDate = new Date(receipt.transaction_date);
  const daysSince = Math.floor((Date.now() - txnDate) / (1000 * 60 * 60 * 24));
  const isQuickResolve = daysSince <= 7;

  // Update receipt status
  await supabase
    .from('receipt_matches')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: 'manual',
      quick_resolve: isQuickResolve,
      updated_at: new Date().toISOString()
    })
    .eq('id', receipt.id);

  // Log history
  await supabase.from('receipt_match_history').insert({
    receipt_match_id: receipt.id,
    action: 'resolved',
    previous_status: receipt.status,
    new_status: 'resolved',
    triggered_by: 'cli'
  });

  // Award points
  const action = isQuickResolve ? 'QUICK_RESOLVE' : 'BACKLOG_CLEAR';
  const result = await awardPoints(action, { receiptId: receipt.id });

  console.log('\n✅ Receipt Resolved!\n');
  console.log(`   Vendor: ${receipt.vendor_name}`);
  console.log(`   Amount: $${receipt.amount}`);
  console.log(`   Points: +${result.pointsAwarded} (${action.replace('_', ' ').toLowerCase()})`);
  console.log(`   Total: ${result.newTotal} points\n`);

  // Check for new achievements
  if (result.newAchievements && result.newAchievements.length > 0) {
    console.log('🎉 Achievement Unlocked!\n');
    for (const ach of result.newAchievements) {
      console.log(`   ${ach.icon} ${ach.name}`);
      console.log(`   ${ach.description}\n`);

      // Send notification
      const stats = await getStats();
      await sendAchievementNotification(ach, stats);
    }
  }

  // Send resolution notification if enabled
  if (options.notify) {
    await sendResolutionNotification(receipt, {
      pointsAwarded: result.pointsAwarded,
      quickResolve: isQuickResolve
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND: NO-RECEIPT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function cmdNoReceipt(receiptId) {
  if (!receiptId) {
    console.error('Error: Receipt ID required');
    return;
  }

  const { data: receipt, error } = await findReceiptById(receiptId);

  if (error || !receipt) {
    console.error(`Receipt not found: ${receiptId}`);
    return;
  }

  await supabase
    .from('receipt_matches')
    .update({
      status: 'no_receipt_needed',
      resolved_at: new Date().toISOString(),
      resolved_by: 'no_receipt',
      updated_at: new Date().toISOString()
    })
    .eq('id', receipt.id);

  await supabase.from('receipt_match_history').insert({
    receipt_match_id: receipt.id,
    action: 'no_receipt_marked',
    previous_status: receipt.status,
    new_status: 'no_receipt_needed',
    triggered_by: 'cli'
  });

  const result = await awardPoints('NO_RECEIPT_NEEDED', { receiptId: receipt.id });

  console.log('\n✅ Marked as No Receipt Needed\n');
  console.log(`   Vendor: ${receipt.vendor_name}`);
  console.log(`   Points: +${result.pointsAwarded}\n`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND: DEFER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function cmdDefer(receiptId) {
  if (!receiptId) {
    console.error('Error: Receipt ID required');
    return;
  }

  const { data: receipt, error } = await findReceiptById(receiptId);

  if (error || !receipt) {
    console.error(`Receipt not found: ${receiptId}`);
    return;
  }

  await supabase
    .from('receipt_matches')
    .update({
      status: 'deferred',
      deferred_count: (receipt.deferred_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', receipt.id);

  await supabase.from('receipt_match_history').insert({
    receipt_match_id: receipt.id,
    action: 'deferred',
    previous_status: receipt.status,
    new_status: 'deferred',
    triggered_by: 'cli'
  });

  console.log('\n⏸️  Deferred to Next Week\n');
  console.log(`   Vendor: ${receipt.vendor_name}`);
  console.log(`   Times deferred: ${(receipt.deferred_count || 0) + 1}\n`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND: TAG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function cmdTag(receiptId, projectCode) {
  if (!receiptId || !projectCode) {
    console.error('Error: Receipt ID and project code required');
    console.log('Usage: receipt-reconciliation-agent tag <id> <project-code>');
    return;
  }

  const { data: receipt, error } = await findReceiptById(receiptId);

  if (error || !receipt) {
    console.error(`Receipt not found: ${receiptId}`);
    return;
  }

  // Update the source transaction/invoice with project code
  if (receipt.source_type === 'transaction') {
    await supabase
      .from('xero_transactions')
      .update({ project_code: projectCode })
      .eq('xero_transaction_id', receipt.source_id);
  } else {
    await supabase
      .from('xero_invoices')
      .update({ project_code: projectCode })
      .eq('xero_invoice_id', receipt.source_id);
  }

  const result = await awardPoints('PROJECT_TAG');

  console.log('\n🏷️  Project Code Added\n');
  console.log(`   Vendor: ${receipt.vendor_name}`);
  console.log(`   Project: ${projectCode}`);
  console.log(`   Points: +${result.pointsAwarded}\n`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND: STATS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function cmdStats() {
  console.log('\n');

  const stats = await getStats();
  console.log(generateStatsSummary(stats));

  // Also show reconciliation stats
  const reconcStats = await getReconciliationStats();

  console.log('\n📊 Reconciliation Status');
  console.log('─────────────────────');
  console.log(`Pending: ${reconcStats.pendingCount} receipts`);
  console.log(`Value: $${reconcStats.pendingAmount.toFixed(2)}`);

  if (reconcStats.byCategory) {
    console.log('\nBy Category:');
    for (const [cat, data] of Object.entries(reconcStats.byCategory)) {
      const emoji = cat === 'travel' ? '✈️' : cat === 'subscription' ? '💻' : '📦';
      console.log(`  ${emoji} ${cat}: ${data.count} ($${data.amount.toFixed(2)})`);
    }
  }

  console.log('');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND: WEEKLY-SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function cmdWeeklySummary(options = {}) {
  console.log('\n📋 Generating Weekly Summary...\n');

  // Check for perfect week
  const reconcStats = await getReconciliationStats();

  // Get week stats
  const weekStart = getWeekStart().toISOString().split('T')[0];
  const weekStats = {
    total_pending: reconcStats.pendingCount,
    resolved_count: reconcStats.byStatus?.resolved?.count || 0,
    no_receipt_count: reconcStats.byStatus?.no_receipt_needed?.count || 0,
    total_amount_pending: reconcStats.pendingAmount,
    travel_count: reconcStats.byCategory?.travel?.count || 0,
    subscription_count: reconcStats.byCategory?.subscription?.count || 0,
    other_count: reconcStats.byCategory?.other?.count || 0
  };

  // Check if perfect week (all resolved)
  if (reconcStats.pendingCount === 0) {
    console.log('🎉 Perfect Week! All receipts resolved!\n');

    const streakResult = await recordPerfectWeek(weekStart, weekStats);

    console.log(`   Streak: ${streakResult.newStreak} weeks`);
    console.log(`   Bonus Points: +${streakResult.bonusPoints}`);

    if (streakResult.newAchievements.length > 0) {
      console.log('\n   🏆 New Achievements:');
      streakResult.newAchievements.forEach(a => {
        console.log(`      ${a.icon} ${a.name}`);
      });
    }

    // Send streak notification
    await sendStreakNotification(streakResult);

  } else {
    console.log(`⏳ ${reconcStats.pendingCount} receipts still pending`);
  }

  // Send weekly summary to Discord
  if (!options.skipNotify) {
    console.log('\nSending Discord notification...');
    const sent = await sendWeeklySummary();
    if (sent) {
      console.log('✅ Weekly summary sent to Discord');
    } else {
      console.log('❌ Failed to send notification (check webhook config)');
    }
  }

  console.log('');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  // Parse flags
  const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
  const notify = flags.includes('--notify');
  const skipAI = flags.includes('--skip-ai');
  const skipNotify = flags.includes('--skip-notify');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Receipt Reconciliation Agent');
  console.log('═══════════════════════════════════════════════════════════════');

  if (!supabase) {
    console.error('\n❌ Error: Supabase not configured');
    console.error('Set SUPABASE_SHARED_SERVICE_ROLE_KEY in .env.local\n');
    process.exit(1);
  }

  switch (command) {
    case 'scan':
      await cmdScan({ notify, skipAI });
      break;

    case 'pending':
      await cmdPending({ category: arg1 });
      break;

    case 'resolve':
      await cmdResolve(arg1, { notify });
      break;

    case 'no-receipt':
      await cmdNoReceipt(arg1);
      break;

    case 'defer':
      await cmdDefer(arg1);
      break;

    case 'tag':
      await cmdTag(arg1, arg2);
      break;

    case 'stats':
      await cmdStats();
      break;

    case 'weekly-summary':
      await cmdWeeklySummary({ skipNotify });
      break;

    default:
      console.log(`
Commands:
  scan                  Detect missing receipts & find email matches
  pending [category]    Show pending receipts
  resolve <id>          Mark receipt as resolved (+10 points if quick)
  no-receipt <id>       Mark as no receipt needed (+2 points)
  defer <id>            Defer to next week
  tag <id> <code>       Set project code (+3 points)
  stats                 Show gamification stats
  weekly-summary        Generate weekly report & send to Discord

Options:
  --notify              Send Discord notifications
  --skip-ai             Skip AI enhancement in scan
  --skip-notify         Skip Discord in weekly-summary

Examples:
  node scripts/receipt-reconciliation-agent.mjs scan
  node scripts/receipt-reconciliation-agent.mjs pending travel
  node scripts/receipt-reconciliation-agent.mjs resolve abc12345
  node scripts/receipt-reconciliation-agent.mjs stats
  node scripts/receipt-reconciliation-agent.mjs weekly-summary --notify

Point System:
  Quick resolve (≤7 days):  10 pts
  Backlog clear:            5 pts
  No receipt needed:        2 pts
  Project tag:              3 pts
  Perfect week bonus:       50 pts
`);
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
