import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Total storytellers
    const { count: totalStorytellers } = await supabase
      .from('storytellers')
      .select('*', { count: 'exact', head: true })

    // Total with analyses
    const { count: totalAnalyzed } = await supabase
      .from('storyteller_master_analysis')
      .select('*', { count: 'exact', head: true })

    // Total projects with storytellers
    const { data: projectLinks } = await supabase
      .from('project_storytellers')
      .select('project_id')

    const uniqueProjects = new Set(projectLinks?.map((l) => l.project_id) || [])

    // Total themes across all analyses
    const { data: analyses } = await supabase
      .from('storyteller_master_analysis')
      .select('extracted_themes')
      .not('extracted_themes', 'is', null)

    const allThemes = new Set<string>()
    for (const a of analyses || []) {
      const themes = a.extracted_themes as Array<{ theme: string }> | null
      if (themes) {
        for (const t of themes) {
          if (t.theme) allThemes.add(t.theme)
        }
      }
    }

    // Storyteller list with project names and themes
    const { data: storytellers } = await supabase
      .from('storytellers')
      .select(`
        id,
        display_name,
        bio,
        cultural_background,
        areas_of_expertise,
        is_active,
        is_featured,
        is_elder,
        created_at
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100)

    // Get project assignments
    const { data: assignments } = await supabase
      .from('project_storytellers')
      .select('storyteller_id, project_id, projects ( name )')

    // Get analyses for themes
    const { data: storytellerAnalyses } = await supabase
      .from('storyteller_master_analysis')
      .select('storyteller_id, extracted_themes, extracted_quotes')

    const analysisMap = new Map(
      (storytellerAnalyses || []).map((a) => [a.storyteller_id, a])
    )

    const assignmentMap = new Map<string, Array<{ id: string; name: string }>>()
    for (const a of assignments || []) {
      const list = assignmentMap.get(a.storyteller_id) || []
      const project = a.projects as unknown as { name: string } | null
      if (project) {
        list.push({ id: a.project_id, name: project.name })
      }
      assignmentMap.set(a.storyteller_id, list)
    }

    const enrichedStorytellers = (storytellers || []).map((s) => {
      const analysis = analysisMap.get(s.id)
      const themes = (analysis?.extracted_themes as Array<{ theme: string }> | null)?.map(
        (t) => t.theme
      ) || []
      return {
        id: s.id,
        displayName: s.display_name || 'Unknown',
        bio: s.bio,
        culturalBackground: s.cultural_background || [],
        expertise: s.areas_of_expertise || [],
        isFeatured: s.is_featured,
        isElder: s.is_elder,
        projects: assignmentMap.get(s.id) || [],
        themes: themes.slice(0, 5),
        quoteCount: (analysis?.extracted_quotes as unknown[] | null)?.length || 0,
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
