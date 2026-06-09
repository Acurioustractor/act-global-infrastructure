#!/usr/bin/env node
/**
 * contained-260-tag-migration.mjs — CONTAINED Adelaide identity-tag migration to the
 * RC5 canonical contract. READ-ONLY worksheet by default; guarded --apply.
 *
 * SCOPE: IDENTITY tags only (project / source / place / cohort / role). It does NOT touch
 * comms: enrolment — newsletter consent is resolved separately by
 * build-contained-consent-worklist (REAL vs PHANTOM), and the 3 newsletter-streams become
 * smart-list SEGMENTS, not tags. The 9 dupe-email conflicts are handled by
 * merge-contained-9-conflicts and are SKIPPED here.
 *
 * Per contact (additive-then-strip, RC3):
 *   ADD    project:act-jh, source:event:contained, interest:justice-reform,
 *          place:<state> (derived from the person's State; FLAGGED if empty — NOT blanket
 *          place:sa, because the import includes interstate/UK delivery-circle contacts),
 *          lane:community + role:storyteller (if currently role:lived-experience).
 *   REMOVE project:contained, project:contained-adelaide-2026, source:form, state:<x>,
 *          cohort:<x> (-> set the cohort custom field instead), newsletter-stream:* (all).
 *   KEEP   campaign-stage:*, engagement:*, ring:*, existing role:/tier:/place:.
 *
 * GUARDS: community-line (never plan comms:; ensure lane:community); conflict-skip (any
 * dupe-email contact — the 9-conflict merge owns those); empty-state FLAG (no place:).
 *
 * SOURCES: row list = JusticeHub output/ghl-contained-adelaide-audit/contained-ghl-import.csv
 * (269 rows). Current tags = Supabase ghl_contacts mirror (paginated, read-only).
 *
 * DRY RUN (default): writes a worksheet to thoughts/shared/reviews/ + prints a summary that
 * must reconcile against the config preflight (269 import / 260 matchable / 9 conflicts) before
 * anyone runs --apply. NO writes.
 *
 * --apply (Tier 3, day-shift, gated to 16 Jun): requires --reviewed too. Snapshots every
 * target contact, TRACER-applies the single lowest-risk contact and verifies it, then runs
 * rate-limited additive-then-strip across the rest, re-reading live tags per contact. Skips
 * conflicts + never adds comms:. NEVER AFK.
 *
 * USAGE:
 *   node scripts/contained-260-tag-migration.mjs                      # worksheet (no writes)
 *   node scripts/contained-260-tag-migration.mjs --apply --reviewed   # live (gated, day-shift)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
await import(join(HERE, '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const REVIEWED = process.argv.includes('--reviewed');
const CSV_PATH = '/Users/benknight/Code/JusticeHub/output/ghl-contained-adelaide-audit/contained-ghl-import.csv';
const WORKSHEET = join(HERE, '../thoughts/shared/reviews/2026-06-09_contained-260-tag-migration-worksheet.md');
const SNAPSHOT = join(HERE, '../thoughts/shared/reviews/2026-06-09_contained-260-tag-migration-snapshot.json');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPECTED_REF = 'tednluwflfhxyucgwigh';
if (!SUPABASE_URL || !SUPABASE_KEY || !SUPABASE_URL.includes(EXPECTED_REF)) {
  console.error('Missing/incorrect Supabase env (need the shared tednluwflfhxyucgwigh mirror). Aborting.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(join(HERE, '../config/campaigns/contained-adelaide-2026.json'), 'utf8'));
const STATE_TO_PLACE = config.canonical_contract.state_to_place; // { NSW:'place:nsw', ... }
const ALWAYS = config.canonical_contract.always;                 // project:act-jh, source:event:contained, interest:justice-reform

// Legacy identity tags this migration strips (comms/newsletter-stream handled elsewhere).
const STRIP_EXACT = new Set(['project:contained', 'project:contained-adelaide-2026', 'source:form']);
const STRIP_PREFIX = ['state:', 'cohort:', 'newsletter-stream:'];
const KEEP_PREFIX = ['campaign-stage:', 'engagement:', 'ring:', 'tier:', 'place:', 'role:', 'lane:', 'interest:', 'project:act-jh', 'source:event:contained', 'comms:'];

// The 9 GHL-ID-vs-email conflicts (primary+secondary) owned by merge-contained-9-conflicts.mjs.
// Any import row hitting one of these is SKIPPED here — the merge consolidates them first.
const CONFLICT_SKIP = new Set([
  'Qtl5PgkHPMnNS1mjnGRO', 'wHstWIW6zo1ifWnWsayd', // Adam Robinson
  'kMG435sXyNZ3g0ka2hzg', '5LqgNvZQ2TGXHyJguHkB', // Corey Tutt
  'UJPGFZbcjcdslJC8jN6T', '7ZKeS2H6Fyi1xDUTvING', // Dr. Simon Quilty
  '0kEs9BJmkmi7ZUc5haEX', 'yk4uK8rgDNGA87EUqNbu', // Kristy Bloomfield
  'Vk0et07jw3qccBZsqBF8', '7WXGBE5zD73ipAJfb5qE', // Sam Davies
  '8QyHvajKpuyHyDmBfcCY', '1FJKzuyt1IpEFdjbJhjC', // Tara Castle
  'D05Oa0eO8arILsSNjiPQ', 'pvZ53c6JlkL5sOPPFiTc', // Tracey Newman
  '0w3yMTXm12bl74aKGce0', 'moxP9fCQ7a2pdibcxPDa', // Willhemina Wahlin
  'cnNzFM6zrQjRaMJ69NpE', 'mTsZ14zvtIs3XaaTHHhX', // Toby Gowland
]);

// Minimal CSV parser (handles quoted fields + embedded commas/newlines).
function parseCSV(t) {
  const rows = []; let f = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ',') { f.push(cur); cur = ''; } else if (c === '\n') { f.push(cur); rows.push(f); f = []; cur = ''; } else if (c === '\r') { /* skip */ } else cur += c; }
  }
  if (cur || f.length) { f.push(cur); rows.push(f); }
  return rows;
}

