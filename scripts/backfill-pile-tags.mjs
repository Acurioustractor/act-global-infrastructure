#!/usr/bin/env node
/**
 * Backfill pile tags onto opportunity tables.
 *
 * Tables: ghl_opportunities, grant_opportunities
 * Source of truth: config/pile-mapping.json
 *
 * Logic per row:
 *   1. If row already has pile and we're not in --force mode, skip.
 *   2. Resolve project_code → pile via canonical map.
 *      For grant_opportunities, also check aligned_projects[] array.
 *   3. Special case: if grant has foundation_id (it's a grant), pile defaults to Grants.
 *   4. Write pile back to the row.
 *
 * Usage:
 *   node scripts/backfill-pile-tags.mjs              # incremental (only un-tagged rows)
 *   node scripts/backfill-pile-tags.mjs --force      # re-tag everything
 *   node scripts/backfill-pile-tags.mjs --dry-run    # preview
 *   node scripts/backfill-pile-tags.mjs --table ghl  # only ghl_opportunities
 *   node scripts/backfill-pile-tags.mjs --table grants # only grant_opportunities
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');
const tableArg = args.find(a => a.startsWith('--table'));
const TABLES_TO_RUN = tableArg
  ? [tableArg.split(/[ =]/)[1]]
  : ['ghl', 'grants'];

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PILE_CONFIG = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'pile-mapping.json'), 'utf-8'));
const PILE_BY_PROJECT = PILE_CONFIG.projects;

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

function pileForProject(projectCode) {
  if (!projectCode) return null;
  return PILE_BY_PROJECT[projectCode] || null;
}

function pileForGhl(row) {
  // PRIORITY 1: pipeline_name. The Grants pipeline is grants regardless of which
  // project the grant funds — pile follows the funding mechanism, not the project.
  const pipeline = (row.pipeline_name || '').toLowerCase();
  if (pipeline.includes('grant')) return 'Grants';
  if (pipeline.includes('goods')) return 'Flow';
  if (pipeline.includes('empathy ledger')) return 'Voice';
  if (pipeline.includes('festival')) return 'Voice';
  if (pipeline.includes('mukurtu')) return 'Other';
  if (pipeline.includes('act events')) return 'Other'; // event invitations, not $ deals

  // PRIORITY 2: project_code (for non-grants/non-special pipelines like A Curious Tractor)
  if (row.project_code) {
    const p = pileForProject(row.project_code);
    if (p) return p;
  }

  // PRIORITY 3: name-pattern heuristics for the A Curious Tractor pipeline
  const name = (row.name || '').toLowerCase();
  if (name.includes('mounty yarns backyard') || name.includes('mounty yarns gather')) return 'Voice';
  if (name.includes('contained rental') || name.includes('contained tour')) return 'Flow';
  if (name.includes('caravan') && name.includes('retreat')) return 'Ground';
  if (name.includes('cc retreat')) return 'Ground';

  return 'Uncoded';
}

function pileForGrant(row) {
  // Grant opportunities: every grant goes to Grants pile by definition (it's a grant).
  // But aligned_projects[] tells us which sub-pile this grant maps to for project work.
  // Decision: pile = 'Grants' (the income pile). Sub-pile alignment lives in aligned_projects.
  if (row.foundation_id) return 'Grants';
  // Fallback for non-foundation grants: still classify as Grants if pipeline_stage exists
  if (row.pipeline_stage) return 'Grants';
  // Try aligned_projects
  if (Array.isArray(row.aligned_projects) && row.aligned_projects.length > 0) {
    for (const code of row.aligned_projects) {
      const p = pileForProject(code);
      if (p) return p;
    }
  }
  return 'Grants'; // default for grant_opportunities table
}

async function backfillTable({ table, computePile, primaryKey }) {
  log(`\n=== ${table} ===`);

  const fromCol = table === 'ghl_opportunities'
    ? 'id, name, project_code, pipeline_name, pile'
    : 'id, foundation_id, pipeline_stage, aligned_projects, pile';

  let from = 0;
  const pageSize = 1000;
  const updates = {};
  const counts = { Voice: 0, Flow: 0, Ground: 0, Grants: 0, Other: 0, Uncoded: 0 };
  let processed = 0;
  let skipped = 0;

  while (true) {
    let q = supabase.from(table).select(fromCol).range(from, from + pageSize - 1);
    if (!FORCE) q = q.is('pile', null);
    const { data: page, error } = await q;
    if (error) throw error;
    if (!page || page.length === 0) break;

    for (const row of page) {
      processed += 1;
      if (!FORCE && row.pile) { skipped += 1; continue; }
      const pile = computePile(row);
      if (!pile) { skipped += 1; continue; }
      counts[pile] = (counts[pile] || 0) + 1;
      if (!updates[pile]) updates[pile] = [];
      updates[pile].push(row[primaryKey]);
    }

    if (page.length < pageSize) break;
    from += pageSize;
  }

  log(`  scanned: ${processed}, skipped: ${skipped}`);
  for (const [pile, count] of Object.entries(counts)) {
    if (count > 0) log(`  ${pile}: ${count} rows`);
  }

  if (DRY_RUN) {
    log('  [DRY RUN] no writes');
    return;
  }

  for (const [pile, ids] of Object.entries(updates)) {
    if (!ids || ids.length === 0) continue;
    // Update in batches of 500 ids per IN-clause
    const batchSize = 500;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const { error } = await supabase
        .from(table)
        .update({ pile })
        .in(primaryKey, batch);
      if (error) {
        log(`  ❌ failed batch (${pile}): ${error.message}`);
      }
    }
  }
  log(`  ✅ wrote pile tags to ${table}`);
}

async function main() {
  log('=== Pile-tag backfill ===');
  if (FORCE) log('FORCE mode: re-tagging all rows');
  if (DRY_RUN) log('DRY RUN mode: no writes');

  if (TABLES_TO_RUN.includes('ghl')) {
    await backfillTable({ table: 'ghl_opportunities', computePile: pileForGhl, primaryKey: 'id' });
  }
  if (TABLES_TO_RUN.includes('grants')) {
    await backfillTable({ table: 'grant_opportunities', computePile: pileForGrant, primaryKey: 'id' });
  }

  log('\nDone.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
