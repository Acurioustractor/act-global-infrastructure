import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

const FY26_QUARTERS: Record<Quarter, { start: string; end: string }> = {
  Q1: { start: '2025-07-01', end: '2025-09-30' },
  Q2: { start: '2025-10-01', end: '2025-12-31' },
  Q3: { start: '2026-01-01', end: '2026-03-31' },
  Q4: { start: '2026-04-01', end: '2026-06-30' },
}

function quarterRange(quarter: string | null) {
  const q = (quarter || 'Q2').toUpperCase() as Quarter
  return FY26_QUARTERS[q] || FY26_QUARTERS.Q2
}

function isHttpUrl(value: unknown) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function storagePathFromCandidate(candidate: Record<string, unknown>) {
  const storagePath = candidate.attachment_storage_path
  if (typeof storagePath === 'string' && storagePath.length > 0) return storagePath.replace(/^receipt-attachments\//, '')

  const attachmentUrl = candidate.attachment_url
  if (typeof attachmentUrl === 'string' && attachmentUrl.length > 0 && !isHttpUrl(attachmentUrl)) {
    return attachmentUrl.replace(/^receipt-attachments\//, '')
  }

  return null
}

async function signCandidate(candidate: Record<string, unknown>) {
  const path = storagePathFromCandidate(candidate)
  if (!path) {
    return {
      ...candidate,
      signed_url: isHttpUrl(candidate.attachment_url) ? candidate.attachment_url : null,
    }
  }

  const { data } = await supabase.storage
    .from('receipt-attachments')
    .createSignedUrl(path, 3600)

  return {
    ...candidate,
    signed_url: data?.signedUrl || null,
  }
}

async function withSignedCandidates(row: Record<string, unknown>) {
  const rawCandidates = Array.isArray(row.receipt_candidates)
    ? row.receipt_candidates as Record<string, unknown>[]
    : []

  const receiptCandidates = await Promise.all(rawCandidates.map(signCandidate))
  return { ...row, receipt_candidates: receiptCandidates }
}

function safeFileName(value: string) {
  return value
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 120)
}

function asNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function activeReceiptCandidates(row: Record<string, unknown>) {
  return Array.isArray(row.receipt_candidates)
    ? row.receipt_candidates as Record<string, unknown>[]
    : []
}

const GENERIC_VENDOR_WORDS = new Set([
  'australia',
  'australian',
  'brisbane',
  'sydney',
  'melbourne',
  'mascot',
  'maleny',
  'alice',
  'springs',
  'townsville',
  'witta',
  'pty',
  'ltd',
  'limited',
  'inc',
  'llc',
  'corp',
  'corporation',
  'company',
  'group',
  'www',
  'com',
  'au',
  'internet',
  'banking',
  'transfer',
  'payment',
  'payments',
  'sales',
  'service',
  'services',
  'station',
  'store',
  'stores',
  'the',
  'and',
  'for',
  'with',
  'mount',
  'mt',
  'isa',
])

function cleanMatchText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function meaningfulTokens(value: unknown) {
  return cleanMatchText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !GENERIC_VENDOR_WORDS.has(token))
}

function vendorMatchesPayee(candidate: Record<string, unknown>, row: Record<string, unknown>) {
  const vendor = cleanMatchText(candidate.vendor_name)
  const payee = cleanMatchText(row.payee)
  if (!vendor || !payee) return false
  if (vendor.includes(payee) || payee.includes(vendor)) return true

  const payeeTokens = new Set(meaningfulTokens(payee))
  return meaningfulTokens(vendor).some((token) => payeeTokens.has(token))
}

function amountCloseEnough(candidate: Record<string, unknown>, row: Record<string, unknown>) {
  const lineAmount = Math.abs(asNumber(row.amount))
  const delta = Math.abs(asNumber(candidate.amount_delta))
  if (!lineAmount) return false
  return delta <= Math.max(1, lineAmount * 0.02)
}

function dateCloseEnough(candidate: Record<string, unknown>) {
  const matchMethod = String(candidate.match_method || '')
  if (matchMethod === 'xero_id') return true

  const rawDelta = candidate.date_delta_days
  if (rawDelta === null || rawDelta === undefined || rawDelta === '') return false

  return Math.abs(asNumber(rawDelta)) <= 14
}

