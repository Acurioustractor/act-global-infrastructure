import { NextResponse } from 'next/server'
import { elSupabase as supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Recent storytellers
    const { data: recentStorytellers } = await supabase
      .from('storytellers')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    // Recent master analyses
    const { data: recentAnalyses } = await supabase
      .from('storyteller_master_analysis')
      .select('id, storyteller_id, analyzed_at, extracted_themes, transcript_count')
      .order('analyzed_at', { ascending: false })
      .limit(10)

    // Get names for analyzed storytellers
    const analyzerIds = (recentAnalyses || []).map((a) => a.storyteller_id).filter(Boolean)
    const { data: analyzerNames } = analyzerIds.length > 0
      ? await supabase
          .from('storytellers')
          .select('id, display_name')
          .in('id', analyzerIds)
      : { data: [] }

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
      const themes = (a.extracted_themes as Array<{ theme: string }> | null) || []
      const themeNames = themes.slice(0, 3).map((t) => t.theme).filter(Boolean)
      timeline.push({
        id: a.id,
        type: 'analysis_complete',
        name: nameMap.get(a.storyteller_id) || 'Unknown',
        date: a.analyzed_at || '',
        detail: themeNames.length > 0
          ? `Themes: ${themeNames.join(', ')}`
          : `${a.transcript_count || 0} transcripts analyzed`,
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
