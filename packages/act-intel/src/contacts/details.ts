/**
 * Contact details — comprehensive contact card with health signals,
 * recent communications, pipeline, and next meeting.
 *
 * Extracted from agent-tools executeGetContactDetails.
 */

import type { SupabaseQueryClient } from '../types.js'

export interface ContactDetailsOptions {
  contact_id: string
}

export interface ContactDetailsResult {
  id: string
  ghl_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string | null
  tags: string[]
  projects: string[]
  last_contact: string | null
  days_since_contact: number | null
  relationship: {
    temperature: number
    trend: string | null
    last_change: string | null
    lcaa_stage: string | null
    risk_flags: string[]
    signals: {
      email: number
      calendar: number
      financial: number
      pipeline: number
      knowledge: number
    }
  } | null
  open_pipeline: {
    count: number
    total_value: number
    opportunities: Array<{ name: string; value: number | null; stage: string | null }>
  }
  next_meeting: { title: string; date: string } | null
  recent_communications: Array<{
    direction: string
    channel: string
    subject: string | null
    summary: string | null
    date: string
  }>
}

export async function fetchContactDetails(
  supabase: SupabaseQueryClient,
  opts: ContactDetailsOptions
): Promise<ContactDetailsResult | null> {
  const { contact_id } = opts

  // Try by UUID first, then by GHL ID
  let query = supabase.from('ghl_contacts').select('*')
  if (contact_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) {
    query = query.eq('id', contact_id)
  } else {
    query = query.eq('ghl_id', contact_id)
  }

  const { data: contact, error } = await query.maybeSingle()
  if (error) throw new Error(`Contact lookup failed: ${error.message}`)
  if (!contact) return null

  const c = contact as Record<string, unknown>
  const ghlId = c.ghl_id as string
  const contactUuid = c.id as string

  const [commsResult, healthResult, nextMeetingResult, pipelineResult] = await Promise.all([
    supabase
      .from('communications_history')
      .select('direction, channel, subject, summary, communication_date')
      .eq('contact_id', contactUuid)
      .order('communication_date', { ascending: false })
      .limit(5),
    supabase
      .from('relationship_health')
      .select('temperature, temperature_trend, last_temperature_change, lcaa_stage, risk_flags, email_score, calendar_score, financial_score, pipeline_score, knowledge_score')
      .eq('ghl_contact_id', ghlId)
      .maybeSingle(),
    supabase
      .from('calendar_events')
      .select('title, start_time, attendees')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(10),
    supabase
      .from('ghl_opportunities')
      .select('name, monetary_value, stage_name, status')
      .eq('contact_id', ghlId)
      .eq('status', 'open'),
  ])

  const health = healthResult.data as Record<string, unknown> | null
  const comms = (commsResult.data || []) as Array<Record<string, unknown>>
  const pipeline = (pipelineResult.data || []) as Array<Record<string, unknown>>

  // Find next meeting involving this contact
  const contactName = ((c.full_name as string) || '').toLowerCase()
  const contactEmail = ((c.email as string) || '').toLowerCase()
  const nextMeeting = ((nextMeetingResult.data || []) as Array<Record<string, unknown>>).find((e) => {
    const attendees = JSON.stringify(e.attendees || []).toLowerCase()
    const title = ((e.title as string) || '').toLowerCase()
    return (contactEmail && attendees.includes(contactEmail)) || (contactName && title.includes(contactName))
  })

  const now = new Date()
  const openPipelineValue = pipeline.reduce((sum: number, o) => sum + ((o.monetary_value as number) || 0), 0)

  return {
    id: contactUuid,
    ghl_id: ghlId,
    name: (c.full_name as string) || 'Unknown',
    email: c.email as string | null,
    phone: c.phone as string | null,
    company: c.company_name as string | null,
    status: c.engagement_status as string | null,
    tags: (c.tags as string[]) || [],
    projects: (c.projects as string[]) || [],
    last_contact: c.last_contact_date as string | null,
    days_since_contact: c.last_contact_date
      ? Math.floor((now.getTime() - new Date(c.last_contact_date as string).getTime()) / 86400000)
      : null,
    relationship: health ? {
      temperature: health.temperature as number,
      trend: health.temperature_trend as string | null,
      last_change: health.last_temperature_change as string | null,
      lcaa_stage: health.lcaa_stage as string | null,
      risk_flags: (health.risk_flags as string[]) || [],
      signals: {
        email: (health.email_score as number) || 0,
        calendar: (health.calendar_score as number) || 0,
        financial: (health.financial_score as number) || 0,
        pipeline: (health.pipeline_score as number) || 0,
        knowledge: (health.knowledge_score as number) || 0,
      },
    } : null,
    open_pipeline: {
      count: pipeline.length,
      total_value: openPipelineValue,
      opportunities: pipeline.map((o) => ({
        name: o.name as string,
        value: (o.monetary_value as number) || null,
        stage: (o.stage_name as string) || null,
      })),
    },
    next_meeting: nextMeeting
      ? { title: nextMeeting.title as string, date: nextMeeting.start_time as string }
      : null,
    recent_communications: comms.map((cm) => ({
      direction: cm.direction as string,
      channel: cm.channel as string,
      subject: cm.subject as string | null,
      summary: cm.summary as string | null,
      date: cm.communication_date as string,
    })),
  }
}
