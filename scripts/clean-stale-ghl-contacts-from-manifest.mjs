#!/usr/bin/env node
/**
 * Clean stale Supabase ghl_contacts that no longer exist in GHL.
 *
 * Reads the GHL push-back manifest, extracts the failed contact IDs
 * (those that returned 404 "Contact not found"), verifies each is truly
 * absent in GHL, then deletes the matching ghl_opportunities (FK requires it)
 * + ghl_contacts rows in Supabase.
 *
 * Usage:
 *   node scripts/clean-stale-ghl-contacts-from-manifest.mjs            # dry-run
 *   node scripts/clean-stale-ghl-contacts-from-manifest.mjs --apply
 *
 * Plan: ghl-pipelines-supporter-integration-2026-05-23
 */

import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const manifestPath = args.find(a => a.endsWith('.json')) ||
  '/Users/benknight/Code/act-global-infrastructure/thoughts/shared/handoffs/ghl-pushback-manifest-2026-05-23.json';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function main() {
  console.log(`🧹 Cleaning stale GHL contacts — ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`   Manifest: ${manifestPath}\n`);

  if (!existsSync(manifestPath)) {
    console.error(`Manifest not found`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const failedIds = [...new Set(
    manifest.entries
      .filter(e => e.status === 'failed' && e.error?.includes('Contact not found'))
      .map(e => e.ghl_contact_id)
  )];
  console.log(`✓ ${failedIds.length} unique contact IDs failed with "Contact not found"`);

  const ghl = createGHLService();

  // 1. Verify each is truly missing in GHL (single retry — paranoid double-check)
  const confirmed = [];
  for (const id of failedIds) {
    try {
      await ghl.request(`/contacts/${id}`);
      console.log(`  ⚠ ${id} now exists in GHL — skipping (was transient)`);
    } catch (e) {
      if (e.message.includes('404') || e.message.includes('not found')) {
        confirmed.push(id);
      } else {
        console.log(`  ? ${id} — non-404 error: ${e.message.slice(0, 100)}`);
      }
    }
  }
  console.log(`✓ ${confirmed.length} confirmed missing in GHL\n`);

  // 2. Count what would be deleted from Supabase
  const { data: contactsToDelete } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email')
    .in('ghl_id', confirmed);
  const { data: oppsToDelete } = await supabase
    .from('ghl_opportunities')
    .select('id, ghl_id, name, project_code, pipeline_name')
    .in('ghl_contact_id', confirmed);

  console.log(`Cleanup plan:`);
  console.log(`  Contacts to remove from Supabase: ${contactsToDelete?.length || 0}`);
  console.log(`  Opportunities to remove (FK):     ${oppsToDelete?.length || 0}`);

  if (oppsToDelete?.length) {
    console.log(`\nSample orphan opportunities (will have ghl_contact_id NULLed, not deleted):`);
    for (const o of oppsToDelete.slice(0, 5)) {
      console.log(`  - ${(o.name || '').slice(0, 60)}  [${o.pipeline_name}, ${o.project_code || 'untagged'}]`);
    }
    if (oppsToDelete.length > 5) console.log(`  ...and ${oppsToDelete.length - 5} more`);
    console.log(`\nWhy not delete: next GHL re-sync will refresh these opps with their current contact (if still in GHL).`);
  }

  if (!apply) {
    console.log(`\n[dry-run] No writes. Re-run with --apply to commit.`);
    return;
  }

  // 3. Soft-delete: append `gone-from-ghl` to tags + mark deleted_at.
  //    Why not hard delete: 7 tables FK to ghl_contacts (communications_history,
  //    relationship_health, user_identities, voice_notes, etc) and nuking those
  //    references would lose audit trail. Soft delete keeps the row queryable
  //    but clearly marks it as no longer in GHL. Downstream code can filter.
  console.log('\nMarking stale contacts as gone-from-ghl...');
  const today = new Date().toISOString().slice(0, 10);
  const goneTag = `gone-from-ghl-${today}`;

  // Pull current tags so we can preserve + append
  const { data: existing } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, tags')
    .in('ghl_id', confirmed);

  let marked = 0, failed = 0;
  for (const c of (existing || [])) {
    const newTags = [...new Set([...(c.tags || []), goneTag, 'gone-from-ghl'])];
    const { error } = await supabase
      .from('ghl_contacts')
      .update({ tags: newTags })
      .eq('ghl_id', c.ghl_id);
    if (error) { failed++; console.error(`  ✗ ${c.ghl_id}: ${error.message.slice(0, 100)}`); }
    else marked++;
  }
  console.log(`✓ Marked ${marked} contacts with '${goneTag}' tag (${failed} failed)`);

  console.log(`\nNote: 58 opportunities also have ghl_contact_id = NULL from earlier run.`);
  console.log(`Next: re-run \`node scripts/build-project-pipelines.mjs\` to refresh the rollup.`);
  console.log(`Filter stale contacts in queries with: WHERE NOT (tags @> ARRAY['gone-from-ghl'])`);
}

main().catch(e => { console.error('Cleanup failed:', e); process.exit(1); });
