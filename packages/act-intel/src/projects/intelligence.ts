/**
 * Project intelligence — comprehensive project summary with financials,
 * health scores, focus areas, relationships, grants, and recent knowledge.
 *
 * Merges agent-tools (executeGetProject360) and
 * Notion Workers (get_project_intelligence).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface ProjectIntelligenceOptions {
  project_code: string
}

export interface ProjectIntelligenceResult {
  project_code: string
  financials: {
    fy_revenue: number
    fy_expenses: number
    fy_net: number
    monthly_burn_rate: number | null
    pipeline_value: number | null
    outstanding_amount: number | null
    grants_won: number | null
    grants_pending: number | null
  } | null
  health: {
    health_score: number
    momentum_score: number
    engagement_score: number
    financial_score: number
    timeline_score: number
    calculated_at: string | null
  } | null
  focus_areas: Array<{
    title: string
    description: string | null
    status: string
    priority: number | null
    target_date: string | null
  }>
  relationships: Array<{
    contact_name: string
    company_name: string | null
    temperature: number | null
    temperature_trend: string | null
    last_contact_at: string | null
  }>
  grants: Array<{
    application_name: string
    status: string
    amount_requested: number | null
  }>
  recent_knowledge: Array<{
    title: string
    knowledge_type: string
    importance: string | null
    recorded_at: string
    action_required: boolean | null
    follow_up_date: string | null
  }>
  recent_wins: string[]
  blockers: string[]
}

export async function fetchProjectIntelligence(
  supabase: SupabaseQueryClient,
  opts: ProjectIntelligenceOptions
): Promise<ProjectIntelligenceResult> {
  const code = opts.project_code.toUpperCase()

  const [snapshot, focusAreas, health, knowledge, relationships, grants] = await Promise.all([
    supabase
      .from('project_intelligence_snapshots')
      .select('*')
      .eq('project_code', code)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('project_focus_areas')
      .select('title, description, status, priority, target_date')
      .eq('project_code', code)
      .in('status', ['current', 'upcoming', 'blocked'])
      .order('priority'),
    supabase
      .from('project_health')
      .select('health_score, momentum_score, engagement_score, financial_score, timeline_score, calculated_at')
      .eq('project_code', code)
      .maybeSingle(),
    supabase
      .from('project_knowledge')
      .select('title, knowledge_type, importance, recorded_at, action_required, follow_up_date')
      .eq('project_code', code)
      .order('recorded_at', { ascending: false })
      .limit(10),
    supabase
      .from('v_project_relationships')
      .select('contact_name, company_name, temperature, temperature_trend, last_contact_at')
      .eq('project_code', code)
      .order('temperature', { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from('grant_applications')
      .select('application_name, status, amount_requested, project_code')
      .eq('project_code', code)
      .in('status', ['draft', 'in_progress', 'submitted', 'under_review']),
  ])

  const s = snapshot.data as Record<string, unknown> | null
  const h = health.data as Record<string, unknown> | null

  return {
    project_code: code,
    financials: s ? {
      fy_revenue: Number(s.fy_revenue || 0),
      fy_expenses: Number(s.fy_expenses || 0),
      fy_net: Number(s.fy_net || 0),
      monthly_burn_rate: s.monthly_burn_rate ? Number(s.monthly_burn_rate) : null,
      pipeline_value: s.pipeline_value ? Number(s.pipeline_value) : null,
      outstanding_amount: s.outstanding_amount ? Number(s.outstanding_amount) : null,
      grants_won: s.grants_won as number | null,
      grants_pending: s.grants_pending as number | null,
    } : null,
    health: h ? {
      health_score: Number(h.health_score || 0),
      momentum_score: Number(h.momentum_score || 0),
      engagement_score: Number(h.engagement_score || 0),
      financial_score: Number(h.financial_score || 0),
      timeline_score: Number(h.timeline_score || 0),
      calculated_at: h.calculated_at as string | null,
    } : null,
    focus_areas: ((focusAreas.data || []) as Array<Record<string, unknown>>).map((f) => ({
      title: f.title as string,
      description: f.description as string | null,
      status: f.status as string,
      priority: f.priority as number | null,
      target_date: f.target_date as string | null,
    })),
    relationships: ((relationships.data || []) as Array<Record<string, unknown>>).map((r) => ({
      contact_name: r.contact_name as string,
      company_name: r.company_name as string | null,
      temperature: r.temperature as number | null,
      temperature_trend: r.temperature_trend as string | null,
      last_contact_at: r.last_contact_at as string | null,
    })),
    grants: ((grants.data || []) as Array<Record<string, unknown>>).map((g) => ({
      application_name: g.application_name as string,
      status: g.status as string,
      amount_requested: g.amount_requested as number | null,
    })),
    recent_knowledge: ((knowledge.data || []) as Array<Record<string, unknown>>).map((k) => ({
      title: k.title as string,
      knowledge_type: k.knowledge_type as string,
      importance: k.importance as string | null,
      recorded_at: k.recorded_at as string,
      action_required: k.action_required as boolean | null,
      follow_up_date: k.follow_up_date as string | null,
    })),
    recent_wins: s?.recent_wins ? (s.recent_wins as string[]) : [],
    blockers: s?.blockers ? (s.blockers as string[]) : [],
  }
}
