#!/usr/bin/env node
/**
 * Push Supabase project_code retags back to GHL as contact tags.
 *
 * What it does:
 *   - For each opportunity that was retagged in Supabase (vs what was last synced from GHL),
 *     add a tag to the LINKED CONTACT in GHL of the form `project:ACT-GD` or `project:WATCH`.
 *   - This makes the project classification visible in GHL UI without touching the opp itself.
 *   - Records BEFORE state of contact tags in a manifest so revert can remove ONLY the tags we added.
 *
 * Safety:
 *   - Default mode is --dry-run (just shows the plan; no GHL writes)
 *   - --apply writes to GHL one contact at a time, 100ms rate-limited
 *   - --revert reads the manifest and removes exactly the tags this script added
 *   - Manifest is written BEFORE any writes — if the script crashes mid-run, the partial manifest
 *     captures what was attempted and can still drive revert
 *
 * Usage:
 *   node scripts/pushback-ghl-project-tags.mjs              # dry-run (default)
 *   node scripts/pushback-ghl-project-tags.mjs --apply
 *   node scripts/pushback-ghl-project-tags.mjs --revert thoughts/shared/handoffs/ghl-pushback-manifest-2026-05-23.json
 *
 * Plan: act-communication-pipeline-2026-05-23-locked § GHL pipelines integration
 */

import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const revertIdx = args.indexOf('--revert');
const revertManifest = revertIdx >= 0 ? args[revertIdx + 1] : null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const TODAY = new Date().toISOString().slice(0, 10);
const MANIFEST_PATH = `/Users/benknight/Code/act-global-infrastructure/thoughts/shared/handoffs/ghl-pushback-manifest-${TODAY}.json`;

