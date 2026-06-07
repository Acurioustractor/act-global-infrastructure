import { supabase } from '@/lib/supabase'
import { aggregateProjectBudgets } from './budgets'
import { getFYDates } from './dates'
import { isRadarPipeline } from './pipeline-rollup'
import { execSql } from './query'

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
  TaxType?: string; tax_type?: string
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
const liTaxType = (li: RawLineItem): string => String(li.tax_type ?? li.TaxType ?? '').toUpperCase()

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

// Tax amount is NOT stored per line — only tax_type + a tax-exclusive line_amount. So derive GST as
// 10% of line_amount, classified by tax_type direction: OUTPUT* = on income (collected), INPUT* = on
// expenses (paid). EXEMPT*/GSTFREE/BASEXCLUDED/ZERORATED/INPUTTAXED carry no GST → 0.
const GST_RATE = 0.1
const GST_OUTPUT_TYPES = new Set(['OUTPUT', 'OUTPUT2'])
const GST_INPUT_TYPES = new Set(['INPUT', 'INPUT2'])

export interface GstPosition {
  collected: number // 1A — GST on sales (income)
  paid: number // 1B — GST on purchases (expense)
  net: number // collected − paid: + = owe the ATO, − = refund
}

/** GST collected vs paid, derived as 10% of line_amount by tax_type direction. Pure. */
export function gstFromRows(rows: LineItemRow[]): GstPosition {
  let collected = 0
  let paid = 0
  for (const r of rows) {
    for (const li of asItems(r.line_items)) {
      const tt = liTaxType(li)
      if (GST_OUTPUT_TYPES.has(tt)) collected += liAmount(li) * GST_RATE
      else if (GST_INPUT_TYPES.has(tt)) paid += liAmount(li) * GST_RATE
    }
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

// ── Commitments / "betting on" (slice 5) ───────────────────────────────────────
// Forward subscription run-rate: normalise every still-running sub to a monthly figure.
// Subscriptions are mid-Pty-cutover, so `active` + `pending_migration` both count as live;
// `cancelled` is excluded. annual ÷ 12; monthly/usage taken as-is. amount falls back to expected_amount.
export interface SubscriptionRow {
  account_status: string | null
  billing_cycle: string | null
  amount: number | string | null
  expected_amount: number | string | null
}
const LIVE_SUB_STATUSES = new Set(['active', 'pending_migration'])

export function monthlySubscriptionRunRate(rows: SubscriptionRow[]): number {
  let monthly = 0
  for (const r of rows) {
    if (!LIVE_SUB_STATUSES.has((r.account_status || '').toLowerCase())) continue
    const amt = Number(r.amount ?? r.expected_amount ?? 0) || 0
    monthly += (r.billing_cycle || '').toLowerCase() === 'annual' ? amt / 12 : amt
  }
  return Math.round(monthly)
}

// ── 13-week cash projection + invoice aging (dashboard restructure 2026-06-03) ──
// The glance headline. HARD DATA ONLY: cash + collectible AR − real burn over the horizon.
// It deliberately does NOT subtract open AP: ACT's AP is dominated by phantom, 100%-overdue,
// 16-month-old bills (unreconciled, not real debt) — subtracting it would print a false deep-negative
// headline. The AP problem is surfaced as a data-quality ALERT instead (getAttentionAlerts).
export function projectedCashFlow(cash: number, arCollectible: number, monthlyBurn: number, months = 3): number {
  return Math.round(cash + arCollectible - monthlyBurn * months)
}

export interface InvoiceAgingRow {
  amount_due: number | string | null
  due_date: string | null
  date?: string | null
}
export interface InvoiceAging {
  total: number // all open (amount_due > 0)
  overdue: number // due_date < now
  newlyOverdue: number // due_date crossed in the last `recentDays` (the "this week" window signal)
  dueInWindow: number // now <= due_date < now + windowDays
  dueLater: number // due_date >= now + windowDays
  undated: number // open but no due_date
  count: number // open invoice count
  oldestDate: string | null // earliest invoice `date` among open rows
}

/** Bucket open (amount_due>0) invoices by due_date relative to `now`. Pure. Drives AR (income) + the AP alert. */
export function invoiceAging(rows: InvoiceAgingRow[], now: Date, windowDays = 91, recentDays = 7): InvoiceAging {
  const today = isoDay(now)
  const windowEnd = isoDay(new Date(now.getTime() + windowDays * 86400000))
  const recentStart = isoDay(new Date(now.getTime() - recentDays * 86400000))
  let total = 0
  let overdue = 0
  let newlyOverdue = 0
  let dueInWindow = 0
  let dueLater = 0
  let undated = 0
  let count = 0
  let oldestDate: string | null = null
  for (const r of rows) {
    const amt = Number(r.amount_due || 0)
    if (amt <= 0) continue
    count += 1
    total += amt
    const due = r.due_date ? r.due_date.slice(0, 10) : null
    if (!due) undated += amt
    else if (due < today) {
      overdue += amt
      if (due >= recentStart) newlyOverdue += amt // crossed due within the last `recentDays`
    } else if (due < windowEnd) dueInWindow += amt
    else dueLater += amt
    const d = r.date ? r.date.slice(0, 10) : null
    if (d && (oldestDate === null || d < oldestDate)) oldestDate = d
  }
  return {
    total: Math.round(total),
    overdue: Math.round(overdue),
    newlyOverdue: Math.round(newlyOverdue),
    dueInWindow: Math.round(dueInWindow),
    dueLater: Math.round(dueLater),
    undated: Math.round(undated),
    count,
    oldestDate,
  }
}

// ── Attention panel (dashboard top tier — 2026-06-03 restructure) ───────────────
export type AlertSeverity = 'critical' | 'warning' | 'info'
export interface Alert {
  key: string
  severity: AlertSeverity
  title: string
  detail: string
}
export interface AttentionInput {
  runwayMonths: number | null
  ar: InvoiceAging
  ap: InvoiceAging
  concentration: Concentration
  projects: { code: string; name: string | null; pctConsumed: number | null }[]
  untaggedIncome: number
  untaggedIncomeCount: number
  oppDateCoveragePct: number | null // % of open worked opps that have an expected_close
}

const RUNWAY_CRITICAL_MONTHS = 3
const RUNWAY_WARN_MONTHS = 6
const CONCENTRATION_WARN_PCT = 50
const UNTAGGED_INCOME_FLOOR = 10000
const OPP_DATE_COVERAGE_FLOOR_PCT = 50
const PHANTOM_AP_FLOOR = 50000
const PHANTOM_AP_OVERDUE_RATIO = 0.9
const fmtMoney0 = (n: number): string => `$${Math.round(n).toLocaleString('en-AU')}`

/**
 * The attention panel. Returns ONLY genuinely-triggered, trustworthy alerts, critical-first.
 * Empty array = nothing needs attention (the UI renders an explicit all-clear) — never manufacture
 * an insight. Note: open AP is surfaced as a phantom-data alert, NOT subtracted from the cash number.
 */
export function buildAttentionAlerts(input: AttentionInput): Alert[] {
  const alerts: Alert[] = []

  // Phantom AP — the biggest trap. A large balance that's almost entirely overdue is unreconciled
  // (paid via bank feed, never matched), not real debt. Excluded from the cash projection; flagged here.
  if (input.ap.total >= PHANTOM_AP_FLOOR && input.ap.overdue / input.ap.total >= PHANTOM_AP_OVERDUE_RATIO) {
    alerts.push({
      key: 'phantom-ap',
      severity: 'critical',
      title: `${fmtMoney0(input.ap.total)} in bills marked unpaid — ${Math.round((input.ap.overdue / input.ap.total) * 100)}% overdue`,
      detail: `${input.ap.count} open bills, oldest ${input.ap.oldestDate ?? '—'}. Almost certainly unreconciled — NOT real debt. Reconcile before trusting any AP figure; excluded from the cash projection.`,
    })
  }

  if (input.runwayMonths != null && input.runwayMonths < RUNWAY_WARN_MONTHS) {
    const critical = input.runwayMonths < RUNWAY_CRITICAL_MONTHS
    alerts.push({
      key: 'runway',
      severity: critical ? 'critical' : 'warning',
      title: `Runway ${input.runwayMonths} months`,
      detail: `Below the ${RUNWAY_WARN_MONTHS}-month line at current burn. ${critical ? 'Fundraise or cut now.' : 'Watch closely.'}`,
    })
  }

  if (input.ar.overdue > 0) {
    alerts.push({
      key: 'overdue-ar',
      severity: 'warning',
      title: `${fmtMoney0(input.ar.overdue)} receivables overdue`,
      detail: `${input.ar.newlyOverdue > 0 ? `${fmtMoney0(input.ar.newlyOverdue)} newly overdue this week. ` : ''}Chase before it ages further.`,
    })
  }

  if (input.concentration.pct != null && input.concentration.pct > CONCENTRATION_WARN_PCT) {
    alerts.push({
      key: 'concentration',
      severity: 'warning',
      title: `${input.concentration.topName} is ${input.concentration.pct}% of open pipeline`,
      detail: `Single-funder concentration above ${CONCENTRATION_WARN_PCT}% (${fmtMoney0(input.concentration.value)}). Diversify.`,
    })
  }

  const overBudget = input.projects.filter((p) => p.pctConsumed != null && p.pctConsumed > 100)
  if (overBudget.length > 0) {
    const worst = [...overBudget].sort((a, b) => (b.pctConsumed ?? 0) - (a.pctConsumed ?? 0))[0]
    alerts.push({
      key: 'over-budget',
      severity: 'warning',
      title: `${overBudget.length} project${overBudget.length > 1 ? 's' : ''} over budget`,
      detail: `Worst: ${worst.code}${worst.name ? ` (${worst.name})` : ''} at ${worst.pctConsumed}% of budget. Re-scope or re-fund.`,
    })
  }

  if (input.untaggedIncome >= UNTAGGED_INCOME_FLOOR) {
    alerts.push({
      key: 'untagged-income',
      severity: 'warning',
      title: `${fmtMoney0(input.untaggedIncome)} income untagged`,
      detail: `${input.untaggedIncomeCount} receipts with no project code — per-project P&L understates these projects. Tag them.`,
    })
  }

  if (input.oppDateCoveragePct != null && input.oppDateCoveragePct < OPP_DATE_COVERAGE_FLOOR_PCT) {
    alerts.push({
      key: 'opp-date-coverage',
      severity: 'info',
      title: `${100 - Math.round(input.oppDateCoveragePct)}% of open opps have no close date`,
      detail: `Pipeline inflow timing can't be forecast — add expected-close dates in GHL to unlock it.`,
    })
  }

  const rank: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity])
}

