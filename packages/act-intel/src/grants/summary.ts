/**
 * Grants summary — pipeline dashboard with counts, deadlines, and value.
 *
 * Extracted from Notion Workers Tool 29 (get_grants_summary).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface GrantsSummaryOptions {
  project_code?: string
}

export interface ClosingSoonGrant {
  name: string
  days_left: number
  amount_max: number | null
  aligned_projects: string[]
  application_status: string
}

export interface RecentlyUpdatedGrant {
  name: string
  application_status: string
  updated_at: string
}

export interface GrantsSummaryResult {
  total: number
  pipelineValue: number
  statusCounts: Record<string, number>
  closingSoon: ClosingSoonGrant[]
  recentlyUpdated: RecentlyUpdatedGrant[]
  byProject: Record<string, number>
}

export async function fetchGrantsSummary(
  supabase: SupabaseQueryClient,
  opts: GrantsSummaryOptions = {}
): Promise<GrantsSummaryResult> {
  let query = supabase
    .from('grant_opportunities')
    .select('id, name, provider, closes_at, amount_max, application_status, aligned_projects, updated_at')

  if (opts.project_code) {
    query = query.contains('aligned_projects', [opts.project_code])
  }

  const { data: grants, error } = await query
  if (error) throw new Error(`Failed to fetch grants summary: ${error.message}`)
  if (!grants?.length) {
    return { total: 0, pipelineValue: 0, statusCounts: {}, closingSoon: [], recentlyUpdated: [], byProject: {} }
  }

  const rows = grants as any[]

  // Count by status
  const statusCounts: Record<string, number> = {}
  let totalPipelineValue = 0

  for (const g of rows) {
    const status = g.application_status || 'not_applied'
    statusCounts[status] = (statusCounts[status] || 0) + 1
    if (g.amount_max && !['not_relevant', 'next_round', 'unsuccessful'].includes(status)) {
      totalPipelineValue += Number(g.amount_max) || 0
    }
  }

  // Urgent deadlines (next 14 days)
  const now = new Date()
  const twoWeeks = new Date(now.getTime() + 14 * 86400000)
  const closingSoon: ClosingSoonGrant[] = rows
    .filter((g) => g.closes_at && new Date(g.closes_at) >= now && new Date(g.closes_at) <= twoWeeks)
    .sort((a, b) => new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime())
    .slice(0, 10)
    .map((g) => ({
      name: g.name,
      days_left: Math.ceil((new Date(g.closes_at).getTime() - now.getTime()) / 86400000),
      amount_max: g.amount_max ? Number(g.amount_max) : null,
      aligned_projects: g.aligned_projects || [],
      application_status: g.application_status || 'not_applied',
    }))

  // Recently updated (last 7 days)
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const recentlyUpdated: RecentlyUpdatedGrant[] = rows
    .filter((g) => g.updated_at && new Date(g.updated_at) >= weekAgo)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)
    .map((g) => ({
      name: g.name,
      application_status: g.application_status || 'not_applied',
      updated_at: new Date(g.updated_at).toISOString().split('T')[0],
    }))

  // Group by project
  const byProject: Record<string, number> = {}
  for (const g of rows) {
    for (const p of (g.aligned_projects || [])) {
      byProject[p] = (byProject[p] || 0) + 1
    }
  }

  return {
    total: rows.length,
    pipelineValue: totalPipelineValue,
    statusCounts,
    closingSoon,
    recentlyUpdated,
    byProject,
  }
}
