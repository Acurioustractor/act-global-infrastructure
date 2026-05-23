import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const projectCode = decodeURIComponent(code).toUpperCase()

    // Parallel fetch monthly financials, variance notes, transactions, budgets, R&D vendors, invoices, pipeline,
    // funding allocations (S1 2026-05-21), org burn snapshot (S4 2026-05-21), linked contacts (Item 4 2026-05-21),
    // GHL pipelines (2026-05-23) — per-pipeline rollup from project_pipelines table.
    const [monthly, variances, transactions, budgets, rdVendors, salaryAllocs, revenueStreams, invoiceMappings, expenseInvoices, pipeline, cardSpendResult, fundingAllocations, orgBurnSnapshot, linkedContacts, ghlPipelines, projectSupporters, funderBriefs] = await Promise.all([
      supabase
        .from('project_monthly_financials')
        .select('*')
        .eq('project_code', projectCode)
        .order('month', { ascending: true })
        .limit(24),

      supabase
        .from('financial_variance_notes')
        .select('*')
        .eq('project_code', projectCode)
        .order('month', { ascending: false })
        .limit(12),

      supabase
        .from('xero_transactions')
        .select('id, date, contact_name, total, type, project_code_source')
        .eq('project_code', projectCode)
        .order('date', { ascending: false })
        .limit(50),

      supabase
        .from('project_budgets')
        .select('*')
        .eq('project_code', projectCode)
        .limit(10),

      supabase.rpc('exec_sql', {
        sql: `
          SELECT
            t.contact_name as vendor,
            v.category,
            SUM(ABS(t.total)) as spend,
            COUNT(*) as tx_count
          FROM xero_transactions t
          JOIN vendor_project_rules v ON t.contact_name = v.vendor_name
          WHERE v.rd_eligible = true
            AND t.total < 0
            AND t.project_code = '${projectCode.replace(/'/g, "''")}'
            AND t.date >= '2024-07-01'
          GROUP BY t.contact_name, v.category
          ORDER BY spend DESC
        `
      }),

      supabase
        .from('project_salary_allocations')
        .select('*')
        .eq('project_code', projectCode)
        .eq('fy', 'FY26')
        .order('allocation_pct', { ascending: false }),

      supabase
        .from('revenue_streams')
        .select('*')
        .contains('project_codes', [projectCode]),

      // Invoices mapped to this project via invoice_project_map
      supabase.rpc('exec_sql', {
        sql: `
          SELECT
            m.income_type,
            m.milestone,
            m.notes as mapping_notes,
            i.id as invoice_id,
            i.invoice_number,
            i.contact_name,
            i.total,
            i.status,
            i.type,
            i.date,
            i.due_date,
            i.line_items->0->>'description' as description
          FROM invoice_project_map m
          JOIN xero_invoices i ON i.id = m.invoice_id
          WHERE m.project_code = '${projectCode.replace(/'/g, "''")}'
          ORDER BY i.date DESC
        `
      }),

      // Expense invoices (ACCPAY) mapped via vendor_project_rules
      supabase.rpc('exec_sql', {
        sql: `
          SELECT
            i.id as invoice_id,
            i.invoice_number,
            i.contact_name,
            i.total,
            i.status,
            i.date,
            i.due_date,
            v.category,
            v.rd_eligible,
            i.line_items->0->>'description' as description
          FROM xero_invoices i
          JOIN vendor_project_rules v ON i.contact_name = v.vendor_name
          WHERE i.type = 'ACCPAY'
            AND v.project_code = '${projectCode.replace(/'/g, "''")}'
            AND i.status NOT IN ('DELETED', 'VOIDED')
            AND i.date >= '2024-07-01'
          ORDER BY i.date DESC
          LIMIT 100
        `
      }),

      // Grant pipeline for this project
      supabase
        .from('grant_opportunities')
        .select('id, name, provider, program, amount_min, amount_max, status, pipeline_stage, closes_at, metadata')
        .contains('aligned_projects', [projectCode])
        .neq('status', 'closed'),

      // Card spend from bank_statement_lines
      supabase.rpc('exec_sql', {
        query: `
          SELECT
            count(*)::int as total_lines,
            round(sum(abs(amount))::numeric, 2) as total_spend,
            count(*) FILTER (WHERE receipt_match_status = 'matched')::int as matched_count,
            round(sum(abs(amount)) FILTER (WHERE receipt_match_status = 'matched')::numeric, 2) as matched_value,
            count(*) FILTER (WHERE receipt_match_status = 'no_receipt_needed')::int as no_receipt_count,
            count(*) FILTER (WHERE receipt_match_status = 'unmatched')::int as unmatched_count,
            round(sum(abs(amount)) FILTER (WHERE receipt_match_status = 'unmatched')::numeric, 2) as unmatched_value,
            bool_or(rd_eligible) as rd_eligible
          FROM bank_statement_lines
          WHERE direction = 'debit'
            AND project_code = '${projectCode.replace(/'/g, "''")}'
            AND date >= '2025-07-01'
        `
      }),

      // S1 2026-05-21: funder allocations for this project
      supabase
        .from('v_project_funding_position')
        .select('*')
        .eq('project_code', projectCode)
        .order('committed_amount', { ascending: false }),

      // S4 2026-05-21: org-wide 3-month avg burn + current bank balance for runway impact card
      supabase
        .from('financial_snapshots')
        .select('month, income, expenses, closing_balance')
        .order('month', { ascending: false })
        .limit(3),

      // Item 4 2026-05-21: linked contacts for this project (via contact_project_links → canonical_entities)
      supabase.rpc('exec_sql', {
        query: `
          SELECT
            ce.id,
            ce.canonical_name,
            ce.entity_type,
            ce.canonical_email,
            ce.canonical_company,
            ce.engagement_status,
            ce.tags,
            cpl.confidence,
            cpl.source,
            cpl.created_at as linked_at
          FROM contact_project_links cpl
          JOIN canonical_entities ce ON ce.id = cpl.entity_id
          WHERE cpl.project_code = '${projectCode.replace(/'/g, "''")}'
          ORDER BY ce.relationship_strength DESC NULLS LAST, ce.canonical_name
          LIMIT 50
        `
      }),

      // 2026-05-23: GHL pipelines rollup for this project
      supabase
        .from('project_pipelines')
        .select('pipeline_name, open_count, won_count, lost_count, open_value_aud, won_value_aud, earliest_open_at, latest_activity_at, stages_present, contacts_count, computed_at')
        .eq('project_code', projectCode)
        .order('open_value_aud', { ascending: false }),

      // 2026-05-23: supporters funding this project (filter supporters_intelligence by projects array)
      supabase
        .from('supporters_intelligence')
        .select('slug, name, tier, stage, total_paid_aud, outstanding_aud, outstanding_alert, primary_contact, last_communicated_at, days_since_last_contact, open_opp_count, open_opp_value_aud, won_opp_count, won_opp_value_aud')
        .contains('projects', [projectCode])
        .order('total_paid_aud', { ascending: false }),

      // 2026-05-23: funder briefs for this project
      supabase
        .from('funder_briefs')
        .select('*')
        .eq('project_code', projectCode)
        .order('next_move_due', { ascending: true, nullsFirst: false }),
    ])

    const monthlyData = (monthly.data || []).map((m: any) => ({
      month: m.month,
      revenue: Number(m.revenue || 0),
      expenses: Number(m.expenses || 0),
      net: Number(m.net || 0),
      revenueBreakdown: m.revenue_breakdown || {},
      expenseBreakdown: m.expense_breakdown || {},
      fyYtdRevenue: Number(m.fy_ytd_revenue || 0),
      fyYtdExpenses: Number(m.fy_ytd_expenses || 0),
      fyYtdNet: Number(m.fy_ytd_net || 0),
      transactionCount: m.transaction_count || 0,
      unmappedCount: m.unmapped_count || 0,
    }))

    // Calculate totals from the monthly data
    const totals = monthlyData.reduce(
      (acc: any, m: any) => ({
        revenue: acc.revenue + m.revenue,
        expenses: acc.expenses + m.expenses,
        net: acc.net + m.net,
      }),
      { revenue: 0, expenses: 0, net: 0 }
    )

    // Aggregate expense and revenue breakdowns across all months
    const expenseCategories: Record<string, number> = {}
    const revenueCategories: Record<string, number> = {}
    for (const m of monthlyData) {
      for (const [cat, amt] of Object.entries(m.expenseBreakdown)) {
        expenseCategories[cat] = (expenseCategories[cat] || 0) + Number(amt)
      }
      for (const [cat, amt] of Object.entries(m.revenueBreakdown)) {
        revenueCategories[cat] = (revenueCategories[cat] || 0) + Number(amt)
      }
    }

    // Budget data
    const budgetData = (budgets.data || []).map((b: any) => ({
      fy: b.fy,
      annualBudget: Number(b.annual_budget || 0),
      ytdBudget: Number(b.ytd_budget || 0),
      category: b.category || 'total',
    }))
    const currentBudget = budgetData.find((b: any) => b.fy === 'FY26')
    const budgetVsActual = currentBudget ? {
      annualBudget: currentBudget.annualBudget,
      ytdBudget: currentBudget.ytdBudget || currentBudget.annualBudget,
      ytdActual: Math.abs(totals.expenses),
      variance: (currentBudget.ytdBudget || currentBudget.annualBudget) - Math.abs(totals.expenses),
      utilisationPct: currentBudget.annualBudget > 0
        ? Math.round((Math.abs(totals.expenses) / currentBudget.annualBudget) * 100)
        : null,
    } : null

    // R&D data
    const rdVendorData = (rdVendors?.data || []).map((v: any) => ({
      vendor: v.vendor,
      category: v.category,
      spend: Number(v.spend),
      txCount: Number(v.tx_count),
    }))
    const totalRdSpend = rdVendorData.reduce((s: number, v: any) => s + v.spend, 0)
    const rdSummary = {
      totalSpend: totalRdSpend,
      pctOfExpenses: Math.abs(totals.expenses) > 0
        ? Math.round((totalRdSpend / Math.abs(totals.expenses)) * 100)
        : 0,
      potentialOffset: Math.round(totalRdSpend * 0.435),
      topVendors: rdVendorData.slice(0, 10),
    }

    // Salary allocations
    const salaryData = (salaryAllocs.data || []).map((s: any) => ({
      personName: s.person_name,
      role: s.role,
      allocationPct: Number(s.allocation_pct),
      monthlyCost: Number(s.monthly_cost),
      annualCost: Number(s.monthly_cost) * 12,
      rdEligible: s.rd_eligible,
    }))
    const totalSalaryCost = salaryData.reduce((s: number, a: any) => s + a.annualCost, 0)
    const rdSalaryCost = salaryData.filter((a: any) => a.rdEligible).reduce((s: number, a: any) => s + a.annualCost, 0)

    // Revenue streams linked to this project
    const revenueStreamData = (revenueStreams.data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      targetMonthly: Number(s.target_monthly || 0),
      status: s.status,
    }))

    // Process invoice mappings
    const invoiceData = (invoiceMappings?.data || []).map((inv: any) => ({
      invoiceId: inv.invoice_id,
      invoiceNumber: inv.invoice_number,
      contact: inv.contact_name,
      total: Number(inv.total),
      status: inv.status,
      type: inv.type,
      date: inv.date,
      dueDate: inv.due_date,
      incomeType: inv.income_type,
      milestone: inv.milestone,
      notes: inv.mapping_notes,
      description: inv.description,
    }))

    // Group invoices by status for summary
    const invoicesByStatus = {
      paid: invoiceData.filter((i: any) => i.status === 'PAID'),
      authorised: invoiceData.filter((i: any) => i.status === 'AUTHORISED'),
      draft: invoiceData.filter((i: any) => i.status === 'DRAFT'),
    }
    const invoiceSummary = {
      totalReceived: invoicesByStatus.paid.reduce((s: number, i: any) => s + i.total, 0),
      totalPending: invoicesByStatus.authorised.reduce((s: number, i: any) => s + i.total, 0),
      totalDraft: invoicesByStatus.draft.reduce((s: number, i: any) => s + i.total, 0),
      count: invoiceData.length,
    }

    // Group by income type
    const incomeByType: Record<string, { received: number; pending: number; items: any[] }> = {}
    for (const inv of invoiceData) {
      const t = inv.incomeType || 'other'
      if (!incomeByType[t]) incomeByType[t] = { received: 0, pending: 0, items: [] }
      if (inv.status === 'PAID') incomeByType[t].received += inv.total
      else incomeByType[t].pending += inv.total
      incomeByType[t].items.push(inv)
    }

    // Process expense invoices
    const expenseData = (expenseInvoices?.data || []).map((inv: any) => ({
      invoiceId: inv.invoice_id,
      invoiceNumber: inv.invoice_number,
      contact: inv.contact_name,
      total: Number(inv.total),
      status: inv.status,
      date: inv.date,
      dueDate: inv.due_date,
      category: inv.category || 'Uncategorised',
      rdEligible: inv.rd_eligible || false,
      description: inv.description,
    }))

    // Group expenses by category
    const expensesByCategory: Record<string, { total: number; rdEligible: boolean; vendors: Record<string, number>; items: any[] }> = {}
    for (const exp of expenseData) {
      const cat = exp.category
      if (!expensesByCategory[cat]) expensesByCategory[cat] = { total: 0, rdEligible: exp.rdEligible, vendors: {}, items: [] }
      expensesByCategory[cat].total += exp.total
      expensesByCategory[cat].vendors[exp.contact] = (expensesByCategory[cat].vendors[exp.contact] || 0) + exp.total
      expensesByCategory[cat].items.push(exp)
    }

    // Top vendors by spend
    const vendorSpend: Record<string, number> = {}
    for (const exp of expenseData) {
      vendorSpend[exp.contact] = (vendorSpend[exp.contact] || 0) + exp.total
    }
    const topVendors = Object.entries(vendorSpend)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([vendor, total]) => ({ vendor, total }))

    const totalExpenseInvoices = expenseData.reduce((s: number, e: any) => s + e.total, 0)

    // ---- S4 2026-05-21: BURN RATE + RUNWAY IMPACT ----
    // Project's last-3-months avg burn (from monthlyData if available, else from expenseData)
    const last3Months = monthlyData.slice(-3)
    const projectBurn3moAvg = last3Months.length > 0
      ? last3Months.reduce((s: number, m: any) => s + Math.abs(m.expenses), 0) / last3Months.length
      : 0
    const projectBurn12moAvg = monthlyData.length > 0
      ? monthlyData.reduce((s: number, m: any) => s + Math.abs(m.expenses), 0) / monthlyData.length
      : 0
    const burnAcceleration = projectBurn12moAvg > 0
      ? Math.round(100 * (projectBurn3moAvg - projectBurn12moAvg) / projectBurn12moAvg)
      : null

    // Org-level: 3-month avg expense + current closing balance from financial_snapshots
    const orgSnaps = orgBurnSnapshot?.data || []
    const orgBurn3moAvg = orgSnaps.length > 0
      ? orgSnaps.reduce((s: number, r: any) => s + Number(r.expenses || 0), 0) / orgSnaps.length
      : 0
    const currentBalance = orgSnaps.length > 0 ? Number(orgSnaps[0].closing_balance || 0) : 0

    const projectShareOfBurn = orgBurn3moAvg > 0
      ? Math.round(1000 * projectBurn3moAvg / orgBurn3moAvg) / 10  // 1 decimal place
      : null
    // "If we kept this project at current burn and stopped all other spend, how many months would $X balance last?"
    // i.e. months of runway this project alone would consume from current balance
    const projectRunwayMonths = projectBurn3moAvg > 0
      ? Math.round(10 * currentBalance / projectBurn3moAvg) / 10
      : null

    const burnMetrics = {
      projectBurn3moAvg: Math.round(projectBurn3moAvg),
      projectBurn12moAvg: Math.round(projectBurn12moAvg),
      burnAccelerationPct: burnAcceleration,  // positive = accelerating
      projectShareOfBurnPct: projectShareOfBurn,
      orgBurn3moAvg: Math.round(orgBurn3moAvg),
      currentOrgBalance: Math.round(currentBalance),
      projectRunwayMonths,  // if this project's burn rate continued, how many months of org cash it consumes
    }

    // ---- Item 4 2026-05-21: LINKED CONTACTS ----
    const contactsData = (linkedContacts?.data || []).map((c: any) => ({
      id: c.id,
      name: c.canonical_name,
      entityType: c.entity_type,
      email: c.canonical_email,
      company: c.canonical_company,
      engagementStatus: c.engagement_status,
      tags: c.tags || [],
      confidence: c.confidence != null ? Number(c.confidence) : null,
      role: (() => {
        const tags = (c.tags || []).map((t: string) => t.toLowerCase())
        if (tags.includes('funder')) return 'funder'
        if (tags.includes('partner') || tags.some((t: string) => t.startsWith('goods-partner') || t.endsWith('-partner'))) return 'partner'
        if (tags.some((t: string) => t.includes('advisor'))) return 'advisor'
        if (tags.includes('prospect') || c.engagement_status === 'lead') return 'lead'
        if (tags.includes('responsive')) return 'responsive'
        return c.entity_type || 'contact'
      })(),
      linkedAt: c.linked_at,
    }))
    const contactsSummary = {
      total: contactsData.length,
      funders: contactsData.filter((c: any) => c.role === 'funder').length,
      partners: contactsData.filter((c: any) => c.role === 'partner').length,
      advisors: contactsData.filter((c: any) => c.role === 'advisor').length,
      leads: contactsData.filter((c: any) => c.role === 'lead').length,
    }

    // ---- S1 2026-05-21: FUNDING ALLOCATIONS ----
    const fundingData = (fundingAllocations?.data || []).map((a: any) => ({
      allocationId: a.allocation_id,
      funder: a.funder_org_name,
      grantRef: a.grant_or_contract_ref,
      committed: Number(a.committed_amount || 0),
      drawn: Number(a.drawn_amount || 0),
      remaining: Number(a.remaining_amount || 0),
      drawnPct: a.drawn_pct != null ? Number(a.drawn_pct) : null,
      status: a.status,
      periodStart: a.period_start,
      periodEnd: a.period_end,
      pileTag: a.pile_tag,
      lastDrawnAt: a.last_drawn_at,
      drawdownCount: Number(a.drawdown_count || 0),
      notes: a.notes,
    }))
    const fundingSummary = {
      totalCommitted: fundingData.reduce((s: number, f: any) => s + f.committed, 0),
      totalDrawn: fundingData.reduce((s: number, f: any) => s + f.drawn, 0),
      totalRemaining: fundingData.reduce((s: number, f: any) => s + f.remaining, 0),
      activeAllocations: fundingData.filter((f: any) => f.status === 'drawing' || f.status === 'committed').length,
      proposedAllocations: fundingData.filter((f: any) => f.status === 'proposed').length,
      closedAllocations: fundingData.filter((f: any) => f.status === 'closed').length,
    }

    // Pipeline data: dedupe by name (highest-probability winner), convert percent → decimal.
    // Source data has heavy sync-drift duplication (same opportunity inserted on each run).
    const pipelineRaw = (pipeline.data || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      provider: g.provider,
      program: g.program,
      amountMin: g.amount_min ? Number(g.amount_min) : null,
      amountMax: g.amount_max ? Number(g.amount_max) : null,
      status: g.status,
      stage: g.pipeline_stage,
      closesAt: g.closes_at,
      // probability is stored as percent (0-100); convert to decimal here so the renderer
      // can simply multiply by 100 again for display
      probability: g.metadata?.probability ? Number(g.metadata.probability) / 100 : null,
    }))
    // Collapse duplicates: keep the row with the highest non-null probability per name,
    // tiebreak on highest amount.
    const dedupeMap = new Map<string, any>()
    for (const item of pipelineRaw) {
      const existing = dedupeMap.get(item.name)
      if (!existing) { dedupeMap.set(item.name, item); continue }
      const existingScore = (existing.probability ?? 0) * 1e9 + (existing.amountMax || existing.amountMin || 0)
      const itemScore = (item.probability ?? 0) * 1e9 + (item.amountMax || item.amountMin || 0)
      if (itemScore > existingScore) dedupeMap.set(item.name, item)
    }
    const pipelineData = Array.from(dedupeMap.values())
    const pipelineRawCount = pipelineRaw.length
    const pipelineWeightedTotal = pipelineData.reduce((s: number, g: any) => {
      const amt = g.amountMax || g.amountMin || 0
      const prob = g.probability ?? 0.1
      return s + amt * prob
    }, 0)

    // ---- REAL EXPENSE COMPUTATION (bills + unmatched bank spend, deduped) ----
    // The pre-existing project_monthly_financials only counts bank txns, missing
    // ACCPAY bills. Recompute from raw to give the page accurate numbers + audit alerts.
    const [realBillsRes, realSpendsRes] = await Promise.all([
      supabase
        .from('xero_invoices')
        .select('id, xero_id, date, contact_name, total, status, line_items, project_code_source')
        .eq('project_code', projectCode)
        .eq('type', 'ACCPAY')
        .in('status', ['AUTHORISED', 'PAID'])
        .order('date', { ascending: false })
        .range(0, 4999),
      supabase
        .from('xero_transactions')
        .select('id, xero_transaction_id, date, contact_name, total, status, type, line_items, project_code_source, has_attachments')
        .eq('project_code', projectCode)
        .in('type', ['SPEND', 'SPEND-OVERPAYMENT'])
        .order('date', { ascending: false })
        .range(0, 4999),
    ])
    const realBills = realBillsRes.data || []
    const realSpends = realSpendsRes.data || []
    const paidBills = realBills.filter((b: any) => b.status === 'PAID')
    const matchedSpendIds = new Set<string>()
    for (const s of realSpends) {
      const sd = new Date(s.date as string).getTime()
      if (paidBills.some((b: any) =>
        (b.contact_name || '').trim().toUpperCase() === (s.contact_name || '').trim().toUpperCase() &&
        Number(b.total) === Number(s.total) &&
        Math.abs((new Date(b.date as string).getTime() - sd) / 86400000) <= 14
      )) matchedSpendIds.add(s.xero_transaction_id as string)
    }
    const realExpenseRows = [
      ...realBills.map((b: any) => ({ source: 'bill' as const, id: b.id, xeroId: b.xero_id, date: b.date, contact: b.contact_name, total: Number(b.total), status: b.status })),
      ...realSpends.filter((s: any) => !matchedSpendIds.has(s.xero_transaction_id)).map((s: any) => ({ source: s.type === 'SPEND' ? 'spend' as const : 'spend-overpay' as const, id: s.id, xeroId: s.xero_transaction_id, date: s.date, contact: s.contact_name, total: Number(s.total), status: s.status })),
    ]
    const realExpenseTotal = realExpenseRows.reduce((a, r) => a + r.total, 0)

    // Recompute monthly expenses
    const realMonthlyExpenses = new Map<string, number>()
    for (const r of realExpenseRows) {
      const key = (r.date as string).slice(0, 10) // YYYY-MM-DD; we'll trim later
      const month = key.slice(0, 7) + '-01' // YYYY-MM-01 to match monthly format
      realMonthlyExpenses.set(month, (realMonthlyExpenses.get(month) || 0) + r.total)
    }
    // Merge into monthlyData (preserving existing months + revenue; replacing expenses with real values)
    const monthlyMap = new Map<string, any>(monthlyData.map((m: any) => [m.month, { ...m }]))
    for (const [month, exp] of realMonthlyExpenses) {
      const existing = monthlyMap.get(month) || { month, revenue: 0, expenses: 0, net: 0, revenueBreakdown: {}, expenseBreakdown: {}, fyYtdRevenue: 0, fyYtdExpenses: 0, fyYtdNet: 0, transactionCount: 0, unmappedCount: 0 }
      existing.expenses = exp
      existing.net = (existing.revenue || 0) - exp
      monthlyMap.set(month, existing)
    }
    const monthlyDataReal = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month))

    // Recompute totals from real monthly
    const totalsReal = monthlyDataReal.reduce((acc: any, m: any) => ({
      revenue: acc.revenue + Number(m.revenue || 0),
      expenses: acc.expenses + Number(m.expenses || 0),
      net: acc.net + Number(m.net || 0),
    }), { revenue: 0, expenses: 0, net: 0 })

    // Top vendors by real expense
    const realVendorSpend = new Map<string, { contact: string; total: number; count: number; bills: number; spends: number }>()
    for (const r of realExpenseRows) {
      const v = realVendorSpend.get(r.contact) || { contact: r.contact, total: 0, count: 0, bills: 0, spends: 0 }
      v.total += r.total; v.count += 1
      if (r.source === 'bill') v.bills += 1; else v.spends += 1
      realVendorSpend.set(r.contact, v)
    }
    const realTopVendors = [...realVendorSpend.values()].sort((a, b) => b.total - a.total).slice(0, 15)

    // Audit alerts — heuristic detection from the 2026-05-17 review (project-agnostic)
    type AuditAlert = { severity: 'high' | 'medium' | 'info'; title: string; detail: string; amount?: number; xeroLink?: string }
    const auditAlerts: AuditAlert[] = []
    const notableFindings: AuditAlert[] = []

    // 1) Same-day same-amount duplicates (vendor + amount + date)
    const dupKeyCount = new Map<string, { rows: typeof realExpenseRows; key: string }>()
    for (const r of realExpenseRows) {
      const key = `${r.contact}|${r.total.toFixed(2)}|${r.date}`
      const entry = dupKeyCount.get(key) || { rows: [], key }
      entry.rows.push(r); dupKeyCount.set(key, entry)
    }
    for (const { rows: dupRows } of dupKeyCount.values()) {
      if (dupRows.length > 1 && dupRows[0].total > 100) {
        auditAlerts.push({
          severity: 'high',
          title: `${dupRows.length}× duplicate? ${dupRows[0].contact} ${dupRows[0].date}`,
          detail: `Same vendor + amount + date appears ${dupRows.length} times — likely duplicate billing or quote+invoice.`,
          amount: dupRows[0].total * (dupRows.length - 1),
          xeroLink: dupRows[0].source === 'bill'
            ? `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${dupRows[0].xeroId}`
            : `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${dupRows[0].xeroId}`,
        })
      }
    }

    // 2) Hardcoded known findings for ACT-HV (extend per project as findings accrue)
    if (projectCode === 'ACT-HV') {
      // St Mary's Cathedral decking — embedded in Kennedy's invoices, found via OCR
      notableFindings.push({
        severity: 'info',
        title: '★ St Mary\'s Cathedral decking — 12.5t @ $700 = $8,750',
        detail: 'Discovered via OCR. Embedded across Kennedy\'s 2026-04-24 ($7,000 / 10t) and 2026-05-07 ($1,750 / 2.5t) invoices.',
        amount: 8750,
      })
      // Known duplicate
      const dupKennedy = realExpenseRows.find((r) => r.xeroId === '0e7e9885-4c3e-4100-a6fc-40433e2e1e6d')
      if (dupKennedy) {
        auditAlerts.push({
          severity: 'high',
          title: '⚠ Kennedy\'s 2026-04-24 duplicate — $8,525 should be voided',
          detail: 'Same invoice charged twice. Real paid amount is $8,594.91 (other row, incl. CC surcharge).',
          amount: 8525,
          xeroLink: 'https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=0e7e9885-4c3e-4100-a6fc-40433e2e1e6d',
        })
      }
      // Flight Bar Witta miscoded NT travel
      const flightBarRows = realExpenseRows.filter((r) => r.contact === 'Flight Bar Witta')
      if (flightBarRows.length > 0) {
        const sum = flightBarRows.reduce((a, r) => a + r.total, 0)
        auditAlerts.push({
          severity: 'medium',
          title: `⚠ Flight Bar Witta — ${flightBarRows.length} miscoded NT travel rows`,
          detail: 'Bank-feed auto-coded "Flight Bar Witta" but the actual charges are Alice Springs / Tennant Creek / etc. Should be ACT-OO.',
          amount: sum,
        })
      }
      // Carbatec maybe-duplicates
      const carbatecRouterDup = realExpenseRows.find((r) => r.xeroId === '310fa568-bf02-4fdf-b6d4-c7e41f0ff4a4')
      const carbatecBandsawDup = realExpenseRows.find((r) => r.xeroId === '6bf82502-d122-45ab-8f1c-843415d36441')
      if (carbatecRouterDup || carbatecBandsawDup) {
        auditAlerts.push({
          severity: 'medium',
          title: '? Carbatec maybe-duplicates — $3,657.70 needs verification',
          detail: 'Router table $2,338.70 AUTHORISED appears as line in $4,575.65 PAID invoice. Same for $1,319 bandsaw inside $1,811.70.',
          amount: 3657.70,
        })
      }
      // RNM Carpentry — Ben flagged not Harvest
      const rnmRows = realExpenseRows.filter((r) => r.contact.toUpperCase().startsWith('RNM CARPENTRY'))
      if (rnmRows.length > 0) {
        const sum = rnmRows.reduce((a, r) => a + r.total, 0)
        auditAlerts.push({
          severity: 'high',
          title: `⚠ RNM Carpentry — $${sum.toFixed(2)} flagged not Harvest`,
          detail: 'Per user direction 2026-05-17, RNM Carpentry spend should not sit under ACT-HV. Retag or move.',
          amount: sum,
        })
      }
    }

    // 3) Untagged-project-source detection — rows where project_code_source is something fishy
    const autoSourced = [...realBills, ...realSpends].filter((r: any) => r.project_code_source && r.project_code_source !== 'manual').length
    if (autoSourced > 0) {
      auditAlerts.push({
        severity: 'info',
        title: `${autoSourced} rows tagged by auto-rule (not manual review)`,
        detail: 'These rows were auto-tagged via vendor rules. Spot-check that they actually belong to this project.',
      })
    }

    // OCR-discovered line items — surface anything tagged via _ocr blob
    const ocrSurfacable: { date: string; contact: string; summary: string; xeroLink: string }[] = []
    for (const r of [...realBills, ...realSpends]) {
      const li = Array.isArray(r.line_items) ? (r.line_items as any[]) : []
      for (const item of li) {
        if (item?._ocr?.summary) {
          const xeroLink = realBills.includes(r as any)
            ? `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${(r as any).xero_id}`
            : `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${(r as any).xero_transaction_id}`
          ocrSurfacable.push({ date: r.date as string, contact: r.contact_name as string, summary: item._ocr.summary, xeroLink })
          break
        }
      }
    }

    // Override what the page renders
    totals.expenses = totalsReal.expenses
    totals.revenue = totalsReal.revenue
    totals.net = totalsReal.net
    monthlyData.length = 0
    monthlyData.push(...monthlyDataReal)
    // Use real top vendors as the project's expense breakdown
    const realExpensesByVendor: Record<string, number> = {}
    for (const v of realVendorSpend.values()) realExpensesByVendor[v.contact] = v.total

    return NextResponse.json({
      auditAlerts,
      notableFindings,
      realExpenseTotal,
      realExpenseRowCount: realExpenseRows.length,
      realTopVendors,
      ocrFindings: ocrSurfacable.slice(0, 20),
      projectCode,
      monthly: monthlyData,
      totals,
      expenseCategories,
      revenueCategories,
      budgetVsActual,
      rdSummary,
      revenueStreams: revenueStreamData,
      salaryAllocations: {
        allocations: salaryData,
        totalAnnualCost: totalSalaryCost,
        rdEligibleCost: rdSalaryCost,
      },
      variances: (variances.data || []).map((v: any) => ({
        month: v.month,
        type: v.variance_type,
        amountChange: Number(v.amount_change),
        pctChange: v.pct_change ? Number(v.pct_change) : null,
        explanation: v.explanation,
        severity: v.severity,
        topDrivers: v.top_drivers,
      })),
      recentTransactions: (transactions.data || []).map((tx: any) => ({
        id: tx.id,
        date: tx.date,
        contact: tx.contact_name,
        amount: tx.total,
        type: tx.type,
      })),
      // NEW: Invoice-level data
      invoices: invoiceData,
      invoiceSummary,
      incomeByType,
      // NEW: Grant pipeline
      pipeline: pipelineData,
      pipelineWeightedTotal,
      pipelineRawCount,
      // 2026-05-23: GHL pipelines rollup (per pipeline × stage; uses project_pipelines table refreshed daily 06:10am)
      ghlPipelines: (ghlPipelines.data || []).map((r: any) => ({
        pipelineName: r.pipeline_name,
        openCount: r.open_count || 0,
        wonCount: r.won_count || 0,
        lostCount: r.lost_count || 0,
        openValueAud: Number(r.open_value_aud || 0),
        wonValueAud: Number(r.won_value_aud || 0),
        earliestOpenAt: r.earliest_open_at,
        latestActivityAt: r.latest_activity_at,
        stagesPresent: r.stages_present || [],
        contactsCount: r.contacts_count || 0,
        computedAt: r.computed_at,
      })),
      ghlPipelineTotals: {
        openCount: (ghlPipelines.data || []).reduce((s: number, r: any) => s + (r.open_count || 0), 0),
        wonCount:  (ghlPipelines.data || []).reduce((s: number, r: any) => s + (r.won_count  || 0), 0),
        openValueAud: (ghlPipelines.data || []).reduce((s: number, r: any) => s + Number(r.open_value_aud || 0), 0),
        wonValueAud:  (ghlPipelines.data || []).reduce((s: number, r: any) => s + Number(r.won_value_aud  || 0), 0),
        pipelinesActive: (ghlPipelines.data || []).length,
      },
      // 2026-05-23: supporters funding this project
      projectSupporters: (projectSupporters.data || []).map((s: any) => ({
        slug: s.slug,
        name: s.name,
        tier: s.tier,
        stage: s.stage,
        totalPaidAud: Number(s.total_paid_aud || 0),
        outstandingAud: Number(s.outstanding_aud || 0),
        outstandingAlert: s.outstanding_alert,
        primaryContact: s.primary_contact,
        lastCommunicatedAt: s.last_communicated_at,
        daysSinceLastContact: s.days_since_last_contact,
        openOppCount: s.open_opp_count || 0,
        openOppValueAud: Number(s.open_opp_value_aud || 0),
        wonOppCount: s.won_opp_count || 0,
        wonOppValueAud: Number(s.won_opp_value_aud || 0),
      })),
      projectSupportersTotals: {
        count: (projectSupporters.data || []).length,
        totalPaidAud: (projectSupporters.data || []).reduce((s: number, r: any) => s + Number(r.total_paid_aud || 0), 0),
        totalOutstandingAud: (projectSupporters.data || []).reduce((s: number, r: any) => s + Number(r.outstanding_aud || 0), 0),
        critical: (projectSupporters.data || []).filter((r: any) => r.outstanding_alert === 'CRITICAL').length,
      },
      // 2026-05-23: funder briefs for this project (QBE-HQ pattern generalised)
      funderBriefs: (funderBriefs.data || []).map((r: any) => ({
        id: r.id,
        funderSlug: r.funder_slug,
        briefTitle: r.brief_title,
        status: r.status,
        asksFromThem: r.asks_from_them || [],
        askAmountAud: r.ask_amount_aud,
        askOutcome: r.ask_outcome,
        askStatus: r.ask_status,
        alignmentStatus: r.alignment_status,
        alignmentNotes: r.alignment_notes,
        procurementDeliveredCount: r.procurement_delivered_count,
        procurementUnit: r.procurement_unit,
        procurementDemandCount: r.procurement_demand_count,
        procurementNotes: r.procurement_notes,
        strategyTheirPriorities: r.strategy_their_priorities || [],
        strategyOurClaims: r.strategy_our_claims || [],
        nextMove: r.next_move,
        nextMoveOwner: r.next_move_owner,
        nextMoveDue: r.next_move_due,
        notionHqUrl: r.notion_hq_url,
        lastFeedbackDate: r.last_feedback_date,
        lastFeedbackSummary: r.last_feedback_summary,
      })),
      // NEW: Expense invoices
      expenses: expenseData,
      expensesByCategory,
      topVendors,
      totalExpenseInvoices,
      // S4 2026-05-21: burn-rate + runway impact metrics
      burnMetrics,
      // S1 2026-05-21: funder allocations + drawdowns
      funding: fundingData,
      fundingSummary,
      // Item 4 2026-05-21: linked contacts from contact_project_links
      contacts: contactsData,
      contactsSummary,
      // Card spend from bank statement lines
      cardSpend: (() => {
        const row = (cardSpendResult?.data || [])[0] || {}
        const totalSpend = Number(row.total_spend || 0)
        const matchedValue = Number(row.matched_value || 0)
        const unmatchedValue = Number(row.unmatched_value || 0)
        const coveredCount = Number(row.matched_count || 0) + Number(row.no_receipt_count || 0)
        const totalLines = Number(row.total_lines || 0)
        return {
          totalLines,
          totalSpend: Math.round(totalSpend),
          matchedCount: Number(row.matched_count || 0),
          matchedValue: Math.round(matchedValue),
          noReceiptCount: Number(row.no_receipt_count || 0),
          unmatchedCount: Number(row.unmatched_count || 0),
          unmatchedValue: Math.round(unmatchedValue),
          coveragePct: totalLines > 0 ? Math.round((coveredCount / totalLines) * 100) : 0,
          rdEligible: row.rd_eligible || false,
          rdOffset: row.rd_eligible ? Math.round(totalSpend * 0.435) : 0,
        }
      })(),
    })
  } catch (error) {
    console.error('Error in project monthly financials:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
