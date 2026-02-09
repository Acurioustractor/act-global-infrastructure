import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface RunwayResponse {
  runwayMonths: number
  burnRate: number
  currentBalance: number
  diversificationIndex: number
  restrictedFunds: number
  unrestrictedFunds: number
  burnTrend: Array<{ month: string; burn: number; income: number }>
  grantCliffs: Array<{
    name: string
    projectCode: string
    amount: number
    expiresAt: string
    daysRemaining: number
  }>
  revenueSources: Array<{ source: string; amount: number; percentage: number }>
  scenarios: Array<{
    name: string
    runwayMonths: number
    adjustments: Record<string, number>
  }>
  fundraisingPipeline: Array<{
    name: string
    amount: number
    status: string
    projectCode: string
  }>
  lastUpdated: string
}

async function fetchFinancialHistory() {
  const { data } = await supabase
    .from('financial_snapshots')
    .select('*')
    .order('month', { ascending: true })
    .limit(24)

  return (data || []).map((row: any) => ({
    month: row.month,
    income: row.income || 0,
    expenses: row.expenses || 0,
    balance: row.closing_balance || 0,
  }))
}

async function fetchGrantFunding() {
  const { data } = await supabase
    .from('grant_applications')
    .select('application_name, project_code, outcome_amount, status, milestones')
    .eq('status', 'successful')

  return (data || []).map((g: any) => ({
    name: g.application_name,
    projectCode: g.project_code || 'Unassigned',
    amount: g.outcome_amount || 0,
    milestones: g.milestones || [],
  }))
}

async function fetchFundraisingPipeline() {
  const { data } = await supabase
    .from('fundraising_pipeline')
    .select('name, amount, status, project_codes')
    .in('status', ['prospecting', 'cultivation', 'proposal', 'pledged'])

  return (data || []).map((f: any) => ({
    name: f.name,
    amount: f.amount || 0,
    status: f.status,
    projectCode: Array.isArray(f.project_codes) && f.project_codes.length > 0 ? f.project_codes[0] : 'Unassigned',
  }))
}

async function fetchSubscriptionBaseline() {
  const { data } = await supabase
    .from('subscriptions')
    .select('amount, billing_cycle')
    .eq('account_status', 'active')

  let monthly = 0
  for (const sub of data || []) {
    const amt = Math.abs(sub.amount || 0)
    if (sub.billing_cycle === 'monthly') monthly += amt
    else if (sub.billing_cycle === 'annual' || sub.billing_cycle === 'yearly') monthly += amt / 12
    else if (sub.billing_cycle === 'quarterly') monthly += amt / 3
  }
  return monthly
}

async function fetchRevenueStreams() {
  const { data } = await supabase
    .from('revenue_streams')
    .select('name, target_monthly, category')

  return (data || []).map((r: any) => ({
    source: r.name || r.category,
    amount: r.target_monthly || 0,
  }))
}

async function fetchScenarios() {
  const { data } = await supabase
    .from('cashflow_scenarios')
    .select('name, description, adjustments')
    .order('created_at', { ascending: false })
    .limit(3)

  return data || []
}

async function fetchGHLWins() {
  const { data } = await supabase
    .from('ghl_opportunities')
    .select('name, monetary_value, pipeline_stage')
    .eq('status', 'won')

  return (data || []).reduce((sum: number, o: any) => sum + (o.monetary_value || 0), 0)
}

