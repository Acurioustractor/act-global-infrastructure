#!/usr/bin/env node
/**
 * Action Executor - Bridge between Agent Suggestions and Real Actions
 *
 * This is THE bridge that makes agents actually DO things instead of just suggesting.
 * Each action type maps to an existing integration function.
 *
 * Supported Actions:
 *   send_signal     - Send Signal message via signal-cli
 *   send_discord    - Send Discord message via webhook
 *   send_email      - Send email via configured provider
 *   log_interaction - Log to communications_history
 *   update_contact  - Update contact in GHL
 *   schedule_followup - Create follow-up reminder
 *
 * Usage:
 *   import { executeAction, ActionExecutor } from './lib/action-executor.mjs';
 *
 *   // Direct execution
 *   await executeAction({
 *     type: 'send_signal',
 *     to: '+61400000000',
 *     message: 'Hello!',
 *     contact_id: 'abc123'
 *   });
 *
 *   // With executor instance (for batching/tracking)
 *   const executor = new ActionExecutor({ dryRun: false });
 *   const result = await executor.execute(action);
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Lazy-load integrations to avoid circular dependencies
let sendSignalMessage, sendDiscordMessage;

async function loadIntegrations() {
  if (!sendSignalMessage) {
    const signalBridge = await import('../signal-bridge.mjs');
    // Note: sendSignalMessage is not exported, we need to use the CLI approach
    // or refactor signal-bridge.mjs to export it
  }
  if (!sendDiscordMessage) {
    const discordNotify = await import('../discord-notify.mjs');
    sendDiscordMessage = discordNotify.sendDiscordMessage;
  }
}

// ============================================================================
// SIGNAL SENDING (via signal-cli)
// ============================================================================

async function executeSendSignal(action) {
  const { to, message, contact_id } = action;

  if (!to || !message) {
    throw new Error('send_signal requires "to" (phone) and "message"');
  }

  const SIGNAL_PHONE = process.env.SIGNAL_PHONE;
  const SIGNAL_CLI = process.env.SIGNAL_CLI_PATH || 'signal-cli';

  if (!SIGNAL_PHONE) {
    throw new Error('SIGNAL_PHONE not configured');
  }

  // Use spawn to call signal-cli
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const proc = spawn(SIGNAL_CLI, [
      '-a', SIGNAL_PHONE,
      'send',
      '-m', message,
      to,
    ]);

    let stderr = '';
    proc.stderr.on('data', data => { stderr += data.toString(); });

    proc.on('close', code => {
      if (code === 0) {
        resolve({
          success: true,
          channel: 'signal',
          to,
          message_length: message.length,
          sent_at: new Date().toISOString()
        });
      } else {
        reject(new Error(`signal-cli failed: ${stderr || `exit code ${code}`}`));
      }
    });

    proc.on('error', err => {
      reject(new Error(`Failed to spawn signal-cli: ${err.message}`));
    });
  });
}

// ============================================================================
// DISCORD SENDING (via webhook)
// ============================================================================

async function executeSendDiscord(action) {
  const { channel, message, embed } = action;

  if (!channel || (!message && !embed)) {
    throw new Error('send_discord requires "channel" and "message" or "embed"');
  }

  await loadIntegrations();

  const success = await sendDiscordMessage(channel, message, embed ? { embeds: [embed] } : {});

  if (!success) {
    throw new Error(`Failed to send Discord message to #${channel}`);
  }

  return {
    success: true,
    channel: 'discord',
    discord_channel: channel,
    sent_at: new Date().toISOString()
  };
}

// ============================================================================
// EMAIL SENDING (via GHL Conversations API)
// ============================================================================

async function executeSendEmail(action) {
  const { to, subject, body, contact_id, from } = action;

  if (!to || !subject || !body) {
    throw new Error('send_email requires "to", "subject", and "body"');
  }

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
  const GHL_EMAIL_FROM = from || process.env.GHL_EMAIL_FROM || 'ben@act.place';

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    throw new Error('GHL_API_KEY and GHL_LOCATION_ID required for email sending');
  }

  // GHL Conversations API endpoint
  const url = 'https://services.leadconnectorhq.com/conversations/messages';

  // Build the request body
  const requestBody = {
    type: 'Email',
    locationId: GHL_LOCATION_ID,
    contactId: contact_id, // GHL contact ID
    emailTo: to,
    emailFrom: GHL_EMAIL_FROM,
    subject: subject,
    html: body.includes('<') ? body : `<p>${body.replace(/\n/g, '<br>')}</p>`,
    message: body.replace(/<[^>]*>/g, '') // Plain text version
  };

  console.log(`[GHL EMAIL] Sending to: ${to}, subject: ${subject}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GHL Email API Error (${response.status}): ${error}`);
  }

  const result = await response.json();

  return {
    success: true,
    channel: 'email',
    to,
    subject,
    sent_at: new Date().toISOString(),
    provider: 'ghl',
    message_id: result.messageId || result.id,
    conversation_id: result.conversationId
  };
}

// ============================================================================
// LOG INTERACTION
// ============================================================================

async function executeLogInteraction(action) {
  const { contact_id, channel, direction, content, initiated_by, metadata } = action;

  if (!contact_id || !channel) {
    throw new Error('log_interaction requires "contact_id" and "channel"');
  }

  if (!supabase) {
    throw new Error('Database connection required for log_interaction');
  }

  const { data, error } = await supabase
    .from('communications_history')
    .insert({
      ghl_contact_id: contact_id,
      channel,
      direction: direction || 'outbound',
      content_preview: content?.slice(0, 500),
      sentiment: 'positive',
      occurred_at: new Date().toISOString(),
      raw_data: {
        initiated_by,
        ...metadata
      }
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to log interaction: ${error.message}`);
  }

  return {
    success: true,
    interaction_id: data.id,
    logged_at: data.occurred_at
  };
}

// ============================================================================
// UPDATE CONTACT
// ============================================================================

async function executeUpdateContact(action) {
  const { contact_id, updates } = action;

  if (!contact_id || !updates) {
    throw new Error('update_contact requires "contact_id" and "updates"');
  }

  if (!supabase) {
    throw new Error('Database connection required for update_contact');
  }

  // Update local Supabase record
  const { data, error } = await supabase
    .from('ghl_contacts')
    .update({
      ...updates,
      last_contact_date: updates.last_contact_date || new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('ghl_id', contact_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update contact: ${error.message}`);
  }

  // Optionally sync to GHL (would need GHL API integration)
  // const ghl = new GHLService(...);
  // await ghl.updateContact(contact_id, updates);

  return {
    success: true,
    contact_id,
    updated_fields: Object.keys(updates),
    updated_at: new Date().toISOString()
  };
}

// ============================================================================
// SCHEDULE FOLLOW-UP
// ============================================================================

async function executeScheduleFollowup(action) {
  const { contact_id, days, reason, channel } = action;

  if (!contact_id || !days) {
    throw new Error('schedule_followup requires "contact_id" and "days"');
  }

  if (!supabase) {
    throw new Error('Database connection required for schedule_followup');
  }

  const followup_date = new Date();
  followup_date.setDate(followup_date.getDate() + days);

  // Insert into a follow-ups table or use relationship_health suggested_actions
  const { data, error } = await supabase
    .from('relationship_health')
    .upsert({
      ghl_contact_id: contact_id,
      suggested_actions: [reason || `Follow up in ${days} days`],
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'ghl_contact_id'
    })
    .select()
    .single();

  if (error && error.code !== 'PGRST116') {
    // Create a task instead if relationship_health doesn't exist
    console.log(`Note: Would schedule follow-up for ${contact_id} in ${days} days`);
  }

  return {
    success: true,
    contact_id,
    followup_date: followup_date.toISOString(),
    reason
  };
}

// ============================================================================
// ACTION ROUTER
// ============================================================================

const ACTION_HANDLERS = {
  send_signal: executeSendSignal,
  send_discord: executeSendDiscord,
  send_email: executeSendEmail,
  log_interaction: executeLogInteraction,
  update_contact: executeUpdateContact,
  schedule_followup: executeScheduleFollowup,
};

/**
 * Execute a single action
 *
 * @param {Object} action - Action to execute
 * @param {string} action.type - Action type (send_signal, send_discord, etc.)
 * @param {Object} options - Execution options
 * @param {boolean} options.dryRun - If true, don't actually execute
 * @param {boolean} options.logResult - If true, log to agent audit
 * @returns {Promise<Object>} Execution result
 */
