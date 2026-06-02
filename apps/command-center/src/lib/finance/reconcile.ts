import { supabase } from '@/lib/supabase'
import { fetchAllRows } from './query'

/**
 * Reconciliation engine — the typed, unit-tested core of the Reconciliation Cockpit
 * (plan: thoughts/shared/plans/2026-06-01-reconciliation-cockpit.md).
 *
 * For each NAB Visa card line it decides exactly what to do in Xero — MATCH an
 * existing bill (adding any card surcharge as an Adjustment), kill a DUPLICATE
 * (Dext published a bill AND the bank feed created a spend-line for the same
 * purchase), or CREATE with coding learned from how that vendor was coded in the
 * receipt pipeline. READ-ONLY: this prepares/codes/flags — it never writes to Xero.
 * The Xero API cannot set IsReconciled (UI-only), so the final reconcile click
 * always stays with Ben/SL.
 *
 * Lifted from scripts/reconcile-line-lookup.mjs so the API, the cockpit UI and the
 * scripts share ONE matching source of truth. The money math (surcharge sums,
 * duplicate value, totals) is TDD'd in reconcile.test.ts — a silent wrong number
 * is the expensive finance failure.
 */

// Match a card line against a Xero row within this many days either side.
export const RECONCILE_DATE_WINDOW_DAYS = 12

// A card surcharge/fee is small in both absolute and relative terms. Outside this
// band the amounts are different purchases, not the same one + a fee.
const SURCHARGE_MAX_DOLLARS = 15
const SURCHARGE_MAX_FRACTION = 0.06

export type ReconcileAction =
  | 'match_bill'
  | 'approve_draft'
  | 'match_txn'
  | 'already_reconciled'
  | 'duplicate'
  | 'create'
  | 'transfer' // credit repayment of the card from the linked Everyday account
  | 'refund' // credit refund from a merchant (offsets a debit charge / a credit note)

export interface CardLine {
  id: string
  date: string | null
  vendor: string
  amount: number // ABS bank charge
  status: string | null // 'reconciled' | 'unreconciled'
  projectCode: string | null
  bankAccount: string | null
  direction?: 'debit' | 'credit' // undefined = debit (back-compat); credits are repayments/refunds
  particulars?: string | null // raw bank particulars — used to spot "INTERNET PAYMENT" repayments
}

export interface XeroBill {
  contactName: string | null
  date: string | null
  amount: number
  status: string | null // AUTHORISED | PAID | DRAFT | ...
  hasAttachments: boolean | null
  xeroId?: string | null // Xero InvoiceID — copy to find/verify the bill (esp. the DANGER cluster)
}

export interface XeroSpendTxn {
  contactName: string | null
  date: string | null
  amount: number
  isReconciled: boolean | null
  xeroTxnId?: string | null // Xero BankTransactionID — copy to find the spend-money txn on the reconcile screen
}

export interface DextCoding {
  vendor: string
  project: string | null
  amount: number | null
  date: string | null
  receiptUrl: string | null
}

export interface ReconcileContext {
  bills: XeroBill[]
  txns: XeroSpendTxn[]
  dext: DextCoding[]
}

export interface ReconcileLineResult {
  line: CardLine
  action: ReconcileAction
  matchedBill?: XeroBill
  matchedTxn?: XeroSpendTxn
  surcharge: number // bank amount − matched reference amount (0 if exact / no match)
  suggestedProject: string | null
  suggestedAccount: string | null
  receiptUrl: string | null
  fromDext: boolean
  note: string
  danger: boolean // true = matching an AUTHORISED unpaid bill: real-payment-or-phantom, needs per-line judgement
  offsetLineId?: string // a refund credit that cancels this debit charge (and vice-versa)
  ruleCovered?: boolean // a generated bank rule will pre-fill this CREATE line → one-click OK in Xero (no matching)
}

export interface ReconcileSummary {
  totalLines: number
  totalValue: number
  matchCount: number
  matchValue: number
  duplicateCount: number
  duplicateValue: number
  createCount: number
  createValue: number
  alreadyReconciledCount: number
  alreadyReconciledValue: number
  transferCount: number
  transferValue: number
  refundCount: number
  refundValue: number
  surchargeCount: number
  surchargeTotal: number
}