export async function GET(): Promise<NextResponse<RunwayResponse>> {
  try {
    const [history, grants, fundraising, subscriptionBaseline, revenueStreams, scenarios, ghlWins] =
      await Promise.all([
        fetchFinancialHistory(),
        fetchGrantFunding(),
        fetchFundraisingPipeline(),
        fetchSubscriptionBaseline(),
        fetchRevenueStreams(),
        fetchScenarios(),
        fetchGHLWins(),
      ])

    // Current balance from most recent snapshot
    const currentBalance = history.length > 0 ? history[history.length - 1].balance : 0

    // Burn rate (6-month rolling average)
    const last6 = history.slice(-6)
    let totalBurn = 0
    last6.forEach(m => {
      totalBurn += Math.max(0, m.expenses - m.income)
    })
    const burnRate = last6.length > 0 ? totalBurn / last6.length : 0

    // Runway
    const runwayMonths = burnRate > 0 ? currentBalance / burnRate : 0

    // Burn trend (12-month)
    const burnTrend = history.slice(-12).map(m => ({
      month: m.month,
      burn: m.expenses - m.income,
      income: m.income,
    }))

    // Grant cliffs - when major funding expires
    const now = new Date()
    const grantCliffs = grants
      .map(g => {
        // Look for end date in milestones
        const endMilestone = g.milestones.find((m: any) =>
          m.name?.toLowerCase().includes('end') || m.name?.toLowerCase().includes('acquittal')
        )
        const expiresAt = endMilestone?.due || null
        const daysRemaining = expiresAt
          ? Math.round((new Date(expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 365 // Default to 1 year if no end date

        return {
          name: g.name,
          projectCode: g.projectCode,
          amount: g.amount,
          expiresAt: expiresAt || 'Unknown',
          daysRemaining,
        }
      })
      .filter(g => g.amount > 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)

    // Restricted vs unrestricted
    const restrictedFunds = grants.reduce((sum, g) => sum + g.amount, 0)
    const unrestrictedFunds = Math.max(0, currentBalance - restrictedFunds)

    // Revenue sources for diversification
    const allRevenue: Array<{ source: string; amount: number }> = [
      ...revenueStreams,
      { source: 'Grant Funding', amount: restrictedFunds / 12 }, // Annualized monthly
      { source: 'CRM Pipeline Wins', amount: ghlWins / 12 },
    ].filter(r => r.amount > 0)

    const totalRevenue = allRevenue.reduce((sum, r) => sum + r.amount, 0)
    const revenueSources = allRevenue.map(r => ({
      ...r,
      percentage: totalRevenue > 0 ? Math.round((r.amount / totalRevenue) * 100) : 0,
    }))

    // Diversification index: 1 - HHI (Herfindahl-Hirschman Index)
    // 0 = completely concentrated, 1 = perfectly diversified
    const hhi = revenueSources.reduce((sum, r) => {
      const share = r.percentage / 100
      return sum + share * share
    }, 0)
    const diversificationIndex = Math.round((1 - hhi) * 100)

    // Scenario projections
    const scenarioProjections = (scenarios || []).map((s: any) => {
      const adj = s.adjustments || {}
      const adjustedBurn = burnRate * (1 + (adj.expenses_change || 0) / 100)
      const adjustedIncome = (totalRevenue * 12) * (1 + (adj.income_change || 0) / 100) / 12
      const adjustedNet = adjustedBurn - adjustedIncome
      return {
        name: s.name,
        runwayMonths: adjustedNet > 0 ? Math.round((currentBalance / adjustedNet) * 10) / 10 : 999,
        adjustments: s.adjustments || {},
      }
    })

    return NextResponse.json({
      runwayMonths: Math.round(runwayMonths * 10) / 10,
      burnRate: Math.round(burnRate),
      currentBalance: Math.round(currentBalance),
      diversificationIndex,
      restrictedFunds: Math.round(restrictedFunds),
      unrestrictedFunds: Math.round(unrestrictedFunds),
      burnTrend,
      grantCliffs,
      revenueSources,
      scenarios: scenarioProjections,
      fundraisingPipeline: fundraising,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in runway GET handler:', error)
    return NextResponse.json({
      runwayMonths: 0,
      burnRate: 0,
      currentBalance: 0,
      diversificationIndex: 0,
      restrictedFunds: 0,
      unrestrictedFunds: 0,
      burnTrend: [],
      grantCliffs: [],
      revenueSources: [],
      scenarios: [],
      fundraisingPipeline: [],
      lastUpdated: new Date().toISOString(),
    }, { status: 500 })
  }
}
