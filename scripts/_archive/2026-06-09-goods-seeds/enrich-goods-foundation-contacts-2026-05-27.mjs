/**
 * Enrichment pass for the Goods Supporter Journey (follows the 2026-05-27 seed batch).
 * Source: thoughts/shared/handoffs/goods-foundation-pipeline-2026-05-27/enrichment.md
 * (real humans only — verified from synced email; nothing invented).
 *
 *   A. Promote 2 shells to real humans (updateContact — NO tags passed, so existing
 *      goods-* tags are preserved). QBE shell left as-is (route is via Social Impact Hub).
 *   B. 3 NEW philanthropic foundations Nic is in live Goods conversation with → contact + opp.
 *   C. Secondary / route / corporate contacts → lookup-or-create, ADDITIVE tags, no opp.
 *
 * Idempotent: opps skipped if name exists; contacts looked up by email (POST /contacts/search)
 * then tagged additively. updateContact is naturally idempotent.
 *
 * Usage:
 *   node --env-file=.env.local scripts/enrich-goods-foundation-contacts-2026-05-27.mjs          # dry-run
 *   node --env-file=.env.local scripts/enrich-goods-foundation-contacts-2026-05-27.mjs --apply  # writes
 */

import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const PIPELINE_NAME = 'Supporter Journey';
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const BASE_TAGS = ['goods', 'act-gd', 'project:act-gd'];

// A. Shell → real human. updateContact with name+email ONLY (tags preserved). band left as-is.
const SHELL_UPDATES = [
  { contactId: 'bkZQ6vDNekvTtUVV1TpI', org: 'Minderoo Foundation',     firstName: 'Lucy',    lastName: 'Stronach', email: 'lstronach@minderoo.org' },
  { contactId: '86IotCHStn0fEHyhFtoF', org: 'Paul Ramsay Foundation',  firstName: 'William', lastName: 'Frazer',   email: 'wfrazer@paulramsayfoundation.org.au' },
];

// B. NEW foundations (contact + opp).
const NEW_OPPS = [
  { name: 'The Bryan Foundation', value: 0, stage: 'Cultivating', band: 'goods-warm', role: 'goods-funder',
    contact: { email: 'mcox@thebryanfoundation.org.au', firstName: 'Matthew', lastName: 'Cox', companyName: 'The Bryan Foundation' } },
  { name: 'The Ian Potter Foundation', value: 0, stage: 'Cultivating', band: 'goods-warm', role: 'goods-funder',
    contact: { email: 'alberto.furlan@ianpotter.org.au', firstName: 'Alberto', lastName: 'Furlan', companyName: 'The Ian Potter Foundation' } },
  { name: 'Brian M Davis Charitable Foundation', value: 0, stage: 'Ask made', band: 'goods-warm', role: 'goods-funder',
    contact: { email: 'sarah.bartak@brianmdavis.org.au', firstName: 'Sarah', lastName: 'Bartak', companyName: 'Brian M Davis Charitable Foundation' } },
];

// C. Secondary / route / corporate contacts (no opp — captured in CRM, tagged).
const EXTRA_CONTACTS = [
  { email: 'anita.hopkins@brianmdavis.org.au', firstName: 'Anita',   lastName: 'Hopkins',     companyName: 'Brian M Davis Charitable Foundation', role: 'goods-funder',    band: 'goods-warm' },
  { email: 'jonas@paulramsayfoundation.org.au', firstName: 'Jonas',  lastName: 'Kubitscheck', companyName: 'Paul Ramsay Foundation',               role: 'goods-funder',    band: 'goods-steady' },
  { email: 'jay@socialimpacthub.org',           firstName: 'Jay',    lastName: 'Boolkin',     companyName: 'Social Impact Hub',                    role: 'goods-supporter', band: 'goods-warm' },
  { email: 'matt.allen@socialimpacthub.org',    firstName: 'Matt',   lastName: 'Allen',       companyName: 'Social Impact Hub',                    role: 'goods-supporter', band: 'goods-warm' },
  { email: 'mtaylor@envirobank.com.au',         firstName: 'Marty',  lastName: 'Taylor',      companyName: 'Envirobank',                           role: 'goods-supporter', band: 'goods-warm' },
  { email: 'nanderson@envirobank.com.au',       firstName: 'Narelle',lastName: 'Anderson',    companyName: 'Envirobank',                           role: 'goods-supporter', band: 'goods-warm' },
];

