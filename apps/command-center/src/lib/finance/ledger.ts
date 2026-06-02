import { supabase } from '@/lib/supabase'
import { aggregateProjectBudgets } from './budgets'
import { getFYDates } from './dates'

/**
 * THE ONE LEDGER — single source of truth for ACT money.
 *
 * Every finance surface should compute income / expense / cash / R&D through this module,
 * so no two pages disagree. Lifted from the blessed per-project logic in
 * `app/api/finance/projects/[code]/route.ts` (`realExpenseRows`) and generalised org-wide.
 *
 * Hard rules baked in (see thoughts/shared/reviews/command-center-trust-map/_schema-truth.md):
 *  - Compute by `type`, NEVER by sign. SPEND rows store `total` as a POSITIVE number, so the old
 *    `total < 0` logic returned $0 expenses and scooped SPEND into "revenue".
 *  - Income  = RECEIVE + RECEIVE-OVERPAYMENT bank transactions (cash basis).
 *  - Expense = ACCPAY bills (AUTHORISED/PAID) + bank SPEND/SPEND-OVERPAYMENT, with bank spends that
 *    are just the *payment* of a bill deduped out (same contact, same total, within 14 days).
 *  - Exclude transfers entirely — the real types are SPEND-TRANSFER / RECEIVE-TRANSFER (not "TRANSFER").
 *  - Cash = current_balance of the TWO ACT accounts only (two-account rule), with an `asOf` + staleness.
 *  - Entity-aware: `entityCode` filters by xero `entity_code`. Today everything is ACT-ST (sole trader);
 *    the param makes the migration to A Curious Tractor Pty Ltd a data event, not a rewrite.
 */

export const RD_REFUND_RATE = 0.435

/** The only two accounts ACT business spend lives in (two-account rule). */
export function isActBankAccount(name: string | null | undefined): boolean {
  const n = (name || '').trim()
  // Match by stable substrings — guards against trailing-whitespace drift in Xero names.
  return n.includes('ACT Everyday') || n.includes('8815')
}

const SPEND_TYPES = ['SPEND', 'SPEND-OVERPAYMENT']
const RECEIVE_TYPES = ['RECEIVE', 'RECEIVE-OVERPAYMENT']

interface BillRow { date: string; contact_name: string | null; total: number | string; amount_due: number | string | null; status: string }
interface SpendRow { date: string; contact_name: string | null; total: number | string; type: string; rd_eligible: boolean | null }
interface ReceiveRow { total: number | string | null; date: string }

/**
 * PostgREST caps every request at ~1000 rows even with .range() (server `max-rows`). Org-wide reads
 * that exceed 1000 (FY26 SPEND ~2k, bills ~2k) MUST paginate or the sums silently truncate — this
 * is exactly what shipped wrong first: cash_spent read $590K of the real $975K. Page until exhausted.
 */
async function fetchAllRows<T>(
  make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ rows: T[]; ok: boolean }> {
  const PAGE = 1000
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await make(from, from + PAGE - 1)
    if (error) return { rows, ok: false }
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < PAGE) return { rows, ok: true }
  }
}

// ── R&D Tax Incentive window (FY25-26 Path C — locked 2026-04-27) ──────────────
// FY24-25 forfeited (sole-trader period). Claim FY25-26 via A Curious Tractor Pty Ltd.
// Registration + lodgement window: opens after 30 Jun 2026 year-end, CLOSES 30 Apr 2027
// (10 months after year end). The hardcoded "30 Apr 2026 / −26 days" alarm was FALSE.
export interface RdTaxWindow {
  fy: string
  appliesToAct: boolean
  yearEnd: string
  lodgementClose: string
  daysUntilClose: number
  windowOpen: boolean
  note: string
}

export function getRdTaxWindow(now: Date = new Date()): RdTaxWindow {
  const yearEnd = '2026-06-30'
  const lodgementClose = '2027-04-30'
  const daysUntilClose = Math.ceil((new Date(lodgementClose).getTime() - now.getTime()) / 86400000)
  const windowOpen = now >= new Date(yearEnd)
  return {
    fy: 'FY25-26',
    appliesToAct: true,
    yearEnd,
    lodgementClose,
    daysUntilClose,
    windowOpen,
    note: windowOpen
      ? 'R&D claim window open — lodge via A Curious Tractor Pty Ltd before 30 Apr 2027.'
      : 'R&D claim is for FY25-26; registration/lodgement window opens after 30 Jun 2026 and closes 30 Apr 2027 (via A Curious Tractor Pty Ltd).',
  }
}

