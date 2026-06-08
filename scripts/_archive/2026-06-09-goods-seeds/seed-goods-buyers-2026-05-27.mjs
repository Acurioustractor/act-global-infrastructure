/**
 * Seed the Goods BUYER pipelines (2026-05-27 buyers phase).
 * Source: thoughts/shared/handoffs/goods-foundation-pipeline-2026-05-27/buyers-candidates.md
 * Approved (Ben): Buyer Pipeline = 5 warm commercial buyers; Demand Register = the scored
 * cold prospects (Miwatj routed to Buyer Pipeline; Aputula EXCLUDED — possible dup of an
 * existing DR row, needs manual confirm); delivery partners NOT touched.
 *
 * Tag convention (buyers, per operating model): goods + act-gd + project:act-gd +
 * goods-role-{health|store|council|landcouncil|housing|corp} + goods-state-{nt|qld} +
 * goods-communitycontrolled (if CC) + goods-stage-{prospect|active|customer}.
 *
 * Idempotent: opp skipped if name exists. Contacts WITH email looked up via search
 * (create-or-additive-tag); contacts WITHOUT email (shells / named-but-no-email) created
 * only when the opp will be created (guarded), so re-runs don't duplicate.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-goods-buyers-2026-05-27.mjs          # dry-run
 *   node --env-file=.env.local scripts/seed-goods-buyers-2026-05-27.mjs --apply  # writes
 */

import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const BASE = ['goods', 'act-gd', 'project:act-gd'];

// ── Buyer Pipeline: 5 warm commercial buyers ──
const BUYERS = [
  { name: 'Miwatj Health Aboriginal Corporation', stage: 'In Conversation', value: 0,
    contact: { email: 'madelyn.hay@miwatj.com.au', firstName: 'Madelyn', lastName: 'Hay', companyName: 'Miwatj Health Aboriginal Corporation' },
    tags: ['goods-role-health', 'goods-state-nt', 'goods-communitycontrolled', 'goods-stage-active'] },
  { name: 'Anyinginyi Health Aboriginal Corporation', stage: 'In Conversation', value: 4800,
    contact: { email: 'tony.miles@anyinginyi.com.au', firstName: 'Tony', lastName: 'Miles', companyName: 'Anyinginyi Health Aboriginal Corporation' },
    tags: ['goods-role-health', 'goods-state-nt', 'goods-communitycontrolled', 'goods-stage-customer'] },
  { name: 'WHSAC (Groote Archipelago)', stage: 'Outreach Queued', value: 1700000,
    contact: { firstName: 'Simone', lastName: 'Grimmond', companyName: 'WHSAC (Groote Archipelago)' }, // no email on record — verify before outreach
    tags: ['goods-role-housing', 'goods-state-nt', 'goods-communitycontrolled', 'goods-stage-prospect'] },
  { name: "NPY Women's Council", stage: 'Outreach Queued', value: 0,
    contact: { firstName: 'Angela', lastName: 'Lynch', companyName: "NPY Women's Council" }, // no email on record — verify Angela is current
    tags: ['goods-role-corp', 'goods-state-nt', 'goods-communitycontrolled', 'goods-stage-prospect'] },
  { name: 'Centrebuild Pty Ltd', stage: 'In Conversation', value: 0,
    // Centrecorp's COMMERCIAL twin (109 beds sold). Contact = Randle Walker — same human as the
    // Centrecorp funder record; deal details live in email with Randle. Links Centrebuild buyer
    // opp to Randle's existing contact (search-by-email finds him, adds buyer tags additively).
    contact: { email: 'randle@centrecorp.com.au', firstName: 'Randle', lastName: 'Walker', companyName: 'Centrebuild Pty Ltd' },
    tags: ['goods-role-corp', 'goods-stage-customer'] },
];

