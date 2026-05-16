#!/usr/bin/env node
/**
 * Resolve 141 ambiguous phantom storyteller matches.
 *
 * For each contact with auto_created_from = 'el-ambiguous:id1,id2,...':
 *   1. Query EL v2 for stories per profile_id
 *   2. Pick the profile with most stories (tiebreak: lowest id)
 *   3. Backfill empathy_ledger_id + is_storyteller=true
 *   4. Clear el-ambiguous flag
 *
 * Usage:
 *   node scripts/resolve-ambiguous-storytellers.mjs           # dry-run
 *   node scripts/resolve-ambiguous-storytellers.mjs --apply
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const OP_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const OP_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const op = createClient(OP_URL, OP_KEY);

const EL_ENV_PATH = join(process.env.HOME, 'Code/empathy-ledger-v2/.env.local');
try {
  const elEnv = readFileSync(EL_ENV_PATH, 'utf8');
  for (const line of elEnv.split('\n')) {
    const [k, ...r] = line.split('=');
    if (k && r.length) process.env[`EL_${k}`] = r.join('=').trim();
  }
} catch {}
const EL_URL = process.env.EL_NEXT_PUBLIC_SUPABASE_URL || 'https://yvnuayzslukamizrlhwb.supabase.co';
const EL_KEY = process.env.EL_SUPABASE_SERVICE_ROLE_KEY;

async function elFetch(path) {
  const r = await fetch(`${EL_URL}/rest/v1/${path}`, {
    headers: { apikey: EL_KEY, Authorization: `Bearer ${EL_KEY}` }
  });
  if (!r.ok) throw new Error(`EL ${path}: ${r.status}`);
  return r.json();
}

const { data: ambiguous, error } = await op
  .from('ghl_contacts')
  .select('id, ghl_id, full_name, auto_created_from')
  .like('auto_created_from', 'el-ambiguous:%');
if (error) throw error;

console.log(`${ambiguous.length} ambiguous contacts to resolve`);

// Collect unique profile IDs to query story counts
const allProfileIds = new Set();
for (const c of ambiguous) {
  const ids = c.auto_created_from.replace('el-ambiguous:', '').split(',');
  for (const id of ids) allProfileIds.add(id);
}
console.log(`Querying story counts for ${allProfileIds.size} EL profiles`);

// Story count per author/storyteller
const storyCount = new Map();
for (const id of allProfileIds) {
  storyCount.set(id, 0);
}
// Stories by author_id
let offset = 0;
while (true) {
  const ids = [...allProfileIds].slice(offset, offset + 50);
  if (ids.length === 0) break;
  const inList = ids.map(i => `"${i}"`).join(',');
  const stories = await elFetch(`stories?author_id=in.(${inList})&select=author_id&limit=10000`);
  for (const s of stories) {
    if (storyCount.has(s.author_id)) {
      storyCount.set(s.author_id, storyCount.get(s.author_id) + 1);
    }
  }
  // Also storyteller_id
  const stories2 = await elFetch(`stories?storyteller_id=in.(${inList})&select=storyteller_id&limit=10000`);
  for (const s of stories2) {
    if (storyCount.has(s.storyteller_id)) {
      storyCount.set(s.storyteller_id, storyCount.get(s.storyteller_id) + 1);
    }
  }
  offset += 50;
}

let toUpdate = 0;
const examples = [];
for (const c of ambiguous) {
  const candidateIds = c.auto_created_from.replace('el-ambiguous:', '').split(',');
  // Sort by story count DESC, then by lowest id (deterministic)
  const sorted = candidateIds.sort((a, b) => {
    const ca = storyCount.get(a) || 0;
    const cb = storyCount.get(b) || 0;
    if (cb !== ca) return cb - ca;
    return a < b ? -1 : 1;
  });
  c.winner = sorted[0];
  c.winner_stories = storyCount.get(sorted[0]) || 0;
  c.all_scores = sorted.map(id => `${id.slice(0,8)}:${storyCount.get(id) || 0}`).join(' ');
  toUpdate++;
  if (examples.length < 10) examples.push(c);
}

console.log(`\n─── examples ───`);
for (const e of examples) {
  console.log(`  ${(e.full_name || '?').padEnd(28)} → ${e.winner.slice(0,8)} (${e.winner_stories} stories)   [${e.all_scores}]`);
}

if (!APPLY) {
  console.log(`\nDry-run. ${toUpdate} contacts would be resolved.`);
  process.exit(0);
}

console.log(`\nApplying ${toUpdate} resolutions…`);
let updated = 0;
for (const c of ambiguous) {
  const { error } = await op.from('ghl_contacts').update({
    empathy_ledger_id: c.winner,
    is_storyteller: true,
    el_last_synced_at: new Date().toISOString(),
    auto_created_from: null,
    updated_at: new Date().toISOString()
  }).eq('id', c.id);
  if (!error) updated++;
}
console.log(`Updated: ${updated}`);
