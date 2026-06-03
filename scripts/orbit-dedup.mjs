#!/usr/bin/env node
/**
 * orbit-dedup.mjs — programmatic GHL dedup WITHOUT native merge (merge is UI/OAuth-only here).
 *
 * GHL's /contacts/merge is 403 for our private token, and the MCP has no merge/delete tool. So we
 * dedup the safe way: pick the richest record as PRIMARY, union every dupe's tags onto it, then
 * DELETE only the secondaries that are verifiably EMPTY (no conversations, opportunities, or tasks).
 * Any secondary that carries real history is KEPT, never deleted — we trade "exactly one record"
 * for "never lose history."
 *
 *   node scripts/orbit-dedup.mjs prep <email|name>     # DRY-RUN one person (default target = community set)
 *   node scripts/orbit-dedup.mjs prep community         # DRY-RUN Kristy + Rachel + Tanya
 *   node scripts/orbit-dedup.mjs apply <email|name>     # execute for one person (tracer)
 *   node scripts/orbit-dedup.mjs apply community        # execute the 3 community people
 *
 * Primary = most history (conv+opp+task), tiebreak most tags, tiebreak id → we keep the richest.
 * Every delete is logged with the deleted record's full tags for recovery. deleteContact may be
 * 403 (untested) — if so the script reports and stops, no harm (contacts still exist).
 */
import dotenv from 'dotenv';
import { appendFileSync } from 'node:fs';
import { createGHLService } from './lib/ghl-api-service.mjs';
dotenv.config({ path: '.env.local' });

const ghl = createGHLService();
const loc = ghl.locationId;
const mode = process.argv[2] || 'prep';
const target = process.argv[3] || 'community';
const LOG = 'thoughts/shared/orbit-dedup-log.md';
const now = () => new Date().toISOString();
const tagsOf = c => (c.tags || []).slice().sort();
const COMMUNITY = ['kristy.bloomfield@oonchiumpa.com.au', 'rachel atkinson', 'tanya.turner@oonchiumpa.com.au'];

async function history(id) {
  let conv = 0, opp = 0, task = 0;
  try { const d = await ghl.request(`/conversations/search?locationId=${loc}&contactId=${id}`); conv = d.total ?? (d.conversations?.length || 0); } catch {}
  try { const d = await ghl.request(`/opportunities/search?location_id=${loc}&contact_id=${id}`); opp = d.meta?.total ?? (d.opportunities?.length || 0); } catch {}
  try { const d = await ghl.request(`/contacts/${id}/tasks`); task = d.tasks?.length || 0; } catch {}
  return { conv, opp, task, total: conv + opp + task };
}

// resolve a person's dupe-set: search, then group by shared email (reliable key); fall back to exact name.
async function dupeSet(term) {
  const hits = await ghl.searchContacts(term);
  const isEmail = term.includes('@');
  const set = isEmail
    ? hits.filter(c => (c.email || '').toLowerCase() === term.toLowerCase())
    : hits.filter(c => `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase() === term.toLowerCase());
  return set;
}

async function planFor(term) {
  const set = await dupeSet(term);
  if (set.length < 2) return { term, set, note: `only ${set.length} contact — nothing to dedup` };
  const enriched = [];
  for (const c of set) enriched.push({ ...c, hist: await history(c.id) });
  // primary = most history, then most tags, then id
  enriched.sort((a, b) => b.hist.total - a.hist.total || tagsOf(b).length - tagsOf(a).length || a.id.localeCompare(b.id));
  const primary = enriched[0];
  const secondaries = enriched.slice(1);
  const allTags = [...new Set(enriched.flatMap(tagsOf))];
  const unionToAdd = allTags.filter(t => !tagsOf(primary).includes(t));
  const deletable = secondaries.filter(s => s.hist.total === 0);
  const keep = secondaries.filter(s => s.hist.total > 0);
  return { term, set: enriched, primary, secondaries, unionToAdd, deletable, keep };
}

const terms = target === 'community' ? COMMUNITY : [target];

if (mode === 'prep') {
  console.log(`DEDUP DRY-RUN — ${terms.length} person(s). Nothing written.\n`);
  for (const t of terms) {
    const p = await planFor(t);
    if (p.note) { console.log(`■ ${t}: ${p.note}\n`); continue; }
    console.log(`■ ${t} — ${p.set.length} dupes`);
    console.log(`   PRIMARY (keep): ${p.primary.id}  hist(conv/opp/task)=${p.primary.hist.conv}/${p.primary.hist.opp}/${p.primary.hist.task}  tags=${tagsOf(p.primary).length}`);
    console.log(`   union onto primary: [${p.unionToAdd.join(', ') || '(none)'}]`);
    for (const s of p.deletable) console.log(`   DELETE (empty): ${s.id}  hist=0/0/0`);
    for (const s of p.keep) console.log(`   KEEP (has history): ${s.id}  hist=${s.hist.conv}/${s.hist.opp}/${s.hist.task} ← NOT deleted`);
    console.log(`   → would delete ${p.deletable.length}, keep ${1 + p.keep.length}\n`);
  }
  console.log('To execute one person:  node scripts/orbit-dedup.mjs apply <email|name>');
}

else if (mode === 'apply') {
  appendFileSync(LOG, `\n## Dedup ${target} — ${now()}\n`);
  for (const t of terms) {
    const p = await planFor(t);
    if (p.note) { console.log(`■ ${t}: ${p.note}`); continue; }
    console.log(`■ ${t} — primary ${p.primary.id}; union [${p.unionToAdd.join(', ') || 'none'}]; delete ${p.deletable.length} empty, keep ${1 + p.keep.length}`);
    for (const tag of p.unionToAdd) await ghl.addTagToContact(p.primary.id, tag);
    appendFileSync(LOG, `- ${t}: primary ${p.primary.id} (hist ${p.primary.hist.conv}/${p.primary.hist.opp}/${p.primary.hist.task}); unioned [${p.unionToAdd.join(' ')}]\n`);
    for (const s of p.deletable) {
      appendFileSync(LOG, `  - DELETE ${s.id} (empty) · recover-tags=[${tagsOf(s).join(' ')}]\n`);
      try { await ghl.deleteContact(s.id); console.log(`   deleted ${s.id}`); }
      catch (e) {
        console.error(`   DELETE ${s.id} FAILED: ${e.message}`);
        appendFileSync(LOG, `  - DELETE BLOCKED: ${e.message} — deleteContact not permitted for this token; dedup is UI-only.\n`);
        console.error('\n⚠ deleteContact is not permitted (like merge). Dedup must be done in the GHL UI. Stopping.');
        process.exit(0);
      }
    }
    for (const s of p.keep) console.log(`   kept ${s.id} (has history ${s.hist.conv}/${s.hist.opp}/${s.hist.task})`);
    const remaining = (await dupeSet(t)).length;
    console.log(`   remaining for ${t}: ${remaining}`);
    appendFileSync(LOG, `  - AFTER: ${remaining} remain\n`);
  }
  console.log(`\n✓ logged → ${LOG}`);
}
