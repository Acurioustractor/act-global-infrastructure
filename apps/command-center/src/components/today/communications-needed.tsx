'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Mail, MessageSquare, Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPendingCommunications } from '@/lib/api'

const REFRESH_INTERVAL = 30 * 1000

export function CommunicationsNeeded() {
  const { data, isLoading } = useQuery({
    queryKey: ['communications', 'pending'],
    queryFn: getPendingCommunications,
    refetchInterval: REFRESH_INTERVAL,
  })

  const pending = data?.pending || []
  const byProject = data?.byProject || {}

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="h-5 w-48 bg-white/5 rounded mb-4 animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const projectEntries = Object.entries(byProject).filter(([, items]) => items.length > 0)

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-400" />
          Communications Needed
        </h2>
        <span className="text-xs text-white/40">{pending.length} pending</span>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-4 text-white/40">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">All caught up</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projectEntries.map(([projectCode, items]) => (
            <div key={projectCode}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-medium text-white/50 uppercase tracking-wide">
                  {projectCode}
                </span>
                <span className="text-[10px] text-white/30">({items.length})</span>
              </div>
              <div className="space-y-1.5">
                {items.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href="/reports"
                    className="glass-card-sm p-2.5 flex items-center gap-3 hover:border-blue-500/30 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-400 flex-shrink-0">
                      {item.contactName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.contactName}</p>
                      <p className="text-xs text-white/40 truncate">{item.subject}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-3 w-3 text-white/30" />
                      <span className={cn(
                        'text-xs',
                        item.daysWaiting > 7 ? 'text-red-400' : item.daysWaiting > 3 ? 'text-amber-400' : 'text-white/40'
                      )}>
                        {item.daysWaiting}d
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <Link
          href="/reports"
          className="flex items-center justify-center gap-1 mt-3 text-xs text-blue-400 hover:text-blue-300"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}
