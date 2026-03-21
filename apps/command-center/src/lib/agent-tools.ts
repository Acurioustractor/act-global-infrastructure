// Re-export from extracted modules for backward compatibility
export { AGENT_TOOLS } from './tool-definitions'
export { calculateCost, logAgentUsage } from './tool-helpers'

// Import shared helpers used by handler functions
import { loadProjectCodes } from './tool-helpers'
import { getGoogleAccessToken } from './tool-helpers'

import Anthropic from '@anthropic-ai/sdk'
import { google } from 'googleapis'
import { Client as NotionClient } from '@notionhq/client'
import { supabase } from './supabase'
import { readFileSync } from 'fs'
import { join } from 'path'
import { savePendingAction, type SerializablePendingAction } from './telegram/pending-action-state'
import { getBrisbaneDate, getBrisbaneNow, getBrisbaneDateOffset } from './timezone'
import {
  fetchDailyBriefing,
  fetchProjectHealth,
  fetchFinancialSummary,
  fetchCashflow,
  fetchRevenueScoreboard,
  fetchProjectFinancials,
  fetchReceiptPipeline,
  searchContacts,
  fetchContactDetails,
  fetchContactsNeedingAttention,
  fetchGrantOpportunities,
  fetchGrantPipeline,
  fetchGrantReadiness,
  searchKnowledge,
  fetchProjectSummary,
  fetchProjectIntelligence,
} from '@act/intel'
import type { DailyBriefingResult } from '@act/intel'

