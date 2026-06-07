/**
 * project_budgets aggregation.
 *
 * The `project_budgets` table stores ONE row per (project_code, fy_year, budget_type) with a
 * `budget_amount` — budget_type ∈ {expense, revenue, grant}. The dashboards want a single row per
 * project with the budget pivoted by type. Rather than a DB view (which needs a production
 * migration), aggregate here so routes keep using { annual_budget, annual_revenue_target, ytd_budget }.
 *
 *   - annual_budget         = Σ expense
 *   - annual_revenue_target = Σ (revenue + grant)   — grant income counts toward the revenue target
 *   - ytd_budget            = annual_budget × monthsElapsed / 12   — month-level rows aren't used yet
 */
import { getFYDates } from './dates'

export interface ProjectBudgetRow {
  project_code: string | null
  budget_type: string | null
  budget_amount: number | string | null
}

export interface AggregatedBudget {
  project_code: string
  fy: string
  annual_budget: number
  annual_revenue_target: number
  ytd_budget: number
}

export function aggregateProjectBudgets(
  rows: ProjectBudgetRow[],
  fyYear: string,
  now: Date = new Date(),
): AggregatedBudget[] {
  const { monthsElapsed } = getFYDates(now)
  const byProject = new Map<string, { expense: number; revenue: number }>()
  for (const r of rows) {
    const code = r.project_code
    if (!code) continue
    const amt = Number(r.budget_amount) || 0
    const acc = byProject.get(code) || { expense: 0, revenue: 0 }
    if (r.budget_type === 'expense') acc.expense += amt
    else if (r.budget_type === 'revenue' || r.budget_type === 'grant') acc.revenue += amt
    byProject.set(code, acc)
  }
  return [...byProject.entries()].map(([project_code, b]) => ({
    project_code,
    fy: fyYear,
    annual_budget: b.expense,
    annual_revenue_target: b.revenue,
    ytd_budget: Math.round((b.expense * monthsElapsed) / 12),
  }))
}
