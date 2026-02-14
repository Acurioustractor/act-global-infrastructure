'use client'

import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  Brain,
  Gavel,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { getWeeklyBriefing } from '@/lib/api'
import { cn } from '@/lib/utils'

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function Delta({ current, previous, suffix = '' }: { current: number; previous?: number; suffix?: string }) {
  if (previous == null || previous === 0) return null
  const delta = current - previous
  if (delta === 0) return <Minus className="h-3 w-3 text-white/20" />
  const pct = Math.round((delta / previous) * 100)
  return (
    <span className={cn('flex items-center gap-0.5 text-[10px]', delta > 0 ? 'text-emerald-400' : 'text-red-400')}>
      {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {delta > 0 ? '+' : ''}{pct}%{suffix}
    </span>
  )
}

export function WeeklyDigestCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['briefing', 'weekly'],
    queryFn: getWeeklyBriefing,
    refetchInterval: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="glass-card p-5 md:p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const digest = data?.digest
  if (!digest) {
    return (
      <div className="glass-card p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-indigo-400" />
          Weekly Digest
        </h2>
        <div className="text-center py-4 text-white/40">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No digest generated yet</p>
          <p className="text-xs mt-1">Runs every Sunday at 6pm</p>
        </div>
      </div>
    )
  }

  const stats = digest.stats || {}

  return (
    <div className="glass-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-400" />
          Weekly Digest
        </h2>
        <span className="text-[10px] text-white/30">{formatRelative(digest.generatedAt)}</span>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 mb-4">
        <StatPill
          icon={Mail}
          label="Comms"
          value={stats.communicationCount}
          prev={stats.prevCommunicationCount}
          color="text-blue-400"
        />
        <StatPill
          icon={Brain}
          label="Knowledge"
          value={stats.knowledgeCount}
          prev={stats.prevKnowledgeCount}
          color="text-violet-400"
        />
        <StatPill
          icon={Gavel}
          label="Decisions"
          value={stats.decisionCount}
          color="text-amber-400"
        />
        <StatPill
          icon={Calendar}
          label="Upcoming"
          value={stats.upcomingEvents}
          color="text-indigo-400"
        />
        {stats.spendThisWeek > 0 && (
          <StatPill
            icon={DollarSign}
            label="Spend"
            value={stats.spendThisWeek}
            color="text-white/50"
            format="currency"
          />
        )}
      </div>

      {/* Digest text */}
      <div className="text-sm text-white/70 leading-relaxed space-y-2 max-h-[200px] overflow-y-auto pr-1">
        {digest.text.split('\n\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  )
}

function StatPill({
  icon: Icon,
  label,
  value,
  prev,
  color,
  format,
}: {
  icon: typeof Mail
  label: string
  value?: number
  prev?: number
  color: string
  format?: 'currency'
}) {
  if (value == null) return null
  const display = format === 'currency' ? `$${value.toLocaleString()}` : value.toString()

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn('h-3 w-3', color)} />
      <span className="text-xs text-white/60">{display}</span>
      <Delta current={value} previous={prev} />
    </div>
  )
}
