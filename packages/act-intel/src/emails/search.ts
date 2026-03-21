/**
 * Email search — unanswered emails and triage from Supabase views.
 *
 * Note: Gmail API direct search stays in agent-tools.ts (Google SDK dependency).
 * This module handles the Supabase-backed email views used by both consumers.
 */

import type { SupabaseQueryClient } from '../types.js'

// ─────────────────────────────────────────────────────────────────────────
// Unanswered emails
// ─────────────────────────────────────────────────────────────────────────

export interface UnansweredEmailsOptions {
  limit?: number
}

export interface UnansweredEmailEntry {
  contact_name: string | null
  contact_email: string | null
  subject: string
  summary: string | null
  days_since: number | null
  sentiment: string | null
  topics: string[] | null
}

export interface UnansweredEmailsResult {
  count: number
  emails: UnansweredEmailEntry[]
}

export async function fetchUnansweredEmails(
  supabase: SupabaseQueryClient,
  opts: UnansweredEmailsOptions = {}
): Promise<UnansweredEmailsResult> {
  const max = opts.limit ?? 20

  const { data, error } = await supabase
    .from('v_need_to_respond')
    .select('contact_name, contact_email, subject, summary, days_since, sentiment, topics')
    .order('occurred_at', { ascending: true })
    .limit(max)

  if (error) throw new Error(`Unanswered emails query failed: ${error.message}`)

  const emails: UnansweredEmailEntry[] = ((data || []) as Array<Record<string, unknown>>).map((e) => ({
    contact_name: e.contact_name as string | null,
    contact_email: e.contact_email as string | null,
    subject: e.subject as string,
    summary: e.summary as string | null,
    days_since: e.days_since as number | null,
    sentiment: e.sentiment as string | null,
    topics: e.topics as string[] | null,
  }))

  return { count: emails.length, emails }
}

// ─────────────────────────────────────────────────────────────────────────
// Email triage (3-tier prioritization)
// ─────────────────────────────────────────────────────────────────────────

export interface EmailTriageOptions {
  limit?: number
}

export interface EmailTriageEntry {
  id: string
  ghl_contact_id: string | null
  contact_name: string | null
  contact_email: string | null
  subject: string
  summary: string | null
  days_since: number | null
  sentiment: string | null
  topics: string[] | null
  tier: 1 | 2 | 3
}

export interface EmailTriageResult {
  total: number
  tier1: EmailTriageEntry[]
  tier2: EmailTriageEntry[]
  tier3: EmailTriageEntry[]
}

const KEY_TAGS = ['partner', 'funder', 'board', 'investor', 'government', 'key_contact']

export async function triageEmails(
  supabase: SupabaseQueryClient,
  opts: EmailTriageOptions = {}
): Promise<EmailTriageResult> {
  const max = opts.limit ?? 10

  const { data: emails, error } = await supabase
    .from('v_need_to_respond')
    .select('id, ghl_contact_id, contact_name, contact_email, subject, summary, days_since, sentiment, topics, occurred_at')
    .order('occurred_at', { ascending: false })

  if (error) throw new Error(`Email triage query failed: ${error.message}`)
  if (!emails?.length) return { total: 0, tier1: [], tier2: [], tier3: [] }

  const rows = emails as Array<Record<string, unknown>>
  const contactIds = [...new Set(rows.map((e) => e.ghl_contact_id as string).filter(Boolean))]

  const { data: contacts } = contactIds.length > 0
    ? await supabase.from('ghl_contacts').select('ghl_id, tags').in('ghl_id', contactIds)
    : { data: [] }

  const tagMap = new Map(
    ((contacts || []) as Array<Record<string, unknown>>).map((c) => [c.ghl_id as string, (c.tags as string[]) || []])
  )

  const tier1: EmailTriageEntry[] = []
  const tier2: EmailTriageEntry[] = []
  const tier3: EmailTriageEntry[] = []

  for (const email of rows) {
    const tags = tagMap.get(email.ghl_contact_id as string) || []
    const isKeyContact = tags.some((t: string) => KEY_TAGS.some((k) => t.toLowerCase().includes(k)))

    const entry: EmailTriageEntry = {
      id: email.id as string,
      ghl_contact_id: email.ghl_contact_id as string | null,
      contact_name: email.contact_name as string | null,
      contact_email: email.contact_email as string | null,
      subject: email.subject as string,
      summary: email.summary as string | null,
      days_since: email.days_since as number | null,
      sentiment: email.sentiment as string | null,
      topics: email.topics as string[] | null,
      tier: isKeyContact ? 1 : ((email.days_since as number) || 0) <= 7 ? 2 : 3,
    }

    if (isKeyContact) tier1.push(entry)
    else if (((email.days_since as number) || 0) <= 7) tier2.push(entry)
    else tier3.push(entry)
  }

  return {
    total: rows.length,
    tier1: tier1.slice(0, max),
    tier2: tier2.slice(0, max),
    tier3: tier3.slice(0, max),
  }
}
