import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: analyses } = await supabase
      .from('storyteller_master_analysis')
      .select('storyteller_id, extracted_quotes')
      .not('extracted_quotes', 'is', null)

    // Get storyteller names
    const { data: storytellers } = await supabase
      .from('storytellers')
      .select('id, display_name')

    const nameMap = new Map(
      (storytellers || []).map((s) => [s.id, s.display_name || 'Unknown'])
    )

    // Get project assignments
    const { data: assignments } = await supabase
      .from('project_storytellers')
      .select('storyteller_id, projects ( name )')

    const projectMap = new Map<string, string>()
    for (const a of assignments || []) {
      const project = a.projects as unknown as { name: string } | null
      if (project) projectMap.set(a.storyteller_id, project.name)
    }

    interface ExtractedQuote {
      text?: string
      quote?: string
      context?: string
      theme?: string
      impact_score?: number
      significance?: string
    }

    const allQuotes: Array<{
      text: string
      storyteller: string
      storytellerId: string
      project: string | null
      context: string | null
      theme: string | null
      impactScore: number
    }> = []

    for (const analysis of analyses || []) {
      const quotes = analysis.extracted_quotes as ExtractedQuote[] | null
      if (!quotes) continue

      for (const q of quotes) {
        const text = q.text || q.quote
        if (!text) continue

        allQuotes.push({
          text,
          storyteller: nameMap.get(analysis.storyteller_id) || 'Unknown',
          storytellerId: analysis.storyteller_id,
          project: projectMap.get(analysis.storyteller_id) || null,
          context: q.context || null,
          theme: q.theme || null,
          impactScore: q.impact_score ?? 0.5,
        })
      }
    }

    // Sort by impact score descending
    allQuotes.sort((a, b) => b.impactScore - a.impactScore)

    return NextResponse.json({
      success: true,
      quotes: allQuotes.slice(0, 50),
      total: allQuotes.length,
    })
  } catch (e) {
    console.error('Storyteller quotes error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
