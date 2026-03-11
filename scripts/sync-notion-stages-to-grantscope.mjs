#!/usr/bin/env node

/**
 * Sync Notion Grant Pipeline Stages → GrantScope
 *
 * Reverse sync: reads stage changes from Notion's Grant Pipeline Tracker
 * and pushes them back to GrantScope's pipeline_stage column. Also syncs
 * action completion status as metadata.
 *
 * GrantScope owns grant data (description, eligibility, amounts).
 * Notion owns workflow data (stage progression, actions, notes).
 * This script syncs the workflow decisions back to GrantScope.
 *
 * Flow:
 *   1. Fetch all Grant Pipeline Tracker pages from Notion (with GrantScope IDs)
 *   2. Fetch current pipeline_stage from GrantScope for those grants
 *   3. Compare stages — if Notion differs, update GrantScope
 *   4. Sync action completion status for grants with gate actions
 *
 * Usage:
 *   node scripts/sync-notion-stages-to-grantscope.mjs              # Full sync
 *   node scripts/sync-notion-stages-to-grantscope.mjs --dry-run     # Preview only
 *   node scripts/sync-notion-stages-to-grantscope.mjs --verbose      # Detailed logging
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { queryDatabase as queryNotionDb } from './lib/notion-datasource.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
await import(join(__dirname, '../lib/load-env.mjs'));

// ── CLI flags ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

function log(...a) { console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a); }
function verbose(...a) { if (VERBOSE || DRY_RUN) log(...a); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Notion database IDs ──────────────────────────────────────────────

const configPath = join(__dirname, '../config/notion-database-ids.json');
const dbIds = JSON.parse(readFileSync(configPath, 'utf8'));

const GRANT_PIPELINE_DB = dbIds.grantPipeline;
const ACTIONS_DB = dbIds.actions;

// ── Clients ──────────────────────────────────────────────────────────

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const gsUrl = process.env.GRANTSCOPE_SUPABASE_URL;
const gsKey = process.env.GRANTSCOPE_SUPABASE_KEY;

if (!gsUrl || !gsKey) {
  console.error('Missing GRANTSCOPE_SUPABASE_URL or GRANTSCOPE_SUPABASE_KEY in .env.local');
  process.exit(1);
}

const gsSupabase = createClient(gsUrl, gsKey);

// ── Stage mapping: Notion → GrantScope ───────────────────────────────
// Notion stages that don't map get ignored (no GrantScope update)

const NOTION_TO_GS_STAGE = {
  'Identified':   'discovered',
  'Researching':  'researching',
  'Pursuing':     'researching',   // No 'pursuing' in GS constraint — map to researching
  'Drafting':     'drafting',
  'Submitted':    'submitted',
  'Negotiating':  'submitted',     // Post-submission — keep as submitted in GS
  'Approved':     'awarded',
  'Lost':         'declined',
  'Expired':      'archived',
};

// ── Notion helpers ───────────────────────────────────────────────────

async function queryAllPages(databaseId, filter) {
  const pages = [];
  let cursor;

  do {
    const params = { page_size: 100 };
    if (filter) params.filter = filter;
    if (cursor) params.start_cursor = cursor;

    const response = await queryNotionDb(notion, databaseId, params);
    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
    if (cursor) await sleep(350);
  } while (cursor);

  return pages;
}

function getRichText(page, propName) {
  const prop = page.properties?.[propName];
  if (!prop) return '';
  if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '';
  if (prop.type === 'title') return prop.title?.[0]?.plain_text || '';
  return '';
}

function getSelect(page, propName) {
  const prop = page.properties?.[propName];
  if (!prop) return '';
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'status') return prop.status?.name || '';
  return '';
}

// ── Phase 1: Fetch Notion pages with GrantScope IDs ──────────────────

async function fetchNotionGrants() {
  log('Phase 1: Fetching Grant Pipeline Tracker pages from Notion...');

  const pages = await queryAllPages(GRANT_PIPELINE_DB);
  log(`  Found ${pages.length} total pages`);

  // Extract pages that have GrantScope IDs (synced from GS)
  const grants = [];
  for (const page of pages) {
    const notes = getRichText(page, 'Notes');
    const match = notes.match(/\[gs:([a-f0-9-]+)\]/);
    if (!match) continue;

    const gsId = match[1];
    const notionStage = getSelect(page, 'Stage');
    const grantName = getRichText(page, 'Grant Name');
    const notionNotes = notes.replace(/\[gs:[a-f0-9-]+\]\s*/, '').trim();

    grants.push({
      gsId,
      notionPageId: page.id,
      notionStage,
      grantName,
      notionNotes,
      lastEdited: page.last_edited_time,
    });
  }

  log(`  ${grants.length} pages have GrantScope IDs`);
  return grants;
}

// ── Phase 2: Compare and sync stages ─────────────────────────────────