function ensureDir(p) { mkdirSync(dirname(p), { recursive: true }); }
function tagFor(projectCode) { return `project:${projectCode}`; }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVERT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function revert(manifestPath) {
  if (!existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  console.log(`🔄 Reverting ${manifest.entries.length} contact-tag changes from ${manifestPath}\n`);

  const ghl = createGHLService();
  let reverted = 0, failed = 0;

  // Group by contact + tag to dedupe (if 5 opps on 1 contact got same tag, only need 1 revert)
  const seen = new Set();
  for (const entry of manifest.entries) {
    if (entry.status !== 'applied') continue;
    const key = `${entry.ghl_contact_id}::${entry.tag_added}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      await ghl.removeTagFromContact(entry.ghl_contact_id, entry.tag_added);
      console.log(`  ✓ Removed ${entry.tag_added} from contact ${entry.ghl_contact_id}`);
      reverted++;
    } catch (e) {
      console.error(`  ✗ Failed: ${entry.ghl_contact_id} / ${entry.tag_added}: ${e.message.slice(0, 120)}`);
      failed++;
    }
  }
  console.log(`\nReverted ${reverted}, failed ${failed}.`);
  // Mark manifest as reverted
  manifest.reverted_at = new Date().toISOString();
  manifest.reverted_count = reverted;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN PUSH-BACK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  if (revertManifest) {
    return revert(revertManifest);
  }

  console.log(`🚀 GHL push-back — ${apply ? 'APPLY' : 'DRY-RUN'}\n`);

  // 1. Find opps with project_code set in Supabase. Group by contact.
  const { data: opps, error } = await supabase
    .from('ghl_opportunities')
    .select('id, ghl_id, ghl_contact_id, name, pipeline_name, project_code, monetary_value')
    .not('project_code', 'is', null)
    .neq('project_code', '')
    .range(0, 9999);
  if (error) throw error;
  console.log(`✓ ${opps.length} opportunities with project_code set in Supabase`);

  // 2. Pull contacts (paginated) + current tags
  const contactIds = [...new Set(opps.map(o => o.ghl_contact_id).filter(Boolean))];
  const contactMap = new Map();
  for (let i = 0; i < contactIds.length; i += 500) {
    const batch = contactIds.slice(i, i + 500);
    const { data } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, email, tags')
      .in('ghl_id', batch);
    for (const c of (data || [])) contactMap.set(c.ghl_id, c);
  }
  console.log(`✓ ${contactMap.size} unique linked contacts`);

  // 3. Compute the diff: per (contact, project_code), do we need to add the tag?
  //    Group opps by contact, project. Skip if contact already has the tag.
  const contactProjects = new Map(); // ghl_contact_id → Set of project_codes
  for (const o of opps) {
    if (!o.ghl_contact_id) continue;
    if (!contactProjects.has(o.ghl_contact_id)) contactProjects.set(o.ghl_contact_id, new Set());
    contactProjects.get(o.ghl_contact_id).add(o.project_code);
  }

  const entries = []; // manifest entries
  for (const [ghl_contact_id, projects] of contactProjects) {
    const contact = contactMap.get(ghl_contact_id);
    if (!contact) continue;
    const existingTags = contact.tags || [];
    for (const projectCode of projects) {
      const tag = tagFor(projectCode);
      const alreadyHas = existingTags.some(t => t.toLowerCase() === tag.toLowerCase());
      entries.push({
        ghl_contact_id,
        contact_name: contact.full_name || '',
        contact_email: contact.email || '',
        existing_tags: existingTags,
        project_code: projectCode,
        tag_added: tag,
        action: alreadyHas ? 'skip-already-tagged' : 'add-tag',
        status: 'pending',
      });
    }
  }

  // 4. Show plan
  const toAdd = entries.filter(e => e.action === 'add-tag');
  const skipped = entries.filter(e => e.action === 'skip-already-tagged');

  console.log(`\nPlan:`);
  console.log(`  Tags to add:           ${toAdd.length}`);
  console.log(`  Already-tagged (skip): ${skipped.length}`);
  console.log(`  Unique contacts:       ${new Set(toAdd.map(e => e.ghl_contact_id)).size}\n`);

  // Group by tag for readability
  const byTag = new Map();
  for (const e of toAdd) {
    if (!byTag.has(e.tag_added)) byTag.set(e.tag_added, []);
    byTag.get(e.tag_added).push(e);
  }
  console.log(`By tag:`);
  console.log(`| Tag | Contacts | Sample |`);
  console.log(`|---|---:|---|`);
  for (const [tag, list] of [...byTag.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const sample = list.slice(0, 2).map(e => `${e.contact_name || e.contact_email || e.ghl_contact_id.slice(0, 8)}`).join(' · ');
    console.log(`| ${tag} | ${list.length} | ${sample}${list.length > 2 ? ` (+${list.length - 2})` : ''} |`);
  }

  if (!apply) {
    console.log(`\n[dry-run] No GHL writes. Re-run with --apply to commit.`);
    console.log(`Manifest would be written to: ${MANIFEST_PATH}`);
    return;
  }

  // 5. Apply — write manifest FIRST with all entries, then update GHL one at a time
  ensureDir(MANIFEST_PATH);
  const manifest = {
    generated_at: new Date().toISOString(),
    script: 'pushback-ghl-project-tags.mjs',
    summary: {
      total_entries: entries.length,
      tags_to_add: toAdd.length,
      already_tagged: skipped.length,
    },
    entries, // all entries with status:pending
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ Manifest written (BEFORE state) → ${MANIFEST_PATH}`);

  const ghl = createGHLService();
  let applied = 0, failed = 0;
  for (const entry of toAdd) {
    try {
      await ghl.addTagToContact(entry.ghl_contact_id, entry.tag_added);
      entry.status = 'applied';
      entry.applied_at = new Date().toISOString();
      applied++;
      if (applied % 20 === 0) {
        console.log(`  ... ${applied}/${toAdd.length}`);
        // Periodic manifest rewrite so partial progress is saved
        writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      }
    } catch (e) {
      entry.status = 'failed';
      entry.error = e.message.slice(0, 300);
      failed++;
      console.error(`  ✗ ${entry.contact_email || entry.ghl_contact_id}: ${entry.error}`);
    }
  }
  // Final manifest write with applied/failed statuses
  manifest.completed_at = new Date().toISOString();
  manifest.summary.applied = applied;
  manifest.summary.failed = failed;
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\n✓ Applied ${applied}, failed ${failed}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`To revert: node scripts/pushback-ghl-project-tags.mjs --revert ${MANIFEST_PATH}`);
}

main().catch(e => { console.error('Push-back failed:', e); process.exit(1); });
