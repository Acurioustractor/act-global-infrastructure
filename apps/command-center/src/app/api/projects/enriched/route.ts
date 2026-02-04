import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Map Notion project status → LCAA stage
function statusToLcaaStage(status: string | null | undefined): string | null {
  if (!status) return null
  const s = status.toLowerCase()
  if (s.includes('ideation')) return 'listen'
  if (s.includes('preparation')) return 'curiosity'
  if (s.includes('active') || s.includes('internal')) return 'action'
  if (s.includes('archived') || s.includes('transferred') || s.includes('sunsetting')) return 'art'
  return null
}

export async function GET() {
  try {
    // Get projects from Notion sync table
    const { data: notionProjects } = await supabase
      .from('notion_projects')
      .select('*')
      .order('name', { ascending: true })

    // Get project health data
    const { data: healthData } = await supabase
      .from('project_health')
      .select('*')

    const healthMap = new Map((healthData || []).map(h => [h.project_code, h]))

    // Get contact counts per project from tags
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags')

    const contactCountByProject = new Map<string, number>()
    for (const c of contacts || []) {
      for (const tag of c.tags || []) {
        contactCountByProject.set(tag, (contactCountByProject.get(tag) || 0) + 1)
      }
    }

    const projects = (notionProjects || []).map((p) => {
      const code = p.data?.id || p.notion_id || p.id
      const health = healthMap.get(code)
      const status = p.status || p.data?.status || 'active'
      return {
        code: code,
        name: p.name || p.data?.name || 'Unknown',
        description: p.data?.description || '',
        status,
        lcaa_stage: statusToLcaaStage(status),
        healthScore: health?.health_score ?? p.data?.healthScore ?? 75,
        contacts: contactCountByProject.get(code) || contactCountByProject.get(p.name?.toLowerCase()) || 0,
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
