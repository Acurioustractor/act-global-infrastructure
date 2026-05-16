import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const DATE_WINDOW_DAYS = 5
const BANK_LINE_WINDOW_DAYS = 3

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

type SuggestedAction =
  | 'click_ok_existing_match'
  | 'wrong_xero_suggestion'
  | 'transfer'
  | 'find_match_bill'
  | 'create_with_evidence'
  | 'create_low_value'
  | 'refund_review'
  | 'skip_done'
  | 'bookkeeper_review'
  | 'unsafe_create'

interface ParsedXeroRow {
  rowNumber: number
  date: string
  description: string
  transactionType: string
  amount: number
  hasOkButton: boolean
  suggestedWho: string | null
  suggestedAccount: string | null
  suggestedWhy: string | null
  suggestedTaxRate: string | null
  existingMatchLabel: string | null
  rawBlock: string[]
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
  receipt_match_status: string | null
  receipt_match_score: number | string | null
}

interface EvidenceRow extends BankLineRow {
  evidence_status?: string | null
  best_confidence?: number | string | null
  best_source?: string | null
  best_vendor_name?: string | null
  candidate_count?: number | string | null
  has_approved_link?: boolean | null
  receipt_candidates?: unknown
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
  has_attachments: boolean | null
  reference: string | null
  project_code: string | null
  project_code_source: string | null
}

interface RecommendedFields {
  who: string
  account: string
  why: string
  taxRate: string
}

function asNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

function absAmount(value: unknown): number {
  return Math.abs(asNumber(value))
}

function moneyCents(value: unknown): number {
  return Math.round(absAmount(value) * 100)
}

function isAmountClose(a: unknown, b: unknown, toleranceCents = 2): boolean {
  return Math.abs(moneyCents(a) - moneyCents(b)) <= toleranceCents
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
  'card',
  'co',
  'company',
  'credit',
  'group',
  'internet',
  'limited',
  'ltd',
  'melbourne',
  'payment',
  'purchase',
  'pty',
  'sydney',
  'the',
  'transfer',
  'visa',
])

function tokens(value: unknown): string[] {
  return cleanText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !GENERIC_WORDS.has(token))
}

function vendorScore(needle: unknown, haystack: unknown): number {
  const left = cleanText(needle)
  const right = cleanText(haystack)
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) return 0.95

  const leftTokens = tokens(left)
  const rightTokens = new Set(tokens(right))
  if (!leftTokens.length || !rightTokens.size) return 0
  return leftTokens.filter((token) => rightTokens.has(token)).length / leftTokens.length
}

function dateDeltaDays(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  const first = new Date(`${a}T00:00:00`).getTime()
  const second = new Date(`${b}T00:00:00`).getTime()
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null
  return Math.round((second - first) / 86400000)
}

function addDays(date: string, delta: number): string {
  const value = new Date(`${date}T00:00:00`)
  value.setDate(value.getDate() + delta)
  return value.toISOString().slice(0, 10)
}

function isDateLine(line: string): boolean {
  return /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i.test(line.trim())
}

function parseDateLine(line: string): string | null {
  const match = line.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
  if (!match) return null
  const [, day, rawMonth, year] = match
  const month = MONTHS[rawMonth.toLowerCase()]
  if (!month) return null
  return `${year}-${month}-${day.padStart(2, '0')}`
}

function parseMoneyLine(line: string): number | null {
  const trimmed = line.trim()
  if (!/^-?\$?\(?\d[\d,]*(?:\.\d{2})?\)?$/.test(trimmed)) return null
  const negative = trimmed.includes('-') || (trimmed.startsWith('(') && trimmed.endsWith(')'))
  const number = Number(trimmed.replace(/[$,()]/g, '').replace('-', ''))
  if (!Number.isFinite(number)) return null
  return negative ? -number : number
}

function looksLikeXeroRowStart(lines: string[], index: number): boolean {
  if (!isDateLine(lines[index])) return false
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (isDateLine(lines[cursor])) return false
    if (/X{6,}\d*/i.test(lines[cursor])) return true
  }
  return false
}

