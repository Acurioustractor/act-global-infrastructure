#!/usr/bin/env node

/**
 * strip-community-line-tags.mjs — one-off, Ben-authorized 2026-06-07 ("strip the tags")
 *
 * Removes funder-role and automated-newsletter tags from community-line people
 * (lane:community = no automated sends, hand-written comms only).
 * Live-GHL verified 2026-06-07: the 3 Jun sweep removed funder-drip/partner-drip;
 * these role:funder/audience-funder + comms newsletter tags remained.
 *
 * Pattern follows orbit-tracer.mjs: per-tag DELETE via removeTagFromContact,
 * never blind-overwrite; before/after + UNDO logged.
 *
 * Usage:
 *   node scripts/strip-community-line-tags.mjs           # dry-run (default)
 *   node scripts/strip-community-line-tags.mjs --apply   # execute
 */

import dotenv from 'dotenv';
import { appendFileSync } from 'node:fs';
import { createGHLService } from './lib/ghl-api-service.mjs';

dotenv.config({ path: '.env.local' });

const ghl = createGHLService();
const APPLY = process.argv.includes('--apply');
const LOG = 'thoughts/shared/reviews/community-line-strip-2026-06-07.md';

const FUNDER_AND_NEWSLETTER = [
  'role:funder',
  'audience-funder',
  'comms:newsletter',
  'comms:act-newsletter',
  'comms:goods-newsletter',
  'goods-newsletter',
];
const NEWSLETTER_ONLY = ['comms:goods-newsletter', 'goods-newsletter'];

const WORKLIST = [
  { id: 'yk4uK8rgDNGA87EUqNbu', who: 'Kristy Bloomfield (primary)', strip: FUNDER_AND_NEWSLETTER },
  { id: 'gCok46nfL0BqYeYEeexd', who: 'Kristy Bloomfield (dupe 2)', strip: NEWSLETTER_ONLY },
  { id: '0kEs9BJmkmi7ZUc5haEX', who: 'Kristy Bloomfield (dupe 3)', strip: FUNDER_AND_NEWSLETTER },
  { id: 'fnCak04opqtSP8QPfD2G', who: 'Shaun Fisher', strip: FUNDER_AND_NEWSLETTER },
  { id: 'VfEBYrMWswkt7jfYjmd0', who: 'Rachel Atkinson (dupe 1)', strip: FUNDER_AND_NEWSLETTER },
  { id: 'oVIfdPjlceNMZJB20RsO', who: 'Rachel Atkinson (dupe 2)', strip: NEWSLETTER_ONLY },
  { id: 'yZcX8GoQEqBYqcb5Uyjm', who: 'Rachel Atkinson (PICC customer)', strip: FUNDER_AND_NEWSLETTER },
];

const tagsOf = (c) => (c.tags || []).map((t) => t.toLowerCase());
const log = (s) => { console.log(s); if (APPLY) appendFileSync(LOG, s + '\n'); };

log(`\n# Community-line tag strip — ${new Date().toISOString()} ${APPLY ? '(APPLY)' : '(DRY RUN)'}\n`);

let removedTotal = 0;
for (const item of WORKLIST) {
  const before = await ghl.getContactById(item.id);
  if (!before) { log(`- ⚠ ${item.who} ${item.id}: NOT FOUND, skipped`); continue; }

  const present = item.strip.filter((t) => tagsOf(before).includes(t));
  if (!present.length) { log(`- ${item.who} ${item.id}: nothing to strip (already clean)`); continue; }

  log(`\n## ${item.who} (${item.id})`);
  log(`- before: [${tagsOf(before).join(', ')}]`);
  log(`- stripping: [${present.join(', ')}]`);

  if (APPLY) {
    for (const t of present) {
      await ghl.removeTagFromContact(item.id, t);
      removedTotal++;
    }
    const after = await ghl.getContactById(item.id);
    log(`- after: [${tagsOf(after).join(', ')}]`);
    log(`- UNDO: addTagToContact each of [${present.join(', ')}]`);
    const leftover = item.strip.filter((t) => tagsOf(after).includes(t));
    if (leftover.length) log(`- ⚠ STILL PRESENT after removal: [${leftover.join(', ')}]`);
  } else {
    removedTotal += present.length;
  }
}

log(`\nDone. ${removedTotal} tag removals ${APPLY ? 'executed' : 'planned (dry run — rerun with --apply)'}.`);