/**
 * A draft Xero bank rule for a recurring no-bill vendor. Setting it once in the
 * Xero UI (there is NO bank-rules API — verified) makes every future line from that
 * vendor arrive on the reconcile screen pre-filled → one-click OK, with NO matching.
 * This is the only auto-suggest lever Xero gives; the pack is the matching-killer for
 * the recurring CREATE bulk. Rules NEVER target match-to-bill lines (that would double-count).
 */
export interface BankRule {
  matchText: string // the "Payee contains <X>" token Xero matches on
  contactName: string // the contact to set
  lineCount: number // recurring lines this rule collapses to one-click
  totalValue: number // $ this rule would auto-code (money — TDD'd)
  account: string // learned/guessed account code; UNKNOWN_ACCOUNT placeholder if not inferable
  accountConfident: boolean // false = Ben sets the account on first use (rule still scopes contact+project+match)
  defaultProject: string | null // most-common project across the vendor's lines
  taxHint: string // GST guidance (SaaS/subscriptions vary — overseas often GST-free)
  uncertainTax: boolean // true = set tax per vendor (don't blanket-apply GST)
}

export interface BankRulePack {
  rules: BankRule[]
  ruleCount: number
  coveredLineCount: number // CREATE lines that become one-click OK once the rules are set
  coveredValue: number
  coveredLineIds: string[]
}

export type ReconcileActionFilter = ReconcileAction | 'all'

export interface ReconcileFilters {
  action: ReconcileActionFilter
  q: string
  minAmount: number
  limit: number
  sort?: 'action' | 'date' // 'date' mirrors Xero's reconcile screen order (oldest-first); default 'action'
}

export interface ReconcileResponse {
  filters: ReconcileFilters
  summary: ReconcileSummary
  bankRules: BankRulePack
  totalMatching: number
  results: ReconcileLineResult[]
}

// --- numeric helpers -------------------------------------------------------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function dayGap(a: string | null, b: string | null): number {
  if (!a || !b) return Infinity
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000)
}

/**
 * 'exact' when within half a cent; 'surcharge' when the bank charge is the
 * reference + a small card fee (both an absolute and a percentage cap so a $20
 * gap never passes and a $1 gap on a $6 purchase never passes); else null.
 */
export function amountCloseness(bankAmt: number, refAmt: number): 'exact' | 'surcharge' | null {
  const diff = Math.abs(bankAmt - refAmt)
  if (diff < 0.005) return 'exact'
  if (diff <= SURCHARGE_MAX_DOLLARS && diff <= refAmt * SURCHARGE_MAX_FRACTION) return 'surcharge'
  return null
}

export function surchargeOf(bankAmt: number, refAmt: number): number {
  return round2(bankAmt - refAmt)
}

// --- vendor matching -------------------------------------------------------

const VENDOR_STOPWORDS = new Set([
  'THE', 'AND', 'PAYMENT', 'PURCHASE', 'CARD', 'AUSTRALIA', 'PTY', 'COM', 'AUS',
  'BUSINESS', 'HELP', 'MEMBERSHIP', 'LIMITED', 'SYDNEY', 'STORES', 'CENTRE',
  'GROUP', 'SALES', 'SERVICES', 'SERVICE', 'STORE', 'SHOP', 'ONLINE',
  'COMMUNITY', 'HIRE', 'CO', 'OF',
])