async function main() {
  const ghl = createGHLService();
  const pipeline = await ghl.getPipelineByName(PIPELINE_NAME);
  if (!pipeline) { console.error(`✗ Pipeline "${PIPELINE_NAME}" not found.`); process.exit(1); }
  const stageByKey = new Map(pipeline.stages.map((s) => [norm(s.name), s]));
  const resolveStage = (n) => stageByKey.get(norm(n));
  const existing = await ghl.getOpportunities(pipeline.id, { limit: 100 });
  const existingNames = new Set(existing.map((o) => norm(o.name || '')));
  console.log(`Pipeline "${pipeline.name}" (${pipeline.id}) — existing opps: ${existing.length}`);
  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}\n`);

  const res = { updated: [], oppsCreated: [], oppsSkipped: [], contactsNew: [], contactsTagged: [], errors: [] };

  async function ensureContact({ email, firstName, lastName, companyName }, tags) {
    let contact = null;
    if (email) {
      const matches = await ghl.searchContacts(email);
      contact = matches.find((c) => (c.email || '').toLowerCase() === email.toLowerCase()) || null;
    }
    if (!contact) {
      if (!APPLY) { console.log(`  ↳ WOULD CREATE contact ${firstName} ${lastName} <${email}> [${tags.join(',')}]`); return '(dry)'; }
      contact = await ghl.createContact({ email, firstName, lastName, companyName, tags });
      res.contactsNew.push(email); console.log(`  ↳ created contact ${contact.id} <${email}>`);
    } else if (APPLY) {
      for (const t of tags) await ghl.addTagToContact(contact.id, t);
      res.contactsTagged.push(email); console.log(`  ↳ existing contact ${contact.id} <${email}> — tags ensured`);
    } else { console.log(`  ↳ WOULD TAG existing <${email}> += [${tags.join(',')}]`); }
    return contact?.id || '(dry)';
  }

  console.log('── A. Promote shells to real humans (name+email only, tags preserved) ──');
  for (const u of SHELL_UPDATES) {
    const line = `${u.org}  → ${u.firstName} ${u.lastName} <${u.email}>  (contact ${u.contactId})`;
    if (!APPLY) { console.log(`~ WOULD UPDATE  ${line}`); continue; }
    try {
      await ghl.updateContact(u.contactId, { firstName: u.firstName, lastName: u.lastName, name: `${u.firstName} ${u.lastName}`, email: u.email });
      console.log(`~ UPDATED  ${line}`); res.updated.push(u.org);
    } catch (e) { console.error(`✗ ERROR ${u.org}: ${e.message}`); res.errors.push(`${u.org}: ${e.message}`); }
  }

  console.log('\n── B. NEW foundations (contact + opp) ──');
  for (const f of NEW_OPPS) {
    const cid = await ensureContact(f.contact, [...BASE_TAGS, f.role, f.band]);
    if (existingNames.has(norm(f.name))) { console.log(`= SKIP opp (exists)  ${f.name}`); res.oppsSkipped.push(f.name); continue; }
    const st = resolveStage(f.stage);
    const line = `${f.name}  → ${st.name}  [${f.band}]`;
    if (!APPLY) { console.log(`+ WOULD CREATE opp  ${line}`); continue; }
    try {
      const opp = await ghl.createOpportunity({ pipelineId: pipeline.id, stageId: st.id, name: f.name, monetaryValue: f.value, status: 'open', contactId: cid });
      console.log(`+ CREATED opp  ${line}  (${opp.id})`); res.oppsCreated.push(f.name);
    } catch (e) { console.error(`✗ ERROR ${f.name}: ${e.message}`); res.errors.push(`${f.name}: ${e.message}`); }
  }

  console.log('\n── C. Secondary / route / corporate contacts (no opp) ──');
  for (const c of EXTRA_CONTACTS) await ensureContact(c, [...BASE_TAGS, c.role, c.band]);

  console.log(`\n── Summary ──`);
  console.log(`Shells updated: ${res.updated.length} | opps created: ${res.oppsCreated.length} | opps skipped: ${res.oppsSkipped.length} | contacts new: ${res.contactsNew.length} | contacts re-tagged: ${res.contactsTagged.length} | errors: ${res.errors.length}`);
  if (res.errors.length) console.log(`Errors:\n  ${res.errors.join('\n  ')}`);
  if (!APPLY) console.log(`\n(Dry-run. Re-run with --apply to write.)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
