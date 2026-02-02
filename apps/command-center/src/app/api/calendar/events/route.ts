import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    // Default to today if no range specified
    const now = new Date()
    const dayStart = start || new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const dayEnd = end || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .order('start_time', { ascending: true })

    if (error) throw error

    const events = (data || []).map((e) => ({
      id: e.id,
      title: e.title || e.summary || 'Untitled Event',
      start_time: e.start_time,
      end_time: e.end_time,
      location: e.location,
      description: e.description,
      project_code: e.project_code,
      is_all_day: e.is_all_day || false,
      status: e.status || 'confirmed',
      link: e.html_link || e.link,
      attendees: e.attendees || [],
    }))

    return NextResponse.json({ events })
  } catch (e) {
    console.error('Calendar events error:', e)
    return NextResponse.json({ events: [] })
  }
}
