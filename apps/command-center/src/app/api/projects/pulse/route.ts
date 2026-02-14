import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Cross-System Project Pulse
 *
 * Joins data from emails, Xero, calendar, knowledge, and GHL
 * to show per-project activity across all systems.
 */

interface ProjectPulse {
  code: string
  name: string
  status: string
  // Cross-system activity (last 14 days)
  emailsThisWeek: number
  emailsLastWeek: number
  spendThisMonth: number
  meetingsThisWeek: number
  actionsOpen: number
  actionsOverdue: number
  decisionsThisMonth: number
  pipelineValue: number
  opportunityCount: number
  // Derived
  lastActivityDate: string | null
  activityLevel: 'active' | 'quiet' | 'dormant'
}

export async function GET() {
  try {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const todayStr = now.toISOString().split('T')[0]

    // Fetch all data sources in parallel
    const [
      projectsRes,
      emailsThisWeekRes,
      emailsLastWeekRes,
      xeroRes,
      meetingsRes,
      actionsRes,
      decisionsRes,
      opportunitiesRes,
    ] = await Promise.all([
      // Active projects
      supabase.from('projects').select('code, name, status').eq('status', 'active'),

      // Emails this week (by project_code)
      supabase
        .from('communications_history')
        .select('project_code')
        .gte('occurred_at', oneWeekAgo)
        .not('project_code', 'is', null),

      // Emails last week
      supabase
        .from('communications_history')
        .select('project_code')
        .gte('occurred_at', twoWeeksAgo)
        .lt('occurred_at', oneWeekAgo)
        .not('project_code', 'is', null),

      // Xero spend this month
      supabase
        .from('xero_transactions')
        .select('project_code, total')
        .gte('date', oneMonthAgo)
        .not('project_code', 'is', null),

      // Meetings this week
      supabase
        .from('project_knowledge')
        .select('project_code, recorded_at')
        .eq('knowledge_type', 'meeting')
        .gte('recorded_at', oneWeekAgo),

      // Open/overdue actions
      supabase
        .from('project_knowledge')
        .select('project_code, follow_up_date, status')
        .eq('knowledge_type', 'action')
        .eq('action_required', true)
        .eq('status', 'open'),

      // Decisions this month
      supabase
        .from('project_knowledge')
        .select('project_code')
        .eq('knowledge_type', 'decision')
        .gte('recorded_at', oneMonthAgo),

      // Open opportunities
      supabase
        .from('ghl_opportunities')
        .select('project_code, monetary_value, status')
        .eq('status', 'open'),
    ])

    const projects = projectsRes.data || []

    // Build count maps
    const countBy = (rows: any[] | null, field = 'project_code') => {
      const map: Record<string, number> = {}
      for (const r of rows || []) {
        const code = r[field]
        if (code) map[code] = (map[code] || 0) + 1
      }
      return map
    }

    const sumBy = (rows: any[] | null, field: string, valueField: string) => {
      const map: Record<string, number> = {}
      for (const r of rows || []) {
        const code = r[field]
        if (code) map[code] = (map[code] || 0) + (parseFloat(r[valueField]) || 0)
      }
      return map
    }

    const emailsThisWeek = countBy(emailsThisWeekRes.data)
    const emailsLastWeek = countBy(emailsLastWeekRes.data)
    const xeroSpend = sumBy(xeroRes.data, 'project_code', 'total')
    const meetings = countBy(meetingsRes.data)
    const decisions = countBy(decisionsRes.data)
    const oppCounts = countBy(opportunitiesRes.data)
    const oppValues = sumBy(opportunitiesRes.data, 'project_code', 'monetary_value')

    // Actions: count open and overdue per project
    const actionsOpen: Record<string, number> = {}
    const actionsOverdue: Record<string, number> = {}
    for (const a of actionsRes.data || []) {
      const code = a.project_code
      if (!code) continue
      actionsOpen[code] = (actionsOpen[code] || 0) + 1
      if (a.follow_up_date && a.follow_up_date < todayStr) {
        actionsOverdue[code] = (actionsOverdue[code] || 0) + 1
      }
    }

    // Find last activity dates per project across all sources
    const lastActivity: Record<string, string> = {}
    const updateLast = (rows: any[] | null, dateField: string) => {
      for (const r of rows || []) {
        const code = r.project_code
        const date = r[dateField]
        if (code && date) {
          if (!lastActivity[code] || date > lastActivity[code]) {
            lastActivity[code] = date
          }
        }
      }
    }
    updateLast(emailsThisWeekRes.data, 'occurred_at')
    updateLast(meetingsRes.data, 'recorded_at')

    // Build pulse for each project
    const pulse: ProjectPulse[] = projects.map(p => {
      const code = p.code
      const emails7d = emailsThisWeek[code] || 0
      const meetings7d = meetings[code] || 0
      const spend = Math.abs(xeroSpend[code] || 0) // Xero totals can be negative for expenses
      const openActions = actionsOpen[code] || 0
      const overdueActions = actionsOverdue[code] || 0
      const pipeline = oppValues[code] || 0

      // Activity level based on any signal in the last week
      const hasRecentActivity = emails7d > 0 || meetings7d > 0
      const hasAnyActivity = openActions > 0 || spend > 0 || pipeline > 0
      const activityLevel = hasRecentActivity ? 'active' : hasAnyActivity ? 'quiet' : 'dormant'

      return {
        code,
        name: p.name,
        status: p.status,
        emailsThisWeek: emails7d,
        emailsLastWeek: emailsLastWeek[code] || 0,
        spendThisMonth: spend,
        meetingsThisWeek: meetings7d,
        actionsOpen: openActions,
        actionsOverdue: overdueActions,
        decisionsThisMonth: decisions[code] || 0,
        pipelineValue: pipeline,
        opportunityCount: oppCounts[code] || 0,
        lastActivityDate: lastActivity[code] || null,
        activityLevel,
      }
    })

    // Sort: active first, then by total activity signals
    pulse.sort((a, b) => {
      const levelOrder = { active: 0, quiet: 1, dormant: 2 }
      if (levelOrder[a.activityLevel] !== levelOrder[b.activityLevel]) {
        return levelOrder[a.activityLevel] - levelOrder[b.activityLevel]
      }
      const aScore = a.emailsThisWeek + a.meetingsThisWeek + a.actionsOpen + (a.pipelineValue > 0 ? 1 : 0)
      const bScore = b.emailsThisWeek + b.meetingsThisWeek + b.actionsOpen + (b.pipelineValue > 0 ? 1 : 0)
      return bScore - aScore
    })

    return NextResponse.json({
      pulse,
      totals: {
        active: pulse.filter(p => p.activityLevel === 'active').length,
        quiet: pulse.filter(p => p.activityLevel === 'quiet').length,
        dormant: pulse.filter(p => p.activityLevel === 'dormant').length,
      },
    })
  } catch (error) {
    console.error('Project pulse error:', error)
    return NextResponse.json({ error: 'Failed to fetch project pulse', pulse: [], totals: {} }, { status: 500 })
  }
}
