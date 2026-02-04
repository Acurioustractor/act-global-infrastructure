import { NextResponse } from 'next/server'
import { elSupabase as supabase } from '@/lib/supabase'

interface ExtractedQuote {
  quote: string
  context?: string
  impact_score?: number
  transcript_id?: string
  can_be_featured?: boolean
}

export async function GET() {
  try {
    // Get master analyses with quotes
    const { data: analyses } = await supabase
      .from('storyteller_master_analysis')
      .select('storyteller_id, extracted_quotes, extracted_themes, quality_score')
      .not('extracted_quotes', 'is', null)
      .not('storyteller_id', 'is', null)

    // Get storyteller names
    const { data: storytellers } = await supabase
      .from('storytellers')
      .select('id, display_name')

    // Get project assignments
    const { data: projectAssignments } = await supabase
      .from('project_storytellers')
      .select('storyteller_id, project_id, projects ( name )')

    const nameMap = new Map<string, string>()
    for (const s of storytellers || []) {
      nameMap.set(s.id, s.display_name || 'Unknown')
    }

    const projectMap = new Map<string, string>()
    for (const pa of projectAssignments || []) {
      const project = pa.projects as unknown as { name: string } | null
      if (project) projectMap.set(pa.storyteller_id, project.name)
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
      const quotes = (analysis.extracted_quotes as ExtractedQuote[] | null) || []
      if (quotes.length === 0) continue

      const themes = (analysis.extracted_themes as Array<{ theme: string }> | null) || []

      for (let i = 0; i < quotes.length; i++) {
        const q = quotes[i]
        if (!q?.quote || typeof q.quote !== 'string') continue

        allQuotes.push({
          text: q.quote,
          storyteller: nameMap.get(analysis.storyteller_id) || 'Unknown',
          storytellerId: analysis.storyteller_id,
          project: projectMap.get(analysis.storyteller_id) || null,
          context: q.context || null,
          theme: themes[i % themes.length]?.theme || themes[0]?.theme || null,
          impactScore: q.impact_score ?? Number(analysis.quality_score) ?? 0.5,
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