function isLikelyForeignCurrencyVendor(candidate: Record<string, unknown>, row: Record<string, unknown>) {
  const text = cleanMatchText([
    candidate.vendor_name,
    candidate.subject,
    candidate.attachment_filename,
    row.payee,
    row.particulars,
  ].join(' '))
  const textTokens = new Set(text.split(' ').filter(Boolean))

  const knownVendors = [
    'anthropic',
    'claude',
    'codeguide',
    'cognition',
    'cursor',
    'descript',
    'exa',
    'figma',
    'firecrawl',
    'github',
    'holafly',
    'jetboost',
    'landingfolio',
    'mighty',
    'napkin',
    'notion',
    'openai',
    'railway',
    'serpapi',
    'sideguide',
    'supabase',
    'superdesign',
    'vercel',
    'warp',
    'webflow',
    'x global',
    'zapier',
  ]

  return knownVendors.some((vendor) => {
    const cleanedVendor = cleanMatchText(vendor)
    return cleanedVendor.includes(' ')
      ? text.includes(cleanedVendor)
      : textTokens.has(cleanedVendor)
  })
}

function hasAttachment(candidate: Record<string, unknown>) {
  return Boolean(
    candidate.attachment_url
    || candidate.attachment_storage_path
    || candidate.attachment_filename,
  )
}

function amountPlausibleForEvidence(candidate: Record<string, unknown>, row: Record<string, unknown>) {
  if (amountCloseEnough(candidate, row)) return true

  const lineAmount = Math.abs(asNumber(row.amount))
  const documentAmount = Math.abs(asNumber(candidate.amount_total))
  if (!lineAmount || !documentAmount) return false
  if (!hasAttachment(candidate)) return false
  if (!dateCloseEnough(candidate)) return false
  if (!vendorMatchesPayee(candidate, row)) return false

  const ratio = Math.max(lineAmount, documentAmount) / Math.min(lineAmount, documentAmount)
  if (ratio < 1.15 || ratio > 2.25) return false

  const source = String(candidate.source || '')
  const sourceTable = String(candidate.source_table || '')
  const currency = cleanMatchText(candidate.currency_code)

  return Boolean(
    isLikelyForeignCurrencyVendor(candidate, row)
    && (
      currency && currency !== 'aud'
      || source.includes('dext')
      || source.includes('receipt')
      || source.includes('manual')
      || source.includes('xero_me')
      || sourceTable === 'receipt_emails'
    ),
  )
}

function hasReviewableReceiptCandidate(row: Record<string, unknown>) {
  return activeReceiptCandidates(row).some((candidate) => {
    const source = String(candidate.source || '')
    const sourceTable = String(candidate.source_table || '')
    const xeroAction = String(candidate.xero_action || '')

    if (!vendorMatchesPayee(candidate, row) || !amountPlausibleForEvidence(candidate, row) || !dateCloseEnough(candidate)) {
      return false
    }

    return Boolean(
      xeroAction === 'attach_file'
      || (xeroAction === 'find_match' && hasAttachment(candidate))
      || source.includes('dext')
      || source.includes('receipt')
      || source.includes('xero_me')
      || sourceTable === 'receipt_emails',
    )
  })
}

function reviewEvidenceStatus(row: Record<string, unknown>) {
  const rawStatus = String(row.evidence_status || 'uncovered')
  const legacyNoReceipt = String(row.receipt_match_status || '') === 'no_receipt_needed'

  if (!legacyNoReceipt || !hasReviewableReceiptCandidate(row)) return rawStatus
  if (row.has_approved_link === true) return 'covered_evidence'
  if (asNumber(row.best_confidence) >= 0.85) return 'high_confidence_candidate'
  if (asNumber(row.candidate_count) > 0) return 'candidate'
  return rawStatus
}

