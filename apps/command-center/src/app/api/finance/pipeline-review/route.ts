import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface OpportunityRow {
  id: string
  title: string
  contact_name: string | null
  value_mid: number | null
  stage: string | null
  probability: number | null
  project_codes: string[] | null
  expected_close: string | null
  opportunity_type: string | null
  updated_at: string | null
}

const STAGE_ORDER = ['researching', 'pursuing', 'submitted', 'shortlisted', 'realized', 'won']

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  return Math.max(0, Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)))
}

export async function GET() {
  try {
    const [oppsResult, projectsResult] = await Promise.all([
      supabase
        .from('opportunities_unified')
        .select('id, title, contact_name, value_mid, stage, probability, project_codes, expected_close, opportunity_type, updated_at')
        .in('stage', STAGE_ORDER)
        .order('value_mid', { ascending: false })
        .limit(1000),
      supabase
        .from('projects')
        .select('code, name, tier, status')
        .in('status', ['active', 'ideation'])
        .order('code')
        .limit(200),
    ])

    const opps = (oppsResult.data || []) as OpportunityRow[]
    const projects = projectsResult.data || []

    let totalPipeline = 0
    let totalWeighted = 0
    let confirmedTotal = 0
    let confirmedCount = 0

    // Type breakdown
    const typeCounts: Record<string, { count: number; value: number }> = {}
    // Stage breakdown
    const stageCounts: Record<string, { count: number; value: number }> = {}

    const items = opps.map(opp => {
      const value = Math.abs(opp.value_mid || 0)
      const prob = opp.probability || 0
      const weighted = value * (prob / 100)
      const stage = opp.stage || 'researching'
      const type = opp.opportunity_type || 'unknown'
      const isWon = stage === 'realized' || stage === 'won'

      totalPipeline += value
      totalWeighted += weighted
      if (isWon) { confirmedTotal += value; confirmedCount++ }

      // Type counts
      if (!typeCounts[type]) typeCounts[type] = { count: 0, value: 0 }
      typeCounts[type].count++
      typeCounts[type].value += value

      // Stage counts
      if (!stageCounts[stage]) stageCounts[stage] = { count: 0, value: 0 }
      stageCounts[stage].count++
      stageCounts[stage].value += value

      return {
        id: opp.id,
        title: opp.title,
        funder: opp.contact_name || 'Unknown',
        value,
        weighted,
        probability: prob,
        stage,
        stageIndex: STAGE_ORDER.indexOf(stage),
        type,
        projectCodes: opp.project_codes || [],
        expectedClose: opp.expected_close,
        daysInStage: daysSince(opp.updated_at),
        isWon,
      }
    })

    // Sort: by stage order (earlier stages first for review), then by value desc
    items.sort((a, b) => {
      if (a.stageIndex !== b.stageIndex) return a.stageIndex - b.stageIndex
      return b.value - a.value
    })

    return NextResponse.json({
      items,
      projects: projects.map(p => ({ code: p.code, name: p.name, tier: p.tier })),
      types: typeCounts,
      stages: stageCounts,
      stats: {
        totalPipeline,
        totalWeighted,
        confirmed: { total: confirmedTotal, count: confirmedCount },
        totalItems: items.length,
      },
    })
  } catch (e) {
    console.error('Pipeline review API error:', e)
    return NextResponse.json({ error: 'Failed to load pipeline' }, { status: 500 })
  }
}
