import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Map project status → LCAA stage
function statusToLcaaStage(status: string | null | undefined): string | null {
  if (!status) return null
  const s = status.toLowerCase()
  if (s.includes('ideation')) return 'listen'
  if (s.includes('preparation')) return 'curiosity'
  if (s.includes('active') || s.includes('internal')) return 'action'
  if (s.includes('archived') || s.includes('transferred') || s.includes('sunsetting')) return 'art'
  return null
}

export async function GET(request: NextRequest) {
  try {
    const includeArchived = request.nextUrl.searchParams.get('include_archived') === 'true'

    // Query canonical projects table — single source of truth
    const query = supabase
      .from('projects')
      .select('*')
      .order('importance_weight', { ascending: false })

    if (!includeArchived) {
      query.neq('status', 'archived')
    }

    const { data: allProjects, error: projectsError } = await query
    if (projectsError) throw projectsError

    // Get project health data
    const { data: healthData } = await supabase
      .from('project_health')
      .select('*')

    const healthMap = new Map((healthData || []).map(h => [h.project_code, h]))

    // Get contact counts per project from tags
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags')

    const contactCountByTag = new Map<string, number>()
    for (const c of contacts || []) {
      for (const tag of c.tags || []) {
        contactCountByTag.set(tag, (contactCountByTag.get(tag) || 0) + 1)
      }
    }

    const projects = (allProjects || []).map((p) => {
      const health = healthMap.get(p.code)

      // Count contacts matching any of this project's ghl_tags
      let contactCount = 0
      for (const tag of p.ghl_tags || []) {
        contactCount += contactCountByTag.get(tag) || 0
      }

      return {
        code: p.code,
        name: p.name,
        description: p.description || '',
        status: p.status,
        category: p.category,
        tier: p.tier,
        importance_weight: p.importance_weight,
        lcaa_stage: statusToLcaaStage(p.status),
        healthScore: health?.health_score ?? health?.overall_score ?? 75,
        contacts: contactCount,
        opportunities: [],
        relationships: {},
        recentActivity: [],
        last_activity: p.updated_at,
      }
    })

    return NextResponse.json({ projects })
  } catch (e) {
    console.error('Projects enriched error:', e)
    return NextResponse.json({ projects: [] })
  }
}