async function syncStages(notionGrants) {
  log('Phase 2: Comparing stages with GrantScope...');

  if (notionGrants.length === 0) {
    log('  No synced grants found — nothing to do');
    return { updated: 0, skipped: 0 };
  }

  // Fetch current GrantScope stages for all synced grants
  const gsIds = notionGrants.map(g => g.gsId);
  const { data: gsGrants, error } = await gsSupabase
    .from('grant_opportunities')
    .select('id, pipeline_stage, name')
    .in('id', gsIds);

  if (error) {
    console.error('Error fetching GrantScope grants:', error.message);
    return { updated: 0, skipped: 0 };
  }

  const gsMap = new Map(gsGrants.map(g => [g.id, g]));

  let updated = 0;
  let skipped = 0;

  for (const ng of notionGrants) {
    const gsGrant = gsMap.get(ng.gsId);
    if (!gsGrant) {
      verbose(`  Skipped: ${ng.grantName} — not found in GrantScope`);
      skipped++;
      continue;
    }

    const targetStage = NOTION_TO_GS_STAGE[ng.notionStage];
    if (!targetStage) {
      verbose(`  Skipped: ${ng.grantName} — unknown Notion stage "${ng.notionStage}"`);
      skipped++;
      continue;
    }

    if (gsGrant.pipeline_stage === targetStage) {
      verbose(`  No change: ${ng.grantName} — already "${targetStage}"`);
      skipped++;
      continue;
    }

    // Stage differs — update GrantScope
    if (DRY_RUN) {
      log(`  Would update: ${ng.grantName} — "${gsGrant.pipeline_stage}" → "${targetStage}"`);
      updated++;
      continue;
    }

    const { error: updateErr } = await gsSupabase
      .from('grant_opportunities')
      .update({ pipeline_stage: targetStage })
      .eq('id', ng.gsId);

    if (updateErr) {
      log(`  Error updating ${ng.grantName}: ${updateErr.message}`);
    } else {
      log(`  Updated: ${ng.grantName} — "${gsGrant.pipeline_stage}" → "${targetStage}"`);
      updated++;
    }
  }

  return { updated, skipped };
}

// ── Phase 3: Sync action completion status ───────────────────────────

async function syncActionStatus(notionGrants) {
  log('Phase 3: Syncing action completion status...');

  // Fetch all [Grant] actions
  const pages = await queryAllPages(ACTIONS_DB, {
    property: 'Type',
    select: { equals: 'Grant' },
  });

  // Group actions by grant name (extract from "[Grant] G1: ... — Grant Name")
  const actionsByGrant = new Map();
  for (const page of pages) {
    const title = getRichText(page, 'Action Item');
    if (!title.startsWith('[Grant]')) continue;

    const dashIdx = title.lastIndexOf(' — ');
    if (dashIdx === -1) continue;

    const grantName = title.slice(dashIdx + 3);
    const status = getSelect(page, 'Status');

    if (!actionsByGrant.has(grantName)) {
      actionsByGrant.set(grantName, { total: 0, done: 0, inProgress: 0 });
    }
    const stats = actionsByGrant.get(grantName);
    stats.total++;
    if (status === 'Done') stats.done++;
    if (status === 'In progress' || status === 'Please water') stats.inProgress++;
  }

  verbose(`  Tracking actions for ${actionsByGrant.size} grants`);

  let updated = 0;

  for (const ng of notionGrants) {
    const stats = actionsByGrant.get(ng.grantName);
    if (!stats) continue;

    const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    verbose(`  ${ng.grantName}: ${stats.done}/${stats.total} gates complete (${pct}%)`);

    if (DRY_RUN) {
      if (stats.done > 0) {
        log(`  Would update metadata: ${ng.grantName} — gates ${stats.done}/${stats.total} (${pct}%)`);
        updated++;
      }
      continue;
    }

    // Store gate progress in GrantScope metadata
    const { error } = await gsSupabase
      .from('grant_opportunities')
      .update({
        metadata: {
          notion_gates_total: stats.total,
          notion_gates_done: stats.done,
          notion_gates_pct: pct,
          notion_last_synced: new Date().toISOString(),
        },
      })
      .eq('id', ng.gsId);

    if (error) {
      verbose(`  Error updating metadata for ${ng.grantName}: ${error.message}`);
    } else {
      updated++;
    }
  }

  return { updated };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  log('=== Notion → GrantScope Stage Sync ===');
  if (DRY_RUN) log('DRY RUN MODE — no changes will be made');

  // Phase 1: Get Notion grants with GS IDs
  const notionGrants = await fetchNotionGrants();

  if (notionGrants.length === 0) {
    log('No grants with GrantScope IDs found in Notion. Run sync-grantscope-to-notion.mjs first.');
    return;
  }

  // Phase 2: Sync stages
  const stageResult = await syncStages(notionGrants);

  // Phase 3: Sync action completion
  const actionResult = await syncActionStatus(notionGrants);

  // Summary
  log('\n=== Sync Complete ===');
  log(`Grants checked: ${notionGrants.length}`);
  log(`Stage changes: ${stageResult.updated} updated, ${stageResult.skipped} unchanged`);
  log(`Action metadata: ${actionResult.updated} updated`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
