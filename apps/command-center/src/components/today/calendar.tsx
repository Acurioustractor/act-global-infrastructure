'use client'

import { useQuery } from '@tanstack/react-query'
import { getCalendarEvents, type CalendarEvent } from '@/lib/api'
import { Calendar, Clock, MapPin, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function TodayCalendar() {
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data, isLoading, error } = useQuery({
    queryKey: ['calendar', 'events', today],
    queryFn: () => getCalendarEvents(today),
  })

  const events = data?.events || []

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 w-36 bg-bg-elevated rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-bg-elevated rounded" />
          <div className="h-16 bg-bg-elevated rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-listen" />
        <h2 className="text-lg font-semibold text-text-primary">Today's Calendar</h2>
      </div>

      {events.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-text-secondary">No events scheduled for today</p>
          <p className="text-sm text-text-muted mt-1">Enjoy your open schedule</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event }: { event: CalendarEvent }) {
  const startTime = event.start_time ? format(new Date(event.start_time), 'h:mm a') : ''
  const endTime = event.end_time ? format(new Date(event.end_time), 'h:mm a') : ''

  return (
    <div className="group flex gap-4 rounded-lg border border-border bg-bg-elevated p-3 transition-colors hover:border-border/80">
      {/* Time column */}
      <div className="flex flex-col items-center justify-center min-w-[60px] text-center">
        <span className="text-sm font-medium text-text-primary">{startTime}</span>
        {endTime && (
          <span className="text-xs text-text-muted">{endTime}</span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px bg-border" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-text-primary truncate">{event.title}</h3>

        {event.location && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3 text-text-muted" />
            <span className="text-xs text-text-muted truncate">{event.location}</span>
          </div>
        )}

        {event.project_code && (
          <span className="inline-block mt-2 rounded-full bg-listen/10 px-2 py-0.5 text-xs font-medium text-listen">
            {event.project_code}
          </span>
        )}
      </div>
    </div>
  )
}
