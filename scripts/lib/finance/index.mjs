/**
 * ACT Finance Engine — Module Index
 *
 * Central import point for all finance modules.
 *
 * Usage:
 *   import { createXeroClient, createSupabase, log, retry, notify } from './lib/finance/index.mjs';
 */

export { createXeroClient } from './xero-client.mjs';
export {
  createSupabase,
  log, warn, error,
  retry,
  notify,
  parseArgs,
  getAustralianFY, getFYDates, getCurrentBASQuarter,
} from './common.mjs';
export {
  isLikelyReceipt, extractAmount, extractReceiptFromHtml,
} from './receipt-classifier.mjs';
export { captureFromGmail, suggestFromCalendar } from './capture.mjs';
export { matchReceipts, tagTransactions } from './classify.mjs';
export { uploadToXero, generateChecklist } from './reconcile.mjs';
export { runAdvisor, dailyBriefing } from './report.mjs';
export { generateRdEvidencePack, prepareBas, checkEntityReadiness } from './comply.mjs';
