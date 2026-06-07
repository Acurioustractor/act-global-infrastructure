import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all active pipeline opportunities with detail
    const { data: opps, error } = await supabase
      .from('opportunities_unified')
      .select('id, title, contact_name, value_mid, stage, probability, project_codes, expected_close, opportunity_type')
      .not('stage', 'in', '(identified,lost,expired)')
      .gt('value_mid', '0')
      .order('value_mid', { ascending: false })
      .limit(500)

    if (error) throw error

    // Project metadata — only active projects for picker
    const { data: projects } = await supabase
      .from('projects')
      .select('code, name, tier, status')
      .in('status', ['active', 'ideation'])
      .order('code')
      .limit(200)

    const projectMap = new Map((projects || []).map(p => [p.code, p]))

    // Process opportunities
    const opportunities = (opps || []).map(o => {
      const value = Number(o.value_mid || 0)
      const prob = Number(o.probability || 0)
      // Use contact_name or extract funder from title
      const funder = o.contact_name || o.title?.split(' - ')[0] || o.title || 'Unknown'
      return {
        id: o.id,
        title: o.title,
        funder,
        value,
        probability: prob,
        weighted: value * (prob / 100),
        stage: o.stage,
        type: o.opportunity_type,
        projectCodes: o.project_codes || [],
        expectedClose: o.expected_close,
      }
    })

    // Deduplicate by title+project (there are duplicate ILA entries)
    const seen = new Map<string, typeof opportunities[0]>()
    for (const opp of opportunities) {
      const key = `${opp.title}|${opp.projectCodes.sort().join(',')}`
      const existing = seen.get(key)
      if (!existing || opp.weighted > existing.weighted) {
        seen.set(key, opp)
      }
    }
    const deduped = [...seen.values()]

    // Build Sankey links: funder → project
    const sankeyLinks: Array<{ source: string; target: string; value: number; stage: string }> = []
    for (const opp of deduped) {
      const codes = opp.projectCodes.length > 0 ? opp.projectCodes : ['Unassigned']
      const perProject = opp.weighted / codes.length
      for (const code of codes) {
        sankeyLinks.push({
          source: opp.funder,
          target: code,
          value: perProject,
          stage: opp.stage,
        })
      }
    }

    // Aggregate sankey links by source+target
    const linkMap = new Map<string, { source: string; target: string; value: number; stages: Record<string, number> }>()
    for (const link of sankeyLinks) {
      const key = `${link.source}→${link.target}`
      const existing = linkMap.get(key) || { source: link.source, target: link.target, value: 0, stages: {} }
      existing.value += link.value
      existing.stages[link.stage] = (existing.stages[link.stage] || 0) + link.value
      linkMap.set(key, existing)
    }

    // Top funders for Sankey (limit to top 20 by value)
    const funderTotals = new Map<string, number>()
    for (const link of linkMap.values()) {
      funderTotals.set(link.source, (funderTotals.get(link.source) || 0) + link.value)
    }
    const topFunders = new Set(
      [...funderTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([f]) => f)
    )

    const sankeyData = {
      links: [...linkMap.values()]
        .filter(l => topFunders.has(l.source) && l.value > 0)
        .sort((a, b) => b.value - a.value),
      funders: [...topFunders].map(f => ({ name: f, total: funderTotals.get(f) || 0 }))
        .sort((a, b) => b.total - a.total),
    }

    // Bubble data: each opportunity as a bubble
    const bubbles = deduped.map(o => ({
      id: o.id,
      title: o.title,
      funder: o.funder,
      value: o.value,
      weighted: o.weighted,
      probability: o.probability,
      stage: o.stage,
      project: o.projectCodes[0] || 'Unassigned',
      projectCodes: o.projectCodes,
      projectName: o.projectCodes[0] ? (projectMap.get(o.projectCodes[0])?.name || o.projectCodes[0]) : 'Unassigned',
    }))

    // Timeline data: opportunities with expected close dates
    const timeline = deduped
      .filter(o => o.expectedClose)
      .map(o => ({
        title: o.title,
        funder: o.funder,
        value: o.value,
        weighted: o.weighted,
        probability: o.probability,
        stage: o.stage,
        project: o.projectCodes[0] || 'Unassigned',
        projectName: o.projectCodes[0] ? (projectMap.get(o.projectCodes[0])?.name || o.projectCodes[0]) : 'Unassigned',
        expectedClose: o.expectedClose,
      }))
      .sort((a, b) => (a.expectedClose || '').localeCompare(b.expectedClose || ''))

    // Project summaries: active projects for picker + any with existing opps for display
    const activeCodeSet = new Set((projects || []).map(p => p.code))
    const oppProjectCodes = new Set(deduped.flatMap(o => o.projectCodes.length ? o.projectCodes : ['Unassigned']))
    const allCodes = new Set([...oppProjectCodes, ...activeCodeSet])
    const projectSummaries = [...allCodes]
      .map(code => {
        const proj = projectMap.get(code)
        const projOpps = deduped.filter(o => o.projectCodes.includes(code) || (code === 'Unassigned' && o.projectCodes.length === 0))
        return {
          code,
          name: proj?.name || code,
          tier: proj?.tier || 'unknown',
          active: code === 'Unassigned' || activeCodeSet.has(code),
          totalWeighted: projOpps.reduce((s, o) => s + o.weighted / (o.projectCodes.length || 1), 0),
          count: projOpps.length,
        }
      })
      .sort((a, b) => {
        // Ecosystem first, then studio, then satellite, then rest
        const tierOrder: Record<string, number> = { engine: 0, art: 1, campaign: 2, community: 3, ecosystem: 4, studio: 5, satellite: 6, unknown: 7 }
        const ta = tierOrder[a.tier] ?? 3
        const tb = tierOrder[b.tier] ?? 3
        if (ta !== tb) return ta - tb
        return b.totalWeighted - a.totalWeighted
      })

    return NextResponse.json({
      sankey: sankeyData,
      bubbles,
      timeline,
      projects: projectSummaries,
      totalOpps: deduped.length,
      totalWeighted: deduped.reduce((s, o) => s + o.weighted, 0),
    })
  } catch (error) {
    console.error('Pipeline viz API error:', error)
    return NextResponse.json({ error: 'Failed to load pipeline data' }, { status: 500 })
  }
}
