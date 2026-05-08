#!/usr/bin/env node
/**
 * Normalise frontmatter on top-level wiki/projects/*.md to a canonical schema.
 *
 * Sources of truth (precedence order for each field):
 *   1. config/project-codes.json (canonical_code, tier, leads)
 *   2. Existing frontmatter
 *   3. Body line `**Status:** X | **Code:** ACT-XX | **Tier:** Y`
 *   4. Filename slug
 *
 * Schema (REQUIRED in every project page):
 *   title, status, canonical_slug, canonical_code, tier,
 *   website_slug, website_path, public_surface, cluster
 *
 * Optional fields preserved if present (NOT added if absent):
 *   date, entity_type, tagging_mode, empathy_ledger_key, lead,
 *   funder_ids, project_code (legacy alias), type (legacy)
 *
 * Use:
 *   node scripts/normalise-wiki-project-frontmatter.mjs            # dry-run
 *   node scripts/normalise-wiki-project-frontmatter.mjs --verbose  # dry-run + show output samples
 *   node scripts/normalise-wiki-project-frontmatter.mjs --apply    # write back
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS_DIR = path.join(REPO_ROOT, 'wiki', 'projects');
const CONFIG_PATH = path.join(REPO_ROOT, 'config', 'project-codes.json');

const REQUIRED = [
  'title', 'status', 'canonical_slug', 'canonical_code', 'tier',
  'website_slug', 'website_path', 'public_surface', 'cluster',
];
const PRESERVE = [
  'date', 'entity_type', 'tagging_mode', 'empathy_ledger_key',
  'lead', 'funder_ids', 'project_code', 'type',
];

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

// Frontmatter parser (matches scripts/lib/claim-loader.mjs convention)
function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { frontmatter: {}, body: text, hadFrontmatter: false };
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) return { frontmatter: {}, body: text, hadFrontmatter: false };
  const fmRaw = text.slice(4, end);
  const body = text.slice(end + 5);
  const frontmatter = {};
  let lastKey = null;
  for (const line of fmRaw.split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('  - ')) {
      if (lastKey && Array.isArray(frontmatter[lastKey])) frontmatter[lastKey].push(line.slice(4).trim());
      continue;
    }
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (val === '') { frontmatter[key] = []; lastKey = key; }
    else { frontmatter[key] = val.replace(/^["']|["']$/g, ''); lastKey = null; }
  }
  return { frontmatter, body, hadFrontmatter: true };
}

function serialiseFrontmatter(fm, body) {
  const order = [...REQUIRED, ...PRESERVE];
  const seen = new Set();
  const lines = [];
  for (const k of order) {
    if (!(k in fm)) continue;
    seen.add(k);
    const v = fm[k];
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const item of v) lines.push(`  - ${item}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  for (const k of Object.keys(fm)) {
    if (seen.has(k)) continue;
    const v = fm[k];
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const item of v) lines.push(`  - ${item}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\n+/, '')}`;
}

function extractBodyMetadata(body) {
  const out = {};
  const line = body.split('\n').find(l => /\*\*Code:\*\*/i.test(l));
  if (!line) return out;
  const codeM = line.match(/\*\*Code:\*\*\s*([A-Z]+-[A-Z0-9]+)/);
  if (codeM) out.canonical_code = codeM[1].trim();
  const statusM = line.match(/\*\*Status:\*\*\s*([A-Za-z]+)/);
  if (statusM) out.status = statusM[1].trim();
  const tierM = line.match(/\*\*Tier:\*\*\s*([A-Za-z][A-Za-z\s()]*)/);
  if (tierM) {
    const t = tierM[1].trim().toLowerCase().replace(/\s*\(.+\)/, '').trim();
    if (['ecosystem', 'studio', 'satellite', 'background'].includes(t)) out.tier = t;
  }
  return out;
}

