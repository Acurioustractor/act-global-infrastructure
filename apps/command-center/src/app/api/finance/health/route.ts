import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function getQuarterInfo() {
  const now = new Date()
  const month = now.getMonth() // 0-indexed
  // Australian FY: Jul-Sep=Q1, Oct-Dec=Q2, Jan-Mar=Q3, Apr-Jun=Q4
  let q: number, fyYear: number
  if (month >= 6 && month <= 8) { q = 1; fyYear = now.getFullYear() + 1 }
  else if (month >= 9 && month <= 11) { q = 2; fyYear = now.getFullYear() + 1 }
  else if (month >= 0 && month <= 2) { q = 3; fyYear = now.getFullYear() }
  else { q = 4; fyYear = now.getFullYear() }

  // BAS due dates: 28th of month after quarter ends
  const quarterEndMonths = [9, 12, 3, 6] // Q1=Sep, Q2=Dec, Q3=Mar, Q4=Jun
  const endMonth = quarterEndMonths[q - 1]
  const dueYear = endMonth === 12 ? fyYear - 1 : (endMonth <= 6 ? fyYear : fyYear - 1)
  const dueDate = `${endMonth <= 3 ? dueYear : dueYear}-${String(endMonth + 1 > 12 ? 1 : endMonth + 1).padStart(2, '0')}-28`

  // Quarter date range
  const qStartMonths = [7, 10, 1, 4]
  const startMonth = qStartMonths[q - 1]
  const startYear = startMonth >= 7 ? fyYear - 1 : fyYear
  const start = `${startYear}-${String(startMonth).padStart(2, '0')}-01`

  return {
    label: `Q${q} FY${String(fyYear).slice(2)}`,
    quarter: q,
    fyYear,
    start,
    end: todayStr(),
    basDueDate: dueDate,
  }
}

type HealthStatus = 'green' | 'amber' | 'red'

// ── GET Handler ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const today = todayStr()
    const quarterInfo = getQuarterInfo()

    // Run all fetches in parallel
    const [
      systemHealth,
      compliance,
      spending,
      invoicing,
      actionQueue,
    ] = await Promise.all([
      fetchSystemHealth(),
      fetchCompliance(quarterInfo),
      fetchSpending(),
      fetchInvoicing(),
      fetchActionQueue(today),
    ])

    // Calculate overall health score
    const healthComponents = [
      systemHealth.overallStatus === 'green' ? 100 : systemHealth.overallStatus === 'amber' ? 60 : 20,
      compliance.overallStatus === 'green' ? 100 : compliance.overallStatus === 'amber' ? 60 : 20,
      spending.taggingPct,
      invoicing.collectionRate,
    ]
    const healthScore = Math.round(healthComponents.reduce((a, b) => a + b, 0) / healthComponents.length)

    return NextResponse.json({
      healthScore,
      generatedAt: new Date().toISOString(),
      systemHealth,
      compliance,
      spending,
      invoicing,
      actionQueue,
    })
  } catch (error) {
    console.error('Finance health API error:', error)
    return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 })
  }
}

// ── 1. System Health ───────────────────────────────────────────────────

