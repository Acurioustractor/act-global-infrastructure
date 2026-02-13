import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: projects, error } = await supabase
      .from('v_project_alignment')
      .select('*')

    if (error) throw error

    const all = projects || []
    const withGaps = all.filter(p => p.has_coverage_gaps)
    const totalCoverage = all.reduce((sum, p) => sum + (p.coverage_score || 0), 0)
    const avgCoverage = all.length > 0 ? Math.round(totalCoverage / all.length) : 0

    return NextResponse.json({
      projects: all,
      summary: {
        total: all.length,
        with_gaps: withGaps.length,
        avg_coverage: avgCoverage,
      },
    })
  } catch (e) {
    console.error('Project alignment error:', e)
    return NextResponse.json({ projects: [], summary: { total: 0, with_gaps: 0, avg_coverage: 0 } })
  }
}
