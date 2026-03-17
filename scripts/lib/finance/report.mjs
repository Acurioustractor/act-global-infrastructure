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

import { runScript } from './common.mjs';

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
  return runScript(MODULE, 'financial-advisor-agent.mjs', []);
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
  return runScript(MODULE, 'finance-daily-briefing.mjs', []);
}
