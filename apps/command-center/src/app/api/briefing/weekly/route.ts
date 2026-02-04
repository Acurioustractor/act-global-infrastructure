import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get the most recent weekly digest
    const { data: weeklyDigest, error: digestError } = await supabase
      .from('project_summaries')
      .select('*')
      .eq('project_code', '_WEEKLY')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get program summaries (latest per area)
    const { data: programSummaries, error: progError } = await supabase
      .from('program_summaries')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(20)

    // Deduplicate program summaries — latest per area
    const latestByArea: Record<string, typeof programSummaries extends (infer T)[] | null ? T : never> = {}
    for (const ps of programSummaries || []) {
      if (!latestByArea[ps.area]) {
        latestByArea[ps.area] = ps
      }
    }

    if (digestError) {
      console.error('Weekly digest error:', digestError)
    }
    if (progError) {
      console.error('Program summaries error:', progError)
    }

    return NextResponse.json({
      success: true,
      digest: weeklyDigest
        ? {
            text: weeklyDigest.summary_text,
            stats: weeklyDigest.stats,
            generatedAt: weeklyDigest.generated_at,
            dataSources: weeklyDigest.data_sources_used,
          }
        : null,
      programSummaries: Object.values(latestByArea).map((ps) => ({
        area: ps.area,
        text: ps.summary_text,
        projectCodes: ps.project_codes,
        stats: ps.stats,
        generatedAt: ps.generated_at,
      })),
    })
  } catch (error) {
    console.error('Weekly briefing error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weekly briefing', digest: null, programSummaries: [] },
      { status: 500 }
    )
  }
}
