import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface FinancialSnapshot {
  month: string
  income: number
  expenses: number
  balance: number
}

interface Transaction {
  id: string
  total: number
  type: 'RECEIVE' | 'SPEND' | 'TRANSFER'
  date: string
}

interface Invoice {
  id: string
  total: number
  amount_due: number
  due_date: string
  status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED'
  type: 'ACCREC' | 'ACCPAY'
}

interface Subscription {
  id: string
  amount: number
  frequency: string
  next_payment_date: string
}

interface ProjectionMonth {
  month: string
  projected_income: number
  projected_expenses: number
  projected_balance: number
  confidence: number
}

interface Metrics {
  burnRate: number
  runway: number
  trend: 'increasing' | 'decreasing' | 'stable'
  trendPercent: number
}

interface CashflowResponse {
  history: FinancialSnapshot[]
  projections: ProjectionMonth[]
  scenarios: Array<{
    id: string
    name: string
    description: string
    adjustments: Record<string, number>
  }>
  metrics: Metrics
  currentBalance: number
  lastUpdated: string
}

async function fetchFinancialHistory(): Promise<FinancialSnapshot[]> {
  const { data, error } = await supabase
    .from('financial_snapshots')
    .select('*')
    .order('month', { ascending: true })
    .limit(24)

  if (error) {
    console.error('Error fetching financial snapshots:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    month: row.month,
    income: row.income || 0,
    expenses: row.expenses || 0,
    balance: row.balance || 0,
  }))
}

async function fetchCurrentMonthData(): Promise<{
  income: number
  expenses: number
}> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const { data: transactions, error } = await supabase
    .from('xero_transactions')
    .select('total, type')
    .gte('date', monthStart.toISOString())
    .lte('date', monthEnd.toISOString())

  if (error) {
    console.error('Error fetching transactions:', error)
    return { income: 0, expenses: 0 }
  }

  let income = 0
  let expenses = 0

  ;(transactions || []).forEach((tx: any) => {
    if (tx.type === 'RECEIVE') {
      income += Math.abs(tx.total || 0)
    } else if (tx.type === 'SPEND') {
      expenses += Math.abs(tx.total || 0)
    }
  })

  return { income, expenses }
}

async function fetchUpcomingInvoices(): Promise<{
  receivables: number
  payables: number
}> {
  const now = new Date()
  const nowDateString = now.toISOString().split('T')[0]
  const sixMonthsOut = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
  const sixMonthsOutDateString = sixMonthsOut.toISOString().split('T')[0]

  const { data: invoices, error } = await supabase
    .from('xero_invoices')
    .select('total, amount_due, type, due_date, status')
    .gte('due_date', nowDateString)
    .lte('due_date', sixMonthsOutDateString)
    .in('status', ['DRAFT', 'SUBMITTED', 'AUTHORISED'])
    .gt('amount_due', 0)

  if (error) {
    console.error('Error fetching invoices:', error)
    return { receivables: 0, payables: 0 }
  }

  let receivables = 0
  let payables = 0

  ;(invoices || []).forEach((inv: any) => {
    const amount = Math.abs(inv.amount_due || 0)
    if (inv.type === 'ACCREC') {
      receivables += amount
    } else if (inv.type === 'ACCPAY') {
      payables += amount
    }
  })

  return { receivables, payables }
}

async function fetchSubscriptions(): Promise<number> {
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('amount, billing_cycle')

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return 0
    }

    let monthlyRecurring = 0

    ;(subscriptions || []).forEach((sub: any) => {
      const amount = Math.abs(sub.amount || 0)
      if (sub.billing_cycle === 'monthly') {
        monthlyRecurring += amount
      } else if (sub.billing_cycle === 'annual' || sub.billing_cycle === 'yearly') {
        monthlyRecurring += amount / 12
      } else if (sub.billing_cycle === 'quarterly') {
        monthlyRecurring += amount / 3
      }
    })

    return monthlyRecurring
  } catch (error) {
    console.error('Error in fetchSubscriptions:', error)
    return 0
  }
}

async function fetchScenarios(): Promise<
  Array<{
    id: string
    name: string
    description: string
    adjustments: Record<string, number>
  }>
> {
  const { data: scenarios, error } = await supabase
    .from('cashflow_scenarios')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching scenarios:', error)
    return []
  }

  return (scenarios || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    adjustments: s.adjustments || {},
  }))
}

