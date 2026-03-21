import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface SearchResult {
  entity_type: string
  entity_id: string
  entity_name: string
  subtitle?: string
  value_high?: number
  already_tracked: boolean
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const pattern = `%${q}%`

    // Search across all source tables + check which are already in pipeline
    const [grantsRes, foundationsRes, contactsRes, xeroRes, existingRes] = await Promise.all([
      supabase
        .from('grant_opportunities')
        .select('id, name, provider, amount_max')
        .ilike('name', pattern)
        .limit(10),
      supabase
        .from('foundations')
        .select('id, name, website, annual_giving_total')
        .ilike('name', pattern)
        .limit(10),
      supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, company_name')
        .ilike('full_name', pattern)
        .limit(10),
      supabase
        .from('xero_invoices')
        .select('contact_id, contact_name, total')
        .ilike('contact_name', pattern)
        .eq('type', 'ACCREC')
        .limit(20),
      supabase
        .from('relationship_pipeline')
        .select('entity_type, entity_id'),
    ])

    const tracked = new Set(
      (existingRes.data || []).map(e => `${e.entity_type}:${e.entity_id}`)
    )

    const results: SearchResult[] = []

    // Grants
    for (const g of grantsRes.data || []) {
      results.push({
        entity_type: 'grant',
        entity_id: g.id,
        entity_name: g.name,
        subtitle: g.provider || undefined,
        value_high: g.amount_max || undefined,
        already_tracked: tracked.has(`grant:${g.id}`),
      })
    }

    // Foundations
    for (const f of foundationsRes.data || []) {
      results.push({
        entity_type: 'foundation',
        entity_id: f.id,
        entity_name: f.name,
        subtitle: f.website || undefined,
        value_high: f.annual_giving_total || undefined,
        already_tracked: tracked.has(`foundation:${f.id}`),
      })
    }

    // People (GHL contacts)
    for (const c of contactsRes.data || []) {
      results.push({
        entity_type: 'person',
        entity_id: c.ghl_id,
        entity_name: c.full_name,
        subtitle: [c.company_name, c.email].filter(Boolean).join(' · ') || undefined,
        already_tracked: tracked.has(`person:${c.ghl_id}`),
      })
    }

    // Businesses (Xero contacts — dedupe by contact_name)
    const seenBusinesses = new Set<string>()
    for (const x of xeroRes.data || []) {
      if (!x.contact_name || seenBusinesses.has(x.contact_name)) continue
      seenBusinesses.add(x.contact_name)
      const eid = x.contact_id || `xero-${x.contact_name.toLowerCase().replace(/\s+/g, '-')}`
      results.push({
        entity_type: 'business',
        entity_id: eid,
        entity_name: x.contact_name,
        subtitle: `Xero contact`,
        value_high: x.total || undefined,
        already_tracked: tracked.has(`business:${eid}`),
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Pipeline search error:', error)
    return NextResponse.json({ results: [] }, { status: 500 })
  }
}
