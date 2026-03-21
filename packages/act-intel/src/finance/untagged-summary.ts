/**
 * Untagged summary — untagged transactions grouped by vendor with suggested codes.
 *
 * Extracted from Notion Workers Tool 35 (get_untagged_summary).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface UntaggedSummaryOptions {
  limit?: number
}

export interface UntaggedVendorGroup {
  name: string
  count: number
  total: number
  dateRange: string
  suggestedCode: string | null
}

export interface UntaggedSummaryResult {
  totalTransactions: number
  totalVendors: number
  totalValue: number
  vendors: UntaggedVendorGroup[]
}

export async function fetchUntaggedSummary(
  supabase: SupabaseQueryClient,
  opts: UntaggedSummaryOptions = {}
): Promise<UntaggedSummaryResult> {
  const maxItems = opts.limit ?? 20

  // Fetch untagged, excluding transfers
  const { data: untagged } = await supabase
    .from('xero_transactions')
    .select('contact_name, total, type, date, bank_account')
    .is('project_code', null)
    .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
    .order('date', { ascending: false })

  if (!untagged || untagged.length === 0) {
    return { totalTransactions: 0, totalVendors: 0, totalValue: 0, vendors: [] }
  }

  // Group by vendor
  const vendorMap = new Map<string, { count: number; total: number; dates: string[] }>()
  for (const tx of (untagged as any[])) {
    const name = tx.contact_name || '(No contact)'
    const existing = vendorMap.get(name) || { count: 0, total: 0, dates: [] }
    existing.count++
    existing.total += Math.abs(Number(tx.total) || 0)
    if (tx.date) existing.dates.push(tx.date)
    vendorMap.set(name, existing)
  }

  // Load vendor rules for suggestions
  const { data: rules } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name, aliases, project_code')

  function suggestCode(contactName: string): string | null {
    if (!rules) return null
    const lower = contactName.toLowerCase()
    for (const rule of (rules as any[])) {
      if (lower.includes(rule.vendor_name.toLowerCase())) return rule.project_code
      for (const alias of (rule.aliases || [])) {
        if (lower.includes(alias.toLowerCase())) return rule.project_code
      }
    }
    return null
  }

  const sorted = [...vendorMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, maxItems)

  const totalUntaggedValue = [...vendorMap.values()].reduce((s, v) => s + v.total, 0)

  const vendors: UntaggedVendorGroup[] = sorted.map(([name, info]) => {
    const dateRange = info.dates.length > 0
      ? `${info.dates[info.dates.length - 1].substring(0, 10)}..${info.dates[0].substring(0, 10)}`
      : ''
    return {
      name,
      count: info.count,
      total: Math.round(info.total),
      dateRange,
      suggestedCode: suggestCode(name),
    }
  })

  return {
    totalTransactions: untagged.length,
    totalVendors: vendorMap.size,
    totalValue: Math.round(totalUntaggedValue),
    vendors,
  }
}
