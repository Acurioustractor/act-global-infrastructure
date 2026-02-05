import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ghlUpdateContact, ghlAddTag, ghlRemoveTag } from '@/lib/ghl'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Accept both internal UUID and ghl_id (insights store ghl_id)
    // Try ghl_id first (works for all ID formats), fall back to UUID id
    let { data, error } = await supabase
      .from('ghl_contacts')
      .select('*')
      .eq('ghl_id', id)
      .limit(1)
      .single()

    if (error || !data) {
      // Fall back to internal UUID lookup
      const fallback = await supabase
        .from('ghl_contacts')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single()
      data = fallback.data
      error = fallback.error
    }

    if (error || !data) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Compute engagement stats from communications_history
    const { count: totalCount } = await supabase
      .from('communications_history')
      .select('*', { count: 'exact', head: true })
      .eq('ghl_contact_id', data.ghl_id)

    const { count: inboundCount } = await supabase
      .from('communications_history')
      .select('*', { count: 'exact', head: true })
      .eq('ghl_contact_id', data.ghl_id)
      .eq('direction', 'inbound')

    const { count: outboundCount } = await supabase
      .from('communications_history')
      .select('*', { count: 'exact', head: true })
      .eq('ghl_contact_id', data.ghl_id)
      .eq('direction', 'outbound')

    // Get most recent interaction date for days_since_contact
    const { data: latest } = await supabase
      .from('communications_history')
      .select('occurred_at')
      .eq('ghl_contact_id', data.ghl_id)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .single()

    const now = new Date()
    const lastContactDate = latest?.occurred_at || data.last_contact_date
    const daysSince = lastContactDate
      ? Math.floor((now.getTime() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
      : null
    let temperature = 0
    if (daysSince !== null) {
      if (daysSince <= 14) temperature = 80
      else if (daysSince <= 60) temperature = 50
      else temperature = 20
    }

    return NextResponse.json({
      contact: {
        id: data.id,
        ghl_contact_id: data.ghl_id,
        contact_name: data.full_name,
        name: data.full_name,
        email: data.email,
        contact_email: data.email,
        phone: data.phone,
        company: data.company_name,
        temperature,
        total_touchpoints: totalCount || 0,
        inbound_count: inboundCount || 0,
        outbound_count: outboundCount || 0,
        days_since_contact: daysSince,
        lcaa_stage: data.engagement_status || 'lead',
        last_contact_date: lastContactDate,
        tags: data.tags || [],
        projects: data.projects || [],
        source: data.sync_source,
        contact_created_at: data.ghl_created_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    })
  } catch (e) {
    console.error('Contact detail error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // Resolve contact (accept both ghl_id and UUID)
    let { data: contact } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, tags, first_name, last_name, company_name, email, website')
      .eq('ghl_id', id)
      .limit(1)
      .single()

    if (!contact) {
      const fallback = await supabase
        .from('ghl_contacts')
        .select('id, ghl_id, tags, first_name, last_name, company_name, email, website')
        .eq('id', id)
        .limit(1)
        .single()
      contact = fallback.data
    }

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Build Supabase update and GHL update payloads
    const supabaseUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const ghlUpdate: Record<string, unknown> = {}

    // Field updates
    if (body.firstName !== undefined) {
      supabaseUpdate.first_name = body.firstName
      ghlUpdate.firstName = body.firstName
      // Update full_name
      const lastName = body.lastName ?? contact.last_name ?? ''
      supabaseUpdate.full_name = `${body.firstName} ${lastName}`.trim()
    }
    if (body.lastName !== undefined) {
      supabaseUpdate.last_name = body.lastName
      ghlUpdate.lastName = body.lastName
      const firstName = body.firstName ?? contact.first_name ?? ''
      supabaseUpdate.full_name = `${firstName} ${body.lastName}`.trim()
    }
    if (body.companyName !== undefined) {
      supabaseUpdate.company_name = body.companyName
      ghlUpdate.companyName = body.companyName
    }
    if (body.website !== undefined) {
      supabaseUpdate.website = body.website
      ghlUpdate.website = body.website
    }
    if (body.email !== undefined) {
      supabaseUpdate.email = body.email
      ghlUpdate.email = body.email
    }

    // Handle tag operations
    if (body.addTag) {
      const currentTags: string[] = contact.tags || []
      if (!currentTags.includes(body.addTag)) {
        supabaseUpdate.tags = [...currentTags, body.addTag]
      }
    }

    if (body.removeTag) {
      const currentTags: string[] = contact.tags || []
      supabaseUpdate.tags = currentTags.filter(t => t !== body.removeTag)
    }

    // Update Supabase
    const { error } = await supabase
      .from('ghl_contacts')
      .update(supabaseUpdate)
      .eq('id', contact.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Push to GHL (best-effort — don't roll back Supabase on failure)
    try {
      if (Object.keys(ghlUpdate).length > 0) {
        await ghlUpdateContact(contact.ghl_id, ghlUpdate)
      }
      if (body.addTag) {
        await ghlAddTag(contact.ghl_id, body.addTag)
      }
      if (body.removeTag) {
        await ghlRemoveTag(contact.ghl_id, body.removeTag)
      }
    } catch (ghlErr) {
      console.error('GHL sync error (non-blocking):', ghlErr)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Contact update error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
