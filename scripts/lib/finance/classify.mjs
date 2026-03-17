/**
 * ACT Finance Engine — Classify Module
 *
 * Receipt matching, project tagging, and anomaly detection.
 * Wraps match-receipts-to-xero.mjs and tag-xero-transactions.mjs.
 *
 * Usage:
 *   import { matchReceipts, tagTransactions } from './lib/finance/classify.mjs';
 *   const result = await matchReceipts({ apply: true, ai: true });
 */

import { runScript } from './common.mjs';

const MODULE = 'classify';

/**
 * Match captured receipt emails to Xero bank transactions.
 *
 * Uses vendor name fuzzy matching, amount proximity, date windows,
 * and optional AI scoring to find the best transaction match.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.apply=false] - Apply matches (write to DB)
 * @param {boolean} [opts.ai=false] - Use AI-assisted scoring
 * @param {number} [opts.limit] - Max receipts to process
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function matchReceipts(opts = {}) {
  const { apply = false, ai = false, limit } = opts;

  const args = [];
  if (apply) args.push('--apply');
  if (ai) args.push('--ai');
  if (limit) args.push('--limit', String(limit));

  return runScript(MODULE, 'match-receipts-to-xero.mjs', args);
}

/**
 * Tag Xero bank transactions with project tracking categories.
 *
 * Uses vendor_project_rules to automatically assign project codes
 * to untagged transactions via Xero API tracking categories.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.apply=false] - Apply tags (write to Xero)
 * @param {boolean} [opts.dryRun=false] - Log only
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function tagTransactions(opts = {}) {
  const { apply = false, dryRun = false } = opts;

  const args = [];
  if (apply) args.push('--apply');
  if (dryRun) args.push('--dry-run');

  return runScript(MODULE, 'tag-xero-transactions.mjs', args);
}
