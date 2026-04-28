#!/usr/bin/env node
/**
 * Agent Heartbeat Service
 *
 * Runs continuously, checking for work every 5 minutes:
 * - Queued tasks → assign to idle agents
 * - Approved tasks → execute
 * - Scheduled tasks → trigger
 * - Agent health → update status
 */

import { createClient } from '@supabase/supabase-js';
import { executeTask } from './agent-executor.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL) || 5 * 60 * 1000; // 5 minutes
const PROJECT_NOTIFICATION_INTERVAL = 30 * 60 * 1000; // 30 minutes
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_AGENTS;

let lastProjectNotificationCheck = 0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTIFICATION HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function notifyDiscord(message, options = {}) {
  if (!DISCORD_WEBHOOK) return;

  try {
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        ...options
      })
    });
  } catch (err) {
    console.error('Discord notification failed:', err.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEARTBEAT CHECKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Check for approved tasks that need execution
 */
async function checkApprovedTasks() {
  const { data: tasks } = await supabase
    .from('agent_task_queue')
    .select('*')
    .eq('status', 'approved')
    .order('priority')
    .limit(5);

  if (!tasks?.length) return 0;

  console.log(`📋 Found ${tasks.length} approved tasks to execute`);

  for (const task of tasks) {
    try {
      const result = await executeTask(task.id);
      if (result.success) {
        await notifyDiscord(`✅ Completed: **${task.title}**`);
      } else {
        await notifyDiscord(`❌ Failed: **${task.title}** - ${result.error}`);
      }
    } catch (err) {
      console.error(`Failed to execute task ${task.id}:`, err.message);
    }
  }

  return tasks.length;
}

/**
 * Check for queued tasks and assign to idle agents
 */
async function checkQueuedTasks() {
  // Get queued tasks
  const { data: tasks } = await supabase
    .from('agent_task_queue')
    .select('*')
    .eq('status', 'queued')
    .order('priority')
    .order('created_at')
    .limit(10);

  if (!tasks?.length) return 0;

  // Get idle agents (no current task, enabled)
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('enabled', true)
    .is('current_task_id', null);

  if (!agents?.length) {
    console.log(`   All agents busy, ${tasks.length} tasks waiting`);
    return 0;
  }

  console.log(`📋 ${tasks.length} queued tasks, ${agents.length} idle agents`);

  let assigned = 0;
  for (const task of tasks) {
    // Find matching agent
    const agent = agents.find(a => a.id === task.assigned_agent);
    if (!agent) continue;

    // Check if agent can auto-execute
    if (agent.autonomy_level >= 3) {
      console.log(`   🤖 ${agent.name} auto-executing: ${task.title}`);
      await notifyDiscord(`🔄 ${agent.name} working: **${task.title}**`);

      const result = await executeTask(task.id);

      if (result.needsReview) {
        await notifyDiscord(`👁️ **Needs Review:** ${task.title}\n> ${result.output?.content?.substring(0, 200)}...`);
      } else if (result.success) {
        await notifyDiscord(`✅ ${agent.name} completed: **${task.title}**`);
      }

      assigned++;
    } else if (agent.autonomy_level === 2) {
      // Execute but mark for review
      console.log(`   🤖 ${agent.name} executing (needs review): ${task.title}`);
      await notifyDiscord(`🔄 ${agent.name} working: **${task.title}** (will need review)`);

      await executeTask(task.id);
      assigned++;
    } else {
      // Level 1: Just suggest, don't execute
      console.log(`   💡 ${agent.name} suggests: ${task.title}`);
      await notifyDiscord(`💡 **Suggestion from ${agent.name}:** ${task.title}\nApprove to proceed.`);
    }
  }

  return assigned;
}

/**
 * Check tasks needing review and send reminders
 */
async function checkReviewTasks() {
  const { data: tasks } = await supabase
    .from('agent_task_queue')
    .select('*, agents(name)')
    .eq('status', 'review')
    .lt('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Older than 30 min
    .limit(5);

  if (!tasks?.length) return 0;

  console.log(`👁️ ${tasks.length} tasks awaiting review (30+ min)`);

  // Send reminder
  const taskList = tasks.map(t => `• ${t.title}`).join('\n');
  await notifyDiscord(`⏰ **${tasks.length} tasks waiting for review:**\n${taskList}`);

  return tasks.length;
}

/**
 * Update agent heartbeats
 */
async function updateAgentHeartbeats() {
  // Mark agents with active tasks
  const { data: activeTasks } = await supabase
    .from('agent_task_queue')
    .select('assigned_agent')
    .eq('status', 'working');

  const activeAgents = new Set(activeTasks?.map(t => t.assigned_agent) || []);

  // Update all agent heartbeats
  const { data: agents } = await supabase
    .from('agents')
    .select('id')
    .eq('enabled', true);

  for (const agent of agents || []) {
    await supabase
      .from('agents')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', agent.id);
  }

  return agents?.length || 0;
}

/**
 * Check for project-related communications and notify
 */
async function checkProjectNotifications() {
  const now = Date.now();

  // Only run every 30 minutes
  if (now - lastProjectNotificationCheck < PROJECT_NOTIFICATION_INTERVAL) {
    return 0;
  }

  lastProjectNotificationCheck = now;

  try {
    // Get last check time from sync_state
    const { data: syncState } = await supabase
      .from('sync_state')
      .select('last_sync_at')
      .eq('id', 'project-notifications-heartbeat')
      .single();

    const lastCheck = syncState?.last_sync_at ||
      new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Get inbound communications since last check
    const { data: comms } = await supabase
      .from('communications_history')
      .select('id, ghl_contact_id, subject, occurred_at, channel')
      .eq('direction', 'inbound')
      .gte('occurred_at', lastCheck)
      .limit(20);

    if (!comms || comms.length === 0) {
      return 0;
    }

    // Get contacts for these communications
    const contactIds = [...new Set(comms.map(c => c.ghl_contact_id))];
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, tags')
      .in('ghl_id', contactIds);

    const contactMap = new Map((contacts || []).map(c => [c.ghl_id, c]));

    // Priority tags to highlight
    const priorityTags = ['partner', 'funder', 'justicehub', 'picc', 'goods', 'responsive'];

    let priorityCount = 0;
    const priorityContacts = [];

    for (const comm of comms) {
      const contact = contactMap.get(comm.ghl_contact_id);
      if (!contact) continue;

      const tags = (contact.tags || []).map(t => t.toLowerCase());
      const isPriority = priorityTags.some(pt => tags.includes(pt));

      if (isPriority) {
        priorityCount++;
        priorityContacts.push({
          name: contact.full_name,
          subject: comm.subject,
          channel: comm.channel
        });
      }
    }

    // Notify if priority communications
    if (priorityCount > 0) {
      const contactList = priorityContacts.slice(0, 3)
        .map(c => `• ${c.name}: ${c.subject?.slice(0, 50) || '(no subject)'}`)
        .join('\n');

      await notifyDiscord(
        `📬 **${priorityCount} priority message(s)**\n${contactList}${priorityCount > 3 ? `\n... and ${priorityCount - 3} more` : ''}`
      );
    }

    // Update last check time
    await supabase
      .from('sync_state')
      .upsert({
        id: 'project-notifications-heartbeat',
        sync_type: 'notifications',
        last_sync_at: new Date().toISOString()
      });

    return priorityCount;
  } catch (err) {
    console.error('Project notification check failed:', err.message);
    return 0;
  }
}

/**
 * Check for stale tasks (working for too long)
 */
async function checkStaleTasks() {
  const { data: tasks } = await supabase
    .from('agent_task_queue')
    .select('*')
    .eq('status', 'working')
    .lt('started_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Working > 15 min

  if (!tasks?.length) return 0;

  console.log(`⚠️ ${tasks.length} stale tasks (working > 15 min)`);

  for (const task of tasks) {
    // Mark as failed
    await supabase
      .from('agent_task_queue')
      .update({
        status: 'failed',
        error: 'Task timed out (exceeded 15 minutes)'
      })
      .eq('id', task.id);

    // Clear agent's current task
    if (task.assigned_agent) {
      await supabase
        .from('agents')
        .update({ current_task_id: null })
        .eq('id', task.assigned_agent);
    }

    await notifyDiscord(`⚠️ Task timed out: **${task.title}**`);
  }

  return tasks.length;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN HEARTBEAT LOOP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function heartbeat() {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`\n💓 Heartbeat [${timestamp}]`);

  try {
    // 1. Execute approved tasks
    await checkApprovedTasks();

    // 2. Assign and execute queued tasks
    await checkQueuedTasks();

    // 3. Check tasks needing review
    await checkReviewTasks();

    // 4. Check for stale tasks
    await checkStaleTasks();

    // 5. Update agent heartbeats
    await updateAgentHeartbeats();

    // 6. Check project notifications (every 30 min)
    await checkProjectNotifications();

  } catch (err) {
    console.error('Heartbeat error:', err.message);
  }
}

/**
 * Start the heartbeat loop
 */
async function startHeartbeat() {
  console.log(`
🫀 Agent Heartbeat Service
━━━━━━━━━━━━━━━━━━━━━━━━━━

Interval: ${HEARTBEAT_INTERVAL / 1000}s
Discord:  ${DISCORD_WEBHOOK ? 'enabled' : 'disabled'}

Monitoring for:
• Approved tasks → execute
• Queued tasks → assign & execute
• Review reminders → notify
• Stale tasks → timeout
• Project notifications → every 30 min

Press Ctrl+C to stop.
`);

  // Initial heartbeat
  await heartbeat();

  // Start interval
  setInterval(heartbeat, HEARTBEAT_INTERVAL);
}

// Single heartbeat for testing
export async function runOnce() {
  await heartbeat();
}

// Start service
if (process.argv[1]?.endsWith('agent-heartbeat.mjs')) {
  const command = process.argv[2];

  if (command === 'once') {
    runOnce().then(() => process.exit(0)).catch(console.error);
  } else {
    startHeartbeat().catch(console.error);
  }
}

export default { startHeartbeat, runOnce, heartbeat };
