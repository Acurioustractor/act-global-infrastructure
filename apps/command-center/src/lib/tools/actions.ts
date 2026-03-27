import Anthropic from '@anthropic-ai/sdk'
import { Client as NotionClient } from '@notionhq/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import { supabase } from '../supabase'
import { getGoogleAccessToken } from '../tool-helpers'
import { savePendingAction } from '../telegram/pending-action-state'
import { getBrisbaneDate, getBrisbaneNow } from '../timezone'
import {
  fetchGrantOpportunities,
  fetchGrantPipeline,
  fetchGrantReadiness,
} from '@act/intel'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: draft_email
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeDraftEmail(
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

export async function sendEmailViaGmail(to: string, subject: string, body: string): Promise<string> {
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

export async function executeCreateCalendarEvent(
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

export async function createGoogleCalendarEvent(event: {
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

export async function executeSetReminder(
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
// TOOL: get_meeting_prep
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetMeetingPrep(input: {
  event_title?: string
  date?: string
}): Promise<string> {
  const date = input.date || getBrisbaneDate()
  const now = getBrisbaneNow()

  try {
    // Find the target event
    const eventQuery = supabase
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

export async function executeCaptureMeetingNotes(
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
// NOTION WRITE TOOLS — shared helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _notionDbIdsCache: Record<string, string> | null = null
export function loadNotionDbIds(): Record<string, string> {
  if (_notionDbIdsCache) return _notionDbIdsCache
  try {
    const configPath = join(process.cwd(), '..', '..', 'config', 'notion-database-ids.json')
    _notionDbIdsCache = JSON.parse(readFileSync(configPath, 'utf-8'))
    return _notionDbIdsCache!
  } catch {
    return {}
  }
}

export function getNotionClient(): NotionClient {
  return new NotionClient({ auth: process.env.NOTION_TOKEN })
}

export async function resolveProjectPageId(projectCode: string): Promise<string | null> {
  const dbIds = loadNotionDbIds()
  const projectsDbId = dbIds.actProjects
  if (!projectsDbId || !process.env.NOTION_TOKEN) return null

  try {
    const notion = getNotionClient()
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

export async function executeAddMeetingToNotion(input: {
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

export async function executeAddActionItem(input: {
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

export async function executeAddDecision(input: {
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
// TOOL: get_grant_opportunities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetGrantOpportunities(input: {
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

export async function executeGetGrantPipeline(input: {
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
// TOOL: search_grants_for_project
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeSearchGrantsForProject(input: {
  project_code: string
  min_score?: number
  limit?: number
}): Promise<string> {
  try {
    const threshold = (input.min_score || 65) / 100
    const matchLimit = input.limit || 10

    // Get project embedding
    const { data: projectProfile, error: profileError } = await supabase
      .from('project_profiles')
      .select('id, name, embedding, domains, geographic_focus')
      .eq('project_code', input.project_code)
      .maybeSingle()

    if (profileError || !projectProfile) {
      return JSON.stringify({ error: `Project ${input.project_code} not found. Valid codes: ACT-HV, ACT-FM, ACT-EL, ACT-JH, ACT-GD, ACT-PI, ACT-CA` })
    }

    if (!projectProfile.embedding) {
      return JSON.stringify({ error: `Project ${input.project_code} has no embedding. Save the org profile to generate one.` })
    }

    // Vector similarity search using project embedding
    const { data: matches, error: matchError } = await supabase
      .rpc('match_grants_for_org', {
        org_embedding: projectProfile.embedding,
        threshold,
        match_limit: matchLimit,
      })

    if (matchError) {
      return JSON.stringify({ error: matchError.message })
    }

    const projectDomains = new Set<string>((projectProfile.domains || []).map((d: string) => d.toLowerCase()))
    const projectGeo = new Set<string>((projectProfile.geographic_focus || []).map((g: string) => g.toLowerCase()))

    // Score and format results
    const scored = (matches || []).map((grant: {
      id: string; name: string; provider: string; description: string;
      amount_max: number | null; closes_at: string | null; categories: string[];
      geography: string | null; similarity: number; focus_areas: string[];
    }) => {
      let score = grant.similarity

      // Domain overlap boost
      if (grant.categories?.length && projectDomains.size > 0) {
        const overlap = grant.categories.filter((c: string) => projectDomains.has(c.toLowerCase())).length
        score += Math.min(overlap * 0.025, 0.05)
      }
      if (grant.focus_areas?.length && projectDomains.size > 0) {
        const overlap = grant.focus_areas.filter((f: string) => projectDomains.has(f.toLowerCase())).length
        score += Math.min(overlap * 0.025, 0.05)
      }

      // Geographic boost
      if (grant.geography && projectGeo.size > 0) {
        const geoLower = grant.geography.toLowerCase()
        for (const g of projectGeo) {
          if (geoLower.includes(g) || g.includes(geoLower)) {
            score += 0.03
            break
          }
        }
      }

      // Stale grant penalty
      if (grant.closes_at) {
        const yearsAgo = (Date.now() - new Date(grant.closes_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        if (yearsAgo >= 5) score -= 0.20
        else if (yearsAgo >= 2) score -= 0.10
      }

      const fitScore = Math.max(0, Math.min(Math.round(score * 100), 100))

      return {
        id: grant.id,
        name: grant.name,
        provider: grant.provider,
        fit_score: fitScore,
        amount: grant.amount_max ? `$${grant.amount_max.toLocaleString()}` : 'Not specified',
        deadline: grant.closes_at
          ? new Date(grant.closes_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Ongoing',
        categories: grant.categories?.slice(0, 4) || [],
        geography: grant.geography,
      }
    })

    scored.sort((a: { fit_score: number }, b: { fit_score: number }) => b.fit_score - a.fit_score)

    return JSON.stringify({
      project: projectProfile.name,
      project_code: input.project_code,
      match_count: scored.length,
      matches: scored,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: draft_grant_response
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeDraftGrantResponse(
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
// TOOL: get_grant_readiness
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetGrantReadiness(input: {
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