async function fetchSystemHealth() {
  const [syncRes, dextRes, pipelineRes, tagRes] = await Promise.all([
    // Xero + Gmail sync freshness
    supabase
      .from('sync_status')
      .select('integration_name, status, last_success_at, last_attempt_at, record_count, last_error')
      .in('integration_name', ['xero_bank_transactions', 'xero_invoices', 'gmail', 'xero_contacts']),
    // Dext forwarding
    supabase
      .from('dext_forwarded_emails')
      .select('forwarded_at')
      .order('forwarded_at', { ascending: false })
      .limit(1),
    // Receipt pipeline by stage
    supabase
      .from('receipt_pipeline_status')
      .select('stage'),
    // Transaction tagging
    Promise.all([
      supabase.from('xero_transactions').select('*', { count: 'exact', head: true }),
      supabase.from('xero_transactions').select('*', { count: 'exact', head: true }).not('project_code', 'is', null),
    ]),
  ])

  const syncs = (syncRes.data || []).map((s: any) => {
    const hoursSince = s.last_success_at
      ? (Date.now() - new Date(s.last_success_at).getTime()) / 3600000
      : 999
    let status: HealthStatus = 'green'
    if (hoursSince > 48) status = 'red'
    else if (hoursSince > 24) status = 'amber'

    return {
      name: s.integration_name,
      status,
      lastSuccess: s.last_success_at,
      recordCount: s.record_count,
      lastError: s.last_error,
      hoursSince: Math.round(hoursSince),
    }
  })

  const lastDextForward = dextRes.data?.[0]?.forwarded_at || null
  const dextHoursSince = lastDextForward
    ? (Date.now() - new Date(lastDextForward).getTime()) / 3600000
    : 999
  const dextStatus: HealthStatus = dextHoursSince > 48 ? 'red' : dextHoursSince > 12 ? 'amber' : 'green'

  // Pipeline stage counts
  const stageCounts: Record<string, number> = {}
  for (const row of pipelineRes.data || []) {
    stageCounts[row.stage] = (stageCounts[row.stage] || 0) + 1
  }

  const [totalRes, taggedRes] = tagRes
  const totalCount = totalRes.count || 0
  const taggedCount = taggedRes.count || 0
  const taggingPct = totalCount > 0 ? Math.round((taggedCount / totalCount) * 100) : 0

  const overallStatus: HealthStatus = syncs.some((s: any) => s.status === 'red') ? 'red'
    : syncs.some((s: any) => s.status === 'amber') || dextStatus === 'amber' ? 'amber'
    : 'green'

  return {
    overallStatus,
    syncs,
    dext: {
      status: dextStatus,
      lastForward: lastDextForward,
      hoursSince: Math.round(dextHoursSince),
    },
    pipeline: stageCounts,
    tagging: {
      total: totalCount,
      tagged: taggedCount,
      pct: taggingPct,
      remaining: totalCount - taggedCount,
    },
  }
}

// ── 2. Compliance ──────────────────────────────────────────────────────

async function fetchCompliance(quarterInfo: ReturnType<typeof getQuarterInfo>) {
  const [gstRes, receiptRes, rdRes] = await Promise.all([
    // GST from transactions in current quarter
    supabase
      .from('xero_transactions')
      .select('type, line_items')
      .gte('date', quarterInfo.start)
      .lte('date', quarterInfo.end),
    // Receipt compliance: SPEND with/without attachments
    Promise.all([
      supabase.from('xero_transactions').select('*', { count: 'exact', head: true })
        .in('type', ['SPEND', 'ACCPAY']),
      supabase.from('xero_transactions').select('*', { count: 'exact', head: true })
        .in('type', ['SPEND', 'ACCPAY']).eq('has_attachments', true),
    ]),
    // R&D eligible spend
    supabase
      .from('vendor_project_rules')
      .select('vendor_name, rd_eligible')
      .eq('rd_eligible', true),
  ])

  // Calculate GST
  let gstCollected = 0
  let gstPaid = 0
  for (const tx of gstRes.data || []) {
    const items = Array.isArray(tx.line_items) ? tx.line_items : []
    for (const li of items) {
      const taxAmount = Math.abs(li.TaxAmount || li.tax_amount || 0)
      if (tx.type === 'RECEIVE' || tx.type === 'ACCREC') gstCollected += taxAmount
      else if (tx.type === 'SPEND' || tx.type === 'ACCPAY') gstPaid += taxAmount
    }
  }

  const [totalSpendRes, withReceiptRes] = receiptRes
  const totalSpend = totalSpendRes.count || 0
  const withReceipt = withReceiptRes.count || 0
  const receiptPct = totalSpend > 0 ? Math.round((withReceipt / totalSpend) * 100) : 0

  const rdVendorCount = rdRes.data?.length || 0

  // R&D spend total from transactions matched to rd_eligible vendors
  const rdVendors = new Set((rdRes.data || []).map((v: any) => v.vendor_name))
  let rdSpend = 0
  // Quick estimation from current quarter transactions
  for (const tx of gstRes.data || []) {
    if (tx.type === 'SPEND') {
      // We don't have contact_name in this query — use a separate count
    }
  }

  // Fetch R&D spend separately
  const { data: rdTxData } = await supabase
    .from('xero_transactions')
    .select('contact_name, total')
    .in('type', ['SPEND', 'ACCPAY'])
    .gte('date', `${quarterInfo.fyYear - 1}-07-01`)

  for (const tx of rdTxData || []) {
    if (rdVendors.has(tx.contact_name)) {
      rdSpend += Math.abs(Number(tx.total) || 0)
    }
  }

  const gstNet = Math.round(gstCollected - gstPaid)
  const complianceStatus: HealthStatus = receiptPct >= 80 ? 'green' : receiptPct >= 60 ? 'amber' : 'red'

  return {
    overallStatus: complianceStatus,
    quarter: quarterInfo.label,
    basDueDate: quarterInfo.basDueDate,
    gst: {
      collected: Math.round(gstCollected),
      paid: Math.round(gstPaid),
      net: gstNet,
      position: gstNet >= 0 ? 'payable' as const : 'refundable' as const,
    },
    receipts: {
      totalSpend,
      withReceipt,
      pct: receiptPct,
      missing: totalSpend - withReceipt,
    },
    rdTax: {
      eligibleVendors: rdVendorCount,
      totalSpend: Math.round(rdSpend),
      projectedOffset: Math.round(rdSpend * 0.435),
      threshold: 20000,
      onTrack: rdSpend >= 20000,
    },
    entities: [
      { name: 'Sole Trader', abn: '21 591 780 066' },
      { name: 'A Kind Tractor LTD', abn: '73 669 029 341' },
    ],
  }
}

