#!/usr/bin/env node
/**
 * Align only unambiguous Mighty-active Harvest opportunities.
 *
 * A Mighty-active contact belongs at Member unless a human has already promoted them to Active
 * or Steward. Newsletter consent is deliberately ignored because it is a communication permission,
 * not evidence of relationship depth.
 *
 *   node scripts/align-harvest-membership-opportunities.mjs
 *   node scripts/align-harvest-membership-opportunities.mjs --apply
 */
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const PIPELINE_ID = 'ijPN2jEoEuMshXXKbQ4z';
const MEMBER_STAGE_ID = '21e1dcb8-d674-4724-a8b0-5cb4cafba635';
const LOWER_STAGE_IDS = new Set([
  '85da97c5-7cdc-4500-95d7-7dbdaea0ee5c',
  '571c3eab-ecca-47e6-a746-cafc04cd7c1c',
]);

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const contacts = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('ghl_contacts')
    .select('ghl_id, full_name, email, tags').range(from, from + 999);
  if (error) throw error;
  contacts.push(...(data || []));
  if (!data || data.length < 1000) break;
}
const byId = new Map(contacts.map(c => [c.ghl_id, c]));
const ghl = createGHLService();
const opportunities = (await ghl.getOpportunities(PIPELINE_ID)).filter(o => o.status === 'open');
const candidates = opportunities.filter(o => {
  if (!LOWER_STAGE_IDS.has(o.pipelineStageId)) return false;
  const contact = byId.get(o.contact?.id || o.contactId);
  return (contact?.tags || []).includes('platform:mighty-active');
});

console.log(`Mighty-active opportunities below Member: ${candidates.length}`);
for (const opportunity of candidates) {
  const contact = byId.get(opportunity.contact?.id || opportunity.contactId);
  console.log(`  ${contact?.full_name || contact?.email || opportunity.name}`);
}

if (!APPLY) {
  console.log('DRY RUN: nothing written.');
  process.exit(0);
}

let updated = 0;
const failed = [];
for (const opportunity of candidates) {
  try {
    const result = await ghl.updateOpportunity(opportunity.id, { pipelineStageId: MEMBER_STAGE_ID });
    if (result?.pipelineStageId && result.pipelineStageId !== MEMBER_STAGE_ID) {
      throw new Error(`stage is ${result.pipelineStageId} after update`);
    }
    updated++;
  } catch (err) {
    failed.push(`${opportunity.id}: ${err.message}`);
  }
}
console.log(`Updated ${updated} of ${candidates.length} opportunities to Member.`);
if (failed.length) {
  console.error(`FAILED ${failed.length}:`);
  for (const line of failed) console.error(`  ${line}`);
  process.exit(1);
}
