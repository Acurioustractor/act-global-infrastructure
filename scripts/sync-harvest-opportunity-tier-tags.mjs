#!/usr/bin/env node
/**
 * Mirror the Harvest Membership Journey stage into exactly one canonical tier tag.
 * The accepted operating model makes the pipeline stage the source of truth.
 * Community-controlled contacts are reported and skipped for human review.
 *
 *   node scripts/sync-harvest-opportunity-tier-tags.mjs
 *   node scripts/sync-harvest-opportunity-tier-tags.mjs --apply
 */
import { createGHLService } from './lib/ghl-api-service.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const PIPELINE_ID = 'ijPN2jEoEuMshXXKbQ4z';
const STAGE_TO_TIER = new Map([
  ['85da97c5-7cdc-4500-95d7-7dbdaea0ee5c', 'tier:curious'],
  ['571c3eab-ecca-47e6-a746-cafc04cd7c1c', 'tier:connected'],
  ['21e1dcb8-d674-4724-a8b0-5cb4cafba635', 'tier:member'],
  ['6173b52b-3396-4431-9f87-ba73f20e0e27', 'tier:active'],
  ['ea084ff5-607e-49a8-a6d2-d087cec57c5d', 'tier:steward'],
]);
const CANONICAL_TIERS = [...STAGE_TO_TIER.values()];
const COMMUNITY_TAGS = new Set(['lane:community', 'role:community', 'community-controlled', 'role:storyteller', 'role:elder']);

const ghl = createGHLService();
const opportunities = (await ghl.getOpportunities(PIPELINE_ID)).filter(o => o.status === 'open');
const changes = [];
const community = [];

for (const opportunity of opportunities) {
  const desired = STAGE_TO_TIER.get(opportunity.pipelineStageId);
  if (!desired) continue;
  const contactId = opportunity.contact?.id || opportunity.contactId;
  const contact = await ghl.getContactById(contactId);
  const tags = contact.tags || [];
  if (tags.some(tag => COMMUNITY_TAGS.has(tag))) {
    community.push({ name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email, contactId, tags: tags.filter(t => COMMUNITY_TAGS.has(t)) });
    continue;
  }
  const remove = tags.filter(tag => CANONICAL_TIERS.includes(tag) && tag !== desired);
  const add = tags.includes(desired) ? [] : [desired];
  if (remove.length || add.length) changes.push({ name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email, contactId, desired, remove, add });
}

console.log(`Open Harvest journey opportunities: ${opportunities.length}`);
console.log(`Contacts needing tier sync: ${changes.length}`);
console.log(`Community-controlled contacts skipped: ${community.length}`);
for (const row of community) console.log(`  REVIEW COMMUNITY: ${row.name} [${row.tags.join(', ')}]`);

if (!APPLY) {
  for (const row of changes.slice(0, 30)) console.log(`  ${row.name}: remove [${row.remove.join(', ')}], add [${row.add.join(', ')}]`);
  if (changes.length > 30) console.log(`  ...and ${changes.length - 30} more`);
  console.log('DRY RUN: nothing written.');
  process.exit(0);
}

let updated = 0;
const failed = [];
for (const row of changes) {
  try {
    for (const tag of row.remove) await ghl.removeTagFromContact(row.contactId, tag);
    for (const tag of row.add) await ghl.addTagToContact(row.contactId, tag);
    updated++;
  } catch (err) {
    failed.push(`${row.name} (${row.contactId}): ${err.message}`);
  }
}
console.log(`Updated ${updated} of ${changes.length} contacts. No messages sent.`);
if (failed.length) {
  console.error(`FAILED ${failed.length}:`);
  for (const line of failed) console.error(`  ${line}`);
  process.exit(1);
}
