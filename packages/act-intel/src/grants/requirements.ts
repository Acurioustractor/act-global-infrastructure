/**
 * Grant requirements — eligibility, criteria, documents, readiness.
 *
 * Extracted from Notion Workers Tool 27 (get_grant_requirements).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface GrantRequirementsOptions {
  grant_name: string
}

export interface GrantRequirement {
  requirement_type: string
  description: string
  is_met: boolean
}

export interface GrantRequirementsEntry {
  name: string
  provider: string | null
  status: string | null
  deadline: string | null
  amount: number | null
  url: string | null
  aligned_projects: string[]
  eligibility: GrantRequirement[]
  assessment: GrantRequirement[]
  documents: GrantRequirement[]
  readiness_pct: number
  act_readiness: {
    score: number | null
    gaps: string[]
  } | null
}

export interface GrantRequirementsResult {
  grants: GrantRequirementsEntry[]
}

export async function fetchGrantRequirements(
  supabase: SupabaseQueryClient,
  opts: GrantRequirementsOptions
): Promise<GrantRequirementsResult> {
  const { data: grants, error } = await supabase
    .from('grant_opportunities')
    .select('id, name, provider, closes_at, amount_max, application_status, url, act_readiness, aligned_projects')
    .ilike('name', `%${opts.grant_name}%`)
    .limit(3)

  if (error) throw new Error(`Failed to fetch grant requirements: ${error.message}`)
  if (!grants?.length) {
    return { grants: [] }
  }

  const results: GrantRequirementsEntry[] = []

  for (const grant of (grants as any[])) {
    // Get requirements from enrichment
    const { data: reqs } = await supabase
      .from('grant_application_requirements')
      .select('requirement_type, description, is_met')
      .eq('opportunity_id', grant.id)
      .order('requirement_type')

    const allReqs = (reqs || []) as any[]
    const eligibility = allReqs
      .filter((r) => r.requirement_type === 'eligibility')
      .map((r) => ({ requirement_type: r.requirement_type, description: r.description, is_met: !!r.is_met }))
    const assessment = allReqs
      .filter((r) => r.requirement_type === 'assessment')
      .map((r) => ({ requirement_type: r.requirement_type, description: r.description, is_met: !!r.is_met }))
    const documents = allReqs
      .filter((r) => r.requirement_type === 'document')
      .map((r) => ({ requirement_type: r.requirement_type, description: r.description, is_met: !!r.is_met }))

    const totalReqs = allReqs.length
    const metReqs = allReqs.filter((r) => r.is_met).length
    const readiness_pct = totalReqs > 0 ? Math.round((metReqs / totalReqs) * 100) : 0

    // Parse act_readiness JSONB
    let act_readiness: { score: number | null; gaps: string[] } | null = null
    if (grant.act_readiness && typeof grant.act_readiness === 'object') {
      const ar = grant.act_readiness as any
      act_readiness = {
        score: ar.score != null ? Number(ar.score) : null,
        gaps: Array.isArray(ar.gaps) ? ar.gaps : [],
      }
    }

    results.push({
      name: grant.name,
      provider: grant.provider || null,
      status: grant.application_status || null,
      deadline: grant.closes_at || null,
      amount: grant.amount_max ? Number(grant.amount_max) : null,
      url: grant.url || null,
      aligned_projects: grant.aligned_projects || [],
      eligibility,
      assessment,
      documents,
      readiness_pct,
      act_readiness,
    })
  }

  return { grants: results }
}
