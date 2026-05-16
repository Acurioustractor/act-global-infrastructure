import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { execSql } from '@/lib/finance/query'

export const dynamic = 'force-dynamic'

const FY_START = '2025-07-01'
const FY_END = '2026-06-30'
const RECEIPT_THRESHOLD = 82.5

type SourceFilter = 'all' | 'bank_lines' | 'xero_transactions' | 'xero_invoices'
type DirectionFilter = 'all' | 'spend' | 'income'
type StatusFilter =
  | 'needs_action'
  | 'xero_drafts'
  | 'receipt_gap'
  | 'candidate_receipts'
  | 'no_receipt_needed'
  | 'needs_project'
  | 'project_review'
  | 'unreconciled'
  | 'rd_review'
  | 'all'

interface ProjectOption {
  code: string
  name: string | null
  tier: string | null
  status: string | null
}

interface BankEvidenceRow {
  id: string
  date: string | null
  direction: string | null
  payee: string | null
  particulars: string | null
  reference: string | null
  amount: number | string | null
  status: string | null
  bank_account: string | null
  project_code: string | null
  project_source: string | null
  rd_eligible: boolean | null
  receipt_match_status: string | null
  evidence_status: string | null
  candidate_count: number | null
  best_confidence: number | string | null
  best_source: string | null
  best_vendor_name: string | null
  has_approved_link: boolean | null
  xero_transaction_id: string | null
  matched_xero_transaction_id: string | null
}

interface XeroTransactionRow {
  id: string
  xero_transaction_id: string | null
  type: string | null
  contact_name: string | null
  bank_account: string | null
  project_code: string | null
  project_code_source: string | null
  total: number | string | null
  status: string | null
  date: string | null
  line_items: unknown
  has_attachments: boolean | null
  is_reconciled: boolean | null
  rd_eligible: boolean | null
  rd_category: string | null
}

interface XeroInvoiceRow {
  id: string
  xero_id: string | null
  invoice_number: string | null
  type: string | null
  status: string | null
  contact_name: string | null
  date: string | null
  total: number | string | null
  amount_due: number | string | null
  amount_paid: number | string | null
  line_items: unknown
  has_attachments: boolean | null
  reference: string | null
  project_code: string | null
  project_code_source: string | null
  income_type: string | null
}

interface AISuggestion {
  id: string
  projectCode: string
  confidence: number
  reason: string | null
  riskFlags: string[]
  model: string
  blockedForAutoApply: boolean
}

interface WorkbenchItem {
  id: string
  source: SourceFilter
  direction: 'spend' | 'income'
  date: string | null
  vendor: string
  description: string | null
  amount: number
  xeroStatus: string | null
  isReconciled: boolean | null
  projectCode: string | null
  projectSource: string | null
  hasReceipt: boolean
  receiptState: string
  receiptSignal: string | null
  candidateCount: number
  confidence: number | null
  rdEligible: boolean | null
  rdCategory: string | null
  needsProject: boolean
  needsProjectReview: boolean
  needsReceipt: boolean
  needsReconciliation: boolean
  needsXeroDraft: boolean
  xeroDraftHint: string | null
  needsRdReview: boolean
  xeroReference: string | null
  receiptEvidenceUrl: string
  aiSuggestion: AISuggestion | null
}

interface SummaryRow {
  bank_lines: number | string | null
  bank_receipt_gaps: number | string | null
  bank_receipt_gap_value: number | string | null
  bank_candidates: number | string | null
  xero_draft_candidates: number | string | null
  xero_draft_candidate_value: number | string | null
  bank_unreconciled: number | string | null
  bank_unreconciled_value: number | string | null
  bank_project_gaps: number | string | null
  xero_project_gaps: number | string | null
  invoice_project_gaps: number | string | null
  act_in_review: number | string | null
  rd_review: number | string | null
  rd_eligible_spend: number | string | null
}

function asNumber(value: number | string | null | undefined): number {
  if (value == null) return 0
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function asPercent(value: number | string | null | undefined): number {
  const number = asNumber(value)
  return number > 0 && number <= 1 ? number * 100 : number
}

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0
}

