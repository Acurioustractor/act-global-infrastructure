#!/usr/bin/env node
/**
 * build-field-surfaces.mjs — regenerate The Field's three surfaces in one pass.
 * Cron: daily 6:50am AEST (before the 7am daily briefing) so the morning read
 * is waiting with coffee. All three are read-only over the worklist CSVs —
 * this re-renders dates/cooling/rotation; it does NOT re-pull GHL/EL/Beeper.
 * (After any bulk GHL tag change, re-run the GHL sync first — see
 * wiki/concepts/ghl-tag-namespaces.md "sync-before-regen".)
 */
import { execSync } from 'node:child_process';
const CWD = '/Users/benknight/Code/act-global-infrastructure';
let failed = 0;
for (const s of ['build-morning-read.mjs', 'build-scope-board.mjs', 'build-orbit-viz.mjs']) {
  try { execSync(`node scripts/${s}`, { stdio: 'inherit', cwd: CWD }); }
  catch (e) { console.error(`✗ ${s}: ${e.message}`); failed++; }
}
if (failed) { console.error(`${failed} surface build(s) failed`); process.exit(1); }
