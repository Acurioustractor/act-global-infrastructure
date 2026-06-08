#!/usr/bin/env node

/**
 * backfill-lane-community-2026-06-08.mjs — Ben-authorized 2026-06-08
 *
 * Adds lane:community to every LIVE community-line GHL contact that lacks it, and
 * strips active drip tags from those that have them (no consent = an OCAP violation).
 *
 * lane:community = the OCAP agency-model PROTECTIVE marker: never AUTO-enrolled into
 * comms:* drips, never an automation segment. NOT exclusion — operational + human +
 * explicitly-opted-in messages still flow. Canon:
 * wiki/concepts/ghl-audience-comms-automation.md §5.
 *
 * Worklist source: ghl_contacts mirror (shared Supabase). The mirror is OUT OF SYNC
 * with live GHL for the storyteller population (many rows are gone-from-ghl, or are
 * Empathy-Ledger-sourced ids that 404 in the A Curious Tractor GHL account). So this
 * script: (1) excludes gone-from-ghl* rows, (2) getContactById FIRST per candidate and
 * CLEAN-SKIPS anyone not in GHL, (3) decides add/strip from LIVE tags, not the mirror.
 *
 * Pattern follows strip-community-line-tags.mjs: per-tag add/remove (never blind
 * overwrite), before/after + UNDO logged, dry-run by default. Rate-limited ~1.1s.
 *
 * Usage:
 *   node scripts/backfill-lane-community-2026-06-08.mjs            # dry-run (default) — candidate list from mirror, NO GHL calls
 *   node scripts/backfill-lane-community-2026-06-08.mjs --tracer   # write the FIRST candidate that exists in GHL, verify, stop
 *   node scripts/backfill-lane-community-2026-06-08.mjs --apply    # verify + write ALL candidates
 */

import dotenv from 'dotenv';
import { appendFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' }); // fill gaps; .env.local wins

const APPLY = process.argv.includes('--apply');
const TRACER = process.argv.includes('--tracer');
const LIVE = APPLY || TRACER;
const LOG = 'thoughts/shared/reviews/lane-community-backfill-2026-06-08.md';
const SLEEP_MS = 1100; // GHL rate limit ~60/min/tenant

const COMMUNITY_LINE = [
  'role:storyteller', 'role:community', 'role:community-controlled', 'role:elder',
  'storyteller', 'Storyteller', 'audience-storyteller', 'featured storyteller', 'story-feature',
  'community', 'elder', 'goods-communitycontrolled', 'goods-community', 'indigenous-led',
];
const DRIP_TAGS = [
  'comms:partner-drip', 'comms:funder-drip', 'comms:buyer-drip', 'comms:nurture', 'comms:supporter-drip',
];
const LANE = 'lane:community';

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const ghl = createGHLService();
const log = (s) => { console.log(s); if (LIVE) appendFileSync(LOG, s + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tagsLc = (c) => (c.tags || []).map((t) => String(t).toLowerCase());
const isNotFound = (m) => /not found|404|400/i.test(String(m || ''));

// --- Build candidate list from the mirror (paginate past the 1000-row cap) ---
let rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, tags')
    .overlaps('tags', COMMUNITY_LINE)
    .not('ghl_id', 'is', null)
    .range(from, from + 999);
  if (error) { console.error('Supabase error:', error.message); process.exit(1); }
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}
const lackLane = rows.filter((r) => !(r.tags || []).includes(LANE));
// Drop contacts deleted from GHL (gone-from-ghl* markers) — they 404 on write.
const candidates = lackLane.filter((r) => !(r.tags || []).some((t) => String(t).startsWith('gone-from-ghl')));

log(`\n# lane:community backfill — ${new Date().toISOString()} ${APPLY ? '(APPLY)' : TRACER ? '(TRACER)' : '(DRY RUN)'}`);
log(`Community-line rows: ${rows.length} · lacking lane: ${lackLane.length} · gone-from-ghl excluded: ${lackLane.length - candidates.length} · CANDIDATES: ${candidates.length}`);

let added = 0, stripped = 0, alreadyHad = 0, notInGhl = 0, errors = 0;

for (const r of candidates) {
  if (!LIVE) {
    const drips = DRIP_TAGS.filter((d) => (r.tags || []).includes(d));
    log(`- ${r.full_name || '(no name)'} ${r.ghl_id}: +${LANE}${drips.length ? ` −[${drips.join(', ')}]` : ''} [dry, mirror]`);
    added++; stripped += drips.length; continue;
  }

  // LIVE: verify the contact exists in GHL, then act on its LIVE tags.
  let live;
  try { live = await ghl.getContactById(r.ghl_id); }
  catch (e) {
    if (isNotFound(e.message)) { notInGhl++; log(`- skip (not in GHL): ${r.full_name || ''} ${r.ghl_id}`); await sleep(SLEEP_MS); continue; }
    errors++; log(`  ⚠ ERROR get ${r.ghl_id}: ${e.message}`); await sleep(SLEEP_MS); continue;
  }
  if (!live) { notInGhl++; log(`- skip (not in GHL): ${r.full_name || ''} ${r.ghl_id}`); await sleep(SLEEP_MS); continue; }

  const lt = tagsLc(live);
  const hasLane = lt.includes(LANE);
  const drips = DRIP_TAGS.filter((d) => lt.includes(d.toLowerCase()));
  const who = live.contactName || `${live.firstName || ''} ${live.lastName || ''}`.trim() || r.full_name || '(no name)';

  try {
    if (TRACER) log(`\n## TRACER ${who} (${r.ghl_id})\n- before: [${lt.join(', ')}]`);
    if (!hasLane) { await ghl.addTagToContact(r.ghl_id, LANE); added++; } else { alreadyHad++; }
    for (const d of drips) { await ghl.removeTagFromContact(r.ghl_id, d); stripped++; }
    if (TRACER) {
      const after = await ghl.getContactById(r.ghl_id);
      const at = tagsLc(after);
      const ok = at.includes(LANE) && !drips.some((d) => at.includes(d.toLowerCase()));
      log(`- after:  [${at.join(', ')}]\n- verify: ${ok ? '✅ lane present + drips gone' : '⚠ CHECK'}`);
      log(`\nTRACER done on 1 live contact. Rerun with --apply for all ${candidates.length} candidates.`);
      log(`UNDO: removeTagFromContact('${r.ghl_id}', '${LANE}')${drips.length ? `; re-add [${drips.join(', ')}]` : ''}`);
      process.exit(0);
    }
    log(`- ${who} ${r.ghl_id}: ${hasLane ? '(lane already) ' : '+' + LANE + ' '}${drips.length ? `−[${drips.join(', ')}]` : ''}`);
  } catch (e) { errors++; log(`  ⚠ ERROR write ${r.ghl_id}: ${e.message}`); }
  await sleep(SLEEP_MS);
}

log(`\nDone. +${LANE} on ${added} · drips stripped ${stripped} · already had lane ${alreadyHad} · not in GHL (skipped) ${notInGhl} · errors ${errors}. ${LIVE ? '(LIVE)' : '(dry run)'}`);
if (LIVE) log(`UNDO: remove '${LANE}' from the ids logged with '+${LANE}'; re-add any drip tags shown per line.`);
