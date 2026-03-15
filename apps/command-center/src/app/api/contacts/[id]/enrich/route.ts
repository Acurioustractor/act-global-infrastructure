import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/contacts/[id]/enrich
 *
 * Trigger on-demand enrichment for a single contact.
 * Uses Tavily web search, website fetch, LinkedIn cross-ref, GitHub, and OpenAI.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Resolve contact (ghl_id or internal UUID)
    let contactId = id
    const { data: contact } = await supabase
      .from('ghl_contacts')
      .select('id, full_name, email, enrichment_status, enriched_at')
      .or(`id.eq.${id},ghl_id.eq.${id}`)
      .limit(1)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    contactId = contact.id

    // Dynamic import to avoid bundling Node.js scripts into Next.js
    // The enricher runs server-side only
    const { ContactEnricher } = await import(
      '../../../../../../scripts/lib/contact-enricher.mjs'
    )

    const enricher = new ContactEnricher({
      supabase,
      verbose: false,
    })

    const result = await enricher.enrichContact(contactId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      contact: contactId,
      status: result.status,
      sources: result.sources || [],
      data: result.data || null,
      projectMatches: result.projectMatches || [],
    })
  } catch (err) {
    console.error('[API] Contact enrichment failed:', err)
    return NextResponse.json(
      { error: 'Enrichment failed', details: (err as Error).message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/contacts/[id]/enrich
 *
 * Get enrichment status for a contact.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const { data: contact } = await supabase
      .from('ghl_contacts')
      .select('id, full_name, email, enrichment_status, enriched_at, enrichment_data, enrichment_sources, enriched_role, enriched_sector, enriched_bio, enriched_website, enriched_projects')
      .or(`id.eq.${id},ghl_id.eq.${id}`)
      .limit(1)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({
      contact: contact.id,
      name: contact.full_name,
      email: contact.email,
      status: contact.enrichment_status || 'pending',
      enrichedAt: contact.enriched_at,
      sources: contact.enrichment_sources || [],
      data: {
        role: contact.enriched_role,
        sector: contact.enriched_sector,
        bio: contact.enriched_bio,
        website: contact.enriched_website,
        projects: contact.enriched_projects,
        full: contact.enrichment_data,
      },
    })
  } catch (err) {
    console.error('[API] Get enrichment status failed:', err)
    return NextResponse.json(
      { error: 'Failed to get enrichment status' },
      { status: 500 }
    )
  }
}
