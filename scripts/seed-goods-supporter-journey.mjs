/**
 * Seed the GHL "Goods — Supporter Journey" pipeline with the 13 Goods funders.
 *
 * Pipeline must be created in the GHL UI first (API cannot create pipelines).
 * Stages expected (any order): Identified, Qualified, Cultivating, Ask made,
 * Committed, Delivering, Stewarding / Reporting, Renewing, Lapsed, Declined / Parked.
 *
 * Idempotent: skips a funder if an opportunity with the same name already exists
 * in the pipeline. Re-runnable.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-goods-supporter-journey.mjs            # dry-run
 *   node --env-file=.env.local scripts/seed-goods-supporter-journey.mjs --apply    # writes
 *
 * Source of truth for $ values + stage/band mapping:
 *   memory enterprise_hq_build.md "▶ RESUME HERE" + Grade→GHL playbook (2026-05-27).
 */

import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const PIPELINE_NAME = 'Supporter Journey'; // matched via getPipelineByName (substring, case-insensitive)

// stage name -> normalized key for loose matching against GHL stage names
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// The 13 funders. contactId = null means no GHL contact found (opportunity created contact-less).
const FUNDERS = [
  { name: 'Snow Foundation',                       value: 402930, stage: 'Stewarding / Reporting', band: 'goods-hot',     contactId: 'laCUDrYPbaEP5rC9UEcf' },
  { name: 'Centrecorp Foundation',                 value: 123332, stage: 'Stewarding / Reporting', band: 'goods-hot',     contactId: 'ehnCEv62bCaGNTd1QuGp' },
  { name: 'Homeland School Company',               value: 44000,  stage: 'Committed',              band: 'goods-steady',  contactId: 'hv7tFXO8UGDq3dMc98SG' },
  { name: 'Our Community Shed',                     value: 20265,  stage: 'Renewing',               band: 'goods-steady',  contactId: 'SYhvJjn05QVkvbFJPhGv' },
  { name: 'Julalikari Council Aboriginal Corp',     value: 19800,  stage: 'Renewing',               band: 'goods-steady',  contactId: 'OSWHIOCG3vHdyAEHot6F' },
  { name: 'Vincent Fairfax Family Foundation',      value: 50000,  stage: 'Cultivating',            band: 'goods-cooling', contactId: 'G4vUZfUSQadk1R4KGRZC' },
  { name: 'QIC',                                    value: 12000,  stage: 'Cultivating',            band: 'goods-cooling', contactId: '0ShRsxG5CBklEgpCIQQU' },
  { name: 'Red Dust',                               value: 15950,  stage: 'Cultivating',            band: 'goods-cooling', contactId: '3v2RCOhzU5fCgsxEDgff' },
  // "Malala" = Mala'la Health Service Aboriginal Corporation (apostrophe broke earlier search).
  { name: "Mala'la Health Service Aboriginal Corp", value: 5434,   stage: 'Cultivating',            band: 'goods-cooling', contactId: 'Z6POQ8e2wtBKSWDuPLEx' },
  { name: 'The Funding Network',                    value: 130000, stage: 'Cultivating',            band: 'goods-cooling', contactId: 'eCzgIXkVKLh3B413GVde' },
  { name: 'FRRR',                                   value: 50000,  stage: 'Cultivating',            band: 'goods-cooling', contactId: 'j7hi3rlHwmIuDKNSIdTs' },
  { name: 'AMP Foundation',                         value: 21900,  stage: 'Cultivating',            band: 'goods-cooling', contactId: 'wJXLZamvwqPSXxjtd6CC' },
  { name: 'Rotary Eclub Outback Australia',         value: 82500,  stage: 'Lapsed',                 band: 'goods-cold',    contactId: 'huXguIGvyFHkixustqey' },
];

async function main() {
  const ghl = createGHLService();

  const pipeline = await ghl.getPipelineByName(PIPELINE_NAME);
  if (!pipeline) {
    console.error(`✗ Pipeline matching "${PIPELINE_NAME}" not found. Create "Goods — Supporter Journey" in the GHL UI first.`);
    process.exit(1);
  }
  console.log(`Pipeline: "${pipeline.name}" (${pipeline.id}) — ${pipeline.stages.length} stages`);

  // build stage-name -> id map (loose match)
  const stageByKey = new Map(pipeline.stages.map((s) => [norm(s.name), s]));
  const resolveStage = (wantName) => stageByKey.get(norm(wantName));

  // fail fast if any required stage name is missing
  const missing = [...new Set(FUNDERS.map((f) => f.stage))].filter((s) => !resolveStage(s));
  if (missing.length) {
    console.error(`✗ Pipeline is missing required stages: ${missing.join(', ')}`);
    console.error(`  Stages present: ${pipeline.stages.map((s) => s.name).join(' | ')}`);
    process.exit(1);
  }

  // existing opportunities (idempotency)
  const existing = await ghl.getOpportunities(pipeline.id, { limit: 100 });
  const existingNames = new Set(existing.map((o) => norm(o.name || '')));
  console.log(`Existing opportunities in pipeline: ${existing.length}`);
  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}\n`);

  const results = { created: [], skipped: [], tagged: [], errors: [] };

  for (const f of FUNDERS) {
    const stage = resolveStage(f.stage);
    const line = `${f.name}  $${f.value.toLocaleString()}  → ${stage.name}  [${f.band}]  contact:${f.contactId || 'NONE'}`;

    if (existingNames.has(norm(f.name))) {
      console.log(`= SKIP (exists)  ${line}`);
      results.skipped.push(f.name);
      continue;
    }

    if (!APPLY) {
      const note = !f.contactId && f.createContact ? '  (will create contact)' : '';
      console.log(`+ WOULD CREATE  ${line}${note}`);
      continue;
    }

    try {
      // Create a contact first if none exists and we're configured to (e.g. Malala).
      let contactId = f.contactId;
      if (!contactId && f.createContact) {
        const c = await ghl.createContact({
          // GHL requires at least one of email/phone/firstName/lastName.
          firstName: f.createContact.companyName,
          name: f.createContact.companyName,
          companyName: f.createContact.companyName,
          tags: f.createContact.tags,
          source: 'Goods Supporter Journey seed',
        });
        contactId = c.id || c.contact?.id;
        console.log(`  ↳ created contact ${contactId} for ${f.name}`);
      }

      const opp = await ghl.createOpportunity({
        pipelineId: pipeline.id,
        stageId: stage.id,
        name: f.name,
        monetaryValue: f.value,
        status: 'open',
        ...(contactId ? { contactId } : {}),
      });
      console.log(`+ CREATED  ${line}  (opp ${opp.id})`);
      results.created.push(f.name);

      if (contactId) {
        await ghl.addTagToContact(contactId, f.band);
        results.tagged.push(`${f.name}:${f.band}`);
      }
    } catch (err) {
      console.error(`✗ ERROR  ${f.name}: ${err.message}`);
      results.errors.push(`${f.name}: ${err.message}`);
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`Created: ${results.created.length}  | Skipped(existing): ${results.skipped.length}  | Tagged: ${results.tagged.length}  | Errors: ${results.errors.length}`);
  if (results.errors.length) console.log(`Errors:\n  ${results.errors.join('\n  ')}`);
  if (!APPLY) console.log(`\n(Dry-run. Re-run with --apply to write.)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
