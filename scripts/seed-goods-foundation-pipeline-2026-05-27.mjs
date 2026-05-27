/**
 * Seed the GHL "Goods — Supporter Journey" pipeline with the approved
 * 2026-05-27 foundation batch (review doc:
 * thoughts/shared/drafts/goods-foundation-pipeline-candidates-2026-05-27.md).
 *
 * Approved scope (Ben, 2026-05-27):
 *   A. 4 warm NEW foundations (real email contacts)         → create contact + opp + warmth tag
 *   B. 5 high-fit NEW foundations (no contact yet)          → contactless opp at stage
 *   C. top-10 cold GrantScope prospects                     → contactless opp at Identified
 *   D. enrich the existing 13 with secondary human contacts → lookup-or-create, ADDITIVE tags
 *
 * Idempotent:
 *   - opportunities: skipped if an opp with the same (normalised) name already exists
 *   - contacts: looked up by email first; tags applied via addTagToContact (never overwrites)
 *   - cold prospects (C) are EXCLUDED of the Centrecorp-network dupes (#10/#11 in the GS table)
 *
 * Provenance:
 *   - Group A/D contacts + emails: VERIFIED from synced email metadata (gmail-funders.md)
 *   - Group B/C: GrantScope foundations catalogue (grantscope-foundations.md); fit inferred.
 *     No contact invented — B/C carry NO human until a real one is found.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-goods-foundation-pipeline-2026-05-27.mjs          # dry-run
 *   node --env-file=.env.local scripts/seed-goods-foundation-pipeline-2026-05-27.mjs --apply  # writes
 */

import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const PIPELINE_NAME = 'Supporter Journey';
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const BASE_TAGS = ['goods', 'act-gd', 'project:act-gd'];

// ── A. Warm NEW foundations — real email contacts (place at working stage) ──
const GROUP_A = [
  { name: 'The John Villiers Trust', value: 0, stage: 'Cultivating', band: 'goods-warm', role: 'goods-funder',
    contact: { email: 'ceo@jvtrust.org.au', firstName: 'Fiona', lastName: 'Maxwell', companyName: 'The John Villiers Trust' } },
  { name: 'Philanthropy Australia', value: 0, stage: 'Cultivating', band: 'goods-warm', role: 'goods-supporter',
    contact: { email: 'kim@philanthropy.org.au', firstName: 'Kim', lastName: 'Harland', companyName: 'Philanthropy Australia' } },
  { name: 'REAL Innovation Fund (DEWR)', value: 0, stage: 'Ask made', band: 'goods-warm', role: 'goods-funder',
    contact: { email: 'REALInnovationFund@dewr.gov.au', firstName: 'REAL Innovation Fund', companyName: 'DEWR — REAL Innovation Fund' } },
  { name: 'Rotary Global Grant (washers/beds)', value: 0, stage: 'Ask made', band: 'goods-warm', role: 'goods-funder',
    contact: { email: 'pene.curtis@bigpond.com', firstName: 'Pene', lastName: 'Curtis', companyName: 'Rotary Global Grant' } },
];

// ── B. High-fit NEW foundations, no human yet — company-shell contact + opp ──
const GROUP_B = [
  { name: 'QBE Foundation', value: 200000, stage: 'Ask made', band: 'goods-warm' },
  { name: 'Minderoo Foundation', value: 200000, stage: 'Qualified', band: 'goods-steady' },
  { name: 'Paul Ramsay Foundation', value: 0, stage: 'Qualified', band: 'goods-steady' },
  { name: 'Australian Communities Foundation', value: 0, stage: 'Identified', band: 'goods-cooling' },
  { name: 'Nova Peris Foundation', value: 0, stage: 'Identified', band: 'goods-cooling' },
];

// ── C. Top-10 cold GrantScope prospects (Centrecorp-network dupes excluded) — company-shell contact + opp, Identified ──
const GROUP_C = [
  'Northern Australian Aboriginal Charitable Trust',
  'Developing East Arnhem Limited',
  'Fortescue Foundation',
  'Rio Tinto Foundation',
  'BHP Foundation',
  'Country Connect Foundation Limited',
  'Uniting Church Australia Frontier Services',
  'Community Resources Limited',
  'The Trustee For Yeperenye Charitable Trust',
  'Mjd Foundation Limited',
].map((name) => ({ name, value: 0, stage: 'Identified', band: 'goods-cold' }));

