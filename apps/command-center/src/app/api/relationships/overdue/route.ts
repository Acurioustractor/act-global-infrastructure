import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, count, error } = await supabase
      .from('ghl_contacts')
      .select('*', { count: 'exact' })
      .or(`last_contact_date.lt.${thirtyDaysAgo.toISOString()},last_contact_date.is.null`)
      .order('last_contact_date', { ascending: true, nullsFirst: true })
      .limit(20)

    if (error) throw error

    const now = new Date()
    const overdue = (data || []).map((c) => ({
      id: c.id,
      ghl_contact_id: c.ghl_id,
      contact_name: c.full_name,
      name: c.full_name,
      email: c.email,
      temperature: 20, // cool — overdue
      lcaa_stage: c.engagement_status || 'lead',
      last_contact_date: c.last_contact_date,
      days_since_contact: c.last_contact_date
        ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      tags: c.tags || [],
      projects: c.projects || [],
    }))

    return NextResponse.json({ overdue, total: count || 0 })
  } catch (e) {
    console.error('Overdue contacts error:', e)
    return NextResponse.json({ overdue: [], total: 0 })
  }
}