// ── Opportunity pipeline math (slices 5/6) ──────────────────────────────────────
// GHL opps live in `opportunities_unified` (merged GHL CRM + grant radar). The radar buckets
// (grant_opportunities / grantscope source systems ≈ 15k rows, billions in headline) are excluded
// at the query (source allowlist). Within the worked set the GHL "Grants" pipeline is ALSO a radar
// dump (~$272M, ~10x the real book) → classified 'radar' and dropped. The Goods Demand Register is
// aspirational buyer EOIs → broken out as a 'demand' signal, NOT counted in the worked headline.

/** Canonical pile mapping — keep in sync with config/pile-mapping.json (the scripts' source of truth). */
const PILE_BY_CODE: Record<string, string> = {
  'ACT-EL': 'Voice', 'ACT-OO': 'Voice', 'ACT-BG': 'Voice', 'ACT-CF': 'Voice', 'ACT-PI': 'Voice',
  'ACT-GD': 'Flow', 'ACT-CS': 'Flow', 'ACT-JH': 'Flow', 'ACT-SM': 'Flow', 'ACT-WJ': 'Flow',
  'ACT-CA': 'Flow', 'ACT-CP': 'Flow', 'ACT-GP': 'Flow', 'ACT-UA': 'Flow', 'ACT-DO': 'Flow',
  'ACT-HV': 'Ground', 'ACT-BV': 'Ground', 'ACT-FM': 'Ground',
  'ACT-CORE': 'Other', 'ACT-IN': 'Other', 'ACT-MD': 'Other',
}

