import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch streams, projections, and actual ACCREC revenue in parallel
    const [streamsResult, projectionsResult, scenariosResult, actualsResult] = await Promise.all([
      supabase
        .from('revenue_streams')
        .select('*')
        .order('name'),
      supabase
        .from('revenue_stream_projections')
        .select('*, revenue_streams(name, code, category, color)')
        .order('year'),
      supabase
        .from('revenue_scenarios')
        .select('*')
        .order('name'),
      // Actual ACCREC revenue by month (FY25 + FY26)
      supabase
        .from('xero_invoices')
        .select('date, total, contact_name, project_code, status')
        .eq('type', 'ACCREC')
        .in('status', ['AUTHORISED', 'PAID'])
        .gte('date', '2024-07-01')
        .order('date'),
    ])

    const streams = streamsResult.data || []
    const projections = projectionsResult.data || []
    const scenarios = scenariosResult.data || []
    const actuals = (actualsResult.data || []) as Array<{
      date: string | null
      total: number | null
      contact_name: string | null
      project_code: string | null
      status: string | null
    }>

    // Group actual revenue by month
    const monthlyActuals: Record<string, { total: number; byProject: Record<string, number> }> = {}
    for (const inv of actuals) {
      if (!inv.date) continue
      const month = inv.date.slice(0, 7) // YYYY-MM
      const amount = Math.abs(inv.total || 0)
      if (!monthlyActuals[month]) monthlyActuals[month] = { total: 0, byProject: {} }
      monthlyActuals[month].total += amount
      const pc = inv.project_code || 'untagged'
      monthlyActuals[month].byProject[pc] = (monthlyActuals[month].byProject[pc] || 0) + amount
    }

    // Build 18-month timeline from current month
    const now = new Date()
    const months: string[] = []
    for (let i = -3; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      months.push(d.toISOString().slice(0, 7))
    }

    // Build scenario projections grouped by year
    const scenarioData = scenarios.map(s => {
      const scenarioProjections = projections.filter(
        (p: { scenario_id: string }) => p.scenario_id === s.id
      )

      // Group by year with stream breakdown
      const yearlyTotals: Record<number, { total: number; streams: Record<string, number> }> = {}
      for (const p of scenarioProjections) {
        const year = p.year
        const streamName = (p as { revenue_streams?: { name: string } }).revenue_streams?.name || 'Unknown'
        const amount = Number(p.projected_annual) || 0
        if (!yearlyTotals[year]) yearlyTotals[year] = { total: 0, streams: {} }
        yearlyTotals[year].total += amount
        yearlyTotals[year].streams[streamName] = (yearlyTotals[year].streams[streamName] || 0) + amount
      }

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        assumptions: s.assumptions,
        yearlyTotals,
      }
    })

    // Compute summary stats from actuals
    const sortedMonths = Object.keys(monthlyActuals).sort()
    const recentMonths = sortedMonths.slice(-6)
    const avgMonthlyRevenue = recentMonths.length > 0
      ? recentMonths.reduce((sum, m) => sum + monthlyActuals[m].total, 0) / recentMonths.length
      : 0

    const currentFY = now.getMonth() >= 6
      ? { start: `${now.getFullYear()}-07`, end: `${now.getFullYear() + 1}-06` }
      : { start: `${now.getFullYear() - 1}-07`, end: `${now.getFullYear()}-06` }

    const fyMonths = sortedMonths.filter(m => m >= currentFY.start && m <= currentFY.end)
    const fyTotal = fyMonths.reduce((sum, m) => sum + monthlyActuals[m].total, 0)

    return NextResponse.json({
      streams: streams.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        category: s.category,
        color: s.color,
        targetMonthly: s.target_monthly,
      })),
      scenarios: scenarioData,
      timeline: {
        months,
        actuals: monthlyActuals,
      },
      stats: {
        avgMonthlyRevenue,
        fyTotal,
        fyLabel: `FY${String(Number(currentFY.end.slice(2, 4))).padStart(2, '0')}`,
        totalStreams: streams.length,
      },
    })
  } catch (e) {
    console.error('Revenue model API error:', e)
    return NextResponse.json({ error: 'Failed to load revenue model' }, { status: 500 })
  }
}