// ── Org ledger result ──────────────────────────────────────────────────────────
export interface OrgLedger {
  /** Cash actually received over the period (RECEIVE bank rows). NOTE: undercounts true income —
   *  most invoice settlements land as RECEIVE-TRANSFER, not RECEIVE. Use getMonthlyPL for headline revenue. */
  cashReceived: number
  /** Cash actually paid out over the period (SPEND + SPEND-OVERPAYMENT bank rows). */
  cashSpent: number
  /** cashReceived − cashSpent (raw bank movement, excl. transfers). Context, not the headline. */
  cashNet: number
  /** Project-style total cost: ACCPAY bills + bank spend deduped of bill-payments. Can EXCEED cash
   *  (includes unpaid authorised bills) — informational, not the headline. */
  committedExpense: number
  /** Outstanding ACCPAY (bills authorised but not yet paid), sum of amount_due. */
  billsOutstanding: number
  /** R&D-eligible spend: cash spend flagged rd_eligible or to an rd-eligible vendor, plus paid rd-vendor bills. */
  rdEligibleSpend: number
  rdPotentialRefund: number
  spendRowCount: number
  incomeRowCount: number
  /** Did every underlying query succeed? false → caller should mark the section "not wired". */
  ok: boolean
}

interface LedgerParams {
  fyStart: string
  fyEnd?: string
  /** Filter by Xero entity_code (e.g. 'ACT-ST', 'ACT-PL'). Omit for all entities. */
  entityCode?: string
}

export async function getOrgLedger({ fyStart, fyEnd, entityCode }: LedgerParams): Promise<OrgLedger> {
  // Entity scope (today all rows are ACT-ST; this future-proofs the Pty migration).
  const billPage = (from: number, to: number) => {
    let q = supabase.from('xero_invoices').select('date, contact_name, total, amount_due, status')
      .eq('type', 'ACCPAY').in('status', ['AUTHORISED', 'PAID']).gte('date', fyStart)
    if (fyEnd) q = q.lte('date', fyEnd)
    if (entityCode) q = q.eq('entity_code', entityCode)
    return q.range(from, to)
  }
  const spendPage = (from: number, to: number) => {
    // Exclude DELETED/voided rows — they stay in Xero's table and otherwise inflate
    // cashSpent, committedExpense and the 43.5% R&D-eligible claim. (Bills filter status above.)
    let q = supabase.from('xero_transactions').select('date, contact_name, total, type, rd_eligible')
      .in('type', SPEND_TYPES).or('status.is.null,status.neq.DELETED').gte('date', fyStart)
    if (fyEnd) q = q.lte('date', fyEnd)
    if (entityCode) q = q.eq('entity_code', entityCode)
    return q.range(from, to)
  }
  const receivePage = (from: number, to: number) => {
    let q = supabase.from('xero_transactions').select('total, date')
      .in('type', RECEIVE_TYPES).or('status.is.null,status.neq.DELETED').gte('date', fyStart)
    if (fyEnd) q = q.lte('date', fyEnd)
    if (entityCode) q = q.eq('entity_code', entityCode)
    return q.range(from, to)
  }

  const [billsR, spendsR, receivesR, rdVendors] = await Promise.all([
    fetchAllRows<BillRow>(billPage),
    fetchAllRows<SpendRow>(spendPage),
    fetchAllRows<ReceiveRow>(receivePage),
    supabase.from('vendor_project_rules').select('vendor_name').eq('rd_eligible', true),
  ])

  const ok = billsR.ok && spendsR.ok && receivesR.ok
  const billRows = billsR.rows
  const spendRows = spendsR.rows
  const receiveRows = receivesR.rows
  const norm = (s: string | null) => (s || '').trim().toUpperCase()
  const rdVendorSet = new Set((rdVendors.data || []).map((v: { vendor_name: string }) => norm(v.vendor_name)))
  const isRdVendor = (contact: string | null) => rdVendorSet.has(norm(contact))

  // HEADLINE — cash basis (reconciles with the bank).
  const income = receiveRows.reduce((a, r) => a + Number(r.total || 0), 0)
  const cashOut = spendRows.reduce((a, s) => a + Number(s.total || 0), 0)

  // SECONDARY — committed (project-style total). Dedupe bank spends that are just the payment of a
  // PAID bill (same contact, total, ±14 days), so the bill and its payment aren't both counted.
  const paidBills = billRows.filter((b) => b.status === 'PAID')
  const unmatchedSpend = spendRows.filter((s) => {
    const sd = new Date(s.date as string).getTime()
    return !paidBills.some(
      (b) =>
        norm(b.contact_name) === norm(s.contact_name) &&
        Number(b.total) === Number(s.total) &&
        Math.abs((new Date(b.date as string).getTime() - sd) / 86400000) <= 14,
    )
  })
  const billsTotal = billRows.reduce((a, b) => a + Number(b.total || 0), 0)
  const committedExpense = billsTotal + unmatchedSpend.reduce((a, s) => a + Number(s.total || 0), 0)
  const billsOutstanding = billRows.reduce((a, b) => a + Math.max(0, Number(b.amount_due || 0)), 0)

  // R&D-eligible: cash spend (flag or rd-vendor) + paid rd-vendor bills. Conservative — actual spend only.
  const rdEligibleSpend =
    spendRows
      .filter((s) => s.rd_eligible === true || isRdVendor(s.contact_name as string))
      .reduce((a, s) => a + Number(s.total || 0), 0) +
    paidBills.filter((b) => isRdVendor(b.contact_name as string)).reduce((a, b) => a + Number(b.total || 0), 0)

  return {
    cashReceived: Math.round(income),
    cashSpent: Math.round(cashOut),
    cashNet: Math.round(income - cashOut),
    committedExpense: Math.round(committedExpense),
    billsOutstanding: Math.round(billsOutstanding),
    rdEligibleSpend: Math.round(rdEligibleSpend),
    rdPotentialRefund: Math.round(rdEligibleSpend * RD_REFUND_RATE),
    spendRowCount: spendRows.length,
    incomeRowCount: receiveRows.length,
    ok,
  }
}

