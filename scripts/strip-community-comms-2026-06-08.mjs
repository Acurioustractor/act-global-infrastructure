#!/usr/bin/env node
/**
 * OCAP protective strip — remove ONLY comms:* tags from 21 community-line GHL
 * contacts, keeping lane:community + every non-comms tag.
 *
 * Codebase OAuth path (proven in Phase B). The GHL MCP remove-tags tool was
 * broken (empty-array bridge bug) — this uses scripts/lib/ghl-api-service.mjs
 * removeTagFromContact() which builds the correct DELETE /contacts/{id}/tags
 * body { tags:[tag] }.
 *
 * Per contact: re-fetch (confirm lane:community + a comms:* present, else SKIP)
 * -> remove each comms:* tag -> re-fetch (confirm comms:* gone, lane intact).
 * ~1.1s sleep between every GHL call (rate limit).
 *
 * Tier-2 GHL write, authorized by Ben. ONLY comms:* removed. Never add a tag,
 * never touch a non-comms tag, never touch a contact outside the 21.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import { createGHLService } from './lib/ghl-api-service.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RL = 1100; // ~1.1s between GHL calls

// The 21 resolved targets (id + exact comms:* set) from the prior pass log.
const TARGETS = [
  { email: 'admin@myerfoundation.org.au',        id: '10phNqWAjEmflMzAzXYT', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'alee@infoxchange.org',               id: '7ox7Rp2Dr3OZdLNXjHVW', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'applications@brianmdavis.org.au',    id: 'qvnemoBQU7FjnSdfEwPP', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'csm@bawinanga.org.au',               id: 'Z1kOiaNiVGNOuscHED4V', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'delaicee.power@julalikari.com.au',   id: 'CINaVh3o4cgFjBuscV0C', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'erin@reddust.org.au',                id: 'iRmsOTOvF1DgmmJ6QpzT', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'eula.rohan@aracy.org.au',            id: 'K4ejYaIJ3ILO9yQTFBhm', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'gien@good-design.org',               id: 'qd0lpqQ9dZpyDDERIMhE', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'gm@bawinanga.org.au',                id: 'yIYUvOBZMemF5tynz5wL', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'info@impactfrontiers.org',           id: 'z54hf3IrFhNzQeMW6Gzv', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'jf@wilyajanta.org',                  id: '8f3onwaS2iK3Lk7ThsiA', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'keiron.lander@ygcc.com.au',          id: 'X4qlBT2huXIB5I5XJ2dK', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'madelyn.hay@miwatj.com.au',          id: 'ef3tYp3HPNOmUNeu05gc', comms: ['comms:goods-newsletter', 'comms:newsletter', 'comms:act-newsletter'] },
  { email: 'mcarman@reddust.org.au',             id: 'Hfckaos5BIXAiDWhkD6v', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'peter.bent@impactfrontiers.org',     id: 'MCNT6MZyAW4S0Fg0wLol', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'phillip.allan@bawinanga.org.au',     id: 'avh1foMDU4rpglfjDxp3', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'pkaur@paulramsayfoundation.org.au',  id: '4nTVTPHZJcIaXPnZNpLL', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'ren@relove.org.au',                  id: 'P5Qw6atbYWZIKKsVhKSQ', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'rowena.cann@aracy.org.au',           id: 'MLDUH7oecmisGwYJ7y8Q', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
  { email: 'shellee.strickland@murrup.org.au',   id: 'II1BhBXv0iuzv888Wb7x', comms: ['comms:goods-newsletter', 'comms:newsletter', 'comms:act-newsletter'] },
  { email: 'sr@office.org.au',                   id: 'G9PItuZMWk1c8x6unFvB', comms: ['comms:goods-newsletter', 'comms:act-newsletter'] },
];

const isComms = (t) => typeof t === 'string' && t.startsWith('comms:');

async function fetchTags(ghl, id) {
  const c = await ghl.getContactById(id);
  return Array.isArray(c?.tags) ? c.tags : [];
}

async function main() {
  // Hard guard against location drift.
  const expectLoc = 'agzsSZWgovjwgpcoASWG';
  if (process.env.GHL_LOCATION_ID !== expectLoc) {
    throw new Error(`GHL_LOCATION_ID mismatch: got ${process.env.GHL_LOCATION_ID}, expected ${expectLoc}`);
  }

  const ghl = createGHLService();
  const results = [];

  for (const t of TARGETS) {
    const rec = { email: t.email, id: t.id, planned: t.comms.slice(), removed: [], skippedReason: null, status: null, before: null, after: null, error: null };
    try {
      // PRE: re-fetch + confirm lane:community + a comms:* present.
      const before = await fetchTags(ghl, t.id);
      await sleep(RL);
      rec.before = before;

      const hasLane = before.includes('lane:community');
      const commsPresent = before.filter(isComms);

      if (!hasLane || commsPresent.length === 0) {
        rec.status = 'SKIP';
        rec.skippedReason = !hasLane
          ? 'no lane:community present (re-classify, not auto-strip)'
          : 'already clean (no comms:* present)';
        rec.after = before;
        results.push(rec);
        console.log(`SKIP  ${t.email} — ${rec.skippedReason}`);
        continue;
      }

      // Strip ONLY comms:* tags actually present (intersection of present comms + planned, plus any other comms tag found).
      const toRemove = [...new Set([...commsPresent])]; // every comms:* on the contact
      for (const tag of toRemove) {
        await ghl.removeTagFromContact(t.id, tag);
        rec.removed.push(tag);
        await sleep(RL);
      }

      // POST: re-fetch + verify comms:* gone, lane:community intact, no non-comms tag lost.
      const after = await fetchTags(ghl, t.id);
      await sleep(RL);
      rec.after = after;

      const stillComms = after.filter(isComms);
      const laneIntact = after.includes('lane:community');
      // non-comms tags that existed before must all still exist
      const nonCommsBefore = before.filter((x) => !isComms(x));
      const lostNonComms = nonCommsBefore.filter((x) => !after.includes(x));

      if (stillComms.length === 0 && laneIntact && lostNonComms.length === 0) {
        rec.status = 'OK';
        console.log(`OK    ${t.email} — removed [${rec.removed.join(', ')}]; lane intact; ${after.length} tags remain`);
      } else {
        rec.status = 'FAIL-VERIFY';
        rec.error = `post-verify: stillComms=[${stillComms.join(',')}] laneIntact=${laneIntact} lostNonComms=[${lostNonComms.join(',')}]`;
        console.log(`FAIL  ${t.email} — ${rec.error}`);
      }
    } catch (e) {
      rec.status = 'ERROR';
      rec.error = String(e?.message || e);
      console.log(`ERR   ${t.email} — ${rec.error}`);
    }
    results.push(rec);
  }

  const out = `thoughts/shared/reviews/2026-06-08_community-line-comms-strip-RESULTS.json`;
  fs.writeFileSync(out, JSON.stringify({ runAt: new Date().toISOString(), location: expectLoc, results }, null, 2));

  const ok = results.filter((r) => r.status === 'OK').length;
  const skip = results.filter((r) => r.status === 'SKIP').length;
  const err = results.filter((r) => r.status === 'ERROR' || r.status === 'FAIL-VERIFY').length;
  console.log(`\n=== DONE === OK=${ok} SKIP=${skip} ERR=${err}  -> ${out}`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
