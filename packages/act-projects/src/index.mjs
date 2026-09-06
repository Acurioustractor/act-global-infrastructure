import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectCodesFile } from './schema.mjs';
import { runGuards } from './guards.mjs';
import { indexWiki } from './wiki.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, '../../..');
export const PROJECT_CODES_PATH = join(REPO_ROOT, 'config/project-codes.json');

/**
 * Parse and guard the file. Throws on schema errors or guard errors. Returns
 * `{ projects, gaps }` where gaps are the non-fatal missing fields.
 */
export function loadProjects({ path = PROJECT_CODES_PATH, repoRoot = REPO_ROOT } = {}) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const parsed = ProjectCodesFile.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`project-codes.json failed schema:\n  ${lines.join('\n  ')}`);
  }
  const projects = parsed.data.projects;
  const failures = runGuards(projects, { repoRoot, wikiIndex: indexWiki(repoRoot) });
  const errors = failures.filter((f) => f.severity === 'error');
  if (errors.length) {
    const lines = errors.map((f) => `${f.code} ${f.field}: ${f.why}`);
    throw new Error(`project-codes.json failed guards:\n  ${lines.join('\n  ')}`);
  }
  return { projects, gaps: failures.filter((f) => f.severity === 'gap'), meta: parsed.data._meta };
}

export function getProject(projects, codeOrSlug) {
  const key = String(codeOrSlug).trim();
  if (projects[key]) return projects[key];
  const lower = key.toLowerCase();
  return (
    Object.values(projects).find(
      (p) =>
        p.canonical_slug === lower ||
        p.code.toLowerCase() === lower ||
        (p.legacy_codes || []).some((c) => c.toLowerCase() === lower) ||
        (p.slug_aliases || []).includes(lower),
    ) || null
  );
}

export const projectsByTier = (projects, tier) => Object.values(projects).filter((p) => p.tier === tier);
export const artPieces = (projects) => Object.values(projects).filter((p) => p.art);
export const sitesForProject = (projects, codeOrSlug) => getProject(projects, codeOrSlug)?.sites ?? [];
/** Every site across every project, each tagged with its project code. */
export const allSites = (projects) =>
  Object.values(projects).flatMap((p) => p.sites.map((s) => ({ ...s, project_code: p.code })));
