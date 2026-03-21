/**
 * Pure financial calculation functions.
 * No side effects, no database dependencies — easily testable.
 *
 * Australian FY: July 1 – June 30
 * Runway = cash on hand / net monthly burn
 * Budget % = expenses / annual budget × 100
 */

// ── Runway ──────────────────────────────────────────────────────────

/**
 * Calculate months of runway remaining.
 * @param cashInBank - Current bank balance (from Xero bank accounts)
 * @param avgMonthlyBurn - Average monthly expenses
 * @param avgMonthlyRevenue - Average monthly revenue
 * @returns Months of runway. Infinity if revenue >= burn. 0 if no cash.
 */
export function calculateRunway(
  cashInBank: number,
  avgMonthlyBurn: number,
  avgMonthlyRevenue: number,
): number {
  if (cashInBank <= 0) return 0
  const netMonthlyBurn = avgMonthlyBurn - avgMonthlyRevenue
  if (netMonthlyBurn <= 0) return 999 // revenue covers or exceeds burn
  return Math.round((cashInBank / netMonthlyBurn) * 10) / 10
}

// ── Budget ──────────────────────────────────────────────────────────

/**
 * Calculate budget utilisation percentage.
 * @returns null if no budget set, otherwise 0-999
 */
export function budgetPct(expenses: number, annualBudget: number | null | undefined): number | null {
  if (!annualBudget || annualBudget <= 0) return null
  return Math.round((Math.abs(expenses) / annualBudget) * 100)
}

// ── Overhead Allocation ─────────────────────────────────────────────

export interface OverheadAllocationResult {
  code: string
  name: string
  directExpenses: number
  directRevenue: number
  overheadShare: number // percentage (0-100)
  allocatedOverhead: number // dollar amount
  fullyLoadedNet: number // revenue - directExpenses - allocatedOverhead
}

/**
 * Allocate HQ overhead proportionally by each project's direct expenses.
 */
export function allocateOverhead(
  hqExpenses: number,
  projects: Array<{ code: string; name: string; expenses: number; revenue: number }>,
): OverheadAllocationResult[] {
  const directExpenseTotal = projects.reduce((sum, p) => sum + Math.abs(p.expenses), 0)

  return projects
    .filter(p => p.expenses !== 0)
    .map(p => {
      const absExpenses = Math.abs(p.expenses)
      const share = directExpenseTotal > 0 ? absExpenses / directExpenseTotal : 0
      const allocated = hqExpenses * share
      return {
        code: p.code,
        name: p.name,
        directExpenses: p.expenses,
        directRevenue: p.revenue,
        overheadShare: Math.round(share * 1000) / 10,
        allocatedOverhead: Math.round(allocated * 100) / 100,
        fullyLoadedNet: p.revenue - absExpenses - allocated,
      }
    })
    .sort((a, b) => Math.abs(b.directExpenses) - Math.abs(a.directExpenses))
}

// ── Weighted Pipeline ───────────────────────────────────────────────

export function weightedValue(value: number, probability: number): number {
  return value * (probability / 100)
}

// ── Reconciliation ──────────────────────────────────────────────────

export type ReconciliationStatus = 'reconciled' | 'partial' | 'unreconciled'

/**
 * Determine grant reconciliation status.
 * reconciled = matched revenue >= 90% of grant value
 * partial = some matched revenue but < 90%
 * unreconciled = no matched revenue
 */
export function reconciliationStatus(grantValue: number, matchedRevenue: number): ReconciliationStatus {
  if (grantValue <= 0) return 'unreconciled'
  if (matchedRevenue >= grantValue * 0.9) return 'reconciled'
  if (matchedRevenue > 0) return 'partial'
  return 'unreconciled'
}

// ── Receivables Aging ───────────────────────────────────────────────

export interface ReceivablesAging {
  current: number
  overdue30: number
  overdue60: number
  overdue90: number
}

/**
 * Bucket receivable invoices by days overdue.
 * Skips invoices with null/invalid due_date.
 */
