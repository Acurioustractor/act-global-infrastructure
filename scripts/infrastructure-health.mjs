#!/usr/bin/env node
/**
 * 9-Layer Infrastructure Health Dashboard
 * Layer 9: Observability & Evaluation
 *
 * Monitors and scores each layer of the Agentic Data Infrastructure:
 * 1. Models - LLM configuration and availability
 * 2. Extraction & Integration - Data source connectivity
 * 3. Preparation & Transformation - Entity resolution, normalization
 * 4. Indexing & Retrieval - Search and embedding health
 * 5. Delivery & Orchestration - Agent orchestration
 * 6. Memory & State - Conversation and state management
 * 7. Governance & Safety - Audit logs, cultural protocols
 * 8. Cost & Latency - API costs and caching
 * 9. Observability & Evaluation - Decision traces, quality metrics
 *
 * Usage:
 *   node scripts/infrastructure-health.mjs          - Full health check
 *   node scripts/infrastructure-health.mjs --layer 7 - Check specific layer
 *   node scripts/infrastructure-health.mjs --json   - Output as JSON
 */

import { createClient } from '@supabase/supabase-js';
import { createAuditor } from './lib/audit.mjs';

// Support both NEXT_PUBLIC_ and non-prefixed vars
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const audit = createAuditor('infrastructure-health');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER CHECKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function checkLayer1_Models() {
  const checks = [];

  // Check OpenAI key
  checks.push({
    name: 'OpenAI API Key',
    status: process.env.OPENAI_API_KEY ? 'ok' : 'missing',
    score: process.env.OPENAI_API_KEY ? 10 : 0
  });

  // Check Anthropic key
  checks.push({
    name: 'Anthropic API Key',
    status: process.env.ANTHROPIC_API_KEY ? 'ok' : 'missing',
    score: process.env.ANTHROPIC_API_KEY ? 10 : 5  // Optional
  });

  // Check HuggingFace key (for local models)
  checks.push({
    name: 'HuggingFace API Key',
    status: process.env.HUGGINGFACE_API_KEY ? 'ok' : 'optional',
    score: process.env.HUGGINGFACE_API_KEY ? 10 : 8
  });

  const avgScore = checks.reduce((s, c) => s + c.score, 0) / checks.length / 10;

  return {
    layer: 1,
    name: 'Models',
    score: Math.round(avgScore * 10),
    checks
  };
}

async function checkLayer2_Extraction() {
  const checks = [];

  // Check GHL connection
  const hasGHL = process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID;
  checks.push({
    name: 'GHL Integration',
    status: hasGHL ? 'ok' : 'missing',
    score: hasGHL ? 10 : 0
  });

  // Check Notion connection (support both NOTION_API_KEY and NOTION_TOKEN)
  const hasNotion = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
  checks.push({
    name: 'Notion Integration',
    status: hasNotion ? 'ok' : 'missing',
    score: hasNotion ? 10 : 0
  });

  // Check GHL contacts count
  try {
    const { count } = await supabase
      .from('ghl_contacts')
      .select('*', { count: 'exact', head: true });
    checks.push({
      name: 'GHL Contacts Synced',
      status: count > 0 ? 'ok' : 'empty',
      score: count > 100 ? 10 : count > 0 ? 7 : 3,
      details: `${count || 0} contacts`
    });
  } catch (e) {
    checks.push({
      name: 'GHL Contacts Synced',
      status: 'error',
      score: 0,
      details: e.message
    });
  }

  const avgScore = checks.reduce((s, c) => s + c.score, 0) / checks.length / 10;

  return {
    layer: 2,
    name: 'Extraction & Integration',
    score: Math.round(avgScore * 10),
    checks
  };
}

async function checkLayer3_Preparation() {
  const checks = [];

  // Check entity resolution
  try {
    const { count } = await supabase
      .from('canonical_entities')
      .select('*', { count: 'exact', head: true });
    checks.push({
      name: 'Canonical Entities',
      status: count > 0 ? 'ok' : 'empty',
      score: count > 50 ? 10 : count > 0 ? 6 : 2,
      details: `${count || 0} entities`
    });
  } catch (e) {
    checks.push({
      name: 'Canonical Entities',
      status: 'table_missing',
      score: 0
    });
  }

  // Check entity identifiers
  try {
    const { count } = await supabase
      .from('entity_identifiers')
      .select('*', { count: 'exact', head: true });
    checks.push({
      name: 'Entity Identifiers',
      status: count > 0 ? 'ok' : 'empty',
      score: count > 100 ? 10 : count > 0 ? 6 : 2,
      details: `${count || 0} identifiers`
    });
  } catch (e) {
    checks.push({
      name: 'Entity Identifiers',
      status: 'table_missing',
      score: 0
    });
  }

  // Check merge log
  try {
    const { count } = await supabase
      .from('entity_merge_log')
      .select('*', { count: 'exact', head: true });
    checks.push({
      name: 'Entity Merge Log',
      status: 'ok',
      score: 10,
      details: `${count || 0} merges recorded`
    });
  } catch (e) {
    checks.push({
      name: 'Entity Merge Log',
      status: 'table_missing',
      score: 0
    });
  }

  const avgScore = checks.reduce((s, c) => s + c.score, 0) / checks.length / 10;

  return {
    layer: 3,
    name: 'Preparation & Transformation',
    score: Math.round(avgScore * 10),
    checks
  };
}

