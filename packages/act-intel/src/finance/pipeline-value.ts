/**
 * Pipeline value — weighted pipeline value by type and stage.
 *
 * Extracted from Notion Workers Tool 17 (get_pipeline_value).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface PipelineValueOptions {
  type?: string
}

export interface PipelineValueResult {
  totalWeighted: number
  totalUnweighted: number
  totalCount: number
  byType: Record<string, { weighted: number; total: number; count: number }>
  byStage: Record<string, { weighted: number; total: number; count: number }>
}

export async function fetchPipelineValue(
  supabase: SupabaseQueryClient,
  opts: PipelineValueOptions = {}
): Promise<PipelineValueResult> {
  let query = supabase.from('v_pipeline_value').select('*')
  if (opts.type) {
    query = query.eq('opportunity_type', opts.type)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch pipeline value: ${error.message}`)
  if (!data?.length) {
    return { totalWeighted: 0, totalUnweighted: 0, totalCount: 0, byType: {}, byStage: {} }
  }

  const rows = data as any[]

  const totalWeighted = rows.reduce((sum, r) => sum + Number(r.weighted_value || 0), 0)
  const totalUnweighted = rows.reduce((sum, r) => sum + Number(r.total_value || 0), 0)
  const totalCount = rows.reduce((sum, r) => sum + Number(r.opportunity_count || 0), 0)

  // Group by type
  const byType: Record<string, { weighted: number; total: number; count: number }> = {}
  for (const r of rows) {
    const t = r.opportunity_type
    if (!byType[t]) byType[t] = { weighted: 0, total: 0, count: 0 }
    byType[t].weighted += Number(r.weighted_value || 0)
    byType[t].total += Number(r.total_value || 0)
    byType[t].count += Number(r.opportunity_count || 0)
  }

  // Group by stage
  const byStage: Record<string, { weighted: number; total: number; count: number }> = {}
  for (const r of rows) {
    const s = r.stage
    if (!byStage[s]) byStage[s] = { weighted: 0, total: 0, count: 0 }
    byStage[s].weighted += Number(r.weighted_value || 0)
    byStage[s].total += Number(r.total_value || 0)
    byStage[s].count += Number(r.opportunity_count || 0)
  }

  return { totalWeighted, totalUnweighted, totalCount, byType, byStage }
}
