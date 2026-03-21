/**
 * Grant readiness — aggregated readiness scores with requirement breakdowns
 * and available reusable assets.
 *
 * Merges agent-tools (executeGetGrantReadiness) and
 * Notion Workers (get_grant_readiness).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface GrantReadinessOptions {
  application_id?: string
  grant_name?: string
  min_readiness?: number
  status?: string
}

export interface GrantReadinessEntry {
  grant_name: string
  provider: string | null
  status: string | null
  readiness_pct: number
  days_until_close: number | null
  closes_at: string | null
  total_requirements: number
  ready_count: number
  needed_count: number
  missing_docs: Array<{ type: string; notes: string | null }>
  ready_docs: string[]
  available_assets: Array<{
    name: string
    category: string | null
    type: string | null
    expires: string | null
  }>
  milestones: { total: number; completed: number }
  fit_score: number | null
  amount_max: number | null
  lead_contact: string | null
  assigned_to: string | null
  priority: string | null
}

export interface GrantReadinessResult {
  count: number
  ready_count: number
  applications: GrantReadinessEntry[]
}

export async function fetchGrantReadiness(
  supabase: SupabaseQueryClient,
  opts: GrantReadinessOptions = {}
): Promise<GrantReadinessResult> {
  let query = supabase
    .from('v_grant_readiness')
    .select('*')
    .order('readiness_pct', { ascending: true })

  if (opts.application_id) {
    query = query.eq('application_id', opts.application_id)
  } else if (opts.grant_name) {
    query = query.ilike('grant_name', `%${opts.grant_name}%`)
  }

  if (opts.min_readiness !== undefined && opts.min_readiness !== null) {
    query = query.gte('readiness_pct', opts.min_readiness)
  }

  if (opts.status) {
    query = query.eq('application_status', opts.status)
  }

  const { data: readiness, error } = await query.limit(20)
  if (error) throw new Error(`Grant readiness query failed: ${error.message}`)

  const rows = (readiness || []) as Array<Record<string, unknown>>

  const applications: GrantReadinessEntry[] = await Promise.all(
    rows.map(async (app) => {
      const appId = app.application_id as string

      // Parallel: requirements breakdown + reusable assets
      const [reqResult, assetResult] = await Promise.all([
        supabase
          .from('grant_application_requirements')
          .select('requirement_type, status, notes')
          .eq('application_id', appId),
        supabase
          .from('grant_assets')
          .select('name, category, asset_type, is_current, expires_at')
          .eq('is_current', true)
          .limit(20),
      ])

      const requirements = (reqResult.data || []) as Array<Record<string, unknown>>
      const missing = requirements.filter((r) => r.status === 'needed')
      const ready = requirements.filter((r) => r.status === 'ready' || r.status === 'submitted')

      const daysUntilClose = app.closes_at
        ? Math.floor((new Date(app.closes_at as string).getTime() - Date.now()) / 86400000)
        : null

      return {
        grant_name: app.grant_name as string,
        provider: app.provider as string | null,
        status: app.application_status as string | null,
        readiness_pct: Number(app.readiness_pct || 0),
        days_until_close: daysUntilClose,
        closes_at: app.closes_at as string | null,
        total_requirements: Number(app.total_requirements || 0),
        ready_count: Number(app.ready_count || 0),
        needed_count: Number(app.needed_count || missing.length),
        missing_docs: missing.map((m) => ({
          type: m.requirement_type as string,
          notes: m.notes as string | null,
        })),
        ready_docs: ready.map((r) => r.requirement_type as string),
        available_assets: ((assetResult.data || []) as Array<Record<string, unknown>>).map((a) => ({
          name: a.name as string,
          category: a.category as string | null,
          type: a.asset_type as string | null,
          expires: a.expires_at as string | null,
        })),
        milestones: {
          total: Number(app.total_milestones || 0),
          completed: Number(app.completed_milestones || 0),
        },
        fit_score: app.fit_score as number | null,
        amount_max: app.amount_max as number | null,
        lead_contact: app.lead_contact as string | null,
        assigned_to: app.assigned_to as string | null,
        priority: app.priority as string | null,
      }
    })
  )

  const readyCount = applications.filter((a) => a.readiness_pct >= 100).length

  return { count: applications.length, ready_count: readyCount, applications }
}
