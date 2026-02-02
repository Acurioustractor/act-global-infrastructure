import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    // Contacts who had recent-ish contact (within 60 days) but not in last 14 days
    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('*')
      .lt('last_contact_date', fourteenDaysAgo.toISOString())
      .gt('last_contact_date', sixtyDaysAgo.toISOString())
      .order('last_contact_date', { ascending: true })
      .limit(20)

    if (error) throw error

    const now = new Date()
    const contacts = (data || []).map((c) => ({
      id: c.id,
      ghl_contact_id: c.ghl_id,
      contact_name: c.full_name,
      name: c.full_name,
      email: c.email,
      temperature: 50, // warm — they need attention
      lcaa_stage: c.engagement_status || 'lead',
      last_contact_date: c.last_contact_date,
      days_since_contact: c.last_contact_date
        ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      tags: c.tags || [],
      projects: c.projects || [],
    }))

    return NextResponse.json({ contacts })
  } catch (e) {
    console.error('Attention needed error:', e)
    return NextResponse.json({ contacts: [] })
  }
}
