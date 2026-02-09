import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    const excludeTag = searchParams.get('excludeTag') || null

    if (q.length < 2) {
      return NextResponse.json({ contacts: [], total: 0 })
    }

    // Search across name, email, company
    let query = supabase
      .from('ghl_contacts')
      .select('id, ghl_id, full_name, first_name, last_name, email, company_name, tags', { count: 'exact' })
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,company_name.ilike.%${q}%`)
      .order('full_name')
      .limit(limit)

    // Optionally exclude contacts that already have a tag (e.g. 'goods')
    if (excludeTag) {
      query = query.not('tags', 'cs', `{${excludeTag}}`)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const contacts = (data || []).map(c => ({
      id: c.id,
      ghl_id: c.ghl_id,
      full_name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
      email: c.email,
      company_name: c.company_name,
      tags: c.tags || [],
      already_goods: (c.tags || []).includes('goods'),
    }))

    return NextResponse.json({ contacts, total: count || 0 })
  } catch (e) {
    console.error('Contact search error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
