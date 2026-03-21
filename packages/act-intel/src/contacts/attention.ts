/**
 * Contacts needing attention — finds contacts with falling relationship
 * temperature or active risk flags, with fallback to date threshold.
 *
 * Extracted from agent-tools executeGetContactsNeedingAttention.
 */

import type { SupabaseQueryClient } from '../types.js'
import { getBrisbaneNow } from '../util/dates.js'

export interface ContactAttentionOptions {
  limit?: number
  project?: string
}

export interface ContactAttentionEntry {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string | null
  tags: string[]
  projects: string[]
  last_contact: string | null
  days_since_contact: number | null
  temperature: number | null
  trend: string | null
  temperature_change: string | null
  risk_flags: string[]
  recommended_action: string
}

export interface ContactAttentionResult {
  description: string
  count: number
  contacts: ContactAttentionEntry[]
}

function suggestAction(
  riskFlags: string[],
  health: { email_score?: number; calendar_score?: number; next_meeting_date?: string } | null | undefined
): string {
  if (riskFlags.includes('awaiting_response')) return "Reply to their recent message — they're waiting to hear back"
  if (riskFlags.includes('high_value_inactive')) return 'High-value deal at risk — schedule a call or meeting ASAP'
  if (riskFlags.includes('one_way_outbound')) return 'Emails going unanswered — try a different channel (call, text, in-person)'
  if (riskFlags.includes('going_cold')) return 'Relationship cooling — send a check-in or share something relevant'
  if (health?.next_meeting_date) return `Meeting scheduled ${new Date(health.next_meeting_date).toLocaleDateString()} — prepare talking points`
  return 'Consider reaching out with a relevant update or check-in'
}

export async function fetchContactsNeedingAttention(
  supabase: SupabaseQueryClient,
  opts: ContactAttentionOptions = {}
): Promise<ContactAttentionResult> {
  const limit = opts.limit || 10

  // Primary: use relationship_health signals (falling temperature or risk flags)
  const { data: healthData } = await supabase
    .from('relationship_health')
    .select('ghl_contact_id, temperature, temperature_trend, last_temperature_change, risk_flags, email_score, calendar_score, next_meeting_date')
    .or('temperature_trend.eq.falling,risk_flags.not.is.null')
    .order('temperature', { ascending: true })
    .limit(limit * 2)

  const ghlIds = ((healthData || []) as Array<Record<string, unknown>>).map((h) => h.ghl_contact_id as string)

  let contactQuery = supabase
    .from('ghl_contacts')
    .select('id, ghl_id, full_name, email, phone, company_name, engagement_status, tags, projects, last_contact_date')
    .in('ghl_id', ghlIds.length > 0 ? ghlIds : ['__none__'])

  if (opts.project) {
    contactQuery = contactQuery.contains('tags', [opts.project.toLowerCase()])
  }

  const { data: contactData } = await contactQuery

  // Build health lookup
  const healthMap: Record<string, Record<string, unknown>> = {}
  for (const h of ((healthData || []) as Array<Record<string, unknown>>)) {
    healthMap[h.ghl_contact_id as string] = h
  }

  const now = new Date()
  const contacts: ContactAttentionEntry[] = ((contactData || []) as Array<Record<string, unknown>>)
    .map((c) => {
      const health = healthMap[c.ghl_id as string]
      const riskFlags = (health?.risk_flags as string[]) || []
      return {
        id: c.id as string,
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
        temperature: (health?.temperature as number) ?? null,
        trend: (health?.temperature_trend as string) ?? null,
        temperature_change: (health?.last_temperature_change as string) ?? null,
        risk_flags: riskFlags,
        recommended_action: suggestAction(riskFlags, health as Record<string, unknown> | undefined),
      }
    })
    .sort((a, b) => (a.temperature ?? 999) - (b.temperature ?? 999))
    .slice(0, limit)

  // Fallback: if no signal-based results, use simple date threshold
  if (contacts.length === 0) {
    const fourteenDaysAgo = getBrisbaneNow()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const sixtyDaysAgo = getBrisbaneNow()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    let fallbackQuery = supabase
      .from('ghl_contacts')
      .select('id, ghl_id, full_name, email, phone, company_name, engagement_status, tags, projects, last_contact_date')
      .lt('last_contact_date', fourteenDaysAgo.toISOString())
      .gt('last_contact_date', sixtyDaysAgo.toISOString())
      .order('last_contact_date', { ascending: true })
      .limit(limit)

    if (opts.project) {
      fallbackQuery = fallbackQuery.contains('tags', [opts.project.toLowerCase()])
    }

    const { data: fallbackData } = await fallbackQuery

    const fallbackContacts: ContactAttentionEntry[] = ((fallbackData || []) as Array<Record<string, unknown>>).map((c) => ({
      id: c.id as string,
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
      temperature: null,
      trend: null,
      temperature_change: null,
      risk_flags: [],
      recommended_action: 'Reach out — no recent contact',
    }))

    return {
      description: 'Contacts who need follow-up (14-60 days since last contact, no signal data available yet)',
      count: fallbackContacts.length,
      contacts: fallbackContacts,
    }
  }

  return {
    description: 'Contacts with falling relationship temperature or active risk flags, prioritized by urgency',
    count: contacts.length,
    contacts,
  }
}
