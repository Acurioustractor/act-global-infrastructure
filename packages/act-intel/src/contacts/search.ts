/**
 * Contact search — find contacts by name/email/company and enrich with
 * last interaction and open pipeline value.
 *
 * Merges agent-tools (executeSearchContacts) and
 * Notion Workers (lookup_contact).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface ContactSearchOptions {
  query: string
  limit?: number
}

export interface ContactSearchEntry {
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
  last_interaction_topic: string | null
  last_interaction_date: string | null
  open_pipeline_value: number | null
  // Notion Workers enrichment
  temperature: number | null
  temperature_trend: string | null
  signals: {
    email: number
    calendar: number
    financial: number
    pipeline: number
  } | null
  risk_flags: unknown[] | null
  recent_comms_30d: number | null
}

export interface ContactSearchResult {
  query: string
  count: number
  contacts: ContactSearchEntry[]
}

export async function searchContacts(
  supabase: SupabaseQueryClient,
  opts: ContactSearchOptions
): Promise<ContactSearchResult> {
  const { query, limit = 10 } = opts
  const searchTerm = `%${query}%`

  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, full_name, first_name, last_name, email, phone, company_name, engagement_status, tags, projects, last_contact_date')
    .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
    .order('last_contact_date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Contact search failed: ${error.message}`)

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

  const contacts: ContactSearchEntry[] = await Promise.all(
    (data || []).map(async (c: Record<string, unknown>) => {
      const ghlId = c.ghl_id as string
      const contactId = c.id as string
      const email = c.email as string | null
      const fullName = (c.full_name as string) || `${(c.first_name as string) || ''} ${(c.last_name as string) || ''}`.trim() || 'Unknown'

      const base: ContactSearchEntry = {
        id: contactId,
        ghl_id: ghlId,
        name: fullName,
        email,
        phone: c.phone as string | null,
        company: c.company_name as string | null,
        status: c.engagement_status as string | null,
        tags: (c.tags as string[]) || [],
        projects: (c.projects as string[]) || [],
        last_contact: c.last_contact_date as string | null,
        days_since_contact: c.last_contact_date
          ? Math.floor((now.getTime() - new Date(c.last_contact_date as string).getTime()) / 86400000)
          : null,
        last_interaction_topic: null,
        last_interaction_date: null,
        open_pipeline_value: null,
        temperature: null,
        temperature_trend: null,
        signals: null,
        risk_flags: null,
        recent_comms_30d: null,
      }

      // Parallel enrichment: last comm, pipeline, health, recent comms count
      const [commResult, healthResult, commsCountResult, pipelineResult] = await Promise.all([
        supabase
          .from('communications_history')
          .select('subject, communication_date')
          .eq('contact_id', contactId)
          .order('communication_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('relationship_health')
          .select('temperature, temperature_trend, email_score, calendar_score, financial_score, pipeline_score, risk_flags')
          .eq('ghl_contact_id', ghlId)
          .maybeSingle(),
        email
          ? supabase
              .from('communications')
              .select('id', { count: 'exact', head: true } as any)
              .or(`from_email.ilike.%${email}%,to_emails.cs.{${email}}`)
              .gte('date', thirtyDaysAgo)
          : Promise.resolve({ count: null }),
        ghlId
          ? supabase
              .from('ghl_opportunities')
              .select('monetary_value')
              .eq('contact_id', ghlId)
              .eq('status', 'open')
          : Promise.resolve({ data: null }),
      ])

      if (commResult.data) {
        const comm = commResult.data as Record<string, unknown>
        base.last_interaction_topic = comm.subject as string | null
        base.last_interaction_date = comm.communication_date as string | null
      }

      if (healthResult.data) {
        const h = healthResult.data as Record<string, unknown>
        base.temperature = h.temperature as number | null
        base.temperature_trend = h.temperature_trend as string | null
        base.signals = {
          email: (h.email_score as number) || 0,
          calendar: (h.calendar_score as number) || 0,
          financial: (h.financial_score as number) || 0,
          pipeline: (h.pipeline_score as number) || 0,
        }
        base.risk_flags = (h.risk_flags as unknown[]) || null
      }

      base.recent_comms_30d = (commsCountResult as Record<string, unknown>).count as number | null

      const deals = ((pipelineResult as Record<string, unknown>).data as Array<Record<string, unknown>>) || []
      const total = deals.reduce((sum: number, d) => sum + ((d.monetary_value as number) || 0), 0)
      if (total > 0) base.open_pipeline_value = total

      return base
    })
  )

  return { query, count: contacts.length, contacts }
}
