import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── Matching functions ──────────────────────────────────────────

function bigrams(str: string) {
  const s = (str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const pairs: string[] = []
  for (let i = 0; i < s.length - 1; i++) pairs.push(s.slice(i, i + 2))
  return pairs
}

function similarity(a: string, b: string) {
  const ba = bigrams(a)
  const bb = bigrams(b)
  if (!ba.length || !bb.length) return 0
  const setB = new Set(bb)
  const matches = ba.filter(p => setB.has(p)).length
  return (2 * matches) / (ba.length + bb.length)
}

function vendorScore(candidateVendor: string, payee: string, particulars: string) {
  const cv = (candidateVendor || '').toLowerCase()
  const sp = (payee || '').toLowerCase()
  const spart = (particulars || '').toLowerCase()

  if (spart.includes(cv) || cv.includes(sp)) return 1.0
  if (sp.includes(cv) || cv.includes(sp)) return 0.95

  return Math.max(similarity(cv, sp), similarity(cv, spart))
}

function dateScore(candidateDate: string, statementDate: string) {
  if (!candidateDate || !statementDate) return 0
  const cd = new Date(candidateDate).getTime()
  const sd = new Date(statementDate).getTime()
  const daysDiff = Math.abs((cd - sd) / 86400000)
  if (daysDiff <= 1) return 1.0
  if (daysDiff <= 3) return 0.9
  if (daysDiff <= 7) return 0.7
  if (daysDiff <= 14) return 0.4
  if (daysDiff <= 30) return 0.1
  return 0
}

function amountScore(candidateAmt: number, statementAmt: number) {
  const c = Math.abs(candidateAmt || 0)
  const s = Math.abs(statementAmt || 0)
  if (!c || !s) return 0
  if (Math.abs(c - s) < 0.01) return 1.0

  // GST tolerance
  if (Math.abs(c * 1.1 - s) / s < 0.02) return 0.95
  if (Math.abs(c / 1.1 - s) / s < 0.02) return 0.95

  const pctDiff = Math.abs(c - s) / Math.max(c, s)
  if (pctDiff < 0.05) return 0.8
  if (pctDiff < 0.10) return 0.5
  if (pctDiff < 0.20) return 0.2
  return 0
}

interface Candidate {
  type: 'bill' | 'receipt_email'
  id: string
  vendor: string
  amount: number
  date: string
  label: string
  invoiceNumber?: string
  source?: string
}

function compositeScore(candidate: Candidate, payee: string, particulars: string, amount: number, date: string) {
  const v = vendorScore(candidate.vendor, payee, particulars)
  const d = dateScore(candidate.date, date)
  const a = amountScore(candidate.amount, amount)
  return (a * 0.40) + (v * 0.35) + (d * 0.25)
}

// ── GET: Inbox items with candidate matches ─────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const quarterParam = searchParams.get('quarter') || 'Q2'

    // Quarter dates
    const now = new Date()
    const fy = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
    const quarters: Record<string, [string, string]> = {
      Q1: [`${fy}-07-01`, `${fy}-09-30`],
      Q2: [`${fy}-10-01`, `${fy}-12-31`],
      Q3: [`${fy + 1}-01-01`, `${fy + 1}-03-31`],
      Q4: [`${fy + 1}-04-01`, `${fy + 1}-06-30`],
    }
    const [dateStart, dateEnd] = quarters[quarterParam] || quarters.Q2

    // Load unmatched + ambiguous BSL lines
    const { data: lines } = await supabase
      .from('bank_statement_lines')
      .select('id, date, payee, particulars, amount, project_code, project_source, receipt_match_status, receipt_match_score, notes, rd_eligible')
      .eq('direction', 'debit')
      .in('receipt_match_status', ['unmatched', 'ambiguous'])
      .gte('date', dateStart)
      .lte('date', dateEnd)
      .order('amount', { ascending: true }) // largest debits first

    if (!lines || lines.length === 0) {
      return NextResponse.json({ items: [], candidatePool: { bills: 0, receipts: 0 } })
    }

    // Load candidate pools (bills + receipt emails) in parallel
    const [billsResult, receiptsResult] = await Promise.all([
      supabase
        .from('xero_invoices')
        .select('id, xero_id, contact_name, total, date, has_attachments, invoice_number, status')
        .eq('type', 'ACCPAY')
        .eq('has_attachments', true)
        .neq('status', 'VOIDED')
        .gte('date', dateStart)
        .lte('date', dateEnd)
        .limit(500),

      supabase
        .from('receipt_emails')
        .select('id, vendor_name, amount_detected, received_at, source, status')
        .gte('received_at', dateStart)
        .not('status', 'in', '("duplicate","junk")')
        .limit(1000),
    ])

    // Build candidate array
    const candidates: Candidate[] = []

    for (const bill of billsResult.data || []) {
      candidates.push({
        type: 'bill',
        id: bill.id,
        vendor: bill.contact_name || '',
        amount: Math.abs(Number(bill.total)),
        date: bill.date,
        label: `${bill.contact_name}`,
        invoiceNumber: bill.invoice_number,
      })
    }

    for (const receipt of receiptsResult.data || []) {
      candidates.push({
        type: 'receipt_email',
        id: receipt.id,
        vendor: receipt.vendor_name || '',
        amount: Number(receipt.amount_detected || 0),
        date: receipt.received_at,
        label: `${receipt.vendor_name}`,
        source: receipt.source,
      })
    }

    // For each unmatched line, find top 3 candidates
    const items = lines.map(line => {
      const amt = Math.abs(Number(line.amount))
      const scored = candidates
        .map(c => ({
          ...c,
          score: compositeScore(c, line.payee || '', line.particulars || '', amt, line.date),
        }))
        .filter(c => c.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)

      const gstAtRisk = amt > 82.50 ? Math.round(amt / 11) : 0
      const rdAtRisk = line.rd_eligible ? Math.round(amt * 0.435) : 0

      return {
        id: line.id,
        date: line.date,
        payee: line.payee,
        particulars: line.particulars,
        amount: amt,
        projectCode: line.project_code,
        status: line.receipt_match_status,
        rdEligible: line.rd_eligible || false,
        gstAtRisk,
        rdAtRisk,
        notes: line.notes,
        candidates: scored.map(c => ({
          type: c.type,
          id: c.id,
          vendor: c.vendor,
          amount: c.amount,
          date: c.date,
          score: Math.round(c.score * 100),
          label: c.label,
          invoiceNumber: c.invoiceNumber,
          source: c.source,
        })),
      }
    })

    return NextResponse.json({
      items,
      candidatePool: {
        bills: (billsResult.data || []).length,
        receipts: (receiptsResult.data || []).length,
      },
      quarter: quarterParam,
      dateStart,
      dateEnd,
    })
  } catch (e) {
    console.error('Inbox API error:', e)
    return NextResponse.json({ error: 'Failed to load inbox' }, { status: 500 })
  }
}

