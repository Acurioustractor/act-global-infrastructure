/**
 * Project health — unified query logic for project status and activity.
 *
 * Merges agent-tools (financials, comms, health status) and
 * Notion Workers (knowledge breakdown, grants pipeline) into one function.
 */

import type { SupabaseQueryClient } from '../types.js'
import { loadProjectCodes } from '../util/projects.js'
import type { ProjectHealthResult, ProjectHealthEntry, HealthStatus } from '../types.js'

export interface ProjectHealthOptions {
  projectCode?: string
}

export async function fetchProjectHealth(
  supabase: SupabaseQueryClient,
  opts: ProjectHealthOptions = {}
): Promise<ProjectHealthResult> {
  const allProjects = await loadProjectCodes(supabase)

  const codes = opts.projectCode
    ? [opts.projectCode.toUpperCase()]
    : Object.keys(allProjects).filter(k => allProjects[k]?.status === 'active')

  // Fetch data across all dimensions in parallel
  const [knowledgeRes, financialsRes, commsRes, actionsRes, grantsRes] = await Promise.all([
    supabase
      .from('project_knowledge')
      .select('project_code, recorded_at, knowledge_type')
      .in('project_code', codes)
      .order('recorded_at', { ascending: false })
      .limit(500),

    supabase
      .from('v_project_financials')
      .select('*')
      .in('project_code', codes),

    supabase
      .from('communications_history')
      .select('project_codes, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(1000),

    supabase
      .from('project_knowledge')
      .select('project_code, title, recorded_at')
      .in('project_code', codes)
      .eq('knowledge_type', 'action')
      .eq('action_required', true)
      .limit(200),

    supabase
      .from('grant_applications')
      .select('project_code, status, amount_requested')
      .in('status', ['draft', 'in_progress', 'submitted', 'under_review'])
      .in('project_code', codes),
  ])

  const knowledge = knowledgeRes.data || []
  const financials = financialsRes.data || []
  const comms = commsRes.data || []
  const actions = actionsRes.data || []
  const grants = grantsRes.data || []

  // Build per-project health
  const results: ProjectHealthEntry[] = codes.map(code => {
    const proj = allProjects[code]
    const projKnowledge = knowledge.filter((k: Record<string, unknown>) => k.project_code === code)
    const projFinancials = financials.find((f: Record<string, unknown>) => f.project_code === code) as Record<string, unknown> | undefined
    const projComms = comms.filter((c: Record<string, unknown>) => {
      const pc = c.project_codes as string[] | null
      return pc?.includes(code)
    })
    const projActions = actions.filter((a: Record<string, unknown>) => a.project_code === code)
    const projGrants = grants.filter((g: Record<string, unknown>) => g.project_code === code)

    const lastActivity = projKnowledge.length > 0
      ? (projKnowledge[0] as Record<string, unknown>).recorded_at as string
      : null
    const daysSinceActivity = lastActivity
      ? Math.round((Date.now() - new Date(lastActivity).getTime()) / 86400000)
      : null

    // Knowledge breakdown
    const meetings = projKnowledge.filter((k: Record<string, unknown>) => k.knowledge_type === 'meeting').length
    const decisions = projKnowledge.filter((k: Record<string, unknown>) => k.knowledge_type === 'decision').length
    const actionItems = projKnowledge.filter((k: Record<string, unknown>) => k.knowledge_type === 'action_item').length

    // Grants pipeline
    let grantPipelineValue = 0
    for (const g of projGrants) {
      grantPipelineValue += ((g as Record<string, unknown>).amount_requested as number) || 0
    }

    const health: HealthStatus = daysSinceActivity === null ? 'unknown'
      : daysSinceActivity <= 7 ? 'active'
      : daysSinceActivity <= 30 ? 'steady'
      : daysSinceActivity <= 90 ? 'stale'
      : 'dormant'

    return {
      code,
      name: proj?.name || code,
      category: proj?.category || 'unknown',
      priority: proj?.priority || 'normal',
      last_activity: lastActivity,
      days_since_activity: daysSinceActivity,
      knowledge_entries: projKnowledge.length,
      comms_last_30_days: projComms.length,
      open_actions: projActions.length,
      knowledge_breakdown: { meetings, decisions, actions: actionItems },
      grants: { active_count: projGrants.length, pipeline_value: grantPipelineValue },
      financials: projFinancials ? {
        total_receivables: projFinancials.total_receivables as number,
        total_payables: projFinancials.total_payables as number,
        outstanding_receivables: projFinancials.outstanding_receivables as number,
        net_position: projFinancials.net_position as number,
      } : null,
      health,
    }
  })

  // Sort: active first, then by days since activity
  const order: Record<HealthStatus, number> = { active: 0, steady: 1, stale: 2, dormant: 3, unknown: 4 }
  results.sort((a, b) => {
    return (order[a.health] ?? 4) - (order[b.health] ?? 4) ||
      (a.days_since_activity ?? 999) - (b.days_since_activity ?? 999)
  })

  const summary: Record<HealthStatus, number> = { active: 0, steady: 0, stale: 0, dormant: 0, unknown: 0 }
  for (const r of results) {
    summary[r.health]++
  }

  return {
    total_projects: results.length,
    summary,
    projects: opts.projectCode ? results : results.slice(0, 20),
  }
}
