'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addYears,
  subYears,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  differenceInMinutes,
  startOfDay,
  endOfDay,
  getDay,
  startOfYear,
  eachMonthOfInterval,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Plane,
  PartyPopper,
  Heart,
  Brain,
  Flag,
  AlertCircle,
  MapPin,
  ExternalLink,
  X,
  Eye,
  EyeOff,
} from 'lucide-react'
import { getCalendarEvents, getCalendarSources, type CalendarEvent, type CalendarSource } from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────

type ViewType = 'year' | 'month' | 'week' | 'day'

const EVENT_TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  meeting:   { color: 'text-blue-400',   bg: 'bg-blue-500/20',   border: 'border-blue-500/40',   icon: Users,        label: 'Meeting' },
  travel:    { color: 'text-amber-400',  bg: 'bg-amber-500/20',  border: 'border-amber-500/40',  icon: Plane,        label: 'Travel' },
  gathering: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40', icon: PartyPopper,  label: 'Gathering' },
  personal:  { color: 'text-green-400',  bg: 'bg-green-500/20',  border: 'border-green-500/40',  icon: Heart,        label: 'Personal' },
  focus:     { color: 'text-cyan-400',   bg: 'bg-cyan-500/20',   border: 'border-cyan-500/40',   icon: Brain,        label: 'Focus' },
  milestone: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40', icon: Flag,         label: 'Milestone' },
  deadline:  { color: 'text-red-400',    bg: 'bg-red-500/20',    border: 'border-red-500/40',    icon: AlertCircle,  label: 'Deadline' },
}

const DEFAULT_EVENT_STYLE = { color: 'text-white/70', bg: 'bg-white/10', border: 'border-white/20', icon: CalendarIcon, label: 'Event' }

function getEventStyle(eventType?: string | null) {
  return (eventType && EVENT_TYPE_CONFIG[eventType]) || DEFAULT_EVENT_STYLE
}

// ─── Main Page ───────────────────────────────────────────────────

export default function CalendarPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-white/40">Loading calendar...</div>}>
      <CalendarPageInner />
    </React.Suspense>
  )
}

function CalendarPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State from URL params
  const viewParam = (searchParams.get('view') as ViewType) || 'month'
  const dateParam = searchParams.get('date')

  const [view, setView] = React.useState<ViewType>(viewParam)
  const [currentDate, setCurrentDate] = React.useState(() =>
    dateParam ? parseISO(dateParam) : new Date()
  )
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null)

  // Fetch calendar sources
  const { data: sourcesData } = useQuery({
    queryKey: ['calendar', 'sources'],
    queryFn: getCalendarSources,
  })
  const calendarSources = sourcesData?.calendars || []

  // Source filters — primary ON by default, all others OFF
  const [enabledSources, setEnabledSources] = React.useState<Set<string>>(() => new Set(['primary']))
  const [sourcesInitialized, setSourcesInitialized] = React.useState(false)

  // Initialize sources when data loads — enable primary-like calendars
  React.useEffect(() => {
    if (!sourcesInitialized && calendarSources.length > 0) {
      const primary = calendarSources.find(s => s.id === 'primary' || s.name === 'Primary')
      const initial = new Set<string>()
      if (primary) initial.add(primary.id)
      // If no explicit primary, enable the first google calendar
      if (initial.size === 0) {
        const firstGoogle = calendarSources.find(s => s.source === 'google')
        if (firstGoogle) initial.add(firstGoogle.id)
      }
      setEnabledSources(initial)
      setSourcesInitialized(true)
    }
  }, [calendarSources, sourcesInitialized])

  // Filters
  const [enabledTypes, setEnabledTypes] = React.useState<Set<string>>(
    () => new Set(Object.keys(EVENT_TYPE_CONFIG))
  )
  const [showUntyped, setShowUntyped] = React.useState(true)
  const [enabledProjects, setEnabledProjects] = React.useState<Set<string> | null>(null) // null = show all
  const [showUntagged, setShowUntagged] = React.useState(true)

  // Compute date range for data fetching
  const { fetchStart, fetchEnd } = React.useMemo(() => {
    switch (view) {
      case 'year': {
        const y = currentDate.getFullYear()
        return { fetchStart: `${y}-01-01T00:00:00`, fetchEnd: `${y}-12-31T23:59:59` }
      }
      case 'month': {
        const ms = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
        const me = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
        return { fetchStart: ms.toISOString(), fetchEnd: me.toISOString() }
      }
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
        const we = endOfWeek(currentDate, { weekStartsOn: 1 })
        return { fetchStart: ws.toISOString(), fetchEnd: we.toISOString() }
      }
      case 'day':
        return { fetchStart: startOfDay(currentDate).toISOString(), fetchEnd: endOfDay(currentDate).toISOString() }
    }
  }, [view, currentDate])

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', 'events', fetchStart, fetchEnd],
    queryFn: () => getCalendarEvents(fetchStart, fetchEnd),
  })

  const allEvents = data?.events || []

  // Extract unique project codes for filter sidebar
  const projectCodes = React.useMemo(() => {
    const codes = new Set<string>()
    allEvents.forEach(e => { if (e.project_code) codes.add(e.project_code) })
    return Array.from(codes).sort()
  }, [allEvents])

  // Initialize enabledProjects when data loads
  React.useEffect(() => {
    if (enabledProjects === null && projectCodes.length > 0) {
      setEnabledProjects(new Set(projectCodes))
    }
  }, [projectCodes, enabledProjects])

  // Filtered events
  const events = React.useMemo(() => {
    return allEvents.filter(e => {
      // Source filter
      const calId = e.google_calendar_id || 'primary'
      if (!enabledSources.has(calId)) return false
      // Type filter
      if (e.event_type) {
        if (!enabledTypes.has(e.event_type)) return false
      } else {
        if (!showUntyped) return false
      }
      // Project filter
      if (enabledProjects !== null) {
        if (e.project_code) {
          if (!enabledProjects.has(e.project_code)) return false
        } else {
          if (!showUntagged) return false
        }
      }
      return true
    })
  }, [allEvents, enabledSources, enabledTypes, showUntyped, enabledProjects, showUntagged])

  // Navigation
  function navigate(dir: 1 | -1) {
    setCurrentDate(d => {
      switch (view) {
        case 'year': return dir === 1 ? addYears(d, 1) : subYears(d, 1)
        case 'month': return dir === 1 ? addMonths(d, 1) : subMonths(d, 1)
        case 'week': return dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)
        case 'day': return dir === 1 ? addDays(d, 1) : subDays(d, 1)
      }
    })
  }

  function goToday() {
    setCurrentDate(new Date())
  }

  function goToDate(date: Date, newView?: ViewType) {
    setCurrentDate(date)
    if (newView) setView(newView)
  }

  // Keyboard navigation
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case '1': setView('year'); break
        case '2': setView('month'); break
        case '3': setView('week'); break
        case '4': setView('day'); break
        case 'ArrowLeft': navigate(-1); break
        case 'ArrowRight': navigate(1); break
        case 't': goToday(); break
        case 'Escape': setSelectedEvent(null); break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  // Sync URL params
  React.useEffect(() => {
    const params = new URLSearchParams()
    params.set('view', view)
    params.set('date', format(currentDate, 'yyyy-MM-dd'))
    router.replace(`/calendar?${params.toString()}`, { scroll: false })
  }, [view, currentDate, router])

  // Period label
  const periodLabel = React.useMemo(() => {
    switch (view) {
      case 'year': return format(currentDate, 'yyyy')
      case 'month': return format(currentDate, 'MMMM yyyy')
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
        const we = endOfWeek(currentDate, { weekStartsOn: 1 })
        return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`
      }
      case 'day': return format(currentDate, 'EEEE, MMMM d, yyyy')
    }
  }, [view, currentDate])

  // Toggle helpers
  function toggleSource(id: string) {
    setEnabledSources(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleType(type: string) {
    setEnabledTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type); else next.add(type)
      return next
    })
  }

  function toggleProject(code: string) {
    setEnabledProjects(prev => {
      const next = new Set(prev || projectCodes)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <CalendarHeader
        view={view}
        setView={setView}
        periodLabel={periodLabel}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={goToday}
        eventCount={events.length}
        isLoading={isLoading}
      />

      <div className="mt-4 flex gap-4">
        {/* Sidebar */}
        <CalendarSidebar
          calendarSources={calendarSources}
          enabledSources={enabledSources}
          toggleSource={toggleSource}
          setAllSources={setEnabledSources}
          enabledTypes={enabledTypes}
          toggleType={toggleType}
          showUntyped={showUntyped}
          setShowUntyped={setShowUntyped}
          projectCodes={projectCodes}
          enabledProjects={enabledProjects || new Set(projectCodes)}
          toggleProject={toggleProject}
          showUntagged={showUntagged}
          setShowUntagged={setShowUntagged}
        />

        {/* Main calendar area */}
        <div className="flex-1 min-w-0">
          {view === 'year' && (
            <YearView
              currentDate={currentDate}
              events={events}
              onMonthClick={(d) => goToDate(d, 'month')}
            />
          )}
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onDayClick={(d) => goToDate(d, 'day')}
              onEventClick={setSelectedEvent}
            />
          )}
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onEventClick={setSelectedEvent}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={events}
              onEventClick={setSelectedEvent}
            />
          )}
        </div>
      </div>

      {/* Event Detail Panel */}
      {selectedEvent && (
        <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  )
}

// ─── Calendar Header ─────────────────────────────────────────────

function CalendarHeader({
  view, setView, periodLabel, onPrev, onNext, onToday, eventCount, isLoading,
}: {
  view: ViewType
  setView: (v: ViewType) => void
  periodLabel: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  eventCount: number
  isLoading: boolean
}) {
  const views: { key: ViewType; label: string }[] = [
    { key: 'year', label: 'Year' },
    { key: 'month', label: 'Month' },
    { key: 'week', label: 'Week' },
    { key: 'day', label: 'Day' },
  ]

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <CalendarIcon className="h-6 w-6 text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <span className="text-sm text-white/40 ml-2">
          {isLoading ? 'Loading...' : `${eventCount} events`}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Today button */}
        <button
          onClick={onToday}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all border border-white/10"
        >
          Today
        </button>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="p-1.5 rounded-md hover:bg-white/10 text-white/60 transition-all">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-white min-w-[180px] text-center">
            {periodLabel}
          </span>
          <button onClick={onNext} className="p-1.5 rounded-md hover:bg-white/10 text-white/60 transition-all">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* View switcher */}
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {views.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-all',
                view === v.key
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────

function CalendarSidebar({
  calendarSources, enabledSources, toggleSource, setAllSources,
  enabledTypes, toggleType, showUntyped, setShowUntyped,
  projectCodes, enabledProjects, toggleProject, showUntagged, setShowUntagged,
}: {
  calendarSources: CalendarSource[]
  enabledSources: Set<string>
  toggleSource: (id: string) => void
  setAllSources: (ids: Set<string>) => void
  enabledTypes: Set<string>
  toggleType: (t: string) => void
  showUntyped: boolean
  setShowUntyped: (v: boolean) => void
  projectCodes: string[]
  enabledProjects: Set<string>
  toggleProject: (c: string) => void
  showUntagged: boolean
  setShowUntagged: (v: boolean) => void
}) {
  const [sourcesOpen, setSourcesOpen] = React.useState(true)
  const [typesOpen, setTypesOpen] = React.useState(false)
  const [projectsOpen, setProjectsOpen] = React.useState(false)

  return (
    <div className="hidden lg:block w-52 flex-shrink-0 space-y-4">
      {/* Calendar Sources */}
      <div className="glass-card p-4">
        <button
          onClick={() => setSourcesOpen(!sourcesOpen)}
          className="flex items-center justify-between w-full mb-2"
        >
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Sources</h3>
          <ChevronRight className={cn('h-3 w-3 text-white/30 transition-transform', sourcesOpen && 'rotate-90')} />
        </button>
        {sourcesOpen && (
          <div className="space-y-1.5">
            {calendarSources.map(cal => {
              const isNotion = cal.source === 'notion'
              const badge = isNotion ? 'N' : 'G'
              const badgeColor = isNotion ? 'bg-white/20 text-white/60' : 'bg-blue-500/20 text-blue-400'
              return (
                <label key={cal.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={enabledSources.has(cal.id)}
                    onChange={() => toggleSource(cal.id)}
                    className="sr-only"
                  />
                  <div className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                    enabledSources.has(cal.id)
                      ? 'border-indigo-500/40'
                      : 'border-white/20 bg-transparent'
                  )} style={enabledSources.has(cal.id) && cal.color ? { backgroundColor: `${cal.color}33`, borderColor: `${cal.color}66` } : undefined}>
                    {enabledSources.has(cal.id) && (
                      <div className="w-1.5 h-1.5 rounded-sm" style={cal.color ? { backgroundColor: cal.color } : { backgroundColor: '#818cf8' }} />
                    )}
                  </div>
                  <span className={cn('text-[10px] font-medium rounded px-1', badgeColor)}>{badge}</span>
                  <span className={cn('text-xs truncate', enabledSources.has(cal.id) ? 'text-white/80' : 'text-white/30')}>
                    {cal.name}
                  </span>
                </label>
              )
            })}
            {calendarSources.length === 0 && (
              <span className="text-xs text-white/30">No sources found</span>
            )}
            {calendarSources.length > 1 && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setAllSources(new Set(calendarSources.map(s => s.id)))}
                  className="text-[10px] text-white/40 hover:text-white/60"
                >
                  All
                </button>
                <button
                  onClick={() => setAllSources(new Set())}
                  className="text-[10px] text-white/40 hover:text-white/60"
                >
                  None
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Types */}
      <div className="glass-card p-4">
        <button
          onClick={() => setTypesOpen(!typesOpen)}
          className="flex items-center justify-between w-full mb-2"
        >
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Event Types</h3>
          <ChevronRight className={cn('h-3 w-3 text-white/30 transition-transform', typesOpen && 'rotate-90')} />
        </button>
        {typesOpen && (
          <div className="space-y-1.5">
            {Object.entries(EVENT_TYPE_CONFIG).map(([type, cfg]) => {
              const Icon = cfg.icon
              return (
                <label key={type} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={enabledTypes.has(type)}
                    onChange={() => toggleType(type)}
                    className="sr-only"
                  />
                  <div className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                    enabledTypes.has(type) ? `${cfg.bg} ${cfg.border}` : 'border-white/20 bg-transparent'
                  )}>
                    {enabledTypes.has(type) && <div className={cn('w-1.5 h-1.5 rounded-sm', cfg.bg.replace('/20', ''))} />}
                  </div>
                  <Icon className={cn('h-3.5 w-3.5', enabledTypes.has(type) ? cfg.color : 'text-white/30')} />
                  <span className={cn('text-xs', enabledTypes.has(type) ? 'text-white/80' : 'text-white/30')}>
                    {cfg.label}
                  </span>
                </label>
              )
            })}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showUntyped} onChange={() => setShowUntyped(!showUntyped)} className="sr-only" />
              <div className={cn(
                'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                showUntyped ? 'bg-white/10 border-white/30' : 'border-white/20 bg-transparent'
              )}>
                {showUntyped && <div className="w-1.5 h-1.5 rounded-sm bg-white/40" />}
              </div>
              <CalendarIcon className={cn('h-3.5 w-3.5', showUntyped ? 'text-white/50' : 'text-white/30')} />
              <span className={cn('text-xs', showUntyped ? 'text-white/60' : 'text-white/30')}>Untyped</span>
            </label>
          </div>
        )}
      </div>

      {/* Projects */}
      {projectCodes.length > 0 && (
        <div className="glass-card p-4">
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="flex items-center justify-between w-full mb-2"
          >
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Projects</h3>
            <ChevronRight className={cn('h-3 w-3 text-white/30 transition-transform', projectsOpen && 'rotate-90')} />
          </button>
          {projectsOpen && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {projectCodes.map(code => (
                <label key={code} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={enabledProjects.has(code)} onChange={() => toggleProject(code)} className="sr-only" />
                  <div className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                    enabledProjects.has(code) ? 'bg-indigo-500/20 border-indigo-500/40' : 'border-white/20 bg-transparent'
                  )}>
                    {enabledProjects.has(code) && <div className="w-1.5 h-1.5 rounded-sm bg-indigo-400" />}
                  </div>
                  <span className={cn('text-xs truncate', enabledProjects.has(code) ? 'text-white/80' : 'text-white/30')}>
                    {code.replace('ACT-', '')}
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showUntagged} onChange={() => setShowUntagged(!showUntagged)} className="sr-only" />
                <div className={cn(
                  'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                  showUntagged ? 'bg-white/10 border-white/30' : 'border-white/20 bg-transparent'
                )}>
                  {showUntagged && <div className="w-1.5 h-1.5 rounded-sm bg-white/40" />}
                </div>
                <span className={cn('text-xs', showUntagged ? 'text-white/60' : 'text-white/30')}>No project</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Year View ───────────────────────────────────────────────────

function YearView({
  currentDate, events, onMonthClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onMonthClick: (d: Date) => void
}) {
  const year = currentDate.getFullYear()
  const months = eachMonthOfInterval({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 1),
  })

  // Count events per day for heatmap
  const eventsByDay = React.useMemo(() => {
    const map: Record<string, number> = {}
    events.forEach(e => {
      const key = format(parseISO(e.start_time), 'yyyy-MM-dd')
      map[key] = (map[key] || 0) + 1
    })
    return map
  }, [events])

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
      {months.map(month => {
        const days = eachDayOfInterval({
          start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
          end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
        })
        const monthEventCount = events.filter(e => {
          const d = parseISO(e.start_time)
          return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
        }).length

        return (
          <button
            key={month.toISOString()}
            onClick={() => onMonthClick(month)}
            className="glass-card p-3 hover:border-indigo-500/30 transition-all text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">{format(month, 'MMM')}</span>
              {monthEventCount > 0 && (
                <span className="text-[10px] text-white/40">{monthEventCount}</span>
              )}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <div key={i} className="text-[8px] text-white/20 text-center">{d}</div>
              ))}
              {days.map(day => {
                const key = format(day, 'yyyy-MM-dd')
                const count = eventsByDay[key] || 0
                const inMonth = isSameMonth(day, month)
                return (
                  <div
                    key={key}
                    className={cn(
                      'w-full aspect-square rounded-sm flex items-center justify-center text-[8px]',
                      !inMonth && 'opacity-0',
                      isToday(day) && 'ring-1 ring-indigo-400',
                      count === 0 && 'text-white/20',
                      count === 1 && 'bg-indigo-500/20 text-indigo-300',
                      count === 2 && 'bg-indigo-500/40 text-indigo-200',
                      count >= 3 && 'bg-indigo-500/60 text-white',
                    )}
                  >
                    {inMonth ? day.getDate() : ''}
                  </div>
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Month View ──────────────────────────────────────────────────

function MonthView({
  currentDate, events, onDayClick, onEventClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onDayClick: (d: Date) => void
  onEventClick: (e: CalendarEvent) => void
}) {
  const monthStart = startOfMonth(currentDate)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  })

  const eventsByDay = React.useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => {
      const key = format(parseISO(e.start_time), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [events])

  return (
    <div className="glass-card overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="px-2 py-2 text-xs font-medium text-white/40 text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDay[key] || []
          const inMonth = isSameMonth(day, currentDate)

          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[90px] md:min-h-[110px] p-1.5 border-b border-r border-white/[0.04] text-left transition-all hover:bg-white/[0.03]',
                !inMonth && 'opacity-30',
              )}
            >
              <div className={cn(
                'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                isToday(day) ? 'bg-indigo-500 text-white' : 'text-white/50',
              )}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => {
                  const style = getEventStyle(event.event_type)
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
                      className={cn(
                        'text-[10px] leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer transition-all hover:opacity-80',
                        style.bg, style.color,
                      )}
                      title={event.title}
                    >
                      {event.is_all_day ? '' : format(parseISO(event.start_time), 'HH:mm') + ' '}
                      {event.title}
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-white/30 pl-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ───────────────────────────────────────────────────

const HOUR_HEIGHT = 48 // px per hour
const START_HOUR = 6
const END_HOUR = 22

function WeekView({
  currentDate, events, onEventClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) })

  const { allDayEvents, timedEvents } = React.useMemo(() => {
    const allDay: CalendarEvent[] = []
    const timed: CalendarEvent[] = []
    events.forEach(e => {
      if (e.is_all_day) allDay.push(e)
      else timed.push(e)
    })
    return { allDayEvents: allDay, timedEvents: timed }
  }, [events])

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  return (
    <div className="glass-card overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/[0.06]">
        <div />
        {days.map(day => (
          <div key={day.toISOString()} className="px-2 py-2 text-center border-l border-white/[0.04]">
            <div className="text-[10px] text-white/40 uppercase">{format(day, 'EEE')}</div>
            <div className={cn(
              'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mx-auto',
              isToday(day) ? 'bg-indigo-500 text-white' : 'text-white/70',
            )}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events banner */}
      {allDayEvents.length > 0 && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/[0.06]">
          <div className="text-[10px] text-white/30 p-1 text-right">all day</div>
          {days.map(day => {
            const dayAllDay = allDayEvents.filter(e => isSameDay(parseISO(e.start_time), day))
            return (
              <div key={day.toISOString()} className="px-0.5 py-0.5 border-l border-white/[0.04] min-h-[28px]">
                {dayAllDay.map(event => {
                  const style = getEventStyle(event.event_type)
                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={cn('text-[10px] px-1 py-0.5 rounded truncate cursor-pointer', style.bg, style.color)}
                    >
                      {event.title}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] overflow-y-auto max-h-[calc(100vh-280px)]">
        {/* Hour labels + grid rows */}
        <div className="relative">
          {hours.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-white/[0.04] pr-2 text-right">
              <span className="text-[10px] text-white/30 -translate-y-2 inline-block">
                {format(new Date(2026, 0, 1, h), 'ha')}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(day => {
          const dayTimed = timedEvents.filter(e => isSameDay(parseISO(e.start_time), day))
          return (
            <div key={day.toISOString()} className="relative border-l border-white/[0.04]">
              {hours.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-white/[0.04]" />
              ))}
              {/* Events */}
              {dayTimed.map(event => {
                const start = parseISO(event.start_time)
                const end = event.end_time ? parseISO(event.end_time) : new Date(start.getTime() + 60 * 60000)
                const startMinutes = start.getHours() * 60 + start.getMinutes() - START_HOUR * 60
                const duration = differenceInMinutes(end, start)
                const top = Math.max(0, (startMinutes / 60) * HOUR_HEIGHT)
                const height = Math.max(20, (duration / 60) * HOUR_HEIGHT)
                const style = getEventStyle(event.event_type)

                return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      'absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 cursor-pointer overflow-hidden border transition-all hover:opacity-80',
                      style.bg, style.border,
                    )}
                    style={{ top, height }}
                  >
                    <div className={cn('text-[10px] font-medium truncate', style.color)}>
                      {event.title}
                    </div>
                    <div className="text-[9px] text-white/40">
                      {format(start, 'HH:mm')} – {event.end_time ? format(end, 'HH:mm') : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day View ────────────────────────────────────────────────────

function DayView({
  currentDate, events, onEventClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
}) {
  const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), currentDate))
  const allDayEvents = dayEvents.filter(e => e.is_all_day)
  const timedEvents = dayEvents.filter(e => !e.is_all_day)
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  return (
    <div className="glass-card overflow-hidden">
      {/* All-day section */}
      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b border-white/[0.06]">
          <span className="text-[10px] text-white/30 uppercase tracking-wider mr-3">All Day</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {allDayEvents.map(event => {
              const style = getEventStyle(event.event_type)
              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={cn('text-xs px-2 py-1 rounded cursor-pointer', style.bg, style.color)}
                >
                  {event.title}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="grid grid-cols-[60px_1fr] overflow-y-auto max-h-[calc(100vh-260px)]">
        <div className="relative">
          {hours.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT * 1.5 }} className="border-b border-white/[0.04] pr-2 text-right">
              <span className="text-[10px] text-white/30 -translate-y-2 inline-block">
                {format(new Date(2026, 0, 1, h), 'h a')}
              </span>
            </div>
          ))}
        </div>

        <div className="relative border-l border-white/[0.04]">
          {hours.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT * 1.5 }} className="border-b border-white/[0.04]" />
          ))}
          {/* Events */}
          {timedEvents.map(event => {
            const start = parseISO(event.start_time)
            const end = event.end_time ? parseISO(event.end_time) : new Date(start.getTime() + 60 * 60000)
            const startMinutes = start.getHours() * 60 + start.getMinutes() - START_HOUR * 60
            const duration = differenceInMinutes(end, start)
            const hourHeight = HOUR_HEIGHT * 1.5
            const top = Math.max(0, (startMinutes / 60) * hourHeight)
            const height = Math.max(30, (duration / 60) * hourHeight)
            const style = getEventStyle(event.event_type)
            const Icon = style.icon

            return (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className={cn(
                  'absolute left-1 right-1 rounded-lg px-3 py-2 cursor-pointer border transition-all hover:opacity-80',
                  style.bg, style.border,
                )}
                style={{ top, height }}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', style.color)} />
                  <span className={cn('text-sm font-medium truncate', style.color)}>{event.title}</span>
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {format(start, 'HH:mm')} – {event.end_time ? format(end, 'HH:mm') : ''}
                </div>
                {event.location && (
                  <div className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {event.location}
                  </div>
                )}
                {event.attendees && event.attendees.length > 0 && (
                  <div className="text-[10px] text-white/30 mt-0.5">
                    {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Event Detail Panel ──────────────────────────────────────────

function EventDetail({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const style = getEventStyle(event.event_type)
  const Icon = style.icon
  const start = parseISO(event.start_time)
  const end = event.end_time ? parseISO(event.end_time) : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative glass-card p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-white/10 text-white/40">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className={cn('p-2 rounded-lg', style.bg)}>
            <Icon className={cn('h-5 w-5', style.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white">{event.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {event.event_type && (
                <span className={cn('text-xs px-2 py-0.5 rounded', style.bg, style.color)}>
                  {style.label}
                </span>
              )}
              {event.project_code && (
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                  {event.project_code}
                </span>
              )}
              {event.sync_source && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded font-medium',
                  event.sync_source === 'notion' ? 'bg-white/10 text-white/50' : 'bg-blue-500/10 text-blue-400/60'
                )}>
                  {event.sync_source === 'notion' ? 'Notion' : 'Google'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Time */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-white/70">
            <CalendarIcon className="h-4 w-4 text-white/40" />
            {event.is_all_day ? (
              <span>All day — {format(start, 'EEEE, MMMM d, yyyy')}</span>
            ) : (
              <span>
                {format(start, 'EEEE, MMMM d, yyyy')}
                <br />
                {format(start, 'HH:mm')} {end ? `– ${format(end, 'HH:mm')}` : ''}
              </span>
            )}
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-white/70">
              <MapPin className="h-4 w-4 text-white/40" />
              <span>{event.location}</span>
            </div>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-white/50 mb-1.5">
                <Users className="h-4 w-4" />
                <span className="text-xs">{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-wrap gap-1 ml-6">
                {event.attendees.map((a, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/60">
                    {a.name || a.email}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.description && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <p className="text-xs text-white/50 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {event.link && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <Link
                href={event.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Google Calendar
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
