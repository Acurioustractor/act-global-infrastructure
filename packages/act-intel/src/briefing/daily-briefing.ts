/**
 * Daily briefing — unified query logic for morning digest.
 *
 * Now powered by synced Notion tables (actions, meetings, decisions, calendar, grants)
 * plus GHL contacts for relationship tracking and Notion projects for project health.
 *
 * Returns typed data. Consumers (Telegram bot, Notion Workers, API routes) format for their interface.
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
  UpcomingCalendarEvent,
  UpcomingGrantDeadline,
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

  // Run all queries in parallel
  const [
    overdueRes,
    upcomingRes,
    meetingsRes,
    decisionsRes,
    relationshipsRes,
    alertsRes,
    projectsRes,
    calendarRes,
    grantsRes,
  ] = await Promise.all([
    // 1. Overdue actions from Notion (status not Done, due_date < today)
    supabase
      .from('notion_actions')
      .select('title, status, due_date, assigned_to')
      .not('status', 'eq', 'Done')
      .not('due_date', 'is', null)
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(20),

    // 2. Upcoming actions from Notion (due within lookback window)
    supabase
      .from('notion_actions')
      .select('title, status, due_date, assigned_to')
      .not('status', 'eq', 'Done')
      .not('due_date', 'is', null)
      .gte('due_date', today)
      .lte('due_date', futureDate)
      .order('due_date', { ascending: true })
      .limit(20),

    // 3. Recent meetings from Notion
    supabase
      .from('notion_meetings')
      .select('title, meeting_date, updated_at, ai_summary, task_status, assigned_to')
      .gte('updated_at', lookback)
      .order('updated_at', { ascending: false })
      .limit(10),

    // 4. Recent decisions from Notion
    supabase
      .from('notion_decisions')
      .select('title, status, decision_date, rationale')
      .gte('updated_at', lookback)
      .order('decision_date', { ascending: false })
      .limit(10),

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

    // 7. Active projects from Notion (with status)
    supabase
      .from('notion_projects')
      .select('title, status, data')
      .in('status', ['Active 🔥', 'Active', 'Ideation 🌀', 'Ideation'])
      .order('updated_at', { ascending: false })
      .limit(20),

    // 8. Upcoming calendar events from Notion planning calendar
    supabase
      .from('notion_calendar')
      .select('title, event_date, event_type, status')
      .gte('event_date', today)
      .lte('event_date', futureDate)
      .order('event_date', { ascending: true })
      .limit(10),

    // 9. Grant pipeline deadlines
    supabase
      .from('notion_grants')
      .select('title, funder, amount, stage, deadline, project_code')
      .not('stage', 'in', '("Won","Lost","Abandoned")')
      .order('deadline', { ascending: true })
      .limit(15),
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

  // Map projects with status and activity (use title as code proxy)
  const activeProjects = (projectsRes.data || []).map((p: Record<string, unknown>) => ({
    code: (p.title as string) || 'Unknown',
    status: (p.status as string) || 'unknown',
    activity_count: 1,
  }))

  return {
    generated_at: now.toISOString(),
    lookback_days: days,
    overdue_actions: (overdueRes.data || []) as OverdueAction[],
    upcoming_followups: (upcomingRes.data || []) as UpcomingFollowup[],
    recent_meetings: (meetingsRes.data || []) as RecentMeeting[],
    recent_decisions: (decisionsRes.data || []) as RecentDecision[],
    stale_relationships: (relationshipsRes.data || []) as StaleRelationship[],
    relationship_alerts: relationshipAlerts,
    active_projects: activeProjects,
    upcoming_calendar: (calendarRes.data || []) as UpcomingCalendarEvent[],
    grant_deadlines: (grantsRes.data || []) as UpcomingGrantDeadline[],
  }
}
