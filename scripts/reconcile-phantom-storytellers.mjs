#!/usr/bin/env node
/**
 * Reconcile 2,387 GHL phantom storytellers against EL v2.
 *
 * Phantom = ghl_contacts tagged 'storyteller' but is_storyteller=false,
 *           with synthetic emails (.local / .temp).
 *
 * Strategy:
 *   1. Fetch all EL v2 profiles + storytellers (names + ids).
 *   2. For each phantom, match by normalised full_name.
 *   3. Match found → backfill empathy_ledger_id + is_storyteller=true (with --apply).
 *   4. No match → mark with auto_created_from='el-orphan' and report.
 *
 * Usage:
 *   node scripts/reconcile-phantom-storytellers.mjs            # dry-run
 *   node scripts/reconcile-phantom-storytellers.mjs --apply    # write Supabase
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const OP_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const OP_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!OP_URL || !OP_KEY) { console.error('Missing SUPABASE_* env'); process.exit(1); }
const op = createClient(OP_URL, OP_KEY);

// Load EL v2 env
const EL_ENV_PATH = join(process.env.HOME, 'Code/empathy-ledger-v2/.env.local');
try {
  const elEnv = readFileSync(EL_ENV_PATH, 'utf8');
  for (const line of elEnv.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0 && !process.env[`EL_${key}`]) {
      process.env[`EL_${key}`] = rest.join('=').trim();
    }
  }
} catch (e) {
  console.error('Could not read EL env:', e.message);
}
const EL_URL = process.env.EL_NEXT_PUBLIC_SUPABASE_URL || 'https://yvnuayzslukamizrlhwb.supabase.co';
const EL_KEY = process.env.EL_SUPABASE_SERVICE_ROLE_KEY;
if (!EL_KEY) { console.error('Missing EL_SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

async function elFetch(path) {
  const r = await fetch(`${EL_URL}/rest/v1/${path}`, {
    headers: { apikey: EL_KEY, Authorization: `Bearer ${EL_KEY}` }
  });
  if (!r.ok) throw new Error(`EL ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

// Page through to get all records (PostgREST default limit = 1000)
async function elFetchAll(table, select) {
  const out = [];
  let offset = 0;
  const page = 1000;
  while (true) {
    const rows = await elFetch(`${table}?select=${select}&limit=${page}&offset=${offset}&order=id.asc`);
    if (!rows.length) break;
    out.push(...rows);
    if (rows.length < page) break;
    offset += page;
  }
  return out;
}

function normaliseName(s) {
  if (!s) return null;
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/\b(dr|aunty|uncle|mr|mrs|ms|prof)\.?\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

console.log('Loading EL v2 profiles and storytellers…');
const profiles = await elFetchAll('profiles', 'id,full_name,display_name,email,is_storyteller');
const storytellers = await elFetchAll('storytellers', 'id,profile_id,display_name');
console.log(`  ${profiles.length} profiles, ${storytellers.length} storytellers`);

// Build name → profile_id index
const nameIndex = new Map();
const addToIndex = (name, profileId) => {
  const norm = normaliseName(name);
  if (!norm || norm.length < 3) return;
  if (!nameIndex.has(norm)) nameIndex.set(norm, new Set());
  nameIndex.get(norm).add(profileId);
};
for (const p of profiles) {
  addToIndex(p.full_name, p.id);
  addToIndex(p.display_name, p.id);
}
for (const s of storytellers) {
  addToIndex(s.display_name, s.profile_id || s.id);
}
console.log(`  ${nameIndex.size} unique normalised names indexed`);

// Pull phantom GHL contacts — paginated to bypass default 1000-row limit
console.log('\nLoading phantom GHL contacts (paginated)…');
async function fetchAllPhantoms() {
  const all = [];
  for (const pattern of ['%.local', '%.temp']) {
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await op
        .from('ghl_contacts')
        .select('id, ghl_id, full_name, email, empathy_ledger_id, is_storyteller, tags')
        .ilike('email', pattern)
        .is('empathy_ledger_id', null)
        .order('id')
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      offset += pageSize;
    }
  }
  return all;
}
const allPhantoms = await fetchAllPhantoms();
console.log(`  ${allPhantoms.length} synthetic-email contacts`);

// Match
const matches = [];
const ambiguous = [];
const orphans = [];
for (const p of allPhantoms) {
  const norm = normaliseName(p.full_name);
  if (!norm) { orphans.push({ ...p, reason: 'no_name' }); continue; }
  const candidates = nameIndex.get(norm);
  if (!candidates || candidates.size === 0) {
    orphans.push({ ...p, reason: 'no_match' });
  } else if (candidates.size === 1) {
    matches.push({ ...p, el_profile_id: [...candidates][0] });
  } else {
    ambiguous.push({ ...p, candidates: [...candidates] });
  }
}

console.log(`\n─── reconciliation results ───`);
console.log(`Total phantoms:    ${allPhantoms.length}`);
console.log(`Unique matches:    ${matches.length}`);
console.log(`Ambiguous (multi): ${ambiguous.length}`);
console.log(`Orphans (no EL):   ${orphans.length}`);

// Per-organisation breakdown not available without organization_id on profiles.
console.log(`\n─── sample matches ───`);
for (const m of matches.slice(0, 8)) {
  console.log(`  ${m.full_name.padEnd(35)} → EL profile ${m.el_profile_id}`);
}
console.log(`\n─── sample orphans (no EL match) ───`);
for (const o of orphans.slice(0, 8)) {
  console.log(`  ${(o.full_name || '(no name)').padEnd(35)} ${o.email}  reason=${o.reason}`);
}

if (!APPLY) {
  console.log('\nDry-run. Re-run with --apply to write empathy_ledger_id + is_storyteller=true on matches.');
  process.exit(0);
}

console.log(`\nApplying matches…`);
let updated = 0;
let failed = 0;
for (const m of matches) {
  const { error } = await op.from('ghl_contacts').update({
    empathy_ledger_id: m.el_profile_id,
    is_storyteller: true,
    el_last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', m.id);
  if (error) { failed++; console.error(error.message); } else { updated++; }
}
console.log(`Updated: ${updated} · Failed: ${failed}`);

// Also flag ambiguous for follow-up
console.log(`\nFlagging ambiguous contacts (no auto-link, needs manual choice)…`);
let flagged = 0;
for (const a of ambiguous) {
  const { error } = await op.from('ghl_contacts').update({
    auto_created_from: `el-ambiguous:${a.candidates.join(',')}`,
    updated_at: new Date().toISOString()
  }).eq('id', a.id);
  if (!error) flagged++;
}
console.log(`Flagged: ${flagged}`);
