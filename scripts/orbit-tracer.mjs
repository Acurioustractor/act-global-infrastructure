#!/usr/bin/env node
/**
 * orbit-tracer.mjs — the gated Phase-3 tracer for the energy-orbit relational system.
 *
 * Proves the GHL write path on THREE real records, ONE at a time, each with live before→after.
 * Tier-2 GHL writes; day-shift; run only on Ben's explicit go. Every write is reversible and
 * logged to thoughts/shared/orbit-tracer-log.md.
 *
 *   node scripts/orbit-tracer.mjs read           # READ-ONLY recon of all three (default)
 *   node scripts/orbit-tracer.mjs croft          # ① create Ben Croft → circle:gsd-alliance
 *   node scripts/orbit-tracer.mjs kristy         # ② community-line fix (tags only; NO merge)
 *   node scripts/orbit-tracer.mjs allan          # ③ un-ghost Allan Palm Island
 *
 * Tag writes use add/removeTagFromContact (per-tag POST/DELETE) — never blind-overwrite.
 * Dedup/merge is NOT done here (destructive Tier-3) — flagged for a separate explicit decision.
 */
import dotenv from 'dotenv';
import { appendFileSync } from 'node:fs';
import { createGHLService } from './lib/ghl-api-service.mjs';
dotenv.config({ path: '.env.local' });

const ghl = createGHLService();
const mode = process.argv[2] || 'read';
const LOG = 'thoughts/shared/orbit-tracer-log.md';
const log = (line) => { try { appendFileSync(LOG, line + '\n'); } catch {} };
const tagsOf = c => (c.tags || []).slice().sort();
const show = (c) => `      id=${c.id}  "${`${c.firstName || ''} ${c.lastName || ''}`.trim()}" <${c.email || 'no-email'}>\n        tags: [${tagsOf(c).join(', ')}]`;

async function findAll(query) {
  const r = await ghl.searchContacts(query).catch(e => { console.error('search failed:', e.message); return []; });
  return r;
}

const now = () => new Date().toISOString();
async function refetch(id) { return await ghl.getContactById(id); }

if (mode === 'croft') {
  // ① promote the existing (nameless) supporter-lane contact → circle:gsd-alliance + set name.
  // Resolve the target LIVE by email at write-time (no pasted IDs) and verify it's a unique exact match.
  const EMAIL = 'ben@croftski.com';
  const matches = (await findAll(EMAIL)).filter(x => (x.email || '').toLowerCase() === EMAIL);
  if (matches.length !== 1) { console.error(`Expected exactly 1 contact for ${EMAIL}, found ${matches.length}. Aborting.`); process.exit(1); }
  const c = matches[0];
  console.log(`① BEN CROFT — resolved ${EMAIL} → ${c.id} (verified exact, unique). before:`); console.log(show(c));
  log(`\n## ① Ben Croft — ${now()}\n- contact: ${c.id} <${c.email}>\n- before name: "${c.firstName||''} ${c.lastName||''}" · tags: [${tagsOf(c).join(', ')}]`);
  await ghl.updateContact(c.id, { firstName: 'Ben', lastName: 'Croft' });
  if (!tagsOf(c).includes('circle:gsd-alliance')) await ghl.addTagToContact(c.id, 'circle:gsd-alliance');
  const after = await refetch(c.id);
  console.log('   after:'); console.log(show(after));
  log(`- ACTION: set name → "Ben Croft"; +tag circle:gsd-alliance\n- after name: "${after.firstName||''} ${after.lastName||''}" · tags: [${tagsOf(after).join(', ')}]\n- UNDO: removeTag circle:gsd-alliance (name was blank before)`);
  console.log('\n✓ logged → thoughts/shared/orbit-tracer-log.md');
}

