import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

type FlowStage = 'card_spend' | 'receipt_found' | 'in_dext' | 'xero_matched' | 'tagged' | 'reconciled'

interface StageSummary {
  stage: FlowStage
  label: string
  count: number
  amount: number
  items: StageItem[]
}

interface StageItem {
  id: string
  vendor: string
  amount: number
  date: string
  type?: string
  project_code?: string | null
  confidence?: number | null
  dext_id?: string | null
  file_type?: string | null
  days_old: number
}

// ── GET Handler ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const [
      cardSpend,
      receiptFound,
      inDext,
      xeroMatched,
      tagged,
      reconciled,
      vendorGaps,
      forwarding,
    ] = await Promise.all([
      fetchCardSpend(),
      fetchReceiptFound(),
      fetchInDext(),
      fetchXeroMatched(),
      fetchTagged(),
      fetchReconciled(),
      fetchVendorGaps(),
      fetchForwardingStatus(),
    ])

    const stages: StageSummary[] = [
      cardSpend,
      receiptFound,
      inDext,
      xeroMatched,
      tagged,
      reconciled,
    ]

    // Overall flow metrics
    const totalSpend = cardSpend.count + receiptFound.count + inDext.count + xeroMatched.count + tagged.count + reconciled.count
    const totalAmount = cardSpend.amount + receiptFound.amount + inDext.amount + xeroMatched.amount + tagged.amount + reconciled.amount

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      stages,
      kpis: {
        totalTransactions: totalSpend,
        totalAmount: Math.round(totalAmount),
        receiptCoverage: totalSpend > 0
          ? Math.round(((inDext.count + xeroMatched.count + tagged.count + reconciled.count) / totalSpend) * 100)
          : 0,
        tagCoverage: totalSpend > 0
          ? Math.round(((tagged.count + reconciled.count) / totalSpend) * 100)
          : 0,
        reconciliationRate: totalSpend > 0
          ? Math.round((reconciled.count / totalSpend) * 100)
          : 0,
        missingReceiptValue: Math.round(cardSpend.amount),
        stuckInDext: inDext.count,
        vendorGaps: vendorGaps.length,
      },
      vendorGaps,
      forwarding,
    })
  } catch (error) {
    console.error('Finance flow API error:', error)
    return NextResponse.json({ error: 'Failed to fetch flow data' }, { status: 500 })
  }
}

// ── Stage 1: Card Spend (no receipt, not in Dext) ─────────────────────

async function fetchCardSpend(): Promise<StageSummary> {
  // SPEND/ACCPAY with no attachments and no dext receipt match
  const { data, count } = await supabase
    .from('xero_transactions')
    .select('id, contact_name, total, date, type, project_code', { count: 'exact' })
    .in('type', ['SPEND', 'ACCPAY'])
    .or('has_attachments.is.null,has_attachments.eq.false')
    .is('project_code', null)
    .not('is_reconciled', 'eq', true)
    .order('date', { ascending: false })
    .limit(20)

  const totalAmount = await sumTransactions('SPEND/ACCPAY no-attach no-tag no-recon')

  const items: StageItem[] = (data || []).map((tx: any) => ({
    id: tx.id,
    vendor: tx.contact_name || '(unknown)',
    amount: Math.abs(Number(tx.total) || 0),
    date: tx.date,
    type: tx.type,
    project_code: tx.project_code,
    days_old: Math.round((Date.now() - new Date(tx.date).getTime()) / 86400000),
  }))

  return {
    stage: 'card_spend',
    label: 'Card Spend (No Receipt)',
    count: count || 0,
    amount: totalAmount,
    items,
  }
}

async function sumTransactions(label: string): Promise<number> {
  // Sum unattached, untagged, unreconciled SPEND
  const { data } = await supabase
    .from('xero_transactions')
    .select('total')
    .in('type', ['SPEND', 'ACCPAY'])
    .or('has_attachments.is.null,has_attachments.eq.false')
    .is('project_code', null)
    .not('is_reconciled', 'eq', true)

  return (data || []).reduce((s: number, t: any) => s + Math.abs(Number(t.total) || 0), 0)
}

