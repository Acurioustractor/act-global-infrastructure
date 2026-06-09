#!/usr/bin/env node
/**
 * PURGE all records for a fixed list of CONTAINED-cohort bot-signup emails.
 *
 * Decision (Ben, 2026-06-09): the 14 emails below are bot submissions that hit
 * BOTH the Goods inquiry form (garbage-name `role:buyer` record) and the
 * CONTAINED Adelaide newsletter footer (`comms:goods-newsletter` record).
 * Delete both records per email — they are not real subscribers. This aligns
 * with the phantom-consent safe direction (never-really-consented → remove).
 *
 * SAFETY (irreversible — GHL deletes cannot be undone):
 *   - ONLY ever touches the hardcoded PURGE_EMAILS allowlist. By construction it
 *     cannot delete anything else.
 *   - Hard cap: aborts if it would delete more than 30 records.
 *   - Dry-run by default; prints every record (name + tags) so you can eyeball
 *     before --apply. Every delete is logged to scripts/output/.
 *
 * Usage:
 *   node scripts/delete-ghl-spam-dups-2026-06-09.mjs            # dry-run (read-only)
 *   node scripts/delete-ghl-spam-dups-2026-06-09.mjs --apply    # delete (irreversible)
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, '../lib/load-env.mjs'));
const { createGHLService } = await import(join(__dirname, 'lib', 'ghl-api-service.mjs'));
const ghl = createGHLService();

const APPLY = process.argv.includes('--apply');
const CAP = 30;

const PURGE_EMAILS = [
  'c.jones@pgud.org', 'srubiamador@sjusd.org', 'hawk_b51@yahoo.com', 'sbruzda@allianceppc.com',
  'dj.polodavi.s@gmail.com', 'cperry@qt-az.com', 'l.fclaf.fee@gmail.com', 'kathy@klempel.me',
  'javi_tess92@outlook.com', 'sgbox@wanadoo.fr', '7202034285@tmomail.net', 'vr@chameleongroup.co',
  'sd.sas.hco@gmail.com', 'ecoury8751@aol.com',
  // Found in the REVIEW bucket — same bot pattern (garbage-name buyer + contained-adelaide
  // newsletter) as the 14 above. The first 14 were purged 2026-06-09; re-running --apply
  // skips them (0 records) and deletes only these two.
  'jobs@key-systems.net', 'support@rubimicrocafe.com',
];

const nameOf = c => c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || '(no name)';

console.log(`delete-ghl-spam-dups (PURGE) — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

const targets = [];
for (const email of PURGE_EMAILS) {
  const recs = (await ghl.searchContacts(email)).filter(c => (c.email || '').toLowerCase() === email);
  console.log(`${email}: ${recs.length} record(s)`);
  for (const c of recs) {
    console.log(`   ${c.id}  "${nameOf(c)}"  [${(c.tags || []).join(', ')}]`);
    targets.push({ email, id: c.id, name: nameOf(c), tags: c.tags || [] });
  }
}

console.log(`\n${APPLY ? 'APPLYING' : 'DRY-RUN'}: ${targets.length} record(s) across ${PURGE_EMAILS.length} emails.`);

if (!APPLY) { console.log('Re-run with --apply to delete (irreversible).'); process.exit(0); }

if (targets.length > CAP) {
  console.error(`\nABORT: ${targets.length} deletes exceeds safety cap of ${CAP}. Refusing.`);
  process.exit(1);
}

const log = [];
for (const t of targets) {
  try {
    await ghl.deleteContact(t.id);
    log.push({ ...t, ok: true });
    console.log(`  ✓ deleted ${t.id} <${t.email}>`);
  } catch (e) {
    log.push({ ...t, ok: false, error: String(e.message).slice(0, 140) });
    console.error(`  ✗ ${t.id}: ${String(e.message).slice(0, 100)}`);
  }
  await new Promise(r => setTimeout(r, 1100)); // GHL rate limit
}

mkdirSync(join(__dirname, 'output'), { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const file = join(__dirname, `output/delete-spam-dups-${ts}.json`);
writeFileSync(file, JSON.stringify({ when: new Date().toISOString(), deleted: log.filter(l => l.ok).length, errors: log.filter(l => !l.ok).length, log }, null, 2));
console.log(`\nDone. Deleted ${log.filter(l => l.ok).length}, errors ${log.filter(l => !l.ok).length}.\nAudit log (forensic — delete is not reversible): ${file}`);
