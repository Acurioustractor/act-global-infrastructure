#!/usr/bin/env node
/**
 * ACT Goals Service
 *
 * Service layer for managing goals with history tracking and metrics.
 * Provides functions for updating goals, tracking progress, and managing KPIs.
 *
 * Usage:
 *   import { updateGoalProgress, addGoalMetric } from './goals-service.mjs';
 *
 * CLI Usage:
 *   node scripts/goals-service.mjs list                     - List all goals
 *   node scripts/goals-service.mjs history <goal-id>        - Show goal history
 *   node scripts/goals-service.mjs update <goal-id> <pct>   - Update progress
 *
 * Environment Variables:
 *   SUPABASE_URL / SUPABASE_SHARED_URL
 *   SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SHARED_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
await import(join(__dirname, '../lib/load-env.mjs'));

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ============================================================================
// GOAL UPDATE FUNCTIONS
// ============================================================================

/**
 * Update goal progress with history tracking
 * @param {string} goalId - Goal UUID
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} source - Update source ('dashboard', 'api', 'agent', 'notion_sync')
 * @param {string} updatedBy - Who made the update
 * @param {string} comment - Optional comment
 * @returns {Promise<Object>} Updated goal
 */
async function updateGoalProgress(goalId, progress, source = 'dashboard', updatedBy = null, comment = null) {
  if (!supabase) throw new Error('Supabase not configured');

  // Clamp progress to 0-100
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  // Update the goal (trigger will log to goal_updates)
  const { data, error } = await supabase
    .from('goals_2026')
    .update({
      progress_percentage: clampedProgress,
      last_update_source: source,
      last_updated_by: updatedBy,
      updated_at: new Date().toISOString()
    })
    .eq('id', goalId)
    .select()
    .single();

  if (error) throw error;

  // If there's a comment, add it to the most recent update
  if (comment) {
    const { error: commentError } = await supabase
      .from('goal_updates')
      .update({ comment })
      .eq('goal_id', goalId)
      .eq('field_changed', 'progress_percentage')
      .order('created_at', { ascending: false })
      .limit(1);

    if (commentError) {
      console.error('Warning: Could not add comment:', commentError.message);
    }
  }

  return data;
}

/**
 * Update goal status with history tracking
 * @param {string} goalId - Goal UUID
 * @param {string} status - New status ('Not started', 'Planning', 'In progress', 'Completed')
 * @param {string} source - Update source
 * @param {string} updatedBy - Who made the update
 * @returns {Promise<Object>} Updated goal
 */
