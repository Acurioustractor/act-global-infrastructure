/**
 * Agent Audit Logging Library
 * Layer 7: Governance & Safety
 *
 * Provides wrapper functions to automatically log all agent actions
 * to the agent_audit_log table for compliance, debugging, and analytics.
 *
 * Usage:
 *   import { auditAction, createAuditor, withAudit } from './lib/audit.mjs';
 *
 *   // Simple wrapper
 *   const result = await auditAction('morning-brief', 'read', 'ghl_contacts', async () => {
 *     return await supabase.from('ghl_contacts').select('*');
 *   });
 *
 *   // Create reusable auditor for a script
 *   const audit = createAuditor('morning-brief');
 *   await audit.action('sync', 'ghl_contacts', async () => { ... });
 */

import '../../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

// Supabase client (support both NEXT_PUBLIC_ and non-prefixed vars)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Log a single agent action with timing and error capture
 *
 * @param {string} agentId - Identifier for the agent (e.g., 'morning-brief')
 * @param {string} action - Type of action (e.g., 'read', 'write', 'sync', 'embed')
 * @param {string} targetTable - Database table or resource being accessed
 * @param {Function} fn - Async function to execute and audit
 * @param {Object} options - Additional options
 * @returns {Promise<any>} Result of fn()
 */
export async function auditAction(agentId, action, targetTable, fn, options = {}) {
  const start = Date.now();
  const entry = {
    agent_id: agentId,
    action: action,
    target_table: targetTable,
    target_id: options.targetId || null,
    user_context: options.userContext || process.env.USER || 'system',
    trigger_source: options.triggerSource || 'manual',
    input_summary: options.inputSummary || null,
    cultural_data_accessed: options.culturalDataAccessed || false,
    metadata: options.metadata || {}
  };

  try {
    const result = await fn();

    // Capture output summary if provided or infer from result
    let outputSummary = options.outputSummary;
    if (!outputSummary && result) {
      if (Array.isArray(result)) {
        outputSummary = { count: result.length };
      } else if (typeof result === 'object' && result.data) {
        outputSummary = { count: Array.isArray(result.data) ? result.data.length : 1 };
      }
    }

    entry.success = true;
    entry.duration_ms = Date.now() - start;
    entry.output_summary = outputSummary;
    entry.target_count = outputSummary?.count || 1;

    await logToDatabase(entry);
    return result;

  } catch (error) {
    entry.success = false;
    entry.duration_ms = Date.now() - start;
    entry.error_message = error.message;
    entry.error_code = error.code || null;

    await logToDatabase(entry);
    throw error;
  }
}

/**
 * Create a reusable auditor for a specific agent
 *
 * @param {string} agentId - Identifier for the agent
 * @param {Object} defaultOptions - Default options for all actions
 * @returns {Object} Auditor with action() method
 */
export function createAuditor(agentId, defaultOptions = {}) {
  return {
    agentId,
    defaultOptions,

    /**
     * Execute and audit an action
     */
    async action(actionType, targetTable, fn, options = {}) {
      return auditAction(
        agentId,
        actionType,
        targetTable,
        fn,
        { ...this.defaultOptions, ...options }
      );
    },

    /**
     * Log a read operation
     */
    async read(targetTable, fn, options = {}) {
      return this.action('read', targetTable, fn, options);
    },

    /**
     * Log a write operation
     */
    async write(targetTable, fn, options = {}) {
      return this.action('write', targetTable, fn, options);
    },

    /**
     * Log a sync operation
     */
    async sync(targetTable, fn, options = {}) {
      return this.action('sync', targetTable, fn, options);
    },

    /**
     * Log an embed/enrich operation
     */
    async embed(targetTable, fn, options = {}) {
      return this.action('embed', targetTable, fn, options);
    },

    /**
     * Log a delete operation
     */
    async delete(targetTable, fn, options = {}) {
      return this.action('delete', targetTable, fn, options);
    },

    /**
     * Log an external API call
     */
    async apiCall(apiName, fn, options = {}) {
      return this.action('api_call', apiName, fn, {
        ...options,
        action_category: 'external_api'
      });
    },

    /**
     * Log an LLM call
     */
    async llmCall(model, fn, options = {}) {
      return this.action('llm_call', model, fn, {
        ...options,
        action_category: 'llm_call'
      });
    },

    /**
     * Log an action that accesses cultural data
     */
    async culturalAction(actionType, targetTable, fn, options = {}) {
      return this.action(actionType, targetTable, fn, {
        ...options,
        culturalDataAccessed: true,
        cultural_review_required: options.requiresReview || false
      });
    },

    /**
     * Manually log an event (no function execution)
     */
    async log(actionType, targetTable, details = {}) {
      const entry = {
        agent_id: this.agentId,
        action: actionType,
        target_table: targetTable,
        success: details.success !== false,
        duration_ms: details.durationMs || 0,
        user_context: details.userContext || this.defaultOptions.userContext || 'system',
        trigger_source: details.triggerSource || 'manual',
        input_summary: details.inputSummary || null,
        output_summary: details.outputSummary || null,
        error_message: details.errorMessage || null,
        metadata: details.metadata || {}
      };
      await logToDatabase(entry);
    }
  };
}

