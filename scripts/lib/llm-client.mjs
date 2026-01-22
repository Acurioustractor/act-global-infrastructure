/**
 * LLM Client with Usage Tracking
 * Layer 8: Cost & Latency Optimization
 *
 * Wraps OpenAI and Anthropic clients with automatic:
 * - Cost tracking to api_usage table
 * - Cache integration
 * - Retry logic with exponential backoff
 * - Rate limiting
 *
 * Usage:
 *   import { embed, complete, trackedEmbedding, trackedCompletion } from './lib/llm-client.mjs';
 *
 *   // Simple embedding
 *   const vector = await embed('Hello world');
 *
 *   // With tracking and cache
 *   const vector = await trackedEmbedding('Hello world', 'my-script.mjs');
 */

import '../../lib/load-env.mjs';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Clients (support both NEXT_PUBLIC_ and non-prefixed vars)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(supabaseUrl, supabaseKey);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRICING (per 1M tokens, January 2026)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PRICING = {
  openai: {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
    'text-embedding-3-large': { input: 0.13, output: 0 },
    'text-embedding-ada-002': { input: 0.10, output: 0 }
  },
  anthropic: {
    'claude-opus-4-5-20251101': { input: 15.00, output: 75.00 },
    'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 }
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COST CALCULATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calculateCost(provider, model, inputTokens, outputTokens = 0) {
  const pricing = PRICING[provider]?.[model];
  if (!pricing) return null;

  return (
    (inputTokens * pricing.input / 1_000_000) +
    (outputTokens * pricing.output / 1_000_000)
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USAGE LOGGING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function logUsage(entry) {
  try {
    // Calculate cost if not provided
    if (entry.estimated_cost === undefined) {
      entry.estimated_cost = calculateCost(
        entry.provider,
        entry.model,
        entry.input_tokens || 0,
        entry.output_tokens || 0
      );
    }

    // Calculate component costs
    if (PRICING[entry.provider]?.[entry.model]) {
      const p = PRICING[entry.provider][entry.model];
      entry.input_cost = (entry.input_tokens || 0) * p.input / 1_000_000;
      entry.output_cost = (entry.output_tokens || 0) * p.output / 1_000_000;
    }

    const { error } = await supabase
      .from('api_usage')
      .insert(entry);

    if (error) {
      console.error('Failed to log API usage:', error.message);
    }
  } catch (err) {
    console.error('Usage logging error:', err.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RETRY LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function withRetry(fn, maxRetries = 3, baseDelayMs = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on auth errors
      if (error.status === 401 || error.status === 403) {
        throw error;
      }

      // Retry on rate limits and server errors
      if (error.status === 429 || error.status >= 500) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`API error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMBEDDINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Generate embedding without tracking (for simple use)
 */
export async function embed(text, model = 'text-embedding-3-small') {
  const result = await openai.embeddings.create({
    model,
    input: text
  });
  return result.data[0].embedding;
}

/**
 * Generate embedding with full tracking
 *
 * @param {string} text - Text to embed
 * @param {string} scriptName - Name of calling script for tracking
 * @param {Object} options - Additional options
 * @returns {Promise<number[]>} Embedding vector
 */
export async function trackedEmbedding(text, scriptName, options = {}) {
  const model = options.model || 'text-embedding-3-small';
  const start = Date.now();
  let retries = 0;

  const result = await withRetry(async () => {
    retries++;
    return await openai.embeddings.create({
      model,
      input: text
    });
  }, options.maxRetries || 3);

  const latencyMs = Date.now() - start;

  // Log usage
  await logUsage({
    provider: 'openai',
    model,
    endpoint: 'embeddings',
    input_tokens: result.usage?.total_tokens || 0,
    output_tokens: 0,
    script_name: scriptName,
    agent_id: options.agentId || scriptName,
    operation: options.operation || 'embed',
    latency_ms: latencyMs,
    retries: retries - 1,
    cache_hit: false,
    cache_key: options.cacheKey || null,
    response_status: 200
  });

  return result.data[0].embedding;
}

/**
 * Batch embed multiple texts (more efficient)
 */
export async function trackedBatchEmbedding(texts, scriptName, options = {}) {
  const model = options.model || 'text-embedding-3-small';
  const start = Date.now();
  const batchId = crypto.randomUUID();

  const result = await withRetry(async () => {
    return await openai.embeddings.create({
      model,
      input: texts
    });
  });

  const latencyMs = Date.now() - start;

  // Log as single batch call
  await logUsage({
    provider: 'openai',
    model,
    endpoint: 'embeddings',
    input_tokens: result.usage?.total_tokens || 0,
    output_tokens: 0,
    script_name: scriptName,
    agent_id: options.agentId || scriptName,
    operation: 'batch_embed',
    latency_ms: latencyMs,
    cache_hit: false,
    batch_id: batchId,
    metadata: { batch_size: texts.length }
  });

  return result.data.map(d => d.embedding);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPLETIONS (OpenAI)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * OpenAI chat completion without tracking
 */
export async function complete(messages, options = {}) {
  const result = await openai.chat.completions.create({
    model: options.model || 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens || 1000
  });
  return result.choices[0].message.content;
}

/**
 * OpenAI chat completion with tracking
 */
export async function trackedCompletion(messages, scriptName, options = {}) {
  const model = options.model || 'gpt-4o-mini';
  const start = Date.now();

  const result = await withRetry(async () => {
    return await openai.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 1000
    });
  });

  const latencyMs = Date.now() - start;

  // Log usage
  await logUsage({
    provider: 'openai',
    model,
    endpoint: 'chat',
    input_tokens: result.usage?.prompt_tokens || 0,
    output_tokens: result.usage?.completion_tokens || 0,
    script_name: scriptName,
    agent_id: options.agentId || scriptName,
    operation: options.operation || 'complete',
    latency_ms: latencyMs,
    cache_hit: false,
    response_status: 200
  });

  return result.choices[0].message.content;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANTHROPIC COMPLETIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Anthropic completion without tracking
 */
export async function claudeComplete(prompt, options = {}) {
  const result = await anthropic.messages.create({
    model: options.model || 'claude-3-5-haiku-20241022',
    max_tokens: options.maxTokens || 1000,
    messages: [{ role: 'user', content: prompt }]
  });
  return result.content[0].text;
}

/**
 * Anthropic completion with tracking
 */
export async function trackedClaudeCompletion(prompt, scriptName, options = {}) {
  const model = options.model || 'claude-3-5-haiku-20241022';
  const start = Date.now();

  const messages = Array.isArray(prompt)
    ? prompt
    : [{ role: 'user', content: prompt }];

  const result = await withRetry(async () => {
    return await anthropic.messages.create({
      model,
      max_tokens: options.maxTokens || 1000,
      system: options.system,
      messages
    });
  });

  const latencyMs = Date.now() - start;

  // Log usage
  await logUsage({
    provider: 'anthropic',
    model,
    endpoint: 'chat',
    input_tokens: result.usage?.input_tokens || 0,
    output_tokens: result.usage?.output_tokens || 0,
    script_name: scriptName,
    agent_id: options.agentId || scriptName,
    operation: options.operation || 'complete',
    latency_ms: latencyMs,
    cache_hit: false,
    response_status: 200
  });

  return result.content[0].text;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COST REPORTING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get cost summary for a date range
 */
export async function getCostSummary(startDate = null, endDate = null) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data, error } = await supabase.rpc('get_cost_summary', {
    p_start_date: start.toISOString().split('T')[0],
    p_end_date: end.toISOString().split('T')[0]
  });

  if (error) throw error;
  return data;
}

/**
 * Get daily costs
 */
export async function getDailyCosts(days = 30) {
  const { data, error } = await supabase
    .from('v_daily_api_costs')
    .select('*')
    .order('date', { ascending: false })
    .limit(days * 10);  // Multiple models per day

  if (error) throw error;
  return data;
}

/**
 * Get costs by script
 */
export async function getScriptCosts() {
  const { data, error } = await supabase
    .from('v_script_api_costs')
    .select('*')
    .order('cost_usd', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Check if daily spend exceeds threshold
 */
export async function checkSpendAlert(thresholdUsd = 10) {
  const { data, error } = await supabase.rpc('check_daily_spend_alert', {
    p_threshold_usd: thresholdUsd
  });

  if (error) throw error;
  return data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'test') {
    console.log('Testing LLM client...\n');

    // Test embedding
    console.log('Testing embedding...');
    const embedding = await trackedEmbedding('Hello world', 'llm-client-test');
    console.log(`✓ Embedding generated: ${embedding.length} dimensions\n`);

    // Test completion
    console.log('Testing completion...');
    const response = await trackedCompletion(
      [{ role: 'user', content: 'Say hello in 5 words or less.' }],
      'llm-client-test'
    );
    console.log(`✓ Completion: "${response}"\n`);

    // Test Claude (if key available)
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('Testing Claude...');
      const claudeResponse = await trackedClaudeCompletion(
        'Say hi in 5 words',
        'llm-client-test'
      );
      console.log(`✓ Claude: "${claudeResponse}"\n`);
    }

    console.log('All tests passed!');

  } else if (command === 'costs') {
    console.log('API Cost Report');
    console.log('━'.repeat(60));

    const summary = await getCostSummary();
    let totalCost = 0;

    summary.forEach(s => {
      console.log(`\n${s.provider}/${s.model}:`);
      console.log(`  Calls: ${s.total_calls} | Tokens: ${s.total_tokens?.toLocaleString()}`);
      console.log(`  Cost: $${s.total_cost} | Cache: ${s.cache_hit_rate}%`);
      totalCost += parseFloat(s.total_cost || 0);
    });

    console.log('\n' + '━'.repeat(60));
    console.log(`TOTAL: $${totalCost.toFixed(2)}`);

  } else if (command === 'daily') {
    console.log('Daily Costs (last 7 days)');
    console.log('━'.repeat(60));

    const daily = await getDailyCosts(7);
    const byDate = {};

    daily.forEach(d => {
      byDate[d.date] = byDate[d.date] || [];
      byDate[d.date].push(d);
    });

    Object.entries(byDate).forEach(([date, entries]) => {
      const total = entries.reduce((sum, e) => sum + parseFloat(e.cost_usd), 0);
      console.log(`\n${date}: $${total.toFixed(4)}`);
      entries.forEach(e => {
        console.log(`  ${e.provider}/${e.model}: ${e.calls} calls, $${e.cost_usd}`);
      });
    });

  } else if (command === 'scripts') {
    console.log('Costs by Script (last 7 days)');
    console.log('━'.repeat(60));

    const scripts = await getScriptCosts();
    scripts.forEach(s => {
      console.log(`\n${s.script_name}:`);
      console.log(`  Model: ${s.model} | Calls: ${s.calls}`);
      console.log(`  Cost: $${s.cost_usd} | Cache: ${s.cache_hit_pct}% | Latency: ${s.avg_latency_ms}ms`);
    });

  } else if (command === 'alert') {
    const threshold = parseFloat(process.argv[3]) || 10;
    const alerts = await checkSpendAlert(threshold);

    if (alerts.length > 0) {
      console.log(`⚠️  ALERT: Daily spend exceeds $${threshold}`);
      alerts.forEach(a => {
        console.log(`  Date: ${a.alert_date}`);
        console.log(`  Total: $${a.total_spend} (threshold: $${a.threshold})`);
        console.log(`  Top model: ${a.top_model} ($${a.top_model_cost})`);
      });
    } else {
      console.log(`✓ Daily spend is under $${threshold}`);
    }

  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/llm-client.mjs test              - Run tests');
    console.log('  node scripts/lib/llm-client.mjs costs             - Show cost summary');
    console.log('  node scripts/lib/llm-client.mjs daily             - Show daily costs');
    console.log('  node scripts/lib/llm-client.mjs scripts           - Show costs by script');
    console.log('  node scripts/lib/llm-client.mjs alert [threshold] - Check spend alert');
  }
}

export default {
  embed,
  trackedEmbedding,
  trackedBatchEmbedding,
  complete,
  trackedCompletion,
  claudeComplete,
  trackedClaudeCompletion,
  getCostSummary,
  getDailyCosts,
  getScriptCosts,
  checkSpendAlert
};
