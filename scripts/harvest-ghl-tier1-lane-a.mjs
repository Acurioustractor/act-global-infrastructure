#!/usr/bin/env node
/**
 * Harvest GHL — Tier-1 Lane A: create the new tags + custom fields.
 *
 * SAFE: creates GHL config only (tags + field definitions). Touches NO contacts,
 * sends NOTHING. Idempotent — checks existence first, so re-running is harmless.
 * Plan: thoughts/shared/plans/2026-06-02-harvest-ghl-tier1-build.md
 *
 *   node scripts/harvest-ghl-tier1-lane-a.mjs            # DRY RUN (default)
 *   node scripts/harvest-ghl-tier1-lane-a.mjs --apply
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json' };
const BASE = 'https://services.leadconnectorhq.com';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Folder ids from the 8-folder reorg (2026-06-02)
const FOLDER = { engagement: '4cdopfBqM4hRimhZCepi', consent: 'ccsXEDOjjDgnnSCHTdSs' };

const TAGS = [
  'action:volunteered', 'action:attended', 'action:contributed', 'action:referred',
  'interest:garden', 'interest:events', 'interest:repair',
  'comms:email-ok', 'comms:reduced-frequency', 'comms:paused',
  'consent:newsletter-yes', 'consent:withdrawn',
];

const FIELDS = [
  { name: 'First Action Date', dataType: 'DATE', parentId: FOLDER.engagement },
  { name: 'Last Ask Date',     dataType: 'DATE', parentId: FOLDER.engagement },
  { name: 'Consent Timestamp', dataType: 'DATE', parentId: FOLDER.consent },
  { name: 'Consent Source',    dataType: 'TEXT', parentId: FOLDER.consent },
];
const keyOf = (name) => 'contact.' + name.toLowerCase().replace(/\s+/g, '_');

async function main() {
  console.log(`\n=== Harvest GHL Tier-1 Lane A — ${APPLY ? 'APPLY' : 'DRY RUN'} ===\n`);

  // ---- TAGS ----
  const tr = await fetch(`${BASE}/locations/${LOC}/tags`, { headers: H });
  const existingTags = tr.ok ? new Set(((await tr.json()).tags || []).map(t => (t.name || '').toLowerCase())) : new Set();
  console.log(`Existing tags fetched: ${existingTags.size}`);
  const tagsToCreate = TAGS.filter(t => !existingTags.has(t.toLowerCase()));
  console.log(`Tags to create (${tagsToCreate.length}/${TAGS.length}): ${tagsToCreate.join(', ') || '(all exist)'}`);

  // ---- FIELDS ----
  const fr = await fetch(`${BASE}/locations/${LOC}/customFields`, { headers: H });
  const existingKeys = new Set(((await fr.json()).customFields || []).map(f => f.fieldKey));
  const fieldsToCreate = FIELDS.filter(f => !existingKeys.has(keyOf(f.name)));
  console.log(`Fields to create (${fieldsToCreate.length}/${FIELDS.length}): ${fieldsToCreate.map(f => keyOf(f.name).replace('contact.','')).join(', ') || '(all exist)'}`);

  if (!APPLY) { console.log('\nDRY RUN — nothing created. Re-run with --apply.\n'); return; }

  console.log('\n--- creating tags ---');
  for (const name of tagsToCreate) {
    const r = await fetch(`${BASE}/locations/${LOC}/tags`, { method: 'POST', headers: H, body: JSON.stringify({ name }) });
    console.log(`  ${r.ok ? '✓' : '✗'} ${name} -> ${r.status}${r.ok ? '' : ' ' + (await r.text()).slice(0,100)}`);
    await sleep(150);
  }

  console.log('\n--- creating fields ---');
  for (const f of fieldsToCreate) {
    const r = await fetch(`${BASE}/locations/${LOC}/customFields`, { method: 'POST', headers: H, body: JSON.stringify({ name: f.name, dataType: f.dataType, model: 'contact', parentId: f.parentId }) });
    const j = await r.json().catch(() => ({}));
    const created = j.customField || j;
    const landed = created.parentId === f.parentId;
    console.log(`  ${r.ok ? '✓' : '✗'} ${keyOf(f.name).replace('contact.','')} (${f.dataType}) -> ${r.status}${r.ok ? (landed ? ' [in folder]' : ' [folder MISSING — fixing]') : ' ' + JSON.stringify(j).slice(0,120)}`);
    // if it didn't land in the folder, move it
    if (r.ok && !landed && created.id) {
      const m = await fetch(`${BASE}/locations/${LOC}/customFields/${created.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ name: f.name, parentId: f.parentId }) });
      console.log(`      move -> ${m.status}`);
    }
    await sleep(150);
  }
  console.log('\nDone. Lane A structure created. No contacts touched, nothing sent.\n');
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