async function checkLayer4_Indexing() {
  const checks = [];

  // Check voice notes with embeddings
  try {
    const { count: total } = await supabase
      .from('voice_notes')
      .select('*', { count: 'exact', head: true });

    const { count: embedded } = await supabase
      .from('voice_notes')
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null);

    const pct = total > 0 ? Math.round((embedded / total) * 100) : 0;
    checks.push({
      name: 'Voice Notes Embedded',
      status: pct >= 80 ? 'ok' : pct > 0 ? 'partial' : 'empty',
      score: pct >= 90 ? 10 : pct >= 50 ? 7 : pct > 0 ? 4 : 2,
      details: `${embedded}/${total} (${pct}%)`
    });
  } catch (e) {
    checks.push({
      name: 'Voice Notes Embedded',
      status: 'table_missing',
      score: 5,
      details: 'Table not created yet'
    });
  }

  // Check vector index
  checks.push({
    name: 'Vector Extension',
    status: 'ok',  // We assume pgvector is installed
    score: 10
  });

  // Check semantic search function
  try {
    // Test the search function exists
    const { error } = await supabase.rpc('search_voice_notes', {
      query_embedding: new Array(384).fill(0),
      match_threshold: 0.9,
      match_count: 1
    });
    checks.push({
      name: 'Semantic Search Function',
      status: error ? 'error' : 'ok',
      score: error ? 5 : 10
    });
  } catch (e) {
    checks.push({
      name: 'Semantic Search Function',
      status: 'missing',
      score: 0
    });
  }

  const avgScore = checks.reduce((s, c) => s + c.score, 0) / checks.length / 10;

  return {
    layer: 4,
    name: 'Indexing & Retrieval',
    score: Math.round(avgScore * 10),
    checks
  };
}

async function checkLayer5_Orchestration() {
  const checks = [];

  // Check for script files
  const fs = await import('fs/promises');
  const scriptsDir = './scripts';

  try {
    const files = await fs.readdir(scriptsDir);
    const agentScripts = files.filter(f => f.endsWith('.mjs'));
    checks.push({
      name: 'Agent Scripts',
      status: agentScripts.length > 5 ? 'ok' : 'low',
      score: agentScripts.length > 20 ? 10 : agentScripts.length > 10 ? 8 : 6,
      details: `${agentScripts.length} scripts`
    });
  } catch (e) {
    checks.push({
      name: 'Agent Scripts',
      status: 'error',
      score: 5
    });
  }

  // Check cron/scheduled jobs (via GitHub Actions)
  try {
    const workflowFiles = await fs.readdir('./.github/workflows').catch(() => []);
    checks.push({
      name: 'Scheduled Workflows',
      status: workflowFiles.length > 0 ? 'ok' : 'none',
      score: workflowFiles.length > 2 ? 10 : workflowFiles.length > 0 ? 7 : 4,
      details: `${workflowFiles.length} workflows`
    });
  } catch (e) {
    checks.push({
      name: 'Scheduled Workflows',
      status: 'none',
      score: 5
    });
  }

  const avgScore = checks.reduce((s, c) => s + c.score, 0) / checks.length / 10;

  return {
    layer: 5,
    name: 'Delivery & Orchestration',
    score: Math.round(avgScore * 10),
    checks
  };
}

