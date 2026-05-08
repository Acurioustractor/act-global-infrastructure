#!/usr/bin/env node
/**
 * Lint top-level wiki/projects/*.md against the canonical schema and config.
 *
 * Checks:
 *   1. Every top-level wiki/projects/*.md has all REQUIRED frontmatter fields
 *   2. tier is one of: ecosystem | studio | satellite | unspecified
 *   3. canonical_code matches /^ACT-[A-Z0-9]+$/ or 'TBD'
 *   4. canonical_slug === filename slug
 *   5. Every config/project-codes.json entry with canonical_slug has a matching
 *      wiki/projects/<slug>.md OR wiki/projects/<slug>/<slug>.md (subdir entry)
 *
 * Exit codes:
 *   0 - clean
 *   1 - errors (REQUIRED fields missing, invalid tier, bad code format, slug mismatch)
 *   2 - warnings only (orphans, missing pages for config entries, TBD/unspecified values)
 *
 * Use:
 *   node scripts/lint-wiki-projects.mjs
 *   node scripts/lint-wiki-projects.mjs --quiet   # show only failures
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
const VALID_TIERS = ['ecosystem', 'studio', 'satellite', 'background', 'unspecified'];
const CODE_RE = /^ACT-[A-Z0-9]+$/;
const QUIET = process.argv.includes('--quiet');

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

const errors = [];
const warnings = [];

const files = fs.readdirSync(PROJECTS_DIR)
  .filter(f => f.endsWith('.md') && !f.startsWith('.'))
  .sort();

const wikiSlugs = new Set();

for (const filename of files) {
  const filepath = path.join(PROJECTS_DIR, filename);
  const slug = filename.replace(/\.md$/, '');
  wikiSlugs.add(slug);
  const text = fs.readFileSync(filepath, 'utf8');
  const { frontmatter, hadFrontmatter } = parseFrontmatter(text);

  if (!hadFrontmatter) {
    errors.push(`[${filename}] no frontmatter — run scripts/normalise-wiki-project-frontmatter.mjs --apply`);
    continue;
  }

  for (const k of REQUIRED) {
    if (!(k in frontmatter)) errors.push(`[${filename}] missing required field: ${k}`);
  }

  if (frontmatter.tier && !VALID_TIERS.includes(frontmatter.tier)) {
    errors.push(`[${filename}] invalid tier "${frontmatter.tier}" — must be one of: ${VALID_TIERS.join(', ')}`);
  }

  if (frontmatter.canonical_code && frontmatter.canonical_code !== 'TBD' && !CODE_RE.test(frontmatter.canonical_code)) {
    errors.push(`[${filename}] invalid canonical_code "${frontmatter.canonical_code}" — must match ${CODE_RE} or be 'TBD'`);
  }

  if (frontmatter.canonical_slug && frontmatter.canonical_slug !== slug) {
    errors.push(`[${filename}] canonical_slug "${frontmatter.canonical_slug}" !== filename slug "${slug}"`);
  }

  if (frontmatter.canonical_code === 'TBD') {
    warnings.push(`[${filename}] canonical_code is 'TBD' — orphan, needs config entry`);
  }
  if (frontmatter.tier === 'unspecified') {
    warnings.push(`[${filename}] tier is 'unspecified' — needs assignment in config/project-codes.json`);
  }
  if (frontmatter.tier && !['ecosystem', 'studio', 'satellite', 'unspecified'].includes(frontmatter.tier)) {
    // already errored above, no warning needed
  }
}

// Cross-check: every config entry with canonical_slug should have a wiki page
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
for (const [code, entry] of Object.entries(config.projects || {})) {
  if (!entry.canonical_slug) {
    warnings.push(`[config:${code}] no canonical_slug set in config — cannot resolve to a wiki page`);
    continue;
  }
  // Background-tier projects are intentionally NOT on the website — skip page/tier warnings
  if (entry.tier === 'background') continue;
  const slug = entry.canonical_slug;
  const topLevel = path.join(PROJECTS_DIR, `${slug}.md`);
  const subdirEntry = path.join(PROJECTS_DIR, slug, `${slug}.md`);
  if (!fs.existsSync(topLevel) && !fs.existsSync(subdirEntry)) {
    warnings.push(`[config:${code}] no wiki page found at wiki/projects/${slug}.md or wiki/projects/${slug}/${slug}.md`);
  }
  if (!entry.tier) {
    warnings.push(`[config:${code}] no tier set in config (project: ${entry.name || slug})`);
  }
}

// Output
if (!QUIET || errors.length || warnings.length) {
  console.log(`=== Wiki projects lint ===`);
  console.log(`Top-level pages checked: ${files.length}`);
  console.log(`Config entries checked: ${Object.keys(config.projects || {}).length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log('');
}

if (errors.length) {
  console.log('ERRORS:');
  for (const e of errors) console.log('  ✗', e);
  console.log('');
}

if (warnings.length && !QUIET) {
  console.log('WARNINGS:');
  for (const w of warnings) console.log('  ⚠', w);
  console.log('');
}

if (errors.length) process.exit(1);
if (warnings.length) process.exit(2);
console.log('✓ clean');
process.exit(0);
