/**
 * Impact summary — aggregated impact metrics across projects.
 *
 * Extracted from Notion Workers Tool 20 (get_impact_summary).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface ImpactSummaryOptions {
  project_code?: string
}

export interface ImpactMetricGroup {
  type: string
  total: number
  unit: string
  count: number
  projects: string[]
}

export interface ImpactSummaryResult {
  totalMetrics: number
  verifiedCount: number
  metrics: ImpactMetricGroup[]
}

export async function fetchImpactSummary(
  supabase: SupabaseQueryClient,
  opts: ImpactSummaryOptions = {}
): Promise<ImpactSummaryResult> {
  let query = supabase
    .from('impact_metrics')
    .select('*')
    .order('metric_type')

  if (opts.project_code) {
    query = query.eq('project_code', opts.project_code)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch impact summary: ${error.message}`)
  if (!data?.length) {
    return { totalMetrics: 0, verifiedCount: 0, metrics: [] }
  }

  const rows = data as any[]

  // Aggregate by metric_type
  const agg: Record<string, { total: number; unit: string; count: number; projects: Set<string> }> = {}
  for (const m of rows) {
    const t = m.metric_type
    if (!agg[t]) agg[t] = { total: 0, unit: m.unit || '', count: 0, projects: new Set() }
    agg[t].total += Number(m.value)
    agg[t].count++
    agg[t].projects.add(m.project_code)
  }

  const verified = rows.filter((m) => m.verified).length

  const metrics: ImpactMetricGroup[] = Object.entries(agg).map(([type, v]) => ({
    type,
    total: v.total,
    unit: v.unit,
    count: v.count,
    projects: [...v.projects],
  }))

  return {
    totalMetrics: rows.length,
    verifiedCount: verified,
    metrics,
  }
}
