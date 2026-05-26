import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all required data
    const [debtsRes, paymentsRes, scenariosRes, propertiesRes] = await Promise.all([
      supabase.from('debts').select('*'),
      supabase.from('debt_payments').select('*'),
      supabase.from('debt_scenarios').select('*'),
      supabase.from('properties').select('*').eq('is_active', true),
    ])

    if (debtsRes.error || paymentsRes.error || scenariosRes.error || propertiesRes.error) {
      throw new Error('Failed to fetch debt data')
    }

    const debts = debtsRes.data || []
    const payments = paymentsRes.data || []
    const scenarios = scenariosRes.data || []
    const properties = propertiesRes.data || []

    // Calculate metrics
    const totalBalance = debts.reduce((sum, d) => sum + (d.current_balance || 0), 0)

    const totalOriginal = debts.reduce((sum, d) => sum + (d.original_amount || 0), 0)
    const equityPct = totalOriginal > 0 ? ((totalOriginal - totalBalance) / totalOriginal) * 100 : 0

    const monthlyPayment = debts.reduce((sum, d) => sum + (d.monthly_payment || 0), 0)

    // Calculate projected payoff using simple amortisation
    let projectedPayoff: string | null = null
    if (debts.length > 0 && monthlyPayment > 0) {
      const avgInterestRate = debts.reduce((sum, d) => sum + (d.interest_rate || 0), 0) / debts.length / 100 / 12
      const monthlyRate = avgInterestRate || 0
      let remainingBalance = totalBalance
      let months = 0
      const maxMonths = 600 // 50 years max

      while (remainingBalance > 0 && months < maxMonths) {
        const interest = remainingBalance * monthlyRate
        remainingBalance -= monthlyPayment - interest
        months++
      }

      if (months < maxMonths) {
        const payoffDate = new Date()
        payoffDate.setMonth(payoffDate.getMonth() + months)
        projectedPayoff = payoffDate.toISOString().split('T')[0]
      }
    }

    // Calculate interest saved for scenarios
    const scenariosWithAnalysis = scenarios.map((s) => {
      const interestSaved = (s.projected_interest_original || 0) - (s.projected_interest_new || 0)
      return {
        ...s,
        interestSaved,
      }
    })

    return NextResponse.json({
      debts,
      payments,
      scenarios: scenariosWithAnalysis,
      metrics: {
        totalBalance,
        equityPct,
        monthlyPayment,
        projectedPayoff,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { data, error } = await supabase.from('debt_scenarios').insert([body]).select()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