export async function executeAction(action, options = {}) {
  const { type, ...params } = action;
  const { dryRun = false, logResult = true, agentId = 'action-executor' } = options;

  if (!type) {
    throw new Error('Action must have a "type" field');
  }

  const handler = ACTION_HANDLERS[type];
  if (!handler) {
    throw new Error(`Unknown action type: ${type}. Supported: ${Object.keys(ACTION_HANDLERS).join(', ')}`);
  }

  // Dry run - return what would happen
  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      action_type: type,
      would_execute: params,
      handler: handler.name
    };
  }

  const startTime = Date.now();
  let result, error;

  try {
    result = await handler(params);
  } catch (err) {
    error = err.message;
  }

  const duration = Date.now() - startTime;

  // Log to agent audit if requested
  if (logResult && supabase) {
    try {
      await supabase.from('agent_audit_log').insert({
        agent_id: agentId,
        action_type: type,
        action_params: params,
        result: result || null,
        error_message: error || null,
        duration_ms: duration,
        success: !error
      });
    } catch (logError) {
      console.error('Failed to log action to audit:', logError.message);
    }
  }

  if (error) {
    throw new Error(error);
  }

  return {
    ...result,
    action_type: type,
    duration_ms: duration
  };
}

// ============================================================================
// ACTION EXECUTOR CLASS
// ============================================================================

