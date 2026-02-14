import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/knowledge/briefing?days=7
 *
 * Generate a daily/weekly briefing with stats across all knowledge.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceISO = since.toISOString()
    const todayISO = new Date().toISOString().split('T')[0]

    // Parallel queries
    const [
      recentMeetings,
      recentActions,
      recentDecisions,
      overdueActions,
      upcomingFollowups,
      totalMeetings,
      totalActions,
      totalDecisions,
    ] = await Promise.all([
      // Recent meetings
      supabase
        .from('project_knowledge')
        .select('id, title, summary, project_code, project_name, recorded_at, topics, sentiment')
        .eq('knowledge_type', 'meeting')
        .gte('recorded_at', sinceISO)
        .order('recorded_at', { ascending: false })
        .limit(20),
      // Recent actions
      supabase
        .from('project_knowledge')
        .select('id, title, project_code, project_name, participants, importance, action_required, follow_up_date, created_at')
        .eq('knowledge_type', 'action')
        .gte('created_at', sinceISO)
        .order('created_at', { ascending: false })
        .limit(50),
      // Recent decisions
      supabase
        .from('project_knowledge')
        .select('id, title, project_code, project_name, decision_status, decision_rationale, recorded_at')
        .eq('knowledge_type', 'decision')
        .gte('created_at', sinceISO)
        .order('recorded_at', { ascending: false })
        .limit(50),
      // Overdue actions
      supabase
        .from('project_knowledge')
        .select('id, title, project_code, project_name, participants, follow_up_date, importance')
        .eq('knowledge_type', 'action')
        .eq('action_required', true)
        .eq('status', 'open')
        .lt('follow_up_date', todayISO)
        .order('follow_up_date', { ascending: true })
        .limit(20),
      // Upcoming follow-ups (next 7 days)
      supabase
        .from('project_knowledge')
        .select('id, title, project_code, project_name, participants, follow_up_date, importance')
        .eq('knowledge_type', 'action')
        .eq('action_required', true)
        .eq('status', 'open')
        .gte('follow_up_date', todayISO)
        .lte('follow_up_date', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
        .order('follow_up_date', { ascending: true })
        .limit(20),
      // Total counts
      supabase.from('project_knowledge').select('id', { count: 'exact', head: true }).eq('knowledge_type', 'meeting'),
      supabase.from('project_knowledge').select('id', { count: 'exact', head: true }).eq('knowledge_type', 'action'),
      supabase.from('project_knowledge').select('id', { count: 'exact', head: true }).eq('knowledge_type', 'decision'),
    ])

    // Project activity breakdown
    const projectActivity: Record<string, { meetings: number, actions: number, decisions: number }> = {}
    for (const m of recentMeetings.data || []) {
      const code = m.project_code || 'unassigned'
      if (!projectActivity[code]) projectActivity[code] = { meetings: 0, actions: 0, decisions: 0 }
      projectActivity[code].meetings++
    }
    for (const a of recentActions.data || []) {
      const code = a.project_code || 'unassigned'
      if (!projectActivity[code]) projectActivity[code] = { meetings: 0, actions: 0, decisions: 0 }
      projectActivity[code].actions++
    }
    for (const d of recentDecisions.data || []) {
      const code = d.project_code || 'unassigned'
      if (!projectActivity[code]) projectActivity[code] = { meetings: 0, actions: 0, decisions: 0 }
      projectActivity[code].decisions++
    }

    // Topics across all recent meetings
    const allTopics: Record<string, number> = {}
    for (const m of recentMeetings.data || []) {
      for (const t of (m.topics || [])) {
        allTopics[t] = (allTopics[t] || 0) + 1
      }
    }
    const topTopics = Object.entries(allTopics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([topic, count]) => ({ topic, count }))

    return NextResponse.json({
      success: true,
      period: { days, since: sinceISO },
      totals: {
        meetings: totalMeetings.count || 0,
        actions: totalActions.count || 0,
        decisions: totalDecisions.count || 0,
      },
      recent: {
        meetings: recentMeetings.data || [],
        meetingCount: recentMeetings.data?.length || 0,
        actions: recentActions.data || [],
        actionCount: recentActions.data?.length || 0,
        decisions: recentDecisions.data || [],
        decisionCount: recentDecisions.data?.length || 0,
      },
      alerts: {
        overdue: overdueActions.data || [],
        overdueCount: overdueActions.data?.length || 0,
        upcoming: upcomingFollowups.data || [],
        upcomingCount: upcomingFollowups.data?.length || 0,
      },
      projectActivity,
      topTopics,
    })
  } catch (e) {
    console.error('Briefing error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