const norm = (tags) => Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((s) => s.trim()).filter(Boolean) : [];

function planFor(current, state) {
  const set = new Set(current);
  const add = [], remove = [];
  // ADD always-identity
  for (const t of ALWAYS) if (!set.has(t)) add.push(t);
  // place from the person's state (NOT blanket place:sa)
  const placeTag = state && STATE_TO_PLACE[state.toUpperCase()];
  const emptyState = !placeTag;
  if (placeTag && !set.has(placeTag)) add.push(placeTag);
  // community line: lived-experience -> lane:community + role:storyteller
  const communityLine = set.has('role:lived-experience') || set.has('lane:community') || set.has('role:storyteller');
  if (set.has('role:lived-experience')) { remove.push('role:lived-experience'); add.push('lane:community', 'role:storyteller'); }
  // strip legacy
  let cohortValue = null;
  for (const t of current) {
    if (STRIP_EXACT.has(t)) { remove.push(t); continue; }
    if (t.startsWith('cohort:')) { cohortValue = t.slice('cohort:'.length); remove.push(t); continue; }
    if (STRIP_PREFIX.some((p) => t.startsWith(p))) { remove.push(t); continue; }
  }
  // dedupe
  const uniq = (a) => [...new Set(a)];
  return { add: uniq(add), remove: uniq(remove), cohortValue, emptyState, communityLine };
}

async function loadMirror(sb) {
  const byId = new Map();
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from('ghl_contacts').select('ghl_id,email,tags,source,newsletter_consent').range(from, from + 999);
    if (error) throw error;
    for (const r of data || []) byId.set(r.ghl_id, r);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return { byId };
}

