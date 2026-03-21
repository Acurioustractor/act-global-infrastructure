/**
 * Projects needing attention — from v_projects_needing_attention view.
 *
 * Extracted from Notion Workers Tool 7 (get_attention_items).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface ProjectAttentionOptions {
  project_code?: string
}

export interface ProjectAttentionEntry {
  project_code: string
  project_name: string
  overall_score: number
  health_status: string
  momentum_score: number
  alerts: Array<string | { message: string }>
  calculated_at: string | null
}

export interface ProjectAttentionResult {
  count: number
  projects: ProjectAttentionEntry[]
}

export async function fetchProjectsNeedingAttention(
  supabase: SupabaseQueryClient,
  opts: ProjectAttentionOptions = {}
): Promise<ProjectAttentionResult> {
  let query = supabase
    .from('v_projects_needing_attention')
    .select('project_code, project_name, overall_score, health_status, momentum_score, alerts, calculated_at, time_since_calculation')
    .order('overall_score', { ascending: true })

  if (opts.project_code) {
    query = query.eq('project_code', opts.project_code)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch projects needing attention: ${error.message}`)
  if (!data?.length) {
    return { count: 0, projects: [] }
  }

  const projects: ProjectAttentionEntry[] = (data as any[]).map((p) => ({
    project_code: p.project_code as string,
    project_name: p.project_name as string,
    overall_score: Number(p.overall_score || 0),
    health_status: (p.health_status as string) || 'unknown',
    momentum_score: Number(p.momentum_score || 0),
    alerts: Array.isArray(p.alerts) ? p.alerts : [],
    calculated_at: p.calculated_at || null,
  }))

  return { count: projects.length, projects }
}