function firstLineDescription(lineItems: unknown): string | null {
  if (!Array.isArray(lineItems)) return null
  for (const item of lineItems) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const desc = row.Description || row.description
    if (typeof desc === 'string' && desc.trim()) {
      return desc.trim().slice(0, 140)
    }
  }
  return null
}

function quarterForDate(date: string | null): string {
  if (!date) return 'Q2'
  const month = new Date(`${date}T00:00:00`).getMonth() + 1
  if (month >= 7 && month <= 9) return 'Q1'
  if (month >= 10 && month <= 12) return 'Q2'
  if (month >= 1 && month <= 3) return 'Q3'
  return 'Q4'
}

function receiptEvidenceUrl(date: string | null, vendor: string): string {
  const params = new URLSearchParams()
  params.set('quarter', quarterForDate(date))
  params.set('status', 'all')
  if (vendor.trim()) params.set('search', vendor.trim())
  return `/finance/receipt-evidence?${params.toString()}`
}

function receiptCovered(state: string | null | undefined, matchStatus?: string | null, approved?: boolean | null): boolean {
  return Boolean(
    approved ||
      matchStatus === 'matched' ||
      state === 'covered_legacy' ||
      state === 'covered_evidence' ||
      state === 'matched'
  )
}

function isReceiptGap(state: string | null | undefined, matchStatus?: string | null): boolean {
  return (
    matchStatus === 'unmatched' ||
    state === 'uncovered' ||
    state === 'candidate' ||
    state === 'high_confidence_candidate'
  )
}

function hasXeroTarget(row: Pick<BankEvidenceRow, 'xero_transaction_id' | 'matched_xero_transaction_id'>): boolean {
  return !isBlank(row.xero_transaction_id) || !isBlank(row.matched_xero_transaction_id)
}

function xeroDraftHint(row: BankEvidenceRow, hasReceipt: boolean, needsReceipt: boolean): string | null {
  if (row.status !== 'unreconciled' || row.direction === 'credit' || hasXeroTarget(row)) return null
  if (hasReceipt) {
    return 'Local evidence exists. Open Xero Expenses drafts, approve the matching draft or create spend-money, then reconcile the bank line.'
  }
  if ((row.candidate_count || 0) > 0) {
    return 'Receipt candidates exist. Confirm evidence here, then approve/create the matching Xero transaction.'
  }
  if (needsReceipt) {
    return 'No Xero accounting target is mirrored yet. Check Xero Expenses drafts first, then Dext/Gmail/manual receipt capture if no draft exists.'
  }
  return 'No Xero accounting target is mirrored yet. Check Xero Expenses drafts or create the spend-money transaction before reconciling.'
}

function bankLineToItem(row: BankEvidenceRow): WorkbenchItem {
  const direction = row.direction === 'credit' ? 'income' : 'spend'
  const amount = Math.abs(asNumber(row.amount))
  const vendor = row.best_vendor_name || row.payee || row.particulars || row.reference || 'Bank line'
  const description = [row.particulars, row.reference, row.bank_account].filter(Boolean).join(' · ') || null
  const receiptState = row.evidence_status || row.receipt_match_status || 'unknown'
  const hasReceipt = receiptCovered(row.evidence_status, row.receipt_match_status, row.has_approved_link)
  const needsReceipt = !hasReceipt && direction === 'spend' && isReceiptGap(row.evidence_status, row.receipt_match_status)
  const needsProject = isBlank(row.project_code)
  const needsProjectReview = row.project_code === 'ACT-IN'
  const needsReconciliation = row.status === 'unreconciled'
  const draftHint = xeroDraftHint(row, hasReceipt, needsReceipt)

  return {
    id: row.id,
    source: 'bank_lines',
    direction,
    date: row.date,
    vendor,
    description,
    amount,
    xeroStatus: row.status,
    isReconciled: row.status === 'reconciled',
    projectCode: row.project_code,
    projectSource: row.project_source,
    hasReceipt,
    receiptState,
    receiptSignal: row.best_source,
    candidateCount: row.candidate_count || 0,
    confidence: row.best_confidence == null ? null : asPercent(row.best_confidence),
    rdEligible: row.rd_eligible,
    rdCategory: row.rd_eligible ? 'eligible' : null,
    needsProject,
    needsProjectReview,
    needsReceipt,
    needsReconciliation,
    needsXeroDraft: Boolean(draftHint),
    xeroDraftHint: draftHint,
    needsRdReview: false,
    xeroReference: row.xero_transaction_id || row.matched_xero_transaction_id,
    receiptEvidenceUrl: receiptEvidenceUrl(row.date, vendor),
    aiSuggestion: null,
  }
}

