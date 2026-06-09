#!/usr/bin/env node
/**
 * Fix mis-tags on the accounts@act.place mailbox contact.
 *
 * accounts@act.place is an internal Google Workspace mailbox that got captured
 * as a GHL contact and mis-tagged `role:storyteller` + `lane:community` (the
 * OCAP community lane — wrong for a mailbox). Remove just those two. Reversible
 * (re-add with addTagToContact). `project:act-el` is left in place (not flagged).
 *
 * SAFETY: resolves by exact email, aborts unless exactly one match, only ever
 * removes the two named tags. Dry-run by default.
 *
 * Usage:
 *   node scripts/fix-accounts-mistag-2026-06-09.mjs          # dry-run (read-only)
 *   node scripts/fix-accounts-mistag-2026-06-09.mjs --apply  # remove the tags
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, '../lib/load-env.mjs'));
const { createGHLService } = await import(join(__dirname, 'lib', 'ghl-api-service.mjs'));
const ghl = createGHLService();

const APPLY = process.argv.includes('--apply');
const EMAIL = 'accounts@act.place';
const REMOVE = ['role:storyteller', 'lane:community'];

const recs = (await ghl.searchContacts(EMAIL)).filter(c => (c.email || '').toLowerCase() === EMAIL);
if (recs.length !== 1) {
  console.error(`Expected exactly 1 contact for ${EMAIL}, found ${recs.length} — aborting.`);
  process.exit(1);
}
const c = recs[0];
const present = REMOVE.filter(t => (c.tags || []).includes(t));

console.log(`${EMAIL}  id=${c.id}`);
console.log(`  current: [${(c.tags || []).join(', ')}]`);
console.log(`  remove:  [${present.join(', ')}]`);

if (!present.length) { console.log('Nothing to remove.'); process.exit(0); }
if (!APPLY) { console.log('\nDRY-RUN — re-run with --apply to remove.'); process.exit(0); }

for (const t of present) {
  await ghl.removeTagFromContact(c.id, t);
  console.log(`  ✓ removed ${t}`);
  await new Promise(r => setTimeout(r, 1100)); // GHL rate limit
}

const after = (await ghl.searchContacts(EMAIL)).filter(x => (x.email || '').toLowerCase() === EMAIL)[0];
console.log(`\nAfter: [${(after?.tags || []).join(', ')}]`);
