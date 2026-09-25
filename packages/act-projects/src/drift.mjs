import { basename, dirname } from 'node:path';

/**
 * Compare a code folder (~/Code) with the codebase list. `entries` is what is on
 * disk: { name, kind } with kind 'repo' (a git checkout), 'worktree' (.git is a
 * file), 'dir' or 'file'. A top-level entry is allowed when a codebase's
 * local_path is that folder, or it starts with `_` or `.` (`_archive`, `_clients`).
 * Returns findings { kind, name, why }.
 */
export function localDrift({ root, entries, codebases }) {
  const listed = new Set(codebases.filter((cb) => cb.path && dirname(cb.path) === root).map((cb) => basename(cb.path)));
  const findings = [];
  for (const e of entries) {
    if (listed.has(e.name) || /^[._]/.test(e.name) || e.name === 'Icon\r') continue;
    const why = {
      worktree: 'a worktree at the top level; it belongs under its repo in .claude/worktrees/, or removed once pushed',
      repo: 'a git checkout that is not in codebases.json; list it or move it to _archive/',
      dir: 'a folder with no git and no codebase; move it to _archive/ or _clients/',
      file: 'a loose file; move it into the repo it belongs to, or _archive/',
    }[e.kind];
    findings.push({ kind: `stray-${e.kind}`, name: e.name, why });
  }
  return findings;
}

/**
 * Compare Supabase projects ({ ref, name, status }) with the codebase list.
 * `unclaimed`: a project no codebase names, so nobody knows what uses it.
 * `gone`: a codebase names a project that does not exist.
 * `paused`: a claimed project that is paused, so the code that names it is broken.
 */
export function supabaseDrift({ projects, codebases }) {
  const claims = new Map();
  for (const cb of codebases) for (const ref of cb.supabase_projects) claims.set(ref, [...(claims.get(ref) || []), cb.repo]);
  const refs = new Map(projects.map((p) => [p.ref, p]));
  const findings = [];
  for (const p of projects) {
    if (!claims.has(p.ref)) findings.push({ kind: 'unclaimed', name: p.name, ref: p.ref, why: 'no codebase names it: claim it in codebases.json, or back up and pause it' });
    else if (/PAUSED|INACTIVE/.test(p.status)) findings.push({ kind: 'paused', name: p.name, ref: p.ref, why: `paused, but named by ${claims.get(p.ref).join(', ')}` });
  }
  for (const [ref, repos] of claims) {
    if (!refs.has(ref)) findings.push({ kind: 'gone', name: ref, ref, why: `named by ${repos.join(', ')}, but not in the Supabase account` });
  }
  return findings;
}
