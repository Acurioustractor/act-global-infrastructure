'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building2, Loader2, FolderKanban } from 'lucide-react'
import {
  getStorytellerFilters,
  getStorytellerOverview,
  getStorytellerQuotes,
  getStorytellerImpact,
} from '@/lib/api'
import type { StorytellerSummary } from '@/lib/api'
import { StatsCards } from '@/components/storyteller/stats-cards'
import { StorytellerGrid } from '@/components/storyteller/storyteller-grid'
import { ImpactRadar } from '@/components/storyteller/impact-radar'
import { QuoteWall } from '@/components/storyteller/quote-wall'

export default function OrganisationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>()

  const filterOptions = useQuery({
    queryKey: ['storyteller-filters'],
    queryFn: getStorytellerFilters,
  })
  const overview = useQuery({
    queryKey: ['storyteller-overview'],
    queryFn: getStorytellerOverview,
  })
  const quotes = useQuery({
    queryKey: ['storyteller-quotes'],
    queryFn: getStorytellerQuotes,
  })
  const impact = useQuery({
    queryKey: ['storyteller-impact'],
    queryFn: getStorytellerImpact,
  })

  // Find the organisation
  const org = useMemo(() => {
    return (filterOptions.data?.organisations || []).find((o) => o.id === orgId)
  }, [filterOptions.data?.organisations, orgId])

  // Get project IDs linked to this org
  const orgProjectIds = useMemo(() => {
    return new Set(org?.projectIds || [])
  }, [org])

  const orgProjectNames = useMemo(() => {
    return new Set(org?.projectNames || [])
  }, [org])

  // Filter storytellers to those in org's projects
  const orgStorytellers = useMemo(() => {
    return (overview.data?.storytellers || []).filter((s: StorytellerSummary) =>
      s.projects.some((p) => orgProjectIds.has(p.id))
    )
  }, [overview.data?.storytellers, orgProjectIds])

  const storytellerIds = useMemo(
    () => new Set(orgStorytellers.map((s: StorytellerSummary) => s.id)),
    [orgStorytellers]
  )

  // Stats
  const stats = useMemo(() => {
    const allThemes = new Set<string>()
    for (const s of orgStorytellers) {
      for (const t of s.themes) allThemes.add(t)
    }
    return {
      totalStorytellers: orgStorytellers.length,
      totalAnalyzed: orgStorytellers.length,
      totalThemes: allThemes.size,
      totalProjects: orgProjectIds.size,
    }
  }, [orgStorytellers, orgProjectIds])

  // Filter radar
  const filteredRadar = useMemo(() => {
    if (!impact.data?.radarData) return undefined
    return impact.data.radarData.filter((d) => orgProjectNames.has(d.project))
  }, [impact.data?.radarData, orgProjectNames])

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    if (!quotes.data?.quotes) return undefined
    return quotes.data.quotes.filter((q) => storytellerIds.has(q.storytellerId))
  }, [quotes.data?.quotes, storytellerIds])

  const isLoading = filterOptions.isLoading || overview.isLoading

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/40">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading organisation data...</p>
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-screen p-8">
        <Link
          href="/compendium/storytellers/organisations"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organisations
        </Link>
        <div className="glass-card p-8 text-center text-white/40 text-sm mt-8">
          Organisation not found
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <Link
          href="/compendium/storytellers/organisations"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organisations
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">{org.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {org.projectNames.map((name, i) => (
            <Link
              key={name}
              href={`/compendium/storytellers/project/${encodeURIComponent(org.projectIds[i])}`}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 transition-colors"
            >
              <FolderKanban className="h-3 w-3" />
              {name}
            </Link>
          ))}
        </div>
      </header>

      <div className="space-y-6">
        <StatsCards stats={stats} />
        <StorytellerGrid storytellers={orgStorytellers} />

        <div className="grid gap-6 lg:grid-cols-2">
          <ImpactRadar radarData={filteredRadar} />
          <QuoteWall quotes={filteredQuotes} />
        </div>
      </div>
    </div>
  )
}