// ── Headline P&L (the maintained monthly rollup other surfaces use) ────────────
export interface MonthlyPL {
  revenue: number
  expenses: number
  net: number
  monthsCovered: number
  ok: boolean
}

/**
 * Headline accrual P&L from project_monthly_financials — the maintained rollup that /strategy and
 * the per-project pages already use, so /company agrees with them. It reconciles with the bank
 * (FY26 net ≈ +$518K ↔ balance ≈ +$586K), unlike raw cash-basis RECEIVE which undercounts income:
 * most invoice settlements ($1.3M ACCREC paid) land as inter-account RECEIVE-TRANSFER rows, not
 * plain RECEIVE bank transactions. Covers mapped transactions only.
 * Note: project_monthly_financials has no entity_code column yet (all data is ACT-ST today).
 */
export async function getMonthlyPL({ fyStart, fyEnd }: { fyStart: string; fyEnd?: string }): Promise<MonthlyPL> {
  let q = supabase.from('project_monthly_financials').select('month, revenue, expenses').gte('month', fyStart)
  if (fyEnd) q = q.lte('month', fyEnd)
  const { data, error } = await q.range(0, 9999)
  if (error || !data) return { revenue: 0, expenses: 0, net: 0, monthsCovered: 0, ok: false }
  const revenue = data.reduce((a, r) => a + Number(r.revenue || 0), 0)
  const expenses = data.reduce((a, r) => a + Number(r.expenses || 0), 0)
  return {
    revenue: Math.round(revenue),
    expenses: Math.round(expenses),
    net: Math.round(revenue - expenses),
    monthsCovered: new Set(data.map((r) => r.month)).size,
    ok: true,
  }
}

// ── Cash position (two-account rule, with staleness) ───────────────────────────
export interface CashPosition {
  cash: number
  asOf: string | null
  /** true if the balance feed hasn't refreshed in > 3 days (the sync pulls txns, not always balances). */
  stale: boolean
  accounts: { name: string; balance: number }[]
  ok: boolean
}

