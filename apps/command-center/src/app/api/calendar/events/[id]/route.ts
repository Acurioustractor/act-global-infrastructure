import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { tags, manual_project_code } = body as {
      tags?: string[]
      manual_project_code?: string | null
    }

    const updates: Record<string, unknown> = {}
    if (tags !== undefined) updates.tags = tags
    if (manual_project_code !== undefined) updates.manual_project_code = manual_project_code

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({
      event: {
        id: data.id,
        title: data.title || data.summary || 'Untitled Event',
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location,
        description: data.description,
        project_code: data.project_code,
        is_all_day: data.is_all_day || false,
        status: data.status || 'confirmed',
        link: data.html_link || data.link,
        attendees: data.attendees || [],
        event_type: data.event_type || null,
        calendar_name: data.calendar_name || null,
        calendar_color: data.calendar_color || null,
        google_calendar_id: data.google_calendar_id || 'primary',
        sync_source: data.sync_source || 'google',
        recurrence_rule: data.recurrence_rule || null,
        tags: data.tags || [],
      },
    })
  } catch (e) {
    console.error('Calendar event PATCH error:', e)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}
