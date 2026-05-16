import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const FY_START = '2025-07-01'
const FY_END = '2026-06-30'
const DATE_WINDOW_DAYS = 5

type StatusFilter =
  | 'needs_action'
  | 'duplicate_risk'
  | 'match_candidate'
  | 'ambiguous'
  | 'project_review'
  | 'done'
  | 'all'

interface DextInvoiceRow {
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
  has_attachments: boolean | null
  reference: string | null
  project_code: string | null
  project_code_source: string | null
  line_items: unknown
}

interface XeroPaymentRow {
  id: string
  xero_payment_id: string | null
  invoice_xero_id: string | null
  invoice_number: string | null
  status: string | null
  date: string | null
  amount: number | string | null
  reference: string | null
  is_reconciled: boolean | null
  bank_account_name: string | null
  account_name: string | null
}

interface BankLineRow {
  id: string
  date: string | null
  payee: string | null
  particulars: string | null
  reference: string | null
  amount: number | string | null
  direction: string | null
  status: string | null
  bank_account: string | null
  project_code: string | null
  project_source: string | null
}

interface ProjectOption {
  code: string
  name: string | null
  tier: string | null
  status: string | null
}

interface AuditCandidate {
  id: string
  date: string | null
  payee: string
  amount: number
  status: string | null
  bankAccount: string | null
  dateDeltaDays: number | null
  vendorScore: number
  amountDelta: number
  projectCode: string | null
  projectSource: string | null
}

interface AuditItem {
  id: string
  xeroId: string | null
  date: string | null
  vendor: string
  amount: number
  amountDue: number
  amountPaid: number
  xeroStatus: string | null
  reference: string | null
  dextRef: string | null
  hasAttachment: boolean
  projectCode: string | null
  projectSource: string | null
  accountCode: string | null
  taxType: string | null
  description: string | null
  paymentCount: number
  paymentReconciled: boolean
  payments: Array<{
    id: string
    xeroPaymentId: string | null
    date: string | null
    amount: number
    status: string | null
    isReconciled: boolean | null
    accountName: string | null
    reference: string | null
  }>
  candidates: AuditCandidate[]
  decision: 'done' | 'find_match' | 'duplicate_risk' | 'ambiguous' | 'project_review' | 'bookkeeper' | 'unknown'
  decisionLabel: string
  nextStep: string
  riskLevel: 'low' | 'medium' | 'high'
  needsProjectReview: boolean
  receiptEvidenceUrl: string
}

function asNumber(value: number | string | null | undefined): number {
  if (value == null) return 0
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function cleanText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const GENERIC_WORDS = new Set([
  'and',
  'australia',
  'australian',
  'bank',
  'brisbane',
  'company',
  'co',
  'corp',
  'corporation',
  'group',
  'ltd',
  'limited',
  'melbourne',
  'payment',
  'pty',
  'sydney',
  'the',
])

function tokens(value: unknown): string[] {
  return cleanText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !GENERIC_WORDS.has(token))
}

function vendorScore(invoiceVendor: string, bankText: string): number {
  const invoice = cleanText(invoiceVendor)
  const bank = cleanText(bankText)
  if (!invoice || !bank) return 0
  if (invoice === bank) return 1
  if (invoice.includes(bank) || bank.includes(invoice)) return 0.95

  const invoiceTokens = tokens(invoice)
  const bankTokens = new Set(tokens(bank))
  if (!invoiceTokens.length || !bankTokens.size) return 0
  const matches = invoiceTokens.filter((token) => bankTokens.has(token)).length
  return matches / invoiceTokens.length
}

