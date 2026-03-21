/**
 * Daily briefing — unified query logic for morning digest.
 *
 * Returns typed data. Consumers (Telegram bot, Notion Workers) format for their interface.
 */

import type { SupabaseQueryClient } from '../types.js'
import { getBrisbaneDate, getBrisbaneNow, getBrisbaneDateOffset, daysAgoISO } from '../util/dates.js'
import type {
  DailyBriefingResult,
  OverdueAction,
  UpcomingFollowup,
  RecentMeeting,
  RecentDecision,
  StaleRelationship,
  RelationshipAlert,
} from '../types.js'

export interface DailyBriefingOptions {
  lookbackDays?: number
  projectCode?: string
}

export async function fetchDailyBriefing(
  supabase: SupabaseQueryClient,
  opts: DailyBriefingOptions = {}
): Promise<DailyBriefingResult> {
  const days = opts.lookbackDays ?? 7
  const now = getBrisbaneNow()
  const today = getBrisbaneDate()
  const futureDate = getBrisbaneDateOffset(days)
  const lookback = daysAgoISO(days)
  const pc = opts.projectCode

  // 1. Overdue actions
  let overdueQ = supabase
    .from('project_knowledge')
    .select('project_code, title, follow_up_date, importance')
    .eq('action_required', true)
    .lt('follow_up_date', today)
    .order('follow_up_date', { ascending: true })
    .limit(20)
  if (pc) overdueQ = overdueQ.eq('project_code', pc)

  // 2. Upcoming follow-ups
  let upcomingQ = supabase
    .from('project_knowledge')
    .select('project_code, title, follow_up_date, importance')
    .eq('action_required', true)
    .gte('follow_up_date', today)
    .lte('follow_up_date', futureDate)
    .order('follow_up_date', { ascending: true })
    .limit(20)
  if (pc) upcomingQ = upcomingQ.eq('project_code', pc)

  // 3. Recent meetings
  let meetingsQ = supabase
    .from('project_knowledge')
    .select('project_code, title, summary, recorded_at, participants')
    .eq('knowledge_type', 'meeting')
    .gte('recorded_at', lookback)
    .order('recorded_at', { ascending: false })
    .limit(10)
  if (pc) meetingsQ = meetingsQ.eq('project_code', pc)

  // 4. Recent decisions
  let decisionsQ = supabase
    .from('project_knowledge')
    .select('project_code, title, decision_status, recorded_at')
    .eq('knowledge_type', 'decision')
    .gte('recorded_at', lookback)
    .order('recorded_at', { ascending: false })
    .limit(10)
  if (pc) decisionsQ = decisionsQ.eq('project_code', pc)

  // 7. Active projects (last 30 days activity count)
  let projectActivityQ = supabase
    .from('project_knowledge')
    .select('project_code')
    .gte('recorded_at', new Date(now.getTime() - 30 * 86400000).toISOString())
  if (pc) projectActivityQ = projectActivityQ.eq('project_code', pc)

  // Run all queries in parallel
  const [overdueRes, upcomingRes, meetingsRes, decisionsRes, relationshipsRes, alertsRes, projectActivityRes] =
    await Promise.all([
      overdueQ,
      upcomingQ,
      meetingsQ,
      decisionsQ,

      // 5. Stale relationships (active/prospect not contacted in 30+ days)
      supabase
        .from('ghl_contacts')
        .select('full_name, email, company_name, engagement_status, last_contact_date')
        .in('engagement_status', ['active', 'prospect'])
        .lt('last_contact_date', new Date(now.getTime() - 30 * 86400000).toISOString())
        .order('last_contact_date', { ascending: true })
        .limit(10),

      // 6. Relationship alerts (falling temperature)
      supabase
        .from('relationship_health')
        .select('ghl_contact_id, temperature, temperature_trend, risk_flags')
        .eq('temperature_trend', 'falling')
        .order('temperature', { ascending: true })
        .limit(10),

      projectActivityQ,
    ])

  // Resolve contact names for relationship alerts
  let relationshipAlerts: RelationshipAlert[] = []
  const alertData = alertsRes.data || []
  if (alertData.length > 0) {
    const ghlIds = alertData.map((a: Record<string, unknown>) => a.ghl_contact_id as string)
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, email, company_name')
      .in('ghl_id', ghlIds)

    const contactMap = new Map(
      (contacts || []).map((c: Record<string, unknown>) => [c.ghl_id as string, c])
    )

    relationshipAlerts = alertData.map((a: Record<string, unknown>) => {
      const c = contactMap.get(a.ghl_contact_id as string) as Record<string, unknown> | undefined
      return {
        contact_name: (c?.full_name as string) || (c?.email as string) || 'Unknown',
        email: (c?.email as string) || null,
        company: (c?.company_name as string) || null,
        temperature: a.temperature as number,
        temperature_trend: a.temperature_trend as string,
      }
    })
  }

  // Count project activity
  const projectCounts: Record<string, number> = {}
  for (const row of projectActivityRes.data || []) {
    const code = (row as Record<string, unknown>).project_code as string
    projectCounts[code] = (projectCounts[code] || 0) + 1
  }

  return {
    generated_at: now.toISOString(),
    lookback_days: days,
    overdue_actions: (overdueRes.data || []) as OverdueAction[],
    upcoming_followups: (upcomingRes.data || []) as UpcomingFollowup[],
    recent_meetings: (meetingsRes.data || []) as RecentMeeting[],
    recent_decisions: (decisionsRes.data || []) as RecentDecision[],
    stale_relationships: (relationshipsRes.data || []) as StaleRelationship[],
    relationship_alerts: relationshipAlerts,
    active_projects: Object.entries(projectCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([code, count]) => ({ code, activity_count: count })),
  }
}
