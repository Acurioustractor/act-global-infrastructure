/**
 * ACT Finance Engine — Reconcile Module
 *
 * Upload receipts to Xero and generate reconciliation checklists.
 * Wraps upload-receipts-to-xero.mjs and generate-reconciliation-checklist.mjs.
 *
 * Usage:
 *   import { uploadToXero, generateChecklist } from './lib/finance/reconcile.mjs';
 *   const result = await uploadToXero();
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log, warn } from './common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = join(__dirname, '..', '..');

const MODULE = 'reconcile';

/**
 * Upload matched receipt attachments to Xero.
 *
 * For each receipt_email with a matched Xero transaction,
 * downloads the attachment from Supabase Storage and uploads
 * it to the Xero transaction as an attachment.
 *
 * @param {Object} [opts]
 * @param {number} [opts.limit] - Max receipts to upload
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function uploadToXero(opts = {}) {
  const args = [];
  if (opts.limit) args.push('--limit', String(opts.limit));

  return runScript('upload-receipts-to-xero.mjs', args);
}

/**
 * Generate reconciliation checklist for the accountant.
 *
 * Produces a Markdown report showing:
 * - Unreconciled transactions
 * - Missing receipts by project
 * - Receipt coverage percentage
 * - Items requiring manual attention
 *
 * @param {Object} [opts]
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function generateChecklist(opts = {}) {
  return runScript('generate-reconciliation-checklist.mjs', []);
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
