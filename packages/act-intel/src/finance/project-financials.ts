/**
 * Project financials — FY income/expenses/receivables from the v_project_financials view.
 */

import type { SupabaseQueryClient, ProjectFinancialsResult } from '../types.js'

export interface ProjectFinancialsOptions {
  projectCode?: string
}

export async function fetchProjectFinancials(
  supabase: SupabaseQueryClient,
  opts: ProjectFinancialsOptions = {}
): Promise<ProjectFinancialsResult> {
  let query = supabase.from('v_project_financials').select('*')
  if (opts.projectCode) {
    query = query.eq('code', opts.projectCode)
  }
  const { data, error } = await query

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return { projects: [], count: 0 }

  const projects = (data as Array<Record<string, unknown>>).map(p => ({
    code: p.code as string,
    name: p.name as string,
    tier: p.tier as string,
    fy_income: Math.round(Number(p.fy_income || 0)),
    fy_expenses: Math.round(Number(p.fy_expenses || 0)),
    net_position: Math.round(Number(p.net_position || 0)),
    receivable: Math.round(Number(p.receivable || 0)),
    pipeline_value: Math.round(Number(p.pipeline_value || 0)),
    grant_funding: Math.round(Number(p.grant_funding || 0)),
    monthly_subscriptions: Math.round(Number(p.monthly_subscriptions || 0)),
    transaction_count: Number(p.transaction_count || 0),
  }))

  return { projects, count: projects.length }
}