// Fallback pile inference from the GHL pipeline name, used ONLY when an opp has no mapped project_code.
// The highest-value worked opps (e.g. Goods Supporter Journey — QBE/REAL at $2M each) are untagged in
// both opportunities_unified and ghl_opportunities, but their pipeline names are unambiguous. Grounded
// in scripts/align-ghl-opportunities.mjs PIPELINE_MAP. Substring match (lowercased), first hit wins.
const PIPELINE_PILE_HINTS: ReadonlyArray<readonly [string, string]> = [
  ['goods', 'Flow'],
  ['curious tractor', 'Flow'],
  ['justicehub', 'Flow'],
  ['empathy ledger', 'Voice'],
  ['harvest', 'Ground'],
]

/**
 * Pile per the canonical rule, with a pipeline-name fallback:
 *   grant income → Grants (regardless of code) → mapped project_code → pipeline-name hint
 *   → 'Other' (has an unmapped code) → 'Uncoded' (no code at all).
 */
export function pileForOpp(
  opportunityType: string | null,
  projectCodes: string[] | null,
  pipelineName: string | null = null,
): string {
  if ((opportunityType || '').toLowerCase() === 'grant') return 'Grants'
  const code = projectCodes?.[0]
  if (code && PILE_BY_CODE[code]) return PILE_BY_CODE[code]
  const pl = (pipelineName || '').toLowerCase()
  if (pl) {
    const hit = PIPELINE_PILE_HINTS.find(([kw]) => pl.includes(kw))
    if (hit) return hit[1]
  }
  return code ? 'Other' : 'Uncoded'
}

