import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { elSupabase as supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const project = new URL(request.url).searchParams.get('project')
    if (!project) {
      return NextResponse.json({ error: 'Missing project parameter' }, { status: 400 })
    }

    // Find the project by slug-like name matching
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, slug')

    // Match project by slug or name (case-insensitive, handle hyphens)
    const normalizedProject = project.toLowerCase().replace(/-/g, ' ')
    const matchedProject = (projects || []).find(p => {
      const slug = (p.slug || '').toLowerCase()
      const name = (p.name || '').toLowerCase().replace(/-/g, ' ')
      return slug === project || name === normalizedProject || name.includes(normalizedProject)
    })

    if (!matchedProject) {
      return NextResponse.json({
        project,
        storytellerCount: 0,
        storytellers: [],
        topThemes: [],
        topQuotes: [],
        message: `No project found matching "${project}"`
      })
    }

    // Get storytellers linked to this project via project_storytellers
    const { data: links } = await supabase
      .from('project_storytellers')
      .select('storyteller_id')
      .eq('project_id', matchedProject.id)

    const storytellerIds = (links || []).map(l => l.storyteller_id)

    if (storytellerIds.length === 0) {
      return NextResponse.json({
        project: matchedProject.name,
        projectId: matchedProject.id,
        storytellerCount: 0,
        storytellers: [],
        topThemes: [],
        topQuotes: [],
      })
    }

    // Get storyteller details
    const { data: storytellers } = await supabase
      .from('storytellers')
      .select('id, display_name, bio, cultural_background, is_featured, is_elder')
      .in('id', storytellerIds)

    // Get master analyses for these storytellers
    const { data: analyses } = await supabase
      .from('storyteller_master_analysis')
      .select('storyteller_id, extracted_themes, extracted_quotes')
      .in('storyteller_id', storytellerIds)

    // Aggregate themes and quotes
    const themeCounts = new Map<string, number>()
    const allQuotes: Array<{ quote: string; storytellerId: string; storytellerName: string }> = []

    for (const a of analyses || []) {
      const themes = a.extracted_themes as Array<{ theme: string }> | null
      if (themes) {
        for (const t of themes) {
          if (t?.theme && typeof t.theme === 'string' && t.theme.length < 100) {
            themeCounts.set(t.theme, (themeCounts.get(t.theme) || 0) + 1)
          }
        }
      }

      const quotes = a.extracted_quotes as Array<{ quote: string }> | null
      if (quotes) {
        const storyteller = (storytellers || []).find(s => s.id === a.storyteller_id)
        for (const q of quotes.slice(0, 3)) {
          if (q?.quote && typeof q.quote === 'string') {
            allQuotes.push({
              quote: q.quote,
              storytellerId: a.storyteller_id,
              storytellerName: storyteller?.display_name || 'Unknown',
            })
          }
        }
      }
    }

    // Sort themes by frequency, take top 10
    const topThemes = Array.from(themeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme, count]) => ({ theme, count }))

    // Take featured quotes (max 5)
    const topQuotes = allQuotes.slice(0, 5)

    const enrichedStorytellers = (storytellers || []).map(s => ({
      id: s.id,
      displayName: s.display_name || 'Unknown',
      bio: s.bio,
      culturalBackground: s.cultural_background,
      isFeatured: s.is_featured || false,
      isElder: s.is_elder || false,
    }))

    return NextResponse.json({
      project: matchedProject.name,
      projectId: matchedProject.id,
      storytellerCount: storytellerIds.length,
      storytellers: enrichedStorytellers,
      topThemes,
      topQuotes,
    })
  } catch (e) {
    console.error('Project storytellers error:', e)
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