// ── 3. Spending Intelligence ───────────────────────────────────────────

async function fetchSpending() {
  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastMonth = new Date(now)
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`

  const [thisMonthRes, lastMonthRes, categoryRes, subRes, tagRes] = await Promise.all([
    supabase
      .from('xero_transactions')
      .select('total')
      .in('type', ['SPEND', 'ACCPAY'])
      .gte('date', thisMonthStart),
    supabase
      .from('xero_transactions')
      .select('total')
      .in('type', ['SPEND', 'ACCPAY'])
      .gte('date', lastMonthStart)
      .lt('date', thisMonthStart),
    // Top categories from vendor_project_rules
    supabase
      .from('xero_transactions')
      .select('contact_name, total, project_code')
      .in('type', ['SPEND', 'ACCPAY'])
      .gte('date', thisMonthStart),
    // Subscriptions
    supabase
      .from('subscriptions')
      .select('name, monthly_cost, category, status')
      .eq('status', 'active'),
    // Tagging stats
    Promise.all([
      supabase.from('xero_transactions').select('*', { count: 'exact', head: true }),
      supabase.from('xero_transactions').select('*', { count: 'exact', head: true }).not('project_code', 'is', null),
    ]),
  ])

  const thisMonthTotal = (thisMonthRes.data || []).reduce(
    (s: number, t: any) => s + Math.abs(Number(t.total) || 0), 0
  )
  const lastMonthTotal = (lastMonthRes.data || []).reduce(
    (s: number, t: any) => s + Math.abs(Number(t.total) || 0), 0
  )
  const changePercent = lastMonthTotal > 0
    ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : 0

  // Group by project
  const projectSpend: Record<string, number> = {}
  for (const tx of categoryRes.data || []) {
    const code = tx.project_code || 'Untagged'
    projectSpend[code] = (projectSpend[code] || 0) + Math.abs(Number(tx.total) || 0)
  }
  const topProjects = Object.entries(projectSpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, amount]) => ({ code, amount: Math.round(amount) }))

  // Subscription totals
  const subs = subRes.data || []
  const monthlySubSpend = subs.reduce((s: number, sub: any) => s + (sub.monthly_cost || 0), 0)

  // Saving tips based on patterns
  const tips: string[] = []
  if (changePercent > 30) {
    tips.push(`Spending up ${changePercent}% this month vs last — review large transactions`)
  }
  if (subs.length > 20) {
    tips.push(`${subs.length} active subscriptions ($${Math.round(monthlySubSpend)}/mo) — review for consolidation`)
  }
  // Check for duplicate categories
  const catCounts: Record<string, number> = {}
  for (const sub of subs) {
    const cat = sub.category || 'Other'
    catCounts[cat] = (catCounts[cat] || 0) + 1
  }
  for (const [cat, count] of Object.entries(catCounts)) {
    if (count >= 3 && cat !== 'Other') {
      tips.push(`${count} subscriptions in "${cat}" — consolidate?`)
    }
  }

  const [totalRes, taggedRes] = tagRes
  const taggingPct = (totalRes.count || 0) > 0
    ? Math.round(((taggedRes.count || 0) / (totalRes.count || 1)) * 100) : 0

  return {
    thisMonth: Math.round(thisMonthTotal),
    lastMonth: Math.round(lastMonthTotal),
    changePercent,
    direction: changePercent > 0 ? 'up' as const : changePercent < 0 ? 'down' as const : 'flat' as const,
    topProjects,
    subscriptions: {
      count: subs.length,
      monthlySpend: Math.round(monthlySubSpend),
    },
    tips,
    taggingPct,
  }
}

// ── 4. Project Invoicing ───────────────────────────────────────────────

async function fetchInvoicing() {
  const [invoiceRes, paidRes] = await Promise.all([
    supabase
      .from('xero_invoices')
      .select('contact_name, total, amount_due, due_date, status, type, date')
      .eq('type', 'ACCREC')
      .in('status', ['AUTHORISED', 'SENT']),
    supabase
      .from('xero_invoices')
      .select('total, date, status')
      .eq('type', 'ACCREC')
      .eq('status', 'PAID')
      .gte('date', daysAgo(180)),
  ])

  const today = todayStr()
  const outstanding = invoiceRes.data || []
  const totalOutstanding = outstanding.reduce((s: number, i: any) => s + Math.abs(Number(i.amount_due) || 0), 0)
  const overdueInvoices = outstanding.filter((i: any) => i.due_date && i.due_date < today)
  const totalOverdue = overdueInvoices.reduce((s: number, i: any) => s + Math.abs(Number(i.amount_due) || 0), 0)

  // Top outstanding by project (contact as proxy)
  const byContact: Record<string, number> = {}
  for (const inv of outstanding) {
    const name = inv.contact_name || 'Unknown'
    byContact[name] = (byContact[name] || 0) + Math.abs(Number(inv.amount_due) || 0)
  }
  const topOutstanding = Object.entries(byContact)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }))

  // Collection rate
  const paidTotal = (paidRes.data || []).reduce((s: number, i: any) => s + Math.abs(Number(i.total) || 0), 0)
  const collectionRate = (paidTotal + totalOutstanding) > 0
    ? Math.round((paidTotal / (paidTotal + totalOutstanding)) * 100)
    : 100

  return {
    totalOutstanding: Math.round(totalOutstanding),
    totalOverdue: Math.round(totalOverdue),
    overdueCount: overdueInvoices.length,
    totalCount: outstanding.length,
    topOutstanding,
    collectionRate,
  }
}

// ── 5. Action Queue ────────────────────────────────────────────────────

async function fetchActionQueue(today: string) {
  const sevenDaysAgo = daysAgo(7)
  const fourteenDaysAgo = daysAgo(14)

  const [untaggedRes, missingReceiptRes, overdueInvRes, grantRes, stuckRes] = await Promise.all([
    // Untagged transactions (>7 days old, excl transfers)
    supabase
      .from('xero_transactions')
      .select('id, contact_name, total, date', { count: 'exact' })
      .is('project_code', null)
      .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
      .lt('date', sevenDaysAgo)
      .order('total', { ascending: true })
      .limit(5),
    // Missing receipts (SPEND, no attachments, >7 days)
    supabase
      .from('xero_transactions')
      .select('id, contact_name, total, date', { count: 'exact' })
      .in('type', ['SPEND', 'ACCPAY'])
      .or('has_attachments.is.null,has_attachments.eq.false')
      .lt('date', sevenDaysAgo)
      .order('total', { ascending: true })
      .limit(5),
    // Overdue invoices
    supabase
      .from('xero_invoices')
      .select('invoice_number, contact_name, amount_due, due_date', { count: 'exact' })
      .eq('type', 'ACCREC')
      .in('status', ['AUTHORISED', 'SENT'])
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(5),
    // Grant deadlines passed
    supabase
      .from('grant_applications')
      .select('id, funder_name, deadline, status', { count: 'exact' })
      .lt('deadline', today)
      .not('status', 'in', '("submitted","awarded","rejected","expired","lost")')
      .order('deadline', { ascending: true })
      .limit(5),
    // Stuck pipeline items (>14 days in same stage)
    supabase
      .from('receipt_pipeline_status')
      .select('vendor_name, stage, transaction_date, amount', { count: 'exact' })
      .not('stage', 'eq', 'reconciled')
      .lt('transaction_date', fourteenDaysAgo)
      .order('transaction_date', { ascending: true })
      .limit(5),
  ])

  type ActionItem = {
    type: string
    priority: 'critical' | 'high' | 'medium'
    title: string
    count: number
    actionUrl: string
    actionLabel: string
    estimatedMinutes: number
  }

  const actions: ActionItem[] = []

  if ((untaggedRes.count || 0) > 0) {
    actions.push({
      type: 'untagged',
      priority: (untaggedRes.count || 0) > 50 ? 'critical' : 'high',
      title: `${untaggedRes.count} untagged transactions (>7 days)`,
      count: untaggedRes.count || 0,
      actionUrl: '/finance/tagger',
      actionLabel: 'Open Tagger',
      estimatedMinutes: Math.ceil((untaggedRes.count || 0) / 10),
    })
  }

  if ((missingReceiptRes.count || 0) > 0) {
    actions.push({
      type: 'missing_receipt',
      priority: (missingReceiptRes.count || 0) > 100 ? 'critical' : 'high',
      title: `${missingReceiptRes.count} spend transactions missing receipts`,
      count: missingReceiptRes.count || 0,
      actionUrl: '/finance/receipt-pipeline',
      actionLabel: 'View Pipeline',
      estimatedMinutes: Math.ceil((missingReceiptRes.count || 0) / 5),
    })
  }

  if ((overdueInvRes.count || 0) > 0) {
    actions.push({
      type: 'overdue_invoice',
      priority: 'critical',
      title: `${overdueInvRes.count} overdue invoices`,
      count: overdueInvRes.count || 0,
      actionUrl: '/finance/revenue',
      actionLabel: 'Chase Payments',
      estimatedMinutes: (overdueInvRes.count || 0) * 5,
    })
  }

  if ((grantRes.count || 0) > 0) {
    actions.push({
      type: 'grant_deadline',
      priority: 'high',
      title: `${grantRes.count} grant deadlines passed`,
      count: grantRes.count || 0,
      actionUrl: '/grants',
      actionLabel: 'Review Grants',
      estimatedMinutes: (grantRes.count || 0) * 10,
    })
  }

  if ((stuckRes.count || 0) > 0) {
    actions.push({
      type: 'stuck_pipeline',
      priority: 'medium',
      title: `${stuckRes.count} receipt pipeline items stuck >14 days`,
      count: stuckRes.count || 0,
      actionUrl: '/finance/receipt-pipeline',
      actionLabel: 'Unstick Pipeline',
      estimatedMinutes: (stuckRes.count || 0) * 3,
    })
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2 }
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  const totalMinutes = actions.reduce((s, a) => s + a.estimatedMinutes, 0)

  return {
    items: actions,
    totalItems: actions.reduce((s, a) => s + a.count, 0),
    totalMinutes,
  }
}
