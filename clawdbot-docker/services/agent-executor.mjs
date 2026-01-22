#!/usr/bin/env node
/**
 * Agent Executor
 *
 * Executes tasks assigned to agents. Each agent has specialized capabilities.
 * Handles the actual work and updates task status.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI();
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRAND VOICE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Load brand voice from config file
 */
function loadBrandVoice() {
  const paths = [
    join(__dirname, '../config/brand.md'),
    '/root/.clawdbot/brand.md',
    join(__dirname, '../../config/brand.md')
  ];

  for (const brandPath of paths) {
    if (existsSync(brandPath)) {
      console.log(`📝 Loaded brand voice from ${brandPath}`);
      return readFileSync(brandPath, 'utf8');
    }
  }

  console.log('⚠️ Brand voice file not found, using defaults');
  return null;
}

const BRAND_VOICE = loadBrandVoice();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT IMPLEMENTATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const agents = {
  /**
   * Scout - Research Agent
   */
  scout: async (task) => {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: `You are Scout, a research agent for ACT (Art Craft Technology), an Australian social enterprise.

Your job is to research and compile information thoroughly.
- Focus on Australian context (ATO, ASIC, AusIndustry, state grants)
- Cite sources where possible
- Be concise but comprehensive
- Provide actionable insights

Output format:
## Key Findings
- Point 1
- Point 2

## Details
[Expanded information]

## Recommendations
[What to do next]`
        },
        { role: 'user', content: `Research: ${task.title}\n\n${task.description}` }
      ]
    });

    return {
      output: { type: 'research', content: response.choices[0].message.content },
      reasoning: 'Researched using available knowledge and Australian regulatory context.',
      confidence: 0.85,
      needsReview: false
    };
  },

  /**
   * Scribe - Content Agent
   */
  scribe: async (task) => {
    const brandSection = BRAND_VOICE
      ? `\n\n## ACT Brand Voice Guidelines\n${BRAND_VOICE}`
      : '';

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: `You are Scribe, a content creation agent for ACT.

Your job is to draft documents, emails, blog posts, and content.
- Follow ACT's brand voice guidelines strictly
- Use farm metaphors where natural (seeds, soil, harvest)
- Avoid deficit framing ("vulnerable populations", "giving back")
- Use "we" not "I" when speaking for ACT
- Include [PLACEHOLDER] for items needing customization
- Note when professional review is needed (legal, financial)

Output the full draft ready for review.${brandSection}`
        },
        { role: 'user', content: `Create: ${task.title}\n\n${task.description}` }
      ]
    });

    return {
      output: { type: 'draft', content: response.choices[0].message.content },
      reasoning: 'Created draft aligned with ACT brand voice guidelines.',
      confidence: 0.75,
      needsReview: true  // Drafts always need review
    };
  },

  /**
   * Ledger - Finance Agent
   */
  ledger: async (task) => {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: `You are Ledger, a finance agent for ACT.

Your job is to help with financial calculations, analysis, and recommendations.
- Use Australian tax rates (company tax 25%, R&DTI 43.5% for <$20M)
- Show your working clearly
- Note assumptions
- Flag items needing accountant review

IMPORTANT: You suggest and calculate, but do NOT execute financial transactions.`
        },
        { role: 'user', content: `Financial task: ${task.title}\n\n${task.description}` }
      ]
    });

    return {
      output: { type: 'financial', content: response.choices[0].message.content },
      reasoning: 'Calculated using Australian tax rates. Recommend professional review.',
      confidence: 0.7,
      needsReview: true  // Financial always needs review
    };
  },

  /**
   * Cultivator - Relationship Agent
   */
  cultivator: async (task) => {
    // Get relevant contact info if available
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .textSearch('name', task.description.split(' ').slice(0, 3).join(' & '))
      .limit(3);

    const contactContext = contacts?.length
      ? `\nRelevant contacts:\n${contacts.map(c => `- ${c.name} (${c.email})`).join('\n')}`
      : '';

    const brandSection = BRAND_VOICE
      ? `\n\n## ACT Brand Voice Guidelines\n${BRAND_VOICE}`
      : '';

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: `You are Cultivator, a relationship management agent for ACT.

Your job is to help maintain and grow relationships with partners, collaborators, and community.
- Follow ACT's brand voice for all outreach
- Use warm, relationship-first language
- For warm contacts: reference shared history, be personal
- For cold contacts: be curious and value-forward
- Avoid charity framing ("giving back", "beneficiaries")
- Respect cultural protocols, especially with First Nations partners
- Suggest appropriate follow-up timing${contactContext}${brandSection}`
        },
        { role: 'user', content: `Relationship task: ${task.title}\n\n${task.description}` }
      ]
    });

    return {
      output: { type: 'relationship', content: response.choices[0].message.content },
      reasoning: 'Drafted relationship action with ACT brand voice and cultural sensitivity.',
      confidence: 0.8,
      needsReview: true  // Outreach needs human review
    };
  },

  /**
   * Shepherd - Project Agent
   */
  shepherd: async (task) => {
    // Get project status if we can identify the project
    const { data: projects } = await supabase
      .from('agentic_projects')
      .select('*, agentic_tasks(*)')
      .limit(5);

    const projectContext = projects?.length
      ? `\nCurrent projects:\n${projects.map(p => `- ${p.name}: ${p.goal?.substring(0, 50)}...`).join('\n')}`
      : '';

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: `You are Shepherd, a project management agent for ACT.

Your job is to track project status, identify blockers, and keep things moving.
- Provide clear status updates
- Identify risks and blockers
- Suggest next actions
- Keep stakeholders informed${projectContext}`
        },
        { role: 'user', content: `Project task: ${task.title}\n\n${task.description}` }
      ]
    });

    return {
      output: { type: 'project', content: response.choices[0].message.content },
      reasoning: 'Analyzed project status and recommended actions.',
      confidence: 0.85,
      needsReview: false
    };
  },

  /**
   * Oracle - Knowledge Agent
   */
  oracle: async (task) => {
    // Search for relevant knowledge
    const { data: knowledge } = await supabase
      .from('knowledge_chunks')
      .select('content, source')
      .textSearch('content', task.description.split(' ').slice(0, 5).join(' & '))
      .limit(5);

    const knowledgeContext = knowledge?.length
      ? `\nRelevant knowledge:\n${knowledge.map(k => k.content.substring(0, 200)).join('\n---\n')}`
      : '';

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: `You are Oracle, a knowledge agent for ACT.

Your job is to answer questions and share knowledge about ACT, its projects, and operations.
- Draw on ACT's knowledge base
- Be helpful and informative
- Admit when you don't know something
- Suggest where to find more information${knowledgeContext}`
        },
        { role: 'user', content: `Question: ${task.title}\n\n${task.description}` }
      ]
    });

    return {
      output: { type: 'knowledge', content: response.choices[0].message.content },
      reasoning: 'Answered based on available knowledge.',
      confidence: 0.9,
      needsReview: false
    };
  },

  /**
   * Herald - Communications Agent
   */
  herald: async (task) => {
    const brandSection = BRAND_VOICE
      ? `\n\n## ACT Brand Voice Guidelines\n${BRAND_VOICE}`
      : '';

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: `You are Herald, a communications agent for ACT.

Your job is to craft announcements, digests, and broadcast messages.
- Follow ACT's brand voice guidelines strictly
- Match the channel tone:
  - LinkedIn: visionary + grounded
  - X/Twitter: provocative + brief (under 280 chars)
  - Email: warm + relationship-first
  - Internal: direct + supportive
- Use farm metaphors where natural
- Avoid cliches ("changing lives", "making a difference")
- Be specific about outcomes, not vague claims
- Suggest appropriate channels for distribution${brandSection}`
        },
        { role: 'user', content: `Communication: ${task.title}\n\n${task.description}` }
      ]
    });

    return {
      output: { type: 'communication', content: response.choices[0].message.content },
      reasoning: 'Crafted communication aligned with ACT brand voice.',
      confidence: 0.8,
      needsReview: true  // Broadcasts need review
    };
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Execute a task
 */
