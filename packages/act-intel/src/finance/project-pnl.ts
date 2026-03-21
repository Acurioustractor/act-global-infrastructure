/**
 * Project P&L — monthly profit & loss for a specific project.
 *
 * Extracted from Notion Workers Tool 16 (get_project_pnl).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface ProjectPnlOptions {
  project_code: string
  months?: number
}

export interface ProjectPnlMonth {
  month: string
  revenue: number
  expenses: number
  net: number
  expense_breakdown: Record<string, number>
  fy_ytd_revenue: number | null
  fy_ytd_expenses: number | null
  fy_ytd_net: number | null
}

export interface ProjectPnlResult {
  project_code: string
  months: ProjectPnlMonth[]
  totalRevenue: number
  totalExpenses: number
}

export async function fetchProjectPnl(
  supabase: SupabaseQueryClient,
  opts: ProjectPnlOptions
): Promise<ProjectPnlResult> {
  const code = opts.project_code.toUpperCase()
  const max = opts.months ?? 12

  const { data, error } = await supabase
    .from('project_monthly_financials')
    .select('*')
    .eq('project_code', code)
    .order('month', { ascending: false })
    .limit(max)

  if (error) throw new Error(`Failed to fetch project P&L: ${error.message}`)
  if (!data?.length) {
    return { project_code: code, months: [], totalRevenue: 0, totalExpenses: 0 }
  }

  const rows = (data as any[]).reverse()
  let totalRevenue = 0
  let totalExpenses = 0

  const months: ProjectPnlMonth[] = rows.map((m) => {
    const rev = Number(m.revenue || 0)
    const exp = Number(m.expenses || 0)
    totalRevenue += rev
    totalExpenses += exp

    return {
      month: m.month as string,
      revenue: rev,
      expenses: exp,
      net: Number(m.net || 0),
      expense_breakdown: m.expense_breakdown || {},
      fy_ytd_revenue: m.fy_ytd_revenue != null ? Number(m.fy_ytd_revenue) : null,
      fy_ytd_expenses: m.fy_ytd_expenses != null ? Number(m.fy_ytd_expenses) : null,
      fy_ytd_net: m.fy_ytd_net != null ? Number(m.fy_ytd_net) : null,
    }
  })

  return { project_code: code, months, totalRevenue, totalExpenses }
}
