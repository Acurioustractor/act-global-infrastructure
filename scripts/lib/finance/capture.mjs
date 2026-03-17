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

import { runScript } from './common.mjs';

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

  return runScript(MODULE, 'capture-receipts.mjs', args);
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

  return runScript(MODULE, 'suggest-receipts-from-calendar.mjs', args);
}
