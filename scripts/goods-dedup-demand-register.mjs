#!/usr/bin/env node
/**
 * goods-dedup-demand-register.mjs — one-off: dedupe double-listed communities in
 * the GHL Goods Demand Register (pipeline UQsrmuqzxMSdCTklxEcG).
 *
 * Rule: one row per community. Where a community has a store/council row (further
 * along, "Buyer Matched") AND a "$-demand" Signal row, keep the matched row and
 * carry the $ onto it, delete the Signal row. Where two rows are the same entity,
 * keep the canonical-named one. Genuinely different orgs in one community are NOT
 * duplicates and are left alone.
 *
 * Deletes are captured to a restore JSON first (hard to reverse otherwise).
 * Review-first: DRY RUN by default; --apply to execute.
 *
 * Plan: thoughts/shared/plans/2026-05-28-goods-three-pipeline-operating-model.md
 */
import { createGHLService } from './lib/ghl-api-service.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const APPLY = process.argv.includes('--apply');
const ghl = createGHLService();

// keepId gets the $ (from valueFrom), deleteId is removed. Decisions from the
// 2026-05-28 audit (see report). Peppimenarti + Kaltukatjara deliberately excluded.
const ACTIONS = [
  { community: 'PAPUNYA',     keepId: 'EgkXFugnS2xxR9wYaWVh', setValue: 192550, deleteId: 'pItYrdA1TvqqZogYiYjU', why: 'store row (Buyer Matched) + $-demand Signal row → keep store, carry $, delete demand' },
  { community: 'BARUNGA',     keepId: 'YKQwyI2TwAi8f1b0iWcW', setValue: 172700, deleteId: 'sVyQaulOXIzAwrm0VpGv', why: 'store row (Buyer Matched) + $-demand Signal row → keep store, carry $, delete demand' },
  { community: 'MOUNT LIEBIG', keepId: '8q4kQlIXJXAz3XjYjZDW', setValue: null, deleteId: 'xD3M6SAfpIPmis7jav1h', why: 'same store twice → keep Amundurrngu (canonical corp), delete generic dup' },
];

async function main() {
  console.log(`=== Dedup Goods Demand Register (${APPLY ? 'APPLY' : 'DRY RUN'}) ===\n`);
  const restore = [];
  for (const a of ACTIONS) {
    // capture the opp we'll delete
    let del = null;
    try { del = await ghl.getOpportunityById(a.deleteId); } catch (e) { console.log(`  ⚠ ${a.community}: could not fetch delete target ${a.deleteId} (${e.message.slice(0,60)}) — skipping`); continue; }
    restore.push({ community: a.community, action: a, deletedOpp: del });
    const valStr = a.setValue != null ? ` · set keep $${a.setValue.toLocaleString()}` : '';
    console.log(`  ${a.community}: keep ${a.keepId}${valStr} · delete ${a.deleteId} ("${del?.name}")`);
    console.log(`     ${a.why}`);
    if (!APPLY) continue;
    if (a.setValue != null) await ghl.updateOpportunity(a.keepId, { monetaryValue: a.setValue });
    await ghl.deleteOpportunity(a.deleteId);
    console.log(`     ✓ applied`);
  }
  // always write the restore capture (even dry run, for the record)
  const path = `thoughts/shared/data/goods-demand-dedup-restore-2026-05-28.json`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ generatedAt: new Date().toISOString(), applied: APPLY, restore }, null, 2));
  console.log(`\n✓ Restore capture: ${path}`);
  console.log('  KEPT BOTH (not dups): PEPPIMENARTI (Health Services + Store).');
  console.log('  FLAGGED (not touched): KALTUKATJARA (Nguratjaku Council vs Community Council) — confirm if same entity.');
  console.log(APPLY ? '\nDone.' : '\nDry run — re-run with --apply.');
}
main().catch(e => { console.error(e); process.exit(1); });
