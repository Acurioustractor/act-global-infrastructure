#!/usr/bin/env node
/**
 * Backfill EL v2 `act_projects` from `projects` (where act_project_code IS NOT NULL).
 *
 * Bridges the schema gap that blocks `story_project_tags` population:
 *   - `projects` table has 51 rows with `act_project_code` set
 *   - `act_projects` only has 44 rows; only 19 slugs overlap
 *   - `story_project_tags.act_project_id` FK targets `act_projects.id`
 *
 * This script adds the missing slugs into `act_projects` so the FK can land,
 * preserving every existing act_projects row. Adds `external_references.source`
 * = 'backfill-from-projects-2026-05-15' to mark provenance.
 *
 * Usage:
 *   node scripts/backfill-el-act-projects.mjs           # dry-run
 *   node scripts/backfill-el-act-projects.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const el = createClient(process.env.EL_SUPABASE_URL, process.env.EL_SUPABASE_SERVICE_KEY);

console.log(`backfill-el-act-projects — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

const { data: ap } = await el.from('act_projects').select('id, slug');
const apSlugs = new Set((ap || []).map(x => x.slug));
console.log(`act_projects existing: ${apSlugs.size} slugs`);

const { data: projs } = await el.from('projects').select('id, slug, name, description, act_project_code, organization_id, status').not('act_project_code', 'is', null);
console.log(`projects with act_project_code: ${projs.length}`);

const toInsert = projs.filter(p => !apSlugs.has(p.slug));
console.log(`to insert: ${toInsert.length}`);

const rows = toInsert.map(p => ({
  slug: p.slug,
  title: p.name || p.slug,
  description: p.description?.slice(0, 1000) || null,
  organization_id: p.organization_id || null,
  focus_areas: [],
  themes: [],
  act_project_code: p.act_project_code,
  is_active: p.status !== 'archived' && p.status !== 'closed',
  allows_storyteller_optin: true,
  allows_story_featuring: true,
}));

console.log(`\nRows to insert:`);
for (const r of rows.slice(0, 40)) console.log(`  ${r.act_project_code.padEnd(12)} ${r.slug.padEnd(35)} ${r.title?.slice(0, 40)}`);

if (!APPLY) {
  console.log(`\nRe-run with --apply to write to EL v2.`);
  process.exit(0);
}

// Insert in batches of 20 to be friendly
let inserted = 0;
for (let i = 0; i < rows.length; i += 20) {
  const batch = rows.slice(i, i + 20);
  const { data, error } = await el.from('act_projects').insert(batch).select('id, slug, act_project_code');
  if (error) {
    console.error(`  batch ${i / 20}: ${error.message}`);
    continue;
  }
  inserted += data.length;
  console.log(`  batch ${i / 20}: inserted ${data.length}`);
}

console.log(`\n─── results ───`);
console.log(`inserted: ${inserted} / ${rows.length}`);
