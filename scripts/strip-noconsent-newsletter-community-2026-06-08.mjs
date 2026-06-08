#!/usr/bin/env node

/**
 * strip-noconsent-newsletter-community-2026-06-08.mjs — Ben-authorized 2026-06-08
 *
 * OCAP consent cleanup (the layer after the lane:community backfill). Strips
 * newsletter comms:* tags from COMMUNITY-LINE contacts that have NO consent
 * (newsletter_consent != true). Agency model: a lane:community person may hold a
 * newsletter comms ONLY with an explicit opt-in — so consented community-line
 * contacts are KEPT (honored), only the non-consented are stripped.
 *
 * Scope (confirmed 2026-06-08): community-line + newsletter comms + no consent,
 * live in GHL (gone-from-ghl excluded). ~13 contacts. The 62 NON-community
 * no-consent newsletter holders are a separate Spam-Act decision, NOT in scope.
 *
 * Verify-first per contact (mirror is out of sync — see backfill notes). Per-tag
 * removeTagFromContact, before/after + UNDO logged, dry-run default, ~1.1s rate.
 *
 * Usage:
 *   node scripts/strip-noconsent-newsletter-community-2026-06-08.mjs           # dry-run
 *   node scripts/strip-noconsent-newsletter-community-2026-06-08.mjs --tracer  # first live one, verify, stop
 *   node scripts/strip-noconsent-newsletter-community-2026-06-08.mjs --apply   # all
 */

import dotenv from 'dotenv';
import { appendFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const TRACER = process.argv.includes('--tracer');
const LIVE = APPLY || TRACER;
const LOG = 'thoughts/shared/reviews/noconsent-newsletter-strip-2026-06-08.md';
const SLEEP_MS = 1100;

const COMMUNITY_LINE = [
  'role:storyteller', 'role:community', 'role:community-controlled', 'role:elder',
  'storyteller', 'Storyteller', 'audience-storyteller', 'featured storyteller', 'story-feature',
  'community', 'elder', 'goods-communitycontrolled', 'goods-community', 'indigenous-led',
];
const NEWSLETTER = ['comms:act-newsletter', 'comms:goods-newsletter', 'comms:harvest-newsletter', 'comms:justicehub-newsletter', 'comms:newsletter'];

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const ghl = createGHLService();
const log = (s) => { console.log(s); if (LIVE) appendFileSync(LOG, s + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tagsLc = (c) => (c.tags || []).map((t) => String(t).toLowerCase());
const isNotFound = (m) => /not found|404|400/i.test(String(m || ''));

// Candidates from mirror: community-line + newsletter comms, NOT consented, live.
let rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, tags, newsletter_consent')
    .overlaps('tags', COMMUNITY_LINE)
    .overlaps('tags', NEWSLETTER)
    .not('ghl_id', 'is', null)
    .range(from, from + 999);
  if (error) { console.error('Supabase error:', error.message); process.exit(1); }
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}
const candidates = rows.filter((r) =>
  r.newsletter_consent !== true &&
  !(r.tags || []).some((t) => String(t).startsWith('gone-from-ghl')),
);

log(`\n# no-consent newsletter strip (community-line) — ${new Date().toISOString()} ${APPLY ? '(APPLY)' : TRACER ? '(TRACER)' : '(DRY RUN)'}`);
log(`Community-line + newsletter rows: ${rows.length} · candidates (no consent, live): ${candidates.length}`);
log(`KEEP (consented community-line, honored opt-in): ${rows.filter((r) => r.newsletter_consent === true).length}`);

let stripped = 0, notInGhl = 0, errors = 0, contactsTouched = 0;

for (const r of candidates) {
  if (!LIVE) {
    const present = NEWSLETTER.filter((n) => (r.tags || []).includes(n));
    log(`- ${r.full_name || '(no name)'} ${r.ghl_id}: −[${present.join(', ')}] [dry, mirror]`);
    stripped += present.length; contactsTouched++; continue;
  }
  let live;
  try { live = await ghl.getContactById(r.ghl_id); }
  catch (e) {
    if (isNotFound(e.message)) { notInGhl++; log(`- skip (not in GHL): ${r.full_name || ''} ${r.ghl_id}`); await sleep(SLEEP_MS); continue; }
    errors++; log(`  ⚠ ERROR get ${r.ghl_id}: ${e.message}`); await sleep(SLEEP_MS); continue;
  }
  if (!live) { notInGhl++; log(`- skip (not in GHL): ${r.ghl_id}`); await sleep(SLEEP_MS); continue; }

  const lt = tagsLc(live);
  const present = NEWSLETTER.filter((n) => lt.includes(n.toLowerCase()));
  const who = live.contactName || `${live.firstName || ''} ${live.lastName || ''}`.trim() || r.full_name || '(no name)';
  if (!present.length) { log(`- ${who} ${r.ghl_id}: no newsletter comms live (already clean)`); await sleep(SLEEP_MS); continue; }

  try {
    if (TRACER) log(`\n## TRACER ${who} (${r.ghl_id})\n- before: [${lt.join(', ')}]`);
    for (const n of present) { await ghl.removeTagFromContact(r.ghl_id, n); stripped++; }
    contactsTouched++;
    if (TRACER) {
      const after = await ghl.getContactById(r.ghl_id);
      const at = tagsLc(after);
      const ok = !present.some((n) => at.includes(n.toLowerCase()));
      log(`- after:  [${at.join(', ')}]\n- verify: ${ok ? '✅ newsletter comms gone' : '⚠ CHECK'}`);
      log(`\nTRACER done on 1 live contact. Rerun with --apply for all ${candidates.length}.`);
      log(`UNDO: re-add [${present.join(', ')}] to ${r.ghl_id}`);
      process.exit(0);
    }
    log(`- ${who} ${r.ghl_id}: −[${present.join(', ')}]`);
  } catch (e) { errors++; log(`  ⚠ ERROR write ${r.ghl_id}: ${e.message}`); }
  await sleep(SLEEP_MS);
}

log(`\nDone. newsletter comms stripped ${stripped} across ${contactsTouched} contacts · not in GHL ${notInGhl} · errors ${errors}. ${LIVE ? '(LIVE)' : '(dry run)'}`);
if (LIVE) log(`UNDO: re-add the listed comms:* tags per line.`);
