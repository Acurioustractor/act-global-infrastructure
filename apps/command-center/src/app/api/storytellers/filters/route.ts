import { NextResponse } from 'next/server'
import { elSupabase } from '@/lib/supabase'

export async function GET() {
  try {
    // --- Projects from EL (via project_storytellers → projects) ---
    const { data: projectAssignments } = await elSupabase
      .from('project_storytellers')
      .select('storyteller_id, project_id, projects ( id, name )')

    const projectCounts = new Map<string, { id: string; name: string; count: number }>()
    for (const pa of projectAssignments || []) {
      const project = pa.projects as unknown as { id: string; name: string } | null
      if (!project) continue
      const existing = projectCounts.get(pa.project_id)
      if (existing) {
        existing.count++
      } else {
        projectCounts.set(pa.project_id, { id: pa.project_id, name: project.name, count: 1 })
      }
    }

    const projects = Array.from(projectCounts.values())
      .sort((a, b) => b.count - a.count)

    // --- Themes from EL master analysis ---
    const { data: analyses } = await elSupabase
      .from('storyteller_master_analysis')
      .select('extracted_themes')
      .not('extracted_themes', 'is', null)

    const themeCounts = new Map<string, number>()
    for (const a of analyses || []) {
      const themes = a.extracted_themes as Array<{ theme: string; frequency?: number }> | null
      if (!themes) continue
      for (const t of themes) {
        if (!t?.theme || typeof t.theme !== 'string' || t.theme.length > 100) continue
        const label = t.theme.replace(/_/g, ' ')
        themeCounts.set(label, (themeCounts.get(label) || 0) + (t.frequency || 1))
      }
    }

    const themes = Array.from(themeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([theme, count]) => ({ theme, count }))

    // --- Cultural backgrounds from EL storytellers ---
    // cultural_background is stored as a JSON array (e.g. ["Aboriginal Australian"])
    const { data: storytellers } = await elSupabase
      .from('storytellers')
      .select('cultural_background')
      .not('cultural_background', 'is', null)

    const bgCounts = new Map<string, number>()
    for (const s of storytellers || []) {
      const bg = s.cultural_background
      if (!bg) continue
      // Handle both array and string formats
      const values: string[] = Array.isArray(bg) ? bg : [bg]
      for (const v of values) {
        if (typeof v === 'string' && v.trim()) {
          bgCounts.set(v.trim(), (bgCounts.get(v.trim()) || 0) + 1)
        }
      }
    }

    const culturalBackgrounds = Array.from(bgCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([background, count]) => ({ background, count }))

    // --- Organisations from EL (via projects → organizations) ---
    const { data: elOrgs } = await elSupabase
      .from('organizations')
      .select('id, name')

    const { data: elProjects } = await elSupabase
      .from('projects')
      .select('id, name, organization_id')
      .not('organization_id', 'is', null)

    // Build org → projects map, only include orgs that have storytellers
    const projectIdsWithStorytellers = new Set(
      (projectAssignments || []).map((pa) => pa.project_id)
    )

    const orgNameMap = new Map<string, string>()
    for (const o of elOrgs || []) {
      orgNameMap.set(o.id, o.name)
    }

    const orgProjectMap = new Map<string, { name: string; projectIds: string[]; projectNames: string[] }>()
    for (const p of elProjects || []) {
      if (!p.organization_id || !projectIdsWithStorytellers.has(p.id)) continue
      const orgName = orgNameMap.get(p.organization_id)
      if (!orgName) continue

      const existing = orgProjectMap.get(p.organization_id)
      if (existing) {
        if (!existing.projectIds.includes(p.id)) {
          existing.projectIds.push(p.id)
          existing.projectNames.push(p.name)
        }
      } else {
        orgProjectMap.set(p.organization_id, {
          name: orgName,
          projectIds: [p.id],
          projectNames: [p.name],
        })
      }
    }

    const organisations = Array.from(orgProjectMap.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, org]) => ({ id, ...org }))

    return NextResponse.json({
      success: true,
      projects,
      themes,
      culturalBackgrounds,
      organisations,
    })
  } catch (e) {
    console.error('Storyteller filters error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
