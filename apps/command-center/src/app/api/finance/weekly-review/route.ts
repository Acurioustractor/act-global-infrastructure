import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Weekly Financial Review Aggregator
 *
 * Composes data from multiple sources into a single guided review payload.
 * Sections: cash position, weekly income/expenses, overdue invoices with aging,
 * receipt gap, top projects, grant deadlines, R&D spend, data quality.
 *
 * Query params:
 *   from  - start date (YYYY-MM-DD), default 7 days ago
 *   to    - end date (YYYY-MM-DD), default today
 *   account - bank account filter (e.g. "NAB Visa ACT #8815")
 */

interface Filters {
  from: string
  to: string
  account: string | null
}

function defaultFrom(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  return d.toISOString().split('T')[0]
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function parseFilters(req: NextRequest): Filters {
  const url = new URL(req.url)
  return {
    from: url.searchParams.get('from') || defaultFrom(),
    to: url.searchParams.get('to') || todayStr(),
    account: url.searchParams.get('account') || null,
  }
}

async function getCashPosition(_filters: Filters) {
  const { data } = await supabase
    .from('financial_snapshots')
    .select('month, closing_balance, income, expenses')
    .order('month', { ascending: false })
    .limit(2)

  if (!data?.length) return { balance: 0, change: 0, runway: 0, burnRate: 0 }

  const latest = data[0]
  const prior = data[1]
  const balance = latest.closing_balance || 0
  const change = prior ? balance - (prior.closing_balance || 0) : 0

  // Get 6-month average burn for runway
  const { data: hist } = await supabase
    .from('financial_snapshots')
    .select('income, expenses')
    .order('month', { ascending: false })
    .limit(6)

  let totalBurn = 0
  for (const m of hist || []) {
    totalBurn += Math.max(0, (m.expenses || 0) - (m.income || 0))
  }
  const burnRate = (hist?.length || 1) > 0 ? totalBurn / (hist?.length || 1) : 0
  const runway = burnRate > 0 ? balance / burnRate : 0

  return {
    balance: Math.round(balance),
    change: Math.round(change),
    burnRate: Math.round(burnRate),
    runway: Math.round(runway * 10) / 10,
  }
}

async function getWeeklyIncomeExpenses(filters: Filters) {
  let query = supabase
    .from('xero_transactions')
    .select('total, type, contact_name, project_code, date')
    .gte('date', filters.from)
    .lte('date', filters.to)
  if (filters.account) query = query.eq('bank_account', filters.account)
  const { data: txns } = await query

  let income = 0, expenses = 0, txnCount = 0
  const topIncome: Array<{ name: string; amount: number }> = []
  const topExpenses: Array<{ name: string; amount: number }> = []
  const incomeByContact: Record<string, number> = {}
  const expenseByContact: Record<string, number> = {}

  for (const tx of txns || []) {
    const amt = Math.abs(Number(tx.total) || 0)
    const contact = tx.contact_name || 'Unknown'
    if (tx.type === 'RECEIVE') {
      income += amt
      txnCount++
      incomeByContact[contact] = (incomeByContact[contact] || 0) + amt
    } else if (tx.type === 'SPEND') {
      expenses += amt
      txnCount++
      expenseByContact[contact] = (expenseByContact[contact] || 0) + amt
    }
  }

  const sortedIncome = Object.entries(incomeByContact).sort(([, a], [, b]) => b - a).slice(0, 5)
  const sortedExpenses = Object.entries(expenseByContact).sort(([, a], [, b]) => b - a).slice(0, 5)

  return {
    income: Math.round(income),
    expenses: Math.round(expenses),
    net: Math.round(income - expenses),
    topIncome: sortedIncome.map(([name, amount]) => ({ name, amount: Math.round(amount) })),
    topExpenses: sortedExpenses.map(([name, amount]) => ({ name, amount: Math.round(amount) })),
    transactionCount: txnCount,
  }
}

async function getOverdueInvoicesWithAging(_filters: Filters) {
  const today = todayStr()
  const now = new Date()
  const { data: invoices } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, amount_due, total, due_date, status')
    .in('status', ['AUTHORISED', 'SENT'])
    .eq('type', 'ACCREC')
    .gt('amount_due', 0)

  const buckets = { current: 0, days30: 0, days60: 0, days90: 0, days120plus: 0 }
  const bucketCounts = { current: 0, days30: 0, days60: 0, days90: 0, days120plus: 0 }
  const overdueList: Array<{
    invoice_number: string
    contact_name: string
    amount_due: number
    due_date: string
    days_overdue: number
  }> = []

  for (const inv of invoices || []) {
    const amt = Number(inv.amount_due) || 0
    if (!inv.due_date || inv.due_date >= today) {
      buckets.current += amt
      bucketCounts.current++
    } else {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
      if (daysOverdue <= 30) { buckets.days30 += amt; bucketCounts.days30++ }
      else if (daysOverdue <= 60) { buckets.days60 += amt; bucketCounts.days60++ }
      else if (daysOverdue <= 90) { buckets.days90 += amt; bucketCounts.days90++ }
      else { buckets.days120plus += amt; bucketCounts.days120plus++ }

      overdueList.push({
        invoice_number: inv.invoice_number || '',
        contact_name: inv.contact_name || '',
        amount_due: amt,
        due_date: inv.due_date,
        days_overdue: daysOverdue,
      })
    }
  }

  overdueList.sort((a, b) => b.days_overdue - a.days_overdue)

  const totalDue = (invoices || []).reduce((s, i) => s + (Number(i.amount_due) || 0), 0)
  const totalOverdue = overdueList.reduce((s, i) => s + i.amount_due, 0)

  return {
    totalDue: Math.round(totalDue),
    totalOverdue: Math.round(totalOverdue),
    overdueCount: overdueList.length,
    totalCount: invoices?.length || 0,
    buckets: {
      current: Math.round(buckets.current),
      days30: Math.round(buckets.days30),
      days60: Math.round(buckets.days60),
      days90: Math.round(buckets.days90),
      days120plus: Math.round(buckets.days120plus),
      counts: bucketCounts,
    },
    invoices: overdueList.slice(0, 15),
  }
}

async function getReceiptGap(filters: Filters) {
  // Receipt gap uses the date range from filters (or 3-month default if range is short)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const receiptFrom = filters.from < threeMonthsAgo.toISOString().split('T')[0] ? filters.from : threeMonthsAgo.toISOString().split('T')[0]

  let totalQ = supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'SPEND')
    .gte('date', receiptFrom)
    .lte('date', filters.to)
  if (filters.account) totalQ = totalQ.eq('bank_account', filters.account)
  const { count: totalExpenses } = await totalQ

  let matchedQ = supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'SPEND')
    .eq('has_attachment', true)
    .gte('date', receiptFrom)
    .lte('date', filters.to)
  if (filters.account) matchedQ = matchedQ.eq('bank_account', filters.account)
  const { count: withReceipts } = await matchedQ

  const total = totalExpenses || 0
  const matched = withReceipts || 0
  const missing = total - matched
  const score = total > 0 ? Math.round((matched / total) * 100) : 100

  return { total, matched, missing, score }
}

