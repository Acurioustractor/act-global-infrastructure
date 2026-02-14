import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/knowledge/actions?project=...&status=...&overdue=...&limit=...
 *
 * Fetch action items from project_knowledge.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')
    const status = searchParams.get('status')
    const overdue = searchParams.get('overdue') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabase
      .from('project_knowledge')
      .select('id, title, content, project_code, project_name, recorded_at, participants, action_required, action_items, follow_up_date, importance, source_ref, status, created_at')
      .eq('knowledge_type', 'action')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (project) {
      query = query.eq('project_code', project)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (overdue) {
      query = query
        .eq('status', 'open')
        .lt('follow_up_date', new Date().toISOString().split('T')[0])
    }

    const { data: actions, error } = await query

    if (error) throw error

    // Count stats — scoped to open actions
    const { count: totalActions } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'action')
      .eq('status', 'open')

    const { count: overdueCount } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'action')
      .eq('status', 'open')
      .lt('follow_up_date', new Date().toISOString().split('T')[0])

    const { count: completedCount } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'action')
      .eq('status', 'completed')

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
      completedCount: completedCount || 0,
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

/**
 * POST /api/knowledge/actions — Create a new action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, project_code, follow_up_date, importance, content } = body

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_knowledge')
      .insert({
        title,
        content: content || null,
        project_code: project_code || null,
        follow_up_date: follow_up_date || null,
        importance: importance || 'medium',
        knowledge_type: 'action',
        action_required: true,
        status: 'open',
        recorded_at: new Date().toISOString(),
      })
      .select('id, title, status, project_code, follow_up_date, importance, created_at')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, action: data })
  } catch (e) {
    console.error('Action create error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/knowledge/actions — Update action status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id and status are required' }, { status: 400 })
    }

    if (!['open', 'completed', 'archived'].includes(status)) {
      return NextResponse.json({ success: false, error: 'status must be open, completed, or archived' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_knowledge')
      .update({ status })
      .eq('id', id)
      .select('id, title, status')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, action: data })
  } catch (e) {
    console.error('Action update error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