export const DEMAND_REGISTER_PIPELINE = 'Goods — Demand Register'
export type PipelineClass = 'radar' | 'demand' | 'worked'

/** Classify a GHL pipeline: 'Grants'→radar (dropped), Demand Register→demand (broken out), else worked. */
export function classifyPipeline(pipelineName: string | null): PipelineClass {
  if (isRadarPipeline(pipelineName)) return 'radar'
  if (pipelineName === DEMAND_REGISTER_PIPELINE) return 'demand'
  return 'worked'
}

export type StageBucket = 'won' | 'open' | 'lost'
const WON_STAGES = new Set(['won', 'realized'])
const LOST_STAGES = new Set(['lost', 'expired'])

/** Normalise the GHL stage vocabulary into won / open / lost. */
export function oppStageBucket(stage: string | null): StageBucket {
  const s = (stage || '').toLowerCase()
  if (WON_STAGES.has(s)) return 'won'
  if (LOST_STAGES.has(s)) return 'lost'
  return 'open'
}

export interface PipelineOpp {
  title: string | null
  pipelineName: string | null
  pile: string | null
  valueMid: number
  probability: number // 0..100
  stage: string | null
  contactName: string | null
  expectedClose: string | null // ISO date
  updatedAt: string | null // ISO timestamp
}

const isOpenWorked = (o: PipelineOpp): boolean =>
  classifyPipeline(o.pipelineName) === 'worked' && oppStageBucket(o.stage) === 'open'

export interface PipelineBucketTotals {
  count: number
  value: number
  weighted: number
}
const emptyBucket = (): PipelineBucketTotals => ({ count: 0, value: 0, weighted: 0 })
const addToBucket = (b: PipelineBucketTotals, o: PipelineOpp): void => {
  b.count += 1
  b.value += o.valueMid
  b.weighted += o.valueMid * (o.probability / 100)
}
const roundBucket = (b: PipelineBucketTotals): PipelineBucketTotals => ({
  count: b.count,
  value: Math.round(b.value),
  weighted: Math.round(b.weighted),
})

export interface PipelineSummary {
  worked: PipelineBucketTotals // OPEN worked opps — the headline weighted pipeline
  demand: PipelineBucketTotals // OPEN Goods Demand Register — broken out, NOT in the headline
  wonWorked: PipelineBucketTotals // worked opps already won (GHL CRM only — a floor, not org-wide)
}

