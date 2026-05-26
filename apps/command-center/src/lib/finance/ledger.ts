import { supabase } from '@/lib/supabase'

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
    let q = supabase.from('xero_transactions').select('date, contact_name, total, type, rd_eligible')
      .in('type', SPEND_TYPES).gte('date', fyStart)
    if (fyEnd) q = q.lte('date', fyEnd)
    if (entityCode) q = q.eq('entity_code', entityCode)
    return q.range(from, to)
  }
  const receivePage = (from: number, to: number) => {
    let q = supabase.from('xero_transactions').select('total, date')
      .in('type', RECEIVE_TYPES).gte('date', fyStart)
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
