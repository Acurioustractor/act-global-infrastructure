/**
 * Revenue scoreboard — targets, pipeline, receivables, and scenarios.
 */

import type { SupabaseQueryClient, RevenueScoreboardResult } from '../types.js'

export async function fetchRevenueScoreboard(
  supabase: SupabaseQueryClient
): Promise<RevenueScoreboardResult> {
  const [streamsRes, pipelineRes, scenariosRes, projectsRes] = await Promise.all([
    supabase.from('revenue_streams').select('*').eq('status', 'active'),
    supabase.from('fundraising_pipeline').select('*'),
    supabase.from('revenue_scenarios').select('*'),
    supabase.from('projects').select('name, code, status'),
  ])

  const streams = (streamsRes.data || []) as Array<Record<string, unknown>>
  const pipeline = (pipelineRes.data || []) as Array<Record<string, unknown>>
  const scenarios = (scenariosRes.data || []) as Array<Record<string, unknown>>
  const projects = (projectsRes.data || []) as Array<Record<string, unknown>>

  const totalMonthlyTarget = streams.reduce(
    (sum, s) => sum + parseFloat((s.target_monthly as string) || '0'), 0
  )

  // Pipeline analysis
  let totalPipelineValue = 0
  let totalWeightedValue = 0
  let totalReceivables = 0
  const pipelineByStatus: Record<string, { count: number; totalValue: number; weightedValue: number }> = {}

  for (const item of pipeline) {
    const amount = parseFloat((item.amount as string) || '0')
    const probability = parseFloat((item.probability as string) || '0')
    const weighted = amount * probability
    const status = (item.status as string) || 'unknown'

    if (!pipelineByStatus[status]) pipelineByStatus[status] = { count: 0, totalValue: 0, weightedValue: 0 }
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

  const topOpportunities = pipeline
    .filter(p => p.type !== 'receivable')
    .map(p => ({
      name: p.name as string,
      funder: p.funder as string,
      amount: parseFloat((p.amount as string) || '0'),
      probability: parseFloat((p.probability as string) || '0'),
      weighted: parseFloat((p.amount as string) || '0') * parseFloat((p.probability as string) || '0'),
      status: p.status as string,
      expectedDate: p.expected_date as string,
      projects: (p.project_codes as string[]) || [],
    }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 10)

  const receivables = pipeline
    .filter(p => p.type === 'receivable')
    .map(p => ({
      name: p.name as string,
      funder: p.funder as string,
      amount: parseFloat((p.amount as string) || '0'),
      notes: p.notes as string,
    }))

  const activeProjects = projects.filter(p => p.status === 'active')

  return {
    timestamp: new Date().toISOString(),
    streams: {
      items: streams.map(s => ({
        name: s.name as string,
        code: s.code as string,
        category: s.category as string,
        monthlyTarget: parseFloat((s.target_monthly as string) || '0'),
      })),
      totalMonthlyTarget,
      totalAnnualTarget: totalMonthlyTarget * 12,
    },
    pipeline: {
      byStatus: pipelineByStatus,
      totalValue: totalPipelineValue,
      weightedValue: totalWeightedValue,
      topOpportunities,
      count: pipeline.filter(p => p.type !== 'receivable').length,
    },
    receivables: { total: totalReceivables, items: receivables },
    scenarios: scenarios.map(s => ({
      name: s.name as string,
      description: s.description as string,
      targets: (s.annual_targets as Record<string, number>) || {},
    })),
    projects: { active: activeProjects.length, total: projects.length },
  }
}
