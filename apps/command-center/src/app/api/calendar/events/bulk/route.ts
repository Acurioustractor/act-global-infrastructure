import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, tags, manual_project_code } = body as {
      ids: string[]
      tags?: string[]
      manual_project_code?: string | null
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
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
      .in('id', ids)
      .select('id, tags, project_code, manual_project_code')

    if (error) throw error

    return NextResponse.json({ updated: data?.length || 0, events: data })
  } catch (e) {
    console.error('Calendar bulk PATCH error:', e)
    return NextResponse.json({ error: 'Failed to bulk update events' }, { status: 500 })
  }
}
