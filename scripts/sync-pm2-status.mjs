#!/usr/bin/env node
/**
 * Sync PM2 Status to Supabase
 *
 * Reads pm2 jlist output and upserts process status to pm2_cron_status table.
 * This allows the Vercel-hosted dashboard to display PM2 operations status
 * even though PM2 only runs on the local machine.
 *
 * Schedule: Every minute via PM2
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEV_SERVERS = new Set(['act-api', 'act-frontend', 'command-center', 'website']);

function categorizeFrequency(cronExpr) {
  if (/^\*\/[5-9]\s/.test(cronExpr) || /^\*\/1[0-5]\s/.test(cronExpr)) return 'high-freq';
  if (/^\*\/30\s/.test(cronExpr)) return 'high-freq';
  if (/\s\*\/[2-6]\s/.test(cronExpr)) return 'daily';
  if (/\s\d+\/\d+\s/.test(cronExpr)) return 'daily';
  if (/\s\*\s\*\s[0-1]$/.test(cronExpr)) return 'weekly';
  if (/\s\*\s\*\s[5-6]$/.test(cronExpr)) return 'weekly';
  if (/\s1\s\*\s\*$/.test(cronExpr)) return 'monthly';
  if (/^\d+\s\d+\s\*\s\*\s\*$/.test(cronExpr)) return 'daily';
  if (/^\d+\s\d+(,\d+)*\s\*\s\*\s\*$/.test(cronExpr)) return 'daily';
  return 'daily';
}

function loadCronExpressions() {
  const map = new Map();
  try {
    const configPath = join(process.env.HOME || '/Users/benknight', 'Code', 'act-global-infrastructure', 'ecosystem.config.cjs');
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      const regex = /name:\s*'([^']+)'[\s\S]*?cron_restart:\s*'([^']+)'/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        map.set(match[1], match[2]);
      }
    }
  } catch {
    // ignore
  }
  return map;
}

function getRecentErrors(name) {
  try {
    const logPath = `/tmp/${name}-error.log`;
    if (!existsSync(logPath)) return [];
    const content = readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    return lines.slice(-3);
  } catch {
    return [];
  }
}

async function main() {
  let raw;
  try {
    raw = execSync('pm2 jlist', { timeout: 10000, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch (err) {
    console.error('Failed to run pm2 jlist:', err.message);
    process.exit(1);
  }

  const processes = JSON.parse(raw);
  const cronExprs = loadCronExpressions();

  const rows = processes
    .filter(p => !DEV_SERVERS.has(p.name))
    .map(p => {
      const status = p.pm2_env?.status === 'online' ? 'online'
        : p.pm2_env?.status === 'errored' ? 'errored'
        : 'stopped';

      const cronExpr = cronExprs.get(p.name) || '';
      const frequency = cronExpr ? categorizeFrequency(cronExpr) : 'daily';

      return {
        name: p.name,
        status,
        restarts: p.pm2_env?.restart_time || 0,
        memory_bytes: p.monit?.memory || 0,
        uptime_ms: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
        frequency,
        cron_expression: cronExpr || null,
        recent_errors: status === 'errored' ? getRecentErrors(p.name) : [],
        updated_at: new Date().toISOString(),
      };
    });

  if (rows.length === 0) {
    console.log('No cron processes found');
    return;
  }

  const { error } = await supabase
    .from('pm2_cron_status')
    .upsert(rows, { onConflict: 'name' });

  if (error) {
    console.error('Supabase upsert error:', error.message);
    process.exit(1);
  }

  const online = rows.filter(r => r.status === 'online').length;
  const stopped = rows.filter(r => r.status === 'stopped').length;
  const errored = rows.filter(r => r.status === 'errored').length;
  console.log(`Synced ${rows.length} processes: ${online} online, ${stopped} stopped, ${errored} errored`);
}

main();