export class ActionExecutor {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.agentId = options.agentId || 'action-executor';
    this.verbose = options.verbose || false;
    this.results = [];
  }

  /**
   * Execute a single action
   */
  async execute(action) {
    if (this.verbose) {
      console.log(`[${this.agentId}] Executing: ${action.type}`);
    }

    const result = await executeAction(action, {
      dryRun: this.dryRun,
      logResult: true,
      agentId: this.agentId
    });

    this.results.push({ action, result, timestamp: new Date().toISOString() });

    if (this.verbose) {
      console.log(`[${this.agentId}] Result:`, result.success ? 'SUCCESS' : 'FAILED');
    }

    return result;
  }

  /**
   * Execute multiple actions in sequence
   */
  async executeSequence(actions) {
    const results = [];

    for (const action of actions) {
      try {
        const result = await this.execute(action);
        results.push({ success: true, action, result });
      } catch (err) {
        results.push({ success: false, action, error: err.message });
        // Stop on first error for sequential execution
        break;
      }
    }

    return results;
  }

  /**
   * Execute a complete outreach workflow:
   * 1. Send message (Signal/Email/Discord)
   * 2. Log the interaction
   * 3. Update contact last_contact_date
   * 4. Schedule follow-up
   */
  async executeOutreach(params) {
    const {
      contact_id,
      contact_phone,
      contact_email,
      message,
      channel = 'signal',
      followup_days = 14,
      agent_name = 'cultivator'
    } = params;

    const results = [];

    // 1. Send the message
    try {
      if (channel === 'signal' && contact_phone) {
        const sendResult = await this.execute({
          type: 'send_signal',
          to: contact_phone,
          message,
          contact_id
        });
        results.push({ step: 'send', result: sendResult });
      } else if (channel === 'email' && contact_email) {
        const sendResult = await this.execute({
          type: 'send_email',
          to: contact_email,
          subject: 'Quick check-in from ACT',
          body: message,
          contact_id // Required for GHL API
        });
        results.push({ step: 'send', result: sendResult });
      } else {
        throw new Error(`Cannot send via ${channel}: missing contact info`);
      }
    } catch (err) {
      return { success: false, step: 'send', error: err.message, results };
    }

    // 2. Log the interaction
    try {
      const logResult = await this.execute({
        type: 'log_interaction',
        contact_id,
        channel,
        direction: 'outbound',
        content: message,
        initiated_by: agent_name
      });
      results.push({ step: 'log', result: logResult });
    } catch (err) {
      // Non-fatal - continue even if logging fails
      results.push({ step: 'log', error: err.message });
    }

    // 3. Update contact
    try {
      const updateResult = await this.execute({
        type: 'update_contact',
        contact_id,
        updates: { last_contact_date: new Date().toISOString() }
      });
      results.push({ step: 'update', result: updateResult });
    } catch (err) {
      results.push({ step: 'update', error: err.message });
    }

    // 4. Schedule follow-up
    try {
      const followupResult = await this.execute({
        type: 'schedule_followup',
        contact_id,
        days: followup_days,
        reason: `Follow-up after ${agent_name} outreach`,
        channel
      });
      results.push({ step: 'followup', result: followupResult });
    } catch (err) {
      results.push({ step: 'followup', error: err.message });
    }

    return {
      success: results.some(r => r.result?.success),
      results
    };
  }

  /**
   * Get summary of all executions
   */
  getSummary() {
    const successful = this.results.filter(r => r.result?.success);
    const failed = this.results.filter(r => !r.result?.success);

    return {
      total: this.results.length,
      successful: successful.length,
      failed: failed.length,
      actions: this.results.map(r => ({
        type: r.action.type,
        success: r.result?.success || false,
        timestamp: r.timestamp
      }))
    };
  }
}

