/**
 * Transaction fixes — unmapped transactions, duplicate subscriptions, critical variances.
 *
 * Extracted from Notion Workers Tool 19 (suggest_transaction_fixes).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface TransactionFixesOptions {
  limit?: number
}

export interface UnmappedTransaction {
  date: string | null
  contact_name: string | null
  total: number
  suggested_project: string | null
  suggested_category: string | null
}

export interface DuplicateSubscription {
  contact_name: string
  count: number
  total: number
}

export interface CriticalVariance {
  project_code: string | null
  month: string | null
  variance_type: string | null
  explanation: string | null
}

export interface TransactionFixesResult {
  unmapped: {
    total: number
    withSuggestion: Array<{
      date: string | null
      contact_name: string | null
      total: number
      suggested_project: string | null
      suggested_category: string | null
    }>
    withoutSuggestion: Array<{
      date: string | null
      contact_name: string | null
      total: number
    }>
  }
  duplicates: DuplicateSubscription[]
  criticalVariances: CriticalVariance[]
}

export async function fetchTransactionFixes(
  supabase: SupabaseQueryClient,
  opts: TransactionFixesOptions = {}
): Promise<TransactionFixesResult> {
  const maxItems = opts.limit ?? 20

  // 1. Unmapped transactions with suggestions
  const { data: unmapped } = await supabase
    .from('v_unmapped_transactions')
    .select('*')
    .limit(maxItems)

  const unmappedRows = (unmapped || []) as any[]
  const withSuggestion = unmappedRows
    .filter((u) => u.suggested_project)
    .map((u) => ({
      date: u.date || null,
      contact_name: u.contact_name || null,
      total: Math.abs(Number(u.total || 0)),
      suggested_project: u.suggested_project,
      suggested_category: u.suggested_category || null,
    }))

  const withoutSuggestion = unmappedRows
    .filter((u) => !u.suggested_project)
    .map((u) => ({
      date: u.date || null,
      contact_name: u.contact_name || null,
      total: Math.abs(Number(u.total || 0)),
    }))

  // 2. Potential duplicate subscriptions (RPC)
  let duplicates: DuplicateSubscription[] = []
  try {
    const { data } = await (supabase as any).rpc('get_potential_duplicate_subscriptions')
    if (data && Array.isArray(data)) {
      duplicates = (data as any[]).map((d) => ({
        contact_name: d.contact_name || 'Unknown',
        count: Number(d.count || 0),
        total: Number(d.total || 0),
      }))
    }
  } catch {
    // RPC may not exist in all environments
  }

  // 3. Critical variances
  const { data: variances } = await supabase
    .from('financial_variance_notes')
    .select('*')
    .eq('severity', 'critical')
    .order('created_at', { ascending: false })
    .limit(5)

  const criticalVariances: CriticalVariance[] = ((variances || []) as any[]).map((v) => ({
    project_code: v.project_code || null,
    month: v.month || null,
    variance_type: v.variance_type || null,
    explanation: v.explanation || null,
  }))

  return {
    unmapped: {
      total: unmappedRows.length,
      withSuggestion,
      withoutSuggestion,
    },
    duplicates,
    criticalVariances,
  }
}
