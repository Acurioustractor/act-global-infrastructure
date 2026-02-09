import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')

    let query = supabase
      .from('v_project_summary')
      .select('*')
      .order('health_score', { ascending: true, nullsFirst: false })

    if (project) {
      query = query.eq('project_code', project)
    }

    const { data, error } = await query

    if (error) {
      console.error('Project summary error:', error)
      return NextResponse.json({ projects: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ projects: data || [] })
  } catch (e) {
    console.error('Project summary route error:', e)
    return NextResponse.json({ projects: [] })
  }
}
