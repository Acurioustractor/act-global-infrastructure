#!/usr/bin/env node
/**
 * Phase 3 (safe subset) — delete JUNK tag definitions from the GHL location.
 *
 * Only unambiguous junk that nothing depends on: gone-from-ghl* (stale markers),
 * test/smoke/webhook fixtures, dated *-review-* migration markers, context:* probes,
 * auto-triage. Deleting a location tag removes it from the picker + all contacts in one call.
 *
 * NEVER touches load-bearing tags (workflow triggers) or any project/role/canonical tag.
 *
 * Usage:
 *   node scripts/delete-junk-ghl-tags.mjs            # DRY RUN — list matches only
 *   node scripts/delete-junk-ghl-tags.mjs --apply    # delete (Tier 3 — explicit go)
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const BASE = 'https://services.leadconnectorhq.com';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// UNAMBIGUOUS junk only. Anything not matching is left untouched.
const isJunk = (name) => {
  const t = name.trim().toLowerCase();
  return /^gone-from-ghl/.test(t)
    || /(^|[^a-z])(smoke|webhook-test|test-delete|codex)([^a-z]|$)/.test(t)
    || t === 'test-submission' || t === 'test' || t === 'test-delete-me'
    || /-review-20\d\d|needs-name-review|duplicate-review|migration-review/.test(t)
    || /^context:/.test(t)
    || t === 'auto-triage';
};

async function main() {
  console.log(`=== Delete junk GHL tags — ${APPLY ? 'APPLY (LIVE DELETE)' : 'DRY RUN'} ===`);
  const r = await fetch(`${BASE}/locations/${LOC}/tags`, { headers: H });
  if (!r.ok) { console.error('GET tags failed', r.status, (await r.text()).slice(0, 200)); process.exit(1); }
  const tags = (await r.json()).tags || [];
  console.log(`Location has ${tags.length} tag definitions`);

  const junk = tags.filter(t => isJunk(t.name));
  console.log(`\nMatched JUNK (${junk.length}) — to delete:`);
  junk.sort((a, b) => a.name.localeCompare(b.name)).forEach(t => console.log(`  ${t.name}`));

  // safety: show a sample of what is being KEPT so we can eyeball no false positives
  console.log(`\nKept (sample of 15 non-junk): ${tags.filter(t => !isJunk(t.name)).slice(0, 15).map(t => t.name).join(', ')}`);

  if (!APPLY) { console.log(`\nDRY RUN — nothing deleted. Re-run with --apply.`); return; }

  console.log(`\nDeleting ${junk.length}...`);
  let ok = 0, err = 0;
  for (const t of junk) {
    const d = await fetch(`${BASE}/locations/${LOC}/tags/${t.id}`, { method: 'DELETE', headers: H });
    if (d.ok) ok++; else { err++; if (err <= 5) console.log(`  ✗ ${t.name} -> ${d.status}`); }
    await sleep(150);
  }
  console.log(`Deleted: ${ok}, errors: ${err}`);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