export async function getCashPosition(): Promise<CashPosition> {
  const { data, error } = await supabase
    .from('xero_bank_accounts')
    .select('name, current_balance, status, balance_updated_at')
    .eq('status', 'ACTIVE')

  if (error || !data) return { cash: 0, asOf: null, stale: true, accounts: [], ok: false }

  const actAccounts = data.filter((a) => isActBankAccount(a.name) && a.current_balance != null)
  const cash = actAccounts.reduce((s, a) => s + Number(a.current_balance), 0)
  const asOf = actAccounts.reduce<string | null>((latest, a) => {
    const t = a.balance_updated_at as string | null
    return t && (!latest || t > latest) ? t : latest
  }, null)
  const stale = asOf ? (Date.now() - new Date(asOf).getTime()) / 86400000 > 3 : true

  return {
    cash: Math.round(cash),
    asOf,
    stale,
    accounts: actAccounts.map((a) => ({ name: (a.name || '').trim(), balance: Number(a.current_balance) })),
    ok: true,
  }
}

// ── Weekly business-strength snapshot ──────────────────────────────────────────
// Whole-org snapshot section of the weekly report (plan: 2026-06-03-project-aligned-finance §4,
// issue #140). The date windows + burn/runway are pure + unit-tested (ledger.test.ts) because a
// wrong month boundary or a divide-by-zero runway is a silent, decision-relevant number.

const isoDay = (d: Date): string => d.toISOString().slice(0, 10)

/** First day of `now`'s month, as YYYY-MM-DD (UTC). */
export function monthStartISO(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
}

/** The N complete months BEFORE the current month (current month excluded). UTC, year-wrap safe. */
export function trailingMonthsWindow(now: Date, n: number): { start: string; end: string } {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  return {
    start: isoDay(new Date(Date.UTC(y, m - n, 1))), // first day of (current month − n)
    end: isoDay(new Date(Date.UTC(y, m, 0))), // day 0 of current month = last day of previous month
  }
}

/** N days before `now`, as YYYY-MM-DD. */
export function weekStartISO(now: Date, days: number): string {
  return isoDay(new Date(now.getTime() - days * 86400000))
}

/** Average monthly expense over a trailing window. Guards divide-by-zero (no data → 0, never NaN). */
export function monthlyBurnFromTrailing(trailingExpenses: number, monthsCovered: number): number {
  if (monthsCovered <= 0) return 0
  return Math.round(trailingExpenses / monthsCovered)
}

/** Months of runway = cash / monthly burn (1dp). null when burn <= 0 (no burn → runway not meaningful; never Infinity/negative). */
export function computeRunwayMonths(cash: number, monthlyBurn: number): number | null {
  if (monthlyBurn <= 0) return null
  return Math.round((cash / monthlyBurn) * 10) / 10
}

// ── Per-project P&L (weekly report §4, slice 2) ────────────────────────────────
const round1 = (n: number): number => Math.round(n * 10) / 10

/** (actual − budget) / budget %, 1dp. null when budget <= 0 (no budget → variance not meaningful). */
export function budgetVariancePct(actual: number, budget: number): number | null {
  if (budget <= 0) return null
  return round1(((actual - budget) / budget) * 100)
}

/** actual / budget %, 1dp. null when budget <= 0. */
export function pctConsumed(actual: number, budget: number): number | null {
  if (budget <= 0) return null
  return round1((actual / budget) * 100)
}

export interface ProjectPLRow {
  code: string
  name: string | null
  income: number
  spend: number
  net: number // income − spend; < 0 = ACT-subsidised
  budget: number // annual expense budget
  variancePct: number | null // spend vs budget
  pctConsumed: number | null
  funded: boolean // income >= spend (self-sustaining), else ACT covers the gap
}

/**
 * Join monthly financial rows + aggregated budgets + names into per-project P&L rows.
 * Pure (unit-tested): sums revenue/expenses per code, classifies funded, computes budget
 * variance/consumed with divide-by-zero guards. Sorted by spend desc.
 */
