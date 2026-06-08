#!/usr/bin/env node
/**
 * strip-unconsented-jh-newsletter-2026-06-09.mjs
 *
 * The JusticeHub·Sendable gate (consent ∧ ¬lane:community) drops 19 of 20
 * `comms:justicehub-newsletter` holders. Diagnosis (mirror, 2026-06-09): all 19 are
 * NON-community, `newsletter_consent=false`, `src=ghl` — CONTAINED/import professionals
 * bulk-tagged with the enrolment tag, never a real signup. (1 passes: Lucy Stronach, consented.)
 *
 * Fix = make the data honest: remove ONLY `comms:justicehub-newsletter` from the unconsented 19,
 * so "enrolled" no longer implies a never-given consent. The consent-gated Smart List already kept
 * them safe; this aligns the tag with reality and is fully reversible (a real signup re-adds it).
 *
 * HARD GUARDS:
 *   - NEVER touches `newsletter_consent` (no consent is ever fabricated).
 *   - Removes ONLY `comms:justicehub-newsletter` — every other tag (incl other comms:*, role:, project:) is untouched.
 *   - SKIPS any contact that is `lane:community` (agency model — out of scope here; there are 0, but guarded).
 *   - SKIPS any contact whose mirror `newsletter_consent` is truthy (only unconsented are in scope).
 *   - Re-opt-in worklist written FIRST (even in dry-run) so the intended audience is never lost.
 *
 * Tier-2 GHL write. Default = DRY RUN. Pass --apply to write.
 * NOTE: toby gowland appears x4 (duplicate contacts) — stripping the tag from all is correct;
 * the dedupe/merge is a separate GHL-UI job (no public merge API).
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const TAG = 'comms:justicehub-newsletter';
const EXPECT_LOC = 'agzsSZWgovjwgpcoASWG';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RL = 1100;

if (process.env.GHL_LOCATION_ID !== EXPECT_LOC) {
  throw new Error(`GHL_LOCATION_ID mismatch: got ${process.env.GHL_LOCATION_ID}, expected ${EXPECT_LOC}`);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ghl = createGHLService();

console.log(`\n=== Strip unconsented ${TAG} — ${APPLY ? 'APPLY' : 'DRY_RUN'} ===\n`);

// 1. Source the targets live from the mirror: tag present ∧ consent=false ∧ ¬lane:community ∧ ¬gone
const { data } = await sb.from('ghl_contacts')
  .select('ghl_id, full_name, email, newsletter_consent, tags, source')
  .contains('tags', [TAG]).not('tags', 'cs', '{gone-from-ghl}');
const all = data || [];
const targets = all.filter((r) => r.newsletter_consent !== true && !(r.tags || []).includes('lane:community'));
const consented = all.filter((r) => r.newsletter_consent === true);
const communityLine = all.filter((r) => (r.tags || []).includes('lane:community'));

console.log(`${TAG} holders (live mirror): ${all.length}`);
console.log(`  consented (KEEP, gate-passes): ${consented.length}`);
console.log(`  community-line (SKIP — agency, out of scope): ${communityLine.length}`);
console.log(`  unconsented non-community (STRIP target): ${targets.length}\n`);

// 2. Re-opt-in worklist FIRST (preserve intent) — always written
const wl = 'thoughts/shared/reviews/2026-06-09_jh-newsletter-reoptin-worklist.csv';
const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
fs.writeFileSync(wl, ['full_name,email,ghl_id,source,note',
  ...targets.map((r) => [r.full_name, r.email, r.ghl_id, r.source, 'unconsented JH-newsletter enrolment stripped — re-add only on genuine opt-in'].map(esc).join(','))].join('\n'));
console.log(`re-opt-in worklist → ${wl} (${targets.length} people; toby gowland appears x4 = dedupe in UI)\n`);

if (!APPLY) {
  targets.forEach((r) => console.log(`  WOULD STRIP  ${(r.full_name || r.email || r.ghl_id).padEnd(28)} consent=${r.newsletter_consent}`));
  console.log(`\n[dry-run] No GHL writes. Re-run with --apply to strip ${TAG} from ${targets.length} contacts.\n`);
  process.exit(0);
}

// 3. Apply — per contact: PRE-fetch GHL, double-guard, remove ONLY the JH tag, POST-verify, then mirror-sync
const results = [];
for (const t of targets) {
  const rec = { id: t.ghl_id, name: t.full_name || t.email, status: null, error: null };
  try {
    const before = await ghl.getContactById(t.ghl_id);
    await sleep(RL);
    const beforeTags = Array.isArray(before?.tags) ? before.tags : [];
    if (beforeTags.includes('lane:community')) { rec.status = 'SKIP'; rec.error = 'lane:community (agency)'; results.push(rec); console.log(`SKIP  ${rec.name} — lane:community`); continue; }
    if (!beforeTags.includes(TAG)) { rec.status = 'SKIP'; rec.error = 'tag already absent'; results.push(rec); console.log(`SKIP  ${rec.name} — tag already gone`); continue; }

    await ghl.removeTagFromContact(t.ghl_id, TAG);
    await sleep(RL);
    const after = await ghl.getContactById(t.ghl_id);
    await sleep(RL);
    const afterTags = Array.isArray(after?.tags) ? after.tags : [];
    const lostOther = beforeTags.filter((x) => x !== TAG && !afterTags.includes(x));

    if (!afterTags.includes(TAG) && lostOther.length === 0) {
      // mirror-sync: remove the tag from ghl_contacts.tags for immediate list-count honesty
      await sb.from('ghl_contacts').update({ tags: (t.tags || []).filter((x) => x !== TAG) }).eq('ghl_id', t.ghl_id);
      rec.status = 'OK';
      console.log(`OK    ${rec.name} — ${TAG} removed; ${afterTags.length} tags remain`);
    } else {
      rec.status = 'FAIL-VERIFY';
      rec.error = `stillTag=${afterTags.includes(TAG)} lostOther=[${lostOther.join(',')}]`;
      console.log(`FAIL  ${rec.name} — ${rec.error}`);
    }
  } catch (e) {
    rec.status = 'ERROR'; rec.error = String(e?.message || e);
    console.log(`ERR   ${rec.name} — ${rec.error}`);
  }
  results.push(rec);
}

const out = 'thoughts/shared/reviews/2026-06-09_jh-newsletter-strip-RESULTS.json';
fs.writeFileSync(out, JSON.stringify({ runAt: new Date().toISOString(), location: EXPECT_LOC, tag: TAG, results }, null, 2));
const ok = results.filter((r) => r.status === 'OK').length;
const skip = results.filter((r) => r.status === 'SKIP').length;
const err = results.filter((r) => r.status === 'ERROR' || r.status === 'FAIL-VERIFY').length;
console.log(`\n=== DONE === OK=${ok} SKIP=${skip} ERR=${err}  → ${out}`);
console.log(`consent untouched throughout. broader 62-pop Spam-Act sweep remains a separate Ben decision.\n`);