async function getTopProjectsBySpend(filters: Filters) {
  let query = supabase
    .from('xero_transactions')
    .select('project_code, total')
    .eq('type', 'SPEND')
    .gte('date', filters.from)
    .lte('date', filters.to)
    .not('project_code', 'is', null)
  if (filters.account) query = query.eq('bank_account', filters.account)
  const { data: txns } = await query

  const byProject: Record<string, number> = {}
  for (const tx of txns || []) {
    const code = tx.project_code!
    byProject[code] = (byProject[code] || 0) + Math.abs(Number(tx.total) || 0)
  }

  // Get project names
  const codes = Object.keys(byProject)
  const { data: projects } = await supabase
    .from('projects')
    .select('code, name')
    .in('code', codes.length > 0 ? codes : ['__none__'])

  const nameMap = new Map((projects || []).map(p => [p.code, p.name]))

  return Object.entries(byProject)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([code, spend]) => ({
      code,
      name: nameMap.get(code) || code,
      spend: Math.round(spend),
    }))
}

async function getGrantDeadlines(_filters: Filters) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 14)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  const today = todayStr()

  const { data } = await supabase
    .from('grant_applications')
    .select('application_name, project_code, status, amount_requested, milestones')
    .in('status', ['draft', 'in_progress', 'submitted', 'under_review', 'successful'])

  const deadlines: Array<{
    name: string
    projectCode: string
    deadline: string
    daysRemaining: number
    amount: number
    status: string
  }> = []

  for (const g of data || []) {
    const milestones = g.milestones || []
    for (const m of milestones) {
      if (m.due && m.due <= cutoffStr && m.due >= today && !m.completed) {
        const daysRemaining = Math.ceil((new Date(m.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        deadlines.push({
          name: `${g.application_name}: ${m.name || 'Milestone'}`,
          projectCode: g.project_code || 'Unassigned',
          deadline: m.due,
          daysRemaining,
          amount: g.amount_requested || 0,
          status: g.status,
        })
      }
    }
  }

  // Also check grant_opportunities closing soon
  const { data: opps } = await supabase
    .from('grant_opportunities')
    .select('title, closes_at, amount_min, amount_max')
    .gte('closes_at', today)
    .lte('closes_at', cutoffStr)
    .order('closes_at')
    .limit(5)

  const oppDeadlines = (opps || []).map(o => ({
    name: o.title,
    projectCode: '',
    deadline: o.closes_at,
    daysRemaining: Math.ceil((new Date(o.closes_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    amount: o.amount_max || o.amount_min || 0,
    status: 'opportunity',
  }))

  return [...deadlines, ...oppDeadlines].sort((a, b) => a.daysRemaining - b.daysRemaining)
}

async function getRdSpend(filters: Filters) {
  const now = new Date()
  const fyStart = now.getMonth() >= 6
    ? `${now.getFullYear()}-07-01`
    : `${now.getFullYear() - 1}-07-01`

  // Get R&D eligible vendors
  const { data: rules } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name')
    .eq('rd_eligible', true)

  const rdVendors = new Set((rules || []).map(r => r.vendor_name))

  // Period R&D spend (uses date range filter)
  let weekQ = supabase
    .from('xero_transactions')
    .select('contact_name, total')
    .eq('type', 'SPEND')
    .gte('date', filters.from)
    .lte('date', filters.to)
  if (filters.account) weekQ = weekQ.eq('bank_account', filters.account)
  const { data: weekTxns } = await weekQ

  let weekRd = 0
  for (const tx of weekTxns || []) {
    if (rdVendors.has(tx.contact_name)) weekRd += Math.abs(Number(tx.total) || 0)
  }

  // YTD R&D spend
  let ytdQ = supabase
    .from('xero_transactions')
    .select('contact_name, total')
    .eq('type', 'SPEND')
    .gte('date', fyStart)
  if (filters.account) ytdQ = ytdQ.eq('bank_account', filters.account)
  const { data: ytdTxns } = await ytdQ

  let ytdRd = 0
  for (const tx of ytdTxns || []) {
    if (rdVendors.has(tx.contact_name)) ytdRd += Math.abs(Number(tx.total) || 0)
  }

  return {
    thisWeek: Math.round(weekRd),
    ytd: Math.round(ytdRd),
    offset43pct: Math.round(ytdRd * 0.435),
    fyStart,
  }
}

async function getDataQuality(filters: Filters) {
  // Untagged transactions — uses broader range (FY start) but respects account filter
  let untaggedQ = supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .is('project_code', null)
    .gte('date', '2024-07-01')
    .eq('type', 'SPEND')
  if (filters.account) untaggedQ = untaggedQ.eq('bank_account', filters.account)
  const { count: untaggedCount } = await untaggedQ

  let totalQ = supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .gte('date', '2024-07-01')
    .eq('type', 'SPEND')
  if (filters.account) totalQ = totalQ.eq('bank_account', filters.account)
  const { count: totalCount } = await totalQ

  const total = totalCount || 0
  const untagged = untaggedCount || 0
  const tagged = total - untagged
  const coverage = total > 0 ? Math.round((tagged / total) * 100) : 100

  return { untagged, total, tagged, coverage }
}

async function getStrategicRisks(filters: Filters) {
  // 1. Revenue concentration (HHI — Herfindahl-Hirschman Index)
  let incomeQ = supabase
    .from('xero_transactions')
    .select('contact_name, total')
    .eq('type', 'RECEIVE')
    .gte('date', new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0])
  if (filters.account) incomeQ = incomeQ.eq('bank_account', filters.account)
  const { data: incomeContacts } = await incomeQ

  const incomeBySource: Record<string, number> = {}
  let totalIncome = 0
  for (const tx of incomeContacts || []) {
    const amt = Math.abs(Number(tx.total) || 0)
    const contact = tx.contact_name || 'Unknown'
    incomeBySource[contact] = (incomeBySource[contact] || 0) + amt
    totalIncome += amt
  }

  // HHI: sum of squared market shares (0-10000 scale)
  let hhi = 0
  const topSources: Array<{ name: string; amount: number; pct: number }> = []
  for (const [name, amount] of Object.entries(incomeBySource).sort(([, a], [, b]) => b - a)) {
    const share = totalIncome > 0 ? (amount / totalIncome) * 100 : 0
    hhi += share * share
    if (topSources.length < 5) {
      topSources.push({ name, amount: Math.round(amount), pct: Math.round(share) })
    }
  }
  // Normalize to 0-100 where 100 = perfectly concentrated, 0 = perfectly diversified
  const concentrationIndex = Math.round(hhi / 100)

  // 2. Receivable recovery probability (aging decay)
  const now = new Date()
  const { data: arInvoices } = await supabase
    .from('xero_invoices')
    .select('amount_due, due_date')
    .in('status', ['AUTHORISED', 'SENT'])
    .eq('type', 'ACCREC')
    .gt('amount_due', 0)

  let expectedRecovery = 0
  let totalAR = 0
  for (const inv of arInvoices || []) {
    const amt = Number(inv.amount_due) || 0
    totalAR += amt
    if (!inv.due_date || inv.due_date >= todayStr()) {
      expectedRecovery += amt * 0.95 // Current: 95% probability
    } else {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
      // Decay: 90% at 30d, 70% at 60d, 50% at 90d, 30% at 120d+
      const prob = daysOverdue <= 30 ? 0.90 : daysOverdue <= 60 ? 0.70 : daysOverdue <= 90 ? 0.50 : 0.30
      expectedRecovery += amt * prob
    }
  }
  const recoveryRate = totalAR > 0 ? Math.round((expectedRecovery / totalAR) * 100) : 100

  // 3. Portfolio value score — top projects by total value (spend + pipeline)
  const { data: projectHealth } = await supabase
    .from('project_health')
    .select('project_code, overall_score')
    .order('overall_score', { ascending: false })
    .limit(10)

  // 4. R&D capture rate
  const { data: rdRules } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name')
    .eq('rd_eligible', true)

  const rdVendorSet = new Set((rdRules || []).map(r => r.vendor_name))
  const fyStart = now.getMonth() >= 6 ? `${now.getFullYear()}-07-01` : `${now.getFullYear() - 1}-07-01`

  let fyQ = supabase
    .from('xero_transactions')
    .select('contact_name, total')
    .eq('type', 'SPEND')
    .gte('date', fyStart)
  if (filters.account) fyQ = fyQ.eq('bank_account', filters.account)
  const { data: fyTxns } = await fyQ

  let totalSpend = 0, rdSpend = 0
  for (const tx of fyTxns || []) {
    const amt = Math.abs(Number(tx.total) || 0)
    totalSpend += amt
    if (rdVendorSet.has(tx.contact_name)) rdSpend += amt
  }
  const rdCaptureRate = totalSpend > 0 ? Math.round((rdSpend / totalSpend) * 100) : 0

  return {
    revenueConcentration: {
      hhi: Math.round(hhi),
      concentrationIndex,
      topSources,
      risk: concentrationIndex > 50 ? 'high' : concentrationIndex > 25 ? 'medium' : 'low',
    },
    receivableRecovery: {
      totalAR: Math.round(totalAR),
      expectedRecovery: Math.round(expectedRecovery),
      recoveryRate,
      risk: recoveryRate < 70 ? 'high' : recoveryRate < 85 ? 'medium' : 'low',
    },
    portfolioHealth: {
      topProjects: (projectHealth || []).map(p => ({
        code: p.project_code,
        score: p.overall_score,
      })),
      avgScore: (projectHealth || []).length > 0
        ? Math.round((projectHealth || []).reduce((s, p) => s + (p.overall_score || 0), 0) / (projectHealth || []).length)
        : 0,
    },
    rdCapture: {
      totalSpend: Math.round(totalSpend),
      rdSpend: Math.round(rdSpend),
      captureRate: rdCaptureRate,
      potentialOffset: Math.round(rdSpend * 0.435),
    },
  }
}

async function getIncomingForecast() {
  const today = todayStr()
  const now = new Date()

  // 1. Outstanding invoices — money owed to ACT
  const { data: arInvoices } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, amount_due, due_date, status')
    .in('status', ['AUTHORISED', 'SENT'])
    .eq('type', 'ACCREC')
    .gt('amount_due', 0)

  type ConfidenceLevel = 'high' | 'medium' | 'low'

  interface ForecastItem {
    source: 'invoice' | 'pipeline'
    name: string
    contact: string
    amount: number
    confidence: ConfidenceLevel
    confidencePct: number
    weighted: number
    projectCodes: string[]
    detail: string
  }

  const items: ForecastItem[] = []

  // Group invoices by contact for cleaner display
  const invoicesByContact: Record<string, { total: number; count: number; oldestDue: string; newestDue: string }> = {}
  for (const inv of arInvoices || []) {
    const amt = Number(inv.amount_due) || 0
    const contact = inv.contact_name || 'Unknown'
    if (!invoicesByContact[contact]) {
      invoicesByContact[contact] = { total: 0, count: 0, oldestDue: inv.due_date || today, newestDue: inv.due_date || today }
    }
    invoicesByContact[contact].total += amt
    invoicesByContact[contact].count++
    if (inv.due_date && inv.due_date < invoicesByContact[contact].oldestDue) {
      invoicesByContact[contact].oldestDue = inv.due_date
    }
    if (inv.due_date && inv.due_date > invoicesByContact[contact].newestDue) {
      invoicesByContact[contact].newestDue = inv.due_date
    }
  }

  for (const [contact, data] of Object.entries(invoicesByContact)) {
    const daysOverdue = data.oldestDue >= today ? 0
      : Math.floor((now.getTime() - new Date(data.oldestDue).getTime()) / (1000 * 60 * 60 * 24))

    // Confidence based on aging
    let confidence: ConfidenceLevel
    let confidencePct: number
    if (daysOverdue <= 0) { confidence = 'high'; confidencePct = 95 }
    else if (daysOverdue <= 30) { confidence = 'high'; confidencePct = 90 }
    else if (daysOverdue <= 60) { confidence = 'medium'; confidencePct = 70 }
    else if (daysOverdue <= 90) { confidence = 'medium'; confidencePct = 50 }
    else if (daysOverdue <= 180) { confidence = 'low'; confidencePct = 30 }
    else { confidence = 'low'; confidencePct = 15 }

    items.push({
      source: 'invoice',
      name: `${data.count} invoice${data.count > 1 ? 's' : ''}`,
      contact,
      amount: Math.round(data.total),
      confidence,
      confidencePct,
      weighted: Math.round(data.total * confidencePct / 100),
      projectCodes: [],
      detail: daysOverdue > 0 ? `${daysOverdue}d overdue` : 'current',
    })
  }

  // 2. Pipeline opportunities — pursuing, submitted, negotiating, approved
  const { data: pipeline } = await supabase
    .from('opportunities_unified')
    .select('title, contact_name, stage, probability, value_mid, project_codes, expected_close')
    .in('stage', ['pursuing', 'submitted', 'negotiating', 'approved'])
    .gt('value_mid', 0)
    .order('value_mid', { ascending: false })
    .limit(30)

  for (const opp of pipeline || []) {
    const prob = Number(opp.probability) || 10
    let confidence: ConfidenceLevel
    if (opp.stage === 'approved' || opp.stage === 'negotiating') confidence = 'high'
    else if (opp.stage === 'submitted') confidence = 'medium'
    else confidence = 'low'

    const amount = Number(opp.value_mid) || 0
    items.push({
      source: 'pipeline',
      name: opp.title,
      contact: opp.contact_name || '',
      amount: Math.round(amount),
      confidence,
      confidencePct: prob,
      weighted: Math.round(amount * prob / 100),
      projectCodes: opp.project_codes || [],
      detail: `${opp.stage}${opp.expected_close ? ` — close ${opp.expected_close}` : ''}`,
    })
  }

  // Sort by weighted value descending
  items.sort((a, b) => b.weighted - a.weighted)

  // Summary by confidence tier
  const tiers: Record<ConfidenceLevel, { total: number; weighted: number; count: number }> = {
    high: { total: 0, weighted: 0, count: 0 },
    medium: { total: 0, weighted: 0, count: 0 },
    low: { total: 0, weighted: 0, count: 0 },
  }
  for (const item of items) {
    tiers[item.confidence].total += item.amount
    tiers[item.confidence].weighted += item.weighted
    tiers[item.confidence].count++
  }

  return {
    items: items.slice(0, 20), // Top 20 by weighted value
    tiers,
    totalExpected: Math.round(items.reduce((s, i) => s + i.weighted, 0)),
    totalFaceValue: Math.round(items.reduce((s, i) => s + i.amount, 0)),
  }
}

export async function GET(request: NextRequest) {
  try {
    const filters = parseFilters(request)

    const [
      cashPosition,
      weeklyFlow,
      invoices,
      receiptGap,
      topProjects,
      grantDeadlines,
      rdSpend,
      dataQuality,
      strategicRisks,
      incomingForecast,
    ] = await Promise.all([
      getCashPosition(filters),
      getWeeklyIncomeExpenses(filters),
      getOverdueInvoicesWithAging(filters),
      getReceiptGap(filters),
      getTopProjectsBySpend(filters),
      getGrantDeadlines(filters),
      getRdSpend(filters),
      getDataQuality(filters),
      getStrategicRisks(filters),
      getIncomingForecast(),
    ])

    // Generate action items
    const actions: Array<{ type: string; priority: 'high' | 'medium' | 'low'; description: string }> = []

    if (invoices.overdueCount > 0) {
      const worst = invoices.invoices[0]
      actions.push({
        type: 'chase',
        priority: 'high',
        description: `Chase ${invoices.overdueCount} overdue invoices ($${invoices.totalOverdue.toLocaleString()})${worst ? ` — worst: ${worst.contact_name} (${worst.days_overdue}d)` : ''}`,
      })
    }

    if (receiptGap.missing > 5) {
      actions.push({
        type: 'receipts',
        priority: receiptGap.score < 50 ? 'high' : 'medium',
        description: `Capture ${receiptGap.missing} missing receipts (score: ${receiptGap.score}%)`,
      })
    }

    if (dataQuality.untagged > 10) {
      actions.push({
        type: 'tag',
        priority: dataQuality.coverage < 80 ? 'high' : 'medium',
        description: `Tag ${dataQuality.untagged} untagged transactions (coverage: ${dataQuality.coverage}%)`,
      })
    }

    if (grantDeadlines.length > 0) {
      const urgent = grantDeadlines.filter(g => g.daysRemaining <= 7)
      if (urgent.length > 0) {
        actions.push({
          type: 'grants',
          priority: 'high',
          description: `${urgent.length} grant deadline(s) within 7 days`,
        })
      }
    }

    if (cashPosition.runway > 0 && cashPosition.runway < 6) {
      actions.push({
        type: 'runway',
        priority: cashPosition.runway < 3 ? 'high' : 'medium',
        description: `Runway is ${cashPosition.runway} months — review burn rate`,
      })
    }

    return NextResponse.json({
      weekOf: filters.from,
      generatedAt: new Date().toISOString(),
      filters: {
        from: filters.from,
        to: filters.to,
        account: filters.account,
      },
      cashPosition,
      weeklyFlow,
      invoices,
      receiptGap,
      topProjects,
      grantDeadlines,
      rdSpend,
      dataQuality,
      strategicRisks,
      incomingForecast,
      actions: actions.sort((a, b) => {
        const p = { high: 0, medium: 1, low: 2 }
        return p[a.priority] - p[b.priority]
      }),
    })
  } catch (error) {
    console.error('Weekly review API error:', error)
    return NextResponse.json({ error: 'Failed to generate weekly review' }, { status: 500 })
  }
}
