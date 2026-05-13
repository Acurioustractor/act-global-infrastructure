#!/usr/bin/env node
/**
 * Delete GHL-side duplicate contacts.
 *
 * Pre-req: scripts/dedup-ghl-contacts.mjs has run — `canonical_contact_id`
 * is set on Supabase rows that are duplicates of their canonical.
 *
 * For each dup row:
 *   1. DELETE /contacts/{ghl_id} in GHL
 *   2. On success: delete the dup row from Supabase
 *   3. On 404: dup is already gone — delete the Supabase row anyway
 *   4. On 403 / other error: log and continue
 *
 * The merged data (tags, projects, EL link) lives on the canonical row already
 * (Supabase dedup ran first). So deleting GHL dups doesn't lose user-visible info.
 *
 * Usage:
 *   node scripts/delete-ghl-duplicates.mjs                # dry-run
 *   node scripts/delete-ghl-duplicates.mjs --limit 2      # smoke test
 *   node scripts/delete-ghl-duplicates.mjs --apply        # do it
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

console.log(`delete-ghl-duplicates — ${APPLY ? 'APPLY' : 'DRY-RUN'}${LIMIT ? ` (limit ${LIMIT})` : ''}`);

async function fetchDups() {
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
  return all;
}

const dups = await fetchDups();
console.log(`Duplicate rows to delete: ${dups.length}`);

const stats = { deleted: 0, already_gone: 0, forbidden: 0, other_errors: 0, supabase_cleaned: 0 };

let processed = 0;
for (const d of dups) {
  if (LIMIT && processed >= LIMIT) break;
  processed++;

  if (!d.ghl_id) {
    if (processed <= 5) console.log(`  skip: no ghl_id  (sb id=${d.id.slice(0,8)})`);
    continue;
  }

  if (!APPLY) {
    if (processed <= 5) {
      console.log(`  WOULD DELETE  ${d.ghl_id}  ${d.full_name || d.email}`);
    }
    continue;
  }

  try {
    await ghl.deleteContact(d.ghl_id);
    stats.deleted++;
    await supabase.from('ghl_contacts').delete().eq('id', d.id);
    stats.supabase_cleaned++;
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Contact not found') || msg.includes('404')) {
      stats.already_gone++;
      await supabase.from('ghl_contacts').delete().eq('id', d.id);
      stats.supabase_cleaned++;
    } else if (msg.includes('403') || msg.includes('Permission denied')) {
      stats.forbidden++;
      if (stats.forbidden <= 3) console.error(`  403 on ${d.ghl_id}: ${msg.slice(0, 150)}`);
    } else {
      stats.other_errors++;
      if (stats.other_errors <= 5) console.error(`  err on ${d.ghl_id}: ${msg.slice(0, 200)}`);
    }
  }

  if (processed % 100 === 0) {
    console.log(`  …${processed}  deleted=${stats.deleted} already_gone=${stats.already_gone} forbidden=${stats.forbidden} errors=${stats.other_errors}`);
  }
}

console.log(`\n─── results ───`);
console.log(`processed:        ${processed}`);
console.log(`deleted in GHL:   ${stats.deleted}`);
console.log(`already_gone:     ${stats.already_gone}`);
console.log(`forbidden (403):  ${stats.forbidden}`);
console.log(`other errors:     ${stats.other_errors}`);
console.log(`supabase_cleaned: ${stats.supabase_cleaned}`);

if (!APPLY) console.log(`\nDry-run. Re-run with --apply or --apply --limit N for smoke test.`);
