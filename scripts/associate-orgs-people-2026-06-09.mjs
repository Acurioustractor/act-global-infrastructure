#!/usr/bin/env node
/**
 * Associate the 5 known people → their org Company (GHL "business").
 * Sets contact.businessId via updateContact. Reversible (clear businessId).
 * 3 people (baressa/delilah/michael) skipped — org TBC.
 *
 * Default = DRY RUN. Pass --apply to write.
 */
import 'dotenv/config';
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const svc = createGHLService();
const loc = process.env.GHL_LOCATION_ID;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MAP = [
  { person: 'madelyn hay',     personId: 'ef3tYp3HPNOmUNeu05gc', company: 'Miwatj Health Aboriginal Corporation' },
  { person: 'matthew ryan',    personId: 'sLrNSpHK0j64lsFLaiV0', company: 'Northern Land Council' },
  { person: 'tony miles',      personId: 'bJ0IHYKRVBtlwmyIydaQ', company: 'Anyinginyi Health Aboriginal Corporation' },
  { person: 'simone grimmond', personId: 'FVfAK0x3SjtTkBmPBTxI', company: 'WHSAC (Groote Archipelago)' },
  { person: 'angela lynch',    personId: 'mmLzQtTJEMJE0KAiDTTO', company: "NPY Women's Council" },
];

const data = await svc.request(`/businesses/?locationId=${loc}`);
const businesses = data.businesses || [];
const byName = new Map(businesses.map((b) => [String(b.name).trim().toLowerCase(), b.id]));
console.log(`\n=== Associate people → org Company — ${APPLY ? 'APPLY' : 'DRY_RUN'} (${businesses.length} businesses) ===\n`);

for (const m of MAP) {
  const bizId = byName.get(m.company.trim().toLowerCase());
  if (!bizId) { console.log(`  SKIP  ${m.person} — company "${m.company}" not found (check import / name)`); continue; }
  if (!APPLY) { console.log(`  DRY   ${m.person} (${m.personId}) → ${m.company} (${bizId})`); continue; }
  try {
    await svc.updateContact(m.personId, { businessId: bizId });
    await sleep(1100);
    console.log(`  ✓     ${m.person} → ${m.company}`);
  } catch (e) {
    console.log(`  ✗     ${m.person}: ${e.message}`);
  }
}
console.log(`\n${APPLY ? 'Done.' : 'Dry run — no writes.'}  (baressa frazer / delilah macgillivray / michael haji-ali skipped — org TBC)\n`);
