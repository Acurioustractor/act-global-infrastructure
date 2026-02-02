import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get the contact's GHL ID (accept both internal UUID and ghl_id)
    let { data: contact } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name')
      .eq('ghl_id', id)
      .limit(1)
      .single()

    if (!contact) {
      const fallback = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name')
        .eq('id', id)
        .limit(1)
        .single()
      contact = fallback.data
    }

    if (!contact) return NextResponse.json({ interactions: [], total: 0 })

    const { data, count } = await supabase
      .from('communications_history')
      .select('*', { count: 'exact' })
      .eq('ghl_contact_id', contact.ghl_id)
      .order('occurred_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const interactions = (data || []).map((i) => ({
      id: i.id,
      subject: i.subject || 'Interaction',
      channel: i.channel || 'unknown',
      direction: i.direction || 'inbound',
      contact_name: i.contact_name || contact.full_name,
      snippet: i.content_preview || i.summary || '',
      occurred_at: i.occurred_at,
      sentiment: i.sentiment,
      project_code: i.project_code,
    }))

    return NextResponse.json({ interactions, total: count || 0 })
  } catch (e) {
    console.error('Contact interactions error:', e)
    return NextResponse.json({ interactions: [], total: 0 })
  }
}
