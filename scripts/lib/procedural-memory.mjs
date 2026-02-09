#!/usr/bin/env node
/**
 * Procedural Memory: Learned Multi-Step Workflows
 *
 * Stores and manages procedures that agents have discovered work well.
 * Tracks execution counts, success rates, and version history.
 *
 * Part of: Advanced Memory System (Phase 5)
 *
 * Usage:
 *   import { ProceduralMemory } from './lib/procedural-memory.mjs';
 *   const pm = new ProceduralMemory();
 *   await pm.createProcedure('daily-health-check', 'cultivator', { ... });
 *   await pm.recordExecution('daily-health-check', true, 1200);
 */

import { createClient } from '@supabase/supabase-js';
import '../../lib/load-env.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export class ProceduralMemory {
  constructor(options = {}) {
    this.supabase = options.supabase || supabase;
    this.verbose = options.verbose || false;
  }

  /**
   * Create a new procedure
   */
  async createProcedure(name, agentId, definition) {
    const { data, error } = await this.supabase
      .from('procedural_memory')
      .insert({
        procedure_name: name,
        agent_id: agentId,
        description: definition.description || null,
        steps: definition.steps,
        preconditions: definition.preconditions || null,
        postconditions: definition.postconditions || null,
        learned_from_episodes: definition.episodeIds || [],
        learned_from_decisions: definition.decisionIds || [],
        status: definition.status || 'draft'
      })
      .select()
      .single();

    if (error) throw error;

    if (this.verbose) {
      console.log(`Procedure created: ${name} (${data.id})`);
      console.log(`  Steps: ${definition.steps.length}`);
      console.log(`  Agent: ${agentId}`);
    }

    return data;
  }

  /**
   * Get a procedure by name
   */
  async getProcedure(name) {
    const { data, error } = await this.supabase
      .from('procedural_memory')
      .select('*')
      .eq('procedure_name', name)
      .is('superseded_by', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Get all active procedures for an agent
   */
  async getAgentProcedures(agentId) {
    const { data, error } = await this.supabase
      .from('procedural_memory')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .is('superseded_by', null)
      .order('success_rate', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Record an execution of a procedure (updates counters)
   */
  async recordExecution(name, success, durationMs = null) {
    const procedure = await this.getProcedure(name);
    if (!procedure) {
      throw new Error(`Procedure not found: ${name}`);
    }

    const newExecCount = procedure.execution_count + 1;
    const newSuccessCount = procedure.success_count + (success ? 1 : 0);
    const newAvgDuration = durationMs
      ? Math.round(
          ((procedure.avg_duration_ms || 0) * procedure.execution_count + durationMs) / newExecCount
        )
      : procedure.avg_duration_ms;

    const { data, error } = await this.supabase
      .from('procedural_memory')
      .update({
        execution_count: newExecCount,
        success_count: newSuccessCount,
        avg_duration_ms: newAvgDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', procedure.id)
      .select()
      .single();

    if (error) throw error;

    if (this.verbose) {
      console.log(`Execution recorded for ${name}: ${success ? 'success' : 'failure'}`);
      console.log(`  Total: ${newExecCount} | Success rate: ${((newSuccessCount / newExecCount) * 100).toFixed(0)}%`);
    }

    return data;
  }

  /**
   * Create a new version of a procedure (supersedes the old one)
   */
  async updateProcedure(name, newDefinition) {
    const old = await this.getProcedure(name);
    if (!old) {
      throw new Error(`Procedure not found: ${name}`);
    }

    // Create new version
    const newProcedure = await this.createProcedure(
      name + `_v${old.version + 1}`,
      old.agent_id,
      {
        ...newDefinition,
        status: 'active'
      }
    );

    // Update new version's version number and name
    await this.supabase
      .from('procedural_memory')
      .update({
        procedure_name: name,
        version: old.version + 1
      })
      .eq('id', newProcedure.id);

    // Mark old as superseded
    await this.supabase
      .from('procedural_memory')
      .update({
        superseded_by: newProcedure.id,
        status: 'deprecated',
        procedure_name: `${name}_v${old.version}`
      })
      .eq('id', old.id);

    if (this.verbose) {
      console.log(`Procedure ${name} updated: v${old.version} → v${old.version + 1}`);
    }

    return newProcedure;
  }

  /**
   * Activate a draft procedure
   */
  async activateProcedure(name) {
    const { data, error } = await this.supabase
      .from('procedural_memory')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('procedure_name', name)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Find procedures matching preconditions
   */
  async findApplicableProcedures(context, agentId = null) {
    let query = this.supabase
      .from('procedural_memory')
      .select('*')
      .eq('status', 'active')
      .is('superseded_by', null)
      .order('success_rate', { ascending: false });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter by preconditions match
    return (data || []).filter(proc => {
      if (!proc.preconditions) return true;
      return this._matchesPreconditions(proc.preconditions, context);
    });
  }

  /**
   * Extract a procedure from repeated action patterns in agent_learnings
   */
  async extractFromLearnings(agentId, actionPattern) {
    // Find repeated successful action sequences
    const { data: executions } = await this.supabase
      .from('autonomous_executions')
      .select('action_name, action_params, success, duration_ms, created_at')
      .eq('agent_id', agentId)
      .eq('success', true)
      .order('created_at', { ascending: true })
      .limit(200);

    if (!executions || executions.length < 5) return null;

    // Find repeated sequences of actions
    const sequences = this._findRepeatedSequences(executions, actionPattern);

    if (sequences.length === 0) return null;

    // Take the most common sequence
    const bestSequence = sequences[0];

    const procedure = {
      description: `Auto-extracted procedure from ${bestSequence.occurrences} successful executions`,
      steps: bestSequence.steps.map((s, i) => ({
        step: i + 1,
        action: s.action_name,
        params_template: s.action_params,
        conditions: {}
      })),
      preconditions: { trigger: actionPattern },
      status: 'draft'
    };

    if (this.verbose) {
      console.log(`Extracted procedure from ${bestSequence.occurrences} occurrences:`);
      bestSequence.steps.forEach((s, i) => {
        console.log(`  Step ${i + 1}: ${s.action_name}`);
      });
    }

    return procedure;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  _matchesPreconditions(preconditions, context) {
    for (const [key, value] of Object.entries(preconditions)) {
      if (key === 'trigger' && context.trigger !== value) return false;
      if (key === 'agent_id' && context.agentId !== value) return false;
      if (key === 'min_confidence' && (context.confidence || 0) < value) return false;
    }
    return true;
  }

  _findRepeatedSequences(executions, pattern, minLength = 2, maxLength = 5) {
    const sequences = {};

    for (let len = minLength; len <= maxLength; len++) {
      for (let i = 0; i <= executions.length - len; i++) {
        const seq = executions.slice(i, i + len);
        const key = seq.map(s => s.action_name).join('→');

        // Filter by pattern if provided
        if (pattern && !key.includes(pattern)) continue;

        if (!sequences[key]) {
          sequences[key] = { steps: seq, occurrences: 0 };
        }
        sequences[key].occurrences++;
      }
    }

    return Object.values(sequences)
      .filter(s => s.occurrences >= 2)
      .sort((a, b) => b.occurrences - a.occurrences);
  }
}

export default ProceduralMemory;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const pm = new ProceduralMemory({ verbose: true });

  console.log('Procedural Memory');
  console.log('='.repeat(50));

  if (args.includes('--list')) {
    const agentId = args[args.indexOf('--list') + 1] || null;
    let query = pm.supabase
      .from('procedural_memory')
      .select('*')
      .is('superseded_by', null)
      .order('success_rate', { ascending: false });

    if (agentId) query = query.eq('agent_id', agentId);

    const { data } = await query;
    console.log(`\nProcedures${agentId ? ` for ${agentId}` : ''}:`);
    (data || []).forEach((p, i) => {
      const rate = p.execution_count > 0 ? ((p.success_count / p.execution_count) * 100).toFixed(0) : 'N/A';
      console.log(`  ${i + 1}. [${p.status}] ${p.procedure_name} (v${p.version})`);
      console.log(`     Agent: ${p.agent_id} | Executions: ${p.execution_count} | Success: ${rate}%`);
      console.log(`     Steps: ${(p.steps || []).length}`);
    });
  } else if (args.includes('--extract') && args.length >= 3) {
    const agentId = args[args.indexOf('--extract') + 1];
    const pattern = args[args.indexOf('--extract') + 2];
    const procedure = await pm.extractFromLearnings(agentId, pattern);
    if (procedure) {
      console.log('\nExtracted procedure:', JSON.stringify(procedure, null, 2));
    } else {
      console.log('\nNo repeated patterns found');
    }
  } else {
    console.log(`
Usage:
  node scripts/lib/procedural-memory.mjs --list [agent-id]           List procedures
  node scripts/lib/procedural-memory.mjs --extract <agent-id> <pattern>  Extract from learnings
`);
  }
}