function xeroTransactionToItem(row: XeroTransactionRow): WorkbenchItem {
  const type = row.type || ''
  const direction = type.startsWith('RECEIVE') ? 'income' : 'spend'
  const amount = Math.abs(asNumber(row.total))
  const vendor = row.contact_name || 'Xero transaction'
  const description = firstLineDescription(row.line_items) || row.bank_account || row.xero_transaction_id || null
  const isTransfer = type.includes('TRANSFER')
  const hasReceipt = Boolean(row.has_attachments)
  const needsReceipt = direction === 'spend' && !hasReceipt && !isTransfer && amount > 0
  const needsProject = isBlank(row.project_code)
  const needsProjectReview = row.project_code === 'ACT-IN' || (row.project_code_source || '').includes('vendor')
  const needsReconciliation = row.is_reconciled === false

  return {
    id: row.id,
    source: 'xero_transactions',
    direction,
    date: row.date,
    vendor,
    description,
    amount,
    xeroStatus: row.status,
    isReconciled: row.is_reconciled,
    projectCode: row.project_code,
    projectSource: row.project_code_source,
    hasReceipt,
    receiptState: hasReceipt ? 'xero_attachment' : isTransfer ? 'transfer' : amount <= RECEIPT_THRESHOLD ? 'low_value_no_file' : 'needs_file',
    receiptSignal: hasReceipt ? 'xero transaction attachment' : null,
    candidateCount: 0,
    confidence: null,
    rdEligible: row.rd_eligible,
    rdCategory: row.rd_category,
    needsProject,
    needsProjectReview,
    needsReceipt,
    needsReconciliation,
    needsXeroDraft: false,
    xeroDraftHint: null,
    needsRdReview: row.rd_category === 'review',
    xeroReference: row.xero_transaction_id,
    receiptEvidenceUrl: receiptEvidenceUrl(row.date, vendor),
    aiSuggestion: null,
  }
}

function xeroInvoiceToItem(row: XeroInvoiceRow): WorkbenchItem {
  const direction = row.type === 'ACCREC' ? 'income' : 'spend'
  const amount = Math.abs(asNumber(row.total))
  const amountDue = asNumber(row.amount_due)
  const vendor = row.contact_name || 'Xero invoice'
  const description = firstLineDescription(row.line_items) || row.reference || row.invoice_number || null
  const hasReceipt = Boolean(row.has_attachments)
  const needsReceipt = direction === 'spend' && !hasReceipt && amount > 0
  const needsProject = isBlank(row.project_code)
  const needsProjectReview = row.project_code === 'ACT-IN' || (row.project_code_source || '').includes('vendor')

  return {
    id: row.id,
    source: 'xero_invoices',
    direction,
    date: row.date,
    vendor,
    description,
    amount,
    xeroStatus: row.status,
    isReconciled: row.status === 'PAID' || amountDue <= 0,
    projectCode: row.project_code,
    projectSource: row.project_code_source || row.income_type,
    hasReceipt,
    receiptState: hasReceipt ? 'xero_attachment' : amount <= RECEIPT_THRESHOLD ? 'low_value_no_file' : 'needs_file',
    receiptSignal: hasReceipt ? 'xero invoice attachment' : null,
    candidateCount: 0,
    confidence: null,
    rdEligible: null,
    rdCategory: null,
    needsProject,
    needsProjectReview,
    needsReceipt,
    needsReconciliation: false,
    needsXeroDraft: false,
    xeroDraftHint: null,
    needsRdReview: false,
    xeroReference: row.invoice_number || row.xero_id,
    receiptEvidenceUrl: receiptEvidenceUrl(row.date, vendor),
    aiSuggestion: null,
  }
}