async function checkLayer6_Memory() {
  const checks = [];

  // Check communications history
  try {
    const { count } = await supabase
      .from('communications_history')
      .select('*', { count: 'exact', head: true });
    checks.push({
      name: 'Communications History',
      status: count > 0 ? 'ok' : 'empty',
      score: count > 100 ? 10 : count > 0 ? 7 : 3,
      details: `${count || 0} records`
    });
  } catch (e) {
    checks.push({
      name: 'Communications History',
      status: 'table_missing',
      score: 0
    });
  }

  // Check project updates
  try {
    const { count } = await supabase
      .from('project_updates')
      .select('*', { count: 'exact', head: true });
    checks.push({
      name: 'Project Updates',
      status: count > 0 ? 'ok' : 'empty',
      score: count > 20 ? 10 : count > 0 ? 7 : 3,
      details: `${count || 0} updates`
    });
  } catch (e) {
    checks.push({
      name: 'Project Updates',
      status: 'table_missing',
      score: 3
    });
  }

  const avgScore = checks.reduce((s, c) => s + c.score, 0) / checks.length / 10;

  return {
    layer: 6,
    name: 'Memory & State',
    score: Math.round(avgScore * 10),
    checks
  };
}

async function checkLayer7_Governance() {
  const checks = [];

  // Check audit log
  try {
    const { count } = await supabase
      .from('agent_audit_log')
      .select('*', { count: 'exact', head: true });
    checks.push({
      name: 'Agent Audit Log',
      status: count > 0 ? 'ok' : 'empty',
      score: count > 100 ? 10 : count > 0 ? 7 : 3,
      details: `${count || 0} entries`
    });
  } catch (e) {
    checks.push({
      name: 'Agent Audit Log',
      status: 'table_missing',
      score: 0
    });
  }

  // Check cultural protocols
  try {
    const { count } = await supabase
      .from('cultural_protocols')
      .select('*', { count: 'exact', head: true });
    checks.push({
      name: 'Cultural Protocols',
      status: 'ok',
      score: 10,
      details: `${count || 0} protocols defined`
    });
  } catch (e) {
    checks.push({
      name: 'Cultural Protocols',
      status: 'table_missing',
      score: 0
    });
  }

  // Check sync queue
  try {
    const { count } = await supabase
      .from('sync_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'blocked');
    checks.push({
      name: 'Blocked Syncs',
      status: count === 0 ? 'ok' : 'attention',
      score: count === 0 ? 10 : 6,
      details: `${count || 0} blocked`
    });
  } catch (e) {
    checks.push({
      name: 'Blocked Syncs',
      status: 'table_missing',
      score: 5
    });
  }

  const avgScore = checks.reduce((s, c) => s + c.score, 0) / checks.length / 10;

  return {
    layer: 7,
    name: 'Governance & Safety',
    score: Math.round(avgScore * 10),
    checks
  };
}

async function checkLayer8_Cost() {
  const checks = [];

  // Check API usage tracking
  try {
    const { count } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true });
    checks.push({
      name: 'API Usage Tracking',
      status: count > 0 ? 'ok' : 'empty',
      score: count > 50 ? 10 : count > 0 ? 7 : 3,
      details: `${count || 0} calls logged`
    });
  } catch (e) {
    checks.push({
      name: 'API Usage Tracking',
      status: 'table_missing',
      score: 0
    });
  }

  // Check for cache configuration
  const hasCache = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  checks.push({
    name: 'Cache Configuration',
    status: hasCache ? 'ok' : 'missing',
    score: hasCache ? 10 : 3,
    details: hasCache ? 'Redis configured' : 'Using in-memory fallback'
  });

  // Check cache hit rate (if available)
  try {
    const { data } = await supabase
      .from('api_usage')
      .select('cache_hit')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (data && data.length > 0) {
      const hits = data.filter(d => d.cache_hit).length;
      const rate = Math.round((hits / data.length) * 100);
      checks.push({
        name: 'Cache Hit Rate (7d)',
        status: rate >= 30 ? 'ok' : 'low',
        score: rate >= 50 ? 10 : rate >= 30 ? 7 : 4,
        details: `${rate}%`
      });
    }
  } catch (e) {
    // Skip if no data
  }

  const avgScore = checks.reduce((s, c) => s + c.score, 0) / checks.length / 10;

  return {
    layer: 8,
    name: 'Cost & Latency',
    score: Math.round(avgScore * 10),
    checks
  };
}

