'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Sparkles,
  Moon,
  AlertTriangle,
  MessageSquare,
  Users,
  TrendingUp,
  Heart,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import { getMorningBriefing } from '@/lib/api'

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

export function MorningBriefing() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['briefing', 'morning'],
    queryFn: getMorningBriefing,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  if (isLoading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-white/10 rounded w-full" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (error || !data?.success) {
    return null
  }

  const { moonPhase, thought, summary, actions, communications, storytellers } = data

  return (
    <div className="glass-card p-5 md:p-6 space-y-5">
      {/* Header with Moon Phase */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Morning Briefing
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Moon className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs text-white/50">{moonPhase.phase}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40 max-w-[140px]">{moonPhase.energy}</p>
        </div>
      </div>

      {/* Regenerative Thought */}
      <div className="glass-card-sm p-3 border-l-2 border-amber-500/50">
        <p className="text-sm text-white/70 italic">&ldquo;{thought}&rdquo;</p>
      </div>

      {/* Quick Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card-sm p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-lg font-bold text-white">{summary.urgentItems}</span>
          </div>
          <p className="text-xs text-white/50">Urgent</p>
        </div>
        <div className="glass-card-sm p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-lg font-bold text-white">{summary.meetingsToday}</span>
          </div>
          <p className="text-xs text-white/50">Meetings</p>
        </div>
        <div className="glass-card-sm p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-green-400" />
            <span className="text-lg font-bold text-white">{formatCurrency(summary.pipelineValue)}</span>
          </div>
          <p className="text-xs text-white/50">Pipeline</p>
        </div>
        <div className="glass-card-sm p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="h-3.5 w-3.5 text-pink-400" />
            <span className="text-lg font-bold text-white">{summary.staleRelationships}</span>
          </div>
          <p className="text-xs text-white/50">Reconnect</p>
        </div>
      </div>

      {/* Overdue Actions Preview */}
      {actions.overdueCount > 0 && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Overdue Actions</p>
          <div className="space-y-1.5">
            {actions.overdue.slice(0, 3).map((action) => (
              <div
                key={action.id}
                className="glass-card-sm p-2.5 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                <p className="text-sm text-white/70 truncate flex-1">{action.title}</p>
                <span className="text-xs text-orange-400/70">{action.daysOverdue}d</span>
              </div>
            ))}
            {actions.overdueCount > 3 && (
              <p className="text-xs text-white/40 text-center pt-1">
                +{actions.overdueCount - 3} more overdue
              </p>
            )}
          </div>
        </div>
      )}

      {/* Storyteller Themes */}
      {storytellers.topThemes.length > 0 && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Community Themes</p>
          <div className="flex flex-wrap gap-1.5">
            {storytellers.topThemes.slice(0, 4).map((theme) => (
              <span
                key={theme}
                className="px-2 py-0.5 rounded-full text-xs bg-pink-500/20 text-pink-300 border border-pink-500/20"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <Link
          href="/compendium/storytellers"
          className="flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 transition-colors"
        >
          <Heart className="h-3 w-3" />
          Storytellers
        </Link>
        <Link
          href="/pipeline"
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Pipeline
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
