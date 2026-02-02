import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get bank balance from xero_bank_transactions (latest balances by account)
    // Sum the most recent transactions per bank account as a proxy
    const { data: bankTxns } = await supabase
      .from('xero_bank_transactions')
      .select('bank_account_name, total, type')
      .order('date', { ascending: false })
      .limit(100)

    // Calculate net balance from recent bank transactions
    // Note: actual bank balance needs Xero API - this shows transaction volume
    const bankBalance = 0 // Cannot derive balance from transaction list

    // Get receivables (unpaid invoices sent)
    const { data: receivables } = await supabase
      .from('xero_invoices')
      .select('amount_due')
      .eq('type', 'ACCREC')
      .in('status', ['AUTHORISED', 'SENT'])

    const receivableTotal = (receivables || []).reduce((sum, i) => sum + (Number(i.amount_due) || 0), 0)

    // Get payables (unpaid bills)
    const { data: payables } = await supabase
      .from('xero_invoices')
      .select('amount_due')
      .eq('type', 'ACCPAY')
      .in('status', ['AUTHORISED', 'SENT'])

    const payableTotal = (payables || []).reduce((sum, i) => sum + (Number(i.amount_due) || 0), 0)

    // Get overdue invoices
    const now = new Date().toISOString()
    const { data: overdueInvoices } = await supabase
      .from('xero_invoices')
      .select('invoice_number, contact_name, amount_due, due_date')
      .eq('type', 'ACCREC')
      .in('status', ['AUTHORISED', 'SENT'])
      .lt('due_date', now)
      .order('due_date', { ascending: true })

    // Get this month's transactions for income/expenses
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { data: monthTxns } = await supabase
      .from('xero_transactions')
      .select('total, type')
      .gte('date', monthStart.toISOString().split('T')[0])

    let monthlyIncome = 0, monthlyExpenses = 0
    for (const tx of monthTxns || []) {
      const amt = Number(tx.total) || 0
      if (tx.type === 'RECEIVE') monthlyIncome += amt
      else if (tx.type === 'SPEND') monthlyExpenses += amt
    }

    return NextResponse.json({
      summary: {
        receivables: { total: receivableTotal, count: (receivables || []).length },
        payables: { total: payableTotal, count: (payables || []).length },
        bankBalance,
        monthlyIncome,
        monthlyExpenses,
      },
      overdueInvoices: {
        count: (overdueInvoices || []).length,
        total: (overdueInvoices || []).reduce((s, i) => s + (Number(i.amount_due) || 0), 0),
        invoices: overdueInvoices || [],
      },
      uncategorized: {
        count: 0,
        amount: 0,
      },
    })
  } catch (e) {
    console.error('Bookkeeping progress error:', e)
    return NextResponse.json({
      summary: {
        receivables: { total: 0, count: 0 },
        payables: { total: 0, count: 0 },
        bankBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
      },
      overdueInvoices: { count: 0, total: 0, invoices: [] },
      uncategorized: { count: 0, amount: 0 },
    })
  }
}