function valueAfterLabel(block: string[], label: string): string | null {
  const index = block.findIndex((line) => line.toLowerCase() === label.toLowerCase())
  if (index < 0) return null
  for (const line of block.slice(index + 1)) {
    if (['who', 'what', 'why', 'options', 'add details'].includes(line.toLowerCase())) return null
    if (/^(name of the contact|choose the account|enter a description|select a bank account)/i.test(line)) return null
    if (line.trim()) return line.trim()
  }
  return null
}

function parseExistingMatch(block: string[]): string | null {
  const okIndex = block.findIndex((line) => line === 'OK')
  const searchFrom = okIndex >= 0 ? okIndex + 1 : 0
  const matchIndex = block.slice(searchFrom).findIndex((line) => /^Payment:/i.test(line))
  if (matchIndex >= 0) return block[searchFrom + matchIndex]
  return null
}

function matchedVendor(label: string | null): string {
  return String(label || '')
    .replace(/^Payment:\s*/i, '')
    .replace(/^Bill:\s*/i, '')
    .replace(/^Spend Money:\s*/i, '')
    .replace(/\s+\d[\d,]*(?:\.\d{2})?$/, '')
    .trim()
}

function recommendedFields(row: ParsedXeroRow, bankLine?: BankLineRow | null): RecommendedFields {
  const text = cleanText(`${row.description} ${bankLine?.payee || ''} ${bankLine?.particulars || ''} ${bankLine?.reference || ''}`)
  const vendor = row.suggestedWho || bankLine?.payee || row.description.split(/\s+/).slice(0, 4).join(' ')
  const amount = absAmount(row.amount)
  const underThreshold = amount <= 82.5
  const underThresholdReason = underThreshold ? ' - no invoice required under $82.50; keep business purpose clear' : ''

  if (isTransfer(row)) {
    return {
      who: '',
      account: 'Transfer',
      why: `NAB Visa card repayment/internal transfer - ${bankLine?.reference || 'card ending 1656'}`,
      taxRate: 'BAS Excluded',
    }
  }

  if (/belong|telstra|dialpad|starlink/.test(text)) {
    return {
      who: vendor,
      account: '489 - Telephone & Internet',
      why: `${vendor} phone/internet service${underThresholdReason}`,
      taxRate: 'GST on Expenses',
    }
  }

  if (/linktree|linkedin|squarespace|webflow|openai|anthropic|claude|notion|figma|vercel|railway|supabase|zapier|bitwarden|codeguide|descript|mighty|warp|cognition/.test(text)) {
    const taxRate = /linkedin|openai|anthropic|claude|notion|figma|vercel|railway|supabase|zapier|bitwarden|codeguide|descript|mighty|warp|cognition|webflow/.test(text)
      ? 'GST Free Expenses'
      : 'GST on Expenses'
    return {
      who: vendor,
      account: '485 - Subscriptions',
      why: `${vendor} subscription${underThresholdReason}`,
      taxRate,
    }
  }

  if (/qantas|virgin|avis|budget|booking|airbnb|hotel|novotel|dayuse/.test(text)) {
    return {
      who: vendor,
      account: '493 - Travel - National',
      why: `${vendor} travel-related spend`,
      taxRate: 'GST on Expenses',
    }
  }

  if (/cabfare|taxi|uber/.test(text)) {
    return {
      who: vendor,
      account: '452 - Parking, Tolls & Taxis',
      why: `${vendor} travel/taxi/rideshare spend${underThresholdReason}`,
      taxRate: 'GST on Expenses',
    }
  }

  if (/fuel|ampol|bp |liberty|shell|caltex|eg group|reddy express/.test(text)) {
    return {
      who: vendor,
      account: '449 - MV - Fuel & Oil',
      why: `${vendor} fuel/motor vehicle spend`,
      taxRate: 'GST on Expenses',
    }
  }

  if (/bunnings|stratco|electrical|hardware|kennards|trailer|tools|sydney tools/.test(text)) {
    return {
      who: vendor,
      account: '409 - Client to Advise',
      why: `${vendor} supplies/equipment - confirm project and account`,
      taxRate: 'GST on Expenses',
    }
  }

  if (underThreshold) {
    return {
      who: vendor,
      account: '429 - General Expenses',
      why: `${vendor}${underThresholdReason}`,
      taxRate: 'GST on Expenses',
    }
  }

  return {
    who: vendor,
    account: '409 - Client to Advise',
    why: `${vendor} - confirm receipt, project, and account before reconciling`,
    taxRate: 'GST on Expenses',
  }
}

