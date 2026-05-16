#!/usr/bin/env node
/**
 * Tag EL v2 stories with ACT project codes via story_project_tags.
 *
 * Path A — deterministic: stories.project_id → projects.slug → act_projects.slug.
 * For each story with a project_id that bridges to an act_projects row, insert
 * a story_project_tags row with:
 *   - act_approved = true  (ACT side already approved via the existing link)
 *   - storyteller_approved = false (storyteller hasn't yet seen Notion-facing tag)
 *   - tag_source = 'auto-from-project-link-2026-05-15'
 *   - relevance_score = 1.0 (full link, not inferred)
 *
 * Skips stories that already have a tag for the same act_project_id.
 *
 * Usage:
 *   node scripts/tag-el-stories-to-projects.mjs           # dry-run
 *   node scripts/tag-el-stories-to-projects.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const el = createClient(process.env.EL_SUPABASE_URL, process.env.EL_SUPABASE_SERVICE_KEY);

console.log(`tag-el-stories-to-projects — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

// 1) Build slug → act_projects.id map
const { data: ap } = await el.from('act_projects').select('id, slug, title, act_project_code');
const apBySlug = new Map(ap.map(x => [x.slug, x]));
console.log(`act_projects: ${ap.length}`);

// 2) Build projects.id → { slug, code } map (only those with act_project_code)
const { data: projs } = await el.from('projects').select('id, slug, act_project_code').not('act_project_code', 'is', null);
const projInfo = new Map(projs.map(x => [x.id, x]));
console.log(`projects with code: ${projs.length}`);

// 3) Fetch all stories with project_id
const stories = [];
let offset = 0;
while (true) {
  const { data, error } = await el.from('stories').select('id, project_id, title').not('project_id', 'is', null).range(offset, offset + 999);
  if (error) throw error;
  if (!data?.length) break;
  stories.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}
console.log(`stories with project_id: ${stories.length}`);

// 4) Resolve each story → act_projects.id (bridge via project slug)
const proposed = [];
const skipped = { no_project_info: 0, no_act_match: 0 };
for (const s of stories) {
  const info = projInfo.get(s.project_id);
  if (!info) { skipped.no_project_info++; continue; }
  const ap = apBySlug.get(info.slug);
  if (!ap) { skipped.no_act_match++; continue; }
  proposed.push({ story_id: s.id, story_title: s.title, act_project_id: ap.id, act_project_code: ap.act_project_code, act_project_title: ap.title });
}

console.log(`\nProposed tags: ${proposed.length}`);
console.log(`  skipped (no project_info): ${skipped.no_project_info}`);
console.log(`  skipped (no act match):    ${skipped.no_act_match}`);

// Distribution by ACT code
const distribution = new Map();
for (const p of proposed) distribution.set(p.act_project_code, (distribution.get(p.act_project_code) || 0) + 1);
console.log(`\nDistribution by ACT code:`);
for (const [code, n] of [...distribution.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(4)}  ${code}`);
}

// 5) Avoid duplicate inserts: fetch existing tags
const { data: existing } = await el.from('story_project_tags').select('story_id, act_project_id');
const existingKey = new Set((existing || []).map(x => `${x.story_id}|${x.act_project_id}`));
const fresh = proposed.filter(p => !existingKey.has(`${p.story_id}|${p.act_project_id}`));
console.log(`\nNew (no existing tag): ${fresh.length} / ${proposed.length}`);

if (!APPLY) {
  console.log(`\nRe-run with --apply to write tags.`);
  process.exit(0);
}

const rows = fresh.map(p => ({
  story_id: p.story_id,
  act_project_id: p.act_project_id,
  tag_source: 'manual',
  storyteller_approved: false,
  act_approved: true,
  relevance_score: 1.0,
  ai_reasoning: 'Auto-from-project-link 2026-05-15: stories.project_id → projects.slug → act_projects.slug deterministic walk',
}));

let inserted = 0;
for (let i = 0; i < rows.length; i += 25) {
  const batch = rows.slice(i, i + 25);
  const { data, error } = await el.from('story_project_tags').insert(batch).select('id');
  if (error) {
    console.error(`  batch ${i / 25} err: ${error.message}`);
    continue;
  }
  inserted += data.length;
  console.log(`  batch ${i / 25}: inserted ${data.length}`);
}

console.log(`\n─── results ───`);
console.log(`inserted: ${inserted} / ${rows.length}`);
