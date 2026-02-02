'use client'

import { Users, Brain, Sparkles, FolderKanban } from 'lucide-react'
import type { StorytellerOverviewStats } from '@/lib/api'

const cards = [
  { key: 'totalStorytellers', label: 'Storytellers', icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  { key: 'totalAnalyzed', label: 'Analyzed', icon: Brain, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  { key: 'totalThemes', label: 'Themes', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { key: 'totalProjects', label: 'Projects', icon: FolderKanban, color: 'text-green-400', bg: 'bg-green-500/20' },
] as const

export function StatsCards({ stats }: { stats: StorytellerOverviewStats | undefined }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        const value = stats ? stats[card.key] : '—'
        return (
          <div key={card.key} className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-white/50">{card.label}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