// ============================================================================
// CLI
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n==================================================');
  console.log('  Action Executor');
  console.log('==================================================\n');

  switch (command) {
    case 'test':
      console.log('Testing action executor in dry-run mode...\n');

      const executor = new ActionExecutor({ dryRun: true, verbose: true });

      // Test signal
      console.log('1. Testing send_signal:');
      const signalResult = await executor.execute({
        type: 'send_signal',
        to: '+61400000000',
        message: 'Test message from ACT'
      });
      console.log('   ', signalResult, '\n');

      // Test discord
      console.log('2. Testing send_discord:');
      const discordResult = await executor.execute({
        type: 'send_discord',
        channel: 'alerts',
        message: 'Test alert from action executor'
      });
      console.log('   ', discordResult, '\n');

      // Test email (via GHL)
      console.log('3. Testing send_email (GHL):');
      const emailResult = await executor.execute({
        type: 'send_email',
        to: 'test@example.com',
        subject: 'Test from ACT Cultivator',
        body: 'This is a test email sent via GHL API.',
        contact_id: 'test-contact-123'
      });
      console.log('   ', emailResult, '\n');

      // Test log
      console.log('4. Testing log_interaction:');
      const logResult = await executor.execute({
        type: 'log_interaction',
        contact_id: 'test-contact-123',
        channel: 'signal',
        direction: 'outbound',
        content: 'Test message'
      });
      console.log('   ', logResult, '\n');

      console.log('Summary:', executor.getSummary());
      break;

    case 'list':
      console.log('Available action types:\n');
      Object.entries(ACTION_HANDLERS).forEach(([type, handler]) => {
        console.log(`  ${type.padEnd(20)} - ${handler.name}`);
      });
      console.log('\nUse: node action-executor.mjs test');
      break;

    default:
      console.log('Usage:');
      console.log('  node action-executor.mjs test    - Test in dry-run mode');
      console.log('  node action-executor.mjs list    - List available actions');
      console.log('\nSupported actions:');
      Object.keys(ACTION_HANDLERS).forEach(type => {
        console.log(`  - ${type}`);
      });
  }
}

export default ActionExecutor;
