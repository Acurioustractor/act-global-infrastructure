/**
 * ACT Finance Engine — Compliance Module
 *
 * R&D Tax Incentive evidence generation and BAS preparation.
 * Wraps generate-rd-activity-log.mjs and xero-bas-analysis.mjs.
 *
 * Key outputs:
 * - R&D evidence pack for AusIndustry submission
 * - BAS prep worksheets for quarterly lodgement
 * - Entity transition planning
 *
 * Usage:
 *   import { generateRdEvidencePack, prepareBas } from './lib/finance/comply.mjs';
 *   const result = await generateRdEvidencePack({ fy: 'FY26' });
 */

import { log, runScript, getAustralianFY, getCurrentBASQuarter } from './common.mjs';

const MODULE = 'comply';

/**
 * Generate R&D Tax Incentive evidence pack.
 *
 * Produces:
 * - Git commit analysis by project (core vs supporting R&D)
 * - Calendar-based time allocation estimates
 * - Financial breakdown of R&D-eligible spend
 * - Monthly summary suitable for AusIndustry registration
 *
 * @param {Object} [opts]
 * @param {string} [opts.fy] - Financial year (e.g. 'FY26'), defaults to current
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function generateRdEvidencePack(opts = {}) {
  const fy = opts.fy || getAustralianFY();
  log(MODULE, `Generating R&D evidence pack for ${fy}`);
  return runScript(MODULE, 'generate-rd-activity-log.mjs', ['--markdown']);
}

/**
 * Prepare BAS (Business Activity Statement) data.
 *
 * Pulls GST data from Xero, checks receipt coverage,
 * verifies project tagging completeness, and outputs
 * a BAS prep worksheet.
 *
 * @param {Object} [opts]
 * @param {string} [opts.quarter] - BAS quarter (e.g. 'Q3'), defaults to current
 * @returns {Promise<{ ok: boolean, output: string, elapsed: number }>}
 */
export async function prepareBas(opts = {}) {
  const quarter = opts.quarter || getCurrentBASQuarter().quarter;
  log(MODULE, `Preparing BAS for ${quarter}`);
  return runScript(MODULE, 'xero-bas-analysis.mjs', []);
}

/**
 * Check entity transition readiness.
 *
 * Verifies all financial tables have entity_code columns populated,
 * checks for mixed-entity data, and reports transition status.
 *
 * @param {Object} [opts]
 * @param {import('@supabase/supabase-js').SupabaseClient} [opts.supabase]
 * @returns {Promise<{ ok: boolean, entities: Object[], gaps: string[] }>}
 */
export async function checkEntityReadiness(opts = {}) {
  const { createSupabase } = await import('./common.mjs');
  const supabase = opts.supabase || createSupabase();

  const gaps = [];

  // Check act_entities table
  const { data: entities, error } = await supabase
    .from('act_entities')
    .select('code, name, entity_type, active_from, active_to');

  if (error) {
    return { ok: false, entities: [], gaps: [`Cannot query act_entities: ${error.message}`] };
  }

  // Check entity_code coverage on key tables
  const tables = ['xero_transactions', 'xero_invoices', 'receipt_emails'];
  for (const table of tables) {
    const { data: nullCount } = await supabase.rpc('exec_sql', {
      query: `SELECT count(*)::int as cnt FROM ${table} WHERE entity_code IS NULL`
    });
    const cnt = nullCount?.[0]?.cnt || 0;
    if (cnt > 0) {
      gaps.push(`${table}: ${cnt} rows with NULL entity_code`);
    }
  }

  log(MODULE, `Entity readiness: ${entities?.length || 0} entities, ${gaps.length} gaps`);

  return {
    ok: gaps.length === 0,
    entities: entities || [],
    gaps,
  };
}
