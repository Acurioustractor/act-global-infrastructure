/**
 * project-codes.ts — legacy project-code folding for command-center money surfaces.
 *
 * The TS sibling of `scripts/lib/project-resolver.mjs` LEGACY_WRAPPERS. `project_monthly_financials`
 * (and the raw Xero tables) store retired codes separately; every per-project P&L surface that wants
 * the "folded picture" must normalise them to canonical first, or a project's costs split across two
 * codes and the table lies. Kept deliberately tiny + pure so it's unit-testable (project-codes.test.ts).
 */

/** Retained non-canonical codes that fold to a canonical one. Mirror of the resolver's map. */
export const LEGACY_WRAPPERS: Record<string, string> = {
  'ACT-CG': 'ACT-CS',
  'ACT-HQ': 'ACT-CORE',
  'ACT-PC': 'ACT-PI',
}

/** Upper/trim a code and fold any legacy wrapper to its canonical code. Null/empty → null. */
export function normalizeProjectCode(code: string | null | undefined): string | null {
  if (!code) return null
  const up = String(code).trim().toUpperCase()
  if (!up) return null
  return LEGACY_WRAPPERS[up] || up
}

export interface FoldedPLRow {
  code: string
  revenue: number
  expenses: number
  net: number
}

interface MonthlyRow {
  project_code: string | null
  revenue: number | string | null
  expenses: number | string | null
}

/**
 * Fold monthly financial rows to canonical codes: group by normalized project_code, sum
 * revenue/expenses, derive net = revenue - expenses. Rounds at the end, sorts by expenses desc.
 * Rows with no code are skipped (can't attribute). Folding only relabels — org totals are conserved.
 */
export function foldMonthlyByCanonical(rows: MonthlyRow[]): FoldedPLRow[] {
  const byCode = new Map<string, { revenue: number; expenses: number }>()
  for (const r of rows) {
    const code = normalizeProjectCode(r.project_code)
    if (!code) continue
    const acc = byCode.get(code) || { revenue: 0, expenses: 0 }
    acc.revenue += Number(r.revenue || 0)
    acc.expenses += Number(r.expenses || 0)
    byCode.set(code, acc)
  }
  return [...byCode.entries()]
    .map(([code, v]) => {
      const revenue = Math.round(v.revenue)
      const expenses = Math.round(v.expenses)
      return { code, revenue, expenses, net: revenue - expenses }
    })
    .sort((a, b) => b.expenses - a.expenses)
}
