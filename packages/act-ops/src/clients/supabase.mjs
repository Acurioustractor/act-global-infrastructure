/**
 * Auto-paginating Supabase query helper.
 *
 * Supabase returns at most 1,000 rows per request by default.
 * This utility fetches all matching rows by paginating with .range().
 *
 * Usage:
 *   import { fetchAll } from '@act/ops/clients/supabase';
 *
 *   // Fetch all rows from a table
 *   const rows = await fetchAll(supabase, 'gs_entities');
 *
 *   // With filters
 *   const rows = await fetchAll(supabase, 'gs_entities', {
 *     select: 'id, name, abn',
 *     filter: (q) => q.eq('entity_type', 'foundation').not('abn', 'is', null),
 *     pageSize: 500,
 *   });
 */

const DEFAULT_PAGE_SIZE = 1000;

/**
 * Fetch all rows from a Supabase table, auto-paginating past the 1,000 row limit.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} table - Table name
 * @param {Object} [opts]
 * @param {string} [opts.select='*'] - Column selection
 * @param {function} [opts.filter] - Function that receives the query builder and returns it with filters applied
 * @param {string} [opts.orderBy='id'] - Column to order by (must be deterministic for pagination)
 * @param {boolean} [opts.ascending=true] - Sort direction
 * @param {number} [opts.pageSize=1000] - Rows per page
 * @param {number} [opts.maxRows] - Optional cap on total rows fetched
 * @returns {Promise<Array>} All matching rows
 */
export async function fetchAll(supabase, table, {
  select = '*',
  filter,
  orderBy = 'id',
  ascending = true,
  pageSize = DEFAULT_PAGE_SIZE,
  maxRows,
} = {}) {
  const allRows = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending })
      .range(offset, offset + pageSize - 1);

    if (filter) {
      query = filter(query);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`[ops/clients/supabase] fetchAll ${table} failed at offset ${offset}: ${error.message}`);
    }

    if (!data || data.length === 0) break;

    allRows.push(...data);

    if (maxRows && allRows.length >= maxRows) {
      return allRows.slice(0, maxRows);
    }

    if (data.length < pageSize) break; // Last page

    offset += pageSize;
  }

  return allRows;
}

/**
 * Count all rows matching a filter.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} table
 * @param {Object} [opts]
 * @param {function} [opts.filter] - Function that receives the query builder
 * @returns {Promise<number>}
 */
export async function countAll(supabase, table, { filter } = {}) {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (filter) {
    query = filter(query);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`[ops/clients/supabase] countAll ${table} failed: ${error.message}`);
  }

  return count || 0;
}
