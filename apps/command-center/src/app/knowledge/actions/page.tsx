'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ListChecks,
  AlertTriangle,
  Clock,
  Loader2,
  Users,
} from 'lucide-react'
import { getKnowledgeActions, type KnowledgeAction } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function ActionsPage() {
  const [filter, setFilter] = React.useState<'all' | 'overdue'>('all')

  const allActions = useQuery({
    queryKey: ['knowledge-actions-all'],
    queryFn: () => getKnowledgeActions({ limit: 100 }),
  })

  const overdueActions = useQuery({
    queryKey: ['knowledge-actions-overdue'],
    queryFn: () => getKnowledgeActions({ overdue: true, limit: 100 }),
  })

  const data = filter === 'overdue' ? overdueActions.data : allActions.data
  const isLoading = filter === 'overdue' ? overdueActions.isLoading : allActions.isLoading
  const actions = data?.actions || []
  const overdueCount = overdueActions.data?.overdueCount || 0

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <ListChecks className="h-5 w-5 text-white" />
            </div>
            Actions
          </h1>
          <p className="text-white/50 mt-1">
            {actions.length} action{actions.length !== 1 ? 's' : ''}
            {overdueCount > 0 && (
              <span className="text-red-400"> &middot; {overdueCount} overdue</span>
            )}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-white/5">
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'overdue' as const, label: `Overdue (${overdueCount})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filter === f.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && actions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-white/30">
          <ListChecks className="h-10 w-10 mb-3" />
          <p className="text-sm">
            {filter === 'overdue' ? 'No overdue actions' : 'No actions found'}
          </p>
        </div>
      )}

      {/* Actions list */}
      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((action) => {
            const isOverdue = action.follow_up_date && new Date(action.follow_up_date) < new Date()
            return (
              <div
                key={action.id}
                className={cn(
                  'glass-card p-4 transition-colors',
                  isOverdue
                    ? 'border border-red-500/20 bg-red-500/5'
                    : 'hover:bg-white/[0.03]'
                )}
              >
                <div className="flex items-start gap-3">
                  {isOverdue ? (
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <ListChecks className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white">{action.title}</h4>
                    {action.content && (
                      <p className="text-xs text-white/50 mt-1 line-clamp-2">{action.content}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {action.project_name && (
                        <span className="text-xs text-violet-400">{action.project_name}</span>
                      )}
                      {action.participants && action.participants.length > 0 && (
                        <span className="text-xs text-white/30 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {action.participants.join(', ')}
                        </span>
                      )}
                      {action.recorded_at && (
                        <span className="text-xs text-white/20">
                          Created {formatDistanceToNow(new Date(action.recorded_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    {action.follow_up_date && (
                      <div className={cn(
                        'flex items-center gap-1 text-xs',
                        isOverdue ? 'text-red-400' : 'text-white/30'
                      )}>
                        <Clock className="h-3 w-3" />
                        {format(new Date(action.follow_up_date), 'MMM d')}
                      </div>
                    )}
                    {action.importance && (
                      <span className={cn(
                        'inline-block px-1.5 py-0.5 rounded text-[10px]',
                        action.importance === 'high' || action.importance === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : action.importance === 'medium'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/5 text-white/30'
                      )}>
                        {action.importance}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
