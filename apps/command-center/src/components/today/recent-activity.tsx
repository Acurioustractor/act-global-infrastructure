'use client'

import { useQuery } from '@tanstack/react-query'
import { Zap } from 'lucide-react'
import { getActivityStream } from '@/lib/api'
import { ActivityTimeline } from '@/components/activity-timeline'

export function RecentActivity() {
  const { data } = useQuery({
    queryKey: ['activity', 'recent'],
    queryFn: () => getActivityStream({ limit: 20 }),
    refetchInterval: 60 * 1000,
  })

  const activities = data?.activities || []

  if (activities.length === 0) return null

  return (
    <div className="glass-card p-5 md:p-6">
      <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-amber-400" />
        Recent Activity
      </h2>
      <ActivityTimeline activities={activities} showFilters={false} compact />
    </div>
  )
}
