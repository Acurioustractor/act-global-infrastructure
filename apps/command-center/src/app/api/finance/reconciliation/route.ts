import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// R&D eligible project codes (43.5% tax offset)
const RD_PROJECT_CODES = ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD']

// Vendors that send email receipts (auto-resolvable via pipeline)
const EMAIL_RECEIPT_VENDORS = new Set([
  'uber', 'qantas', 'openai', 'anthropic', 'claude', 'chatgpt', 'firecrawl',
  'spotify', 'docplay', 'midjourney', 'hellofresh', 'cursor', 'vidzflow',
  'xero', 'highlevel', 'webflow', 'linkedin', 'dialpad', 'vercel',
  'google', 'apple', 'microsoft', 'amazon', 'aws', 'github', 'netlify',
  'stripe', 'canva', 'notion', 'slack', 'zoom', 'figma', 'dropbox',
  'docplay', 'jetstar', 'virgin', 'budget', 'hertz', 'avis',
  'booking.com', 'airbnb',
])

// Vendors where receipts are never needed (bank fees, transfers)
const NO_RECEIPT_VENDORS = new Set([
  'nab', 'national australia bank', 'commonwealth bank', 'westpac', 'anz',
])

function vendorCategory(name: string): 'bank_fee' | 'email_receipt' | 'manual' {
  const lower = (name || '').toLowerCase().trim()
  for (const v of NO_RECEIPT_VENDORS) {
    if (lower.includes(v)) return 'bank_fee'
  }
  for (const v of EMAIL_RECEIPT_VENDORS) {
    if (lower.includes(v)) return 'email_receipt'
  }
  return 'manual'
}

