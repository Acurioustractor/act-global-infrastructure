#!/usr/bin/env node
/**
 * Remove community-controlled contacts from the active Harvest supporter journey.
 * Opportunities are marked abandoned to preserve history, and canonical tier tags are removed.
 */
import { createGHLService } from './lib/ghl-api-service.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const PIPELINE_ID = 'ijPN2jEoEuMshXXKbQ4z';
const COMMUNITY_TAGS = new Set(['lane:community', 'role:community', 'community-controlled', 'role:storyteller', 'role:elder']);
const TIER_TAGS = ['tier:curious', 'tier:connected', 'tier:member', 'tier:active', 'tier:steward'];
const ghl = createGHLService();
const opportunities = (await ghl.getOpportunities(PIPELINE_ID)).filter(o => o.status === 'open');
const targets = [];

for (const opportunity of opportunities) {
  const contactId = opportunity.contact?.id || opportunity.contactId;
  const contact = await ghl.getContactById(contactId);
  const tags = contact.tags || [];
  if (!tags.some(tag => COMMUNITY_TAGS.has(tag))) continue;
  targets.push({ opportunity, contact, remove: tags.filter(tag => TIER_TAGS.includes(tag)) });
}

console.log(`Community-controlled opportunities to archive: ${targets.length}`);
for (const row of targets) console.log(`  ${row.contact.name || row.contact.email}: remove [${row.remove.join(', ')}]`);
if (!APPLY) {
  console.log('DRY RUN: nothing written.');
  process.exit(0);
}
let archived = 0;
const failed = [];
for (const row of targets) {
  try {
    for (const tag of row.remove) await ghl.removeTagFromContact(row.contact.id, tag);
    await ghl.updateOpportunity(row.opportunity.id, { status: 'abandoned' });
    archived++;
  } catch (err) {
    failed.push(`${row.contact.name || row.contact.email} (${row.opportunity.id}): ${err.message}`);
  }
}
console.log(`Archived ${archived} of ${targets.length} opportunities and removed their tier tags. No contacts deleted and no messages sent.`);
if (failed.length) {
  console.error(`FAILED ${failed.length}:`);
  for (const line of failed) console.error(`  ${line}`);
  process.exit(1);
}
