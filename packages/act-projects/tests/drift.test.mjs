import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDrift, supabaseDrift } from '../src/drift.mjs';

const root = '/Users/me/Code';
const cb = (name, supabase_projects = []) => ({ repo: `Acurioustractor/${name}`, path: `${root}/${name}`, supabase_projects });

test('local: listed checkouts, _archive and dotfolders pass', () => {
  const entries = [
    { name: 'alpha', kind: 'repo' },
    { name: '_archive', kind: 'dir' },
    { name: '_clients', kind: 'dir' },
    { name: '.wt', kind: 'dir' },
  ];
  assert.deepEqual(localDrift({ root, entries, codebases: [cb('alpha')] }), []);
});

test('local: flags stray worktrees, unlisted repos, dirs and loose files by kind', () => {
  const entries = [
    { name: 'alpha-wt', kind: 'worktree' },
    { name: 'old-site', kind: 'repo' },
    { name: 'Notes', kind: 'dir' },
    { name: 'report.json', kind: 'file' },
  ];
  const kinds = localDrift({ root, entries, codebases: [cb('alpha')] }).map((f) => `${f.kind}:${f.name}`);
  assert.deepEqual(kinds, ['stray-worktree:alpha-wt', 'stray-repo:old-site', 'stray-dir:Notes', 'stray-file:report.json']);
});

test('local: a codebase whose path is outside the root does not allow a same-named folder', () => {
  const elsewhere = { repo: 'Acurioustractor/cfg', path: '/Users/me/.claude', supabase_projects: [] };
  const found = localDrift({ root, entries: [{ name: '.claude', kind: 'dir' }, { name: 'cfg', kind: 'repo' }], codebases: [elsewhere] });
  assert.deepEqual(found.map((f) => f.name), ['cfg']);
});

test('supabase: claimed and active is clean', () => {
  const projects = [{ ref: 'aaaaaaaaaaaaaaaaaaaa', name: 'Shared', status: 'ACTIVE_HEALTHY' }];
  assert.deepEqual(supabaseDrift({ projects, codebases: [cb('alpha', ['aaaaaaaaaaaaaaaaaaaa'])] }), []);
});

test('supabase: flags unclaimed, paused-but-claimed, and claimed-but-gone', () => {
  const projects = [
    { ref: 'aaaaaaaaaaaaaaaaaaaa', name: 'Shared', status: 'INACTIVE' },
    { ref: 'bbbbbbbbbbbbbbbbbbbb', name: 'Barkly Backbone', status: 'ACTIVE_HEALTHY' },
  ];
  const codebases = [cb('alpha', ['aaaaaaaaaaaaaaaaaaaa', 'cccccccccccccccccccc'])];
  const kinds = supabaseDrift({ projects, codebases }).map((f) => `${f.kind}:${f.ref}`);
  assert.deepEqual(kinds.sort(), ['gone:cccccccccccccccccccc', 'paused:aaaaaaaaaaaaaaaaaaaa', 'unclaimed:bbbbbbbbbbbbbbbbbbbb']);
});