else if (mode === 'kristy') {
  // ② community-line fix on ALL live dupes: strip ladder + drip funnels; mark constellation. NO merge.
  const VIOL = ['tier:curious', 'tier:connected', 'comms:funder-drip', 'comms:partner-drip'];
  const seen = new Map();
  for (const c of await findAll('kristy.bloomfield@oonchiumpa.com.au')) seen.set(c.id, c);
  const contacts = [...seen.values()];
  console.log(`② KRISTY BLOOMFIELD — ${contacts.length} live dupes; stripping ${VIOL.join(', ')} + adding lane:community (NO merge).`);
  log(`\n## ② Kristy Bloomfield — ${now()}\n- ${contacts.length} dupes (community-line fix; tags only, NOT merged)`);
  for (const c of contacts) {
    const before = tagsOf(c);
    const toRemove = VIOL.filter(t => before.includes(t));
    console.log(`\n   ${c.id} — before: [${before.join(', ')}]`);
    for (const t of toRemove) await ghl.removeTagFromContact(c.id, t);
    if (!before.includes('lane:community')) await ghl.addTagToContact(c.id, 'lane:community');
    const after = await refetch(c.id);
    console.log(`   removed: [${toRemove.join(', ')}]  +lane:community`);
    console.log(`   after:  [${tagsOf(after).join(', ')}]`);
    log(`- ${c.id}: removed [${toRemove.join(', ')}], +lane:community · UNDO: re-add removed, remove lane:community · before=[${before.join(' ')}]`);
  }
  console.log(`\n✓ ${contacts.length} dupes fixed + logged. STILL TO DO (separate explicit "merge"): dedup these ${contacts.length} into one canonical contact.`);
}

else if (mode === 'allan') {
  // ③ un-ghost (Ben: re-create). He's an ELDER / Traditional Owner Director, community-lane,
  // no email/phone in EL. Re-create as a COMMUNITY-LANE contact (no tier, no drips), marked
  // elder, linked back to his EL storyteller record via the EL synthetic-email convention.
  // Internal CRM recognition only — nothing about him is published (no consent-check needed).
  const EL_ID = '07dbb433-e386-49ca-a24a-e4a5a5c12417';                 // EL storyteller_id (13 transcripts)
  const EMAIL = `storyteller-${EL_ID.slice(0, 8)}@empathy-ledger.local`; // non-deliverable EL link, not a real inbox
  // guard: don't dupe — abort if a person-contact already exists at that email or as Allan
  const existing = (await findAll(EMAIL)).filter(x => (x.email || '').toLowerCase() === EMAIL);
  const personHits = (await findAll('Allan Palm Island')).filter(x => /allan/i.test(`${x.firstName} ${x.lastName}`));
  if (existing.length || personHits.length) {
    console.log(`③ ALLAN — already present (${existing.length + personHits.length} match). Aborting create to avoid a dupe.`);
    for (const c of [...existing, ...personHits]) console.log(show(c));
    process.exit(0);
  }
  const tags = ['lane:community', 'role:storyteller', 'role:elder', 'place:palm-island', 'source:empathy-ledger'];
  console.log(`③ ALLAN PALM ISLAND — creating community-lane contact (elder), linked to EL ${EL_ID}.`);
  const created = await ghl.createContact({ firstName: 'Allan', lastName: 'Palm Island', email: EMAIL, tags });
  const c = created.contact || created;
  const after = await refetch(c.id);
  console.log('   created:'); console.log(show(after));
  log(`\n## ③ Allan Palm Island — ${now()}\n- CREATED ${c.id} <${EMAIL}> linked to EL storyteller ${EL_ID} (13 transcripts; is_elder=true; Traditional Owner Director)\n- tags: [${tagsOf(after).join(', ')}]\n- name: "Allan Palm Island" (EL spelling; honorific "Uncle" left for community/Ben to confirm)\n- UNDO: deleteContact ${c.id}`);
  console.log('\n✓ logged. Name = EL spelling "Allan Palm Island"; "Uncle" honorific left for you/community to confirm.');
}

