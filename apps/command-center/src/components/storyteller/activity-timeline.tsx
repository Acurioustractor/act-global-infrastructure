'use client'

import { UserPlus, Brain } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
import type { ActivityTimelineItem } from '@/lib/api'

export function ActivityTimeline({ items }: { items: ActivityTimelineItem[] | undefined }) {
  if (!items || items.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-white/40 text-sm">
        No recent activity
      </div>
    )
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white/70 mb-4">Recent Activity</h3>
      <div className="space-y-1">
        {items.map((item) => {
          const isNew = item.type === 'new_storyteller'
          return (
            <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 py-2">
              <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isNew ? 'bg-pink-500/20' : 'bg-indigo-500/20'}`}>
                {isNew ? (
                  <UserPlus className="h-3.5 w-3.5 text-pink-400" />
                ) : (
                  <Brain className="h-3.5 w-3.5 text-indigo-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-white/40">
                    {isNew ? ' joined' : ' analyzed'}
                  </span>
                </p>
                <p className="text-xs text-white/30">
                  {item.detail && <span>{item.detail} · </span>}
                  {item.date ? formatRelativeDate(item.date) : ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
