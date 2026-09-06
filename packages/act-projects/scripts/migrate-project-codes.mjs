#!/usr/bin/env node
// One-off, idempotent. Adds the typed blocks to config/project-codes.json from the
// legacy flat fields. Legacy fields are kept for one release so downstream syncs
// (studio sync-project-code-registry.mjs, GHL, Xero scripts) keep working.
// Usage: node packages/act-projects/scripts/migrate-project-codes.mjs [--apply]
import { readFileSync, writeFileSync } from 'node:fs';
import { PROJECT_CODES_PATH } from '../src/index.mjs';

const apply = process.argv.includes('--apply');
const file = JSON.parse(readFileSync(PROJECT_CODES_PATH, 'utf8'));
let changed = 0;

for (const p of Object.values(file.projects)) {
  const before = JSON.stringify(p);

  // Only add a block when there is something to put in it; the schema defaults
  // the rest, and an empty block on 74 projects is noise in every diff.
  const sites = p.sites ?? [];
  if (p.production_url && !sites.some((s) => s.production_url === p.production_url)) {
    sites.push({ role: 'primary', production_url: p.production_url, ...(p.github_repo ? { github_repo: p.github_repo } : {}) });
  } else if (!p.production_url && p.github_repo && sites.length === 0) {
    sites.push({ role: 'primary', github_repo: p.github_repo });
  }
  if (sites.length) p.sites = sites;

  if (p.notion_page_id && !p.notion?.page_id) p.notion = { ...(p.notion || {}), page_id: p.notion_page_id };
  if (p.ghl_tags?.length && !p.ghl?.tags) p.ghl = { ...(p.ghl || {}), tags: [...p.ghl_tags] };
  if (p.syndication_slug && !p.empathy_ledger?.syndication_slug) {
    p.empathy_ledger = { ...(p.empathy_ledger || {}), syndication_slug: p.syndication_slug };
  }

  if (p.art_medium && !p.art) {
    const media = Array.isArray(p.art_medium) ? p.art_medium : [p.art_medium];
    p.art = { media, tags: [...(p.art_tags || [])], piece_slug: p.canonical_slug };
  }

  if (JSON.stringify(p) !== before) changed++;
}

console.log(`${changed} projects would change`);
if (apply) {
  writeFileSync(PROJECT_CODES_PATH, JSON.stringify(file, null, 2) + '\n');
  console.log(`wrote ${PROJECT_CODES_PATH}`);
}