async function fetchPaged<T>(
  label: string,
  makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000
  const rows: T[] = []

  for (let from = 0; from < 10000; from += pageSize) {
    const { data, error } = await makeQuery(from, from + pageSize - 1)
    if (error) throw new Error(`${label}: ${error.message}`)
    const page = data || []
    rows.push(...page)
    if (page.length < pageSize) break
  }

  return rows
}

function matchesText(item: WorkbenchItem, q: string): boolean {
  if (!q) return true
  const haystack = [
    item.vendor,
    item.description,
    item.projectCode,
    item.projectSource,
    item.xeroStatus,
    item.receiptState,
    item.xeroReference,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q.toLowerCase())
}

function matchesStatus(item: WorkbenchItem, status: StatusFilter): boolean {
  if (status === 'all') return true
  if (status === 'needs_action') {
    return item.needsProject || item.needsReceipt || item.needsReconciliation || item.needsRdReview
  }
  if (status === 'xero_drafts') return item.needsXeroDraft
  if (status === 'receipt_gap') return item.needsReceipt
  if (status === 'candidate_receipts') {
    return item.receiptState === 'candidate' || item.receiptState === 'high_confidence_candidate'
  }
  if (status === 'no_receipt_needed') {
    return item.receiptState === 'no_receipt_needed' || item.receiptState === 'low_value_no_file' || item.receiptState === 'transfer'
  }
  if (status === 'needs_project') return item.needsProject
  if (status === 'project_review') return item.needsProjectReview
  if (status === 'unreconciled') return item.needsReconciliation
  if (status === 'rd_review') return item.needsRdReview
  return true
}

function matchesProject(item: WorkbenchItem, project: string): boolean {
  if (!project || project === 'all') return true
  if (project === '__blank__') return item.needsProject
  return item.projectCode === project
}

