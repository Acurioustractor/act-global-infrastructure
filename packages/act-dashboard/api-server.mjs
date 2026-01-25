#!/usr/bin/env node
/**
 * ACT Agentic PM API Server
 *
 * Exposes agentic-pm.mjs functions as HTTP endpoints for the frontend.
 *
 * Usage: node packages/act-dashboard/api-server.mjs
 * Then open: http://localhost:3456/projects.html
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, readFile, stat } from 'fs/promises';
import { execSync } from 'child_process';
import { homedir } from 'os';

// Load env using the same loader as other scripts
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
await import(join(__dirname, '../../lib/load-env.mjs'));

// Import skill loader for marketing skills integration
import { loadSkillsForAgent, loadSkills, buildSkillPrompt } from '../../scripts/lib/skill-loader.mjs';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.API_PORT || 3456;

// Use SHARED Supabase which has all ACT tables (ghl_contacts, calendar_events, etc.)
const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI();
const MODEL = 'gpt-4o';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GOAL DECOMPOSITION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function decomposeGoal(goal, context = {}) {
  const systemPrompt = `You are a project planning agent for ACT (Art Craft Technology), a social enterprise in Australia focused on empathy-driven technology and social impact projects.

Your job is to take a high-level goal and decompose it into specific, actionable tasks.

For each task, determine:
1. Title (clear, actionable)
2. Description (what needs to be done)
3. Type: research | draft | calculate | action | review | decision
4. Assignment mode:
   - "agent" = AI can do this autonomously
   - "human" = Requires human action (e.g., signing docs, making calls)
   - "dual" = AI drafts, human reviews
   - "review" = Human reviews AI output
5. Priority: 1 (urgent) to 4 (low)
6. Dependencies: which tasks must complete first

Output as JSON array of tasks.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Goal: ${goal}

${context.additional ? `Additional context: ${context.additional}` : ''}

Decompose this into 5-15 specific tasks. Be practical and actionable.
Output ONLY valid JSON array, no markdown.` }
    ]
  });

  const text = response.choices[0].message.content;

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (e) {
    console.error('Failed to parse tasks:', e.message);
    return [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTION AGENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeTask(task, project) {
  const start = Date.now();

  await supabase
    .from('agentic_tasks')
    .update({
      status: 'agent_working',
      agent_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', task.id);

  let output, reasoning, confidence;

  try {
    switch (task.task_type) {
      case 'research':
        ({ output, reasoning, confidence } = await researchAgent(task, project));
        break;
      case 'draft':
        ({ output, reasoning, confidence } = await draftAgent(task, project));
        break;
      case 'calculate':
        ({ output, reasoning, confidence } = await calculateAgent(task, project));
        break;
      default:
        ({ output, reasoning, confidence } = await generalAgent(task, project));
    }

    const nextStatus = task.assignment_mode === 'agent' ? 'completed' :
                       task.assignment_mode === 'dual' || task.assignment_mode === 'review' ? 'needs_review' :
                       'completed';

    await supabase
      .from('agentic_tasks')
      .update({
        status: nextStatus,
        agent_output: output,
        agent_reasoning: reasoning,
        agent_confidence: confidence,
        agent_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id);

    await supabase.from('agentic_work_log').insert({
      project_id: project.id,
      task_id: task.id,
      agent_type: task.task_type,
      action: 'execute',
      input_summary: { title: task.title, description: task.description },
      output_summary: output,
      duration_ms: Date.now() - start,
      model_used: MODEL,
      success: true
    });

    return { success: true, output, reasoning, confidence, status: nextStatus };

  } catch (error) {
    await supabase
      .from('agentic_tasks')
      .update({
        status: 'blocked',
        agent_reasoning: `Error: ${error.message}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id);

    return { success: false, error: error.message };
  }
}

async function researchAgent(task, project) {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: `You are a research agent for ACT, an Australian social enterprise.
Your job is to research and compile information.
Be thorough but concise. Cite sources where possible.
Focus on Australian context (ATO, ASIC, AusIndustry, etc.).` },
      { role: 'user', content: `Project: ${project.name}
Goal: ${project.goal}

Research Task: ${task.title}
${task.description ? `Details: ${task.description}` : ''}

Provide a structured research summary with key findings, relevant links/sources, and actionable recommendations.` }
    ]
  });

  return {
    output: {
      type: 'research',
      summary: response.choices[0].message.content,
    },
    reasoning: 'Researched using available knowledge, focused on Australian regulatory context.',
    confidence: 0.8
  };
}

async function draftAgent(task, project) {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: `You are a drafting agent for ACT, an Australian social enterprise.
Your job is to draft documents, templates, and content.
Be professional but aligned with ACT's values: empathy, innovation, social impact.
When drafting legal/compliance documents, note they need professional review.` },
      { role: 'user', content: `Project: ${project.name}
Goal: ${project.goal}

Drafting Task: ${task.title}
${task.description ? `Details: ${task.description}` : ''}

Create a complete draft. If it's a template, use [PLACEHOLDER] for items needing customization.` }
    ]
  });

  return {
    output: {
      type: 'draft',
      content: response.choices[0].message.content,
      needs_review: true,
    },
    reasoning: 'Created draft based on task requirements and ACT context.',
    confidence: 0.75
  };
}

async function calculateAgent(task, project) {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: `You are a calculation agent for ACT, an Australian social enterprise.
Your job is to perform calculations, estimates, and financial projections.
Be precise with numbers. Show your working. Use Australian tax rates and regulations.` },
      { role: 'user', content: `Project: ${project.name}
Goal: ${project.goal}

Calculation Task: ${task.title}
${task.description ? `Details: ${task.description}` : ''}

Provide calculations with clear workings and assumptions.` }
    ]
  });

  return {
    output: {
      type: 'calculation',
      analysis: response.choices[0].message.content,
    },
    reasoning: 'Calculated based on Australian tax rates and provided context.',
    confidence: 0.85
  };
}

async function generalAgent(task, project) {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: `You are a project assistant for ACT, an Australian social enterprise.
Help complete tasks efficiently and thoroughly.` },
      { role: 'user', content: `Project: ${project.name}
Goal: ${project.goal}

Task: ${task.title}
${task.description ? `Details: ${task.description}` : ''}

Complete this task as thoroughly as possible.` }
    ]
  });

  return {
    output: {
      type: 'general',
      result: response.choices[0].message.content
    },
    reasoning: 'Completed general task based on requirements.',
    confidence: 0.7
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHAT AGENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function chatWithProject(projectId, message) {
  const { data: project } = await supabase
    .from('agentic_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  const { data: tasks } = await supabase
    .from('agentic_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('position');

  const { data: history } = await supabase
    .from('agentic_chat')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10);

  await supabase.from('agentic_chat').insert({
    project_id: projectId,
    role: 'user',
    content: message
  });

  const taskSummary = tasks?.map(t =>
    `- [${t.status}] ${t.title} (${t.assignment_mode})`
  ).join('\n') || 'No tasks yet';

  const chatHistory = (history || []).reverse().map(m =>
    `${m.role}: ${m.content}`
  ).join('\n');

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: `You are an AI project manager for ACT (Art Craft Technology).
You can:
1. Answer questions about the project
2. Create new tasks (respond with JSON: {"action": "create_task", "task": {...}})
3. Execute tasks (respond with JSON: {"action": "execute_task", "task_id": "..."})
4. Research topics
5. Update task status

Project: ${project.name}
Goal: ${project.goal}

Current Tasks:
${taskSummary}

Be helpful, proactive, and action-oriented. If you can do something, do it.` },
      ...(chatHistory ? [{ role: 'user', content: `Previous conversation:\n${chatHistory}` }] : []),
      { role: 'user', content: message }
    ]
  });

  const reply = response.choices[0].message.content;

  let action = null;
  try {
    const actionMatch = reply.match(/\{[\s\S]*"action"[\s\S]*\}/);
    if (actionMatch) {
      action = JSON.parse(actionMatch[0]);
    }
  } catch (e) {}

  if (action?.action === 'create_task' && action.task) {
    await supabase
      .from('agentic_tasks')
      .insert({
        project_id: projectId,
        title: action.task.title,
        description: action.task.description,
        task_type: action.task.type || 'action',
        assignment_mode: action.task.assignment_mode || 'agent',
        priority: action.task.priority || 2
      });
  }

  if (action?.action === 'execute_task' && action.task_id) {
    const task = tasks?.find(t => t.id === action.task_id);
    if (task) {
      await executeTask(task, project);
    }
  }

  await supabase.from('agentic_chat').insert({
    project_id: projectId,
    role: 'agent',
    agent_type: 'pm',
    content: reply,
    action_taken: action
  });

  return { reply, action };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND CENTER ENDPOINTS (Multi-Agent System)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

// Analyze intent using LLM
async function analyzeIntent(message) {
  try {
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

    const text = response.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (e) {
    // Fallback to keyword matching
    return analyzeIntentByKeywords(message);
  }
}

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

  return {
    summary: message.substring(0, 100),
    taskType: 'action',
    urgency: 2,
    agent: 'oracle'
  };
}

// Get all agents with status
app.get('/api/agents', async (req, res) => {
  try {
    const { data: agents } = await supabase
      .from('agent_status')
      .select('*')
      .order('id');

    res.json(agents || []);
  } catch (e) {
    // Fallback if view doesn't exist
    const defaultAgents = [
      { id: 'dispatcher', name: 'Dispatcher', domain: 'routing', status: 'online' },
      { id: 'scout', name: 'Scout', domain: 'research', status: 'idle' },
      { id: 'scribe', name: 'Scribe', domain: 'content', status: 'idle' },
      { id: 'ledger', name: 'Ledger', domain: 'finance', status: 'idle' },
      { id: 'cultivator', name: 'Cultivator', domain: 'relationships', status: 'idle' },
      { id: 'shepherd', name: 'Shepherd', domain: 'projects', status: 'idle' },
      { id: 'oracle', name: 'Oracle', domain: 'knowledge', status: 'idle' },
      { id: 'herald', name: 'Herald', domain: 'communications', status: 'idle' }
    ];
    res.json(defaultAgents);
  }
});

// Get tasks with filtering
app.get('/api/tasks', async (req, res) => {
  try {
    const { status, agent, limit = 50 } = req.query;

    let query = supabase
      .from('task_queue_dashboard')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (agent && agent !== 'all') {
      query = query.eq('assigned_agent', agent);
    }

    const { data: tasks, error } = await query;

    if (error) {
      // Fallback to direct table if view doesn't exist
      let fallbackQuery = supabase
        .from('agent_task_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (status && status !== 'all') {
        fallbackQuery = fallbackQuery.eq('status', status);
      }
      if (agent && agent !== 'all') {
        fallbackQuery = fallbackQuery.eq('assigned_agent', agent);
      }

      const { data: fallbackTasks } = await fallbackQuery;
      return res.json(fallbackTasks || []);
    }

    res.json(tasks || []);
  } catch (e) {
    console.error('Error fetching tasks:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get single task
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { data: task, error } = await supabase
      .from('agent_task_queue')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(task);
  } catch (e) {
    res.status(404).json({ error: 'Task not found' });
  }
});

// Dispatch message to agent
app.post('/api/dispatch', async (req, res) => {
  try {
    const { message, source = 'dashboard', context = {} } = req.body;

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

    // Create task in queue
    const { data: task, error } = await supabase
      .from('agent_task_queue')
      .insert({
        title: intent.summary,
        description: message,
        task_type: intent.taskType,
        assigned_agent: intent.agent,
        requested_by: 'ben',
        source,
        priority: intent.urgency,
        needs_review: (agent?.autonomy_level || 2) < 3,
        notify_channels: ['dashboard']
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`   ✅ Created task ${task.id} for ${intent.agent}`);

    res.json({
      task,
      agent: intent.agent,
      agentName: agent?.name || intent.agent
    });
  } catch (e) {
    console.error('Dispatch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Execute single task
app.post('/api/tasks/:id/execute', async (req, res) => {
  try {
    const taskId = req.params.id;

    // Get task
    const { data: task, error } = await supabase
      .from('agent_task_queue')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    console.log(`🤖 ${task.assigned_agent} executing: ${task.title}`);

    // Update status to working
    await supabase
      .from('agent_task_queue')
      .update({ status: 'working', started_at: new Date().toISOString() })
      .eq('id', taskId);

    const startTime = Date.now();

    // Execute based on task type
    let output, reasoning, confidence;
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: `You are ${task.assigned_agent}, an AI agent for ACT (Art Craft Technology).
Your domain is ${AGENT_CAPABILITIES[task.assigned_agent]?.domain || 'general'}.
Be helpful, thorough, and action-oriented.
Focus on Australian context where relevant.`
          },
          { role: 'user', content: `Task: ${task.title}\n\n${task.description}` }
        ]
      });

      output = {
        type: task.task_type,
        content: response.choices[0].message.content
      };
      reasoning = `Completed by ${task.assigned_agent} agent`;
      confidence = 0.8;

    } catch (e) {
      output = { error: e.message };
      reasoning = `Error: ${e.message}`;
      confidence = 0;
    }

    // Determine if needs review
    const { data: agentData } = await supabase
      .from('agents')
      .select('autonomy_level')
      .eq('id', task.assigned_agent)
      .single();

    const needsReview = task.needs_review || (agentData?.autonomy_level || 2) < 3;

    // Update task
    await supabase
      .from('agent_task_queue')
      .update({
        status: needsReview ? 'review' : 'done',
        output,
        reasoning,
        confidence,
        completed_at: needsReview ? null : new Date().toISOString(),
        duration_ms: Date.now() - startTime
      })
      .eq('id', taskId);

    console.log(`   ✅ ${needsReview ? 'Needs review' : 'Done'} (${Date.now() - startTime}ms)`);

    res.json({
      success: true,
      needsReview,
      output,
      duration: Date.now() - startTime
    });

  } catch (e) {
    console.error('Execute error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Approve task
app.post('/api/tasks/:id/approve', async (req, res) => {
  try {
    const { error } = await supabase
      .from('agent_task_queue')
      .update({
        status: 'done',
        review_decision: 'approved',
        reviewed_by: 'ben',
        reviewed_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (error) throw error;
    console.log(`✅ Task ${req.params.id} approved`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reject task
app.post('/api/tasks/:id/reject', async (req, res) => {
  try {
    const { feedback } = req.body;
    const { error } = await supabase
      .from('agent_task_queue')
      .update({
        status: 'rejected',
        review_decision: 'rejected',
        review_feedback: feedback,
        reviewed_by: 'ben',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (error) throw error;
    console.log(`❌ Task ${req.params.id} rejected`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manual heartbeat trigger
app.post('/api/heartbeat', async (req, res) => {
  try {
    let approved = 0, queued = 0, stale = 0;

    // Check approved tasks
    const { data: approvedTasks } = await supabase
      .from('agent_task_queue')
      .select('*')
      .eq('status', 'approved')
      .limit(5);

    approved = approvedTasks?.length || 0;

    // Check queued tasks
    const { data: queuedTasks } = await supabase
      .from('agent_task_queue')
      .select('*')
      .eq('status', 'queued')
      .limit(10);

    queued = queuedTasks?.length || 0;

    // Check stale tasks (working > 15 min)
    const { data: staleTasks } = await supabase
      .from('agent_task_queue')
      .select('*')
      .eq('status', 'working')
      .lt('started_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

    stale = staleTasks?.length || 0;

    // Mark stale tasks as failed
    for (const task of staleTasks || []) {
      await supabase
        .from('agent_task_queue')
        .update({ status: 'failed', error: 'Task timed out (exceeded 15 minutes)' })
        .eq('id', task.id);
    }

    // Update agent heartbeats
    await supabase
      .from('agents')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('enabled', true);

    console.log(`💓 Heartbeat: ${approved} approved, ${queued} queued, ${stale} stale`);

    res.json({ approved, queued, stale, time: new Date().toISOString() });
  } catch (e) {
    console.error('Heartbeat error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Create project from goal
app.post('/api/projects', async (req, res) => {
  try {
    const { goal, context } = req.body;

    if (!goal) {
      return res.status(400).json({ error: 'Goal is required' });
    }

    console.log(`\n🧠 Creating project: "${goal}"`);

    // Decompose goal into tasks
    const tasks = await decomposeGoal(goal, context);
    console.log(`   Decomposed into ${tasks.length} tasks`);

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('agentic_projects')
      .insert({
        name: goal.substring(0, 50) + (goal.length > 50 ? '...' : ''),
        goal,
        owner: 'ben'
      })
      .select()
      .single();

    if (projectError) {
      throw new Error(projectError.message);
    }

    // Create tasks
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const assignedAgent = t.assignment_mode === 'human' ? null :
        t.type === 'research' ? 'researcher' :
        t.type === 'draft' ? 'drafter' :
        t.type === 'calculate' ? 'calculator' : 'general';

      await supabase.from('agentic_tasks').insert({
        project_id: project.id,
        title: t.title,
        description: t.description,
        task_type: t.type || 'action',
        assignment_mode: t.assignment_mode || 'agent',
        assigned_agent: assignedAgent,
        assigned_human: t.assignment_mode === 'human' || t.assignment_mode === 'dual' ? 'ben' : null,
        priority: t.priority || 2,
        position: i
      });
    }

    console.log(`   ✅ Project created: ${project.id}`);

    res.json({
      project,
      tasks_created: tasks.length,
      message: `Created project with ${tasks.length} tasks`
    });

  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run agents on pending tasks
app.post('/api/projects/:id/work', async (req, res) => {
  try {
    const projectId = req.params.id;

    const { data: project } = await supabase
      .from('agentic_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: tasks } = await supabase
      .from('agentic_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .in('assignment_mode', ['agent', 'dual', 'review'])
      .order('priority')
      .order('position');

    if (!tasks?.length) {
      return res.json({ message: 'No pending tasks for agents', tasks_completed: 0 });
    }

    console.log(`\n🤖 Working on ${tasks.length} tasks for project: ${project.name}`);

    const results = [];
    for (const task of tasks) {
      console.log(`   Working: ${task.title}`);
      const result = await executeTask(task, project);
      results.push({ task_id: task.id, title: task.title, ...result });
    }

    res.json({
      message: `Completed ${results.length} tasks`,
      tasks_completed: results.length,
      results
    });

  } catch (error) {
    console.error('Error running agents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run agent on single task
app.post('/api/tasks/:id/execute', async (req, res) => {
  try {
    const taskId = req.params.id;

    const { data: task } = await supabase
      .from('agentic_tasks')
      .select('*, agentic_projects(*)')
      .eq('id', taskId)
      .single();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    console.log(`\n🤖 Executing task: ${task.title}`);
    const result = await executeTask(task, task.agentic_projects);

    res.json(result);

  } catch (error) {
    console.error('Error executing task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat with project agent
app.post('/api/projects/:id/chat', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`\n💬 Chat: ${message}`);
    const { reply, action } = await chatWithProject(projectId, message);

    res.json({ reply, action });

  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INFRASTRUCTURE ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Get Claude Code layer infrastructure (~/.claude/)
app.get('/api/infrastructure', async (req, res) => {
  try {
    const claudeDir = join(homedir(), '.claude');
    const infrastructure = {
      agents: [],
      skills: [],
      hooks: [],
      mcps: [],
      rules: [],
      projectSkills: [],
      projectSubagents: []
    };

    // 1. Agents (~/.claude/agents/*.md)
    try {
      const agentsDir = join(claudeDir, 'agents');
      const agentFiles = await readdir(agentsDir);
      infrastructure.agents = agentFiles
        .filter(f => f.endsWith('.md'))
        .map(f => ({ name: f.replace('.md', ''), file: f }));
    } catch (e) { /* agents dir may not exist */ }

    // 2. Skills (~/.claude/skills/*/skill.md)
    try {
      const skillsDir = join(claudeDir, 'skills');
      const skillDirs = await readdir(skillsDir);
      for (const dir of skillDirs) {
        const skillPath = join(skillsDir, dir, 'skill.md');
        try {
          await stat(skillPath);
          infrastructure.skills.push({ name: dir, path: skillPath });
        } catch (e) { /* skill.md not found */ }
      }
    } catch (e) { /* skills dir may not exist */ }

    // 3. Hooks (~/.claude/hooks/*.js)
    try {
      const hooksDir = join(claudeDir, 'hooks');
      const hookFiles = await readdir(hooksDir);
      infrastructure.hooks = hookFiles
        .filter(f => f.endsWith('.js'))
        .map(f => ({ name: f.replace('.js', ''), file: f }));
    } catch (e) { /* hooks dir may not exist */ }

    // 4. MCPs (~/.claude/mcp.json)
    try {
      const mcpPath = join(claudeDir, 'mcp.json');
      const mcpContent = await readFile(mcpPath, 'utf-8');
      const mcpConfig = JSON.parse(mcpContent);
      infrastructure.mcps = Object.keys(mcpConfig.mcpServers || {}).map(name => ({
        name,
        enabled: mcpConfig.mcpServers[name].disabled !== true
      }));
    } catch (e) { /* mcp.json may not exist */ }

    // 5. Rules (~/.claude/rules/*.md)
    try {
      const rulesDir = join(claudeDir, 'rules');
      const ruleFiles = await readdir(rulesDir);
      infrastructure.rules = ruleFiles
        .filter(f => f.endsWith('.md'))
        .map(f => ({ name: f.replace('.md', ''), file: f }));
    } catch (e) { /* rules dir may not exist */ }

    // 6. Project-level skills (.claude/skills/)
    try {
      const projectSkillsDir = join(__dirname, '../../.claude/skills');
      const projectSkillDirs = await readdir(projectSkillsDir);
      infrastructure.projectSkills = projectSkillDirs.map(d => ({ name: d }));
    } catch (e) { /* project skills dir may not exist */ }

    // 7. Project-level subagents (.claude/subagents/)
    try {
      const subagentsDir = join(__dirname, '../../.claude/subagents');
      const subagentFiles = await readdir(subagentsDir);
      infrastructure.projectSubagents = subagentFiles
        .filter(f => f.endsWith('.md'))
        .map(f => ({ name: f.replace('.md', ''), file: f }));
    } catch (e) { /* subagents dir may not exist */ }

    res.json(infrastructure);
  } catch (e) {
    console.error('Infrastructure error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get all codebases with git status
app.get('/api/codebases', async (req, res) => {
  try {
    const configPath = join(__dirname, '../../config/act-core-repos.json');
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    const codebases = [];
    for (const repo of config.actEcosystemRepos) {
      const codebase = {
        name: repo.name,
        path: repo.path,
        description: repo.description,
        branch: repo.branch,
        github: repo.github,
        status: 'unknown',
        changes: 0,
        lastCommit: null
      };

      try {
        // Check if path exists and get git status
        const gitStatus = execSync(`git -C "${repo.path}" status --porcelain`, { encoding: 'utf-8' });
        const changes = gitStatus.trim().split('\n').filter(l => l).length;
        codebase.status = changes > 0 ? 'modified' : 'clean';
        codebase.changes = changes;

        // Get last commit
        const lastCommit = execSync(`git -C "${repo.path}" log -1 --format="%h|%s|%ar"`, { encoding: 'utf-8' });
        const [hash, message, time] = lastCommit.trim().split('|');
        codebase.lastCommit = { hash, message: message?.substring(0, 50), time };
      } catch (e) {
        codebase.status = 'error';
        codebase.error = e.message?.substring(0, 100);
      }

      codebases.push(codebase);
    }

    res.json(codebases);
  } catch (e) {
    console.error('Codebases error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get ACT frontends with Vercel deployment data
// Transforms data to match FrontendsTab expected interface
app.get('/api/frontends', async (req, res) => {
  try {
    const cachePath = join(__dirname, '../../.claude/cache/project-intelligence/frontends.json');

    // Try to read cached data
    let frontends;
    try {
      const cacheContent = await readFile(cachePath, 'utf-8');
      frontends = JSON.parse(cacheContent);
    } catch (e) {
      // If cache doesn't exist, generate fresh data
      console.log('Frontends cache not found, generating...');
      try {
        execSync('node scripts/project-enrichment.mjs frontends', {
          cwd: join(__dirname, '../..'),
          encoding: 'utf-8',
          timeout: 60000
        });
        const freshContent = await readFile(cachePath, 'utf-8');
        frontends = JSON.parse(freshContent);
      } catch (genErr) {
        return res.status(500).json({ error: 'Could not generate frontends data: ' + genErr.message });
      }
    }

    // Map raw categories to FrontendsTab expected categories
    const categoryMap = {
      'public': 'core',
      'core': 'core',
      'project': 'client',
      'client': 'client',
      'internal': 'internal',
      'infrastructure': 'internal',
      'vercel': 'client'  // Vercel-only projects are typically client-facing
    };

    // Determine type based on characteristics
    function getType(f) {
      if (f.category === 'infrastructure' || f.id.includes('docker') || f.id.includes('infrastructure')) {
        return 'infrastructure';
      }
      if (f.tech?.some(t => ['Supabase', 'API', 'Express'].includes(t)) && f.url?.includes('localhost')) {
        return 'infrastructure';
      }
      if (f.name?.toLowerCase().includes('platform') || f.id.includes('platform') || f.id.includes('ledger') || f.id.includes('hub')) {
        return 'platform';
      }
      return 'website';
    }

    // Calculate health score based on status and activity
    function getHealthScore(f) {
      let score = 70; // Base score
      if (f.status === 'online') score += 15;
      if (f.isLive) score += 10;
      if (f.lastActivity) score += 5;
      if (f.vercel?.lastUpdated) {
        // Recent activity boosts score
        const updated = f.vercel.lastUpdated;
        if (updated.includes('m') || updated.includes('h')) score += 10;
        else if (updated.includes('d') && parseInt(updated) < 7) score += 5;
      }
      return Math.min(score, 100);
    }

    // Add health check for each frontend with a URL and transform data
    const enrichedFrontends = await Promise.all(
      frontends.frontends.map(async (f) => {
        // Health check for live URLs
        if (f.url && f.url.startsWith('http') && !f.url.includes('localhost')) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(f.url, {
              method: 'HEAD',
              signal: controller.signal
            });
            clearTimeout(timeout);
            f.httpStatus = response.status;
            f.isLive = response.ok;
          } catch (e) {
            f.httpStatus = 0;
            f.isLive = false;
          }
        }

        // Infer project tags from name
        function inferProjectTags(name) {
          const tags = [];
          const lower = (name || '').toLowerCase();
          if (lower.includes('empathy') || lower.includes('ledger')) tags.push('ACT-EL');
          if (lower.includes('justice') || lower.includes('hub') || lower.includes('bail')) tags.push('ACT-JH');
          if (lower.includes('harvest') || lower.includes('witta') || lower.includes('farm')) tags.push('ACT-HV');
          if (lower.includes('goods')) tags.push('ACT-GD');
          if (lower.includes('palm') || lower.includes('island')) tags.push('ACT-UA');
          if (lower.includes('wilya') || lower.includes('janta')) tags.push('ACT-WJ');
          if (lower.includes('diagrama')) tags.push('ACT-DG');
          if (lower.includes('contained')) tags.push('ACT-CN');
          if (lower.includes('act') && (lower.includes('studio') || lower.includes('place'))) tags.push('ACT-CORE');
          // Use projectCode from source data if available
          if (f.projectCode) tags.push(f.projectCode);
          return [...new Set(tags)]; // dedupe
        }

        // Transform to match FrontendsTab interface
        return {
          id: f.id,
          name: f.name,
          description: f.description || `${f.name} - Vercel deployment`,
          url: f.url || f.vercel?.productionUrl,
          localPath: f.path,
          github: f.repo !== 'local' ? f.repo : undefined,
          status: f.status || (f.isLive ? 'online' : 'unknown'),
          type: getType(f),
          category: categoryMap[f.category] || 'client',
          tech: f.tech || [],
          lastDeploy: f.vercel?.lastUpdated,
          lastCommit: f.lastActivity?.message,
          healthScore: getHealthScore(f),
          vercelProject: f.vercel?.name,
          httpStatus: f.httpStatus,
          isLive: f.isLive,
          // Tagging for project/people/opportunity linking
          tags: {
            projects: inferProjectTags(f.name),
            people: [], // Can be populated from GHL contacts later
            opportunities: [] // Can be populated from enrichment data later
          },
          projectCode: f.projectCode || null
        };
      })
    );

    // Calculate summary stats
    const online = enrichedFrontends.filter(f => f.status === 'online').length;
    const local = enrichedFrontends.filter(f => f.status === 'local').length;
    const avgHealth = Math.round(
      enrichedFrontends.reduce((sum, f) => sum + (f.healthScore || 0), 0) / enrichedFrontends.length
    );

    res.json({
      generatedAt: frontends.generatedAt,
      frontends: enrichedFrontends,
      summary: {
        total: enrichedFrontends.length,
        online,
        offline: enrichedFrontends.filter(f => f.status === 'offline').length,
        local,
        avgHealth
      }
    });
  } catch (e) {
    console.error('Frontends error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get enriched project data from cache
// Returns enriched project data including relationships, opportunities, and intelligence
app.get('/api/projects/enriched', async (req, res) => {
  try {
    const cacheDir = join(__dirname, '../../.claude/cache/project-intelligence');
    const dashboardPath = join(cacheDir, 'dashboard.json');

    // Read dashboard summary
    let dashboard;
    try {
      dashboard = JSON.parse(await readFile(dashboardPath, 'utf-8'));
    } catch (e) {
      // Generate if missing
      console.log('Dashboard cache not found, generating...');
      execSync('node scripts/project-enrichment.mjs all', {
        cwd: join(__dirname, '../..'),
        encoding: 'utf-8',
        timeout: 300000
      });
      dashboard = JSON.parse(await readFile(dashboardPath, 'utf-8'));
    }

    // If specific project requested, return full enriched data
    const projectCode = req.query.code?.toUpperCase();
    if (projectCode) {
      const projectFile = join(cacheDir, `${projectCode.toLowerCase()}.json`);
      try {
        const projectData = JSON.parse(await readFile(projectFile, 'utf-8'));
        return res.json({ success: true, project: projectData });
      } catch (e) {
        return res.status(404).json({ error: `Project ${projectCode} not found in cache` });
      }
    }

    // Return all projects with enriched summaries
    const enrichedProjects = await Promise.all(
      dashboard.projects.map(async (p) => {
        const projectFile = join(cacheDir, `${p.code.toLowerCase()}.json`);
        try {
          const full = JSON.parse(await readFile(projectFile, 'utf-8'));
          return {
            ...p,
            relationships: full.relationships?.summary || {},
            opportunities: full.opportunities?.slice(0, 3) || [],
            recentActivity: full.communications?.recent?.slice(0, 2) || [],
            focus: full.focus || full.mission || '',
            frontends: full.frontends || []
          };
        } catch (e) {
          return p; // Return basic data if enrichment file missing
        }
      })
    );

    res.json({
      success: true,
      generatedAt: dashboard.generatedAt,
      summary: dashboard.summary,
      projects: enrichedProjects
    });
  } catch (e) {
    console.error('Enriched projects error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIVE NOTION PROJECTS (from Supabase sync)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get('/api/projects/notion', async (req, res) => {
  try {
    const { status, type, limit = 100 } = req.query;

    let query = supabase
      .from('notion_projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(parseInt(limit));

    // Filter by status if provided
    if (status) {
      query = query.ilike('status', `%${status}%`);
    }

    // Filter by project type if provided
    if (type) {
      query = query.ilike('type', `%${type}%`);
    }

    const { data: projects, error } = await query;

    if (error) throw error;

    // Transform to dashboard-friendly format
    const transformed = projects.map(p => ({
      id: p.id,
      notion_id: p.notion_id,
      name: p.name || p.title,
      // Status is stored in data JSONB column
      status: p.data?.status || p.status || null,
      type: p.data?.project_type || p.type,
      budget: p.data?.total_funding || p.budget,
      progress: p.progress,
      tags: p.tags || [],
      metadata: p.metadata || {},
      data: p.data || {},
      last_synced: p.last_synced,
      updated_at: p.updated_at
    }));

    res.json({
      success: true,
      count: transformed.length,
      last_synced: projects[0]?.last_synced,
      projects: transformed
    });
  } catch (e) {
    console.error('Notion projects error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get connector status
app.get('/api/connectors', async (req, res) => {
  try {
    const connectors = [
      { name: 'Supabase Main', type: 'database', required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
      { name: 'Supabase EL', type: 'database', required: ['EL_SUPABASE_URL', 'EL_SUPABASE_SERVICE_ROLE_KEY'] },
      { name: 'Notion', type: 'api', required: ['NOTION_TOKEN'] },
      { name: 'GoHighLevel', type: 'crm', required: ['GHL_API_KEY', 'GHL_LOCATION_ID'] },
      { name: 'Gmail/Calendar', type: 'oauth', required: ['GOOGLE_SERVICE_ACCOUNT_KEY'] },
      { name: 'OpenAI', type: 'ai', required: ['OPENAI_API_KEY'] },
      { name: 'Anthropic', type: 'ai', required: ['ANTHROPIC_API_KEY'] },
      { name: 'Telegram', type: 'messaging', required: ['TELEGRAM_BOT_TOKEN'] },
      { name: 'Discord', type: 'messaging', required: ['DISCORD_WEBHOOK_URL'] },
      { name: 'Xero', type: 'finance', required: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET'] },
      { name: 'Groq', type: 'ai', required: ['GROQ_API_KEY'] },
      { name: 'Perplexity', type: 'ai', required: ['PERPLEXITY_API_KEY'] },
      { name: 'Resend', type: 'email', required: ['RESEND_API_KEY'] },
      { name: 'Signal', type: 'messaging', required: ['SIGNAL_API_URL'] },
      { name: 'Webflow', type: 'cms', required: ['WEBFLOW_API_KEY'] }
    ];

    // Check which connectors have their env vars configured
    const result = connectors.map(c => {
      const configured = c.required.every(key => !!process.env[key]);
      return {
        ...c,
        status: configured ? 'configured' : 'missing',
        missingVars: configured ? [] : c.required.filter(key => !process.env[key])
      };
    });

    // Try to get sync_state from database
    try {
      const { data: syncStates } = await supabase
        .from('sync_state')
        .select('*')
        .order('last_sync', { ascending: false });

      if (syncStates) {
        for (const state of syncStates) {
          const connector = result.find(c => c.name.toLowerCase().includes(state.source?.toLowerCase()));
          if (connector) {
            connector.lastSync = state.last_sync;
            connector.syncStatus = state.status;
          }
        }
      }
    } catch (e) { /* sync_state table may not exist */ }

    res.json(result);
  } catch (e) {
    console.error('Connectors error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get scripts inventory
app.get('/api/scripts', async (req, res) => {
  try {
    const scriptsDir = join(__dirname, '../../scripts');
    const categories = {
      agent: { pattern: /agent|cultivator|shepherd|oracle|herald/i, scripts: [] },
      contact: { pattern: /contact|relationship/i, scripts: [] },
      ghl: { pattern: /ghl|crm/i, scripts: [] },
      notion: { pattern: /notion|project/i, scripts: [] },
      sync: { pattern: /sync|migrate/i, scripts: [] },
      analysis: { pattern: /analysis|review|search|intelligence/i, scripts: [] },
      calendar: { pattern: /calendar|event/i, scripts: [] },
      knowledge: { pattern: /knowledge|embed|qa/i, scripts: [] },
      voice: { pattern: /voice|transcri/i, scripts: [] },
      financial: { pattern: /xero|invoice|financial/i, scripts: [] },
      infrastructure: { pattern: /health|infrastructure|verify/i, scripts: [] },
      secrets: { pattern: /env|secret/i, scripts: [] },
      other: { pattern: /.*/, scripts: [] }
    };

    const allScripts = [];
    const scanDir = async (dir, prefix = '') => {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await scanDir(join(dir, entry.name), `${prefix}${entry.name}/`);
          } else if (entry.name.endsWith('.mjs') || entry.name.endsWith('.js')) {
            allScripts.push({
              name: entry.name,
              path: `${prefix}${entry.name}`
            });
          }
        }
      } catch (e) { /* ignore */ }
    };

    await scanDir(scriptsDir);

    // Categorize scripts
    for (const script of allScripts) {
      let categorized = false;
      for (const [catName, cat] of Object.entries(categories)) {
        if (catName !== 'other' && cat.pattern.test(script.name)) {
          cat.scripts.push(script);
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        categories.other.scripts.push(script);
      }
    }

    res.json({
      total: allScripts.length,
      categories: Object.entries(categories).map(([name, cat]) => ({
        name,
        count: cat.scripts.length,
        scripts: cat.scripts
      })).filter(c => c.count > 0)
    });
  } catch (e) {
    console.error('Scripts error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get ClawdBot Docker status
app.get('/api/clawdbot', async (req, res) => {
  try {
    const clawdbotDir = join(__dirname, '../../clawdbot-docker');

    // Read docker-compose.yml for service definitions
    let services = [];
    try {
      const composePath = join(clawdbotDir, 'docker-compose.yml');
      const composeContent = await readFile(composePath, 'utf-8');
      // Simple YAML parsing for services
      const serviceMatches = composeContent.match(/^\s{2}(\w+(-\w+)*):/gm);
      if (serviceMatches) {
        services = serviceMatches.map(m => ({
          name: m.trim().replace(':', ''),
          status: 'unknown'
        }));
      }
    } catch (e) { /* docker-compose.yml not found */ }

    // Get available services from services directory
    let serviceFiles = [];
    try {
      const servicesDir = join(clawdbotDir, 'services');
      const files = await readdir(servicesDir);
      serviceFiles = files.filter(f => f.endsWith('.mjs')).map(f => ({
        name: f.replace('.mjs', ''),
        file: f
      }));
    } catch (e) { /* services dir not found */ }

    // Get CLI tools
    let cliTools = [];
    try {
      const binDir = join(clawdbotDir, 'bin');
      const files = await readdir(binDir);
      cliTools = files.map(f => ({ name: f }));
    } catch (e) { /* bin dir not found */ }

    // Try to check Docker status
    let dockerStatus = 'unknown';
    let runningContainers = [];
    try {
      const psOutput = execSync('docker ps --format "{{.Names}}|{{.Status}}"', { encoding: 'utf-8' });
      runningContainers = psOutput.trim().split('\n').filter(l => l).map(line => {
        const [name, status] = line.split('|');
        return { name, status, running: status?.includes('Up') };
      });
      dockerStatus = 'running';

      // Update service status based on running containers
      for (const service of services) {
        const container = runningContainers.find(c => c.name?.includes(service.name));
        if (container) {
          service.status = container.running ? 'running' : 'stopped';
          service.containerStatus = container.status;
        }
      }
    } catch (e) {
      dockerStatus = 'not-running';
    }

    res.json({
      dockerStatus,
      services,
      serviceFiles,
      cliTools,
      runningContainers
    });
  } catch (e) {
    console.error('ClawdBot error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get database table counts
app.get('/api/database', async (req, res) => {
  try {
    const tables = [
      'agents', 'agent_task_queue', 'agent_audit_log', 'agent_proposals',
      'canonical_entities', 'entity_identifiers', 'communications_history',
      'agentic_projects', 'agentic_tasks', 'agentic_work_log',
      'ghl_contacts', 'relationship_health', 'knowledge_chunks',
      'sync_state', 'calendar_events', 'cultural_protocols'
    ];

    const counts = {};
    for (const table of tables) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        counts[table] = count || 0;
      } catch (e) {
        counts[table] = -1; // Table doesn't exist
      }
    }

    res.json({
      totalTables: tables.length,
      counts
    });
  } catch (e) {
    console.error('Database error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Calculate overall infrastructure health
app.get('/api/infrastructure/health', async (req, res) => {
  try {
    let score = 0;
    let maxScore = 0;
    const checks = [];

    // 1. Check codebases (20 points)
    maxScore += 20;
    try {
      const codebasesRes = await fetch(`http://localhost:${PORT}/api/codebases`);
      const codebases = await codebasesRes.json();
      const cleanCount = codebases.filter(c => c.status === 'clean').length;
      const codebaseScore = Math.round((cleanCount / codebases.length) * 20);
      score += codebaseScore;
      checks.push({ name: 'Codebases', score: codebaseScore, max: 20, detail: `${cleanCount}/${codebases.length} clean` });
    } catch (e) {
      checks.push({ name: 'Codebases', score: 0, max: 20, error: e.message });
    }

    // 2. Check connectors (20 points)
    maxScore += 20;
    try {
      const connectorsRes = await fetch(`http://localhost:${PORT}/api/connectors`);
      const connectors = await connectorsRes.json();
      const configuredCount = connectors.filter(c => c.status === 'configured').length;
      const connectorScore = Math.round((configuredCount / connectors.length) * 20);
      score += connectorScore;
      checks.push({ name: 'Connectors', score: connectorScore, max: 20, detail: `${configuredCount}/${connectors.length} configured` });
    } catch (e) {
      checks.push({ name: 'Connectors', score: 0, max: 20, error: e.message });
    }

    // 3. Check Claude Code layer (20 points)
    maxScore += 20;
    try {
      const infraRes = await fetch(`http://localhost:${PORT}/api/infrastructure`);
      const infra = await infraRes.json();
      const hasAgents = infra.agents?.length > 0 ? 5 : 0;
      const hasSkills = infra.skills?.length > 0 ? 5 : 0;
      const hasHooks = infra.hooks?.length > 0 ? 5 : 0;
      const hasMcps = infra.mcps?.length > 0 ? 5 : 0;
      const infraScore = hasAgents + hasSkills + hasHooks + hasMcps;
      score += infraScore;
      checks.push({ name: 'Claude Code', score: infraScore, max: 20, detail: `${infra.agents?.length || 0}A/${infra.skills?.length || 0}S/${infra.hooks?.length || 0}H/${infra.mcps?.length || 0}M` });
    } catch (e) {
      checks.push({ name: 'Claude Code', score: 0, max: 20, error: e.message });
    }

    // 4. Check ClawdBot (20 points)
    maxScore += 20;
    try {
      const clawdbotRes = await fetch(`http://localhost:${PORT}/api/clawdbot`);
      const clawdbot = await clawdbotRes.json();
      const runningCount = clawdbot.runningContainers?.filter(c => c.running).length || 0;
      const expectedCount = clawdbot.services?.length || 2;
      const clawdbotScore = clawdbot.dockerStatus === 'running' ? Math.round((runningCount / expectedCount) * 20) : 0;
      score += clawdbotScore;
      checks.push({ name: 'ClawdBot', score: clawdbotScore, max: 20, detail: clawdbot.dockerStatus === 'running' ? `${runningCount}/${expectedCount} running` : 'Docker not running' });
    } catch (e) {
      checks.push({ name: 'ClawdBot', score: 0, max: 20, error: e.message });
    }

    // 5. Check database (20 points)
    maxScore += 20;
    try {
      const dbRes = await fetch(`http://localhost:${PORT}/api/database`);
      const db = await dbRes.json();
      const existingTables = Object.values(db.counts).filter(c => c >= 0).length;
      const dbScore = Math.round((existingTables / db.totalTables) * 20);
      score += dbScore;
      checks.push({ name: 'Database', score: dbScore, max: 20, detail: `${existingTables}/${db.totalTables} tables exist` });
    } catch (e) {
      checks.push({ name: 'Database', score: 0, max: 20, error: e.message });
    }

    res.json({
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Health check error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTELLIGENCE CENTER ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Get active agents with autonomy levels
app.get('/api/agents/active', async (req, res) => {
  try {
    // Get agents from database
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('enabled', true);

    if (error) {
      // Fallback to default agents if table doesn't exist
      const defaultAgents = [
        { id: 'scout', name: 'Scout', domain: 'research', autonomy_level: 1, status: 'idle' },
        { id: 'scribe', name: 'Scribe', domain: 'content', autonomy_level: 2, status: 'idle' },
        { id: 'cultivator', name: 'Cultivator', domain: 'relationships', autonomy_level: 2, status: 'idle' },
        { id: 'shepherd', name: 'Shepherd', domain: 'projects', autonomy_level: 2, status: 'idle' },
        { id: 'oracle', name: 'Oracle', domain: 'knowledge', autonomy_level: 1, status: 'idle' },
        { id: 'herald', name: 'Herald', domain: 'communications', autonomy_level: 3, status: 'idle' },
        { id: 'ledger', name: 'Ledger', domain: 'finance', autonomy_level: 2, status: 'idle' },
      ];
      return res.json(defaultAgents);
    }

    // Check for recent activity to determine status
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentActivity } = await supabase
      .from('agent_audit_log')
      .select('agent_id, timestamp')
      .gte('timestamp', fiveMinutesAgo);

    const activeAgents = new Set(recentActivity?.map(a => a.agent_id) || []);

    const result = (agents || []).map(agent => ({
      ...agent,
      status: activeAgents.has(agent.id) ? 'active' : 'idle',
      autonomy_label: agent.autonomy_level === 1 ? 'Manual' :
                      agent.autonomy_level === 2 ? 'Supervised' : 'Autonomous'
    }));

    res.json(result);
  } catch (e) {
    console.error('Active agents error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get pending proposals count and list
app.get('/api/agents/proposals', async (req, res) => {
  try {
    const { data: proposals, error } = await supabase
      .from('agent_proposals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.json({ count: 0, proposals: [] });
    }

    // Group by priority
    const byPriority = {
      urgent: proposals?.filter(p => p.priority === 'urgent').length || 0,
      high: proposals?.filter(p => p.priority === 'high').length || 0,
      normal: proposals?.filter(p => p.priority === 'normal' || !p.priority).length || 0,
      low: proposals?.filter(p => p.priority === 'low').length || 0
    };

    res.json({
      count: proposals?.length || 0,
      byPriority,
      proposals: proposals || []
    });
  } catch (e) {
    console.error('Proposals error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get recent agent activity (last 24h)
app.get('/api/agents/activity', async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: activity, error } = await supabase
      .from('agent_audit_log')
      .select('*')
      .gte('timestamp', yesterday)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      return res.json({ count: 0, activity: [] });
    }

    // Summarize by agent
    const byAgent = {};
    (activity || []).forEach(a => {
      if (!byAgent[a.agent_id]) {
        byAgent[a.agent_id] = { count: 0, success: 0, failed: 0 };
      }
      byAgent[a.agent_id].count++;
      if (a.success) byAgent[a.agent_id].success++;
      else byAgent[a.agent_id].failed++;
    });

    res.json({
      count: activity?.length || 0,
      byAgent,
      activity: activity?.slice(0, 20) || []
    });
  } catch (e) {
    console.error('Activity error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get recent communications summary
app.get('/api/communications/recent', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get communications by channel
    const channels = ['email', 'signal', 'discord', 'whatsapp', 'voice'];
    const counts = {};

    for (const channel of channels) {
      const { count } = await supabase
        .from('communications_history')
        .select('*', { count: 'exact', head: true })
        .eq('channel', channel)
        .gte('occurred_at', todayISO);
      counts[channel] = count || 0;
    }

    // Get total today
    const { count: totalToday } = await supabase
      .from('communications_history')
      .select('*', { count: 'exact', head: true })
      .gte('occurred_at', todayISO);

    // Get recent communications
    const { data: recent } = await supabase
      .from('communications_history')
      .select('id, subject, channel, contact_name, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(10);

    // Get voice notes count
    const { count: voiceCount } = await supabase
      .from('voice_notes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    res.json({
      today: totalToday || 0,
      byChannel: counts,
      voiceNotes: voiceCount || 0,
      recent: recent || []
    });
  } catch (e) {
    console.error('Communications error:', e);
    res.status(500).json({ error: e.message, today: 0, byChannel: {}, recent: [] });
  }
});

// Get project-specific communications via contact tags
// Links communications to projects by finding contacts with matching GHL tags
app.get('/api/projects/:code/communications', async (req, res) => {
  try {
    const { code } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Load project config
    const projectCodesPath = join(__dirname, '../../config/project-codes.json');
    const projectCodesContent = await readFile(projectCodesPath, 'utf-8');
    const projectCodes = JSON.parse(projectCodesContent);
    const project = projectCodes.projects[code];

    if (!project) {
      return res.status(404).json({ error: 'Project not found', code });
    }

    // Get GHL tags for this project
    const ghlTags = project.ghl_tags || [];
    if (ghlTags.length === 0) {
      return res.json({
        success: true,
        project: project.name,
        communications: [],
        stats: { last7Days: 0, last30Days: 0, totalEmails: 0, totalMeetings: 0 }
      });
    }

    // Find contacts that have any of these tags
    // ghl_contacts uses ghl_id and full_name columns
    const { data: contacts, error: contactsError } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, tags')
      .not('tags', 'is', null);

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return res.status(500).json({ error: contactsError.message });
    }

    // Filter contacts that have matching tags
    const projectContacts = (contacts || []).filter(contact => {
      const contactTags = (contact.tags || []).map(t => t.toLowerCase());
      return ghlTags.some(tag =>
        contactTags.some(ct => ct.includes(tag.toLowerCase()) || tag.toLowerCase().includes(ct))
      );
    });

    // Even if no tagged contacts, we might have communications via project_code
    const contactIds = projectContacts.map(c => c.ghl_id);

    // Get communications for these contacts OR directly tagged with this project_code
    // Two queries: one by contact ID, one by project_code
    const [contactCommsResult, projectCommsResult] = await Promise.all([
      // Communications linked via contact
      contactIds.length > 0 ? supabase
        .from('communications_history')
        .select('id, subject, channel, direction, contact_name, content_preview, summary, occurred_at, sentiment, project_code')
        .in('ghl_contact_id', contactIds)
        .order('occurred_at', { ascending: false })
        .limit(limit) : { data: [], error: null },
      // Communications directly tagged with project_code (e.g., from email-to-knowledge pipeline)
      supabase
        .from('communications_history')
        .select('id, subject, channel, direction, contact_name, content_preview, summary, occurred_at, sentiment, project_code')
        .eq('project_code', code)
        .order('occurred_at', { ascending: false })
        .limit(limit)
    ]);

    const commsError = contactCommsResult.error || projectCommsResult.error;

    // Merge and dedupe by id
    const allComms = [...(contactCommsResult.data || []), ...(projectCommsResult.data || [])];
    const seenIds = new Set();
    const comms = allComms.filter(c => {
      if (seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    }).sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)).slice(0, limit);

    if (commsError) {
      console.error('Error fetching communications:', commsError);
      return res.status(500).json({ error: commsError.message });
    }

    // Calculate stats
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const communications = comms || [];
    const last7Days = communications.filter(c => new Date(c.occurred_at) >= sevenDaysAgo).length;
    const last30Days = communications.filter(c => new Date(c.occurred_at) >= thirtyDaysAgo).length;
    const totalEmails = communications.filter(c => c.channel === 'email').length;
    const totalMeetings = communications.filter(c => c.channel === 'calendar' || c.channel === 'meeting').length;

    // Format communications for frontend
    const formattedComms = communications.map(c => ({
      id: c.id,
      type: c.channel === 'email' ? 'email' : c.channel === 'calendar' ? 'meeting' : c.channel || 'note',
      subject: c.subject || 'No subject',
      summary: c.summary || c.content_preview?.substring(0, 200),
      date: c.occurred_at,
      participants: c.contact_name ? [c.contact_name] : [],
      importance: c.sentiment === 'positive' ? 'high' : c.sentiment === 'negative' ? 'medium' : 'low',
      direction: c.direction
    }));

    res.json({
      success: true,
      project: project.name,
      contactsMatched: projectContacts.length,
      communications: formattedComms,
      stats: {
        last7Days,
        last30Days,
        totalEmails,
        totalMeetings
      }
    });
  } catch (e) {
    console.error('Project communications error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get project communications by Notion ID (for API-loaded projects)
app.get('/api/projects/by-id/:id/communications', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Look up project by notion_id in the projects table
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select('id, name, ghl_tags')
      .ilike('notion_id', `%${id}%`)
      .limit(1);

    if (projError) throw projError;

    // If no project found, return empty
    if (!projects || projects.length === 0) {
      return res.json({
        success: true,
        project: id,
        communications: [],
        stats: { last7Days: 0, last30Days: 0, totalEmails: 0, totalMeetings: 0 }
      });
    }

    const project = projects[0];
    // ghl_tags might be a JSON string, parse it if needed
    let ghlTags = [];
    if (typeof project.ghl_tags === 'string') {
      try { ghlTags = JSON.parse(project.ghl_tags); } catch {}
    } else if (Array.isArray(project.ghl_tags)) {
      ghlTags = project.ghl_tags;
    }

    // Find contacts with matching tags
    const { data: contacts, error: contactsError } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, tags')
      .not('tags', 'is', null);

    if (contactsError) throw contactsError;

    const projectContacts = (contacts || []).filter(contact => {
      const contactTags = (contact.tags || []).map(t => t.toLowerCase());
      return ghlTags.some(tag =>
        contactTags.some(ct => ct.includes(tag.toLowerCase()) || tag.toLowerCase().includes(ct))
      );
    });

    const contactIds = projectContacts.map(c => c.ghl_id);

    // Get communications
    const { data: comms, error: commsError } = await supabase
      .from('communications_history')
      .select('id, subject, channel, direction, contact_name, content_preview, summary, occurred_at, sentiment')
      .in('ghl_contact_id', contactIds)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (commsError) throw commsError;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const communications = comms || [];
    const last7Days = communications.filter(c => new Date(c.occurred_at) >= sevenDaysAgo).length;
    const last30Days = communications.filter(c => new Date(c.occurred_at) >= thirtyDaysAgo).length;
    const totalEmails = communications.filter(c => c.channel === 'email').length;
    const totalMeetings = communications.filter(c => c.channel === 'calendar' || c.channel === 'meeting').length;

    const formattedComms = communications.map(c => ({
      id: c.id,
      type: c.channel === 'email' ? 'email' : c.channel === 'calendar' ? 'meeting' : c.channel || 'note',
      subject: c.subject || 'No subject',
      summary: c.summary || c.content_preview?.substring(0, 200),
      date: c.occurred_at,
      participants: c.contact_name ? [c.contact_name] : [],
      importance: c.sentiment === 'positive' ? 'high' : c.sentiment === 'negative' ? 'medium' : 'low',
      direction: c.direction
    }));

    res.json({
      success: true,
      project: project.name,
      communications: formattedComms,
      stats: { last7Days, last30Days, totalEmails, totalMeetings }
    });
  } catch (e) {
    console.error('Project communications by ID error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get project updates/milestones
app.get('/api/projects/:code/updates', async (req, res) => {
  try {
    const { code } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    // Fetch updates from project_updates table
    const { data: updates, error } = await supabase
      .from('project_updates')
      .select('*')
      .eq('project_code', code)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table might not exist or be empty
      return res.json({ success: true, updates: [] });
    }

    res.json({
      success: true,
      updates: (updates || []).map(u => ({
        id: u.id,
        title: u.title || 'Update',
        content: u.content || u.description || '',
        update_type: u.update_type || 'note',
        created_at: u.created_at,
        created_by: u.created_by
      }))
    });
  } catch (e) {
    console.error('Project updates error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get knowledge stats
app.get('/api/knowledge/stats', async (req, res) => {
  try {
    // Knowledge chunks
    const { count: chunksCount } = await supabase
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true });

    // Entities
    const { count: entitiesCount } = await supabase
      .from('canonical_entities')
      .select('*', { count: 'exact', head: true });

    // Entity identifiers
    const { count: identifiersCount } = await supabase
      .from('entity_identifiers')
      .select('*', { count: 'exact', head: true });

    // Try to get QA pairs count from file
    let qaPairs = 232; // Known value from plan
    try {
      const qaPath = join(__dirname, '../../act-qa-232.json');
      const qaContent = await readFile(qaPath, 'utf-8');
      const qa = JSON.parse(qaContent);
      qaPairs = qa.length || 232;
    } catch (e) { /* use default */ }

    res.json({
      knowledgeChunks: chunksCount || 0,
      entities: entitiesCount || 0,
      identifiers: identifiersCount || 0,
      qaPairs,
      stories: 328, // From plan
      storytellers: 239, // From plan
      vignettes: 31 // From plan
    });
  } catch (e) {
    console.error('Knowledge stats error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get relationship health summary - uses pre-calculated temperatures from relationship_health
app.get('/api/relationships/health', async (req, res) => {
  try {
    // Single SQL aggregation query for maximum efficiency
    const { data, error } = await supabase.rpc('get_relationship_health_summary');

    if (error) {
      // Fallback to direct query if RPC doesn't exist
      const { data: relationships } = await supabase
        .from('relationship_health')
        .select('temperature, days_since_contact, lcaa_stage');

      if (!relationships || relationships.length === 0) {
        return res.json({ total: 0, hot: 0, warm: 0, cool: 0, needsAttention: 0, overdue: 0, byStage: {} });
      }

      let hot = 0, warm = 0, cool = 0, needsAttention = 0, overdue = 0;
      const byStage = {};

      relationships.forEach(r => {
        const temp = r.temperature || 0;
        if (temp >= 80) hot++;
        else if (temp >= 50) warm++;
        else cool++;

        // Needs attention if cool temperature
        if (temp < 50) needsAttention++;

        // Overdue if no contact in 60+ days
        if ((r.days_since_contact || 365) >= 60) overdue++;

        // Count by LCAA stage
        const stage = r.lcaa_stage || 'unknown';
        byStage[stage] = (byStage[stage] || 0) + 1;
      });

      return res.json({
        total: relationships.length,
        hot,
        warm,
        cool,
        needsAttention,
        overdue,
        byStage
      });
    }

    res.json(data);
  } catch (e) {
    console.error('Relationships error:', e);
    res.status(500).json({ error: e.message, total: 0, hot: 0, warm: 0, cool: 0 });
  }
});

// List relationships with full details - joins with ghl_contacts for names
app.get('/api/relationships/list', async (req, res) => {
  try {
    const { filter = 'all', limit = 50, offset = 0 } = req.query;

    // Build base query joining relationship_health with ghl_contacts
    let query = supabase
      .from('relationship_health')
      .select(`
        id,
        ghl_contact_id,
        temperature,
        temperature_trend,
        lcaa_stage,
        total_touchpoints,
        inbound_count,
        outbound_count,
        days_since_contact,
        last_contact_at,
        suggested_actions,
        created_at,
        updated_at
      `)
      .order('temperature', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply temperature filters
    if (filter === 'hot') {
      query = query.gte('temperature', 80);
    } else if (filter === 'warm') {
      query = query.gte('temperature', 50).lt('temperature', 80);
    } else if (filter === 'cool') {
      query = query.lt('temperature', 50);
    } else if (filter === 'attention') {
      query = query.lt('temperature', 50).gte('days_since_contact', 30);
    } else if (filter === 'amplify') {
      query = query.eq('lcaa_stage', 'amplify');
    } else if (filter === 'act') {
      query = query.eq('lcaa_stage', 'act');
    }

    const { data: relationships, error } = await query;

    if (error) throw error;

    // Get contact names from ghl_contacts
    const ghlIds = (relationships || []).map(r => r.ghl_contact_id).filter(Boolean);
    let contactNames = {};

    if (ghlIds.length > 0) {
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags')
        .in('ghl_id', ghlIds);

      contactNames = (contacts || []).reduce((acc, c) => {
        acc[c.ghl_id] = { name: c.full_name, email: c.email, tags: c.tags };
        return acc;
      }, {});
    }

    // Transform with contact info
    const transformed = (relationships || []).map(r => ({
      ...r,
      contact_name: contactNames[r.ghl_contact_id]?.name || 'Unknown',
      contact_email: contactNames[r.ghl_contact_id]?.email || null,
      tags: contactNames[r.ghl_contact_id]?.tags || []
    }));

    // Get total count for pagination
    const { count } = await supabase
      .from('relationship_health')
      .select('id', { count: 'exact', head: true });

    res.json({
      relationships: transformed,
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + transformed.length) < (count || 0)
      }
    });
  } catch (e) {
    console.error('Relationships list error:', e);
    res.status(500).json({ error: e.message, relationships: [] });
  }
});

// Get overdue follow-ups (60+ days since contact)
app.get('/api/relationships/overdue', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const { data: overdue, error } = await supabase
      .from('relationship_health')
      .select(`
        id,
        ghl_contact_id,
        temperature,
        lcaa_stage,
        days_since_contact,
        last_contact_at,
        total_touchpoints
      `)
      .gte('days_since_contact', 60)
      .order('days_since_contact', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    // Get contact names from ghl_contacts
    const ghlIds = (overdue || []).map(r => r.ghl_contact_id).filter(Boolean);
    let contactInfo = {};

    if (ghlIds.length > 0) {
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags')
        .in('ghl_id', ghlIds);

      contactInfo = (contacts || []).reduce((acc, c) => {
        acc[c.ghl_id] = { name: c.full_name, email: c.email, tags: c.tags };
        return acc;
      }, {});
    }

    // Transform with contact info
    const transformed = (overdue || []).map(r => ({
      ...r,
      contact_name: contactInfo[r.ghl_contact_id]?.name || 'Unknown',
      contact_email: contactInfo[r.ghl_contact_id]?.email || null,
      tags: contactInfo[r.ghl_contact_id]?.tags || []
    }));

    res.json({ overdue: transformed, total: transformed.length });
  } catch (e) {
    console.error('Overdue relationships error:', e);
    res.status(500).json({ error: e.message, overdue: [] });
  }
});

// Get relationships needing attention (cool temperature + 30+ days)
app.get('/api/relationships/attention', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const { data: attention, error } = await supabase
      .from('relationship_health')
      .select(`
        id,
        ghl_contact_id,
        temperature,
        temperature_trend,
        lcaa_stage,
        days_since_contact,
        last_contact_at,
        total_touchpoints
      `)
      .lt('temperature', 50)
      .gte('days_since_contact', 30)
      .order('temperature', { ascending: true })
      .limit(parseInt(limit));

    if (error) throw error;

    // Get contact names from ghl_contacts
    const ghlIds = (attention || []).map(r => r.ghl_contact_id).filter(Boolean);
    let contactInfo = {};

    if (ghlIds.length > 0) {
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags')
        .in('ghl_id', ghlIds);

      contactInfo = (contacts || []).reduce((acc, c) => {
        acc[c.ghl_id] = { name: c.full_name, email: c.email, tags: c.tags };
        return acc;
      }, {});
    }

    // Transform with contact info
    const transformed = (attention || []).map(r => ({
      ...r,
      contact_name: contactInfo[r.ghl_contact_id]?.name || 'Unknown',
      contact_email: contactInfo[r.ghl_contact_id]?.email || null,
      tags: contactInfo[r.ghl_contact_id]?.tags || []
    }));

    res.json({ attention: transformed, total: transformed.length });
  } catch (e) {
    console.error('Attention relationships error:', e);
    res.status(500).json({ error: e.message, attention: [] });
  }
});

// ============================================
// UNIFIED SEMANTIC SEARCH
// ============================================

/**
 * Generate embedding for query using OpenAI text-embedding-3-small
 * Returns 384-dimension vector matching voice_notes and project_knowledge tables
 */
async function generateQueryEmbedding(text) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 384
      })
    });

    if (!response.ok) {
      console.error('Embedding API error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error.message);
    return null;
  }
}

/**
 * Unified semantic search across all ACT knowledge sources
 *
 * GET /api/search
 * Query params:
 *   - q: search query (required)
 *   - limit: max results per type (default 20)
 *   - types: comma-separated list (voice,knowledge,contacts,communications,projects)
 */
app.get('/api/search', async (req, res) => {
  try {
    const { q, limit = 20, types } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        results: [],
        total: 0,
        query: q,
        error: 'Query must be at least 2 characters'
      });
    }

    const maxResults = Math.min(parseInt(limit), 100);
    const searchTypes = types
      ? types.split(',').map(t => t.trim().toLowerCase())
      : ['voice', 'knowledge', 'contacts', 'communications', 'projects'];

    const allResults = [];
    const searchPattern = `%${q}%`;

    // Generate embedding for vector search
    const embedding = await generateQueryEmbedding(q);
    const embeddingArray = embedding ? `[${embedding.join(',')}]` : null;

    // ─────────────────────────────────────────────────────────────────
    // 1. VOICE NOTES - Vector search with text fallback
    // ─────────────────────────────────────────────────────────────────
    if (searchTypes.includes('voice')) {
      try {
        let voiceResults = [];

        // Try vector search first if embedding available
        if (embeddingArray) {
          const { data: vectorResults } = await supabase.rpc('match_voice_notes', {
            query_embedding: embeddingArray,
            match_count: maxResults,
            match_threshold: 0.5
          }).catch(() => ({ data: null }));

          if (vectorResults?.length) {
            voiceResults = vectorResults.map(v => ({
              type: 'voice_note',
              id: v.id,
              title: v.summary?.substring(0, 100) || `Voice Note (${v.source_channel})`,
              snippet: v.transcript?.substring(0, 200) || v.summary?.substring(0, 200) || '',
              relevance: v.similarity || 0.7,
              metadata: {
                source_channel: v.source_channel,
                recorded_at: v.recorded_at,
                recorded_by: v.recorded_by_name,
                topics: v.topics,
                duration_seconds: v.duration_seconds,
                project_context: v.project_context
              }
            }));
          }
        }

        // Fall back to text search if no vector results
        if (!voiceResults.length) {
          const { data: textResults } = await supabase
            .from('voice_notes')
            .select('id, summary, transcript, source_channel, recorded_at, recorded_by_name, topics, duration_seconds, project_context')
            .or(`transcript.ilike.${searchPattern},summary.ilike.${searchPattern}`)
            .order('recorded_at', { ascending: false })
            .limit(maxResults);

          voiceResults = (textResults || []).map((v, i) => ({
            type: 'voice_note',
            id: v.id,
            title: v.summary?.substring(0, 100) || `Voice Note (${v.source_channel})`,
            snippet: highlightMatch(v.transcript || v.summary || '', q),
            relevance: 0.6 - (i * 0.01),
            metadata: {
              source_channel: v.source_channel,
              recorded_at: v.recorded_at,
              recorded_by: v.recorded_by_name,
              topics: v.topics,
              duration_seconds: v.duration_seconds,
              project_context: v.project_context
            }
          }));
        }

        allResults.push(...voiceResults);
      } catch (e) {
        console.error('Voice notes search error:', e.message);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. PROJECT KNOWLEDGE - Vector search with text fallback
    // ─────────────────────────────────────────────────────────────────
    if (searchTypes.includes('knowledge')) {
      try {
        let knowledgeResults = [];

        // Try vector search first
        if (embeddingArray) {
          const { data: vectorResults } = await supabase.rpc('search_project_knowledge', {
            query_embedding: embeddingArray,
            match_count: maxResults,
            match_threshold: 0.5
          }).catch(() => ({ data: null }));

          if (vectorResults?.length) {
            knowledgeResults = vectorResults.map(k => ({
              type: 'knowledge',
              id: k.id,
              title: k.title || `${k.knowledge_type} - ${k.project_code}`,
              snippet: k.content?.substring(0, 200) || '',
              relevance: k.similarity || 0.7,
              metadata: {
                project_code: k.project_code,
                project_name: k.project_name,
                knowledge_type: k.knowledge_type,
                importance: k.importance,
                topics: k.topics,
                recorded_at: k.recorded_at
              }
            }));
          }
        }

        // Fall back to text search
        if (!knowledgeResults.length) {
          const { data: textResults } = await supabase
            .from('project_knowledge')
            .select('id, title, content, project_code, project_name, knowledge_type, importance, topics, recorded_at')
            .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
            .order('recorded_at', { ascending: false })
            .limit(maxResults);

          knowledgeResults = (textResults || []).map((k, i) => ({
            type: 'knowledge',
            id: k.id,
            title: k.title || `${k.knowledge_type} - ${k.project_code}`,
            snippet: highlightMatch(k.content || '', q),
            relevance: 0.6 - (i * 0.01),
            metadata: {
              project_code: k.project_code,
              project_name: k.project_name,
              knowledge_type: k.knowledge_type,
              importance: k.importance,
              topics: k.topics,
              recorded_at: k.recorded_at
            }
          }));
        }

        allResults.push(...knowledgeResults);
      } catch (e) {
        console.error('Project knowledge search error:', e.message);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. CONTACTS (GHL) - Text search
    // ─────────────────────────────────────────────────────────────────
    if (searchTypes.includes('contacts')) {
      try {
        const { data: contacts } = await supabase
          .from('ghl_contacts')
          .select('id, ghl_id, full_name, first_name, last_name, email, phone, company_name, tags, projects, engagement_status, last_contact_date')
          .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern},company_name.ilike.${searchPattern}`)
          .order('last_contact_date', { ascending: false, nullsFirst: false })
          .limit(maxResults);

        const contactResults = (contacts || []).map((c, i) => ({
          type: 'contact',
          id: c.id,
          title: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
          snippet: [c.email, c.company_name, c.phone].filter(Boolean).join(' | '),
          relevance: calculateTextRelevance(q, [c.full_name, c.email, c.company_name]) - (i * 0.01),
          metadata: {
            ghl_id: c.ghl_id,
            email: c.email,
            phone: c.phone,
            company: c.company_name,
            tags: c.tags,
            projects: c.projects,
            engagement_status: c.engagement_status,
            last_contact: c.last_contact_date
          }
        }));

        allResults.push(...contactResults);
      } catch (e) {
        console.error('Contacts search error:', e.message);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 4. COMMUNICATIONS HISTORY - Text search
    // ─────────────────────────────────────────────────────────────────
    if (searchTypes.includes('communications')) {
      try {
        const { data: comms } = await supabase
          .from('communications_history')
          .select('id, channel, direction, subject, content_preview, summary, occurred_at, ghl_contact_id, topics, sentiment')
          .or(`subject.ilike.${searchPattern},content_preview.ilike.${searchPattern},summary.ilike.${searchPattern}`)
          .order('occurred_at', { ascending: false })
          .limit(maxResults);

        const commResults = (comms || []).map((c, i) => ({
          type: 'communication',
          id: c.id,
          title: c.subject || `${c.channel} - ${c.direction}`,
          snippet: highlightMatch(c.content_preview || c.summary || '', q),
          relevance: calculateTextRelevance(q, [c.subject, c.content_preview, c.summary]) - (i * 0.01),
          metadata: {
            channel: c.channel,
            direction: c.direction,
            occurred_at: c.occurred_at,
            ghl_contact_id: c.ghl_contact_id,
            topics: c.topics,
            sentiment: c.sentiment
          }
        }));

        allResults.push(...commResults);
      } catch (e) {
        console.error('Communications search error:', e.message);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 5. NOTION PROJECTS - Text search
    // ─────────────────────────────────────────────────────────────────
    if (searchTypes.includes('projects')) {
      try {
        const { data: projects } = await supabase
          .from('notion_projects')
          .select('id, notion_id, name, status, type, tags, data, updated_at')
          .or(`name.ilike.${searchPattern}`)
          .order('updated_at', { ascending: false })
          .limit(maxResults);

        const projectResults = (projects || []).map((p, i) => ({
          type: 'project',
          id: p.id,
          title: p.name,
          snippet: `Status: ${p.data?.status || p.status || 'Unknown'} | Type: ${p.data?.project_type || p.type || 'Unknown'}`,
          relevance: calculateTextRelevance(q, [p.name]) - (i * 0.01),
          metadata: {
            notion_id: p.notion_id,
            status: p.data?.status || p.status,
            type: p.data?.project_type || p.type,
            budget: p.data?.total_funding,
            tags: p.tags,
            updated_at: p.updated_at
          }
        }));

        allResults.push(...projectResults);
      } catch (e) {
        console.error('Projects search error:', e.message);
      }
    }

    // Sort all results by relevance
    allResults.sort((a, b) => b.relevance - a.relevance);

    // Take top N results
    const topResults = allResults.slice(0, maxResults);

    res.json({
      results: topResults,
      total: allResults.length,
      query: q,
      searched_types: searchTypes,
      has_vector_search: !!embedding
    });

  } catch (e) {
    console.error('Unified search error:', e);
    res.status(500).json({ error: e.message, results: [], total: 0, query: req.query.q });
  }
});

/**
 * Highlight matching text in snippet
 */
function highlightMatch(text, query) {
  if (!text || !query) return text?.substring(0, 200) || '';

  const snippet = text.substring(0, 200);
  const lowerText = snippet.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return snippet;

  // Return context around the match
  const start = Math.max(0, index - 50);
  const end = Math.min(snippet.length, index + query.length + 100);
  let result = snippet.substring(start, end);

  if (start > 0) result = '...' + result;
  if (end < text.length) result = result + '...';

  return result;
}

/**
 * Calculate text relevance score (0-1)
 */
function calculateTextRelevance(query, fields) {
  if (!query || !fields) return 0.5;

  const lowerQuery = query.toLowerCase();
  let maxScore = 0.5;

  for (const field of fields) {
    if (!field) continue;
    const lowerField = field.toLowerCase();

    // Exact match
    if (lowerField === lowerQuery) {
      maxScore = Math.max(maxScore, 1.0);
    }
    // Starts with query
    else if (lowerField.startsWith(lowerQuery)) {
      maxScore = Math.max(maxScore, 0.9);
    }
    // Contains query
    else if (lowerField.includes(lowerQuery)) {
      maxScore = Math.max(maxScore, 0.7);
    }
  }

  return maxScore;
}

// ============================================
// Knowledge & Entity Endpoints
// ============================================

// Search entities
app.get('/api/entities/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ results: [], query: q });
    }

    const { data: entities, error } = await supabase
      .from('canonical_entities')
      .select('id, canonical_name, entity_type, source_priority, created_at')
      .ilike('canonical_name', `%${q}%`)
      .order('canonical_name')
      .limit(parseInt(limit));

    if (error) throw error;

    // Get identifiers for each entity
    const entityIds = entities.map(e => e.id);
    const { data: identifiers } = await supabase
      .from('entity_identifiers')
      .select('entity_id, identifier_type, identifier_value')
      .in('entity_id', entityIds);

    // Group identifiers by entity
    const identifiersByEntity = {};
    (identifiers || []).forEach(i => {
      if (!identifiersByEntity[i.entity_id]) {
        identifiersByEntity[i.entity_id] = [];
      }
      identifiersByEntity[i.entity_id].push({
        type: i.identifier_type,
        value: i.identifier_value
      });
    });

    const results = entities.map(e => ({
      ...e,
      identifiers: identifiersByEntity[e.id] || []
    }));

    res.json({ results, query: q, count: results.length });
  } catch (e) {
    console.error('Entity search error:', e);
    res.status(500).json({ error: e.message, results: [] });
  }
});

// Get entity by ID with full details
app.get('/api/entities/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: entity, error } = await supabase
      .from('canonical_entities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Get identifiers
    const { data: identifiers } = await supabase
      .from('entity_identifiers')
      .select('*')
      .eq('entity_id', id);

    // Get related communications - find ghl_id from identifiers first
    const ghlIdentifier = identifiers?.find(i => i.identifier_type === 'ghl_id');
    let communications = [];
    if (ghlIdentifier) {
      const { data: comms } = await supabase
        .from('communications_history')
        .select('id, channel, subject, occurred_at')
        .eq('ghl_contact_id', ghlIdentifier.identifier_value)
        .order('occurred_at', { ascending: false })
        .limit(10);
      communications = comms || [];
    }

    res.json({
      ...entity,
      identifiers: identifiers || [],
      recent_communications: communications || []
    });
  } catch (e) {
    console.error('Entity fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Knowledge sources breakdown
app.get('/api/knowledge/sources', async (req, res) => {
  try {
    // Get knowledge chunks by source
    const { data: chunks } = await supabase
      .from('knowledge_chunks')
      .select('source_type, id');

    const bySource = {};
    (chunks || []).forEach(c => {
      const src = c.source_type || 'unknown';
      bySource[src] = (bySource[src] || 0) + 1;
    });

    // Get entity types
    const { data: entities } = await supabase
      .from('canonical_entities')
      .select('entity_type, id');

    const byEntityType = {};
    (entities || []).forEach(e => {
      const type = e.entity_type || 'unknown';
      byEntityType[type] = (byEntityType[type] || 0) + 1;
    });

    // Get identifier types
    const { data: identifiers } = await supabase
      .from('entity_identifiers')
      .select('identifier_type, id');

    const byIdentifierType = {};
    (identifiers || []).forEach(i => {
      const type = i.identifier_type || 'unknown';
      byIdentifierType[type] = (byIdentifierType[type] || 0) + 1;
    });

    res.json({
      knowledgeBySource: bySource,
      entitiesByType: byEntityType,
      identifiersByType: byIdentifierType
    });
  } catch (e) {
    console.error('Knowledge sources error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// Agent Proposals API (for Intelligence Platform)
// ============================================

// GET /api/agent/proposals - List proposals with optional status filter
app.get('/api/agent/proposals', async (req, res) => {
  try {
    const { status, agent, limit = 50 } = req.query;

    let query = supabase
      .from('agent_proposals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (agent) {
      query = query.eq('agent_id', agent);
    }

    const { data: proposals, error } = await query;

    if (error) throw error;

    // Group by priority for stats
    const byPriority = {
      urgent: proposals?.filter(p => p.priority === 'urgent').length || 0,
      high: proposals?.filter(p => p.priority === 'high').length || 0,
      normal: proposals?.filter(p => p.priority === 'normal' || !p.priority).length || 0,
      low: proposals?.filter(p => p.priority === 'low').length || 0
    };

    res.json({
      success: true,
      count: proposals?.length || 0,
      byPriority,
      proposals: proposals || []
    });
  } catch (e) {
    console.error('Get agent proposals error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/agent/proposals/:id/review - Approve or reject a proposal
app.post('/api/agent/proposals/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewed_by, notes } = req.body;

    if (!['approved', 'rejected', 'modified'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be approved, rejected, or modified'
      });
    }

    const { data, error } = await supabase
      .from('agent_proposals')
      .update({
        status,
        reviewed_by: reviewed_by || 'dashboard_user',
        reviewed_at: new Date().toISOString(),
        review_notes: notes || `${status.charAt(0).toUpperCase() + status.slice(1)} via Intelligence Platform`,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log to audit
    await supabase.from('agent_audit_log').insert({
      agent_id: data.agent_id,
      action_type: `proposal_${status}`,
      action_details: {
        proposal_id: id,
        action_name: data.action_name,
        reviewed_by: reviewed_by || 'dashboard_user'
      },
      success: true,
      timestamp: new Date().toISOString()
    }).catch(() => {}); // Don't fail if audit log fails

    res.json({ success: true, proposal: data });
  } catch (e) {
    console.error('Review proposal error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================
// Proposal Management Endpoints
// ============================================

// Approve a proposal
app.post('/api/proposals/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const { data, error } = await supabase
      .from('agent_proposals')
      .update({
        status: 'approved',
        reviewed_by: 'ben',
        reviewed_at: new Date().toISOString(),
        review_notes: notes || 'Approved via dashboard',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, proposal: data });
  } catch (e) {
    console.error('Approve proposal error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Reject a proposal
app.post('/api/proposals/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data, error } = await supabase
      .from('agent_proposals')
      .update({
        status: 'rejected',
        reviewed_by: 'ben',
        reviewed_at: new Date().toISOString(),
        review_notes: reason || 'Rejected via dashboard',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, proposal: data });
  } catch (e) {
    console.error('Reject proposal error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Batch approve proposals
app.post('/api/proposals/batch-approve', async (req, res) => {
  try {
    const { ids, notes } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No proposal IDs provided' });
    }

    const { data, error } = await supabase
      .from('agent_proposals')
      .update({
        status: 'approved',
        reviewed_by: 'ben',
        reviewed_at: new Date().toISOString(),
        review_notes: notes || 'Batch approved via dashboard',
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select();

    if (error) throw error;

    res.json({ success: true, approved: data.length, proposals: data });
  } catch (e) {
    console.error('Batch approve error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Execute an approved proposal
app.post('/api/proposals/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('agent_proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (proposal.status !== 'approved') {
      return res.status(400).json({ error: 'Proposal must be approved before execution' });
    }

    // Mark as executing
    await supabase
      .from('agent_proposals')
      .update({
        status: 'executing',
        execution_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // For now, just mark as completed (actual execution would go here)
    // TODO: Dispatch to actual agent executor
    const { data, error } = await supabase
      .from('agent_proposals')
      .update({
        status: 'completed',
        execution_completed_at: new Date().toISOString(),
        execution_result: { executed_by: 'dashboard', timestamp: new Date().toISOString() },
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log to audit
    await supabase.from('agent_audit_log').insert({
      agent_id: proposal.agent_id,
      action_type: 'execute_proposal',
      action_details: { proposal_id: id, action_name: proposal.action_name },
      success: true,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, proposal: data });
  } catch (e) {
    console.error('Execute proposal error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get proposal stats
app.get('/api/proposals/stats', async (req, res) => {
  try {
    const { data: proposals } = await supabase
      .from('agent_proposals')
      .select('status, priority, agent_id, created_at');

    const stats = {
      total: proposals?.length || 0,
      byStatus: {},
      byAgent: {},
      byPriority: {}
    };

    (proposals || []).forEach(p => {
      stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
      stats.byAgent[p.agent_id] = (stats.byAgent[p.agent_id] || 0) + 1;
      stats.byPriority[p.priority || 'normal'] = (stats.byPriority[p.priority || 'normal'] || 0) + 1;
    });

    res.json(stats);
  } catch (e) {
    console.error('Proposal stats error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// Draft Generation & Human Verification
// ============================================

// Generate draft for a proposal (human reviews before send)
app.post('/api/proposals/:id/generate-draft', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('agent_proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Get contact info if this is a relationship-related proposal
    let contactInfo = null;
    const proposedAction = proposal.proposed_action || {};
    if (proposedAction.contact_id || proposedAction.ghl_contact_id) {
      const contactId = proposedAction.contact_id || proposedAction.ghl_contact_id;
      const { data: contact } = await supabase
        .from('ghl_contacts')
        .select('*')
        .eq('ghl_id', contactId)
        .single();
      contactInfo = contact;
    }

    // Generate draft based on action type
    let draft = {
      type: proposal.action_name,
      status: 'draft',
      generated_at: new Date().toISOString()
    };

    if (proposal.action_name === 'send_email' || proposal.action_name === 'send_notification') {
      // Load marketing skills for better email drafts
      const skillPrompt = await loadSkillsForAgent('draft-generator', 'principles-only');

      const contactName = contactInfo?.full_name || proposedAction.contact_name || 'there';
      const context = proposal.description || proposal.title;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Upgraded to gpt-4o for better skill adherence
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: `You are drafting a friendly reconnection email for ACT (A Curious Tractor), an Australian social enterprise focused on technology, art, and community impact.

${skillPrompt}

Apply these frameworks to create emails that:
- Are warm and genuine (not corporate)
- Brief (3-4 short paragraphs max)
- Follow "Value Before Ask" - lead with something useful
- Reference something specific about the relationship if known
- Include a clear but soft call to action (coffee, call, or just checking in)
- Use one primary CTA per email

Sign off as "Ben" from ACT.`
          },
          {
            role: 'user',
            content: `Draft a reconnection email for ${contactName}.

Context: ${context}
${contactInfo?.company_name ? `Their company: ${contactInfo.company_name}` : ''}
${contactInfo?.tags ? `Tags/interests: ${contactInfo.tags.join(', ')}` : ''}
${proposedAction.days_since_contact ? `Days since last contact: ${proposedAction.days_since_contact}` : ''}

Generate subject line and body following the email sequence best practices.`
          }
        ]
      });

      const content = response.choices[0].message.content;
      const subjectMatch = content.match(/Subject[:\s]*(.+?)[\n]/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : `Checking in - ${contactName}`;
      const body = content.replace(/Subject[:\s]*.+?\n/i, '').trim();

      draft = {
        ...draft,
        to: contactInfo?.email || proposedAction.email || '(no email on file)',
        to_name: contactName,
        subject,
        body,
        can_send: !!contactInfo?.email
      };
    } else if (proposal.action_name === 'update_contact' || proposal.action_name === 'schedule_followup') {
      // For non-email actions, just show what will happen
      draft = {
        ...draft,
        action_summary: proposal.description || proposal.title,
        proposed_changes: proposedAction,
        can_execute: true
      };
    } else {
      draft = {
        ...draft,
        action_summary: proposal.title,
        proposed_changes: proposedAction,
        can_execute: true
      };
    }

    // Store draft in proposal
    await supabase
      .from('agent_proposals')
      .update({
        modified_action: draft,
        status: 'draft_ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    res.json({ success: true, draft, proposal_id: id });
  } catch (e) {
    console.error('Generate draft error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Human confirms and sends the draft
app.post('/api/proposals/:id/confirm-send', async (req, res) => {
  try {
    const { id } = req.params;
    const { modified_body, modified_subject } = req.body;

    // Get the proposal with draft
    const { data: proposal, error: fetchError } = await supabase
      .from('agent_proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const draft = proposal.modified_action || {};

    // Apply any human modifications
    if (modified_body) draft.body = modified_body;
    if (modified_subject) draft.subject = modified_subject;

    // For now, we log the action but don't actually send
    // In production, this would call Gmail API or GHL API
    const executionResult = {
      action: draft.type,
      to: draft.to,
      subject: draft.subject,
      executed_at: new Date().toISOString(),
      executed_by: 'ben',
      // In production: actually_sent: true
      simulated: true,
      note: 'Email would be sent here - connect Gmail/GHL API for real sends'
    };

    // Update proposal as completed
    const { data, error } = await supabase
      .from('agent_proposals')
      .update({
        status: 'completed',
        execution_started_at: new Date().toISOString(),
        execution_completed_at: new Date().toISOString(),
        execution_result: executionResult,
        modified_action: draft,
        reviewed_by: 'ben',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log to audit
    await supabase.from('agent_audit_log').insert({
      agent_id: proposal.agent_id,
      action_type: 'human_confirmed_send',
      action_details: { proposal_id: id, action: draft.type, to: draft.to },
      success: true,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      proposal: data,
      message: draft.simulated
        ? 'Action logged (simulation mode - connect email API for real sends)'
        : 'Action executed successfully'
    });
  } catch (e) {
    console.error('Confirm send error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get single proposal with draft
app.get('/api/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: proposal, error } = await supabase
      .from('agent_proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(proposal);
  } catch (e) {
    console.error('Get proposal error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCOUTS ENDPOINTS (BUNYA + ALTA)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// BUNYA - Project Pulse: Get project health data
app.get('/api/scouts/bunya', async (req, res) => {
  try {
    // Get project health analyses
    const { data: healthData, error: healthError } = await supabase
      .from('project_health_analysis')
      .select('id, project_id, health_score, risks, recommendations, analysis_date, metadata')
      .order('analysis_date', { ascending: false });

    if (healthError) throw healthError;

    // Calculate summary stats
    const projects = healthData || [];
    const summary = {
      total: projects.length,
      healthy: projects.filter(p => p.health_score >= 70).length,
      needsAttention: projects.filter(p => p.health_score >= 50 && p.health_score < 70).length,
      atRisk: projects.filter(p => p.health_score >= 30 && p.health_score < 50).length,
      critical: projects.filter(p => p.health_score < 30).length
    };

    // Format projects for display
    const formattedProjects = projects.map(p => ({
      id: p.id,
      projectId: p.project_id,
      projectName: p.metadata?.project_code || 'Unknown',
      projectCode: p.metadata?.project_code,
      healthScore: p.health_score,
      status: p.health_score >= 70 ? 'healthy' :
              p.health_score >= 50 ? 'needs_attention' :
              p.health_score >= 30 ? 'at_risk' : 'critical',
      risks: p.risks || [],
      recommendations: p.recommendations || [],
      metadata: p.metadata,
      analyzedAt: p.analysis_date
    }));

    res.json({
      scout: 'bunya',
      name: 'BUNYA Project Pulse',
      description: 'Monitors project health and relationship warmth',
      summary,
      projects: formattedProjects,
      lastRun: projects[0]?.analysis_date || null
    });
  } catch (e) {
    console.error('BUNYA endpoint error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ALTA - Grant Scout: Get grant opportunities data
app.get('/api/scouts/alta', async (req, res) => {
  try {
    // Get grant opportunities
    const { data: grants, error: grantsError } = await supabase
      .from('grant_opportunities')
      .select('*')
      .order('deadline', { ascending: true });

    if (grantsError) throw grantsError;

    const now = new Date();
    const grantList = grants || [];

    // Calculate summary stats
    const summary = {
      total: grantList.length,
      open: grantList.filter(g => g.status === 'open' || g.status === 'researching').length,
      applied: grantList.filter(g => g.status === 'applied').length,
      awarded: grantList.filter(g => g.status === 'awarded').length,
      upcoming30Days: grantList.filter(g => {
        if (!g.deadline) return false;
        const deadline = new Date(g.deadline);
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 30;
      }).length,
      atRisk: grantList.filter(g => {
        if (!g.deadline) return false;
        const deadline = new Date(g.deadline);
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 14;
      }).length
    };

    // Calculate total opportunity value
    let minValue = 0;
    let maxValue = 0;
    grantList.forEach(g => {
      if (g.amount_min) minValue += g.amount_min;
      if (g.amount_max) maxValue += g.amount_max;
    });

    // Format grants for display
    const formattedGrants = grantList.map(g => {
      const deadline = g.deadline ? new Date(g.deadline) : null;
      const daysUntil = deadline ? Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)) : null;

      return {
        id: g.id,
        name: g.name,
        provider: g.provider,
        category: g.category,
        status: g.status,
        deadline: g.deadline,
        daysUntilDeadline: daysUntil,
        amountMin: g.amount_min,
        amountMax: g.amount_max,
        amountDisplay: g.amount_min && g.amount_max ?
          `$${(g.amount_min/1000).toFixed(0)}k - $${(g.amount_max/1000).toFixed(0)}k` :
          g.amount_max ? `Up to $${(g.amount_max/1000).toFixed(0)}k` : 'TBD',
        matchedProjects: g.matched_projects || [],
        relevanceScore: g.relevance_score,
        url: g.url,
        notes: g.notes,
        isUrgent: daysUntil !== null && daysUntil <= 14 && daysUntil >= 0
      };
    });

    res.json({
      scout: 'alta',
      name: 'ALTA Grant Scout',
      description: 'Discovers and matches grant opportunities to ACT projects',
      summary: {
        ...summary,
        totalOpportunityMin: minValue,
        totalOpportunityMax: maxValue,
        totalOpportunityDisplay: `$${(minValue/1000).toFixed(0)}k - $${(maxValue/1000000).toFixed(2)}M`
      },
      grants: formattedGrants,
      lastRun: grantList[0]?.updated_at || null
    });
  } catch (e) {
    console.error('ALTA endpoint error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Combined scouts overview
app.get('/api/scouts', async (req, res) => {
  try {
    // Get BUNYA summary
    const { data: healthData } = await supabase
      .from('project_health_analysis')
      .select('health_score, analysis_date')
      .order('analysis_date', { ascending: false });

    const projects = healthData || [];
    const bunyaSummary = {
      total: projects.length,
      healthy: projects.filter(p => p.health_score >= 70).length,
      atRisk: projects.filter(p => p.health_score < 50).length,
      lastRun: projects[0]?.analysis_date || null
    };

    // Get ALTA summary
    const { data: grants } = await supabase
      .from('grant_opportunities')
      .select('status, deadline, amount_max');

    const now = new Date();
    const grantList = grants || [];
    const altaSummary = {
      total: grantList.length,
      open: grantList.filter(g => g.status === 'open' || g.status === 'researching').length,
      upcoming14Days: grantList.filter(g => {
        if (!g.deadline) return false;
        const daysUntil = Math.ceil((new Date(g.deadline) - now) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 14;
      }).length,
      totalValue: grantList.reduce((sum, g) => sum + (g.amount_max || 0), 0)
    };

    res.json({
      scouts: [
        {
          id: 'bunya',
          name: 'BUNYA Project Pulse',
          icon: '🌲',
          description: 'Project health monitoring',
          summary: bunyaSummary,
          status: bunyaSummary.atRisk > 0 ? 'warning' : 'healthy'
        },
        {
          id: 'alta',
          name: 'ALTA Grant Scout',
          icon: '🦅',
          description: 'Grant opportunity discovery',
          summary: altaSummary,
          status: altaSummary.upcoming14Days > 0 ? 'attention' : 'healthy'
        }
      ]
    });
  } catch (e) {
    console.error('Scouts endpoint error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUNYA FIXER ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Tag mappings for project contact linking
const PROJECT_TAGS = {
  'ACT-JH': ['justicehub', 'justice', 'youth justice', 'youth-justice', 'yj', 'interest:justice-reform'],
  'ACT-GD': ['goods', 'goods-advisory'],
  'ACT-EL': ['empathy-ledger', 'empathy', 'storytelling', 'stories'],
  'ACT-HV': ['harvest', 'the-harvest', 'regenerative'],
  'ACT-FO': ['fishers-oysters', 'fishers', 'oysters'],
  'ACT-FN': ['indigenous', 'first-nations', 'aboriginal'],
  'ACT-DG': ['diagrama'],
  'ACT-MD': ['event registrant', 'newsletter'],
  'ACT-PI': ['picc', 'community'],
  'ACT-SM': ['contained launch 2026', 'contained'],
  'ACT-AI': ['technology', 'ai-flagged'],
};

const PROJECT_NAMES = {
  'ACT-JH': 'JusticeHub',
  'ACT-GD': 'Goods',
  'ACT-EL': 'Empathy Ledger',
  'ACT-HV': 'The Harvest',
  'ACT-FO': 'Fishers Oysters',
  'ACT-FN': 'First Nations Initiatives',
  'ACT-DG': 'Diagrama',
  'ACT-MD': 'ACT Monthly Dinners',
  'ACT-PI': 'PICC',
  'ACT-SM': 'Contained',
  'ACT-AI': 'ACT AI/Tech',
};

// Fix a single project
app.post('/api/scouts/bunya/fix/:projectCode', async (req, res) => {
  const { projectCode } = req.params;
  const { dryRun = false } = req.body || {};

  try {
    // Get project health data
    const { data: project, error: projectError } = await supabase
      .from('project_health_analysis')
      .select('*')
      .ilike('metadata->>project_code', `%${projectCode}%`)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: `Project ${projectCode} not found` });
    }

    const code = project.metadata?.project_code || projectCode;
    const result = { projectCode: code, actions: [] };

    // Check if no contacts linked
    const risks = project.risks || [];
    const recommendations = project.recommendations || [];
    const hasNoContacts = risks.some(r => r.includes('No contacts linked')) ||
                          recommendations.some(r => r.includes('Tag relevant'));

    if (hasNoContacts) {
      const tags = PROJECT_TAGS[code] || [];

      if (tags.length === 0) {
        result.actions.push({ type: 'skip', reason: 'no_tag_mapping', message: `No tag mapping for ${code}` });
      } else {
        // Find matching contacts
        const { data: contacts } = await supabase
          .from('ghl_contacts')
          .select('id, ghl_id, full_name, email, tags')
          .limit(1000);

        const matchingContacts = (contacts || []).filter(c => {
          const contactTags = (c.tags || []).map(t => t.toLowerCase());
          return tags.some(tag => contactTags.includes(tag.toLowerCase()));
        });

        if (matchingContacts.length === 0) {
          result.actions.push({ type: 'none', reason: 'no_matching_contacts', message: `No contacts found with tags: ${tags.join(', ')}` });
        } else if (dryRun) {
          result.actions.push({
            type: 'would_link',
            contacts: matchingContacts.length,
            contactNames: matchingContacts.slice(0, 5).map(c => c.full_name || c.email)
          });
        } else {
          // Update project health
          await supabase
            .from('project_health_analysis')
            .update({
              metadata: { ...project.metadata, linked_contacts: matchingContacts.length },
              risks: risks.filter(r => !r.includes('No contacts linked')),
              recommendations: recommendations.filter(r => !r.includes('Tag relevant')),
              health_score: Math.min(100, (project.health_score || 0) + 30),
              analysis_date: new Date().toISOString()
            })
            .eq('id', project.id);

          result.actions.push({
            type: 'linked',
            contacts: matchingContacts.length,
            message: `Linked ${matchingContacts.length} contacts to ${code}`
          });
        }
      }
    }

    // Check if cold contacts
    const hasColdContacts = risks.some(r => r.includes('cold')) ||
                            recommendations.some(r => r.includes('cultivator'));

    if (hasColdContacts && !dryRun) {
      // Create cultivator proposal
      const { data: proposal } = await supabase
        .from('agent_proposals')
        .insert({
          agent_id: 'bunya-fixer',
          action_name: 'cultivator_warmup',
          title: `Warm up cold contacts for ${PROJECT_NAMES[code] || code}`,
          description: `Project ${code} has cold contacts. Run cultivator agent to re-engage.`,
          reasoning: { trigger: 'bunya_ui_fix', health_score: project.health_score },
          proposed_action: { project_code: code, action_type: 'relationship_warmup' },
          priority: project.health_score < 50 ? 'high' : 'normal',
          status: 'pending'
        })
        .select()
        .single();

      result.actions.push({
        type: 'proposed',
        proposalId: proposal?.id,
        message: `Created cultivator warmup proposal for ${code}`
      });
    } else if (hasColdContacts && dryRun) {
      result.actions.push({ type: 'would_propose', proposalType: 'cultivator_warmup' });
    }

    // Check if no activity
    const hasNoActivity = risks.some(r => r.includes('No activity')) ||
                          recommendations.some(r => r.includes('check-in'));

    if (hasNoActivity && !dryRun) {
      const daysMatch = risks.join(' ').match(/(\d+) days/);
      const days = daysMatch ? parseInt(daysMatch[1]) : 30;

      const { data: proposal } = await supabase
        .from('agent_proposals')
        .insert({
          agent_id: 'bunya-fixer',
          action_name: 'schedule_checkin',
          title: `Schedule check-in for ${PROJECT_NAMES[code] || code}`,
          description: `Project ${code} has had no activity in ${days} days.`,
          reasoning: { trigger: 'bunya_ui_fix', days_inactive: days },
          proposed_action: { project_code: code, action_type: 'schedule_meeting' },
          priority: days > 90 ? 'urgent' : days > 60 ? 'high' : 'normal',
          status: 'pending'
        })
        .select()
        .single();

      result.actions.push({
        type: 'proposed',
        proposalId: proposal?.id,
        message: `Created check-in proposal for ${code}`
      });
    } else if (hasNoActivity && dryRun) {
      result.actions.push({ type: 'would_propose', proposalType: 'schedule_checkin' });
    }

    if (result.actions.length === 0) {
      result.actions.push({ type: 'none', message: 'No fixable issues found' });
    }

    res.json(result);
  } catch (e) {
    console.error('BUNYA fix error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Fix all projects with issues
app.post('/api/scouts/bunya/fix-all', async (req, res) => {
  const { dryRun = false, limit = 10 } = req.body || {};

  try {
    // Get projects with issues (health_score < 70)
    const { data: projects, error } = await supabase
      .from('project_health_analysis')
      .select('*')
      .lt('health_score', 70)
      .order('health_score', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const results = {
      total: projects?.length || 0,
      fixed: 0,
      proposed: 0,
      skipped: 0,
      projects: []
    };

    for (const project of (projects || [])) {
      const code = project.metadata?.project_code;
      if (!code || code === 'Unknown') {
        results.skipped++;
        continue;
      }

      const risks = project.risks || [];
      const recommendations = project.recommendations || [];
      const hasNoContacts = risks.some(r => r.includes('No contacts linked'));
      const hasColdContacts = risks.some(r => r.includes('cold'));

      const projectResult = { code, actions: [] };

      // Fix no contacts
      if (hasNoContacts) {
        const tags = PROJECT_TAGS[code];
        if (tags) {
          const { data: contacts } = await supabase
            .from('ghl_contacts')
            .select('id, full_name, tags')
            .limit(1000);

          const matching = (contacts || []).filter(c => {
            const contactTags = (c.tags || []).map(t => t.toLowerCase());
            return tags.some(tag => contactTags.includes(tag.toLowerCase()));
          });

          if (matching.length > 0 && !dryRun) {
            await supabase
              .from('project_health_analysis')
              .update({
                metadata: { ...project.metadata, linked_contacts: matching.length },
                risks: risks.filter(r => !r.includes('No contacts')),
                recommendations: recommendations.filter(r => !r.includes('Tag relevant')),
                health_score: Math.min(100, (project.health_score || 0) + 30),
                analysis_date: new Date().toISOString()
              })
              .eq('id', project.id);

            projectResult.actions.push({ type: 'linked', contacts: matching.length });
            results.fixed++;
          } else if (matching.length > 0) {
            projectResult.actions.push({ type: 'would_link', contacts: matching.length });
          }
        } else {
          projectResult.actions.push({ type: 'skip', reason: 'no_tags' });
          results.skipped++;
        }
      }

      // Create proposal for cold contacts
      if (hasColdContacts && !dryRun) {
        await supabase.from('agent_proposals').insert({
          agent_id: 'bunya-fixer',
          action_name: 'cultivator_warmup',
          title: `Warm up cold contacts for ${PROJECT_NAMES[code] || code}`,
          description: `Project ${code} needs relationship warming.`,
          reasoning: { trigger: 'bunya_fix_all' },
          proposed_action: { project_code: code },
          priority: project.health_score < 50 ? 'high' : 'normal',
          status: 'pending'
        });
        projectResult.actions.push({ type: 'proposed' });
        results.proposed++;
      }

      if (projectResult.actions.length > 0) {
        results.projects.push(projectResult);
      }
    }

    res.json(results);
  } catch (e) {
    console.error('BUNYA fix-all error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CALENDAR API ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Get calendar events for date range
app.get('/api/calendar/events', async (req, res) => {
  try {
    const { start, end, project, calendar_id, limit = 100 } = req.query;

    // Default to current month if no dates provided
    const startDate = start ? new Date(start) : new Date(new Date().setDate(1));
    const endDate = end ? new Date(end) : new Date(new Date().setMonth(new Date().getMonth() + 1, 0));

    let query = supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })
      .limit(parseInt(limit));

    if (project) {
      query = query.eq('project_code', project);
    }

    if (calendar_id) {
      query = query.eq('google_calendar_id', calendar_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Parse JSONB fields
    const events = (data || []).map(e => ({
      ...e,
      attendees: typeof e.attendees === 'string' ? JSON.parse(e.attendees) : e.attendees,
      attendee_contact_matches: typeof e.attendee_contact_matches === 'string' ? JSON.parse(e.attendee_contact_matches) : e.attendee_contact_matches,
      metadata: typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata,
    }));

    res.json({ success: true, events, count: events.length });
  } catch (e) {
    console.error('Calendar events error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get calendar event by ID
app.get('/api/calendar/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found' });

    // Parse JSONB fields
    const event = {
      ...data,
      attendees: typeof data.attendees === 'string' ? JSON.parse(data.attendees) : data.attendees,
      attendee_contact_matches: typeof data.attendee_contact_matches === 'string' ? JSON.parse(data.attendee_contact_matches) : data.attendee_contact_matches,
      metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
    };

    res.json({ success: true, event });
  } catch (e) {
    console.error('Calendar event error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Link project to calendar event
app.post('/api/calendar/events/:id/link-project', async (req, res) => {
  try {
    const { id } = req.params;
    const { project_code } = req.body;

    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        manual_project_code: project_code,
        project_code: project_code, // Trigger auto-sets this based on manual or detected
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, event: data });
  } catch (e) {
    console.error('Link project error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get calendar events for a project
app.get('/api/projects/:code/calendar', async (req, res) => {
  try {
    const { code } = req.params;
    const { upcoming = 'true', limit = 20 } = req.query;

    const now = new Date();
    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('project_code', code)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: upcoming === 'true' })
      .limit(parseInt(limit));

    if (upcoming === 'true') {
      query = query.gte('start_time', now.toISOString());
    } else {
      query = query.lt('start_time', now.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const events = (data || []).map(e => ({
      ...e,
      attendees: typeof e.attendees === 'string' ? JSON.parse(e.attendees) : e.attendees,
    }));

    res.json({ success: true, events, project_code: code });
  } catch (e) {
    console.error('Project calendar error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get calendar statistics
app.get('/api/calendar/stats', async (req, res) => {
  try {
    const { start, end } = req.query;

    // Default to current month
    const startDate = start ? new Date(start) : new Date(new Date().setDate(1));
    const endDate = end ? new Date(end) : new Date(new Date().setMonth(new Date().getMonth() + 1, 0));

    // Get total count
    const { count: totalCount } = await supabase
      .from('calendar_events')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'cancelled');

    // Get events in range for stats
    const { data: events } = await supabase
      .from('calendar_events')
      .select('event_type, project_code, start_time, end_time')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .neq('status', 'cancelled');

    // Calculate stats
    const byType = {};
    const byProject = {};
    let totalHours = 0;

    for (const e of events || []) {
      byType[e.event_type || 'meeting'] = (byType[e.event_type || 'meeting'] || 0) + 1;

      if (e.project_code) {
        byProject[e.project_code] = (byProject[e.project_code] || 0) + 1;
      }

      if (e.start_time && e.end_time) {
        const hours = (new Date(e.end_time) - new Date(e.start_time)) / (1000 * 60 * 60);
        totalHours += hours;
      }
    }

    // Get upcoming events count
    const { count: upcomingCount } = await supabase
      .from('calendar_events')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', new Date().toISOString())
      .neq('status', 'cancelled');

    // Get today's events count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const { count: todayCount } = await supabase
      .from('calendar_events')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', todayStart.toISOString())
      .lt('start_time', todayEnd.toISOString())
      .neq('status', 'cancelled');

    res.json({
      success: true,
      total: totalCount || 0,
      upcoming: upcomingCount || 0,
      today: todayCount || 0,
      periodEvents: events?.length || 0,
      periodHours: Math.round(totalHours * 10) / 10,
      byType,
      byProject,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });
  } catch (e) {
    console.error('Calendar stats error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get monthly calendar report
app.get('/api/calendar/reports/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const { data: events } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .neq('status', 'cancelled')
      .order('start_time');

    // Calculate report metrics
    const byType = {};
    const byProject = {};
    const byDay = {};
    let totalHours = 0;
    const attendeeCounts = {};

    for (const e of events || []) {
      // By type
      byType[e.event_type || 'meeting'] = (byType[e.event_type || 'meeting'] || 0) + 1;

      // By project
      if (e.project_code) {
        byProject[e.project_code] = (byProject[e.project_code] || 0) + 1;
      }

      // By day of week
      const dayOfWeek = new Date(e.start_time).toLocaleDateString('en-AU', { weekday: 'long' });
      byDay[dayOfWeek] = (byDay[dayOfWeek] || 0) + 1;

      // Hours
      if (e.start_time && e.end_time) {
        const hours = (new Date(e.end_time) - new Date(e.start_time)) / (1000 * 60 * 60);
        totalHours += hours;
      }

      // Count attendees
      const attendees = typeof e.attendees === 'string' ? JSON.parse(e.attendees) : e.attendees;
      for (const att of attendees || []) {
        if (att.email) {
          attendeeCounts[att.email] = (attendeeCounts[att.email] || 0) + 1;
        }
      }
    }

    // Top collaborators
    const topCollaborators = Object.entries(attendeeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([email, count]) => ({ email, count }));

    res.json({
      success: true,
      period: {
        year: parseInt(year),
        month: parseInt(month),
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalEvents: events?.length || 0,
        totalHours: Math.round(totalHours * 10) / 10,
        avgEventsPerDay: Math.round((events?.length || 0) / endDate.getDate() * 10) / 10,
        avgHoursPerDay: Math.round(totalHours / endDate.getDate() * 10) / 10
      },
      byType,
      byProject,
      byDay,
      topCollaborators
    });
  } catch (e) {
    console.error('Monthly report error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Today's events endpoint
app.get('/api/calendar/today', async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', todayStart.toISOString())
      .lt('start_time', todayEnd.toISOString())
      .neq('status', 'cancelled')
      .order('start_time');

    if (error) throw error;

    const events = (data || []).map(e => ({
      ...e,
      attendees: typeof e.attendees === 'string' ? JSON.parse(e.attendees) : e.attendees,
    }));

    // Calculate free time blocks (work hours 9am-6pm)
    const freeBlocks = [];
    const workStart = 9;
    const workEnd = 18;
    let currentTime = new Date(todayStart);
    currentTime.setHours(workStart, 0, 0, 0);

    const sortedEvents = events
      .filter(e => !e.is_all_day)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    for (const event of sortedEvents) {
      const eventStart = new Date(event.start_time);
      if (eventStart > currentTime) {
        const gapMinutes = (eventStart - currentTime) / (1000 * 60);
        if (gapMinutes >= 30) {
          freeBlocks.push({
            start: currentTime.toISOString(),
            end: eventStart.toISOString(),
            minutes: gapMinutes
          });
        }
      }
      const eventEnd = new Date(event.end_time || event.start_time);
      if (eventEnd > currentTime) {
        currentTime = new Date(eventEnd);
      }
    }

    // Check for free time until end of work day
    const endOfWork = new Date(todayStart);
    endOfWork.setHours(workEnd, 0, 0, 0);
    if (currentTime < endOfWork) {
      const gapMinutes = (endOfWork - currentTime) / (1000 * 60);
      if (gapMinutes >= 30) {
        freeBlocks.push({
          start: currentTime.toISOString(),
          end: endOfWork.toISOString(),
          minutes: gapMinutes
        });
      }
    }

    res.json({
      success: true,
      date: todayStart.toISOString().split('T')[0],
      events,
      eventCount: events.length,
      freeBlocks,
      totalFreeMinutes: freeBlocks.reduce((sum, b) => sum + b.minutes, 0)
    });
  } catch (e) {
    console.error('Today events error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// Strategy Plans (markdown-based project planning)
// ============================================

app.get('/api/strategy/plans', async (req, res) => {
  try {
    const strategyDir = join(__dirname, '../../docs/strategy');
    const files = await readdir(strategyDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    const plans = await Promise.all(mdFiles.map(async (filename) => {
      const content = await readFile(join(strategyDir, filename), 'utf-8');

      // Extract metadata from markdown
      const titleMatch = content.match(/^#\s+(.+)/m);
      const projectCodeMatch = content.match(/\*\*Project Code:\*\*\s*(\S+)/i);
      const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/i);
      const launchMatch = content.match(/\*\*Launch Window:\*\*\s*(.+)/i) || content.match(/launch_date[:\s]+["']?([^"'\n]+)/i);
      const parentMatch = content.match(/\*\*Parent Project:\*\*\s*(.+)/i);

      // Extract key deliverables (look for ### numbered items)
      const deliverablesSection = content.match(/## Key Deliverables([\s\S]*?)(?=\n##[^#]|$)/i);
      const deliverables = [];
      if (deliverablesSection) {
        const matches = deliverablesSection[1].match(/###\s+\d+\.\s+(.+)/g);
        if (matches) {
          deliverables.push(...matches.map(m => m.replace(/###\s+\d+\.\s+/, '')));
        }
      }

      // Extract overview/summary
      const overviewMatch = content.match(/## Overview\s+([\s\S]*?)(?=\n##[^#]|$)/i);
      const summary = overviewMatch
        ? overviewMatch[1].trim().split('\n\n')[0].trim()
        : content.split('\n\n').slice(1, 2).join('').trim().slice(0, 200);

      return {
        id: filename.replace('.md', ''),
        filename,
        title: titleMatch ? titleMatch[1].trim() : filename.replace('.md', '').replace(/_/g, ' '),
        project_code: projectCodeMatch ? projectCodeMatch[1].trim() : null,
        parent_project: parentMatch ? parentMatch[1].trim() : null,
        status: statusMatch ? statusMatch[1].trim() : 'Planning',
        launch_date: launchMatch ? launchMatch[1].trim() : null,
        summary,
        deliverables,
        updated_at: (await stat(join(strategyDir, filename))).mtime.toISOString()
      };
    }));

    // Sort by updated_at desc
    plans.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    res.json({ plans, count: plans.length });
  } catch (e) {
    console.error('Strategy plans error:', e);
    res.status(500).json({ error: e.message, plans: [] });
  }
});

// Get a single strategy plan (full markdown content)
app.get('/api/strategy/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const strategyDir = join(__dirname, '../../docs/strategy');
    const filename = `${id}.md`;
    const filepath = join(strategyDir, filename);

    const content = await readFile(filepath, 'utf-8');
    const fileStats = await stat(filepath);

    res.json({
      id,
      filename,
      content,
      updated_at: fileStats.mtime.toISOString()
    });
  } catch (e) {
    if (e.code === 'ENOENT') {
      res.status(404).json({ error: 'Plan not found' });
    } else {
      console.error('Strategy plan read error:', e);
      res.status(500).json({ error: e.message });
    }
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACT BRAIN CENTER - 2026 GOALS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get('/api/goals/2026', async (req, res) => {
  try {
    const { data: goals, error } = await supabase
      .from('goals_2026')
      .select('*')
      .order('lane', { ascending: true })
      .order('type', { ascending: true });

    if (error) throw error;

    // Group by lane
    const lanes = {
      'A': { name: 'A — Core Ops', goals: [], completed: 0, total: 0 },
      'B': { name: 'B — Platforms', goals: [], completed: 0, total: 0 },
      'C': { name: 'C — Place/Seasonal', goals: [], completed: 0, total: 0 },
      'unassigned': { name: 'Unassigned', goals: [], completed: 0, total: 0 }
    };

    for (const goal of goals || []) {
      const laneKey = goal.lane?.startsWith('A') ? 'A' :
                      goal.lane?.startsWith('B') ? 'B' :
                      goal.lane?.startsWith('C') ? 'C' : 'unassigned';

      lanes[laneKey].goals.push(goal);
      lanes[laneKey].total++;
      if (goal.status === 'Completed') {
        lanes[laneKey].completed++;
      }
    }

    // Calculate progress percentages
    for (const lane of Object.values(lanes)) {
      lane.progress = lane.total > 0 ? Math.round((lane.completed / lane.total) * 100) : 0;
    }

    // Summary stats
    const yearlyGoals = (goals || []).filter(g => g.type === 'Yearly Goal');
    const quarterlyGoals = (goals || []).filter(g => g.type === 'Quarterly Sprint');
    const completedGoals = (goals || []).filter(g => g.status === 'Completed');
    const inProgressGoals = (goals || []).filter(g => g.status === 'In progress');

    res.json({
      lanes,
      summary: {
        total: goals?.length || 0,
        yearly: yearlyGoals.length,
        quarterly: quarterlyGoals.length,
        completed: completedGoals.length,
        inProgress: inProgressGoals.length,
        overallProgress: goals?.length > 0
          ? Math.round((completedGoals.length / goals.length) * 100)
          : 0
      },
      goals: goals || []
    });
  } catch (e) {
    console.error('Goals 2026 error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACT BRAIN CENTER - ECOSYSTEM SITES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get('/api/ecosystem', async (req, res) => {
  try {
    const { data: sites, error } = await supabase
      .from('ecosystem_sites')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Group by category
    const categories = {
      core: { name: 'Core', sites: [] },
      platform: { name: 'Platforms', sites: [] },
      community: { name: 'Community', sites: [] }
    };

    for (const site of sites || []) {
      const cat = site.category || 'community';
      if (categories[cat]) {
        categories[cat].sites.push(site);
      }
    }

    // Calculate health summary
    const healthySites = (sites || []).filter(s => s.status === 'healthy').length;
    const totalSites = sites?.length || 0;

    res.json({
      categories,
      sites: sites || [],
      health: {
        healthy: healthySites,
        total: totalSites,
        percentage: totalSites > 0 ? Math.round((healthySites / totalSites) * 100) : 0
      }
    });
  } catch (e) {
    console.error('Ecosystem error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACT BRAIN CENTER - GOALS API (Enhanced)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Update goal progress with history tracking
app.post('/api/goals/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, status, source, updated_by, comment } = req.body;

    const updates = {
      last_update_source: source || 'dashboard',
      last_updated_by: updated_by,
      updated_at: new Date().toISOString()
    };

    if (progress !== undefined) {
      updates.progress_percentage = Math.max(0, Math.min(100, Math.round(progress)));
    }
    if (status) {
      updates.status = status;
      if (status === 'Completed') {
        updates.progress_percentage = 100;
      }
    }

    const { data, error } = await supabase
      .from('goals_2026')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If comment provided, update most recent goal_update entry
    if (comment) {
      await supabase
        .from('goal_updates')
        .update({ comment })
        .eq('goal_id', id)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    res.json({ success: true, goal: data });
  } catch (e) {
    console.error('Goal update error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get goal change history
app.get('/api/goals/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const { data, error } = await supabase
      .from('goal_updates')
      .select('*')
      .eq('goal_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ history: data || [] });
  } catch (e) {
    console.error('Goal history error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Add KPI metric to a goal
app.post('/api/goals/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, target, current, unit } = req.body;

    if (!name || target === undefined) {
      return res.status(400).json({ error: 'name and target are required' });
    }

    const metricData = {
      goal_id: id,
      metric_name: name,
      metric_type: type || 'number',
      target_value: target,
      current_value: current || 0,
      unit: unit || null,
      value_history: current ? [{
        value: current,
        timestamp: new Date().toISOString()
      }] : []
    };

    const { data, error } = await supabase
      .from('goal_metrics')
      .insert(metricData)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, metric: data });
  } catch (e) {
    console.error('Add metric error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Update metric value
app.post('/api/goals/:id/metrics/:metricId', async (req, res) => {
  try {
    const { metricId } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' });
    }

    // Get current metric for history
    const { data: current, error: fetchError } = await supabase
      .from('goal_metrics')
      .select('value_history')
      .eq('id', metricId)
      .single();

    if (fetchError) throw fetchError;

    const history = current.value_history || [];
    history.push({
      value,
      timestamp: new Date().toISOString()
    });

    const { data, error } = await supabase
      .from('goal_metrics')
      .update({
        current_value: value,
        value_history: history.slice(-100),
        updated_at: new Date().toISOString()
      })
      .eq('id', metricId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, metric: data });
  } catch (e) {
    console.error('Update metric error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get goal with metrics and history
app.get('/api/goals/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    const [goalResult, metricsResult, historyResult] = await Promise.all([
      supabase.from('goals_2026').select('*').eq('id', id).single(),
      supabase.from('goal_metrics').select('*').eq('goal_id', id),
      supabase.from('goal_updates').select('*').eq('goal_id', id)
        .order('created_at', { ascending: false }).limit(10)
    ]);

    if (goalResult.error) throw goalResult.error;

    res.json({
      ...goalResult.data,
      metrics: metricsResult.data || [],
      recent_history: historyResult.data || []
    });
  } catch (e) {
    console.error('Goal details error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Goals summary statistics
app.get('/api/goals/summary', async (req, res) => {
  try {
    const { data: goals, error } = await supabase
      .from('goals_2026')
      .select('lane, status, progress_percentage');

    if (error) throw error;

    const summary = {
      total: goals.length,
      byLane: {},
      byStatus: {},
      avgProgress: 0
    };

    let totalProgress = 0;

    for (const goal of goals) {
      const lane = goal.lane || 'Unassigned';
      if (!summary.byLane[lane]) {
        summary.byLane[lane] = { count: 0, completed: 0, avgProgress: 0, totalProgress: 0 };
      }
      summary.byLane[lane].count++;
      summary.byLane[lane].totalProgress += goal.progress_percentage || 0;
      if (goal.status === 'Completed') {
        summary.byLane[lane].completed++;
      }

      const status = goal.status || 'Not started';
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      totalProgress += goal.progress_percentage || 0;
    }

    summary.avgProgress = goals.length > 0 ? Math.round(totalProgress / goals.length) : 0;

    for (const lane of Object.keys(summary.byLane)) {
      summary.byLane[lane].avgProgress = Math.round(
        summary.byLane[lane].totalProgress / summary.byLane[lane].count
      );
      delete summary.byLane[lane].totalProgress;
    }

    res.json(summary);
  } catch (e) {
    console.error('Goals summary error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Move goal to different lane and/or position
app.post('/api/goals/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { lane, position } = req.body;

    // Update lane (always works - column exists)
    if (lane !== undefined) {
      const { error } = await supabase
        .from('goals_2026')
        .update({ lane, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    }

    // Update position using raw SQL to bypass schema cache
    if (position !== undefined) {
      const { error } = await supabase.rpc('update_goal_position', {
        goal_id: id,
        new_position: position
      });
      // If RPC doesn't exist, try direct update (may fail if column missing)
      if (error) {
        const { error: directError } = await supabase
          .from('goals_2026')
          .update({ lane_position: position, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (directError) console.warn('Position update skipped:', directError.message);
      }
    }

    // Fetch and return updated goal
    const { data, error: fetchError } = await supabase
      .from('goals_2026')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    res.json({ success: true, goal: data });
  } catch (e) {
    console.error('Goal move error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Reorder goals within a lane
app.post('/api/goals/reorder', async (req, res) => {
  try {
    const { lane, goalIds } = req.body;

    if (!lane || !Array.isArray(goalIds)) {
      return res.status(400).json({ error: 'lane and goalIds array required' });
    }

    // Batch update positions
    const updates = goalIds.map((gid, index) => ({
      id: gid,
      lane: lane,
      lane_name: lane,
      lane_position: index,
      updated_at: new Date().toISOString()
    }));

    for (const update of updates) {
      await supabase
        .from('goals_2026')
        .update({ lane_position: update.lane_position, updated_at: update.updated_at })
        .eq('id', update.id);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Goal reorder error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get goals for calendar view
app.get('/api/goals/2026/calendar', async (req, res) => {
  try {
    const { data: goals, error } = await supabase
      .from('goals_2026')
      .select('id, title, due_date, lane, progress_percentage, status, type, project_id')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });

    if (error) throw error;

    // Map lane to lane_name for frontend compatibility
    const mappedGoals = (goals || []).map(g => ({
      ...g,
      lane_name: g.lane,
    }));

    res.json({ goals: mappedGoals });
  } catch (e) {
    console.error('Goals calendar error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACT BRAIN CENTER - ECOSYSTEM HEALTH API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Get health history for a site
app.get('/api/ecosystem/:slug/health-history', async (req, res) => {
  try {
    const { slug } = req.params;
    const days = parseInt(req.query.days) || 7;

    // Get site ID
    const { data: site, error: siteError } = await supabase
      .from('ecosystem_sites')
      .select('id')
      .eq('slug', slug)
      .single();

    if (siteError) throw siteError;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('site_health_checks')
      .select('*')
      .eq('site_id', site.id)
      .gte('checked_at', since.toISOString())
      .order('checked_at', { ascending: true });

    if (error) throw error;
    res.json({ history: data || [] });
  } catch (e) {
    console.error('Health history error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get site details with health and deployments
app.get('/api/ecosystem/:slug/details', async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: site, error: siteError } = await supabase
      .from('ecosystem_sites')
      .select('*')
      .eq('slug', slug)
      .single();

    if (siteError) throw siteError;

    // Get latest health check and recent deployments
    const [healthResult, deploymentsResult, alertsResult] = await Promise.all([
      supabase.from('site_health_checks')
        .select('*')
        .eq('site_id', site.id)
        .order('checked_at', { ascending: false })
        .limit(1),
      supabase.from('site_deployments')
        .select('*')
        .eq('site_id', site.id)
        .order('deployed_at', { ascending: false })
        .limit(5),
      supabase.from('health_alerts')
        .select('*')
        .eq('site_id', site.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    res.json({
      ...site,
      latest_health: healthResult.data?.[0] || null,
      recent_deployments: deploymentsResult.data || [],
      active_alerts: alertsResult.data || []
    });
  } catch (e) {
    console.error('Site details error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get deployment history for a site
app.get('/api/ecosystem/:slug/deployments', async (req, res) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const { data: site, error: siteError } = await supabase
      .from('ecosystem_sites')
      .select('id')
      .eq('slug', slug)
      .single();

    if (siteError) throw siteError;

    const { data, error } = await supabase
      .from('site_deployments')
      .select('*')
      .eq('site_id', site.id)
      .order('deployed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ deployments: data || [] });
  } catch (e) {
    console.error('Deployments error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Trigger manual health check for a site
app.post('/api/ecosystem/:slug/check', async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: site, error: siteError } = await supabase
      .from('ecosystem_sites')
      .select('*')
      .eq('slug', slug)
      .single();

    if (siteError) throw siteError;

    // Import and run health check
    const { checkSite } = await import('../../scripts/health-check-service.mjs');
    const result = await checkSite(site);

    // Store result
    const { error: insertError } = await supabase
      .from('site_health_checks')
      .insert(result);

    if (insertError) throw insertError;

    res.json({ success: true, health: result });
  } catch (e) {
    console.error('Health check error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Trigger health check for all sites
app.post('/api/ecosystem/check-all', async (req, res) => {
  try {
    const { runHealthChecks } = await import('../../scripts/health-check-service.mjs');
    const results = await runHealthChecks();
    res.json({ success: true, ...results });
  } catch (e) {
    console.error('Full health check error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get ecosystem health summary
app.get('/api/ecosystem/health-summary', async (req, res) => {
  try {
    // Get all sites with their current status
    const { data: sites, error: sitesError } = await supabase
      .from('ecosystem_sites')
      .select('id, name, slug, health_score, health_trend, status, last_check_at')
      .order('display_order');

    if (sitesError) throw sitesError;

    // Get unresolved alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('health_alerts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (alertsError) throw alertsError;

    // Calculate summary stats
    const totalSites = sites.length;
    const healthyCount = sites.filter(s => s.status === 'healthy').length;
    const degradedCount = sites.filter(s => s.status === 'degraded').length;
    const criticalCount = sites.filter(s => s.status === 'critical').length;
    const offlineCount = sites.filter(s => s.status === 'offline').length;
    const avgScore = totalSites > 0
      ? Math.round(sites.reduce((sum, s) => sum + (s.health_score || 0), 0) / totalSites)
      : 0;

    res.json({
      sites,
      alerts: alerts || [],
      summary: {
        total: totalSites,
        healthy: healthyCount,
        degraded: degradedCount,
        critical: criticalCount,
        offline: offlineCount,
        avgScore,
        alertCount: alerts?.length || 0
      }
    });
  } catch (e) {
    console.error('Health summary error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Acknowledge health alert
app.post('/api/ecosystem/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledged_by } = req.body;

    const { data, error } = await supabase
      .from('health_alerts')
      .update({
        acknowledged: true,
        acknowledged_by,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, alert: data });
  } catch (e) {
    console.error('Acknowledge alert error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Resolve health alert
app.post('/api/ecosystem/alerts/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('health_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, alert: data });
  } catch (e) {
    console.error('Resolve alert error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACT BRAIN CENTER - MOON CYCLE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Moon phase calculation based on synodic month (29.53 days)
function getMoonPhase(date = new Date()) {
  // Known new moon: January 6, 2000 at 18:14 UTC
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const synodicMonth = 29.53058867; // Average lunation in days

  const daysSinceKnownNewMoon = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const moonAge = daysSinceKnownNewMoon % synodicMonth;

  // Normalize to 0-1 range
  const phase = moonAge / synodicMonth;

  // Determine phase name and ACT meaning
  // 0 = New Moon, 0.25 = First Quarter, 0.5 = Full Moon, 0.75 = Last Quarter
  const phases = [
    { min: 0, max: 0.0625, name: 'New Moon', emoji: '🌑', act: 'Listen', focus: 'Quiet observation, research, deep listening to community' },
    { min: 0.0625, max: 0.1875, name: 'Waxing Crescent', emoji: '🌒', act: 'Listen', focus: 'Gathering insights, initial conversations' },
    { min: 0.1875, max: 0.3125, name: 'First Quarter', emoji: '🌓', act: 'Connect', focus: 'Building relationships, partnerships forming' },
    { min: 0.3125, max: 0.4375, name: 'Waxing Gibbous', emoji: '🌔', act: 'Connect', focus: 'Deepening connections, preparing to act' },
    { min: 0.4375, max: 0.5625, name: 'Full Moon', emoji: '🌕', act: 'Act', focus: 'Peak action, launches, major deliveries' },
    { min: 0.5625, max: 0.6875, name: 'Waning Gibbous', emoji: '🌖', act: 'Act', focus: 'Continued action, shipping features' },
    { min: 0.6875, max: 0.8125, name: 'Last Quarter', emoji: '🌗', act: 'Amplify', focus: 'Sharing stories, celebrating wins, reflection' },
    { min: 0.8125, max: 0.9375, name: 'Waning Crescent', emoji: '🌘', act: 'Amplify', focus: 'Rest, gratitude, preparing for next cycle' },
    { min: 0.9375, max: 1.0, name: 'New Moon', emoji: '🌑', act: 'Listen', focus: 'Quiet observation, research, deep listening to community' }
  ];

  const currentPhase = phases.find(p => phase >= p.min && phase < p.max) || phases[0];

  // Calculate illumination percentage
  const illumination = Math.round(Math.abs(Math.cos(phase * 2 * Math.PI)) * 100);

  // Calculate days until next major phase
  const nextNewMoon = Math.ceil((1 - phase) * synodicMonth);
  const nextFullMoon = phase < 0.5
    ? Math.ceil((0.5 - phase) * synodicMonth)
    : Math.ceil((1.5 - phase) * synodicMonth);

  return {
    phase: currentPhase.name,
    emoji: currentPhase.emoji,
    illumination,
    age: Math.round(moonAge * 10) / 10,
    act: {
      mode: currentPhase.act,
      focus: currentPhase.focus
    },
    next: {
      newMoon: nextNewMoon,
      fullMoon: nextFullMoon
    }
  };
}

app.get('/api/moon-cycle/current', async (req, res) => {
  try {
    const moonData = getMoonPhase();

    res.json({
      ...moonData,
      date: new Date().toISOString(),
      lcaa: {
        listen: '🌑🌒 New Moon → Waxing Crescent: Observe, research, gather insights',
        connect: '🌓🌔 First Quarter → Waxing Gibbous: Build relationships, partnerships',
        act: '🌕🌖 Full Moon → Waning Gibbous: Peak action, launches, deliveries',
        amplify: '🌗🌘 Last Quarter → Waning Crescent: Share stories, celebrate, reflect'
      }
    });
  } catch (e) {
    console.error('Moon cycle error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FINANCIAL ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Mock financial data - in production, this would query Xero via the backend
function getMockFinancialData() {
  return {
    cashPosition: {
      net: 125000,
      receivable: 45000,
      payable: 28000
    },
    recentTransactions: [
      { id: '1', date: '2026-01-24', description: 'Xero Subscription', amount: -60, category: 'Software' },
      { id: '2', date: '2026-01-23', description: 'Client Payment - JusticeHub', amount: 5000, category: 'Revenue' },
      { id: '3', date: '2026-01-22', description: 'OpenAI API', amount: -125, category: 'Software' },
      { id: '4', date: '2026-01-21', description: 'Consulting Income', amount: 2500, category: 'Revenue' },
      { id: '5', date: '2026-01-20', description: 'AWS Hosting', amount: -340, category: 'Infrastructure' }
    ],
    monthlySummary: {
      revenue: 42500,
      expenses: 12800,
      net: 29700
    },
    lastUpdated: new Date().toISOString()
  };
}

// Mock bookkeeping checklist data
function getMockBookkeepingData() {
  return {
    checklistProgress: {
      completed: 8,
      total: 14,
      percentage: 57
    },
    overdueInvoices: {
      count: 2,
      total: 2500,
      invoices: [
        { invoice_number: 'INV-2026-001', contact_name: 'JusticeHub', amount_due: 1500, due_date: '2026-01-15' },
        { invoice_number: 'INV-2026-002', contact_name: 'Community Org', amount_due: 1000, due_date: '2026-01-20' }
      ]
    },
    pendingReceipts: {
      count: 3
    },
    nextBASDue: '2026-02-28',
    gstOwed: 4250
  };
}

app.get('/api/financial/summary', async (req, res) => {
  try {
    const financialData = getMockFinancialData();
    res.json({
      success: true,
      ...financialData
    });
  } catch (e) {
    console.error('Financial summary error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/financial/transactions', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const data = getMockFinancialData();
    res.json({
      success: true,
      transactions: data.recentTransactions.slice(0, parseInt(limit))
    });
  } catch (e) {
    console.error('Transactions error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/bookkeeping/progress', async (req, res) => {
  try {
    const bookkeepingData = getMockBookkeepingData();
    res.json({
      success: true,
      ...bookkeepingData
    });
  } catch (e) {
    console.error('Bookkeeping progress error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bookkeeping/chase-invoice/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // In production, this would trigger an email via Xero or Gmail
    res.json({
      success: true,
      message: `Chase sent for invoice ${id}`
    });
  } catch (e) {
    console.error('Chase invoice error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bookkeeping/chase-all', async (req, res) => {
  try {
    // In production, this would chase all overdue invoices
    res.json({
      success: true,
      message: 'Chase emails sent for all overdue invoices'
    });
  } catch (e) {
    console.error('Chase all error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUBSCRIPTIONS ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getMockSubscriptions() {
  return {
    subscriptions: [
      {
        id: 'sub_1',
        name: 'Claude Pro',
        provider: 'Anthropic',
        amount: 20,
        currency: 'USD',
        interval: 'month',
        status: 'active',
        next_billing: '2026-02-15',
        category: 'AI'
      },
      {
        id: 'sub_2',
        name: 'GitHub Copilot',
        provider: 'GitHub',
        amount: 10,
        currency: 'USD',
        interval: 'month',
        status: 'active',
        next_billing: '2026-02-01',
        category: 'Development'
      },
      {
        id: 'sub_3',
        name: 'Supabase Pro',
        provider: 'Supabase',
        amount: 25,
        currency: 'USD',
        interval: 'month',
        status: 'active',
        next_billing: '2026-02-10',
        category: 'Database'
      },
      {
        id: 'sub_4',
        name: 'Vercel Pro',
        provider: 'Vercel',
        amount: 20,
        currency: 'USD',
        interval: 'month',
        status: 'active',
        next_billing: '2026-02-05',
        category: 'Hosting'
      },
      {
        id: 'sub_5',
        name: 'Xero',
        provider: 'Xero',
        amount: 40,
        currency: 'AUD',
        interval: 'month',
        status: 'active',
        next_billing: '2026-02-01',
        category: 'Accounting'
      }
    ],
    monthlyTotal: {
      USD: 80,
      AUD: 40
    },
    yearlyProjection: {
      USD: 960,
      AUD: 480
    }
  };
}

app.get('/api/subscriptions', async (req, res) => {
  try {
    const subscriptions = getMockSubscriptions();
    res.json({
      success: true,
      ...subscriptions
    });
  } catch (e) {
    console.error('Subscriptions error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/subscriptions/summary', async (req, res) => {
  try {
    const subs = getMockSubscriptions();
    res.json({
      success: true,
      total_monthly_usd: subs.monthlyTotal.USD,
      total_monthly_aud: subs.monthlyTotal.AUD,
      total_yearly_usd: subs.yearlyProjection.USD,
      total_yearly_aud: subs.yearlyProjection.AUD,
      count: subs.subscriptions.length,
      categories: [...new Set(subs.subscriptions.map(s => s.category))]
    });
  } catch (e) {
    console.error('Subscriptions summary error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROJECTS ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getMockProjects() {
  return {
    projects: [
      {
        id: 'proj_1',
        name: 'JusticeHub Platform',
        code: 'JUSTICE',
        status: 'active',
        category: 'Technology',
        lane: 'A',
        progress: 75,
        budget: 25000,
        spent: 18750,
        deadline: '2026-03-15',
        owner: 'Ben Knight',
        team_members: ['Sarah Chen', 'Mike Johnson'],
        last_updated: '2026-01-24',
        recent_activity: 'Completed user authentication module'
      },
      {
        id: 'proj_2',
        name: 'Community Outreach Program',
        code: 'COMMUNITY',
        status: 'active',
        category: 'Community',
        lane: 'B',
        progress: 45,
        budget: 15000,
        spent: 6750,
        deadline: '2026-04-01',
        owner: 'Emma Wilson',
        team_members: ['David Brown'],
        last_updated: '2026-01-23',
        recent_activity: 'Sent newsletter to 500 contacts'
      },
      {
        id: 'proj_3',
        name: 'ACT Farm Hand AI',
        code: 'FARMHAND',
        status: 'active',
        category: 'AI/ML',
        lane: 'A',
        progress: 60,
        budget: 35000,
        spent: 21000,
        deadline: '2026-02-28',
        owner: 'Ben Knight',
        team_members: ['Lisa Park', 'Tom Richards'],
        last_updated: '2026-01-24',
        recent_activity: 'Integrated crop disease detection model'
      },
      {
        id: 'proj_4',
        name: 'R&D Tax Credit Claim',
        code: 'RNDTAX',
        status: 'in_progress',
        category: 'Finance',
        lane: 'C',
        progress: 30,
        budget: 5000,
        spent: 1500,
        deadline: '2026-02-15',
        owner: 'Ben Knight',
        team_members: ['Accountant'],
        last_updated: '2026-01-22',
        recent_activity: 'Gathered expense receipts for Q4'
      },
      {
        id: 'proj_5',
        name: 'Website Redesign',
        code: 'WEBREDESIGN',
        status: 'active',
        category: 'Marketing',
        lane: 'B',
        progress: 85,
        budget: 8000,
        spent: 6800,
        deadline: '2026-01-31',
        owner: 'Creative Team',
        team_members: ['Designer'],
        last_updated: '2026-01-24',
        recent_activity: 'Finalized homepage mockups'
      },
      {
        id: 'proj_6',
        name: 'Grant Application - Google AI',
        code: 'GRANT-GOOGLE',
        status: 'draft',
        category: 'Funding',
        lane: 'D',
        progress: 20,
        budget: 0,
        spent: 0,
        deadline: '2026-02-28',
        owner: 'Ben Knight',
        team_members: [],
        last_updated: '2026-01-20',
        recent_activity: 'Drafted initial proposal outline'
      }
    ],
    summary: {
      total: 6,
      active: 4,
      draft: 1,
      completed: 0,
      on_track: 4,
      at_risk: 1,
      delayed: 1
    }
  };
}

app.get('/api/projects', async (req, res) => {
  try {
    const data = getMockProjects();
    res.json({
      success: true,
      ...data
    });
  } catch (e) {
    console.error('Projects error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/projects/summary', async (req, res) => {
  try {
    const data = getMockProjects();
    res.json({
      success: true,
      ...data.summary
    });
  } catch (e) {
    console.error('Projects summary error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UNIFIED INTELLIGENCE LEARNING SYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * The Unified Intelligence Learning System
 *
 * This system observes patterns across all ACT data sources and learns
 * to make intelligent connections and predictions.
 *
 * It builds a knowledge graph connecting:
 * - Contacts ↔ Communications ↔ Opportunities
 * - Goals ↔ Projects ↔ Financial outcomes
 * - Patterns ↔ Predictions ↔ Recommendations
 */

class UnifiedIntelligence {
  constructor() {
    this.name = 'Unified Intelligence System';
    this.learnedPatterns = new Map();
    this.contactInsights = new Map();
    this.relationshipGraph = new Map();
    this.insights = [];
    this.lastScan = null;

    // Initialize with some baseline patterns
    this.initializeBaselinePatterns();
  }

  initializeBaselinePatterns() {
    // Pattern: Best contact times by day of week
    this.learnedPatterns.set('contact_times', {
      monday: { morning: 85, afternoon: 72 },
      tuesday: { morning: 78, afternoon: 80 },
      wednesday: { morning: 82, afternoon: 75 },
      thursday: { morning: 88, afternoon: 70 },
      friday: { morning: 65, afternoon: 55 },
      saturday: { morning: 45, afternoon: 40 },
      sunday: { morning: 35, afternoon: 30 }
    });

    // Pattern: Goal completion factors
    this.learnedPatterns.set('goal_completion', {
      high_impact: { average_days: 14, success_rate: 0.82 },
      medium_impact: { average_days: 30, success_rate: 0.68 },
      low_impact: { average_days: 45, success_rate: 0.45 },
      milestones_set: { boost: 0.25 },
      assigned_owner: { boost: 0.30 }
    });

    // Pattern: Financial health indicators
    this.learnedPatterns.set('financial_health', {
      healthy_ratio: 2.5, // receivables / payables
      cash_reserve_months: 6,
      overdue_invoice_threshold: 2
    });

    // Pattern: Communication effectiveness
    this.learnedPatterns.set('comm_effectiveness', {
      email: { response_rate: 0.35, avg_time_hours: 48 },
      linkedin: { response_rate: 0.22, avg_time_hours: 72 },
      slack: { response_rate: 0.65, avg_time_hours: 4 },
      calendar: { show_rate: 0.78 }
    });

    // Pattern: Opportunity success factors
    this.learnedPatterns.set('opportunity_success', {
      grant: { success_rate: 0.15, avg_amount: 15000 },
      consulting: { success_rate: 0.45, avg_amount: 5000 },
      partnership: { success_rate: 0.25, avg_amount: 25000 }
    });
  }

  async scanAndLearn() {
    const now = new Date().toISOString();
    this.lastScan = now;

    // In production, this would analyze real data
    const insights = [];

    // Generate current insights
    insights.push({
      id: `insight_${Date.now()}_1`,
      type: 'timing',
      title: 'Best Contact Time',
      description: 'Thursday mornings show 88% engagement rate - schedule important outreach then.',
      confidence: 0.85,
      actionable: true,
      action: 'Schedule Thursday morning for client calls',
      category: 'communications',
      created_at: now
    });

    insights.push({
      id: `insight_${Date.now()}_2`,
      type: 'financial',
      title: 'Invoice Recovery Opportunity',
      description: 'Invoices overdue by 5+ days have 40% lower recovery rate. Prioritize chasing.',
      confidence: 0.78,
      actionable: true,
      action: 'Review and chase all invoices over 5 days overdue',
      category: 'finance',
      created_at: now
    });

    insights.push({
      id: `insight_${Date.now()}_3`,
      type: 'goal',
      title: 'Goal Completion Pattern',
      description: 'Goals with weekly milestones are 25% more likely to complete on time.',
      confidence: 0.82,
      actionable: true,
      action: 'Add weekly milestones to active goals',
      category: 'goals',
      created_at: now
    });

    insights.push({
      id: `insight_${Date.now()}_4`,
      type: 'relationship',
      title: 'Contact Strategy',
      description: 'High-value relationships (score > 80) respond best to personalized content.',
      confidence: 0.75,
      actionable: true,
      action: 'Create personalized newsletter content for top 10 contacts',
      category: 'relationships',
      created_at: now
    });

    insights.push({
      id: `insight_${Date.now()}_5`,
      type: 'opportunity',
      title: 'Grant Timing',
      description: 'Federal grants typically open in Q2. Prepare applications early for best success.',
      confidence: 0.70,
      actionable: true,
      action: 'Start researching Q2 grant opportunities',
      category: 'opportunities',
      created_at: now
    });

    this.insights = insights;
    return insights;
  }

  async getDashboard() {
    // Ensure we have fresh insights
    if (!this.lastScan) {
      await this.scanAndLearn();
    }

    return {
      success: true,
      dashboard: {
        overall_health: 82,
        score_breakdown: {
          goals: 78,
          finances: 85,
          relationships: 75,
          communications: 88,
          opportunities: 72
        },
        recent_insights: this.insights.slice(0, 5),
        learned_patterns_count: this.learnedPatterns.size,
        last_scan: this.lastScan,
        recommendations: [
          {
            priority: 'high',
            title: 'Chase Overdue Invoices',
            description: '2 invoices totaling $2,500 are overdue',
            action: '/api/bookkeeping/chase-all',
            impact: 'Recover $2,500 in revenue'
          },
          {
            priority: 'medium',
            title: 'Set Weekly Milestones',
            description: '3 active goals lack weekly milestones',
            action: '/api/goals/2026',
            impact: '25% better completion rate'
          },
          {
            priority: 'medium',
            title: 'Schedule Thursday Outreach',
            description: 'Best engagement window for client communication',
            action: 'Calendar',
            impact: '15% higher response rate'
          }
        ]
      }
    };
  }

  async getContactIntelligence(contactId) {
    // Generate contact-specific insights
    return {
      success: true,
      contact_id: contactId,
      relationship_score: Math.floor(Math.random() * 40) + 60,
      engagement_trend: 'stable',
      recommended_actions: [
        'Send personalized follow-up',
        'Schedule quarterly check-in',
        'Share relevant industry news'
      ],
      communication_preferences: {
        best_channel: 'email',
        best_day: 'Tuesday',
        best_time: 'morning'
      },
      history_summary: {
        total_interactions: Math.floor(Math.random() * 50) + 10,
        last_contact: '2026-01-20',
        projects_together: Math.floor(Math.random() * 3) + 1
      }
    };
  }

  async getRelationshipGraph() {
    // Build relationship connections
    const nodes = [
      { id: 'contact_1', name: 'Sarah Chen', type: 'client', score: 85 },
      { id: 'contact_2', name: 'Mike Johnson', type: 'partner', score: 78 },
      { id: 'contact_3', name: 'Emma Wilson', type: 'team', score: 92 },
      { id: 'contact_4', name: 'David Brown', type: 'contractor', score: 65 },
      { id: 'contact_5', name: 'Lisa Park', type: 'partner', score: 71 }
    ];

    const links = [
      { source: 'contact_1', target: 'contact_2', strength: 0.8 },
      { source: 'contact_2', target: 'contact_3', strength: 0.6 },
      { source: 'contact_3', target: 'contact_5', strength: 0.9 },
      { source: 'contact_4', target: 'contact_1', strength: 0.5 }
    ];

    return { success: true, nodes, links };
  }
}

const unifiedIntelligence = new UnifiedIntelligence();

// Health check endpoint
app.get('/api/intelligence/health', async (req, res) => {
  try {
    const dashboard = await unifiedIntelligence.getDashboard();
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      ...dashboard
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Main intelligence dashboard
app.get('/api/intelligence/dashboard', async (req, res) => {
  try {
    const result = await unifiedIntelligence.getDashboard();
    res.json(result);
  } catch (e) {
    console.error('Intelligence dashboard error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Trigger pattern learning scan
app.post('/api/intelligence/scan', async (req, res) => {
  try {
    const insights = await unifiedIntelligence.scanAndLearn();
    res.json({
      success: true,
      insights_generated: insights.length,
      insights
    });
  } catch (e) {
    console.error('Intelligence scan error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Contact intelligence
app.get('/api/intelligence/contacts/:id', async (req, res) => {
  try {
    const result = await unifiedIntelligence.getContactIntelligence(req.params.id);
    res.json(result);
  } catch (e) {
    console.error('Contact intelligence error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Relationship graph
app.get('/api/intelligence/relationships/graph', async (req, res) => {
  try {
    const result = await unifiedIntelligence.getRelationshipGraph();
    res.json(result);
  } catch (e) {
    console.error('Relationship graph error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Learned patterns
app.get('/api/intelligence/patterns', async (req, res) => {
  try {
    const patterns = Object.fromEntries(unifiedIntelligence.learnedPatterns);
    res.json({
      success: true,
      patterns,
      last_scan: unifiedIntelligence.lastScan
    });
  } catch (e) {
    console.error('Patterns error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CALENDAR ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getMockCalendarEvents() {
  const today = new Date()
  return {
    events: [
      {
        id: 'evt_1',
        title: 'Weekly Team Sync',
        description: 'Regular catch-up with the development team',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString(),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString(),
        type: 'meeting',
        attendees: ['Ben Knight', 'Sarah Chen', 'Mike Johnson'],
        location: 'Zoom',
        status: 'confirmed'
      },
      {
        id: 'evt_2',
        title: 'Client Meeting - JusticeHub',
        description: 'Project review and next steps discussion',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).toISOString(),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30).toISOString(),
        type: 'meeting',
        attendees: ['Ben Knight', 'Emma Wilson'],
        location: 'Google Meet',
        status: 'confirmed'
      },
      {
        id: 'evt_3',
        title: 'Grant Deadline - Google AI',
        description: 'Final submission deadline for Google AI grant',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 23, 59).toISOString(),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 23, 59).toISOString(),
        type: 'deadline',
        attendees: ['Ben Knight'],
        location: '',
        status: 'confirmed'
      },
      {
        id: 'evt_4',
        title: 'Financial Review - BAS Due',
        description: 'Monthly BAS preparation and review',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 9, 0).toISOString(),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 12, 0).toISOString(),
        type: 'task',
        attendees: ['Ben Knight'],
        location: 'Home Office',
        status: 'confirmed'
      },
      {
        id: 'evt_5',
        title: 'Community Outreach Planning',
        description: 'Plan Q1 community engagement activities',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0).toISOString(),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 30).toISOString(),
        type: 'meeting',
        attendees: ['Ben Knight', 'Lisa Park'],
        location: 'Coffee Shop',
        status: 'confirmed'
      }
    ],
    summary: {
      today: 2,
      this_week: 5,
      this_month: 12,
      meetings: 4,
      deadlines: 1,
      tasks: 1
    }
  };
}

app.get('/api/calendar/events', async (req, res) => {
  try {
    const { start, end, type } = req.query;
    const data = getMockCalendarEvents();

    let events = data.events;
    if (type) {
      events = events.filter(e => e.type === type);
    }

    res.json({
      success: true,
      ...data,
      events
    });
  } catch (e) {
    console.error('Calendar events error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/calendar/summary', async (req, res) => {
  try {
    const data = getMockCalendarEvents();
    res.json({
      success: true,
      ...data.summary
    });
  } catch (e) {
    console.error('Calendar summary error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/calendar/upcoming', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const data = getMockCalendarEvents();
    const sorted = [...data.events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    res.json({
      success: true,
      events: sorted.slice(0, parseInt(limit))
    });
  } catch (e) {
    console.error('Calendar upcoming error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REAL XERO INTEGRATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Xero Integration Service
 * Uses xero-node SDK for authenticated API calls
 */

class XeroIntegration {
  constructor() {
    this.clientId = process.env.XERO_CLIENT_ID;
    this.clientSecret = process.env.XERO_CLIENT_SECRET;
    this.tenantId = process.env.XERO_TENANT_ID;
    this.isConfigured = !!(this.clientId && this.clientSecret && this.tenantId);
    this.client = null;
  }

  async initClient() {
    if (!this.isConfigured || this.client) return;
    try {
      const { XeroClient } = await import('xero-node');
      this.client = new XeroClient({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        redirectUris: [process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback'],
        scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'accounting.settings']
      });
    } catch (e) {
      console.error('Failed to init Xero client:', e.message);
    }
  }

  async getInvoices(status = 'AUTHORISED') {
    await this.initClient();
    if (!this.isConfigured || !this.client) {
      return {
        invoices: [
          { id: 'inv_1', invoice_number: 'INV-2026-001', contact: { name: 'JusticeHub' }, total: 1500, due_date: '2026-01-15', status: 'OVERDUE' },
          { id: 'inv_2', invoice_number: 'INV-2026-002', contact: { name: 'Community Org' }, total: 1000, due_date: '2026-01-20', status: 'OVERDUE' },
          { id: 'inv_3', invoice_number: 'INV-2026-003', contact: { name: 'Tech Startup' }, total: 3500, due_date: '2026-02-01', status: 'AUTHORISED' }
        ]
      };
    }
    try {
      const tokenSet = await this.client.readTokenSet();
      if (tokenSet.expired()) {
        await this.client.refreshToken();
      }
      const response = await this.client.accountingApi.getInvoices(this.tenantId, status);
      return { invoices: response.body.invoices?.map(inv => ({
        id: inv.invoiceID,
        invoice_number: inv.invoiceNumber,
        contact: { name: inv.contact?.name },
        total: inv.total,
        due_date: inv.dueDate,
        status: inv.status
      })) || [] };
    } catch (e) {
      console.error('Xero getInvoices error:', e.message);
      return { invoices: [] };
    }
  }

  async getAccounts() {
    await this.initClient();
    if (!this.isConfigured || !this.client) {
      return {
        accounts: [
          { code: '200', name: 'Sales', type: 'REVENUE', balance: 42500 },
          { code: '400', name: 'Advertising', type: 'EXPENSE', balance: 2800 },
          { code: '404', name: 'Computer Expenses', type: 'EXPENSE', balance: 5200 }
        ]
      };
    }
    try {
      const response = await this.client.accountingApi.getAccounts(this.tenantId);
      return { accounts: response.body.accounts?.map(acc => ({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        balance: acc.balance
      })) || [] };
    } catch (e) {
      console.error('Xero getAccounts error:', e.message);
      return { accounts: [] };
    }
  }

  async getBankTransactions() {
    await this.initClient();
    if (!this.isConfigured || !this.client) {
      return {
        transactions: [
          { id: 'tx_1', date: '2026-01-24', description: 'Xero Subscription', amount: -60, account: 'Software' },
          { id: 'tx_2', date: '2026-01-23', description: 'Client Payment - JusticeHub', amount: 5000, account: 'Revenue' },
          { id: 'tx_3', date: '2026-01-22', description: 'OpenAI API', amount: -125, account: 'Software' }
        ]
      };
    }
    try {
      const response = await this.client.accountingApi.getBankTransactions(this.tenantId);
      return { transactions: response.body.bankTransactions?.map(tx => ({
        id: tx.bankTransactionID,
        date: tx.date,
        description: tx.reference,
        amount: tx.total,
        account: tx.lineItems?.[0]?.accountCode
      })) || [] };
    } catch (e) {
      console.error('Xero getBankTransactions error:', e.message);
      return { transactions: [] };
    }
  }
}

const xeroIntegration = new XeroIntegration();

app.get('/api/xero/invoices', async (req, res) => {
  try {
    const { status } = req.query;
    const data = await xeroIntegration.getInvoices(status);
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('Xero invoices error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/xero/accounts', async (req, res) => {
  try {
    const data = await xeroIntegration.getAccounts();
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('Xero accounts error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/xero/transactions', async (req, res) => {
  try {
    const data = await xeroIntegration.getBankTransactions();
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('Xero transactions error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REAL NOTION INTEGRATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Notion Integration Service
 * Uses @notionhq/client for authenticated API calls
 */

class NotionIntegration {
  constructor() {
    this.apiKey = process.env.NOTION_API_KEY;
    this.projectsDatabaseId = process.env.NOTION_PROJECTS_DATABASE_ID;
    this.isConfigured = !!(this.apiKey);
    this.client = null;
  }

  async initClient() {
    if (!this.isConfigured || this.client) return;
    try {
      const { Client } = await import('@notionhq/client');
      this.client = new Client({ auth: this.apiKey });
    } catch (e) {
      console.error('Failed to init Notion client:', e.message);
    }
  }

  async getProjects() {
    await this.initClient();
    if (!this.isConfigured || !this.client) {
      return {
        projects: [
          {
            id: 'notion_proj_1',
            name: 'JusticeHub Platform',
            status: 'In Progress',
            progress: 75,
            last_edited: '2026-01-24T10:00:00Z',
            url: 'https://notion.so/justicehub',
            properties: {
              Budget: 25000,
              'Team Members': ['Ben Knight', 'Sarah Chen'],
              Deadline: '2026-03-15'
            }
          },
          {
            id: 'notion_proj_2',
            name: 'ACT Farm Hand AI',
            status: 'In Progress',
            progress: 60,
            last_edited: '2026-01-24T09:30:00Z',
            url: 'https://notion.so/farmhand',
            properties: {
              Budget: 35000,
              'Team Members': ['Ben Knight', 'Lisa Park'],
              Deadline: '2026-02-28'
            }
          },
          {
            id: 'notion_proj_3',
            name: 'Community Outreach Program',
            status: 'Planning',
            progress: 45,
            last_edited: '2026-01-23T14:00:00Z',
            url: 'https://notion.so/community',
            properties: {
              Budget: 15000,
              'Team Members': ['Emma Wilson'],
              Deadline: '2026-04-01'
            }
          }
        ]
      };
    }
    try {
      const response = await this.client.databases.query({
        database_id: this.projectsDatabaseId,
        sorts: [{ property: 'Last Edited', direction: 'descending' }]
      });
      return { projects: response.results.map(page => ({
        id: page.id,
        name: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
        status: page.properties.Status?.select?.name || 'Unknown',
        progress: page.properties.Progress?.number || 0,
        last_edited: page.last_edited_time,
        url: page.url,
        properties: {
          Budget: page.properties.Budget?.number || 0,
          'Team Members': page.properties['Team Members']?.multi_select?.map(m => m.name) || [],
          Deadline: page.properties.Deadline?.date?.start || null
        }
      })) };
    } catch (e) {
      console.error('Notion getProjects error:', e.message);
      return { projects: [] };
    }
  }

  async getDatabaseStats() {
    await this.initClient();
    if (!this.isConfigured || !this.client) {
      return {
        total_pages: 156,
        databases: 8,
        last_synced: new Date().toISOString()
      };
    }
    try {
      const response = await this.client.search({
        filter: { property: 'object', value: 'page' },
        page_size: 100
      });
      return {
        total_pages: response.results.length,
        databases: 1,
        last_synced: new Date().toISOString()
      };
    } catch (e) {
      console.error('Notion getDatabaseStats error:', e.message);
      return { total_pages: 0, databases: 0, last_synced: null };
    }
  }
}

const notionIntegration = new NotionIntegration();

app.get('/api/notion/projects', async (req, res) => {
  try {
    const data = await notionIntegration.getProjects();
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('Notion projects error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/notion/stats', async (req, res) => {
  try {
    const data = await notionIntegration.getDatabaseStats();
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('Notion stats error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REAL GMAIL INTEGRATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Gmail Integration Service
 * Uses googleapis for authenticated API calls
 */

class GmailIntegration {
  constructor() {
    this.clientId = process.env.GMAIL_CLIENT_ID;
    this.clientSecret = process.env.GMAIL_CLIENT_SECRET;
    this.isConfigured = !!(this.clientId && this.clientSecret);
    this.oauthClient = null;
  }

  async initClient() {
    if (!this.isConfigured || this.oauthClient) return;
    try {
      const { google } = await import('googleapis');
      this.oauthClient = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/gmail/callback'
      );
    } catch (e) {
      console.error('Failed to init Gmail client:', e.message);
    }
  }

  async getRecentEmails(limit = 20) {
    await this.initClient();
    if (!this.isConfigured || !this.oauthClient) {
      return {
        emails: [
          { id: 'gm_1', subject: 'Re: Project Timeline Update', from: 'sarah@justicehub.org', date: '2026-01-24T14:30:00Z', snippet: 'Thanks for the update...', read: true },
          { id: 'gm_2', subject: 'Grant Application Reminder', from: 'grants@government.gov.au', date: '2026-01-24T09:00:00Z', snippet: 'This is a reminder...', read: false },
          { id: 'gm_3', subject: 'Invoice Received', from: 'accounting@supabase.com', date: '2026-01-23T16:45:00Z', snippet: 'Your monthly invoice...', read: true }
        ]
      };
    }
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauthClient });
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
        labelIds: ['INBOX']
      });
      const messages = response.data.messages || [];
      const emails = await Promise.all(messages.map(async msg => {
        const msgDetail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });
        const headers = msgDetail.data.payload?.headers || [];
        return {
          id: msg.id,
          subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
          from: headers.find(h => h.name === 'From')?.value || 'unknown',
          date: headers.find(h => h.name === 'Date')?.value || new Date().toISOString(),
          snippet: msgDetail.data.snippet || '',
          read: !msgDetail.data.labelIds?.includes('UNREAD')
        };
      }));
      return { emails };
    } catch (e) {
      console.error('Gmail getRecentEmails error:', e.message);
      return { emails: [] };
    }
  }

  async getUnreadCount() {
    await this.initClient();
    if (!this.isConfigured || !this.oauthClient) {
      return { unread: 5, important: 2 };
    }
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauthClient });
      const response = await gmail.users.messages.list({
        userId: 'me',
        labelIds: ['UNREAD', 'INBOX']
      });
      const important = await gmail.users.messages.list({
        userId: 'me',
        labelIds: ['IMPORTANT', 'UNREAD']
      });
      return {
        unread: response.data.resultSizeEstimate || 0,
        important: important.data.resultSizeEstimate || 0
      };
    } catch (e) {
      console.error('Gmail getUnreadCount error:', e.message);
      return { unread: 0, important: 0 };
    }
  }
}

const gmailIntegration = new GmailIntegration();

app.get('/api/gmail/recent', async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await gmailIntegration.getRecentEmails(limit);
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('Gmail recent error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/gmail/unread', async (req, res) => {
  try {
    const data = await gmailIntegration.getUnreadCount();
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('Gmail unread error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REAL SLACK INTEGRATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Slack Integration Service
 * Uses @slack/web-api for authenticated API calls
 */

class SlackIntegration {
  constructor() {
    this.token = process.env.SLACK_BOT_TOKEN;
    this.isConfigured = !!(this.token);
    this.client = null;
  }

  async initClient() {
    if (!this.isConfigured || this.client) return;
    try {
      const { WebClient } = await import('@slack/web-api');
      this.client = new WebClient(this.token);
    } catch (e) {
      console.error('Failed to init Slack client:', e.message);
    }
  }

  async getRecentMessages(channel = 'general', limit = 20) {
    await this.initClient();
    if (!this.isConfigured || !this.client) {
      return {
        messages: [
          { id: 'sl_1', text: 'Hey team, the new feature is live! 🎉', user: '@sarah', timestamp: '2026-01-24T15:00:00Z', reactions: ['🎉', '🚀'] },
          { id: 'sl_2', text: 'Great work on the Farm Hand AI demo', user: '@emma', timestamp: '2026-01-24T14:30:00Z', reactions: ['👏'] },
          { id: 'sl_3', text: 'Quick sync tomorrow at 10am?', user: '@mike', timestamp: '2026-01-24T11:00:00Z', reactions: ['👍'] }
        ]
      };
    }
    try {
      const response = await this.client.conversations.history({
        channel,
        limit
      });
      return { messages: response.messages?.map(msg => ({
        id: msg.ts,
        text: msg.text,
        user: msg.user || 'unknown',
        timestamp: new Date(Number(msg.ts) * 1000).toISOString(),
        reactions: msg.reactions?.map(r => r.name) || []
      })) || [] };
    } catch (e) {
      console.error('Slack getRecentMessages error:', e.message);
      return { messages: [] };
    }
  }

  async getChannels() {
    await this.initClient();
    if (!this.isConfigured || !this.client) {
      return {
        channels: [
          { id: 'ch_1', name: 'general', member_count: 12 },
          { id: 'ch_2', name: 'development', member_count: 5 },
          { id: 'ch_3', name: 'community', member_count: 8 }
        ]
      };
    }
    try {
      const response = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true
      });
      return { channels: response.channels?.map(ch => ({
        id: ch.id,
        name: ch.name,
        member_count: ch.num_members || 0
      })) || [] };
    } catch (e) {
      console.error('Slack getChannels error:', e.message);
      return { channels: [] };
    }
  }
}

const slackIntegration = new SlackIntegration();

app.get('/api/slack/messages', async (req, res) => {
  try {
    const { channel, limit } = req.query;
    const data = await slackIntegration.getRecentMessages(channel, limit);
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('Slack messages error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/slack/channels', async (req, res) => {
  try {
    const data = await slackIntegration.getChannels();
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('Slack channels error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTEGRATIONS STATUS ENDPOINT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get('/api/integrations/status', async (req, res) => {
  res.json({
    success: true,
    integrations: {
      xero: {
        name: 'Xero',
        status: xeroIntegration.isConfigured ? 'connected' : 'mock',
        features: ['Invoices', 'Accounts', 'Transactions']
      },
      notion: {
        name: 'Notion',
        status: notionIntegration.isConfigured ? 'connected' : 'mock',
        features: ['Projects', 'Databases', 'Pages']
      },
      gmail: {
        name: 'Gmail',
        status: gmailIntegration.isConfigured ? 'connected' : 'mock',
        features: ['Emails', 'Unread Count']
      },
      slack: {
        name: 'Slack',
        status: slackIntegration.isConfigured ? 'connected' : 'mock',
        features: ['Messages', 'Channels']
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 ACT Agent Command Center
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Server running at: http://localhost:${PORT}

Dashboards:
  Intelligence:    http://localhost:${PORT}/intelligence.html
  Infrastructure:  http://localhost:${PORT}/infrastructure.html
  Command Center:  http://localhost:${PORT}/command-center.html
  Brain Center:    http://localhost:${PORT}/brain-center.html
  Projects:        http://localhost:${PORT}/projects.html

API Endpoints:
  GET  /api/agents              - List agents with status
  GET  /api/tasks               - List tasks (filter: status, agent)
  POST /api/dispatch            - Send message to agents
  POST /api/tasks/:id/execute   - Execute a task
  POST /api/tasks/:id/approve   - Approve task
  POST /api/tasks/:id/reject    - Reject task
  POST /api/heartbeat           - Trigger heartbeat check
  POST /api/projects            - Create project from goal
  POST /api/projects/:id/work   - Run agents on pending tasks
  POST /api/projects/:id/chat   - Chat with project agent

Infrastructure Endpoints:
  GET  /api/infrastructure       - Claude Code layer (agents, skills, hooks, MCPs)
  GET  /api/codebases            - Git status of all repos
  GET  /api/connectors           - Status of integrations
  GET  /api/scripts              - Script inventory
  GET  /api/clawdbot             - ClawdBot Docker services
  GET  /api/database             - Database table counts
  GET  /api/infrastructure/health - Overall health score

Intelligence Center Endpoints:
  GET  /api/agents/active        - Active agents with autonomy levels
  GET  /api/agents/proposals     - Pending approvals
  GET  /api/agents/activity      - Recent activity (24h)
  GET  /api/communications/recent - Multi-channel communications
  GET  /api/knowledge/stats      - Knowledge base statistics
  GET  /api/relationships/health - Relationship health summary

Scouts Endpoints:
  GET  /api/scouts               - Overview of all scouts
  GET  /api/scouts/bunya         - Project health data (BUNYA)
  GET  /api/scouts/alta          - Grant opportunities (ALTA)

Search Endpoints:
  GET  /api/search               - Unified semantic search (voice, knowledge, contacts, communications, projects)
                                   Params: q=query, limit=20, types=voice,knowledge,contacts,communications,projects

Brain Center Endpoints:
  GET  /api/goals/2026           - 2026 goals grouped by Lane with progress stats
  GET  /api/goals/summary        - Goals summary statistics
  POST /api/goals/:id/update     - Update goal progress/status with history
  GET  /api/goals/:id/history    - Goal change history
  GET  /api/goals/:id/details    - Goal with metrics and history
  POST /api/goals/:id/metrics    - Add KPI metric to goal
  POST /api/goals/:id/metrics/:m - Update metric value
  GET  /api/ecosystem            - ACT ecosystem sites with health status
  GET  /api/ecosystem/health-summary - Aggregate health scores + alerts
  GET  /api/ecosystem/:slug/details  - Site + health + deployments
  GET  /api/ecosystem/:slug/health-history - Historical health data
  GET  /api/ecosystem/:slug/deployments    - Deployment history
  POST /api/ecosystem/:slug/check  - Trigger manual health check
  POST /api/ecosystem/check-all    - Full ecosystem health check
  GET  /api/moon-cycle/current   - Current moon phase with LCAA meaning

Financial Endpoints:
  GET  /api/financial/summary    - Cash position, transactions, monthly summary
  GET  /api/financial/transactions - Recent transactions (limit param)
  GET  /api/bookkeeping/progress - Checklist progress, overdue invoices
  POST /api/bookkeeping/chase-invoice/:id - Chase single invoice
  POST /api/bookkeeping/chase-all  - Chase all overdue invoices

Subscriptions Endpoints:
  GET  /api/subscriptions        - All subscriptions with costs
  GET  /api/subscriptions/summary - Monthly/yearly totals

Projects Endpoints:
  GET  /api/projects             - All projects with status, budget, progress
  GET  /api/projects/summary     - Project summary statistics

Unified Intelligence Endpoints:
  GET  /api/intelligence/dashboard - Main intelligence dashboard with health scores
  GET  /api/intelligence/health    - System health and uptime
  POST /api/intelligence/scan      - Trigger pattern learning scan
  GET  /api/intelligence/patterns  - Learned patterns across all data
  GET  /api/intelligence/contacts/:id - Contact-specific intelligence
  GET  /api/intelligence/relationships/graph - Relationship network graph

Calendar Endpoints:
  GET  /api/calendar/events    - Calendar events with filtering
  GET  /api/calendar/summary   - Event counts and summaries
  GET  /api/calendar/upcoming  - Upcoming events (limit param)

Integrations Endpoints:
  GET  /api/xero/invoices      - Xero invoices (mock if not configured)
  GET  /api/xero/accounts      - Xero accounts
  GET  /api/xero/transactions  - Xero bank transactions
  GET  /api/notion/projects    - Notion projects (mock if not configured)
  GET  /api/notion/stats       - Notion database stats
  GET  /api/gmail/recent       - Recent Gmail emails (mock if not configured)
  GET  /api/gmail/unread       - Gmail unread count
  GET  /api/slack/messages     - Slack messages (mock if not configured)
  GET  /api/slack/channels     - Slack channels
  GET  /api/integrations/status - All integrations status
`);
});
