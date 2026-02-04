import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const projectCode = code.toUpperCase()

    // Get the most recent summary for this project
    const { data: summary, error } = await supabase
      .from('project_summaries')
      .select('*')
      .eq('project_code', projectCode)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Project summary error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch project summary', summary: null },
        { status: 500 }
      )
    }

    if (!summary) {
      return NextResponse.json({
        summary: null,
        message: 'No summary available yet. Summaries are generated daily.',
      })
    }

    return NextResponse.json({
      summary: {
        projectCode: summary.project_code,
        text: summary.summary_text,
        dataSources: summary.data_sources_used,
        stats: summary.stats,
        generatedAt: summary.generated_at,
      },
    })
  } catch (error) {
    console.error('Project summary error:', error)
    return NextResponse.json(
      { error: 'Internal server error', summary: null },
      { status: 500 }
    )
  }
}