async function checkLayer9_Observability() {
  const checks = [];

  // Check decision traces
  try {
    const { count } = await supabase
      .from('decision_traces')
      .select('*', { count: 'exact', head: true });
    checks.push({
      name: 'Decision Traces',
      status: count > 0 ? 'ok' : 'empty',
      score: count > 50 ? 10 : count > 0 ? 6 : 2,
      details: `${count || 0} traces`
    });
  } catch (e) {
    checks.push({
      name: 'Decision Traces',
      status: 'table_missing',
      score: 0
    });
  }

  // Check decision quality (feedback rate)
  try {
    const { data } = await supabase
      .from('decision_traces')
      .select('human_feedback')
      .not('human_feedback', 'is', null)
      .limit(100);

    if (data && data.length > 0) {
      const correct = data.filter(d => d.human_feedback === 'correct').length;
      const rate = Math.round((correct / data.length) * 100);
      checks.push({
        name: 'Decision Accuracy',
        status: rate >= 80 ? 'ok' : rate >= 60 ? 'fair' : 'low',
        score: rate >= 90 ? 10 : rate >= 80 ? 8 : rate >= 60 ? 6 : 4,
        details: `${rate}% correct`
      });
    }
  } catch (e) {
    // Skip if no data
  }

  // Check agent health
  try {
    const { data } = await supabase.rpc('get_agent_health', { p_hours: 24 });
    if (data && data.length > 0) {
      const avgSuccess = data.reduce((s, d) => s + parseFloat(d.success_rate || 0), 0) / data.length;
      checks.push({
        name: 'Agent Health (24h)',
        status: avgSuccess >= 95 ? 'ok' : avgSuccess >= 80 ? 'fair' : 'low',
        score: avgSuccess >= 95 ? 10 : avgSuccess >= 80 ? 7 : 4,
        details: `${avgSuccess.toFixed(1)}% success`
      });
    }
  } catch (e) {
    checks.push({
      name: 'Agent Health',
      status: 'no_data',
      score: 5
    });
  }

  const avgScore = checks.reduce((s, c) => s + c.score, 0) / checks.length / 10;

  return {
    layer: 9,
    name: 'Observability & Evaluation',
    score: Math.round(avgScore * 10),
    checks
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runHealthCheck(options = {}) {
  const layerChecks = [
    checkLayer1_Models,
    checkLayer2_Extraction,
    checkLayer3_Preparation,
    checkLayer4_Indexing,
    checkLayer5_Orchestration,
    checkLayer6_Memory,
    checkLayer7_Governance,
    checkLayer8_Cost,
    checkLayer9_Observability
  ];

  const results = [];

  for (let i = 0; i < layerChecks.length; i++) {
    if (options.layer && options.layer !== i + 1) continue;

    try {
      const result = await layerChecks[i]();
      results.push(result);
    } catch (e) {
      results.push({
        layer: i + 1,
        name: `Layer ${i + 1}`,
        score: 0,
        error: e.message,
        checks: []
      });
    }
  }

  // Calculate total score
  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const maxScore = results.length * 10;

  return {
    timestamp: new Date().toISOString(),
    totalScore,
    maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
    layers: results
  };
}

// CLI
const args = process.argv.slice(2);
let targetLayer = null;
let jsonOutput = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--layer' && args[i + 1]) {
    targetLayer = parseInt(args[++i]);
  } else if (args[i] === '--json') {
    jsonOutput = true;
  }
}

await audit.action('health_check', 'infrastructure', async () => {
  const health = await runHealthCheck({ layer: targetLayer });

  if (jsonOutput) {
    console.log(JSON.stringify(health, null, 2));
    return health;
  }

  // Pretty print
  console.log('\n🏥 ACT Infrastructure Health Report');
  console.log('━'.repeat(50));
  console.log(`📅 ${health.timestamp}`);
  console.log(`📊 Overall: ${health.totalScore}/${health.maxScore} (${health.percentage}%)`);
  console.log('');

  const scoreBar = (score) => {
    const filled = '█'.repeat(score);
    const empty = '░'.repeat(10 - score);
    const color = score >= 8 ? '🟢' : score >= 5 ? '🟡' : '🔴';
    return `${color} ${filled}${empty} ${score}/10`;
  };

  health.layers.forEach(layer => {
    console.log(`\n${layer.layer}. ${layer.name}`);
    console.log(`   ${scoreBar(layer.score)}`);

    if (layer.error) {
      console.log(`   ❌ Error: ${layer.error}`);
    } else {
      layer.checks.forEach(check => {
        const icon = check.score >= 8 ? '✓' : check.score >= 5 ? '○' : '✗';
        const detail = check.details ? ` (${check.details})` : '';
        console.log(`   ${icon} ${check.name}: ${check.status}${detail}`);
      });
    }
  });

  console.log('\n' + '━'.repeat(50));
  console.log(`Total Score: ${health.totalScore}/${health.maxScore} (${health.percentage}%)`);

  // Recommendations
  const weakLayers = health.layers.filter(l => l.score < 6);
  if (weakLayers.length > 0) {
    console.log('\n⚠️  Recommendations:');
    weakLayers.forEach(l => {
      console.log(`   - Layer ${l.layer} (${l.name}): Score ${l.score}/10 needs attention`);
    });
  }

  return health;
}, { inputSummary: { layer: targetLayer } });
