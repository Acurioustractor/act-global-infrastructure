import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/business/scoreboard
 *
 * Revenue scoreboard — single endpoint for all commercial decision-making data.
 * Used by Notion agents, Telegram bot, and Command Center dashboard.
 *
 * Returns:
 * - Revenue streams vs targets
 * - Pipeline by status + weighted value
 * - Outstanding receivables
 * - Revenue scenarios (conservative/moderate/aggressive)
 * - Active project count by status
 */
export async function GET() {
  try {
    const [
      streamsResult,
      pipelineResult,
      scenariosResult,
      projectsResult,
    ] = await Promise.all([
      supabase.from('revenue_streams').select('*').eq('status', 'active'),
      supabase.from('fundraising_pipeline').select('*'),
      supabase.from('revenue_scenarios').select('*'),
      supabase.from('projects').select('name, code, status'),
    ])

    const streams = streamsResult.data || []
    const pipeline = pipelineResult.data || []
    const scenarios = scenariosResult.data || []
    const projects = projectsResult.data || []

    // Revenue streams summary
    const totalMonthlyTarget = streams.reduce(
      (sum: number, s: { target_monthly: string }) => sum + parseFloat(s.target_monthly || '0'),
      0,
    )

    // Pipeline analysis
    const pipelineByStatus: Record<string, { count: number; totalValue: number; weightedValue: number }> = {}
    let totalPipelineValue = 0
    let totalWeightedValue = 0
    let totalReceivables = 0

    for (const item of pipeline) {
      const amount = parseFloat(item.amount || '0')
      const probability = parseFloat(item.probability || '0')
      const weighted = amount * probability
      const status = item.status || 'unknown'

      if (!pipelineByStatus[status]) {
        pipelineByStatus[status] = { count: 0, totalValue: 0, weightedValue: 0 }
      }
      pipelineByStatus[status].count++
      pipelineByStatus[status].totalValue += amount
      pipelineByStatus[status].weightedValue += weighted

      if (item.type === 'receivable') {
        totalReceivables += amount
      } else {
        totalPipelineValue += amount
        totalWeightedValue += weighted
      }
    }

    // Pipeline items sorted by weighted value (highest opportunity first)
    const topOpportunities = pipeline
      .filter((p: { type: string }) => p.type !== 'receivable')
      .map((p: { name: string; funder: string; amount: string; probability: string; status: string; expected_date: string; project_codes: string[] }) => ({
        name: p.name,
        funder: p.funder,
        amount: parseFloat(p.amount || '0'),
        probability: parseFloat(p.probability || '0'),
        weighted: parseFloat(p.amount || '0') * parseFloat(p.probability || '0'),
        status: p.status,
        expectedDate: p.expected_date,
        projects: p.project_codes,
      }))
      .sort((a: { weighted: number }, b: { weighted: number }) => b.weighted - a.weighted)

    // Overdue receivables
    const receivables = pipeline
      .filter((p: { type: string }) => p.type === 'receivable')
      .map((p: { name: string; funder: string; amount: string; notes: string }) => ({
        name: p.name,
        funder: p.funder,
        amount: parseFloat(p.amount || '0'),
        notes: p.notes,
      }))

    // Revenue scenarios
    const scenarioSummary = scenarios.map(
      (s: { name: string; description: string; annual_targets: Record<string, number> }) => ({
        name: s.name,
        description: s.description,
        targets: s.annual_targets,
      }),
    )

    // Active projects
    const activeProjects = projects.filter((p: { status: string }) => p.status === 'active')

    const data = {
      timestamp: new Date().toISOString(),

      streams: {
        items: streams.map((s: { name: string; code: string; category: string; target_monthly: string }) => ({
          name: s.name,
          code: s.code,
          category: s.category,
          monthlyTarget: parseFloat(s.target_monthly || '0'),
        })),
        totalMonthlyTarget,
        totalAnnualTarget: totalMonthlyTarget * 12,
      },

      pipeline: {
        byStatus: pipelineByStatus,
        totalValue: totalPipelineValue,
        weightedValue: totalWeightedValue,
        topOpportunities,
        count: pipeline.filter((p: { type: string }) => p.type !== 'receivable').length,
      },

      receivables: {
        total: totalReceivables,
        items: receivables,
      },

      scenarios: scenarioSummary,

      projects: {
        active: activeProjects.length,
        total: projects.length,
      },

      // Key metrics for agents
      summary: {
        monthlyTarget: totalMonthlyTarget,
        annualTarget: totalMonthlyTarget * 12,
        pipelineWeighted: totalWeightedValue,
        receivablesOutstanding: totalReceivables,
        pipelineCount: pipeline.filter((p: { type: string }) => p.type !== 'receivable').length,
        activeProjects: activeProjects.length,
      },
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