async function loadSummary() {
  const rows = await execSql<SummaryRow>(
    'finance workbench summary',
    `
      SELECT
        (SELECT COUNT(*) FROM bank_statement_lines WHERE date >= '${FY_START}' AND date <= '${FY_END}') AS bank_lines,
        (SELECT COUNT(*) FROM v_finance_bank_line_evidence WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND direction = 'debit' AND evidence_status IN ('uncovered','candidate','high_confidence_candidate')) AS bank_receipt_gaps,
        (SELECT COALESCE(SUM(amount),0) FROM v_finance_bank_line_evidence WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND direction = 'debit' AND evidence_status IN ('uncovered','candidate','high_confidence_candidate')) AS bank_receipt_gap_value,
        (SELECT COUNT(*) FROM v_finance_bank_line_evidence WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND evidence_status IN ('candidate','high_confidence_candidate')) AS bank_candidates,
        (SELECT COUNT(*) FROM v_finance_bank_line_evidence WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND direction = 'debit' AND status = 'unreconciled' AND (xero_transaction_id IS NULL OR xero_transaction_id = '') AND (matched_xero_transaction_id IS NULL OR matched_xero_transaction_id = '')) AS xero_draft_candidates,
        (SELECT COALESCE(SUM(amount),0) FROM v_finance_bank_line_evidence WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND direction = 'debit' AND status = 'unreconciled' AND (xero_transaction_id IS NULL OR xero_transaction_id = '') AND (matched_xero_transaction_id IS NULL OR matched_xero_transaction_id = '')) AS xero_draft_candidate_value,
        (SELECT COUNT(*) FROM bank_statement_lines WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND status = 'unreconciled') AS bank_unreconciled,
        (SELECT COALESCE(SUM(amount),0) FROM bank_statement_lines WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND status = 'unreconciled') AS bank_unreconciled_value,
        (SELECT COUNT(*) FROM bank_statement_lines WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND (project_code IS NULL OR project_code = '')) AS bank_project_gaps,
        (SELECT COUNT(*) FROM xero_transactions WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND (project_code IS NULL OR project_code = '')) AS xero_project_gaps,
        (SELECT COUNT(*) FROM xero_invoices WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND (project_code IS NULL OR project_code = '')) AS invoice_project_gaps,
        (
          (SELECT COUNT(*) FROM bank_statement_lines WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND project_code = 'ACT-IN')
          + (SELECT COUNT(*) FROM xero_transactions WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND project_code = 'ACT-IN')
          + (SELECT COUNT(*) FROM xero_invoices WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND project_code = 'ACT-IN')
        ) AS act_in_review,
        (SELECT COUNT(*) FROM xero_transactions WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND rd_category = 'review') AS rd_review,
        (SELECT COALESCE(SUM(ABS(total)),0) FROM xero_transactions WHERE date >= '${FY_START}' AND date <= '${FY_END}' AND rd_eligible = true AND type LIKE 'SPEND%') AS rd_eligible_spend
    `
  )

  const row = rows[0]
  return {
    bankLines: asNumber(row?.bank_lines),
    receiptGaps: asNumber(row?.bank_receipt_gaps),
    receiptGapValue: asNumber(row?.bank_receipt_gap_value),
    candidateReceipts: asNumber(row?.bank_candidates),
    xeroDraftCandidates: asNumber(row?.xero_draft_candidates),
    xeroDraftCandidateValue: asNumber(row?.xero_draft_candidate_value),
    unreconciledBankLines: asNumber(row?.bank_unreconciled),
    unreconciledValue: asNumber(row?.bank_unreconciled_value),
    bankProjectGaps: asNumber(row?.bank_project_gaps),
    xeroProjectGaps: asNumber(row?.xero_project_gaps),
    invoiceProjectGaps: asNumber(row?.invoice_project_gaps),
    actInReview: asNumber(row?.act_in_review),
    rdReview: asNumber(row?.rd_review),
    rdEligibleSpend: asNumber(row?.rd_eligible_spend),
  }
}

// Map workbench source -> AI suggestions source_table column value
function sourceToAiTable(source: SourceFilter): string | null {
  switch (source) {
    case 'bank_lines': return 'bank_statement_lines'
    case 'xero_transactions': return 'xero_transactions'
    case 'xero_invoices': return null // grader does not currently emit suggestions for invoices
    default: return null
  }
}

const AI_NO_AUTO_APPLY = new Set(['ASK_USER', 'SL_REVIEW'])

