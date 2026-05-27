#!/usr/bin/env node
/**
 * goods-dedup-kaltukatjara-2026-05-28.mjs — resolve the Kaltukatjara council
 * duplicate flagged (but not actioned) by the 2026-05-28 Demand Register dedup.
 *
 * The Demand Register (pipeline UQsrmuqzxMSdCTklxEcG) had two Kaltukatjara council
 * rows, both seeded from the ORIC corporations register on 2026-05-27. The prior
 * session couldn't tell if they were the same entity, so left both. The ORIC
 * register resolves it — these are distinct ICNs, but one is long deregistered:
 *
 *   ICN 200  Kaltukatjara Community Council   Registered (active, since 1983)  ← KEEP
 *   ICN 172  Kaltukatjara Nguratjaku Council  Deregistered 2005-03-07          ← DELETE
 *   ICN 950  Kaltukatjara Association         Deregistered 2009 (not in GHL)
 *
 * So the Nguratjaku Council row is a defunct predecessor — not a current org you
 * can fund or sell to. Deleting it (not merging) is safe: the live Community
 * Council row remains, and the deleted opp is captured to a restore JSON first.
 *
 * Both rows are $0 / no unit fields, so there is nothing to carry forward.
 *
 * Review-first: DRY RUN by default; --apply to execute.
 * Plan: thoughts/shared/plans/2026-05-28-goods-three-pipeline-operating-model.md
 */
import { createGHLService } from './lib/ghl-api-service.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const APPLY = process.argv.includes('--apply');
const ghl = createGHLService();

// keepId is the active (Registered) corporation; deleteId is the deregistered one.
const ACTION = {
  community: 'KALTUKATJARA',
  keepId: '4K9xnpqBxsidPMmZfy7L',   // Kaltukatjara Community Council — ICN 200, Registered
  deleteId: 'va7aNGSaSLMQsXBz8io3', // Kaltukatjara Nguratjaku Council — ICN 172, Deregistered 2005
  why: 'ICN 172 (Nguratjaku Council) deregistered 2005-03-07; ICN 200 (Community Council) is the active corp → keep active, delete defunct',
};

async function main() {
  console.log(`=== Dedup Kaltukatjara council rows (${APPLY ? 'APPLY' : 'DRY RUN'}) ===\n`);
  let del = null;
  try { del = await ghl.getOpportunityById(ACTION.deleteId); }
  catch (e) { console.error(`✗ could not fetch delete target ${ACTION.deleteId} (${e.message.slice(0, 80)})`); process.exit(1); }
  let keep = null;
  try { keep = await ghl.getOpportunityById(ACTION.keepId); }
  catch (e) { console.error(`✗ could not fetch keep target ${ACTION.keepId} (${e.message.slice(0, 80)})`); process.exit(1); }

  console.log(`  keep   ${ACTION.keepId}  "${keep?.name}"`);
  console.log(`  delete ${ACTION.deleteId}  "${del?.name}"`);
  console.log(`  ${ACTION.why}\n`);

  const restore = [{ community: ACTION.community, action: ACTION, deletedOpp: del, keptOpp: keep }];
  const path = `thoughts/shared/data/goods-kaltukatjara-dedup-restore-2026-05-28.json`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ generatedAt: new Date().toISOString(), applied: APPLY, restore }, null, 2));
  console.log(`✓ Restore capture: ${path}`);

  if (!APPLY) { console.log('\nDry run — re-run with --apply to delete the defunct row.'); return; }
  await ghl.deleteOpportunity(ACTION.deleteId);
  console.log(`\n✓ Deleted ${ACTION.deleteId} (Nguratjaku Council, deregistered). Demand Register 97 → 96.`);
}
main().catch(e => { console.error(e); process.exit(1); });
