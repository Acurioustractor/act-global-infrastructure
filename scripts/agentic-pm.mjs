#!/usr/bin/env node
/**
 * ACT Agentic Project Management
 *
 * TasklyAI-inspired system where AI agents actively work on projects:
 * - Goal decomposition: Give a goal, get actionable tasks
 * - Dual-assignee: Tasks assigned to human AND/OR agent
 * - Agent execution: Agents research, draft, calculate
 * - Chat interface: Direct agents with natural language
 *
 * Usage:
 *   node scripts/agentic-pm.mjs create "Build Phase 1 foundation for ACT Pty Ltd"
 *   node scripts/agentic-pm.mjs board <project-id>
 *   node scripts/agentic-pm.mjs work <project-id>    # Agents work pending tasks
 *   node scripts/agentic-pm.mjs chat <project-id> "Research AusIndustry changes"
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import '../lib/load-env.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI();
const MODEL = 'gpt-4o'; // Or 'gpt-4o-mini' for cost savings

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GOAL DECOMPOSITION AGENT
// Takes a high-level goal and breaks it into actionable tasks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function decomposeGoal(goal, context = {}) {
  console.log('\n🧠 Decomposing goal into tasks...\n');

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

  // Parse JSON from response
  let tasks;
  try {
    // Handle potential markdown code blocks
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    tasks = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (e) {
    console.error('Failed to parse tasks:', e.message);
    console.log('Raw response:', text);
    return [];
  }

  return tasks;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTION AGENTS
// Agents that actually DO work: research, draft, calculate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeTask(task, project) {
  const start = Date.now();

  console.log(`\n🤖 Agent working: ${task.title}`);
  console.log(`   Type: ${task.task_type} | Mode: ${task.assignment_mode}`);

  // Mark as agent_working
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

    // Determine next status based on assignment mode
    const nextStatus = task.assignment_mode === 'agent' ? 'completed' :
                       task.assignment_mode === 'dual' || task.assignment_mode === 'review' ? 'needs_review' :
                       'completed';

    // Update task with output
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

    // Log work
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

    console.log(`   ✅ Completed in ${Date.now() - start}ms (confidence: ${(confidence * 100).toFixed(0)}%)`);
    if (nextStatus === 'needs_review') {
      console.log(`   👁️  Needs human review`);
    }

    return { success: true, output, reasoning, confidence };

  } catch (error) {
    await supabase
      .from('agentic_tasks')
      .update({
        status: 'blocked',
        agent_reasoning: `Error: ${error.message}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id);

    console.log(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Research agent - finds information
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

  const text = response.choices[0].message.content;

  return {
    output: {
      type: 'research',
      summary: text,
      key_points: extractKeyPoints(text)
    },
    reasoning: 'Researched using available knowledge, focused on Australian regulatory context.',
    confidence: 0.8
  };
}

// Draft agent - creates documents, templates, content
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

  const text = response.choices[0].message.content;

  return {
    output: {
      type: 'draft',
      content: text,
      needs_review: true,
      placeholders: extractPlaceholders(text)
    },
    reasoning: 'Created draft based on task requirements and ACT context.',
    confidence: 0.75 // Drafts always need human review
  };
}

// Calculate agent - does math, estimates, projections
async function calculateAgent(task, project) {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: `You are a calculation agent for ACT, an Australian social enterprise.
Your job is to perform calculations, estimates, and financial projections.
Be precise with numbers. Show your working. Use Australian tax rates and regulations.
Key references: R&DTI offset is 43.5% for <$20M turnover, company tax is 25%.` },
      { role: 'user', content: `Project: ${project.name}
Goal: ${project.goal}

Calculation Task: ${task.title}
${task.description ? `Details: ${task.description}` : ''}

Provide calculations with clear workings and assumptions.` }
    ]
  });

  const text = response.choices[0].message.content;

  // Try to extract numbers
  const numbers = text.match(/\$[\d,]+(?:\.\d{2})?/g) || [];

  return {
    output: {
      type: 'calculation',
      analysis: text,
      key_figures: numbers,
      assumptions: extractAssumptions(text)
    },
    reasoning: 'Calculated based on Australian tax rates and provided context.',
    confidence: 0.85
  };
}

// General agent - handles miscellaneous tasks
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
// Natural language interface for directing agents
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function chatWithProject(projectId, message) {
  // Get project and tasks
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

  // Get recent chat history
  const { data: history } = await supabase
    .from('agentic_chat')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Log user message
  await supabase.from('agentic_chat').insert({
    project_id: projectId,
    role: 'user',
    content: message
  });

  // Build context
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

  // Check for actions in response
  let action = null;
  try {
    const actionMatch = reply.match(/\{[\s\S]*"action"[\s\S]*\}/);
    if (actionMatch) {
      action = JSON.parse(actionMatch[0]);
    }
  } catch (e) {
    // No action, just a response
  }

  // Handle actions
  if (action?.action === 'create_task' && action.task) {
    const { data: newTask } = await supabase
      .from('agentic_tasks')
      .insert({
        project_id: projectId,
        title: action.task.title,
        description: action.task.description,
        task_type: action.task.type || 'action',
        assignment_mode: action.task.assignment_mode || 'agent',
        priority: action.task.priority || 2
      })
      .select()
      .single();

    console.log(`   📋 Created task: ${newTask.title}`);
  }

  if (action?.action === 'execute_task' && action.task_id) {
    const task = tasks?.find(t => t.id === action.task_id);
    if (task) {
      await executeTask(task, project);
    }
  }

  // Log agent response
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
// UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractKeyPoints(text) {
  const lines = text.split('\n');
  return lines
    .filter(l => l.match(/^[-•*]\s|^\d+\./))
    .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
    .slice(0, 5);
}

function extractPlaceholders(text) {
  const matches = text.match(/\[([A-Z_\s]+)\]/g) || [];
  return [...new Set(matches)];
}

function extractAssumptions(text) {
  const lines = text.split('\n');
  return lines
    .filter(l => l.toLowerCase().includes('assum'))
    .slice(0, 3);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv.slice(4).join(' ');

console.log('🚀 ACT Agentic Project Management');
console.log('━'.repeat(50));

switch (command) {
  case 'create': {
    if (!arg1) {
      console.log('Usage: node agentic-pm.mjs create "Your project goal"');
      process.exit(1);
    }

    const goal = arg1;
    console.log(`\n📋 Creating project: "${goal}"`);

    // Decompose goal into tasks
    const tasks = await decomposeGoal(goal);
    console.log(`\n✅ Decomposed into ${tasks.length} tasks:`);

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
      console.error('Failed to create project:', projectError);
      process.exit(1);
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

      const icon = t.assignment_mode === 'human' ? '👤' :
                   t.assignment_mode === 'agent' ? '🤖' :
                   t.assignment_mode === 'dual' ? '🤝' : '👁️';
      console.log(`   ${i + 1}. ${icon} ${t.title} [${t.type}]`);
    }

    console.log(`\n✅ Project created: ${project.id}`);
    console.log(`\nNext steps:`);
    console.log(`   node scripts/agentic-pm.mjs board ${project.id}   # View task board`);
    console.log(`   node scripts/agentic-pm.mjs work ${project.id}    # Agents start working`);
    console.log(`   node scripts/agentic-pm.mjs chat ${project.id} "message"  # Chat with agents`);
    break;
  }

  case 'board': {
    if (!arg1) {
      // List all projects
      const { data: projects } = await supabase
        .from('agentic_project_dashboard')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('\n📊 All Projects:\n');
      if (!projects?.length) {
        console.log('No projects yet. Create one with:');
        console.log('   node scripts/agentic-pm.mjs create "Your goal"');
      } else {
        projects.forEach(p => {
          const progress = p.total_tasks > 0 ?
            Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
          console.log(`${p.name}`);
          console.log(`   ID: ${p.id}`);
          console.log(`   Progress: ${progress}% (${p.completed_tasks}/${p.total_tasks})`);
          console.log(`   Agent working: ${p.agent_working} | Needs review: ${p.needs_review}`);
          console.log('');
        });
      }
    } else {
      // Show specific project board
      const { data: project } = await supabase
        .from('agentic_projects')
        .select('*')
        .eq('id', arg1)
        .single();

      const { data: tasks } = await supabase
        .from('agentic_tasks')
        .select('*')
        .eq('project_id', arg1)
        .order('position');

      console.log(`\n📋 ${project.name}\n`);
      console.log(`Goal: ${project.goal}\n`);
      console.log('─'.repeat(60));

      const columns = {
        pending: [],
        agent_working: [],
        needs_review: [],
        completed: []
      };

      tasks?.forEach(t => {
        const col = columns[t.status] || columns.pending;
        col.push(t);
      });

      console.log('\n📥 PENDING          🤖 AGENT WORKING    👁️ NEEDS REVIEW     ✅ COMPLETED');
      console.log('─'.repeat(60));

      const maxRows = Math.max(
        columns.pending.length,
        columns.agent_working.length,
        columns.needs_review.length,
        columns.completed.length
      );

      for (let i = 0; i < maxRows; i++) {
        const p = columns.pending[i];
        const a = columns.agent_working[i];
        const r = columns.needs_review[i];
        const c = columns.completed[i];

        const pStr = p ? p.title.substring(0, 15).padEnd(15) : ''.padEnd(15);
        const aStr = a ? a.title.substring(0, 15).padEnd(15) : ''.padEnd(15);
        const rStr = r ? r.title.substring(0, 15).padEnd(15) : ''.padEnd(15);
        const cStr = c ? c.title.substring(0, 15).padEnd(15) : ''.padEnd(15);

        console.log(`${pStr}    ${aStr}    ${rStr}    ${cStr}`);
      }

      console.log('\n─'.repeat(60));
      console.log(`Total: ${tasks?.length || 0} tasks`);
    }
    break;
  }

  case 'work': {
    if (!arg1) {
      console.log('Usage: node agentic-pm.mjs work <project-id>');
      process.exit(1);
    }

    const { data: project } = await supabase
      .from('agentic_projects')
      .select('*')
      .eq('id', arg1)
      .single();

    // Get pending tasks that agents can work on
    const { data: tasks } = await supabase
      .from('agentic_tasks')
      .select('*')
      .eq('project_id', arg1)
      .eq('status', 'pending')
      .in('assignment_mode', ['agent', 'dual', 'review'])
      .order('priority')
      .order('position');

    if (!tasks?.length) {
      console.log('\n✅ No pending tasks for agents to work on.');
      console.log('Check the board: node scripts/agentic-pm.mjs board ' + arg1);
      process.exit(0);
    }

    console.log(`\n🤖 ${tasks.length} tasks for agents to work on:\n`);

    for (const task of tasks) {
      await executeTask(task, project);
    }

    console.log('\n✅ Agent work complete!');
    console.log(`Check results: node scripts/agentic-pm.mjs board ${arg1}`);
    break;
  }

  case 'chat': {
    if (!arg1 || !arg2) {
      console.log('Usage: node agentic-pm.mjs chat <project-id> "Your message"');
      process.exit(1);
    }

    console.log(`\n💬 You: ${arg2}\n`);

    const { reply, action } = await chatWithProject(arg1, arg2);

    console.log(`🤖 Agent: ${reply}\n`);

    if (action) {
      console.log(`   [Action taken: ${action.action}]`);
    }
    break;
  }

  case 'review': {
    if (!arg1) {
      console.log('Usage: node agentic-pm.mjs review <task-id> [approve|reject]');
      process.exit(1);
    }

    const { data: task } = await supabase
      .from('agentic_tasks')
      .select('*, agentic_projects(*)')
      .eq('id', arg1)
      .single();

    if (!task) {
      console.log('Task not found');
      process.exit(1);
    }

    console.log(`\n📋 Task: ${task.title}`);
    console.log(`Status: ${task.status}`);
    console.log(`\n--- Agent Output ---`);
    console.log(JSON.stringify(task.agent_output, null, 2));
    console.log(`\n--- Reasoning ---`);
    console.log(task.agent_reasoning);
    console.log(`Confidence: ${(task.agent_confidence * 100).toFixed(0)}%`);

    if (arg2 === 'approve') {
      await supabase
        .from('agentic_tasks')
        .update({ status: 'completed', human_approved: true, updated_at: new Date().toISOString() })
        .eq('id', arg1);
      console.log('\n✅ Approved!');
    } else if (arg2 === 'reject') {
      await supabase
        .from('agentic_tasks')
        .update({ status: 'pending', human_approved: false, updated_at: new Date().toISOString() })
        .eq('id', arg1);
      console.log('\n❌ Rejected - sent back to pending');
    }
    break;
  }

  default:
    console.log(`
Usage:
  node agentic-pm.mjs create "Your project goal"     - Create project from goal
  node agentic-pm.mjs board [project-id]             - View task board
  node agentic-pm.mjs work <project-id>              - Agents work pending tasks
  node agentic-pm.mjs chat <project-id> "message"    - Chat with agents
  node agentic-pm.mjs review <task-id> [approve|reject] - Review agent output

Examples:
  node agentic-pm.mjs create "Set up Phase 1 foundation for ACT Pty Ltd"
  node agentic-pm.mjs create "Research R&DTI eligibility for our AI projects"
  node agentic-pm.mjs create "Draft grant application for CRC-P funding"
    `);
}