export function normalizeVendor(s: string | null | undefined): string {
  return (s || '')
    .toUpperCase()
    .replace(/SQ ?\*?|SQSP ?\*?|UBER ?\*?|SP ?\*?|X{4,}\d*|PTY LTD| LTD| INC|\d{3,}|[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function vendorTokens(s: string | null | undefined): Set<string> {
  return new Set(
    normalizeVendor(s)
      .split(' ')
      .filter((w) => w.length >= 3 && !VENDOR_STOPWORDS.has(w))
  )
}

/** True when the two names share at least one significant token. */
export function vendorMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ta = vendorTokens(a)
  const tb = vendorTokens(b)
  if (!ta.size || !tb.size) return false
  for (const t of ta) if (tb.has(t)) return true
  return false
}

// --- finders (vendor-gated; exact amount beats surcharge; nearest date) -----

interface Scored<T> {
  row: T
  closeness: 'exact' | 'surcharge'
}

function bestMatch<T extends { date: string | null; amount: number; contactName?: string | null }>(
  rows: T[],
  line: CardLine
): T | undefined {
  const scored: Scored<T>[] = []
  for (const row of rows) {
    const c = amountCloseness(line.amount, row.amount)
    if (!c) continue
    if (dayGap(row.date, line.date) > RECONCILE_DATE_WINDOW_DAYS) continue
    if (!vendorMatch(line.vendor, row.contactName)) continue
    scored.push({ row, closeness: c })
  }
  scored.sort(
    (a, b) =>
      (a.closeness === 'exact' ? 0 : 1) - (b.closeness === 'exact' ? 0 : 1) ||
      dayGap(a.row.date, line.date) - dayGap(b.row.date, line.date)
  )
  return scored[0]?.row
}

function bestDext(dext: DextCoding[], line: CardLine): DextCoding | undefined {
  const scored: Scored<DextCoding>[] = []
  for (const row of dext) {
    if (row.amount == null) continue
    const c = amountCloseness(line.amount, row.amount)
    if (!c) continue
    if (dayGap(row.date, line.date) > RECONCILE_DATE_WINDOW_DAYS) continue
    if (!vendorMatch(line.vendor, row.vendor)) continue
    scored.push({ row, closeness: c })
  }
  scored.sort(
    (a, b) =>
      (a.closeness === 'exact' ? 0 : 1) - (b.closeness === 'exact' ? 0 : 1) ||
      dayGap(a.row.date, line.date) - dayGap(b.row.date, line.date)
  )
  return scored[0]?.row
}

/**
 * Learned coding: most-common project seen for this vendor across the receipt
 * pipeline. (Account is not captured per-receipt in the DB, so accounts fall to
 * the heuristic guess below — see plan note on the Dext CSV vs receipt_emails.)
 */
function learnedProject(dext: DextCoding[], vendor: string): string | null {
  const counts = new Map<string, number>()
  for (const row of dext) {
    if (!row.project) continue
    if (!vendorMatch(vendor, row.vendor)) continue
    counts.set(row.project, (counts.get(row.project) || 0) + 1)
  }
  let best: string | null = null
  let bestN = 0
  for (const [proj, n] of counts) if (n > bestN) ((best = proj), (bestN = n))
  return best
}

// Account we couldn't infer — the line (and any rule for it) needs a human to set the code.
const UNKNOWN_ACCOUNT = '? - code by hand'

// Last-resort heuristic for vendors never seen in the receipt pipeline:
// keyword → account; location → project hint. Mirrors guess() in the script.
function guessAccount(vendor: string): string {
  const u = vendor.toUpperCase()
  if (/UBER|CAB|TAXI/.test(u)) return '452 - Taxis'
  if (/HOTEL|NOVOTEL|BOOKING|DAYUSE|AIRBNB|QANTAS|VIRGIN|AVIS/.test(u)) return '493 - Travel'
  if (/XERO|SQUARESPACE|OPENAI|GARMIN|ADOBE|FIGMA/.test(u)) return '485 - Subscriptions'
  if (/AMZNPRIME|AUDIBLE|PRIME/.test(u)) return '880 - Drawings (personal?)'
  if (/ECOFLO|HARDWARE|STRATCO|BUNNINGS/.test(u)) return '446 - Materials & Supplies'
  if (/NEWS PTY/.test(u)) return '485 - Subscriptions'
  if (/WOOLW|COLES|ALDI|IGA|SUPERMARKET|FOODS|BUTCHER|GUZMAN|CAFE|SUSHI|RICEBOI|BONKERS|BUFFET/.test(u)) {
    return '421 - Light meals'
  }
  return UNKNOWN_ACCOUNT
}

function guessProjectHint(vendor: string): string | null {
  const u = vendor.toUpperCase()
  if (/ALICE|AMPIL|LARRAKEYAH|MANINGRIDA|BARLMARRK|AHERRENGE|TENNANT/.test(u)) return 'NT trip → ACT-GD/OO?'
  if (/MALENY|WITTA|CALOUNDRA|MOOLOOLABA|CONONDALE/.test(u)) return 'ACT-FM (Farm)?'
  if (/SURRY|SYDNEY|GEORGE|EDGECLIFF|MASCOT/.test(u)) return 'Sydney → ?'
  return null
}

// --- classification cascade ------------------------------------------------

// A linked-account card repayment ("INTERNET PAYMENT Linked Acc Trns" / "...Up").
function isRepayment(line: CardLine): boolean {
  return /INTERNET PAYMENT/i.test(`${line.particulars || ''} ${line.vendor || ''}`)
}

/**
 * Credit-side classifier. A credit on a credit-card feed is money coming IN:
 * either a repayment of the card from the linked Everyday account (→ Transfer,
 * never an account-coded line) or a merchant refund (→ offset the original
 * charge / match a credit note). Coding either as income/create double-counts.
 */
function classifyCreditLine(line: CardLine): ReconcileLineResult {
  const base: ReconcileLineResult = {
    line,
    action: 'refund',
    surcharge: 0,
    suggestedProject: null,
    suggestedAccount: null,
    receiptUrl: null,
    fromDext: false,
    danger: false,
    note: '',
  }
  if (isRepayment(line)) {
    return {
      ...base,
      action: 'transfer',
      note: 'Transfer from NJ Marchesi T/as ACT Everyday — no account, no GST, no project',
    }
  }
  return {
    ...base,
    action: 'refund',
    note: 'Merchant refund — match a credit note, or offset the original charge of the same amount',
  }
}

export function classifyLine(line: CardLine, ctx: ReconcileContext): ReconcileLineResult {
  if (line.direction === 'credit') return classifyCreditLine(line)

  const bill = bestMatch(ctx.bills, line)
  const txn = bestMatch(ctx.txns, line)
  const dx = bestDext(ctx.dext, line)

  const base = {
    line,
    suggestedProject: line.projectCode,
    suggestedAccount: null as string | null,
    receiptUrl: null as string | null,
    fromDext: false,
    danger: false,
  }

  // 1. Same purchase exists as BOTH a bill and a card txn → duplicate.
  if (bill && txn) {
    return {
      ...base,
      action: 'duplicate',
      matchedBill: bill,
      matchedTxn: txn,
      surcharge: surchargeOf(line.amount, bill.amount),
      suggestedProject: line.projectCode,
      receiptUrl: null,
      note: `Match the BILL (${bill.status}, ${bill.contactName}); delete the duplicate card txn`,
    }
  }

  // 2. Draft bill — approve, then match.
  if (bill && bill.status === 'DRAFT') {
    return {
      ...base,
      action: 'approve_draft',
      matchedBill: bill,
      surcharge: surchargeOf(line.amount, bill.amount),
      note: `Approve draft bill (${bill.contactName}), then match`,
    }
  }

  // 3. Approved/paid bill → match. AUTHORISED (unpaid) = DANGER: matching pays it,
  // but it might be a phantom to void instead — needs per-line judgement (SL cluster).
  if (bill) {
    return {
      ...base,
      action: 'match_bill',
      matchedBill: bill,
      surcharge: surchargeOf(line.amount, bill.amount),
      danger: bill.status === 'AUTHORISED',
      note: `Match to bill — search name "${bill.contactName}" (${bill.status}${bill.hasAttachments ? ', has receipt' : ''})`,
    }
  }

  // 4. Unreconciled card txn already in Xero → match.
  if (txn && txn.isReconciled === false) {
    return {
      ...base,
      action: 'match_txn',
      matchedTxn: txn,
      surcharge: surchargeOf(line.amount, txn.amount),
      note: `Match to existing card txn (${txn.contactName})`,
    }
  }

  // 4b. A matching txn exists but is ALREADY reconciled (or its reconcile state is unknown).
  // The charge is already entered in Xero — creating would double-count. The bank line either
  // needs reconciling against the existing entry, or it's a stale/duplicate bank-feed import.
  // This is the recurring-subscription trap (e.g. Belong $35/mo): without this branch a line whose
  // only match is a reconciled txn falls through to CREATE and recommends a duplicate.
  if (txn) {
    return {
      ...base,
      action: 'already_reconciled',
      matchedTxn: txn,
      surcharge: surchargeOf(line.amount, txn.amount),
      note: `A matching txn already exists in Xero (${txn.contactName}, reconciled) — likely already entered. Verify/reconcile the bank line; do NOT create a duplicate.`,
    }
  }

  // 5. Create from a receipt-pipeline match → carry its coding + receipt image.
  if (dx) {
    return {
      ...base,
      action: 'create',
      surcharge: dx.amount != null ? surchargeOf(line.amount, dx.amount) : 0,
      suggestedProject: dx.project || line.projectCode,
      suggestedAccount: guessAccount(line.vendor),
      receiptUrl: dx.receiptUrl,
      fromDext: true,
      note: `Create — ${dx.project || 'no project'} · receipt attached`,
    }
  }

  // 6. Create with a project learned from how this vendor was coded before.
  const learned = learnedProject(ctx.dext, line.vendor)
  if (learned) {
    return {
      ...base,
      action: 'create',
      surcharge: 0,
      suggestedProject: learned,
      suggestedAccount: guessAccount(line.vendor),
      note: 'Create — project learned from prior coding of this vendor',
    }
  }

  // 7. Create with the last-resort heuristic guess (human confirms).
  const hint = guessProjectHint(line.vendor)
  return {
    ...base,
    action: 'create',
    surcharge: 0,
    suggestedProject: line.projectCode,
    suggestedAccount: guessAccount(line.vendor),
    note: `Create — heuristic${hint ? ` · ${hint}` : ''} (confirm)`,
  }
}

// --- aggregation (money math — TDD'd) --------------------------------------

export function summarizeReconcile(results: ReconcileLineResult[]): ReconcileSummary {
  const summary: ReconcileSummary = {
    totalLines: results.length,
    totalValue: 0,
    matchCount: 0,
    matchValue: 0,
    duplicateCount: 0,
    duplicateValue: 0,
    createCount: 0,
    createValue: 0,
    alreadyReconciledCount: 0,
    alreadyReconciledValue: 0,
    transferCount: 0,
    transferValue: 0,
    refundCount: 0,
    refundValue: 0,
    surchargeCount: 0,
    surchargeTotal: 0,
  }

  for (const r of results) {
    summary.totalValue = round2(summary.totalValue + r.line.amount)

    if (r.action === 'duplicate') {
      summary.duplicateCount += 1
      summary.duplicateValue = round2(summary.duplicateValue + r.line.amount)
    } else if (r.action === 'create') {
      summary.createCount += 1
      summary.createValue = round2(summary.createValue + r.line.amount)
    } else if (r.action === 'already_reconciled') {
      summary.alreadyReconciledCount += 1
      summary.alreadyReconciledValue = round2(summary.alreadyReconciledValue + r.line.amount)
    } else if (r.action === 'transfer') {
      summary.transferCount += 1
      summary.transferValue = round2(summary.transferValue + r.line.amount)
    } else if (r.action === 'refund') {
      summary.refundCount += 1
      summary.refundValue = round2(summary.refundValue + r.line.amount)
    } else {
      // match_bill | approve_draft | match_txn
      summary.matchCount += 1
      summary.matchValue = round2(summary.matchValue + r.line.amount)
    }

    if (Math.abs(r.surcharge) >= 0.005) {
      summary.surchargeCount += 1
      summary.surchargeTotal = round2(summary.surchargeTotal + r.surcharge)
    }
  }

  return summary
}

// --- bank-rule pack (the matching-killer; money totals TDD'd) --------------

function mostCommon<T>(items: T[]): T | null {
  const counts = new Map<T, number>()
  for (const it of items) counts.set(it, (counts.get(it) || 0) + 1)
  let best: T | null = null
  let bestN = 0
  for (const [k, n] of counts) if (n > bestN) ((best = k), (bestN = n))
  return best
}

// Payment-rail / bank-generic tokens — never a vendor identity. A rule on "INTERNET" or
// "GOPAYID" would catch unrelated lines and misfire silently (the Garmin→Shipstation class).
// We skip them as rule keys; lines whose only token is one of these fall to manual coding.
const RULE_KEY_DENYLIST = new Set([
  'INTERNET', 'PAYMENT', 'TRANSFER', 'GOPAYID', 'PAYID', 'BPAY', 'OSKO', 'EFTPOS',
  'WITHDRAWAL', 'DEPOSIT', 'DIRECT', 'DEBIT', 'CREDIT', 'REVERSAL', 'REFUND', 'FEE',
  'WWW', 'HTTP',
])

// The first vendor-like token — the text a Xero bank rule matches "contains" on, and the
// grouping key so "KENNARDS HIRE SUNSHINE" + "KENNARDS HIRE PTY" share one rule. Skips
// payment-rail words so "DIRECT DEBIT TELSTRA" keys on TELSTRA, and "INTERNET PAYMENT"
// (no real vendor) keys on nothing → no rule.
function vendorRuleKey(vendor: string): string | null {
  for (const t of normalizeVendor(vendor).split(' ')) {
    if (t.length >= 3 && !VENDOR_STOPWORDS.has(t) && !RULE_KEY_DENYLIST.has(t)) return t
  }
  return null
}

const RULE_MIN_LINES = 2 // a one-off isn't worth a rule; rules are for RECURRING vendors

/**
 * Build the draft bank-rule pack from already-classified results. Only CREATE lines are
 * eligible — a rule pre-fills a Spend Money, so ruling a vendor that has a real bill would
 * double-count (you must MATCH those, not create). Recurring vendors (≥RULE_MIN_LINES) become
 * one rule each, carrying the account/project/tax the classifier already inferred; setting the
 * pack once in Xero collapses every covered line to a one-click OK with no matching.
 *
 * Mutates each covered result's `ruleCovered = true` so the UI can badge it.
 */
export function buildBankRulePack(results: ReconcileLineResult[]): BankRulePack {
  const groups = new Map<string, ReconcileLineResult[]>()
  for (const r of results) {
    if (r.action !== 'create') continue // SAFETY: never rule a match-to-bill line (double-count guard)
    const key = vendorRuleKey(r.line.vendor)
    if (!key) continue
    const g = groups.get(key)
    if (g) g.push(r)
    else groups.set(key, [r])
  }

  const rules: BankRule[] = []
  const coveredLineIds: string[] = []
  let coveredValue = 0

  for (const [key, group] of groups) {
    if (group.length < RULE_MIN_LINES) continue
    const account = mostCommon(
      group.map((r) => r.suggestedAccount).filter((a): a is string => !!a && a !== UNKNOWN_ACCOUNT)
    )
    const defaultProject = mostCommon(
      group.map((r) => r.suggestedProject).filter((p): p is string => !!p)
    )
    const contactName = mostCommon(group.map((r) => r.line.vendor)) || key
    const uncertainTax = !!account && /Subscription/i.test(account)
    const totalValue = round2(group.reduce((s, r) => s + r.line.amount, 0))

    rules.push({
      matchText: key,
      contactName,
      lineCount: group.length,
      totalValue,
      account: account || UNKNOWN_ACCOUNT,
      accountConfident: !!account,
      defaultProject,
      taxHint: uncertainTax
        ? 'GST varies — overseas SaaS often GST-free; set tax per vendor'
        : 'GST on Expenses',
      uncertainTax,
    })
    for (const r of group) {
      r.ruleCovered = true
      coveredLineIds.push(r.line.id)
    }
    coveredValue = round2(coveredValue + totalValue)
  }

  // Rank by clicks eliminated (lines collapsed), then $ — the goal is "fewest matches left",
  // so a 10-line rule beats a 2-line rule even if the 2-liner is higher value.
  rules.sort((a, b) => b.lineCount - a.lineCount || b.totalValue - a.totalValue)

  return {
    rules,
    ruleCount: rules.length,
    coveredLineCount: coveredLineIds.length,
    coveredValue,
    coveredLineIds,
  }
}

// --- response builder (pure; mirrors workbench.ts) -------------------------

const ACTION_ORDER: Record<ReconcileAction, number> = {
  duplicate: 0,
  match_bill: 1,
  approve_draft: 2,
  match_txn: 3,
  transfer: 4,
  refund: 5,
  already_reconciled: 6,
  create: 7,
}

function matchesAction(result: ReconcileLineResult, action: ReconcileActionFilter): boolean {
  return action === 'all' || result.action === action
}

function matchesQuery(result: ReconcileLineResult, q: string): boolean {
  if (!q) return true
  const haystack = [
    result.line.vendor,
    result.line.projectCode,
    result.suggestedProject,
    result.suggestedAccount,
    result.matchedBill?.contactName,
    result.matchedTxn?.contactName,
    result.note,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q.toLowerCase())
}

export function buildReconcileResponse(
  lines: CardLine[],
  ctx: ReconcileContext,
  filters: ReconcileFilters
): ReconcileResponse {
  const all = lines.map((line) => classifyLine(line, ctx))

  // Refund-offset pass: a merchant refund that exactly matches a debit charge of
  // the same vendor cancels it (e.g. an Airbnb charge + its Airbnb refund) — flag
  // the pair so both reconcile against each other instead of looking like spend.
  const debits = all.filter((r) => r.line.direction !== 'credit')
  for (const r of all) {
    if (r.action !== 'refund') continue
    const charge = debits.find(
      (d) =>
        d.line.id !== r.line.id &&
        amountCloseness(d.line.amount, r.line.amount) === 'exact' &&
        vendorMatch(d.line.vendor, r.line.vendor) &&
        dayGap(d.line.date, r.line.date) <= 60
    )
    if (charge) {
      r.offsetLineId = charge.line.id
      r.note = `Refund — offsets the $${r.line.amount.toFixed(2)} ${charge.line.vendor} charge (line ${charge.line.id}); reconcile them against each other`
    }
  }

  const byActionThenAmount = (a: ReconcileLineResult, b: ReconcileLineResult) =>
    ACTION_ORDER[a.action] - ACTION_ORDER[b.action] || b.line.amount - a.line.amount
  // 'date' mirrors Xero's reconcile screen (oldest-first); null dates sort last.
  const byDate = (a: ReconcileLineResult, b: ReconcileLineResult) =>
    (a.line.date || '9999').localeCompare(b.line.date || '9999') || b.line.amount - a.line.amount

  // Build the rule pack over the FULL set (it's a setup artifact, filter-independent) BEFORE
  // filtering — it also stamps ruleCovered on the shared result objects, so the flag flows
  // through to the filtered/paged view.
  const bankRules = buildBankRulePack(all)

  const filtered = all
    .filter((r) => matchesAction(r, filters.action))
    .filter((r) => r.line.amount >= filters.minAmount)
    .filter((r) => matchesQuery(r, filters.q))
    .sort(filters.sort === 'date' ? byDate : byActionThenAmount)

  return {
    filters,
    summary: summarizeReconcile(all),
    bankRules,
    totalMatching: filtered.length,
    results: filtered.slice(0, filters.limit),
  }
}

// --- data loaders (Supabase; 1000-cap-safe pagination) ---------------------
// bills (1,479) / spend txns (1,711) / receipt_emails (2,434) all exceed the
// PostgREST ~1000-row cap, so every load pages via fetchAllRows.

export const RECONCILE_FY_START = '2025-07-01'
export const RECONCILE_FY_END = '2026-06-30'
// NAB Visa ACT #8815 — matched as a substring to survive Xero's trailing-space drift.
export const RECONCILE_ACCOUNT = '8815'

export interface ReconcileWindow {
  start: string
  end: string
  account: string
}

export interface ReconcileProjectOption {
  code: string
  name: string | null
}

export interface ReconcileCockpitResponse extends ReconcileResponse {
  window: ReconcileWindow
  projects: ReconcileProjectOption[]
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

async function loadCardLines(w: ReconcileWindow): Promise<CardLine[]> {
  const rows = await fetchAllRows<{
    id: string
    date: string | null
    payee: string | null
    particulars: string | null
    reference: string | null
    amount: number | string | null
    status: string | null
    project_code: string | null
    bank_account: string | null
    direction: string | null
  }>((from, to) =>
    supabase
      .from('bank_statement_lines')
      .select('id, date, payee, particulars, reference, amount, status, project_code, bank_account, direction')
      // both directions: debits = card spend, credits = repayments (→Transfer) + refunds.
      .ilike('bank_account', `%${w.account}%`)
      .eq('status', 'unreconciled')
      .gte('date', w.start)
      .lte('date', w.end)
      .order('date', { ascending: false })
      .range(from, to)
  )

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    vendor: (r.payee || r.particulars || r.reference || 'Bank line').trim(),
    amount: Math.abs(num(r.amount)),
    status: r.status,
    projectCode: r.project_code,
    bankAccount: r.bank_account,
    direction: r.direction === 'credit' ? 'credit' : 'debit',
    particulars: r.particulars,
  }))
}