export function calculateReceivablesAging(
  invoices: Array<{ due_date: string | null; amount_due: number | string | null }>,
  now: Date = new Date(),
): ReceivablesAging {
  const aging: ReceivablesAging = { current: 0, overdue30: 0, overdue60: 0, overdue90: 0 }

  for (const inv of invoices) {
    if (!inv.due_date) continue // skip null due_date — don't produce NaN
    const due = new Date(inv.due_date)
    if (isNaN(due.getTime())) continue // skip invalid dates

    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    const amt = Number(inv.amount_due || 0)

    if (daysOverdue <= 0) aging.current += amt
    else if (daysOverdue <= 30) aging.overdue30 += amt
    else if (daysOverdue <= 60) aging.overdue60 += amt
    else aging.overdue90 += amt
  }

  return aging
}

// ── Monthly Burn ────────────────────────────────────────────────────

/**
 * Calculate average monthly burn rate from completed months.
 * A month is "completed" if it's before the current calendar month.
 */
export function calculateMonthlyBurn(
  monthlyTotals: Map<string, { revenue: number; expenses: number }>,
  now: Date = new Date(),
): { avgBurn: number; avgRevenue: number; completedMonths: number } {
  const currentMonth = now.toISOString().slice(0, 7) + '-01'
  const completed = [...monthlyTotals.entries()]
    .filter(([m]) => m < currentMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))

  if (completed.length === 0) return { avgBurn: 0, avgRevenue: 0, completedMonths: 0 }

  const totalBurn = completed.reduce((sum, [, v]) => sum + Math.abs(v.expenses), 0)
  const totalRev = completed.reduce((sum, [, v]) => sum + v.revenue, 0)

  return {
    avgBurn: totalBurn / completed.length,
    avgRevenue: totalRev / completed.length,
    completedMonths: completed.length,
  }
}

// ── Project Sorting ─────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = { ecosystem: 0, studio: 1, satellite: 2, unknown: 3 }

/** Sort: ecosystem first, then by absolute expense magnitude within tier. */
export function sortProjectsByTier<T extends { tier: string; expenses: number }>(projects: T[]): T[] {
  return [...projects].sort((a, b) => {
    const td = (TIER_ORDER[a.tier] ?? 3) - (TIER_ORDER[b.tier] ?? 3)
    if (td !== 0) return td
    return Math.abs(b.expenses) - Math.abs(a.expenses)
  })
}

// ── Health Score ─────────────────────────────────────────────────────

export type HealthLevel = 'strong' | 'attention' | 'critical'

export interface HealthScore {
  level: HealthLevel
  score: number // 0-100
  factors: Array<{ name: string; level: HealthLevel; detail: string }>
}

/**
 * Compute composite financial health from multiple factors.
 * Used for the traffic light mood indicator.
 */
export function calculateHealthScore(params: {
  runwayMonths: number
  burnTrend: 'decreasing' | 'stable' | 'increasing'
  receivablesTotal: number
  receivablesOverdue: number
  budgetUtilizations: number[] // list of budget % values for all projects
}): HealthScore {
  const factors: HealthScore['factors'] = []

  // Runway factor
  if (params.runwayMonths >= 6) {
    factors.push({ name: 'Runway', level: 'strong', detail: `${params.runwayMonths} months` })
  } else if (params.runwayMonths >= 3) {
    factors.push({ name: 'Runway', level: 'attention', detail: `${params.runwayMonths} months` })
  } else {
    factors.push({ name: 'Runway', level: 'critical', detail: `${params.runwayMonths} months` })
  }

  // Burn trend factor
  if (params.burnTrend === 'decreasing') {
    factors.push({ name: 'Burn trend', level: 'strong', detail: 'Decreasing' })
  } else if (params.burnTrend === 'stable') {
    factors.push({ name: 'Burn trend', level: 'attention', detail: 'Stable' })
  } else {
    factors.push({ name: 'Burn trend', level: 'critical', detail: 'Increasing' })
  }

  // Receivables factor
  const overduePct = params.receivablesTotal > 0
    ? (params.receivablesOverdue / params.receivablesTotal) * 100
    : 0
  if (overduePct < 20) {
    factors.push({ name: 'Receivables', level: 'strong', detail: `${Math.round(overduePct)}% overdue` })
  } else if (overduePct < 50) {
    factors.push({ name: 'Receivables', level: 'attention', detail: `${Math.round(overduePct)}% overdue` })
  } else {
    factors.push({ name: 'Receivables', level: 'critical', detail: `${Math.round(overduePct)}% overdue` })
  }

  // Budget factor
  const overBudget = params.budgetUtilizations.filter(p => p > 100).length
  const nearBudget = params.budgetUtilizations.filter(p => p > 80 && p <= 100).length
  if (overBudget > 0) {
    factors.push({ name: 'Budgets', level: 'critical', detail: `${overBudget} over budget` })
  } else if (nearBudget > 0) {
    factors.push({ name: 'Budgets', level: 'attention', detail: `${nearBudget} near limit` })
  } else {
    factors.push({ name: 'Budgets', level: 'strong', detail: 'All within budget' })
  }

  // Composite score
  const levelScores: Record<HealthLevel, number> = { strong: 100, attention: 60, critical: 20 }
  const score = Math.round(factors.reduce((sum, f) => sum + levelScores[f.level], 0) / factors.length)

  const level: HealthLevel = score >= 80 ? 'strong' : score >= 50 ? 'attention' : 'critical'

  return { level, score, factors }
}

