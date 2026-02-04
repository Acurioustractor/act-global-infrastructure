import { NextResponse } from 'next/server'
import { elSupabase as supabase } from '@/lib/supabase'

interface ImpactDimensions {
  individual?: { healing?: number; identity?: number; empowerment?: number }
  community?: { capability?: number; connection?: number; sovereignty?: number }
  environmental?: { land_connection?: number; sustainable_practice?: number }
}

export async function GET() {
  try {
    // Get project impact analyses
    const { data: projectImpacts } = await supabase
      .from('project_impact_analysis')
      .select('project_id, aggregated_impact, storyteller_count, analyzed_at, projects ( name )')

    // Get master analyses with impact dimensions
    const { data: analyses } = await supabase
      .from('storyteller_master_analysis')
      .select('storyteller_id, impact_dimensions')
      .not('storyteller_id', 'is', null)
      .not('impact_dimensions', 'is', null)

    // Get storyteller → project mapping
    const { data: projectAssignments } = await supabase
      .from('project_storytellers')
      .select('storyteller_id, project_id, projects ( name )')

    const storytellerProject = new Map<string, string>()
    const projectIdByName = new Map<string, string>()
    for (const pa of projectAssignments || []) {
      const project = pa.projects as unknown as { name: string } | null
      if (project) {
        storytellerProject.set(pa.storyteller_id, project.name)
        projectIdByName.set(project.name, pa.project_id)
      }
    }

    // Count storytellers per project
    const projectStorytellerCounts = new Map<string, number>()
    for (const pa of projectAssignments || []) {
      const project = pa.projects as unknown as { name: string } | null
      if (project) {
        projectStorytellerCounts.set(project.name, (projectStorytellerCounts.get(project.name) || 0) + 1)
      }
    }

    // Aggregate impact dimensions per project
    const projectDimensions = new Map<string, {
      healing: number; identity: number; empowerment: number;
      capability: number; connection: number; sovereignty: number;
      landConnection: number; sustainability: number; count: number;
    }>()

    for (const a of analyses || []) {
      const projectName = storytellerProject.get(a.storyteller_id)
      if (!projectName) continue

      const dims = a.impact_dimensions as ImpactDimensions | null
      if (!dims) continue

      const existing = projectDimensions.get(projectName) || {
        healing: 0, identity: 0, empowerment: 0, capability: 0,
        connection: 0, sovereignty: 0, landConnection: 0, sustainability: 0, count: 0,
      }

      existing.healing += dims.individual?.healing || 0
      existing.identity += dims.individual?.identity || 0
      existing.empowerment += dims.individual?.empowerment || 0
      existing.capability += dims.community?.capability || 0
      existing.connection += dims.community?.connection || 0
      existing.sovereignty += dims.community?.sovereignty || 0
      existing.landConnection += dims.environmental?.land_connection || 0
      existing.sustainability += dims.environmental?.sustainable_practice || 0
      existing.count++

      projectDimensions.set(projectName, existing)
    }

    // Build radar data — average per project, normalize to 0-1
    const radarData = Array.from(projectDimensions.entries()).map(([project, dims]) => {
      const count = dims.count || 1
      return {
        project,
        healing: Math.min(dims.healing / count, 1),
        identity: Math.min(dims.identity / count, 1),
        empowerment: Math.min(dims.empowerment / count, 1),
        capability: Math.min(dims.capability / count, 1),
        connection: Math.min(dims.connection / count, 1),
        sovereignty: Math.min(dims.sovereignty / count, 1),
        landConnection: Math.min(dims.landConnection / count, 1),
        sustainability: Math.min(dims.sustainability / count, 1),
        storytellerCount: projectStorytellerCounts.get(project) || 0,
      }
    }).filter(d => d.storytellerCount > 0)

    // Project summaries from project_impact_analysis
    const projectSummaries = (projectImpacts || []).map((pi) => {
      const project = pi.projects as unknown as { name: string } | null
      return {
        projectId: pi.project_id,
        projectName: project?.name || 'Unknown',
        storytellerCount: pi.storyteller_count || 0,
        aggregatedImpact: pi.aggregated_impact,
      }
    })

    return NextResponse.json({
      success: true,
      radarData,
      projectSummaries,
      dimensions: [
        'healing', 'identity', 'empowerment', 'capability',
        'connection', 'sovereignty', 'landConnection', 'sustainability',
      ],
    })
  } catch (e) {
    console.error('Storyteller impact error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
