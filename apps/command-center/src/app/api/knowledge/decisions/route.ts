import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/knowledge/decisions?project=...&limit=...
 *
 * Fetch decisions extracted from meetings.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabase
      .from('project_knowledge')
      .select('id, title, content, project_code, project_name, recorded_at, participants, decision_status, decision_rationale, source_ref, created_at')
      .eq('knowledge_type', 'decision')
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (project) {
      query = query.eq('project_code', project)
    }

    const { data: decisions, error } = await query

    if (error) throw error

    const { count: totalDecisions } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'decision')

    // Group by project
    const byProject: Record<string, number> = {}
    for (const d of decisions || []) {
      const code = d.project_code || 'unassigned'
      byProject[code] = (byProject[code] || 0) + 1
    }

    // Group by status
    const byStatus: Record<string, number> = {}
    for (const d of decisions || []) {
      const status = d.decision_status || 'unknown'
      byStatus[status] = (byStatus[status] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      decisions: decisions || [],
      count: decisions?.length || 0,
      totalDecisions: totalDecisions || 0,
      byProject,
      byStatus,
    })
  } catch (e) {
    console.error('Decisions fetch error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
