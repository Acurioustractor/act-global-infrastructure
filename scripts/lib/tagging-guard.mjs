/**
 * tagging-guard.mjs — shared helpers for finance tagging scripts.
 *
 * Consolidates two patterns that were duplicated across:
 *   - sync-xero-to-supabase.mjs (line ~794)
 *   - tag-xero-transactions.mjs (line ~233)
 *   - tag-transactions-by-vendor.mjs (line ~223 + ~364)
 *
 * 1. isManualSource(source) — check if a project_code_source value indicates
 *    the row was manually tagged/untagged by a human (any source starting with
 *    'manual'). These rows must never be overwritten by auto-taggers.
 *
 * 2. excludeManualSourceFilter(query) — apply the standard Supabase filter
 *    `.not('project_code_source', 'like', 'manual%')` to a query builder.
 *
 * 3. preserveManualTagOnUpsert({ existing, incoming }) — given an existing
 *    Supabase row and the new sync record from Xero, return a record with
 *    project_code/source preserved if existing was manually tagged.
 *
 * 4. ACCT_ALLOWLIST — the two-account rule (NAB Visa + ACT Everyday only).
 *    Exclude NM Personal + ACT Maximiser from ACT spend totals.
 *
 * Created 2026-05-21 (S3 in finance-system-review-2026-05-21.md).
 */

export const ACT_BANK_ACCOUNTS = [
  'NAB Visa ACT #8815',
  'NJ Marchesi T/as ACT Everyday',
];

export const EXCLUDED_BANK_ACCOUNTS = [
  'NM Personal',      // Nic's personal account — pre-cutover
  'NM Personal ',     // Trailing-space variant (real value in DB)
  'NJ Marchesi T/as ACT Maximiser',  // Savings, quiet
];

/**
 * Return true if a project_code_source value indicates the row was touched
 * by a human (manual / manual-untagged-* / manual-duplicate-* / etc).
 *
 * @param {string|null|undefined} source
 * @returns {boolean}
 */
export function isManualSource(source) {
  if (!source) return false;
  return String(source).startsWith('manual');
}

/**
 * Apply the standard manual-source-skip filter to a Supabase query builder.
 * Use on any SELECT where an auto-tagger picks up untagged rows so it doesn't
 * re-tag rows the user has deliberately untagged.
 *
 * @template T
 * @param {T} query - a Supabase query builder
 * @returns {T}
 */
export function excludeManualSourceFilter(query) {
  return query.not('project_code_source', 'like', 'manual%');
}

/**
 * Compute the project_code + project_code_source for an upsert, preserving
 * an existing manual tag if present. Use in sync-from-xero paths where
 * Xero's tracking-category source should NOT clobber a human untag.
 *
 * @param {object} args
 * @param {{ project_code?: string|null, project_code_source?: string|null } | null} args.existing
 * @param {{ project_code?: string|null, project_code_source?: string|null }} args.incoming
 * @returns {{ project_code: string|null, project_code_source: string|null, preserved: boolean }}
 */
export function preserveManualTagOnUpsert({ existing, incoming }) {
  if (existing && isManualSource(existing.project_code_source)) {
    return {
      project_code: existing.project_code ?? null,
      project_code_source: existing.project_code_source ?? null,
      preserved: true,
    };
  }
  return {
    project_code: incoming.project_code ?? null,
    project_code_source: incoming.project_code_source ?? null,
    preserved: false,
  };
}

/**
 * Given a Supabase client + a list of xero transaction IDs, batch-fetch the
 * existing project_code_source per ID so the caller can apply
 * preserveManualTagOnUpsert at upsert time.
 *
 * Returns a Map<xero_transaction_id, { project_code, project_code_source }>.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string[]} xeroTransactionIds
 */
export async function fetchExistingTagsByXeroId(sb, xeroTransactionIds) {
  const map = new Map();
  if (!xeroTransactionIds.length) return map;
  const { data, error } = await sb
    .from('xero_transactions')
    .select('xero_transaction_id, project_code, project_code_source')
    .in('xero_transaction_id', xeroTransactionIds);
  if (error) return map;
  for (const row of data || []) {
    map.set(row.xero_transaction_id, {
      project_code: row.project_code,
      project_code_source: row.project_code_source,
    });
  }
  return map;
}
