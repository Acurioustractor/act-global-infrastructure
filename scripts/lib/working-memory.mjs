#!/usr/bin/env node
/**
 * Working Memory: Per-Agent Session Context
 *
 * Provides agents with session-scoped working memory that persists
 * within an execution session and expires after 24h.
 *
 * Part of: Advanced Memory System (Phase 3)
 *
 * Usage:
 *   import { WorkingMemory } from './lib/working-memory.mjs';
 *   const wm = new WorkingMemory();
 *   await wm.initSession('cultivator', 'session-123', { project: 'ACT-HV', goal: 'health check' });
 *   await wm.addToScratchpad('cultivator', 'session-123', 'contacts_checked', [id1, id2]);
 *   const session = await wm.getSession('cultivator', 'session-123');
 */

import { createClient } from '@supabase/supabase-js';
import '../../lib/load-env.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export class WorkingMemory {
  constructor(options = {}) {
    this.supabase = options.supabase || supabase;
    this.verbose = options.verbose || false;
    this.defaultTtlHours = options.ttlHours || 24;
  }

  /**
   * Initialize working memory for an agent session
   */
  async initSession(agentId, sessionId, context = {}) {
    const expiresAt = new Date(Date.now() + this.defaultTtlHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from('agent_working_memory')
      .upsert({
        agent_id: agentId,
        session_id: sessionId,
        active_context: context,
        retrieved_memories: [],
        decisions_made: [],
        scratchpad: {},
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'agent_id,session_id'
      })
      .select()
      .single();

    if (error) throw error;

    if (this.verbose) {
      console.log(`Working memory initialized: ${agentId}/${sessionId}`);
    }

    return data;
  }

  /**
   * Get current working memory for a session
   */
  async getSession(agentId, sessionId) {
    const { data, error } = await this.supabase
      .from('agent_working_memory')
      .select('*')
      .eq('agent_id', agentId)
      .eq('session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Update the active context
   */
  async updateContext(agentId, sessionId, updates) {
    const session = await this.getSession(agentId, sessionId);
    if (!session) {
      throw new Error(`No working memory for ${agentId}/${sessionId}`);
    }

    const newContext = { ...session.active_context, ...updates };

    const { data, error } = await this.supabase
      .from('agent_working_memory')
      .update({
        active_context: newContext,
        updated_at: new Date().toISOString()
      })
      .eq('agent_id', agentId)
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Add a key-value pair to the scratchpad
   */
  async addToScratchpad(agentId, sessionId, key, value) {
    const session = await this.getSession(agentId, sessionId);
    if (!session) {
      throw new Error(`No working memory for ${agentId}/${sessionId}`);
    }

    const scratchpad = { ...session.scratchpad, [key]: value };

    const { data, error } = await this.supabase
      .from('agent_working_memory')
      .update({
        scratchpad,
        updated_at: new Date().toISOString()
      })
      .eq('agent_id', agentId)
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Record that a memory was retrieved during this session
   */
  async recordRetrievedMemory(agentId, sessionId, memoryId) {
    const session = await this.getSession(agentId, sessionId);
    if (!session) return;

    const retrieved = session.retrieved_memories || [];
    if (!retrieved.includes(memoryId)) {
      retrieved.push(memoryId);
    }

    await this.supabase
      .from('agent_working_memory')
      .update({
        retrieved_memories: retrieved,
        updated_at: new Date().toISOString()
      })
      .eq('agent_id', agentId)
      .eq('session_id', sessionId);
  }

  /**
   * Record that a decision was made during this session
   */
  async recordDecision(agentId, sessionId, decisionId) {
    const session = await this.getSession(agentId, sessionId);
    if (!session) return;

    const decisions = session.decisions_made || [];
    if (!decisions.includes(decisionId)) {
      decisions.push(decisionId);
    }

    await this.supabase
      .from('agent_working_memory')
      .update({
        decisions_made: decisions,
        updated_at: new Date().toISOString()
      })
      .eq('agent_id', agentId)
      .eq('session_id', sessionId);
  }

  /**
   * Get the most recent session for an agent (for resume)
   */
  async getLatestSession(agentId) {
    const { data, error } = await this.supabase
      .from('agent_working_memory')
      .select('*')
      .eq('agent_id', agentId)
      .gt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpired() {
    const { data, error } = await this.supabase
      .from('agent_working_memory')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Cleanup failed:', error.message);
      return 0;
    }

    const count = data?.length || 0;
    if (this.verbose && count > 0) {
      console.log(`Cleaned up ${count} expired sessions`);
    }
    return count;
  }

  /**
   * List all active sessions
   */
  async listActiveSessions() {
    const { data, error } = await this.supabase
      .from('agent_working_memory')
      .select('agent_id, session_id, active_context, created_at, updated_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export default WorkingMemory;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const wm = new WorkingMemory({ verbose: true });

  console.log('Working Memory');
  console.log('='.repeat(50));

  if (args.includes('--list')) {
    const sessions = await wm.listActiveSessions();
    console.log(`\nActive sessions: ${sessions.length}`);
    sessions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.agent_id}/${s.session_id}`);
      console.log(`     Context: ${JSON.stringify(s.active_context).substring(0, 80)}`);
      console.log(`     Updated: ${s.updated_at} | Expires: ${s.expires_at}`);
    });
  } else if (args.includes('--cleanup')) {
    const count = await wm.cleanupExpired();
    console.log(`\nCleaned up ${count} expired sessions`);
  } else if (args.includes('--get') && args.length >= 3) {
    const agentId = args[args.indexOf('--get') + 1];
    const sessionId = args[args.indexOf('--get') + 2];
    const session = await wm.getSession(agentId, sessionId);
    if (session) {
      console.log(JSON.stringify(session, null, 2));
    } else {
      console.log('Session not found');
    }
  } else {
    console.log(`
Usage:
  node scripts/lib/working-memory.mjs --list                           List active sessions
  node scripts/lib/working-memory.mjs --cleanup                        Clean expired sessions
  node scripts/lib/working-memory.mjs --get <agent-id> <session-id>   Get session details
`);
  }
}