function existingMatchVendorScore(row: ParsedXeroRow): number {
  const vendor = matchedVendor(row.existingMatchLabel)
  if (!vendor) return 0
  return vendorScore(row.description, vendor)
}

function parseTaxRate(block: string[]): string | null {
  return block.find((line) => /^(GST on Expenses|GST Free Expenses|BAS Excluded|Tax Rate)$/i.test(line.trim())) || null
}

function parseXeroPage(rawText: string): ParsedXeroRow[] {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const starts = lines
    .map((line, index) => (looksLikeXeroRowStart(lines, index) ? index : -1))
    .filter((index) => index >= 0)

  return starts.map((start, rowIndex) => {
    const end = starts[rowIndex + 1] ?? lines.length
    const block = lines.slice(start, end)
    const date = parseDateLine(block[0]) || ''
    const maskedIndex = block.findIndex((line) => /X{6,}\d*/i.test(line))
    const description = block.slice(1, maskedIndex >= 0 ? maskedIndex : 2).join(' ').trim()
    const typeLine = block.slice(maskedIndex + 1).find((line) => /Credit Card|Bank|Payment|Refund|Purchase/i.test(line)) || ''
    const amount = block.map(parseMoneyLine).find((value) => value !== null) ?? 0

    return {
      rowNumber: rowIndex + 1,
      date,
      description,
      transactionType: typeLine,
      amount,
      hasOkButton: block.includes('OK'),
      suggestedWho: valueAfterLabel(block, 'Who'),
      suggestedAccount: valueAfterLabel(block, 'What'),
      suggestedWhy: valueAfterLabel(block, 'Why'),
      suggestedTaxRate: parseTaxRate(block),
      existingMatchLabel: parseExistingMatch(block),
      rawBlock: block,
    }
  }).filter((row) => row.date && row.description && row.amount !== 0)
}

function receiptEvidenceUrl(row: ParsedXeroRow): string {
  const params = new URLSearchParams()
  const month = Number(row.date.slice(5, 7))
  const quarter = month >= 10 && month <= 12 ? 'Q2' : month >= 1 && month <= 3 ? 'Q3' : month >= 4 && month <= 6 ? 'Q4' : 'Q1'
  params.set('quarter', quarter)
  params.set('status', 'all')
  params.set('search', row.description.split(/\s+/).slice(0, 3).join(' '))
  return `/finance/receipt-evidence?${params.toString()}`
}

function xeroBillUrl(invoice: XeroInvoiceRow): string {
  if (!invoice.xero_id) return 'https://go.xero.com/AccountsPayable/Search.aspx'
  return `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${encodeURIComponent(invoice.xero_id)}`
}

function bestBankLineMatch(row: ParsedXeroRow, bankLines: BankLineRow[]) {
  const candidates = bankLines
    .map((line) => {
      const delta = dateDeltaDays(row.date, line.date)
      const score = vendorScore(row.description, `${line.payee || ''} ${line.particulars || ''} ${line.reference || ''}`)
      return { line, delta, score }
    })
    .filter(({ line, delta, score }) => (
      isAmountClose(row.amount, line.amount)
      && delta !== null
      && Math.abs(delta) <= BANK_LINE_WINDOW_DAYS
      && (score >= 0.25 || cleanText(row.description).includes('internet payment'))
    ))
    .sort((a, b) => {
      const scoreDiff = b.score - a.score
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff
      return Math.abs(a.delta || 0) - Math.abs(b.delta || 0)
    })

  return candidates[0] || null
}

