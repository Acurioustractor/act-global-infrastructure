import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

function getArchivedCodes(): Set<string> {
  try {
    const filePath = join(process.cwd(), '..', '..', 'config', 'project-codes.json')
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
    const codes = new Set<string>()
    for (const [, proj] of Object.entries(raw.projects as Record<string, { code?: string; status?: string }>)) {
      if (proj.status === 'archived' && proj.code) codes.add(proj.code)
    }
    return codes
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

    const projects = includeArchived
      ? (data || [])
      : (data || []).filter(p => !getArchivedCodes().has(p.project_code))

    return NextResponse.json({ projects })
  } catch (e) {
    console.error('Project summary route error:', e)
    return NextResponse.json({ projects: [] })
  }
}