/** Split opps into open-worked (headline) / open-demand (signal) / won-worked. Radar dropped. Pure. */
export function summarizePipeline(opps: PipelineOpp[]): PipelineSummary {
  const worked = emptyBucket()
  const demand = emptyBucket()
  const wonWorked = emptyBucket()
  for (const o of opps) {
    const cls = classifyPipeline(o.pipelineName)
    if (cls === 'radar') continue
    const bucket = oppStageBucket(o.stage)
    if (cls === 'demand') {
      if (bucket === 'open') addToBucket(demand, o)
    } else {
      if (bucket === 'open') addToBucket(worked, o)
      else if (bucket === 'won') addToBucket(wonWorked, o)
    }
  }
  return { worked: roundBucket(worked), demand: roundBucket(demand), wonWorked: roundBucket(wonWorked) }
}

// FY27 (Pty Y1) target revenue mix — act-money-framework.md:69 [V], from five-year-cashflow-model.md.
// Components sum to $2.8M (the doc's "$2.6M" headline predates these; components are authoritative).
export const FY27_PILE_TARGET: Record<string, number> = {
  Voice: 200000,
  Flow: 1450000,
  Ground: 150000,
  Grants: 1000000,
}
const TARGET_PILE_ORDER = ['Voice', 'Flow', 'Ground', 'Grants'] as const

export interface PileMixRow {
  pile: string
  value: number // open worked pipeline value in this pile
  actualPct: number | null // share of total open worked value
  targetPct: number | null // share of the FY27 target
}

/**
 * Open-worked pipeline value by pile vs the FY27 target mix, in fixed Voice/Flow/Ground/Grants order.
 * Denominator is ALL open worked value (so Other/Uncoded piles are in the total but not shown as rows —
 * the four rows can sum to < 100%). Pure.
 */
export function pileMix(opps: PipelineOpp[], target: Record<string, number> = FY27_PILE_TARGET): PileMixRow[] {
  const byPile = new Map<string, number>()
  let total = 0
  for (const o of opps) {
    if (!isOpenWorked(o)) continue
    const pile = o.pile || 'Uncoded'
    byPile.set(pile, (byPile.get(pile) || 0) + o.valueMid)
    total += o.valueMid
  }
  const targetTotal = Object.values(target).reduce((a, b) => a + b, 0)
  return TARGET_PILE_ORDER.map((pile) => {
    const value = Math.round(byPile.get(pile) || 0)
    return {
      pile,
      value,
      actualPct: total > 0 ? round1((value / total) * 100) : 0,
      targetPct: targetTotal > 0 ? round1(((target[pile] || 0) / targetTotal) * 100) : null,
    }
  })
}

export interface Concentration {
  topName: string | null
  pct: number | null // largest single funder's share of open worked value
  value: number
}

/** Single-funder concentration: the biggest contact's share of open worked pipeline value. Pure. */
export function concentrationPct(opps: PipelineOpp[]): Concentration {
  const byFunder = new Map<string, number>()
  let total = 0
  for (const o of opps) {
    if (!isOpenWorked(o)) continue
    total += o.valueMid
    if (o.contactName) byFunder.set(o.contactName, (byFunder.get(o.contactName) || 0) + o.valueMid)
  }
  let topName: string | null = null
  let topVal = 0
  for (const [name, v] of byFunder) {
    if (v > topVal) {
      topVal = v
      topName = name
    }
  }
  return { topName, value: Math.round(topVal), pct: total > 0 ? round1((topVal / total) * 100) : null }
}

/** Open worked opps whose expected_close falls within the next `days` of `now`. Pure. */
export function next90DayInflows(opps: PipelineOpp[], now: Date, days = 90): { count: number; value: number } {
  const start = isoDay(now)
  const end = isoDay(new Date(now.getTime() + days * 86400000))
  let count = 0
  let value = 0
  for (const o of opps) {
    if (!isOpenWorked(o) || !o.expectedClose) continue
    const d = o.expectedClose.slice(0, 10)
    if (d >= start && d <= end) {
      count += 1
      value += o.valueMid
    }
  }
  return { count, value: Math.round(value) }
}

