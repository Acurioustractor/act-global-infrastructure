/**
 * ACT Finance Engine — Capture Module
 *
 * Receipt capture from Gmail and calendar-based suggestions.
 * Wraps capture-receipts.mjs and suggest-receipts-from-calendar.mjs
 * as importable async functions.
 *
 * Usage:
 *   import { captureFromGmail, suggestFromCalendar } from './lib/finance/capture.mjs';
 *   const result = await captureFromGmail({ days: 3, dryRun: false });
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log, warn } from './common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = join(__dirname, '..', '..');

const MODULE = 'capture';

/**
 * Capture receipt emails from Gmail → Supabase storage.
 *
 * Scans configured mailboxes for billing/receipt emails,
 * downloads PDF/image attachments, stores in Supabase Storage,
 * and creates receipt_emails records.
 *
 * @param {Object} [opts]
 * @param {number} [opts.days=3] - Days back to scan
 * @param {boolean} [opts.dryRun=false] - Log only, don't save
 * @param {boolean} [opts.verbose=false] - Verbose logging
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function captureFromGmail(opts = {}) {
  const { days = 3, dryRun = false, verbose = false } = opts;

  const args = [`--days`, String(days)];
  if (dryRun) args.push('--dry-run');
  if (verbose) args.push('--verbose');

  return runScript('capture-receipts.mjs', args);
}

/**
 * Suggest missing receipts based on calendar events.
 *
 * Cross-references travel/meeting calendar events with Xero
 * transactions to find likely missing receipts.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.dryRun=false]
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function suggestFromCalendar(opts = {}) {
  const args = [];
  if (opts.dryRun) args.push('--dry-run');

  return runScript('suggest-receipts-from-calendar.mjs', args);
}

// Internal: run a script and capture results
async function runScript(name, args = []) {
  const scriptPath = join(scriptsDir, name);
  const cmd = `node "${scriptPath}" ${args.join(' ')}`.trim();
  const startTime = Date.now();

  log(MODULE, `Running ${name} ${args.join(' ')}`);

  try {
    const output = execSync(cmd, {
      timeout: 300000,
      encoding: 'utf8',
      env: { ...process.env, PIPELINE_RUN_ID: process.env.PIPELINE_RUN_ID || '' },
    });
    const elapsed = (Date.now() - startTime) / 1000;
    log(MODULE, `${name} completed in ${elapsed.toFixed(1)}s`);
    return { ok: true, output, elapsed };
  } catch (err) {
    const elapsed = (Date.now() - startTime) / 1000;
    warn(MODULE, `${name} failed after ${elapsed.toFixed(1)}s: ${err.message?.slice(0, 200)}`);
    return {
      ok: false,
      output: (err.stdout || '') + (err.stderr || ''),
      elapsed,
      error: err.message,
    };
  }
}
