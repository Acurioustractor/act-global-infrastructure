import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const projectCode = decodeURIComponent(code).toUpperCase()

    // Parallel fetch monthly financials, variance notes, transactions, budgets, R&D vendors
    const [monthly, variances, transactions, budgets, rdVendors, salaryAllocs, revenueStreams] = await Promise.all([
      supabase
        .from('project_monthly_financials')
        .select('*')
        .eq('project_code', projectCode)
        .order('month', { ascending: true })
        .limit(24),

      supabase
        .from('financial_variance_notes')
        .select('*')
        .eq('project_code', projectCode)
        .order('month', { ascending: false })
        .limit(12),

      supabase
        .from('xero_transactions')
        .select('id, date, contact_name, total, type, project_code_source')
        .eq('project_code', projectCode)
        .order('date', { ascending: false })
        .limit(50),

      supabase
        .from('project_budgets')
        .select('*')
        .eq('project_code', projectCode)
        .limit(10),

      supabase.rpc('exec_sql', {
        sql: `
          SELECT
            t.contact_name as vendor,
            v.category,
            SUM(ABS(t.total)) as spend,
            COUNT(*) as tx_count
          FROM xero_transactions t
          JOIN vendor_project_rules v ON t.contact_name = v.vendor_name
          WHERE v.rd_eligible = true
            AND t.total < 0
            AND t.project_code = '${projectCode.replace(/'/g, "''")}'
            AND t.date >= '2024-07-01'
          GROUP BY t.contact_name, v.category
          ORDER BY spend DESC
        `
      }),

      supabase
        .from('project_salary_allocations')
        .select('*')
        .eq('project_code', projectCode)
        .eq('fy', 'FY26')
        .order('allocation_pct', { ascending: false }),

      supabase
        .from('revenue_streams')
        .select('*')
        .contains('project_codes', [projectCode]),
    ])

    const monthlyData = (monthly.data || []).map((m: any) => ({
      month: m.month,
      revenue: Number(m.revenue || 0),
      expenses: Number(m.expenses || 0),
      net: Number(m.net || 0),
      revenueBreakdown: m.revenue_breakdown || {},
      expenseBreakdown: m.expense_breakdown || {},
      fyYtdRevenue: Number(m.fy_ytd_revenue || 0),
      fyYtdExpenses: Number(m.fy_ytd_expenses || 0),
      fyYtdNet: Number(m.fy_ytd_net || 0),
      transactionCount: m.transaction_count || 0,
      unmappedCount: m.unmapped_count || 0,
    }))

    // Calculate totals from the monthly data
    const totals = monthlyData.reduce(
      (acc: any, m: any) => ({
        revenue: acc.revenue + m.revenue,
        expenses: acc.expenses + m.expenses,
        net: acc.net + m.net,
      }),
      { revenue: 0, expenses: 0, net: 0 }
    )

    // Aggregate expense and revenue breakdowns across all months
    const expenseCategories: Record<string, number> = {}
    const revenueCategories: Record<string, number> = {}
    for (const m of monthlyData) {
      for (const [cat, amt] of Object.entries(m.expenseBreakdown)) {
        expenseCategories[cat] = (expenseCategories[cat] || 0) + Number(amt)
      }
      for (const [cat, amt] of Object.entries(m.revenueBreakdown)) {
        revenueCategories[cat] = (revenueCategories[cat] || 0) + Number(amt)
      }
    }

    // Budget data
    const budgetData = (budgets.data || []).map((b: any) => ({
      fy: b.fy,
      annualBudget: Number(b.annual_budget || 0),
      ytdBudget: Number(b.ytd_budget || 0),
      category: b.category || 'total',
    }))
    const currentBudget = budgetData.find((b: any) => b.fy === 'FY26')
    const budgetVsActual = currentBudget ? {
      annualBudget: currentBudget.annualBudget,
      ytdBudget: currentBudget.ytdBudget || currentBudget.annualBudget,
      ytdActual: Math.abs(totals.expenses),
      variance: (currentBudget.ytdBudget || currentBudget.annualBudget) - Math.abs(totals.expenses),
      utilisationPct: currentBudget.annualBudget > 0
        ? Math.round((Math.abs(totals.expenses) / currentBudget.annualBudget) * 100)
        : null,
    } : null

    // R&D data
    const rdVendorData = (rdVendors?.data || []).map((v: any) => ({
      vendor: v.vendor,
      category: v.category,
      spend: Number(v.spend),
      txCount: Number(v.tx_count),
    }))
    const totalRdSpend = rdVendorData.reduce((s: number, v: any) => s + v.spend, 0)
    const rdSummary = {
      totalSpend: totalRdSpend,
      pctOfExpenses: Math.abs(totals.expenses) > 0
        ? Math.round((totalRdSpend / Math.abs(totals.expenses)) * 100)
        : 0,
      potentialOffset: Math.round(totalRdSpend * 0.435),
      topVendors: rdVendorData.slice(0, 10),
    }

    // Salary allocations
    const salaryData = (salaryAllocs.data || []).map((s: any) => ({
      personName: s.person_name,
      role: s.role,
      allocationPct: Number(s.allocation_pct),
      monthlyCost: Number(s.monthly_cost),
      annualCost: Number(s.monthly_cost) * 12,
      rdEligible: s.rd_eligible,
    }))
    const totalSalaryCost = salaryData.reduce((s: number, a: any) => s + a.annualCost, 0)
    const rdSalaryCost = salaryData.filter((a: any) => a.rdEligible).reduce((s: number, a: any) => s + a.annualCost, 0)

    // Revenue streams linked to this project
    const revenueStreamData = (revenueStreams.data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      targetMonthly: Number(s.target_monthly || 0),
      status: s.status,
    }))

    return NextResponse.json({
      projectCode,
      monthly: monthlyData,
      totals,
      expenseCategories,
      revenueCategories,
      budgetVsActual,
      rdSummary,
      revenueStreams: revenueStreamData,
      salaryAllocations: {
        allocations: salaryData,
        totalAnnualCost: totalSalaryCost,
        rdEligibleCost: rdSalaryCost,
      },
      variances: (variances.data || []).map((v: any) => ({
        month: v.month,
        type: v.variance_type,
        amountChange: Number(v.amount_change),
        pctChange: v.pct_change ? Number(v.pct_change) : null,
        explanation: v.explanation,
        severity: v.severity,
        topDrivers: v.top_drivers,
      })),
      recentTransactions: (transactions.data || []).map((tx: any) => ({
        id: tx.id,
        date: tx.date,
        contact: tx.contact_name,
        amount: tx.total,
        type: tx.type,
      })),
    })
  } catch (error) {
    console.error('Error in project monthly financials:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