// ── Nudges ──────────────────────────────────────────────────────────

export interface Nudge {
  type: 'overdue_invoice' | 'deadline' | 'pipeline' | 'budget' | 'stale_data'
  severity: 'info' | 'warning' | 'critical'
  message: string
}

/**
 * Generate smart nudges from financial data.
 * Returns top 5 most urgent actions.
 */
export function generateNudges(params: {
  overdueInvoices: Array<{ contact_name: string; amount_due: number; due_date: string }>
  pipelineClosingSoon: Array<{ title: string; expected_close: string; value: number }>
  budgetAlerts: Array<{ code: string; pct: number }>
  lastSyncAt?: string | null
}): Nudge[] {
  const nudges: Nudge[] = []
  const now = new Date()

  // Overdue invoices (>30 days)
  for (const inv of params.overdueInvoices) {
    const due = new Date(inv.due_date)
    const days = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    if (days > 30) {
      nudges.push({
        type: 'overdue_invoice',
        severity: days > 60 ? 'critical' : 'warning',
        message: `Chase $${Math.round(inv.amount_due).toLocaleString()} from ${inv.contact_name} (${days} days overdue)`,
      })
    }
  }

  // BAS deadline (hardcoded Australian BAS quarters)
  const basDeadlines = [
    { quarter: 'Q1', due: new Date(now.getFullYear(), 9, 28) },  // Oct 28
    { quarter: 'Q2', due: new Date(now.getFullYear() + 1, 1, 28) }, // Feb 28
    { quarter: 'Q3', due: new Date(now.getFullYear() + 1, 3, 28) }, // Apr 28
    { quarter: 'Q4', due: new Date(now.getFullYear() + 1, 6, 28) }, // Jul 28
  ]
  for (const bas of basDeadlines) {
    const daysUntil = Math.floor((bas.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil > 0 && daysUntil <= 42) {
      const weeks = Math.round(daysUntil / 7)
      nudges.push({
        type: 'deadline',
        severity: daysUntil <= 14 ? 'critical' : 'warning',
        message: `BAS ${bas.quarter} due ${bas.due.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} (${weeks} weeks)`,
      })
      break // only show next upcoming BAS
    }
  }

  // Pipeline closing soon
  for (const opp of params.pipelineClosingSoon.slice(0, 3)) {
    const close = new Date(opp.expected_close)
    const daysUntil = Math.floor((close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil >= 0 && daysUntil <= 30) {
      nudges.push({
        type: 'pipeline',
        severity: 'info',
        message: `Follow up: ${opp.title} (closing ${close.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})`,
      })
    }
  }

  // Budget warnings
  for (const alert of params.budgetAlerts) {
    nudges.push({
      type: 'budget',
      severity: alert.pct > 100 ? 'critical' : 'warning',
      message: `${alert.code} at ${alert.pct}% of budget`,
    })
  }

  // Stale data warning
  if (params.lastSyncAt) {
    const syncDate = new Date(params.lastSyncAt)
    const hoursSinceSync = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60)
    if (hoursSinceSync > 24) {
      nudges.push({
        type: 'stale_data',
        severity: 'warning',
        message: `Financial data may be stale — last Xero sync ${Math.round(hoursSinceSync)} hours ago`,
      })
    }
  }

  // Sort by severity (critical > warning > info), return top 5
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  nudges.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2))

  return nudges.slice(0, 5)
}
