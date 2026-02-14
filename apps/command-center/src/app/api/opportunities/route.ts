import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface UnifiedOpportunity {
  id: string
  source: 'grant' | 'ghl' | 'fundraising'
  name: string
  type: string
  projectCodes: string[]
  amount: { min?: number; max?: number }
  deadline?: string
  fitScore?: number
  status: string
  provider?: string
  url?: string
  discoveredAt?: string
  contact?: {
    name: string
    email?: string
    company?: string
  }
  recentEmails?: Array<{
    subject: string
    date: string
    direction: 'inbound' | 'outbound'
    channel: string
  }>
  relationshipTemp?: number
  daysSinceContact?: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectFilter = searchParams.get('project')
    const typeFilter = searchParams.get('type')
    const statusFilter = searchParams.get('status')

    // Query all sources + enrichment data in parallel
    const [grantsRes, ghlRes, fundraisingRes, contactsRes, commsRes, healthRes, grantAppsRes] = await Promise.all([
      // grant_opportunities
      supabase
        .from('grant_opportunities')
        .select('id, name, provider, program, amount_min, amount_max, closes_at, fit_score, relevance_score, aligned_projects, categories, url, application_status, created_at'),
      // ghl_opportunities — include ghl_contact_id for enrichment
      supabase
        .from('ghl_opportunities')
        .select('id, name, pipeline_name, stage_name, status, monetary_value, project_code, ghl_created_at, ghl_updated_at, ghl_contact_id')
        .eq('status', 'open'),
      // fundraising_pipeline
      supabase
        .from('fundraising_pipeline')
        .select('id, name, funder, type, amount, status, probability, expected_date, deadline, project_codes, created_at, contact_id')
        .not('status', 'in', '("declined","received")'),
      // Enrichment: contacts
      supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, company_name'),
      // Enrichment: recent comms (last 90 days, limit 500 most recent)
      supabase
        .from('communications_history')
        .select('ghl_contact_id, subject, channel, occurred_at, direction')
        .gte('occurred_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('occurred_at', { ascending: false })
        .limit(500),
      // Enrichment: relationship health
      supabase
        .from('relationship_health')
        .select('ghl_contact_id, temperature, days_since_contact'),
      // Enrichment: grant applications (for lead_contact)
      supabase
        .from('grant_applications')
        .select('opportunity_id, lead_contact, project_code'),
    ])

    // Build lookup maps
    const contactMap = new Map<string, { name: string; email?: string; company?: string }>()
    for (const c of contactsRes.data || []) {
      if (c.ghl_id && c.full_name) {
        contactMap.set(c.ghl_id, {
          name: c.full_name,
          email: c.email || undefined,
          company: c.company_name || undefined,
        })
      }
    }

    // Group comms by contact — keep last 3 per contact
    const commsMap = new Map<string, Array<{ subject: string; date: string; direction: 'inbound' | 'outbound'; channel: string }>>()
    for (const comm of commsRes.data || []) {
      if (!comm.ghl_contact_id) continue
      const existing = commsMap.get(comm.ghl_contact_id) || []
      if (existing.length < 3) {
        existing.push({
          subject: comm.subject || '(no subject)',
          date: comm.occurred_at,
          direction: comm.direction as 'inbound' | 'outbound',
          channel: comm.channel,
        })
        commsMap.set(comm.ghl_contact_id, existing)
      }
    }

    // Relationship health map
    const healthMap = new Map<string, { temperature: number; daysSinceContact: number }>()
    for (const h of healthRes.data || []) {
      if (h.ghl_contact_id) {
        healthMap.set(h.ghl_contact_id, {
          temperature: h.temperature ?? 0,
          daysSinceContact: h.days_since_contact ?? 999,
        })
      }
    }

    // Grant applications by opportunity_id
    const grantAppMap = new Map<string, { leadContact: string; projectCode?: string }>()
    for (const a of grantAppsRes.data || []) {
      if (a.opportunity_id && a.lead_contact) {
        grantAppMap.set(a.opportunity_id, {
          leadContact: a.lead_contact,
          projectCode: a.project_code || undefined,
        })
      }
    }

    const opportunities: UnifiedOpportunity[] = []

    // Normalize grant_opportunities
    for (const g of grantsRes.data || []) {
      const appStatus = g.application_status || 'not_applied'
      const displayStatus = appStatus === 'not_applied' ? 'open'
        : appStatus === 'applied' ? 'applied'
        : appStatus === 'successful' ? 'won'
        : appStatus === 'unsuccessful' ? 'lost'
        : appStatus

      // Try to get contact from grant_applications
      const grantApp = grantAppMap.get(g.id)

      opportunities.push({
        id: g.id,
        source: 'grant',
        name: g.name,
        type: 'grant',
        projectCodes: g.aligned_projects || [],
        amount: { min: g.amount_min ?? undefined, max: g.amount_max ?? undefined },
        deadline: g.closes_at ?? undefined,
        fitScore: g.fit_score ?? g.relevance_score ?? undefined,
        status: displayStatus,
        provider: g.provider ?? undefined,
        url: g.url ?? undefined,
        discoveredAt: g.created_at ?? undefined,
        contact: grantApp?.leadContact ? { name: grantApp.leadContact } : undefined,
      })
    }

    // Normalize ghl_opportunities
    for (const o of ghlRes.data || []) {
      const contactId = o.ghl_contact_id
      const contact = contactId ? contactMap.get(contactId) : undefined
      const emails = contactId ? commsMap.get(contactId) : undefined
      const health = contactId ? healthMap.get(contactId) : undefined

      opportunities.push({
        id: o.id,
        source: 'ghl',
        name: o.name,
        type: 'service',
        projectCodes: o.project_code ? [o.project_code] : [],
        amount: { max: o.monetary_value ?? undefined },
        status: o.stage_name || o.status || 'open',
        provider: o.pipeline_name ?? undefined,
        discoveredAt: o.ghl_created_at ?? undefined,
        contact,
        recentEmails: emails,
        relationshipTemp: health?.temperature,
        daysSinceContact: health?.daysSinceContact,
      })
    }

    // Normalize fundraising_pipeline
    for (const f of fundraisingRes.data || []) {
      // Try matching contact_id to ghl_contacts
      const contact = f.contact_id ? contactMap.get(f.contact_id) : undefined
      const emails = f.contact_id ? commsMap.get(f.contact_id) : undefined
      const health = f.contact_id ? healthMap.get(f.contact_id) : undefined

      opportunities.push({
        id: f.id,
        source: 'fundraising',
        name: f.name,
        type: f.type || 'grant',
        projectCodes: f.project_codes || [],
        amount: { max: f.amount ?? undefined },
        deadline: f.deadline ?? f.expected_date ?? undefined,
        status: f.status,
        provider: f.funder ?? undefined,
        discoveredAt: f.created_at ?? undefined,
        contact,
        recentEmails: emails,
        relationshipTemp: health?.temperature,
        daysSinceContact: health?.daysSinceContact,
      })
    }

    // Apply filters
    let filtered = opportunities

    if (projectFilter) {
      filtered = filtered.filter(o => o.projectCodes.includes(projectFilter))
    }
    if (typeFilter) {
      if (typeFilter === 'grant') {
        filtered = filtered.filter(o => o.source === 'grant' || o.type === 'grant')
      } else if (typeFilter === 'sales') {
        filtered = filtered.filter(o => o.source === 'ghl')
      } else if (typeFilter === 'fundraising') {
        filtered = filtered.filter(o => o.source === 'fundraising')
      }
    }
    if (statusFilter) {
      filtered = filtered.filter(o => o.status === statusFilter)
    }

    // Sort: highest fit score first, then by deadline
    filtered.sort((a, b) => {
      if (a.fitScore && b.fitScore) return b.fitScore - a.fitScore
      if (a.fitScore) return -1
      if (b.fitScore) return 1
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      if (a.deadline) return -1
      return 0
    })

    // Summary stats
    const summary = {
      total: filtered.length,
      grants: filtered.filter(o => o.source === 'grant').length,
      ghl: filtered.filter(o => o.source === 'ghl').length,
      fundraising: filtered.filter(o => o.source === 'fundraising').length,
      totalValue: filtered.reduce((sum, o) => sum + (o.amount.max || 0), 0),
      highFit: filtered.filter(o => (o.fitScore || 0) >= 70).length,
    }

    return NextResponse.json({ opportunities: filtered, summary })
  } catch (error) {
    console.error('Error in unified opportunities:', error)
    return NextResponse.json({ opportunities: [], summary: { total: 0, grants: 0, ghl: 0, fundraising: 0, totalValue: 0, highFit: 0 } }, { status: 500 })
  }
}
