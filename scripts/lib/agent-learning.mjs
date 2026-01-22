#!/usr/bin/env node
/**
 * Agent Learning System
 *
 * Analyzes agent performance over time and generates actionable insights
 * to improve agent confidence thresholds, bounds, and decision patterns.
 *
 * Features:
 * - Analyze approval/rejection patterns
 * - Calculate optimal confidence thresholds
 * - Identify patterns leading to success/failure
 * - Suggest bound adjustments
 * - Store and track learnings
 *
 * Usage:
 *   import { AgentLearning } from './lib/agent-learning.mjs';
 *
 *   const learning = new AgentLearning('my-agent', supabase);
 *   const performance = await learning.analyzePerformance();
 *   const threshold = await learning.calculateThreshold();
 *   const patterns = await learning.getApprovalPatterns();
 *
 * Part of: 9 Layers of Agentic Infrastructure
 * Layer 9: Observability & Evaluation
 */

import { createClient } from '@supabase/supabase-js';
import '../../lib/load-env.mjs';

// Default Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultSupabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ============================================================================
// AGENT LEARNING CLASS
// ============================================================================

export class AgentLearning {
  /**
   * Create an AgentLearning instance
   * @param {string} agentId - The agent to analyze
   * @param {object} supabase - Supabase client (optional, uses default if not provided)
   * @param {object} options - Configuration options
   */
  constructor(agentId, supabase = null, options = {}) {
    this.agentId = agentId;
    this.supabase = supabase || defaultSupabase;
    this.options = {
      timeWindowDays: options.timeWindowDays || 30,
      minSamples: options.minSamples || 10,
      verbose: options.verbose || false,
      ...options
    };

    if (!this.supabase) {
      throw new Error('Supabase client required. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
  }

  /**
   * Analyze overall performance for this agent
   * @returns {Promise<object>} Performance metrics
   */
  async analyzePerformance() {
    const { timeWindowDays } = this.options;
    const cutoff = new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000).toISOString();

    // Get proposal metrics
    const proposalMetrics = await this._getProposalMetrics(cutoff);

    // Get execution metrics
    const executionMetrics = await this._getExecutionMetrics(cutoff);

    // Get decision quality from decision_traces
    const decisionMetrics = await this._getDecisionMetrics();

    // Calculate overall health score
    const healthScore = this._calculateHealthScore(proposalMetrics, executionMetrics, decisionMetrics);

    const performance = {
      agentId: this.agentId,
      timeWindow: `${timeWindowDays} days`,
      analyzedAt: new Date().toISOString(),

      proposals: proposalMetrics,
      executions: executionMetrics,
      decisions: decisionMetrics,

      healthScore,
      summary: this._generateSummary(proposalMetrics, executionMetrics, decisionMetrics)
    };

    if (this.options.verbose) {
      console.log(`\nPerformance Analysis for ${this.agentId}:`);
      console.log(`  Approval Rate: ${proposalMetrics.approvalRate?.toFixed(1)}%`);
      console.log(`  Execution Success: ${executionMetrics.successRate?.toFixed(1)}%`);
      console.log(`  Health Score: ${healthScore}/100`);
    }

    return performance;
  }

  /**
   * Calculate optimal confidence threshold
   * @param {string} actionName - Optional: specific action to analyze
   * @returns {Promise<object>} Threshold recommendation
   */
  async calculateThreshold(actionName = null) {
    const { timeWindowDays, minSamples } = this.options;

    // Use database function if available
    const { data, error } = await this.supabase.rpc('calculate_optimal_threshold', {
      p_agent_id: this.agentId,
      p_action_name: actionName,
      p_days: timeWindowDays
    });

    if (error) {
      // Fallback to manual calculation
      return this._calculateThresholdManually(actionName);
    }

    const result = data?.[0] || {};

    // Only suggest threshold if we have enough samples
    if (result.samples_analyzed < minSamples) {
      return {
        suggestedThreshold: null,
        currentApprovalRate: result.current_approval_rate,
        samplesAnalyzed: result.samples_analyzed,
        confidenceInSuggestion: 0,
        reason: `Insufficient samples (${result.samples_analyzed}/${minSamples} required)`
      };
    }

    const threshold = {
      suggestedThreshold: parseFloat(result.suggested_threshold),
      currentApprovalRate: parseFloat(result.current_approval_rate),
      samplesAnalyzed: result.samples_analyzed,
      confidenceInSuggestion: parseFloat(result.confidence_in_suggestion),
      actionName: actionName || 'all',
      reason: this._explainThreshold(result)
    };

    if (this.options.verbose) {
      console.log(`\nThreshold Analysis${actionName ? ` for ${actionName}` : ''}:`);
      console.log(`  Suggested: ${threshold.suggestedThreshold?.toFixed(2)}`);
      console.log(`  Based on: ${threshold.samplesAnalyzed} samples`);
      console.log(`  Confidence: ${(threshold.confidenceInSuggestion * 100).toFixed(0)}%`);
    }

    return threshold;
  }

  /**
   * Get patterns that lead to approval
   * @returns {Promise<Array>} Approval patterns
   */
  async getApprovalPatterns() {
    const { timeWindowDays } = this.options;

    const { data, error } = await this.supabase.rpc('get_approval_patterns', {
      p_agent_id: this.agentId,
      p_days: timeWindowDays,
      p_limit: 10
    });

    if (error) {
      console.error('Error getting approval patterns:', error);
      return [];
    }

    const patterns = (data || []).map(p => ({
      actionName: p.action_name,
      trigger: p.trigger_type,
      count: parseInt(p.approval_count),
      avgConfidence: parseFloat(p.avg_confidence),
      successRate: parseFloat(p.success_rate),
      recommendation: this._generateApprovalRecommendation(p)
    }));

    if (this.options.verbose && patterns.length > 0) {
      console.log('\nApproval Patterns:');
      patterns.slice(0, 5).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.actionName} (${p.trigger}): ${p.count} approvals, ${p.avgConfidence?.toFixed(2)} avg confidence`);
      });
    }

    return patterns;
  }

  /**
   * Get patterns that lead to rejection
   * @returns {Promise<Array>} Rejection patterns
   */
  async getRejectionPatterns() {
    const { timeWindowDays } = this.options;

    const { data, error } = await this.supabase.rpc('get_rejection_patterns', {
      p_agent_id: this.agentId,
      p_days: timeWindowDays,
      p_limit: 10
    });

    if (error) {
      console.error('Error getting rejection patterns:', error);
      return [];
    }

    const patterns = (data || []).map(p => ({
      actionName: p.action_name,
      trigger: p.trigger_type,
      count: parseInt(p.rejection_count),
      avgConfidence: parseFloat(p.avg_confidence),
      commonReason: p.common_reason,
      recommendation: this._generateRejectionRecommendation(p)
    }));

    if (this.options.verbose && patterns.length > 0) {
      console.log('\nRejection Patterns:');
      patterns.slice(0, 5).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.actionName} (${p.trigger}): ${p.count} rejections`);
        if (p.commonReason) {
          console.log(`     Reason: "${p.commonReason}"`);
        }
      });
    }

    return patterns;
  }

  /**
   * Suggest bound adjustments based on performance
   * @returns {Promise<Array>} Bound adjustment suggestions
   */
  async suggestBoundAdjustments() {
    const { timeWindowDays } = this.options;
    const cutoff = new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000).toISOString();

    // Get action-level metrics
    const { data: proposals } = await this.supabase
      .from('agent_proposals')
      .select('action_name, status, reasoning, proposed_action, review_notes')
      .eq('agent_id', this.agentId)
      .gte('created_at', cutoff)
      .in('status', ['approved', 'rejected', 'completed', 'failed']);

    // Group by action
    const actionStats = {};
    (proposals || []).forEach(p => {
      if (!actionStats[p.action_name]) {
        actionStats[p.action_name] = {
          approved: 0,
          rejected: 0,
          completed: 0,
          failed: 0,
          rejectionReasons: [],
          proposedParams: []
        };
      }
      actionStats[p.action_name][p.status]++;
      if (p.status === 'rejected' && p.review_notes) {
        actionStats[p.action_name].rejectionReasons.push(p.review_notes);
      }
      if (p.proposed_action) {
        actionStats[p.action_name].proposedParams.push(p.proposed_action);
      }
    });

    // Check bounds violations
    const { data: executions } = await this.supabase
      .from('autonomous_executions')
      .select('action_name, within_bounds, bounds_violated')
      .eq('agent_id', this.agentId)
      .gte('created_at', cutoff);

    const boundsViolations = {};
    (executions || []).forEach(e => {
      if (!e.within_bounds) {
        if (!boundsViolations[e.action_name]) {
          boundsViolations[e.action_name] = [];
        }
        boundsViolations[e.action_name].push(e.bounds_violated);
      }
    });

    // Generate suggestions
    const suggestions = [];

    Object.entries(actionStats).forEach(([actionName, stats]) => {
      const total = stats.approved + stats.rejected;
      if (total < 5) return; // Skip actions with too few samples

      const rejectionRate = stats.rejected / total;
      const failureRate = stats.completed > 0 ? stats.failed / (stats.completed + stats.failed) : 0;

      // High rejection rate suggests bounds too loose or autonomy too high
      if (rejectionRate > 0.3) {
        suggestions.push({
          actionName,
          type: 'tighten_bounds',
          reason: `High rejection rate (${(rejectionRate * 100).toFixed(0)}%)`,
          rejectionReasons: stats.rejectionReasons.slice(0, 3),
          confidence: Math.min(total / 20, 1),
          recommendation: `Consider reducing autonomy level or tightening bounds for "${actionName}"`
        });
      }

      // High failure rate suggests execution issues
      if (failureRate > 0.2 && stats.completed + stats.failed >= 5) {
        suggestions.push({
          actionName,
          type: 'execution_review',
          reason: `High failure rate (${(failureRate * 100).toFixed(0)}%)`,
          confidence: Math.min((stats.completed + stats.failed) / 20, 1),
          recommendation: `Review execution logic for "${actionName}" - frequent failures detected`
        });
      }

      // Bounds violations
      if (boundsViolations[actionName]?.length > 2) {
        suggestions.push({
          actionName,
          type: 'bounds_expansion',
          reason: `Frequent bounds violations (${boundsViolations[actionName].length})`,
          violations: boundsViolations[actionName].slice(0, 3),
          confidence: 0.7,
          recommendation: `Consider expanding bounds for "${actionName}" or adding new action variant`
        });
      }
    });

    if (this.options.verbose && suggestions.length > 0) {
      console.log('\nBound Adjustment Suggestions:');
      suggestions.forEach((s, i) => {
        console.log(`  ${i + 1}. [${s.type}] ${s.actionName}`);
        console.log(`     ${s.recommendation}`);
      });
    }

    return suggestions;
  }

  /**
   * Store a learning in the database
   * @param {string} type - Learning type (pattern, threshold, bound_adjustment, etc.)
   * @param {object} insight - The insight data
   * @param {number} confidence - Confidence in the learning (0-1)
   * @returns {Promise<object>} Stored learning record
   */
  async storeLearning(type, insight, confidence = null) {
    const { data, error } = await this.supabase.rpc('store_agent_learning', {
      p_agent_id: this.agentId,
      p_learning_type: type,
      p_insight: insight,
      p_confidence: confidence,
      p_evidence_count: insight.evidenceCount || insight.samples || null,
      p_time_window_days: this.options.timeWindowDays
    });

    if (error) {
      console.error('Error storing learning:', error);
      throw error;
    }

    if (this.options.verbose) {
      console.log(`\nLearning stored: ${type}`);
      console.log(`  ID: ${data}`);
      console.log(`  Confidence: ${confidence?.toFixed(2) || 'N/A'}`);
    }

    return { id: data, type, insight, confidence };
  }

  /**
   * Get recent learnings for this agent
   * @param {number} limit - Max number of learnings to return
   * @returns {Promise<Array>} Recent learnings
   */
  async getRecentLearnings(limit = 10) {
    const { data, error } = await this.supabase
      .from('agent_learnings')
      .select('*')
      .eq('agent_id', this.agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting learnings:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get unapplied learnings that should be reviewed
   * @returns {Promise<Array>} Unapplied learnings
   */
  async getUnappliedLearnings() {
    const { data, error } = await this.supabase
      .from('agent_learnings')
      .select('*')
      .eq('agent_id', this.agentId)
      .eq('applied', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('confidence', { ascending: false });

    if (error) {
      console.error('Error getting unapplied learnings:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Mark a learning as applied
   * @param {string} learningId - Learning ID
   * @param {string} appliedBy - Who applied it
   * @param {object} result - Result of applying the learning
   */
  async markLearningApplied(learningId, appliedBy, result = null) {
    const { error } = await this.supabase.rpc('apply_agent_learning', {
      p_learning_id: learningId,
      p_applied_by: appliedBy,
      p_application_result: result
    });

    if (error) {
      console.error('Error marking learning applied:', error);
      throw error;
    }
  }

  /**
   * Run full learning cycle - analyze and store all learnings
   * @returns {Promise<object>} Summary of generated learnings
   */
  async runLearningCycle() {
    const results = {
      agentId: this.agentId,
      timestamp: new Date().toISOString(),
      learnings: []
    };

    // 1. Analyze performance
    const performance = await this.analyzePerformance();
    if (performance.healthScore < 80) {
      const learning = await this.storeLearning('pattern', {
        type: 'performance_alert',
        healthScore: performance.healthScore,
        summary: performance.summary,
        metrics: {
          approvalRate: performance.proposals.approvalRate,
          executionSuccess: performance.executions.successRate
        }
      }, performance.healthScore / 100);
      results.learnings.push(learning);
    }

    // 2. Calculate threshold
    const threshold = await this.calculateThreshold();
    if (threshold.suggestedThreshold && threshold.confidenceInSuggestion > 0.5) {
      const learning = await this.storeLearning('threshold', {
        suggestedThreshold: threshold.suggestedThreshold,
        currentApprovalRate: threshold.currentApprovalRate,
        samples: threshold.samplesAnalyzed,
        reason: threshold.reason
      }, threshold.confidenceInSuggestion);
      results.learnings.push(learning);
    }

    // 3. Analyze rejection patterns
    const rejectionPatterns = await this.getRejectionPatterns();
    for (const pattern of rejectionPatterns.slice(0, 3)) {
      if (pattern.count >= 3) {
        const learning = await this.storeLearning('pattern', {
          type: 'rejection_pattern',
          action: pattern.actionName,
          trigger: pattern.trigger,
          frequency: pattern.count,
          commonReason: pattern.commonReason,
          recommendation: pattern.recommendation
        }, Math.min(pattern.count / 10, 1));
        results.learnings.push(learning);
      }
    }

    // 4. Suggest bound adjustments
    const adjustments = await this.suggestBoundAdjustments();
    for (const adjustment of adjustments) {
      const learning = await this.storeLearning('bound_adjustment', {
        action: adjustment.actionName,
        adjustmentType: adjustment.type,
        reason: adjustment.reason,
        recommendation: adjustment.recommendation
      }, adjustment.confidence);
      results.learnings.push(learning);
    }

    if (this.options.verbose) {
      console.log(`\nLearning Cycle Complete:`);
      console.log(`  Generated: ${results.learnings.length} learnings`);
    }

    return results;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  async _getProposalMetrics(cutoff) {
    const { data: proposals } = await this.supabase
      .from('agent_proposals')
      .select('status, reasoning')
      .eq('agent_id', this.agentId)
      .gte('created_at', cutoff);

    if (!proposals || proposals.length === 0) {
      return { total: 0, approved: 0, rejected: 0, approvalRate: null };
    }

    const total = proposals.length;
    const approved = proposals.filter(p => p.status === 'approved' || p.status === 'completed').length;
    const rejected = proposals.filter(p => p.status === 'rejected').length;
    const decidedTotal = approved + rejected;

    return {
      total,
      approved,
      rejected,
      completed: proposals.filter(p => p.status === 'completed').length,
      failed: proposals.filter(p => p.status === 'failed').length,
      pending: proposals.filter(p => p.status === 'pending').length,
      approvalRate: decidedTotal > 0 ? (approved / decidedTotal) * 100 : null,
      avgConfidence: proposals.reduce((sum, p) => sum + (parseFloat(p.reasoning?.confidence) || 0), 0) / total
    };
  }

  async _getExecutionMetrics(cutoff) {
    const { data: executions } = await this.supabase
      .from('autonomous_executions')
      .select('success, confidence, review_outcome, within_bounds')
      .eq('agent_id', this.agentId)
      .gte('created_at', cutoff);

    if (!executions || executions.length === 0) {
      return { total: 0, successful: 0, successRate: null };
    }

    const total = executions.length;
    const successful = executions.filter(e => e.success).length;
    const reviewed = executions.filter(e => e.review_outcome !== null);
    const correct = reviewed.filter(e => e.review_outcome === 'correct').length;

    return {
      total,
      successful,
      failed: total - successful,
      successRate: (successful / total) * 100,
      reviewed: reviewed.length,
      reviewedCorrect: correct,
      reviewedIncorrect: reviewed.filter(e => e.review_outcome === 'incorrect').length,
      accuracyRate: reviewed.length > 0 ? (correct / reviewed.length) * 100 : null,
      boundsViolations: executions.filter(e => !e.within_bounds).length,
      avgConfidence: executions.reduce((sum, e) => sum + (e.confidence || 0), 0) / total
    };
  }

  async _getDecisionMetrics() {
    const { data, error } = await this.supabase.rpc('get_decision_quality_metrics', {
      p_agent_id: this.agentId,
      p_days: this.options.timeWindowDays
    });

    if (error || !data || data.length === 0) {
      return { total: 0, accuracyRate: null };
    }

    // Aggregate across decision types
    const totals = data.reduce((acc, d) => ({
      total: acc.total + parseInt(d.total_decisions || 0),
      withFeedback: acc.withFeedback + parseInt(d.with_feedback || 0),
      correct: acc.correct + parseInt(d.correct_decisions || 0),
      incorrect: acc.incorrect + parseInt(d.incorrect_decisions || 0)
    }), { total: 0, withFeedback: 0, correct: 0, incorrect: 0 });

    return {
      total: totals.total,
      withFeedback: totals.withFeedback,
      correct: totals.correct,
      incorrect: totals.incorrect,
      accuracyRate: totals.withFeedback > 0 ? (totals.correct / totals.withFeedback) * 100 : null,
      byType: data
    };
  }

  _calculateHealthScore(proposals, executions, decisions) {
    let score = 100;
    let factors = [];

    // Factor 1: Approval rate (if applicable)
    if (proposals.approvalRate !== null) {
      if (proposals.approvalRate < 70) {
        score -= (70 - proposals.approvalRate) * 0.3;
        factors.push(`Low approval rate: ${proposals.approvalRate.toFixed(0)}%`);
      }
    }

    // Factor 2: Execution success rate
    if (executions.successRate !== null) {
      if (executions.successRate < 90) {
        score -= (90 - executions.successRate) * 0.4;
        factors.push(`Execution issues: ${executions.successRate.toFixed(0)}% success`);
      }
    }

    // Factor 3: Decision accuracy
    if (decisions.accuracyRate !== null) {
      if (decisions.accuracyRate < 80) {
        score -= (80 - decisions.accuracyRate) * 0.3;
        factors.push(`Decision accuracy: ${decisions.accuracyRate.toFixed(0)}%`);
      }
    }

    // Factor 4: Bounds violations
    if (executions.boundsViolations > 3) {
      score -= executions.boundsViolations * 2;
      factors.push(`${executions.boundsViolations} bounds violations`);
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      factors
    };
  }

  _generateSummary(proposals, executions, decisions) {
    const parts = [];

    if (proposals.total > 0) {
      parts.push(`${proposals.total} proposals (${proposals.approvalRate?.toFixed(0)}% approved)`);
    }

    if (executions.total > 0) {
      parts.push(`${executions.total} executions (${executions.successRate?.toFixed(0)}% successful)`);
    }

    if (decisions.total > 0) {
      parts.push(`${decisions.total} decisions (${decisions.accuracyRate?.toFixed(0)}% accurate)`);
    }

    return parts.join(', ') || 'No activity in time window';
  }

  async _calculateThresholdManually(actionName) {
    const cutoff = new Date(Date.now() - this.options.timeWindowDays * 24 * 60 * 60 * 1000).toISOString();

    let query = this.supabase
      .from('agent_proposals')
      .select('status, reasoning')
      .eq('agent_id', this.agentId)
      .gte('created_at', cutoff)
      .in('status', ['approved', 'rejected']);

    if (actionName) {
      query = query.eq('action_name', actionName);
    }

    const { data: proposals } = await query;

    if (!proposals || proposals.length < this.options.minSamples) {
      return {
        suggestedThreshold: null,
        reason: `Insufficient samples (${proposals?.length || 0}/${this.options.minSamples} required)`
      };
    }

    const approved = proposals.filter(p => p.status === 'approved');
    const rejected = proposals.filter(p => p.status === 'rejected');

    const avgApproved = approved.reduce((sum, p) => sum + (parseFloat(p.reasoning?.confidence) || 0), 0) / (approved.length || 1);
    const avgRejected = rejected.reduce((sum, p) => sum + (parseFloat(p.reasoning?.confidence) || 0), 0) / (rejected.length || 1);

    const threshold = rejected.length > 0 ? (avgApproved + avgRejected) / 2 : Math.max(avgApproved - 0.1, 0.5);

    return {
      suggestedThreshold: parseFloat(threshold.toFixed(2)),
      currentApprovalRate: (approved.length / proposals.length) * 100,
      samplesAnalyzed: proposals.length,
      confidenceInSuggestion: Math.min(proposals.length / 50, 1),
      reason: `Based on ${approved.length} approvals (avg conf: ${avgApproved.toFixed(2)}) and ${rejected.length} rejections (avg conf: ${avgRejected.toFixed(2)})`
    };
  }

  _explainThreshold(result) {
    const threshold = parseFloat(result.suggested_threshold);
    const approvalRate = parseFloat(result.current_approval_rate);

    if (approvalRate > 90) {
      return `High approval rate (${approvalRate.toFixed(0)}%) suggests threshold of ${threshold.toFixed(2)} is appropriate`;
    } else if (approvalRate < 60) {
      return `Low approval rate (${approvalRate.toFixed(0)}%) - raising threshold to ${threshold.toFixed(2)} may reduce rejections`;
    } else {
      return `Moderate approval rate (${approvalRate.toFixed(0)}%) - threshold of ${threshold.toFixed(2)} balances autonomy and oversight`;
    }
  }

  _generateApprovalRecommendation(pattern) {
    const confidence = parseFloat(pattern.avg_confidence);
    const successRate = parseFloat(pattern.success_rate);

    if (confidence > 0.9 && successRate > 90) {
      return `Consider increasing autonomy for ${pattern.action_name} with trigger ${pattern.trigger_type}`;
    } else if (successRate < 70) {
      return `Review execution quality for ${pattern.action_name} - approvals not leading to successful outcomes`;
    }
    return `Maintain current settings for ${pattern.action_name}`;
  }

  _generateRejectionRecommendation(pattern) {
    const count = parseInt(pattern.rejection_count);
    const confidence = parseFloat(pattern.avg_confidence);

    if (count > 5 && confidence > 0.8) {
      return `High-confidence rejections suggest improving context or criteria for ${pattern.action_name}`;
    } else if (pattern.common_reason) {
      return `Address common rejection reason: "${pattern.common_reason}"`;
    }
    return `Review rejection criteria for ${pattern.action_name} with trigger ${pattern.trigger_type}`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AgentLearning;

// ============================================================================
// CLI
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];
  const agentId = args[1] || 'all';

  console.log('Agent Learning System');
  console.log('='.repeat(50));

  if (!defaultSupabase) {
    console.error('\nError: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const learning = new AgentLearning(agentId, defaultSupabase, { verbose: true });

  switch (command) {
    case 'analyze':
      console.log(`\nAnalyzing agent: ${agentId}\n`);
      await learning.analyzePerformance();
      break;

    case 'threshold':
      console.log(`\nCalculating threshold for: ${agentId}\n`);
      await learning.calculateThreshold(args[2] || null);
      break;

    case 'patterns':
      console.log(`\nAnalyzing patterns for: ${agentId}\n`);
      await learning.getApprovalPatterns();
      await learning.getRejectionPatterns();
      break;

    case 'bounds':
      console.log(`\nSuggesting bound adjustments for: ${agentId}\n`);
      await learning.suggestBoundAdjustments();
      break;

    case 'cycle':
      console.log(`\nRunning full learning cycle for: ${agentId}\n`);
      const results = await learning.runLearningCycle();
      console.log(`\nGenerated ${results.learnings.length} learnings`);
      break;

    case 'learnings':
      console.log(`\nRecent learnings for: ${agentId}\n`);
      const learnings = await learning.getRecentLearnings(10);
      learnings.forEach((l, i) => {
        console.log(`${i + 1}. [${l.learning_type}] ${l.insight?.type || l.insight?.action || 'insight'}`);
        console.log(`   Confidence: ${l.confidence?.toFixed(2) || 'N/A'}`);
        console.log(`   Applied: ${l.applied ? 'Yes' : 'No'}`);
        console.log(`   Created: ${new Date(l.created_at).toLocaleString()}`);
      });
      break;

    default:
      console.log(`
Usage:
  node scripts/lib/agent-learning.mjs analyze <agent-id>     Analyze agent performance
  node scripts/lib/agent-learning.mjs threshold <agent-id>   Calculate optimal threshold
  node scripts/lib/agent-learning.mjs patterns <agent-id>    Show approval/rejection patterns
  node scripts/lib/agent-learning.mjs bounds <agent-id>      Suggest bound adjustments
  node scripts/lib/agent-learning.mjs cycle <agent-id>       Run full learning cycle
  node scripts/lib/agent-learning.mjs learnings <agent-id>   Show recent learnings

Examples:
  node scripts/lib/agent-learning.mjs analyze cultivator
  node scripts/lib/agent-learning.mjs threshold morning-brief sync_contacts
  node scripts/lib/agent-learning.mjs cycle all
`);
  }
}
