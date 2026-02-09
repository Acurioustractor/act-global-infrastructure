/**
 * Receipt Gamification Engine
 *
 * Gamifies the receipt reconciliation process with:
 * - Points for resolving receipts
 * - Streaks for consecutive perfect weeks
 * - Achievements for milestones
 *
 * Point System:
 *   Quick resolve (within 7 days): 10 points
 *   Clear backlog item: 5 points
 *   Perfect week bonus: 50 points
 *   Mark no receipt needed: 2 points
 *   Correct project tag: 3 points
 *
 * Usage:
 *   import { awardPoints, checkAchievements, getStats } from './lib/receipt-gamification.mjs';
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supabase client
const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Default user
const DEFAULT_USER = 'act-finance';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POINT VALUES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const POINTS = {
  QUICK_RESOLVE: 10,       // Resolved within 7 days of transaction
  BACKLOG_CLEAR: 5,        // Resolved older item
  PERFECT_WEEK: 50,        // 100% resolved in a week
  NO_RECEIPT_NEEDED: 2,    // Marked as no receipt needed
  PROJECT_TAG: 3,          // Added correct project code
  STREAK_BONUS_2: 25,      // 2-week streak bonus
  STREAK_BONUS_4: 75,      // 4-week streak bonus
  STREAK_BONUS_8: 150,     // 8-week streak bonus
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ACHIEVEMENTS = {
  receipt_rookie: {
    id: 'receipt_rookie',
    name: 'Receipt Rookie',
    description: 'Resolved your first receipt',
    icon: '🧾',
    condition: (stats) => stats.receipts_resolved >= 1
  },
  week_warrior: {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Completed your first perfect week',
    icon: '🏆',
    condition: (stats) => stats.current_streak >= 1
  },
  streak_starter: {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: '2 consecutive perfect weeks',
    icon: '🔥',
    condition: (stats) => stats.current_streak >= 2
  },
  streak_master: {
    id: 'streak_master',
    name: 'Streak Master',
    description: '4 consecutive perfect weeks - a whole month!',
    icon: '👑',
    condition: (stats) => stats.current_streak >= 4
  },
  century_club: {
    id: 'century_club',
    name: 'Century Club',
    description: 'Resolved 100 receipts',
    icon: '💯',
    condition: (stats) => stats.receipts_resolved >= 100
  },
  speed_demon: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: '10 receipts resolved within 7 days',
    icon: '⚡',
    condition: (stats) => stats.quick_resolves >= 10
  },
  half_century: {
    id: 'half_century',
    name: 'Half Century',
    description: 'Resolved 50 receipts',
    icon: '🎯',
    condition: (stats) => stats.receipts_resolved >= 50
  },
  thousand_points: {
    id: 'thousand_points',
    name: 'Point Collector',
    description: 'Earned 1000 total points',
    icon: '💰',
    condition: (stats) => stats.total_points >= 1000
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get current gamification stats
 *
 * @param {string} userId - User ID (default: act-finance)
 * @returns {Promise<Object>} Current stats
 */
export async function getStats(userId = DEFAULT_USER) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('user_gamification_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - create default
      const { data: newData, error: createError } = await supabase
        .from('user_gamification_stats')
        .insert({ user_id: userId })
        .select()
        .single();

      if (createError) throw createError;
      return newData;
    }
    throw error;
  }

  return data;
}

/**
 * Award points for an action
 *
 * @param {string} action - Action type (QUICK_RESOLVE, BACKLOG_CLEAR, etc.)
 * @param {Object} options
 * @param {string} options.userId - User ID
 * @param {string} options.receiptId - Receipt match ID
 * @param {Object} options.metadata - Additional context
 * @returns {Promise<Object>} Updated stats and any new achievements
 */
export async function awardPoints(action, options = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const {
    userId = DEFAULT_USER,
    receiptId,
    metadata = {}
  } = options;

  const points = POINTS[action];
  if (!points) {
    throw new Error(`Unknown action: ${action}`);
  }

  // Get current stats
  const stats = await getStats(userId);

  // Calculate new values
  const isQuickResolve = action === 'QUICK_RESOLVE';
  const newStats = {
    total_points: stats.total_points + points,
    points_this_week: stats.points_this_week + points,
    points_this_month: stats.points_this_month + points,
    receipts_resolved: stats.receipts_resolved + (action !== 'PROJECT_TAG' && action !== 'NO_RECEIPT_NEEDED' ? 1 : 0),
    quick_resolves: stats.quick_resolves + (isQuickResolve ? 1 : 0),
    no_receipt_marked: stats.no_receipt_marked + (action === 'NO_RECEIPT_NEEDED' ? 1 : 0),
    updated_at: new Date().toISOString()
  };

  // Update stats
  const { error: updateError } = await supabase
    .from('user_gamification_stats')
    .update(newStats)
    .eq('user_id', userId);

  if (updateError) {
    throw updateError;
  }

  // Update receipt with points awarded
  if (receiptId) {
    await supabase
      .from('receipt_matches')
      .update({
        points_awarded: points,
        quick_resolve: isQuickResolve,
        updated_at: new Date().toISOString()
      })
      .eq('id', receiptId);
  }

  // Check for new achievements
  const fullStats = { ...stats, ...newStats };
  const newAchievements = await checkAndAwardAchievements(fullStats, userId);

  return {
    pointsAwarded: points,
    action,
    newTotal: newStats.total_points,
    newAchievements
  };
}

