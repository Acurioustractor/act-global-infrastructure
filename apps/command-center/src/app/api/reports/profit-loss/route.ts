import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getMonthlyPL } from '@/lib/finance/ledger'

type PmfRow = {
  month: string
  revenue: number | string | null
  expenses: number | string | null
  revenue_breakdown: Record<string, number> | null
  expense_breakdown: Record<string, number> | null
}

/**
 * Org P&L sourced from project_monthly_financials (the canonical org ledger), so this surface
 * agrees with /company, /strategy and the per-project pages. The old logic summed raw RECEIVE /
 * SPEND bank rows, which undercounts income (most invoice settlements land as RECEIVE-TRANSFER,
 * not RECEIVE) and produced a wrong net. FY26 net here ≈ +$518,059 (rev $1,732,851 − exp $1,214,792).
 */
export async function GET() {
  try {
    const now = new Date()
    const fyStart = new Date(now.getFullYear(), 6, 1) // July 1
    if (now.getMonth() < 6) fyStart.setFullYear(fyStart.getFullYear() - 1)
    const fyStartStr = fyStart.toISOString().split('T')[0]

    // Headline totals from the canonical monthly P&L rollup.
    const pl = await getMonthlyPL({ fyStart: fyStartStr })

    // By-contact breakdowns from pmf's *_breakdown JSON (keyed by contact/category → amount).
    const { data: pmfRows } = await supabase
      .from('project_monthly_financials')
      .select('month, revenue, expenses, revenue_breakdown, expense_breakdown')
      .gte('month', fyStartStr)
      .range(0, 9999)

    const incomeByAccount: Record<string, number> = {}
    const expenseByAccount: Record<string, number> = {}
    for (const row of (pmfRows as PmfRow[] | null) || []) {
      for (const [name, amt] of Object.entries(row.revenue_breakdown || {})) {
        const key = name || 'Other Income'
        incomeByAccount[key] = (incomeByAccount[key] || 0) + (Number(amt) || 0)
      }
      for (const [name, amt] of Object.entries(row.expense_breakdown || {})) {
        const key = name || 'Other Expenses'
        expenseByAccount[key] = (expenseByAccount[key] || 0) + (Number(amt) || 0)
      }
    }

    return NextResponse.json({
      period: { start: fyStart.toISOString(), end: now.toISOString(), label: `FY${fyStart.getFullYear()}/${fyStart.getFullYear() + 1}` },
      income: { total: pl.revenue, byAccount: incomeByAccount },
      expenses: { total: pl.expenses, byAccount: expenseByAccount },
      netProfit: pl.net,
    })
  } catch (e) {
    console.error('P&L error:', e)
    return NextResponse.json({
      period: { start: '', end: '', label: '' },
      income: { total: 0, byAccount: {} },
      expenses: { total: 0, byAccount: {} },
      netProfit: 0,
    })
  }
}
