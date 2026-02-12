import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

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

export async function GET(request: NextRequest) {
  try {
    const includeArchived = request.nextUrl.searchParams.get('include_archived') === 'true'

    // Load project metadata from config — index by name + notion_pages for matching
    const configByName: Record<string, { code: string; status?: string; category?: string; tier?: string }> = {}
    try {
      const filePath = join(process.cwd(), '..', '..', 'config', 'project-codes.json')
      const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
      for (const [code, proj] of Object.entries(raw.projects as Record<string, { name?: string; status?: string; category?: string; tier?: string; notion_pages?: string[] }>)) {
        const entry = { code, status: proj.status, category: proj.category, tier: proj.tier }
        if (proj.name) configByName[proj.name.toLowerCase()] = entry
        // Also index by notion page names for fuzzy matching
        for (const np of proj.notion_pages || []) {
          configByName[np.toLowerCase()] = entry
        }
      }
    } catch { /* ignore */ }
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
      const notionCode = p.data?.id || p.notion_id || p.id
      const health = healthMap.get(notionCode)
      const status = p.status || p.data?.status || 'active'
      const name = (p.name || p.data?.name || 'Unknown').trim()
      const configMatch = configByName[name.toLowerCase()]
      return {
        code: configMatch?.code || notionCode,
        name,
        description: p.data?.description || '',
        status: configMatch?.status || status,
        category: configMatch?.category || null,
        tier: configMatch?.tier || null,
        lcaa_stage: statusToLcaaStage(configMatch?.status || status),
        _hasConfigMatch: !!configMatch,
        healthScore: health?.health_score ?? p.data?.healthScore ?? 75,
        contacts: contactCountByProject.get(notionCode) || contactCountByProject.get(name.toLowerCase()) || 0,
        opportunities: [],
        relationships: {},
        recentActivity: [],
        last_activity: p.updated_at,
      }
    })

    // Deduplicate: multiple Notion pages can map to the same config code
    const seen = new Set<string>()
    const deduped = projects.filter(p => {
      if (seen.has(p.code)) return false
      seen.add(p.code)
      return true
    })

    // Filter out archived projects unless explicitly requested
    // Config status is authoritative — if config says active, it's active regardless of Notion status
    const isArchived = (p: typeof projects[number] & { _hasConfigMatch?: boolean }) => {
      if (p._hasConfigMatch) {
        // Config is source of truth — only archived if config says so
        return p.status === 'archived'
      }
      // No config match — fall back to Notion status
      const s = p.status.toLowerCase()
      return s.includes('archived') || s.includes('sunsetting') || s.includes('transferred')
    }
    const filtered = includeArchived
      ? deduped
      : deduped.filter(p => !isArchived(p))

    // Strip internal flag
    const result = filtered.map(({ _hasConfigMatch, ...rest }) => rest)

    return NextResponse.json({ projects: result })
  } catch (e) {
    console.error('Projects enriched error:', e)
    return NextResponse.json({ projects: [] })
  }
}