export function buildProjectPLRows(
  monthly: { project_code: string | null; revenue: number; expenses: number }[],
  budgets: { project_code: string; annual_budget: number }[],
  names: Map<string, string | null>,
): ProjectPLRow[] {
  const byCode = new Map<string, { income: number; spend: number }>()
  for (const r of monthly) {
    const code = r.project_code
    if (!code) continue
    const acc = byCode.get(code) || { income: 0, spend: 0 }
    acc.income += Number(r.revenue || 0)
    acc.spend += Number(r.expenses || 0)
    byCode.set(code, acc)
  }
  const budgetByCode = new Map(budgets.map((b) => [b.project_code, b.annual_budget]))
  const rows: ProjectPLRow[] = [...byCode.entries()].map(([code, v]) => {
    const income = Math.round(v.income)
    const spend = Math.round(v.spend)
    const budget = budgetByCode.get(code) || 0
    return {
      code,
      name: names.get(code) ?? null,
      income,
      spend,
      net: income - spend,
      budget,
      variancePct: budgetVariancePct(spend, budget),
      pctConsumed: pctConsumed(spend, budget),
      funded: income >= spend,
    }
  })
  rows.sort((a, b) => b.spend - a.spend)
  return rows
}

// ── Line-item money math: people costs + GST (slices 3+4) ──────────────────────
// xero_transactions / xero_invoices keep account codes + tax inside the line_items JSON
// (no top-level account column), arriving as a JSON array OR a JSON string.
type RawLineItem = {
  AccountCode?: string; account_code?: string
  LineAmount?: number | string; line_amount?: number | string
  TaxAmount?: number | string; tax_amount?: number | string
}
interface LineItemRow { type?: string | null; project_code?: string | null; line_items?: unknown }

