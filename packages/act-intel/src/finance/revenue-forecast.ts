/**
 * Revenue forecast — 10-year revenue scenarios.
 *
 * Extracted from Notion Workers Tool 18 (get_revenue_forecast).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface RevenueForecastOptions {
  scenario?: string
}

export interface RevenueScenario {
  name: string
  description: string | null
  annual_targets: Record<string, number>
  assumptions: Record<string, unknown>
}

export interface RevenueForecastResult {
  scenarios: RevenueScenario[]
}

export async function fetchRevenueForecast(
  supabase: SupabaseQueryClient,
  opts: RevenueForecastOptions = {}
): Promise<RevenueForecastResult> {
  let query = supabase
    .from('revenue_scenarios')
    .select('*')
    .order('name')

  if (opts.scenario) {
    query = query.eq('name', opts.scenario.toLowerCase())
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch revenue forecast: ${error.message}`)
  if (!data?.length) {
    return { scenarios: [] }
  }

  const scenarios: RevenueScenario[] = (data as any[]).map((s) => ({
    name: s.name as string,
    description: (s.description as string) || null,
    annual_targets: s.annual_targets || {},
    assumptions: s.assumptions || {},
  }))

  return { scenarios }
}
