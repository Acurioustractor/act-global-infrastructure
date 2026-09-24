import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

export const CODEBASE_TIERS = ['platform', 'product', 'partner', 'tooling'];

const Codebase = z
  .object({
    repo: z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/, 'must be owner/name'),
    name: z.string().min(1),
    tier: z.enum(CODEBASE_TIERS),
    local_path: z.string().nullable(),
    vercel_projects: z.array(z.string().min(1)),
    supabase_projects: z.array(z.string().regex(/^[a-z]{20}$/, 'must be a 20-letter Supabase project id')),
    domains: z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'bare hostname, no scheme or path')),
    notes: z.string(),
  })
  .strict();

export const CodebasesFile = z.object({
  _meta: z.record(z.unknown()),
  codebases: z.array(Codebase),
});

/** `~/x` → `/Users/<me>/x`. Paths are stored with `~` so the file reads the same on any machine. */
export const expandHome = (p) => (p && p.startsWith('~/') ? join(homedir(), p.slice(2)) : p);

/**
 * Guard failures, same shape as the project guards. `error`: the file is wrong and
 * nothing should load it. `gap`: well formed, but a deployed codebase is missing a
 * field it needs.
 */
export function runCodebaseGuards(codebases, projects) {
  const failures = [];
  const fail = (severity, cb, field, why) => failures.push({ severity, repo: cb.repo, tier: cb.tier, field, why });

  const repos = new Map();
  const vercel = new Map();
  for (const cb of codebases) {
    const key = cb.repo.toLowerCase();
    if (repos.has(key)) fail('error', cb, 'repo', 'listed twice');
    repos.set(key, cb);
    for (const v of cb.vercel_projects) {
      if (vercel.has(v)) fail('error', cb, 'vercel_projects', `${v} is also claimed by ${vercel.get(v)}`);
      vercel.set(v, cb.repo);
    }
    if ((cb.tier === 'product' || cb.tier === 'partner') && cb.vercel_projects.length === 0) {
      fail('gap', cb, 'vercel_projects', 'deployed tier with no Vercel project');
    }
    if (cb.tier === 'tooling' && cb.vercel_projects.length) {
      fail('error', cb, 'tier', 'tooling is not deployed, but it lists Vercel projects');
    }
  }

  // Every repo a live project names must be on the list, or the project points at nothing.
  for (const p of Object.values(projects || {})) {
    if (!p.github_repo || p.status !== 'active') continue;
    if (!repos.has(p.github_repo.toLowerCase())) {
      failures.push({ severity: 'error', repo: p.github_repo, tier: null, field: 'repo', why: `${p.code} names it in project-codes.json but it is not in codebases.json` });
    }
  }
  return failures;
}

/**
 * Parse and guard config/codebases.json. Throws on schema or guard errors. Each
 * codebase comes back with `path` (local_path expanded, or null) and `project_codes`
 * (the active projects in project-codes.json whose github_repo is this repo).
 */
export function loadCodebases({ path, projects }) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const parsed = CodebasesFile.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`codebases.json failed schema:\n  ${lines.join('\n  ')}`);
  }
  const failures = runCodebaseGuards(parsed.data.codebases, projects);
  const errors = failures.filter((f) => f.severity === 'error');
  if (errors.length) {
    throw new Error(`codebases.json failed guards:\n  ${errors.map((f) => `${f.repo} ${f.field}: ${f.why}`).join('\n  ')}`);
  }
  const codesByRepo = new Map();
  for (const p of Object.values(projects || {})) {
    if (!p.github_repo || p.status !== 'active') continue;
    const k = p.github_repo.toLowerCase();
    codesByRepo.set(k, [...(codesByRepo.get(k) || []), p.code]);
  }
  const codebases = parsed.data.codebases.map((cb) => ({
    ...cb,
    path: expandHome(cb.local_path),
    project_codes: codesByRepo.get(cb.repo.toLowerCase()) || [],
  }));
  return { codebases, gaps: failures.filter((f) => f.severity === 'gap') };
}

/** Short repo name without the owner: `Acurioustractor/theharvest` → `theharvest`. */
export const repoName = (cb) => cb.repo.split('/')[1];
export const codebasesByTier = (codebases, ...tiers) => codebases.filter((cb) => tiers.includes(cb.tier));
export const findCodebase = (codebases, repoOrName) => {
  const k = String(repoOrName).toLowerCase();
  return codebases.find((cb) => cb.repo.toLowerCase() === k || repoName(cb).toLowerCase() === k) || null;
};
