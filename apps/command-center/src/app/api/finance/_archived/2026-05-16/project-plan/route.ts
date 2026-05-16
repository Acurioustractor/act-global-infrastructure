import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface OpportunityRow {
  id: string
  title: string
  stage: string
  value_mid: number
  probability: number
  expected_close: string | null
  project_codes: string[]
  opportunity_type: string
  contact_name: string | null
}

export async function GET() {
  try {
    const fyStart = '2025-07-01'

    // Parallel fetch: monthly financials, projects, budgets, pipeline, top vendors
    const [monthlyRes, projectsRes, budgetsRes, pipelineRes, vendorsRes] = await Promise.all([
      supabase
        .from('project_monthly_financials')
        .select('project_code, month, revenue, expenses, net')
        .gte('month', fyStart)
        .limit(2000),

      supabase
        .from('projects')
        .select('code, name, tier, status')
        .eq('status', 'active')
        .limit(200),

      supabase
        .from('project_budgets')
        .select('project_code, fy, annual_budget, revenue_target')
        .eq('fy', 'FY26')
        .limit(200),

      supabase
        .from('opportunities_unified')
        .select('id, title, stage, value_mid, probability, expected_close, project_codes, opportunity_type, contact_name')
        .not('stage', 'in', '("realized","lost","expired")')
        .not('project_codes', 'eq', '{}')
        .order('value_mid', { ascending: false })
        .limit(1000),

      // Top vendors per project (for spend breakdown)
      supabase.rpc('exec_sql', {
        sql: `
          SELECT project_code, contact_name, SUM(ABS(total)) as spend
          FROM xero_transactions
          WHERE total < 0 AND date >= '${fyStart}' AND project_code IS NOT NULL
          GROUP BY project_code, contact_name
          ORDER BY project_code, spend DESC
        `
      }),
    ])

    const monthlyData = monthlyRes.data || []
    const projects = projectsRes.data || []
    const budgets = budgetsRes.data || []
    const pipeline = (pipelineRes.data || []) as OpportunityRow[]
    const vendorData = vendorsRes.data || []

    // Build lookups
    const projectMap = new Map(projects.map(p => [p.code, p]))
    const budgetMap = new Map(budgets.map(b => [b.project_code, b]))

    // Aggregate financials by project
    const financials = new Map<string, {
      revenue: number
      expenses: number
      net: number
      monthlyData: Array<{ month: string; revenue: number; expenses: number }>
    }>()

    for (const row of monthlyData) {
      const code = row.project_code
      const entry = financials.get(code) || { revenue: 0, expenses: 0, net: 0, monthlyData: [] }
      entry.revenue += Number(row.revenue || 0)
      entry.expenses += Number(row.expenses || 0)
      entry.net += Number(row.net || 0)
      entry.monthlyData.push({
        month: row.month,
        revenue: Number(row.revenue || 0),
        expenses: Number(row.expenses || 0),
      })
      financials.set(code, entry)
    }

    // Group pipeline by project
    const pipelineByProject = new Map<string, OpportunityRow[]>()
    for (const opp of pipeline) {
      for (const code of (opp.project_codes || [])) {
        const list = pipelineByProject.get(code) || []
        list.push(opp)
        pipelineByProject.set(code, list)
      }
    }

    // Group top vendors by project (max 5 per project)
    const vendorsByProject = new Map<string, Array<{ name: string; spend: number }>>()
    for (const row of vendorData) {
      const code = row.project_code
      const list = vendorsByProject.get(code) || []
      if (list.length < 5) {
        list.push({ name: row.contact_name, spend: Number(row.spend) })
      }
      vendorsByProject.set(code, list)
    }

    // Build project plan data
    const projectPlans = []
    const allCodes = new Set([
      ...financials.keys(),
      ...pipelineByProject.keys(),
      ...projects.map(p => p.code),
    ])

    for (const code of allCodes) {
      const project = projectMap.get(code)
      const fin = financials.get(code)
      const budget = budgetMap.get(code)
      const opps = pipelineByProject.get(code) || []
      const topVendors = vendorsByProject.get(code) || []

      // Skip projects with no financial data AND no pipeline
      if (!fin && opps.length === 0) continue

      const revenue = fin?.revenue || 0
      const expenses = fin?.expenses || 0
      const net = fin?.net || 0

      // Pipeline calculations
      const pipelineTotal = opps.reduce((sum, o) => sum + Number(o.value_mid || 0), 0)
      const pipelineWeighted = opps.reduce(
        (sum, o) => sum + (Number(o.value_mid || 0) * Number(o.probability || 0) / 100), 0
      )

      // Cash flow timeline: group expected inflows by month
      const cashFlowTimeline: Array<{ month: string; expected: number }> = []
      const monthlyInflows = new Map<string, number>()
      for (const opp of opps) {
        if (opp.expected_close && opp.value_mid > 0) {
          const month = opp.expected_close.substring(0, 7) // YYYY-MM
          const weighted = Number(opp.value_mid) * Number(opp.probability || 0) / 100
          monthlyInflows.set(month, (monthlyInflows.get(month) || 0) + weighted)
        }
      }
      // Sort months chronologically
      for (const [month, expected] of [...monthlyInflows.entries()].sort()) {
        cashFlowTimeline.push({ month, expected: Math.round(expected) })
      }

      // Next expected income
      const nextIncome = opps
        .filter(o => o.expected_close && o.value_mid > 0)
        .sort((a, b) => (a.expected_close || '').localeCompare(b.expected_close || ''))
        [0]

      // Format pipeline opportunities for response
      const pipelineItems = opps.map(o => ({
        id: o.id,
        title: o.title,
        stage: o.stage,
        value: Number(o.value_mid || 0),
        probability: Number(o.probability || 0),
        weighted: Math.round(Number(o.value_mid || 0) * Number(o.probability || 0) / 100),
        expectedClose: o.expected_close,
        type: o.opportunity_type,
        contact: o.contact_name,
      })).sort((a, b) => b.value - a.value)

      // Action items
      const actions: string[] = []
      const noDateOpps = opps.filter(o => !o.expected_close && o.value_mid > 0)
      if (noDateOpps.length > 0) {
        actions.push(`${noDateOpps.length} pipeline opportunities without expected close date`)
      }
      if (budget && expenses !== 0 && Math.abs(expenses) > Number(budget.annual_budget || 0) * 0.8) {
        actions.push('Budget utilisation above 80%')
      }
      if (revenue === 0 && pipelineTotal > 0) {
        actions.push('No revenue received yet — pipeline pending')
      }

      projectPlans.push({
        code,
        name: project?.name || code,
        tier: project?.tier || 'unknown',
        // Actuals
        revenue,
        expenses: Math.abs(expenses),
        net,
        // Budget
        annualBudget: budget?.annual_budget ? Number(budget.annual_budget) : null,
        revenueTarget: budget?.revenue_target ? Number(budget.revenue_target) : null,
        // Pipeline
        pipelineCount: opps.length,
        pipelineTotal,
        pipelineWeighted: Math.round(pipelineWeighted),
        pipelineItems,
        // Cash flow
        cashFlowTimeline,
        // Net with pipeline
        netWithPipeline: Math.round(net + pipelineWeighted),
        // Next income
        nextExpectedIncome: nextIncome ? {
          title: nextIncome.title,
          value: Number(nextIncome.value_mid),
          date: nextIncome.expected_close,
        } : null,
        // Spend breakdown
        topVendors,
        // Actions
        actions,
      })
    }

    // Sort: ecosystem first, then by pipeline value + expenses
    const tierOrder: Record<string, number> = { ecosystem: 0, studio: 1, satellite: 2, unknown: 3 }
    projectPlans.sort((a, b) => {
      const tierDiff = (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3)
      if (tierDiff !== 0) return tierDiff
      return (b.pipelineTotal + b.expenses) - (a.pipelineTotal + a.expenses)
    })

    // Totals
    const totals = projectPlans.reduce(
      (acc, p) => ({
        revenue: acc.revenue + p.revenue,
        expenses: acc.expenses + p.expenses,
        net: acc.net + p.net,
        pipelineTotal: acc.pipelineTotal + p.pipelineTotal,
        pipelineWeighted: acc.pipelineWeighted + p.pipelineWeighted,
        pipelineCount: acc.pipelineCount + p.pipelineCount,
      }),
      { revenue: 0, expenses: 0, net: 0, pipelineTotal: 0, pipelineWeighted: 0, pipelineCount: 0 }
    )

    return NextResponse.json({
      projects: projectPlans,
      totals,
      fy: 'FY26',
      fyStart,
    })
  } catch (error) {
    console.error('Error in project-plan API:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
