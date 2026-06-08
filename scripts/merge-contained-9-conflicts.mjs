#!/usr/bin/env node
/**
 * Merge the 9 CONTAINED Adelaide GHL duplicate-conflicts.
 *
 * Source of truth for the pairs + OCAP handling:
 *   thoughts/shared/reviews/contained-adelaide-9-conflicts-2026-06-08.md
 * (each pair live-verified 2026-06-08; PRIMARY = the older `matchedGhlId`).
 *
 * Safety model (irreversible op — GHL merge cannot be un-merged):
 *   1. SNAPSHOT both records for all 9 pairs to JSON before any write.
 *   2. TRACER: merge pair #1 (Adam Robinson — not community-line, lowest risk),
 *      verify primary survives, ABORT the rest if it fails.
 *   3. Merge pairs #2–9.
 *   4. OCAP fixup per survivor: drop flat `goods-newsletter`; for community-line
 *      survivors strip ALL `comms:*` and ensure `lane:community`; name fixes.
 *   5. Write results log.
 *
 * Default = DRY RUN (snapshot + plan only, no writes). Pass --apply to execute.
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RL = 1100; // ms between GHL calls (60/min/tenant)

// PRIMARY = keep (older/richer matchedGhlId); SECONDARY = merge in (sourceGhlId).
const PAIRS = [
  { name: 'Adam Robinson',      primary: 'Qtl5PgkHPMnNS1mjnGRO', secondary: 'wHstWIW6zo1ifWnWsayd', communityLine: false, dropFlatGoodsNewsletter: true,  nameFix: null },
  { name: 'Corey Tutt',         primary: 'kMG435sXyNZ3g0ka2hzg', secondary: '5LqgNvZQ2TGXHyJguHkB', communityLine: true,  dropFlatGoodsNewsletter: true,  nameFix: { firstName: 'Corey', lastName: 'Tutt' } },
  { name: 'Dr. Simon Quilty',   primary: 'UJPGFZbcjcdslJC8jN6T', secondary: '7ZKeS2H6Fyi1xDUTvING', communityLine: true,  dropFlatGoodsNewsletter: true,  nameFix: null },
  { name: 'Kristy Bloomfield',  primary: '0kEs9BJmkmi7ZUc5haEX', secondary: 'yk4uK8rgDNGA87EUqNbu', communityLine: true,  dropFlatGoodsNewsletter: false, nameFix: null },
  { name: 'Sam Davies',         primary: 'Vk0et07jw3qccBZsqBF8', secondary: '7WXGBE5zD73ipAJfb5qE', communityLine: false, dropFlatGoodsNewsletter: true,  nameFix: null },
  { name: 'Tara Castle',        primary: '8QyHvajKpuyHyDmBfcCY', secondary: '1FJKzuyt1IpEFdjbJhjC', communityLine: true,  dropFlatGoodsNewsletter: true,  nameFix: null },
  { name: 'Tracey Newman',      primary: 'D05Oa0eO8arILsSNjiPQ', secondary: 'pvZ53c6JlkL5sOPPFiTc', communityLine: true,  dropFlatGoodsNewsletter: false, nameFix: null },
  { name: 'Willhemina Wahlin',  primary: '0w3yMTXm12bl74aKGce0', secondary: 'moxP9fCQ7a2pdibcxPDa', communityLine: false, dropFlatGoodsNewsletter: true,  nameFix: null },
  { name: 'Toby Gowland',       primary: 'cnNzFM6zrQjRaMJ69NpE', secondary: 'mTsZ14zvtIs3XaaTHHhX', communityLine: false, dropFlatGoodsNewsletter: false, nameFix: null },
];

const tagsOf = (c) => (c?.tags || []).slice();
const safeGet = async (svc, id) => {
  try { return { ok: true, contact: await svc.getContactById(id) }; }
  catch (e) { return { ok: false, error: String(e?.message || e) }; }
};

async function fixupSurvivor(svc, pair, results) {
  const r = await safeGet(svc, pair.primary);
  await sleep(RL);
  if (!r.ok) { results.fixups.push({ name: pair.name, error: `refetch failed: ${r.error}` }); return; }
  const before = tagsOf(r.contact.contact || r.contact);
  const removed = [], added = [];

  // 1. drop flat legacy goods-newsletter
  if (pair.dropFlatGoodsNewsletter && before.includes('goods-newsletter')) {
    if (APPLY) { await svc.removeTagFromContact(pair.primary, 'goods-newsletter'); await sleep(RL); }
    removed.push('goods-newsletter');
  }
  // 2. community-line: strip ALL comms:* and ensure lane:community
  if (pair.communityLine) {
    for (const t of before.filter((t) => t.startsWith('comms:'))) {
      if (APPLY) { await svc.removeTagFromContact(pair.primary, t); await sleep(RL); }
      removed.push(t);
    }
    if (!before.includes('lane:community')) {
      if (APPLY) { await svc.addTagToContact(pair.primary, 'lane:community'); await sleep(RL); }
      added.push('lane:community');
    }
  }
  // 3. name fix
  if (pair.nameFix) {
    if (APPLY) { await svc.updateContact(pair.primary, pair.nameFix); await sleep(RL); }
  }
  results.fixups.push({ name: pair.name, primary: pair.primary, tagsBefore: before, removed, added, nameFix: pair.nameFix || null });
}

async function main() {
  const svc = createGHLService();
  const stamp = '2026-06-08';
  const results = { mode: APPLY ? 'APPLY' : 'DRY_RUN', stamp, snapshot: [], merges: [], fixups: [], aborted: false };

  console.log(`\n=== CONTAINED 9-conflict merge — ${results.mode} ===\n`);

  // ---- 1. SNAPSHOT (read-only) ----
  console.log('SNAPSHOT (reading both records for all 9 pairs)...');
  for (const p of PAIRS) {
    const a = await safeGet(svc, p.primary); await sleep(RL);
    const b = await safeGet(svc, p.secondary); await sleep(RL);
    results.snapshot.push({ name: p.name, primary: { id: p.primary, ...a }, secondary: { id: p.secondary, ...b } });
    console.log(`  ${p.name}: primary ${a.ok ? 'ok' : 'MISSING'} / secondary ${b.ok ? 'ok' : 'MISSING'}`);
  }
  const snapPath = `thoughts/shared/reviews/${stamp}_contained-9-merge-snapshot.json`;
  writeFileSync(snapPath, JSON.stringify(results.snapshot, null, 2));
  console.log(`  snapshot → ${snapPath}\n`);

  // ---- 2/3. MERGES (tracer-first) ----
  for (let i = 0; i < PAIRS.length; i++) {
    const p = PAIRS[i];
    const label = i === 0 ? '[TRACER] ' : '';
    if (!APPLY) {
      console.log(`${label}DRY-RUN would merge ${p.secondary} → ${p.primary} (${p.name})  [community-line:${p.communityLine}]`);
      results.merges.push({ name: p.name, dryRun: true });
      continue;
    }
    try {
      await svc.mergeContacts(p.primary, p.secondary); await sleep(RL);
      // verify primary survives
      const chk = await safeGet(svc, p.primary); await sleep(RL);
      const ok = chk.ok;
      results.merges.push({ name: p.name, merged: true, primaryAlive: ok });
      console.log(`${label}MERGED ${p.secondary} → ${p.primary} (${p.name})  primaryAlive:${ok}`);
      if (i === 0 && !ok) {
        results.aborted = true;
        console.error('\n!! TRACER FAILED — primary not found after merge. ABORTING the remaining 8.');
        break;
      }
    } catch (e) {
      results.merges.push({ name: p.name, merged: false, error: String(e?.message || e) });
      console.error(`${label}MERGE ERROR (${p.name}): ${e?.message || e}`);
      if (i === 0) { results.aborted = true; console.error('\n!! TRACER ERRORED — ABORTING the remaining 8.'); break; }
    }
  }

  // ---- 4. OCAP FIXUP ----
  if (APPLY && !results.aborted) {
    console.log('\nOCAP FIXUP (drop flat goods-newsletter / strip comms on community-line / add lane:community / name fixes)...');
    for (const p of PAIRS) await fixupSurvivor(svc, p, results);
    for (const f of results.fixups) console.log(`  ${f.name}: removed[${(f.removed||[]).join(', ')}] added[${(f.added||[]).join(', ')}]${f.nameFix ? ' name→'+f.nameFix.firstName : ''}${f.error ? ' ERR:'+f.error : ''}`);
  }

  const resPath = `thoughts/shared/reviews/${stamp}_contained-9-merge-results.json`;
  writeFileSync(resPath, JSON.stringify(results, null, 2));
  console.log(`\nresults → ${resPath}`);
  console.log(`\nDONE (${results.mode})${results.aborted ? ' — ABORTED after tracer' : ''}.`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