// AGENT_TOOLS array has been extracted to ./tool-definitions.ts
// (see re-export above)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  chatId?: number
): Promise<string> {
  switch (name) {
    case 'query_supabase':
      return await executeQuerySupabase(input as { sql: string; description: string })
    case 'get_daily_briefing':
      return await executeGetDailyBriefing(input as { lookback_days?: number; detail_level?: string; format?: string })
    case 'search_contacts':
      return await executeSearchContacts(input as { query: string; limit?: number })
    case 'get_contact_details':
      return await executeGetContactDetails(input as { contact_id: string })
    case 'get_calendar_events':
      return await executeGetCalendarEvents(input as { start_date?: string; end_date?: string })
    case 'search_knowledge':
      return await executeSearchKnowledge(input as { query: string; project_code?: string; limit?: number })
    case 'get_contacts_needing_attention':
      return await executeGetContactsNeedingAttention(input as { limit?: number; project?: string })
    case 'get_deal_risks':
      return await executeGetDealRisks(input as { limit?: number })
    // Write actions
    case 'draft_email':
      return await executeDraftEmail(input as { to: string; subject: string; body: string }, chatId)
    case 'create_calendar_event':
      return await executeCreateCalendarEvent(
        input as { title: string; date: string; time: string; duration_minutes?: number; attendees?: string[]; location?: string },
        chatId
      )
    case 'set_reminder':
      return await executeSetReminder(input as { message: string; time: string; recurring?: string }, chatId)
    case 'add_receipt':
      return await executeAddReceipt(input as { vendor: string; amount: number; date: string; category?: string; notes?: string })
    // Grant & pipeline
    case 'get_grant_opportunities':
      return await executeGetGrantOpportunities(input as { status?: string; limit?: number })
    case 'get_grant_pipeline':
      return await executeGetGrantPipeline(input as { status?: string })
    case 'get_xero_transactions':
      return await executeGetXeroTransactions(
        input as { type?: string; vendor?: string; project_code?: string; start_date?: string; end_date?: string; min_amount?: number; limit?: number }
      )
    // Reflection tools
    case 'save_daily_reflection':
      return await executeSaveDailyReflection(
        input as {
          voice_transcript: string
          lcaa_listen: string
          lcaa_curiosity: string
          lcaa_action: string
          lcaa_art: string
          loop_to_tomorrow?: string
          gratitude?: string[]
          challenges?: string[]
          learnings?: string[]
          intentions?: string[]
        },
        chatId
      )
    case 'search_past_reflections':
      return await executeSearchPastReflections(input as { query?: string; days?: number; limit?: number })
    // Writing tools
    case 'save_writing_draft':
      return await executeSaveWritingDraft(
        input as { title: string; content: string; append?: boolean; project?: string; tags?: string[] }
      )
    // Planning tools
    case 'save_planning_doc':
      return await executeSavePlanningDoc(
        input as { horizon: string; title: string; content: string; append?: boolean; project?: string }
      )
    // Writing stage management
    case 'move_writing':
      return await executeMoveWriting(
        input as { title_search?: string; from_stage?: string; to_stage: string }
      )
    // Planning rollup
    case 'review_planning_period':
      return await executeReviewPlanningPeriod(
        input as { period: string; date?: string }
      )
    // Moon cycle review
    case 'moon_cycle_review':
      return await executeMoonCycleReview(
        input as { month?: string; focus?: string }
      )
    // Dream journal
    case 'save_dream':
      return await executeSaveDream(
        input as { content: string; title?: string; category?: string; tags?: string[]; media_url?: string; media_type?: string },
        chatId
      )
    case 'search_dreams':
      return await executeSearchDreams(input as { query?: string; category?: string; limit?: number })
    // Goods intelligence
    case 'get_goods_intelligence':
      return await executeGetGoodsIntelligence(input as { focus: string })
    // Email search
    case 'search_emails':
      return await executeSearchEmails(input as { query: string; mailbox?: string; limit?: number })
    // Receipt finder
    case 'find_receipt':
      return await executeFindReceipt(input as { vendor?: string; amount?: number; date?: string; project_code?: string })
    // Cashflow forecast
    case 'get_cashflow_forecast':
      return await executeGetCashflowForecast(input as { months_ahead?: number })
    // Project health
    // Upcoming deadlines
    case 'get_upcoming_deadlines':
      return await executeGetUpcomingDeadlines(input as { days_ahead?: number; category?: string })
    // Meeting notes
    case 'get_project_360':
      return await executeGetProject360(input as { project_code: string })
    // Notion write tools
    case 'add_meeting_to_notion':
      return await executeAddMeetingToNotion(input as {
        title: string; date?: string; project_code?: string; attendees?: string[];
        notes: string; decisions?: string[]; action_items?: string[]; meeting_type?: string
      })
    case 'add_action_item':
      return await executeAddActionItem(input as {
        title: string; project_code?: string; due_date?: string;
        priority?: string; details?: string; assignee?: string
      })
    case 'add_decision':
      return await executeAddDecision(input as {
        title: string; project_code?: string; rationale?: string;
        alternatives_considered?: string[]; status?: string
      })
    case 'get_project_financials':
      return await executeGetProjectFinancials(input as { project_code?: string })
    case 'get_untagged_summary':
      return await executeGetUntaggedSummary()
    case 'trigger_auto_tag':
      return await executeTriggerAutoTag(input as { dry_run?: boolean })
    // Bot intelligence tools
    case 'get_receipt_pipeline_status':
      return await executeGetReceiptPipelineStatus(input as { include_stuck?: boolean })
    case 'get_meeting_prep':
      return await executeGetMeetingPrep(input as { event_title?: string; date?: string })
    case 'get_grant_readiness':
      return await executeGetGrantReadiness(input as { application_id?: string; grant_name?: string })
    case 'draft_grant_response':
      return await executeDraftGrantResponse(
        input as { opportunity_id: string; project_code?: string; sections?: string[]; tone?: string },
        chatId
      )
    case 'get_revenue_scoreboard':
      return await executeGetRevenueScoreboard()
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: query_supabase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeQuerySupabase(input: {
  sql: string
  description: string
}): Promise<string> {
  const { sql, description } = input

  // Client-side guard (defense in depth — the DB function also enforces this)
  const normalised = sql.trim().toUpperCase()
  if (!normalised.startsWith('SELECT') && !normalised.startsWith('WITH')) {
    return JSON.stringify({
      error: 'Only SELECT queries are allowed. Cannot run INSERT, UPDATE, DELETE, or DDL.',
    })
  }

  // Block multiple statements (defense in depth)
  const trimmedSql = sql.trim().replace(/;+$/, '')
  if (trimmedSql.includes(';')) {
    return JSON.stringify({
      error: 'Multiple SQL statements are not allowed. Send one SELECT query at a time.',
    })
  }

  try {
    // Execute via exec_agent_sql which drops privileges to agent_readonly role.
    // Even if the SQL contains destructive statements, the DB role prevents mutations.
    const { data, error } = await supabase.rpc('exec_agent_sql', {
      query_text: sql,
    })

    if (error) {
      // If the secure function doesn't exist yet, fall back to table queries
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return await fallbackQuery(sql, description)
      }
      return JSON.stringify({ error: error.message, hint: 'Check table/column names.' })
    }

    const rows = Array.isArray(data) ? data : [data]
    return JSON.stringify({
      description,
      row_count: rows.length,
      data: rows.slice(0, 50), // Limit to 50 rows
      truncated: rows.length > 50,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

async function fallbackQuery(sql: string, description: string): Promise<string> {
  // Parse simple queries and use Supabase client methods
  const tableMatch = sql.match(/FROM\s+["']?(\w+)["']?/i)
  if (!tableMatch) {
    return JSON.stringify({
      error: 'Could not parse table name. The exec_read_only_sql database function is not available. Try asking about specific tables like contacts, projects, communications.',
    })
  }

  const table = tableMatch[1]
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
  const limit = limitMatch ? parseInt(limitMatch[1]) : 20

  try {
    const { data, error } = await supabase.from(table).select('*').limit(limit)
    if (error) {
      return JSON.stringify({ error: error.message })
    }
    return JSON.stringify({
      description,
      table,
      row_count: (data || []).length,
      data: (data || []).slice(0, 50),
      note: 'Fallback query - returned all columns with limit. For complex queries, the exec_read_only_sql function needs to be created.',
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_daily_briefing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetDailyBriefing(input: {
  lookback_days?: number
  detail_level?: string
  format?: string
}): Promise<string> {
  const result = await fetchDailyBriefing(supabase, {
    lookbackDays: input.lookback_days || 7,
  })

  // Voice format: concise natural sentences for TTS (~800 chars)
  if (input.format === 'voice') {
    return formatDailyBriefingVoice(result)
  }

  // Build action items — the most important part
  const actions: string[] = []
  if (result.overdue_actions.length > 0) {
    actions.push(`${result.overdue_actions.length} overdue action${result.overdue_actions.length > 1 ? 's' : ''} — chase these first`)
  }
  if (result.upcoming_followups.length > 0) {
    actions.push(`${result.upcoming_followups.length} follow-up${result.upcoming_followups.length > 1 ? 's' : ''} due this week`)
  }
  if (result.stale_relationships.length > 0) {
    const top = result.stale_relationships[0]
    actions.push(`${result.stale_relationships.length} contact${result.stale_relationships.length > 1 ? 's' : ''} going quiet — ${top?.full_name || 'check list'}`)
  }

  // Default: concise actionable output (not full data dump)
  // Only expand to full if explicitly requested
  if (input.detail_level === 'full') {
    return JSON.stringify({
      actions,
      generated_at: result.generated_at,
      overdue_actions: result.overdue_actions,
      upcoming_followups: result.upcoming_followups,
      recent_meetings: result.recent_meetings,
      stale_relationships: result.stale_relationships.map((r) => ({
        name: r.full_name || r.email || 'Unknown',
        company: r.company_name,
        status: r.engagement_status,
        last_contact: r.last_contact_date,
      })),
      active_projects: result.active_projects.slice(0, 10),
    })
  }

  return JSON.stringify({
    actions,
    meetings_today: result.recent_meetings.length,
    meetings: result.recent_meetings.slice(0, 5).map(m => ({
      title: m.title, date: m.recorded_at,
    })),
    overdue: result.overdue_actions.slice(0, 5).map((a) => ({
      title: a.title, due: a.follow_up_date,
    })),
    followups_due: result.upcoming_followups.slice(0, 5).map((f) => ({
      title: f.title, due: f.follow_up_date,
    })),
    active_projects: result.active_projects.length,
  })
}

function formatDailyBriefingVoice(result: DailyBriefingResult): string {
  const parts: string[] = []

  const meetingCount = result.recent_meetings.length
  if (meetingCount === 0) {
    parts.push('No meetings on the calendar today.')
  } else {
    const firstFew = result.recent_meetings.slice(0, 3)
    const eventDescs = firstFew.map((m) => m.title).join(', ')
    parts.push(`You have ${meetingCount} meeting${meetingCount === 1 ? '' : 's'} today. ${meetingCount <= 3 ? eventDescs + '.' : 'Including ' + eventDescs + '.'}`)
  }

  const overdueCount = result.overdue_actions.length
  if (overdueCount > 0) {
    parts.push(`${overdueCount} overdue action${overdueCount === 1 ? '' : 's'} need${overdueCount === 1 ? 's' : ''} attention.`)
  }

  const upcomingCount = result.upcoming_followups.length
  if (upcomingCount > 0) {
    parts.push(`${upcomingCount} follow-up${upcomingCount === 1 ? '' : 's'} coming this week.`)
  }

  const staleCount = result.stale_relationships.length
  if (staleCount > 0) {
    const topStale = result.stale_relationships[0]
    parts.push(`${staleCount} contact${staleCount === 1 ? '' : 's'} going quiet${topStale ? ', including ' + (topStale.full_name || 'someone') : ''}.`)
  }

  const projectCount = result.active_projects.length
  if (projectCount > 0) {
    parts.push(`${projectCount} project${projectCount === 1 ? '' : 's'} active this month.`)
  }

  return parts.join(' ')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_financial_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetFinancialSummary(input: {
  days?: number
}): Promise<string> {
  const result = await fetchFinancialSummary(supabase, { days: input.days })
  return JSON.stringify({
    period_days: result.period_days,
    pipeline: result.pipeline,
    api_costs: result.api_costs,
    subscriptions: result.subscriptions,
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_contacts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSearchContacts(input: {
  query: string
  limit?: number
}): Promise<string> {
  try {
    const result = await searchContacts(supabase, { query: input.query, limit: input.limit })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_contact_details
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetContactDetails(input: {
  contact_id: string
}): Promise<string> {
  try {
    const result = await fetchContactDetails(supabase, { contact_id: input.contact_id })
    if (!result) return JSON.stringify({ error: 'Contact not found', contact_id: input.contact_id })

    // Slim down communications — truncate summaries, keep only key fields
    const comms = (result.recent_communications || []).slice(0, 5).map((c) => ({
      direction: c.direction,
      channel: c.channel,
      date: c.date,
      subject: c.subject,
      summary: c.summary ? c.summary.slice(0, 120) + (c.summary.length > 120 ? '...' : '') : null,
    }))

    return JSON.stringify({
      id: result.id,
      name: result.name,
      email: result.email,
      phone: result.phone,
      company: result.company,
      status: result.status,
      projects: result.projects,
      relationship: result.relationship ? {
        temperature: result.relationship.temperature,
        trend: result.relationship.trend,
        lcaa_stage: result.relationship.lcaa_stage,
        risk_flags: result.relationship.risk_flags,
      } : null,
      last_contact: result.last_contact,
      days_since_contact: result.days_since_contact,
      tags: result.tags,
      pipeline: result.open_pipeline,
      next_meeting: result.next_meeting,
      recent_communications: comms,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_calendar_events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetCalendarEvents(input: {
  start_date?: string
  end_date?: string
}): Promise<string> {
  const startDate = input.start_date || getBrisbaneDate()
  const endDate = input.end_date || startDate

  // Use AEST boundaries (UTC+10) so "today" means today in Brisbane
  const dayStart = `${startDate}T00:00:00+10:00`
  const dayEnd = `${endDate}T23:59:59+10:00`

  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .order('start_time', { ascending: true })

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const events = (data || []).map((e) => ({
      title: e.title || e.summary || 'Untitled Event',
      start_time: e.start_time,
      end_time: e.end_time,
      location: e.location,
      description: e.description,
      project_code: e.project_code,
      is_all_day: e.is_all_day || false,
      attendees: e.attendees || [],
      link: e.html_link || e.link,
    }))

    return JSON.stringify({
      date_range: { start: startDate, end: endDate },
      count: events.length,
      events,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_knowledge
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSearchKnowledge(input: {
  query: string
  project_code?: string
  limit?: number
}): Promise<string> {
  try {
    const result = await searchKnowledge(supabase, {
      query: input.query,
      project_code: input.project_code,
      limit: input.limit,
    })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetProjectSummary(input: {
  project_code: string
}): Promise<string> {
  try {
    const result = await fetchProjectSummary(supabase, { project_code: input.project_code })
    if (!result) {
      return JSON.stringify({
        project_code: input.project_code.toUpperCase(),
        error: 'No summary available yet for this project. Summaries are generated daily.',
      })
    }
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_contacts_needing_attention
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetContactsNeedingAttention(input: {
  limit?: number
  project?: string
}): Promise<string> {
  try {
    const result = await fetchContactsNeedingAttention(supabase, { limit: input.limit, project: input.project })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

function suggestAction(
  riskFlags: string[],
  health: { email_score?: number; calendar_score?: number; next_meeting_date?: string } | null | undefined
): string {
  if (riskFlags.includes('awaiting_response')) return 'Reply to their recent message — they\'re waiting to hear back'
  if (riskFlags.includes('high_value_inactive')) return 'High-value deal at risk — schedule a call or meeting ASAP'
  if (riskFlags.includes('one_way_outbound')) return 'Emails going unanswered — try a different channel (call, text, in-person)'
  if (riskFlags.includes('going_cold')) return 'Relationship cooling — send a check-in or share something relevant'
  if (health?.next_meeting_date) return `Meeting scheduled ${new Date(health.next_meeting_date).toLocaleDateString()} — prepare talking points`
  return 'Consider reaching out with a relevant update or check-in'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_deal_risks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetDealRisks(input: {
  limit?: number
}): Promise<string> {
  const limit = input.limit || 10

  try {
    // Get open opportunities
    const { data: opportunities, error } = await supabase
      .from('ghl_opportunities')
      .select('id, name, monetary_value, stage_name, pipeline_name, contact_id, status, updated_at')
      .eq('status', 'open')
      .order('monetary_value', { ascending: false })

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    if (!opportunities || opportunities.length === 0) {
      return JSON.stringify({ description: 'No open opportunities in pipeline', deals: [] })
    }

    // Get relationship health for all contacts with open deals
    const contactIds = [...new Set(opportunities.map((o) => o.contact_id).filter(Boolean))]
    const { data: healthData } = await supabase
      .from('relationship_health')
      .select('ghl_contact_id, temperature, temperature_trend, risk_flags, last_contact_at, email_score')
      .in('ghl_contact_id', contactIds.length > 0 ? contactIds : ['__none__'])

    const healthMap: Record<string, { temperature?: number; temperature_trend?: string; risk_flags?: string[]; last_contact_at?: string; email_score?: number }> = {}
    for (const h of (healthData || [])) {
      healthMap[h.ghl_contact_id] = h
    }

    // Get contact names
    const { data: contactData } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, email')
      .in('ghl_id', contactIds.length > 0 ? contactIds : ['__none__'])

    const contactMap: Record<string, { full_name?: string; email?: string }> = {}
    for (const c of (contactData || [])) {
      contactMap[c.ghl_id] = c
    }

    const now = new Date()
    const atRiskDeals = opportunities
      .map((opp) => {
        const health = healthMap[opp.contact_id]
        const contact = contactMap[opp.contact_id]
        const daysSinceUpdate = Math.floor((now.getTime() - new Date(opp.updated_at).getTime()) / 86400000)
        const daysSinceContact = health?.last_contact_at
          ? Math.floor((now.getTime() - new Date(health.last_contact_at).getTime()) / 86400000)
          : null

        // Determine risk reasons
        const risks: string[] = []
        if (health?.temperature_trend === 'falling') risks.push('Contact temperature falling')
        if (health?.risk_flags?.includes('going_cold')) risks.push('Contact going cold')
        if (health?.risk_flags?.includes('awaiting_response')) risks.push('Awaiting your response')
        if (health?.risk_flags?.includes('one_way_outbound')) risks.push('One-way outbound — no replies')
        if (health?.risk_flags?.includes('high_value_inactive')) risks.push('High value but inactive')
        if (daysSinceUpdate > 14) risks.push(`No deal activity in ${daysSinceUpdate} days`)
        if (daysSinceContact && daysSinceContact > 21) risks.push(`No contact in ${daysSinceContact} days`)

        if (risks.length === 0) return null

        return {
          deal: opp.name,
          value: opp.monetary_value,
          stage: opp.stage_name,
          pipeline: opp.pipeline_name,
          contact_name: contact?.full_name || 'Unknown',
          contact_email: contact?.email,
          temperature: health?.temperature,
          trend: health?.temperature_trend,
          risks,
          suggested_action: suggestAction(health?.risk_flags || [], health),
        }
      })
      .filter(Boolean)
      .slice(0, limit)

    return JSON.stringify({
      description: 'Open deals with relationship or activity risk signals',
      count: atRiskDeals.length,
      total_at_risk_value: atRiskDeals.reduce((sum, d) => sum + ((d as { value?: number }).value || 0), 0),
      deals: atRiskDeals,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: draft_email
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeDraftEmail(
  input: { to: string; subject: string; body: string },
  chatId?: number
): Promise<string> {
  // Resolve contact email if name given
  let recipientEmail = input.to
  let recipientName = input.to

  if (!input.to.includes('@')) {
    const searchTerm = `%${input.to}%`
    const { data } = await supabase
      .from('ghl_contacts')
      .select('full_name, email')
      .ilike('full_name', searchTerm)
      .not('email', 'is', null)
      .limit(1)
      .maybeSingle()

    if (data?.email) {
      recipientEmail = data.email
      recipientName = data.full_name || input.to
    } else {
      return JSON.stringify({
        error: `Could not find email for "${input.to}". Try providing the email address directly.`,
      })
    }
  }

  // Store as pending action if in Telegram context
  if (chatId) {
    await savePendingAction(chatId, `Send email to ${recipientName} <${recipientEmail}>`, {
      type: 'draft_email',
      params: { to: recipientEmail, subject: input.subject, body: input.body },
    })
  }

  return JSON.stringify({
    action: 'email_draft',
    status: 'pending_confirmation',
    to: recipientEmail,
    to_name: recipientName,
    subject: input.subject,
    body: input.body,
    message: `Email drafted to ${recipientName} (${recipientEmail}). Reply "yes" to send, "no" to cancel, or "edit" to modify.`,
  })
}

async function sendEmailViaGmail(to: string, subject: string, body: string): Promise<string> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const delegatedUser = process.env.GOOGLE_DELEGATED_USER
  if (!serviceAccountKey || !delegatedUser) {
    return 'Gmail not configured — GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_DELEGATED_USER required.'
  }

  const credentials = JSON.parse(serviceAccountKey)

  // Get access token via service account JWT
  const token = await getGoogleAccessToken(credentials, delegatedUser, [
    'https://www.googleapis.com/auth/gmail.send',
  ])

  // Build RFC 2822 email
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ]
  const rawEmail = Buffer.from(emailLines.join('\r\n')).toString('base64url')

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawEmail }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    return `Failed to send email: ${response.status} ${errBody}`
  }

  return `Email sent to ${to} with subject "${subject}".`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: create_calendar_event
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeCreateCalendarEvent(
  input: {
    title: string
    date: string
    time: string
    duration_minutes?: number
    attendees?: string[]
    location?: string
  },
  chatId?: number
): Promise<string> {
  const duration = input.duration_minutes || 60
  const startDateTime = `${input.date}T${input.time}:00`
  const endDateTime = new Date(new Date(startDateTime).getTime() + duration * 60000).toISOString()

  // Resolve attendee emails
  const attendeeEmails: string[] = []
  if (input.attendees) {
    for (const attendee of input.attendees) {
      if (attendee.includes('@')) {
        attendeeEmails.push(attendee)
      } else {
        const searchTerm = `%${attendee}%`
        const { data } = await supabase
          .from('ghl_contacts')
          .select('email')
          .ilike('full_name', searchTerm)
          .not('email', 'is', null)
          .limit(1)
          .maybeSingle()
        if (data?.email) attendeeEmails.push(data.email)
      }
    }
  }

  const eventSummary = {
    title: input.title,
    start: startDateTime,
    end: endDateTime,
    duration_minutes: duration,
    attendees: attendeeEmails,
    location: input.location,
  }

  // Store as pending action if in Telegram context
  if (chatId) {
    await savePendingAction(chatId, `Create calendar event: ${input.title}`, {
      type: 'create_calendar_event',
      params: eventSummary,
    })
  }

  const timeStr = new Date(startDateTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })

  return JSON.stringify({
    action: 'calendar_event',
    status: 'pending_confirmation',
    ...eventSummary,
    message: `Event: "${input.title}" on ${input.date} at ${timeStr} (${duration} min)${attendeeEmails.length ? `, with ${attendeeEmails.join(', ')}` : ''}${input.location ? ` at ${input.location}` : ''}. Reply "yes" to create, "no" to cancel, or "edit" to modify.`,
  })
}

async function createGoogleCalendarEvent(event: {
  title: string
  start: string
  end: string
  attendees?: string[]
  location?: string
}): Promise<string> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const delegatedUser = process.env.GOOGLE_DELEGATED_USER
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

  if (!serviceAccountKey || !delegatedUser) {
    return 'Google Calendar not configured — GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_DELEGATED_USER required.'
  }

  const credentials = JSON.parse(serviceAccountKey)
  const token = await getGoogleAccessToken(credentials, delegatedUser, [
    'https://www.googleapis.com/auth/calendar.events',
  ])

  const calendarEvent = {
    summary: event.title,
    start: {
      dateTime: event.start,
      timeZone: 'Australia/Brisbane',
    },
    end: {
      dateTime: event.end,
      timeZone: 'Australia/Brisbane',
    },
    ...(event.attendees?.length ? {
      attendees: event.attendees.map((email) => ({ email })),
    } : {}),
    ...(event.location ? { location: event.location } : {}),
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calendarEvent),
    }
  )

  if (!response.ok) {
    const errBody = await response.text()
    return `Failed to create event: ${response.status} ${errBody}`
  }

  const created = await response.json()
  return `Event "${event.title}" created. ${created.htmlLink || ''}`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: set_reminder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSetReminder(
  input: { message: string; time: string; recurring?: string },
  chatId?: number
): Promise<string> {
  if (!chatId) {
    return JSON.stringify({ error: 'Reminders require Telegram context (chatId).' })
  }

  let triggerAt: Date
  try {
    triggerAt = new Date(input.time)
    if (isNaN(triggerAt.getTime())) throw new Error('Invalid date')
  } catch {
    return JSON.stringify({
      error: `Could not parse time "${input.time}". Use ISO format like "2026-02-05T06:00:00+10:00".`,
    })
  }

  try {
    const { data, error } = await supabase.from('reminders').insert({
      chat_id: chatId,
      message: input.message,
      trigger_at: triggerAt.toISOString(),
      recurring: input.recurring || null,
    }).select().single()

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const timeStr = triggerAt.toLocaleString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Brisbane',
    })

    return JSON.stringify({
      action: 'reminder_set',
      id: data.id,
      message: input.message,
      trigger_at: triggerAt.toISOString(),
      recurring: input.recurring || 'one-off',
      confirmation: `Reminder set: "${input.message}" — ${timeStr}${input.recurring ? ` (${input.recurring})` : ''}.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: add_receipt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeAddReceipt(input: {
  vendor: string
  amount: number
  date: string
  category?: string
  notes?: string
}): Promise<string> {
  try {
    const { data, error } = await supabase.from('receipt_matches').insert({
      source_type: 'transaction',
      source_id: `telegram-${Date.now()}`,
      vendor_name: input.vendor,
      amount: input.amount,
      transaction_date: input.date,
      category: input.category || 'other',
      description: input.notes || `Added via Telegram`,
      status: 'pending',
      week_start: getWeekStart(input.date),
    }).select().single()

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    return JSON.stringify({
      action: 'receipt_added',
      id: data.id,
      vendor: input.vendor,
      amount: input.amount,
      date: input.date,
      category: input.category || 'other',
      confirmation: `Receipt logged: $${input.amount.toFixed(2)} at ${input.vendor} on ${input.date}.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_grant_opportunities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetGrantOpportunities(input: {
  status?: string
  limit?: number
}): Promise<string> {
  try {
    const result = await fetchGrantOpportunities(supabase, { status: input.status, limit: input.limit })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_grant_pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetGrantPipeline(input: {
  status?: string
}): Promise<string> {
  try {
    const result = await fetchGrantPipeline(supabase, { status: input.status })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_pending_receipts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetPendingReceipts(input: {
  limit?: number
}): Promise<string> {
  const limit = input.limit || 10

  try {
    const { data, error } = await supabase
      .from('receipt_matches')
      .select('id, vendor_name, amount, transaction_date, category, status, match_confidence, created_at')
      .in('status', ['pending', 'email_suggested'])
      .order('transaction_date', { ascending: false })
      .limit(limit)

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const now = new Date()
    const receipts = (data || []).map((r) => ({
      id: r.id,
      vendor: r.vendor_name || 'Unknown',
      amount: `$${Number(r.amount).toFixed(2)}`,
      date: r.transaction_date,
      category: r.category,
      status: r.status,
      match_confidence: r.match_confidence,
      days_pending: Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 86400000),
    }))

    const totalAmount = (data || []).reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0)

    return JSON.stringify({
      count: receipts.length,
      total_pending: `$${totalAmount.toFixed(2)}`,
      receipts,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: find_receipt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeFindReceipt(input: {
  vendor?: string
  amount?: number
  date?: string
  project_code?: string
}): Promise<string> {
  try {
    // Query all sources directly (same logic as receipt-finder API route)
    const dateRange = input.date ? (() => {
      const d = new Date(input.date!)
      const from = new Date(d); from.setDate(from.getDate() - 7)
      const to = new Date(d); to.setDate(to.getDate() + 7)
      return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }
    })() : null

    const results: string[] = []
    let totalMatches = 0

    // Search Gmail
    if (input.vendor) {
      let gmailQuery = supabase
        .from('communications')
        .select('subject, from_address, date, snippet, project_code')
        .or(`subject.ilike.%${input.vendor}%,from_address.ilike.%${input.vendor}%,snippet.ilike.%${input.vendor}%`)
        .order('date', { ascending: false })
        .limit(5)
      if (dateRange) gmailQuery = gmailQuery.gte('date', dateRange.from).lte('date', dateRange.to)
      const { data: emails } = await gmailQuery
      if (emails?.length) {
        results.push(`**Gmail (${emails.length}):**`)
        for (const e of emails) {
          const isReceipt = /receipt|invoice|order|confirm|payment|tax.invoice/i.test(e.subject || '')
          results.push(`  [${isReceipt ? 'high' : 'low'}] "${e.subject}" from ${e.from_address} (${e.date})`)
        }
        totalMatches += emails.length
      }
    }

    // Search calendar
    if (dateRange) {
      const { data: events } = await supabase
        .from('calendar_events')
        .select('title, start_time, location')
        .gte('start_time', dateRange.from)
        .lte('start_time', dateRange.to)
        .limit(10)
      const travelKeywords = /flight|hotel|travel|airport|qantas|virgin|uber|palm island|darwin|cairns|brisbane|sydney/i
      const relevant = (events || []).filter(e => {
        const text = `${e.title} ${e.location || ''}`
        return (input.vendor && text.toLowerCase().includes(input.vendor.toLowerCase())) || travelKeywords.test(text)
      })
      if (relevant.length) {
        results.push(`**Calendar (${relevant.length}):**`)
        for (const e of relevant.slice(0, 5)) {
          results.push(`  "${e.title}"${e.location ? ` at ${e.location}` : ''} on ${new Date(e.start_time).toLocaleDateString('en-AU')}`)
        }
        totalMatches += relevant.length
      }
    }

    // Search Xero bills (ACCPAY = receipts/invoices FROM suppliers)
    {
      let billQuery = supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, total, date, status, has_attachments')
        .eq('type', 'ACCPAY')
        .order('date', { ascending: false })
        .limit(10)
      if (input.vendor) billQuery = billQuery.ilike('contact_name', `%${input.vendor}%`)
      if (input.amount) {
        const tol = Math.abs(input.amount) * 0.1
        billQuery = billQuery.gte('total', Math.abs(input.amount) - tol).lte('total', Math.abs(input.amount) + tol)
      }
      if (dateRange) billQuery = billQuery.gte('date', dateRange.from).lte('date', dateRange.to)
      const { data: bills } = await billQuery
      if (bills?.length) {
        results.push(`**Xero Bills (${bills.length}):**`)
        for (const b of bills) {
          results.push(`  [${b.has_attachments ? 'has attachment' : 'NO attachment'}] ${b.invoice_number}: $${b.total.toFixed(2)} from ${b.contact_name} [${b.status}]`)
        }
        totalMatches += bills.length
      }
    }

    // Search bank transactions
    {
      let txQuery = supabase
        .from('xero_transactions')
        .select('contact_name, total, date, project_code, type')
        .order('date', { ascending: false })
        .limit(10)
      if (input.vendor) txQuery = txQuery.ilike('contact_name', `%${input.vendor}%`)
      if (input.amount) {
        const tol = Math.abs(input.amount) * 0.1
        const abs = Math.abs(input.amount)
        txQuery = txQuery.gte('total', -(abs + tol)).lte('total', abs + tol)
      }
      if (dateRange) txQuery = txQuery.gte('date', dateRange.from).lte('date', dateRange.to)
      if (input.project_code) txQuery = txQuery.eq('project_code', input.project_code)
      const { data: txns } = await txQuery
      if (txns?.length) {
        results.push(`**Bank Transactions (${txns.length}):**`)
        for (const t of txns) {
          results.push(`  ${t.type} $${Math.abs(t.total).toFixed(2)} — ${t.contact_name || 'Unknown'} on ${t.date} [${t.project_code || 'untagged'}]`)
        }
        totalMatches += txns.length
      }
    }

    // Search receipt pipeline
    {
      let rmQuery = supabase
        .from('receipt_matches')
        .select('vendor_name, amount, transaction_date, status, project_code')
        .order('transaction_date', { ascending: false })
        .limit(5)
      if (input.vendor) rmQuery = rmQuery.ilike('vendor_name', `%${input.vendor}%`)
      if (input.amount) {
        const tol = Math.abs(input.amount) * 0.1
        rmQuery = rmQuery.gte('amount', Math.abs(input.amount) - tol).lte('amount', Math.abs(input.amount) + tol)
      }
      const { data: rms } = await rmQuery
      if (rms?.length) {
        results.push(`**Receipt Pipeline (${rms.length}):**`)
        for (const r of rms) {
          results.push(`  $${r.amount?.toFixed(2)} ${r.vendor_name} [${r.status}] ${r.project_code || ''}`)
        }
        totalMatches += rms.length
      }
    }

    if (totalMatches === 0) {
      return `No matches found for ${[input.vendor, input.amount && `$${input.amount}`, input.date].filter(Boolean).join(', ')}. Try broadening the search (remove date or amount).`
    }

    return `Found ${totalMatches} matches:\n\n${results.join('\n')}`
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_quarterly_review
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getAustralianQuarter(date: Date): { quarter: number; fyStart: number; fyEnd: number } {
  const month = date.getMonth() // 0-based
  // Australian FY: Jul-Jun. Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
  if (month >= 6 && month <= 8) return { quarter: 1, fyStart: date.getFullYear(), fyEnd: date.getFullYear() + 1 }
  if (month >= 9 && month <= 11) return { quarter: 2, fyStart: date.getFullYear(), fyEnd: date.getFullYear() + 1 }
  if (month >= 0 && month <= 2) return { quarter: 3, fyStart: date.getFullYear() - 1, fyEnd: date.getFullYear() }
  return { quarter: 4, fyStart: date.getFullYear() - 1, fyEnd: date.getFullYear() }
}

function getQuarterDates(quarterStr?: string): { label: string; start: string; end: string; fyLabel: string; prevStart: string; prevEnd: string } {
  const now = new Date()
  let year: number
  let q: number

  if (quarterStr) {
    const match = quarterStr.match(/^(\d{4})-Q([1-4])$/i)
    if (match) {
      year = parseInt(match[1])
      q = parseInt(match[2])
    } else {
      const aq = getAustralianQuarter(now)
      year = aq.fyStart
      q = aq.quarter
    }
  } else {
    const aq = getAustralianQuarter(now)
    year = aq.fyStart
    q = aq.quarter
  }

  // Map quarter to date ranges (Australian FY)
  const ranges: Record<number, { start: string; end: string }> = {
    1: { start: `${year}-07-01`, end: `${year}-09-30` },
    2: { start: `${year}-10-01`, end: `${year}-12-31` },
    3: { start: `${year + 1}-01-01`, end: `${year + 1}-03-31` },
    4: { start: `${year + 1}-04-01`, end: `${year + 1}-06-30` },
  }

  const prevQ = q === 1 ? 4 : q - 1
  const prevYear = q === 1 ? year - 1 : year
  const prevRanges: Record<number, { start: string; end: string }> = {
    1: { start: `${prevYear}-07-01`, end: `${prevYear}-09-30` },
    2: { start: `${prevYear}-10-01`, end: `${prevYear}-12-31` },
    3: { start: `${prevYear + 1}-01-01`, end: `${prevYear + 1}-03-31` },
    4: { start: `${prevYear + 1}-04-01`, end: `${prevYear + 1}-06-30` },
  }

  return {
    label: `Q${q} FY${year}/${year + 1}`,
    start: ranges[q].start,
    end: ranges[q].end,
    fyLabel: `FY${year}/${year + 1}`,
    prevStart: prevRanges[prevQ].start,
    prevEnd: prevRanges[prevQ].end,
  }
}

async function executeGetQuarterlyReview(input: { quarter?: string; detail_level?: string }): Promise<string> {
  const qDates = getQuarterDates(input.quarter)

  try {
    // Run all queries in parallel
    const [
      incomeInvoices,
      expenseInvoices,
      prevIncomeInvoices,
      prevExpenseInvoices,
      outstandingInvoices,
      pendingReceipts,
      resolvedReceipts,
      activeSubscriptions,
      subscriptionAlerts,
      upcomingRenewals,
      transactions6m,
    ] = await Promise.all([
      // Income invoices (ACCREC) for the quarter
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_paid, amount_due, project_code, status')
        .eq('type', 'ACCREC')
        .gte('date', qDates.start)
        .lte('date', qDates.end),

      // Expense invoices (ACCPAY) for the quarter
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_paid, amount_due, project_code, status')
        .eq('type', 'ACCPAY')
        .gte('date', qDates.start)
        .lte('date', qDates.end),

      // Previous quarter income (for comparison)
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCREC')
        .gte('date', qDates.prevStart)
        .lte('date', qDates.prevEnd),

      // Previous quarter expenses (for comparison)
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCPAY')
        .gte('date', qDates.prevStart)
        .lte('date', qDates.prevEnd),

      // Outstanding invoices (all unpaid)
      supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, amount_due, due_date, type, status')
        .gt('amount_due', 0)
        .in('status', ['AUTHORISED', 'SENT'])
        .order('due_date', { ascending: true }),

      // Pending receipts
      supabase
        .from('receipt_matches')
        .select('id, vendor_name, amount, transaction_date, category, status, created_at')
        .in('status', ['pending', 'email_suggested']),

      // Resolved receipts this quarter
      supabase
        .from('receipt_matches')
        .select('id')
        .eq('status', 'resolved')
        .gte('transaction_date', qDates.start)
        .lte('transaction_date', qDates.end),

      // Active subscriptions
      supabase
        .from('subscriptions')
        .select('vendor, name, amount_aud, billing_cycle, category, status, renewal_date, value_rating')
        .eq('status', 'active')
        .order('amount_aud', { ascending: false }),

      // Subscription alerts
      supabase
        .from('v_subscription_alerts')
        .select('*')
        .limit(20),

      // Upcoming renewals (next 30 days)
      supabase
        .from('v_upcoming_renewals')
        .select('*')
        .limit(20),

      // Transactions for last 6 months (for cashflow trend)
      supabase
        .from('xero_transactions')
        .select('date, type, total, contact_name')
        .gte('date', getBrisbaneDateOffset(-180))
        .order('date', { ascending: true }),
    ])

    // ── Income & Expenses ──────────────────────────────────
    const incomeData = incomeInvoices.data || []
    const expenseData = expenseInvoices.data || []

    const totalIncome = incomeData.reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const totalExpenses = expenseData.reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const netProfit = totalIncome - totalExpenses

    // Income by source (top 15)
    const incomeBySource: Record<string, number> = {}
    for (const inv of incomeData) {
      const key = inv.contact_name || 'Unknown'
      incomeBySource[key] = (incomeBySource[key] || 0) + (parseFloat(String(inv.total)) || 0)
    }
    const topIncome = Object.entries(incomeBySource)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([contact, amount]) => ({ contact, amount: Math.round(amount * 100) / 100 }))

    // Expenses by vendor (top 15)
    const expensesByVendor: Record<string, number> = {}
    for (const inv of expenseData) {
      const key = inv.contact_name || 'Unknown'
      expensesByVendor[key] = (expensesByVendor[key] || 0) + (parseFloat(String(inv.total)) || 0)
    }
    const topExpenses = Object.entries(expensesByVendor)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([vendor, amount]) => ({ vendor, amount: Math.round(amount * 100) / 100 }))

    // Expenses by project
    const expensesByProject: Record<string, number> = {}
    for (const inv of expenseData) {
      const key = inv.project_code || 'Unallocated'
      expensesByProject[key] = (expensesByProject[key] || 0) + (parseFloat(String(inv.total)) || 0)
    }
    const topProjectExpenses = Object.entries(expensesByProject)
      .sort(([, a], [, b]) => b - a)
      .map(([project, amount]) => ({ project, amount: Math.round(amount * 100) / 100 }))

    // Previous quarter comparison
    const prevIncome = (prevIncomeInvoices.data || []).reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const prevExpenses = (prevExpenseInvoices.data || []).reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const incomeChangePct = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : null
    const expenseChangePct = prevExpenses > 0 ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 100) : null

    // ── BAS Summary ────────────────────────────────────────
    const g1TotalSales = totalIncome
    const g11NonCapitalPurchases = totalExpenses
    const label1aGstOnSales = Math.round((g1TotalSales / 11) * 100) / 100
    const label1bGstOnPurchases = Math.round((g11NonCapitalPurchases / 11) * 100) / 100
    const estimatedGstPayable = Math.round((label1aGstOnSales - label1bGstOnPurchases) * 100) / 100

    // ── Outstanding Invoices ───────────────────────────────
    const outstanding = outstandingInvoices.data || []
    const now = new Date()
    const totalOutstanding = outstanding.reduce((sum, i) => sum + (parseFloat(String(i.amount_due)) || 0), 0)

    const aging: Record<string, number> = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    const overdueItems: Array<{ invoice_number: string; contact: string; amount_due: number; days_overdue: number }> = []

    for (const inv of outstanding) {
      const dueDate = new Date(inv.due_date)
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / 86400000)
      const amountDue = parseFloat(String(inv.amount_due)) || 0

      if (daysOverdue <= 0) aging.current += amountDue
      else if (daysOverdue <= 30) aging['1-30'] += amountDue
      else if (daysOverdue <= 60) aging['31-60'] += amountDue
      else if (daysOverdue <= 90) aging['61-90'] += amountDue
      else aging['90+'] += amountDue

      if (daysOverdue > 0 && inv.type === 'ACCREC') {
        overdueItems.push({
          invoice_number: inv.invoice_number,
          contact: inv.contact_name,
          amount_due: amountDue,
          days_overdue: daysOverdue,
        })
      }
    }
    overdueItems.sort((a, b) => b.days_overdue - a.days_overdue)

    // ── Receipts ───────────────────────────────────────────
    const pending = pendingReceipts.data || []
    const pendingCount = pending.length
    const pendingTotal = pending.reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0)
    let oldestPendingDays = 0
    for (const r of pending) {
      const days = Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 86400000)
      if (days > oldestPendingDays) oldestPendingDays = days
    }
    const receiptsByCategory: Record<string, number> = {}
    for (const r of pending) {
      const cat = r.category || 'uncategorised'
      receiptsByCategory[cat] = (receiptsByCategory[cat] || 0) + 1
    }

    // ── Subscriptions ──────────────────────────────────────
    const subs = activeSubscriptions.data || []
    let monthlyTotal = 0
    let annualTotal = 0
    for (const sub of subs) {
      const amount = parseFloat(String(sub.amount_aud)) || 0
      if (sub.billing_cycle === 'monthly') {
        monthlyTotal += amount
        annualTotal += amount * 12
      } else if (sub.billing_cycle === 'yearly') {
        monthlyTotal += amount / 12
        annualTotal += amount
      } else if (sub.billing_cycle === 'quarterly') {
        monthlyTotal += amount / 3
        annualTotal += amount * 4
      }
    }

    const topSubCosts = subs.slice(0, 10).map((s) => ({
      vendor: s.vendor || s.name,
      monthly_amount: parseFloat(String(s.amount_aud)) || 0,
      category: s.category,
      billing_cycle: s.billing_cycle,
    }))

    // ── Cashflow Trend ─────────────────────────────────────
    const txns = transactions6m.data || []
    const monthlyMap: Record<string, { income: number; expenses: number }> = {}
    for (const t of txns) {
      const month = t.date?.substring(0, 7) // YYYY-MM
      if (!month) continue
      if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expenses: 0 }
      const amount = Math.abs(parseFloat(String(t.total)) || 0)
      if (t.type === 'RECEIVE') monthlyMap[month].income += amount
      else if (t.type === 'SPEND') monthlyMap[month].expenses += amount
    }
    const monthlyTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        net: Math.round((data.income - data.expenses) * 100) / 100,
      }))

    const avgIncome = monthlyTrend.length > 0
      ? monthlyTrend.reduce((sum, m) => sum + m.income, 0) / monthlyTrend.length
      : 0
    const avgExpenses = monthlyTrend.length > 0
      ? monthlyTrend.reduce((sum, m) => sum + m.expenses, 0) / monthlyTrend.length
      : 0

    // ── Issue Detection ────────────────────────────────────
    const issues: Array<{ type: string; severity: string; detail: string }> = []

    // Overdue invoices > 30 days
    const overdue30 = overdueItems.filter((i) => i.days_overdue > 30)
    if (overdue30.length > 0) {
      const totalOverdue30 = overdue30.reduce((sum, i) => sum + i.amount_due, 0)
      issues.push({
        type: 'overdue_invoices',
        severity: 'high',
        detail: `${overdue30.length} invoices overdue >30 days, totalling $${totalOverdue30.toFixed(2)}`,
      })
    }

    // Large outstanding amounts
    if (totalOutstanding > 5000) {
      issues.push({
        type: 'large_outstanding',
        severity: 'high',
        detail: `$${totalOutstanding.toFixed(2)} total outstanding across ${outstanding.length} invoices`,
      })
    }

    // Pending receipts > 14 days
    const staleReceipts = pending.filter(
      (r) => Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 86400000) > 14
    )
    if (staleReceipts.length > 0) {
      issues.push({
        type: 'stale_receipts',
        severity: 'medium',
        detail: `${staleReceipts.length} receipts pending >14 days (oldest: ${oldestPendingDays} days)`,
      })
    }

    // Subscriptions renewing soon
    const renewals = upcomingRenewals.data || []
    const urgentRenewals = renewals.filter((r) => {
      const daysUntil = r.renewal_date
        ? Math.ceil((new Date(r.renewal_date).getTime() - now.getTime()) / 86400000)
        : 999
      return daysUntil <= 7
    })
    if (urgentRenewals.length > 0) {
      issues.push({
        type: 'upcoming_renewals',
        severity: 'medium',
        detail: `${urgentRenewals.length} subscriptions renewing within 7 days`,
      })
    }

    // Subscription alerts
    const alerts = subscriptionAlerts.data || []
    if (alerts.length > 0) {
      issues.push({
        type: 'subscription_alerts',
        severity: 'medium',
        detail: `${alerts.length} subscription alerts (missed payments, price changes, etc.)`,
      })
    }

    // Expenses exceeding income
    if (totalExpenses > totalIncome && totalIncome > 0) {
      issues.push({
        type: 'expenses_exceed_income',
        severity: 'high',
        detail: `Expenses ($${totalExpenses.toFixed(2)}) exceed income ($${totalIncome.toFixed(2)}) by $${(totalExpenses - totalIncome).toFixed(2)}`,
      })
    }

    // Unusual vendor spending (>50% increase vs previous quarter)
    if (prevExpenses > 0) {
      // Check at vendor level by comparing current vs previous quarter
      // (simplified: flag if overall expenses jumped >50%)
      if (expenseChangePct !== null && expenseChangePct > 50) {
        issues.push({
          type: 'spending_spike',
          severity: 'low',
          detail: `Total expenses increased ${expenseChangePct}% vs previous quarter`,
        })
      }
    }

    // Summary mode: headline numbers + issues only (~200 tokens vs ~2000)
    if (input.detail_level === 'summary') {
      return JSON.stringify({
        quarter: qDates.label,
        income: Math.round(totalIncome * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        vs_prev: { income_pct: incomeChangePct, expenses_pct: expenseChangePct },
        gst_payable: estimatedGstPayable,
        outstanding: Math.round(totalOutstanding * 100) / 100,
        pending_receipts: pendingCount,
        subscriptions_monthly: Math.round(monthlyTotal * 100) / 100,
        issues,
      })
    }

    return JSON.stringify({
      quarter: {
        label: qDates.label,
        start_date: qDates.start,
        end_date: qDates.end,
        fy_label: qDates.fyLabel,
      },
      income_expenses: {
        total_income: Math.round(totalIncome * 100) / 100,
        total_expenses: Math.round(totalExpenses * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        income_by_source: topIncome,
        expenses_by_vendor: topExpenses,
        expenses_by_project: topProjectExpenses,
        vs_previous_quarter: {
          income_change_pct: incomeChangePct,
          expenses_change_pct: expenseChangePct,
        },
      },
      bas_summary: {
        g1_total_sales: Math.round(g1TotalSales * 100) / 100,
        g11_non_capital_purchases: Math.round(g11NonCapitalPurchases * 100) / 100,
        label_1a_gst_on_sales: label1aGstOnSales,
        label_1b_gst_on_purchases: label1bGstOnPurchases,
        estimated_gst_payable: estimatedGstPayable,
        note: 'Estimates from Xero invoice totals. Verify against Xero BAS report.',
        invoice_count: { receivable: incomeData.length, payable: expenseData.length },
      },
      outstanding_invoices: {
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        by_aging: Object.fromEntries(
          Object.entries(aging).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
        overdue_items: overdueItems.slice(0, 10),
      },
      receipts: {
        pending_count: pendingCount,
        pending_total: Math.round(pendingTotal * 100) / 100,
        oldest_pending_days: oldestPendingDays,
        by_category: receiptsByCategory,
        resolved_this_quarter: (resolvedReceipts.data || []).length,
      },
      subscriptions: {
        active_count: subs.length,
        monthly_total: Math.round(monthlyTotal * 100) / 100,
        annual_total: Math.round(annualTotal * 100) / 100,
        top_costs: topSubCosts,
        upcoming_renewals: (renewals).slice(0, 5),
        alerts: (alerts).slice(0, 5),
      },
      cashflow: {
        monthly_trend: monthlyTrend,
        avg_monthly_income: Math.round(avgIncome * 100) / 100,
        avg_monthly_expenses: Math.round(avgExpenses * 100) / 100,
        months_of_runway: avgExpenses > avgIncome && avgExpenses > 0
          ? null
          : undefined,
      },
      issues,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_xero_transactions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetXeroTransactions(input: {
  type?: string
  vendor?: string
  project_code?: string
  start_date?: string
  end_date?: string
  min_amount?: number
  limit?: number
}): Promise<string> {
  const limit = input.limit || 25
  const endDate = input.end_date || getBrisbaneDate()
  const startDate = input.start_date || getBrisbaneDateOffset(-90)

  try {
    let query = supabase
      .from('xero_transactions')
      .select('date, type, contact_name, bank_account, project_code, total, line_items, has_attachments')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(limit)

    if (input.type) {
      query = query.eq('type', input.type.toUpperCase())
    }
    if (input.vendor) {
      query = query.ilike('contact_name', `%${input.vendor}%`)
    }
    if (input.project_code) {
      query = query.eq('project_code', input.project_code.toUpperCase())
    }
    if (input.min_amount) {
      query = query.gte('total', input.min_amount)
    }

    const { data, error } = await query

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const transactions = (data || []).map((t) => {
      // Extract line items summary from JSONB
      let lineItemsSummary = ''
      if (t.line_items && Array.isArray(t.line_items)) {
        const items = t.line_items as Array<{ Description?: string; description?: string }>
        const first = items[0]
        const desc = first?.Description || first?.description || ''
        lineItemsSummary = desc
        if (items.length > 1) lineItemsSummary += ` (+${items.length - 1} more)`
      }

      return {
        date: t.date,
        type: t.type,
        contact_name: t.contact_name,
        bank_account: t.bank_account,
        project_code: t.project_code,
        total: parseFloat(String(t.total)) || 0,
        has_attachments: t.has_attachments || false,
        line_items_summary: lineItemsSummary,
      }
    })

    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.total), 0)

    return JSON.stringify({
      filters: {
        type: input.type || 'all',
        vendor: input.vendor || null,
        project_code: input.project_code || null,
        date_range: { start: startDate, end: endDate },
        min_amount: input.min_amount || null,
      },
      count: transactions.length,
      total_amount: Math.round(totalAmount * 100) / 100,
      transactions,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_day_context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetDayContext(input: { date?: string }): Promise<string> {
  const date = input.date || getBrisbaneDate()

  try {
    const [calendar, comms, knowledge, actions] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('title, start_time, end_time, location, attendees')
        .gte('start_time', `${date}T00:00:00Z`)
        .lte('start_time', `${date}T23:59:59Z`)
        .order('start_time'),
      supabase
        .from('communications_history')
        .select('contact_name, direction, channel, subject, ai_summary')
        .gte('created_at', `${date}T00:00:00Z`)
        .lte('created_at', `${date}T23:59:59Z`)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('project_knowledge')
        .select('project_code, knowledge_type, title, summary, participants')
        .gte('recorded_at', `${date}T00:00:00Z`)
        .lte('recorded_at', `${date}T23:59:59Z`)
        .order('recorded_at', { ascending: false })
        .limit(20),
      supabase
        .from('project_knowledge')
        .select('project_code, title, action_items')
        .eq('action_required', true)
        .gte('recorded_at', `${date}T00:00:00Z`)
        .lte('recorded_at', `${date}T23:59:59Z`),
    ])

    return JSON.stringify({
      date,
      calendar_events: calendar.data || [],
      communications: comms.data || [],
      knowledge_entries: knowledge.data || [],
      action_items: actions.data || [],
      stats: {
        meetings: (calendar.data || []).length,
        communications: (comms.data || []).length,
        knowledge_entries: (knowledge.data || []).length,
        actions_created: (actions.data || []).length,
      },
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: save_daily_reflection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSaveDailyReflection(
  input: {
    voice_transcript: string
    lcaa_listen: string
    lcaa_curiosity: string
    lcaa_action: string
    lcaa_art: string
    loop_to_tomorrow?: string
    gratitude?: string[]
    challenges?: string[]
    learnings?: string[]
    intentions?: string[]
  },
  chatId?: number
): Promise<string> {
  if (!chatId) return JSON.stringify({ error: 'Reflections require Telegram context.' })

  const today = getBrisbaneDate()

  try {
    // Gather day stats for enrichment
    const [calResult, commsResult, knowledgeResult] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('id', { count: 'exact', head: true })
        .gte('start_time', `${today}T00:00:00Z`)
        .lte('start_time', `${today}T23:59:59Z`),
      supabase
        .from('communications_history')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`),
      supabase
        .from('project_knowledge')
        .select('id', { count: 'exact', head: true })
        .gte('recorded_at', `${today}T00:00:00Z`),
    ])

    const dayStats = {
      meetings: calResult.count || 0,
      communications: commsResult.count || 0,
      knowledge_entries: knowledgeResult.count || 0,
    }

    // Upsert (allow updating today's reflection)
    const { data, error } = await supabase
      .from('daily_reflections')
      .upsert(
        {
          chat_id: chatId,
          reflection_date: today,
          voice_transcript: input.voice_transcript,
          lcaa_listen: input.lcaa_listen,
          lcaa_curiosity: input.lcaa_curiosity,
          lcaa_action: input.lcaa_action,
          lcaa_art: input.lcaa_art,
          loop_to_tomorrow: input.loop_to_tomorrow || null,
          gratitude: input.gratitude || [],
          challenges: input.challenges || [],
          learnings: input.learnings || [],
          intentions: input.intentions || [],
          day_stats: dayStats,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'chat_id,reflection_date' }
      )
      .select()
      .single()

    if (error) return JSON.stringify({ error: error.message })

    return JSON.stringify({
      action: 'reflection_saved',
      id: data.id,
      date: today,
      day_stats: dayStats,
      confirmation: `Reflection saved for ${today}. Your LCAA loop is complete.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_past_reflections
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSearchPastReflections(input: {
  query?: string
  days?: number
  limit?: number
}): Promise<string> {
  const days = input.days || 30
  const limit = input.limit || 7
  const lookback = getBrisbaneDateOffset(-days)

  try {
    let query = supabase
      .from('daily_reflections')
      .select(
        'id, reflection_date, lcaa_listen, lcaa_curiosity, lcaa_action, lcaa_art, loop_to_tomorrow, gratitude, challenges, learnings, intentions, day_stats'
      )
      .gte('reflection_date', lookback)
      .order('reflection_date', { ascending: false })
      .limit(limit)

    if (input.query) {
      const searchTerm = `%${input.query}%`
      query = query.or(
        `lcaa_listen.ilike.${searchTerm},lcaa_curiosity.ilike.${searchTerm},lcaa_action.ilike.${searchTerm},lcaa_art.ilike.${searchTerm},loop_to_tomorrow.ilike.${searchTerm},voice_transcript.ilike.${searchTerm}`
      )
    }

    const { data, error } = await query

    if (error) return JSON.stringify({ error: error.message })

    const reflections = (data || []).map((r) => ({
      id: r.id,
      date: r.reflection_date,
      listen: r.lcaa_listen,
      curiosity: r.lcaa_curiosity,
      action: r.lcaa_action,
      art: r.lcaa_art,
      loop: r.loop_to_tomorrow,
      gratitude: r.gratitude,
      challenges: r.challenges,
      learnings: r.learnings,
      intentions: r.intentions,
      day_stats: r.day_stats,
    }))

    return JSON.stringify({
      query: input.query || '(all recent)',
      lookback_days: days,
      count: reflections.length,
      reflections,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// Google auth + cost tracking extracted to ./tool-helpers.ts

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIRMED ACTION EXECUTOR (for pending actions from Supabase)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeConfirmedAction(action: SerializablePendingAction): Promise<string> {
  switch (action.type) {
    case 'draft_email': {
      const { to, subject, body } = action.params as { to: string; subject: string; body: string }
      return await sendEmailViaGmail(to, subject, body)
    }
    case 'create_calendar_event': {
      const event = action.params as { title: string; start: string; end: string; attendees?: string[]; location?: string }
      return await createGoogleCalendarEvent(event)
    }
    default:
      return `Unknown action type: ${action.type}`
  }
}

// TOOL: save_writing_draft
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSaveWritingDraft(input: {
  title: string
  content: string
  append?: boolean
  project?: string
  tags?: string[]
}): Promise<string> {
  const { title, content, append, project, tags } = input

  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) {
    return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })
  }

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'

  // Generate filename from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
  const date = getBrisbaneDate()
  const filename = `${date}-${slug}.md`
  const filepath = `thoughts/writing/drafts/${filename}`

  // Build markdown content
  const now = getBrisbaneNow().toISOString()
  const projectLine = project ? `\nproject: "${project}"` : ''
  const tagLine = tags?.length ? `\ntags: [${tags.map(t => `"${t}"`).join(', ')}]` : ''

  let fileContent: string
  let commitMessage: string
  let sha: string | undefined

  if (append) {
    // Try to find existing file by slug (any date prefix)
    try {
      const searchRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/thoughts/writing/drafts`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (searchRes.ok) {
        const files = await searchRes.json()
        const match = files.find((f: { name: string }) => f.name.endsWith(`${slug}.md`))
        if (match) {
          const fileRes = await fetch(match.url, {
            headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
          })
          if (fileRes.ok) {
            const fileData = await fileRes.json()
            sha = fileData.sha
            const existing = Buffer.from(fileData.content, 'base64').toString('utf-8')
            fileContent = `${existing}\n\n---\n\n*Appended ${now}*\n\n${content}`
            commitMessage = `writing: append to "${title}"`
          } else {
            fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
            commitMessage = `writing: new draft "${title}"`
          }
        } else {
          fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
          commitMessage = `writing: new draft "${title}"`
        }
      } else {
        fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
        commitMessage = `writing: new draft "${title}"`
      }
    } catch {
      fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
      commitMessage = `writing: new draft "${title}"`
    }
  } else {
    fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
    commitMessage = `writing: new draft "${title}"`
    // Check if file already exists — need SHA for overwrites
    try {
      const existRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (existRes.ok) {
        const existData = await existRes.json()
        sha = existData.sha
      }
    } catch {
      // File doesn't exist yet, no SHA needed
    }
  }

  // Commit via GitHub API
  try {
    const body: Record<string, unknown> = {
      message: commitMessage,
      content: Buffer.from(fileContent).toString('base64'),
      branch,
    }
    if (sha) body.sha = sha

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!putRes.ok) {
      const err = await putRes.text()
      return JSON.stringify({ error: `GitHub API error: ${putRes.status} ${err}` })
    }

    const result = await putRes.json()
    return JSON.stringify({
      saved: true,
      path: filepath,
      url: result.content?.html_url,
      message: `Draft "${title}" saved to ${filepath} and pushed to git. Pull on your laptop to start editing.`,
    })
  } catch (err) {
    return JSON.stringify({ error: `Failed to save draft: ${(err as Error).message}` })
  }
}

function buildNewDraft(title: string, content: string, created: string, projectLine: string, tagLine: string): string {
  return `---
title: "${title}"
created: ${created}
status: draft${projectLine}${tagLine}
---

# ${title}

${content}
`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: save_planning_doc
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSavePlanningDoc(input: {
  horizon: string
  title: string
  content: string
  append?: boolean
  project?: string
}): Promise<string> {
  const { horizon, title, content, append, project } = input

  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) {
    return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })
  }

  const validHorizons = ['daily', 'weekly', 'yearly', 'decade']
  if (!validHorizons.includes(horizon)) {
    return JSON.stringify({ error: `Invalid horizon "${horizon}". Use: ${validHorizons.join(', ')}` })
  }

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'

  // Generate filename
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
  const date = getBrisbaneDate()
  const filename = `${date}-${slug}.md`
  const filepath = `thoughts/planning/${horizon}/${filename}`

  // Build frontmatter
  const now = getBrisbaneNow().toISOString()
  const projectLine = project ? `\nproject: "${project}"` : ''
  const horizonTemplates: Record<string, string> = {
    daily: 'type: daily-plan\nreview_cadence: daily',
    weekly: 'type: weekly-plan\nreview_cadence: weekly',
    yearly: 'type: yearly-goals\nreview_cadence: quarterly',
    decade: 'type: decade-vision\nreview_cadence: yearly',
  }

  let fileContent: string
  let commitMessage: string
  let sha: string | undefined

  if (append) {
    // Try to find existing file by slug
    try {
      const searchRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/thoughts/planning/${horizon}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (searchRes.ok) {
        const files = await searchRes.json()
        const match = (files as { name: string; url: string }[]).find((f) => f.name.endsWith(`${slug}.md`))
        if (match) {
          const fileRes = await fetch(match.url, {
            headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
          })
          if (fileRes.ok) {
            const fileData = await fileRes.json()
            sha = fileData.sha
            const existing = Buffer.from(fileData.content, 'base64').toString('utf-8')
            fileContent = `${existing}\n\n---\n\n*Updated ${now}*\n\n${content}`
            commitMessage = `planning(${horizon}): update "${title}"`
          } else {
            fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
            commitMessage = `planning(${horizon}): new "${title}"`
          }
        } else {
          fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
          commitMessage = `planning(${horizon}): new "${title}"`
        }
      } else {
        fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
        commitMessage = `planning(${horizon}): new "${title}"`
      }
    } catch {
      fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
      commitMessage = `planning(${horizon}): new "${title}"`
    }
  } else {
    fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
    commitMessage = `planning(${horizon}): new "${title}"`
    // Check if file already exists to get SHA (avoids 422 conflict)
    try {
      const existRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}?ref=${branch}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (existRes.ok) {
        const existData = await existRes.json()
        sha = existData.sha
        commitMessage = `planning(${horizon}): overwrite "${title}"`
      }
    } catch { /* new file, no sha needed */ }
  }

  // Commit via GitHub API
  try {
    const body: Record<string, unknown> = {
      message: commitMessage,
      content: Buffer.from(fileContent).toString('base64'),
      branch,
    }
    if (sha) body.sha = sha

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!putRes.ok) {
      const err = await putRes.text()
      return JSON.stringify({ error: `GitHub API error: ${putRes.status} ${err}` })
    }

    const result = await putRes.json()
    return JSON.stringify({
      saved: true,
      horizon,
      path: filepath,
      url: result.content?.html_url,
      message: `${horizon} plan "${title}" saved to ${filepath}. Syncs to Obsidian within 60 seconds.`,
    })
  } catch (err) {
    return JSON.stringify({ error: `Failed to save planning doc: ${(err as Error).message}` })
  }
}

function buildPlanningDoc(title: string, content: string, created: string, horizon: string, typeBlock: string, projectLine: string): string {
  return `---
title: "${title}"
created: ${created}
${typeBlock}
status: active${projectLine}
---

# ${title}

${content}
`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: move_writing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeMoveWriting(input: {
  title_search?: string
  from_stage?: string
  to_stage: string
}): Promise<string> {
  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'
  const fromStage = input.from_stage || 'drafts'
  const toStage = input.to_stage
  const basePath = 'thoughts/writing'

  if (fromStage === toStage) return JSON.stringify({ error: 'from_stage and to_stage must be different' })

  // List files in the source stage
  const listRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${basePath}/${fromStage}?ref=${branch}`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
  )

  if (!listRes.ok) return JSON.stringify({ error: `Could not list ${fromStage}: ${listRes.status}` })

  const files = (await listRes.json()) as Array<{ name: string; path: string; sha: string; download_url: string }>
  const mdFiles = files.filter((f) => f.name.endsWith('.md'))

  if (!input.title_search) {
    return JSON.stringify({
      stage: fromStage,
      files: mdFiles.map((f) => f.name),
      hint: 'Provide a title_search to move a specific piece.',
    })
  }

  const search = input.title_search.toLowerCase()
  const match = mdFiles.find((f) => f.name.toLowerCase().includes(search))
  if (!match) {
    return JSON.stringify({
      error: `No file matching "${input.title_search}" in ${fromStage}/`,
      available: mdFiles.map((f) => f.name),
    })
  }

  // Read the file content
  const fileRes = await fetch(match.download_url)
  if (!fileRes.ok) return JSON.stringify({ error: `Could not read ${match.name}` })
  const content = await fileRes.text()

  // Update frontmatter status
  const updatedContent = content.replace(
    /^(status:\s*).*$/m,
    `$1${toStage === 'published' ? 'published' : toStage === 'in-progress' ? 'in-progress' : 'draft'}`
  )

  // Create file in target stage
  const newPath = `${basePath}/${toStage}/${match.name}`
  const createRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${newPath}`,
    {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `writing: move "${match.name}" from ${fromStage} to ${toStage}`,
        content: Buffer.from(updatedContent).toString('base64'),
        branch,
      }),
    }
  )
  if (!createRes.ok) {
    const err = await createRes.text()
    return JSON.stringify({ error: `Failed to create in ${toStage}: ${err}` })
  }

  // Delete from source stage
  const deleteRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${match.path}`,
    {
      method: 'DELETE',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `writing: remove "${match.name}" from ${fromStage} (moved to ${toStage})`,
        sha: match.sha,
        branch,
      }),
    }
  )
  if (!deleteRes.ok) {
    return JSON.stringify({ moved_to: newPath, warning: 'File created in target but failed to delete from source — may be duplicated.' })
  }

  return JSON.stringify({
    moved: true,
    file: match.name,
    from: `${basePath}/${fromStage}/`,
    to: `${basePath}/${toStage}/`,
    message: `Moved "${match.name}" from ${fromStage} → ${toStage}. Syncs to Obsidian within 60 seconds.`,
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: review_planning_period
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeReviewPlanningPeriod(input: {
  period: string
  date?: string
}): Promise<string> {
  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'

  const refDate = input.date ? new Date(input.date) : getBrisbaneNow()

  // Determine which folder to read and date range
  let folder: string
  let startDate: Date
  let endDate: Date

  if (input.period === 'week') {
    folder = 'thoughts/planning/daily'
    // Get Monday of the week
    const day = refDate.getDay()
    const monday = new Date(refDate)
    monday.setDate(refDate.getDate() - (day === 0 ? 6 : day - 1))
    startDate = monday
    endDate = new Date(monday)
    endDate.setDate(monday.getDate() + 6)
  } else if (input.period === 'month') {
    folder = 'thoughts/planning/weekly'
    startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
    endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0)
  } else if (input.period === 'year') {
    folder = 'thoughts/reviews/monthly'
    startDate = new Date(refDate.getFullYear(), 0, 1)
    endDate = new Date(refDate.getFullYear(), 11, 31)
  } else {
    return JSON.stringify({ error: 'Invalid period. Use: week, month, year' })
  }

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  // List files in the folder
  const listRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${folder}?ref=${branch}`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
  )

  if (!listRes.ok) {
    return JSON.stringify({
      period: input.period,
      range: `${startStr} to ${endStr}`,
      documents: [],
      message: `No ${input.period === 'week' ? 'daily' : input.period === 'month' ? 'weekly' : 'monthly'} plans found yet. Start by saving some!`,
    })
  }

  const files = (await listRes.json()) as Array<{ name: string; download_url: string }>
  const mdFiles = files.filter((f) => f.name.endsWith('.md'))

  // Filter files by date range (files are named YYYY-MM-DD-slug.md)
  const dateRegex = /^(\d{4}-\d{2}-\d{2})/
  const inRange = mdFiles.filter((f) => {
    const match = f.name.match(dateRegex)
    if (!match) return false
    return match[1] >= startStr && match[1] <= endStr
  })

  // Read contents of matching files
  const contents: Array<{ name: string; date: string; content: string }> = []
  for (const file of inRange.slice(0, 15)) {
    try {
      const res = await fetch(file.download_url)
      if (res.ok) {
        const text = await res.text()
        const dateMatch = file.name.match(dateRegex)
        contents.push({
          name: file.name,
          date: dateMatch ? dateMatch[1] : 'unknown',
          content: text.slice(0, 2000), // Cap per doc to manage tokens
        })
      }
    } catch { /* skip failed reads */ }
  }

  return JSON.stringify({
    period: input.period,
    range: `${startStr} to ${endStr}`,
    document_count: contents.length,
    documents: contents,
    instruction: `Synthesize these ${contents.length} ${input.period === 'week' ? 'daily' : input.period === 'month' ? 'weekly' : 'monthly'} plans into a ${input.period}ly review. Highlight: what was accomplished, what rolled over, themes, and intentions for next ${input.period}.`,
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: moon_cycle_review
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeMoonCycleReview(input: {
  month?: string
  focus?: string
}): Promise<string> {
  const now = getBrisbaneNow()
  const monthStr = input.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [yearNum, monthNum] = monthStr.split('-').map(Number)
  const startDate = `${monthStr}-01`
  const endDate = new Date(yearNum, monthNum, 0).toISOString().split('T')[0]
  const focus = input.focus || 'full'

  const sections: Record<string, unknown> = {
    month: monthStr,
    period: `${startDate} to ${endDate}`,
  }

  // Financial health
  if (focus === 'full' || focus === 'financial') {
    const [income, expenses, outstanding, subs] = await Promise.all([
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCREC')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCPAY')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('xero_invoices')
        .select('amount_due')
        .gt('amount_due', 0)
        .in('status', ['AUTHORISED', 'SENT']),
      supabase
        .from('subscriptions')
        .select('amount_aud, billing_cycle')
        .eq('status', 'active'),
    ])

    const totalIncome = (income.data || []).reduce((s, i) => s + (parseFloat(String(i.total)) || 0), 0)
    const totalExpenses = (expenses.data || []).reduce((s, i) => s + (parseFloat(String(i.total)) || 0), 0)
    const totalOutstanding = (outstanding.data || []).reduce((s, i) => s + (parseFloat(String(i.amount_due)) || 0), 0)
    let monthlySubBurn = 0
    for (const sub of subs.data || []) {
      const amt = parseFloat(String(sub.amount_aud)) || 0
      if (sub.billing_cycle === 'monthly') monthlySubBurn += amt
      else if (sub.billing_cycle === 'yearly') monthlySubBurn += amt / 12
      else if (sub.billing_cycle === 'quarterly') monthlySubBurn += amt / 3
    }

    sections.financial = {
      income: Math.round(totalIncome * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      net: Math.round((totalIncome - totalExpenses) * 100) / 100,
      outstanding: Math.round(totalOutstanding * 100) / 100,
      subscription_burn: Math.round(monthlySubBurn * 100) / 100,
    }
  }

  // Relationship health
  if (focus === 'full' || focus === 'relationships') {
    const [activeContacts, staleContacts, recentComms] = await Promise.all([
      supabase
        .from('ghl_contacts')
        .select('id')
        .in('engagement_status', ['active', 'prospect']),
      supabase
        .from('ghl_contacts')
        .select('full_name, company_name, last_contact_date')
        .in('engagement_status', ['active', 'prospect'])
        .lt('last_contact_date', new Date(now.getTime() - 30 * 86400000).toISOString())
        .order('last_contact_date', { ascending: true })
        .limit(10),
      supabase
        .from('communications')
        .select('id')
        .gte('created_at', startDate)
        .lte('created_at', endDate),
    ])

    sections.relationships = {
      active_contacts: (activeContacts.data || []).length,
      going_cold: (staleContacts.data || []).length,
      coldest: (staleContacts.data || []).slice(0, 5).map((c) => ({
        name: c.full_name,
        company: c.company_name,
        last_contact: c.last_contact_date,
      })),
      communications_this_month: (recentComms.data || []).length,
    }
  }

  // Project health
  if (focus === 'full' || focus === 'projects') {
    const [projectActivity, recentKnowledge] = await Promise.all([
      supabase
        .from('project_knowledge')
        .select('project_code')
        .gte('recorded_at', startDate)
        .lte('recorded_at', endDate),
      supabase
        .from('project_knowledge')
        .select('project_code, title, knowledge_type')
        .gte('recorded_at', startDate)
        .order('recorded_at', { ascending: false })
        .limit(20),
    ])

    const counts: Record<string, number> = {}
    for (const row of projectActivity.data || []) {
      counts[row.project_code] = (counts[row.project_code] || 0) + 1
    }

    sections.projects = {
      activity_by_project: Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([code, count]) => ({ code, activity: count })),
      recent_highlights: (recentKnowledge.data || []).slice(0, 10).map((k) => ({
        project: k.project_code,
        title: k.title,
        type: k.knowledge_type,
      })),
    }
  }

  // Wellbeing — reflections summary
  if (focus === 'full' || focus === 'wellbeing') {
    const reflections = await supabase
      .from('daily_reflections')
      .select('date, gratitude, challenges, learnings, lcaa_listen, lcaa_art')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(31)

    const refData = reflections.data || []
    sections.wellbeing = {
      reflections_logged: refData.length,
      themes: {
        gratitude_samples: refData.slice(0, 3).map((r) => r.gratitude).filter(Boolean),
        challenge_samples: refData.slice(0, 3).map((r) => r.challenges).filter(Boolean),
        learning_samples: refData.slice(0, 3).map((r) => r.learnings).filter(Boolean),
      },
    }
  }

  sections.instruction = `You have the month's data. Write a reflective moon cycle review with the user. Cover: what grew, what needs attention, what to release, and intentions for next month. Use a warm, spacious tone — this is reflection, not reporting. Save the final piece using save_planning_doc with horizon "monthly" or save_writing_draft.`

  return JSON.stringify(sections)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_goods_intelligence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetGoodsIntelligence(input: { focus: string }): Promise<string> {
  const { focus } = input

  if (focus === 'newsletter_plan') {
    // Get unused/least-used content
    const { data: content } = await supabase
      .from('goods_content_library')
      .select('*')
      .not('analyzed_at', 'is', null)
      .order('times_used_newsletter', { ascending: true })
      .order('published_at', { ascending: false })
      .limit(8)

    // Get audience breakdown
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags, newsletter_consent')
      .contains('tags', ['goods'])

    const c = contacts || []
    const subscribers = c.filter(x => x.newsletter_consent && x.tags?.includes('goods-newsletter')).length
    const funders = c.filter(x => x.tags?.includes('goods-funder')).length
    const partners = c.filter(x => x.tags?.includes('goods-partner')).length
    const community = c.filter(x => x.tags?.includes('goods-community')).length
    const supporters = c.filter(x => x.tags?.includes('goods-supporter')).length

    const stories = (content || []).filter(c => c.content_type === 'story')
    const articles = (content || []).filter(c => c.content_type === 'article')
    const featured = stories[0] || (content || [])[0]

    let result = `## Newsletter Plan\n\n`
    result += `**Audience:** ${subscribers} newsletter subscribers (${funders} funders, ${partners} partners, ${community} community, ${supporters} supporters)\n\n`

    if (featured) {
      result += `### Recommended Featured Story\n`
      result += `**"${featured.title}"** (${featured.content_type})\n`
      if (featured.storyteller_name) result += `By ${featured.storyteller_name}\n`
      result += `${featured.key_message || featured.excerpt || ''}\n`
      result += `Tone: ${featured.emotional_tone || 'N/A'} | Topics: ${(featured.topics || []).join(', ')}\n`
      result += `Used in newsletters: ${featured.times_used_newsletter} times\n\n`
    }

    if (content && content.length > 1) {
      result += `### More Content Available\n`
      for (const item of content.slice(1, 5)) {
        result += `- **"${item.title}"** (${item.content_type}) — ${item.key_message || item.excerpt?.substring(0, 100) || 'No summary'}\n`
      }
      result += `\n`
    }

    result += `### Suggested Approach\n`
    if (funders > 0 && stories.length > 0) {
      result += `- Lead with "${featured?.title}" — impact stories resonate with funders\n`
    }
    if (articles.length > 0) {
      result += `- Include an article for depth: "${articles[0].title}"\n`
    }
    result += `- Build and send the newsletter in GHL (Marketing → Email Templates)\n`
    result += `- Filter by tag: goods-newsletter\n`
    result += `- Run \`node scripts/prepare-goods-newsletter.mjs\` for AI-generated copy suggestions\n`

    return result

  } else if (focus === 'outreach') {
    // Get contacts needing attention
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('id, full_name, first_name, last_name, email, tags, last_contact_date, created_at')
      .contains('tags', ['goods'])
      .order('last_contact_date', { ascending: true, nullsFirst: true })
      .limit(50)

    // Get content for pairing
    const { data: content } = await supabase
      .from('goods_content_library')
      .select('title, content_type, key_message, audience_fit, url')
      .not('analyzed_at', 'is', null)
      .order('times_used_newsletter', { ascending: true })
      .limit(10)

    const now = new Date()
    let result = `## Outreach Recommendations\n\n`
    const recs: { name: string; email: string | null; reason: string; priority: string; content: string }[] = []

    for (const contact of contacts || []) {
      const name = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'
      const daysSinceContact = contact.last_contact_date
        ? Math.floor((now.getTime() - new Date(contact.last_contact_date).getTime()) / 86400000)
        : null

      let reason = ''
      let priority = 'low'

      if (daysSinceContact === null) {
        reason = 'Never contacted — introduce Goods'
        priority = 'high'
      } else if (daysSinceContact > 60) {
        reason = `No contact in ${daysSinceContact} days`
        priority = 'high'
      } else if (daysSinceContact > 30) {
        reason = `${daysSinceContact} days since last contact`
        priority = 'medium'
      } else {
        continue
      }

      // Match content to contact segment
      const tags = contact.tags || []
      let suggestedContent = ''
      if (content && content.length > 0) {
        const segment = tags.includes('goods-funder') ? 'funders'
          : tags.includes('goods-partner') ? 'partners'
          : tags.includes('goods-community') ? 'community'
          : 'supporters'

        const match = content.find(c => c.audience_fit?.includes(segment)) || content[0]
        suggestedContent = `Share: "${match.title}" — ${match.key_message || ''}`
      }

      recs.push({ name, email: contact.email, reason, priority, content: suggestedContent })
    }

    // Sort by priority
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    recs.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2))

    const top = recs.slice(0, 10)
    for (const r of top) {
      result += `**${r.name}** (${r.priority} priority)\n`
      result += `${r.reason}${r.email ? ` | ${r.email}` : ''}\n`
      if (r.content) result += `→ ${r.content}\n`
      result += `\n`
    }

    result += `*${recs.length} contacts need attention total. Showing top 10.*\n`
    return result

  } else if (focus === 'content_ideas') {
    // Check what topics are covered vs gaps
    const { data: content } = await supabase
      .from('goods_content_library')
      .select('topics, impact_themes, audience_fit, content_type')
      .not('analyzed_at', 'is', null)

    // Count topic frequency
    const topicCounts: Record<string, number> = {}
    const audienceCounts: Record<string, number> = {}
    for (const item of content || []) {
      for (const t of item.topics || []) topicCounts[t] = (topicCounts[t] || 0) + 1
      for (const a of item.audience_fit || []) audienceCounts[a] = (audienceCounts[a] || 0) + 1
    }

    // Get contact segments for gap analysis
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags')
      .contains('tags', ['goods'])

    const c = contacts || []
    const segmentSizes: Record<string, number> = {
      funders: c.filter(x => x.tags?.includes('goods-funder')).length,
      partners: c.filter(x => x.tags?.includes('goods-partner')).length,
      community: c.filter(x => x.tags?.includes('goods-community')).length,
      supporters: c.filter(x => x.tags?.includes('goods-supporter')).length,
      storytellers: c.filter(x => x.tags?.includes('goods-storyteller')).length,
    }

    let result = `## Content Ideas & Gaps\n\n`

    result += `### Topic Coverage\n`
    const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])
    for (const [topic, count] of sortedTopics.slice(0, 8)) {
      result += `- ${topic}: ${count} pieces\n`
    }

    result += `\n### Audience Content Gap Analysis\n`
    const allSegments = ['funders', 'partners', 'community', 'media', 'government', 'storytellers', 'supporters']
    for (const seg of allSegments) {
      const contentCount = audienceCounts[seg] || 0
      const contactCount = segmentSizes[seg] || 0
      const ratio = contactCount > 0 ? (contentCount / contactCount).toFixed(1) : 'N/A'
      const gap = contactCount > 0 && contentCount < 2 ? ' ⚠️ UNDERSERVED' : ''
      result += `- **${seg}**: ${contentCount} content pieces for ${contactCount} contacts (ratio: ${ratio})${gap}\n`
    }

    result += `\n### Suggested Content Angles\n`
    // Identify underserved segments
    for (const [seg, count] of Object.entries(segmentSizes)) {
      if (count > 5 && (audienceCounts[seg] || 0) < 2) {
        result += `- You have ${count} ${seg} but very little content targeted at them. Consider a ${seg === 'funders' ? 'impact report or economic outcomes story' : seg === 'partners' ? 'collaboration spotlight or partnership update' : 'community update or participation story'}.\n`
      }
    }

    const underrepresented = ['food-sovereignty', 'youth-programs', 'circular-economy', 'regenerative-agriculture']
      .filter(t => !topicCounts[t] || topicCounts[t] < 2)
    if (underrepresented.length > 0) {
      result += `- Underrepresented topics to explore: ${underrepresented.join(', ')}\n`
    }

    return result

  } else {
    // overview
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags, newsletter_consent, last_contact_date')
      .contains('tags', ['goods'])

    const { data: content } = await supabase
      .from('goods_content_library')
      .select('id, times_used_newsletter, analyzed_at')

    const { data: recentComms } = await supabase
      .from('communications_history')
      .select('id')
      .contains('project_codes', ['GOODS'])
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    const c = contacts || []
    const now = new Date()

    let result = `## Goods on Country Overview\n\n`
    result += `### Contacts\n`
    result += `- Total: ${c.length}\n`
    result += `- Newsletter subscribers: ${c.filter(x => x.newsletter_consent && x.tags?.includes('goods-newsletter')).length}\n`
    result += `- Funders: ${c.filter(x => x.tags?.includes('goods-funder')).length}\n`
    result += `- Partners: ${c.filter(x => x.tags?.includes('goods-partner')).length}\n`
    result += `- Community: ${c.filter(x => x.tags?.includes('goods-community')).length}\n`
    result += `- Supporters: ${c.filter(x => x.tags?.includes('goods-supporter')).length}\n`
    result += `- Storytellers: ${c.filter(x => x.tags?.includes('goods-storyteller')).length}\n`
    result += `- Needing attention (>30 days): ${c.filter(x => {
      if (!x.last_contact_date) return true
      return (now.getTime() - new Date(x.last_contact_date).getTime()) / 86400000 > 30
    }).length}\n`

    result += `\n### Content Library\n`
    const ct = content || []
    result += `- Total items: ${ct.length}\n`
    result += `- Analyzed: ${ct.filter(x => x.analyzed_at).length}\n`
    result += `- Unused in newsletters: ${ct.filter(x => !x.times_used_newsletter).length}\n`

    result += `\n### Recent Activity\n`
    result += `- Communications (30 days): ${recentComms?.length || 0}\n`

    result += `\n### Quick Actions\n`
    result += `- "Plan the next Goods newsletter" → newsletter_plan focus\n`
    result += `- "Who should I reach out to for Goods?" → outreach focus\n`
    result += `- "What content should we create for Goods?" → content_ideas focus\n`

    return result
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_emails
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSearchEmails(input: {
  query: string
  mailbox?: string
  limit?: number
}): Promise<string> {
  const { query, mailbox = 'benjamin@act.place', limit = 10 } = input

  try {
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!keyJson) {
      return JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_KEY not configured' })
    }

    const credentials = JSON.parse(keyJson)
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      subject: mailbox,
    })

    await auth.authorize()
    const gmail = google.gmail({ version: 'v1', auth })

    // Search messages
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: Math.min(limit, 20),
    })

    const messageIds = listRes.data.messages || []
    if (messageIds.length === 0) {
      return JSON.stringify({ mailbox, query, results: [], message: 'No emails found matching query.' })
    }

    // Fetch details for each message (headers only for speed)
    const emails = await Promise.all(
      messageIds.slice(0, limit).map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        })

        const headers = detail.data.payload?.headers || []
        const getHeader = (name: string) => headers.find(h => h.name === name)?.value || ''

        return {
          id: msg.id,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: detail.data.snippet || '',
        }
      })
    )

    return JSON.stringify({
      mailbox,
      query,
      count: emails.length,
      total_matches: listRes.data.resultSizeEstimate || emails.length,
      results: emails,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_cashflow_forecast
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetCashflowForecast(input: {
  months_ahead?: number
}): Promise<string> {
  try {
    const result = await fetchCashflow(supabase, { monthsAhead: input.months_ahead })
    return JSON.stringify({
      current_month: result.current_month,
      outstanding: result.outstanding,
      metrics: result.metrics,
      projections: result.projections,
      scenarios: result.scenarios,
      history_months: result.history.length,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_health
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetProjectHealth(input: {
  project_code?: string
}): Promise<string> {
  try {
    const result = await fetchProjectHealth(supabase, {
      projectCode: input.project_code,
    })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_upcoming_deadlines
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetUpcomingDeadlines(input: {
  days_ahead?: number
  category?: string
}): Promise<string> {
  const daysAhead = input.days_ahead || 30
  const category = input.category || 'all'
  const cutoff = getBrisbaneDateOffset(daysAhead)
  const today = getBrisbaneDate()

  try {
    const deadlines: Array<{
      type: string
      title: string
      due_date: string
      days_until: number
      status: string
      project_code?: string
      details?: string
    }> = []

    // Grants deadlines
    if (category === 'all' || category === 'grants') {
      const { data: grants } = await supabase
        .from('fundraising_pipeline')
        .select('name, deadline, expected_date, status, project_codes')
        .or(`deadline.lte.${cutoff},expected_date.lte.${cutoff}`)
        .not('status', 'in', '("successful","unsuccessful","cancelled")')

      for (const g of grants || []) {
        const dueDate = g.deadline || g.expected_date
        if (!dueDate) continue
        const daysUntil = Math.round((new Date(dueDate).getTime() - Date.now()) / 86400000)
        deadlines.push({
          type: 'grant',
          title: g.name,
          due_date: dueDate,
          days_until: daysUntil,
          status: daysUntil < 0 ? 'overdue' : daysUntil <= 7 ? 'urgent' : 'upcoming',
          project_code: g.project_codes?.[0],
          details: `Status: ${g.status}`,
        })
      }
    }

    // Compliance deadlines
    if (category === 'all' || category === 'compliance') {
      const { data: compliance } = await supabase
        .from('compliance_items')
        .select('title, next_due, category, status, project_code, responsible')
        .lte('next_due', cutoff)
        .not('status', 'in', '("completed","not-applicable")')

      for (const c of compliance || []) {
        if (!c.next_due) continue
        const daysUntil = Math.round((new Date(c.next_due).getTime() - Date.now()) / 86400000)
        deadlines.push({
          type: 'compliance',
          title: c.title,
          due_date: c.next_due,
          days_until: daysUntil,
          status: daysUntil < 0 ? 'overdue' : daysUntil <= 7 ? 'urgent' : 'upcoming',
          project_code: c.project_code,
          details: `Category: ${c.category}. Responsible: ${c.responsible || 'unassigned'}`,
        })
      }
    }

    // Calendar deadlines (events with "deadline" or "due" in title)
    if (category === 'all' || category === 'calendar') {
      const { data: events } = await supabase
        .from('calendar_events')
        .select('title, start_time, project_code')
        .gte('start_time', `${today}T00:00:00Z`)
        .lte('start_time', `${cutoff}T23:59:59Z`)
        .or('title.ilike.%deadline%,title.ilike.%due%,title.ilike.%submission%,title.ilike.%lodge%')

      for (const e of events || []) {
        const dueDate = e.start_time.split('T')[0]
        const daysUntil = Math.round((new Date(dueDate).getTime() - Date.now()) / 86400000)
        deadlines.push({
          type: 'calendar',
          title: e.title,
          due_date: dueDate,
          days_until: daysUntil,
          status: daysUntil <= 3 ? 'urgent' : 'upcoming',
          project_code: e.project_code,
        })
      }
    }

    // Sort by due date
    deadlines.sort((a, b) => a.days_until - b.days_until)

    return JSON.stringify({
      period: `${today} to ${cutoff}`,
      total: deadlines.length,
      overdue: deadlines.filter(d => d.status === 'overdue').length,
      urgent: deadlines.filter(d => d.status === 'urgent').length,
      deadlines,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: create_meeting_notes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeCreateMeetingNotes(input: {
  title: string
  summary: string
  content: string
  project_code?: string
  participants?: string[]
  action_items?: string[]
  date?: string
}): Promise<string> {
  const {
    title,
    summary,
    content,
    project_code,
    participants = [],
    action_items = [],
    date,
  } = input

  const meetingDate = date || getBrisbaneDate()

  try {
    // Look up project name from code
    let projectName: string | null = null
    if (project_code) {
      const allProjects = await loadProjectCodes()
      projectName = allProjects[project_code.toUpperCase()]?.name || null
    }

    // Build full content with action items
    let fullContent = content
    if (action_items.length > 0) {
      fullContent += '\n\n## Action Items\n'
      for (const item of action_items) {
        fullContent += `- [ ] ${item}\n`
      }
    }

    // Insert into project_knowledge
    const { data, error } = await supabase
      .from('project_knowledge')
      .insert({
        project_code: project_code?.toUpperCase() || null,
        project_name: projectName,
        knowledge_type: 'meeting',
        title,
        content: fullContent,
        summary,
        source_type: 'telegram',
        recorded_by: 'Ben Knight',
        recorded_at: `${meetingDate}T12:00:00Z`,
        participants,
        topics: [],
        importance: 'normal',
        action_required: action_items.length > 0,
      })
      .select('id')
      .single()

    if (error) return JSON.stringify({ error: error.message })

    return JSON.stringify({
      action: 'meeting_notes_saved',
      id: data.id,
      title,
      date: meetingDate,
      project_code: project_code || null,
      participants_count: participants.length,
      action_items_count: action_items.length,
      confirmation: `Meeting notes "${title}" saved for ${meetingDate}${project_code ? ` (${project_code})` : ''}.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_360
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetProject360(input: { project_code: string }): Promise<string> {
  try {
    const result = await fetchProjectIntelligence(supabase, { project_code: input.project_code })
    return JSON.stringify({
      project_code: result.project_code,
      financial: result.financials ? {
        revenue: result.financials.fy_revenue,
        expenses: result.financials.fy_expenses,
        net: result.financials.fy_net,
        pipeline_value: result.financials.pipeline_value,
        outstanding_invoices: result.financials.outstanding_amount,
        grants_won: result.financials.grants_won,
        grants_pending: result.financials.grants_pending,
      } : null,
      health: result.health ? {
        score: result.health.health_score,
        momentum: result.health.momentum_score,
        engagement: result.health.engagement_score,
        financial: result.health.financial_score,
      } : null,
      key_contacts: result.relationships.map((r) => ({
        name: r.contact_name,
        company: r.company_name,
        temperature: r.temperature,
        trend: r.temperature_trend,
        last_contact: r.last_contact_at,
      })),
      focus_areas: result.focus_areas,
      grants: result.grants,
      recent_knowledge: result.recent_knowledge.slice(0, 5),
      recent_wins: result.recent_wins,
      blockers: result.blockers,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_ecosystem_pulse
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetEcosystemPulse(): Promise<string> {
  try {
    const [projectsRes, bookkeepingRes, nudgesRes, oppsRes] = await Promise.all([
      supabase.from('v_project_summary').select('project_code, project_name, health_score, health_status, total_income, total_expenses, pipeline_value, open_opportunities, email_count'),
      supabase.from('xero_transactions').select('total, type').gte('date', getBrisbaneDateOffset(-30)),
      supabase.from('ghl_contacts').select('full_name, last_contact_date').not('last_contact_date', 'is', null).order('last_contact_date', { ascending: true }).limit(5),
      supabase.from('ghl_opportunities').select('monetary_value, status').eq('status', 'open'),
    ])

    const projects = projectsRes.data || []
    const transactions = bookkeepingRes.data || []
    const staleContacts = nudgesRes.data || []
    const openOpps = oppsRes.data || []

    // Categorize projects by health
    const healthy = projects.filter((p: any) => p.health_status === 'healthy' || (p.health_score && p.health_score >= 60))
    const atRisk = projects.filter((p: any) => p.health_status === 'at_risk' || (p.health_score && p.health_score >= 30 && p.health_score < 60))
    const critical = projects.filter((p: any) => p.health_status === 'critical' || (p.health_score && p.health_score < 30))

    // Cash flow last 30 days
    const income30d = transactions.filter((t: any) => t.type === 'RECEIVE').reduce((s: number, t: any) => s + Math.abs(Number(t.total) || 0), 0)
    const expenses30d = transactions.filter((t: any) => t.type === 'SPEND').reduce((s: number, t: any) => s + Math.abs(Number(t.total) || 0), 0)

    // Pipeline
    const totalPipeline = openOpps.reduce((s: number, o: any) => s + (Number(o.monetary_value) || 0), 0)

    return JSON.stringify({
      projects_overview: {
        total: projects.length,
        healthy: { count: healthy.length, names: healthy.map((p: any) => p.project_code) },
        at_risk: { count: atRisk.length, names: atRisk.map((p: any) => p.project_code) },
        critical: { count: critical.length, names: critical.map((p: any) => p.project_code) },
      },
      financials_30d: {
        income: income30d,
        expenses: expenses30d,
        net: income30d - expenses30d,
      },
      pipeline: {
        total_value: totalPipeline,
        open_deals: openOpps.length,
      },
      contacts_needing_attention: staleContacts.map((c: any) => ({
        name: c.full_name,
        last_contact: c.last_contact_date,
        days_ago: Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000),
      })),
      top_projects: projects
        .sort((a: any, b: any) => (b.pipeline_value || 0) - (a.pipeline_value || 0))
        .slice(0, 5)
        .map((p: any) => ({
          code: p.project_code,
          name: p.project_name,
          health: p.health_score,
          revenue: p.total_income,
          pipeline: p.pipeline_value,
        })),
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_daily_priorities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetDailyPriorities(input: { limit?: number }): Promise<string> {
  try {
    const limit = input.limit || 10

    const { data, error } = await supabase
      .from('sprint_suggestions')
      .select('id, title, stream, priority, notes, source_type, source_ref, due_date, project_code, owner, created_at')
      .eq('dismissed', false)
      .is('promoted_to', null)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return `Error fetching priorities: ${error.message}`

    const items = data || []

    if (items.length === 0) {
      return '✅ All clear — no urgent priorities right now. Everything is on track.'
    }

    const nowItems = items.filter(i => i.priority === 'now')
    const nextItems = items.filter(i => i.priority === 'next')

    const lines: string[] = []
    lines.push(`🎯 **Daily Priorities** (${nowItems.length} NOW, ${nextItems.length} NEXT)\n`)

    let rank = 1
    for (const item of nowItems) {
      let context: any = null
      try { context = item.notes ? JSON.parse(item.notes) : null } catch { context = null }

      const valuePart = context?.amount || context?.value ? ` — $${Number(context.amount || context.value).toLocaleString()}` : ''
      const projectPart = item.project_code ? ` [${item.project_code}]` : ''
      const actionPart = context?.action ? `\n   → ${context.action}` : ''

      lines.push(`${rank}. 🔴 **${item.title}**${valuePart}${projectPart}${actionPart}`)
      rank++
    }

    if (nextItems.length > 0 && nowItems.length > 0) {
      lines.push('')
    }

    for (const item of nextItems) {
      let context: any = null
      try { context = item.notes ? JSON.parse(item.notes) : null } catch { context = null }

      const valuePart = context?.amount || context?.value ? ` — $${Number(context.amount || context.value).toLocaleString()}` : ''
      const projectPart = item.project_code ? ` [${item.project_code}]` : ''
      const actionPart = context?.action ? `\n   → ${context.action}` : ''

      lines.push(`${rank}. 🟡 ${item.title}${valuePart}${projectPart}${actionPart}`)
      rank++
    }

    return lines.join('\n')
  } catch (err: any) {
    return `Error: ${err.message}`
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTION WRITE TOOLS — shared helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _notionDbIdsCache: Record<string, string> | null = null
function loadNotionDbIds(): Record<string, string> {
  if (_notionDbIdsCache) return _notionDbIdsCache
  try {
    const configPath = join(process.cwd(), '..', '..', 'config', 'notion-database-ids.json')
    _notionDbIdsCache = JSON.parse(readFileSync(configPath, 'utf-8'))
    return _notionDbIdsCache!
  } catch {
    return {}
  }
}

function getNotionClient(): NotionClient {
  return new NotionClient({ auth: process.env.NOTION_TOKEN })
}

// Resolve a project_code to its Notion page ID in the Projects database
async function resolveProjectPageId(projectCode: string): Promise<string | null> {
  const dbIds = loadNotionDbIds()
  const projectsDbId = dbIds.actProjects
  if (!projectsDbId || !process.env.NOTION_TOKEN) return null

  try {
    const notion = getNotionClient()
    // Search by title match
    const response = await (notion.databases as any).query({
      database_id: projectsDbId,
      filter: {
        property: 'Name',
        title: { contains: projectCode },
      },
      page_size: 5,
    })
    if (response.results.length > 0) return response.results[0].id
  } catch { /* ignore — relation linking is optional */ }
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: add_meeting_to_notion
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeAddMeetingToNotion(input: {
  title: string
  date?: string
  project_code?: string
  attendees?: string[]
  notes: string
  decisions?: string[]
  action_items?: string[]
  meeting_type?: string
}): Promise<string> {
  const { title, notes, decisions, action_items, meeting_type } = input
  const date = input.date || getBrisbaneDate()
  const attendees = input.attendees || []
  const projectCode = input.project_code || null

  try {
    // 1. Save to Supabase project_knowledge
    const { data: pkData, error: pkError } = await supabase
      .from('project_knowledge')
      .insert({
        title,
        content: notes,
        knowledge_type: 'meeting',
        project_code: projectCode,
        recorded_at: new Date(date).toISOString(),
        participants: attendees,
        action_items: action_items ? action_items.map(a => ({ text: a, done: false })) : null,
        source_type: 'telegram',
        importance: 'normal',
        action_required: (action_items && action_items.length > 0) || false,
      })
      .select('id')
      .single()

    if (pkError) {
      return JSON.stringify({ error: `Failed to save to knowledge base: ${pkError.message}` })
    }

    // 2. Save to Notion Meetings database (if configured)
    const dbIds = loadNotionDbIds()
    const meetingsDbId = dbIds.meetings || dbIds.unifiedMeetings
    let notionPageId: string | null = null

    if (meetingsDbId && process.env.NOTION_TOKEN) {
      const notion = getNotionClient()

      const properties: Record<string, any> = {
        'Name': { title: [{ text: { content: title } }] },
        'Date': { date: { start: date } },
        'Type': { select: { name: meeting_type || 'external' } },
        'Status': { select: { name: 'Completed' } },
        'Supabase ID': { rich_text: [{ text: { content: pkData.id } }] },
      }

      // Link to project via relation
      if (projectCode) {
        const projectPageId = await resolveProjectPageId(projectCode)
        if (projectPageId) {
          properties['Project'] = { relation: [{ id: projectPageId }] }
        }
      }

      if (attendees.length > 0) {
        properties['Attendees'] = { rich_text: [{ text: { content: attendees.join(', ') } }] }
      }

      // Build page content
      const children: any[] = []
      children.push({
        object: 'block', type: 'paragraph',
        paragraph: { rich_text: [{ text: { content: notes.slice(0, 2000) } }] },
      })

      if (decisions && decisions.length > 0) {
        children.push({
          object: 'block', type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: 'Decisions' } }] },
        })
        for (const d of decisions) {
          children.push({
            object: 'block', type: 'bulleted_list_item',
            bulleted_list_item: { rich_text: [{ text: { content: d } }] },
          })
        }
      }

      if (action_items && action_items.length > 0) {
        children.push({
          object: 'block', type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: 'Action Items' } }] },
        })
        for (const a of action_items) {
          children.push({
            object: 'block', type: 'to_do',
            to_do: { rich_text: [{ text: { content: a } }], checked: false },
          })
        }
      }

      const page = await notion.pages.create({
        parent: { database_id: meetingsDbId },
        properties,
        children,
      })
      notionPageId = page.id
    }

    // 3. Also save decisions as separate knowledge items
    if (decisions && decisions.length > 0) {
      for (const d of decisions) {
        await supabase.from('project_knowledge').insert({
          title: d,
          content: d,
          knowledge_type: 'decision',
          project_code: projectCode,
          recorded_at: new Date(date).toISOString(),
          decision_status: 'active',
          source_type: 'telegram',
          importance: 'normal',
        })
      }
    }

    return JSON.stringify({
      success: true,
      meeting_id: pkData.id,
      notion_page_id: notionPageId,
      saved_to: notionPageId ? 'supabase + notion' : 'supabase only',
      decisions_count: decisions?.length || 0,
      action_items_count: action_items?.length || 0,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: add_action_item
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeAddActionItem(input: {
  title: string
  project_code?: string
  due_date?: string
  priority?: string
  details?: string
  assignee?: string
}): Promise<string> {
  const { title, project_code, due_date, priority, details, assignee } = input

  try {
    // 1. Save to Supabase
    const { data, error } = await supabase
      .from('project_knowledge')
      .insert({
        title,
        content: details || title,
        knowledge_type: 'action',
        project_code: project_code || null,
        recorded_at: new Date().toISOString(),
        action_required: true,
        follow_up_date: due_date || null,
        importance: priority || 'normal',
        recorded_by: assignee || null,
        source_type: 'telegram',
      })
      .select('id')
      .single()

    if (error) {
      return JSON.stringify({ error: `Failed to save action: ${error.message}` })
    }

    // 2. Save to Notion Actions database (if configured)
    const dbIds = loadNotionDbIds()
    const actionsDbId = dbIds.actions
    let notionPageId: string | null = null

    if (actionsDbId && process.env.NOTION_TOKEN) {
      const notion = getNotionClient()

      // Existing Actions DB: 'Action Item' (title), 'Status' (status type), 'Projects' (relation)
      const properties: Record<string, any> = {
        'Action Item': { title: [{ text: { content: title } }] },
        'Status': { status: { name: 'In progress' } },
        'Supabase ID': { rich_text: [{ text: { content: data.id } }] },
      }

      // Link to project via relation
      if (project_code) {
        const projectPageId = await resolveProjectPageId(project_code)
        if (projectPageId) {
          properties['Projects'] = { relation: [{ id: projectPageId }] }
        }
      }

      if (due_date) {
        properties['Due Date'] = { date: { start: due_date } }
      }

      const children: any[] = []
      if (details) {
        children.push({
          object: 'block', type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: details.slice(0, 2000) } }] },
        })
      }

      const page = await notion.pages.create({
        parent: { database_id: actionsDbId },
        properties,
        children,
      })
      notionPageId = page.id
    }

    return JSON.stringify({
      success: true,
      action_id: data.id,
      notion_page_id: notionPageId,
      saved_to: notionPageId ? 'supabase + notion' : 'supabase only',
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: add_decision
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeAddDecision(input: {
  title: string
  project_code?: string
  rationale?: string
  alternatives_considered?: string[]
  status?: string
}): Promise<string> {
  const { title, project_code, rationale, alternatives_considered, status } = input

  try {
    const content = [
      title,
      rationale ? `\nRationale: ${rationale}` : '',
      alternatives_considered?.length ? `\nAlternatives considered: ${alternatives_considered.join(', ')}` : '',
    ].filter(Boolean).join('')

    // 1. Save to Supabase
    const { data, error } = await supabase
      .from('project_knowledge')
      .insert({
        title,
        content,
        knowledge_type: 'decision',
        project_code: project_code || null,
        recorded_at: new Date().toISOString(),
        decision_status: status || 'active',
        decision_rationale: rationale || null,
        importance: 'high',
        source_type: 'telegram',
      })
      .select('id')
      .single()

    if (error) {
      return JSON.stringify({ error: `Failed to save decision: ${error.message}` })
    }

    // 2. Save to Notion Decisions database (if configured)
    const dbIds = loadNotionDbIds()
    const decisionsDbId = dbIds.decisions
    let notionPageId: string | null = null

    if (decisionsDbId && process.env.NOTION_TOKEN) {
      const notion = getNotionClient()

      const properties: Record<string, any> = {
        'Name': { title: [{ text: { content: title } }] },
        'Status': { select: { name: status || 'active' } },
        'Priority': { select: { name: 'high' } },
        'Date': { date: { start: getBrisbaneDate() } },
        'Supabase ID': { rich_text: [{ text: { content: data.id } }] },
      }

      // Link to project via relation
      if (project_code) {
        const projectPageId = await resolveProjectPageId(project_code)
        if (projectPageId) {
          properties['Project'] = { relation: [{ id: projectPageId }] }
        }
      }

      // Store rationale in dedicated property
      if (rationale) {
        properties['Rationale'] = { rich_text: [{ text: { content: rationale.slice(0, 2000) } }] }
      }

      const children: any[] = []
      if (rationale) {
        children.push({
          object: 'block', type: 'callout',
          callout: {
            rich_text: [{ text: { content: `Rationale: ${rationale}` } }],
            icon: { type: 'emoji', emoji: '\u{1F4AD}' },
          },
        })
      }
      if (alternatives_considered?.length) {
        children.push({
          object: 'block', type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: 'Alternatives Considered' } }] },
        })
        for (const alt of alternatives_considered) {
          children.push({
            object: 'block', type: 'bulleted_list_item',
            bulleted_list_item: { rich_text: [{ text: { content: alt } }] },
          })
        }
      }

      const page = await notion.pages.create({
        parent: { database_id: decisionsDbId },
        properties,
        children,
      })
      notionPageId = page.id
    }

    return JSON.stringify({
      success: true,
      decision_id: data.id,
      notion_page_id: notionPageId,
      saved_to: notionPageId ? 'supabase + notion' : 'supabase only',
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_financials
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetProjectFinancials(input: { project_code?: string }): Promise<string> {
  try {
    const result = await fetchProjectFinancials(supabase, { projectCode: input.project_code })
    if (result.count === 0) return JSON.stringify({ message: 'No financial data found' })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_untagged_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetUntaggedSummary(): Promise<string> {
  try {
    const { count: untaggedCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .is('project_code', null)

    const { count: totalCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })

    // Top untagged vendors
    const { data: untagged } = await supabase
      .from('xero_transactions')
      .select('contact_name')
      .is('project_code', null)

    const vendorCounts: Record<string, number> = {}
    for (const tx of untagged || []) {
      const name = tx.contact_name || '(No contact)'
      vendorCounts[name] = (vendorCounts[name] || 0) + 1
    }

    const topVendors = Object.entries(vendorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ vendor: name, count }))

    const coverage = totalCount ? Math.round(((totalCount - (untaggedCount || 0)) / totalCount) * 100) : 0

    return JSON.stringify({
      untagged: untaggedCount || 0,
      total: totalCount || 0,
      coverage_pct: coverage,
      top_untagged_vendors: topVendors,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: trigger_auto_tag
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeTriggerAutoTag(input: { dry_run?: boolean }): Promise<string> {
  try {
    // Load vendor rules from DB
    const { data: rules, error: rulesErr } = await supabase
      .from('vendor_project_rules')
      .select('vendor_name, aliases, project_code')
      .eq('auto_apply', true)

    if (rulesErr) return JSON.stringify({ error: rulesErr.message })

    // Fetch untagged transactions
    const { data: untagged, error: txErr } = await supabase
      .from('xero_transactions')
      .select('id, contact_name')
      .is('project_code', null)
      .limit(5000)

    if (txErr) return JSON.stringify({ error: txErr.message })

    // Match
    const matches: Array<{ id: string; project_code: string; vendor: string }> = []
    for (const tx of untagged || []) {
      if (!tx.contact_name) continue
      const lower = tx.contact_name.toLowerCase()
      for (const rule of rules || []) {
        const names = [rule.vendor_name, ...(rule.aliases || [])].map((a: string) => a.toLowerCase())
        if (names.some((n: string) => lower.includes(n) || n.includes(lower))) {
          matches.push({ id: tx.id, project_code: rule.project_code, vendor: tx.contact_name })
          break
        }
      }
    }

    if (input.dry_run || matches.length === 0) {
      return JSON.stringify({
        mode: 'dry_run',
        would_tag: matches.length,
        untagged_remaining: (untagged?.length || 0) - matches.length,
        sample: matches.slice(0, 10),
      })
    }

    // Apply
    let applied = 0
    for (const m of matches) {
      const { error } = await supabase
        .from('xero_transactions')
        .update({ project_code: m.project_code, project_code_source: 'vendor_rule' })
        .eq('id', m.id)
      if (!error) applied++
    }

    return JSON.stringify({
      mode: 'applied',
      tagged: applied,
      untagged_remaining: (untagged?.length || 0) - applied,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_receipt_pipeline_status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetReceiptPipelineStatus(input: {
  include_stuck?: boolean
}): Promise<string> {
  try {
    const result = await fetchReceiptPipeline(supabase, { includeStuck: input.include_stuck })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_meeting_prep
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetMeetingPrep(input: {
  event_title?: string
  date?: string
}): Promise<string> {
  const date = input.date || getBrisbaneDate()
  const now = getBrisbaneNow()

  try {
    // Find the target event
    let eventQuery = supabase
      .from('calendar_events')
      .select('id, title, start_time, end_time, attendees, location, metadata')
      .gte('start_time', `${date}T00:00:00.000Z`)
      .lte('start_time', `${date}T23:59:59.999Z`)
      .order('start_time', { ascending: true })

    const { data: events, error: evError } = await eventQuery

    if (evError) return JSON.stringify({ error: evError.message })
    if (!events || events.length === 0) return JSON.stringify({ message: 'No events found for this date.' })

    // Find target event — match by title or pick next upcoming
    let event = events[0]
    if (input.event_title) {
      const search = input.event_title.toLowerCase()
      const match = events.find((e) => e.title?.toLowerCase().includes(search))
      if (match) event = match
    } else {
      // Pick next upcoming event
      const upcoming = events.find((e) => new Date(e.start_time) > now)
      if (upcoming) event = upcoming
    }

    // Extract attendee emails from JSONB
    const attendees: Array<{ email?: string; displayName?: string }> = Array.isArray(event.attendees)
      ? event.attendees
      : []
    const attendeeEmails = attendees
      .map((a) => a.email)
      .filter((e): e is string => !!e && !e.includes('calendar.google.com'))

    // Cross-reference with contacts
    const attendeeDetails: Array<Record<string, unknown>> = []

    for (const email of attendeeEmails.slice(0, 10)) {
      const { data: contact } = await supabase
        .from('ghl_contacts')
        .select('id, ghl_id, full_name, company_name, engagement_status, tags, last_contact_date')
        .eq('email', email)
        .maybeSingle()

      if (contact) {
        // Get last communication
        const { data: lastComm } = await supabase
          .from('communications_history')
          .select('subject, communication_date, direction')
          .eq('contact_id', contact.id)
          .order('communication_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Get open pipeline value
        const { data: deals } = await supabase
          .from('ghl_opportunities')
          .select('monetary_value')
          .eq('contact_id', contact.ghl_id)
          .eq('status', 'open')

        const pipelineValue = (deals || []).reduce((sum, d) => sum + (d.monetary_value || 0), 0)

        attendeeDetails.push({
          name: contact.full_name,
          email,
          company: contact.company_name,
          status: contact.engagement_status,
          tags: contact.tags || [],
          last_contact: contact.last_contact_date,
          days_since_contact: contact.last_contact_date
            ? Math.floor((now.getTime() - new Date(contact.last_contact_date).getTime()) / 86400000)
            : null,
          last_topic: lastComm?.subject || null,
          last_direction: lastComm?.direction || null,
          open_pipeline_value: pipelineValue || null,
        })
      } else {
        const displayName = attendees.find((a) => a.email === email)?.displayName
        attendeeDetails.push({ name: displayName || email, email, known: false })
      }
    }

    return JSON.stringify({
      event: {
        title: event.title,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
      },
      attendee_count: attendeeEmails.length,
      attendees: attendeeDetails,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: capture_meeting_notes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeCaptureMeetingNotes(
  input: { notes: string; event_title?: string; project_code?: string },
  chatId?: number
): Promise<string> {
  const now = getBrisbaneNow()
  const today = getBrisbaneDate()

  try {
    // Find matching calendar event from today
    const { data: events } = await supabase
      .from('calendar_events')
      .select('id, title, start_time, end_time, attendees, metadata')
      .gte('start_time', `${today}T00:00:00.000Z`)
      .lte('start_time', `${today}T23:59:59.999Z`)
      .order('start_time', { ascending: true })

    let matchedEvent: typeof events extends (infer T)[] | null ? T | null : never = null
    if (input.event_title && events) {
      const search = input.event_title.toLowerCase()
      matchedEvent = events.find((e) => e.title?.toLowerCase().includes(search)) || null
    } else if (events && events.length > 0) {
      // Pick the most recent past event
      const pastEvents = events.filter((e) => new Date(e.end_time || e.start_time) <= now)
      matchedEvent = pastEvents.length > 0 ? pastEvents[pastEvents.length - 1] : null
    }

    // Extract attendee contact IDs
    const contactIds: string[] = []
    if (matchedEvent?.attendees) {
      const attendees: Array<{ email?: string }> = Array.isArray(matchedEvent.attendees)
        ? matchedEvent.attendees
        : []
      for (const a of attendees.slice(0, 10)) {
        if (a.email && !a.email.includes('calendar.google.com')) {
          const { data: contact } = await supabase
            .from('ghl_contacts')
            .select('id')
            .eq('email', a.email)
            .maybeSingle()
          if (contact) contactIds.push(contact.id)
        }
      }
    }

    // Detect project code from event metadata or input
    const projectCode = input.project_code ||
      (matchedEvent?.metadata as Record<string, unknown>)?.detected_project_code as string ||
      null

    // Save to project_knowledge
    const { data: saved, error } = await supabase
      .from('project_knowledge')
      .insert({
        title: matchedEvent ? `Meeting notes: ${matchedEvent.title}` : 'Meeting notes',
        content: input.notes,
        knowledge_type: 'meeting',
        source_type: 'voice_note',
        project_code: projectCode,
        contact_ids: contactIds.length > 0 ? contactIds : null,
        recorded_at: now.toISOString(),
        participants: matchedEvent?.attendees
          ? (matchedEvent.attendees as Array<{ email?: string; displayName?: string }>)
              .map((a) => a.displayName || a.email)
              .filter(Boolean)
          : null,
      })
      .select('id')
      .single()

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    return JSON.stringify({
      saved: true,
      knowledge_id: saved?.id,
      matched_event: matchedEvent?.title || null,
      project_code: projectCode,
      contacts_linked: contactIds.length,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_weekly_finance_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetWeeklyFinanceSummary(input: {
  format?: string
}): Promise<string> {
  const now = getBrisbaneNow()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const today = getBrisbaneDate()

  try {
    const [transactions, snapshots, overdueInvoices, upcomingBills] = await Promise.all([
      // Last 7 days transactions
      supabase
        .from('xero_transactions')
        .select('amount, type, contact_name')
        .gte('date', sevenDaysAgo.split('T')[0])
        .lte('date', today),

      // Latest balance
      supabase
        .from('financial_snapshots')
        .select('closing_balance, income, expenses, month')
        .order('month', { ascending: false })
        .limit(1),

      // Overdue receivables
      supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, amount_due, due_date')
        .eq('type', 'ACCREC')
        .in('status', ['AUTHORISED', 'SUBMITTED'])
        .gt('amount_due', 0)
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .limit(10),

      // Upcoming payables (next 14 days)
      supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, amount_due, due_date')
        .eq('type', 'ACCPAY')
        .in('status', ['AUTHORISED', 'SUBMITTED'])
        .gt('amount_due', 0)
        .gte('due_date', today)
        .lte('due_date', getBrisbaneDateOffset(14))
        .order('due_date', { ascending: true })
        .limit(10),
    ])

    const txns = transactions.data || []
    const income = txns.filter((t) => t.type === 'RECEIVE').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    const spend = txns.filter((t) => t.type === 'SPEND').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    const net = income - spend
    const balance = snapshots.data?.[0]?.closing_balance || 0
    const overdueItems = overdueInvoices.data || []
    const overdueTotal = overdueItems.reduce((sum, inv) => sum + (parseFloat(String(inv.amount_due)) || 0), 0)
    const upcomingItems = upcomingBills.data || []
    const upcomingTotal = upcomingItems.reduce((sum, inv) => sum + (parseFloat(String(inv.amount_due)) || 0), 0)

    if (input.format === 'voice') {
      const parts: string[] = []

      const fmtAmount = (n: number) => {
        if (n >= 1000) return `${Math.round(n / 100) / 10} thousand`
        return `${Math.round(n)} dollars`
      }

      parts.push(`This week you received ${fmtAmount(income)} and spent ${fmtAmount(spend)}.`)
      if (net >= 0) {
        parts.push(`Net positive ${fmtAmount(net)}.`)
      } else {
        parts.push(`Net negative ${fmtAmount(Math.abs(net))}.`)
      }

      if (overdueItems.length > 0) {
        parts.push(`${overdueItems.length} overdue invoice${overdueItems.length === 1 ? '' : 's'} totaling ${fmtAmount(overdueTotal)}.`)
      }

      if (upcomingItems.length > 0) {
        parts.push(`${upcomingItems.length} bill${upcomingItems.length === 1 ? '' : 's'} due in the next two weeks, totaling ${fmtAmount(upcomingTotal)}.`)
      }

      parts.push(`Current balance is ${fmtAmount(balance)}.`)

      return parts.join(' ')
    }

    return JSON.stringify({
      period: `${sevenDaysAgo.split('T')[0]} to ${today}`,
      income: `$${income.toFixed(2)}`,
      spend: `$${spend.toFixed(2)}`,
      net: `$${net.toFixed(2)}`,
      cash_position: `$${Number(balance).toFixed(2)}`,
      overdue_receivables: {
        count: overdueItems.length,
        total: `$${overdueTotal.toFixed(2)}`,
        items: overdueItems.map((inv) => ({
          contact: inv.contact_name,
          amount: `$${Number(inv.amount_due).toFixed(2)}`,
          due: inv.due_date,
          days_overdue: Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000),
        })),
      },
      upcoming_payables: {
        count: upcomingItems.length,
        total: `$${upcomingTotal.toFixed(2)}`,
        items: upcomingItems.map((inv) => ({
          contact: inv.contact_name,
          amount: `$${Number(inv.amount_due).toFixed(2)}`,
          due: inv.due_date,
        })),
      },
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_grant_readiness
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetGrantReadiness(input: {
  application_id?: string
  grant_name?: string
}): Promise<string> {
  try {
    const result = await fetchGrantReadiness(supabase, {
      application_id: input.application_id,
      grant_name: input.grant_name,
    })
    if (result.count === 0) return JSON.stringify({ message: 'No matching grant applications found.' })
    return JSON.stringify({ applications: result.applications })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: draft_grant_response
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeDraftGrantResponse(
  input: { opportunity_id: string; project_code?: string; sections?: string[]; tone?: string },
  chatId?: number
): Promise<string> {
  const tone = input.tone || 'community-led'

  try {
    // 1. Get opportunity details
    const { data: opportunity, error: oppError } = await supabase
      .from('grant_opportunities')
      .select('*')
      .eq('id', input.opportunity_id)
      .maybeSingle()

    if (oppError || !opportunity) {
      return JSON.stringify({ error: oppError?.message || 'Grant opportunity not found.' })
    }

    // 2. Get project context
    let projectContext = ''
    if (input.project_code) {
      const { data: snapshot } = await supabase
        .from('project_intelligence_snapshots')
        .select('*')
        .eq('project_code', input.project_code)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (snapshot) {
        projectContext = `Project: ${input.project_code}\nSnapshot: ${JSON.stringify(snapshot)}\n`
      }
    }

    // 3. Get reusable grant assets
    const { data: assets } = await supabase
      .from('grant_assets')
      .select('name, category, asset_type, content_text')
      .eq('is_current', true)
      .not('content_text', 'is', null)
      .limit(10)

    const assetContext = (assets || [])
      .map((a) => `[${a.category}/${a.asset_type}] ${a.name}: ${a.content_text}`)
      .join('\n')

    // 4. Get recent project knowledge
    const { data: knowledge } = await supabase
      .from('project_knowledge')
      .select('title, content, knowledge_type')
      .in('knowledge_type', ['decision', 'meeting'])
      .order('recorded_at', { ascending: false })
      .limit(5)

    const knowledgeContext = (knowledge || [])
      .map((k) => `[${k.knowledge_type}] ${k.title}: ${k.content?.slice(0, 200)}`)
      .join('\n')

    // 5. Call Claude to draft
    const anthropic = new Anthropic()
    const sectionsList = input.sections?.length
      ? `Focus on these sections: ${input.sections.join(', ')}`
      : 'Draft a complete EOI covering: project description, alignment with grant objectives, community benefit, methodology, and budget justification'

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Draft a grant response for the following opportunity. Write in a ${tone} tone that reflects ACT's values — community-led design, First Nations partnership, regenerative innovation.

GRANT OPPORTUNITY:
Name: ${opportunity.name}
Provider: ${opportunity.provider}
Amount: up to $${opportunity.amount_max || 'unspecified'}
Requirements: ${opportunity.requirements_summary || 'Not specified'}
Description: ${opportunity.description || 'Not provided'}

${projectContext}

REUSABLE ASSETS:
${assetContext || 'None available'}

RECENT CONTEXT:
${knowledgeContext || 'None'}

${sectionsList}

Write the draft as ready-to-submit content. Be specific, use real details from the context provided. Keep it concise but compelling.`,
        },
      ],
    })

    const draft = response.content[0].type === 'text' ? response.content[0].text : ''

    // Use confirmation flow for saving
    if (chatId) {
      const preview = draft.length > 500 ? draft.slice(0, 500) + '...' : draft
      savePendingAction(
        chatId,
        `Save grant draft for "${opportunity.name}"\n\nDRAFT FOR: ${opportunity.name}\n\n${preview}`,
        {
          type: 'draft_grant_response',
          params: {
            opportunity_id: input.opportunity_id,
            opportunity_name: opportunity.name,
            project_code: input.project_code,
            draft,
          },
        }
      )

      return JSON.stringify({
        status: 'pending_confirmation',
        message: `Draft ready for "${opportunity.name}". Please confirm to save.`,
        preview: preview,
        opportunity: opportunity.name,
        word_count: draft.split(/\s+/).length,
      })
    }

    return JSON.stringify({
      draft,
      opportunity: opportunity.name,
      word_count: draft.split(/\s+/).length,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_revenue_scoreboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetRevenueScoreboard(): Promise<string> {
  try {
    const result = await fetchRevenueScoreboard(supabase)

    // Build action items from the data
    const actions: string[] = []
    if (result.receivables.total > 0) {
      actions.push(`Chase $${Math.round(result.receivables.total).toLocaleString()} in outstanding receivables`)
    }
    if (result.receivables.items.length > 0) {
      const top = result.receivables.items[0]
      actions.push(`Top receivable: ${top.name} — $${Math.round(top.amount).toLocaleString()}`)
    }

    // Concise output — summary + actions, not full data dump
    return JSON.stringify({
      monthly_target: result.streams.totalMonthlyTarget,
      annual_target: result.streams.totalAnnualTarget,
      pipeline: {
        weighted_value: result.pipeline.weightedValue,
        total_value: result.pipeline.totalValue,
        count: result.pipeline.count,
        top_deals: result.pipeline.topOpportunities.slice(0, 3).map((d) => ({
          name: d.name, funder: d.funder, value: d.amount, weighted: d.weighted, stage: d.status,
        })),
      },
      receivables: {
        total: result.receivables.total,
        items: result.receivables.items.slice(0, 5),
      },
      streams: result.streams.items.map((s) => ({
        name: s.name, code: s.code, monthly: s.monthlyTarget,
      })),
      active_projects: result.projects.active,
      actions,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: save_dream
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Auto-categorise based on content keywords
function autoCategorizeDream(content: string): string {
  const lower = content.toLowerCase()
  if (/\b(imagine|vision|future|could be|one day|picture this|what if)\b/.test(lower)) return 'vision'
  if (/\b(dream|dreamt|dreaming|asleep|woke up)\b/.test(lower)) return 'dream'
  if (/\b(story|told me|remember when|once upon|narrative)\b/.test(lower)) return 'story'
  if (/\b(grateful|thankful|love|beautiful|heart|moved|tears)\b/.test(lower)) return 'love'
  if (/\b(excited|amazing|incredible|can't wait|pumped|stoked|fuck yeah)\b/.test(lower)) return 'excitement'
  if (/\b(idea|what if we|we could|concept|proposal|pitch)\b/.test(lower)) return 'idea'
  if (/\b(learned|realised|realized|reflect|thinking about|insight)\b/.test(lower)) return 'reflection'
  if (/\b(visited|went to|saw|experienced|felt|heard|tasted)\b/.test(lower)) return 'experience'
  return 'dream'
}

// Auto-tag based on content
function autoTagDream(content: string): string[] {
  const lower = content.toLowerCase()
  const tags: string[] = []
  const tagMap: Record<string, string[]> = {
    'the-harvest': ['harvest', 'witta', 'maleny', 'gumland', 'cafe', 'garden centre', 'market'],
    'black-cockatoo-valley': ['black cockatoo', 'cockatoo valley', 'bunya', 'farm', '40 acres', 'paddock', 'bush', 'regenerative land', 'glamping'],
    'palm-island': ['palm island', 'picc', 'elders', 'uncle allan', 'torres strait', 'first nations'],
    'goods': ['goods on country', 'orange sky', 'laundry', 'washing machine', 'fleet'],
    'empathy-ledger': ['empathy ledger', 'storytelling', 'narrative', 'stories'],
    'justicehub': ['justice', 'incarceration', 'legal', 'prison', 'contained'],
    'art': ['art', 'installation', 'sculpture', 'exhibition', 'gallery', 'projection'],
    'community': ['community', 'gathering', 'together', 'people', 'connection'],
    'nature': ['nature', 'trees', 'bush', 'creek', 'birds', 'wildlife', 'regenerative'],
    'technology': ['tech', 'iot', 'sensor', 'dashboard', 'spatial', 'ar', 'vr', 'ai'],
    'revenue': ['revenue', 'business model', 'income', 'funding', 'grant', 'commercial'],
  }
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(kw => lower.includes(kw))) tags.push(tag)
  }
  return tags
}

// Generate a title from content
function generateDreamTitle(content: string): string {
  // Take first meaningful sentence, clean and truncate
  const firstLine = content.split(/[.!?\n]/)[0].trim()
  if (firstLine.length <= 60) return firstLine
  return firstLine.slice(0, 57) + '...'
}

// Find linked projects from content
function findLinkedProjects(content: string): string[] {
  const lower = content.toLowerCase()
  const projects: string[] = []
  const projectKeywords: Record<string, string[]> = {
    'ACT-HV': ['harvest', 'witta', 'maleny', 'gumland', 'cafe'],
    'ACT-FM': ['black cockatoo', 'cockatoo valley', 'bunya', 'farm', '40 acres', 'paddock', 'glamping', 'art trail'],
    'ACT-PI': ['palm island', 'picc', 'elders', 'uncle allan'],
    'ACT-GD': ['goods on country', 'orange sky', 'laundry', 'washing'],
    'ACT-EL': ['empathy ledger', 'storytelling platform'],
    'ACT-JH': ['justicehub', 'justice hub', 'contained', 'incarceration'],
    'ACT-AR': ['art', 'installation', 'sculpture', 'studio practice'],
    'ACT-IN': ['bot', 'intelligence', 'alma', 'agent', 'telegram'],
  }
  for (const [code, keywords] of Object.entries(projectKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) projects.push(code)
  }
  return projects
}

async function executeSaveDream(
  input: { content: string; title?: string; category?: string; tags?: string[]; media_url?: string; media_type?: string },
  chatId?: number
): Promise<string> {
  try {
    const content = input.content
    const category = input.category || autoCategorizeDream(content)
    const autoTags = autoTagDream(content)
    const tags = [...new Set([...(input.tags || []), ...autoTags])]
    const title = input.title || generateDreamTitle(content)
    const linkedProjects = findLinkedProjects(content)

    // Save to Supabase
    const entry = {
      title,
      content,
      category,
      tags,
      source: chatId ? 'telegram' : 'api',
      author: 'benjamin',
      telegram_chat_id: chatId || null,
      media_url: input.media_url || null,
      media_type: input.media_type || null,
      ai_linked_projects: linkedProjects,
      ai_themes: tags.slice(0, 5),
    }

    const { data, error } = await supabase
      .from('dream_journal')
      .insert(entry)
      .select('id, title, category, tags, ai_linked_projects')
      .single()

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    // Find related entries
    const { data: related } = await supabase
      .from('dream_journal')
      .select('id, title, category, tags')
      .neq('id', data.id)
      .overlaps('tags', tags.slice(0, 3))
      .order('created_at', { ascending: false })
      .limit(3)

    const emoji: Record<string, string> = {
      dream: '🌙', story: '📖', reflection: '🪞', excitement: '🔥',
      idea: '💡', experience: '🌿', love: '❤️', vision: '🔮',
    }

    return JSON.stringify({
      saved: true,
      id: data.id,
      title: data.title,
      category: data.category,
      tags: data.tags,
      linkedProjects: data.ai_linked_projects,
      relatedEntries: related?.map(r => ({ id: r.id, title: r.title, category: r.category })) || [],
      message: `${emoji[category] || '✨'} Saved to Dream Journal as "${title}" [${category}]${tags.length ? ` — tagged: ${tags.join(', ')}` : ''}${linkedProjects.length ? ` — linked to: ${linkedProjects.join(', ')}` : ''}${related?.length ? `\n\n🔗 Related dreams: ${related.map(r => `"${r.title}"`).join(', ')}` : ''}`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_dreams
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSearchDreams(
  input: { query?: string; category?: string; limit?: number }
): Promise<string> {
  try {
    const limit = input.limit || 10

    let query = supabase
      .from('dream_journal')
      .select('id, title, content, category, tags, ai_linked_projects, ai_themes, source, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (input.category) {
      query = query.eq('category', input.category)
    }

    if (input.query) {
      query = query.or(`content.ilike.%${input.query}%,title.ilike.%${input.query}%`)
    }

    const { data, error } = await query

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    return JSON.stringify({
      count: data?.length || 0,
      entries: data?.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        tags: e.tags,
        linkedProjects: e.ai_linked_projects,
        source: e.source,
        preview: e.content?.slice(0, 200),
        created: e.created_at,
      })),
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}
