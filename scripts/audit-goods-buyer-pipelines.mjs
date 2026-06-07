/**
 * Audit the two GHL Goods buyer pipelines before cleanup.
 * Read-only: fetches all opps, categorizes, prints a cleanup plan + writes full JSON.
 *
 *   node --env-file=.env.local scripts/audit-goods-buyer-pipelines.mjs
 *
 * Categories:
 *   TEST            - test/example records (tag test-submission or @example.com)
 *   DUP_IN_BUYER    - same contact present in BOTH pipelines, Buyer copy still unworked
 *                     (Outreach Queued) → per model, remove the Buyer-pipeline copy
 *   GENERIC_SIGNAL  - "52 beds, 6 washers" templated demand (real-vs-noise review)
 *   REAL            - everything else (keep / work)
 */

import { createGHLService } from './lib/ghl-api-service.mjs';
import fs from 'node:fs';

const DEMAND = { id: 'UQsrmuqzxMSdCTklxEcG', name: 'Demand Register' };
const BUYER  = { id: 'FjMyJM3YzWQFmKqR9fur', name: 'Buyer Pipeline' };
const OUTREACH_QUEUED = 'e5220eb2-be40-4e79-9571-6acae12285c7'; // Buyer Pipeline stage 0

const slim = (o) => ({
  id: o.id,
  name: o.name,
  value: o.monetaryValue || 0,
  stageId: o.pipelineStageId,
  contactId: o.contactId,
  contactName: o.contact?.name || o.contact?.companyName || null,
  email: o.contact?.email || null,
  tags: o.contact?.tags || [],
});

async function main() {
  const ghl = createGHLService();
  const demand = (await ghl.getOpportunities(DEMAND.id, { limit: 100 })).map(slim);
  const buyer  = (await ghl.getOpportunities(BUYER.id,  { limit: 100 })).map(slim);

  const demandContacts = new Set(demand.map((o) => o.contactId));

  const isTest = (o) =>
    o.tags.includes('test-submission') || (o.email || '').includes('example.com');
  const isGeneric = (o) => /52 beds, 6 washers/i.test(o.name);

  // Buyer-pipeline categorization
  const buyerCats = { TEST: [], DUP_IN_BUYER: [], GENERIC_SIGNAL: [], REAL: [] };
  for (const o of buyer) {
    if (isTest(o)) buyerCats.TEST.push(o);
    else if (demandContacts.has(o.contactId) && o.stageId === OUTREACH_QUEUED)
      buyerCats.DUP_IN_BUYER.push(o);
    else if (isGeneric(o)) buyerCats.GENERIC_SIGNAL.push(o);
    else buyerCats.REAL.push(o);
  }

  // Demand-register categorization
  const demandCats = { TEST: [], GENERIC_SIGNAL: [], REAL: [] };
  for (const o of demand) {
    if (isTest(o)) demandCats.TEST.push(o);
    else if (isGeneric(o)) demandCats.GENERIC_SIGNAL.push(o);
    else demandCats.REAL.push(o);
  }

  const out = '/tmp/goods-buyer-audit.json';
  fs.writeFileSync(out, JSON.stringify({ demand, buyer, buyerCats, demandCats }, null, 2));

  const line = (o) => `    ${o.name}  [${o.id}]  $${o.value}  contact:${o.contactName || o.contactId}`;

  console.log(`\n══ DEMAND REGISTER — ${demand.length} opps ══`);
  console.log(`  GENERIC_SIGNAL (52 beds/6 washers, review real-vs-noise): ${demandCats.GENERIC_SIGNAL.length}`);
  console.log(`  REAL (non-templated): ${demandCats.REAL.length}`);
  demandCats.REAL.forEach((o) => console.log(line(o)));
  if (demandCats.TEST.length) { console.log(`  TEST: ${demandCats.TEST.length}`); demandCats.TEST.forEach((o) => console.log(line(o))); }

  console.log(`\n══ BUYER PIPELINE — ${buyer.length} opps ══`);
  console.log(`  TEST (remove): ${buyerCats.TEST.length}`);
  buyerCats.TEST.forEach((o) => console.log(line(o)));
  console.log(`  DUP_IN_BUYER (signal copy, unworked → remove from Buyer, keep in Demand): ${buyerCats.DUP_IN_BUYER.length}`);
  buyerCats.DUP_IN_BUYER.forEach((o) => console.log(line(o)));
  console.log(`  GENERIC_SIGNAL in Buyer: ${buyerCats.GENERIC_SIGNAL.length}`);
  buyerCats.GENERIC_SIGNAL.forEach((o) => console.log(line(o)));
  console.log(`  REAL (keep / work): ${buyerCats.REAL.length}`);
  buyerCats.REAL.forEach((o) => console.log(line(o)));

  const removeCount = buyerCats.TEST.length + buyerCats.DUP_IN_BUYER.length;
  console.log(`\n── Proposed cleanup ──`);
  console.log(`  Remove from Buyer Pipeline: ${removeCount} (TEST ${buyerCats.TEST.length} + DUP ${buyerCats.DUP_IN_BUYER.length})`);
  console.log(`  Review for real-vs-noise (Demand): ${demandCats.GENERIC_SIGNAL.length} generic signals`);
  console.log(`  Full detail written to ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
