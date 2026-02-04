'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, Loader2 } from 'lucide-react'
import {
  getStorytellerOverview,
  getStorytellerThemes,
  getStorytellerQuotes,
  getStorytellerImpact,
  getStorytellerActivity,
  getStorytellerFilters,
} from '@/lib/api'
import type {
  StorytellerSummary,
  StorytellerOverviewStats,
  ThemeChartEntry,
  StorytellerQuote,
  ImpactRadarEntry,
  ActivityTimelineItem,
} from '@/lib/api'
import { StatsCards } from '@/components/storyteller/stats-cards'
import { ActivityTimeline } from '@/components/storyteller/activity-timeline'
import { ThematicChart } from '@/components/storyteller/thematic-chart'
import { StorytellerGrid } from '@/components/storyteller/storyteller-grid'
import { ImpactRadar } from '@/components/storyteller/impact-radar'
import { QuoteWall } from '@/components/storyteller/quote-wall'
import { ProjectComparison } from '@/components/storyteller/project-comparison'
import { FilterBar, EMPTY_FILTERS } from '@/components/storyteller/filter-bar'
import type { StorytellerFilters } from '@/components/storyteller/filter-bar'

export default function StorytellerDashboardPage() {
  const [filters, setFilters] = useState<StorytellerFilters>(EMPTY_FILTERS)

  const overview = useQuery({
    queryKey: ['storyteller-overview'],
    queryFn: getStorytellerOverview,
  })
  const themes = useQuery({
    queryKey: ['storyteller-themes'],
    queryFn: getStorytellerThemes,
  })
  const quotes = useQuery({
    queryKey: ['storyteller-quotes'],
    queryFn: getStorytellerQuotes,
  })
  const impact = useQuery({
    queryKey: ['storyteller-impact'],
    queryFn: getStorytellerImpact,
  })
  const activity = useQuery({
    queryKey: ['storyteller-activity'],
    queryFn: getStorytellerActivity,
  })
  const filterOptions = useQuery({
    queryKey: ['storyteller-filters'],
    queryFn: getStorytellerFilters,
  })

  // Determine if any filter is active
  const hasFilters =
    filters.projectIds.length > 0 ||
    filters.themes.length > 0 ||
    filters.culturalBackgrounds.length > 0 ||
    filters.organisationNames.length > 0 ||
    filters.isElder ||
    filters.isFeatured

  // Resolve organisation filter → project IDs
  const orgProjectIds = useMemo(() => {
    if (filters.organisationNames.length === 0) return null
    const ids = new Set<string>()
    for (const org of filterOptions.data?.organisations || []) {
      if (filters.organisationNames.includes(org.name)) {
        for (const pid of org.projectIds) ids.add(pid)
      }
    }
    return ids
  }, [filters.organisationNames, filterOptions.data])

  // Filter storytellers
  const filteredStorytellers = useMemo(() => {
    if (!hasFilters) return overview.data?.storytellers
    return (overview.data?.storytellers || []).filter((s: StorytellerSummary) => {
      if (filters.projectIds.length > 0) {
        if (!s.projects.some((p) => filters.projectIds.includes(p.id))) return false
      }
      if (orgProjectIds) {
        if (!s.projects.some((p) => orgProjectIds.has(p.id))) return false
      }
      if (filters.themes.length > 0) {
        const sThemes = s.themes.map((t) => t.replace(/_/g, ' '))
        if (!filters.themes.some((ft) => sThemes.includes(ft))) return false
      }
      if (filters.culturalBackgrounds.length > 0) {
        if (!s.culturalBackground.some((c) => filters.culturalBackgrounds.includes(c))) return false
      }
      if (filters.isElder && !s.isElder) return false
      if (filters.isFeatured && !s.isFeatured) return false
      return true
    })
  }, [overview.data?.storytellers, filters, orgProjectIds, hasFilters])

  // Build filtered storyteller ID set
  const filteredIds = useMemo(() => {
    if (!hasFilters) return null
    return new Set((filteredStorytellers || []).map((s: StorytellerSummary) => s.id))
  }, [filteredStorytellers, hasFilters])

  // Filtered project names (from filter selection or from filtered storytellers)
  const filteredProjectNames = useMemo(() => {
    if (!hasFilters) return null
    const names = new Set<string>()
    for (const s of filteredStorytellers || []) {
      for (const p of s.projects) names.add(p.name)
    }
    return names
  }, [filteredStorytellers, hasFilters])

  // Recompute stats from filtered storytellers
  const filteredStats: StorytellerOverviewStats | undefined = useMemo(() => {
    if (!hasFilters) return overview.data?.stats
    const storytellers = filteredStorytellers || []
    const allThemes = new Set<string>()
    const allProjects = new Set<string>()
    for (const s of storytellers) {
      for (const t of s.themes) allThemes.add(t)
      for (const p of s.projects) allProjects.add(p.id)
    }
    return {
      totalStorytellers: storytellers.length,
      totalAnalyzed: storytellers.length,
      totalThemes: allThemes.size,
      totalProjects: allProjects.size,
    }
  }, [overview.data?.stats, filteredStorytellers, hasFilters])

  // Filter chart data columns by project names
  const filteredChartData: ThemeChartEntry[] | undefined = useMemo(() => {
    if (!filteredProjectNames || !themes.data?.chartData) return themes.data?.chartData
    return themes.data.chartData.map((entry) => {
      const filtered: ThemeChartEntry = { theme: entry.theme }
      for (const key of Object.keys(entry)) {
        if (key === 'theme') continue
        if (filteredProjectNames.has(key)) {
          filtered[key] = entry[key]
        }
      }
      return filtered
    }).filter((entry) => {
      // Remove rows with all zeros after filtering
      return Object.keys(entry).some((k) => k !== 'theme' && (entry[k] as number) > 0)
    })
  }, [themes.data?.chartData, filteredProjectNames])

  const filteredProjectNamesList: string[] | undefined = useMemo(() => {
    if (!filteredProjectNames || !themes.data?.projectNames) return themes.data?.projectNames
    return themes.data.projectNames.filter((n) => filteredProjectNames.has(n))
  }, [themes.data?.projectNames, filteredProjectNames])

  // Filter activity timeline by storyteller IDs
  const filteredTimeline: ActivityTimelineItem[] | undefined = useMemo(() => {
    if (!filteredIds || !activity.data?.timeline) return activity.data?.timeline
    return activity.data.timeline.filter((item) => filteredIds.has(item.id))
  }, [activity.data?.timeline, filteredIds])

  // Filter radar data by project
  const filteredRadarData: ImpactRadarEntry[] | undefined = useMemo(() => {
    if (!filteredProjectNames || !impact.data?.radarData) return impact.data?.radarData
    return impact.data.radarData.filter((d) => filteredProjectNames.has(d.project))
  }, [impact.data?.radarData, filteredProjectNames])

  // Build project name → ID map for clickable links
  const projectIdMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of overview.data?.storytellers || []) {
      for (const p of s.projects) {
        if (!map.has(p.name)) map.set(p.name, p.id)
      }
    }
    return map
  }, [overview.data?.storytellers])

  // Filter quotes by storyteller ID
  const filteredQuotes: StorytellerQuote[] | undefined = useMemo(() => {
    if (!filteredIds || !quotes.data?.quotes) return quotes.data?.quotes
    return quotes.data.quotes.filter((q) => filteredIds.has(q.storytellerId))
  }, [quotes.data?.quotes, filteredIds])

  const isLoading = overview.isLoading && themes.isLoading && quotes.isLoading

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/40">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading storyteller intelligence...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-8 w-8 text-pink-400" />
          <h1 className="text-3xl font-bold text-white">Storyteller Intelligence</h1>
        </div>
        <p className="text-lg text-white/60">
          Cross-project storyteller analysis from the Empathy Ledger
        </p>
      </header>

      {/* Filter Bar */}
      <div className="mb-6 relative z-20">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          filterOptions={filterOptions.data}
        />
      </div>

      <div className="space-y-6">
        {/* Stats row */}
        <StatsCards stats={filteredStats} />

        {/* Themes + Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ThematicChart
              chartData={filteredChartData}
              projectNames={filteredProjectNamesList}
            />
          </div>
          <div>
            <ActivityTimeline items={filteredTimeline} />
          </div>
        </div>

        {/* Storyteller Grid */}
        <StorytellerGrid storytellers={filteredStorytellers} />

        {/* Impact + Quotes */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ImpactRadar radarData={filteredRadarData} />
          <QuoteWall quotes={filteredQuotes} />
        </div>

        {/* Project Comparison */}
        <ProjectComparison radarData={filteredRadarData} projectIdMap={projectIdMap} />
      </div>
    </div>
  )
}
