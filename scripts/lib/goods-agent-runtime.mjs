#!/usr/bin/env node
/**
 * Goods Agent Runtime
 *
 * Thin wrapper over existing ACT agentic infrastructure (llm-client,
 * agentic-workflow, action-executor, memory-lifecycle) for Goods-specific
 * scheduled agents.
 *
 * What this provides:
 *   - Opus 4.7 four-part contract enforcement (task budget / stop / fallback / scoped files)
 *   - Cost-tier discipline via selectModel()
 *   - File-based handoff conventions (cockpit / drafts / Notion staging)
 *   - project_knowledge append on every run
 *   - Telegram summary on completion
 *
 * Do NOT add: new LLM clients, new cost logs, new memory systems. Use lib/*.
 *
 * Usage:
 *   import { runAgent } from './lib/goods-agent-runtime.mjs';
 *
 *   const result = await runAgent({
 *     name: 'procurement-analyst',
 *     task: 'generate',                      // → Sonnet
 *     budget: { maxTokens: 4000, maxToolCalls: 5 },
 *     stopCriteria: 'stop when 3 ranked buyer rows written',
 *     fallback: 'if no new contracts this week, return "no movement" in prose',
 *     scopedFiles: [
 *       'wiki/projects/goods.md',
 *       'thoughts/shared/cockpit/procurement-sweep-latest.json',
 *     ],
 *     systemPrompt: `You are the Procurement Analyst agent for Goods on Country...`,
 *     userPrompt: `Context: ${buyerSweepData}\n\nTask: rank this week's top 3 buyer touches.`,
 *     outputPath: `thoughts/shared/cockpit/procurement-${todayISO()}.md`,
 *     autonomyLevel: 2,                      // L1/L2/L3, default L2
 *     knowledgeType: 'action_item',          // 'pattern' | 'action_item' | 'decision'
 *     telegramSummary: true,
 *   });
 *
 * The caller is responsible for composing its own userPrompt from data;
 * runtime only enforces the contract + wiring.
 */

import '../../lib/load-env.mjs';
import { trackedAgentCompletion, resolveAgentProvider, selectModel } from './llm-client.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

/**
 * Run a Goods agent with Opus 4.7 contract enforcement, cost tracking,
 * output persistence, and knowledge append.
 *
 * @param {object} config
 * @param {string} config.name - kebab-case agent name (e.g., 'procurement-analyst')
 * @param {string} config.task - task type for selectModel() — one of:
 *   classify, extract, tag, score, validate, generate, draft, analyze, architect, plan
 * @param {object} config.budget - { maxTokens, maxToolCalls }
 * @param {string} config.stopCriteria - concrete predicate for loop termination
 * @param {string} config.fallback - what to return if blocked
 * @param {string[]} config.scopedFiles - explicit list of files the agent may reference
 * @param {string} config.systemPrompt - base system prompt (contract added automatically)
 * @param {string} config.userPrompt - the actual task input
 * @param {string} config.outputPath - where to write the draft/cockpit output
 * @param {1|2|3} [config.autonomyLevel=2] - bounded autonomy level
 * @param {'pattern'|'action_item'|'decision'} [config.knowledgeType='action_item']
 * @param {boolean} [config.telegramSummary=false]
 * @param {boolean} [config.dryRun=false]
 * @returns {Promise<{output: string, model: string, cost: number, outputPath: string}>}
 */
