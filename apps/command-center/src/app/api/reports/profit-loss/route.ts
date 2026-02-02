import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const now = new Date()
    const fyStart = new Date(now.getFullYear(), 6, 1) // July 1
    if (now.getMonth() < 6) fyStart.setFullYear(fyStart.getFullYear() - 1)
    const fyStartStr = fyStart.toISOString().split('T')[0]

    // Get RECEIVE transactions (income)
    const { data: income } = await supabase
      .from('xero_transactions')
      .select('total, bank_account, contact_name, date')
      .eq('type', 'RECEIVE')
      .gte('date', fyStartStr)

    // Get SPEND transactions (expenses)
    const { data: expenses } = await supabase
      .from('xero_transactions')
      .select('total, bank_account, contact_name, date')
      .eq('type', 'SPEND')
      .gte('date', fyStartStr)

    // Group income by contact/source
    const incomeByAccount: Record<string, number> = {}
    for (const tx of income || []) {
      const acct = tx.contact_name || 'Other Income'
      incomeByAccount[acct] = (incomeByAccount[acct] || 0) + (Number(tx.total) || 0)
    }

    const expenseByAccount: Record<string, number> = {}
    for (const tx of expenses || []) {
      const acct = tx.contact_name || 'Other Expenses'
      expenseByAccount[acct] = (expenseByAccount[acct] || 0) + Math.abs(Number(tx.total) || 0)
    }

    const totalIncome = Object.values(incomeByAccount).reduce((s, v) => s + v, 0)
    const totalExpenses = Object.values(expenseByAccount).reduce((s, v) => s + v, 0)

    return NextResponse.json({
      period: { start: fyStart.toISOString(), end: now.toISOString(), label: `FY${fyStart.getFullYear()}/${fyStart.getFullYear() + 1}` },
      income: { total: Math.round(totalIncome * 100) / 100, byAccount: incomeByAccount },
      expenses: { total: Math.round(totalExpenses * 100) / 100, byAccount: expenseByAccount },
      netProfit: Math.round((totalIncome - totalExpenses) * 100) / 100,
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
