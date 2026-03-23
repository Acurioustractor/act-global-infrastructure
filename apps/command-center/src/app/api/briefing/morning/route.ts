import { NextResponse } from 'next/server'
import { supabase, elSupabase } from '@/lib/supabase'
import { fetchDailyBriefing } from '@act/intel'
import type { SupabaseQueryClient } from '@act/intel'

export const dynamic = 'force-dynamic'

// Regenerative thoughts
const REGENERATIVE_THOUGHTS = [
  "Every seed planted grows into collective liberation.",
  "The land doesn't need us to save it—it needs us to listen.",
  "Technology should amplify human connection, not replace it.",
  "We build systems that make themselves unnecessary.",
  "Freedom is found in the space between action and reaction.",
  "Community is the original technology.",
  "What we nurture in others, we strengthen in ourselves.",
  "The best systems are invisible—they create space for humans to be human.",
  "Regeneration begins with attention.",
  "We don't drive the tractor—we hand over the keys.",
]

function getMoonPhase(date: Date): { phase: string; energy: string } {
  const knownNewMoon = new Date(2000, 0, 6)
  const lunarCycle = 29.53059
  const diff = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24)
  const phaseDay = diff % lunarCycle

  if (phaseDay < 1.85) return { phase: 'New Moon', energy: 'Set intentions, plant seeds, begin new projects' }
  if (phaseDay < 7.38) return { phase: 'Waxing Crescent', energy: 'Build momentum, take initial action' }
  if (phaseDay < 9.23) return { phase: 'First Quarter', energy: 'Push through challenges, make decisions' }
  if (phaseDay < 14.77) return { phase: 'Waxing Gibbous', energy: 'Refine and adjust, prepare for completion' }
  if (phaseDay < 16.61) return { phase: 'Full Moon', energy: 'Celebrate, connect with community, peak energy' }
  if (phaseDay < 22.15) return { phase: 'Waning Gibbous', energy: 'Share knowledge, express gratitude' }
  if (phaseDay < 23.99) return { phase: 'Last Quarter', energy: "Release what's not working, reflect" }
  return { phase: 'Waning Crescent', energy: 'Rest, integrate learnings, prepare for renewal' }
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function futureDate(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// --- Unique fetchers (not in @act/intel) ---

async function fetchCalendarToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const BEN_CALENDARS = ['benjamin@act.place', 'bk@aimementoring.com']
  const { data } = await supabase
    .from('calendar_events')
    .select('title, start_time, end_time, event_type, location, google_calendar_id')
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .in('google_calendar_id', BEN_CALENDARS)
    .order('start_time', { ascending: true })

  return (data || []).map(e => ({
    title: e.title,
    time: new Date(e.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    endTime: new Date(e.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    type: e.event_type || 'other',
    location: e.location,
  }))
}

async function fetchNeedToRespond() {
  const threeDaysAgo = daysAgo(3)
  const { data } = await supabase
    .from('communications_history')
    .select('id, contact_name, contact_email, subject, channel, received_at, ai_summary')
    .eq('direction', 'inbound')
    .eq('requires_response', true)
    .is('responded_at', null)
    .gte('received_at', threeDaysAgo)
    .order('received_at', { ascending: false })
    .limit(10)

  return (data || []).map(row => ({
    id: row.id,
    from: row.contact_name || row.contact_email,
    subject: row.subject,
    channel: row.channel,
    receivedAt: row.received_at,
    summary: row.ai_summary,
  }))
}

async function fetchCommunicationStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const { count: todayCount } = await supabase
    .from('communications_history')
    .select('id', { count: 'exact', head: true })
    .gte('received_at', today.toISOString())

  const { count: yesterdayCount } = await supabase
    .from('communications_history')
    .select('id', { count: 'exact', head: true })
    .gte('received_at', yesterday.toISOString())
    .lt('received_at', today.toISOString())

  return {
    today: todayCount || 0,
    yesterday: yesterdayCount || 0,
    trend: (todayCount || 0) > (yesterdayCount || 0) ? 'up' : (todayCount || 0) < (yesterdayCount || 0) ? 'down' : 'stable',
  }
}

async function fetchStorytellerHighlights() {
  const { data: recentAnalysis } = await elSupabase
    .from('storyteller_master_analysis')
    .select('storyteller_id, themes, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const stIds = (recentAnalysis || []).map(a => a.storyteller_id)
  const { data: storytellers } = await elSupabase
    .from('storytellers')
    .select('id, display_name')
    .in('id', stIds)

  const nameMap = new Map((storytellers || []).map(s => [s.id, s.display_name]))

  const { count: quoteCount } = await elSupabase
    .from('storyteller_master_analysis')
    .select('id', { count: 'exact', head: true })

  const themeCounts: Record<string, number> = {}
  for (const a of (recentAnalysis || [])) {
    for (const t of (a.themes || [])) {
      themeCounts[t] = (themeCounts[t] || 0) + 1
    }
  }
  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme)

  return {
    recentAnalyses: (recentAnalysis || []).map(a => ({
      storyteller: nameMap.get(a.storyteller_id) || 'Unknown',
      themes: a.themes || [],
      date: a.created_at,
    })),
    totalQuotes: quoteCount || 0,
    topThemes,
  }
}

async function fetchDailyPriorities() {
  const { data } = await supabase
    .from('sprint_suggestions')
    .select('id, title, stream, priority, notes, source_type, source_ref, due_date, project_code, owner, created_at')
    .eq('dismissed', false)
    .is('promoted_to', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  return (data || []).map(row => {
    let context = null
    try { context = row.notes ? JSON.parse(row.notes) : null } catch { context = { raw: row.notes } }
    return {
      id: row.id,
      title: row.title,
      priority: row.priority,
      sourceType: row.source_type,
      projectCode: row.project_code,
      dueDate: row.due_date,
      score: context?.score ?? null,
      action: context?.action ?? null,
      value: context?.amount ?? context?.value ?? null,
      context,
    }
  })
}

async function fetchPipelineSnapshot() {
  const { data } = await supabase
    .from('opportunities_unified')
    .select('id, title, stage, value_mid, probability, project_codes, opportunity_type, source_system, expected_close')
    .not('stage', 'in', '("won","lost","dismissed")')

  const rows = data || []
  let totalWeighted = 0
  const byStage: Record<string, { count: number; value: number; weighted: number }> = {}

  for (const row of rows) {
    const val = Number(row.value_mid) || 0
    const prob = Number(row.probability) || 0.5
    const weighted = val * prob
    totalWeighted += weighted

    const stage = row.stage || 'unknown'
    if (!byStage[stage]) byStage[stage] = { count: 0, value: 0, weighted: 0 }
    byStage[stage].count += 1
    byStage[stage].value += val
    byStage[stage].weighted += weighted
  }

  return {
    totalOpportunities: rows.length,
    totalValue: rows.reduce((s, r) => s + (Number(r.value_mid) || 0), 0),
    totalWeighted,
    byStage,
    topDeals: rows
      .sort((a, b) => (Number(b.value_mid) || 0) - (Number(a.value_mid) || 0))
      .slice(0, 5)
      .map(r => ({
        title: r.title,
        stage: r.stage,
        value: Number(r.value_mid) || 0,
        type: r.opportunity_type,
        source: r.source_system,
        expectedClose: r.expected_close,
        projects: r.project_codes || [],
      })),
  }
}

async function fetchGrantsSection() {
  const yesterday = daysAgo(1)
  const nextWeek = futureDate(7)
  const today = todayStr()

  const [
    newGrantsRes,
    upcomingDeadlinesRes,
    activeAppsRes,
    pipelineDataRes,
    grantActionsRes,
  ] = await Promise.all([
    supabase
      .from('grant_opportunities')
      .select('id, name, provider, fit_score, relevance_score, aligned_projects, amount_max, closes_at')
      .gte('created_at', yesterday)
      .order('relevance_score', { ascending: false })
      .limit(5),

    supabase
      .from('grant_opportunities')
      .select('id, name, provider, closes_at, fit_score, relevance_score, aligned_projects')
      .not('closes_at', 'is', null)
      .gte('closes_at', today)
      .lte('closes_at', nextWeek)
      .order('closes_at', { ascending: true })
      .limit(20),

    supabase
      .from('grant_applications')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'in_progress', 'submitted', 'under_review']),

    supabase
      .from('grant_applications')
      .select('amount_requested')
      .in('status', ['draft', 'in_progress', 'submitted', 'under_review']),

    // Grant action items due this week from Notion
    supabase
      .from('notion_actions')
      .select('title, status, due_date, action_type, assigned_to')
      .not('status', 'eq', 'Done')
      .not('due_date', 'is', null)
      .lte('due_date', nextWeek)
      .eq('action_type', 'Grant')
      .order('due_date', { ascending: true })
      .limit(15),
  ])

  const newGrants = newGrantsRes.data || []
  const upcomingDeadlines = (upcomingDeadlinesRes.data || []).filter(g => {
    if (g.fit_score && g.fit_score >= 60) return true
    if (Array.isArray(g.aligned_projects) && g.aligned_projects.length > 0) return true
    return false
  }).slice(0, 10)
  const pipelineValue = (pipelineDataRes.data || []).reduce((sum: number, a: { amount_requested: number }) => sum + (a.amount_requested || 0), 0)
  const grantActions = grantActionsRes.data || []

  // Split grant actions into overdue vs upcoming
  const overdueGrantActions = grantActions.filter(a => a.due_date < today)
  const upcomingGrantActions = grantActions.filter(a => a.due_date >= today)

  // Identify Go/No-Go decisions needed
  const goNoGoActions = grantActions.filter(a =>
    a.title.toLowerCase().includes('go/no-go') || a.title.toLowerCase().includes('go-no-go')
  )

  return {
    newDiscoveries: newGrants.map(g => ({
      name: g.name,
      provider: g.provider,
      fitScore: g.fit_score ?? g.relevance_score,
      projects: g.aligned_projects || [],
      amount: g.amount_max,
      closesAt: g.closes_at,
    })),
    newCount: newGrants.length,
    upcomingDeadlines: upcomingDeadlines.map(d => ({
      name: d.name,
      provider: d.provider,
      closesAt: d.closes_at,
      fitScore: d.fit_score ?? d.relevance_score,
      daysRemaining: d.closes_at ? Math.ceil((new Date(d.closes_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
    })),
    activeApplications: activeAppsRes.count || 0,
    pipelineValue,
    // New: grant action items due this week
    grantActionsThisWeek: upcomingGrantActions.map(a => ({
      title: a.title,
      dueDate: a.due_date,
      status: a.status,
      assignedTo: a.assigned_to,
      daysRemaining: Math.ceil((new Date(a.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      isGoNoGo: a.title.toLowerCase().includes('go/no-go'),
    })),
    overdueGrantActions: overdueGrantActions.map(a => ({
      title: a.title,
      dueDate: a.due_date,
      status: a.status,
      daysOverdue: Math.floor((Date.now() - new Date(a.due_date).getTime()) / (1000 * 60 * 60 * 24)),
    })),
    goNoGoDecisionsNeeded: goNoGoActions.length,
  }
}

// --- Financial summary (inline — @act/intel's version has different shape) ---

async function fetchFinancialSummary() {
  const { data } = await supabase
    .from('ghl_opportunities')
    .select('status, monetary_value, pipeline_name, stage_name')

  const rows = data || []
  let openValue = 0, wonValue = 0, lostValue = 0
  const byStage: Record<string, { value: number; count: number }> = {}

  for (const row of rows) {
    const val = parseFloat(row.monetary_value) || 0
    if (row.status === 'open') openValue += val
    else if (row.status === 'won') wonValue += val
    else if (row.status === 'lost') lostValue += val

    const sName = row.stage_name || 'Unknown'
    if (!byStage[sName]) byStage[sName] = { value: 0, count: 0 }
    byStage[sName].value += val
    byStage[sName].count += 1
  }

  return { totalPipeline: openValue + wonValue + lostValue, openValue, wonValue, lostValue, opportunityCount: rows.length, byStage }
}

// --- Main handler ---

export async function GET() {
  try {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Use @act/intel for core briefing data (overdue, upcoming, relationships, projects)
    const coreBriefing = await fetchDailyBriefing(supabase as unknown as SupabaseQueryClient)

    // Fetch remaining data in parallel
    const [
      calendar,
      needToRespond,
      financialSummary,
      storytellerHighlights,
      communicationStats,
      grantsSection,
      dailyPriorities,
      pipelineSnapshot,
    ] = await Promise.all([
      fetchCalendarToday(),
      fetchNeedToRespond(),
      fetchFinancialSummary(),
      fetchStorytellerHighlights(),
      fetchCommunicationStats(),
      fetchGrantsSection(),
      fetchDailyPriorities(),
      fetchPipelineSnapshot(),
    ])

    // Map @act/intel data to existing API shape
    const overdueActions = coreBriefing.overdue_actions.map(a => ({
      project: a.project_code || null,
      title: a.title,
      followUpDate: a.due_date,
      status: a.status,
      assignedTo: a.assigned_to,
      daysOverdue: Math.floor((Date.now() - new Date(a.due_date).getTime()) / 86400000),
    }))

    const upcomingFollowups = coreBriefing.upcoming_followups.map(a => ({
      project: a.project_code || null,
      title: a.title,
      followUpDate: a.due_date,
      status: a.status,
      assignedTo: a.assigned_to,
    }))

    const relationshipAlerts = coreBriefing.stale_relationships.map(r => ({
      name: r.full_name || r.email || 'Unknown',
      email: r.email,
      company: r.company_name,
      engagementStatus: r.engagement_status,
      lastContactDate: r.last_contact_date,
      daysSinceContact: r.last_contact_date
        ? Math.floor((Date.now() - new Date(r.last_contact_date).getTime()) / 86400000)
        : null,
    }))

    const projectActivity = coreBriefing.active_projects.slice(0, 5).map(p => ({
      code: p.code,
      total: p.activity_count,
    }))

    const briefing = {
      success: true,
      generated: now.toISOString(),
      date: dateStr,
      moonPhase: getMoonPhase(now),
      thought: REGENERATIVE_THOUGHTS[Math.floor(Math.random() * REGENERATIVE_THOUGHTS.length)],

      calendar: {
        events: calendar,
        meetingCount: calendar.filter(e => e.type === 'meeting').length,
      },

      actions: {
        overdue: overdueActions,
        upcoming: upcomingFollowups,
        overdueCount: overdueActions.length,
        upcomingCount: upcomingFollowups.length,
      },

      communications: {
        stats: communicationStats,
        needToRespond,
        needToRespondCount: needToRespond.length,
      },

      relationships: {
        alerts: relationshipAlerts,
        alertCount: relationshipAlerts.length,
      },

      financial: financialSummary,

      projects: {
        activity: projectActivity,
        activeCount: projectActivity.length,
      },

      storytellers: storytellerHighlights,
      grants: grantsSection,

      priorities: {
        items: dailyPriorities,
        nowCount: dailyPriorities.filter((p: any) => p.priority === 'now').length,
        nextCount: dailyPriorities.filter((p: any) => p.priority === 'next').length,
        totalCount: dailyPriorities.length,
      },

      pipeline: pipelineSnapshot,

      summary: {
        urgentItems: overdueActions.length + needToRespond.length,
        meetingsToday: calendar.filter(e => e.type === 'meeting').length,
        pipelineValue: financialSummary.openValue,
        staleRelationships: relationshipAlerts.length,
      },
    }

    return NextResponse.json(briefing)
  } catch (error) {
    console.error('Morning briefing error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate briefing' },
      { status: 500 }
    )
  }
}
