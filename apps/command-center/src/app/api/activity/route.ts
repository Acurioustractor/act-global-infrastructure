import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    let query = supabase
      .from('v_activity_stream')
      .select('*')
      .order('activity_date', { ascending: false })
      .limit(limit)

    if (project) {
      query = query.eq('project_code', project)
    }

    const { data, error } = await query

    if (error) {
      console.error('Activity stream error:', error)
      return NextResponse.json({ activities: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activities: data || [] })
  } catch (e) {
    console.error('Activity route error:', e)
    return NextResponse.json({ activities: [] })
  }
}
