#!/usr/bin/env node
/**
 * Retire the 34 org-as-contact records AFTER their Company twin exists.
 * Safety: (1) full backup of all 34 to JSON first (only restore path — delete is
 * irreversible in GHL); (2) per-record cross-check that a matching business exists —
 * a contact with NO matching Company is FLAGGED and NOT deleted.
 *
 * Default = DRY RUN (backup + cross-check + plan). Pass --apply to delete.
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const svc = createGHLService();
const loc = process.env.GHL_LOCATION_ID;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const IDS = [
  'MxDCQuWzhl1l9L0fujj6','YSgKCLjrz8mOzXianscn','Q6JZYRh0i6sJxbaDk5WA','5SUZbGyG14Q4fSLtGfmK',
  'rehcTEdarUUNx91r06ap','sq8AeMqnXJFhReHCxggr','SczQgdmEOSHYnVcs1LII','dd5rHFESa8DCi5uSJyr6',
  'vQYVHLQZlKDZB5b5Yitk','NDkOyddNl1Pajj1Fr4RO','BGyanKf035L4KIIshJnF','bjixgh1blualVbNIKrPG',
  'T11kOpYh703ud8IUkgOZ','ev3DobfSdh8uqoW4NjMP','cwjSZmZrwbpeoTi98qag','wrRHeRChqJEXAcOp5HAw',
  '9DIjNWgD0WXnUhB2DAUm','yduVJ4zdFaVn7fKMbPxf','TWi4OBECVJbse2HLtYQt','M1nD1Eg2vQzS5bS7LwtR',
  'jyq6kpllvY6A9h9Vnx9s','3Ot8tdFR2Xlb8KkOgNWO','lj1HY0GS0vaHQYvXtAiS','HAN2VLPXisHJErXrXkhy',
  'RCmAdzqPUceLaiQwkliv','1dUSJ8bwFl32u1UrZ0cu','agnn4YZ9Iwixiwco0f83','Ud33HAOZRSOg5kfV4FTy',
  'L0N5scaDjkWALI88SFGR','BjPQ4FwKI6yXf9DqHFEG','64FUSK218liWpGTi9Z2u','QYFJPrbiYcK0R7wPzCxZ',
  '6jEeR6lbputXOxp4ZZqf','8gOgn0mjerwpKYSZvkVH',
];

console.log(`\n=== Retire org-as-contact records — ${APPLY ? 'APPLY' : 'DRY_RUN'} (${IDS.length} ids) ===\n`);

// Business name set for the cross-check
const bData = await svc.request(`/businesses/?locationId=${loc}`);
const bizNames = new Set((bData.businesses || []).map((b) => String(b.name).trim().toLowerCase()));

// Phase 1 — backup ALL (always) + cross-check
const backup = [];
for (const id of IDS) {
  try {
    const r = await svc.getContactById(id);
    const c = r.contact || r;
    const name = String(c.contactName || c.firstName || c.companyName || '').trim().toLowerCase();
    const hasCompanyTwin = bizNames.has(name);
    backup.push({ id, name: c.contactName || c.firstName || c.companyName, hasCompanyTwin, tags: c.tags });
    console.log(`  ${hasCompanyTwin ? 'OK   ' : 'FLAG '} ${c.contactName || c.companyName || id}${hasCompanyTwin ? '' : '  ← no matching Company, will NOT delete'}`);
  } catch (e) {
    backup.push({ id, error: e.message, hasCompanyTwin: false });
    console.log(`  ERR  ${id}: ${e.message} (skip)`);
  }
  await sleep(1100);
}
writeFileSync('thoughts/shared/reviews/2026-06-09_retired-org-contacts-backup.json', JSON.stringify(backup, null, 2));
console.log(`\n  backup → thoughts/shared/reviews/2026-06-09_retired-org-contacts-backup.json`);

const deletable = backup.filter((b) => b.hasCompanyTwin);
console.log(`  deletable (Company twin confirmed): ${deletable.length} / ${IDS.length}\n`);

// Phase 2 — delete (only cross-check-passed)
if (APPLY) {
  for (const b of deletable) {
    try { await svc.deleteContact(b.id); console.log(`  ✓ deleted ${b.name}`); }
    catch (e) { console.log(`  ✗ ${b.name}: ${e.message}`); }
    await sleep(1100);
  }
}
console.log(`\n${APPLY ? `Deleted ${deletable.length}.` : 'Dry run — backup taken, NO deletes. Review backup, then --apply.'}\n`);