export async function runAgent(config) {
  const {
    name,
    task,
    budget,
    stopCriteria,
    fallback,
    scopedFiles,
    systemPrompt,
    userPrompt,
    outputPath,
    autonomyLevel = 2,
    knowledgeType = 'action_item',
    telegramSummary = false,
    dryRun = false,
  } = config;

  // ━━━ Contract validation — fail fast on fuzzy prompts
  validateContract({ name, task, budget, stopCriteria, fallback, scopedFiles });

  // ━━━ Compose contract-enforced system prompt
  const contractPrompt = `
TASK BUDGET: ${budget.maxTokens} tokens / ${budget.maxToolCalls ?? 'N/A'} tool calls
STOP CRITERIA: ${stopCriteria}
FALLBACK: ${fallback}
SCOPED FILES (reference only):
${scopedFiles.map(f => `  - ${f}`).join('\n')}

${systemPrompt}
`.trim();

  // ━━━ Resolve provider (env-driven: MINIMAX > ANTHROPIC > GEMINI > OPENAI) + model by task tier
  const provider = resolveAgentProvider();
  const model = selectModel(task, provider);

  if (dryRun) {
    console.log(`[dry-run] agent=${name} provider=${provider} model=${model} would write to ${outputPath}`);
    console.log(`[dry-run] system prompt length: ${contractPrompt.length} chars`);
    console.log(`[dry-run] user prompt length: ${userPrompt.length} chars`);
    return { output: '[dry-run]', provider, model, outputPath };
  }

  // ━━━ LLM call via trackedAgentCompletion (logs to api_usage table; routes by provider)
  const output = await trackedAgentCompletion(
    userPrompt,
    `agents/${name}`,
    {
      model,
      task,
      maxTokens: budget.maxTokens,
      system: contractPrompt,
      agentId: name,
      operation: task,
    }
  );

  // ━━━ Write output to stable path
  await ensureDir(path.dirname(path.resolve(REPO_ROOT, outputPath)));
  await fs.writeFile(
    path.resolve(REPO_ROOT, outputPath),
    output,
    'utf8'
  );

  // ━━━ Append project_knowledge row for session inheritance
  if (supabase && knowledgeType) {
    await supabase.from('project_knowledge').insert({
      title: `[agent:${name}] ${truncate(output, 120)}`,
      content: output.slice(0, 8000),
      project_code: 'ACT-GD',
      knowledge_type: knowledgeType,
      metadata: {
        agent: name,
        model,
        autonomy_level: autonomyLevel,
        output_path: outputPath,
      },
    }).then(() => {}).catch(err => {
      console.warn(`[${name}] project_knowledge insert failed: ${err.message}`);
    });
  }

  // ━━━ Register read-rate tracking row
  if (supabase) {
    await supabase.from('agent_read_events').insert({
      agent_name: name,
      output_path: outputPath,
      written_at: new Date().toISOString(),
    }).then(() => {}).catch(() => {
      // Table may not exist yet; silently no-op until schema migration lands
    });
  }

  // ━━━ Telegram summary for escalations + daily pulse
  if (telegramSummary) {
    try {
      const { sendTelegram } = await import('./telegram.mjs');
      const summary = `[${name}] wrote ${outputPath}\n${truncate(output, 200)}`;
      await sendTelegram(summary);
    } catch (err) {
      console.warn(`[${name}] telegram send failed: ${err.message}`);
    }
  }

  // ━━━ Stdout line for cron logs (cost tracked in api_usage table — query there for spend)
  console.log(`[agent:${name}] model=${model} wrote ${outputPath}`);

  return { output, model, outputPath };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTRACT VALIDATION — fails fast on fuzzy prompts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function validateContract({ name, task, budget, stopCriteria, fallback, scopedFiles }) {
  const errors = [];
  if (!name || !/^[a-z][a-z0-9-]+$/.test(name)) {
    errors.push('name: must be kebab-case, lowercase');
  }
  if (!task) errors.push('task: required for model selection');
  if (!budget?.maxTokens || budget.maxTokens > 16000) {
    errors.push('budget.maxTokens: required, must be ≤16000');
  }
  if (!stopCriteria || stopCriteria.length < 20) {
    errors.push('stopCriteria: required, must be a concrete predicate (≥20 chars)');
  }
  if (!fallback || fallback.length < 20) {
    errors.push('fallback: required, must describe what to return if blocked');
  }
  if (!Array.isArray(scopedFiles) || scopedFiles.length === 0) {
    errors.push('scopedFiles: required array — never "the whole repo"');
  }
  if (errors.length) {
    throw new Error(
      `Goods agent contract violations:\n  - ${errors.join('\n  - ')}\n\n` +
      'See ~/.claude/rules/opus-4-7-prompting.md for the four-part contract.'
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO() {
  return new Date().toISOString();
}
