import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const now = new Date().toISOString()

    // Get the contact's GHL ID
    const { data: contact } = await supabase
      .from('ghl_contacts')
      .select('ghl_id')
      .eq('id', id)
      .single()

    if (!contact) return NextResponse.json({ meetings: [], upcoming: [], past: [] })

    // Get meetings that reference this contact via ghl_contact_ids array
    const { data: allMeetings } = await supabase
      .from('calendar_events')
      .select('*')
      .contains('ghl_contact_ids', [contact.ghl_id])
      .order('start_time', { ascending: false })
      .limit(20)

    const meetings = (allMeetings || []).map((m) => ({
      id: m.id,
      title: m.title || 'Meeting',
      start_time: m.start_time,
      end_time: m.end_time,
      location: m.location,
      description: m.description,
      status: m.status || 'confirmed',
      project_code: m.project_code,
    }))

    const upcoming = meetings.filter(m => m.start_time > now)
    const past = meetings.filter(m => m.start_time <= now)

    return NextResponse.json({ meetings, upcoming, past })
  } catch (e) {
    console.error('Contact meetings error:', e)
    return NextResponse.json({ meetings: [], upcoming: [], past: [] })
  }
}