/**
 * Higher-order function to wrap any async function with auditing
 *
 * @param {string} agentId - Agent identifier
 * @param {string} action - Action type
 * @param {string} targetTable - Target table/resource
 * @returns {Function} Wrapper function
 */
export function withAudit(agentId, action, targetTable) {
  return (fn, options = {}) => {
    return auditAction(agentId, action, targetTable, fn, options);
  };
}

/**
 * Log entry to database
 * @private
 */
async function logToDatabase(entry) {
  try {
    const { error } = await supabase
      .from('agent_audit_log')
      .insert(entry);

    if (error) {
      console.error('Failed to log audit entry:', error);
    }
  } catch (err) {
    // Don't let audit failures break the main operation
    console.error('Audit logging error:', err.message);
  }
}

/**
 * Get recent audit entries for an agent
 *
 * @param {string} agentId - Agent identifier
 * @param {number} limit - Max entries to return
 * @returns {Promise<Array>} Recent audit entries
 */
export async function getRecentAuditLogs(agentId, limit = 100) {
  const { data, error } = await supabase
    .from('agent_audit_log')
    .select('*')
    .eq('agent_id', agentId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get agent health metrics
 *
 * @param {number} hours - Time window in hours
 * @returns {Promise<Array>} Health metrics per agent
 */
export async function getAgentHealth(hours = 24) {
  const { data, error } = await supabase
    .rpc('get_agent_health', { p_hours: hours });

  if (error) throw error;
  return data;
}

/**
 * Get failed actions in recent period
 *
 * @param {number} hours - Time window in hours
 * @returns {Promise<Array>} Failed audit entries
 */
export async function getRecentErrors(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('agent_audit_log')
    .select('*')
    .eq('success', false)
    .gte('timestamp', cutoff)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI TEST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'test') {
    console.log('Testing audit logging...\n');

    const audit = createAuditor('audit-test', { userContext: 'test-cli' });

    // Test successful action
    try {
      const result = await audit.read('test_table', async () => {
        await new Promise(r => setTimeout(r, 100)); // Simulate work
        return [{ id: 1 }, { id: 2 }];
      });
      console.log('✓ Successful action logged, result count:', result.length);
    } catch (e) {
      console.error('✗ Failed:', e.message);
    }

    // Test failed action
    try {
      await audit.write('test_table', async () => {
        throw new Error('Simulated error');
      });
    } catch (e) {
      console.log('✓ Failed action logged correctly');
    }

    // Fetch recent logs
    const logs = await getRecentAuditLogs('audit-test', 5);
    console.log('\nRecent audit logs:');
    logs.forEach(log => {
      console.log(`  ${log.timestamp}: ${log.action} on ${log.target_table} - ${log.success ? '✓' : '✗'}`);
    });

    // Get health
    const health = await getAgentHealth(24);
    console.log('\nAgent health:');
    health.forEach(h => {
      console.log(`  ${h.agent_id}: ${h.success_rate}% success (${h.total_actions} actions)`);
    });

  } else if (command === 'health') {
    const health = await getAgentHealth(parseInt(process.argv[3]) || 24);
    console.log('Agent Health Report:');
    console.log('━'.repeat(60));
    health.forEach(h => {
      const status = h.success_rate >= 95 ? '🟢' : h.success_rate >= 80 ? '🟡' : '🔴';
      console.log(`${status} ${h.agent_id}`);
      console.log(`   Actions: ${h.total_actions} (${h.successful_actions} ok, ${h.failed_actions} failed)`);
      console.log(`   Success: ${h.success_rate}% | Avg Duration: ${h.avg_duration_ms}ms`);
    });

  } else if (command === 'errors') {
    const errors = await getRecentErrors(parseInt(process.argv[3]) || 24);
    console.log(`Recent Errors (last ${process.argv[3] || 24} hours):`);
    console.log('━'.repeat(60));
    errors.forEach(e => {
      console.log(`[${e.timestamp}] ${e.agent_id} - ${e.action} on ${e.target_table}`);
      console.log(`   Error: ${e.error_message}`);
    });

  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/audit.mjs test         - Run test logging');
    console.log('  node scripts/lib/audit.mjs health [hrs] - Show agent health');
    console.log('  node scripts/lib/audit.mjs errors [hrs] - Show recent errors');
  }
}

export default { auditAction, createAuditor, withAudit, getAgentHealth, getRecentErrors };