async function main() {
  console.log(`\nCONTAINED-260 tag migration — ${APPLY ? (REVIEWED ? 'APPLY (LIVE WRITES)' : 'APPLY BLOCKED (missing --reviewed)') : 'DRY RUN (worksheet, no writes)'}\n`);
  if (APPLY && !REVIEWED) {
    console.error('Refusing --apply without --reviewed. Read the worksheet first, then pass --apply --reviewed. Aborting.');
    process.exit(1);
  }

  const rows = parseCSV(readFileSync(CSV_PATH, 'utf8'));
  const H = rows[0]; const ix = (n) => H.indexOf(n);
  const records = rows.slice(1).filter((r) => r.length > 1).map((r) => ({
    ghlId: r[ix('GHL ID')]?.trim() || '',
    email: (r[ix('Email')] || '').trim().toLowerCase(),
    state: (r[ix('State')] || '').trim(),
    consent: (r[ix('Consent Status')] || '').trim(),
  }));

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { byId } = await loadMirror(sb);

  const plans = [];
  const counts = { total: records.length, matched: 0, unmatched: 0, conflicts: 0, emptyState: 0, communityLine: 0, cohortFieldSets: 0 };
  for (const rec of records) {
    const mirror = (rec.ghlId && byId.get(rec.ghlId)) || null;
    if (!mirror) { counts.unmatched++; plans.push({ ...rec, status: 'UNMATCHED (not in mirror)', add: [], remove: [] }); continue; }
    const isConflict = CONFLICT_SKIP.has(rec.ghlId);
    if (isConflict) { counts.conflicts++; plans.push({ ...rec, status: 'SKIP (dupe-email -> 9-conflict merge owns it)', add: [], remove: [] }); continue; }
    counts.matched++;
    const current = norm(mirror.tags);
    const p = planFor(current, rec.state);
    if (p.emptyState) counts.emptyState++;
    if (p.communityLine) counts.communityLine++;
    if (p.cohortValue) counts.cohortFieldSets++;
    plans.push({ ...rec, status: p.emptyState ? 'PLAN (FLAG: empty state -> no place:)' : 'PLAN', current, ...p });
  }

  // Worksheet
  mkdirSync(dirname(WORKSHEET), { recursive: true });
  const lines = [];
  lines.push('# CONTAINED-260 identity-tag migration worksheet', '');
  lines.push('Generated by `scripts/contained-260-tag-migration.mjs` (READ-ONLY). RC5 unified source.', '');
  lines.push('## Reconcile against config preflight');
  lines.push(`- import rows: **${counts.total}** (config: 269)`);
  lines.push(`- matched in mirror: **${counts.matched}**`);
  lines.push(`- dupe-email conflicts SKIPPED (9-conflict merge owns): **${counts.conflicts}** (config: 9)`);
  lines.push(`- unmatched (not in mirror): **${counts.unmatched}**`);
  lines.push(`- FLAG empty-state (no place:): **${counts.emptyState}**`);
  lines.push(`- community-line (no comms:, ensure lane:community): **${counts.communityLine}**`);
  lines.push(`- cohort custom-field sets (from cohort:<x> tag): **${counts.cohortFieldSets}**`, '');
  lines.push('## Per-contact plan', '');
  lines.push('| email | state | status | ADD | REMOVE | cohort field |');
  lines.push('|---|---|---|---|---|---|');
  for (const p of plans) {
    lines.push(`| ${p.email || '(none)'} | ${p.state || '—'} | ${p.status} | ${(p.add || []).join(' ') || '—'} | ${(p.remove || []).join(' ') || '—'} | ${p.cohortValue || '—'} |`);
  }
  writeFileSync(WORKSHEET, lines.join('\n'));

  console.log(`Worksheet: ${WORKSHEET.replace(join(HERE, '..') + '/', '')}`);
  console.table(counts);

  if (!APPLY) {
    console.log('\nDry run complete. Review the worksheet (esp. empty-state FLAGs + the place: derivation) before --apply --reviewed.\n');
    return;
  }

  // ── GUARDED --apply (Tier 3) ───────────────────────────────────────────
  const { createGHLService } = await import('./lib/ghl-api-service.mjs');
  const ghl = createGHLService();
  const targets = plans.filter((p) => p.status === 'PLAN' || p.status.startsWith('PLAN'));
  // snapshot first
  mkdirSync(dirname(SNAPSHOT), { recursive: true });
  writeFileSync(SNAPSHOT, JSON.stringify(targets.map((t) => ({ ghlId: t.ghlId, email: t.email, current: t.current })), null, 2));
  console.log(`\nSnapshot written (${targets.length} targets): ${SNAPSHOT.replace(join(HERE, '..') + '/', '')}`);

  const RL = 1100; // ms between GHL calls
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function migrateOne(t) {
    // re-read live tags to avoid acting on a stale mirror
    const live = await ghl.getContact(t.ghlId);
    const current = norm(live?.tags);
    const p = planFor(current, t.state);
    for (const tag of p.add) { await ghl.addTagToContact(t.ghlId, tag); await sleep(RL); }
    for (const tag of p.remove) { await ghl.removeTagFromContact(t.ghlId, tag); await sleep(RL); }
    return p;
  }

  // TRACER: one lowest-risk contact first (non-community-line, has email, has a clear plan)
  const tracer = targets.find((t) => !t.communityLine && t.email && (t.add.length || t.remove.length));
  if (!tracer) { console.error('No safe tracer contact found. Aborting before any write.'); process.exit(1); }
  console.log(`\nTRACER: migrating ${tracer.email} (${tracer.ghlId}) ...`);
  await migrateOne(tracer);
  const verify = await ghl.getContact(tracer.ghlId);
  const vt = norm(verify?.tags);
  const ok = ALWAYS.every((a) => vt.includes(a)) && !vt.includes('project:contained-adelaide-2026');
  if (!ok) { console.error('TRACER verification FAILED — canonical tags not present / legacy not stripped. Aborting the rest.'); process.exit(1); }
  console.log('TRACER verified. Proceeding with the remaining contacts...\n');

  let done = 1;
  for (const t of targets) {
    if (t.ghlId === tracer.ghlId) continue;
    await migrateOne(t);
    done++;
    if (done % 20 === 0) console.log(`  migrated ${done}/${targets.length}`);
  }
  console.log(`\nApplied to ${done} contacts. cohort custom-field sets still TODO (needs the cohort field id — see contained-ghl-custom-fields.mjs). Re-run the consent worklist for comms:.\n`);
}

main().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