function asItems(line_items: unknown): RawLineItem[] {
  if (Array.isArray(line_items)) return line_items as RawLineItem[]
  if (typeof line_items === 'string') {
    try {
      const p = JSON.parse(line_items)
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}
const liAccount = (li: RawLineItem): string => String(li.AccountCode ?? li.account_code ?? '')
const liAmount = (li: RawLineItem): number => Math.abs(Number(li.LineAmount ?? li.line_amount ?? 0)) || 0
const liTax = (li: RawLineItem): number => Math.abs(Number(li.TaxAmount ?? li.tax_amount ?? 0)) || 0

// ACT chart (verified config/xero-chart.json) — NOT the generic '8000' ranges in tax/route.ts.
export const PEOPLE_ACCOUNTS = ['477', '478', '486'] // Wages & Salaries · Superannuation · Sub-contractors
export const DRAWINGS_ACCOUNTS = ['880', '882'] // Drawings — Nic / Ben (owner draw, NOT a business people cost)

export interface PeopleSpend {
  payroll: number // 477+478+486 line amounts
  drawings: number // 880+882 — flagged separately
  byProject: { code: string; amount: number }[] // payroll grouped by project, desc
}

/** Sum people-account line amounts (payroll) and drawings separately, attributing payroll to project. Pure. */
export function summarizePeopleSpend(rows: LineItemRow[]): PeopleSpend {
  let payroll = 0
  let drawings = 0
  const byProject = new Map<string, number>()
  for (const r of rows) {
    for (const li of asItems(r.line_items)) {
      const acct = liAccount(li)
      const amt = liAmount(li)
      if (PEOPLE_ACCOUNTS.includes(acct)) {
        payroll += amt
        if (r.project_code) byProject.set(r.project_code, (byProject.get(r.project_code) || 0) + amt)
      } else if (DRAWINGS_ACCOUNTS.includes(acct)) {
        drawings += amt
      }
    }
  }
  return {
    payroll: Math.round(payroll),
    drawings: Math.round(drawings),
    byProject: [...byProject.entries()].map(([code, amount]) => ({ code, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount),
  }
}

const GST_COLLECTED_TYPES = new Set(['RECEIVE', 'RECEIVE-OVERPAYMENT', 'ACCREC'])
const GST_PAID_TYPES = new Set(['SPEND', 'SPEND-OVERPAYMENT', 'ACCPAY'])

export interface GstPosition {
  collected: number // 1A — GST on sales (income)
  paid: number // 1B — GST on purchases (expense)
  net: number // collected − paid: + = owe the ATO, − = refund
}

/** GST collected vs paid from line-item TaxAmount, split by transaction type. Pure. */
export function gstFromRows(rows: LineItemRow[]): GstPosition {
  let collected = 0
  let paid = 0
  for (const r of rows) {
    const t = (r.type || '').toUpperCase()
    const tax = asItems(r.line_items).reduce((s, li) => s + liTax(li), 0)
    if (GST_COLLECTED_TYPES.has(t)) collected += tax
    else if (GST_PAID_TYPES.has(t)) paid += tax
  }
  return { collected: Math.round(collected), paid: Math.round(paid), net: Math.round(collected - paid) }
}

export interface MonthlyPoint {
  month: string
  revenue: number
  expenses: number
  net: number
}

/** Per-month revenue/expenses/net series (project_monthly_financials, summed across projects) — feeds the trend chart. */
export async function getMonthlySeries({ fyStart, fyEnd }: { fyStart: string; fyEnd?: string }): Promise<{ points: MonthlyPoint[]; ok: boolean }> {
  let q = supabase.from('project_monthly_financials').select('month, revenue, expenses').gte('month', fyStart)
  if (fyEnd) q = q.lte('month', fyEnd)
  const { data, error } = await q.range(0, 9999)
  if (error || !data) return { points: [], ok: false }
  const byMonth = new Map<string, { revenue: number; expenses: number }>()
  for (const r of data) {
    const k = String(r.month).slice(0, 7) // YYYY-MM
    const acc = byMonth.get(k) || { revenue: 0, expenses: 0 }
    acc.revenue += Number(r.revenue || 0)
    acc.expenses += Number(r.expenses || 0)
    byMonth.set(k, acc)
  }
  const points = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, revenue: Math.round(v.revenue), expenses: Math.round(v.expenses), net: Math.round(v.revenue - v.expenses) }))
  return { points, ok: true }
}

/**
 * Per-project P&L for the FY: income/spend/net + budget variance + funded classification, all projects.
 * Reuses the blessed budget pivot (aggregateProjectBudgets) and the FY label convention ('FY26') from
 * the existing /finance/projects route, so the weekly report agrees with the per-project pages.
 * Financials paginate (fetchAllRows) — ~75 projects × 12 months can approach the 1000-row cap.
 */
export async function getProjectPL({ fyStart, fyEnd, now = new Date() }: { fyStart: string; fyEnd?: string; now?: Date }): Promise<{ rows: ProjectPLRow[]; ok: boolean }> {
  const fyYear = `FY${getFYDates(now).fyEnd.slice(2, 4)}` // '2026-06-30' → 'FY26'
  const finPage = (from: number, to: number) => {
    let q = supabase.from('project_monthly_financials').select('project_code, revenue, expenses').gte('month', fyStart)
    if (fyEnd) q = q.lte('month', fyEnd)
    return q.range(from, to)
  }
  const [finR, budgetsRes, projectsRes] = await Promise.all([
    fetchAllRows<{ project_code: string | null; revenue: number | string | null; expenses: number | string | null }>(finPage),
    supabase.from('project_budgets').select('project_code, budget_type, budget_amount').eq('fy_year', fyYear).limit(500),
    supabase.from('projects').select('code, name').limit(500),
  ])
  const monthly = finR.rows.map((r) => ({ project_code: r.project_code, revenue: Number(r.revenue || 0), expenses: Number(r.expenses || 0) }))
  const budgets = aggregateProjectBudgets(budgetsRes.data || [], fyYear, now).map((b) => ({ project_code: b.project_code, annual_budget: b.annual_budget }))
  const names = new Map<string, string | null>(
    ((projectsRes.data || []) as { code: string; name: string | null }[]).map((p) => [p.code, p.name]),
  )
  return { rows: buildProjectPLRows(monthly, budgets, names), ok: finR.ok && !budgetsRes.error && !projectsRes.error }
}

export interface LineItemFacts {
  people: PeopleSpend
  gst: GstPosition
  receiptedPct: number | null // SPEND txns with an attachment / all SPEND txns (approx — has_attachments drifts)
  ok: boolean
}

/**
 * One pass over the FY's line-item-bearing rows (SPEND/RECEIVE txns + AUTHORISED/PAID bills + ACCREC
 * invoices) feeding BOTH the people-costs and GST sections — fetched once, not per section. Paginates
 * (line_items JSON over ~thousands of rows exceeds the 1000 cap).
 */
export async function getLineItemFacts({ fyStart, fyEnd }: { fyStart: string; fyEnd?: string }): Promise<LineItemFacts> {
  const txnPage = (from: number, to: number) => {
    let q = supabase.from('xero_transactions').select('type, project_code, line_items, has_attachments')
      .or('status.is.null,status.neq.DELETED').gte('date', fyStart)
    if (fyEnd) q = q.lte('date', fyEnd)
    return q.range(from, to)
  }
  const invPage = (from: number, to: number) => {
    let q = supabase.from('xero_invoices').select('type, project_code, line_items, status')
      .in('status', ['AUTHORISED', 'PAID']).gte('date', fyStart)
    if (fyEnd) q = q.lte('date', fyEnd)
    return q.range(from, to)
  }
  const [txnR, invR] = await Promise.all([
    fetchAllRows<{ type: string | null; project_code: string | null; line_items: unknown; has_attachments: boolean | null }>(txnPage),
    fetchAllRows<{ type: string | null; project_code: string | null; line_items: unknown; status: string | null }>(invPage),
  ])
  const all = [...txnR.rows, ...invR.rows]
  const spendTxns = txnR.rows.filter((r) => (r.type || '').toUpperCase().startsWith('SPEND'))
  const withReceipt = spendTxns.filter((r) => r.has_attachments === true).length
  const receiptedPct = spendTxns.length > 0 ? Math.round((withReceipt / spendTxns.length) * 1000) / 10 : null
  return { people: summarizePeopleSpend(all), gst: gstFromRows(all), receiptedPct, ok: txnR.ok && invR.ok }
}

export interface WeeklySnapshot {
  cash: number
  cashAsOf: string | null
  cashStale: boolean
  // Month-to-date is CASH BASIS (live xero_transactions) — the monthly accrual rollup lags and reads
  // $0 for the current month early on. Caveat: cash-basis income undercounts settlement months
  // (most invoice settlements land as RECEIVE-TRANSFER). The monthly chart shows the accrual truth.
  monthIncome: number
  monthSpend: number
  monthNet: number
  weekNet: number // last-7-days cash movement (cash basis, excl. transfers)
  monthlyBurn: number // trailing-3-month average expense (accrual, completed months)
  runwayMonths: number | null // cash / monthlyBurn; null = no burn
  receiptedPct: number | null // not wired in this slice — a later section adds it
  asOf: string // the day this snapshot was computed for
  ok: boolean
}

/**
 * Whole-org weekly snapshot. Composes the blessed ledger functions (getCashPosition / getOrgLedger /
 * getMonthlyPL) through the tested pure math above — no new money logic lives in the async layer.
 * Burn = trailing-3-month accrual (completed months); month/week = live cash basis (so the current,
 * incomplete month shows real activity instead of the lagging rollup's $0).
 */
export async function getWeeklySnapshot(now: Date = new Date()): Promise<WeeklySnapshot> {
  const asOf = isoDay(now)
  const tw = trailingMonthsWindow(now, 3)
  const [cash, monthLedger, trailing, week] = await Promise.all([
    getCashPosition(),
    getOrgLedger({ fyStart: monthStartISO(now), fyEnd: asOf }),
    getMonthlyPL({ fyStart: tw.start, fyEnd: tw.end }),
    getOrgLedger({ fyStart: weekStartISO(now, 7), fyEnd: asOf }),
  ])
  const monthlyBurn = monthlyBurnFromTrailing(trailing.expenses, trailing.monthsCovered)
  return {
    cash: cash.cash,
    cashAsOf: cash.asOf,
    cashStale: cash.stale,
    monthIncome: monthLedger.cashReceived,
    monthSpend: monthLedger.cashSpent,
    monthNet: monthLedger.cashNet,
    weekNet: week.cashNet,
    monthlyBurn,
    runwayMonths: computeRunwayMonths(cash.cash, monthlyBurn),
    receiptedPct: null,
    asOf,
    ok: cash.ok && monthLedger.ok && trailing.ok && week.ok,
  }
}
