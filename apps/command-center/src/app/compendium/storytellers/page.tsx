'use client'

import { useQuery } from '@tanstack/react-query'
import { Heart, Loader2 } from 'lucide-react'
import {
  getStorytellerOverview,
  getStorytellerThemes,
  getStorytellerQuotes,
  getStorytellerImpact,
  getStorytellerActivity,
} from '@/lib/api'
import { StatsCards } from '@/components/storyteller/stats-cards'
import { ActivityTimeline } from '@/components/storyteller/activity-timeline'
import { ThematicChart } from '@/components/storyteller/thematic-chart'
import { StorytellerGrid } from '@/components/storyteller/storyteller-grid'
import { ImpactRadar } from '@/components/storyteller/impact-radar'
import { QuoteWall } from '@/components/storyteller/quote-wall'
import { ProjectComparison } from '@/components/storyteller/project-comparison'

export default function StorytellerDashboardPage() {
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

      <div className="space-y-6">
        {/* Stats row */}
        <StatsCards stats={overview.data?.stats} />

        {/* Themes + Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ThematicChart
              chartData={themes.data?.chartData}
              projectNames={themes.data?.projectNames}
            />
          </div>
          <div>
            <ActivityTimeline items={activity.data?.timeline} />
          </div>
        </div>

        {/* Storyteller Grid */}
        <StorytellerGrid storytellers={overview.data?.storytellers} />

        {/* Impact + Quotes */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ImpactRadar radarData={impact.data?.radarData} />
          <QuoteWall quotes={quotes.data?.quotes} />
        </div>

        {/* Project Comparison */}
        <ProjectComparison radarData={impact.data?.radarData} />
      </div>
    </div>
  )
}