// ── D. Enrichment: secondary human contacts for the existing 13 (additive only) ──
const GROUP_D = [
  { email: 'S.Grimsley-Ballard@snowfoundation.org.au', firstName: 'Sally', lastName: 'Grimsley-Ballard', companyName: 'Snow Foundation', role: 'goods-funder', band: 'goods-hot' },
  { email: 'g.byron@snowfoundation.org.au', firstName: 'Georgina', lastName: 'Byron', companyName: 'Snow Foundation', role: 'goods-funder', band: 'goods-hot' },
  { email: 'A.Machuca@snowfoundation.org.au', firstName: 'Ashley', lastName: 'Machuca', companyName: 'Snow Foundation', role: 'goods-funder', band: 'goods-hot' },
  { email: 'cvecchio@qic.com', firstName: 'Cat', lastName: 'Vecchio', companyName: 'QIC', role: 'goods-funder', band: 'goods-cooling' },
  { email: 'C.Sullivan@qic.com', firstName: 'Cat', lastName: 'Sullivan', companyName: 'QIC', role: 'goods-funder', band: 'goods-cooling' },
  { email: 'bridgit@reddust.org.au', firstName: 'Bridgit', lastName: 'McMullen', companyName: 'Red Dust', role: 'goods-supporter', band: 'goods-cooling' },
  // ⚠️ TFN: GHL primary = Kristen Lark; this is the active email contact. Flagged for Ben to set primary — NOT overwriting Kristen.
  { email: 'madeline.alderuccio@thefundingnetwork.com.au', firstName: 'Madeline', lastName: 'Alderuccio', companyName: 'The Funding Network', role: 'goods-funder', band: 'goods-cooling' },
];

