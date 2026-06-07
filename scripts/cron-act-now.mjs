#!/usr/bin/env node
/**
 * Cron wrapper for the daily ACT Now refresh.
 *
 * Replaces the direct invocation of sync-act-now-to-notion.mjs in the
 * `act-now-sync` PM2 entry. Chains:
 *
 *   1. git pull --ff-only origin main          (avoid commit conflicts)
 *   2. sync-act-now-to-notion.mjs              (refreshes the Notion child page)
 *   3. render-act-now-html.mjs                 (writes act-now.html in two places)
 *   4. if HTML changed: git add/commit/push    (Vercel auto-redeploys
 *                                                 https://command.act.place/act-now.html)
 *
 * No-ops cleanly when the HTML hasn't changed (skip commit). Failures in
 * any one step are logged but don't kill the others — Notion refresh is
 * independent of HTML render is independent of git push.
 *
 * Cron: daily 8:11am AEST (act-now-sync entry in ecosystem.config.cjs).
 *
 * Usage:
 *   node scripts/cron-act-now.mjs              # full chain
 *   node scripts/cron-act-now.mjs --skip-pull  # local testing without pulling
 *   node scripts/cron-act-now.mjs --dry-git    # render but don't commit/push
 */

import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

const SKIP_PULL = process.argv.includes('--skip-pull');
const DRY_GIT = process.argv.includes('--dry-git');

const log = (m) => console.log(`[${new Date().toISOString()}] ${m}`);

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: REPO_ROOT, stdio: 'pipe', encoding: 'utf-8', ...opts });
  if (r.status !== 0) {
    const err = r.stderr || r.stdout || '(no output)';
    throw new Error(`${cmd} ${args.join(' ')} → exit ${r.status}: ${err.slice(0, 500)}`);
  }
  return r.stdout || '';
}

function shInherit(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: REPO_ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} → exit ${r.status}`);
}

let notionOk = false;
let htmlOk = false;
let pushOk = false;

// ─── Step 1: pull main (avoid auto-commit conflicts) ───────────────────
if (SKIP_PULL) {
  log('Step 1: skipping pull (--skip-pull)');
} else {
  try {
    log('Step 1: git pull --ff-only origin main');
    const out = sh('git', ['pull', '--ff-only', 'origin', 'main']);
    if (out.trim()) log(`  ${out.trim().split('\n').slice(-2).join(' · ')}`);
  } catch (e) {
    log(`  WARN: pull failed (${e.message.slice(0, 100)}) — continuing anyway`);
  }
}

// ─── Step 2: Notion sync ────────────────────────────────────────────────
try {
  log('Step 2: sync-act-now-to-notion.mjs');
  shInherit('node', ['scripts/sync-act-now-to-notion.mjs']);
  notionOk = true;
} catch (e) {
  log(`  ERROR: Notion sync failed: ${e.message.slice(0, 200)}`);
}

// ─── Step 3: HTML render ────────────────────────────────────────────────
try {
  log('Step 3: render-act-now-html.mjs');
  shInherit('node', ['scripts/render-act-now-html.mjs']);
  htmlOk = true;
} catch (e) {
  log(`  ERROR: HTML render failed: ${e.message.slice(0, 200)}`);
}

// ─── Step 4: commit + push if HTML changed ─────────────────────────────
if (htmlOk) {
  try {
    const status = sh('git', ['status', '--porcelain', 'apps/command-center/public/act-now.html', 'thoughts/shared/cockpit/act-now.html']).trim();
    if (!status) {
      log('Step 4: no HTML changes — skipping commit');
      pushOk = true; // technically nothing to push, but not a failure
    } else if (DRY_GIT) {
      log(`Step 4: --dry-git — would commit:\n${status}`);
      pushOk = true;
    } else {
      log('Step 4: committing HTML refresh');
      sh('git', ['add', 'apps/command-center/public/act-now.html', 'thoughts/shared/cockpit/act-now.html']);
      const ts = new Date().toISOString().replace('T', ' ').slice(0, 16);
      sh('git', ['commit', '-m', `auto: refresh act-now.html (${ts} UTC)`]);
      log('  pushing to origin/main...');
      sh('git', ['push', 'origin', 'main']);
      pushOk = true;
      log('  pushed — Vercel will redeploy ~60s');
    }
  } catch (e) {
    log(`  ERROR: git commit/push failed: ${e.message.slice(0, 300)}`);
  }
}

// ─── Summary ────────────────────────────────────────────────────────────
const stamp = (ok) => ok ? '✓' : '✗';
log(`Summary: notion=${stamp(notionOk)} html=${stamp(htmlOk)} push=${stamp(pushOk)}`);
process.exit(notionOk && htmlOk ? 0 : 1);