function normalizeEvidenceRow(row: Record<string, unknown>) {
  const legacyNoReceiptCandidate = String(row.receipt_match_status || '') === 'no_receipt_needed'
    && hasReviewableReceiptCandidate(row)

  return {
    ...row,
    legacy_evidence_status: row.evidence_status,
    legacy_no_receipt_candidate: legacyNoReceiptCandidate,
    evidence_status: reviewEvidenceStatus(row),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const quarter = searchParams.get('quarter') || 'Q2'
    const status = searchParams.get('status') || 'all'
    const limit = Math.min(Number(searchParams.get('limit') || '200'), 500)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const { start, end } = quarterRange(quarter)

    const { data, error } = await supabase
      .from('v_finance_bank_line_evidence')
      .select('*')
      .eq('direction', 'debit')
      .gte('date', start)
      .lte('date', end)
      .order('amount', { ascending: false })
      .limit(2000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data || []).map((row) => normalizeEvidenceRow(row as Record<string, unknown>))
    const filtered = rows.filter((row: Record<string, unknown>) => {
      const evidenceStatus = String(row.evidence_status || '')
      const bankStatus = String(row.status || '').toLowerCase()
      const isReconciled = bankStatus === 'reconciled'
      const hasEvidence = ['covered_evidence', 'covered_legacy', 'no_receipt_needed'].includes(evidenceStatus)
      const needsReceipt = ['uncovered', 'candidate', 'high_confidence_candidate'].includes(evidenceStatus)

      if (status === 'unreconciled' && isReconciled) return false
      else if (status === 'reconciled' && !isReconciled) return false
      else if (status === 'needs_receipt' && !needsReceipt) return false
      else if (status === 'ready_to_review' && !['candidate', 'high_confidence_candidate'].includes(evidenceStatus)) return false
      else if (status === 'legacy_no_receipt_candidates' && row.legacy_no_receipt_candidate !== true) return false
      else if (status === 'covered_unreconciled' && (!hasEvidence || isReconciled)) return false
      else if (
        ![
          'all',
          'unreconciled',
          'reconciled',
          'needs_receipt',
          'ready_to_review',
          'legacy_no_receipt_candidates',
          'covered_unreconciled',
        ].includes(status)
        && evidenceStatus !== status
      ) return false

      if (!search) return true
      const haystack = `${row.payee || ''} ${row.particulars || ''} ${row.reference || ''} ${row.best_vendor_name || ''}`.toLowerCase()
      return haystack.includes(search)
    })

    const stats = rows.reduce((acc: Record<string, number>, row: Record<string, unknown>) => {
      const key = String(row.evidence_status || 'unknown')
      acc[key] = (acc[key] || 0) + 1
      acc.total = (acc.total || 0) + 1
      acc.spend = (acc.spend || 0) + Math.abs(Number(row.amount) || 0)
      if (row.legacy_no_receipt_candidate === true) acc.legacyNoReceiptCandidates = (acc.legacyNoReceiptCandidates || 0) + 1
      if (Number(row.best_confidence || 0) >= 0.85) acc.highConfidence = (acc.highConfidence || 0) + 1
      if (Number(row.candidate_count || 0) > 0) acc.withCandidates = (acc.withCandidates || 0) + 1
      if (String(row.status || '').toLowerCase() === 'reconciled') acc.bankReconciled = (acc.bankReconciled || 0) + 1
      else acc.bankUnreconciled = (acc.bankUnreconciled || 0) + 1
      if (['uncovered', 'candidate', 'high_confidence_candidate'].includes(key)) acc.needsReceipt = (acc.needsReceipt || 0) + 1
      return acc
    }, {})

    const signedRows = await Promise.all(filtered.slice(0, limit).map(withSignedCandidates))

    return NextResponse.json({
      quarter,
      dateStart: start,
      dateEnd: end,
      status,
      rows: signedRows,
      count: signedRows.length,
      totalMatchingFilter: filtered.length,
      stats,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      return await handleManualUpload(request)
    }

    const body = await request.json()
    const action = body.action as string

    if (action === 'approve_link' || action === 'reject_link' || action === 'needs_review') {
      const linkId = body.linkId as string
      if (!linkId) return NextResponse.json({ error: 'linkId required' }, { status: 400 })

      let linkStatus = action === 'approve_link'
        ? 'approved'
        : action === 'reject_link'
          ? 'rejected'
          : 'needs_review'

      if (action === 'needs_review') {
        const { data: currentLink, error: currentLinkError } = await supabase
          .from('finance_receipt_bank_line_links')
          .select('link_status')
          .eq('id', linkId)
          .single()

        if (currentLinkError) return NextResponse.json({ error: currentLinkError.message }, { status: 500 })

        // Queueing a Xero follow-up is a workflow note, not evidence rejection.
        // Preserve approval once a human has confirmed the receipt.
        if (currentLink?.link_status === 'approved') linkStatus = 'approved'
      }

      const updates = {
        link_status: linkStatus,
        review_note: body.reviewNote || null,
        review_owner: body.reviewOwner || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('finance_receipt_bank_line_links')
        .update(updates)
        .eq('id', linkId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      if (action === 'approve_link' && body.syncLegacy === true) {
        await syncApprovedLinkToBankLine(linkId)
      }

      return NextResponse.json({ ok: true, linkId, linkStatus })
    }

    if (action === 'no_receipt_needed') {
      const bankLineId = body.bankLineId as string
      if (!bankLineId) return NextResponse.json({ error: 'bankLineId required' }, { status: 400 })

      const { error } = await supabase
        .from('bank_statement_lines')
        .update({
          receipt_match_status: 'no_receipt_needed',
          notes: body.reviewNote || 'Marked no receipt needed via receipt evidence hub',
        })
        .eq('id', bankLineId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, bankLineId, receiptStatus: 'no_receipt_needed' })
    }

    return NextResponse.json({ error: 'unsupported action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

async function syncApprovedLinkToBankLine(linkId: string) {
  const { data: link, error: linkError } = await supabase
    .from('finance_receipt_bank_line_links')
    .select('id, bank_line_id, receipt_document_id, confidence')
    .eq('id', linkId)
    .single()

  if (linkError || !link) throw new Error(linkError?.message || 'link not found')

  const { data: doc, error: docError } = await supabase
    .from('finance_receipt_documents')
    .select('id, source, source_record_id, source_table')
    .eq('id', link.receipt_document_id)
    .single()

  if (docError || !doc) throw new Error(docError?.message || 'document not found')

  // The legacy bank_statement_lines.receipt_match_id field has historically
  // pointed at receipt_emails.id. Do not write xero_bill/manual document IDs
  // into it; the new evidence link itself is the coverage record for those.
  if (doc.source_table !== 'receipt_emails') return

  const updates: Record<string, unknown> = {
    receipt_match_status: 'matched',
    receipt_match_score: Number(link.confidence || 1),
    notes: `Approved receipt evidence link ${linkId}`,
  }

  updates.receipt_match_id = doc.source_record_id
  updates.matched_receipt_email_id = doc.source_record_id

  const { error } = await supabase
    .from('bank_statement_lines')
    .update(updates)
    .eq('id', link.bank_line_id)

  if (error) throw new Error(error.message)
}

async function handleManualUpload(request: NextRequest) {
  const form = await request.formData()
  const file = form.get('file')
  const bankLineId = String(form.get('bankLineId') || '')

  if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }

  const uploadFile = file as File
  const vendorName = String(form.get('vendorName') || '')
  const amountTotalRaw = String(form.get('amountTotal') || '')
  const documentDate = String(form.get('documentDate') || '')
  const reviewNote = String(form.get('reviewNote') || '')
  const amountTotal = amountTotalRaw ? Number(amountTotalRaw) : null

  const arrayBuffer = await uploadFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const now = Date.now()
  const filename = safeFileName(uploadFile.name || `receipt-${now}`)
  const storagePath = `manual-upload/${bankLineId || 'unlinked'}/${now}-${filename}`

  const { error: uploadError } = await supabase.storage
    .from('receipt-attachments')
    .upload(storagePath, buffer, {
      contentType: uploadFile.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const sourceRecordId = `manual:${bankLineId || 'unlinked'}:${now}:${filename}`
  const { data: doc, error: docError } = await supabase
    .from('finance_receipt_documents')
    .insert({
      source: 'manual_upload',
      source_record_id: sourceRecordId,
      source_table: 'finance_receipt_documents',
      vendor_name: vendorName || null,
      document_date: documentDate || null,
      amount_total: amountTotal,
      attachment_url: storagePath,
      attachment_storage_path: storagePath,
      attachment_filename: uploadFile.name || filename,
      attachment_content_type: uploadFile.type || 'application/octet-stream',
      attachment_size_bytes: buffer.length,
      status: bankLineId ? 'approved' : 'candidate',
      provenance: {
        source: 'manual_upload',
        review_note: reviewNote || null,
        uploaded_via: '/finance/receipt-evidence',
      },
    })
    .select('id')
    .single()

  if (docError || !doc) return NextResponse.json({ error: docError?.message || 'document insert failed' }, { status: 500 })

  let linkId: string | null = null
  if (bankLineId) {
    const { data: link, error: linkError } = await supabase
      .from('finance_receipt_bank_line_links')
      .insert({
        bank_line_id: bankLineId,
        receipt_document_id: doc.id,
        link_status: 'approved',
        match_method: 'manual_upload',
        confidence: 1,
        rank: 1,
        is_best_candidate: true,
        review_note: reviewNote || 'Manual receipt upload',
        xero_action: 'attach_file',
        provenance: {
          source: 'manual_upload',
          uploaded_via: '/finance/receipt-evidence',
        },
        created_by: 'human',
      })
      .select('id')
      .single()

    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })
    linkId = link?.id || null
  }

  return NextResponse.json({
    ok: true,
    documentId: doc.id,
    linkId,
    storagePath,
  })
}