async function loadBills(w: ReconcileWindow): Promise<XeroBill[]> {
  const rows = await fetchAllRows<{
    xero_id: string | null
    contact_name: string | null
    date: string | null
    total: number | string | null
    status: string | null
    has_attachments: boolean | null
  }>((from, to) =>
    supabase
      .from('xero_invoices')
      .select('xero_id, contact_name, date, total, status, has_attachments')
      .eq('type', 'ACCPAY')
      .or('status.is.null,and(status.neq.DELETED,status.neq.VOIDED)')
      .gte('date', w.start)
      .lte('date', w.end)
      .range(from, to)
  )

  return rows.map((r) => ({
    contactName: r.contact_name,
    date: r.date,
    amount: Math.abs(num(r.total)),
    status: r.status,
    hasAttachments: r.has_attachments,
    xeroId: r.xero_id,
  }))
}

async function loadSpendTxns(w: ReconcileWindow): Promise<XeroSpendTxn[]> {
  const rows = await fetchAllRows<{
    xero_transaction_id: string | null
    contact_name: string | null
    date: string | null
    total: number | string | null
    is_reconciled: boolean | null
  }>((from, to) =>
    supabase
      .from('xero_transactions')
      .select('xero_transaction_id, contact_name, date, total, is_reconciled')
      .like('type', 'SPEND%')
      .ilike('bank_account', `%${w.account}%`)
      .or('status.is.null,status.neq.DELETED')
      .gte('date', w.start)
      .lte('date', w.end)
      .range(from, to)
  )

  return rows.map((r) => ({
    contactName: r.contact_name,
    date: r.date,
    amount: Math.abs(num(r.total)),
    isReconciled: r.is_reconciled,
    xeroTxnId: r.xero_transaction_id,
  }))
}