export interface TopOpp {
  title: string | null
  pile: string | null
  pipelineName: string | null
  value: number
  probability: number
  weighted: number
  stage: string | null
  contactName: string | null
}
const toTopOpp = (o: PipelineOpp): TopOpp => ({
  title: o.title,
  pile: o.pile,
  pipelineName: o.pipelineName,
  value: Math.round(o.valueMid),
  probability: o.probability,
  weighted: Math.round(o.valueMid * (o.probability / 100)),
  stage: o.stage,
  contactName: o.contactName,
})

/** Top N open worked opps by value desc. Pure. */
export function topOpenOpps(opps: PipelineOpp[], n: number): TopOpp[] {
  return opps.filter(isOpenWorked).sort((a, b) => b.valueMid - a.valueMid).slice(0, n).map(toTopOpp)
}

/** Open worked opps not touched in `days`, by value desc — pipeline that's gone quiet. Pure. */
export function stalledOpps(opps: PipelineOpp[], now: Date, days = 60): TopOpp[] {
  const cutoff = now.getTime() - days * 86400000
  return opps
    .filter((o) => isOpenWorked(o) && o.updatedAt != null && new Date(o.updatedAt).getTime() < cutoff)
    .sort((a, b) => b.valueMid - a.valueMid)
    .map(toTopOpp)
}

// Only worked CRM / manual sources — NEVER the grant_opportunities / grantscope discovery dumps.
// Positive allowlist (not a denylist) so a new dump source can't silently leak into the money totals.
const WORKED_SOURCE_SYSTEMS = ['ghl_opportunities', 'manual', 'fundraising_pipeline', 'ghl', 'xero']

export interface PipelineFacts {
  summary: PipelineSummary
  pileMix: PileMixRow[]
  concentration: Concentration
  topOpps: TopOpp[]
  next90: { count: number; value: number }
  stalled: TopOpp[]
  /** GHL won opps with no Xero invoice link — a FLOOR on secured-unbilled, not true secured income
   *  (most ACT secured income — grant tranches, ~$1.9M FY26 invoiced — lives in Xero/Notion, not GHL). */
  securedUnbilledFloor: { count: number; value: number }
  /** % of OPEN worked opps that carry an expected_close — low coverage = inflow timing can't be forecast. */
  openWithCloseDatePct: number | null
  ok: boolean
}

/**
 * Opportunity-side facts for the weekly report (slices 5+6). Reads the worked CRM book from
 * opportunities_unified (radar source systems excluded at the query; GHL "Grants" radar pipeline and the
 * Goods Demand Register classified out / broken out in the pure layer) and composes the tested pure math.
 */
