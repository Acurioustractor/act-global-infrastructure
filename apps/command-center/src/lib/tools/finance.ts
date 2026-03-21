import { supabase } from '../supabase'
import { getBrisbaneDate, getBrisbaneNow, getBrisbaneDateOffset } from '../timezone'
import {
  fetchFinancialSummary,
  fetchCashflow,
  fetchRevenueScoreboard,
  fetchProjectFinancials,
  fetchReceiptPipeline,
} from '@act/intel'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_financial_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetFinancialSummary(input: {
  days?: number
}): Promise<string> {
  const result = await fetchFinancialSummary(supabase, { days: input.days })
  return JSON.stringify({
    period_days: result.period_days,
    pipeline: result.pipeline,
    api_costs: result.api_costs,
    subscriptions: result.subscriptions,
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_xero_transactions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetXeroTransactions(input: {
  type?: string
  vendor?: string
  project_code?: string
  start_date?: string
  end_date?: string
  min_amount?: number
  limit?: number
}): Promise<string> {
  const limit = input.limit || 25
  const endDate = input.end_date || getBrisbaneDate()
  const startDate = input.start_date || getBrisbaneDateOffset(-90)

  try {
    let query = supabase
      .from('xero_transactions')
      .select('date, type, contact_name, bank_account, project_code, total, line_items, has_attachments')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(limit)

    if (input.type) {
      query = query.eq('type', input.type.toUpperCase())
    }
    if (input.vendor) {
      query = query.ilike('contact_name', `%${input.vendor}%`)
    }
    if (input.project_code) {
      query = query.eq('project_code', input.project_code.toUpperCase())
    }
    if (input.min_amount) {
      query = query.gte('total', input.min_amount)
    }

    const { data, error } = await query

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const transactions = (data || []).map((t) => {
      // Extract line items summary from JSONB
      let lineItemsSummary = ''
      if (t.line_items && Array.isArray(t.line_items)) {
        const items = t.line_items as Array<{ Description?: string; description?: string }>
        const first = items[0]
        const desc = first?.Description || first?.description || ''
        lineItemsSummary = desc
        if (items.length > 1) lineItemsSummary += ` (+${items.length - 1} more)`
      }

      return {
        date: t.date,
        type: t.type,
        contact_name: t.contact_name,
        bank_account: t.bank_account,
        project_code: t.project_code,
        total: parseFloat(String(t.total)) || 0,
        has_attachments: t.has_attachments || false,
        line_items_summary: lineItemsSummary,
      }
    })

    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.total), 0)

    return JSON.stringify({
      filters: {
        type: input.type || 'all',
        vendor: input.vendor || null,
        project_code: input.project_code || null,
        date_range: { start: startDate, end: endDate },
        min_amount: input.min_amount || null,
      },
      count: transactions.length,
      total_amount: Math.round(totalAmount * 100) / 100,
      transactions,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: find_receipt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeFindReceipt(input: {
  vendor?: string
  amount?: number
  date?: string
  project_code?: string
}): Promise<string> {
  try {
    // Query all sources directly (same logic as receipt-finder API route)
    const dateRange = input.date ? (() => {
      const d = new Date(input.date!)
      const from = new Date(d); from.setDate(from.getDate() - 7)
      const to = new Date(d); to.setDate(to.getDate() + 7)
      return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }
    })() : null

    const results: string[] = []
    let totalMatches = 0

    // Search Gmail
    if (input.vendor) {
      let gmailQuery = supabase
        .from('communications')
        .select('subject, from_address, date, snippet, project_code')
        .or(`subject.ilike.%${input.vendor}%,from_address.ilike.%${input.vendor}%,snippet.ilike.%${input.vendor}%`)
        .order('date', { ascending: false })
        .limit(5)
      if (dateRange) gmailQuery = gmailQuery.gte('date', dateRange.from).lte('date', dateRange.to)
      const { data: emails } = await gmailQuery
      if (emails?.length) {
        results.push(`**Gmail (${emails.length}):**`)
        for (const e of emails) {
          const isReceipt = /receipt|invoice|order|confirm|payment|tax.invoice/i.test(e.subject || '')
          results.push(`  [${isReceipt ? 'high' : 'low'}] "${e.subject}" from ${e.from_address} (${e.date})`)
        }
        totalMatches += emails.length
      }
    }

    // Search calendar
    if (dateRange) {
      const { data: events } = await supabase
        .from('calendar_events')
        .select('title, start_time, location')
        .gte('start_time', dateRange.from)
        .lte('start_time', dateRange.to)
        .limit(10)
      const travelKeywords = /flight|hotel|travel|airport|qantas|virgin|uber|palm island|darwin|cairns|brisbane|sydney/i
      const relevant = (events || []).filter(e => {
        const text = `${e.title} ${e.location || ''}`
        return (input.vendor && text.toLowerCase().includes(input.vendor.toLowerCase())) || travelKeywords.test(text)
      })
      if (relevant.length) {
        results.push(`**Calendar (${relevant.length}):**`)
        for (const e of relevant.slice(0, 5)) {
          results.push(`  "${e.title}"${e.location ? ` at ${e.location}` : ''} on ${new Date(e.start_time).toLocaleDateString('en-AU')}`)
        }
        totalMatches += relevant.length
      }
    }

    // Search Xero bills (ACCPAY = receipts/invoices FROM suppliers)
    {
      let billQuery = supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, total, date, status, has_attachments')
        .eq('type', 'ACCPAY')
        .order('date', { ascending: false })
        .limit(10)
      if (input.vendor) billQuery = billQuery.ilike('contact_name', `%${input.vendor}%`)
      if (input.amount) {
        const tol = Math.abs(input.amount) * 0.1
        billQuery = billQuery.gte('total', Math.abs(input.amount) - tol).lte('total', Math.abs(input.amount) + tol)
      }
      if (dateRange) billQuery = billQuery.gte('date', dateRange.from).lte('date', dateRange.to)
      const { data: bills } = await billQuery
      if (bills?.length) {
        results.push(`**Xero Bills (${bills.length}):**`)
        for (const b of bills) {
          results.push(`  [${b.has_attachments ? 'has attachment' : 'NO attachment'}] ${b.invoice_number}: $${b.total.toFixed(2)} from ${b.contact_name} [${b.status}]`)
        }
        totalMatches += bills.length
      }
    }

    // Search bank transactions
    {
      let txQuery = supabase
        .from('xero_transactions')
        .select('contact_name, total, date, project_code, type')
        .order('date', { ascending: false })
        .limit(10)
      if (input.vendor) txQuery = txQuery.ilike('contact_name', `%${input.vendor}%`)
      if (input.amount) {
        const tol = Math.abs(input.amount) * 0.1
        const abs = Math.abs(input.amount)
        txQuery = txQuery.gte('total', -(abs + tol)).lte('total', abs + tol)
      }
      if (dateRange) txQuery = txQuery.gte('date', dateRange.from).lte('date', dateRange.to)
      if (input.project_code) txQuery = txQuery.eq('project_code', input.project_code)
      const { data: txns } = await txQuery
      if (txns?.length) {
        results.push(`**Bank Transactions (${txns.length}):**`)
        for (const t of txns) {
          results.push(`  ${t.type} $${Math.abs(t.total).toFixed(2)} — ${t.contact_name || 'Unknown'} on ${t.date} [${t.project_code || 'untagged'}]`)
        }
        totalMatches += txns.length
      }
    }

    // Search receipt pipeline
    {
      let rmQuery = supabase
        .from('receipt_matches')
        .select('vendor_name, amount, transaction_date, status, project_code')
        .order('transaction_date', { ascending: false })
        .limit(5)
      if (input.vendor) rmQuery = rmQuery.ilike('vendor_name', `%${input.vendor}%`)
      if (input.amount) {
        const tol = Math.abs(input.amount) * 0.1
        rmQuery = rmQuery.gte('amount', Math.abs(input.amount) - tol).lte('amount', Math.abs(input.amount) + tol)
      }
      const { data: rms } = await rmQuery
      if (rms?.length) {
        results.push(`**Receipt Pipeline (${rms.length}):**`)
        for (const r of rms) {
          results.push(`  $${r.amount?.toFixed(2)} ${r.vendor_name} [${r.status}] ${r.project_code || ''}`)
        }
        totalMatches += rms.length
      }
    }

    if (totalMatches === 0) {
      return `No matches found for ${[input.vendor, input.amount && `$${input.amount}`, input.date].filter(Boolean).join(', ')}. Try broadening the search (remove date or amount).`
    }

    return `Found ${totalMatches} matches:\n\n${results.join('\n')}`
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_cashflow_forecast
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetCashflowForecast(input: {
  months_ahead?: number
}): Promise<string> {
  try {
    const result = await fetchCashflow(supabase, { monthsAhead: input.months_ahead })
    return JSON.stringify({
      current_month: result.current_month,
      outstanding: result.outstanding,
      metrics: result.metrics,
      projections: result.projections,
      scenarios: result.scenarios,
      history_months: result.history.length,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_pending_receipts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetPendingReceipts(input: {
  limit?: number
}): Promise<string> {
  const limit = input.limit || 10

  try {
    const { data, error } = await supabase
      .from('receipt_matches')
      .select('id, vendor_name, amount, transaction_date, category, status, match_confidence, created_at')
      .in('status', ['pending', 'email_suggested'])
      .order('transaction_date', { ascending: false })
      .limit(limit)

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const now = new Date()
    const receipts = (data || []).map((r) => ({
      id: r.id,
      vendor: r.vendor_name || 'Unknown',
      amount: `$${Number(r.amount).toFixed(2)}`,
      date: r.transaction_date,
      category: r.category,
      status: r.status,
      match_confidence: r.match_confidence,
      days_pending: Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 86400000),
    }))

    const totalAmount = (data || []).reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0)

    return JSON.stringify({
      count: receipts.length,
      total_pending: `$${totalAmount.toFixed(2)}`,
      receipts,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_quarterly_review
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getAustralianQuarter(date: Date): { quarter: number; fyStart: number; fyEnd: number } {
  const month = date.getMonth() // 0-based
  // Australian FY: Jul-Jun. Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
  if (month >= 6 && month <= 8) return { quarter: 1, fyStart: date.getFullYear(), fyEnd: date.getFullYear() + 1 }
  if (month >= 9 && month <= 11) return { quarter: 2, fyStart: date.getFullYear(), fyEnd: date.getFullYear() + 1 }
  if (month >= 0 && month <= 2) return { quarter: 3, fyStart: date.getFullYear() - 1, fyEnd: date.getFullYear() }
  return { quarter: 4, fyStart: date.getFullYear() - 1, fyEnd: date.getFullYear() }
}

export function getQuarterDates(quarterStr?: string): { label: string; start: string; end: string; fyLabel: string; prevStart: string; prevEnd: string } {
  const now = new Date()
  let year: number
  let q: number

  if (quarterStr) {
    const match = quarterStr.match(/^(\d{4})-Q([1-4])$/i)
    if (match) {
      year = parseInt(match[1])
      q = parseInt(match[2])
    } else {
      const aq = getAustralianQuarter(now)
      year = aq.fyStart
      q = aq.quarter
    }
  } else {
    const aq = getAustralianQuarter(now)
    year = aq.fyStart
    q = aq.quarter
  }

  // Map quarter to date ranges (Australian FY)
  const ranges: Record<number, { start: string; end: string }> = {
    1: { start: `${year}-07-01`, end: `${year}-09-30` },
    2: { start: `${year}-10-01`, end: `${year}-12-31` },
    3: { start: `${year + 1}-01-01`, end: `${year + 1}-03-31` },
    4: { start: `${year + 1}-04-01`, end: `${year + 1}-06-30` },
  }

  const prevQ = q === 1 ? 4 : q - 1
  const prevYear = q === 1 ? year - 1 : year
  const prevRanges: Record<number, { start: string; end: string }> = {
    1: { start: `${prevYear}-07-01`, end: `${prevYear}-09-30` },
    2: { start: `${prevYear}-10-01`, end: `${prevYear}-12-31` },
    3: { start: `${prevYear + 1}-01-01`, end: `${prevYear + 1}-03-31` },
    4: { start: `${prevYear + 1}-04-01`, end: `${prevYear + 1}-06-30` },
  }

  return {
    label: `Q${q} FY${year}/${year + 1}`,
    start: ranges[q].start,
    end: ranges[q].end,
    fyLabel: `FY${year}/${year + 1}`,
    prevStart: prevRanges[prevQ].start,
    prevEnd: prevRanges[prevQ].end,
  }
}

export async function executeGetQuarterlyReview(input: { quarter?: string; detail_level?: string }): Promise<string> {
  const qDates = getQuarterDates(input.quarter)

  try {
    // Run all queries in parallel
    const [
      incomeInvoices,
      expenseInvoices,
      prevIncomeInvoices,
      prevExpenseInvoices,
      outstandingInvoices,
      pendingReceipts,
      resolvedReceipts,
      activeSubscriptions,
      subscriptionAlerts,
      upcomingRenewals,
      transactions6m,
    ] = await Promise.all([
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_paid, amount_due, project_code, status')
        .eq('type', 'ACCREC')
        .gte('date', qDates.start)
        .lte('date', qDates.end),
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_paid, amount_due, project_code, status')
        .eq('type', 'ACCPAY')
        .gte('date', qDates.start)
        .lte('date', qDates.end),
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCREC')
        .gte('date', qDates.prevStart)
        .lte('date', qDates.prevEnd),
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCPAY')
        .gte('date', qDates.prevStart)
        .lte('date', qDates.prevEnd),
      supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, amount_due, due_date, type, status')
        .gt('amount_due', 0)
        .in('status', ['AUTHORISED', 'SENT'])
        .order('due_date', { ascending: true }),
      supabase
        .from('receipt_matches')
        .select('id, vendor_name, amount, transaction_date, category, status, created_at')
        .in('status', ['pending', 'email_suggested']),
      supabase
        .from('receipt_matches')
        .select('id')
        .eq('status', 'resolved')
        .gte('transaction_date', qDates.start)
        .lte('transaction_date', qDates.end),
      supabase
        .from('subscriptions')
        .select('vendor, name, amount_aud, billing_cycle, category, status, renewal_date, value_rating')
        .eq('status', 'active')
        .order('amount_aud', { ascending: false }),
      supabase
        .from('v_subscription_alerts')
        .select('*')
        .limit(20),
      supabase
        .from('v_upcoming_renewals')
        .select('*')
        .limit(20),
      supabase
        .from('xero_transactions')
        .select('date, type, total, contact_name')
        .gte('date', getBrisbaneDateOffset(-180))
        .order('date', { ascending: true }),
    ])

    // ── Income & Expenses ──────────────────────────────────
    const incomeData = incomeInvoices.data || []
    const expenseData = expenseInvoices.data || []

    const totalIncome = incomeData.reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const totalExpenses = expenseData.reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const netProfit = totalIncome - totalExpenses

    // Income by source (top 15)
    const incomeBySource: Record<string, number> = {}
    for (const inv of incomeData) {
      const key = inv.contact_name || 'Unknown'
      incomeBySource[key] = (incomeBySource[key] || 0) + (parseFloat(String(inv.total)) || 0)
    }
    const topIncome = Object.entries(incomeBySource)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([contact, amount]) => ({ contact, amount: Math.round(amount * 100) / 100 }))

    // Expenses by vendor (top 15)
    const expensesByVendor: Record<string, number> = {}
    for (const inv of expenseData) {
      const key = inv.contact_name || 'Unknown'
      expensesByVendor[key] = (expensesByVendor[key] || 0) + (parseFloat(String(inv.total)) || 0)
    }
    const topExpenses = Object.entries(expensesByVendor)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([vendor, amount]) => ({ vendor, amount: Math.round(amount * 100) / 100 }))

    // Expenses by project
    const expensesByProject: Record<string, number> = {}
    for (const inv of expenseData) {
      const key = inv.project_code || 'Unallocated'
      expensesByProject[key] = (expensesByProject[key] || 0) + (parseFloat(String(inv.total)) || 0)
    }
    const topProjectExpenses = Object.entries(expensesByProject)
      .sort(([, a], [, b]) => b - a)
      .map(([project, amount]) => ({ project, amount: Math.round(amount * 100) / 100 }))

    // Previous quarter comparison
    const prevIncome = (prevIncomeInvoices.data || []).reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const prevExpenses = (prevExpenseInvoices.data || []).reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const incomeChangePct = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : null
    const expenseChangePct = prevExpenses > 0 ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 100) : null

    // ── BAS Summary ────────────────────────────────────────
    const g1TotalSales = totalIncome
    const g11NonCapitalPurchases = totalExpenses
    const label1aGstOnSales = Math.round((g1TotalSales / 11) * 100) / 100
    const label1bGstOnPurchases = Math.round((g11NonCapitalPurchases / 11) * 100) / 100
    const estimatedGstPayable = Math.round((label1aGstOnSales - label1bGstOnPurchases) * 100) / 100

    // ── Outstanding Invoices ───────────────────────────────
    const outstanding = outstandingInvoices.data || []
    const now = new Date()
    const totalOutstanding = outstanding.reduce((sum, i) => sum + (parseFloat(String(i.amount_due)) || 0), 0)

    const aging: Record<string, number> = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    const overdueItems: Array<{ invoice_number: string; contact: string; amount_due: number; days_overdue: number }> = []

    for (const inv of outstanding) {
      const dueDate = new Date(inv.due_date)
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / 86400000)
      const amountDue = parseFloat(String(inv.amount_due)) || 0

      if (daysOverdue <= 0) aging.current += amountDue
      else if (daysOverdue <= 30) aging['1-30'] += amountDue
      else if (daysOverdue <= 60) aging['31-60'] += amountDue
      else if (daysOverdue <= 90) aging['61-90'] += amountDue
      else aging['90+'] += amountDue

      if (daysOverdue > 0 && inv.type === 'ACCREC') {
        overdueItems.push({
          invoice_number: inv.invoice_number,
          contact: inv.contact_name,
          amount_due: amountDue,
          days_overdue: daysOverdue,
        })
      }
    }
    overdueItems.sort((a, b) => b.days_overdue - a.days_overdue)

    // ── Receipts ───────────────────────────────────────────
    const pending = pendingReceipts.data || []
    const pendingCount = pending.length
    const pendingTotal = pending.reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0)
    let oldestPendingDays = 0
    for (const r of pending) {
      const days = Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 86400000)
      if (days > oldestPendingDays) oldestPendingDays = days
    }
    const receiptsByCategory: Record<string, number> = {}
    for (const r of pending) {
      const cat = r.category || 'uncategorised'
      receiptsByCategory[cat] = (receiptsByCategory[cat] || 0) + 1
    }

    // ── Subscriptions ──────────────────────────────────────
    const subs = activeSubscriptions.data || []
    let monthlyTotal = 0
    let annualTotal = 0
    for (const sub of subs) {
      const amount = parseFloat(String(sub.amount_aud)) || 0
      if (sub.billing_cycle === 'monthly') {
        monthlyTotal += amount
        annualTotal += amount * 12
      } else if (sub.billing_cycle === 'yearly') {
        monthlyTotal += amount / 12
        annualTotal += amount
      } else if (sub.billing_cycle === 'quarterly') {
        monthlyTotal += amount / 3
        annualTotal += amount * 4
      }
    }

    const topSubCosts = subs.slice(0, 10).map((s) => ({
      vendor: s.vendor || s.name,
      monthly_amount: parseFloat(String(s.amount_aud)) || 0,
      category: s.category,
      billing_cycle: s.billing_cycle,
    }))

    // ── Cashflow Trend ─────────────────────────────────────
    const txns = transactions6m.data || []
    const monthlyMap: Record<string, { income: number; expenses: number }> = {}
    for (const t of txns) {
      const month = t.date?.substring(0, 7) // YYYY-MM
      if (!month) continue
      if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expenses: 0 }
      const amount = Math.abs(parseFloat(String(t.total)) || 0)
      if (t.type === 'RECEIVE') monthlyMap[month].income += amount
      else if (t.type === 'SPEND') monthlyMap[month].expenses += amount
    }
    const monthlyTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        net: Math.round((data.income - data.expenses) * 100) / 100,
      }))

    const avgIncome = monthlyTrend.length > 0
      ? monthlyTrend.reduce((sum, m) => sum + m.income, 0) / monthlyTrend.length
      : 0
    const avgExpenses = monthlyTrend.length > 0
      ? monthlyTrend.reduce((sum, m) => sum + m.expenses, 0) / monthlyTrend.length
      : 0

    // ── Issue Detection ────────────────────────────────────
    const issues: Array<{ type: string; severity: string; detail: string }> = []

    const overdue30 = overdueItems.filter((i) => i.days_overdue > 30)
    if (overdue30.length > 0) {
      const totalOverdue30 = overdue30.reduce((sum, i) => sum + i.amount_due, 0)
      issues.push({
        type: 'overdue_invoices',
        severity: 'high',
        detail: `${overdue30.length} invoices overdue >30 days, totalling $${totalOverdue30.toFixed(2)}`,
      })
    }

    if (totalOutstanding > 5000) {
      issues.push({
        type: 'large_outstanding',
        severity: 'high',
        detail: `$${totalOutstanding.toFixed(2)} total outstanding across ${outstanding.length} invoices`,
      })
    }

    const staleReceipts = pending.filter(
      (r) => Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 86400000) > 14
    )
    if (staleReceipts.length > 0) {
      issues.push({
        type: 'stale_receipts',
        severity: 'medium',
        detail: `${staleReceipts.length} receipts pending >14 days (oldest: ${oldestPendingDays} days)`,
      })
    }

    const renewals = upcomingRenewals.data || []
    const urgentRenewals = renewals.filter((r) => {
      const daysUntil = r.renewal_date
        ? Math.ceil((new Date(r.renewal_date).getTime() - now.getTime()) / 86400000)
        : 999
      return daysUntil <= 7
    })
    if (urgentRenewals.length > 0) {
      issues.push({
        type: 'upcoming_renewals',
        severity: 'medium',
        detail: `${urgentRenewals.length} subscriptions renewing within 7 days`,
      })
    }

    const alerts = subscriptionAlerts.data || []
    if (alerts.length > 0) {
      issues.push({
        type: 'subscription_alerts',
        severity: 'medium',
        detail: `${alerts.length} subscription alerts (missed payments, price changes, etc.)`,
      })
    }

    if (totalExpenses > totalIncome && totalIncome > 0) {
      issues.push({
        type: 'expenses_exceed_income',
        severity: 'high',
        detail: `Expenses ($${totalExpenses.toFixed(2)}) exceed income ($${totalIncome.toFixed(2)}) by $${(totalExpenses - totalIncome).toFixed(2)}`,
      })
    }

    if (prevExpenses > 0) {
      if (expenseChangePct !== null && expenseChangePct > 50) {
        issues.push({
          type: 'spending_spike',
          severity: 'low',
          detail: `Total expenses increased ${expenseChangePct}% vs previous quarter`,
        })
      }
    }

    // Summary mode: headline numbers + issues only (~200 tokens vs ~2000)
    if (input.detail_level === 'summary') {
      return JSON.stringify({
        quarter: qDates.label,
        income: Math.round(totalIncome * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        vs_prev: { income_pct: incomeChangePct, expenses_pct: expenseChangePct },
        gst_payable: estimatedGstPayable,
        outstanding: Math.round(totalOutstanding * 100) / 100,
        pending_receipts: pendingCount,
        subscriptions_monthly: Math.round(monthlyTotal * 100) / 100,
        issues,
      })
    }

    return JSON.stringify({
      quarter: {
        label: qDates.label,
        start_date: qDates.start,
        end_date: qDates.end,
        fy_label: qDates.fyLabel,
      },
      income_expenses: {
        total_income: Math.round(totalIncome * 100) / 100,
        total_expenses: Math.round(totalExpenses * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        income_by_source: topIncome,
        expenses_by_vendor: topExpenses,
        expenses_by_project: topProjectExpenses,
        vs_previous_quarter: {
          income_change_pct: incomeChangePct,
          expenses_change_pct: expenseChangePct,
        },
      },
      bas_summary: {
        g1_total_sales: Math.round(g1TotalSales * 100) / 100,
        g11_non_capital_purchases: Math.round(g11NonCapitalPurchases * 100) / 100,
        label_1a_gst_on_sales: label1aGstOnSales,
        label_1b_gst_on_purchases: label1bGstOnPurchases,
        estimated_gst_payable: estimatedGstPayable,
        note: 'Estimates from Xero invoice totals. Verify against Xero BAS report.',
        invoice_count: { receivable: incomeData.length, payable: expenseData.length },
      },
      outstanding_invoices: {
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        by_aging: Object.fromEntries(
          Object.entries(aging).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
        overdue_items: overdueItems.slice(0, 10),
      },
      receipts: {
        pending_count: pendingCount,
        pending_total: Math.round(pendingTotal * 100) / 100,
        oldest_pending_days: oldestPendingDays,
        by_category: receiptsByCategory,
        resolved_this_quarter: (resolvedReceipts.data || []).length,
      },
      subscriptions: {
        active_count: subs.length,
        monthly_total: Math.round(monthlyTotal * 100) / 100,
        annual_total: Math.round(annualTotal * 100) / 100,
        top_costs: topSubCosts,
        upcoming_renewals: (renewals).slice(0, 5),
        alerts: (alerts).slice(0, 5),
      },
      cashflow: {
        monthly_trend: monthlyTrend,
        avg_monthly_income: Math.round(avgIncome * 100) / 100,
        avg_monthly_expenses: Math.round(avgExpenses * 100) / 100,
        months_of_runway: avgExpenses > avgIncome && avgExpenses > 0
          ? null
          : undefined,
      },
      issues,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_financials
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetProjectFinancials(input: { project_code?: string }): Promise<string> {
  try {
    const result = await fetchProjectFinancials(supabase, { projectCode: input.project_code })
    if (result.count === 0) return JSON.stringify({ message: 'No financial data found' })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_untagged_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetUntaggedSummary(): Promise<string> {
  try {
    const { count: untaggedCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .is('project_code', null)

    const { count: totalCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })

    // Top untagged vendors
    const { data: untagged } = await supabase
      .from('xero_transactions')
      .select('contact_name')
      .is('project_code', null)

    const vendorCounts: Record<string, number> = {}
    for (const tx of untagged || []) {
      const name = tx.contact_name || '(No contact)'
      vendorCounts[name] = (vendorCounts[name] || 0) + 1
    }

    const topVendors = Object.entries(vendorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ vendor: name, count }))

    const coverage = totalCount ? Math.round(((totalCount - (untaggedCount || 0)) / totalCount) * 100) : 0

    return JSON.stringify({
      untagged: untaggedCount || 0,
      total: totalCount || 0,
      coverage_pct: coverage,
      top_untagged_vendors: topVendors,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: trigger_auto_tag
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeTriggerAutoTag(input: { dry_run?: boolean }): Promise<string> {
  try {
    // Load vendor rules from DB
    const { data: rules, error: rulesErr } = await supabase
      .from('vendor_project_rules')
      .select('vendor_name, aliases, project_code')
      .eq('auto_apply', true)

    if (rulesErr) return JSON.stringify({ error: rulesErr.message })

    // Fetch untagged transactions
    const { data: untagged, error: txErr } = await supabase
      .from('xero_transactions')
      .select('id, contact_name')
      .is('project_code', null)
      .limit(5000)

    if (txErr) return JSON.stringify({ error: txErr.message })

    // Match
    const matches: Array<{ id: string; project_code: string; vendor: string }> = []
    for (const tx of untagged || []) {
      if (!tx.contact_name) continue
      const lower = tx.contact_name.toLowerCase()
      for (const rule of rules || []) {
        const names = [rule.vendor_name, ...(rule.aliases || [])].map((a: string) => a.toLowerCase())
        if (names.some((n: string) => lower.includes(n) || n.includes(lower))) {
          matches.push({ id: tx.id, project_code: rule.project_code, vendor: tx.contact_name })
          break
        }
      }
    }

    if (input.dry_run || matches.length === 0) {
      return JSON.stringify({
        mode: 'dry_run',
        would_tag: matches.length,
        untagged_remaining: (untagged?.length || 0) - matches.length,
        sample: matches.slice(0, 10),
      })
    }

    // Apply
    let applied = 0
    for (const m of matches) {
      const { error } = await supabase
        .from('xero_transactions')
        .update({ project_code: m.project_code, project_code_source: 'vendor_rule' })
        .eq('id', m.id)
      if (!error) applied++
    }

    return JSON.stringify({
      mode: 'applied',
      tagged: applied,
      untagged_remaining: (untagged?.length || 0) - applied,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_receipt_pipeline_status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetReceiptPipelineStatus(input: {
  include_stuck?: boolean
}): Promise<string> {
  try {
    const result = await fetchReceiptPipeline(supabase, { includeStuck: input.include_stuck })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_weekly_finance_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetWeeklyFinanceSummary(input: {
  format?: string
}): Promise<string> {
  const now = getBrisbaneNow()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const today = getBrisbaneDate()

  try {
    const [transactions, snapshots, overdueInvoices, upcomingBills] = await Promise.all([
      supabase
        .from('xero_transactions')
        .select('amount, type, contact_name')
        .gte('date', sevenDaysAgo.split('T')[0])
        .lte('date', today),
      supabase
        .from('financial_snapshots')
        .select('closing_balance, income, expenses, month')
        .order('month', { ascending: false })
        .limit(1),
      supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, amount_due, due_date')
        .eq('type', 'ACCREC')
        .in('status', ['AUTHORISED', 'SUBMITTED'])
        .gt('amount_due', 0)
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .limit(10),
      supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, amount_due, due_date')
        .eq('type', 'ACCPAY')
        .in('status', ['AUTHORISED', 'SUBMITTED'])
        .gt('amount_due', 0)
        .gte('due_date', today)
        .lte('due_date', getBrisbaneDateOffset(14))
        .order('due_date', { ascending: true })
        .limit(10),
    ])

    const txns = transactions.data || []
    const income = txns.filter((t) => t.type === 'RECEIVE').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    const spend = txns.filter((t) => t.type === 'SPEND').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    const net = income - spend
    const balance = snapshots.data?.[0]?.closing_balance || 0
    const overdueItems = overdueInvoices.data || []
    const overdueTotal = overdueItems.reduce((sum, inv) => sum + (parseFloat(String(inv.amount_due)) || 0), 0)
    const upcomingItems = upcomingBills.data || []
    const upcomingTotal = upcomingItems.reduce((sum, inv) => sum + (parseFloat(String(inv.amount_due)) || 0), 0)

    if (input.format === 'voice') {
      const parts: string[] = []

      const fmtAmount = (n: number) => {
        if (n >= 1000) return `${Math.round(n / 100) / 10} thousand`
        return `${Math.round(n)} dollars`
      }

      parts.push(`This week you received ${fmtAmount(income)} and spent ${fmtAmount(spend)}.`)
      if (net >= 0) {
        parts.push(`Net positive ${fmtAmount(net)}.`)
      } else {
        parts.push(`Net negative ${fmtAmount(Math.abs(net))}.`)
      }

      if (overdueItems.length > 0) {
        parts.push(`${overdueItems.length} overdue invoice${overdueItems.length === 1 ? '' : 's'} totaling ${fmtAmount(overdueTotal)}.`)
      }

      if (upcomingItems.length > 0) {
        parts.push(`${upcomingItems.length} bill${upcomingItems.length === 1 ? '' : 's'} due in the next two weeks, totaling ${fmtAmount(upcomingTotal)}.`)
      }

      parts.push(`Current balance is ${fmtAmount(balance)}.`)

      return parts.join(' ')
    }

    return JSON.stringify({
      period: `${sevenDaysAgo.split('T')[0]} to ${today}`,
      income: `$${income.toFixed(2)}`,
      spend: `$${spend.toFixed(2)}`,
      net: `$${net.toFixed(2)}`,
      cash_position: `$${Number(balance).toFixed(2)}`,
      overdue_receivables: {
        count: overdueItems.length,
        total: `$${overdueTotal.toFixed(2)}`,
        items: overdueItems.map((inv) => ({
          contact: inv.contact_name,
          amount: `$${Number(inv.amount_due).toFixed(2)}`,
          due: inv.due_date,
          days_overdue: Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000),
        })),
      },
      upcoming_payables: {
        count: upcomingItems.length,
        total: `$${upcomingTotal.toFixed(2)}`,
        items: upcomingItems.map((inv) => ({
          contact: inv.contact_name,
          amount: `$${Number(inv.amount_due).toFixed(2)}`,
          due: inv.due_date,
        })),
      },
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_revenue_scoreboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetRevenueScoreboard(): Promise<string> {
  try {
    const result = await fetchRevenueScoreboard(supabase)

    // Build action items from the data
    const actions: string[] = []
    if (result.receivables.total > 0) {
      actions.push(`Chase $${Math.round(result.receivables.total).toLocaleString()} in outstanding receivables`)
    }
    if (result.receivables.items.length > 0) {
      const top = result.receivables.items[0]
      actions.push(`Top receivable: ${top.name} — $${Math.round(top.amount).toLocaleString()}`)
    }

    // Concise output — summary + actions, not full data dump
    return JSON.stringify({
      monthly_target: result.streams.totalMonthlyTarget,
      annual_target: result.streams.totalAnnualTarget,
      pipeline: {
        weighted_value: result.pipeline.weightedValue,
        total_value: result.pipeline.totalValue,
        count: result.pipeline.count,
        top_deals: result.pipeline.topOpportunities.slice(0, 3).map((d) => ({
          name: d.name, funder: d.funder, value: d.amount, weighted: d.weighted, stage: d.status,
        })),
      },
      receivables: {
        total: result.receivables.total,
        items: result.receivables.items.slice(0, 5),
      },
      streams: result.streams.items.map((s) => ({
        name: s.name, code: s.code, monthly: s.monthlyTarget,
      })),
      active_projects: result.projects.active,
      actions,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: add_receipt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeAddReceipt(input: {
  vendor: string
  amount: number
  date: string
  category?: string
  notes?: string
}): Promise<string> {
  try {
    const { data, error } = await supabase.from('receipt_matches').insert({
      source_type: 'transaction',
      source_id: `telegram-${Date.now()}`,
      vendor_name: input.vendor,
      amount: input.amount,
      transaction_date: input.date,
      category: input.category || 'other',
      description: input.notes || `Added via Telegram`,
      status: 'pending',
      week_start: getWeekStart(input.date),
    }).select().single()

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    return JSON.stringify({
      action: 'receipt_added',
      id: data.id,
      vendor: input.vendor,
      amount: input.amount,
      date: input.date,
      category: input.category || 'other',
      confirmation: `Receipt logged: $${input.amount.toFixed(2)} at ${input.vendor} on ${input.date}.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}
