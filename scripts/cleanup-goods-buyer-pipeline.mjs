/**
 * Clean up the GHL "Goods — Buyer Pipeline" → commercial buyers only.
 * Approved by Ben 2026-05-27 (Buyer = commercial-only; safe cleanup go).
 *
 *   node --env-file=.env.local scripts/cleanup-goods-buyer-pipeline.mjs            # dry-run
 *   node --env-file=.env.local scripts/cleanup-goods-buyer-pipeline.mjs --apply    # writes
 *
 * Before any delete (--apply), writes a RESTORE file with the full slim records
 * so every removal is reversible (recreatable in the Buyer pipeline).
 *
 * Actions:
 *   - delete 11 from Buyer: 1 test (GD2) + 10 dup signal-copies (also in Demand Register)
 *   - delete 10 funder/grant product-line records (relationship lives in Supporter Journey + Xero)
 *   - Malala fix: delete the stub contact + the bad Supporter-Journey opp created earlier
 *     (real contact Mala'la Health Service `Z6POQ8e2wtBKSWDuPLEx`; seeder re-creates it linked)
 * NOT touched (flagged for Ben): PICC Stretch Bed, "Remote job forecast", NLC Gapuwiyak (keep).
 */

import { createGHLService } from './lib/ghl-api-service.mjs';
import fs from 'node:fs';

// Flag-selected sets so each authorization runs independently (no re-deleting done records).
const APPLY = process.argv.includes('--apply');
const DO_SAFE = process.argv.includes('--safe');       // 11 test+dups (done 2026-05-27)
const DO_FUNDERS = process.argv.includes('--funders');  // 10 funder product-lines
const DO_EXTRAS = process.argv.includes('--extras');    // PICC + stray
const DO_MALALA = process.argv.includes('--malala');    // Malala stub/opp fix (done 2026-05-27)
const BUYER_PIPELINE = 'FjMyJM3YzWQFmKqR9fur';

// --- Buyer pipeline opp IDs to delete ---
const SAFE_REMOVE = [
  ['qLaDvOyq1yOHZGOAKHrS', 'GD2 test record'],
  ['7Fn2JOclc2CoNWfgaMqB', 'dup THULKURR'],
  ['y8w1eSUJMhQlYM0ecMco', 'dup NEW MERINEE'],
  ['fpdvQF3YmXvoAs3fmYGA', 'dup GUNUN WOONAM'],
  ['It2t2mhn6S6azbnW0r0Z', 'dup SHIPTON FLATS'],
  ['bxKLejbl23aP51J7dbvy', 'dup FORDY FARM'],
  ['gA2WqhVUiMuF0svfZYkv', 'dup AAYKA'],
  ['idpLpcz5sG76y2s8X1aI', 'dup LINGARA'],
  ['IKxXaIXbQFhXHieao0EI', 'dup THAANGKUNH-NHIIN'],
  ['N95Z3uJMg8nrIYhVhlet', 'dup BANNICK BURN'],
  ['nAcEQ7QM1gD1rxG2eSW4', 'dup JILUNDARINA'],
];
const FUNDER_REMOVE = [
  ['TFFJR5Tnm62kBHR9pdvb', 'OCS Basket Bed'],
  ['FPckXyGg46VuHmyj2Rdu', 'OCS Washing Machine'],
  ['euhcwgBRlGIBar7U4QUs', 'Rotary Greate Bed'],
  ['JrbJMR3rSyijKrFp21AI', "Mala'la Basket Bed"],
  ['Ln5qUxl2w9o2gjp0w2Py', 'Centrecorp Plant'],
  ['DM0gItqBcftcPFO4Qwj3', 'Centrecorp Basket Bed'],
  ['lLkkIHMSpnvGPRxQu1vH', 'Centrecorp Weave Bed'],
  ['sgGa5u8ehHHPFy6wq6PQ', 'Homeland Washing Machine'],
  ['RPVzkVGszff6indJ3GDJ', 'Red Dust Basket Bed'],
  ['mqWa6wCGCZUDK8bQs2L8', 'Julalikari Washing Machine'],
];

