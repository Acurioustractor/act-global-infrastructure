#!/usr/bin/env node
/**
 * Agent Dispatcher
 *
 * Routes incoming requests to the appropriate agent based on intent analysis.
 * Creates tasks in the unified queue and notifies channels.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI();

// Agent capabilities for routing
const AGENT_CAPABILITIES = {
  scout: {
    keywords: ['research', 'find', 'search', 'look up', 'investigate', 'analyze', 'explore', 'what is', 'how does'],
    domain: 'research',
    taskTypes: ['research', 'analysis']
  },
  scribe: {
    keywords: ['write', 'draft', 'create', 'blog', 'newsletter', 'email', 'document', 'content', 'post'],
    domain: 'content',
    taskTypes: ['draft', 'content']
  },
  ledger: {
    keywords: ['invoice', 'expense', 'money', 'payment', 'xero', 'financial', 'budget', 'cost', 'r&d', 'tax'],
    domain: 'finance',
    taskTypes: ['calculate', 'financial']
  },
  cultivator: {
    keywords: ['follow up', 'contact', 'relationship', 'partner', 'reach out', 'dinner', 'meeting', 'connect'],
    domain: 'relationships',
    taskTypes: ['outreach', 'relationship']
  },
  shepherd: {
    keywords: ['project', 'status', 'update', 'milestone', 'progress', 'blocker', 'deadline', 'task'],
    domain: 'projects',
    taskTypes: ['status', 'project']
  },
  oracle: {
    keywords: ['question', 'answer', 'knowledge', 'tell me', 'explain', 'what do we know', 'qa'],
    domain: 'knowledge',
    taskTypes: ['qa', 'knowledge']
  },
  herald: {
    keywords: ['announce', 'notify', 'send', 'digest', 'brief', 'update everyone', 'broadcast'],
    domain: 'communications',
    taskTypes: ['notification', 'announcement']
  }
};

/**
 * Analyze intent from message using LLM
 */
async function analyzeIntent(message) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 500,
    messages: [
      {
        role: 'system',
        content: `You analyze user requests and determine:
1. A brief summary (1 sentence)
2. The primary task type: research, draft, calculate, action, outreach, status, qa, notification
3. Urgency: 1 (urgent), 2 (normal), 3 (low), 4 (whenever)
4. Best agent: scout, scribe, ledger, cultivator, shepherd, oracle, herald

Output JSON only: {"summary": "...", "taskType": "...", "urgency": 2, "agent": "..."}`
      },
      { role: 'user', content: message }
    ]
  });

  try {
    const text = response.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (e) {
    // Fallback to keyword matching
    return analyzeIntentByKeywords(message);
  }
}

/**
 * Fallback: analyze by keywords
 */
function analyzeIntentByKeywords(message) {
  const lower = message.toLowerCase();

  for (const [agentId, config] of Object.entries(AGENT_CAPABILITIES)) {
    for (const keyword of config.keywords) {
      if (lower.includes(keyword)) {
        return {
          summary: message.substring(0, 100),
          taskType: config.taskTypes[0],
          urgency: 2,
          agent: agentId
        };
      }
    }
  }

  // Default to oracle for general questions
  return {
    summary: message.substring(0, 100),
    taskType: 'action',
    urgency: 2,
    agent: 'oracle'
  };
}

/**
 * Main dispatch function
 */
export async function dispatch(request) {
  const { message, source, context, requestedBy = 'ben' } = request;

  console.log(`📨 Dispatching: "${message.substring(0, 50)}..." from ${source}`);

  // Analyze intent
  const intent = await analyzeIntent(message);
  console.log(`   Intent: ${intent.agent} → ${intent.taskType} (P${intent.urgency})`);

  // Get agent info
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', intent.agent)
    .single();

  if (!agent?.enabled) {
    console.log(`   ⚠️ Agent ${intent.agent} is disabled, falling back to oracle`);
    intent.agent = 'oracle';
  }

  // Create task in queue
  const { data: task, error } = await supabase
    .from('agent_task_queue')
    .insert({
      title: intent.summary,
      description: message,
      task_type: intent.taskType,
      assigned_agent: intent.agent,
      requested_by: requestedBy,
      source,
      source_id: context?.message_id || context?.thread_id,
      priority: intent.urgency,
      needs_review: agent?.autonomy_level < 3,
      notify_channels: context?.notify_channels || ['discord'],
      reply_to: context
    })
    .select()
    .single();

  if (error) {
    console.error('   ❌ Failed to create task:', error);
    throw error;
  }

  console.log(`   ✅ Created task ${task.id} for ${intent.agent}`);

  // Log channel message
  if (context?.channel_id) {
    await supabase.from('channel_messages').insert({
      channel: source,
      channel_id: context.channel_id,
      message_id: context.message_id,
      thread_id: context.thread_id,
      task_id: task.id,
      direction: 'inbound',
      content: message,
      sender: requestedBy
    });
  }

  return {
    task,
    agent: intent.agent,
    agentName: agent?.name || intent.agent
  };
}

/**
 * Get routing info without creating task
 */
export async function routeOnly(message) {
  return await analyzeIntent(message);
}

// CLI interface
if (process.argv[1]?.endsWith('agent-dispatcher.mjs')) {
  const message = process.argv.slice(2).join(' ');
  if (!message) {
    console.log('Usage: node agent-dispatcher.mjs "your request"');
    process.exit(1);
  }

  dispatch({
    message,
    source: 'cli',
    context: {},
    requestedBy: 'ben'
  }).then(result => {
    console.log(`\nTask created: ${result.task.id}`);
    console.log(`Agent: ${result.agentName}`);
  }).catch(console.error);
}

export default { dispatch, routeOnly, AGENT_CAPABILITIES };
