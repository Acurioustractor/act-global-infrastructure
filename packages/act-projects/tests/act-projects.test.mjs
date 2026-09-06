import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProjects, getProject, artPieces, allSites, REPO_ROOT } from '../src/index.mjs';

const base = () => ({
  _meta: { version: 'test' },
  projects: {
    'ACT-AA': {
      code: 'ACT-AA', name: 'Alpha', canonical_slug: 'alpha', category: 'justice', tier: 'ecosystem',
      status: 'active', description: 'x', production_url: 'https://alpha.example',
      sites: [{ role: 'primary', production_url: 'https://alpha.example' }], notion: { page_id: '179ebcf9-81cf-8005-ad63-d2a736280011' },
      wiki_path: 'wiki/projects/goods.md',
    },
  },
});

function writeFixture(obj) {
  const dir = mkdtempSync(join(tmpdir(), 'act-projects-'));
  const path = join(dir, 'project-codes.json');
  writeFileSync(path, JSON.stringify(obj));
  return path;
}

test('the real config/project-codes.json parses and passes every error guard', () => {
  const { projects, gaps } = loadProjects();
  assert.ok(Object.keys(projects).length >= 70);
  for (const g of gaps) assert.equal(g.severity, 'gap');
});

test('a clean fixture loads with no gaps', () => {
  const { gaps } = loadProjects({ path: writeFixture(base()), repoRoot: REPO_ROOT });
  assert.deepEqual(gaps, []);
});

// Positive controls: each of these MUST fail. If one passes, the guard is dead.
test('control: duplicate canonical_slug is an error', () => {
  const f = base();
  f.projects['ACT-AB'] = { ...f.projects['ACT-AA'], code: 'ACT-AB' };
  assert.throws(() => loadProjects({ path: writeFixture(f), repoRoot: REPO_ROOT }), /duplicate/);
});

test('control: production_url missing from sites[] is an error', () => {
  const f = base();
  f.projects['ACT-AA'].sites = [];
  assert.throws(() => loadProjects({ path: writeFixture(f), repoRoot: REPO_ROOT }), /not one of sites/);
});

test('control: wiki_path that does not exist is an error', () => {
  const f = base();
  f.projects['ACT-AA'].wiki_path = 'wiki/projects/does-not-exist.md';
  assert.throws(() => loadProjects({ path: writeFixture(f), repoRoot: REPO_ROOT }), /does not exist/);
});

test('control: an unknown top-level key fails the schema', () => {
  const f = base();
  f.projects['ACT-AA'].vercel = 'nope';
  assert.throws(() => loadProjects({ path: writeFixture(f), repoRoot: REPO_ROOT }), /failed schema/);
});

test('control: ecosystem project without a site is a gap, not an error', () => {
  const f = base();
  delete f.projects['ACT-AA'].production_url;
  f.projects['ACT-AA'].sites = [];
  const { gaps } = loadProjects({ path: writeFixture(f), repoRoot: REPO_ROOT });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].field, 'sites');
});

test('control: art_medium without an art block is a gap', () => {
  const f = base();
  f.projects['ACT-AA'].art_medium = ['installation'];
  const { gaps } = loadProjects({ path: writeFixture(f), repoRoot: REPO_ROOT });
  assert.ok(gaps.some((g) => g.field === 'art'));
});

test('getProject resolves code, slug and legacy code', () => {
  const { projects } = loadProjects();
  assert.equal(getProject(projects, 'ACT-JH').canonical_slug, 'justicehub');
  assert.equal(getProject(projects, 'justicehub').code, 'ACT-JH');
  assert.equal(getProject(projects, 'ACT-PC').code, 'ACT-PI');
  assert.equal(getProject(projects, 'nothing-here'), null);
});

test('art pieces and sites come out of the migrated record', () => {
  const { projects } = loadProjects();
  const art = artPieces(projects);
  assert.ok(art.length >= 10);
  assert.ok(art.every((p) => p.art.media.length > 0 && p.art.piece_slug));
  const sites = allSites(projects);
  assert.ok(sites.some((s) => s.project_code === 'ACT-JH' && s.production_url === 'https://www.justicehub.com.au'));
});

test('internal: true exempts an ecosystem project from the site guard, and only that guard', () => {
  const f = base();
  delete f.projects['ACT-AA'].production_url;
  f.projects['ACT-AA'].sites = [];
  f.projects['ACT-AA'].internal = true;
  const { gaps } = loadProjects({ path: writeFixture(f), repoRoot: REPO_ROOT });
  assert.deepEqual(gaps, []);
  // control: drop the Notion page too and the notion gap must still fire
  delete f.projects['ACT-AA'].notion;
  const again = loadProjects({ path: writeFixture(f), repoRoot: REPO_ROOT }).gaps;
  assert.equal(again.length, 1);
  assert.equal(again[0].field, 'notion.page_id');
});

test('art block: status defaults to active, connected_code must be a real project', () => {
  const f = base();
  f.projects['ACT-AA'].art = { media: ['installation'], piece_slug: 'alpha', connected_code: 'ACT-ZZ' };
  f.projects['ACT-AA'].art.wiki_path = 'wiki/projects/goods.md';
  assert.throws(() => loadProjects({ path: writeFixture(f), repoRoot: REPO_ROOT }), /not a project code/);
  // control: a real connected_code loads, status defaulted, EL gap reported
  f.projects['ACT-AA'].art.connected_code = 'ACT-AA';
  const { projects, gaps } = loadProjects({ path: writeFixture(f), repoRoot: REPO_ROOT });
  assert.equal(projects['ACT-AA'].art.status, 'active');
  assert.ok(gaps.some((g) => g.field === 'empathy_ledger.project_id'));
});
