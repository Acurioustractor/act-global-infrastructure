#!/usr/bin/env node
/**
 * Agentic Workflow System
 *
 * Enables bounded autonomy for ACT agents:
 * - Level 1: Manual (agent suggests, human executes)
 * - Level 2: Supervised (agent proposes, human approves, agent executes)
 * - Level 3: Autonomous (agent executes within bounds, logs for review)
 *
 * Usage:
 *   import { AgenticWorkflow } from './lib/agentic-workflow.mjs';
 *
 *   const workflow = new AgenticWorkflow('my-agent');
 *
 *   // Propose a task (Level 2)
 *   await workflow.propose({
 *     action: 'sync_contacts',
 *     title: 'Sync 50 new contacts from GHL',
 *     reasoning: { trigger: 'new_contacts_detected', confidence: 0.9 },
 *     params: { source: 'ghl', limit: 50 }
 *   });
 *
 *   // Execute autonomously (Level 3)
 *   await workflow.executeAutonomous({
 *     action: 'generate_report',
 *     reasoning: { trigger: 'scheduled', confidence: 1.0 },
 *     params: { type: 'morning_brief' },
 *     execute: async () => { ... }
 *   });
 */

import { createClient } from '@supabase/supabase-js';
import '../../lib/load-env.mjs';
import { KnowledgeGraph } from './knowledge-graph.mjs';
import { ProceduralMemory } from './procedural-memory.mjs';
import { WorkingMemory } from './working-memory.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENTIC WORKFLOW CLASS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class AgenticWorkflow {
  constructor(agentId, options = {}) {
    this.agentId = agentId;
    this.version = options.version || '1.0.0';
    this.verbose = options.verbose || false;
    this.knowledgeGraph = new KnowledgeGraph({ verbose: this.verbose });
    this.workingMemory = new WorkingMemory({ verbose: this.verbose });
  }

  /**
   * Propose a task for human approval (Level 2)
   */
  async propose(task) {
    const {
      action,
      title,
      description,
      reasoning,
      params,
      priority = 'normal',
      deadline = null,
      expectedOutcome = null
    } = task;

    // Get action details
    const actionDetails = await this.getAction(action);
    if (!actionDetails) {
      throw new Error(`Unknown action: ${action}`);
    }

    // Check autonomy level
    if (actionDetails.autonomy_level === 3) {
      if (this.verbose) {
        console.log(`Action '${action}' is autonomous (Level 3) - consider using executeAutonomous()`);
      }
    }

    // Check bounds
    const boundsCheck = await this.checkBounds(action, params);

    // Create proposal
    const { data, error } = await supabase
      .from('agent_proposals')
      .insert({
        agent_id: this.agentId,
        agent_version: this.version,
        action_id: actionDetails.id,
        action_name: action,
        title,
        description,
        reasoning: {
          ...reasoning,
          bounds_check: boundsCheck
        },
        proposed_action: params,
        expected_outcome: expectedOutcome,
        impact_assessment: {
          autonomy_level: actionDetails.autonomy_level,
          risk_level: actionDetails.risk_level,
          reversible: actionDetails.reversible,
          within_bounds: boundsCheck.within_bounds
        },
        priority,
        deadline
      })
      .select()
      .single();

    if (error) throw error;

    if (this.verbose) {
      console.log(`📋 Proposal created: ${data.id}`);
      console.log(`   Title: ${title}`);
      console.log(`   Priority: ${priority}`);
      console.log(`   Status: pending (awaiting human review)`);
    }

    return {
      proposalId: data.id,
      status: 'pending',
      action,
      autonomyLevel: actionDetails.autonomy_level
    };
  }

  /**
   * Check if a proposal has been approved
   */
  async checkApproval(proposalId) {
    const { data, error } = await supabase
      .from('agent_proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (error) throw error;

    return {
      status: data.status,
      approved: data.status === 'approved',
      rejected: data.status === 'rejected',
      reviewedBy: data.reviewed_by,
      reviewNotes: data.review_notes,
      modifiedAction: data.modified_action
    };
  }

  /**
   * Execute an approved proposal
   */
  async executeApproved(proposalId, executeFn) {
    // Check approval
    const approval = await this.checkApproval(proposalId);

    if (!approval.approved) {
      throw new Error(`Proposal ${proposalId} is not approved (status: ${approval.status})`);
    }

    // Mark as executing
    await supabase
      .from('agent_proposals')
      .update({
        status: 'executing',
        execution_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId);

    const start = Date.now();
    let result, success, errorMsg;

    try {
      // Get the action params (possibly modified by human)
      const { data: proposal } = await supabase
        .from('agent_proposals')
        .select('proposed_action, modified_action')
        .eq('id', proposalId)
        .single();

      const params = proposal.modified_action || proposal.proposed_action;

      // Execute
      result = await executeFn(params);
      success = true;

    } catch (err) {
      success = false;
      errorMsg = err.message;
    }

    const duration = Date.now() - start;

    // Update proposal with result
    await supabase
      .from('agent_proposals')
      .update({
        status: success ? 'completed' : 'failed',
        execution_completed_at: new Date().toISOString(),
        execution_result: result ? JSON.parse(JSON.stringify(result)) : null,
        execution_error: errorMsg,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId);

    // Auto-link decision traces created during execution (Phase 2: Knowledge Graph)
    if (success) {
      try {
        const { data: traces } = await supabase
          .from('decision_traces')
          .select('id')
          .gte('created_at', new Date(start).toISOString())
          .limit(10);
        for (const trace of (traces || [])) {
          await this.knowledgeGraph.autoLinkDecision(trace.id).catch(() => {});
        }
      } catch (err) {
        // Non-critical — don't fail execution on graph linking errors
      }
    }

    if (this.verbose) {
      console.log(`${success ? '✅' : '❌'} Proposal ${proposalId} execution ${success ? 'completed' : 'failed'}`);
      console.log(`   Duration: ${duration}ms`);
    }

    return { success, result, error: errorMsg, duration };
  }

  /**
   * Execute autonomously (Level 3 actions only)
   */
  async executeAutonomous(task) {
    const {
      action,
      reasoning,
      params,
      execute
    } = task;

    // Get action details
    const actionDetails = await this.getAction(action);
    if (!actionDetails) {
      throw new Error(`Unknown action: ${action}`);
    }

    // Check autonomy level
    if (actionDetails.autonomy_level < 3) {
      throw new Error(
        `Action '${action}' requires approval (Level ${actionDetails.autonomy_level}). Use propose() instead.`
      );
    }

    // Check bounds
    const boundsCheck = await this.checkBounds(action, params);

    const start = Date.now();
    let result, success, errorMsg;

    try {
      result = await execute(params);
      success = true;
    } catch (err) {
      success = false;
      errorMsg = err.message;
    }

    const duration = Date.now() - start;
    const confidence = reasoning.confidence || 0.8;

    // Log autonomous execution
    const { data, error } = await supabase
      .from('autonomous_executions')
      .insert({
        agent_id: this.agentId,
        action_id: actionDetails.id,
        action_name: action,
        action_params: params,
        reasoning,
        confidence,
        result: result ? JSON.parse(JSON.stringify(result)) : null,
        success,
        error_message: errorMsg,
        duration_ms: duration,
        within_bounds: boundsCheck.within_bounds,
        bounds_violated: boundsCheck.within_bounds ? null : boundsCheck.violations
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log autonomous execution:', error);
    }

    if (this.verbose) {
      console.log(`${success ? '✅' : '❌'} Autonomous execution: ${action}`);
      console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);
      console.log(`   Within bounds: ${boundsCheck.within_bounds}`);
      console.log(`   Duration: ${duration}ms`);
      if (data?.flagged_for_review) {
        console.log(`   ⚠️ Flagged for human review`);
      }
    }

    return {
      executionId: data?.id,
      success,
      result,
      error: errorMsg,
      duration,
      flaggedForReview: data?.flagged_for_review
    };
  }

  /**
   * Consult learnings before executing an action.
   *
   * Checks mistake patterns, calibration adjustments, and procedural memory
   * correction rules to adjust confidence and surface warnings.
   *
   * @param {string} action - The action name about to be executed
   * @param {object} params - Parameters for the action
   * @param {number} confidence - The agent's current confidence (0-1)
   * @returns {Promise<{confidence: number, warnings: string[], blocked: boolean}>}
   */
  async consultLearnings(action, params, confidence) {
    const adjustments = { confidence, warnings: [], blocked: false };

    try {
      // 1. Check agent_mistake_patterns for active patterns matching this agent+action
      const { data: mistakes, error: mistakeErr } = await supabase
        .from('agent_mistake_patterns')
        .select('*')
        .eq('agent_id', this.agentId)
        .eq('action_name', action)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString());

      if (!mistakeErr && mistakes && mistakes.length > 0) {
        adjustments.confidence = Math.max(0.3, adjustments.confidence - 0.15);
        adjustments.warnings.push(
          ...mistakes.map(m => `Mistake pattern: ${m.pattern_description || m.pattern_type || 'known issue'}`)
        );
      }

      // 2. Check agent_confidence_calibration for latest adjustment
      const { data: calibrations, error: calErr } = await supabase
        .from('agent_confidence_calibration')
        .select('*')
        .eq('agent_id', this.agentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!calErr && calibrations && calibrations.length > 0) {
        const cal = calibrations[0];
        const adjustment = parseFloat(cal.adjustment || 0);
        if (Math.abs(adjustment) > 0.05) {
          adjustments.confidence = Math.max(0.3, adjustments.confidence + adjustment);
          adjustments.warnings.push(
            `Calibration adjustment: ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(2)}`
          );
        }
      }

      // 3. Check procedural memory for correction rules
      const pm = new ProceduralMemory({ verbose: this.verbose });
      const procedures = await pm.findApplicableProcedures(
        { trigger: action, agentId: this.agentId, confidence: adjustments.confidence },
        this.agentId
      );

      if (procedures && procedures.length > 0) {
        for (const proc of procedures) {
          if (proc.postconditions?.correction_rule) {
            adjustments.warnings.push(
              `Correction rule from procedure "${proc.procedure_name}": ${proc.postconditions.correction_rule}`
            );
          }
        }
      }
    } catch (err) {
      // Non-fatal: proceed without learning consultation on failure
      if (this.verbose) {
        console.log(`Learning consultation skipped: ${err.message}`);
      }
    }

    return adjustments;
  }

  /**
   * Smart execute - chooses propose() or executeAutonomous() based on action level
   */
  async execute(task) {
    const actionDetails = await this.getAction(task.action);

    if (!actionDetails) {
      throw new Error(`Unknown action: ${task.action}`);
    }

    // Initialize working memory for this execution session (Phase 3)
    const sessionId = `${this.agentId}-${Date.now()}`;
    try {
      await this.workingMemory.initSession(this.agentId, sessionId, {
        action: task.action,
        params: task.params,
        startedAt: new Date().toISOString()
      });
    } catch (err) {
      // Non-critical — continue without working memory
    }

    // Load relevant historical context via hybrid search (Phase 4)
    try {
      const context = await this.loadContext(task.action, task.params);
      if (context.length > 0) {
        await this.workingMemory.updateContext(this.agentId, sessionId, {
          historicalContext: context.map(c => ({
            content: c.content?.slice(0, 200),
            score: c.combined_score,
            source: c.source_type,
          })),
        }).catch(() => {});
      }
    } catch (err) {
      // Non-critical — proceed without historical context
    }

    // Consult learnings before routing (Phase 6: Learning Integration)
    const taskConfidence = task.reasoning?.confidence || 0.8;
    const learnings = await this.consultLearnings(task.action, task.params, taskConfidence);
    if (!task.reasoning) task.reasoning = {};
    task.reasoning.original_confidence = taskConfidence;
    task.reasoning.confidence = learnings.confidence;
    task.reasoning.learning_warnings = learnings.warnings;

    // Check bounds first
    const boundsCheck = await this.checkBounds(task.action, task.params);

    // If out of bounds, always require approval
    if (!boundsCheck.within_bounds) {
      if (this.verbose) {
        console.log(`⚠️ Action '${task.action}' exceeds bounds - requiring approval`);
      }
      return this.propose(task);
    }

    // Route based on autonomy level
    switch (actionDetails.autonomy_level) {
      case 1:
        // Level 1: Manual - just log the suggestion
        return this.suggest(task);

      case 2:
        // Level 2: Supervised - create proposal
        return this.propose(task);

      case 3:
        // Level 3: Autonomous - execute directly
        if (!task.execute) {
          throw new Error('Level 3 actions require an execute function');
        }
        return this.executeAutonomous(task);

      default:
        return this.propose(task);
    }
  }

  /**
   * Suggest an action (Level 1 - human must execute)
   */
  async suggest(task) {
    const suggestion = {
      agent_id: this.agentId,
      action: task.action,
      title: task.title,
      description: task.description,
      reasoning: task.reasoning,
      params: task.params,
      suggested_at: new Date().toISOString()
    };

    // Log to decision traces
    await supabase
      .from('decision_traces')
      .insert({
        decision_type: 'suggestion',
        input_context: { task },
        reasoning: task.reasoning?.explanation || 'Agent suggestion',
        decision: suggestion,
        confidence: task.reasoning?.confidence || 0.5
      });

    if (this.verbose) {
      console.log(`💡 Suggestion logged: ${task.title}`);
      console.log(`   Action: ${task.action}`);
      console.log(`   Human action required`);
    }

    return {
      type: 'suggestion',
      action: task.action,
      title: task.title,
      params: task.params
    };
  }

  /**
   * Load relevant context for an action using hybrid memory search (Phase 4)
   *
   * Combines vector similarity, knowledge graph, and decay scoring to find
   * the most relevant prior knowledge for an agent's current task.
   */
  async loadContext(action, params, options = {}) {
    const limit = options.limit || 10;
    const query = `${action} ${params?.query || ''} ${params?.type || ''}`.trim();

    try {
      // Generate embedding for the query
      const { trackedBatchEmbedding: embed } = await import('./llm-client.mjs');
      const [embedding] = await embed([query], 'agentic-workflow');

      // Use hybrid memory search — combines vector + graph + decay
      const { data, error } = await supabase.rpc('hybrid_memory_search', {
        query_embedding: embedding,
        match_count: limit,
        vector_weight: options.vectorWeight || 0.6,
        freshness_weight: options.freshnessWeight || 0.2,
        graph_weight: options.graphWeight || 0.2,
        min_score: options.minScore || 0.3,
      });

      if (error) {
        if (this.verbose) console.log(`Hybrid search unavailable: ${error.message}`);
        return [];
      }

      if (this.verbose && data?.length > 0) {
        console.log(`📚 Loaded ${data.length} context items via hybrid search`);
      }

      return data || [];
    } catch (err) {
      // Non-critical — agent can proceed without historical context
      if (this.verbose) console.log(`Context loading skipped: ${err.message}`);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────

  async getAction(actionName) {
    const { data, error } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('action_name', actionName)
      .eq('enabled', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching action:', error);
    }

    return data;
  }

  async checkBounds(actionName, params) {
    const { data, error } = await supabase
      .rpc('check_action_bounds', {
        p_action_name: actionName,
        p_params: params || {}
      });

    if (error) {
      console.error('Error checking bounds:', error);
      return { within_bounds: true, violations: [] };
    }

    return data;
  }

  /**
   * Get pending proposals for this agent
   */
  async getPendingProposals() {
    const { data, error } = await supabase
      .from('agent_proposals')
      .select('*')
      .eq('agent_id', this.agentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Get approved proposals ready for execution
   */
  async getApprovedProposals() {
    const { data, error } = await supabase
      .from('agent_proposals')
      .select('*')
      .eq('agent_id', this.agentId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // ─────────────────────────────────────────────────────────────────────
  // MULTI-AGENT COORDINATION
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Spawn a sub-task for another agent
   *
   * @param {string} targetAgentId - The agent to delegate to (e.g., 'scout', 'analyst')
   * @param {string} actionName - The action the target agent should perform
   * @param {object} params - Parameters for the action
   * @param {object} context - Additional context to pass to the sub-task
   * @returns {Promise<{subTaskId: string, targetAgent: string, status: string}>}
   *
   * @example
   * // Cultivator spawns Scout for research
   * const subTask = await workflow.spawnSubTask('scout', 'research_contact', {
   *   contactId: 'abc123',
   *   query: 'recent activity'
   * }, { parentContext: 'relationship health check' });
   */
  async spawnSubTask(targetAgentId, actionName, params, context = {}) {
    // Validate target agent action exists
    const actionDetails = await this.getAction(actionName);
    if (!actionDetails) {
      // If action doesn't exist in registry, create a flexible task
      if (this.verbose) {
        console.log(`Action '${actionName}' not in registry - creating flexible sub-task`);
      }
    }

    // Create sub-task proposal
    const { data, error } = await supabase
      .from('agent_proposals')
      .insert({
        agent_id: targetAgentId,
        target_agent_id: targetAgentId,
        action_id: actionDetails?.id || null,
        action_name: actionName,
        title: `Sub-task: ${actionName} (delegated by ${this.agentId})`,
        description: `Delegated sub-task from ${this.agentId}`,
        reasoning: {
          trigger: `delegated_from_${this.agentId}`,
          parent_agent: this.agentId,
          confidence: 0.9
        },
        proposed_action: params,
        parent_proposal_id: context.parentProposalId || null,
        coordination_status: 'waiting',
        coordination_context: {
          ...context,
          spawned_by: this.agentId,
          spawned_at: new Date().toISOString()
        },
        status: 'pending',
        priority: context.priority || 'normal'
      })
      .select()
      .single();

    if (error) throw error;

    // If we have a parent proposal, update its child references
    if (context.parentProposalId) {
      await supabase.rpc('spawn_sub_task_update_parent', {
        p_parent_id: context.parentProposalId,
        p_child_id: data.id
      }).catch(() => {
        // Fallback if RPC doesn't exist - update directly
        supabase
          .from('agent_proposals')
          .update({
            child_proposal_ids: supabase.sql`array_append(child_proposal_ids, ${data.id}::uuid)`,
            coordination_status: 'coordinating'
          })
          .eq('id', context.parentProposalId);
      });
    }

    if (this.verbose) {
      console.log(`Spawned sub-task: ${data.id}`);
      console.log(`   Target: ${targetAgentId}`);
      console.log(`   Action: ${actionName}`);
      console.log(`   Status: pending`);
    }

    return {
      subTaskId: data.id,
      id: data.id,
      targetAgent: targetAgentId,
      action: actionName,
      status: 'pending',
      params
    };
  }

  /**
   * Wait for a sub-task to complete
   *
   * @param {string} subTaskId - The ID of the sub-task to wait for
   * @param {number} timeout - Maximum time to wait in milliseconds (default: 60000)
   * @returns {Promise<{status: string, result?: object, error?: string, timedOut: boolean}>}
   *
   * @example
   * const result = await workflow.waitForSubTask(subTask.id, 60000);
   * if (result.status === 'completed') {
   *   console.log('Sub-task result:', result.result);
   * }
   */
  async waitForSubTask(subTaskId, timeout = 60000) {
    const startTime = Date.now();
    const pollInterval = 1000; // Poll every second

    while (Date.now() - startTime < timeout) {
      const { data, error } = await supabase
        .from('agent_proposals')
        .select('status, execution_result, execution_error, execution_completed_at')
        .eq('id', subTaskId)
        .single();

      if (error) {
        return {
          status: 'error',
          error: error.message,
          timedOut: false
        };
      }

      if (!data) {
        return {
          status: 'not_found',
          error: `Sub-task ${subTaskId} not found`,
          timedOut: false
        };
      }

      // Check terminal states
      if (data.status === 'completed') {
        return {
          status: 'completed',
          result: data.execution_result,
          completedAt: data.execution_completed_at,
          timedOut: false
        };
      }

      if (data.status === 'failed') {
        return {
          status: 'failed',
          error: data.execution_error,
          timedOut: false
        };
      }

      if (data.status === 'rejected') {
        return {
          status: 'rejected',
          error: 'Sub-task was rejected',
          timedOut: false
        };
      }

      if (data.status === 'expired') {
        return {
          status: 'expired',
          error: 'Sub-task expired',
          timedOut: false
        };
      }

      // Still pending/approved/executing - wait and poll again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout reached
    return {
      status: 'timeout',
      error: `Timed out waiting for sub-task ${subTaskId} after ${timeout}ms`,
      timedOut: true
    };
  }

  /**
   * Coordinate multiple agents by spawning parallel sub-tasks
   *
   * @param {Array<{agentId: string, action: string, params: object}>} tasks - Array of tasks to spawn
   * @param {object} options - Coordination options
   * @returns {Promise<{coordinationId: string, subTasks: Array, status: string}>}
   *
   * @example
   * const results = await workflow.coordinateAgents([
   *   { agentId: 'scout', action: 'research_contact', params: { contactId: 'a' } },
   *   { agentId: 'analyst', action: 'analyze_data', params: { dataId: 'b' } }
   * ], { waitForAll: true });
   */
  async coordinateAgents(tasks, options = {}) {
    const { waitForAll = false, timeout = 120000, parentProposalId = null } = options;

    // Create a coordination record (parent proposal)
    const coordinationProposal = await this.propose({
      action: 'coordinate_agents',
      title: `Coordinate ${tasks.length} agents`,
      description: `Multi-agent coordination: ${tasks.map(t => t.agentId).join(', ')}`,
      reasoning: {
        trigger: 'multi_agent_coordination',
        confidence: 1.0,
        task_count: tasks.length
      },
      params: { tasks },
      priority: options.priority || 'normal'
    }).catch(() => ({ proposalId: parentProposalId || `coord-${Date.now()}` }));

    const coordinationId = coordinationProposal.proposalId;

    // Spawn all sub-tasks in parallel
    const spawnPromises = tasks.map(task =>
      this.spawnSubTask(task.agentId, task.action, task.params, {
        parentProposalId: coordinationId,
        priority: task.priority || options.priority
      })
    );

    const subTasks = await Promise.all(spawnPromises);

    if (this.verbose) {
      console.log(`Coordination ${coordinationId} started`);
      console.log(`   Sub-tasks: ${subTasks.length}`);
      console.log(`   Agents: ${tasks.map(t => t.agentId).join(', ')}`);
    }

    // Update coordination status
    await supabase
      .from('agent_proposals')
      .update({
        coordination_status: 'coordinating',
        child_proposal_ids: subTasks.map(st => st.subTaskId)
      })
      .eq('id', coordinationId)
      .catch(() => {}); // Ignore if proposal wasn't created

    const result = {
      coordinationId,
      subTasks,
      status: 'coordinating'
    };

    // Optionally wait for all tasks to complete
    if (waitForAll) {
      const waitPromises = subTasks.map(st =>
        this.waitForSubTask(st.subTaskId, timeout)
      );

      const results = await Promise.all(waitPromises);

      result.results = results;
      result.status = results.every(r => r.status === 'completed') ? 'completed' :
                      results.some(r => r.timedOut) ? 'partial_timeout' :
                      results.some(r => r.status === 'failed') ? 'partial_failure' : 'mixed';

      // Update coordination status
      await supabase
        .from('agent_proposals')
        .update({ coordination_status: 'complete' })
        .eq('id', coordinationId)
        .catch(() => {});
    }

    return result;
  }

  /**
   * Get results from child tasks of a parent proposal
   *
   * @param {string} parentTaskId - The parent proposal ID
   * @returns {Promise<Array<{subTaskId: string, agent: string, action: string, status: string, result?: object}>>}
   *
   * @example
   * const childResults = await workflow.getSubTaskResults(parentProposalId);
   * for (const child of childResults) {
   *   console.log(`${child.agent}: ${child.status}`);
   * }
   */
  async getSubTaskResults(parentTaskId) {
    // First try the RPC function
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_sub_task_results', { p_parent_id: parentTaskId });

    if (!rpcError && rpcData) {
      return rpcData.map(row => ({
        subTaskId: row.sub_task_id,
        agent: row.target_agent,
        action: row.action_name,
        status: row.status,
        result: row.result,
        error: row.error,
        completedAt: row.completed_at
      }));
    }

    // Fallback to direct query
    const { data, error } = await supabase
      .from('agent_proposals')
      .select('id, target_agent_id, action_name, status, execution_result, execution_error, execution_completed_at')
      .eq('parent_proposal_id', parentTaskId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      subTaskId: row.id,
      agent: row.target_agent_id,
      action: row.action_name,
      status: row.status,
      result: row.execution_result,
      error: row.execution_error,
      completedAt: row.execution_completed_at
    }));
  }

  /**
   * Get delegated tasks assigned to this agent
   *
   * @returns {Promise<Array>} - Array of pending delegated tasks
   */
  async getDelegatedTasks() {
    const { data, error } = await supabase
      .from('agent_proposals')
      .select(`
        *,
        parent:parent_proposal_id (
          id,
          agent_id,
          title,
          action_name
        )
      `)
      .eq('target_agent_id', this.agentId)
      .eq('status', 'pending')
      .not('parent_proposal_id', 'is', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Check coordination status for a parent task
   *
   * @param {string} parentTaskId - The parent proposal ID
   * @returns {Promise<{total: number, completed: number, pending: number, failed: number, allComplete: boolean}>}
   */
  async checkCoordinationStatus(parentTaskId) {
    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('check_coordination_complete', { p_parent_id: parentTaskId });

    if (!rpcError && rpcData) {
      return {
        total: rpcData.total,
        completed: rpcData.completed,
        pending: rpcData.pending,
        failed: rpcData.failed,
        allComplete: rpcData.all_complete,
        anyFailed: rpcData.any_failed
      };
    }

    // Fallback
    const { data, error } = await supabase
      .from('agent_proposals')
      .select('status')
      .eq('parent_proposal_id', parentTaskId);

    if (error) throw error;

    const statuses = data || [];
    return {
      total: statuses.length,
      completed: statuses.filter(s => s.status === 'completed').length,
      pending: statuses.filter(s => ['pending', 'approved', 'executing'].includes(s.status)).length,
      failed: statuses.filter(s => s.status === 'failed').length,
      allComplete: statuses.every(s => ['completed', 'failed', 'rejected', 'expired'].includes(s.status)),
      anyFailed: statuses.some(s => s.status === 'failed')
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APPROVAL CLI FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * List all pending proposals
 */
export async function listPendingProposals() {
  const { data, error } = await supabase
    .from('pending_proposals')
    .select('*');

  if (error) throw error;
  return data;
}

/**
 * Approve a proposal
 */
export async function approveProposal(proposalId, reviewer, notes = null) {
  const { data, error } = await supabase
    .rpc('approve_proposal', {
      proposal_id: proposalId,
      reviewer,
      notes
    });

  if (error) throw error;
  return data;
}

/**
 * Reject a proposal
 */
export async function rejectProposal(proposalId, reviewer, notes) {
  const { data, error } = await supabase
    .rpc('reject_proposal', {
      proposal_id: proposalId,
      reviewer,
      notes
    });

  if (error) throw error;
  return data;
}

/**
 * Get autonomous executions flagged for review
 */
export async function getFlaggedExecutions() {
  const { data, error } = await supabase
    .from('autonomous_review_queue')
    .select('*');

  if (error) throw error;
  return data;
}

/**
 * Review an autonomous execution
 */
export async function reviewExecution(executionId, reviewer, outcome) {
  const { data, error } = await supabase
    .from('autonomous_executions')
    .update({
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
      review_outcome: outcome
    })
    .eq('id', executionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('Agentic Workflow System');
  console.log('━'.repeat(50));

  switch (command) {
    case 'pending':
      console.log('\n📋 Pending Proposals:\n');
      const pending = await listPendingProposals();
      if (pending.length === 0) {
        console.log('No pending proposals.');
      } else {
        pending.forEach((p, i) => {
          console.log(`${i + 1}. [${p.priority.toUpperCase()}] ${p.title}`);
          console.log(`   Agent: ${p.agent_id}`);
          console.log(`   Trigger: ${p.trigger_reason}`);
          console.log(`   Confidence: ${(parseFloat(p.confidence) * 100).toFixed(0)}%`);
          console.log(`   Risk: ${p.risk_level}`);
          console.log(`   ID: ${p.id}\n`);
        });
      }
      break;

    case 'approve':
      const approveId = args[1];
      const approveNotes = args[2] || null;
      if (!approveId) {
        console.log('Usage: node agentic-workflow.mjs approve <proposal-id> [notes]');
        process.exit(1);
      }
      await approveProposal(approveId, 'cli-user', approveNotes);
      console.log(`✅ Proposal ${approveId} approved`);
      break;

    case 'reject':
      const rejectId = args[1];
      const rejectNotes = args[2];
      if (!rejectId || !rejectNotes) {
        console.log('Usage: node agentic-workflow.mjs reject <proposal-id> <reason>');
        process.exit(1);
      }
      await rejectProposal(rejectId, 'cli-user', rejectNotes);
      console.log(`❌ Proposal ${rejectId} rejected: ${rejectNotes}`);
      break;

    case 'flagged':
      console.log('\n⚠️ Flagged Autonomous Executions:\n');
      const flagged = await getFlaggedExecutions();
      if (flagged.length === 0) {
        console.log('No flagged executions.');
      } else {
        flagged.forEach((e, i) => {
          console.log(`${i + 1}. ${e.action_name}`);
          console.log(`   Agent: ${e.agent_id}`);
          console.log(`   Success: ${e.success ? 'Yes' : 'No'}`);
          console.log(`   Confidence: ${(e.confidence * 100).toFixed(0)}%`);
          console.log(`   Within bounds: ${e.within_bounds ? 'Yes' : 'No'}`);
          console.log(`   ID: ${e.id}\n`);
        });
      }
      break;

    case 'review':
      const reviewId = args[1];
      const outcome = args[2]; // 'correct', 'incorrect', 'uncertain'
      if (!reviewId || !outcome) {
        console.log('Usage: node agentic-workflow.mjs review <execution-id> <correct|incorrect|uncertain>');
        process.exit(1);
      }
      await reviewExecution(reviewId, 'cli-user', outcome);
      console.log(`📝 Execution ${reviewId} reviewed as: ${outcome}`);
      break;

    case 'test':
      console.log('\n🧪 Testing Agentic Workflow...\n');
      const workflow = new AgenticWorkflow('test-agent', { verbose: true });

      // Test proposal
      console.log('1. Creating test proposal...');
      const proposal = await workflow.propose({
        action: 'sync_contacts',
        title: 'Test: Sync 10 contacts',
        description: 'This is a test proposal',
        reasoning: {
          trigger: 'manual_test',
          confidence: 0.95,
          explanation: 'Testing the agentic workflow system'
        },
        params: { source: 'ghl', limit: 10 },
        priority: 'normal'
      });
      console.log(`   Created proposal: ${proposal.proposalId}\n`);

      // Show pending
      console.log('2. Listing pending proposals...');
      const pendingTest = await listPendingProposals();
      console.log(`   Found ${pendingTest.length} pending proposals\n`);

      console.log('✅ Agentic workflow test complete!');
      console.log(`   To approve: node scripts/lib/agentic-workflow.mjs approve ${proposal.proposalId}`);
      break;

    case 'coordinating':
      console.log('\nCoordinating Tasks:\n');
      const { data: coordTasks } = await supabase
        .from('agent_proposals')
        .select('*')
        .in('coordination_status', ['coordinating', 'waiting'])
        .order('created_at', { ascending: false });

      if (!coordTasks || coordTasks.length === 0) {
        console.log('No coordinating tasks.');
      } else {
        for (const task of coordTasks) {
          console.log(`${task.title}`);
          console.log(`   Agent: ${task.agent_id}`);
          console.log(`   Status: ${task.coordination_status}`);
          console.log(`   Children: ${task.child_proposal_ids?.length || 0}`);
          console.log(`   ID: ${task.id}\n`);
        }
      }
      break;

    case 'delegated':
      const agentArg = args[1];
      if (!agentArg) {
        console.log('Usage: node agentic-workflow.mjs delegated <agent-id>');
        process.exit(1);
      }
      console.log(`\nDelegated Tasks for ${agentArg}:\n`);
      const delegatedWorkflow = new AgenticWorkflow(agentArg);
      const delegated = await delegatedWorkflow.getDelegatedTasks();

      if (delegated.length === 0) {
        console.log('No delegated tasks.');
      } else {
        delegated.forEach((d, i) => {
          console.log(`${i + 1}. ${d.title}`);
          console.log(`   From: ${d.parent?.agent_id || 'unknown'}`);
          console.log(`   Action: ${d.action_name}`);
          console.log(`   ID: ${d.id}\n`);
        });
      }
      break;

    case 'test-coordination':
      console.log('\nTesting Multi-Agent Coordination...\n');
      const coordWorkflow = new AgenticWorkflow('orchestrator', { verbose: true });

      // Test spawning a sub-task
      console.log('1. Spawning sub-task...');
      const subTask = await coordWorkflow.spawnSubTask('scout', 'search_data', {
        query: 'test coordination'
      });
      console.log(`   Sub-task ID: ${subTask.subTaskId}\n`);

      // Test coordination
      console.log('2. Testing coordinateAgents...');
      const coord = await coordWorkflow.coordinateAgents([
        { agentId: 'scout', action: 'search_data', params: { query: 'research' } },
        { agentId: 'analyst', action: 'analyze_health', params: {} }
      ]);
      console.log(`   Coordination ID: ${coord.coordinationId}`);
      console.log(`   Sub-tasks: ${coord.subTasks.length}\n`);

      console.log('Multi-agent coordination test complete!');
      break;

    default:
      console.log('\nUsage:');
      console.log('  node agentic-workflow.mjs pending          - List pending proposals');
      console.log('  node agentic-workflow.mjs approve <id>     - Approve a proposal');
      console.log('  node agentic-workflow.mjs reject <id> <reason> - Reject a proposal');
      console.log('  node agentic-workflow.mjs flagged          - List flagged executions');
      console.log('  node agentic-workflow.mjs review <id> <outcome> - Review execution');
      console.log('  node agentic-workflow.mjs test             - Run test proposal');
      console.log('  node agentic-workflow.mjs coordinating     - List coordinating tasks');
      console.log('  node agentic-workflow.mjs delegated <agent> - List delegated tasks for agent');
      console.log('  node agentic-workflow.mjs test-coordination - Test multi-agent coordination');
  }
}

export default AgenticWorkflow;