async function main() {
  const ghl = createGHLService();
  const pipeline = await ghl.getPipelineByName(PIPELINE_NAME);
  if (!pipeline) { console.error(`✗ Pipeline "${PIPELINE_NAME}" not found.`); process.exit(1); }
  console.log(`Pipeline: "${pipeline.name}" (${pipeline.id}) — ${pipeline.stages.length} stages`);

  const stageByKey = new Map(pipeline.stages.map((s) => [norm(s.name), s]));
  const resolveStage = (n) => stageByKey.get(norm(n));
  const allStages = [...GROUP_A, ...GROUP_B, ...GROUP_C].map((x) => x.stage);
  const missing = [...new Set(allStages)].filter((s) => !resolveStage(s));
  if (missing.length) { console.error(`✗ Missing stages: ${missing.join(', ')}`); process.exit(1); }

  const existing = await ghl.getOpportunities(pipeline.id, { limit: 100 });
  const existingNames = new Set(existing.map((o) => norm(o.name || '')));
  console.log(`Existing opportunities: ${existing.length}`);
  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}\n`);

  const res = { oppsCreated: [], oppsSkipped: [], contactsNew: [], contactsTagged: [], errors: [] };

  // lookup-or-create a contact, then apply tags additively (never overwrites existing tags)
  async function ensureContact({ email, firstName, lastName, companyName }, tags) {
    // NB: ghl.lookupContactByEmail uses GET /contacts/lookup which 400s (GHL reads
    // "lookup" as a contact id). Use the POST /contacts/search path + exact-email filter.
    let contact = null;
    if (email) {
      const matches = await ghl.searchContacts(email);
      contact = matches.find((c) => (c.email || '').toLowerCase() === email.toLowerCase()) || null;
    }
    if (!contact) {
      if (!APPLY) { console.log(`  ↳ WOULD CREATE contact ${firstName || ''} ${lastName || ''} <${email}> [${tags.join(',')}]`); return '(dry-run-id)'; }
      contact = await ghl.createContact({ email, firstName, lastName, companyName, tags });
      res.contactsNew.push(email);
      console.log(`  ↳ created contact ${contact.id} <${email}>`);
    } else if (APPLY) {
      for (const t of tags) await ghl.addTagToContact(contact.id, t);
      res.contactsTagged.push(email);
      console.log(`  ↳ existing contact ${contact.id} <${email}> — tags ensured`);
    } else {
      console.log(`  ↳ WOULD TAG existing contact <${email}> += [${tags.join(',')}]`);
    }
    return contact?.id || '(dry-run-id)';
  }

  async function ensureOpp({ name, value, stage }, contactId) {
    if (existingNames.has(norm(name))) { console.log(`= SKIP opp (exists)  ${name}`); res.oppsSkipped.push(name); return; }
    const st = resolveStage(stage);
    const line = `${name}  $${value.toLocaleString()}  → ${st.name}  contact:${contactId || 'NONE'}`;
    if (!APPLY) { console.log(`+ WOULD CREATE opp  ${line}`); return; }
    try {
      const opp = await ghl.createOpportunity({ pipelineId: pipeline.id, stageId: st.id, name, monetaryValue: value, status: 'open', ...(contactId ? { contactId } : {}) });
      console.log(`+ CREATED opp  ${line}  (${opp.id})`);
      res.oppsCreated.push(name);
    } catch (e) { console.error(`✗ ERROR opp ${name}: ${e.message}`); res.errors.push(`${name}: ${e.message}`); }
  }

  console.log('── A. Warm NEW foundations (contact + opp) ──');
  for (const f of GROUP_A) {
    const cid = await ensureContact(f.contact, [...BASE_TAGS, f.role, f.band]);
    await ensureOpp(f, APPLY ? cid : null);
  }

  // B/C: GHL requires a contactId on every opp, so create a company-shell contact
  // (org name, tagged, no human) then the opp. Guarded by opp-exists so re-runs don't dup.
  async function ensureCompanyOpp(f) {
    if (existingNames.has(norm(f.name))) { console.log(`= SKIP opp (exists)  ${f.name}`); res.oppsSkipped.push(f.name); return; }
    const st = resolveStage(f.stage);
    const line = `${f.name}  $${f.value.toLocaleString()}  → ${st.name}  [company shell, ${f.band}]`;
    if (!APPLY) { console.log(`+ WOULD CREATE company-contact + opp  ${line}`); return; }
    try {
      const c = await ghl.createContact({ firstName: f.name, companyName: f.name, tags: [...BASE_TAGS, 'goods-funder', f.band] });
      const cid = c?.id || c?.contact?.id;
      if (!cid) throw new Error('contact create returned no id');
      res.contactsNew.push(f.name);
      const opp = await ghl.createOpportunity({ pipelineId: pipeline.id, stageId: st.id, name: f.name, monetaryValue: f.value, status: 'open', contactId: cid });
      console.log(`+ CREATED  ${line}  (contact ${cid}, opp ${opp.id})`);
      res.oppsCreated.push(f.name);
    } catch (e) { console.error(`✗ ERROR ${f.name}: ${e.message}`); res.errors.push(`${f.name}: ${e.message}`); }
  }

  console.log('\n── B. High-fit NEW foundations (company-shell contact + opp) ──');
  for (const f of GROUP_B) await ensureCompanyOpp(f);

  console.log('\n── C. Top-10 cold prospects (company-shell contact + opp, Identified) ──');
  for (const f of GROUP_C) await ensureCompanyOpp(f);

  console.log('\n── D. Enrich existing 13 — secondary contacts (additive) ──');
  for (const c of GROUP_D) await ensureContact(c, [...BASE_TAGS, c.role, c.band]);

  console.log(`\n── Summary ──`);
  console.log(`Opps created: ${res.oppsCreated.length} | skipped(existing): ${res.oppsSkipped.length} | contacts new: ${res.contactsNew.length} | contacts re-tagged: ${res.contactsTagged.length} | errors: ${res.errors.length}`);
  if (res.errors.length) console.log(`Errors:\n  ${res.errors.join('\n  ')}`);
  if (!APPLY) console.log(`\n(Dry-run. Re-run with --apply to write.)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
