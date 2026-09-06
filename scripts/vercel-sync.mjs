#!/usr/bin/env node
/**
 * Vercel -> ecosystem_sites, driven by the typed project record.
 *
 *   node scripts/vercel-sync.mjs            reconcile every registry site (daily cron)
 *   node scripts/vercel-sync.mjs --dry      show the rows, write nothing
 *   node scripts/vercel-sync.mjs --list     Vercel projects no registry site claims (delete candidates)
 *   node scripts/vercel-sync.mjs --write-registry
 *                                           pin vercel_project_id/name into config/project-codes.json
 *                                           for sites matched by repo or host (local file only)
 *
 * Which sites count is decided by @act/projects sites[], never by name patterns.
 * Between reconciles the command-center webhook (api/webhooks/vercel) keeps
 * status and last_deployment_at fresh per deployment event.
 *
 * Env: VERCEL_TOKEN, VERCEL_TEAM_ID, SUPABASE_SHARED_URL|SUPABASE_URL,
 *      SUPABASE_SHARED_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { loadProjects, PROJECT_CODES_PATH } from '../packages/act-projects/src/index.mjs';
import { buildSiteRow, matchVercelProject } from './lib/vercel-sites.mjs';

await import('../lib/load-env.mjs');

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry');
const TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_ACCESS_TOKEN;
const TEAM = process.env.VERCEL_TEAM_ID;
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!TOKEN) { console.error('VERCEL_TOKEN missing'); process.exit(2); }

const vercel = async (path) => {
  const url = new URL(`https://api.vercel.com${path}`);
  if (TEAM) url.searchParams.set('teamId', TEAM);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`vercel ${path}: ${res.status} ${await res.text()}`);
  return res.json();
};

async function allVercelProjects() {
  const out = [];
  let until;
  for (;;) {
    const j = await vercel(`/v9/projects?limit=100${until ? `&until=${until}` : ''}`);
    out.push(...j.projects);
    if (!j.pagination?.next) break;
    until = j.pagination.next;
  }
  return out;
}

async function latestProductionDeployment(projectId) {
  try {
    const j = await vercel(`/v6/deployments?projectId=${projectId}&target=production&limit=1`);
    return j.deployments?.[0] || null;
  } catch (err) {
    console.warn(`  deployments for ${projectId}: ${err.message.split('\n')[0]}`);
    return null;
  }
}

const { projects } = loadProjects();
const vercelProjects = await allVercelProjects();
console.log(`${vercelProjects.length} Vercel projects · ${Object.values(projects).reduce((n, p) => n + p.sites.length, 0)} registry sites`);

const claimed = new Set();
const rows = [];
const report = [];
for (const project of Object.values(projects)) {
  for (const site of project.sites) {
    const m = matchVercelProject(site, vercelProjects);
    if (m.project) claimed.add(m.project.id);
    const deployment = m.project ? await latestProductionDeployment(m.project.id) : null;
    const row = buildSiteRow({ project, site, vercelProject: m.project, deployment });
    rows.push(row);
    report.push({ code: project.code, slug: row.slug, via: m.via, vercel: m.project?.name || '-', status: row.status, last: row.last_deployment_at?.slice(0, 16) || '-', candidates: m.candidates });
  }
}

for (const r of report) console.log(`  ${r.code.padEnd(9)} ${r.slug.padEnd(28)} ${r.via.padEnd(15)} ${r.vercel.padEnd(28)} ${r.status.padEnd(9)} ${r.last}${r.candidates ? '  ' + r.candidates.join(',') : ''}`);

if (args.has('--list')) {
  const unclaimed = vercelProjects.filter((v) => !claimed.has(v.id));
  console.log(`\n${unclaimed.length} Vercel projects no registry site claims:`);
  for (const v of unclaimed) console.log(`  ${v.name.padEnd(40)} ${v.link ? `${v.link.org}/${v.link.repo}` : '(no repo)'}  created ${new Date(v.createdAt).toISOString().slice(0, 10)}`);
}

if (args.has('--write-registry')) {
  const file = JSON.parse(readFileSync(PROJECT_CODES_PATH, 'utf8'));
  let n = 0;
  for (const project of Object.values(projects)) {
    project.sites.forEach((site, i) => {
      const m = matchVercelProject(site, vercelProjects);
      if (!m.project) return;
      const target = file.projects[project.code].sites[i];
      if (target.vercel_project_id === m.project.id && target.vercel_project_name === m.project.name) return;
      target.vercel_project_id = m.project.id;
      target.vercel_project_name = m.project.name;
      n++;
    });
  }
  writeFileSync(PROJECT_CODES_PATH, JSON.stringify(file, null, 2) + '\n');
  console.log(`\npinned ${n} site(s) in ${PROJECT_CODES_PATH}`);
}

if (DRY) { console.log('\n--dry: nothing written'); process.exit(0); }
if (!SUPABASE_KEY) { console.error('Supabase service key missing'); process.exit(2); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { error } = await supabase.from('ecosystem_sites').upsert(rows, { onConflict: 'slug' });
if (error) { console.error('upsert failed:', error.message); process.exit(1); }
console.log(`\nupserted ${rows.length} rows into ecosystem_sites`);
