/**
 * ACT Finance Engine — Common Utilities
 *
 * Shared infrastructure for all finance modules:
 * - Supabase client factory (consistent config)
 * - Structured logging with timestamps
 * - Retry wrapper with exponential backoff
 * - Telegram notifications
 * - CLI argument parsing
 *
 * Usage:
 *   import { createSupabase, log, warn, error, retry, notify, parseArgs } from './lib/finance/common.mjs';
 *   const supabase = createSupabase();
 *   log('capture', 'Found 3 new receipts');
 *   await retry(() => xero.get('BankTransactions'), { retries: 3, label: 'xero-fetch' });
 *   await notify('3 receipts captured, 2 matched');
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sendTelegram } from '../telegram.mjs';

const __common_dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = join(__common_dirname, '..', '..');

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

let _supabase = null;

/**
 * Create or return cached Supabase client.
 * Uses the shared ACT project (tednluwflfhxyucgwigh).
 */
export function createSupabase() {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_SHARED_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || 'https://tednluwflfhxyucgwigh.supabase.co';
  const key = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY — cannot create client');
  }

  _supabase = createClient(url, key);
  return _supabase;
}

// ============================================================================
// STRUCTURED LOGGING
// ============================================================================

function timestamp() {
  return new Date().toISOString().slice(11, 19);
}

/**
 * Info log with module prefix.
 * @param {string} module - Module name (e.g. 'capture', 'classify', 'reconcile')
 * @param {string} msg - Log message
 */
export function log(module, msg) {
  console.log(`[${timestamp()}] [${module}] ${msg}`);
}

/**
 * Warning log.
 */
export function warn(module, msg) {
  console.warn(`[${timestamp()}] [${module}] WARN: ${msg}`);
}

/**
 * Error log.
 */
export function error(module, msg) {
  console.error(`[${timestamp()}] [${module}] ERROR: ${msg}`);
}

// ============================================================================
// RETRY WITH BACKOFF
// ============================================================================

/**
 * Retry an async function with exponential backoff.
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} [opts]
 * @param {number} [opts.retries=3] - Max retries
 * @param {number} [opts.baseDelay=1000] - Base delay in ms (doubles each retry)
 * @param {string} [opts.label='operation'] - Label for logging
 * @param {Function} [opts.shouldRetry] - Custom check: (error) => boolean
 * @returns {Promise<*>} Result of fn()
 */
