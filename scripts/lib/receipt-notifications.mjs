/**
 * Receipt Reconciliation Notifications
 *
 * Sends Discord notifications for receipt reconciliation:
 * - Weekly summary reports
 * - Achievement notifications
 * - Streak updates
 *
 * Usage:
 *   import { sendWeeklySummary, sendAchievementNotification } from './lib/receipt-notifications.mjs';
 */

import '../../lib/load-env.mjs';
import { sendDiscordMessage, sendEmbed, templates } from '../discord-notify.mjs';
import { getStats, formatStatsForDisplay, generateStatsSummary } from './receipt-gamification.mjs';
import { getReconciliationStats, getPendingReceipts } from './receipt-detector.mjs';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Discord channel for receipt notifications (uses enrichment channel)
const RECEIPT_CHANNEL = 'enrichment';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMBED TEMPLATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create weekly summary embed
 */
function createWeeklySummaryEmbed(data) {
  const {
    weekOf,
    pendingCount,
    totalAmount,
    byCategory,
    gamification,
    topPending
  } = data;

  const fields = [
    {
      name: '📋 Pending Receipts',
      value: `${pendingCount} items`,
      inline: true
    },
    {
      name: '💰 Total Unmatched',
      value: `$${totalAmount.toFixed(2)}`,
      inline: true
    },
    {
      name: '\u200B',  // Spacer
      value: '\u200B',
      inline: true
    }
  ];

  // Category breakdown
  if (byCategory) {
    const categoryLines = [];
    if (byCategory.travel?.count > 0) {
      categoryLines.push(`✈️ Travel: ${byCategory.travel.count} ($${byCategory.travel.amount?.toFixed(2) || '0.00'})`);
    }
    if (byCategory.subscription?.count > 0) {
      categoryLines.push(`💻 Subscriptions: ${byCategory.subscription.count} ($${byCategory.subscription.amount?.toFixed(2) || '0.00'})`);
    }
    if (byCategory.other?.count > 0) {
      categoryLines.push(`📦 Other: ${byCategory.other.count} ($${byCategory.other.amount?.toFixed(2) || '0.00'})`);
    }

    if (categoryLines.length > 0) {
      fields.push({
        name: '📊 By Category',
        value: categoryLines.join('\n'),
        inline: false
      });
    }
  }

  // Gamification stats
  if (gamification) {
    const streakEmoji = gamification.current_streak > 0 ? '🔥' : '';
    fields.push({
      name: '🎮 Gamification',
      value: [
        `Current Streak: ${gamification.current_streak} weeks ${streakEmoji}`,
        `Points This Week: ${gamification.points_this_week || 0}`,
        `Total Points: ${gamification.total_points || 0}`
      ].join('\n'),
      inline: true
    });
  }

  // Top pending items
  if (topPending && topPending.length > 0) {
    const topLines = topPending.slice(0, 5).map((item, i) => {
      const emoji = item.category === 'travel' ? '✈️' : item.category === 'subscription' ? '💻' : '📦';
      const confidence = item.match_confidence ? ` (${item.match_confidence}%)` : '';
      return `${i + 1}. ${emoji} ${item.vendor_name || 'Unknown'} - $${item.amount?.toFixed(2) || '?'}${confidence}`;
    });

    fields.push({
      name: '🔝 Top Pending',
      value: topLines.join('\n'),
      inline: false
    });
  }

  return {
    title: `📋 Weekly Receipt Review - Week of ${weekOf}`,
    color: pendingCount === 0 ? 0x57F287 : pendingCount < 5 ? 0xFEE75C : 0xED4245,
    fields,
    footer: {
      text: 'ACT Receipt Reconciliation System'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Create achievement notification embed
 */
function createAchievementEmbed(achievement, stats) {
  return {
    title: `🎉 Achievement Unlocked!`,
    color: 0xFFD700,  // Gold
    description: `${achievement.icon} **${achievement.name}**\n${achievement.description}`,
    fields: [
      {
        name: 'Stats',
        value: [
          `Total Points: ${stats.total_points}`,
          `Receipts Resolved: ${stats.receipts_resolved}`,
          `Current Streak: ${stats.current_streak} weeks`
        ].join('\n'),
        inline: true
      }
    ],
    thumbnail: {
      url: 'https://act.place/icons/trophy.png'
    },
    footer: {
      text: 'ACT Receipt Gamification'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Create streak notification embed
 */
function createStreakEmbed(streakData) {
  const {
    newStreak,
    bestStreak,
    bonusPoints,
    bonuses
  } = streakData;

  const description = newStreak > 1
    ? `🔥 **${newStreak} week streak!** You're on fire!`
    : '✅ Perfect week completed!';

  const bonusLines = bonuses.map(b =>
    `+${b.points} pts - ${b.reason}`
  ).join('\n');

  return {
    title: newStreak > 1 ? `🔥 Streak Extended!` : `✅ Perfect Week!`,
    color: 0xFF6B35,  // Fire orange
    description,
    fields: [
      {
        name: '🏆 Bonuses Earned',
        value: bonusLines || 'None',
        inline: true
      },
      {
        name: '📊 Streak Stats',
        value: [
          `Current: ${newStreak} weeks`,
          `Best: ${bestStreak} weeks`,
          `Points: +${bonusPoints}`
        ].join('\n'),
        inline: true
      }
    ],
    footer: {
      text: 'Keep it up! 💪'
    },
    timestamp: new Date().toISOString()
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTIFICATION FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Send weekly summary notification
 *
 * @returns {Promise<boolean>} Success status
 */
export async function sendWeeklySummary() {
  try {
    // Get reconciliation stats
    const reconcStats = await getReconciliationStats();

    // Get pending receipts for top items
    const pending = await getPendingReceipts({ limit: 10 });

    // Get gamification stats
    const gamification = await getStats();

    // Calculate week of
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    const weekOf = monday.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });

    const embed = createWeeklySummaryEmbed({
      weekOf,
      pendingCount: reconcStats.pendingCount,
      totalAmount: reconcStats.pendingAmount,
      byCategory: reconcStats.byCategory,
      gamification,
      topPending: pending.map(p => ({
        vendor_name: p.vendor_name,
        amount: parseFloat(p.amount),
        category: p.category,
        match_confidence: p.match_confidence
      }))
    });

    return await sendEmbed(RECEIPT_CHANNEL, embed);

  } catch (error) {
    console.error('Failed to send weekly summary:', error.message);
    return false;
  }
}

/**
 * Send achievement notification
 *
 * @param {Object} achievement - Achievement data
 * @param {Object} stats - Current stats
 * @returns {Promise<boolean>} Success status
 */
export async function sendAchievementNotification(achievement, stats) {
  try {
    const embed = createAchievementEmbed(achievement, stats);
    return await sendEmbed(RECEIPT_CHANNEL, embed);
  } catch (error) {
    console.error('Failed to send achievement notification:', error.message);
    return false;
  }
}

/**
 * Send streak update notification
 *
 * @param {Object} streakData - Streak update data
 * @returns {Promise<boolean>} Success status
 */
export async function sendStreakNotification(streakData) {
  try {
    const embed = createStreakEmbed(streakData);
    return await sendEmbed(RECEIPT_CHANNEL, embed);
  } catch (error) {
    console.error('Failed to send streak notification:', error.message);
    return false;
  }
}

/**
 * Send resolution notification
 *
 * @param {Object} receipt - Resolved receipt
 * @param {Object} result - Resolution result with points
 * @returns {Promise<boolean>} Success status
 */
export async function sendResolutionNotification(receipt, result) {
  try {
    const message = [
      `✅ **Receipt Resolved**`,
      `• Vendor: ${receipt.vendor_name}`,
      `• Amount: $${receipt.amount}`,
      `• Points: +${result.pointsAwarded}`,
      result.quickResolve ? '⚡ Quick resolve bonus!' : ''
    ].filter(Boolean).join('\n');

    return await sendDiscordMessage(RECEIPT_CHANNEL, message);
  } catch (error) {
    console.error('Failed to send resolution notification:', error.message);
    return false;
  }
}

/**
 * Send scan results notification
 *
 * @param {Object} scanResults - Results from scan operation
 * @returns {Promise<boolean>} Success status
 */
export async function sendScanResultsNotification(scanResults) {
  try {
    const { detected, matched, saved } = scanResults;

    if (detected === 0) {
      return await sendDiscordMessage(
        RECEIPT_CHANNEL,
        '✨ **Receipt Scan Complete** - No new missing receipts detected!'
      );
    }

    const message = [
      `🔍 **Receipt Scan Complete**`,
      ``,
      `📋 Results:`,
      `• Detected: ${detected} missing receipts`,
      `• Email matches found: ${matched}`,
      `• Saved to database: ${saved}`,
      ``,
      `Run \`receipt-reconciliation-agent pending\` to review.`
    ].join('\n');

    return await sendDiscordMessage(RECEIPT_CHANNEL, message);
  } catch (error) {
    console.error('Failed to send scan notification:', error.message);
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Receipt Notifications');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (command === 'weekly') {
    console.log('Sending weekly summary...\n');

    const success = await sendWeeklySummary();

    if (success) {
      console.log('✅ Weekly summary sent to Discord');
    } else {
      console.log('❌ Failed to send weekly summary');
      console.log('Check that DISCORD_WEBHOOK_ENRICHMENT is set in .env.local');
    }

  } else if (command === 'test') {
    console.log('Sending test notification...\n');

    const success = await sendDiscordMessage(
      RECEIPT_CHANNEL,
      '🧪 **Test** - Receipt Reconciliation notification system is working!'
    );

    if (success) {
      console.log('✅ Test notification sent');
    } else {
      console.log('❌ Failed to send test notification');
    }

  } else if (command === 'preview-weekly') {
    console.log('Generating weekly summary preview...\n');

    const reconcStats = await getReconciliationStats();
    const pending = await getPendingReceipts({ limit: 5 });
    const gamification = await getStats();

    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    const weekOf = monday.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });

    const embed = createWeeklySummaryEmbed({
      weekOf,
      pendingCount: reconcStats.pendingCount,
      totalAmount: reconcStats.pendingAmount,
      byCategory: reconcStats.byCategory,
      gamification,
      topPending: pending.map(p => ({
        vendor_name: p.vendor_name,
        amount: parseFloat(p.amount),
        category: p.category,
        match_confidence: p.match_confidence
      }))
    });

    console.log('Embed Preview:');
    console.log(JSON.stringify(embed, null, 2));

  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/receipt-notifications.mjs weekly         - Send weekly summary');
    console.log('  node scripts/lib/receipt-notifications.mjs test           - Send test notification');
    console.log('  node scripts/lib/receipt-notifications.mjs preview-weekly - Preview weekly embed');
  }
}

export default {
  sendWeeklySummary,
  sendAchievementNotification,
  sendStreakNotification,
  sendResolutionNotification,
  sendScanResultsNotification
};
