import { supabase } from '@/lib/supabase'

/**
 * Run a raw SQL query via Supabase exec_sql RPC.
 * Returns typed data or throws with a descriptive error.
 */
export async function execSql<T = Record<string, unknown>>(
  label: string,
  query: string
): Promise<T[]> {
  const result = await supabase.rpc('exec_sql', { query })

  if (result.error) {
    console.error(`[finance] ${label} query failed:`, result.error.message)
    throw new Error(`Query failed: ${label} — ${result.error.message}`)
  }

  return (result.data || []) as T[]
}

/**
 * Fetch ALL rows for a query, paging past PostgREST's ~1000-row max-rows cap.
 *
 * The Supabase JS client returns at most ~1000 rows per request — EVEN with `.range(0, 9999)` or
 * `.limit(5000)` — because PostgREST enforces a server `max-rows` cap that range/limit don't override.
 * Any unpaginated `.select()` that then sums/counts >1000 rows silently truncates (wrong totals, no
 * error). Use this for every org-wide / multi-thousand-row aggregation.
 *
 * `make(from, to)` must return a query ALREADY ranged to [from, to], e.g.:
 *   fetchAllRows((from, to) => supabase.from('xero_transactions').select('total,type').gte('date', x).range(from, to))
 *
 * For pure totals/counts prefer `count: 'exact', head: true` (no rows transferred) or SQL via execSql.
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const PAGE = 1000
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await make(from, from + PAGE - 1)
    if (error) {
      const msg = (error as { message?: string })?.message ?? String(error)
      throw new Error(`fetchAllRows failed: ${msg}`)
    }
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < PAGE) return rows
  }
}
