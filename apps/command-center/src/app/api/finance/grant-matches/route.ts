import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface ProjectProfile {
  id: string
  project_code: string
  name: string
  embedding: string | null
  domains: string[]
  geographic_focus: string[]
}

interface GrantMatch {
  id: string
  name: string
  provider: string
  amount_max: number | null
  closes_at: string | null
  categories: string[]
  geography: string | null
  similarity: number
  focus_areas: string[]
}

export async function GET() {
  try {
    // Fetch all project profiles with embeddings
    const { data: profiles, error: profileError } = await supabase
      .from('project_profiles')
      .select('id, project_code, name, embedding, domains, geographic_focus')
      .not('embedding', 'is', null)
      .order('project_code')

    if (profileError || !profiles?.length) {
      return NextResponse.json({ projects: [], error: profileError?.message || 'No project profiles found' })
    }

    // Run vector searches sequentially to avoid connection pool exhaustion
    const projectMatches = []
    for (const profile of profiles as ProjectProfile[]) {
      const { data: matches } = await supabase
        .rpc('match_grants_for_org', {
          org_embedding: profile.embedding,
          threshold: 0.40,
          match_limit: 10,
        })

      const domains = new Set((profile.domains || []).map(d => d.toLowerCase()))
      const geo = new Set((profile.geographic_focus || []).map(g => g.toLowerCase()))

      const scored = (matches || []).map((grant: GrantMatch) => {
        let score = grant.similarity

        if (grant.categories?.length && domains.size > 0) {
          const overlap = grant.categories.filter(c => domains.has(c.toLowerCase())).length
          score += Math.min(overlap * 0.025, 0.05)
        }
        if (grant.focus_areas?.length && domains.size > 0) {
          const overlap = grant.focus_areas.filter(f => domains.has(f.toLowerCase())).length
          score += Math.min(overlap * 0.025, 0.05)
        }
        if (grant.geography && geo.size > 0) {
          const geoLower = grant.geography.toLowerCase()
          for (const g of geo) {
            if (geoLower.includes(g) || g.includes(geoLower)) {
              score += 0.03
              break
            }
          }
        }

        // Stale grant penalty
        if (grant.closes_at) {
          const yearsAgo = (Date.now() - new Date(grant.closes_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          if (yearsAgo >= 5) score -= 0.20
          else if (yearsAgo >= 2) score -= 0.10
        }
        const yearMatch = grant.name?.match(/20[12]\d/)
        if (yearMatch) {
          const grantYear = parseInt(yearMatch[0])
          if (new Date().getFullYear() - grantYear >= 3) score -= 0.15
        }

        return {
          id: grant.id,
          name: grant.name,
          provider: grant.provider,
          fit_score: Math.max(0, Math.min(Math.round(score * 100), 100)),
          amount_max: grant.amount_max,
          closes_at: grant.closes_at,
        }
      })

      scored.sort((a: { fit_score: number }, b: { fit_score: number }) => b.fit_score - a.fit_score)
      const goodMatches = scored.filter((m: { fit_score: number }) => m.fit_score >= 40)

      projectMatches.push({
        project_code: profile.project_code,
        project_name: profile.name,
        match_count: goodMatches.length,
        top_score: goodMatches[0]?.fit_score || 0,
        top_matches: goodMatches.slice(0, 3),
      })
    }

    projectMatches.sort((a, b) => b.match_count - a.match_count)
    const totalMatches = projectMatches.reduce((s, p) => s + p.match_count, 0)

    return NextResponse.json({
      projects: projectMatches,
      total_matches: totalMatches,
      projects_with_matches: projectMatches.filter(p => p.match_count > 0).length,
    })
  } catch (e) {
    console.error('Grant matches API error:', e)
    return NextResponse.json({ error: 'Failed to load grant matches' }, { status: 500 })
  }
}
