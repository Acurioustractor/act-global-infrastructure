import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('google_calendar_id, calendar_name, calendar_color, sync_source')

    if (error) throw error

    // Deduplicate by google_calendar_id
    const seen = new Map<string, { id: string; name: string; color: string | null; source: string; event_count: number }>()
    for (const row of data || []) {
      const key = row.google_calendar_id || 'primary'
      const existing = seen.get(key)
      if (existing) {
        existing.event_count++
      } else {
        seen.set(key, {
          id: key,
          name: row.calendar_name || key,
          color: row.calendar_color || null,
          source: row.sync_source || 'google',
          event_count: 1,
        })
      }
    }

    const calendars = Array.from(seen.values()).sort((a, b) => {
      // Primary first, then by event count
      if (a.id === 'primary') return -1
      if (b.id === 'primary') return 1
      return b.event_count - a.event_count
    })

    return NextResponse.json({ calendars })
  } catch (e) {
    console.error('Calendar sources error:', e)
    return NextResponse.json({ calendars: [] })
  }
}
