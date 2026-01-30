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
import { MemoryLifecycle } from './memory-lifecycle.mjs';
import { ProceduralMemory } from './procedural-memory.mjs';
import { EpisodicMemory } from './episodic-memory.mjs';

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

    // Wrap entire cycle in an episodic memory episode
    let episode = null;
    let episodicMemory = null;
    try {
      episodicMemory = new EpisodicMemory({ supabase: this.supabase, verbose: this.options.verbose });
      episode = await episodicMemory.createEpisode(
        `Learning cycle: ${this.agentId}`,
        'learning_journey',
        { summary: `Automated learning cycle for agent ${this.agentId}` }
      );
    } catch (err) {
      // Non-critical — episodic memory tables may not be deployed yet
    }

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

    // 5. Memory consolidation — find and flag near-duplicate knowledge (Phase 1)
    try {
      const lifecycle = new MemoryLifecycle({ verbose: this.options.verbose });
      const candidates = await lifecycle.findConsolidationCandidates(5);
      if (candidates.length > 0) {
        const learning = await this.storeLearning('pattern', {
          type: 'consolidation_candidates',
          candidateCount: candidates.length,
          groups: candidates.map(c => ({
            chunkCount: c.totalChunks,
            preview: c.primaryContent?.substring(0, 80)
          }))
        }, 0.7);
        results.learnings.push(learning);
      }
    } catch (err) {
      // Non-critical — consolidation tables may not be deployed yet
    }

    // 6. Procedural extraction — detect repeated action patterns (Phase 5)
    try {
      const pm = new ProceduralMemory({ verbose: this.options.verbose });
      const procedure = await pm.extractFromLearnings(this.agentId, null);
      if (procedure) {
        const learning = await this.storeLearning('pattern', {
          type: 'procedure_candidate',
          stepCount: procedure.steps.length,
          description: procedure.description
        }, 0.6);
        results.learnings.push(learning);
      }
    } catch (err) {
      // Non-critical — procedural memory tables may not be deployed yet
    }

    // 7. Detect repeated mistakes and auto-create correction rules
    try {
      const mistakePatterns = await this.detectRepeatedMistakes();
      for (const pattern of mistakePatterns) {
        const patternId = pattern.id;
        // Auto-create correction rules for newly detected patterns
        if (patternId && pattern.status === 'active') {
          try {
            await this.createCorrectionRule(patternId);
            if (episode && episodicMemory) {
              await episodicMemory.addEventToEpisode(episode.id, {
                event_type: 'correction_rule_created',
                description: `Created correction rule for ${pattern.action_name} (${pattern.mistake_category})`
              });
            }
          } catch (ruleErr) {
            // Non-critical — continue with other patterns
          }
        }
        results.learnings.push({
          type: 'mistake_pattern',
          insight: {
            action: pattern.action_name,
            category: pattern.mistake_category,
            occurrences: pattern.occurrence_count
          },
          confidence: Math.min((pattern.occurrence_count || 3) / 10, 1)
        });
      }
    } catch (err) {
      // Non-critical — mistake detection tables may not be deployed yet
    }

    // 8. Calibrate confidence
    try {
      const calibration = await this.calibrateConfidence();
      if (calibration) {
        const learning = await this.storeLearning('calibration', {
          ece: calibration.ece,
          adjustment: calibration.adjustment,
          totalActions: calibration.totalActions,
          direction: calibration.adjustment < 0 ? 'overconfident' : calibration.adjustment > 0 ? 'underconfident' : 'well-calibrated'
        }, 1 - calibration.ece);
        results.learnings.push(learning);

        if (episode && episodicMemory) {
          await episodicMemory.addEventToEpisode(episode.id, {
            event_type: 'calibration_complete',
            description: `ECE: ${calibration.ece.toFixed(4)}, adjustment: ${calibration.adjustment.toFixed(3)}`
          });
        }
      }
    } catch (err) {
      // Non-critical — calibration tables may not be deployed yet
    }

    // 9. Evaluate autonomy adjustments
    try {
      const autonomyTransitions = await this.evaluateAutonomyAdjustments();
      for (const transition of autonomyTransitions) {
        results.learnings.push({
          type: 'autonomy_proposal',
          insight: {
            action: transition.action_name,
            currentLevel: transition.current_level,
            suggestedLevel: transition.suggested_level,
            direction: transition.change_direction,
            reason: transition.reason
          },
          confidence: transition.confidence
        });
      }

      if (episode && episodicMemory && autonomyTransitions.length > 0) {
        await episodicMemory.addEventToEpisode(episode.id, {
          event_type: 'autonomy_evaluation',
          description: `${autonomyTransitions.length} autonomy change(s) proposed`
        });
      }
    } catch (err) {
      // Non-critical — autonomy tables may not be deployed yet
    }

    // Close the episode with outcome summary
    if (episode && episodicMemory) {
      try {
        const outcomeParts = [
          `${results.learnings.length} learnings generated`
        ];
        const lessons = results.learnings
          .filter(l => l.type === 'mistake_pattern' || l.type === 'calibration')
          .map(l => l.insight?.action || l.insight?.direction || l.type)
          .filter(Boolean);

        await episodicMemory.closeEpisode(
          episode.id,
          outcomeParts.join('. '),
          lessons
        );
      } catch (err) {
        // Non-critical
      }
    }

    if (this.options.verbose) {
      console.log(`\nLearning Cycle Complete:`);
      console.log(`  Generated: ${results.learnings.length} learnings`);
    }

    return results;
  }

  // ============================================================================
  // REPEATED MISTAKE DETECTION & CONFIDENCE CALIBRATION
  // ============================================================================

  /**
   * Detect repeated mistakes by calling the detect_repeated_mistakes RPC.
   * For each result, creates or updates an agent_mistake_patterns record.
   * @param {number} windowDays - Optional override for time window
   * @returns {Promise<Array>} Detected mistake patterns
   */
  async detectRepeatedMistakes(windowDays = null) {
    const days = windowDays || this.options.timeWindowDays || 30;

    const { data, error } = await this.supabase.rpc('detect_repeated_mistakes', {
      p_agent_id: this.agentId,
      p_min_occurrences: 3,
      p_window_days: days
    });

    if (error || !data) return [];

    const patterns = [];

    for (const row of data) {
      // Check if an active pattern already exists for this agent/action/category
      const { data: existing } = await this.supabase
        .from('agent_mistake_patterns')
        .select('*')
        .eq('agent_id', this.agentId)
        .eq('action_name', row.action_name)
        .eq('mistake_category', row.mistake_category)
        .eq('status', 'active')
        .limit(1);

      const existingPattern = existing && existing.length > 0 ? existing[0] : null;

      if (existingPattern) {
        // Update existing pattern
        const { data: updated } = await this.supabase
          .from('agent_mistake_patterns')
          .update({
            occurrence_count: row.occurrence_count,
            last_seen_at: row.last_seen,
            feedback_record_ids: row.feedback_record_ids,
            common_feedback: row.common_feedback
          })
          .eq('id', existingPattern.id)
          .select()
          .single();

        patterns.push(updated || { ...existingPattern, occurrence_count: row.occurrence_count });
      } else {
        // Insert new pattern
        const { data: inserted } = await this.supabase
          .from('agent_mistake_patterns')
          .insert({
            agent_id: this.agentId,
            action_name: row.action_name,
            mistake_category: row.mistake_category,
            occurrence_count: row.occurrence_count,
            first_seen_at: row.first_seen,
            last_seen_at: row.last_seen,
            feedback_record_ids: row.feedback_record_ids,
            common_feedback: row.common_feedback,
            status: 'active'
          })
          .select()
          .single();

        patterns.push(inserted || row);
      }
    }

    if (this.options.verbose && patterns.length > 0) {
      console.log(`\nRepeated Mistakes Detected: ${patterns.length}`);
      patterns.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.action_name} [${p.mistake_category}]: ${p.occurrence_count} occurrences`);
      });
    }

    return patterns;
  }

  /**
   * Calibrate confidence by computing Expected Calibration Error (ECE).
   * Calls the calculate_calibration RPC and stores results.
   * @returns {Promise<object|null>} Calibration result with ECE, adjustment, and buckets
   */
  async calibrateConfidence() {
    const { data, error } = await this.supabase.rpc('calculate_calibration', {
      p_agent_id: this.agentId,
      p_window_days: this.options.timeWindowDays || 30
    });

    if (error || !data || data.length === 0) return null;

    // Calculate ECE: weighted sum of |calibration_gap| per bucket
    const totalActions = data.reduce((sum, b) => sum + (b.action_count || 0), 0);
    if (totalActions === 0) return null;

    const ece = data.reduce((sum, b) => {
      const weight = b.action_count / totalActions;
      return sum + weight * Math.abs(b.calibration_gap);
    }, 0);

    // Determine adjustment direction from weighted average gap
    const weightedGap = data.reduce((sum, b) => {
      const weight = b.action_count / totalActions;
      return sum + weight * b.calibration_gap;
    }, 0);

    // Positive gap means underconfident (actual > predicted) -> positive adjustment
    // Negative gap means overconfident (predicted > actual) -> negative adjustment
    let adjustment = weightedGap;

    // Cap adjustment at 0.15
    if (adjustment > 0.15) adjustment = 0.15;
    if (adjustment < -0.15) adjustment = -0.15;

    const result = {
      ece,
      adjustment,
      buckets: data,
      totalActions
    };

    // Store calibration result
    try {
      await this.supabase
        .from('agent_confidence_calibration')
        .insert({
          agent_id: this.agentId,
          ece,
          adjustment,
          bucket_data: data,
          total_actions: totalActions,
          window_days: this.options.timeWindowDays || 30,
          calculated_at: new Date().toISOString()
        });
    } catch (storeErr) {
      // Non-critical: table may not exist yet
    }

    if (this.options.verbose) {
      console.log(`\nConfidence Calibration:`);
      console.log(`  ECE: ${ece.toFixed(4)}`);
      console.log(`  Adjustment: ${adjustment.toFixed(3)}`);
      console.log(`  Direction: ${adjustment < 0 ? 'overconfident' : adjustment > 0 ? 'underconfident' : 'well-calibrated'}`);
      console.log(`  Total actions: ${totalActions}`);
    }

    return result;
  }

  /**
   * Evaluate autonomy level adjustments for all actions of this agent.
   * Calls evaluate_autonomy_change RPC for each action and creates
   * agent_autonomy_transitions proposals for recommended changes.
   * @returns {Promise<Array>} Proposed autonomy transitions
   */
  async evaluateAutonomyAdjustments() {
    // Get all actions for this agent
    const { data: actions, error: actionsError } = await this.supabase
      .from('agent_actions')
      .select('action_name, autonomy_level')
      .eq('agent_id', this.agentId);

    if (actionsError || !actions || actions.length === 0) return [];

    const transitions = [];

    for (const action of actions) {
      const { data: evaluation, error: evalError } = await this.supabase.rpc('evaluate_autonomy_change', {
        p_agent_id: this.agentId,
        p_action_name: action.action_name,
        p_window_days: this.options.timeWindowDays || 30
      });

      if (evalError || !evaluation) continue;

      const result = Array.isArray(evaluation) ? evaluation[0] : evaluation;
      if (!result || !result.recommended_change || result.recommended_change === 'none') continue;

      // Create a transition proposal
      const proposal = {
        agent_id: this.agentId,
        action_name: action.action_name,
        current_level: result.current_level || action.autonomy_level,
        suggested_level: result.suggested_level,
        change_direction: result.recommended_change,
        reason: result.reason,
        confidence: result.confidence || 0.5,
        status: 'proposed',
        proposed_at: new Date().toISOString()
      };

      try {
        await this.supabase
          .from('agent_autonomy_transitions')
          .insert(proposal);
      } catch (insertErr) {
        // Non-critical: table may not exist yet
      }

      transitions.push(proposal);
    }

    if (this.options.verbose && transitions.length > 0) {
      console.log(`\nAutonomy Adjustment Proposals: ${transitions.length}`);
      transitions.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.action_name}: ${t.current_level} -> ${t.suggested_level} (${t.change_direction})`);
        console.log(`     Reason: ${t.reason}`);
      });
    }

    return transitions;
  }

  /**
   * Create a correction rule from a mistake pattern.
   * Reads the pattern, fetches feedback records, creates a procedural memory
   * rule, and marks the pattern as mitigated.
   * @param {string} patternId - The mistake pattern ID
   * @returns {Promise<object>} The created procedural memory rule
   */
  async createCorrectionRule(patternId) {
    // Read the mistake pattern
    const { data: pattern, error: patternError } = await this.supabase
      .from('agent_mistake_patterns')
      .select('*')
      .eq('id', patternId)
      .single();

    if (patternError || !pattern) {
      throw new Error(`Mistake pattern not found: ${patternId}`);
    }

    // Fetch feedback records for context
    const feedbackIds = pattern.feedback_record_ids || [];
    let feedbackRecords = [];
    if (feedbackIds.length > 0) {
      const { data: feedback } = await this.supabase
        .from('agent_feedback')
        .select('*')
        .in('id', feedbackIds);
      feedbackRecords = feedback || [];
    }

    // Build correction rule as a procedural memory entry
    const feedbackSummary = feedbackRecords
      .map(f => f.details?.message || f.feedback_type)
      .filter(Boolean)
      .join('; ');

    const pm = new ProceduralMemory({ supabase: this.supabase, verbose: this.options.verbose });
    const rule = await pm.createProcedure(
      `correction-${pattern.action_name}-${pattern.mistake_category}`,
      this.agentId,
      {
        description: `Auto-generated correction rule for ${pattern.action_name} mistake: ${pattern.mistake_category}. Based on ${pattern.occurrence_count} occurrences. Feedback: ${feedbackSummary}`,
        steps: [
          {
            step: 1,
            action: 'check_precondition',
            description: `Before ${pattern.action_name}, verify conditions to avoid ${pattern.mistake_category}`,
            conditions: { action_name: pattern.action_name }
          },
          {
            step: 2,
            action: 'apply_correction',
            description: `Apply learned correction: ${feedbackSummary || pattern.common_feedback || 'review before proceeding'}`,
            conditions: {}
          }
        ],
        preconditions: {
          trigger: pattern.action_name,
          mistake_category: pattern.mistake_category
        },
        status: 'active'
      }
    );

    // Update pattern status to mitigated
    await this.supabase
      .from('agent_mistake_patterns')
      .update({
        status: 'mitigated',
        mitigated_at: new Date().toISOString(),
        correction_rule_id: rule?.id || null
      })
      .eq('id', patternId);

    if (this.options.verbose) {
      console.log(`\nCorrection rule created for pattern ${patternId}:`);
      console.log(`  Action: ${pattern.action_name}`);
      console.log(`  Category: ${pattern.mistake_category}`);
      console.log(`  Rule: ${rule?.id || 'created'}`);
    }

    return rule;
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
