/**
 * Grants pipeline — active grant applications and funding opportunities.
 *
 * Merges agent-tools (executeGetGrantPipeline + executeGetGrantOpportunities)
 * and Notion Workers (get_funding_pipeline).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface GrantPipelineOptions {
  status?: string
  limit?: number
}

export interface GrantApplicationEntry {
  id: string
  name: string
  amount_requested: number | null
  status: string
  started_at: string | null
  submitted_at: string | null
  outcome_at: string | null
  lead_contact: string | null
  team: string[]
  project_code: string | null
  outcome_amount: number | null
  outcome_notes: string | null
}

export interface GrantPipelineResult {
  status_filter: string
  count: number
  applications: GrantApplicationEntry[]
}

export async function fetchGrantPipeline(
  supabase: SupabaseQueryClient,
  opts: GrantPipelineOptions = {}
): Promise<GrantPipelineResult> {
  const limit = opts.limit || 20

  let query = supabase
    .from('grant_applications')
    .select('id, application_name, amount_requested, status, started_at, submitted_at, outcome_at, milestones, lead_contact, team_members, project_code, outcome_amount, outcome_notes, opportunity_id')
    .order('started_at', { ascending: false })

  if (opts.status) {
    query = query.eq('status', opts.status)
  } else {
    query = query.in('status', ['draft', 'in_progress', 'submitted', 'under_review'])
  }

  const { data, error } = await query.limit(limit)
  if (error) throw new Error(`Grant pipeline query failed: ${error.message}`)

  const applications: GrantApplicationEntry[] = ((data || []) as Array<Record<string, unknown>>).map((a) => ({
    id: a.id as string,
    name: a.application_name as string,
    amount_requested: a.amount_requested as number | null,
    status: a.status as string,
    started_at: a.started_at as string | null,
    submitted_at: a.submitted_at as string | null,
    outcome_at: a.outcome_at as string | null,
    lead_contact: a.lead_contact as string | null,
    team: (a.team_members as string[]) || [],
    project_code: a.project_code as string | null,
    outcome_amount: a.outcome_amount as number | null,
    outcome_notes: a.outcome_notes as string | null,
  }))

  return {
    status_filter: opts.status || 'active',
    count: applications.length,
    applications,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Grant opportunities (open grants to apply for)
// ─────────────────────────────────────────────────────────────────────────

export interface GrantOpportunitiesOptions {
  status?: string
  limit?: number
  days_ahead?: number
  category?: string
}

export interface GrantOpportunityEntry {
  id: string
  name: string
  provider: string
  program: string | null
  amount_range: string
  amount_min: number | null
  amount_max: number | null
  opens_at: string | null
  closes_at: string | null
  days_until_close: number | null
  status: string
  fit_score: number | null
  fit_notes: string | null
  aligned_projects: string[]
  categories: string[]
  url: string | null
  funder_name: string | null
  focus_areas: string[] | null
}

export interface GrantOpportunitiesResult {
  status_filter: string
  count: number
  grants: GrantOpportunityEntry[]
}

export async function fetchGrantOpportunities(
  supabase: SupabaseQueryClient,
  opts: GrantOpportunitiesOptions = {}
): Promise<GrantOpportunitiesResult> {
  const status = opts.status || 'open'
  const limit = opts.limit || 10

  const { data, error } = await supabase
    .from('grant_opportunities')
    .select('id, name, provider, program, amount_min, amount_max, opens_at, closes_at, status, fit_score, fit_notes, aligned_projects, categories, url')
    .eq('status', status)
    .order('closes_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Grant opportunities query failed: ${error.message}`)

  const now = new Date()
  const grants: GrantOpportunityEntry[] = ((data || []) as Array<Record<string, unknown>>).map((g) => {
    const amountMin = g.amount_min as number | null
    const amountMax = g.amount_max as number | null
    const amountRange = amountMin && amountMax
      ? `$${Number(amountMin).toLocaleString()} - $${Number(amountMax).toLocaleString()}`
      : amountMax
        ? `Up to $${Number(amountMax).toLocaleString()}`
        : 'Not specified'

    return {
      id: g.id as string,
      name: g.name as string,
      provider: g.provider as string,
      program: g.program as string | null,
      amount_range: amountRange,
      amount_min: amountMin,
      amount_max: amountMax,
      opens_at: g.opens_at as string | null,
      closes_at: g.closes_at as string | null,
      days_until_close: g.closes_at
        ? Math.ceil((new Date(g.closes_at as string).getTime() - now.getTime()) / 86400000)
        : null,
      status: g.status as string,
      fit_score: g.fit_score as number | null,
      fit_notes: g.fit_notes as string | null,
      aligned_projects: (g.aligned_projects as string[]) || [],
      categories: (g.categories as string[]) || [],
      url: g.url as string | null,
      funder_name: null,
      focus_areas: null,
    }
  })

  return { status_filter: status, count: grants.length, grants }
}

// Funding pipeline view (used by Notion Workers)
export interface FundingPipelineOptions {
  days_ahead?: number
  category?: string
}

export interface FundingPipelineEntry {
  name: string
  funder_name: string | null
  category: string | null
  total_pool_amount: number | null
  min_grant_amount: number | null
  max_grant_amount: number | null
  deadline: string | null
  days_until_deadline: number | null
  focus_areas: string[] | null
  relevance_score: number | null
  application_count: number | null
  status: string | null
}

export interface FundingPipelineResult {
  count: number
  max_days: number
  opportunities: FundingPipelineEntry[]
}

export async function fetchFundingPipeline(
  supabase: SupabaseQueryClient,
  opts: FundingPipelineOptions = {}
): Promise<FundingPipelineResult> {
  const maxDays = opts.days_ahead ?? 90

  let query = supabase
    .from('v_funding_pipeline')
    .select('name, funder_name, category, total_pool_amount, min_grant_amount, max_grant_amount, deadline, days_until_deadline, focus_areas, relevance_score, application_count, status')
    .not('deadline', 'is', null)
    .gte('days_until_deadline', 0)
    .lte('days_until_deadline', maxDays)
    .order('days_until_deadline', { ascending: true })

  if (opts.category) {
    query = query.ilike('category', `%${opts.category}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(`Funding pipeline query failed: ${error.message}`)

  const opportunities: FundingPipelineEntry[] = ((data || []) as Array<Record<string, unknown>>).map((o) => ({
    name: o.name as string,
    funder_name: o.funder_name as string | null,
    category: o.category as string | null,
    total_pool_amount: o.total_pool_amount as number | null,
    min_grant_amount: o.min_grant_amount as number | null,
    max_grant_amount: o.max_grant_amount as number | null,
    deadline: o.deadline as string | null,
    days_until_deadline: o.days_until_deadline as number | null,
    focus_areas: o.focus_areas as string[] | null,
    relevance_score: o.relevance_score as number | null,
    application_count: o.application_count as number | null,
    status: o.status as string | null,
  }))

  return { count: opportunities.length, max_days: maxDays, opportunities }
}
