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

    // Also get R&D spend, invoice summaries, and pipeline data
    const [{ data: rdSpendData }, { data: invoiceSummaryData }, { data: pipelineData }] = await Promise.all([
      supabase.rpc('exec_sql', {
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
      }),

      // Invoice summaries per project from invoice_project_map
      supabase.rpc('exec_sql', {
        sql: `
          SELECT
            m.project_code,
            SUM(CASE WHEN i.status = 'PAID' THEN i.total ELSE 0 END) as received,
            SUM(CASE WHEN i.status IN ('AUTHORISED', 'SUBMITTED') THEN i.total ELSE 0 END) as pending,
            SUM(CASE WHEN i.status = 'DRAFT' THEN i.total ELSE 0 END) as draft,
            COUNT(*) as invoice_count
          FROM invoice_project_map m
          JOIN xero_invoices i ON i.id = m.invoice_id
          WHERE i.type = 'ACCREC'
          GROUP BY m.project_code
        `
      }),

      // Grant pipeline weighted totals per project
      supabase.rpc('exec_sql', {
        sql: `
          SELECT
            p.project_code,
            SUM(COALESCE(p.amount_max, p.amount_min, 0) * COALESCE((p.metadata->>'probability')::numeric, 0.1)) as weighted_pipeline,
            COUNT(*) as opp_count
          FROM (
            SELECT
              unnest(aligned_projects) as project_code,
              amount_min, amount_max, metadata
            FROM grant_opportunities
            WHERE status NOT IN ('closed', 'declined')
          ) p
          GROUP BY p.project_code
        `
      }),
    ])

    const rdSpendMap = new Map<string, number>()
    if (rdSpendData) {
      for (const row of rdSpendData) {
        rdSpendMap.set(row.project_code, Number(row.rd_spend))
      }
    }

    // Build invoice summary lookup
    const invoiceSummaryMap = new Map<string, { received: number; pending: number; draft: number; invoiceCount: number }>()
    if (invoiceSummaryData) {
      for (const row of invoiceSummaryData) {
        invoiceSummaryMap.set(row.project_code, {
          received: Number(row.received || 0),
          pending: Number(row.pending || 0),
          draft: Number(row.draft || 0),
          invoiceCount: Number(row.invoice_count || 0),
        })
      }
    }

    // Build pipeline lookup
    const pipelineMap = new Map<string, { weightedPipeline: number; oppCount: number }>()
    if (pipelineData) {
      for (const row of pipelineData) {
        pipelineMap.set(row.project_code, {
          weightedPipeline: Number(row.weighted_pipeline || 0),
          oppCount: Number(row.opp_count || 0),
        })
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

      const invoiceSummary = invoiceSummaryMap.get(code)
      const pipeline = pipelineMap.get(code)

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
        received: invoiceSummary?.received || 0,
        pending: invoiceSummary?.pending || 0,
        invoiceCount: invoiceSummary?.invoiceCount || 0,
        weightedPipeline: pipeline?.weightedPipeline || 0,
        pipelineCount: pipeline?.oppCount || 0,
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
        received: acc.received + p.received,
        pending: acc.pending + p.pending,
        weightedPipeline: acc.weightedPipeline + p.weightedPipeline,
      }),
      { revenue: 0, expenses: 0, net: 0, rdSpend: 0, received: 0, pending: 0, weightedPipeline: 0 }
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
