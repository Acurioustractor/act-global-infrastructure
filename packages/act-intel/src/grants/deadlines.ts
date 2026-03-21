/**
 * Grant deadlines — upcoming deadlines with milestone progress and urgency.
 *
 * Merges agent-tools (executeGetGrantOpportunities with deadlines) and
 * Notion Workers (check_grant_deadlines).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface GrantDeadlinesOptions {
  days_ahead?: number
  project_code?: string
}

export interface GrantDeadlineEntry {
  id: string
  application_name: string
  provider: string
  opportunity_name: string
  project_code: string | null
  deadline: string
  days_remaining: number
  amount_requested: number | null
  urgency: 'CRITICAL' | 'URGENT' | 'SOON' | 'UPCOMING' | 'PLANNED'
  progress: {
    total: number
    completed: number
    pct: number
  }
  overdue_milestones: string[]
}

export interface GrantDeadlinesResult {
  days_ahead: number
  count: number
  deadlines: GrantDeadlineEntry[]
}

export async function fetchGrantDeadlines(
  supabase: SupabaseQueryClient,
  opts: GrantDeadlinesOptions = {}
): Promise<GrantDeadlinesResult> {
  const daysAhead = opts.days_ahead ?? 30

  let query = supabase
    .from('grant_applications')
    .select(`
      id, application_name, status, amount_requested, milestones, project_code,
      grant_opportunities!grant_applications_opportunity_id_fkey (
        closes_at, name, provider
      )
    `)
    .in('status', ['draft', 'in_progress', 'submitted', 'under_review'])

  if (opts.project_code) {
    query = query.eq('project_code', opts.project_code)
  }

  const { data: apps, error } = await query
  if (error) throw new Error(`Grant deadlines query failed: ${error.message}`)

  const now = new Date()
  const deadlines: GrantDeadlineEntry[] = []

  for (const app of ((apps || []) as Array<Record<string, unknown>>)) {
    const opp = app.grant_opportunities as Record<string, unknown> | null
    if (!opp?.closes_at) continue

    const deadline = new Date(opp.closes_at as string)
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / 86400000)

    if (daysRemaining > daysAhead || daysRemaining < -7) continue

    const milestones = (app.milestones as Array<Record<string, unknown>>) || []
    const completed = milestones.filter((m) => m.completed).length
    const total = milestones.length
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0

    const overdue = milestones
      .filter((m) => !m.completed && m.due && new Date(m.due as string) < now)
      .map((m) => m.name as string)

    const urgency: GrantDeadlineEntry['urgency'] =
      daysRemaining <= 1 ? 'CRITICAL' :
      daysRemaining <= 3 ? 'URGENT' :
      daysRemaining <= 7 ? 'SOON' :
      daysRemaining <= 14 ? 'UPCOMING' : 'PLANNED'

    deadlines.push({
      id: app.id as string,
      application_name: app.application_name as string,
      provider: opp.provider as string,
      opportunity_name: opp.name as string,
      project_code: app.project_code as string | null,
      deadline: opp.closes_at as string,
      days_remaining: daysRemaining,
      amount_requested: app.amount_requested as number | null,
      urgency,
      progress: { total, completed, pct },
      overdue_milestones: overdue,
    })
  }

  // Sort by days remaining (most urgent first)
  deadlines.sort((a, b) => a.days_remaining - b.days_remaining)

  return { days_ahead: daysAhead, count: deadlines.length, deadlines }
}
