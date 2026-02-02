'use client'

import { useQuery } from '@tanstack/react-query'
import { Calendar, AlertTriangle, FileText, Shield, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUpcomingDeadlines, type UpcomingDeadline } from '@/lib/api'
import { format } from 'date-fns'

const REFRESH_INTERVAL = 60 * 1000

const typeIcons: Record<string, typeof Calendar> = {
  grant: FileText,
  compliance: Shield,
  insurance: Shield,
  tax: DollarSign,
  opportunity: FileText,
}

const urgencyColors: Record<string, { text: string; bg: string }> = {
  overdue: { text: 'text-red-400', bg: 'bg-red-500/20' },
  this_week: { text: 'text-amber-400', bg: 'bg-amber-500/20' },
  this_month: { text: 'text-blue-400', bg: 'bg-blue-500/20' },
  upcoming: { text: 'text-white/50', bg: 'bg-white/5' },
}

export function UpcomingDeadlines() {
  const { data, isLoading } = useQuery({
    queryKey: ['business', 'upcoming'],
    queryFn: getUpcomingDeadlines,
    refetchInterval: REFRESH_INTERVAL,
  })

  const deadlines = data?.deadlines || []
  const counts = data?.counts || { overdue: 0, thisWeek: 0, thisMonth: 0, upcoming: 0 }

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="h-5 w-40 bg-white/5 rounded mb-4 animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-400" />
          Upcoming Deadlines
        </h2>
        {counts.overdue > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {counts.overdue} overdue
          </span>
        )}
      </div>

      {deadlines.length === 0 ? (
        <div className="text-center py-4 text-white/40">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No upcoming deadlines</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deadlines.slice(0, 5).map((deadline) => (
            <DeadlineRow key={deadline.id} deadline={deadline} />
          ))}
        </div>
      )}
    </div>
  )
}

function DeadlineRow({ deadline }: { deadline: UpcomingDeadline }) {
  const Icon = typeIcons[deadline.type] || Calendar
  const urgency = urgencyColors[deadline.urgency] || urgencyColors.upcoming

  let dateStr: string
  try {
    dateStr = format(new Date(deadline.date), 'd MMM')
  } catch {
    dateStr = deadline.date
  }

  return (
    <div className={cn(
      'glass-card-sm p-2.5 flex items-center gap-3',
      deadline.urgency === 'overdue' && 'border-red-500/30'
    )}>
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', urgency.bg)}>
        <Icon className={cn('h-3.5 w-3.5', urgency.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{deadline.title}</p>
        <p className="text-[10px] text-white/40">{deadline.source}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn('text-xs font-medium', urgency.text)}>{dateStr}</p>
        {deadline.amount != null && deadline.amount > 0 && (
          <p className="text-[10px] text-white/30">${deadline.amount.toLocaleString()}</p>
        )}
      </div>
    </div>
  )
}
