'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Gavel,
  Loader2,
  Users,
  CalendarDays,
  ChevronDown,
} from 'lucide-react'
import { getKnowledgeDecisions, type KnowledgeDecision } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function DecisionsPage() {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-decisions'],
    queryFn: () => getKnowledgeDecisions({ limit: 100 }),
  })

  const decisions = data?.decisions || []

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Gavel className="h-5 w-5 text-white" />
            </div>
            Decisions
          </h1>
          <p className="text-white/50 mt-1">
            {decisions.length} decision{decisions.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && decisions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-white/30">
          <Gavel className="h-10 w-10 mb-3" />
          <p className="text-sm">No decisions recorded</p>
        </div>
      )}

      {/* Decisions list */}
      {decisions.length > 0 && (
        <div className="space-y-3">
          {decisions.map((d) => {
            const isExpanded = expandedId === d.id
            const statusColor =
              d.decision_status === 'approved' || d.decision_status === 'final'
                ? 'bg-emerald-500/20 text-emerald-400'
                : d.decision_status === 'pending'
                  ? 'bg-amber-500/20 text-amber-400'
                  : d.decision_status === 'rejected'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/10 text-white/50'

            return (
              <div key={d.id} className="glass-card overflow-hidden hover:bg-white/[0.03] transition-colors">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start gap-3">
                    <Gavel className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-white truncate">{d.title}</h4>
                        {d.decision_status && (
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0', statusColor)}>
                            {d.decision_status}
                          </span>
                        )}
                        <ChevronDown className={cn(
                          'h-4 w-4 text-white/30 transition-transform shrink-0 ml-auto',
                          isExpanded && 'rotate-180'
                        )} />
                      </div>
                      {d.decision_rationale && (
                        <p className={cn(
                          'text-xs text-white/50',
                          !isExpanded && 'line-clamp-1'
                        )}>
                          {d.decision_rationale}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {d.project_name && (
                          <span className="text-xs text-violet-400">{d.project_name}</span>
                        )}
                        {d.recorded_at && (
                          <span className="text-xs text-white/30 flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(new Date(d.recorded_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 ml-7 space-y-3 border-t border-white/5">
                    {d.content && (
                      <div className="pt-3">
                        <div className="text-xs font-medium text-white/40 mb-1">Details</div>
                        <div className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                          {d.content}
                        </div>
                      </div>
                    )}
                    {d.decision_rationale && (
                      <div>
                        <div className="text-xs font-medium text-white/40 mb-1">Rationale</div>
                        <div className="text-xs text-white/60">{d.decision_rationale}</div>
                      </div>
                    )}
                    {d.participants && d.participants.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-white/40 mb-1">Participants</div>
                        <div className="flex flex-wrap gap-1">
                          {d.participants.map((p) => (
                            <span key={p} className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/60">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {d.recorded_at && (
                      <div className="text-xs text-white/30">
                        {format(new Date(d.recorded_at), 'EEEE, MMMM d, yyyy')} &middot;{' '}
                        {formatDistanceToNow(new Date(d.recorded_at), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
