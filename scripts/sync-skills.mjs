#!/usr/bin/env node
/**
 * Sync the shared Claude skills from this repo (canonical) into sibling repos.
 *
 *   node scripts/sync-skills.mjs --all                 check every repo in the manifest, exit 1 on drift
 *   node scripts/sync-skills.mjs --all --apply         copy upstream over downstream, archive stale copies
 *   node scripts/sync-skills.mjs --repo <name|path> [--as <name>]
 *                                                      one repo; --as names the manifest entry when the path
 *                                                      is a worktree or a differently named checkout
 *
 * Manifest: config/shared-skills.json. A downstream file listed as an overlay is kept and never
 * overwritten; any other downstream-only file inside a synced skill is reported (kept on --apply).
 * Stale: a copy of a skill that this repo has archived, or anything under .claude/skills/global/
 * (the 2026-05 act-global-skills mechanism). --apply moves stale copies into
 * .claude/skills/_archive/<date>-stale/ in that repo, never deletes.
 *
 * Exit codes: 0 in sync, 1 drift or stale found (check mode), 2 bad input.
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const INFRA = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const all = args.includes('--all');
const repoArg = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : null;
const asArg = args.includes('--as') ? args[args.indexOf('--as') + 1] : null;

export function loadManifest(infra = INFRA) {
  return JSON.parse(readFileSync(join(infra, 'config/shared-skills.json'), 'utf8'));
}

export function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    // A dangling symlink is not a file to sync or to count; the real infra
    // checkout has a few in _archive from the 2026-05 mechanism.
    if (lstatSync(p).isSymbolicLink() && !existsSync(p)) continue;
    if (statSync(p).isDirectory()) out.push(...walk(p, base));
    else out.push(relative(base, p));
  }
  return out.sort();
}

/** Compare one skill between infra and a repo. Pure apart from reads. */
export function diffSkill(infra, repo, skill, overlays = []) {
  const src = join(infra, '.claude/skills', skill);
  const dst = join(repo, '.claude/skills', skill);
  if (!existsSync(join(src, 'SKILL.md'))) throw new Error(`upstream skill missing: ${src}`);
  const upstream = new Set(walk(src));
  const local = new Set(existsSync(dst) ? walk(dst) : []);
  const changed = [], missing = [], localOnly = [];
  for (const f of upstream) {
    if (!local.has(f)) missing.push(f);
    else if (!readFileSync(join(src, f)).equals(readFileSync(join(dst, f)))) changed.push(f);
  }
  for (const f of local) if (!upstream.has(f) && !overlays.includes(f)) localOnly.push(f);
  return { skill, src, dst, changed, missing, localOnly, overlays: [...local].filter((f) => overlays.includes(f)) };
}

/** Stale copies in a repo: skills archived upstream, and the whole global/ folder. */
export function findStale(infra, repo) {
  const skillsDir = join(repo, '.claude/skills');
  if (!existsSync(skillsDir)) return [];
  const archived = new Set();
  const arch = join(infra, '.claude/skills/_archive');
  if (existsSync(arch)) for (const d of walk(arch)) { const parts = d.split('/'); if (parts.length >= 2) archived.add(parts[1]); }
  const stale = [];
  for (const name of readdirSync(skillsDir)) {
    const p = join(skillsDir, name);
    const st = lstatSync(p);
    if (st.isSymbolicLink() && !existsSync(p)) { stale.push({ path: p, why: 'dangling symlink' }); continue; }
    if (!statSync(p).isDirectory() || name.startsWith('_')) continue;
    if (name === 'global') {
      let target = null;
      try { target = readdirSync(p); } catch { target = null; }
      stale.push({ path: p, why: `global/ folder from the 2026-05 mechanism (${target ? target.length + ' items' : 'symlink'})` });
      continue;
    }
    if (archived.has(name)) stale.push({ path: p, why: `archived upstream as _archive/*/${name}` });
  }
  return stale;
}

export function syncRepo({ infra, repoName, repoPath, manifest, apply }) {
  const skills = Object.entries(manifest.skills).filter(([, s]) => s.repos.includes(repoName));
  const report = { repo: repoName, path: repoPath, skills: [], stale: [], drift: 0 };
  for (const [skill, spec] of skills) {
    const d = diffSkill(infra, repoPath, skill, spec.overlays?.[repoName] || []);
    report.skills.push(d);
    report.drift += d.changed.length + d.missing.length;
    if (apply) for (const f of [...d.changed, ...d.missing]) { mkdirSync(dirname(join(d.dst, f)), { recursive: true }); writeFileSync(join(d.dst, f), readFileSync(join(d.src, f))); }
  }
  report.stale = findStale(infra, repoPath);
  if (apply && report.stale.length) {
    const dest = join(repoPath, '.claude/skills/_archive', `${new Date().toISOString().slice(0, 10)}-stale`);
    mkdirSync(dest, { recursive: true });
    for (const s of report.stale) renameSync(s.path, join(dest, basename(s.path)));
    writeFileSync(join(dest, 'RESTORE.md'), `Moved here by act-global-infrastructure/scripts/sync-skills.mjs on ${new Date().toISOString().slice(0, 10)}.\n\n${report.stale.map((s) => `- ${basename(s.path)}: ${s.why}`).join('\n')}\n\nTo restore: git mv the folder back to .claude/skills/. The canonical copy of each shared skill lives in act-global-infrastructure/.claude/skills.\n`);
  }
  return report;
}

function print(r) {
  const tag = r.drift === 0 && r.stale.length === 0 ? 'ok   ' : 'DRIFT';
  console.log(`${tag} ${r.repo}`);
  for (const d of r.skills) {
    for (const f of d.changed) console.log(`      drift    ${d.skill}/${f}`);
    for (const f of d.missing) console.log(`      missing  ${d.skill}/${f}`);
    for (const f of d.localOnly) console.log(`      local    ${d.skill}/${f} (not upstream, kept)`);
    if (!d.changed.length && !d.missing.length) console.log(`      in sync  ${d.skill}${d.overlays.length ? ` (+${d.overlays.length} overlay)` : ''}`);
  }
  for (const s of r.stale) console.log(`      stale    ${relative(r.path, s.path)}: ${s.why}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const manifest = loadManifest();
  let targets;
  if (all) targets = Object.entries(manifest._meta.repos);
  else if (repoArg) {
    const known = manifest._meta.repos[repoArg];
    targets = [[asArg || (known ? repoArg : basename(resolve(repoArg))), known || repoArg]];
  } else { console.error('usage: sync-skills.mjs --all | --repo <name|path> [--apply]'); process.exit(2); }
  let bad = 0;
  for (const [name, rel] of targets) {
    // Siblings live next to the real checkout; from a worktree under ~/Code/.wt that is not "..",
    // so fall back to ACT_REPOS_ROOT, then ~/Code.
    const candidates = [resolve(INFRA, rel), ...(process.env.ACT_REPOS_ROOT ? [resolve(process.env.ACT_REPOS_ROOT, basename(rel))] : []), resolve(homedir(), 'Code', basename(rel))];
    const repoPath = candidates.find((c) => existsSync(c));
    if (!repoPath) { console.log(`skip  ${name} (not found: ${candidates.join(', ')})`); continue; }
    const r = syncRepo({ infra: INFRA, repoName: name, repoPath, manifest, apply });
    print(r);
    if (r.drift || r.stale.length) bad++;
  }
  if (apply) console.log(`\napplied. Commit the changes in each repo on a branch.`);
  process.exit(bad && !apply ? 1 : 0);
}
