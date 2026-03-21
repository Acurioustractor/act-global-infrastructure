import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  calculateReceivablesAging,
  calculateMonthlyBurn,
  calculateRunway,
  budgetPct,
  allocateOverhead,
  weightedValue,
  reconciliationStatus,
  sortProjectsByTier,
  calculateHealthScore,
  generateNudges,
  type HealthLevel,
} from '@/lib/finance'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Australian FY26: Jul 1 2025 – Jun 30 2026
    const fyStart = '2025-07-01'
    const now = new Date()

    // ── Parallel fetch all data sources ──────────────────────────────
    const [
      monthlyResult,
      projectsResult,
      budgetsResult,
      receivablesResult,
      payablesResult,
      scenariosResult,
      bankAccountsResult,
      lastSyncResult,
    ] = await Promise.all([
      supabase
        .from('project_monthly_financials')
        .select('project_code, month, revenue, expenses, net')
        .gte('month', fyStart)
        .limit(1000),

      supabase
        .from('projects')
        .select('code, name, tier, status')
        .limit(200),

      supabase
        .from('project_budgets')
        .select('project_code, fy, annual_budget, annual_revenue_target')
        .eq('fy', 'FY26')
        .limit(200),

      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_due, date, due_date, status, project_code')
        .eq('type', 'ACCREC')
        .in('status', ['AUTHORISED', 'SENT'])
        .limit(500),

      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_due, date, due_date, status, project_code')
        .eq('type', 'ACCPAY')
        .in('status', ['AUTHORISED', 'SENT'])
        .limit(500),

      supabase
        .from('revenue_scenarios')
        .select('id, name, description, assumptions, annual_targets')
        .limit(10),

      supabase
        .from('xero_bank_accounts')
        .select('name, code, current_balance, balance_updated_at, status')
        .eq('status', 'ACTIVE')
        .limit(20),

      supabase
        .from('xero_transactions')
        .select('synced_at')
        .order('synced_at', { ascending: false })
        .limit(1),
    ])

    // Pipeline — separate query to keep parallel batch clean
    const PIPELINE_LIMIT = 500
    const pipelineResult = await supabase
      .from('opportunities_unified')
      .select('title, stage, probability, value_mid, project_codes, expected_close, source_system, contact_name')
      .neq('stage', 'identified')
      .limit(PIPELINE_LIMIT)

    // Realized grants with contact_name for proper reconciliation
    const realizedResult = await supabase
      .from('opportunities_unified')
      .select('title, value_mid, project_codes, source_system, contact_name')
      .eq('stage', 'realized')
      .limit(100)

    // ── Extract data ─────────────────────────────────────────────────
    const monthlyData = monthlyResult.data || []
    const projects = projectsResult.data || []
    const budgets = budgetsResult.data || []
    const receivables = receivablesResult.data || []
    const payables = payablesResult.data || []
    const bankAccounts = bankAccountsResult.data || []
    const lastSyncAt = lastSyncResult.data?.[0]?.synced_at || null

    const projectMap = new Map(projects.map(p => [p.code, p]))
    const budgetMap = new Map(budgets.map(b => [b.project_code, b]))

    // ── Layer 1: Current Actuals ─────────────────────────────────────

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

    // Monthly totals for burn rate + sparklines
    const monthlyTotals = new Map<string, { revenue: number; expenses: number }>()
    for (const row of monthlyData) {
      const m = row.month
      const entry = monthlyTotals.get(m) || { revenue: 0, expenses: 0 }
      entry.revenue += Number(row.revenue || 0)
      entry.expenses += Number(row.expenses || 0)
      monthlyTotals.set(m, entry)
    }

    // Use shared calculation for burn rate
    const burnCalc = calculateMonthlyBurn(monthlyTotals, now)

    // FY totals
    let fyRevenue = 0, fyExpenses = 0
    for (const [, v] of financials) {
      fyRevenue += v.revenue
      fyExpenses += v.expenses
    }

    const totalReceivables = receivables.reduce((s, r) => s + Number(r.amount_due || 0), 0)
    const totalPayables = payables.reduce((s, p) => s + Math.abs(Number(p.amount_due || 0)), 0)

    // Cash in bank — from xero_bank_accounts if available, else estimate from net
    const cashInBank = bankAccounts.length > 0
      ? bankAccounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0)
      : null // null = not synced yet, UI can show "not available"

    // Runway — uses actual cash balance when available
    const cashForRunway = cashInBank ?? Math.max(0, fyRevenue - fyExpenses + totalReceivables)
    const runwayMonths = calculateRunway(cashForRunway, burnCalc.avgBurn, burnCalc.avgRevenue)

    // Per-project actuals with budget %
    const byProject = [...financials.entries()].map(([code, fin]) => {
      const project = projectMap.get(code)
      const budget = budgetMap.get(code)
      return {
        code,
        name: project?.name || code,
        tier: project?.tier || 'unknown',
        revenue: fin.revenue,
        expenses: fin.expenses,
        net: fin.net,
        budgetPct: budgetPct(fin.expenses, budget?.annual_budget ? Number(budget.annual_budget) : null),
      }
    })

    const sortedProjects = sortProjectsByTier(byProject)

    // Receivables aging — uses shared function with null guard
    const receivablesAging = calculateReceivablesAging(receivables, now)

    // ── Sparkline data (monthly series for charts) ───────────────────
    const sortedMonths = [...monthlyTotals.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const sparklineData = {
      months: sortedMonths.map(([m]) => m.slice(0, 7)), // "2025-07" format
      revenue: sortedMonths.map(([, v]) => v.revenue),
      expenses: sortedMonths.map(([, v]) => Math.abs(v.expenses)),
      net: sortedMonths.map(([, v]) => v.revenue - Math.abs(v.expenses)),
    }

    // ── Month-over-month deltas ──────────────────────────────────────
    const completedMonthsSorted = sortedMonths
      .filter(([m]) => m < now.toISOString().slice(0, 7) + '-01')
    const currentMonthData = completedMonthsSorted.length > 0
      ? completedMonthsSorted[completedMonthsSorted.length - 1]
      : null
    const previousMonthData = completedMonthsSorted.length > 1
      ? completedMonthsSorted[completedMonthsSorted.length - 2]
      : null

    const monthDeltas = currentMonthData && previousMonthData ? {
      revenue: currentMonthData[1].revenue - previousMonthData[1].revenue,
      revenuePct: previousMonthData[1].revenue !== 0
        ? Math.round(((currentMonthData[1].revenue - previousMonthData[1].revenue) / Math.abs(previousMonthData[1].revenue)) * 1000) / 10
        : null,
      expenses: Math.abs(currentMonthData[1].expenses) - Math.abs(previousMonthData[1].expenses),
      expensesPct: previousMonthData[1].expenses !== 0
        ? Math.round(((Math.abs(currentMonthData[1].expenses) - Math.abs(previousMonthData[1].expenses)) / Math.abs(previousMonthData[1].expenses)) * 1000) / 10
        : null,
      currentMonth: currentMonthData[0].slice(0, 7),
      previousMonth: previousMonthData[0].slice(0, 7),
    } : null

    // ── Burn trend (for health score) ────────────────────────────────
    let burnTrend: 'decreasing' | 'stable' | 'increasing' = 'stable'
    if (completedMonthsSorted.length >= 3) {
      const recent3 = completedMonthsSorted.slice(-3).map(([, v]) => Math.abs(v.expenses))
      const firstHalf = (recent3[0] + recent3[1]) / 2
      const secondHalf = recent3[2]
      if (secondHalf > firstHalf * 1.1) burnTrend = 'increasing'
      else if (secondHalf < firstHalf * 0.9) burnTrend = 'decreasing'
    }

    const actuals = {
      cashInBank,
      fyRevenue,
      fyExpenses,
      fyNet: fyRevenue - fyExpenses,
      receivables: totalReceivables,
      payables: totalPayables,
      monthlyBurn: burnCalc.avgBurn,
      monthlyRevenue: burnCalc.avgRevenue,
      runway: runwayMonths,
      receivablesAging,
      byProject: sortedProjects,
      sparklineData,
      monthDeltas,
    }

    // ── Layer 2: Pipeline ────────────────────────────────────────────
    const pipelineData = pipelineResult.data || []
    const pipelineTruncated = pipelineData.length === PIPELINE_LIMIT

    // Stage funnel
    const stageMap = new Map<string, { count: number; value: number; weighted: number }>()
    for (const opp of pipelineData) {
      const stage = opp.stage || 'unknown'
      const entry = stageMap.get(stage) || { count: 0, value: 0, weighted: 0 }
      entry.count++
      const val = Number(opp.value_mid || 0)
      entry.value += val
      entry.weighted += weightedValue(val, Number(opp.probability || 0))
      stageMap.set(stage, entry)
    }

    const stageOrder = ['researching', 'pursuing', 'submitted', 'shortlisted', 'realized', 'won']
    const byStage = [...stageMap.entries()]
      .map(([stage, data]) => ({
        stage,
        ...data,
        avgProb: data.value > 0 ? Math.round((data.weighted / data.value) * 100) : 0,
      }))
      .sort((a, b) => {
        const ai = stageOrder.indexOf(a.stage)
        const bi = stageOrder.indexOf(b.stage)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })

    const totalWeighted = pipelineData.reduce(
      (s, o) => s + weightedValue(Number(o.value_mid || 0), Number(o.probability || 0)), 0,
    )

    // Top opportunities
    const topOpportunities = [...pipelineData]
      .map(o => {
        const val = Number(o.value_mid || 0)
        const prob = Number(o.probability || 0)
        return {
          title: o.title,
          value: val,
          probability: prob,
          weighted: weightedValue(val, prob),
          stage: o.stage,
          project_codes: o.project_codes || [],
          expected_close: o.expected_close,
          source: o.source_system,
        }
      })
      .sort((a, b) => b.weighted - a.weighted)
      .slice(0, 15)

    // Pipeline by project
    const pipeByProject = new Map<string, { weighted: number; count: number }>()
    for (const opp of pipelineData) {
      for (const code of (opp.project_codes || [])) {
        const entry = pipeByProject.get(code) || { weighted: 0, count: 0 }
        entry.weighted += weightedValue(Number(opp.value_mid || 0), Number(opp.probability || 0))
        entry.count++
        pipeByProject.set(code, entry)
      }
    }

    // Pipeline opportunities closing soon (for nudges)
    const pipelineClosingSoon = pipelineData
      .filter(o => o.expected_close)
      .map(o => ({ title: o.title, expected_close: o.expected_close!, value: Number(o.value_mid || 0) }))
      .filter(o => {
        const days = (new Date(o.expected_close).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        return days >= 0 && days <= 30
      })
      .sort((a, b) => new Date(a.expected_close).getTime() - new Date(b.expected_close).getTime())

    const pipeline = {
      totalWeighted,
      totalCount: pipelineData.length,
      truncated: pipelineTruncated,
      byStage,
      topOpportunities,
      byProject: [...pipeByProject.entries()]
        .map(([code, data]) => ({ code, ...data }))
        .sort((a, b) => b.weighted - a.weighted),
    }

    // ── Grants-to-Revenue Reconciliation (by contact matching) ───────
    const realizedGrants = await Promise.all(
      (realizedResult.data || []).map(async (g) => {
        const grantValue = Number(g.value_mid || 0)
        const codes = g.project_codes || []
        const contactName = g.contact_name

        let matchedRevenue = 0

        // Proper matching: find Xero invoices (ACCREC) from the same contact
        if (contactName) {
          const { data: matchedInvoices } = await supabase
            .from('xero_invoices')
            .select('total, amount_paid, status')
            .eq('type', 'ACCREC')
            .ilike('contact_name', `%${contactName}%`)
            .limit(50)

          if (matchedInvoices) {
            matchedRevenue = matchedInvoices.reduce(
              (sum, inv) => sum + Number(inv.amount_paid || inv.total || 0), 0,
            )
          }
        }

        // Fallback: if no contact match, check project-level revenue (less accurate)
        if (matchedRevenue === 0 && codes.length > 0) {
          matchedRevenue = codes.reduce((sum: number, code: string) => {
            const fin = financials.get(code)
            return sum + (fin?.revenue || 0)
          }, 0)
        }

        return {
          title: g.title,
          value: grantValue,
          project_codes: codes,
          source: g.source_system,
          contact: contactName,
          recognizedRevenue: matchedRevenue,
          gap: Math.max(0, grantValue - matchedRevenue),
          status: reconciliationStatus(grantValue, matchedRevenue),
        }
      }),
    )

    // ── Overhead Allocation ──────────────────────────────────────────
    const hqFinancials = financials.get('ACT-HQ')
    const hqExpenses = Math.abs(hqFinancials?.expenses || 0)
    const hqRevenue = hqFinancials?.revenue || 0

    const nonHqProjects = [...financials.entries()]
      .filter(([code]) => code !== 'ACT-HQ' && code !== 'DISPUTED')
      .map(([code, v]) => ({
        code,
        name: projectMap.get(code)?.name || code,
        expenses: v.expenses,
        revenue: v.revenue,
      }))

    const overheadByProject = allocateOverhead(hqExpenses, nonHqProjects)
    const directExpenseTotal = nonHqProjects.reduce((sum, p) => sum + Math.abs(p.expenses), 0)

    // ── Layer 3: Scenarios ───────────────────────────────────────────
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

    // ── Health Score ─────────────────────────────────────────────────
    const budgetUtilizations = sortedProjects
      .map(p => p.budgetPct)
      .filter((p): p is number => p !== null)

    const healthScore = calculateHealthScore({
      runwayMonths,
      burnTrend,
      receivablesTotal: totalReceivables,
      receivablesOverdue: receivablesAging.overdue30 + receivablesAging.overdue60 + receivablesAging.overdue90,
      budgetUtilizations,
    })

    // ── Smart Nudges ─────────────────────────────────────────────────
    const overdueInvoices = receivables
      .filter(inv => {
        if (!inv.due_date) return false
        const days = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
        return days > 30
      })
      .map(inv => ({
        contact_name: inv.contact_name,
        amount_due: Number(inv.amount_due || 0),
        due_date: inv.due_date,
      }))
      .sort((a, b) => b.amount_due - a.amount_due)

    const budgetAlerts = sortedProjects
      .filter(p => p.budgetPct !== null && p.budgetPct > 80)
      .map(p => ({ code: p.code, pct: p.budgetPct! }))

    const nudges = generateNudges({
      overdueInvoices,
      pipelineClosingSoon,
      budgetAlerts,
      lastSyncAt,
    })

    // ── Build Response ───────────────────────────────────────────────
    const data = {
      actuals,
      pipeline: { ...pipeline, realizedGrants },
      scenarios,
      overheadAllocation: {
        hqExpenses,
        hqRevenue,
        directExpenseTotal,
        byProject: overheadByProject,
      },
      healthScore,
      nudges,
      fy: 'FY26',
      fyStart,
      lastSyncAt,
      generatedAt: now.toISOString(),
    }

    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return response
  } catch (error) {
    console.error('Error in finance overview API:', error)
    return NextResponse.json({ error: 'Failed to load overview data' }, { status: 500 })
  }
}
