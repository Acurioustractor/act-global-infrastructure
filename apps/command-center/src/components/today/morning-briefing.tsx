'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
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

  const { summary, actions } = data

  return (
    <div className="glass-card p-5 md:p-6 space-y-5">
      {/* Header */}
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-400" />
        Morning Briefing
      </h2>

      {/* Quick Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
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
    </div>
  )
}
