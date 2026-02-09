'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  Mail,
  GitBranch,
  Calendar,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActivityStreamItem } from '@/lib/api'

const TYPE_CONFIG: Record<string, { icon: typeof DollarSign; color: string; bg: string; label: string }> = {
  transaction: { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Transaction' },
  email: { icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Email' },
  opportunity: { icon: GitBranch, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Opportunity' },
  meeting: { icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Meeting' },
}

function formatActivityDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function groupByDate(activities: ActivityStreamItem[]): Map<string, ActivityStreamItem[]> {
  const groups = new Map<string, ActivityStreamItem[]>()
  for (const a of activities) {
    const d = new Date(a.activity_date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    let key: string
    if (diffDays === 0) key = 'Today'
    else if (diffDays === 1) key = 'Yesterday'
    else key = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

    const group = groups.get(key) || []
    group.push(a)
    groups.set(key, group)
  }
  return groups
}

export function ActivityTimeline({
  activities,
  showFilters = true,
  compact = false,
}: {
  activities: ActivityStreamItem[]
  showFilters?: boolean
  compact?: boolean
}) {
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const filtered = typeFilter
    ? activities.filter(a => a.activity_type === typeFilter)
    : activities

  const grouped = groupByDate(filtered)

  if (activities.length === 0) {
    return (
      <div className="py-6 text-center text-white/40 text-sm">
        No recent activity
      </div>
    )
  }

  return (
    <div>
      {showFilters && (
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-3.5 w-3.5 text-white/30" />
          <button
            onClick={() => setTypeFilter(null)}
            className={cn(
              'text-xs px-2 py-1 rounded-full transition-colors',
              !typeFilter ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            )}
          >
            All
          </button>
          {Object.entries(TYPE_CONFIG).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? null : type)}
              className={cn(
                'text-xs px-2 py-1 rounded-full transition-colors flex items-center gap-1',
                typeFilter === type ? `${config.bg} ${config.color}` : 'text-white/40 hover:text-white/60'
              )}
            >
              <config.icon className="h-3 w-3" />
              {config.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
              {dateLabel}
            </h4>
            <div className="space-y-1">
              {items.map((item, i) => {
                const config = TYPE_CONFIG[item.activity_type] || TYPE_CONFIG.meeting
                const Icon = config.icon

                return (
                  <div
                    key={`${item.source_id}-${i}`}
                    className={cn(
                      'flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors',
                      compact && 'py-1.5'
                    )}
                  >
                    <div className={cn('rounded-lg p-1.5 mt-0.5 shrink-0', config.bg)}>
                      <Icon className={cn('h-3.5 w-3.5', config.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'text-white truncate',
                          compact ? 'text-xs' : 'text-sm'
                        )}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-white/30 shrink-0 mt-0.5">
                          {formatActivityDate(item.activity_date)}
                        </span>
                      </div>
                      {item.description && !compact && (
                        <p className="text-xs text-white/40 truncate mt-0.5">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.amount != null && item.amount !== 0 && (
                          <span className={cn(
                            'text-xs font-medium tabular-nums',
                            item.amount > 0 ? 'text-green-400' : 'text-red-400'
                          )}>
                            {item.amount > 0 ? '+' : ''}${Math.abs(item.amount).toLocaleString()}
                          </span>
                        )}
                        {item.project_code && (
                          <Link
                            href={`/projects/${item.project_code}`}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.project_code}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