// ── Stage 2: Receipt Found (forwarded to Dext, not yet processed) ─────

async function fetchReceiptFound(): Promise<StageSummary> {
  const { data, count } = await supabase
    .from('dext_forwarded_emails')
    .select('id, vendor, subject, original_date, mailbox', { count: 'exact' })
    .order('forwarded_at', { ascending: false })
    .limit(20)

  const items: StageItem[] = (data || []).map((r: any) => ({
    id: String(r.id),
    vendor: r.vendor || '(unknown)',
    amount: 0,
    date: r.original_date || '',
    days_old: r.original_date ? Math.round((Date.now() - new Date(r.original_date).getTime()) / 86400000) : 0,
  }))

  return {
    stage: 'receipt_found',
    label: 'Receipt Found (Forwarded)',
    count: count || 0,
    amount: 0,
    items,
  }
}

// ── Stage 3: In Dext (receipt exists but not matched to Xero) ─────────

async function fetchInDext(): Promise<StageSummary> {
  const { data, count } = await supabase
    .from('dext_receipts')
    .select('id, vendor_name, receipt_date, dext_id, file_type, match_confidence', { count: 'exact' })
    .is('xero_transaction_id', null)
    .order('receipt_date', { ascending: false })
    .limit(20)

  const items: StageItem[] = (data || []).map((r: any) => ({
    id: r.id,
    vendor: r.vendor_name || '(unknown)',
    amount: 0,
    date: r.receipt_date || '',
    dext_id: r.dext_id,
    file_type: r.file_type,
    days_old: r.receipt_date ? Math.round((Date.now() - new Date(r.receipt_date).getTime()) / 86400000) : 0,
  }))

  return {
    stage: 'in_dext',
    label: 'In Dext (Unmatched)',
    count: count || 0,
    amount: 0,
    items,
  }
}

// ── Stage 4: Xero Matched (has attachment, not tagged) ────────────────

async function fetchXeroMatched(): Promise<StageSummary> {
  const { data, count } = await supabase
    .from('xero_transactions')
    .select('id, contact_name, total, date, type', { count: 'exact' })
    .in('type', ['SPEND', 'ACCPAY'])
    .eq('has_attachments', true)
    .is('project_code', null)
    .order('date', { ascending: false })
    .limit(20)

  let totalAmount = 0
  // Get full amount
  const { data: allData } = await supabase
    .from('xero_transactions')
    .select('total')
    .in('type', ['SPEND', 'ACCPAY'])
    .eq('has_attachments', true)
    .is('project_code', null)

  totalAmount = (allData || []).reduce((s: number, t: any) => s + Math.abs(Number(t.total) || 0), 0)

  const items: StageItem[] = (data || []).map((tx: any) => ({
    id: tx.id,
    vendor: tx.contact_name || '(unknown)',
    amount: Math.abs(Number(tx.total) || 0),
    date: tx.date,
    type: tx.type,
    days_old: Math.round((Date.now() - new Date(tx.date).getTime()) / 86400000),
  }))

  return {
    stage: 'xero_matched',
    label: 'Xero Matched (Needs Tag)',
    count: count || 0,
    amount: totalAmount,
    items,
  }
}

// ── Stage 5: Tagged (has project code, not reconciled) ────────────────

async function fetchTagged(): Promise<StageSummary> {
  const { data, count } = await supabase
    .from('xero_transactions')
    .select('id, contact_name, total, date, type, project_code', { count: 'exact' })
    .in('type', ['SPEND', 'ACCPAY'])
    .not('project_code', 'is', null)
    .not('is_reconciled', 'eq', true)
    .order('date', { ascending: false })
    .limit(20)

  let totalAmount = 0
  const { data: allData } = await supabase
    .from('xero_transactions')
    .select('total')
    .in('type', ['SPEND', 'ACCPAY'])
    .not('project_code', 'is', null)
    .not('is_reconciled', 'eq', true)

  totalAmount = (allData || []).reduce((s: number, t: any) => s + Math.abs(Number(t.total) || 0), 0)

  const items: StageItem[] = (data || []).map((tx: any) => ({
    id: tx.id,
    vendor: tx.contact_name || '(unknown)',
    amount: Math.abs(Number(tx.total) || 0),
    date: tx.date,
    type: tx.type,
    project_code: tx.project_code,
    days_old: Math.round((Date.now() - new Date(tx.date).getTime()) / 86400000),
  }))

  return {
    stage: 'tagged',
    label: 'Tagged (Not Reconciled)',
    count: count || 0,
    amount: totalAmount,
    items,
  }
}

