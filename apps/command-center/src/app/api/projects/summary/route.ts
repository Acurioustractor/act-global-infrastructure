import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getArchivedCodes(): Promise<Set<string>> {
  try {
    const { data } = await supabase
      .from('projects')
      .select('code')
      .eq('status', 'archived')
    return new Set<string>((data || []).map(r => r.code))
  } catch {
    return new Set()
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')
    const includeArchived = searchParams.get('include_archived') === 'true'

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

    const archivedCodes = await getArchivedCodes()
    const projects = includeArchived
      ? (data || [])
      : (data || []).filter(p => !archivedCodes.has(p.project_code))

    return NextResponse.json({ projects })
  } catch (e) {
    console.error('Project summary route error:', e)
    return NextResponse.json({ projects: [] })
  }
}