function bestEvidenceMatch(row: ParsedXeroRow, evidenceRows: EvidenceRow[]) {
  const candidates = evidenceRows
    .map((line) => {
      const delta = dateDeltaDays(row.date, line.date)
      const score = vendorScore(row.description, `${line.payee || ''} ${line.particulars || ''} ${line.reference || ''} ${line.best_vendor_name || ''}`)
      return { line, delta, score }
    })
    .filter(({ line, delta, score }) => (
      isAmountClose(row.amount, line.amount)
      && delta !== null
      && Math.abs(delta) <= BANK_LINE_WINDOW_DAYS
      && score >= 0.25
    ))
    .sort((a, b) => {
      const confidenceDiff = asNumber(b.line.best_confidence) - asNumber(a.line.best_confidence)
      if (Math.abs(confidenceDiff) > 0.001) return confidenceDiff
      const scoreDiff = b.score - a.score
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff
      return Math.abs(a.delta || 0) - Math.abs(b.delta || 0)
    })

  return candidates[0] || null
}

function billMatches(row: ParsedXeroRow, invoices: XeroInvoiceRow[]) {
  return invoices
    .map((invoice) => {
      const delta = dateDeltaDays(row.date, invoice.date)
      const score = vendorScore(row.description, invoice.contact_name)
      return { invoice, delta, score }
    })
    .filter(({ invoice, delta, score }) => (
      isAmountClose(row.amount, invoice.total)
      && delta !== null
      && Math.abs(delta) <= DATE_WINDOW_DAYS
      && score >= 0.25
    ))
    .sort((a, b) => {
      const attachedDiff = Number(Boolean(b.invoice.has_attachments)) - Number(Boolean(a.invoice.has_attachments))
      if (attachedDiff !== 0) return attachedDiff
      const scoreDiff = b.score - a.score
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff
      return Math.abs(a.delta || 0) - Math.abs(b.delta || 0)
    })
}

function isTransfer(row: ParsedXeroRow): boolean {
  return /Credit Card Payment/i.test(row.transactionType)
    || /^INTERNET PAYMENT/i.test(row.description)
    || /linked acc/i.test(row.description)
}

function isRefund(row: ParsedXeroRow): boolean {
  return /Refund/i.test(row.transactionType)
}

function isUnderThreshold(row: ParsedXeroRow): boolean {
  return absAmount(row.amount) <= 82.5
}

