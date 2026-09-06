import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSiteRow, deploymentState, matchVercelProject, rowFromWebhook } from '../lib/vercel-sites.mjs';

const vp = [
  { id: 'prj_a', name: 'justicehub', link: { type: 'github', org: 'Acurioustractor', repo: 'justicehub-platform' } },
  { id: 'prj_b', name: 'act-farm', link: { type: 'github', org: 'Acurioustractor', repo: 'act-farm' } },
  { id: 'prj_c', name: 'oonchiumpa', link: null },
];
const project = { code: 'ACT-JH', name: 'JusticeHub', canonical_slug: 'justicehub', description: 'x', category: 'justice' };

test('matches by pinned id, then repo, then vercel host; never by bare name', () => {
  assert.equal(matchVercelProject({ vercel_project_id: 'prj_b' }, vp).project.id, 'prj_b');
  assert.equal(matchVercelProject({ github_repo: 'acurioustractor/justicehub-platform' }, vp).via, 'repo');
  assert.equal(matchVercelProject({ production_url: 'https://oonchiumpa-app.vercel.app' }, vp).project.id, 'prj_c');
  assert.equal(matchVercelProject({ production_url: 'https://www.justicehub.com.au' }, vp).via, 'unmatched');
});

test('deployment state vocabulary', () => {
  assert.equal(deploymentState({ readyState: 'READY', ready: 1700000000000 }).status, 'live');
  assert.equal(deploymentState({ state: 'ERROR', createdAt: 1700000000000 }).status, 'broken');
  assert.equal(deploymentState({ state: 'BUILDING' }).status, 'building');
});

// Positive control from the plan: an invalid project id must read unknown, never live.
test('control: no deployment found reads unknown, and no Vercel project reads external', () => {
  assert.equal(deploymentState(null).status, 'unknown');
  const withProject = buildSiteRow({ project, site: { role: 'primary', production_url: 'https://www.justicehub.com.au' }, vercelProject: vp[0], deployment: null });
  assert.equal(withProject.status, 'unknown');
  assert.equal(withProject.project_code, 'ACT-JH');
  const external = buildSiteRow({ project, site: { role: 'primary', production_url: 'https://www.justicehub.com.au' }, vercelProject: null, deployment: null });
  assert.equal(external.status, 'external');
  assert.equal(external.vercel_project_id, null);
});

test('row slug and name carry the role for non-primary sites', () => {
  const row = buildSiteRow({ project, site: { role: 'campaign', production_url: 'https://c.example' }, vercelProject: null, deployment: null });
  assert.equal(row.slug, 'justicehub-campaign');
  assert.equal(row.name, 'JusticeHub (campaign)');
});

test('webhook: production deployment events map to status; preview and unknown events are ignored', () => {
  const ok = rowFromWebhook({ type: 'deployment.succeeded', createdAt: 1700000000000, payload: { target: 'production', project: { id: 'prj_a' } } });
  assert.equal(ok.status, 'live');
  assert.equal(ok.vercel_project_id, 'prj_a');
  assert.equal(rowFromWebhook({ type: 'deployment.error', payload: { target: 'production', project: { id: 'prj_a' } } }).status, 'broken');
  assert.equal(rowFromWebhook({ type: 'deployment.succeeded', payload: { target: 'preview', project: { id: 'prj_a' } } }), null);
  assert.equal(rowFromWebhook({ type: 'project.created', payload: { project: { id: 'prj_a' } } }), null);
  assert.equal(rowFromWebhook({ type: 'deployment.succeeded', payload: {} }), null);
});

test('archive-role sites read archived even when the last build was broken', () => {
  const row = buildSiteRow({ project, site: { role: 'archive', vercel_project_name: 'old' }, vercelProject: { id: 'prj_z', name: 'old', link: null }, deployment: { state: 'ERROR', createdAt: 1700000000000 } });
  assert.equal(row.status, 'archived');
  assert.equal(row.slug, 'justicehub-archive');
  // control: the same broken build on a primary site still reads broken
  assert.equal(buildSiteRow({ project, site: { role: 'primary', vercel_project_name: 'old' }, vercelProject: { id: 'prj_z', name: 'old', link: null }, deployment: { state: 'ERROR', createdAt: 1700000000000 } }).status, 'broken');
});
