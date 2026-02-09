import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// EL database for storyteller data
const elUrl = process.env.SUPABASE_SHARED_URL || supabaseUrl
const elKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || supabaseKey
const elSupabase = createClient(elUrl, elKey)

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

// Helper functions
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

// Data fetchers
async function fetchCalendarToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data } = await supabase
    .from('calendar_events')
    .select('title, start_time, end_time, event_type, location')
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .order('start_time', { ascending: true })

  return (data || []).map(e => ({
    title: e.title,
    time: new Date(e.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    endTime: new Date(e.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    type: e.event_type || 'other',
    location: e.location,
  }))
}

async function fetchOverdueActions() {
  const { data } = await supabase
    .from('project_knowledge')
    .select('id, project_code, title, content, follow_up_date, importance')
    .eq('action_required', true)
    .lt('follow_up_date', todayStr())
    .order('follow_up_date', { ascending: true })
    .limit(10)

  return (data || []).map(row => ({
    id: row.id,
    project: row.project_code,
    title: row.title || '(untitled)',
    content: row.content?.substring(0, 200) || '',
    followUpDate: row.follow_up_date,
    importance: row.importance || 'normal',
    daysOverdue: Math.floor((Date.now() - new Date(row.follow_up_date).getTime()) / 86400000),
  }))
}

async function fetchUpcomingFollowups() {
  const { data } = await supabase
    .from('project_knowledge')
    .select('id, project_code, title, follow_up_date, importance')
    .eq('action_required', true)
    .gte('follow_up_date', todayStr())
    .lte('follow_up_date', futureDate(7))
    .order('follow_up_date', { ascending: true })
    .limit(10)

  return (data || []).map(row => ({
    id: row.id,
    project: row.project_code,
    title: row.title || '(untitled)',
    followUpDate: row.follow_up_date,
    importance: row.importance || 'normal',
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

async function fetchRelationshipAlerts() {
  const staleThreshold = daysAgo(30)

  const { data } = await supabase
    .from('ghl_contacts')
    .select('id, full_name, first_name, last_name, email, company_name, engagement_status, last_contact_date, projects')
    .in('engagement_status', ['active', 'prospect'])
    .lt('last_contact_date', staleThreshold)
    .order('last_contact_date', { ascending: true })
    .limit(10)

  return (data || []).map(row => {
    const name = row.full_name?.trim() || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email || 'Unknown'
    return {
      id: row.id,
      name,
      email: row.email,
      company: row.company_name,
      engagementStatus: row.engagement_status,
      lastContactDate: row.last_contact_date,
      daysSinceContact: row.last_contact_date
        ? Math.floor((Date.now() - new Date(row.last_contact_date).getTime()) / 86400000)
        : null,
      projects: row.projects || [],
    }
  })
}

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

  return {
    totalPipeline: openValue + wonValue + lostValue,
    openValue,
    wonValue,
    lostValue,
    opportunityCount: rows.length,
    byStage,
  }
}

async function fetchProjectActivity() {
  const sevenDaysAgo = daysAgo(7)

  const { data } = await supabase
    .from('project_knowledge')
    .select('project_code, knowledge_type, recorded_at')
    .gte('recorded_at', sevenDaysAgo)

  const byProject: Record<string, { code: string; meetings: number; actions: number; decisions: number; total: number }> = {}

  for (const row of (data || [])) {
    const code = row.project_code
    if (!byProject[code]) {
      byProject[code] = { code, meetings: 0, actions: 0, decisions: 0, total: 0 }
    }
    byProject[code].total += 1
    if (row.knowledge_type === 'meeting') byProject[code].meetings += 1
    else if (row.knowledge_type === 'decision') byProject[code].decisions += 1
    else byProject[code].actions += 1
  }

  return Object.values(byProject).sort((a, b) => b.total - a.total).slice(0, 5)
}

async function fetchStorytellerHighlights() {
  // Recent storyteller activity
  const { data: recentAnalysis } = await elSupabase
    .from('storyteller_master_analysis')
    .select('storyteller_id, themes, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  // Get storyteller names
  const stIds = (recentAnalysis || []).map(a => a.storyteller_id)
  const { data: storytellers } = await elSupabase
    .from('storytellers')
    .select('id, display_name')
    .in('id', stIds)

  const nameMap = new Map((storytellers || []).map(s => [s.id, s.display_name]))

  // Get quote count
  const { count: quoteCount } = await elSupabase
    .from('storyteller_master_analysis')
    .select('id', { count: 'exact', head: true })

  // Theme summary
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

export async function GET() {
  try {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Fetch all data in parallel
    const [
      calendar,
      overdueActions,
      upcomingFollowups,
      needToRespond,
      relationshipAlerts,
      financialSummary,
      projectActivity,
      storytellerHighlights,
      communicationStats,
    ] = await Promise.all([
      fetchCalendarToday(),
      fetchOverdueActions(),
      fetchUpcomingFollowups(),
      fetchNeedToRespond(),
      fetchRelationshipAlerts(),
      fetchFinancialSummary(),
      fetchProjectActivity(),
      fetchStorytellerHighlights(),
      fetchCommunicationStats(),
    ])

    const briefing = {
      success: true,
      generated: now.toISOString(),
      date: dateStr,
      moonPhase: getMoonPhase(now),
      thought: REGENERATIVE_THOUGHTS[Math.floor(Math.random() * REGENERATIVE_THOUGHTS.length)],

      // Today's schedule
      calendar: {
        events: calendar,
        meetingCount: calendar.filter(e => e.type === 'meeting').length,
      },

      // Actions & follow-ups
      actions: {
        overdue: overdueActions,
        upcoming: upcomingFollowups,
        overdueCount: overdueActions.length,
        upcomingCount: upcomingFollowups.length,
      },

      // Communications
      communications: {
        stats: communicationStats,
        needToRespond,
        needToRespondCount: needToRespond.length,
      },

      // Relationships
      relationships: {
        alerts: relationshipAlerts,
        alertCount: relationshipAlerts.length,
      },

      // Financial
      financial: financialSummary,

      // Projects
      projects: {
        activity: projectActivity,
        activeCount: projectActivity.length,
      },

      // Storytellers
      storytellers: storytellerHighlights,

      // Summary for quick glance
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