async function updateGoalStatus(goalId, status, source = 'dashboard', updatedBy = null) {
  if (!supabase) throw new Error('Supabase not configured');

  const validStatuses = ['Not started', 'Planning', 'In progress', 'Completed'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Auto-update progress for Completed status
  const updates = {
    status,
    last_update_source: source,
    last_updated_by: updatedBy,
    updated_at: new Date().toISOString()
  };

  if (status === 'Completed') {
    updates.progress_percentage = 100;
  }

  const { data, error } = await supabase
    .from('goals_2026')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// GOAL METRICS FUNCTIONS
// ============================================================================

/**
 * Add a metric (KPI) to a goal
 * @param {string} goalId - Goal UUID
 * @param {Object} metric - Metric data
 * @returns {Promise<Object>} Created metric
 */
async function addGoalMetric(goalId, metric) {
  if (!supabase) throw new Error('Supabase not configured');

  const metricData = {
    goal_id: goalId,
    metric_name: metric.name,
    metric_type: metric.type || 'number',
    target_value: metric.target,
    current_value: metric.current || 0,
    unit: metric.unit || null,
    value_history: metric.current ? [{
      value: metric.current,
      timestamp: new Date().toISOString()
    }] : []
  };

  const { data, error } = await supabase
    .from('goal_metrics')
    .insert(metricData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a metric value with history tracking
 * @param {string} metricId - Metric UUID
 * @param {number} value - New value
 * @returns {Promise<Object>} Updated metric
 */
async function updateMetricValue(metricId, value) {
  if (!supabase) throw new Error('Supabase not configured');

  // First get current metric to append to history
  const { data: current, error: fetchError } = await supabase
    .from('goal_metrics')
    .select('value_history')
    .eq('id', metricId)
    .single();

  if (fetchError) throw fetchError;

  // Append to history
  const history = current.value_history || [];
  history.push({
    value,
    timestamp: new Date().toISOString()
  });

  // Keep last 100 history entries
  const trimmedHistory = history.slice(-100);

  const { data, error } = await supabase
    .from('goal_metrics')
    .update({
      current_value: value,
      value_history: trimmedHistory,
      updated_at: new Date().toISOString()
    })
    .eq('id', metricId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all metrics for a goal
 * @param {string} goalId - Goal UUID
 * @returns {Promise<Array>} Goal metrics
 */
async function getGoalMetrics(goalId) {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('goal_metrics')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at');

  if (error) throw error;
  return data;
}

// ============================================================================
// GOAL HISTORY FUNCTIONS
// ============================================================================

/**
 * Get full change history for a goal
 * @param {string} goalId - Goal UUID
 * @param {number} limit - Maximum number of entries
 * @returns {Promise<Array>} History entries
 */
async function getGoalHistory(goalId, limit = 50) {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('goal_updates')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get goal with all related data
 * @param {string} goalId - Goal UUID
 * @returns {Promise<Object>} Goal with metrics and recent history
 */
async function getGoalDetails(goalId) {
  if (!supabase) throw new Error('Supabase not configured');

  const [goalResult, metricsResult, historyResult] = await Promise.all([
    supabase.from('goals_2026').select('*').eq('id', goalId).single(),
    supabase.from('goal_metrics').select('*').eq('goal_id', goalId),
    supabase.from('goal_updates').select('*').eq('goal_id', goalId)
      .order('created_at', { ascending: false }).limit(10)
  ]);

  if (goalResult.error) throw goalResult.error;

  return {
    ...goalResult.data,
    metrics: metricsResult.data || [],
    recent_history: historyResult.data || []
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Get all goals with progress summary
 * @param {Object} filters - Optional filters (lane, status, type)
 * @returns {Promise<Array>} Goals with computed fields
 */
async function getAllGoals(filters = {}) {
  if (!supabase) throw new Error('Supabase not configured');

  let query = supabase
    .from('goals_2026')
    .select('*')
    .order('lane')
    .order('title');

  if (filters.lane) {
    query = query.eq('lane', filters.lane);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data;
}

/**
 * Get goals progress summary by lane
 * @returns {Promise<Object>} Summary statistics
 */
async function getGoalsSummary() {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: goals, error } = await supabase
    .from('goals_2026')
    .select('lane, status, progress_percentage');

  if (error) throw error;

  // Calculate summary
  const summary = {
    total: goals.length,
    byLane: {},
    byStatus: {},
    avgProgress: 0
  };

  let totalProgress = 0;

  for (const goal of goals) {
    // By lane
    const lane = goal.lane || 'Unassigned';
    if (!summary.byLane[lane]) {
      summary.byLane[lane] = { count: 0, completed: 0, avgProgress: 0, totalProgress: 0 };
    }
    summary.byLane[lane].count++;
    summary.byLane[lane].totalProgress += goal.progress_percentage || 0;
    if (goal.status === 'Completed') {
      summary.byLane[lane].completed++;
    }

    // By status
    const status = goal.status || 'Not started';
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

    totalProgress += goal.progress_percentage || 0;
  }

  // Calculate averages
  summary.avgProgress = goals.length > 0 ? Math.round(totalProgress / goals.length) : 0;

  for (const lane of Object.keys(summary.byLane)) {
    summary.byLane[lane].avgProgress = Math.round(
      summary.byLane[lane].totalProgress / summary.byLane[lane].count
    );
    delete summary.byLane[lane].totalProgress;
  }

  return summary;
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function cli() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!supabase) {
    console.error('❌ Supabase not configured');
    process.exit(1);
  }

  switch (command) {
    case 'list': {
      const filter = args[1];
      const goals = await getAllGoals(
        filter ? { lane: filter } : {}
      );

      console.log('\n========================================');
      console.log('  ACT 2026 Goals');
      console.log('========================================\n');

      const byLane = {};
      for (const goal of goals) {
        const lane = goal.lane || 'Unassigned';
        if (!byLane[lane]) byLane[lane] = [];
        byLane[lane].push(goal);
      }

      for (const [lane, laneGoals] of Object.entries(byLane)) {
        console.log(`\n${lane}:`);
        for (const goal of laneGoals) {
          const statusIcon = goal.status === 'Completed' ? '✅' :
                            goal.status === 'In progress' ? '🔄' :
                            goal.status === 'Planning' ? '📋' : '⬜';
          const progress = `${goal.progress_percentage || 0}%`.padStart(4);
          console.log(`  ${statusIcon} ${progress} ${goal.title}`);
        }
      }

      const summary = await getGoalsSummary();
      console.log('\n----------------------------------------');
      console.log(`Total: ${summary.total} | Avg Progress: ${summary.avgProgress}%`);
      console.log(`By Status: ${Object.entries(summary.byStatus).map(([s, c]) => `${s}: ${c}`).join(', ')}`);
      break;
    }

    case 'history': {
      const goalId = args[1];
      if (!goalId) {
        console.error('Usage: goals-service.mjs history <goal-id>');
        process.exit(1);
      }

      const history = await getGoalHistory(goalId);

      console.log('\n========================================');
      console.log('  Goal History');
      console.log('========================================\n');

      if (history.length === 0) {
        console.log('No history found.');
      } else {
        for (const entry of history) {
          const date = new Date(entry.created_at).toLocaleString();
          console.log(`[${date}] ${entry.field_changed}: ${entry.old_value || '(empty)'} -> ${entry.new_value}`);
          if (entry.comment) console.log(`    Comment: ${entry.comment}`);
          if (entry.source) console.log(`    Source: ${entry.source}`);
        }
      }
      break;
    }

    case 'update': {
      const goalId = args[1];
      const progress = parseInt(args[2], 10);

      if (!goalId || isNaN(progress)) {
        console.error('Usage: goals-service.mjs update <goal-id> <progress%>');
        process.exit(1);
      }

      const updated = await updateGoalProgress(goalId, progress, 'cli', 'cli-user');
      console.log(`✅ Updated "${updated.title}" to ${updated.progress_percentage}%`);
      break;
    }

    case 'summary': {
      const summary = await getGoalsSummary();

      console.log('\n========================================');
      console.log('  Goals Summary');
      console.log('========================================\n');

      console.log(`Total Goals: ${summary.total}`);
      console.log(`Average Progress: ${summary.avgProgress}%\n`);

      console.log('By Lane:');
      for (const [lane, stats] of Object.entries(summary.byLane)) {
        console.log(`  ${lane}: ${stats.count} goals, ${stats.completed} completed, ${stats.avgProgress}% avg`);
      }

      console.log('\nBy Status:');
      for (const [status, count] of Object.entries(summary.byStatus)) {
        console.log(`  ${status}: ${count}`);
      }
      break;
    }

    default:
      console.log(`
ACT Goals Service

Commands:
  list [lane]              List all goals (optionally filter by lane)
  history <goal-id>        Show change history for a goal
  update <goal-id> <pct>   Update goal progress percentage
  summary                  Show goals summary statistics

Examples:
  node scripts/goals-service.mjs list
  node scripts/goals-service.mjs list "A — Core Ops"
  node scripts/goals-service.mjs history abc-123
  node scripts/goals-service.mjs update abc-123 75
`);
  }
}

// Run CLI if called directly
if (process.argv[1].includes('goals-service')) {
  cli().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}

// Export functions for programmatic use
export {
  updateGoalProgress,
  updateGoalStatus,
  addGoalMetric,
  updateMetricValue,
  getGoalMetrics,
  getGoalHistory,
  getGoalDetails,
  getAllGoals,
  getGoalsSummary
};