export async function retry(fn, opts = {}) {
  const { retries = 3, baseDelay = 1000, label = 'operation', shouldRetry } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === retries;
      const willRetry = !isLast && (!shouldRetry || shouldRetry(err));

      if (willRetry) {
        const delay = baseDelay * Math.pow(2, attempt);
        warn('retry', `${label} failed (attempt ${attempt + 1}/${retries + 1}): ${err.message} — retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

// ============================================================================
// TELEGRAM NOTIFICATIONS
// ============================================================================

/**
 * Send a Telegram notification. Wraps the shared telegram.mjs utility.
 *
 * @param {string} message - Markdown-formatted message
 * @param {Object} [opts]
 * @param {boolean} [opts.silent=false] - If true, log instead of sending
 * @returns {Promise<boolean>}
 */
export async function notify(message, { silent = false } = {}) {
  if (silent) {
    log('notify', `[SILENT] ${message.slice(0, 100)}...`);
    return false;
  }
  return sendTelegram(message);
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

/**
 * Parse common CLI arguments used across finance scripts.
 *
 * @param {string[]} [argv=process.argv.slice(2)]
 * @returns {Object} Parsed arguments
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const limitIdx = argv.indexOf('--limit');
  return {
    dryRun: argv.includes('--dry-run'),
    apply: argv.includes('--apply'),
    verbose: argv.includes('--verbose'),
    notify: argv.includes('--notify'),
    status: argv.includes('--status'),
    selfTest: argv.includes('--self-test'),
    limit: limitIdx !== -1 ? parseInt(argv[limitIdx + 1], 10) : null,
    days: (() => {
      const idx = argv.indexOf('--days');
      return idx !== -1 ? parseInt(argv[idx + 1], 10) : null;
    })(),
    // Subcommand is first non-flag argument (skip values that follow --key)
    command: (() => {
      for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('-')) {
          // Skip the next arg if this is a --key value pair
          if (['--limit', '--days'].includes(argv[i])) i++;
          continue;
        }
        return argv[i];
      }
      return null;
    })(),
  };
}

// ============================================================================
// SCRIPT RUNNER (shared by all facade modules)
// ============================================================================

/**
 * Run a script in the scripts/ directory and capture results.
 * Used by facade modules (capture, classify, reconcile, report, comply)
 * to wrap existing standalone scripts as importable async functions.
 *
 * @param {string} module - Module name for logging (e.g. 'capture', 'classify')
 * @param {string} name - Script filename (e.g. 'capture-receipts.mjs')
 * @param {string[]} [args=[]] - CLI arguments to pass
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number, error?: string }>}
 */
export async function runScript(module, name, args = []) {
  const scriptPath = join(scriptsDir, name);
  const cmd = `node "${scriptPath}" ${args.join(' ')}`.trim();
  const startTime = Date.now();

  log(module, `Running ${name} ${args.join(' ')}`);

  try {
    const output = execSync(cmd, {
      timeout: 300000,
      encoding: 'utf8',
      env: { ...process.env, PIPELINE_RUN_ID: process.env.PIPELINE_RUN_ID || '' },
    });
    const elapsed = (Date.now() - startTime) / 1000;
    log(module, `${name} completed in ${elapsed.toFixed(1)}s`);
    return { ok: true, output, elapsed };
  } catch (err) {
    const elapsed = (Date.now() - startTime) / 1000;
    warn(module, `${name} failed after ${elapsed.toFixed(1)}s: ${err.message?.slice(0, 200)}`);
    return {
      ok: false,
      output: (err.stdout || '') + (err.stderr || ''),
      elapsed,
      error: err.message,
    };
  }
}

// ============================================================================
// AUSTRALIAN FINANCIAL YEAR HELPERS
// ============================================================================

/**
 * Get the Australian Financial Year for a given date.
 * FY runs July 1 – June 30.
 *
 * @param {Date} [date=new Date()]
 * @returns {string} e.g. 'FY26' for Jul 2025 – Jun 2026
 */
export function getAustralianFY(date = new Date()) {
  const month = date.getMonth(); // 0-based
  const year = date.getFullYear();
  // July (6) onwards = next FY
  const fyEndYear = month >= 6 ? year + 1 : year;
  return `FY${String(fyEndYear).slice(2)}`;
}

/**
 * Get FY start and end dates.
 *
 * @param {string} [fy] - e.g. 'FY26'. Defaults to current FY.
 * @returns {{ start: Date, end: Date }}
 */
export function getFYDates(fy) {
  if (!fy) fy = getAustralianFY();
  const endYear = 2000 + parseInt(fy.replace('FY', ''), 10);
  return {
    start: new Date(endYear - 1, 6, 1), // July 1
    end: new Date(endYear, 5, 30),       // June 30
  };
}

/**
 * Get the current BAS quarter info.
 *
 * @param {Date} [date=new Date()]
 * @returns {{ quarter: string, start: Date, end: Date, due: Date }}
 */
export function getCurrentBASQuarter(date = new Date()) {
  const month = date.getMonth(); // 0-based
  const year = date.getFullYear();

  // BAS quarters: Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
  let qStart, qEnd, due, quarter;
  if (month >= 0 && month <= 2) {
    // Jan-Mar = Q3
    quarter = 'Q3';
    qStart = new Date(year, 0, 1);
    qEnd = new Date(year, 2, 31);
    due = new Date(year, 3, 28); // April 28
  } else if (month >= 3 && month <= 5) {
    // Apr-Jun = Q4
    quarter = 'Q4';
    qStart = new Date(year, 3, 1);
    qEnd = new Date(year, 5, 30);
    due = new Date(year, 6, 28); // July 28
  } else if (month >= 6 && month <= 8) {
    // Jul-Sep = Q1
    quarter = 'Q1';
    qStart = new Date(year, 6, 1);
    qEnd = new Date(year, 8, 30);
    due = new Date(year, 9, 28); // October 28
  } else {
    // Oct-Dec = Q2
    quarter = 'Q2';
    qStart = new Date(year, 9, 1);
    qEnd = new Date(year, 11, 31);
    due = new Date(year + 1, 1, 28); // February 28
  }

  return { quarter, start: qStart, end: qEnd, due };
}
