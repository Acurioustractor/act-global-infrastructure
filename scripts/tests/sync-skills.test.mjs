import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diffSkill, findStale, syncRepo } from '../sync-skills.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  const infra = join(root, 'infra'), repo = join(root, 'repo');
  mkdirSync(join(infra, '.claude/skills/brand/references'), { recursive: true });
  writeFileSync(join(infra, '.claude/skills/brand/SKILL.md'), 'v2');
  writeFileSync(join(infra, '.claude/skills/brand/references/core.md'), 'core');
  mkdirSync(join(infra, '.claude/skills/_archive/2026-06/sprint'), { recursive: true });
  writeFileSync(join(infra, '.claude/skills/_archive/2026-06/sprint/SKILL.md'), 'old');
  mkdirSync(join(repo, '.claude/skills/brand/references'), { recursive: true });
  writeFileSync(join(repo, '.claude/skills/brand/SKILL.md'), 'v1');
  writeFileSync(join(repo, '.claude/skills/brand/references/overlay.md'), 'mine');
  mkdirSync(join(repo, '.claude/skills/sprint'), { recursive: true });
  writeFileSync(join(repo, '.claude/skills/sprint/SKILL.md'), 'old copy');
  mkdirSync(join(repo, '.claude/skills/global/x'), { recursive: true });
  return { infra, repo };
}

test('diff: drift, missing and overlays are told apart', () => {
  const { infra, repo } = fixture();
  const d = diffSkill(infra, repo, 'brand', ['references/overlay.md']);
  assert.deepEqual(d.changed, ['SKILL.md']);
  assert.deepEqual(d.missing, ['references/core.md']);
  assert.deepEqual(d.localOnly, []);
  assert.deepEqual(d.overlays, ['references/overlay.md']);
});

test('stale: archived-upstream copies and the global folder are found', () => {
  const { infra, repo } = fixture();
  const stale = findStale(infra, repo).map((s) => s.path.split('/').pop()).sort();
  assert.deepEqual(stale, ['global', 'sprint']);
});

test('apply: upstream wins, overlay kept, stale archived with RESTORE.md; then in sync', () => {
  const { infra, repo } = fixture();
  const manifest = { _meta: { repos: {} }, skills: { brand: { repos: ['r'], overlays: { r: ['references/overlay.md'] } } } };
  const r = syncRepo({ infra, repoName: 'r', repoPath: repo, manifest, apply: true });
  assert.equal(r.drift, 2);
  assert.equal(readFileSync(join(repo, '.claude/skills/brand/SKILL.md'), 'utf8'), 'v2');
  assert.equal(readFileSync(join(repo, '.claude/skills/brand/references/overlay.md'), 'utf8'), 'mine');
  assert.ok(!existsSync(join(repo, '.claude/skills/sprint')));
  assert.ok(!existsSync(join(repo, '.claude/skills/global')));
  const archive = join(repo, '.claude/skills/_archive');
  assert.ok(existsSync(archive));
  const again = syncRepo({ infra, repoName: 'r', repoPath: repo, manifest, apply: false });
  assert.equal(again.drift, 0);
  assert.equal(again.stale.length, 0);
});

// Control: a repo that is not in the skill's repos list gets nothing synced and nothing archived in check mode.
test('control: check mode changes nothing on disk', () => {
  const { infra, repo } = fixture();
  const manifest = { _meta: { repos: {} }, skills: { brand: { repos: ['r'] } } };
  const r = syncRepo({ infra, repoName: 'r', repoPath: repo, manifest, apply: false });
  assert.equal(r.drift, 2);
  assert.equal(readFileSync(join(repo, '.claude/skills/brand/SKILL.md'), 'utf8'), 'v1');
  assert.ok(existsSync(join(repo, '.claude/skills/sprint')));
});
