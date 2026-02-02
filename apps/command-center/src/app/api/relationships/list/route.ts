import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const filter = searchParams.get('filter') // hot, warm, cool
    const search = searchParams.get('search')
    const project = searchParams.get('project')

    let query = supabase
      .from('ghl_contacts')
      .select('*')
      .order('last_contact_date', { ascending: false, nullsFirst: false })
      .limit(limit)

    // Search by name or email
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Filter by project tag
    if (project) {
      query = query.contains('projects', [project])
    }

    const { data, error } = await query

    if (error) throw error

    const now = new Date()
    const relationships = (data || []).map((c) => {
      const daysSince = c.last_contact_date
        ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
        : null
      // Derive temperature from recency
      let temperature = 0
      if (daysSince !== null) {
        if (daysSince <= 14) temperature = 80
        else if (daysSince <= 60) temperature = 50
        else temperature = 20
      }

      return {
        id: c.id,
        ghl_contact_id: c.ghl_id,
        contact_name: c.full_name,
        name: c.full_name,
        email: c.email,
        contact_email: c.email,
        phone: c.phone,
        company: c.company_name,
        temperature,
        lcaa_stage: c.engagement_status || 'lead',
        last_contact_date: c.last_contact_date,
        last_contact_at: c.last_contact_date,
        days_since_contact: daysSince,
        tags: c.tags || [],
        projects: c.projects || [],
      }
    })

    // Apply temperature filter after computing
    let filtered = relationships
    if (filter === 'hot') filtered = relationships.filter(r => r.temperature >= 70)
    else if (filter === 'warm') filtered = relationships.filter(r => r.temperature >= 40 && r.temperature < 70)
    else if (filter === 'cool') filtered = relationships.filter(r => r.temperature < 40)

    return NextResponse.json({ relationships: filtered })
  } catch (e) {
    console.error('Relationships list error:', e)
    return NextResponse.json({ relationships: [] })
  }
}