export async function getPipelineFacts(now: Date = new Date()): Promise<PipelineFacts> {
  const oppPage = (from: number, to: number) =>
    supabase
      .from('opportunities_unified')
      .select('title, value_mid, probability, stage, project_codes, contact_name, expected_close, updated_at, opportunity_type, metadata')
      .in('source_system', WORKED_SOURCE_SYSTEMS)
      .range(from, to)
  const oppsR = await fetchAllRows<{
    title: string | null
    value_mid: number | string | null
    probability: number | string | null
    stage: string | null
    project_codes: string[] | null
    contact_name: string | null
    expected_close: string | null
    updated_at: string | null
    opportunity_type: string | null
    metadata: { pipeline_name?: string } | null
  }>(oppPage)

  const opps: PipelineOpp[] = oppsR.rows.map((r) => ({
    title: r.title,
    pipelineName: r.metadata?.pipeline_name ?? null,
    pile: pileForOpp(r.opportunity_type, r.project_codes, r.metadata?.pipeline_name ?? null),
    valueMid: Number(r.value_mid || 0),
    probability: Number(r.probability || 0),
    stage: r.stage,
    contactName: r.contact_name,
    expectedClose: r.expected_close,
    updatedAt: r.updated_at,
  }))

  // Secured-unbilled floor — GHL won opps with no Xero invoice link.
  const securedR = await supabase
    .from('ghl_opportunities')
    .select('monetary_value')
    .eq('status', 'won')
    .is('xero_invoice_id', null)
    .limit(2000)
  const securedRows = securedR.data || []
  const securedUnbilledFloor = {
    count: securedRows.length,
    value: Math.round(securedRows.reduce((a, r) => a + Number(r.monetary_value || 0), 0)),
  }

  // Close-date coverage among OPEN worked opps (drives the data-quality alert + the AR-vs-pipeline split).
  const openWorked = opps.filter((o) => classifyPipeline(o.pipelineName) === 'worked' && oppStageBucket(o.stage) === 'open')
  const withDate = openWorked.filter((o) => o.expectedClose != null).length
  const openWithCloseDatePct = openWorked.length > 0 ? Math.round((withDate / openWorked.length) * 1000) / 10 : null

  return {
    summary: summarizePipeline(opps),
    pileMix: pileMix(opps),
    concentration: concentrationPct(opps),
    topOpps: topOpenOpps(opps, 8),
    next90: next90DayInflows(opps, now),
    stalled: stalledOpps(opps, now, 60),
    securedUnbilledFloor,
    openWithCloseDatePct,
    ok: oppsR.ok && !securedR.error,
  }
}

/** Monthly subscription run-rate (live subs only), with an ok flag. Composes the pure normaliser. */
export async function getSubscriptionRunRate(): Promise<{ monthly: number; ok: boolean }> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('account_status, billing_cycle, amount, expected_amount')
    .limit(2000)
  if (error || !data) return { monthly: 0, ok: false }
  return { monthly: monthlySubscriptionRunRate(data), ok: true }
}

/** Open ACCREC (income) + ACCPAY (the phantom-AP alert source) aging, bucketed by due date. */
export async function getInvoiceAging(now: Date = new Date()): Promise<{ ar: InvoiceAging; ap: InvoiceAging; ok: boolean }> {
  const page = (type: string) => (from: number, to: number) =>
    supabase
      .from('xero_invoices')
      .select('amount_due, due_date, date')
      .eq('type', type)
      .eq('status', 'AUTHORISED')
      .gt('amount_due', 0)
      .range(from, to)
  const [arR, apR] = await Promise.all([fetchAllRows<InvoiceAgingRow>(page('ACCREC')), fetchAllRows<InvoiceAgingRow>(page('ACCPAY'))])
  return { ar: invoiceAging(arR.rows, now), ap: invoiceAging(apR.rows, now), ok: arR.ok && apR.ok }
}

/**
 * Untagged real income (RECEIVE / RECEIVE-OVERPAYMENT with no project_code) this FY — the
 * "your per-project P&L is lying" signal. Excludes RECEIVE-TRANSFER (inter-account transfers, which
 * are never project-tagged and would dwarf the figure). Aggregated in SQL (uncapped).
 */
export async function getTaggingGaps(fyStart: string): Promise<{ untaggedIncome: number; untaggedIncomeCount: number; ok: boolean }> {
  try {
    const rows = await execSql<{ untagged_income: number | string; untagged_count: number | string }>(
      'weekly-tagging-gap',
      `SELECT
         coalesce(sum(total) FILTER (WHERE project_code IS NULL), 0) AS untagged_income,
         count(*) FILTER (WHERE project_code IS NULL) AS untagged_count
       FROM xero_transactions
       WHERE date >= '${fyStart}'
         AND type IN ('RECEIVE','RECEIVE-OVERPAYMENT')
         AND (status IS NULL OR status <> 'DELETED')`,
    )
    const r = rows[0] || { untagged_income: 0, untagged_count: 0 }
    return { untaggedIncome: Math.round(Number(r.untagged_income || 0)), untaggedIncomeCount: Number(r.untagged_count || 0), ok: true }
  } catch {
    return { untaggedIncome: 0, untaggedIncomeCount: 0, ok: false }
  }
}
