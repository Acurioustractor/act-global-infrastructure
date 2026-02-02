import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get last 6 months of transactions to compute averages
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: txns } = await supabase
      .from('xero_transactions')
      .select('total, type, date')
      .gte('date', sixMonthsAgo.toISOString().split('T')[0])

    let totalInflow = 0, totalOutflow = 0
    for (const tx of txns || []) {
      const amt = Number(tx.total) || 0
      if (tx.type === 'RECEIVE') totalInflow += amt
      else if (tx.type === 'SPEND') totalOutflow += amt
    }

    const avgMonthlyInflow = totalInflow / 6
    const avgMonthlyOutflow = totalOutflow / 6

    // Current balance approximation from receivables - payables
    const { data: receivables } = await supabase
      .from('xero_invoices')
      .select('amount_due')
      .eq('type', 'ACCREC')
      .in('status', ['AUTHORISED', 'SENT'])

    const { data: payables } = await supabase
      .from('xero_invoices')
      .select('amount_due')
      .eq('type', 'ACCPAY')
      .in('status', ['AUTHORISED', 'SENT'])

    const recTotal = (receivables || []).reduce((s, i) => s + (Number(i.amount_due) || 0), 0)
    const payTotal = (payables || []).reduce((s, i) => s + (Number(i.amount_due) || 0), 0)
    const currentBalance = recTotal - payTotal

    // Forecast 6 months ahead
    const forecast = []
    let runningBalance = currentBalance
    for (let i = 1; i <= 6; i++) {
      const month = new Date()
      month.setMonth(month.getMonth() + i)
      runningBalance += avgMonthlyInflow - avgMonthlyOutflow
      forecast.push({
        month: month.toISOString().slice(0, 7),
        label: month.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
        projected_balance: Math.round(runningBalance),
        projected_inflow: Math.round(avgMonthlyInflow),
        projected_outflow: Math.round(avgMonthlyOutflow),
      })
    }

    return NextResponse.json({
      current_balance: Math.round(currentBalance),
      avg_monthly_inflow: Math.round(avgMonthlyInflow),
      avg_monthly_outflow: Math.round(avgMonthlyOutflow),
      forecast,
      months_of_runway: avgMonthlyOutflow > avgMonthlyInflow
        ? Math.round(Math.abs(currentBalance) / (avgMonthlyOutflow - avgMonthlyInflow))
        : null,
    })
  } catch (e) {
    console.error('Cash flow forecast error:', e)
    return NextResponse.json({
      current_balance: 0,
      avg_monthly_inflow: 0,
      avg_monthly_outflow: 0,
      forecast: [],
      months_of_runway: null,
    })
  }
}