// Attach the best open suggestion (highest confidence, not applied, not rejected)
// per (source_table, source_record_id) pair to each visible item.
async function enrichWithAISuggestions(items: WorkbenchItem[]): Promise<void> {
  // Build buckets by source_table
  const buckets = new Map<string, string[]>()
  for (const item of items) {
    const tbl = sourceToAiTable(item.source)
    if (!tbl) continue
    if (!buckets.has(tbl)) buckets.set(tbl, [])
    buckets.get(tbl)!.push(item.id)
  }
  if (!buckets.size) return

  // Fetch all open suggestions for the visible IDs, per table
  type Row = {
    id: string
    source_table: string
    source_record_id: string
    suggested_project_code: string
    confidence: number
    reason: string | null
    risk_flags: string[] | null
    model: string
  }
  const allRows: Row[] = []
  await Promise.all(Array.from(buckets.entries()).map(async ([tbl, ids]) => {
    if (!ids.length) return
    const { data, error } = await supabase
      .from('finance_ai_routing_suggestions')
      .select('id, source_table, source_record_id, suggested_project_code, confidence, reason, risk_flags, model')
      .eq('source_table', tbl)
      .eq('applied_to_source', false)
      .is('rejected_at', null)
      .in('source_record_id', ids)
      .order('confidence', { ascending: false })
    if (error) {
      console.warn(`[workbench] AI suggestions lookup (${tbl}) failed: ${error.message}`)
      return
    }
    if (data) allRows.push(...(data as Row[]))
  }))

  // Best (highest-confidence) suggestion per (table, recordId)
  const best = new Map<string, Row>()
  for (const r of allRows) {
    const key = `${r.source_table}:${r.source_record_id}`
    const existing = best.get(key)
    if (!existing || Number(r.confidence) > Number(existing.confidence)) {
      best.set(key, r)
    }
  }

  // Attach to items in place
  for (const item of items) {
    const tbl = sourceToAiTable(item.source)
    if (!tbl) continue
    const found = best.get(`${tbl}:${item.id}`)
    if (!found) continue
    item.aiSuggestion = {
      id: found.id,
      projectCode: found.suggested_project_code,
      confidence: Number(found.confidence),
      reason: found.reason,
      riskFlags: Array.isArray(found.risk_flags) ? found.risk_flags : [],
      model: found.model,
      blockedForAutoApply: AI_NO_AUTO_APPLY.has(found.suggested_project_code),
    }
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const source = (params.get('source') || 'bank_lines') as SourceFilter
  const direction = (params.get('direction') || 'all') as DirectionFilter
  const status = (params.get('status') || 'needs_action') as StatusFilter
  const project = params.get('project') || 'all'
  const q = (params.get('q') || '').trim()
  const limit = Math.min(Math.max(parseInt(params.get('limit') || '300', 10), 50), 800)

  try {
    const [projectsResult, summary] = await Promise.all([
      supabase
        .from('projects')
        .select('code, name, tier, status')
        .not('code', 'is', null)
        .or('status.is.null,status.neq.archived')
        .order('tier', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })
        .limit(500),
      loadSummary(),
    ])

    if (projectsResult.error) {
      throw new Error(`projects: ${projectsResult.error.message}`)
    }

    const items: WorkbenchItem[] = []

    if (source === 'all' || source === 'bank_lines') {
      const bankRows = await fetchPaged<BankEvidenceRow>('bank evidence', (from, to) =>
        supabase
          .from('v_finance_bank_line_evidence')
          .select('id, date, direction, payee, particulars, reference, amount, status, bank_account, project_code, project_source, rd_eligible, receipt_match_status, evidence_status, candidate_count, best_confidence, best_source, best_vendor_name, has_approved_link, xero_transaction_id, matched_xero_transaction_id')
          .gte('date', FY_START)
          .lte('date', FY_END)
          .order('date', { ascending: false })
          .range(from, to)
      )
      items.push(...bankRows.map(bankLineToItem))
    }

    if (source === 'all' || source === 'xero_transactions') {
      const txRows = await fetchPaged<XeroTransactionRow>('xero transactions', (from, to) =>
        supabase
          .from('xero_transactions')
          .select('id, xero_transaction_id, type, contact_name, bank_account, project_code, project_code_source, total, status, date, line_items, has_attachments, is_reconciled, rd_eligible, rd_category')
          .gte('date', FY_START)
          .lte('date', FY_END)
          .order('date', { ascending: false })
          .range(from, to)
      )
      items.push(...txRows.map(xeroTransactionToItem))
    }

    if (source === 'all' || source === 'xero_invoices') {
      const invoiceRows = await fetchPaged<XeroInvoiceRow>('xero invoices', (from, to) =>
        supabase
          .from('xero_invoices')
          .select('id, xero_id, invoice_number, type, status, contact_name, date, total, amount_due, amount_paid, line_items, has_attachments, reference, project_code, project_code_source, income_type')
          .gte('date', FY_START)
          .lte('date', FY_END)
          .order('date', { ascending: false })
          .range(from, to)
      )
      items.push(...invoiceRows.map(xeroInvoiceToItem))
    }

    const filtered = items
      .filter((item) => direction === 'all' || item.direction === direction)
      .filter((item) => matchesStatus(item, status))
      .filter((item) => matchesProject(item, project))
      .filter((item) => matchesText(item, q))
      .sort((a, b) => {
        if (status === 'xero_drafts') {
          if (a.hasReceipt !== b.hasReceipt) return a.hasReceipt ? -1 : 1
          if ((a.candidateCount > 0) !== (b.candidateCount > 0)) return a.candidateCount > 0 ? -1 : 1
          if (a.amount !== b.amount) return b.amount - a.amount
        }
        if (a.needsXeroDraft !== b.needsXeroDraft) return a.needsXeroDraft ? -1 : 1
        if (a.needsReceipt !== b.needsReceipt) return a.needsReceipt ? -1 : 1
        if (a.needsProject !== b.needsProject) return a.needsProject ? -1 : 1
        if (a.needsReconciliation !== b.needsReconciliation) return a.needsReconciliation ? -1 : 1
        return (new Date(b.date || '1900-01-01').getTime() || 0) - (new Date(a.date || '1900-01-01').getTime() || 0)
      })

    const visibleItems = filtered.slice(0, limit)
    await enrichWithAISuggestions(visibleItems)

    return NextResponse.json({
      fy: { start: FY_START, end: FY_END },
      filters: { source, direction, status, project, q, limit },
      summary,
      projects: ((projectsResult.data || []) as ProjectOption[]).map((p) => ({
        code: p.code,
        name: p.name,
        tier: p.tier,
        status: p.status,
      })),
      totalMatching: filtered.length,
      items: visibleItems,
    })
  } catch (error) {
    console.error('[finance/workbench] GET failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

function rdUpdate(rdCategory: unknown, source: SourceFilter) {
  if (typeof rdCategory !== 'string') return {}
  if (source === 'xero_invoices') return {}

  if (source === 'bank_lines') {
    if (rdCategory === 'core' || rdCategory === 'supporting') return { rd_eligible: true }
    if (rdCategory === 'review' || rdCategory === 'none') return { rd_eligible: false }
    return {}
  }

  if (rdCategory === 'core' || rdCategory === 'supporting') {
    return { rd_eligible: true, rd_category: rdCategory }
  }
  if (rdCategory === 'review') return { rd_eligible: false, rd_category: 'review' }
  if (rdCategory === 'none') return { rd_eligible: false, rd_category: null }
  return {}
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const source = body.source as SourceFilter
    const id = typeof body.id === 'string' ? body.id : null
    const hasProjectCode = Object.prototype.hasOwnProperty.call(body, 'projectCode')
    const projectCode = hasProjectCode && typeof body.projectCode === 'string' && body.projectCode.trim()
      ? body.projectCode.trim()
      : null

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (!['bank_lines', 'xero_transactions', 'xero_invoices'].includes(source)) {
      return NextResponse.json({ error: 'invalid source' }, { status: 400 })
    }

    if (projectCode) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('code')
        .eq('code', projectCode)
        .maybeSingle()
      if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })
      if (!project) return NextResponse.json({ error: `Unknown project code: ${projectCode}` }, { status: 400 })
    }

    const rd = rdUpdate(body.rdCategory, source)
    const updates: Record<string, unknown> = { ...rd }
    if (hasProjectCode) updates.project_code = projectCode

    if (source === 'bank_lines') {
      if (hasProjectCode) updates.project_source = 'manual_workbench'
      const { error } = await supabase.from('bank_statement_lines').update(updates).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (source === 'xero_transactions') {
      if (hasProjectCode) updates.project_code_source = 'manual_workbench'
      updates.updated_at = new Date().toISOString()
      const { error } = await supabase.from('xero_transactions').update(updates).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (source === 'xero_invoices') {
      if (hasProjectCode) updates.project_code_source = 'manual_workbench'
      updates.updated_at = new Date().toISOString()
      const { error } = await supabase.from('xero_invoices').update(updates).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id, source, projectCode, rdCategory: body.rdCategory || null })
  } catch (error) {
    console.error('[finance/workbench] PATCH failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
