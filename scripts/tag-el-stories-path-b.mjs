#!/usr/bin/env node
/**
 * Path B story tagger — for stories without stories.project_id.
 *
 * Bridges via the storyteller's project membership:
 *   story.storyteller_id → project_storytellers.project_id → projects.slug
 *     → act_projects.id  (via slug match) → story_project_tags
 *
 * Distinct from Path A (deterministic project_id walk, tag_source='manual').
 * Path B is a transitive link — uses tag_source='ai_suggested'. Sets
 * act_approved=true ONLY when project_storytellers.status='active' (explicit
 * EL-side link). For status='draft', leaves act_approved=false for review.
 *
 * Skips story+project pairs already tagged.
 *
 * Usage:
 *   node scripts/tag-el-stories-path-b.mjs           # dry-run
 *   node scripts/tag-el-stories-path-b.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));
const APPLY = process.argv.includes('--apply');

const el = createClient(process.env.EL_SUPABASE_URL, process.env.EL_SUPABASE_SERVICE_KEY);

console.log(`tag-el-stories-path-b — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

const { data: ap } = await el.from('act_projects').select('id, slug, act_project_code');
const apBySlug = new Map(ap.map(x => [x.slug, x]));

const { data: projs } = await el.from('projects').select('id, slug, act_project_code').not('act_project_code', 'is', null);
// project.id → { code, act_project_id }
const projInfoById = new Map();
for (const p of projs) {
  const a = apBySlug.get(p.slug);
  if (a) projInfoById.set(p.id, { code: p.act_project_code, act_project_id: a.id });
}
console.log(`projects → act_projects bridge: ${projInfoById.size}`);

const { data: ps } = await el.from('project_storytellers').select('storyteller_id, project_id, status');
// storyteller_id → [{ act_project_id, code, status }]
const stMembership = new Map();
for (const r of ps) {
  const info = projInfoById.get(r.project_id);
  if (!info) continue;
  if (!stMembership.has(r.storyteller_id)) stMembership.set(r.storyteller_id, []);
  stMembership.get(r.storyteller_id).push({ ...info, status: r.status });
}
console.log(`storytellers with bridged project membership: ${stMembership.size}`);

// Stories with no project_id but with storyteller_id
const stories = [];
let offset = 0;
while (true) {
  const { data, error } = await el.from('stories').select('id, storyteller_id, project_id, title').is('project_id', null).not('storyteller_id', 'is', null).range(offset, offset + 999);
  if (error) throw error;
  if (!data?.length) break;
  stories.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}
console.log(`candidate stories (no project_id, has storyteller_id): ${stories.length}`);

// Existing tags — avoid dup story+project_id pairs
const { data: existing } = await el.from('story_project_tags').select('story_id, act_project_id');
const existingKey = new Set((existing || []).map(x => `${x.story_id}|${x.act_project_id}`));

const proposed = [];
const distribution = new Map();
for (const s of stories) {
  const memberships = stMembership.get(s.storyteller_id) || [];
  for (const m of memberships) {
    const key = `${s.id}|${m.act_project_id}`;
    if (existingKey.has(key)) continue;
    proposed.push({
      story_id: s.id,
      act_project_id: m.act_project_id,
      tag_source: 'ai_suggested',
      storyteller_approved: false,
      act_approved: m.status === 'active',
      ai_reasoning: `Path B 2026-05-15: story has no project_id, but storyteller is member (status=${m.status}) of project with act_project_code=${m.code}`,
    });
    distribution.set(m.code, (distribution.get(m.code) || 0) + 1);
  }
}

console.log(`\nproposed new tag rows: ${proposed.length}`);
console.log(`stories touched: ${new Set(proposed.map(p => p.story_id)).size}`);
console.log(`distribution by code:`);
for (const [c, n] of [...distribution.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(4)}  ${c}`);
}

if (!APPLY) {
  console.log('\nRe-run with --apply.');
  process.exit(0);
}

let inserted = 0;
for (let i = 0; i < proposed.length; i += 25) {
  const batch = proposed.slice(i, i + 25);
  const { data, error } = await el.from('story_project_tags').insert(batch).select('id');
  if (error) { console.error(`batch ${i / 25}: ${error.message}`); continue; }
  inserted += data.length;
  console.log(`  batch ${i / 25}: ${data.length}`);
}
console.log(`\n─── results ───`);
console.log(`inserted: ${inserted} / ${proposed.length}`);
