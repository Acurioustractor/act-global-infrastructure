import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Recent new storytellers
    const { data: recentStorytellers } = await supabase
      .from('storytellers')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    // Recent analyses
    const { data: recentAnalyses } = await supabase
      .from('storyteller_master_analysis')
      .select('id, storyteller_id, analyzed_at, transcript_count')
      .order('analyzed_at', { ascending: false })
      .limit(10)

    // Get names for analyzed storytellers
    const analyzerIds = (recentAnalyses || []).map((a) => a.storyteller_id)
    const { data: analyzerNames } = await supabase
      .from('storytellers')
      .select('id, display_name')
      .in('id', analyzerIds.length > 0 ? analyzerIds : ['none'])

    const nameMap = new Map(
      (analyzerNames || []).map((s) => [s.id, s.display_name || 'Unknown'])
    )

    // Merge into a timeline
    const timeline: Array<{
      id: string
      type: 'new_storyteller' | 'analysis_complete'
      name: string
      date: string
      detail?: string
    }> = []

    for (const s of recentStorytellers || []) {
      timeline.push({
        id: s.id,
        type: 'new_storyteller',
        name: s.display_name || 'Unknown',
        date: s.created_at,
      })
    }

    for (const a of recentAnalyses || []) {
      timeline.push({
        id: a.id,
        type: 'analysis_complete',
        name: nameMap.get(a.storyteller_id) || 'Unknown',
        date: a.analyzed_at || '',
        detail: `${a.transcript_count || 0} transcript(s) analyzed`,
      })
    }

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      timeline: timeline.slice(0, 15),
    })
  } catch (e) {
    console.error('Storyteller activity error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
