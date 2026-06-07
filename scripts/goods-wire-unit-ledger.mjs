#!/usr/bin/env node
/**
 * goods-wire-unit-ledger.mjs — Goods 3-pipeline operating model, Build B step 1+2.
 *
 * (1) Creates two OPPORTUNITY custom fields on the GHL location so every Goods
 *     pipeline opp can carry physical units: "Goods: Beds" + "Goods: Washing
 *     machines" (NUMERICAL). $ uses the native opportunity monetaryValue — no
 *     custom field needed. Idempotent: skips a field that already exists by name.
 * (2) Backfills the known Buyer-Pipeline deals with the dimensions actually
 *     recorded in CRM memory (no fabrication — a missing dimension is left blank):
 *       ALIVE   → $60,000           (bed count not recorded)
 *       Hewitt  → 10 beds           ($ not recorded)
 *       PICC    → 40 beds           (40-bed reorder; only if a Buyer record exists)
 *
 * Meaning of the unit fields by pipeline: needed (Demand Register) / ordered
 * (Buyer Pipeline) / funded (Supporter Journey). The roll-up reads them per-pipeline.
 *
 * Review-first: DRY RUN by default; pass --apply to write to GHL.
 *   node --env-file=.env scripts/goods-wire-unit-ledger.mjs            # dry run
 *   node --env-file=.env scripts/goods-wire-unit-ledger.mjs --apply    # write
 *
 * Plan: thoughts/shared/plans/2026-05-28-goods-three-pipeline-operating-model.md
 */
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const BUYER_PIPELINE_ID = 'FjMyJM3YzWQFmKqR9fur';

const FIELDS = [
  { name: 'Goods: Beds', dataType: 'NUMERICAL', model: 'opportunity' },
  { name: 'Goods: Washing machines', dataType: 'NUMERICAL', model: 'opportunity' },
];

// Only dimensions explicitly recorded in CRM memory. null = not recorded → leave blank.
const DEALS = [
  { label: 'ALIVE', match: /alive/i, beds: null, washers: null, value: 60000, note: '$60K (CRM memory); bed count not recorded' },
  { label: 'Hewitt', match: /hewitt/i, beds: 10, washers: null, value: null, note: '~10 beds for own properties (CRM memory)' },
  { label: 'PICC', match: /palm island|picc/i, beds: 40, washers: null, value: null, note: '40-bed reorder (CRM memory)' },
];

async function main() {
  const ghl = createGHLService();
  console.log(`=== Goods unit-ledger wiring (${APPLY ? 'APPLY' : 'DRY RUN'}) ===\n`);

  // 1. Custom fields (idempotent by name).
  console.log('-- Step 1: opportunity custom fields --');
  const existing = await ghl.request(`/locations/${ghl.locationId}/customFields?model=opportunity`);
  const existingByName = new Map((existing.customFields || []).map(f => [f.name, f]));
  const fieldIds = {};
  for (const f of FIELDS) {
    const hit = existingByName.get(f.name);
    if (hit) {
      fieldIds[f.name] = hit.id;
      console.log(`  ✓ exists: "${f.name}" (${hit.id})`);
      continue;
    }
    if (!APPLY) { console.log(`  + would create: "${f.name}" (${f.dataType}, ${f.model})`); continue; }
    const created = await ghl.request(`/locations/${ghl.locationId}/customFields`, {
      method: 'POST',
      body: JSON.stringify({ name: f.name, dataType: f.dataType, model: f.model }),
    });
    const cf = created.customField || created;
    fieldIds[f.name] = cf.id;
    console.log(`  + created: "${f.name}" (${cf.id})`);
  }
  const bedsFieldId = fieldIds['Goods: Beds'];
  const washersFieldId = fieldIds['Goods: Washing machines'];

  // 2. Backfill known Buyer-Pipeline deals.
  console.log('\n-- Step 2: backfill Buyer-Pipeline deals --');
  const opps = await ghl.getOpportunities(BUYER_PIPELINE_ID, { limit: 100 });
  console.log(`  Buyer Pipeline has ${opps.length} opps.`);
  for (const deal of DEALS) {
    const opp = opps.find(o => deal.match.test(o.name || ''));
    if (!opp) { console.log(`  – ${deal.label}: no Buyer-Pipeline opp matches ${deal.match} — skipped (${deal.note})`); continue; }
    const customFields = [];
    if (deal.beds != null && bedsFieldId) customFields.push({ id: bedsFieldId, field_value: String(deal.beds) });
    if (deal.washers != null && washersFieldId) customFields.push({ id: washersFieldId, field_value: String(deal.washers) });
    const updates = {};
    if (customFields.length) updates.customFields = customFields; // MERGES by id (safe)
    if (deal.value != null) updates.monetaryValue = deal.value;
    const parts = [deal.beds != null ? `${deal.beds} beds` : null, deal.washers != null ? `${deal.washers} washers` : null, deal.value != null ? `$${deal.value.toLocaleString()}` : null].filter(Boolean).join(' · ');
    if (!APPLY) { console.log(`  → ${deal.label} ("${opp.name}", ${opp.id}): would set ${parts}`); continue; }
    await ghl.updateOpportunity(opp.id, updates);
    console.log(`  ✓ ${deal.label} ("${opp.name}"): set ${parts}`);
  }

  console.log(`\n${APPLY ? 'Done.' : 'Dry run complete — re-run with --apply to write.'}`);
}

main().catch(e => { console.error(e); process.exit(1); });
