import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const now = new Date()
    const fyStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
    const fyStartDate = `${fyStart}-07-01`
    const todayStr = now.toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]

    // Run all queries in parallel
    const [
      financials,
      receivables,
      projectHealth,
      contactSignals,
      pipeline,
      receiptGaps,
      rdEvidence,
      recentActivity,
    ] = await Promise.all([
      getFinancialHealth(fyStartDate, todayStr),
      getReceivablesAge(),
      getProjectHealth(),
      getContactsNeedingAttention(),
      getPipelineSummary(),
      getReceiptGaps(fyStartDate),
      getRdPosition(fyStartDate, todayStr),
      getRecentActivity(thirtyDaysAgo),
    ])

    // Calculate runway
    const monthsElapsed = Math.max(1, (now.getTime() - new Date(fyStartDate).getTime()) / (30 * 86400000))
    const monthlyBurn = financials.totalExpenses / monthsElapsed
    const runway = monthlyBurn > 0 ? financials.cashOnHand / monthlyBurn : 99

    return NextResponse.json({
      timestamp: now.toISOString(),
      fy: `FY${fyStart}-${(fyStart + 1).toString().slice(2)}`,
      financial: {
        revenue: financials.totalRevenue,
        expenses: financials.totalExpenses,
        net: financials.totalRevenue - financials.totalExpenses,
        cash_on_hand: financials.cashOnHand,
        monthly_burn: Math.round(monthlyBurn),
        runway_months: Math.round(runway * 10) / 10,
        runway_status: runway < 2 ? 'critical' : runway < 3 ? 'warning' : 'healthy',
      },
      receivables,
      projects: projectHealth,
      relationships: contactSignals,
      pipeline,
      receipts: receiptGaps,
      rd: rdEvidence,
      activity: recentActivity,
    })
  } catch (error) {
    console.error('Intelligence API error:', error)
    return NextResponse.json({ error: 'Failed to load intelligence data' }, { status: 500 })
  }
}

async function getFinancialHealth(fyStart: string, today: string) {
  const { data: revenue } = await supabase
    .from('xero_transactions')
    .select('total')
    .gt('total', 0)
    .gte('date', fyStart)
    .lte('date', today)
    .not('type', 'eq', 'TRANSFER')

  const { data: expenses } = await supabase
    .from('xero_transactions')
    .select('total')
    .lt('total', 0)
    .gte('date', fyStart)
    .lte('date', today)
    .not('type', 'eq', 'TRANSFER')

  // Get latest bank balance (approximation from recent transactions)
  const { data: bankAccounts } = await supabase.rpc('exec_sql', {
    sql: `SELECT COALESCE(SUM(total), 0) as balance FROM xero_transactions WHERE date >= '${fyStart}'`
  })

  const totalRevenue = (revenue || []).reduce((s, t) => s + t.total, 0)
  const totalExpenses = Math.abs((expenses || []).reduce((s, t) => s + t.total, 0))
  const cashOnHand = bankAccounts?.[0]?.balance ? Math.abs(Number(bankAccounts[0].balance)) : 89000 // fallback

  return {
    totalRevenue: Math.round(totalRevenue),
    totalExpenses: Math.round(totalExpenses),
    cashOnHand: Math.round(cashOnHand),
  }
}

async function getReceivablesAge() {
  const { data } = await supabase
    .from('xero_invoices')
    .select('contact_name, total, amount_due, due_date, status')
    .eq('type', 'ACCREC')
    .in('status', ['AUTHORISED', 'SENT'])
    .gt('amount_due', 0)

  const now = new Date()
  const buckets = { current: 0, overdue_30: 0, overdue_60: 0, overdue_90: 0 }
  let total = 0

  for (const inv of data || []) {
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000)
    const amount = inv.amount_due || inv.total
    total += amount

    if (daysOverdue <= 0) buckets.current += amount
    else if (daysOverdue <= 30) buckets.overdue_30 += amount
    else if (daysOverdue <= 60) buckets.overdue_60 += amount
    else buckets.overdue_90 += amount
  }

  return {
    total: Math.round(total),
    count: (data || []).length,
    buckets: {
      current: Math.round(buckets.current),
      overdue_30: Math.round(buckets.overdue_30),
      overdue_60: Math.round(buckets.overdue_60),
      overdue_90: Math.round(buckets.overdue_90),
    },
    pct_overdue: total > 0 ? Math.round(((total - buckets.current) / total) * 100) : 0,
  }
}

