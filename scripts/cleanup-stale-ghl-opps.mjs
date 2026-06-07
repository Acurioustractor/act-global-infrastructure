#!/usr/bin/env node
/**
 * Cleanup stale + past-deadline GHL opportunities
 *
 * Two cleanup categories:
 *   1. PAST-DEADLINE: GHL grant opps linked to a grant_opportunities row whose
 *      deadline has passed. These can't be applied for anymore — should be lost.
 *   2. STALE: GHL opps with no stage change in 90+ days, no matching deadline.
 *      These need user judgement (might be on hold, not dead). Listed for review,
 *      not auto-actioned.
 *
 * Default: dry-run (lists what would change).
 * --apply: marks past-deadline opps as status='lost' in GHL via API.
 *
 * NEVER auto-applies stale category — only the unambiguous past-deadline set.
 *
 * Usage:
 *   node scripts/cleanup-stale-ghl-opps.mjs              # dry-run, lists everything
 *   node scripts/cleanup-stale-ghl-opps.mjs --apply      # marks past-deadline as lost
 *   node scripts/cleanup-stale-ghl-opps.mjs --json       # machine-readable
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const JSON_OUT = args.includes('--json');

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const log = (m) => { if (!JSON_OUT) console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`); };
const fmt = (n) => n == null ? '-' : `$${Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

async function getPastDeadline() {
  const { data: links, error } = await supabase
    .from('grant_opportunities')
    .select('ghl_opportunity_id, deadline, name, amount_max')
    .not('ghl_opportunity_id', 'is', null)
    .not('deadline', 'is', null)
    .lt('deadline', new Date().toISOString().slice(0, 10));
  if (error) throw error;
  if (!links || links.length === 0) return [];
  const ghlIds = links.map(l => l.ghl_opportunity_id);
  const { data: opps } = await supabase
    .from('ghl_opportunities')
    .select('ghl_id, name, monetary_value, pipeline_name, stage_name, status')
    .in('ghl_id', ghlIds)
    .eq('status', 'open');
  const byGhlId = new Map((opps || []).map(o => [o.ghl_id, o]));
  return links
    .filter(l => byGhlId.has(l.ghl_opportunity_id))
    .map(l => ({ ...l, ghl: byGhlId.get(l.ghl_opportunity_id) }));
}

async function getEventInvitations() {
  // ACT Events pipeline rows are people-invitations with $0, not real opportunities.
  // Auto-archivable: clear category mismatch.
  const { data, error } = await supabase
    .from('ghl_opportunities')
    .select('ghl_id, name, monetary_value, pipeline_name, stage_name')
    .eq('status', 'open')
    .eq('pipeline_name', 'ACT Events');
  if (error) throw error;
  return data || [];
}

async function getStaleNoDeadline() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data, error } = await supabase
    .from('ghl_opportunities')
    .select('ghl_id, name, monetary_value, pipeline_name, stage_name, last_stage_change_at, pile, project_code')
    .eq('status', 'open')
    .lt('last_stage_change_at', ninetyDaysAgo)
    .order('last_stage_change_at', { ascending: true });
  if (error) throw error;
  // Exclude past-deadline ones (already in other category)
  const { data: pastDeadlineLinks } = await supabase
    .from('grant_opportunities')
    .select('ghl_opportunity_id')
    .not('ghl_opportunity_id', 'is', null)
    .not('deadline', 'is', null)
    .lt('deadline', new Date().toISOString().slice(0, 10));
  const excludeIds = new Set((pastDeadlineLinks || []).map(r => r.ghl_opportunity_id));
  return (data || []).filter(r => !excludeIds.has(r.ghl_id));
}

async function applyToGhl(ghlOpportunityId) {
  // Mark as lost via GHL API
  const url = `https://services.leadconnectorhq.com/opportunities/${ghlOpportunityId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.GHL_PRIVATE_INTEGRATION_TOKEN || process.env.GHL_API_KEY}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: JSON.stringify({ status: 'lost' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL API ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function main() {
  const [pastDeadline, eventInvites, stale] = await Promise.all([
    getPastDeadline(),
    getEventInvitations(),
    getStaleNoDeadline(),
  ]);

  if (JSON_OUT) {
    console.log(JSON.stringify({ pastDeadline, eventInvites, stale }, null, 2));
    return;
  }

  log('=== GHL cleanup ===');
  log(APPLY ? 'APPLY MODE — will mark past-deadline + event-invites as lost in GHL' : 'DRY RUN — pass --apply to action');

  log(`\n--- Category 1: PAST-DEADLINE GRANTS (auto-actionable) ---`);
  log(`${pastDeadline.length} GHL opportunities`);
  let pastValue = 0;
  for (const r of pastDeadline) {
    pastValue += Number(r.ghl?.monetary_value || 0);
    const overdue = Math.floor((new Date() - new Date(r.deadline)) / 86400000);
    log(`  ${fmt(r.ghl?.monetary_value).padEnd(12)} · ${r.name?.slice(0, 50).padEnd(50)} · ${overdue}d overdue · ${r.ghl?.stage_name || ''}`);
  }
  log(`  TOTAL: ${fmt(pastValue)}`);

  log(`\n--- Category 1b: ACT EVENTS pipeline cleanup (auto-actionable) ---`);
  log(`${eventInvites.length} GHL opportunities (event invitations, not deals)`);
  for (const r of eventInvites.slice(0, 5)) {
    log(`  $0           · ${(r.name || 'unnamed').slice(0, 50).padEnd(50)} · stage ${r.stage_name}`);
  }
  if (eventInvites.length > 5) log(`  (... ${eventInvites.length - 5} more)`);

  log(`\n--- Category 2: STALE >90d (manual review needed) ---`);
  log(`${stale.length} GHL opportunities`);
  let staleValue = 0;
  for (const r of stale.slice(0, 15)) {
    staleValue += Number(r.monetary_value || 0);
    const ageDays = Math.floor((new Date() - new Date(r.last_stage_change_at)) / 86400000);
    log(`  ${fmt(r.monetary_value).padEnd(12)} · ${(r.name || 'unnamed').slice(0, 45).padEnd(45)} · ${ageDays}d stale · ${r.pipeline_name || ''} · ${r.pile}`);
  }
  if (stale.length > 15) log(`  (... ${stale.length - 15} more — see Notion or run --json)`);
  log(`  TOTAL: ${fmt(stale.reduce((s, r) => s + Number(r.monetary_value || 0), 0))}`);

  if (APPLY) {
    log(`\nApplying lost-status to ${pastDeadline.length} past-deadline opps in GHL...`);
    let ok = 0, err = 0;
    for (const r of pastDeadline) {
      try {
        await applyToGhl(r.ghl_opportunity_id);
        ok++;
      } catch (e) {
        log(`  ERROR ${r.ghl?.name}: ${e.message}`);
        err++;
      }
    }
    log(`  ${ok} ok, ${err} errors`);

    log(`\nApplying lost-status to ${eventInvites.length} ACT Events invitations in GHL...`);
    let okE = 0, errE = 0;
    for (const r of eventInvites) {
      try {
        await applyToGhl(r.ghl_id);
        okE++;
      } catch (e) {
        log(`  ERROR ${r.name}: ${e.message}`);
        errE++;
      }
    }
    log(`  ${okE} ok, ${errE} errors`);
    log(`\nRun \`node scripts/sync-ghl-to-supabase.mjs\` to refresh.`);
  } else {
    log(`\nTo apply: node scripts/cleanup-stale-ghl-opps.mjs --apply`);
    log('Stale items NEVER auto-actioned — review in GHL or Notion individually.');
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
