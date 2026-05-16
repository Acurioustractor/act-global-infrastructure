#!/usr/bin/env node
/**
 * Merge GHL-side duplicate contacts.
 *
 * Pre-req: scripts/dedup-ghl-contacts.mjs has run — `canonical_contact_id`
 * is set on Supabase rows that should be merged INTO their canonical.
 *
 * For each (canonical, dup) pair:
 *   1. Read canonical ghl_id + dup ghl_id from Supabase
 *   2. Call GHL merge API (primary=canonical, secondary=dup)
 *   3. On success: delete the dup row from Supabase (its ghl_id no longer exists in GHL)
 *   4. On 404 / contact-not-found: mark dup row with sync_status='ghl-deleted' (already gone)
 *
 * Usage:
 *   node scripts/merge-ghl-duplicates.mjs                # dry-run
 *   node scripts/merge-ghl-duplicates.mjs --limit 2      # smoke test 2 merges
 *   node scripts/merge-ghl-duplicates.mjs --apply        # do it
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX > -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : null;

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ghl = createGHLService();

console.log(`merge-ghl-duplicates — ${APPLY ? 'APPLY' : 'DRY-RUN'}${LIMIT ? ` (limit ${LIMIT})` : ''}`);

// Pull all dup rows + their canonical ghl_id
async function fetchPairs() {
  const all = [];
  let offset = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, email, full_name, canonical_contact_id')
      .not('canonical_contact_id', 'is', null)
      .order('id')
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < page) break;
    offset += page;
  }
  // Fetch canonical ghl_ids
  const canonicalIds = [...new Set(all.map(d => d.canonical_contact_id))];
  const canonicals = new Map();
  for (let i = 0; i < canonicalIds.length; i += 200) {
    const chunk = canonicalIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, email, full_name')
      .in('id', chunk);
    if (error) throw error;
    for (const c of data) canonicals.set(c.id, c);
  }
  return all.map(dup => ({
    dup,
    canonical: canonicals.get(dup.canonical_contact_id)
  })).filter(p => p.canonical && p.dup.ghl_id && p.canonical.ghl_id);
}

const pairs = await fetchPairs();
console.log(`Pairs to merge: ${pairs.length}`);

const stats = { merged: 0, already_gone: 0, errors: 0, supabase_deleted: 0 };
const seenCanonicals = new Set();

let processed = 0;
for (const { dup, canonical } of pairs) {
  if (LIMIT && processed >= LIMIT) break;
  processed++;

  // Safety: skip if primary == secondary somehow
  if (dup.ghl_id === canonical.ghl_id) continue;

  if (!APPLY) {
    if (processed <= 5) {
      console.log(`  WOULD MERGE  primary=${canonical.ghl_id} (${canonical.full_name || canonical.email})  ← dup=${dup.ghl_id} (${dup.full_name || dup.email})`);
    }
    continue;
  }

  try {
    await ghl.mergeContacts(canonical.ghl_id, dup.ghl_id);
    stats.merged++;
    // Delete the now-stale Supabase row
    await supabase.from('ghl_contacts').delete().eq('id', dup.id);
    stats.supabase_deleted++;
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Contact not found') || msg.includes('404')) {
      stats.already_gone++;
      // Still delete the stale Supabase row
      await supabase.from('ghl_contacts').delete().eq('id', dup.id);
      stats.supabase_deleted++;
    } else {
      stats.errors++;
      if (stats.errors <= 5) console.error(`merge ${canonical.ghl_id} ← ${dup.ghl_id}: ${msg.slice(0, 200)}`);
    }
  }

  if (processed % 100 === 0) {
    console.log(`  …${processed}  merged=${stats.merged} already_gone=${stats.already_gone} errors=${stats.errors}`);
  }
}

console.log(`\n─── results ───`);
console.log(`processed:          ${processed}`);
console.log(`merged:             ${stats.merged}`);
console.log(`already_gone (404): ${stats.already_gone}`);
console.log(`errors:             ${stats.errors}`);
console.log(`supabase_deleted:   ${stats.supabase_deleted}`);

if (!APPLY) console.log(`\nDry-run. Re-run with --apply.`);
