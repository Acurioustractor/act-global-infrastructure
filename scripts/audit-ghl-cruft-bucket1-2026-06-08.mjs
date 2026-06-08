#!/usr/bin/env node
/**
 * audit-ghl-cruft-bucket1-2026-06-08.mjs — READ-ONLY. No writes, ever.
 *
 * Phase B / bucket 1 (CRUFT) DRY-RUN reconciliation. Does ONE thing: GET the live
 * GHL location tag library and reconcile it against the bucket-1 cruft set from
 * the flat-tag map (thoughts/shared/reviews/ghl-flat-tag-map-2026-06-08.md).
 *
 * Answers: of the cruft the map says to delete, which tag DEFINITIONS actually
 * exist in live GHL (i.e. what an --apply would really remove), and which are
 * mirror-only artifacts (e.g. gone-from-ghl*, which is a Supabase soft-delete
 * marker never written to GHL — see clean-stale-ghl-contacts-from-manifest.mjs).
 *
 * The actual delete tool is scripts/delete-junk-ghl-tags.mjs (Tier 3, Ben's verb).
 * This script can ONLY read.
 *
 * Usage: node scripts/audit-ghl-cruft-bucket1-2026-06-08.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
if (!KEY || !LOC) { console.error('Missing GHL_API_KEY / GHL_LOCATION_ID'); process.exit(1); }
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', Accept: 'application/json' };
const BASE = 'https://services.leadconnectorhq.com';

// ---- bucket-1 cruft target set (from the flat-tag map + handoff execution order) ----
// Regex junk = exactly what delete-junk-ghl-tags.mjs would match.
const isRegexJunk = (name) => {
  const t = name.trim().toLowerCase();
  return /^gone-from-ghl/.test(t)
    || /(^|[^a-z])(smoke|webhook-test|test-delete|codex)([^a-z]|$)/.test(t)
    || t === 'test-submission' || t === 'test' || t === 'test-delete-me'
    || /-review-20\d\d|needs-name-review|duplicate-review|migration-review/.test(t)
    || /^context:/.test(t)
    || t === 'auto-triage';
};
// Explicit extras the map/handoff add beyond the regex (need --tags wave to delete).
const EXTRA_CRUFT = [
  'quiz-completed',
  'no email', 'needs-attention', 'ai-flagged', 'business-registration',           // operational
  'community-idea', 'idea-general', 'residency-applicant', 'residency-artist',     // orphan-DROP test/data-quality
  'business-interest', 'biz-expression-of-interest', 'ramsey', 'minderoo-connection',
].map((s) => s.toLowerCase());

async function main() {
  const r = await fetch(`${BASE}/locations/${LOC}/tags`, { headers: H });
  if (!r.ok) { console.error('GET tags failed', r.status, (await r.text()).slice(0, 200)); process.exit(1); }
  const tags = (await r.json()).tags || [];
  const names = new Set(tags.map((t) => t.name.trim().toLowerCase()));

  console.log(`=== Bucket-1 cruft DRY-RUN (live GHL tag library) ===`);
  console.log(`Location ${LOC} has ${tags.length} tag definitions.\n`);

  const regexMatched = tags.filter((t) => isRegexJunk(t.name)).sort((a, b) => a.name.localeCompare(b.name));
  console.log(`--- A) Regex-junk tag DEFINITIONS present in GHL (delete-junk-ghl-tags.mjs would remove these) — ${regexMatched.length} ---`);
  regexMatched.forEach((t) => console.log(`  ${t.name}`));

  console.log(`\n--- B) Extra cruft from map/handoff (need --tags wave) — present vs absent in GHL ---`);
  const extraPresent = [], extraAbsent = [];
  for (const n of EXTRA_CRUFT) (names.has(n) ? extraPresent : extraAbsent).push(n);
  console.log(`  PRESENT (${extraPresent.length}): ${extraPresent.join(', ') || '(none)'}`);
  console.log(`  ABSENT  (${extraAbsent.length}): ${extraAbsent.join(', ') || '(none)'}`);

  console.log(`\n--- C) Mirror-only artifact check ---`);
  const goneInGhl = tags.filter((t) => /^gone-from-ghl/.test(t.name.trim().toLowerCase()));
  console.log(`  gone-from-ghl* definitions in live GHL: ${goneInGhl.length} ${goneInGhl.length === 0 ? '(confirmed mirror-only — nothing to delete in GHL)' : '(UNEXPECTED — present in GHL: ' + goneInGhl.map(t=>t.name).join(', ') + ')'}`);

  console.log(`\n--- TOTAL tag definitions an --apply would target ---`);
  console.log(`  Regex-junk: ${regexMatched.length}  +  Extra-present: ${extraPresent.length}  =  ${regexMatched.length + extraPresent.length}`);
  console.log(`\n(READ-ONLY audit — no deletions performed. Delete via delete-junk-ghl-tags.mjs with Ben's verb.)`);
}
main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