async function getProjectHealth() {
  const { data } = await supabase
    .from('project_health')
    .select('project_code, health_score, updated_at')
    .order('health_score', { ascending: true })

  const { data: projects } = await supabase
    .from('projects')
    .select('code, name, tier')
    .in('tier', ['ecosystem', 'studio'])

  const projectMap = new Map((projects || []).map(p => [p.code, p]))

  const items = (data || [])
    .filter(h => projectMap.has(h.project_code))
    .map(h => {
      const proj = projectMap.get(h.project_code)!
      return {
        code: h.project_code,
        name: proj.name,
        tier: proj.tier,
        health: h.health_score,
        status: h.health_score >= 80 ? 'healthy' : h.health_score >= 50 ? 'attention' : 'critical',
      }
    })

  const avgHealth = items.length > 0
    ? Math.round(items.reduce((s, i) => s + i.health, 0) / items.length)
    : 0

  return {
    avg_health: avgHealth,
    total_projects: items.length,
    critical: items.filter(i => i.status === 'critical').length,
    attention: items.filter(i => i.status === 'attention').length,
    healthy: items.filter(i => i.status === 'healthy').length,
    projects: items,
  }
}

async function getContactsNeedingAttention() {
  const { data } = await supabase
    .from('contacts')
    .select('name, engagement_score, last_contact_date, project_codes')
    .not('engagement_score', 'is', null)
    .order('engagement_score', { ascending: true })
    .limit(10)

  const now = new Date()
  const stale = (data || []).filter(c => {
    if (!c.last_contact_date) return true
    const daysSince = (now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000
    return daysSince > 30
  })

  return {
    needing_attention: stale.length,
    lowest_engagement: (data || []).slice(0, 5).map(c => ({
      name: c.name,
      score: c.engagement_score,
      last_contact: c.last_contact_date,
      projects: c.project_codes,
    })),
  }
}

async function getPipelineSummary() {
  const { data: opportunities } = await supabase
    .from('opportunities_unified')
    .select('title, value, confidence, status, project_code')
    .in('status', ['identified', 'researching', 'applying', 'submitted', 'shortlisted'])
    .not('value', 'is', null)
    .gt('value', 0)

  const items = opportunities || []
  const totalValue = items.reduce((s, o) => s + (o.value || 0), 0)
  const weightedValue = items.reduce((s, o) => s + (o.value || 0) * ((o.confidence || 50) / 100), 0)

  return {
    count: items.length,
    total_value: Math.round(totalValue),
    weighted_value: Math.round(weightedValue),
    by_status: items.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
  }
}

async function getReceiptGaps(fyStart: string) {
  const { data: pending } = await supabase
    .from('receipt_matches')
    .select('vendor_name, amount, project_code, status')
    .in('status', ['pending', 'email_suggested'])

  const { data: rdBills } = await supabase
    .from('xero_invoices')
    .select('has_attachments, project_code, total')
    .eq('type', 'ACCPAY')
    .gte('date', fyStart)
    .in('project_code', ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'])

  const rdBillsList = rdBills || []
  const withReceipts = rdBillsList.filter(b => b.has_attachments).length
  const rdMissing = rdBillsList.length - withReceipts
  const rdMissingValue = rdBillsList.filter(b => !b.has_attachments).reduce((s, b) => s + b.total, 0)

  return {
    pending_count: (pending || []).length,
    pending_value: Math.round((pending || []).reduce((s, r) => s + (r.amount || 0), 0)),
    rd_receipts_missing: rdMissing,
    rd_refund_at_risk: Math.round(rdMissingValue * 0.435),
    rd_coverage_pct: rdBillsList.length > 0 ? Math.round((withReceipts / rdBillsList.length) * 100) : 100,
  }
}

async function getRdPosition(fyStart: string, today: string) {
  const { data } = await supabase
    .from('xero_transactions')
    .select('total, project_code')
    .lt('total', 0)
    .gte('date', fyStart)
    .lte('date', today)
    .in('project_code', ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'])

  const totalSpend = (data || []).reduce((s, t) => s + Math.abs(t.total), 0)
  const byProject = (data || []).reduce((acc, t) => {
    acc[t.project_code!] = (acc[t.project_code!] || 0) + Math.abs(t.total)
    return acc
  }, {} as Record<string, number>)

  return {
    eligible_spend: Math.round(totalSpend),
    potential_refund: Math.round(totalSpend * 0.435),
    by_project: Object.entries(byProject).map(([code, spend]) => ({
      code,
      spend: Math.round(spend as number),
      refund: Math.round((spend as number) * 0.435),
    })),
    registration_deadline: '2026-04-30',
    days_until_deadline: Math.ceil((new Date('2026-04-30').getTime() - new Date().getTime()) / 86400000),
  }
}

async function getRecentActivity(since: string) {
  const [emailCount, txCount, meetingCount] = await Promise.all([
    supabase.from('communications').select('*', { count: 'exact', head: true }).gte('date', since).then(r => r.count || 0),
    supabase.from('xero_transactions').select('*', { count: 'exact', head: true }).gte('date', since).then(r => r.count || 0),
    supabase.from('calendar_events').select('*', { count: 'exact', head: true }).gte('start_time', since).then(r => r.count || 0),
  ])

  return {
    last_30_days: {
      emails: emailCount,
      transactions: txCount,
      meetings: meetingCount,
    },
  }
}
