import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Current Australian FY: Jul 1 2025 – Jun 30 2026
    const fyStart = '2025-07-01'

    // Parallel fetch all data sources
    const [monthlyResult, projectsResult, budgetsResult, vendorRulesResult] = await Promise.all([
      supabase
        .from('project_monthly_financials')
        .select('project_code, revenue, expenses, net')
        .gte('month', fyStart)
        .limit(1000),

      supabase
        .from('projects')
        .select('code, name, tier, status')
        .limit(200),

      supabase
        .from('project_budgets')
        .select('project_code, fy, annual_budget, ytd_budget')
        .eq('fy', 'FY26')
        .limit(200),

      supabase
        .from('vendor_project_rules')
        .select('project_code, rd_eligible')
        .limit(500),
    ])

    const monthlyData = monthlyResult.data || []
    const projects = projectsResult.data || []
    const budgets = budgetsResult.data || []
    const vendorRules = vendorRulesResult.data || []

    // Build project lookup
    const projectMap = new Map(projects.map(p => [p.code, p]))

    // Build budget lookup
    const budgetMap = new Map(budgets.map(b => [b.project_code, b]))

    // Calculate R&D eligible vendor count per project
    const rdByProject = new Map<string, { eligible: number; total: number }>()
    for (const rule of vendorRules) {
      const code = rule.project_code
      if (!code) continue
      const entry = rdByProject.get(code) || { eligible: 0, total: 0 }
      entry.total++
      if (rule.rd_eligible) entry.eligible++
      rdByProject.set(code, entry)
    }

    // Aggregate monthly financials by project for current FY
    const financials = new Map<string, { revenue: number; expenses: number; net: number }>()
    for (const row of monthlyData) {
      const code = row.project_code
      const entry = financials.get(code) || { revenue: 0, expenses: 0, net: 0 }
      entry.revenue += Number(row.revenue || 0)
      entry.expenses += Number(row.expenses || 0)
      entry.net += Number(row.net || 0)
      financials.set(code, entry)
    }

    // Also get R&D spend from xero_transactions joined with vendor_project_rules
    const { data: rdSpendData } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          t.project_code,
          SUM(ABS(t.total)) as rd_spend
        FROM xero_transactions t
        JOIN vendor_project_rules v ON t.contact_name = v.vendor_name
        WHERE v.rd_eligible = true
          AND t.total < 0
          AND t.date >= '${fyStart}'
          AND t.project_code IS NOT NULL
        GROUP BY t.project_code
      `
    })

    const rdSpendMap = new Map<string, number>()
    if (rdSpendData) {
      for (const row of rdSpendData) {
        rdSpendMap.set(row.project_code, Number(row.rd_spend))
      }
    }

    // Build unified project list
    const projectList = []
    const allCodes = new Set([...financials.keys(), ...projects.map(p => p.code)])

    for (const code of allCodes) {
      const project = projectMap.get(code)
      const fin = financials.get(code)
      const budget = budgetMap.get(code)
      const rdSpend = rdSpendMap.get(code) || 0

      // Skip projects with no financial data
      if (!fin || (fin.revenue === 0 && fin.expenses === 0)) continue

      const totalExpenses = Math.abs(fin.expenses)
      const rdPct = totalExpenses > 0 ? Math.round((rdSpend / totalExpenses) * 100) : 0

      let budgetPct: number | null = null
      if (budget?.annual_budget && Number(budget.annual_budget) > 0) {
        budgetPct = Math.round((totalExpenses / Number(budget.annual_budget)) * 100)
      }

      projectList.push({
        code,
        name: project?.name || code,
        tier: project?.tier || 'unknown',
        status: project?.status || 'active',
        revenue: fin.revenue,
        expenses: fin.expenses,
        net: fin.net,
        rdSpend,
        rdPct,
        budgetPct,
        annualBudget: budget?.annual_budget ? Number(budget.annual_budget) : null,
      })
    }

    // Sort: ecosystem projects first, then by absolute expenses within tier
    const tierOrder: Record<string, number> = { ecosystem: 0, studio: 1, satellite: 2, unknown: 3 }
    projectList.sort((a, b) => {
      const tierDiff = (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3)
      if (tierDiff !== 0) return tierDiff
      return Math.abs(b.expenses) - Math.abs(a.expenses)
    })

    // Calculate totals
    const totals = projectList.reduce(
      (acc, p) => ({
        revenue: acc.revenue + p.revenue,
        expenses: acc.expenses + p.expenses,
        net: acc.net + p.net,
        rdSpend: acc.rdSpend + p.rdSpend,
      }),
      { revenue: 0, expenses: 0, net: 0, rdSpend: 0 }
    )

    return NextResponse.json({
      projects: projectList,
      totals,
      fy: 'FY26',
      fyStart,
    })
  } catch (error) {
    console.error('Error in project financial hub:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
