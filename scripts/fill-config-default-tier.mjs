#!/usr/bin/env node
/**
 * Fill missing `tier` on entries in config/project-codes.json.
 *
 * Default tier: 'background' (semantic: "in our system, not on the public website").
 * Only touches entries WITHOUT a tier. Idempotent.
 *
 * Use:
 *   node scripts/fill-config-default-tier.mjs              # dry-run
 *   node scripts/fill-config-default-tier.mjs --apply      # write back
 *   node scripts/fill-config-default-tier.mjs --tier=satellite --apply  # use a different default
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'config', 'project-codes.json');

const APPLY = process.argv.includes('--apply');
const tierArg = process.argv.find(a => a.startsWith('--tier='));
const DEFAULT_TIER = tierArg ? tierArg.split('=')[1] : 'background';

const VALID_TIERS = ['ecosystem', 'studio', 'satellite', 'background'];
if (!VALID_TIERS.includes(DEFAULT_TIER)) {
  console.error(`Invalid tier: ${DEFAULT_TIER}. Must be one of: ${VALID_TIERS.join(', ')}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const filled = [];

for (const [code, entry] of Object.entries(config.projects || {})) {
  if (entry.tier) continue;
  filled.push({ code, name: entry.name || entry.canonical_slug || code });
  entry.tier = DEFAULT_TIER;
}

console.log(`=== Fill missing tier with: ${DEFAULT_TIER} ===`);
console.log(`Total config entries: ${Object.keys(config.projects || {}).length}`);
console.log(`Entries to fill: ${filled.length}`);
console.log('');

if (filled.length) {
  console.log('Will set tier on:');
  for (const f of filled) console.log(`  - ${f.code} ${f.name}`);
  console.log('');
}

// Update _meta.tier_values to include 'background' if not present
let metaUpdated = false;
if (config._meta?.tier_values && !config._meta.tier_values.includes('background')) {
  config._meta.tier_values.push('background');
  metaUpdated = true;
  console.log(`_meta.tier_values updated to include 'background'`);
}
if (config._meta?.tier_descriptions && !config._meta.tier_descriptions.background) {
  config._meta.tier_descriptions.background = 'Background records — partners, archives, historical or test entries. Not surfaced on the public website but preserved for reflection and history.';
  metaUpdated = true;
  console.log(`_meta.tier_descriptions.background added`);
}

if (APPLY) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`✓ Wrote ${CONFIG_PATH}`);
} else {
  console.log('DRY RUN — re-run with --apply to write back.');
}
