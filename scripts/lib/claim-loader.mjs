/**
 * Claim loader for narrative claim IDs cited by funders.json.
 *
 * Claim IDs in funders.json look like: `justicehub:claim-ten-anchor-communities-filter-is-relationship`
 * They resolve to files at: `wiki/narrative/<project>/<claim-slug>.md`
 *
 * Schema reference: wiki/narrative/funders.json (`claims_to_lead_with`, `claims_to_avoid` arrays)
 *
 * Usage:
 *   import { loadClaim, listClaims, claimExists } from './lib/claim-loader.mjs';
 *   const claim = loadClaim('justicehub:claim-ten-anchor-communities-filter-is-relationship');
 *   //=> { id, project, slug, path, headline, body, frontmatter }
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const NARRATIVE_DIR = path.join(REPO_ROOT, 'wiki', 'narrative');

/**
 * Resolve a claim ID to its absolute file path.
 * Throws if the ID is malformed (no colon).
 * Returns the path even if the file does not exist (caller decides).
 */
export function claimIdToPath(id) {
  if (typeof id !== 'string' || !id.includes(':')) {
    throw new Error(`Malformed claim ID: ${JSON.stringify(id)}. Expected '<project>:<claim-slug>'.`);
  }
  const [project, ...rest] = id.split(':');
  const slug = rest.join(':');
  if (!project || !slug) {
    throw new Error(`Malformed claim ID: ${JSON.stringify(id)}. Expected '<project>:<claim-slug>'.`);
  }
  return path.join(NARRATIVE_DIR, project, `${slug}.md`);
}

/** Does the claim file exist on disk? */
export function claimExists(id) {
  try { return fs.existsSync(claimIdToPath(id)); }
  catch { return false; }
}

/**
 * Parse frontmatter (YAML between leading `---` lines) into a flat object.
 * Returns `{ frontmatter, body }`. Frontmatter values are strings; arrays
 * use the simple `- item` shape.
 */
function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { frontmatter: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) return { frontmatter: {}, body: text };
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
  return { frontmatter, body };
}

function extractHeadline(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

/**
 * Load a claim by ID. Returns:
 *   { id, project, slug, path, exists, headline, body, frontmatter }
 * If the file does not exist, `exists` is false and `body`/`headline`/`frontmatter` are null.
 */
export function loadClaim(id) {
  const filePath = claimIdToPath(id);
  const [project, ...rest] = id.split(':');
  const slug = rest.join(':');
  if (!fs.existsSync(filePath)) {
    return { id, project, slug, path: filePath, exists: false, headline: null, body: null, frontmatter: null };
  }
  const text = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(text);
  return {
    id, project, slug, path: filePath, exists: true,
    headline: extractHeadline(body),
    body, frontmatter,
  };
}

/**
 * Load multiple claims by ID. Returns array of loadClaim results in input order.
 * Useful for `claims_to_lead_with` and `claims_to_avoid` arrays from funders.json.
 */
export function loadClaims(ids) {
  return ids.map(loadClaim);
}

/**
 * List all claim IDs present on disk under wiki/narrative/<project>/claim-*.md.
 * Returns array of `<project>:<claim-slug>` strings. Useful for completeness
 * checks and listing available claims for a project.
 */
export function listClaims(projectFilter = null) {
  if (!fs.existsSync(NARRATIVE_DIR)) return [];
  const out = [];
  for (const project of fs.readdirSync(NARRATIVE_DIR)) {
    if (projectFilter && project !== projectFilter) continue;
    const projDir = path.join(NARRATIVE_DIR, project);
    if (!fs.statSync(projDir).isDirectory()) continue;
    for (const f of fs.readdirSync(projDir)) {
      if (!f.startsWith('claim-') || !f.endsWith('.md')) continue;
      out.push(`${project}:${f.slice(0, -3)}`);
    }
  }
  return out.sort();
}

/**
 * Load funders.json from canonical location.
 */
export function loadFunders() {
  const filePath = path.join(REPO_ROOT, 'wiki', 'narrative', 'funders.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`funders.json not found at ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
