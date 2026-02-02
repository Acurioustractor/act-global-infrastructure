import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/knowledge/episodes
 *
 * Returns memory episodes with optional filters.
 *
 * Query params:
 *   projectCode - filter by project code
 *   status      - filter by status (active, completed, abandoned)
 *   limit       - max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectCode = searchParams.get('projectCode')
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    let query = supabase
      .from('memory_episodes')
      .select('id, title, summary, episode_type, project_code, started_at, ended_at, key_events, outcome, lessons_learned, topics, status, decay_score, access_count')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (projectCode) query = query.eq('project_code', projectCode)
    if (status) query = query.eq('status', status)

    const { data: episodes, error } = await query
    if (error) throw error

    // Count by status
    const [active, completed] = await Promise.all([
      supabase.from('memory_episodes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('memory_episodes').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    ])

    // Unique project codes
    const { data: projectData } = await supabase
      .from('memory_episodes')
      .select('project_code')
    const projectCodes = [...new Set((projectData || []).map(p => p.project_code).filter(Boolean))].sort()

    return NextResponse.json({
      success: true,
      episodes: episodes || [],
      count: episodes?.length || 0,
      stats: {
        active: active.count || 0,
        completed: completed.count || 0,
        total: (active.count || 0) + (completed.count || 0),
      },
      projectCodes,
    })
  } catch (e) {
    console.error('Episodes error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 },
    )
  }
}
