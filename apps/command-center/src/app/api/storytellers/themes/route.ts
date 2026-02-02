import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get all analyses with their storyteller's project assignments
    const { data: analyses } = await supabase
      .from('storyteller_master_analysis')
      .select('storyteller_id, extracted_themes')
      .not('extracted_themes', 'is', null)

    // Get project assignments
    const { data: assignments } = await supabase
      .from('project_storytellers')
      .select('storyteller_id, project_id, projects ( name )')

    const storytellerProjects = new Map<string, string[]>()
    for (const a of assignments || []) {
      const list = storytellerProjects.get(a.storyteller_id) || []
      const project = a.projects as unknown as { name: string } | null
      if (project) list.push(project.name)
      storytellerProjects.set(a.storyteller_id, list)
    }

    // Aggregate themes by project
    const themesByProject = new Map<string, Map<string, number>>()
    const globalThemes = new Map<string, number>()

    for (const analysis of analyses || []) {
      const themes = analysis.extracted_themes as Array<{ theme: string }> | null
      if (!themes) continue

      const projects = storytellerProjects.get(analysis.storyteller_id) || ['Unassigned']

      for (const t of themes) {
        if (!t.theme) continue
        globalThemes.set(t.theme, (globalThemes.get(t.theme) || 0) + 1)

        for (const project of projects) {
          const projectMap = themesByProject.get(project) || new Map()
          projectMap.set(t.theme, (projectMap.get(t.theme) || 0) + 1)
          themesByProject.set(project, projectMap)
        }
      }
    }

    // Get top 15 global themes
    const topThemes = Array.from(globalThemes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([theme]) => theme)

    // Build chart data: one entry per theme, with per-project counts
    const projectNames = Array.from(themesByProject.keys()).sort()
    const chartData = topThemes.map((theme) => {
      const entry: Record<string, string | number> = {
        theme: theme.replace(/_/g, ' '),
      }
      for (const project of projectNames) {
        entry[project] = themesByProject.get(project)?.get(theme) || 0
      }
      return entry
    })

    return NextResponse.json({
      success: true,
      chartData,
      projectNames,
      topThemes: topThemes.map((t) => ({
        theme: t,
        label: t.replace(/_/g, ' '),
        count: globalThemes.get(t) || 0,
      })),
      totalThemes: globalThemes.size,
    })
  } catch (e) {
    console.error('Storyteller themes error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