function dateDeltaDays(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  const first = new Date(`${a}T00:00:00`).getTime()
  const second = new Date(`${b}T00:00:00`).getTime()
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null
  return Math.round((second - first) / 86400000)
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

function dextRef(reference: string | null): string | null {
  const match = String(reference || '').match(/dext_import\s+([a-z0-9-]+)/i)
  return match?.[1] || null
}

function firstLineValue(lineItems: unknown, key: string): string | null {
  if (!Array.isArray(lineItems)) return null
  for (const item of lineItems) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const value = row[key] || row[key.toLowerCase()]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

async function fetchPaged<T>(
  label: string,
  makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = []
  const pageSize = 1000

  for (let from = 0; from < 10000; from += pageSize) {
    const { data, error } = await makeQuery(from, from + pageSize - 1)
    if (error) throw new Error(`${label}: ${error.message}`)
    const page = data || []
    rows.push(...page)
    if (page.length < pageSize) break
  }

  return rows
}

function findBankCandidates(invoice: DextInvoiceRow, bankLines: BankLineRow[]): AuditCandidate[] {
  const invoiceAmount = Math.abs(asNumber(invoice.total))
  const vendor = invoice.contact_name || ''

  return bankLines
    .map((line) => {
      const amount = Math.abs(asNumber(line.amount))
      const amountDelta = Math.abs(amount - invoiceAmount)
      const deltaDays = dateDeltaDays(invoice.date, line.date)
      const score = vendorScore(vendor, `${line.payee || ''} ${line.particulars || ''} ${line.reference || ''}`)
      return { line, amount, amountDelta, deltaDays, score }
    })
    .filter(({ amountDelta, deltaDays, score }) => {
      if (amountDelta > 0.01) return false
      if (deltaDays === null || Math.abs(deltaDays) > DATE_WINDOW_DAYS) return false
      return score >= 0.25
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return Math.abs(a.deltaDays || 0) - Math.abs(b.deltaDays || 0)
    })
    .slice(0, 5)
    .map(({ line, amount, amountDelta, deltaDays, score }) => ({
      id: line.id,
      date: line.date,
      payee: line.payee || line.particulars || line.reference || 'Bank line',
      amount,
      status: line.status,
      bankAccount: line.bank_account,
      dateDeltaDays: deltaDays,
      vendorScore: Math.round(score * 100),
      amountDelta,
      projectCode: line.project_code,
      projectSource: line.project_source,
    }))
}

function classify(invoice: DextInvoiceRow, payments: XeroPaymentRow[], candidates: AuditCandidate[]) {
  const amountDue = Math.abs(asNumber(invoice.amount_due))
  const amountPaid = Math.abs(asNumber(invoice.amount_paid))
  const paymentReconciled = payments.some((payment) => payment.is_reconciled === true)
  const needsProjectReview = Boolean(
    !invoice.project_code || invoice.project_code === 'ACT-IN' || invoice.project_code_source?.includes('vendor')
  )
  const unreconciledCandidates = candidates.filter((candidate) => candidate.status === 'unreconciled')
  const xeroStatus = String(invoice.status || '').toUpperCase()
  const paid = xeroStatus === 'PAID' || amountPaid > 0

  if (xeroStatus === 'VOIDED' || xeroStatus === 'DELETED') {
    return {
      decision: 'done' as const,
      decisionLabel: 'Voided/deleted shadow',
      nextStep: 'No Xero action. Keep as audit history only.',
      riskLevel: 'low' as const,
      needsProjectReview: false,
    }
  }

  if (paymentReconciled) {
    return {
      decision: 'done' as const,
      decisionLabel: 'Already reconciled',
      nextStep: 'No Xero action. Check project/R&D only if needed.',
      riskLevel: 'low' as const,
      needsProjectReview,
    }
  }

  if (paid && unreconciledCandidates.length === 1) {
    return {
      decision: 'duplicate_risk' as const,
      decisionLabel: 'Do not create duplicate',
      nextStep: 'In Xero, use Find & Match against the existing Dext-created bill payment if the bank line is visible.',
      riskLevel: 'high' as const,
      needsProjectReview,
    }
  }

  if (unreconciledCandidates.length > 1 || candidates.length > 1) {
    return {
      decision: 'ambiguous' as const,
      decisionLabel: 'Ambiguous',
      nextStep: 'Multiple matching bank-line candidates. Human check before any Xero click.',
      riskLevel: 'medium' as const,
      needsProjectReview,
    }
  }

  if (candidates.length === 1) {
    return {
      decision: 'find_match' as const,
      decisionLabel: 'Find & Match candidate',
      nextStep: 'If this bank line is visible in Xero Reconcile, match it to the Dext-created bill/payment. Do not create a new transaction.',
      riskLevel: 'medium' as const,
      needsProjectReview,
    }
  }

  if (needsProjectReview) {
    return {
      decision: 'project_review' as const,
      decisionLabel: 'Project review',
      nextStep: 'Fix project tag before using this for BAS/R&D reporting.',
      riskLevel: 'medium' as const,
      needsProjectReview,
    }
  }

  return {
    decision: 'bookkeeper' as const,
    decisionLabel: 'No bank-line mirror match',
    nextStep: 'Do not create another transaction. Check Account Transactions or send to bookkeeper for duplicate/Remove & Redo decision.',
    riskLevel: 'medium' as const,
    needsProjectReview,
  }
}

function matchesStatus(item: AuditItem, status: StatusFilter): boolean {
  if (status === 'all') return true
  if (status === 'needs_action') return item.decision !== 'done' || item.needsProjectReview
  if (status === 'done') return item.decision === 'done'
  if (status === 'project_review') return item.needsProjectReview
  if (status === 'duplicate_risk') return item.decision === 'duplicate_risk'
  if (status === 'match_candidate') return item.decision === 'find_match'
  if (status === 'ambiguous') return item.decision === 'ambiguous'
  return true
}

function matchesText(item: AuditItem, q: string): boolean {
  if (!q) return true
  const haystack = [
    item.vendor,
    item.reference,
    item.dextRef,
    item.projectCode,
    item.accountCode,
    item.description,
    ...item.candidates.map((candidate) => `${candidate.payee} ${candidate.date}`),
  ].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(q.toLowerCase())
}

function matchesProject(item: AuditItem, project: string): boolean {
  if (!project || project === 'all') return true
  if (project === '__blank__') return !item.projectCode
  return item.projectCode === project
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const status = (params.get('status') || 'needs_action') as StatusFilter
  const project = params.get('project') || 'all'
  const q = (params.get('q') || '').trim()
  const limit = Math.min(Math.max(parseInt(params.get('limit') || '300', 10), 50), 800)

  try {
    const [invoices, bankLines, allPayments, projectsResult] = await Promise.all([
      fetchPaged<DextInvoiceRow>('dext pushed invoices', (from, to) =>
        supabase
          .from('xero_invoices')
          .select('id, xero_id, invoice_number, type, status, contact_name, date, total, amount_due, amount_paid, has_attachments, reference, project_code, project_code_source, line_items')
          .eq('type', 'ACCPAY')
          .ilike('reference', '%auto-pushed%dext_import%')
          .gte('date', FY_START)
          .lte('date', FY_END)
          .order('date', { ascending: false })
          .range(from, to)
      ),
      fetchPaged<BankLineRow>('bank statement lines', (from, to) =>
        supabase
          .from('bank_statement_lines')
          .select('id, date, payee, particulars, reference, amount, direction, status, bank_account, project_code, project_source')
          .eq('direction', 'debit')
          .gte('date', FY_START)
          .lte('date', FY_END)
          .order('date', { ascending: false })
          .range(from, to)
      ),
      fetchPaged<XeroPaymentRow>('xero payments', (from, to) =>
        supabase
          .from('xero_payments')
          .select('id, xero_payment_id, invoice_xero_id, invoice_number, status, date, amount, reference, is_reconciled, bank_account_name, account_name')
          .gte('date', FY_START)
          .lte('date', FY_END)
          .order('date', { ascending: false })
          .range(from, to)
      ),
      supabase
        .from('projects')
        .select('code, name, tier, status')
        .not('code', 'is', null)
        .or('status.is.null,status.neq.archived')
        .order('tier', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })
        .limit(500),
    ])

    if (projectsResult.error) throw new Error(`projects: ${projectsResult.error.message}`)

    const invoiceIds = invoices.map((invoice) => invoice.xero_id).filter(Boolean) as string[]
    const invoiceIdSet = new Set(invoiceIds)
    const payments = allPayments.filter((payment) => payment.invoice_xero_id && invoiceIdSet.has(payment.invoice_xero_id))

    const paymentsByInvoice = new Map<string, XeroPaymentRow[]>()
    for (const payment of payments) {
      if (!payment.invoice_xero_id) continue
      const list = paymentsByInvoice.get(payment.invoice_xero_id) || []
      list.push(payment)
      paymentsByInvoice.set(payment.invoice_xero_id, list)
    }

    const items: AuditItem[] = invoices.map((invoice) => {
      const invoicePayments = invoice.xero_id ? paymentsByInvoice.get(invoice.xero_id) || [] : []
      const candidates = findBankCandidates(invoice, bankLines)
      const classification = classify(invoice, invoicePayments, candidates)
      const vendor = invoice.contact_name || 'Dext pushed bill'

      return {
        id: invoice.id,
        xeroId: invoice.xero_id,
        date: invoice.date,
        vendor,
        amount: Math.abs(asNumber(invoice.total)),
        amountDue: Math.abs(asNumber(invoice.amount_due)),
        amountPaid: Math.abs(asNumber(invoice.amount_paid)),
        xeroStatus: invoice.status,
        reference: invoice.reference,
        dextRef: dextRef(invoice.reference),
        hasAttachment: Boolean(invoice.has_attachments),
        projectCode: invoice.project_code,
        projectSource: invoice.project_code_source,
        accountCode: firstLineValue(invoice.line_items, 'account_code'),
        taxType: firstLineValue(invoice.line_items, 'tax_type'),
        description: firstLineValue(invoice.line_items, 'description'),
        paymentCount: invoicePayments.length,
        paymentReconciled: invoicePayments.some((payment) => payment.is_reconciled === true),
        payments: invoicePayments.map((payment) => ({
          id: payment.id,
          xeroPaymentId: payment.xero_payment_id,
          date: payment.date,
          amount: Math.abs(asNumber(payment.amount)),
          status: payment.status,
          isReconciled: payment.is_reconciled,
          accountName: payment.bank_account_name || payment.account_name,
          reference: payment.reference,
        })),
        candidates,
        receiptEvidenceUrl: receiptEvidenceUrl(invoice.date, vendor),
        ...classification,
      }
    })

    const summary = {
      total: items.length,
      totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
      needsAction: items.filter((item) => matchesStatus(item, 'needs_action')).length,
      duplicateRisk: items.filter((item) => item.decision === 'duplicate_risk').length,
      matchCandidates: items.filter((item) => item.decision === 'find_match').length,
      ambiguous: items.filter((item) => item.decision === 'ambiguous').length,
      projectReview: items.filter((item) => item.needsProjectReview).length,
      done: items.filter((item) => item.decision === 'done').length,
      paymentReconciled: items.filter((item) => item.paymentReconciled).length,
    }

    const filtered = items
      .filter((item) => matchesStatus(item, status))
      .filter((item) => matchesProject(item, project))
      .filter((item) => matchesText(item, q))
      .sort((a, b) => {
        const rank = { duplicate_risk: 0, ambiguous: 1, find_match: 2, project_review: 3, bookkeeper: 4, unknown: 5, done: 6 }
        const rankDiff = rank[a.decision] - rank[b.decision]
        if (rankDiff !== 0) return rankDiff
        return b.amount - a.amount
      })

    return NextResponse.json({
      fy: { start: FY_START, end: FY_END },
      filters: { status, project, q, limit },
      summary,
      projects: ((projectsResult.data || []) as ProjectOption[]).map((p) => ({
        code: p.code,
        name: p.name,
        tier: p.tier,
        status: p.status,
      })),
      caveat: 'Bank-line candidates are from the ACT Supabase mirror, not the live Xero Reconcile screen. Verify visibility in Xero before clicking.',
      totalMatching: filtered.length,
      items: filtered.slice(0, limit),
    })
  } catch (error) {
    console.error('[finance/dext-push-audit] GET failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : null
    const projectCode = typeof body.projectCode === 'string' && body.projectCode.trim()
      ? body.projectCode.trim()
      : null

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    if (projectCode) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('code')
        .eq('code', projectCode)
        .maybeSingle()
      if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })
      if (!project) return NextResponse.json({ error: `Unknown project code: ${projectCode}` }, { status: 400 })
    }

    const { error } = await supabase
      .from('xero_invoices')
      .update({
        project_code: projectCode,
        project_code_source: 'manual_dext_push_audit',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id, projectCode })
  } catch (error) {
    console.error('[finance/dext-push-audit] PATCH failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
