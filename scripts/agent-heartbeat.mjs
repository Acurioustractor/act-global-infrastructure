#!/usr/bin/env node
/**
 * Agent Heartbeat Check
 *
 * Runs periodically to:
 * 1. Check which agents have stale heartbeats (>1 hour)
 * 2. Mark stale agents as unhealthy
 * 3. Optionally restart/alert on critical agents
 *
 * Run manually: node scripts/agent-heartbeat.mjs
 * Run via cron: 0,15,30,45 * * * * node /path/to/agent-heartbeat.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env vars before anything else
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const STALE_THRESHOLD_MINUTES = 60; // Agent is stale after 1 hour
const CRITICAL_AGENTS = ['dispatcher', 'cultivator', 'shepherd']; // These should always be active

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const args = process.argv.slice(2);
  if (args.includes('--update')) {
    await updateAllHeartbeats(supabase);
  } else {
    await checkHeartbeats(supabase);
  }
}

async function checkHeartbeats(supabase) {
  console.log('🫀 Agent Heartbeat Check');
  console.log('━'.repeat(40));
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Stale threshold: ${STALE_THRESHOLD_MINUTES} minutes\n`);

  // Get all agents
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, enabled, last_heartbeat, autonomy_level')
    .order('name');

  if (error) {
    console.error('❌ Failed to fetch agents:', error);
    process.exit(1);
  }

  const now = new Date();
  const staleThreshold = new Date(now - STALE_THRESHOLD_MINUTES * 60 * 1000);

  const results = {
    healthy: [],
    stale: [],
    disabled: [],
    critical: []
  };

  for (const agent of agents) {
    if (!agent.enabled) {
      results.disabled.push(agent);
      continue;
    }

    const lastBeat = agent.last_heartbeat ? new Date(agent.last_heartbeat) : null;
    const isStale = !lastBeat || lastBeat < staleThreshold;

    if (isStale) {
      results.stale.push(agent);
      if (CRITICAL_AGENTS.includes(agent.id)) {
        results.critical.push(agent);
      }
    } else {
      results.healthy.push(agent);
    }
  }

  // Report
  console.log(`✅ Healthy: ${results.healthy.length}`);
  for (const agent of results.healthy) {
    const ago = Math.round((now - new Date(agent.last_heartbeat)) / 60000);
    console.log(`   ${agent.name} (${ago}m ago)`);
  }

  console.log(`\n⚠️  Stale: ${results.stale.length}`);
  for (const agent of results.stale) {
    const lastBeat = agent.last_heartbeat
      ? `${Math.round((now - new Date(agent.last_heartbeat)) / 60000)}m ago`
      : 'never';
    console.log(`   ${agent.name} (last: ${lastBeat})`);
  }

  console.log(`\n⏸️  Disabled: ${results.disabled.length}`);
  for (const agent of results.disabled) {
    console.log(`   ${agent.name}`);
  }

  // Log this check to audit
  await supabase.from('agent_audit_log').insert({
    agent_id: 'system',
    action_type: 'heartbeat_check',
    action_details: {
      healthy: results.healthy.length,
      stale: results.stale.length,
      disabled: results.disabled.length,
      critical_stale: results.critical.map(a => a.id)
    },
    success: results.critical.length === 0,
    timestamp: now.toISOString()
  });

  // Alert on critical
  if (results.critical.length > 0) {
    console.log(`\n🚨 CRITICAL: ${results.critical.length} critical agents are stale!`);
    for (const agent of results.critical) {
      console.log(`   ❌ ${agent.name} - requires attention`);
    }
  }

  console.log('\n' + '━'.repeat(40));
  console.log(`Summary: ${results.healthy.length} healthy, ${results.stale.length} stale, ${results.disabled.length} disabled`);

  return results;
}

// Update all agent heartbeats to now (for initialization)
async function updateAllHeartbeats(supabase) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('agents')
    .update({ last_heartbeat: now })
    .eq('enabled', true)
    .select('id, name');

  if (error) {
    console.error('❌ Failed to update heartbeats:', error);
    return;
  }

  console.log(`✅ Updated heartbeats for ${data.length} agents at ${now}`);
  for (const agent of data) {
    console.log(`   ${agent.name}`);
  }
  return data;
}

main().catch(console.error);
