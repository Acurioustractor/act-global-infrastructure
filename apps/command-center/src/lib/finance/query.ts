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
