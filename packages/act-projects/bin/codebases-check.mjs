#!/usr/bin/env node
// Usage: node packages/act-projects/bin/codebases-check.mjs [--live] [--strict] [--days N]
//   default  schema + guards against project-codes.json. Exit 1 on errors. Runs in CI.
//   --live   also compare with the world (needs `gh`; Vercel only if VERCEL_TOKEN is set):
//            - a repo pushed in the last N days (default 90) that is not on the list
//            - a listed repo that is archived or gone on GitHub
//            - a listed local_path that is missing, or whose origin is a different repo
//            - a Vercel project updated in the last N days that no codebase claims
//            - a top-level entry in the code folder (CODE_ROOT, default ~/Code) that no
//              codebase claims: stray worktree, unlisted repo, folder or loose file
//            - a Supabase project no codebase claims, or a claimed one paused or gone
//              (needs SUPABASE_ACCESS_TOKEN)
//   --strict exit 1 on gaps and live findings too
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { loadAllCodebases, repoName, expandHome } from '../src/index.mjs';
import { localDrift, supabaseDrift, scanCodeFolder } from '../src/drift.mjs';

const args = process.argv.slice(2);
const live = args.includes('--live');
const strict = args.includes('--strict');
const days = Number(args[args.indexOf('--days') + 1]) || 90;

let result;
try {
  result = loadAllCodebases();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
const { codebases, gaps } = result;
const byTier = codebases.reduce((m, cb) => ({ ...m, [cb.tier]: (m[cb.tier] || 0) + 1 }), {});
console.log(`${codebases.length} codebases parsed, schema and guards clean (${Object.entries(byTier).map(([t, n]) => `${n} ${t}`).join(', ')}).`);
for (const g of gaps) console.log(`  gap  ${g.repo}  ${g.field}: ${g.why}`);

const findings = [];
if (live) {
  const since = Date.now() - days * 86400_000;
  const listed = new Map(codebases.map((cb) => [cb.repo.toLowerCase(), cb]));
  const owners = [...new Set(codebases.map((cb) => cb.repo.split('/')[0]))];

  for (const owner of owners) {
    const out = execFileSync('gh', ['repo', 'list', owner, '--limit', '500', '--json', 'nameWithOwner,pushedAt,isArchived'], { encoding: 'utf8' });
    const gh = new Map(JSON.parse(out).map((r) => [r.nameWithOwner.toLowerCase(), r]));
    for (const r of gh.values()) {
      if (!r.isArchived && Date.parse(r.pushedAt) > since && !listed.has(r.nameWithOwner.toLowerCase())) {
        findings.push(`unlisted  ${r.nameWithOwner} pushed ${r.pushedAt.slice(0, 10)}, not in codebases.json`);
      }
    }
    for (const cb of codebases.filter((c) => c.repo.split('/')[0] === owner)) {
      const r = gh.get(cb.repo.toLowerCase());
      if (!r) findings.push(`missing   ${cb.repo} is listed but not on GitHub`);
      else if (r.isArchived) findings.push(`archived  ${cb.repo} is listed but archived on GitHub`);
    }
  }

  for (const cb of codebases) {
    if (!cb.path) continue;
    if (!existsSync(cb.path)) {
      findings.push(`no-local  ${cb.repo}: ${cb.local_path} does not exist`);
      continue;
    }
    let origin = '';
    try {
      origin = execFileSync('git', ['-C', cb.path, 'remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
    } catch {
      findings.push(`no-git    ${cb.repo}: ${cb.local_path} is not a git checkout`);
      continue;
    }
    const slug = origin.replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '').toLowerCase();
    if (slug !== cb.repo.toLowerCase()) findings.push(`origin    ${cb.repo}: ${cb.local_path} points at ${slug}`);
  }

  if (process.env.VERCEL_TOKEN) {
    const claimed = new Set(codebases.flatMap((cb) => cb.vercel_projects));
    const team = process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : '';
    const res = await fetch(`https://api.vercel.com/v9/projects?limit=100${team}`, {
      headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
    });
    if (!res.ok) findings.push(`vercel    API returned ${res.status}; Vercel side not checked`);
    else {
      const { projects } = await res.json();
      const names = new Set(projects.map((p) => p.name));
      for (const p of projects) {
        if (p.updatedAt > since && !claimed.has(p.name)) {
          findings.push(`unowned   Vercel project ${p.name} updated ${new Date(p.updatedAt).toISOString().slice(0, 10)}, no codebase claims it`);
        }
      }
      for (const cb of codebases) {
        for (const v of cb.vercel_projects) if (!names.has(v)) findings.push(`vercel    ${repoName(cb)} claims ${v}, which is not in the first 100 Vercel projects`);
      }
    }
  } else {
    console.log('  (VERCEL_TOKEN not set: Vercel side not checked)');
  }

  const root = expandHome(process.env.CODE_ROOT || '~/Code');
  for (const f of localDrift({ root, entries: scanCodeFolder(root), codebases })) findings.push(`${f.kind.padEnd(14)} ${f.name}: ${f.why}`);

  if (process.env.SUPABASE_ACCESS_TOKEN) {
    const res = await fetch('https://api.supabase.com/v1/projects', {
      headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
    });
    if (!res.ok) findings.push(`supabase  API returned ${res.status}; Supabase side not checked`);
    else {
      const projects = (await res.json()).map((p) => ({ ref: p.id, name: p.name, status: p.status }));
      for (const f of supabaseDrift({ projects, codebases })) findings.push(`${f.kind.padEnd(9)} Supabase ${f.name} (${f.ref}): ${f.why}`);
    }
  } else {
    console.log('  (SUPABASE_ACCESS_TOKEN not set: Supabase side not checked)');
  }

  console.log(findings.length ? `\n${findings.length} live findings:\n  ${findings.join('\n  ')}` : '\nLive: GitHub, local checkouts, the code folder, Vercel and Supabase all match.');
}

process.exit(strict && (gaps.length || findings.length) ? 1 : 0);