// ── Demand Register: scored cold prospects (company shells, Signal). Miwatj→BP, Aputula excluded. ──
const DEMAND = [
  { name: 'Canteen Creek Store Charitable Trust', tags: ['goods-role-store', 'goods-state-nt', 'goods-communitycontrolled'] },
  { name: 'The Arnhem Land Progress Aboriginal Corporation (ALPA)', tags: ['goods-role-store', 'goods-state-nt', 'goods-communitycontrolled'] },
  { name: 'Tangentyere Council Aboriginal Corporation', tags: ['goods-role-council', 'goods-state-nt', 'goods-communitycontrolled'] },
  { name: 'Outback Stores Pty Ltd', tags: ['goods-role-store', 'goods-state-nt'] },
  { name: 'Ntaria School Council Inc', tags: ['goods-role-council', 'goods-state-nt'] },
  { name: 'Central Land Council', tags: ['goods-role-landcouncil', 'goods-state-nt', 'goods-communitycontrolled'] },
  { name: 'Anindilyakwa Housing Aboriginal Corporation', tags: ['goods-role-housing', 'goods-state-nt', 'goods-communitycontrolled'] },
  { name: 'Tiwi Land Council', tags: ['goods-role-landcouncil', 'goods-state-nt', 'goods-communitycontrolled'] },
  { name: 'Aboriginal Medical Services Alliance NT (AMSANT)', tags: ['goods-role-health', 'goods-state-nt', 'goods-communitycontrolled'] },
  { name: 'Anindilyakwa Land Council', tags: ['goods-role-landcouncil', 'goods-state-nt', 'goods-communitycontrolled'] },
  { name: 'Central Desert Regional Council', tags: ['goods-role-council', 'goods-state-nt'] },
  { name: 'Tiwi Islands Regional Council', tags: ['goods-role-council', 'goods-state-nt'] },
  { name: 'Torres Strait Island Regional Council', tags: ['goods-role-council', 'goods-state-qld'] },
  { name: 'Northern Peninsula Area Regional Council', tags: ['goods-role-council', 'goods-state-qld'] },
].map((d) => ({ ...d, stage: 'Signal', value: 0, tags: [...d.tags, 'goods-stage-prospect'] }));

async function main() {
  const ghl = createGHLService();
  const bp = await ghl.getPipelineByName('Buyer Pipeline');
  const dr = await ghl.getPipelineByName('Demand Register');
  if (!bp || !dr) { console.error(`✗ Pipeline not found (bp=${!!bp} dr=${!!dr})`); process.exit(1); }
  const stageId = (pl, n) => { const s = pl.stages.find((x) => norm(x.name) === norm(n)); if (!s) throw new Error(`stage "${n}" missing in ${pl.name}`); return s.id; };
  const bpExisting = new Set((await ghl.getOpportunities(bp.id, { limit: 100 })).map((o) => norm(o.name)));
  const drExisting = new Set((await ghl.getOpportunities(dr.id, { limit: 100 })).map((o) => norm(o.name)));
  console.log(`Buyer Pipeline (${bp.id}) existing: ${bpExisting.size} | Demand Register (${dr.id}) existing: ${drExisting.size}`);
  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}\n`);

  const res = { created: [], skipped: [], contactsNew: [], contactsTagged: [], errors: [] };

  async function seed(pl, existing, e) {
    if (existing.has(norm(e.name))) { console.log(`= SKIP (exists)  ${e.name}`); res.skipped.push(e.name); return; }
    const tags = [...BASE, ...e.tags];
    const line = `${e.name}  $${e.value.toLocaleString()}  → ${e.stage}  [${e.tags.join(',')}]`;
    if (!APPLY) { console.log(`+ WOULD CREATE  ${line}  contact:${e.contact?.email || (e.contact ? 'shell' : 'shell')}`); return; }
    try {
      let cid;
      const email = e.contact?.email;
      if (email) {
        const matches = await ghl.searchContacts(email);
        let c = matches.find((m) => (m.email || '').toLowerCase() === email.toLowerCase());
        if (c) { for (const t of tags) await ghl.addTagToContact(c.id, t); res.contactsTagged.push(email); }
        else { c = await ghl.createContact({ ...e.contact, tags }); res.contactsNew.push(email); }
        cid = c.id || c.contact?.id;
      } else {
        const c = await ghl.createContact({ firstName: e.contact?.firstName || e.name, lastName: e.contact?.lastName, companyName: e.contact?.companyName || e.name, tags });
        cid = c.id || c.contact?.id; res.contactsNew.push(e.name);
      }
      if (!cid) throw new Error('no contact id');
      const opp = await ghl.createOpportunity({ pipelineId: pl.id, stageId: stageId(pl, e.stage), name: e.name, monetaryValue: e.value, status: 'open', contactId: cid });
      console.log(`+ CREATED  ${line}  (contact ${cid}, opp ${opp.id})`); res.created.push(e.name);
    } catch (err) { console.error(`✗ ERROR ${e.name}: ${err.message}`); res.errors.push(`${e.name}: ${err.message}`); }
  }

  console.log('── Buyer Pipeline (5 warm commercial buyers) ──');
  for (const b of BUYERS) await seed(bp, bpExisting, b);
  console.log('\n── Demand Register (14 scored cold prospects) ──');
  for (const d of DEMAND) await seed(dr, drExisting, d);

  console.log(`\n── Summary ──`);
  console.log(`Created: ${res.created.length} | skipped(existing): ${res.skipped.length} | contacts new: ${res.contactsNew.length} | re-tagged: ${res.contactsTagged.length} | errors: ${res.errors.length}`);
  if (res.errors.length) console.log(`Errors:\n  ${res.errors.join('\n  ')}`);
  if (!APPLY) console.log(`\n(Dry-run. Re-run with --apply to write.)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