// ── Stage 6: Reconciled (fully done) ──────────────────────────────────

async function fetchReconciled(): Promise<StageSummary> {
  const { count } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .in('type', ['SPEND', 'ACCPAY'])
    .eq('is_reconciled', true)

  let totalAmount = 0
  const { data: allData } = await supabase
    .from('xero_transactions')
    .select('total')
    .in('type', ['SPEND', 'ACCPAY'])
    .eq('is_reconciled', true)

  totalAmount = (allData || []).reduce((s: number, t: any) => s + Math.abs(Number(t.total) || 0), 0)

  return {
    stage: 'reconciled',
    label: 'Reconciled',
    count: count || 0,
    amount: totalAmount,
    items: [], // Too many to list
  }
}

// ── Vendor Gaps ───────────────────────────────────────────────────────

async function fetchVendorGaps() {
  // Dext vendors with no vendor_project_rule
  const { data: dextVendors } = await supabase
    .from('dext_receipts')
    .select('vendor_name')

  const { data: rules } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name, aliases')

  if (!dextVendors || !rules) return []

  const ruleNames = new Set<string>()
  for (const r of rules) {
    ruleNames.add(r.vendor_name.toLowerCase())
    for (const a of r.aliases || []) ruleNames.add(a.toLowerCase())
  }

  const dextUnique = [...new Set(dextVendors.map((d: any) => d.vendor_name))]
    .filter(n => n && n !== 'Unknown Supplier')

  const gaps = dextUnique.filter(name => {
    const lower = name.toLowerCase()
    for (const rule of ruleNames) {
      if (lower.includes(rule) || rule.includes(lower)) return false
    }
    return true
  })

  // Count receipts per gap vendor
  const vendorCounts: Record<string, number> = {}
  for (const d of dextVendors) {
    if (gaps.includes(d.vendor_name)) {
      vendorCounts[d.vendor_name] = (vendorCounts[d.vendor_name] || 0) + 1
    }
  }

  return gaps
    .map(name => ({ vendor: name, receiptCount: vendorCounts[name] || 0 }))
    .sort((a, b) => b.receiptCount - a.receiptCount)
    .slice(0, 20)
}

// ── Forwarding Status ─────────────────────────────────────────────────

async function fetchForwardingStatus() {
  const { data: recent } = await supabase
    .from('dext_forwarded_emails')
    .select('forwarded_at')
    .order('forwarded_at', { ascending: false })
    .limit(1)

  const { count: totalForwarded } = await supabase
    .from('dext_forwarded_emails')
    .select('*', { count: 'exact', head: true })

  const { count: totalDextReceipts } = await supabase
    .from('dext_receipts')
    .select('*', { count: 'exact', head: true })

  const { count: matchedReceipts } = await supabase
    .from('dext_receipts')
    .select('*', { count: 'exact', head: true })
    .not('xero_transaction_id', 'is', null)

  const lastForward = recent?.[0]?.forwarded_at || null
  const hoursSince = lastForward
    ? Math.round((Date.now() - new Date(lastForward).getTime()) / 3600000)
    : null

  return {
    lastForward,
    hoursSince,
    totalForwarded: totalForwarded || 0,
    totalDextReceipts: totalDextReceipts || 0,
    matchedReceipts: matchedReceipts || 0,
    unmatchedReceipts: (totalDextReceipts || 0) - (matchedReceipts || 0),
  }
}
