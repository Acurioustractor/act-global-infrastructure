import { NextResponse } from 'next/server'
import { elSupabase as supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Total storytellers
    const { count: totalStorytellers } = await supabase
      .from('storytellers')
      .select('*', { count: 'exact', head: true })

    // Total with master analysis
    const { count: totalAnalyzed } = await supabase
      .from('storyteller_master_analysis')
      .select('*', { count: 'exact', head: true })

    // Unique projects via project_storytellers
    const { data: projectLinks } = await supabase
      .from('project_storytellers')
      .select('project_id')

    const uniqueProjects = new Set(projectLinks?.map((r) => r.project_id) || [])

    // Aggregate themes from master analysis
    const { data: analyses } = await supabase
      .from('storyteller_master_analysis')
      .select('extracted_themes')
      .not('extracted_themes', 'is', null)

    const allThemes = new Set<string>()
    for (const a of analyses || []) {
      const themes = a.extracted_themes as Array<{ theme: string }> | null
      if (themes) {
        for (const t of themes) {
          if (t?.theme && typeof t.theme === 'string' && t.theme.length < 100) {
            allThemes.add(t.theme)
          }
        }
      }
    }

    // Storyteller list
    const { data: storytellers } = await supabase
      .from('storytellers')
      .select('id, display_name, bio, cultural_background, areas_of_expertise, is_featured, is_elder, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    // Project assignments via project_storytellers → projects
    const { data: projectAssignments } = await supabase
      .from('project_storytellers')
      .select('storyteller_id, project_id, projects ( name )')

    // Build storyteller → projects map
    const storytellerProjects = new Map<string, Array<{ id: string; name: string }>>()
    for (const pa of projectAssignments || []) {
      const project = pa.projects as unknown as { name: string } | null
      if (!project) continue
      const existing = storytellerProjects.get(pa.storyteller_id) || []
      existing.push({ id: pa.project_id, name: project.name })
      storytellerProjects.set(pa.storyteller_id, existing)
    }

    // Get master analyses keyed by storyteller_id
    const { data: masterAnalyses } = await supabase
      .from('storyteller_master_analysis')
      .select('storyteller_id, extracted_themes, extracted_quotes')
      .not('storyteller_id', 'is', null)

    const analysisMap = new Map<string, { themes: string[]; quoteCount: number }>()
    for (const a of masterAnalyses || []) {
      if (!a.storyteller_id) continue
      const themes = (a.extracted_themes as Array<{ theme: string }> | null) || []
      const quotes = (a.extracted_quotes as Array<unknown> | null) || []
      analysisMap.set(a.storyteller_id, {
        themes: themes.map((t) => t.theme).filter(Boolean).slice(0, 5),
        quoteCount: quotes.length,
      })
    }

    const enrichedStorytellers = (storytellers || []).map((s) => {
      const analysis = analysisMap.get(s.id)
      const expertise = (s.areas_of_expertise as string[] | null) || []

      return {
        id: s.id,
        displayName: s.display_name || 'Unknown',
        bio: s.bio,
        culturalBackground: s.cultural_background ? [s.cultural_background] : [],
        expertise,
        isFeatured: s.is_featured || false,
        isElder: s.is_elder || false,
        projects: storytellerProjects.get(s.id) || [],
        themes: analysis?.themes || [],
        quoteCount: analysis?.quoteCount || 0,
        createdAt: s.created_at,
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalStorytellers: totalStorytellers || 0,
        totalAnalyzed: totalAnalyzed || 0,
        totalProjects: uniqueProjects.size,
        totalThemes: allThemes.size,
      },
      storytellers: enrichedStorytellers,
    })
  } catch (e) {
    console.error('Storyteller overview error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
