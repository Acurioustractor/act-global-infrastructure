import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface EnhancedProjectFinancials {
  projectCode: string
  revenue: number
  expenses: number
  net: number
  receivable: number
  budget: number | null
  budgetUsed: number
  subscriptions: {
    count: number
    monthlyTotal: number
    items: Array<{ name: string; provider: string; monthlyCost: number }>
  }
  recentTransactions: Array<{
    id: string
    date: string
    description: string
    amount: number
    contactName: string
  }>
  invoices: Array<{
    id: string
    number: string
    contact: string
    total: number
    due: number
    type: string
    status: string
  }>
  grants: Array<{
    name: string
    status: string
    amountRequested: number
    outcomeAmount: number | null
    provider: string | null
  }>
  monthlyTrend: Array<{
    month: string
    income: number
    expenses: number
  }>
  ecosystemActivity: {
    emailCount: number
    crmTouches: number
    contentCount: number
  }
  keyStakeholders: Array<{
    name: string
    company: string | null
    role: string | null
  }>
  fundraising: Array<{
    name: string
    amount: number
    status: string
  }>
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const projectCode = decodeURIComponent(code).toUpperCase()

    // Parallel fetch all data sources
    const [
      transactions,
      invoices,
      grants,
      subscriptions,
      emails,
      contacts,
      fundraising,
      donations,
      health,
    ] = await Promise.all([
      // Xero transactions for this project
      supabase
        .from('xero_transactions')
        .select('id, date, description, contact_name, total, type')
        .eq('project_code', projectCode)
        .order('date', { ascending: false })
        .limit(100),

      // Xero invoices for this project
      supabase
        .from('xero_invoices')
        .select('id, invoice_number, contact_name, total, amount_due, type, status')
        .eq('project_code', projectCode),

      // Grant applications
      supabase
        .from('grant_applications')
        .select(`
          application_name, status, amount_requested, outcome_amount,
          opportunity_id
        `)
        .eq('project_code', projectCode),

      // Subscriptions
      supabase
        .from('subscriptions')
        .select('vendor_name, category, amount, billing_cycle, account_status, project_codes')
        .contains('project_codes', [projectCode])
        .eq('account_status', 'active'),

      // Emails tagged with this project
      supabase
        .from('communications_history')
        .select('id', { count: 'exact', head: true })
        .contains('project_codes', [projectCode]),

      // GHL contacts with this project
      supabase
        .from('ghl_contacts')
        .select('first_name, last_name, company_name')
        .contains('tags', [projectCode.toLowerCase()])
        .limit(10),

      // Fundraising pipeline
      supabase
        .from('fundraising_pipeline')
        .select('name, amount, status, project_codes')
        .contains('project_codes', [projectCode]),

      // Donations
      supabase
        .from('donations')
        .select('amount, project')
        .eq('project', projectCode),

      // Project health (BUNYA)
      supabase
        .from('project_health')
        .select('*')
        .eq('project_code', projectCode)
        .maybeSingle(),
    ])

    const txData = transactions.data || []
    const invData = invoices.data || []
    const grantData = grants.data || []
    const subData = subscriptions.data || []
    const donationData = donations.data || []

    // Calculate revenue and expenses from transactions
    let revenue = 0
    let expenses = 0
    txData.forEach((tx: any) => {
      if (tx.type === 'RECEIVE') revenue += Math.abs(tx.total || 0)
      else if (tx.type === 'SPEND') expenses += Math.abs(tx.total || 0)
    })

    // Add donations to revenue
    revenue += donationData.reduce((s: number, d: any) => s + Math.abs(d.amount || 0), 0)

    // Receivable from invoices
    const receivable = invData
      .filter((i: any) => i.type === 'ACCREC' && i.amount_due > 0)
      .reduce((s: number, i: any) => s + (i.amount_due || 0), 0)

    // Subscription monthly total
    let subMonthly = 0
    const subItems = subData.map((s: any) => {
      const amt = Math.abs(s.amount || 0)
      let monthlyCost = amt
      if (s.billing_cycle === 'annual' || s.billing_cycle === 'yearly') monthlyCost = amt / 12
      else if (s.billing_cycle === 'quarterly') monthlyCost = amt / 3
      subMonthly += monthlyCost
      return { name: s.vendor_name || 'Unknown', provider: s.category || '', monthlyCost }
    })

    // Monthly trend from transactions (last 12 months)
    const monthlyMap: Record<string, { income: number; expenses: number }> = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      monthlyMap[key] = { income: 0, expenses: 0 }
    }

    txData.forEach((tx: any) => {
      const month = tx.date?.substring(0, 7)
      if (month && monthlyMap[month]) {
        if (tx.type === 'RECEIVE') monthlyMap[month].income += Math.abs(tx.total || 0)
        else if (tx.type === 'SPEND') monthlyMap[month].expenses += Math.abs(tx.total || 0)
      }
    })

    const monthlyTrend = Object.entries(monthlyMap).map(([month, vals]) => ({
      month,
      ...vals,
    }))

    // Fetch grant providers
    const oppIds = grantData.map((g: any) => g.opportunity_id).filter(Boolean)
    let oppMap: Record<string, string> = {}
    if (oppIds.length > 0) {
      const { data: opps } = await supabase
        .from('grant_opportunities')
        .select('id, provider')
        .in('id', oppIds)
      for (const o of opps || []) {
        oppMap[o.id] = o.provider
      }
    }

    // Budget from project_health
    const budget = health.data?.budget || null

    const response: EnhancedProjectFinancials = {
      projectCode,
      revenue: Math.round(revenue),
      expenses: Math.round(expenses),
      net: Math.round(revenue - expenses),
      receivable: Math.round(receivable),
      budget,
      budgetUsed: budget && budget > 0 ? Math.round((expenses / budget) * 100) : 0,
      subscriptions: {
        count: subData.length,
        monthlyTotal: Math.round(subMonthly),
        items: subItems,
      },
      recentTransactions: txData.slice(0, 20).map((tx: any) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description || '',
        amount: tx.total || 0,
        contactName: tx.contact_name || '',
      })),
      invoices: invData.map((inv: any) => ({
        id: inv.id,
        number: inv.invoice_number || '',
        contact: inv.contact_name || '',
        total: inv.total || 0,
        due: inv.amount_due || 0,
        type: inv.type || '',
        status: inv.status || '',
      })),
      grants: grantData.map((g: any) => ({
        name: g.application_name,
        status: g.status,
        amountRequested: g.amount_requested || 0,
        outcomeAmount: g.outcome_amount,
        provider: g.opportunity_id ? oppMap[g.opportunity_id] || null : null,
      })),
      monthlyTrend,
      ecosystemActivity: {
        emailCount: emails.count || 0,
        crmTouches: (contacts.data || []).length,
        contentCount: 0, // Will be populated for Goods via content library
      },
      keyStakeholders: (contacts.data || []).map((c: any) => ({
        name: [c.first_name, c.last_name].filter(Boolean).join(' '),
        company: c.company_name || null,
        role: null,
      })),
      fundraising: (fundraising.data || []).map((f: any) => ({
        name: f.name,
        amount: f.amount || 0,
        status: f.status,
      })),
    }

    // Special: Goods content library count
    if (projectCode === 'ACT-GD') {
      const { count } = await supabase
        .from('goods_content_library')
        .select('*', { count: 'exact', head: true })

      response.ecosystemActivity.contentCount = count || 0
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in project financials:', error)
    return NextResponse.json({ error: 'Failed to load financials' }, { status: 500 })
  }
}
