import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/knowledge/meetings?project=...&days=...&limit=...
 *
 * Fetch meetings with summaries, topics, and metadata.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')
    const days = parseInt(searchParams.get('days') || '90')
    const limit = parseInt(searchParams.get('limit') || '100')

    const since = new Date()
    since.setDate(since.getDate() - days)

    let query = supabase
      .from('project_knowledge')
      .select('id, title, summary, content, project_code, project_name, recorded_at, participants, topics, sentiment, action_required, action_items, importance, source_url, metadata, created_at')
      .eq('knowledge_type', 'meeting')
      .gte('recorded_at', since.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (project) {
      query = query.eq('project_code', project)
    }

    const { data: meetings, error } = await query

    if (error) throw error

    // Get stats
    const { count: totalMeetings } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'meeting')

    // Group by project
    const byProject: Record<string, number> = {}
    for (const m of meetings || []) {
      const code = m.project_code || 'unassigned'
      byProject[code] = (byProject[code] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      meetings: meetings || [],
      count: meetings?.length || 0,
      totalMeetings: totalMeetings || 0,
      byProject,
    })
  } catch (e) {
    console.error('Meetings fetch error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
