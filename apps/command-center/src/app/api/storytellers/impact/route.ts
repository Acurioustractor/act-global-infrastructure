import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get project impact analyses
    const { data: projectImpacts } = await supabase
      .from('project_impact_analysis')
      .select('project_id, aggregated_impact, storyteller_count, projects ( name )')
      .order('analyzed_at', { ascending: false })

    // Also aggregate ALMA signals from individual analyses by project
    const { data: assignments } = await supabase
      .from('project_storytellers')
      .select('storyteller_id, project_id, projects ( name )')

    const projectStorytellerMap = new Map<string, { name: string; storytellerIds: string[] }>()
    for (const a of assignments || []) {
      const project = a.projects as unknown as { name: string } | null
      if (!project) continue
      const existing = projectStorytellerMap.get(a.project_id) || {
        name: project.name,
        storytellerIds: [],
      }
      existing.storytellerIds.push(a.storyteller_id)
      projectStorytellerMap.set(a.project_id, existing)
    }

    // Get ALMA signals for all analyzed storytellers
    const { data: analyses } = await supabase
      .from('storyteller_master_analysis')
      .select('storyteller_id, impact_dimensions')
      .not('impact_dimensions', 'is', null)

    const analysisMap = new Map(
      (analyses || []).map((a) => [a.storyteller_id, a.impact_dimensions])
    )

    interface ImpactDimensions {
      individual?: { healing?: number; identity?: number; empowerment?: number }
      community?: { capability?: number; connection?: number; sovereignty?: number }
      environmental?: { land_connection?: number; sustainable_practice?: number }
    }

    // Aggregate ALMA dimensions per project for radar chart
    const radarData: Array<{
      project: string
      healing: number
      identity: number
      empowerment: number
      capability: number
      connection: number
      sovereignty: number
      landConnection: number
      sustainability: number
      storytellerCount: number
    }> = []

    for (const [projectId, info] of projectStorytellerMap) {
      const dims = { healing: 0, identity: 0, empowerment: 0, capability: 0, connection: 0, sovereignty: 0, landConnection: 0, sustainability: 0 }
      let count = 0

      for (const sid of info.storytellerIds) {
        const impact = analysisMap.get(sid) as ImpactDimensions | undefined
        if (!impact) continue
        count++
        dims.healing += impact.individual?.healing || 0
        dims.identity += impact.individual?.identity || 0
        dims.empowerment += impact.individual?.empowerment || 0
        dims.capability += impact.community?.capability || 0
        dims.connection += impact.community?.connection || 0
        dims.sovereignty += impact.community?.sovereignty || 0
        dims.landConnection += impact.environmental?.land_connection || 0
        dims.sustainability += impact.environmental?.sustainable_practice || 0
      }

      if (count > 0) {
        radarData.push({
          project: info.name,
          healing: dims.healing / count,
          identity: dims.identity / count,
          empowerment: dims.empowerment / count,
          capability: dims.capability / count,
          connection: dims.connection / count,
          sovereignty: dims.sovereignty / count,
          landConnection: dims.landConnection / count,
          sustainability: dims.sustainability / count,
          storytellerCount: count,
        })
      }
    }

    // Project-level aggregated data
    const projectSummaries = (projectImpacts || []).map((pi) => {
      const project = pi.projects as unknown as { name: string } | null
      return {
        projectId: pi.project_id,
        projectName: project?.name || 'Unknown',
        storytellerCount: pi.storyteller_count,
        aggregatedImpact: pi.aggregated_impact,
      }
    })

    return NextResponse.json({
      success: true,
      radarData,
      projectSummaries,
      dimensions: [
        'healing',
        'identity',
        'empowerment',
        'capability',
        'connection',
        'sovereignty',
        'landConnection',
        'sustainability',
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