function extractTitleFromBody(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const slugToConfig = {};
const codeToConfig = {};
for (const [code, entry] of Object.entries(config.projects || {})) {
  if (entry.canonical_slug) slugToConfig[entry.canonical_slug] = { code, ...entry };
  codeToConfig[code] = { code, ...entry };
}

const files = fs.readdirSync(PROJECTS_DIR)
  .filter(f => f.endsWith('.md') && !f.startsWith('.'))
  .sort();

const report = { normalised: [], orphans: [], unchanged: [], stubbed: [] };

for (const filename of files) {
  const filepath = path.join(PROJECTS_DIR, filename);
  const slug = filename.replace(/\.md$/, '');
  const text = fs.readFileSync(filepath, 'utf8');
  const { frontmatter, body, hadFrontmatter } = parseFrontmatter(text);
  const bodyMeta = extractBodyMetadata(body);
  const title = frontmatter.title || extractTitleFromBody(body) || slug;

  const cfg = slugToConfig[slug]
    || (frontmatter.canonical_code ? codeToConfig[frontmatter.canonical_code] : null)
    || (bodyMeta.canonical_code ? codeToConfig[bodyMeta.canonical_code] : null);

  const newFm = {};
  newFm.title = title;
  newFm.status = frontmatter.status || bodyMeta.status || 'Active';
  newFm.canonical_slug = slug;
  newFm.canonical_code = (cfg && cfg.code) || frontmatter.canonical_code || frontmatter.project_code || bodyMeta.canonical_code || 'TBD';
  newFm.tier = (cfg && cfg.tier) || frontmatter.tier || bodyMeta.tier || 'unspecified';
  newFm.website_slug = frontmatter.website_slug || slug;
  newFm.website_path = frontmatter.website_path || `/projects/${slug}`;

  if (frontmatter.public_surface) newFm.public_surface = frontmatter.public_surface;
  else if (frontmatter.type === 'partner') newFm.public_surface = 'partner';
  else if (newFm.status === 'Stub') newFm.public_surface = 'stub';
  else newFm.public_surface = 'project';

  newFm.cluster = frontmatter.cluster || slug;

  for (const k of PRESERVE) {
    if (k in frontmatter) newFm[k] = frontmatter[k];
  }

  if (!cfg) report.orphans.push({ filename, code: newFm.canonical_code });
  if (newFm.canonical_code === 'TBD' || newFm.tier === 'unspecified') {
    report.stubbed.push({ filename, code: newFm.canonical_code, tier: newFm.tier });
  }

  const existingKeys = Object.keys(frontmatter);
  const newKeys = Object.keys(newFm);
  const sameKeys = existingKeys.length === newKeys.length && newKeys.every(k => existingKeys.includes(k));
  const sameValues = sameKeys && newKeys.every(k => JSON.stringify(frontmatter[k]) === JSON.stringify(newFm[k]));

  if (hadFrontmatter && sameValues) {
    report.unchanged.push(filename);
    continue;
  }

  report.normalised.push({
    filename,
    hadFrontmatter,
    before: hadFrontmatter ? Object.keys(frontmatter) : [],
    after: Object.keys(newFm),
  });

  if (APPLY) {
    fs.writeFileSync(filepath, serialiseFrontmatter(newFm, body), 'utf8');
  } else if (VERBOSE) {
    console.log('--- ' + filename + ' ---');
    console.log(serialiseFrontmatter(newFm, body).split('\n').slice(0, 15).join('\n'));
    console.log('');
  }
}

console.log('=== Normalisation report ===');
console.log(`Total files: ${files.length}`);
console.log(`Already canonical (no change): ${report.unchanged.length}`);
console.log(`Normalised: ${report.normalised.length}`);
console.log(`Orphans (no config match): ${report.orphans.length}`);
console.log(`Stubbed (TBD code or unspecified tier): ${report.stubbed.length}`);
console.log('');

if (report.orphans.length > 0) {
  console.log('Orphans (need config entry OR move out of wiki/projects):');
  for (const o of report.orphans) console.log(`  - ${o.filename} (code in body: ${o.code})`);
  console.log('');
}

if (report.stubbed.length > 0) {
  console.log('Stubbed (TBD/unspecified — manual fill needed):');
  for (const s of report.stubbed) console.log(`  - ${s.filename} (code: ${s.code}, tier: ${s.tier})`);
  console.log('');
}

if (!APPLY) {
  console.log('DRY RUN — no files written. Re-run with --apply to write back.');
}