const EXTRA_REMOVE = [
  ['KoXLnuCmAxIp8Nrpeb0W', 'PICC Stretch Bed (not Goods / ACT-PI)'],
  ['sogR69LPK8oNQzS2u7WC', 'Remote job forecast (stray $0)'],
];

// --- Malala fix ---
const MALALA_BAD_OPP = 'WhMkunwtIU6ug12rtApN';       // Supporter Journey opp linked to stub
const MALALA_STUB_CONTACT = 'J4iGAZJY70veM2FjqkzD';  // duplicate stub I created

async function main() {
  const ghl = createGHLService();
  const allDeletes = [
    ...(DO_SAFE ? SAFE_REMOVE : []),
    ...(DO_FUNDERS ? FUNDER_REMOVE : []),
    ...(DO_EXTRAS ? EXTRA_REMOVE : []),
  ];

  if (!allDeletes.length && !DO_MALALA) {
    console.log('Nothing selected. Pass one or more of: --safe --funders --extras --malala (+ --apply).');
    return;
  }

  // restore snapshot from the audit JSON (full slim records for recreate)
  let audit = {};
  try { audit = JSON.parse(fs.readFileSync('/tmp/goods-buyer-audit.json', 'utf8')); } catch {}
  const byId = new Map([...(audit.buyer || [])].map((o) => [o.id, o]));
  const restore = {
    pipelineId: BUYER_PIPELINE,
    removedAt: new Date().toISOString(),
    sets: { safe: DO_SAFE, funders: DO_FUNDERS, extras: DO_EXTRAS, malala: DO_MALALA },
    records: allDeletes.map(([id, why]) => ({ why, ...(byId.get(id) || { id }) })),
    ...(DO_MALALA ? { malalaBadOpp: MALALA_BAD_OPP, malalaStubContact: MALALA_STUB_CONTACT } : {}),
  };

  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN'}`);
  console.log(`Sets: safe=${DO_SAFE} funders=${DO_FUNDERS} extras=${DO_EXTRAS} malala=${DO_MALALA}`);
  console.log(`Buyer deletes selected: ${allDeletes.length}\n`);

  if (!APPLY) {
    allDeletes.forEach(([id, why]) => console.log(`  would delete  ${id}  (${why})`));
    if (DO_MALALA) console.log(`  would fix Malala: delete opp ${MALALA_BAD_OPP} + stub contact ${MALALA_STUB_CONTACT}`);
    console.log(`\n(Dry-run. Re-run with --apply. A restore file is written on apply.)`);
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const restorePath = `/Users/benknight/Code/act-global-infrastructure/thoughts/shared/finance/2026-05-27-buyer-pipeline-cleanup-removed-${stamp}.json`;
  fs.writeFileSync(restorePath, JSON.stringify(restore, null, 2));
  console.log(`Restore snapshot written: ${restorePath}\n`);

  let ok = 0, fail = 0;
  for (const [id, why] of allDeletes) {
    try { await ghl.deleteOpportunity(id); console.log(`✓ deleted opp ${id}  (${why})`); ok++; }
    catch (e) { console.error(`✗ opp ${id} (${why}): ${e.message}`); fail++; }
  }
  if (DO_MALALA) {
    try { await ghl.deleteOpportunity(MALALA_BAD_OPP); console.log(`✓ deleted Malala bad opp ${MALALA_BAD_OPP}`); ok++; }
    catch (e) { console.error(`✗ Malala opp: ${e.message}`); fail++; }
    try { await ghl.deleteContact(MALALA_STUB_CONTACT); console.log(`✓ deleted Malala stub contact ${MALALA_STUB_CONTACT}`); ok++; }
    catch (e) { console.error(`✗ Malala stub contact: ${e.message}`); fail++; }
  }

  console.log(`\n── Done ── ok:${ok} fail:${fail}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
