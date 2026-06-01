#!/usr/bin/env node
/**
 * sync-money-stack.mjs — Monday-morning Notion money sync orchestrator.
 *
 * Replaces 11 separate PM2 cron entries with one entry that runs all
 * sync-*-to-notion scripts in the correct dependency order. Benefits:
 *   - One log to read instead of 11
 *   - Failure of one step halts the chain (no cascading bad state)
 *   - Order changes happen in this file, not by tweaking cron strings
 *   - Easier to add "skip-if-no-xero-data-changed" optimization later
 *
 * The order matters:
 *   dashboard-hub-sync   does full-page replace, writes nav
 *   money-framework-sync does marker-based section-replace
 *   If money-framework ran first, the hub would wipe its panels.
 *   With this order both coexist on moneyFramework page.
 *
 * Usage:
 *   node scripts/sync-money-stack.mjs              # run all in order
 *   node scripts/sync-money-stack.mjs --dry-run    # show what would run
 *   node scripts/sync-money-stack.mjs --from <n>   # start at step n (0-indexed)
 *   node scripts/sync-money-stack.mjs --only <n>   # run only step n
 *   node scripts/sync-money-stack.mjs --halt-on-fail   # stop on first failure (default = continue)
 *
 * Created 2026-05-21 (S5 in finance-system-review-2026-05-21.md).
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

// Order matches the ecosystem.config.cjs sequence (8:15 → 9:10), but the
// material question is "does this script overwrite another's output?" The
// dashboard-hub does FULL-PAGE replace of moneyFramework; everything else
// either writes to a different page OR uses section-marker replace. Keep
// dashboard-hub first; keep money-framework last.
const STEPS = [
  { name: 'dashboard-hub',   script: 'sync-money-dashboard-hub.mjs',     desc: 'Main hub (full-page replace, writes nav)' },
  { name: 'opportunities',   script: 'sync-opportunities-to-notion-db.mjs', desc: 'Opportunities DB (GHL + Xero + foundations)' },
  { name: 'grant-tranches',  script: 'sync-grant-tranches-to-notion.mjs', desc: 'Grant Tranches DB (paid grant invoices, per-tranche acquittal)' },
  { name: 'pile-pages',      script: 'sync-pile-pages-to-notion.mjs',    desc: 'Per-pile strategic pages (Voice/Flow/Ground/Grants)' },
  { name: 'cash-forecast',   script: 'sync-cash-forecast-to-notion.mjs', desc: '13-week rolling cash forecast' },
  { name: 'kpis',            script: 'sync-kpis-to-notion.mjs',          desc: 'KPIs + concentration risk' },
  { name: 'budget-actual',   script: 'sync-budget-vs-actual-to-notion.mjs', desc: 'Budget vs actual per project' },
  { name: 'cash-scenarios',  script: 'sync-cash-scenarios-to-notion.mjs', desc: 'Cash scenarios 12-month' },
  { name: 'money-metrics',   script: 'sync-money-metrics-to-notion.mjs', desc: 'Weekly metrics snapshot (powers charts)' },
  { name: 'planning-rhythm', script: 'sync-planning-rhythm-to-notion.mjs', desc: 'Multi-period planning page' },
  { name: 'entity-hub',      script: 'sync-entity-hub-to-notion.mjs',    desc: 'Master entity hub (Xero/GHL/Foundations)' },
  { name: 'money-framework', script: 'sync-money-framework-to-notion.mjs', desc: 'Money Framework panels (LAST: section-replace)' },
];

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const HALT_ON_FAIL = args.includes('--halt-on-fail');
const fromIdx = args.indexOf('--from');
const onlyIdx = args.indexOf('--only');
const START_AT = fromIdx !== -1 ? Number(args[fromIdx + 1]) : 0;
const ONLY = onlyIdx !== -1 ? Number(args[onlyIdx + 1]) : null;

function ts() { return new Date().toISOString().slice(11, 19); }
function log(msg) { console.log(`[${ts()}] ${msg}`); }

async function runStep(step, idx) {
  const scriptPath = join(REPO_ROOT, 'scripts', step.script);
  log(`▶  [${idx}/${STEPS.length}] ${step.name.padEnd(18)} — ${step.desc}`);
  if (DRY_RUN) {
    log(`   (dry-run) would exec: node ${scriptPath}`);
    return { ok: true, durationMs: 0 };
  }
  const start = Date.now();
  try {
    execSync(`node ${scriptPath}`, {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    const durationMs = Date.now() - start;
    log(`✓  ${step.name} (${(durationMs / 1000).toFixed(1)}s)`);
    return { ok: true, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    log(`✗  ${step.name} FAILED after ${(durationMs / 1000).toFixed(1)}s: ${err.message}`);
    return { ok: false, durationMs, error: err.message };
  }
}

async function main() {
  log(`=========================================`);
  log(`  Money Stack Sync — ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}`);
  log(`=========================================`);
  if (DRY_RUN) log(`  DRY RUN — no scripts will execute`);
  if (HALT_ON_FAIL) log(`  Mode: halt on first failure`);
  log('');

  const results = [];
  for (let i = 0; i < STEPS.length; i++) {
    if (ONLY != null && i !== ONLY) continue;
    if (i < START_AT) continue;
    const result = await runStep(STEPS[i], i);
    results.push({ ...result, step: STEPS[i].name, index: i });
    if (!result.ok && HALT_ON_FAIL) {
      log(`\nHalted at step ${i} (${STEPS[i].name}) per --halt-on-fail`);
      break;
    }
  }

  log('');
  log(`=========================================`);
  log(`  Money Stack Sync Complete`);
  log(`=========================================`);
  const totalMs = results.reduce((s, r) => s + r.durationMs, 0);
  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  log(`  Ran: ${results.length} · OK: ${ok} · Failed: ${fail} · Duration: ${(totalMs / 1000).toFixed(1)}s`);
  if (fail > 0) {
    log(`  Failures:`);
    results.filter(r => !r.ok).forEach(r => log(`    - ${r.step}: ${r.error}`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
