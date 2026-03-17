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

import { runScript } from './common.mjs';

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

  return runScript(MODULE, 'upload-receipts-to-xero.mjs', args);
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
  return runScript(MODULE, 'generate-reconciliation-checklist.mjs', []);
}
