#!/usr/bin/env node
/**
 * delete-codex-smoke-testcontacts-2026-06-08.mjs — Ben-authorized 2026-06-08 (Phase B bucket 1).
 *
 * Deletes the 4 codex-smoke TEST CONTACTS (all @example.com fixtures) identified in the
 * bucket-1 dry-run. Verify-first per contact, with a HARD GUARD: only deletes if the LIVE
 * contact's email matches the codex-smoke / @example.com test pattern — protects against
 * mirror-id drift mapping an id to a real person. Logs full contact data (UNDO record) + a
 * dated review sidecar. Dry-run default.
 *
 * Usage:
 *   node scripts/delete-codex-smoke-testcontacts-2026-06-08.mjs           # dry-run (verify only)
 *   node scripts/delete-codex-smoke-testcontacts-2026-06-08.mjs --tracer  # delete the FIRST verified one, confirm gone, stop
 *   node scripts/delete-codex-smoke-testcontacts-2026-06-08.mjs --apply   # delete all verified
 */
import dotenv from 'dotenv';
import { appendFileSync } from 'node:fs';
import { createGHLService } from './lib/ghl-api-service.mjs';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const TRACER = process.argv.includes('--tracer');
const LIVE = APPLY || TRACER;
const LOG = 'thoughts/shared/reviews/bucket1-cruft-apply-2026-06-08.md';
const SLEEP_MS = 1100;

const IDS = ['kU26fEtOglOnyoyqGVVo', 'S7JiZX2xqyPOR0wKZod3', 'MZKHI83VboIIVdnQvFEu', 'K0fgTViQk5ku9uSpZhQL'];
const TEST_PATTERN = /codex-smoke|@example\.com/i;

const ghl = createGHLService();
const log = (s) => { console.log(s); if (LIVE) appendFileSync(LOG, s + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isNotFound = (m) => /not found|404/i.test(String(m || ''));

log(`\n# bucket-1 codex-smoke contact delete — ${new Date().toISOString()} ${APPLY ? '(APPLY)' : TRACER ? '(TRACER)' : '(DRY RUN)'}`);

let deleted = 0, skippedNotTest = 0, notInGhl = 0, errors = 0;
for (const id of IDS) {
  let live;
  try { live = await ghl.getContactById(id); }
  catch (e) {
    if (isNotFound(e.message)) { notInGhl++; log(`- skip (not in GHL, already gone): ${id}`); await sleep(SLEEP_MS); continue; }
    errors++; log(`  ⚠ ERROR get ${id}: ${e.message}`); await sleep(SLEEP_MS); continue;
  }
  if (!live) { notInGhl++; log(`- skip (not in GHL): ${id}`); await sleep(SLEEP_MS); continue; }

  const email = live.email || '';
  const name = live.contactName || `${live.firstName || ''} ${live.lastName || ''}`.trim() || '(no name)';
  // HARD GUARD — never delete a non-test contact even if the id was in the list.
  if (!TEST_PATTERN.test(email) && !TEST_PATTERN.test(name)) {
    skippedNotTest++;
    log(`- ⛔ SKIP (does NOT match test pattern — refusing to delete a real contact): ${name} <${email}> ${id}`);
    await sleep(SLEEP_MS); continue;
  }

  log(`- verified test fixture: ${name} <${email}> ${id} · tags: [${(live.tags || []).join(', ')}]`);
  if (!LIVE) { await sleep(SLEEP_MS); continue; }

  try {
    await ghl.deleteContact(id);
    deleted++;
    // confirm gone
    let gone = false;
    try { const after = await ghl.getContactById(id); gone = !after; }
    catch (e) { gone = isNotFound(e.message); }
    log(`  ✅ deleted ${id} · confirm-gone: ${gone ? 'YES' : '⚠ STILL PRESENT'}`);
    if (TRACER) {
      log(`\nTRACER done — 1 contact deleted + confirmed. Rerun with --apply for the remaining ${IDS.length - 1}.`);
      log(`UNDO: recreate contact email=${email} name="${name}" (test fixture — recreation not required).`);
      process.exit(0);
    }
  } catch (e) { errors++; log(`  ⚠ ERROR delete ${id}: ${e.message}`); }
  await sleep(SLEEP_MS);
}

log(`\nDone. deleted ${deleted} · skipped-not-test ${skippedNotTest} · not-in-GHL ${notInGhl} · errors ${errors}. ${LIVE ? '(LIVE)' : '(dry run)'}`);
