#!/usr/bin/env node
/**
 * Data Freshness Monitor
 *
 * Checks last sync timestamps per data source and flags stale data.
 * Reports to console and optionally writes a summary to Supabase.
 *
 * Data sources checked:
 *   - GHL contacts/opportunities (ghl_contacts, ghl_opportunities)
 *   - Communications (communications)
 *   - Knowledge (project_knowledge, knowledge_chunks)
 *   - Calendar (calendar_events)
 *   - Subscriptions (subscriptions)
 *   - API usage (api_usage)
 *   - Health checks (site_health_checks)
 *   - Embeddings completeness (project_knowledge, knowledge_chunks with null embedding)
 *
 * Usage:
 *   node scripts/data-freshness-monitor.mjs             # Full report
 *   node scripts/data-freshness-monitor.mjs --json      # JSON output
 *   node scripts/data-freshness-monitor.mjs --alert     # Only show stale items
 *
 * Schedule: Every 6 hours via PM2/GitHub Actions
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SCRIPT_NAME = 'data-freshness-monitor';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const alertOnly = args.includes('--alert');

// Freshness thresholds (hours) — when data is considered stale
const THRESHOLDS = {
  ghl_contacts:        { warn: 48, critical: 168, column: 'updated_at', label: 'GHL Contacts' },
  ghl_opportunities:   { warn: 48, critical: 168, column: 'updated_at', label: 'GHL Opportunities' },
  communications_history: { warn: 24, critical: 72,  column: 'occurred_at', label: 'Communications' },
  project_knowledge:   { warn: 48, critical: 168, column: 'recorded_at', label: 'Project Knowledge' },
  knowledge_chunks:    { warn: 48, critical: 168, column: 'created_at', label: 'Knowledge Chunks' },
  calendar_events:     { warn: 72, critical: 336, column: 'synced_at', label: 'Calendar Events' },
  subscriptions:       { warn: 168, critical: 720, column: 'updated_at', label: 'Subscriptions' },
  api_usage:           { warn: 24, critical: 72,  column: 'created_at', label: 'API Usage' },
  site_health_checks:  { warn: 24, critical: 72,  column: 'checked_at', label: 'Site Health Checks' },
};

async function main() {
  const start = Date.now();
  const now = new Date();
  const results = [];

  if (!jsonOutput) {
    console.log('=== Data Freshness Monitor ===');
    console.log(`Time: ${now.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}`);
    console.log('');
  }

  // Check each data source
  for (const [table, config] of Object.entries(THRESHOLDS)) {
    const result = await checkFreshness(table, config, now);
    results.push(result);
  }

  // Check embedding completeness
  const embedResult = await checkEmbeddingCompleteness();
  results.push(embedResult);

  // Check knowledge pipeline health
  const pipelineResult = await checkPipelineHealth();
  results.push(pipelineResult);

  // Summary
  const stale = results.filter(r => r.status === 'critical');
  const warning = results.filter(r => r.status === 'warn');
  const healthy = results.filter(r => r.status === 'ok');

  if (jsonOutput) {
    console.log(JSON.stringify({
      generated_at: now.toISOString(),
      latency_ms: Date.now() - start,
      summary: {
        healthy: healthy.length,
        warning: warning.length,
        critical: stale.length,
        total: results.length,
      },
      sources: results,
    }, null, 2));
  } else {
    if (!alertOnly) {
      console.log('--- Summary ---');
      console.log(`  ✓ Healthy: ${healthy.length}`);
      if (warning.length) console.log(`  ⚠ Warning: ${warning.length}`);
      if (stale.length) console.log(`  ✗ Critical: ${stale.length}`);
      console.log('');
    }

    // Print details
    for (const r of results) {
      if (alertOnly && r.status === 'ok') continue;

      const icon = r.status === 'ok' ? '✓' : r.status === 'warn' ? '⚠' : '✗';
      const age = r.age_hours != null ? `${r.age_hours}h ago` : 'no data';
      console.log(`  ${icon} ${r.label}: ${age} (${r.row_count || 0} rows) ${r.note || ''}`);
    }

    console.log(`\nCompleted in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  }

  // Log to api_usage for tracking
  await logMonitorRun(results, Date.now() - start, stale.length);

  // Record own sync status
  await recordSyncStatus(supabase, 'data_freshness_monitor', {
    success: true,
    recordCount: results.length,
    durationMs: Date.now() - start,
  });

  // Fire integration_event for stale integrations (triggers Telegram via event reactor)
  if (stale.length > 0) {
    const staleNames = stale.map(r => r.label).join(', ');
    await supabase.from('integration_events').insert({
      source: 'data-freshness-monitor',
      event_type: 'staleness_alert',
      entity_type: 'sync_status',
      payload: {
        critical_count: stale.length,
        warning_count: warning.length,
        stale_sources: stale.map(r => ({ label: r.label, table: r.table, age_hours: r.age_hours })),
        message: `${stale.length} data source(s) critically stale: ${staleNames}`,
      },
      triggered_by: SCRIPT_NAME,
      latency_ms: Date.now() - start,
    });

    process.exit(1); // Non-zero exit for alerting
  }
}

async function checkFreshness(table, config, now) {
  const result = {
    table,
    label: config.label,
    status: 'ok',
    age_hours: null,
    row_count: null,
    last_updated: null,
    note: '',
  };

  try {
    // Get most recent record
    const { data, error, count } = await supabase
      .from(table)
      .select(config.column, { count: 'exact' })
      .order(config.column, { ascending: false })
      .limit(1);

    if (error) {
      // Table might not exist
      if (error.message.includes('does not exist') || error.code === '42P01') {
        result.status = 'warn';
        result.note = 'table not found';
        return result;
      }
      result.status = 'warn';
      result.note = error.message;
      return result;
    }

    result.row_count = count;

    if (!data || data.length === 0) {
      result.status = 'warn';
      result.note = 'empty table';
      return result;
    }

    const lastDate = new Date(data[0][config.column]);
    const ageHours = Math.round((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60));
    result.age_hours = ageHours;
    result.last_updated = lastDate.toISOString();

    if (ageHours >= config.critical) {
      result.status = 'critical';
      result.note = `stale (>${config.critical}h threshold)`;
    } else if (ageHours >= config.warn) {
      result.status = 'warn';
      result.note = `aging (>${config.warn}h threshold)`;
    }
  } catch (err) {
    result.status = 'warn';
    result.note = err.message;
  }

  return result;
}

async function checkEmbeddingCompleteness() {
  const result = {
    table: 'embeddings',
    label: 'Embedding Completeness',
    status: 'ok',
    age_hours: null,
    row_count: null,
    note: '',
  };

  try {
    const { count: missingKnowledge } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .is('embedding', null);

    const { count: missingChunks } = await supabase
      .from('knowledge_chunks')
      .select('id', { count: 'exact', head: true })
      .is('embedding', null);

    const total = (missingKnowledge || 0) + (missingChunks || 0);
    result.row_count = total;

    if (total > 50) {
      result.status = 'critical';
      result.note = `${total} missing (${missingKnowledge || 0} knowledge, ${missingChunks || 0} chunks)`;
    } else if (total > 10) {
      result.status = 'warn';
      result.note = `${total} missing`;
    } else {
      result.note = `${total} missing`;
    }
  } catch (err) {
    result.status = 'warn';
    result.note = err.message;
  }

  return result;
}

async function checkPipelineHealth() {
  const result = {
    table: 'knowledge_pipeline',
    label: 'Knowledge Pipeline',
    status: 'ok',
    age_hours: null,
    row_count: null,
    note: '',
  };

  try {
    // Check when knowledge-pipeline last ran via api_usage
    const { data } = await supabase
      .from('api_usage')
      .select('created_at, response_status')
      .eq('script_name', 'knowledge-pipeline')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      result.status = 'warn';
      result.note = 'pipeline has never run';
      return result;
    }

    const lastRun = new Date(data[0].created_at);
    const ageHours = Math.round((Date.now() - lastRun.getTime()) / (1000 * 60 * 60));
    result.age_hours = ageHours;
    result.last_updated = lastRun.toISOString();

    if (data[0].response_status !== 200) {
      result.status = 'critical';
      result.note = 'last run failed';
    } else if (ageHours > 48) {
      result.status = 'critical';
      result.note = `last run ${ageHours}h ago (>48h threshold)`;
    } else if (ageHours > 24) {
      result.status = 'warn';
      result.note = `last run ${ageHours}h ago`;
    }
  } catch (err) {
    result.status = 'warn';
    result.note = err.message;
  }

  return result;
}

async function logMonitorRun(results, totalMs, criticalCount) {
  try {
    await supabase.from('api_usage').insert({
      provider: 'internal',
      model: 'data-freshness-monitor',
      endpoint: 'monitor-run',
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
      script_name: SCRIPT_NAME,
      agent_id: SCRIPT_NAME,
      operation: 'freshness-check',
      latency_ms: totalMs,
      response_status: criticalCount > 0 ? 500 : 200,
      metadata: {
        critical_count: criticalCount,
        source_count: results.length,
      },
    });
  } catch (err) {
    // Non-critical — don't fail
  }
}

main().catch((err) => {
  console.error('Monitor fatal error:', err);
  process.exit(1);
});