// ── POST: Resolve an inbox item ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lineId, action, candidateId, candidateType, projectCode } = body as {
      lineId: string
      action: 'match' | 'no_receipt' | 'dismiss' | 'tag'
      candidateId?: string
      candidateType?: string
      projectCode?: string
    }

    if (!lineId || !action) {
      return NextResponse.json({ error: 'lineId and action required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}

    switch (action) {
      case 'match':
        if (!candidateId) {
          return NextResponse.json({ error: 'candidateId required for match' }, { status: 400 })
        }
        updates.receipt_match_status = 'matched'
        updates.receipt_match_id = candidateId
        updates.receipt_match_score = 1.0 // manual match = full confidence
        updates.notes = `Manual match to ${candidateType || 'unknown'} ${candidateId}`
        break

      case 'no_receipt':
        updates.receipt_match_status = 'no_receipt_needed'
        updates.notes = 'Marked no receipt needed via inbox'
        break

      case 'dismiss':
        // Keep as unmatched but add note
        updates.notes = 'Reviewed — no matching receipt found'
        break

      case 'tag':
        if (!projectCode) {
          return NextResponse.json({ error: 'projectCode required for tag' }, { status: 400 })
        }
        updates.project_code = projectCode
        updates.project_source = 'manual'
        break
    }

    const { error } = await supabase
      .from('bank_statement_lines')
      .update(updates)
      .eq('id', lineId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, action, lineId })
  } catch (e) {
    console.error('Inbox action error:', e)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}
