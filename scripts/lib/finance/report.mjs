/**
 * ACT Finance Engine — Report Module
 *
 * Financial reporting, advisor analysis, and accountant pack generation.
 * Wraps financial-advisor-agent.mjs and finance-daily-briefing.mjs.
 *
 * Usage:
 *   import { runAdvisor, dailyBriefing } from './lib/finance/report.mjs';
 *   const result = await runAdvisor();
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log, warn } from './common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = join(__dirname, '..', '..');

const MODULE = 'report';

/**
 * Run the financial advisor agent.
 *
 * Collects financial data from Xero/Supabase, analyzes cash flow,
 * burn rate, subscription anomalies, and missing receipts, then
 * produces a structured analysis report.
 *
 * @param {Object} [opts]
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function runAdvisor(opts = {}) {
  return runScript('financial-advisor-agent.mjs', []);
}

/**
 * Generate the daily finance briefing.
 *
 * Produces a summary of yesterday's financial activity:
 * transactions, receipts, cash position, outstanding invoices.
 *
 * @param {Object} [opts]
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function dailyBriefing(opts = {}) {
  return runScript('finance-daily-briefing.mjs', []);
}

/**
 * Generate reconciliation checklist report.
 *
 * @param {Object} [opts]
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function reconciliationReport(opts = {}) {
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
