'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Heart, Loader2, FolderKanban } from 'lucide-react'
import {
  getStorytellerOverview,
  getStorytellerThemes,
  getStorytellerQuotes,
  getStorytellerImpact,
} from '@/lib/api'
import type { StorytellerSummary } from '@/lib/api'
import { StatsCards } from '@/components/storyteller/stats-cards'
import { ThematicChart } from '@/components/storyteller/thematic-chart'
import { StorytellerGrid } from '@/components/storyteller/storyteller-grid'
import { ImpactRadar } from '@/components/storyteller/impact-radar'
import { QuoteWall } from '@/components/storyteller/quote-wall'

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()

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

  // Find project name from storyteller data
  const projectName = useMemo(() => {
    for (const s of overview.data?.storytellers || []) {
      for (const p of s.projects) {
        if (p.id === projectId) return p.name
      }
    }
    return projectId
  }, [overview.data?.storytellers, projectId])

  // Filter storytellers by project
  const projectStorytellers = useMemo(() => {
    return (overview.data?.storytellers || []).filter((s: StorytellerSummary) =>
      s.projects.some((p) => p.id === projectId)
    )
  }, [overview.data?.storytellers, projectId])

  const storytellerIds = useMemo(
    () => new Set(projectStorytellers.map((s: StorytellerSummary) => s.id)),
    [projectStorytellers]
  )

  // Stats
  const stats = useMemo(() => {
    const allThemes = new Set<string>()
    for (const s of projectStorytellers) {
      for (const t of s.themes) allThemes.add(t)
    }
    return {
      totalStorytellers: projectStorytellers.length,
      totalAnalyzed: projectStorytellers.length,
      totalThemes: allThemes.size,
      totalProjects: 1,
    }
  }, [projectStorytellers])

  // Filter chart data to this project only
  const filteredChartData = useMemo(() => {
    if (!themes.data?.chartData) return undefined
    return themes.data.chartData
      .map((entry) => ({
        theme: entry.theme,
        [projectName]: entry[projectName] || 0,
      }))
      .filter((entry) => (entry[projectName] as number) > 0)
  }, [themes.data?.chartData, projectName])

  // Filter radar to this project
  const filteredRadar = useMemo(() => {
    if (!impact.data?.radarData) return undefined
    return impact.data.radarData.filter((d) => d.project === projectName)
  }, [impact.data?.radarData, projectName])

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    if (!quotes.data?.quotes) return undefined
    return quotes.data.quotes.filter((q) => storytellerIds.has(q.storytellerId))
  }, [quotes.data?.quotes, storytellerIds])

  const isLoading = overview.isLoading

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/40">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading project data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <Link
          href="/compendium/storytellers"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Storyteller Intelligence
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <FolderKanban className="h-8 w-8 text-indigo-400" />
          <h1 className="text-3xl font-bold text-white">{projectName}</h1>
        </div>
        <p className="text-lg text-white/60">
          {projectStorytellers.length} storyteller{projectStorytellers.length !== 1 ? 's' : ''} in this project
        </p>
      </header>

      <div className="space-y-6">
        <StatsCards stats={stats} />

        {/* Theme chart for this project */}
        <ThematicChart
          chartData={filteredChartData}
          projectNames={[projectName]}
        />

        {/* Storyteller Grid */}
        <StorytellerGrid storytellers={projectStorytellers} />

        {/* Impact + Quotes */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ImpactRadar radarData={filteredRadar} />
          <QuoteWall quotes={filteredQuotes} />
        </div>
      </div>
    </div>
  )
}
