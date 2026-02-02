'use client'

import { getGreeting } from '@/lib/utils'
import { format } from 'date-fns'

export function TodayHeader() {
  const now = new Date()
  const greeting = getGreeting()
  const dateStr = format(now, 'd MMM yyyy')
  const timeStr = format(now, 'h:mm a')

  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary md:text-3xl">
          {greeting}, Ben
        </h1>
        <p className="mt-1 text-text-muted">
          What needs your attention today?
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-medium text-text-primary">{dateStr}</p>
        <p className="text-sm text-text-muted">{timeStr}</p>
      </div>
    </header>
  )
}
