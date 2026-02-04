import { NextResponse } from 'next/server'
import { elSupabase as supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get master analyses with themes
    const { data: analyses } = await supabase
      .from('storyteller_master_analysis')
      .select('storyteller_id, extracted_themes')
      .not('storyteller_id', 'is', null)
      .not('extracted_themes', 'is', null)

    // Get storyteller project assignments
    const { data: projectAssignments } = await supabase
      .from('project_storytellers')
      .select('storyteller_id, project_id, projects ( name )')

    const storytellerProject = new Map<string, string>()
    for (const pa of projectAssignments || []) {
      const project = pa.projects as unknown as { name: string } | null
      if (project) storytellerProject.set(pa.storyteller_id, project.name)
    }

    // Aggregate themes
    const themesByProject = new Map<string, Map<string, number>>()
    const globalThemes = new Map<string, number>()

    for (const analysis of analyses || []) {
      const themes = (analysis.extracted_themes as Array<{ theme: string; frequency?: number }> | null) || []
      if (themes.length === 0) continue

      const projectName = storytellerProject.get(analysis.storyteller_id) || 'Unassigned'

      for (const t of themes) {
        if (!t?.theme || typeof t.theme !== 'string' || t.theme.length > 100) continue
        const label = t.theme.replace(/_/g, ' ')
        const weight = t.frequency || 1

        globalThemes.set(label, (globalThemes.get(label) || 0) + weight)

        const projectMap = themesByProject.get(projectName) || new Map()
        projectMap.set(label, (projectMap.get(label) || 0) + weight)
        themesByProject.set(projectName, projectMap)
      }
    }

    // Get top 15 global themes
    const topThemes = Array.from(globalThemes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([theme]) => theme)

    // Build chart data
    const projectNames = Array.from(themesByProject.keys()).sort()
    const chartData = topThemes.map((theme) => {
      const entry: Record<string, string | number> = { theme }
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
        label: t,
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