// Learned coding + receipt images come from the live receipt pipeline
// (receipt_emails), NOT the point-in-time Dext CSV the script used. attachment_url
// is a storage path inside the 'receipt-attachments' bucket — the route signs it.
async function loadDextCoding(w: ReconcileWindow): Promise<DextCoding[]> {
  const rows = await fetchAllRows<{
    vendor_name: string | null
    amount_detected: number | string | null
    project_code: string | null
    attachment_url: string | null
    received_at: string | null
  }>((from, to) =>
    supabase
      .from('receipt_emails')
      .select('vendor_name, amount_detected, project_code, attachment_url, received_at')
      .not('vendor_name', 'is', null)
      .gte('received_at', w.start)
      .lte('received_at', `${w.end}T23:59:59`)
      .range(from, to)
  )

  return rows.map((r) => ({
    vendor: r.vendor_name || '',
    amount: r.amount_detected == null ? null : num(r.amount_detected),
    project: r.project_code,
    date: r.received_at ? r.received_at.slice(0, 10) : null,
    receiptUrl: r.attachment_url,
  }))
}

async function loadProjects(): Promise<ReconcileProjectOption[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('code, name')
    .not('code', 'is', null)
    .or('status.is.null,status.neq.archived')
    .order('code', { ascending: true })
    .limit(500)
  if (error) throw new Error(`projects: ${error.message}`)
  return ((data || []) as ReconcileProjectOption[]).map((p) => ({ code: p.code, name: p.name }))
}

export async function loadReconcileContext(w: ReconcileWindow): Promise<{
  lines: CardLine[]
  ctx: ReconcileContext
  projects: ReconcileProjectOption[]
}> {
  const [lines, bills, txns, dext, projects] = await Promise.all([
    loadCardLines(w),
    loadBills(w),
    loadSpendTxns(w),
    loadDextCoding(w),
    loadProjects(),
  ])
  return { lines, ctx: { bills, txns, dext }, projects }
}

export async function getReconcileCockpit(
  filters: ReconcileFilters,
  window: ReconcileWindow = { start: RECONCILE_FY_START, end: RECONCILE_FY_END, account: RECONCILE_ACCOUNT }
): Promise<ReconcileCockpitResponse> {
  const { lines, ctx, projects } = await loadReconcileContext(window)
  const response = buildReconcileResponse(lines, ctx, filters)
  return { ...response, window, projects }
}
