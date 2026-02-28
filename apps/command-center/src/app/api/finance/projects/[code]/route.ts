import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const projectCode = decodeURIComponent(code).toUpperCase()

    // Parallel fetch monthly financials, variance notes, and recent transactions
    const [monthly, variances, transactions] = await Promise.all([
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

    return NextResponse.json({
      projectCode,
      monthly: monthlyData,
      totals,
      expenseCategories,
      revenueCategories,
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
