/**
 * Cashflow explained — monthly cash flow with variance explanations.
 *
 * Extracted from Notion Workers Tool 15 (explain_cashflow).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface CashflowExplainedOptions {
  months?: number
}

export interface CashflowExplainedMonth {
  month: string
  income: number
  expenses: number
  net: number
  closing_balance: number
  income_change: number | null
  expense_change: number | null
  explanations: Array<{ explanation: string }> | null
}

export interface CashflowExplainedResult {
  months: CashflowExplainedMonth[]
}

export async function fetchCashflowExplained(
  supabase: SupabaseQueryClient,
  opts: CashflowExplainedOptions = {}
): Promise<CashflowExplainedResult> {
  const max = opts.months ?? 6

  const { data, error } = await supabase
    .from('v_cashflow_explained')
    .select('*')
    .order('month', { ascending: false })
    .limit(max)

  if (error) throw new Error(`Failed to fetch cashflow explained: ${error.message}`)
  if (!data?.length) {
    return { months: [] }
  }

  const months: CashflowExplainedMonth[] = (data as any[]).reverse().map((m) => ({
    month: m.month as string,
    income: Number(m.income || 0),
    expenses: Number(m.expenses || 0),
    net: Number(m.net || 0),
    closing_balance: Number(m.closing_balance || 0),
    income_change: m.income_change != null ? Number(m.income_change) : null,
    expense_change: m.expense_change != null ? Number(m.expense_change) : null,
    explanations: Array.isArray(m.explanations) ? m.explanations : null,
  }))

  return { months }
}