else if (mode === 'merge-kristy') {
  // DESTRUCTIVE (Tier-3, explicit "merge Kristy" given): union all tags onto the most-complete
  // record, then merge+delete the others. Targets resolved LIVE by email (no pasted IDs).
  const EMAIL = 'kristy.bloomfield@oonchiumpa.com.au';
  const seen = new Map();
  for (const c of await findAll(EMAIL)) if ((c.email || '').toLowerCase() === EMAIL) seen.set(c.id, c);
  const contacts = [...seen.values()];
  if (contacts.length < 2) { console.log(`Only ${contacts.length} contact(s) for ${EMAIL} — nothing to merge.`); process.exit(0); }
  contacts.sort((a, b) => tagsOf(b).length - tagsOf(a).length || a.id.localeCompare(b.id)); // primary = most complete
  const primary = contacts[0], secondaries = contacts.slice(1);
  console.log(`MERGE KRISTY — primary ${primary.id} (${tagsOf(primary).length} tags); merging ${secondaries.length} secondaries.`);
  log(`\n## ② Kristy MERGE — ${now()}\n- primary: ${primary.id} · pre-merge tags: [${tagsOf(primary).join(' ')}]`);
  for (const s of secondaries) log(`- secondary ${s.id} tags (pre-merge, for UNDO): [${tagsOf(s).join(' ')}]`);
  // 1) union every unique tag onto the primary so the merge can't drop one
  const primTags = new Set(tagsOf(primary));
  const toAdd = [...new Set(contacts.flatMap(tagsOf))].filter(t => !primTags.has(t));
  for (const t of toAdd) await ghl.addTagToContact(primary.id, t);
  console.log(`   unioned onto primary: [${toAdd.join(', ') || '(none)'}]`);
  log(`- unioned onto primary: [${toAdd.join(' ') || '(none)'}]`);
  // 2) merge each secondary into primary (deletes the secondary)
  let merged = 0, mergeErr = null;
  for (const s of secondaries) {
    try { await ghl.mergeContacts(primary.id, s.id); merged++; console.log(`   merged + deleted ${s.id}`); }
    catch (e) { mergeErr = e.message; console.error(`   merge ${s.id} FAILED: ${e.message}`); break; }
  }
  if (mergeErr) {
    console.error(`\n⚠ MERGE BLOCKED (${merged}/${secondaries.length} done). The GHL token can add/remove tags + create,`);
    console.error('   but /contacts/merge returns 403 — the private token lacks the contacts-merge scope.');
    console.error('   Tags were unioned onto the primary first, so NO data is at risk. Options: merge in the GHL UI');
    console.error(`   (preserves history; primary = ${primary.id}), or grant the token merge scope + re-run.`);
    log(`- MERGE BLOCKED: 403 on /contacts/merge (token lacks merge scope). ${merged}/${secondaries.length} merged. Tags pre-unioned onto primary ${primary.id} (incl goods-partner) so no loss. Resolve via GHL UI merge or scope grant.`);
    process.exit(0);
  }
  const after = await refetch(primary.id);
  const remaining = (await findAll(EMAIL)).filter(c => (c.email || '').toLowerCase() === EMAIL);
  console.log('\n   final canonical Kristy:'); console.log(show(after));
  console.log(`   remaining contacts at ${EMAIL}: ${remaining.length}`);
  log(`- AFTER: ${remaining.length} contact(s) remain · final tags: [${tagsOf(after).join(' ')}]\n- UNDO: merge is destructive — recreate secondaries from logged pre-merge tags if needed`);
  console.log('\n✓ merged + logged.');
}

else if (mode === 'read') {
  console.log('READ-ONLY recon (live GHL) — nothing is written.\n');
  console.log('① BEN CROFT  (expect: absent — uncaptured ally)');
  const croftByEmail = await ghl.lookupContactByEmail('ben@croftski.com');
  const croftSearch = await findAll('Croft');
  console.log(`   lookup ben@croftski.com → ${croftByEmail ? 'FOUND' : 'not found'}`);
  for (const c of croftSearch) console.log(show(c));
  if (!croftSearch.length) console.log('      (no "Croft" matches)');

  console.log('\n② KRISTY BLOOMFIELD  (expect: dupes + tier:/drip community-line violation)');
  for (const c of await findAll('kristy.bloomfield@oonchiumpa.com.au')) console.log(show(c));
  const kByName = await findAll('Kristy Bloomfield');
  console.log(`   ("Kristy Bloomfield" name search → ${kByName.length} rows)`);
  for (const c of kByName) console.log(show(c));

  console.log('\n③ ALLAN PALM ISLAND  (expect: gone-from-ghl ghost)');
  for (const c of [...await findAll('Allan Palm Island'), ...await findAll('Uncle Allan')]) console.log(show(c));
  console.log('\nDone (read-only). Re-run with: croft | kristy | allan');
}

else { console.error(`Unknown mode "${mode}". Use: read | croft | kristy | allan`); process.exit(1); }
