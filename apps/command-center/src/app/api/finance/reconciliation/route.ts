import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getFYDates } from '@/lib/finance'

export const dynamic = 'force-dynamic'

// R&D eligible project codes (43.5% tax offset)
const RD_PROJECT_CODES = ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD']

// Australian FY quarters (Jul-Jun)
function quarterDates(quarter: string, fyStart: string): { start: string; end: string } {
  const fyYear = parseInt(fyStart.slice(0, 4))
  switch (quarter) {
    case 'Q1': return { start: `${fyYear}-07-01`, end: `${fyYear}-09-30` }
    case 'Q2': return { start: `${fyYear}-10-01`, end: `${fyYear}-12-31` }
    case 'Q3': return { start: `${fyYear + 1}-01-01`, end: `${fyYear + 1}-03-31` }
    case 'Q4': return { start: `${fyYear + 1}-04-01`, end: `${fyYear + 1}-06-30` }
    default: return { start: fyStart, end: `${fyYear + 1}-06-30` } // full FY
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const quarter = searchParams.get('quarter') || 'all' // Q1, Q2, Q3, Q4, or 'all' (full FY)
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    const fy = getFYDates()
    const { start: dateStart, end: dateEnd } = quarter === 'all'
      ? { start: fy.fyStart, end: fy.fyEnd }
      : quarterDates(quarter, fy.fyStart)

    // ── Parallel queries against bank_statement_lines ───────────────
    const [
      // Core BSL stats (debits only = spend)
      totalResult,
      matchedResult,
      noReceiptNeededResult,
      ambiguousResult,
      unmatchedResult,
      taggedResult,
      // Spend data for impact calculations
      unmatchedSpendResult,
      rdUnmatchedResult,
      // R&D summary
      rdSummaryResult,
      // Project breakdown
      projectBreakdownResult,
      // Vendor breakdown (for chase list + vendor intelligence)
      vendorBreakdownResult,
      // Bill-level receipt coverage (Xero app receipts)
      billTotalResult,
      billWithReceiptResult,
      // Subscription patterns
      subscriptionResult,
      // Receipt pipeline status
      pipelineResult,
      // Last ingested date
      lastIngestResult,
    ] = await Promise.all([
      // Total debit lines in period
      supabase
        .from('bank_statement_lines')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'debit')
        .gte('date', dateStart)
        .lte('date', dateEnd),

      // Matched to receipts
      supabase
        .from('bank_statement_lines')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'debit')
        .eq('receipt_match_status', 'matched')
        .gte('date', dateStart)
        .lte('date', dateEnd),

      // No receipt needed
      supabase
        .from('bank_statement_lines')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'debit')
        .eq('receipt_match_status', 'no_receipt_needed')
        .gte('date', dateStart)
        .lte('date', dateEnd),

      // Ambiguous matches (need human review)
      supabase
        .from('bank_statement_lines')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'debit')
        .eq('receipt_match_status', 'ambiguous')
        .gte('date', dateStart)
        .lte('date', dateEnd),

      // Unmatched
      supabase
        .from('bank_statement_lines')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'debit')
        .eq('receipt_match_status', 'unmatched')
        .gte('date', dateStart)
        .lte('date', dateEnd),

      // Tagged with project code
      supabase
        .from('bank_statement_lines')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'debit')
        .not('project_code', 'is', null)
        .gte('date', dateStart)
        .lte('date', dateEnd),

      // Unmatched spend (for financial impact) — need amounts
      supabase
        .from('bank_statement_lines')
        .select('id, payee, particulars, amount, date, project_code, receipt_match_status, receipt_match_score')
        .eq('direction', 'debit')
        .eq('receipt_match_status', 'unmatched')
        .gte('date', dateStart)
        .lte('date', dateEnd)
        .order('amount', { ascending: false })
        .limit(500),

      // R&D-tagged unmatched spend
      supabase
        .from('bank_statement_lines')
        .select('amount')
        .eq('direction', 'debit')
        .eq('receipt_match_status', 'unmatched')
        .in('project_code', RD_PROJECT_CODES)
        .gte('date', dateStart)
        .lte('date', dateEnd),

      // R&D summary (total eligible spend + coverage)
      supabase.rpc('exec_sql', {
        query: `
          SELECT
            count(*)::int as total_lines,
            round(sum(abs(amount))::numeric, 2) as total_spend,
            count(*) FILTER (WHERE receipt_match_status IN ('matched', 'no_receipt_needed'))::int as covered_count,
            round(sum(abs(amount)) FILTER (WHERE receipt_match_status IN ('matched', 'no_receipt_needed'))::numeric, 2) as covered_value,
            count(*) FILTER (WHERE receipt_match_status = 'unmatched')::int as unmatched_count,
            round(sum(abs(amount)) FILTER (WHERE receipt_match_status = 'unmatched')::numeric, 2) as unmatched_value
          FROM bank_statement_lines
          WHERE direction = 'debit'
            AND rd_eligible = TRUE
            AND date >= '${dateStart}' AND date <= '${dateEnd}'
        `,
      }),

      // Project breakdown — aggregated spend per project
      supabase.rpc('exec_sql', {
        query: `
          SELECT
            project_code,
            count(*)::int as line_count,
            round(sum(abs(amount))::numeric, 2) as total_spend,
            count(*) FILTER (WHERE receipt_match_status = 'matched')::int as matched_count,
            round(sum(abs(amount)) FILTER (WHERE receipt_match_status = 'matched')::numeric, 2) as matched_value,
            count(*) FILTER (WHERE receipt_match_status = 'no_receipt_needed')::int as no_receipt_count,
            count(*) FILTER (WHERE receipt_match_status = 'unmatched')::int as unmatched_count,
            round(sum(abs(amount)) FILTER (WHERE receipt_match_status = 'unmatched')::numeric, 2) as unmatched_value
          FROM bank_statement_lines
          WHERE direction = 'debit'
            AND date >= '${dateStart}' AND date <= '${dateEnd}'
          GROUP BY project_code
          ORDER BY total_spend DESC
        `,
      }),

      // Vendor breakdown for intelligence
      supabase.rpc('exec_sql', {
        query: `
          SELECT
            payee,
            count(*)::int as line_count,
            round(sum(abs(amount))::numeric, 2) as total_spend,
            count(*) FILTER (WHERE receipt_match_status = 'matched')::int as matched_count,
            count(*) FILTER (WHERE receipt_match_status = 'no_receipt_needed')::int as no_receipt_count,
            count(*) FILTER (WHERE receipt_match_status = 'unmatched')::int as unmatched_count,
            round(sum(abs(amount)) FILTER (WHERE receipt_match_status = 'unmatched')::numeric, 2) as unmatched_value,
            array_agg(DISTINCT project_code) FILTER (WHERE project_code IS NOT NULL) as project_codes
          FROM bank_statement_lines
          WHERE direction = 'debit'
            AND date >= '${dateStart}' AND date <= '${dateEnd}'
          GROUP BY payee
          ORDER BY unmatched_value DESC NULLS LAST
        `,
      }),

      // Bill-level receipt coverage (Xero app receipts live on bills)
      supabase
        .from('xero_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'ACCPAY')
        .gte('date', dateStart)
        .lte('date', dateEnd),

      supabase
        .from('xero_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'ACCPAY')
        .gte('date', dateStart)
        .lte('date', dateEnd)
        .eq('has_attachments', true),

      // Subscription patterns (all active)
      supabase
        .from('subscription_patterns')
        .select('id, vendor_name, vendor_pattern, expected_amount, frequency, project_code, last_seen_at, no_receipt_needed')
        .eq('active', true)
        .order('vendor_name'),

      // Receipt pipeline status
      supabase.rpc('exec_sql', {
        query: `SELECT status, count(*)::int as count FROM receipt_emails GROUP BY status ORDER BY count DESC`,
      }),

      // Last ingested statement line date
      supabase
        .from('bank_statement_lines')
        .select('date, created_at')
        .order('date', { ascending: false })
        .limit(1),
    ])

    // ── Compute BAS readiness ──────────────────────────────────────
    const totalCount = totalResult.count || 0
    const matchedCount = matchedResult.count || 0
    const noReceiptCount = noReceiptNeededResult.count || 0
    const ambiguousCount = ambiguousResult.count || 0
    const unmatchedCount = unmatchedResult.count || 0
    const taggedCount = taggedResult.count || 0

    const coveredCount = matchedCount + noReceiptCount
    const coveragePct = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0
    const taggedPct = totalCount > 0 ? Math.round((taggedCount / totalCount) * 100) : 0

    // ── Financial impact ───────────────────────────────────────────
    const unmatchedLines = unmatchedSpendResult.data || []
    const totalUnmatchedSpend = unmatchedLines.reduce(
      (sum, l) => sum + Math.abs(Number(l.amount) || 0), 0
    )

    // GST at risk: 1/11 of unmatched spend > $82.50
    const gstEligibleSpend = unmatchedLines
      .filter(l => Math.abs(Number(l.amount) || 0) > 82.5)
      .reduce((sum, l) => sum + Math.abs(Number(l.amount) || 0), 0)
    const gstAtRisk = Math.round(gstEligibleSpend / 11)

    // R&D offset at risk: 43.5% of R&D-tagged unmatched spend
    const rdUnmatchedSpend = (rdUnmatchedResult.data || []).reduce(
      (sum, l) => sum + Math.abs(Number(l.amount) || 0), 0
    )
    const rdOffsetAtRisk = Math.round(rdUnmatchedSpend * 0.435)

    // ── Chase list (unmatched > $82.50, sorted by amount) ─────────
    const chaseList = unmatchedLines
      .filter(l => Math.abs(Number(l.amount) || 0) > 82.5)
      .slice(0, 50)
      .map(l => ({
        id: l.id,
        payee: l.payee,
        particulars: l.particulars,
        amount: Math.abs(Number(l.amount)),
        date: l.date,
        projectCode: l.project_code,
      }))

    // ── Project breakdown ──────────────────────────────────────────
    const projectBreakdown = (projectBreakdownResult.data || []).map((p: Record<string, unknown>) => ({
      projectCode: p.project_code || 'Untagged',
      lineCount: p.line_count,
      totalSpend: Number(p.total_spend),
      matchedCount: p.matched_count,
      matchedValue: Number(p.matched_value || 0),
      noReceiptCount: p.no_receipt_count,
      unmatchedCount: p.unmatched_count,
      unmatchedValue: Number(p.unmatched_value || 0),
      coveragePct: Number(p.line_count) > 0
        ? Math.round(((Number(p.matched_count) + Number(p.no_receipt_count)) / Number(p.line_count)) * 100)
        : 0,
      rdEligible: RD_PROJECT_CODES.includes(p.project_code as string),
    }))

    // ── Vendor intelligence ────────────────────────────────────────
    const vendors = (vendorBreakdownResult.data || [])
      .filter((v: Record<string, unknown>) => Number(v.unmatched_count) > 0)
      .slice(0, 30)
      .map((v: Record<string, unknown>) => ({
        name: v.payee,
        lineCount: v.line_count,
        totalSpend: Number(v.total_spend),
        matchedCount: v.matched_count,
        noReceiptCount: v.no_receipt_count,
        unmatchedCount: v.unmatched_count,
        unmatchedValue: Number(v.unmatched_value || 0),
        projectCodes: v.project_codes || [],
      }))

    // ── Subscriptions ──────────────────────────────────────────────
    const subscriptions = subscriptionResult.data || []

    // ── Pipeline status ────────────────────────────────────────────
    const pipelineRows = pipelineResult.data || []
    const pipeline: Record<string, number> = {}
    for (const row of pipelineRows) {
      pipeline[row.status] = row.count
    }

    // ── Bill coverage (Xero app receipts) ─────────────────────────
    const billTotal = billTotalResult.count || 0
    const billWithReceipt = billWithReceiptResult.count || 0

    // ── Statement line list (if filtered) ─────────────────────────
    let lines: unknown[] = []
    if (status !== 'all') {
      let query = supabase
        .from('bank_statement_lines')
        .select('id, date, payee, particulars, amount, direction, project_code, project_source, receipt_match_status, receipt_match_score, receipt_match_id, notes')
        .eq('direction', 'debit')
        .gte('date', dateStart)
        .lte('date', dateEnd)
        .order('date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (status === 'unmatched') {
        query = query.eq('receipt_match_status', 'unmatched')
      } else if (status === 'ambiguous') {
        query = query.eq('receipt_match_status', 'ambiguous')
      } else if (status === 'matched') {
        query = query.eq('receipt_match_status', 'matched')
      } else if (status === 'no_receipt') {
        query = query.eq('receipt_match_status', 'no_receipt_needed')
      } else if (status === 'untagged') {
        query = query.is('project_code', null)
      }

      const { data: lineData } = await query
      lines = lineData || []
    }

    // ── Available quarters (based on data) ────────────────────────
    const lastDate = lastIngestResult.data?.[0]?.date || null
    const lastIngestedAt = lastIngestResult.data?.[0]?.created_at || null

    return NextResponse.json({
      // Period info
      quarter,
      dateStart,
      dateEnd,
      fyStart: fy.fyStart,

      // BAS readiness
      bas: {
        total: totalCount,
        matched: matchedCount,
        noReceiptNeeded: noReceiptCount,
        ambiguous: ambiguousCount,
        unmatched: unmatchedCount,
        covered: coveredCount,
        coveragePct,
        tagged: taggedCount,
        taggedPct,
      },

      // Financial impact
      impact: {
        totalUnmatchedSpend: Math.round(totalUnmatchedSpend),
        gstAtRisk,
        rdUnmatchedSpend: Math.round(rdUnmatchedSpend),
        rdOffsetAtRisk,
        totalAtRisk: gstAtRisk + rdOffsetAtRisk,
      },

      // R&D summary
      rd: (() => {
        const row = (rdSummaryResult.data || [])[0] || {}
        const totalSpend = Number(row.total_spend || 0)
        const coveredValue = Number(row.covered_value || 0)
        const unmatchedValue = Number(row.unmatched_value || 0)
        return {
          totalLines: Number(row.total_lines || 0),
          totalSpend: Math.round(totalSpend),
          coveredCount: Number(row.covered_count || 0),
          coveredValue: Math.round(coveredValue),
          unmatchedCount: Number(row.unmatched_count || 0),
          unmatchedValue: Math.round(unmatchedValue),
          coveragePct: totalSpend > 0 ? Math.round((coveredValue / totalSpend) * 100) : 0,
          potentialOffset: Math.round(totalSpend * 0.435),
          offsetAtRisk: Math.round(unmatchedValue * 0.435),
        }
      })(),

      // Chase list — high-value unmatched items
      chaseList,

      // Project breakdown
      projects: projectBreakdown,

      // Vendor intelligence
      vendors,

      // Subscriptions
      subscriptions,

      // Bill coverage
      bills: {
        total: billTotal,
        withReceipt: billWithReceipt,
        receiptPct: billTotal > 0 ? Math.round((billWithReceipt / billTotal) * 100) : 0,
        missing: billTotal - billWithReceipt,
      },

      // Receipt pipeline
      pipeline,

      // Metadata
      lastDate,
      lastIngestedAt,

      // Filtered line list
      lines,
      page,
      limit,
    }, {
      headers: {
        'Cache-Control': 's-maxage=120, stale-while-revalidate=300',
      },
    })
  } catch (e) {
    console.error('Reconciliation API error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, projectCode, receiptStatus, notes } = body as {
      ids: string[]
      projectCode?: string
      receiptStatus?: string
      notes?: string
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }

    let updated = 0

    for (const id of ids) {
      const updates: Record<string, unknown> = {}

      if (projectCode) {
        updates.project_code = projectCode
        updates.project_source = 'manual'
      }
      if (receiptStatus) {
        updates.receipt_match_status = receiptStatus
      }
      if (notes !== undefined) {
        updates.notes = notes
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('bank_statement_lines')
          .update(updates)
          .eq('id', id)
        if (!error) updated++
      }
    }

    return NextResponse.json({ updated, total: ids.length })
  } catch (e) {
    console.error('Reconciliation update error:', e)
    return NextResponse.json(
      { error: 'Failed to update statement lines' },
      { status: 500 }
    )
  }
}