function calculateMetrics(
  history: FinancialSnapshot[],
  currentBalance: number
): Metrics {
  if (history.length === 0) {
    return {
      burnRate: 0,
      runway: 0,
      trend: 'stable',
      trendPercent: 0,
    }
  }

  // Calculate average monthly burn rate from last 6 months
  const last6Months = history.slice(-6)
  let totalBurn = 0
  last6Months.forEach((month) => {
    const burn = month.expenses - month.income
    totalBurn += Math.max(0, burn)
  })
  const burnRate = totalBurn / last6Months.length

  // Calculate runway in months
  const runway = burnRate > 0 ? currentBalance / burnRate : 0

  // Calculate trend
  const first3Months = history.slice(0, Math.min(3, history.length))
  const last3Months = history.slice(-3)

  let firstAvgExpenses = 0
  let lastAvgExpenses = 0

  first3Months.forEach((m) => {
    firstAvgExpenses += m.expenses
  })
  firstAvgExpenses = first3Months.length > 0 ? firstAvgExpenses / first3Months.length : 0

  last3Months.forEach((m) => {
    lastAvgExpenses += m.expenses
  })
  lastAvgExpenses = last3Months.length > 0 ? lastAvgExpenses / last3Months.length : 0

  const trendPercent =
    firstAvgExpenses > 0
      ? ((lastAvgExpenses - firstAvgExpenses) / firstAvgExpenses) * 100
      : 0
  const trend =
    trendPercent > 2 ? 'increasing' : trendPercent < -2 ? 'decreasing' : 'stable'

  return {
    burnRate: Math.round(burnRate),
    runway: Math.round(runway * 10) / 10,
    trend,
    trendPercent: Math.round(trendPercent),
  }
}

function generateProjections(
  history: FinancialSnapshot[],
  currentBalance: number,
  monthlyRecurring: number
): ProjectionMonth[] {
  const projections: ProjectionMonth[] = []

  if (history.length === 0) {
    return projections
  }

  // Calculate average monthly income and expenses from last 6 months
  const last6Months = history.slice(-6)
  let totalIncome = 0
  let totalExpenses = 0

  last6Months.forEach((month) => {
    totalIncome += month.income
    totalExpenses += month.expenses
  })

  const avgMonthlyIncome = last6Months.length > 0 ? totalIncome / last6Months.length : 0
  const avgMonthlyExpenses =
    last6Months.length > 0 ? totalExpenses / last6Months.length : 0

  // Add recurring subscriptions to expenses
  const projectedMonthlyExpenses = avgMonthlyExpenses + monthlyRecurring

  // Generate 12-month projection
  let projectedBalance = currentBalance
  const now = new Date()

  for (let i = 1; i <= 12; i++) {
    const projectionDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const monthKey = projectionDate.toISOString().slice(0, 7)

    // Add some seasonal variation (slightly higher spending in Q4)
    const seasonalFactor = [10, 11].includes(projectionDate.getMonth()) ? 1.15 : 1

    const projectedIncome = avgMonthlyIncome
    const projectedExpenses = projectedMonthlyExpenses * seasonalFactor
    const monthlyNet = projectedIncome - projectedExpenses

    projectedBalance += monthlyNet

    // Confidence decreases as we project further into the future
    const confidence = Math.max(0.5, 1 - (i * 0.05))

    projections.push({
      month: monthKey,
      projected_income: Math.round(projectedIncome),
      projected_expenses: Math.round(projectedExpenses),
      projected_balance: Math.round(projectedBalance),
      confidence,
    })
  }

  return projections
}

export async function GET(): Promise<NextResponse<CashflowResponse>> {
  try {
    // Fetch all required data in parallel
    const [history, currentMonth, invoices, subscriptions, scenarios] =
      await Promise.all([
        fetchFinancialHistory(),
        fetchCurrentMonthData(),
        fetchUpcomingInvoices(),
        fetchSubscriptions(),
        fetchScenarios(),
      ])

    // Get the most recent balance from history
    let currentBalance = 0
    if (history.length > 0) {
      currentBalance = history[history.length - 1].balance
    }

    // Add current month to history for display
    const historyWithCurrent = [
      ...history,
      {
        month: new Date().toISOString().slice(0, 7),
        income: currentMonth.income,
        expenses: currentMonth.expenses,
        balance: currentBalance + (currentMonth.income - currentMonth.expenses),
      },
    ]

    // Calculate metrics
    const metrics = calculateMetrics(history, currentBalance)

    // Generate projections
    const projections = generateProjections(
      history,
      currentBalance,
      subscriptions
    )

    const response: CashflowResponse = {
      history: historyWithCurrent,
      projections,
      scenarios,
      metrics,
      currentBalance,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in cashflow GET handler:', error)
    return NextResponse.json(
      {
        history: [],
        projections: [],
        scenarios: [],
        metrics: {
          burnRate: 0,
          runway: 0,
          trend: 'stable',
          trendPercent: 0,
        },
        currentBalance: 0,
        lastUpdated: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

interface ScenarioRequest {
  name: string
  description: string
  adjustments: Record<string, number>
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: ScenarioRequest = await request.json()

    const { data, error } = await supabase
      .from('cashflow_scenarios')
      .insert({
        name: body.name,
        description: body.description,
        adjustments: body.adjustments,
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('Error creating scenario:', error)
      return NextResponse.json(
        { error: 'Failed to create scenario' },
        { status: 500 }
      )
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error in cashflow POST handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