function decideAction(params: {
  row: ParsedXeroRow
  bankMatch: ReturnType<typeof bestBankLineMatch>
  evidenceMatch: ReturnType<typeof bestEvidenceMatch>
  invoiceMatches: ReturnType<typeof billMatches>
}) {
  const { row, bankMatch, evidenceMatch, invoiceMatches } = params
  const bankStatus = String(bankMatch?.line.status || '').toLowerCase()
  const evidenceStatus = String(evidenceMatch?.line.evidence_status || '')
  const evidenceConfidence = asNumber(evidenceMatch?.line.best_confidence)
  const evidenceSource = String(evidenceMatch?.line.best_source || '').toLowerCase()
  const sourceLooksLikeReceipt = /(dext|receipt|xero_me|xero bill)/i.test(evidenceSource)
  const hasGoodEvidence = Boolean(
    evidenceMatch
    && (
      evidenceMatch.line.has_approved_link
      || ['covered_evidence', 'covered_legacy', 'high_confidence_candidate'].includes(evidenceStatus)
      || (sourceLooksLikeReceipt && evidenceConfidence >= 0.85)
    )
  )

  if (isTransfer(row)) {
    return {
      action: 'transfer' as SuggestedAction,
      label: 'Transfer, not spend',
      risk: row.hasOkButton ? 'low' as const : 'medium' as const,
      nextStep: 'Use Xero Transfer to the correct ACT bank account/card. Do not Create a spend item.',
    }
  }

  if (isRefund(row)) {
    return {
      action: 'refund_review' as SuggestedAction,
      label: 'Refund/credit review',
      risk: 'medium' as const,
      nextStep: 'Treat as a refund or credit. Do not code it as new spend. Match to the original supplier/credit if available.',
    }
  }

  if (row.existingMatchLabel) {
    const matchVendor = matchedVendor(row.existingMatchLabel)
    const matchScore = existingMatchVendorScore(row)
    if (matchScore < 0.35) {
      return {
        action: 'wrong_xero_suggestion' as SuggestedAction,
        label: 'Wrong Xero suggestion',
        risk: 'high' as const,
        nextStep: `Do not click OK. Xero is suggesting ${row.existingMatchLabel}, but that does not match ${row.description}. Use Find & Match only if you can find the true vendor, otherwise create/search the correct receipt.`,
      }
    }

    return {
      action: 'click_ok_existing_match' as SuggestedAction,
      label: 'Xero has a match',
      risk: 'low' as const,
      nextStep: `OK is only safe if the right-hand match is exactly ${row.existingMatchLabel} and the source document/vendor confirms ${matchVendor}.`,
    }
  }

  if (bankStatus === 'reconciled') {
    return {
      action: 'bookkeeper_review' as SuggestedAction,
      label: 'Mirror drift / already reconciled',
      risk: 'high' as const,
      nextStep: 'ACT mirror says this bank line is already reconciled while Xero page still shows it. Do not click blindly; refresh/sync Xero or inspect the row before acting.',
    }
  }

  if (invoiceMatches.length === 1) {
    return {
      action: 'find_match_bill' as SuggestedAction,
      label: 'Find & Match bill',
      risk: 'low' as const,
      nextStep: 'Use Find & Match to match this bank line to the existing Xero bill. Do not Create a duplicate.',
    }
  }

  if (invoiceMatches.length > 1) {
    return {
      action: 'bookkeeper_review' as SuggestedAction,
      label: 'Multiple bill candidates',
      risk: 'high' as const,
      nextStep: 'Stop and inspect the Xero bill candidates. Pick the exact bill or leave for review.',
    }
  }

  if (hasGoodEvidence) {
    return {
      action: 'create_with_evidence' as SuggestedAction,
      label: 'Create with receipt evidence',
      risk: 'medium' as const,
      nextStep: 'Receipt evidence exists. Open the receipt preview, confirm vendor/date/amount, then create or match in Xero using the recommended fields.',
    }
  }

  if (isUnderThreshold(row)) {
    return {
      action: 'create_low_value' as SuggestedAction,
      label: 'Low-value create',
      risk: 'low' as const,
      nextStep: 'Safe to create as low-value/no-paperwork if business purpose, account, project, and tax treatment are correct. If a receipt exists, attach/approve it later.',
    }
  }

  if (row.hasOkButton && row.suggestedWho && row.suggestedAccount) {
    return {
      action: 'unsafe_create' as SuggestedAction,
      label: 'Xero suggests create',
      risk: 'medium' as const,
      nextStep: 'Xero has enough fields to create, but no local receipt/bill match was found. Confirm receipt need before OK.',
    }
  }

  return {
    action: 'bookkeeper_review' as SuggestedAction,
    label: 'Needs human decision',
    risk: 'high' as const,
    nextStep: 'No safe bill/receipt/no-receipt path found. Search receipt evidence, Gmail, or leave for Standard Ledger.',
  }
}