export async function executeTask(taskId) {
  // Get task
  const { data: task, error } = await supabase
    .from('agent_task_queue')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error || !task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const agentId = task.assigned_agent;
  const agentFn = agents[agentId];

  if (!agentFn) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  console.log(`🤖 ${agentId} executing: ${task.title}`);

  // Update status to working
  await supabase
    .from('agent_task_queue')
    .update({ status: 'working', started_at: new Date().toISOString() })
    .eq('id', taskId);

  // Update agent's current task
  await supabase
    .from('agents')
    .update({ current_task_id: taskId, last_heartbeat: new Date().toISOString() })
    .eq('id', agentId);

  const startTime = Date.now();

  try {
    // Execute agent
    const result = await agentFn(task);

    // Get agent's autonomy level
    const { data: agent } = await supabase
      .from('agents')
      .select('autonomy_level')
      .eq('id', agentId)
      .single();

    const needsReview = result.needsReview || (agent?.autonomy_level || 2) < 3;

    // Update task with result
    await supabase
      .from('agent_task_queue')
      .update({
        status: needsReview ? 'review' : 'done',
        needs_review: needsReview,
        output: result.output,
        reasoning: result.reasoning,
        confidence: result.confidence,
        completed_at: needsReview ? null : new Date().toISOString(),
        duration_ms: Date.now() - startTime
      })
      .eq('id', taskId);

    // Clear agent's current task
    await supabase
      .from('agents')
      .update({ current_task_id: null, last_heartbeat: new Date().toISOString() })
      .eq('id', agentId);

    console.log(`   ✅ ${needsReview ? 'Needs review' : 'Done'} (${Date.now() - startTime}ms)`);

    return {
      success: true,
      needsReview,
      output: result.output,
      duration: Date.now() - startTime
    };

  } catch (err) {
    console.error(`   ❌ Failed:`, err.message);

    // Update task as failed
    await supabase
      .from('agent_task_queue')
      .update({
        status: 'failed',
        error: err.message,
        duration_ms: Date.now() - startTime
      })
      .eq('id', taskId);

    // Clear agent's current task
    await supabase
      .from('agents')
      .update({ current_task_id: null })
      .eq('id', agentId);

    return { success: false, error: err.message };
  }
}

/**
 * Execute all pending tasks for an agent
 */
export async function executePendingTasks(agentId = null) {
  const query = supabase
    .from('agent_task_queue')
    .select('*')
    .in('status', ['queued', 'assigned'])
    .order('priority')
    .order('created_at');

  if (agentId) {
    query.eq('assigned_agent', agentId);
  }

  const { data: tasks } = await query.limit(10);

  if (!tasks?.length) {
    console.log('No pending tasks');
    return [];
  }

  const results = [];
  for (const task of tasks) {
    const result = await executeTask(task.id);
    results.push({ taskId: task.id, ...result });
  }

  return results;
}

// CLI interface
if (process.argv[1]?.endsWith('agent-executor.mjs')) {
  const command = process.argv[2];
  const arg = process.argv[3];

  if (command === 'task' && arg) {
    executeTask(arg).then(console.log).catch(console.error);
  } else if (command === 'pending') {
    executePendingTasks(arg).then(console.log).catch(console.error);
  } else {
    console.log(`
Usage:
  node agent-executor.mjs task <task-id>    Execute specific task
  node agent-executor.mjs pending [agent]   Execute all pending tasks
`);
  }
}

export default { executeTask, executePendingTasks, agents };