// Australian FY start
const FY_START = '2025-07-01'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const view = searchParams.get('view') || 'intelligence' // 'intelligence' | 'list'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    // ── Parallel queries ────────────────────────────────────────────
    const [
      totalResult,
      taggedResult,
      reconciledResult,
      withReceiptResult,
      spendNoReceiptResult,
      vendorBreakdownResult,
      rdNoReceiptResult,
      pipelineResult,
      receiptMatchesResult,
      lastSyncResult,
      // Bill-level receipt coverage (Xero app receipts live here)
      billTotalResult,
      billWithReceiptResult,
      billTaggedResult,
    ] = await Promise.all([
      // FY26 total transactions
      supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('date', FY_START),

      // FY26 tagged
      supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('date', FY_START)
        .not('project_code', 'is', null),

      // FY26 reconciled
      supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('date', FY_START)
        .eq('is_reconciled', true),

      // FY26 with receipt (bank transaction level)
      supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('date', FY_START)
        .eq('has_attachments', true),

      // FY26 SPEND without receipts (the gap — bank transaction level)
      supabase
        .from('xero_transactions')
        .select('id, contact_name, total, date, project_code, type')
        .gte('date', FY_START)
        .eq('type', 'SPEND')
        .or('has_attachments.is.null,has_attachments.eq.false')
        .order('date', { ascending: false })
        .limit(1000),

      // FY26 SPEND by vendor (for vendor intelligence)
      supabase
        .from('xero_transactions')
        .select('contact_name, total, has_attachments, project_code, type')
        .gte('date', FY_START)
        .eq('type', 'SPEND')
        .limit(2000),

      // FY26 R&D-tagged SPEND without receipts
      supabase
        .from('xero_transactions')
        .select('total')
        .gte('date', FY_START)
        .eq('type', 'SPEND')
        .or('has_attachments.is.null,has_attachments.eq.false')
        .in('project_code', RD_PROJECT_CODES),

      // Receipt pipeline status
      supabase.rpc('exec_sql', {
        query: `SELECT status, count(*)::int as count FROM receipt_emails GROUP BY status ORDER BY count DESC`,
      }),

      // Receipt matches stats
      supabase.rpc('exec_sql', {
        query: `SELECT status, count(*)::int as count FROM receipt_matches GROUP BY status ORDER BY count DESC`,
      }),

      // Last Xero sync timestamp
      supabase
        .from('xero_transactions')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1),

      // FY26 ACCPAY bills total (receipts from Xero app live here)
      supabase
        .from('xero_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'ACCPAY')
        .gte('date', FY_START),

      // FY26 ACCPAY bills with attachments
      supabase
        .from('xero_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'ACCPAY')
        .gte('date', FY_START)
        .eq('has_attachments', true),

      // FY26 ACCPAY bills tagged with project
      supabase
        .from('xero_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'ACCPAY')
        .gte('date', FY_START)
        .not('project_code', 'is', null),
    ])

    // ── Compute vendor intelligence ─────────────────────────────────
    const vendorMap = new Map<string, {
      name: string
      count: number
      totalSpend: number
      withReceipt: number
      withoutReceipt: number
      rdCount: number
      category: 'bank_fee' | 'email_receipt' | 'manual'
    }>()

    for (const tx of vendorBreakdownResult.data || []) {
      const name = (tx.contact_name || 'Unknown').trim()
      const key = name.toLowerCase()
      const existing = vendorMap.get(key) || {
        name,
        count: 0,
        totalSpend: 0,
        withReceipt: 0,
        withoutReceipt: 0,
        rdCount: 0,
        category: vendorCategory(name),
      }
      existing.count++
      existing.totalSpend += Math.abs(Number(tx.total) || 0)
      if (tx.has_attachments) {
        existing.withReceipt++
      } else {
        existing.withoutReceipt++
      }
      if (RD_PROJECT_CODES.includes(tx.project_code)) {
        existing.rdCount++
      }
      vendorMap.set(key, existing)
    }

    // Sort vendors by withoutReceipt count desc, then by totalSpend desc
    const vendors = [...vendorMap.values()]
      .filter(v => v.withoutReceipt > 0)
      .sort((a, b) => b.withoutReceipt - a.withoutReceipt || b.totalSpend - a.totalSpend)
      .slice(0, 25)

    // ── Financial impact ────────────────────────────────────────────
    const spendNoReceipt = spendNoReceiptResult.data || []
    const totalSpendWithoutReceipt = spendNoReceipt.reduce(
      (sum, t) => sum + Math.abs(Number(t.total) || 0), 0
    )

    // GST at risk: 1/11 of spend > $82.50 without receipts (can't claim input tax credits)
    const gstEligibleSpend = spendNoReceipt
      .filter(t => Math.abs(Number(t.total) || 0) > 82.5)
      .reduce((sum, t) => sum + Math.abs(Number(t.total) || 0), 0)
    const gstAtRisk = Math.round(gstEligibleSpend / 11) // GST is 1/11 of GST-inclusive price

    // R&D offset at risk: 43.5% of R&D-tagged spend without receipts
    const rdSpendWithoutReceipt = (rdNoReceiptResult.data || []).reduce(
      (sum, t) => sum + Math.abs(Number(t.total) || 0), 0
    )
    const rdOffsetAtRisk = Math.round(rdSpendWithoutReceipt * 0.435)

    // Auto-resolvable estimate
    const autoResolvable = vendors
      .filter(v => v.category === 'email_receipt')
      .reduce((sum, v) => sum + v.withoutReceipt, 0)
    const autoMarkable = vendors
      .filter(v => v.category === 'bank_fee')
      .reduce((sum, v) => sum + v.withoutReceipt, 0)

    // ── Pipeline status ─────────────────────────────────────────────
    const pipelineRows = pipelineResult.data || []
    const pipeline: Record<string, number> = {}
    for (const row of pipelineRows) {
      pipeline[row.status] = row.count
    }

    const matchesRows = receiptMatchesResult.data || []
    const matches: Record<string, number> = {}
    for (const row of matchesRows) {
      matches[row.status] = row.count
    }

    // ── Summary ─────────────────────────────────────────────────────
    const totalCount = totalResult.count || 0
    const taggedCount = taggedResult.count || 0
    const reconciledCount = reconciledResult.count || 0
    const withReceiptCount = withReceiptResult.count || 0
    const lastSyncAt = lastSyncResult.data?.[0]?.updated_at || null

    // ── Transaction list (if requested) ─────────────────────────────
    let transactions: unknown[] = []
    let projects: unknown[] = []

    if (view === 'list' || status !== 'all') {
      let query = supabase
        .from('xero_transactions')
        .select('id, contact_name, total, date, type, project_code, project_code_source, bank_account, is_reconciled, has_attachments')
        .gte('date', FY_START)
        .order('date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (status === 'needs_tag') {
        query = query.is('project_code', null)
      } else if (status === 'needs_receipt') {
        query = query
          .or('has_attachments.is.null,has_attachments.eq.false')
          .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
      } else if (status === 'needs_reconcile') {
        query = query.or('is_reconciled.is.null,is_reconciled.eq.false')
      } else if (status === 'done') {
        query = query
          .not('project_code', 'is', null)
          .eq('is_reconciled', true)
      }

      const { data: txData } = await query
      transactions = txData || []

      const { data: projData } = await supabase
        .from('projects')
        .select('code, name')
        .order('code')
      projects = projData || []
    }

    // ── Bill-level coverage (Xero app receipts) ───────────────────
    const billTotal = billTotalResult.count || 0
    const billWithReceipt = billWithReceiptResult.count || 0
    const billTagged = billTaggedResult.count || 0

    return NextResponse.json({
      summary: {
        total: totalCount,
        tagged: taggedCount,
        reconciled: reconciledCount,
        withReceipt: withReceiptCount,
        taggedPct: totalCount ? Math.round((taggedCount / totalCount) * 100) : 0,
        reconciledPct: totalCount ? Math.round((reconciledCount / totalCount) * 100) : 0,
        receiptPct: totalCount ? Math.round((withReceiptCount / totalCount) * 100) : 0,
        spendWithoutReceipt: spendNoReceipt.length,
      },
      // Bill-level coverage — receipts from Xero app attach to bills, not bank txns
      bills: {
        total: billTotal,
        withReceipt: billWithReceipt,
        tagged: billTagged,
        receiptPct: billTotal ? Math.round((billWithReceipt / billTotal) * 100) : 0,
        taggedPct: billTotal ? Math.round((billTagged / billTotal) * 100) : 0,
        missingReceipt: billTotal - billWithReceipt,
        untagged: billTotal - billTagged,
      },
      impact: {
        totalSpendWithoutReceipt: Math.round(totalSpendWithoutReceipt),
        gstAtRisk,
        rdSpendWithoutReceipt: Math.round(rdSpendWithoutReceipt),
        rdOffsetAtRisk,
        totalAtRisk: gstAtRisk + rdOffsetAtRisk,
        autoResolvable,
        autoMarkable,
      },
      vendors,
      pipeline,
      matches,
      lastSyncAt,
      fyStart: FY_START,
      transactions,
      projects,
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
    const { ids, projectCode, noReceiptNeeded } = body as {
      ids: string[]
      projectCode?: string
      noReceiptNeeded?: boolean
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }

    let updated = 0

    for (const id of ids) {
      if (projectCode) {
        const { error } = await supabase
          .from('xero_transactions')
          .update({ project_code: projectCode, project_code_source: 'manual' })
          .eq('id', id)
        if (!error) updated++
      }

      if (noReceiptNeeded) {
        const { error } = await supabase
          .from('receipt_matches')
          .upsert({
            transaction_id: id,
            status: 'no_receipt_needed',
            matched_at: new Date().toISOString(),
          }, { onConflict: 'transaction_id' })
        if (!error && !projectCode) updated++
      }
    }

    return NextResponse.json({ updated, total: ids.length })
  } catch (e) {
    console.error('Reconciliation update error:', e)
    return NextResponse.json(
      { error: 'Failed to update transactions' },
      { status: 500 }
    )
  }
}
