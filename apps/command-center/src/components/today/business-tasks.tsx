'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ListChecks, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getKnowledgeActions } from '@/lib/api'

const REFRESH_INTERVAL = 30 * 1000

export function BusinessTasks() {
  const { data, isLoading } = useQuery({
    queryKey: ['knowledge', 'actions-overdue'],
    queryFn: () => getKnowledgeActions({ overdue: true, limit: 8 }),
    refetchInterval: REFRESH_INTERVAL,
  })

  const overdueCount = data?.overdueCount || 0
  const actions = data?.actions || []

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="h-5 w-36 bg-white/5 rounded mb-4 animate-pulse" />
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
          <ListChecks className="h-4 w-4 text-emerald-400" />
          Business Tasks
        </h2>
        {overdueCount > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {overdueCount} overdue
          </span>
        )}
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-4 text-white/40">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400 opacity-50" />
          <p className="text-sm">No overdue tasks</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.slice(0, 5).map((action) => (
            <Link
              key={action.id}
              href="/knowledge/actions"
              className="glass-card-sm p-2.5 flex items-start gap-3 hover:border-emerald-500/30 transition-all"
            >
              <div className={cn(
                'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                action.importance === 'high' ? 'bg-red-400' : 'bg-amber-400'
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{action.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {action.project_code && (
                    <span className="text-[10px] text-indigo-400">{action.project_code}</span>
                  )}
                  {action.follow_up_date && (
                    <span className="text-[10px] text-red-400/70">
                      Due {new Date(action.follow_up_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
