/**
 * Reconciliation status — tagged %, reconciled %, receipt coverage, stuck items.
 *
 * Extracted from Notion Workers Tool 34 (get_reconciliation_status).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface ReconciliationOptions {
  days_back?: number
}

export interface UntaggedVendor {
  name: string
  count: number
  total: number
}

export interface StuckItem {
  date: string | null
  contact_name: string | null
  total: number
}

export interface ReconciliationResult {
  period: string
  total: number
  tagged: number
  reconciled: number
  withReceipt: number
  topUntaggedVendors: UntaggedVendor[]
  stuckItems: StuckItem[]
}

export async function fetchReconciliationStatus(
  supabase: SupabaseQueryClient,
  opts: ReconciliationOptions = {}
): Promise<ReconciliationResult> {
  const lookback = opts.days_back ?? 90
  const now = new Date()
  const sinceDate = new Date(now)
  sinceDate.setDate(now.getDate() - lookback)
  const since = sinceDate.toISOString().split('T')[0]

  // Total counts (parallel)
  const [
    { count: totalCount },
    { count: taggedCount },
    { count: reconciledCount },
    { count: withReceiptCount },
  ] = await Promise.all([
    supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .gte('date', since),
    supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .gte('date', since)
      .not('project_code', 'is', null),
    supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .gte('date', since)
      .eq('is_reconciled', true),
    supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .gte('date', since)
      .not('dext_document_id', 'is', null),
  ])

  const total = totalCount || 0
  const tagged = taggedCount || 0
  const reconciled = reconciledCount || 0
  const withReceipt = withReceiptCount || 0

  // Top untagged vendors
  const { data: untaggedTxns } = await supabase
    .from('xero_transactions')
    .select('contact_name, total, type')
    .gte('date', since)
    .is('project_code', null)
    .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")')

  const vendorTotals = new Map<string, { count: number; total: number }>()
  for (const tx of ((untaggedTxns || []) as any[])) {
    const name = tx.contact_name || '(No contact)'
    const existing = vendorTotals.get(name) || { count: 0, total: 0 }
    existing.count++
    existing.total += Math.abs(Number(tx.total) || 0)
    vendorTotals.set(name, existing)
  }

  const topUntaggedVendors: UntaggedVendor[] = [...vendorTotals.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([name, info]) => ({ name, count: info.count, total: Math.round(info.total) }))

  // Stuck items (>14 days untagged)
  const stuckSince = new Date(now)
  stuckSince.setDate(now.getDate() - 14)
  const stuckSinceStr = stuckSince.toISOString().split('T')[0]

  const { data: stuck } = await supabase
    .from('xero_transactions')
    .select('contact_name, total, date')
    .is('project_code', null)
    .lt('date', stuckSinceStr)
    .gte('date', since)
    .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
    .order('total', { ascending: true })
    .limit(10)

  const stuckItems: StuckItem[] = ((stuck || []) as any[]).map((s) => ({
    date: s.date || null,
    contact_name: s.contact_name || null,
    total: Math.abs(Number(s.total || 0)),
  }))

  return {
    period: `last ${lookback} days (since ${since})`,
    total,
    tagged,
    reconciled,
    withReceipt,
    topUntaggedVendors,
    stuckItems,
  }
}
