import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadAllCodebases, loadCodebases, findCodebase, codebasesByTier } from '../src/index.mjs';

const cb = (over = {}) => ({
  repo: 'Acurioustractor/alpha',
  name: 'Alpha',
  tier: 'product',
  local_path: '~/Code/alpha',
  vercel_projects: ['alpha'],
  supabase_projects: ['tednluwflfhxyucgwigh'],
  domains: ['alpha.example'],
  notes: '',
  ...over,
});
const projects = { 'ACT-AA': { code: 'ACT-AA', status: 'active', github_repo: 'Acurioustractor/alpha' } };

function write(codebases) {
  const path = join(mkdtempSync(join(tmpdir(), 'act-codebases-')), 'codebases.json');
  writeFileSync(path, JSON.stringify({ _meta: {}, codebases }));
  return path;
}

test('the real config/codebases.json parses and passes every error guard', () => {
  const { codebases } = loadAllCodebases();
  assert.ok(codebases.length >= 10);
  assert.ok(findCodebase(codebases, 'act-global-infrastructure'));
});

test('every active project with a github_repo resolves to a codebase', () => {
  const { codebases } = loadAllCodebases();
  const jh = findCodebase(codebases, 'justicehub-platform');
  assert.ok(jh.project_codes.includes('ACT-JH'));
});

test('a project whose repo is not listed fails the load', () => {
  const path = write([cb({ repo: 'Acurioustractor/beta' })]);
  assert.throws(() => loadCodebases({ path, projects }), /ACT-AA names it in project-codes.json/);
});

test('an inactive project does not require its repo to be listed', () => {
  const path = write([cb({ repo: 'Acurioustractor/beta' })]);
  const archived = { 'ACT-AA': { ...projects['ACT-AA'], status: 'archived' } };
  assert.doesNotThrow(() => loadCodebases({ path, projects: archived }));
});

test('a repo listed twice fails, case-insensitively', () => {
  const path = write([cb(), cb({ repo: 'acurioustractor/ALPHA', vercel_projects: ['alpha-2'] })]);
  assert.throws(() => loadCodebases({ path, projects }), /listed twice/);
});

test('two codebases claiming one Vercel project fails', () => {
  const path = write([cb(), cb({ repo: 'Acurioustractor/beta' })]);
  assert.throws(() => loadCodebases({ path, projects }), /alpha is also claimed by Acurioustractor\/alpha/);
});

test('tooling that lists a Vercel project fails', () => {
  const path = write([cb(), cb({ repo: 'Acurioustractor/tools', tier: 'tooling', vercel_projects: ['tools'] })]);
  assert.throws(() => loadCodebases({ path, projects }), /tooling is not deployed/);
});

test('schema rejects a URL where a bare domain belongs, and an unknown field', () => {
  assert.throws(() => loadCodebases({ path: write([cb({ domains: ['https://alpha.example'] })]), projects }), /bare hostname/);
  assert.throws(() => loadCodebases({ path: write([cb({ owner: 'x' })]), projects }), /failed schema/);
});

test('a deployed codebase with no Vercel project is a gap, not an error', () => {
  const { gaps } = loadCodebases({ path: write([cb({ vercel_projects: [] })]), projects });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].field, 'vercel_projects');
});

test('local_path expands ~ and project codes attach', () => {
  const { codebases } = loadCodebases({ path: write([cb()]), projects });
  assert.equal(codebases[0].path, join(homedir(), 'Code/alpha'));
  assert.deepEqual(codebases[0].project_codes, ['ACT-AA']);
  assert.equal(codebasesByTier(codebases, 'product').length, 1);
});
