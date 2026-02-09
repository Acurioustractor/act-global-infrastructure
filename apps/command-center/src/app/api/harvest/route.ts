import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const PROJECT_CODE = 'ACT-HV'
const HARVEST_TAGS = ['harvest', 'the-harvest', 'witta']

export async function GET() {
  try {
    const [
      transactions,
      invoices,
      opportunities,
      contacts,
      grants,
      subscriptions,
      emails,
      resources,
      health,
    ] = await Promise.all([
      // Xero transactions
      supabase
        .from('xero_transactions')
        .select('id, date, description, contact_name, total, type')
        .eq('project_code', PROJECT_CODE)
        .order('date', { ascending: false })
        .limit(200),

      // Xero invoices
      supabase
        .from('xero_invoices')
        .select('id, invoice_number, contact_name, total, amount_due, type, status, date')
        .eq('project_code', PROJECT_CODE),

      // GHL opportunities
      supabase
        .from('ghl_opportunities')
        .select('id, name, pipeline_name, stage_name, monetary_value, status, created_at')
        .eq('project_code', PROJECT_CODE)
        .order('monetary_value', { ascending: false, nullsFirst: false }),

      // GHL contacts with harvest tags
      supabase
        .from('ghl_contacts')
        .select('id, first_name, last_name, company_name, email, phone, tags')
        .overlaps('tags', HARVEST_TAGS)
        .limit(50),

      // Grant applications
      supabase
        .from('grant_applications')
        .select('id, application_name, status, amount_requested, outcome_amount, submitted_at, opportunity_id')
        .eq('project_code', PROJECT_CODE),

      // Subscriptions
      supabase
        .from('subscriptions')
        .select('id, vendor_name, category, amount, billing_cycle, account_status')
        .contains('project_codes', [PROJECT_CODE])
        .eq('account_status', 'active'),

      // Email count
      supabase
        .from('communications_history')
        .select('id', { count: 'exact', head: true })
        .contains('project_codes', [PROJECT_CODE]),

      // Resource allocations
      supabase
        .from('resource_allocations')
        .select('*')
        .eq('project_code', PROJECT_CODE),

      // Project health
      supabase
        .from('project_health')
        .select('*')
        .eq('project_code', PROJECT_CODE)
        .maybeSingle(),
    ])

    const txData = transactions.data || []
    const invData = invoices.data || []
    const oppData = opportunities.data || []
    const contactData = contacts.data || []
    const grantData = grants.data || []
    const subData = subscriptions.data || []
    const resourceData = resources.data || []

    // Calculate financials
    let totalIncome = 0, totalExpenses = 0
    for (const tx of txData) {
      if (tx.type === 'RECEIVE') totalIncome += Math.abs(tx.total || 0)
      else if (tx.type === 'SPEND') totalExpenses += Math.abs(tx.total || 0)
    }

    const receivable = invData
      .filter((i: any) => i.type === 'ACCREC' && i.amount_due > 0)
      .reduce((s: number, i: any) => s + (i.amount_due || 0), 0)

    const pipelineValue = oppData
      .filter((o: any) => o.status !== 'lost')
      .reduce((s: number, o: any) => s + ((o.monetary_value || 0) / 100), 0)

    const grantFunding = grantData
      .filter((g: any) => g.status === 'approved' || g.status === 'acquitted')
      .reduce((s: number, g: any) => s + (g.outcome_amount || g.amount_requested || 0), 0)

    // Monthly trend
    const monthlyMap: Record<string, { income: number; expenses: number }> = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      monthlyMap[key] = { income: 0, expenses: 0 }
    }
    for (const tx of txData) {
      const month = tx.date?.substring(0, 7)
      if (month && monthlyMap[month]) {
        if (tx.type === 'RECEIVE') monthlyMap[month].income += Math.abs(tx.total || 0)
        else if (tx.type === 'SPEND') monthlyMap[month].expenses += Math.abs(tx.total || 0)
      }
    }
    const monthlyTrend = Object.entries(monthlyMap).map(([month, vals]) => ({ month, ...vals }))

    // Top vendors by spend
    const vendorSpend: Record<string, number> = {}
    for (const tx of txData) {
      if (tx.type === 'SPEND' && tx.contact_name) {
        vendorSpend[tx.contact_name] = (vendorSpend[tx.contact_name] || 0) + Math.abs(tx.total || 0)
      }
    }
    const topVendors = Object.entries(vendorSpend)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, total]) => ({ name, total: Math.round(total) }))

    // Subscription monthly total
    let subMonthly = 0
    for (const s of subData) {
      const amt = Math.abs((s as any).amount || 0)
      if ((s as any).billing_cycle === 'annual' || (s as any).billing_cycle === 'yearly') subMonthly += amt / 12
      else if ((s as any).billing_cycle === 'quarterly') subMonthly += amt / 3
      else subMonthly += amt
    }

    // Fetch grant opportunity providers
    const oppIds = grantData.map((g: any) => g.opportunity_id).filter(Boolean)
    let oppProviderMap: Record<string, string> = {}
    if (oppIds.length > 0) {
      const { data: opps } = await supabase
        .from('grant_opportunities')
        .select('id, provider')
        .in('id', oppIds)
      for (const o of opps || []) {
        oppProviderMap[o.id] = o.provider
      }
    }

    return NextResponse.json({
      overview: {
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        net: Math.round(totalIncome - totalExpenses),
        receivable: Math.round(receivable),
        pipelineValue: Math.round(pipelineValue),
        grantFunding: Math.round(grantFunding),
        stakeholderCount: contactData.length,
        emailCount: emails.count || 0,
        healthScore: health.data?.health_score || null,
        subscriptionMonthly: Math.round(subMonthly),
      },
      monthlyTrend,
      topVendors,
      transactions: txData.slice(0, 50).map((tx: any) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description || '',
        contactName: tx.contact_name || '',
        amount: tx.total || 0,
        type: tx.type,
      })),
      invoices: invData.map((inv: any) => ({
        id: inv.id,
        number: inv.invoice_number || '',
        contact: inv.contact_name || '',
        total: inv.total || 0,
        due: inv.amount_due || 0,
        type: inv.type,
        status: inv.status,
        date: inv.date,
      })),
      opportunities: oppData.map((opp: any) => ({
        id: opp.id,
        name: opp.name,
        pipeline: opp.pipeline_name,
        stage: opp.stage_name,
        value: (opp.monetary_value || 0) / 100,
        status: opp.status,
      })),
      grants: grantData.map((g: any) => ({
        id: g.id,
        name: g.application_name,
        status: g.status,
        requested: g.amount_requested || 0,
        outcome: g.outcome_amount,
        provider: g.opportunity_id ? oppProviderMap[g.opportunity_id] || null : null,
        submitted: g.submitted_at,
      })),
      stakeholders: contactData.map((c: any) => ({
        id: c.id,
        name: [c.first_name, c.last_name].filter(Boolean).join(' '),
        company: c.company_name || null,
        email: c.email || null,
        tags: c.tags || [],
      })),
      subscriptions: subData.map((s: any) => ({
        id: s.id,
        vendor: s.vendor_name,
        category: s.category,
        amount: s.amount,
        cycle: s.billing_cycle,
      })),
      team: resourceData.map((r: any) => ({
        id: r.id,
        name: r.name || r.person_name,
        role: r.role,
        allocation: r.allocation_percentage,
        annualCost: r.annual_cost,
      })),
    })
  } catch (error) {
    console.error('Harvest API error:', error)
    return NextResponse.json({ error: 'Failed to load Harvest data' }, { status: 500 })
  }
}
