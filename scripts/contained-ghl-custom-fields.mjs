#!/usr/bin/env node
/**
 * contained-ghl-custom-fields.mjs — create the 2 CONTAINED custom fields.
 *
 * Source of truth: config/campaigns/contained-adelaide-2026.json -> custom_fields.to_create
 *   - cohort         (SINGLE_OPTIONS) — mirrors the dropped cohort:<x> tag, for views/reporting
 *   - slot_confirmed (DATE)           — set when the self-serve calendar booking is confirmed
 *
 * Idempotent: skips any field whose fieldKey already exists (matched against the live
 * customFields list). DRY RUN by default — prints the exact POST body for review and writes
 * NOTHING. --apply creates the fields and prints the returned IDs to paste back into the
 * config's custom_fields.existing.
 *
 * Tier 3 when run with --apply (live write to the shared GHL account). Day-shift, gated to
 * the 16 Jun go/no-go. Never AFK.
 *
 * USAGE:
 *   node scripts/contained-ghl-custom-fields.mjs            # DRY RUN (default) — no writes
 *   node scripts/contained-ghl-custom-fields.mjs --apply    # create the missing fields
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
await import(join(HERE, '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const BASE = 'https://services.leadconnectorhq.com';
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json' };

if (!KEY || !LOC) {
  console.error('Missing GHL_API_KEY / GHL_LOCATION_ID in .env.local (or .env). Aborting.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(join(HERE, '../config/campaigns/contained-adelaide-2026.json'), 'utf8'));
const toCreate = config.custom_fields?.to_create || {};

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: H });
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// fieldKey comes back as "contact.cohort"; strip the model prefix to compare with config keys.
const keyOf = (f) => (f.fieldKey || '').replace(/^contact\./, '');
const titleCase = (k) => k.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

async function main() {
  console.log(`\nCONTAINED custom fields — ${APPLY ? 'APPLY (LIVE WRITES)' : 'DRY RUN (no writes)'}`);
  console.log(`Location: ${LOC}\n`);

  const data = await req(`/locations/${LOC}/customFields`);
  const existing = new Map((data.customFields || []).map((f) => [keyOf(f), f]));

  const created = {};
  for (const [key, spec] of Object.entries(toCreate)) {
    const found = existing.get(key);
    if (found) {
      console.log(`✓ exists  ${key.padEnd(16)} id=${found.id}  (skip)`);
      created[key] = found.id;
      continue;
    }
    const body = {
      name: titleCase(key),
      dataType: spec.type,
      model: 'contact',
      ...(Array.isArray(spec.options) ? { options: spec.options } : {}),
    };
    if (!APPLY) {
      console.log(`+ create  ${key.padEnd(16)} POST /locations/${LOC}/customFields/`);
      console.log(`          body: ${JSON.stringify(body)}`);
      continue;
    }
    const res = await req(`/locations/${LOC}/customFields/`, { method: 'POST', body: JSON.stringify(body) });
    const field = res.customField || res;
    console.log(`+ CREATED ${key.padEnd(16)} id=${field.id}`);
    created[key] = field.id;
  }

  console.log(`\n${APPLY ? 'Applied.' : 'Dry run complete — re-run with --apply to create.'}`);
  if (APPLY) {
    console.log('\nPaste into config/campaigns/contained-adelaide-2026.json -> custom_fields.existing:');
    for (const [k, id] of Object.entries(created)) console.log(`  "${k}": "${id}",`);
  }
  console.log('');
}

main().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