async function fetchPaged<T>(queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, pageSize = 1000): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawText = String(body.text || '')
    const parsedRows = parseXeroPage(rawText)

    if (!parsedRows.length) {
      return NextResponse.json({
        parsedCount: 0,
        summary: {},
        rows: [],
        warnings: ['No Xero bank reconciliation rows were parsed. Copy the page text from the Reconcile tab and paste it again.'],
      })
    }

    const dates = parsedRows.map((row) => row.date).sort()
    const start = addDays(dates[0], -DATE_WINDOW_DAYS)
    const end = addDays(dates[dates.length - 1], DATE_WINDOW_DAYS)

    const [bankLines, evidenceRows, invoices] = await Promise.all([
      fetchPaged<BankLineRow>((from, to) => supabase
        .from('bank_statement_lines')
        .select('id,date,payee,particulars,reference,amount,direction,status,bank_account,project_code,project_source,receipt_match_status,receipt_match_score')
        .gte('date', start)
        .lte('date', end)
        .range(from, to)),
      fetchPaged<EvidenceRow>((from, to) => supabase
        .from('v_finance_bank_line_evidence')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .range(from, to)),
      fetchPaged<XeroInvoiceRow>((from, to) => supabase
        .from('xero_invoices')
        .select('id,xero_id,invoice_number,type,status,contact_name,date,total,amount_due,amount_paid,has_attachments,reference,project_code,project_code_source')
        .eq('type', 'ACCPAY')
        .gte('date', start)
        .lte('date', end)
        .range(from, to)),
    ])

    const rows = parsedRows.map((row) => {
      const bankMatch = bestBankLineMatch(row, bankLines)
      const evidenceMatch = bestEvidenceMatch(row, evidenceRows)
      const invoicesForRow = billMatches(row, invoices).slice(0, 5)
      const decision = decideAction({ row, bankMatch, evidenceMatch, invoiceMatches: invoicesForRow })
      const fields = recommendedFields(row, bankMatch?.line || null)
      const bestInvoice = invoicesForRow[0]?.invoice || null
      const evidence = evidenceMatch?.line || null

      return {
        ...row,
        suggestedAction: decision.action,
        actionLabel: decision.label,
        risk: decision.risk,
        nextStep: decision.nextStep,
        recommendedFields: fields,
        receiptEvidenceUrl: receiptEvidenceUrl(row),
        bankLine: bankMatch ? {
          id: bankMatch.line.id,
          date: bankMatch.line.date,
          payee: bankMatch.line.payee,
          amount: asNumber(bankMatch.line.amount),
          status: bankMatch.line.status,
          bankAccount: bankMatch.line.bank_account,
          projectCode: bankMatch.line.project_code,
          projectSource: bankMatch.line.project_source,
          dateDeltaDays: bankMatch.delta,
          vendorScore: bankMatch.score,
        } : null,
        evidence: evidence ? {
          id: evidence.id,
          status: evidence.evidence_status || evidence.receipt_match_status || 'unknown',
          bestConfidence: asNumber(evidence.best_confidence),
          bestSource: evidence.best_source || null,
          bestVendorName: evidence.best_vendor_name || null,
          candidateCount: asNumber(evidence.candidate_count),
          hasApprovedLink: Boolean(evidence.has_approved_link),
        } : null,
        billCandidates: invoicesForRow.map(({ invoice, delta, score }) => ({
          id: invoice.id,
          xeroId: invoice.xero_id,
          invoiceNumber: invoice.invoice_number,
          contactName: invoice.contact_name,
          date: invoice.date,
          total: asNumber(invoice.total),
          status: invoice.status,
          amountPaid: asNumber(invoice.amount_paid),
          amountDue: asNumber(invoice.amount_due),
          hasAttachments: Boolean(invoice.has_attachments),
          reference: invoice.reference,
          projectCode: invoice.project_code,
          dateDeltaDays: delta,
          vendorScore: score,
          xeroUrl: xeroBillUrl(invoice),
        })),
        bestXeroBillUrl: bestInvoice ? xeroBillUrl(bestInvoice) : null,
      }
    })

    const summary = rows.reduce((acc: Record<string, number>, row) => {
      acc.total = (acc.total || 0) + 1
      acc[row.suggestedAction] = (acc[row.suggestedAction] || 0) + 1
      if (row.risk === 'high') acc.highRisk = (acc.highRisk || 0) + 1
      if (row.risk === 'low') acc.lowRisk = (acc.lowRisk || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      parsedCount: parsedRows.length,
      dateRange: { start, end },
      sourceCounts: {
        bankLines: bankLines.length,
        evidenceRows: evidenceRows.length,
        xeroBills: invoices.length,
      },
      summary,
      rows,
      warnings: [
        'This is a decision aid only. It does not mutate Xero or Supabase.',
        'The bank-line/evidence matches are from the ACT Supabase mirror, not the live Xero Reconcile screen.',
        'Treat Xero green matches as suggestions only. Vendor, amount, date, and business meaning must all line up.',
      ],
    })
  } catch (error) {
    console.error('[finance/xero-page-copilot] POST failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
