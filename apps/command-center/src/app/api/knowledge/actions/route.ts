import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/knowledge/actions?project=...&status=...&limit=...
 *
 * Fetch action items extracted from meetings.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')
    const overdue = searchParams.get('overdue') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabase
      .from('project_knowledge')
      .select('id, title, content, project_code, project_name, recorded_at, participants, action_required, action_items, follow_up_date, importance, source_ref, created_at')
      .eq('knowledge_type', 'action')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (project) {
      query = query.eq('project_code', project)
    }

    if (overdue) {
      query = query
        .eq('action_required', true)
        .lt('follow_up_date', new Date().toISOString().split('T')[0])
    }

    const { data: actions, error } = await query

    if (error) throw error

    // Count stats
    const { count: totalActions } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'action')

    const { count: overdueCount } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'action')
      .eq('action_required', true)
      .lt('follow_up_date', new Date().toISOString().split('T')[0])

    // Group by project
    const byProject: Record<string, number> = {}
    for (const a of actions || []) {
      const code = a.project_code || 'unassigned'
      byProject[code] = (byProject[code] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      actions: actions || [],
      count: actions?.length || 0,
      totalActions: totalActions || 0,
      overdueCount: overdueCount || 0,
      byProject,
    })
  } catch (e) {
    console.error('Actions fetch error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
