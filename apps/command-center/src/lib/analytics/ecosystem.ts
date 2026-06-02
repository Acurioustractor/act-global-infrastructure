/**
 * Ecosystem belonging analytics — reads the EXISTING GHL→Supabase mirror
 * (ghl_contacts / ghl_opportunities / ghl_pipelines) and expresses it as
 * BELONGING, not sales: funnel by journey rung, source of arrival, consent
 * state, and per-project segmentation.
 *
 * Complements (does not duplicate) /api/ecosystem/pulse, which is money-focused
 * (receivables, pipeline $ value, grants). Here a contact is a person on a
 * journey with a consent state, never a deal value.
 *
 * All aggregation runs in SQL via execSql (NOT supabase-js .select), so it is
 * immune to the PostgREST ~1000-row cap that silently truncates wide sums.
 *
 * OCAP: storytellers are counted for visibility but flagged separately and never
 * framed as a funnel/lead. See wiki/decisions/act-site-form-alignment.md.
 */
import { execSql } from '@/lib/finance/query'
import { supabase } from '@/lib/supabase'

export interface FunnelStage {
  stageId: string
  name: string
  position: number
  count: number
}
export interface PipelineFunnel {
  pipelineId: string
  pipeline: string
  total: number
  stages: FunnelStage[]
}
export interface ConsentState {
  total: number
  consented: number
  unsubscribed: number
  noConsent: number
  storytellers: number
}
export interface SourceCount {
  source: string
  count: number
}
export interface ProjectSegment {
  projectCode: string
  opps: number
  openOpps: number
  pipelineValue: number
}
export interface EcosystemAnalytics {
  funnels: PipelineFunnel[]
  consent: ConsentState
  sources: SourceCount[]
  projects: ProjectSegment[]
  totalContacts: number
  totalOpenOpps: number
  generatedAt: string
}

interface RawStage {
  id?: string
  name?: string
  position?: number
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'))
  return Number.isFinite(n) ? n : 0
}

/**
 * Per-pipeline funnel: each pipeline's canonical stages (from ghl_pipelines.stages
 * jsonb, in position order) with the count of OPEN opportunities at each rung.
 * Stages with zero opportunities are still shown so the shape of the journey reads true.
 */
export async function getBelongingFunnels(): Promise<PipelineFunnel[]> {
  const { data: pipelines, error } = await supabase
    .from('ghl_pipelines')
    .select('ghl_id, name, stages')
  if (error) throw new Error(`getBelongingFunnels pipelines: ${error.message}`)

  const counts = await execSql<{ ghl_pipeline_id: string; ghl_stage_id: string; count: number }>(
    'ecosystem.funnelCounts',
    `SELECT ghl_pipeline_id, ghl_stage_id, count(*)::int AS count
     FROM ghl_opportunities
     WHERE status = 'open'
     GROUP BY ghl_pipeline_id, ghl_stage_id`,
  )
  const countByKey = new Map<string, number>()
  for (const c of counts) countByKey.set(`${c.ghl_pipeline_id}:${c.ghl_stage_id}`, num(c.count))

  const funnels: PipelineFunnel[] = (pipelines || []).map((p) => {
    const rawStages = (Array.isArray(p.stages) ? p.stages : []) as RawStage[]
    const stages: FunnelStage[] = rawStages
      .map((s, i) => ({
        stageId: String(s.id ?? ''),
        name: String(s.name ?? `Stage ${i + 1}`),
        position: typeof s.position === 'number' ? s.position : i,
        count: countByKey.get(`${p.ghl_id}:${s.id ?? ''}`) ?? 0,
      }))
      .sort((a, b) => a.position - b.position)
    return {
      pipelineId: String(p.ghl_id),
      pipeline: String(p.name ?? '(unnamed pipeline)'),
      total: stages.reduce((sum, s) => sum + s.count, 0),
      stages,
    }
  })

  // Most-populated journeys first; empty pipelines drop to the bottom.
  return funnels.sort((a, b) => b.total - a.total)
}

/** Consent state — ACT's first-class belonging metric. Never sends without it. */
export async function getConsentState(): Promise<ConsentState> {
  const rows = await execSql<Record<string, unknown>>(
    'ecosystem.consent',
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE newsletter_consent IS TRUE AND newsletter_unsubscribed_at IS NULL)::int AS consented,
       count(*) FILTER (WHERE newsletter_unsubscribed_at IS NOT NULL)::int AS unsubscribed,
       count(*) FILTER (WHERE newsletter_consent IS NOT TRUE AND newsletter_unsubscribed_at IS NULL)::int AS no_consent,
       count(*) FILTER (WHERE is_storyteller IS TRUE)::int AS storytellers
     FROM ghl_contacts`,
  )
  const r = rows[0] ?? {}
  return {
    total: num(r.total),
    consented: num(r.consented),
    unsubscribed: num(r.unsubscribed),
    noConsent: num(r.no_consent),
    storytellers: num(r.storytellers),
  }
}

/** Where contacts arrived from (lead source). Funnel attribution, top 15. */
export async function getSourceBreakdown(): Promise<SourceCount[]> {
  const rows = await execSql<{ source: string; count: number }>(
    'ecosystem.sources',
    `SELECT COALESCE(NULLIF(source, ''), '(unknown)') AS source, count(*)::int AS count
     FROM ghl_contacts
     GROUP BY 1
     ORDER BY count DESC
     LIMIT 15`,
  )
  return rows.map((r) => ({ source: String(r.source), count: num(r.count) }))
}

/** Per-project segmentation of opportunities (open count + open pipeline value). */
export async function getProjectSegmentation(): Promise<ProjectSegment[]> {
  const rows = await execSql<Record<string, unknown>>(
    'ecosystem.projects',
    `SELECT COALESCE(NULLIF(project_code, ''), '(none)') AS project_code,
            count(*)::int AS opps,
            count(*) FILTER (WHERE status = 'open')::int AS open_opps,
            COALESCE(sum(monetary_value) FILTER (WHERE status = 'open'), 0)::numeric AS pipeline_value
     FROM ghl_opportunities
     GROUP BY 1
     ORDER BY opps DESC`,
  )
  return rows.map((r) => ({
    projectCode: String(r.project_code),
    opps: num(r.opps),
    openOpps: num(r.open_opps),
    pipelineValue: num(r.pipeline_value),
  }))
}

/** One call for the hub. */
export async function getEcosystemAnalytics(): Promise<EcosystemAnalytics> {
  const [funnels, consent, sources, projects] = await Promise.all([
    getBelongingFunnels(),
    getConsentState(),
    getSourceBreakdown(),
    getProjectSegmentation(),
  ])
  return {
    funnels,
    consent,
    sources,
    projects,
    totalContacts: consent.total,
    totalOpenOpps: projects.reduce((sum, p) => sum + p.openOpps, 0),
    generatedAt: new Date().toISOString(),
  }
}
