#!/usr/bin/env node
/**
 * reconcile-org-ghost-mirror-2026-06-09.mjs
 *
 * Move 1 of the orgs→Companies migration deleted 34 org-as-contact records in
 * GHL (see scripts/retire-org-contacts-2026-06-09.mjs). The Supabase mirror
 * (ghl_contacts) still carries those 34 rows as GHOSTS. This reconciles the
 * mirror to GHL using the established soft-delete pattern:
 *   - append `gone-from-ghl-<today>` + `gone-from-ghl` to tags
 *   - NULL ghl_contact_id on any FK'd ghl_opportunities (next re-sync refreshes)
 *
 * NOT a hard delete: 7 tables FK to ghl_contacts (communications_history,
 * relationship_health, user_identities, voice_notes, …). Soft-delete keeps the
 * audit trail queryable; downstream filters with NOT (tags @> ARRAY['gone-from-ghl']).
 *
 * Safety: per-id LIVE GHL check first — a row that is NOT 404 in GHL is FLAGGED
 * and skipped (it would mean the delete didn't take, or the id is wrong).
 *
 * Usage:
 *   node scripts/reconcile-org-ghost-mirror-2026-06-09.mjs           # dry-run
 *   node scripts/reconcile-org-ghost-mirror-2026-06-09.mjs --apply
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The 34 org-as-contact ghl_ids retired in Move 1 (source: retire-org-contacts-2026-06-09.mjs)
const IDS = [
  'MxDCQuWzhl1l9L0fujj6','YSgKCLjrz8mOzXianscn','Q6JZYRh0i6sJxbaDk5WA','5SUZbGyG14Q4fSLtGfmK',
  'rehcTEdarUUNx91r06ap','sq8AeMqnXJFhReHCxggr','SczQgdmEOSHYnVcs1LII','dd5rHFESa8DCi5uSJyr6',
  'vQYVHLQZlKDZB5b5Yitk','NDkOyddNl1Pajj1Fr4RO','BGyanKf035L4KIIshJnF','bjixgh1blualVbNIKrPG',
  'T11kOpYh703ud8IUkgOZ','ev3DobfSdh8uqoW4NjMP','cwjSZmZrwbpeoTi98qag','wrRHeRChqJEXAcOp5HAw',
  '9DIjNWgD0WXnUhB2DAUm','yduVJ4zdFaVn7fKMbPxf','TWi4OBECVJbse2HLtYQt','M1nD1Eg2vQzS5bS7LwtR',
  'jyq6kpllvY6A9h9Vnx9s','3Ot8tdFR2Xlb8KkOgNWO','lj1HY0GS0vaHQYvXtAiS','HAN2VLPXisHJErXrXkhy',
  'RCmAdzqPUceLaiQwkliv','1dUSJ8bwFl32u1UrZ0cu','agnn4YZ9Iwixiwco0f83','Ud33HAOZRSOg5kfV4FTy',
  'L0N5scaDjkWALI88SFGR','BjPQ4FwKI6yXf9DqHFEG','64FUSK218liWpGTi9Z2u','QYFJPrbiYcK0R7wPzCxZ',
  '6jEeR6lbputXOxp4ZZqf','8gOgn0mjerwpKYSZvkVH',
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const ghl = createGHLService();

console.log(`\n=== Reconcile org-ghost mirror — ${APPLY ? 'APPLY' : 'DRY_RUN'} (${IDS.length} ids) ===\n`);

// 1. LIVE GHL check — confirm each is truly gone (404). Flag any survivors.
const goneInGhl = [];
const stillLive = [];
for (const id of IDS) {
  try {
    await ghl.request(`/contacts/${id}`);
    stillLive.push(id);
    console.log(`  ⚠ LIVE  ${id} — still exists in GHL, will NOT touch mirror row`);
  } catch (e) {
    if (e.message.includes('404') || e.message.toLowerCase().includes('not found')) {
      goneInGhl.push(id);
    } else {
      stillLive.push(id);
      console.log(`  ? ERR   ${id} — non-404 (${e.message.slice(0, 80)}) — skipping to be safe`);
    }
  }
  await sleep(1100);
}
console.log(`\n  confirmed gone in GHL: ${goneInGhl.length} / ${IDS.length}  (survivors/errors skipped: ${stillLive.length})`);

// 2. Inspect mirror state for the confirmed-gone ids
const { data: rows } = await supabase
  .from('ghl_contacts')
  .select('ghl_id, full_name, email, tags')
  .in('ghl_id', goneInGhl);
const present = rows || [];
const alreadyMarked = present.filter((r) => (r.tags || []).some((t) => String(t).startsWith('gone-from-ghl')));
const toMark = present.filter((r) => !(r.tags || []).some((t) => String(t).startsWith('gone-from-ghl')));
const missingFromMirror = goneInGhl.filter((id) => !present.some((r) => r.ghl_id === id));

const { data: opps } = await supabase
  .from('ghl_opportunities')
  .select('id, name, pipeline_name, project_code, ghl_contact_id')
  .in('ghl_contact_id', goneInGhl);

console.log(`\nMirror state:`);
console.log(`  rows present in ghl_contacts:        ${present.length}`);
console.log(`  already marked gone-from-ghl:        ${alreadyMarked.length}`);
console.log(`  TO MARK (ghost, unmarked):           ${toMark.length}`);
console.log(`  not in mirror (nothing to do):       ${missingFromMirror.length}`);
console.log(`  FK'd opportunities to NULL:          ${opps?.length || 0}`);
if (toMark.length) {
  console.log(`\n  Ghost rows to mark:`);
  for (const r of toMark) console.log(`    - ${(r.full_name || r.email || r.ghl_id)}  [${r.ghl_id}]`);
}

if (!APPLY) {
  console.log(`\n[dry-run] No writes. Re-run with --apply to mark ${toMark.length} ghost(s) + NULL ${opps?.length || 0} opp FK(s).\n`);
  process.exit(0);
}

// 3. Apply — soft-delete the ghosts + NULL opp FKs
const today = new Date().toISOString().slice(0, 10);
const goneTag = `gone-from-ghl-${today}`;
let marked = 0, failed = 0;
for (const r of toMark) {
  const newTags = [...new Set([...(r.tags || []), goneTag, 'gone-from-ghl'])];
  const { error } = await supabase.from('ghl_contacts').update({ tags: newTags }).eq('ghl_id', r.ghl_id);
  if (error) { failed++; console.error(`  ✗ ${r.ghl_id}: ${error.message.slice(0, 100)}`); }
  else marked++;
}
let nulled = 0;
for (const o of (opps || [])) {
  const { error } = await supabase.from('ghl_opportunities').update({ ghl_contact_id: null }).eq('id', o.id);
  if (!error) nulled++;
}
console.log(`\n✓ Marked ${marked} ghost(s) gone-from-ghl (${failed} failed) · NULLed ${nulled} opp FK(s).`);
console.log(`  Filter ghosts in queries with: WHERE NOT (tags @> ARRAY['gone-from-ghl'])\n`);
