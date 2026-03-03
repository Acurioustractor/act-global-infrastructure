import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all data in parallel
    const [txResult, invResult] = await Promise.all([
      // All transactions for aggregation
      supabase
        .from('xero_transactions')
        .select('total, type, date, contact_name')
        .order('date', { ascending: false }),

      // All invoices
      supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, amount_due, total, type, status, due_date')
        .in('status', ['AUTHORISED', 'SENT', 'PAID']),
    ])

    const transactions = txResult.data || []
    const invoices = invResult.data || []

    // Aggregate income/expenses totals
    let totalIncome = 0
    let totalExpenses = 0
    let monthlyIncome = 0
    let monthlyExpenses = 0

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().split('T')[0]

    // Monthly trend: last 12 months
    const monthlyMap: Record<string, { income: number; expenses: number }> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      monthlyMap[key] = { income: 0, expenses: 0 }
    }

    // Top contacts
    const incomeByContact: Record<string, number> = {}
    const expenseByContact: Record<string, number> = {}

    for (const tx of transactions) {
      const amt = Math.abs(Number(tx.total) || 0)
      const contact = tx.contact_name || 'Unknown'
      const month = tx.date?.substring(0, 7)

      if (tx.type === 'RECEIVE') {
        totalIncome += amt
        if (tx.date && tx.date >= monthStartStr) monthlyIncome += amt
        if (month && monthlyMap[month]) monthlyMap[month].income += amt
        incomeByContact[contact] = (incomeByContact[contact] || 0) + amt
      } else if (tx.type === 'SPEND') {
        totalExpenses += amt
        if (tx.date && tx.date >= monthStartStr) monthlyExpenses += amt
        if (month && monthlyMap[month]) monthlyMap[month].expenses += amt
        expenseByContact[contact] = (expenseByContact[contact] || 0) + amt
      }
    }

    const monthlyTrend = Object.entries(monthlyMap).map(([month, vals]) => ({
      month,
      income: Math.round(vals.income),
      expenses: Math.round(vals.expenses),
    }))

    // Top 10 income contacts
    const topIncomeContacts = Object.entries(incomeByContact)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, total]) => ({ name, total: Math.round(total) }))

    // Top 10 expense contacts
    const topExpenseContacts = Object.entries(expenseByContact)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, total]) => ({ name, total: Math.round(total) }))

    // Receivables & payables
    const outstandingReceivables = invoices.filter(
      i => i.type === 'ACCREC' && (i.status === 'AUTHORISED' || i.status === 'SENT') && (Number(i.amount_due) || 0) > 0
    )
    const receivableTotal = outstandingReceivables.reduce((s, i) => s + (Number(i.amount_due) || 0), 0)

    const outstandingPayables = invoices.filter(
      i => i.type === 'ACCPAY' && (i.status === 'AUTHORISED' || i.status === 'SENT') && (Number(i.amount_due) || 0) > 0
    )
    const payableTotal = outstandingPayables.reduce((s, i) => s + (Number(i.amount_due) || 0), 0)

    // Overdue invoices
    const todayStr = now.toISOString().split('T')[0]
    const overdueInvoices = outstandingReceivables.filter(
      i => i.due_date && i.due_date < todayStr
    )

    // Aging buckets for overdue invoices
    const agingBuckets = { current: 0, days30: 0, days60: 0, days90: 0, days120plus: 0 }
    const agingBucketCounts = { current: 0, days30: 0, days60: 0, days90: 0, days120plus: 0 }
    for (const inv of outstandingReceivables) {
      const amt = Number(inv.amount_due) || 0
      if (!inv.due_date || inv.due_date >= todayStr) {
        agingBuckets.current += amt
        agingBucketCounts.current++
      } else {
        const dueDate = new Date(inv.due_date)
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysOverdue <= 30) { agingBuckets.days30 += amt; agingBucketCounts.days30++ }
        else if (daysOverdue <= 60) { agingBuckets.days60 += amt; agingBucketCounts.days60++ }
        else if (daysOverdue <= 90) { agingBuckets.days90 += amt; agingBucketCounts.days90++ }
        else { agingBuckets.days120plus += amt; agingBucketCounts.days120plus++ }
      }
    }

    // Outstanding receivables list (for display)
    const receivablesList = outstandingReceivables
      .sort((a, b) => (Number(b.amount_due) || 0) - (Number(a.amount_due) || 0))
      .slice(0, 20)
      .map(i => {
        const amt = Number(i.amount_due) || 0
        const isOverdue = !!(i.due_date && i.due_date < todayStr)
        let daysOverdue = 0
        if (isOverdue && i.due_date) {
          daysOverdue = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
        }
        return {
          invoice_number: i.invoice_number || '',
          contact_name: i.contact_name || '',
          amount_due: amt,
          due_date: i.due_date || '',
          overdue: isOverdue,
          days_overdue: daysOverdue,
        }
      })

    return NextResponse.json({
      summary: {
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        netPosition: Math.round(totalIncome - totalExpenses),
        receivables: { total: Math.round(receivableTotal), count: outstandingReceivables.length },
        payables: { total: Math.round(payableTotal), count: outstandingPayables.length },
        monthlyIncome: Math.round(monthlyIncome),
        monthlyExpenses: Math.round(monthlyExpenses),
      },
      monthlyTrend,
      topIncomeContacts,
      topExpenseContacts,
      overdueInvoices: {
        count: overdueInvoices.length,
        total: Math.round(overdueInvoices.reduce((s, i) => s + (Number(i.amount_due) || 0), 0)),
        invoices: overdueInvoices.map(i => {
          let daysOverdue = 0
          if (i.due_date) {
            daysOverdue = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
          }
          return {
            invoice_number: i.invoice_number || '',
            contact_name: i.contact_name || '',
            amount_due: Number(i.amount_due) || 0,
            due_date: i.due_date || '',
            days_overdue: daysOverdue,
          }
        }),
      },
      agingBuckets: {
        current: Math.round(agingBuckets.current),
        days30: Math.round(agingBuckets.days30),
        days60: Math.round(agingBuckets.days60),
        days90: Math.round(agingBuckets.days90),
        days120plus: Math.round(agingBuckets.days120plus),
        counts: agingBucketCounts,
      },
      outstandingReceivables: receivablesList,
    })
  } catch (e) {
    console.error('Bookkeeping progress error:', e)
    return NextResponse.json({
      summary: {
        totalIncome: 0,
        totalExpenses: 0,
        netPosition: 0,
        receivables: { total: 0, count: 0 },
        payables: { total: 0, count: 0 },
        monthlyIncome: 0,
        monthlyExpenses: 0,
      },
      monthlyTrend: [],
      topIncomeContacts: [],
      topExpenseContacts: [],
      overdueInvoices: { count: 0, total: 0, invoices: [] },
      agingBuckets: { current: 0, days30: 0, days60: 0, days90: 0, days120plus: 0, counts: { current: 0, days30: 0, days60: 0, days90: 0, days120plus: 0 } },
      outstandingReceivables: [],
    })
  }
}
