/**
 * Project summary — pre-generated daily summaries from project_summaries table.
 *
 * Extracted from agent-tools executeGetProjectSummary.
 */

import type { SupabaseQueryClient } from '../types.js'

export interface ProjectSummaryOptions {
  project_code: string
}

export interface ProjectSummaryResult {
  project_code: string
  summary: string
  data_sources: string[] | null
  stats: Record<string, unknown> | null
  generated_at: string
}

export async function fetchProjectSummary(
  supabase: SupabaseQueryClient,
  opts: ProjectSummaryOptions
): Promise<ProjectSummaryResult | null> {
  const projectCode = opts.project_code.toUpperCase()

  const { data: summary, error } = await supabase
    .from('project_summaries')
    .select('*')
    .eq('project_code', projectCode)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Project summary query failed: ${error.message}`)
  if (!summary) return null

  const s = summary as Record<string, unknown>
  return {
    project_code: s.project_code as string,
    summary: s.summary_text as string,
    data_sources: s.data_sources_used as string[] | null,
    stats: s.stats as Record<string, unknown> | null,
    generated_at: s.generated_at as string,
  }
}
