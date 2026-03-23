import { google } from 'googleapis'
import { supabase } from '../supabase'
import { getBrisbaneDate, getBrisbaneNow, getBrisbaneDateOffset } from '../timezone'
import {
  fetchDailyBriefing,
  searchContacts,
  fetchContactDetails,
  searchKnowledge,
} from '@act/intel'
import type { DailyBriefingResult } from '@act/intel'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: query_supabase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeQuerySupabase(input: {
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

export async function fallbackQuery(sql: string, description: string): Promise<string> {
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

export async function executeGetDailyBriefing(input: {
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
  if (result.grant_deadlines.length > 0) {
    const upcoming = result.grant_deadlines.filter(g => g.deadline)
    if (upcoming.length > 0) {
      actions.push(`${upcoming.length} grant${upcoming.length > 1 ? 's' : ''} in pipeline`)
    }
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
      recent_decisions: result.recent_decisions,
      stale_relationships: result.stale_relationships.map((r) => ({
        name: r.full_name || r.email || 'Unknown',
        company: r.company_name,
        status: r.engagement_status,
        last_contact: r.last_contact_date,
      })),
      active_projects: result.active_projects.slice(0, 10),
      upcoming_calendar: result.upcoming_calendar,
      grant_deadlines: result.grant_deadlines,
    })
  }

  return JSON.stringify({
    actions,
    meetings_today: result.recent_meetings.length,
    meetings: result.recent_meetings.slice(0, 5).map(m => ({
      title: m.title, date: m.updated_at,
      summary: m.ai_summary?.slice(0, 100),
    })),
    overdue: result.overdue_actions.slice(0, 5).map((a) => ({
      title: a.title, due: a.due_date, assigned: a.assigned_to,
    })),
    followups_due: result.upcoming_followups.slice(0, 5).map((f) => ({
      title: f.title, due: f.due_date, assigned: f.assigned_to,
    })),
    active_projects: result.active_projects.length,
    calendar_upcoming: result.upcoming_calendar.length,
    grants_in_pipeline: result.grant_deadlines.length,
  })
}

export function formatDailyBriefingVoice(result: DailyBriefingResult): string {
  const parts: string[] = []

  const calendarCount = result.upcoming_calendar.length
  if (calendarCount === 0) {
    parts.push('No upcoming events on the planning calendar.')
  } else {
    const firstFew = result.upcoming_calendar.slice(0, 3)
    const eventDescs = firstFew.map((e) => e.title).join(', ')
    parts.push(`${calendarCount} upcoming event${calendarCount === 1 ? '' : 's'}. ${calendarCount <= 3 ? eventDescs + '.' : 'Including ' + eventDescs + '.'}`)
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
    parts.push(`${projectCount} project${projectCount === 1 ? '' : 's'} active.`)
  }

  const grantCount = result.grant_deadlines.length
  if (grantCount > 0) {
    parts.push(`${grantCount} grant${grantCount === 1 ? '' : 's'} in the pipeline.`)
  }

  return parts.join(' ')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_contacts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeSearchContacts(input: {
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

export async function executeGetContactDetails(input: {
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

export async function executeGetCalendarEvents(input: {
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

export async function executeSearchKnowledge(input: {
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
// TOOL: search_emails
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeSearchEmails(input: {
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
// TOOL: get_day_context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetDayContext(input: { date?: string }): Promise<string> {
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
// TOOL: get_daily_priorities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetDailyPriorities(input: { limit?: number }): Promise<string> {
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
      return 'All clear — no urgent priorities right now. Everything is on track.'
    }

    const nowItems = items.filter(i => i.priority === 'now')
    const nextItems = items.filter(i => i.priority === 'next')

    const lines: string[] = []
    lines.push(`**Daily Priorities** (${nowItems.length} NOW, ${nextItems.length} NEXT)\n`)

    let rank = 1
    for (const item of nowItems) {
      let context: any = null
      try { context = item.notes ? JSON.parse(item.notes) : null } catch { context = null }

      const valuePart = context?.amount || context?.value ? ` — $${Number(context.amount || context.value).toLocaleString()}` : ''
      const projectPart = item.project_code ? ` [${item.project_code}]` : ''
      const actionPart = context?.action ? `\n   -> ${context.action}` : ''

      lines.push(`${rank}. **${item.title}**${valuePart}${projectPart}${actionPart}`)
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
      const actionPart = context?.action ? `\n   -> ${context.action}` : ''

      lines.push(`${rank}. ${item.title}${valuePart}${projectPart}${actionPart}`)
      rank++
    }

    return lines.join('\n')
  } catch (err: any) {
    return `Error: ${err.message}`
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_ecosystem_pulse
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetEcosystemPulse(): Promise<string> {
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