/**
 * Check and award any new achievements
 *
 * @param {Object} stats - Current stats
 * @param {string} userId - User ID
 * @returns {Promise<Object[]>} Newly earned achievements
 */
export async function checkAndAwardAchievements(stats, userId = DEFAULT_USER) {
  const earnedIds = (stats.achievements || []).map(a =>
    typeof a === 'string' ? a : a.id
  );

  const newlyEarned = [];

  for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
    if (!earnedIds.includes(id) && achievement.condition(stats)) {
      const achievementRecord = {
        id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        earned_at: new Date().toISOString()
      };

      newlyEarned.push(achievementRecord);
    }
  }

  if (newlyEarned.length > 0 && supabase) {
    const currentAchievements = stats.achievements || [];
    const updatedAchievements = [...currentAchievements, ...newlyEarned];

    await supabase
      .from('user_gamification_stats')
      .update({
        achievements: updatedAchievements,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  }

  return newlyEarned;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STREAK MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Record a perfect week and update streak
 *
 * @param {string} weekStart - Monday of the perfect week
 * @param {Object} weekStats - Week statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Streak update result
 */
export async function recordPerfectWeek(weekStart, weekStats, userId = DEFAULT_USER) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const stats = await getStats(userId);
  const lastPerfectWeek = stats.last_perfect_week
    ? new Date(stats.last_perfect_week)
    : null;
  const thisWeek = new Date(weekStart);

  // Check if this continues the streak (previous week was perfect)
  const isConsecutive = lastPerfectWeek &&
    (thisWeek - lastPerfectWeek) / (1000 * 60 * 60 * 24) === 7;

  const newStreak = isConsecutive ? stats.current_streak + 1 : 1;
  const newBest = Math.max(stats.best_streak, newStreak);

  // Calculate bonus points
  let bonusPoints = POINTS.PERFECT_WEEK;
  const bonuses = [{ type: 'perfect_week', points: POINTS.PERFECT_WEEK, reason: '100% completion' }];

  if (newStreak === 2) {
    bonusPoints += POINTS.STREAK_BONUS_2;
    bonuses.push({ type: 'streak_2', points: POINTS.STREAK_BONUS_2, reason: '2-week streak' });
  } else if (newStreak === 4) {
    bonusPoints += POINTS.STREAK_BONUS_4;
    bonuses.push({ type: 'streak_4', points: POINTS.STREAK_BONUS_4, reason: '4-week streak' });
  } else if (newStreak === 8) {
    bonusPoints += POINTS.STREAK_BONUS_8;
    bonuses.push({ type: 'streak_8', points: POINTS.STREAK_BONUS_8, reason: '8-week streak' });
  }

  // Update stats
  const { error: updateError } = await supabase
    .from('user_gamification_stats')
    .update({
      current_streak: newStreak,
      best_streak: newBest,
      last_perfect_week: weekStart,
      total_points: stats.total_points + bonusPoints,
      points_this_week: stats.points_this_week + bonusPoints,
      points_this_month: stats.points_this_month + bonusPoints,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) {
    throw updateError;
  }

  // Update week record
  await supabase
    .from('receipt_reconciliation_weeks')
    .upsert({
      week_start: weekStart,
      week_end: new Date(thisWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_perfect_week: true,
      points_earned: bonusPoints,
      bonuses_applied: bonuses,
      ...weekStats,
      updated_at: new Date().toISOString()
    }, { onConflict: 'week_start' });

  // Check for new achievements
  const fullStats = await getStats(userId);
  const newAchievements = await checkAndAwardAchievements(fullStats, userId);

  return {
    newStreak,
    bestStreak: newBest,
    bonusPoints,
    bonuses,
    newAchievements,
    isConsecutive
  };
}

/**
 * Break the streak (week not completed)
 *
 * @param {string} weekStart - Monday of the incomplete week
 * @param {Object} weekStats - Week statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result
 */
export async function breakStreak(weekStart, weekStats, userId = DEFAULT_USER) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const stats = await getStats(userId);

  // Reset current streak
  await supabase
    .from('user_gamification_stats')
    .update({
      current_streak: 0,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  // Record incomplete week
  const thisWeek = new Date(weekStart);
  await supabase
    .from('receipt_reconciliation_weeks')
    .upsert({
      week_start: weekStart,
      week_end: new Date(thisWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_perfect_week: false,
      points_earned: 0,
      bonuses_applied: [],
      ...weekStats,
      updated_at: new Date().toISOString()
    }, { onConflict: 'week_start' });

  return {
    previousStreak: stats.current_streak,
    bestStreak: stats.best_streak,
    streakBroken: stats.current_streak > 0
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEEKLY MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Reset weekly points (call at start of each week)
 *
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function resetWeeklyPoints(userId = DEFAULT_USER) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  await supabase
    .from('user_gamification_stats')
    .update({
      points_this_week: 0,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
}

/**
 * Reset monthly points (call at start of each month)
 *
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function resetMonthlyPoints(userId = DEFAULT_USER) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  await supabase
    .from('user_gamification_stats')
    .update({
      points_this_month: 0,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DISPLAY HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format stats for display
 *
 * @param {Object} stats - Stats from getStats()
 * @returns {Object} Formatted stats
 */
export function formatStatsForDisplay(stats) {
  const achievements = (stats.achievements || []).map(a =>
    typeof a === 'string' ? ACHIEVEMENTS[a] : a
  ).filter(Boolean);

  const nextAchievement = Object.values(ACHIEVEMENTS)
    .filter(a => !achievements.find(earned => earned.id === a.id))
    .find(a => !a.condition(stats));

  return {
    points: {
      total: stats.total_points,
      thisWeek: stats.points_this_week,
      thisMonth: stats.points_this_month
    },
    streaks: {
      current: stats.current_streak,
      best: stats.best_streak,
      display: stats.current_streak > 0 ? `${stats.current_streak} week${stats.current_streak > 1 ? 's' : ''} 🔥` : 'No streak'
    },
    counters: {
      resolved: stats.receipts_resolved,
      quickResolves: stats.quick_resolves,
      noReceiptMarked: stats.no_receipt_marked
    },
    achievements: {
      earned: achievements,
      count: achievements.length,
      next: nextAchievement ? {
        name: nextAchievement.name,
        icon: nextAchievement.icon,
        description: nextAchievement.description
      } : null
    }
  };
}

/**
 * Generate stats summary text
 *
 * @param {Object} stats - Stats from getStats()
 * @returns {string} Summary text
 */
export function generateStatsSummary(stats) {
  const formatted = formatStatsForDisplay(stats);
  const lines = [];

  lines.push('🎮 Gamification Stats');
  lines.push('─────────────────────');
  lines.push(`📊 Total Points: ${formatted.points.total}`);
  lines.push(`   This Week: ${formatted.points.thisWeek}`);
  lines.push(`   This Month: ${formatted.points.thisMonth}`);
  lines.push('');
  lines.push(`🔥 Streak: ${formatted.streaks.display}`);
  lines.push(`   Best: ${formatted.streaks.best} weeks`);
  lines.push('');
  lines.push(`✅ Receipts Resolved: ${formatted.counters.resolved}`);
  lines.push(`   Quick Resolves: ${formatted.counters.quickResolves}`);
  lines.push('');
  lines.push(`🏆 Achievements: ${formatted.achievements.count}`);

  if (formatted.achievements.earned.length > 0) {
    const recent = formatted.achievements.earned.slice(-3);
    lines.push(`   Recent: ${recent.map(a => `${a.icon} ${a.name}`).join(', ')}`);
  }

  if (formatted.achievements.next) {
    lines.push(`   Next: ${formatted.achievements.next.icon} ${formatted.achievements.next.name}`);
  }

  return lines.join('\n');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Receipt Gamification Engine');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (command === 'stats') {
    const stats = await getStats();
    console.log(generateStatsSummary(stats));

  } else if (command === 'achievements') {
    const stats = await getStats();
    const formatted = formatStatsForDisplay(stats);

    console.log('🏆 Achievements\n');

    Object.values(ACHIEVEMENTS).forEach(a => {
      const earned = formatted.achievements.earned.find(e => e.id === a.id);
      const status = earned ? '✅' : '⬜';
      console.log(`${status} ${a.icon} ${a.name}`);
      console.log(`   ${a.description}`);
      if (earned?.earned_at) {
        console.log(`   Earned: ${new Date(earned.earned_at).toLocaleDateString()}`);
      }
      console.log('');
    });

  } else if (command === 'test-award') {
    console.log('Testing point award...\n');

    const result = await awardPoints('BACKLOG_CLEAR', {
      metadata: { test: true }
    });

    console.log('Result:');
    console.log(`  Action: ${result.action}`);
    console.log(`  Points Awarded: ${result.pointsAwarded}`);
    console.log(`  New Total: ${result.newTotal}`);

    if (result.newAchievements.length > 0) {
      console.log('\n🎉 New Achievements:');
      result.newAchievements.forEach(a => {
        console.log(`   ${a.icon} ${a.name}`);
      });
    }

  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/receipt-gamification.mjs stats        - Show current stats');
    console.log('  node scripts/lib/receipt-gamification.mjs achievements - List all achievements');
    console.log('  node scripts/lib/receipt-gamification.mjs test-award   - Test point award');
  }
}

export default {
  POINTS,
  ACHIEVEMENTS,
  getStats,
  awardPoints,
  checkAndAwardAchievements,
  recordPerfectWeek,
  breakStreak,
  resetWeeklyPoints,
  resetMonthlyPoints,
  formatStatsForDisplay,
  generateStatsSummary
};
