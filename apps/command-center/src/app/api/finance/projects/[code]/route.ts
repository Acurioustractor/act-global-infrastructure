import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const projectCode = decodeURIComponent(code).toUpperCase()

    // Parallel fetch monthly financials, variance notes, transactions, budgets, R&D vendors, invoices, pipeline
    const [monthly, variances, transactions, budgets, rdVendors, salaryAllocs, revenueStreams, invoiceMappings, expenseInvoices, pipeline, cardSpendResult] = await Promise.all([
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

    return NextResponse.json({
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
      // NEW: Expense invoices
      expenses: expenseData,
      expensesByCategory,
      topVendors,
      totalExpenseInvoices,
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
