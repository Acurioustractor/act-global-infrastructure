import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Current Australian FY: Jul 1 2025 – Jun 30 2026
    const fyStart = '2025-07-01'

    // Parallel fetch all data sources
    const [
      monthlyResult,
      projectsResult,
      budgetsResult,
      receivablesResult,
      payablesResult,
      scenariosResult,
    ] = await Promise.all([
      // FY26 monthly financials by project
      supabase
        .from('project_monthly_financials')
        .select('project_code, month, revenue, expenses, net')
        .gte('month', fyStart)
        .limit(1000),

      // Project metadata
      supabase
        .from('projects')
        .select('code, name, tier, status')
        .limit(200),

      // FY26 budgets
      supabase
        .from('project_budgets')
        .select('project_code, fy, annual_budget, annual_revenue_target')
        .eq('fy', 'FY26')
        .limit(200),

      // Outstanding receivables (ACCREC)
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_due, date, due_date, status, project_code')
        .eq('type', 'ACCREC')
        .in('status', ['AUTHORISED', 'SENT'])
        .limit(500),

      // Outstanding payables (ACCPAY)
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_due, date, due_date, status, project_code')
        .eq('type', 'ACCPAY')
        .in('status', ['AUTHORISED', 'SENT'])
        .limit(500),

      // Revenue scenarios (annual_targets is jsonb with year keys)
      supabase
        .from('revenue_scenarios')
        .select('id, name, description, assumptions, annual_targets')
        .limit(10),
    ])

    // Pipeline — separate query (column is expected_close, not expected_close_date)
    const pipelineResult = await supabase
      .from('opportunities_unified')
      .select('title, stage, probability, value_mid, project_codes, expected_close, source_system')
      .neq('stage', 'identified')
      .limit(500)

    // Realized grants for pipeline-to-P&L linkage
    const realizedResult = await supabase
      .from('opportunities_unified')
      .select('title, value_mid, project_codes, source_system')
      .eq('stage', 'realized')
      .limit(100)

    // --- Layer 1: Current Actuals ---
    const monthlyData = monthlyResult.data || []
    const projects = projectsResult.data || []
    const budgets = budgetsResult.data || []
    const receivables = receivablesResult.data || []
    const payables = payablesResult.data || []

    const projectMap = new Map(projects.map(p => [p.code, p]))
    const budgetMap = new Map(budgets.map(b => [b.project_code, b]))

    // Aggregate by project
    const financials = new Map<string, { revenue: number; expenses: number; net: number }>()
    for (const row of monthlyData) {
      const code = row.project_code
      const entry = financials.get(code) || { revenue: 0, expenses: 0, net: 0 }
      entry.revenue += Number(row.revenue || 0)
      entry.expenses += Number(row.expenses || 0)
      entry.net += Number(row.net || 0)
      financials.set(code, entry)
    }

    // Monthly totals for burn rate calc
    const monthlyTotals = new Map<string, { revenue: number; expenses: number }>()
    for (const row of monthlyData) {
      const m = row.month
      const entry = monthlyTotals.get(m) || { revenue: 0, expenses: 0 }
      entry.revenue += Number(row.revenue || 0)
      entry.expenses += Number(row.expenses || 0)
      monthlyTotals.set(m, entry)
    }

    const months = [...monthlyTotals.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const completedMonths = months.filter(([m]) => m < new Date().toISOString().slice(0, 7) + '-01')
    const avgMonthlyBurn = completedMonths.length > 0
      ? completedMonths.reduce((sum, [, v]) => sum + Math.abs(v.expenses), 0) / completedMonths.length
      : 0

    // Totals
    let fyRevenue = 0, fyExpenses = 0
    for (const [, v] of financials) {
      fyRevenue += v.revenue
      fyExpenses += v.expenses
    }

    const totalReceivables = receivables.reduce((s, r) => s + Number(r.amount_due || 0), 0)
    const totalPayables = payables.reduce((s, p) => s + Math.abs(Number(p.amount_due || 0)), 0)

    // Build per-project actuals
    const byProject = []
    for (const [code, fin] of financials) {
      const project = projectMap.get(code)
      const budget = budgetMap.get(code)
      const totalExp = fin.expenses
      let budgetPct: number | null = null
      if (budget?.annual_budget && Number(budget.annual_budget) > 0) {
        budgetPct = Math.round((totalExp / Number(budget.annual_budget)) * 100)
      }
      byProject.push({
        code,
        name: project?.name || code,
        tier: project?.tier || 'unknown',
        revenue: fin.revenue,
        expenses: fin.expenses,
        net: fin.net,
        budgetPct,
      })
    }
    // Sort: ecosystem first, then by expense magnitude
    const tierOrder: Record<string, number> = { ecosystem: 0, studio: 1, satellite: 2, unknown: 3 }
    byProject.sort((a, b) => {
      const td = (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3)
      if (td !== 0) return td
      return Math.abs(b.expenses) - Math.abs(a.expenses)
    })

    // Receivables aging
    const now = new Date()
    const receivablesAging = { current: 0, overdue30: 0, overdue60: 0, overdue90: 0 }
    for (const inv of receivables) {
      const due = new Date(inv.due_date)
      const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      const amt = Number(inv.amount_due || 0)
      if (daysOverdue <= 0) receivablesAging.current += amt
      else if (daysOverdue <= 30) receivablesAging.overdue30 += amt
      else if (daysOverdue <= 60) receivablesAging.overdue60 += amt
      else receivablesAging.overdue90 += amt
    }

    const actuals = {
      fyRevenue,
      fyExpenses,
      fyNet: fyRevenue - fyExpenses,
      receivables: totalReceivables,
      payables: totalPayables,
      monthlyBurn: avgMonthlyBurn,
      runway: avgMonthlyBurn > 0 ? Math.round(((fyRevenue - fyExpenses) + totalReceivables) / avgMonthlyBurn * 10) / 10 : 0,
      receivablesAging,
      byProject,
    }

    // --- Layer 2: Pipeline ---
    const pipelineData = pipelineResult.data || []

    // Stage funnel
    const stageMap = new Map<string, { count: number; value: number; weighted: number }>()
    for (const opp of pipelineData) {
      const stage = opp.stage || 'unknown'
      const entry = stageMap.get(stage) || { count: 0, value: 0, weighted: 0 }
      entry.count++
      entry.value += Number(opp.value_mid || 0)
      entry.weighted += Number(opp.value_mid || 0) * (Number(opp.probability || 0) / 100)
      stageMap.set(stage, entry)
    }

    const stageOrder = ['identified', 'researching', 'pursuing', 'submitted', 'shortlisted', 'realized', 'won']
    const byStage = [...stageMap.entries()]
      .map(([stage, data]) => ({ stage, ...data, avgProb: data.count > 0 ? Math.round(data.weighted / data.value * 100) : 0 }))
      .sort((a, b) => {
        const ai = stageOrder.indexOf(a.stage)
        const bi = stageOrder.indexOf(b.stage)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })

    const totalWeighted = pipelineData.reduce(
      (s, o) => s + Number(o.value_mid || 0) * (Number(o.probability || 0) / 100), 0
    )

    // Top opportunities by weighted value
    const topOpportunities = [...pipelineData]
      .map(o => ({
        title: o.title,
        value: Number(o.value_mid || 0),
        probability: Number(o.probability || 0),
        weighted: Number(o.value_mid || 0) * (Number(o.probability || 0) / 100),
        stage: o.stage,
        project_codes: o.project_codes || [],
        expected_close: o.expected_close,
        source: o.source_system,
      }))
      .sort((a, b) => b.weighted - a.weighted)
      .slice(0, 15)

    // Pipeline by project
    const pipeByProject = new Map<string, { weighted: number; count: number }>()
    for (const opp of pipelineData) {
      const codes = opp.project_codes || []
      for (const code of codes) {
        const entry = pipeByProject.get(code) || { weighted: 0, count: 0 }
        entry.weighted += Number(opp.value_mid || 0) * (Number(opp.probability || 0) / 100)
        entry.count++
        pipeByProject.set(code, entry)
      }
    }

    const pipeline = {
      totalWeighted,
      totalCount: pipelineData.length,
      byStage,
      topOpportunities,
      byProject: [...pipeByProject.entries()].map(([code, data]) => ({ code, ...data }))
        .sort((a, b) => b.weighted - a.weighted),
    }

    // --- Grants-to-P&L Linkage ---
    const realizedGrants = (realizedResult.data || []).map(g => {
      const codes = g.project_codes || []
      const grantValue = Number(g.value_mid || 0)
      // Check if revenue shows up in the project's actuals
      const matchedRevenue = codes.reduce((sum: number, code: string) => {
        const fin = financials.get(code)
        return sum + (fin?.revenue || 0)
      }, 0)
      return {
        title: g.title,
        value: grantValue,
        project_codes: codes,
        source: g.source_system,
        recognizedRevenue: matchedRevenue,
        gap: grantValue - matchedRevenue,
        status: matchedRevenue >= grantValue * 0.9 ? 'reconciled' as const
          : matchedRevenue > 0 ? 'partial' as const
          : 'unreconciled' as const,
      }
    })

    // --- Overhead Allocation (ACT-HQ cost split) ---
    const hqFinancials = financials.get('ACT-HQ')
    const hqExpenses = hqFinancials?.expenses || 0
    const hqRevenue = hqFinancials?.revenue || 0
    // True overhead = HQ expenses minus HQ-specific revenue (consulting etc goes to projects)
    const overheadPool = hqExpenses

    // Allocation basis: direct expenses per non-HQ project
    const directExpenseTotal = [...financials.entries()]
      .filter(([code]) => code !== 'ACT-HQ' && code !== 'DISPUTED')
      .reduce((sum, [, v]) => sum + v.expenses, 0)

    const overheadAllocation = [...financials.entries()]
      .filter(([code, v]) => code !== 'ACT-HQ' && code !== 'DISPUTED' && v.expenses > 0)
      .map(([code, v]) => {
        const share = directExpenseTotal > 0 ? v.expenses / directExpenseTotal : 0
        const allocated = overheadPool * share
        return {
          code,
          name: projectMap.get(code)?.name || code,
          directExpenses: v.expenses,
          directRevenue: v.revenue,
          overheadShare: Math.round(share * 1000) / 10,
          allocatedOverhead: Math.round(allocated * 100) / 100,
          fullyLoadedNet: v.revenue - v.expenses - allocated,
        }
      })
      .sort((a, b) => b.directExpenses - a.directExpenses)

    // --- Layer 3: Scenarios ---
    const scenariosData = scenariosResult.data || []

    const scenarios: Record<string, { fy26Total: number; fy27Total: number; description: string; assumptions: Record<string, unknown> }> = {}
    for (const s of scenariosData) {
      const key = (s.name || '').toLowerCase()
      const targets = s.annual_targets || {}
      scenarios[key] = {
        fy26Total: Number(targets['2026'] || 0),
        fy27Total: Number(targets['2027'] || 0),
        description: s.description || '',
        assumptions: s.assumptions || {},
      }
    }

    return NextResponse.json({
      actuals,
      pipeline: {
        ...pipeline,
        realizedGrants,
      },
      scenarios,
      overheadAllocation: {
        hqExpenses: overheadPool,
        hqRevenue,
        directExpenseTotal,
        byProject: overheadAllocation,
      },
      fy: 'FY26',
      fyStart,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in finance overview API:', error)
    return NextResponse.json({ error: 'Failed to load overview data' }, { status: 500 })
  }
}
