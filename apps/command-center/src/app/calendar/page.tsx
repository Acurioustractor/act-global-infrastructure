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
  ChevronDown,
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
  List,
  Table,
  LayoutGrid,
  Plus,
  Check,
  ArrowUpDown,
  Tag,
  FileText,
  UserCircle,
} from 'lucide-react'
import { getCalendarEvents, getCalendarSources, updateCalendarEvent, bulkUpdateCalendarEvents, getProjects, getMeetingNote, type CalendarEvent, type CalendarSource, type Project, type MeetingNote } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────

type ViewType = 'year' | 'month' | 'week' | 'day' | 'list' | 'table' | 'cards'

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

function safeAttendees(attendees: unknown): Array<{ email: string; name?: string; response_status?: string }> {
  if (!attendees) return []
  if (Array.isArray(attendees)) return attendees
  if (typeof attendees === 'string') {
    try { const parsed = JSON.parse(attendees); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
  }
  return []
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
  const queryClient = useQueryClient()

  // State from URL params
  const viewParam = (searchParams.get('view') as ViewType) || 'month'
  const dateParam = searchParams.get('date')

  const [view, setView] = React.useState<ViewType>(viewParam)
  const [currentDate, setCurrentDate] = React.useState(() =>
    dateParam ? parseISO(dateParam) : new Date()
  )
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [todayTrigger, setTodayTrigger] = React.useState(0)
  const [enabledTags, setEnabledTags] = React.useState<Set<string> | null>(null) // null = show all
  const [showNoTags, setShowNoTags] = React.useState(true)

  // Fetch calendar sources
  const { data: sourcesData } = useQuery({
    queryKey: ['calendar', 'sources'],
    queryFn: getCalendarSources,
  })
  const calendarSources = sourcesData?.calendars || []

  // Fetch projects for name lookup
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
    staleTime: 5 * 60 * 1000,
  })
  const projectLookup = React.useMemo(() => {
    const map = new Map<string, Project>()
    projectsData?.projects?.forEach(p => map.set(p.code, p))
    return map
  }, [projectsData])

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
      case 'list':
      case 'table':
      case 'cards': {
        const ls = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
        const le = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
        return { fetchStart: ls.toISOString(), fetchEnd: le.toISOString() }
      }
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

  // Extract unique tags for filter sidebar
  const allTags = React.useMemo(() => {
    const tags = new Set<string>()
    allEvents.forEach(e => { e.tags?.forEach(t => tags.add(t)) })
    return Array.from(tags).sort()
  }, [allEvents])

  // Initialize enabledProjects when data loads
  React.useEffect(() => {
    if (enabledProjects === null && projectCodes.length > 0) {
      setEnabledProjects(new Set(projectCodes))
    }
  }, [projectCodes, enabledProjects])

  // Initialize enabledTags when data loads
  React.useEffect(() => {
    if (enabledTags === null && allTags.length > 0) {
      setEnabledTags(new Set(allTags))
    }
  }, [allTags, enabledTags])

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
      // Tag filter
      if (enabledTags !== null) {
        const eventTags = e.tags || []
        if (eventTags.length > 0) {
          if (!eventTags.some(t => enabledTags.has(t))) return false
        } else {
          if (!showNoTags) return false
        }
      }
      return true
    })
  }, [allEvents, enabledSources, enabledTypes, showUntyped, enabledProjects, showUntagged, enabledTags, showNoTags])

  // Navigation
  function navigate(dir: 1 | -1) {
    setCurrentDate(d => {
      switch (view) {
        case 'year': return dir === 1 ? addYears(d, 1) : subYears(d, 1)
        case 'month':
        case 'list':
        case 'table':
        case 'cards':
          return dir === 1 ? addMonths(d, 1) : subMonths(d, 1)
        case 'week': return dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)
        case 'day': return dir === 1 ? addDays(d, 1) : subDays(d, 1)
      }
    })
  }

  function goToday() {
    setCurrentDate(new Date())
    setTodayTrigger(t => t + 1)
  }

  function goToDate(date: Date, newView?: ViewType) {
    setCurrentDate(date)
    if (newView) setView(newView)
  }

  // Event mutation helpers
  async function handleUpdateEvent(id: string, updates: { tags?: string[]; manual_project_code?: string | null }) {
    await updateCalendarEvent(id, updates)
    queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] })
  }

  async function handleBulkUpdate(updates: { tags?: string[]; manual_project_code?: string | null }) {
    if (selectedIds.size === 0) return
    await bulkUpdateCalendarEvents(Array.from(selectedIds), updates)
    setSelectedIds(new Set())
    queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] })
  }

  function toggleSelection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
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
        case '5': setView('list'); break
        case '6': setView('table'); break
        case '7': setView('cards'); break
        case 'ArrowLeft': navigate(-1); break
        case 'ArrowRight': navigate(1); break
        case 't': goToday(); break
        case 'Escape': setSelectedEvent(null); setSelectedIds(new Set()); break
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
      case 'month':
      case 'list':
      case 'table':
      case 'cards':
        return format(currentDate, 'MMMM yyyy')
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

  function toggleTag(tag: string) {
    setEnabledTags(prev => {
      const next = new Set(prev || allTags)
      if (next.has(tag)) next.delete(tag); else next.add(tag)
      return next
    })
  }

  // Recently used tags for quick-pick
  const recentTags = React.useMemo(() => {
    const tagCounts: Record<string, number> = {}
    allEvents.forEach(e => e.tags?.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 }))
    return Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t)
  }, [allEvents])

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
          allTags={allTags}
          enabledTags={enabledTags || new Set(allTags)}
          toggleTag={toggleTag}
          showNoTags={showNoTags}
          setShowNoTags={setShowNoTags}
          projectLookup={projectLookup}
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
          {view === 'list' && (
            <ListView
              events={events}
              onEventClick={setSelectedEvent}
              todayTrigger={todayTrigger}
            />
          )}
          {view === 'table' && (
            <TableView
              events={events}
              onEventClick={setSelectedEvent}
              selectedIds={selectedIds}
              toggleSelection={toggleSelection}
              onUpdateEvent={handleUpdateEvent}
              recentTags={recentTags}
              projectCodes={projectCodes}
              projectLookup={projectLookup}
              todayTrigger={todayTrigger}
            />
          )}
          {view === 'cards' && (
            <CardsView
              events={events}
              onEventClick={setSelectedEvent}
              onUpdateEvent={handleUpdateEvent}
              recentTags={recentTags}
              projectCodes={projectCodes}
              projectLookup={projectLookup}
              todayTrigger={todayTrigger}
            />
          )}
        </div>
      </div>

      {/* Bulk tagging bar */}
      {selectedIds.size > 0 && (
        <BulkTagBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onBulkUpdate={handleBulkUpdate}
          recentTags={recentTags}
          projectCodes={projectCodes}
        />
      )}

      {/* Event Detail Panel */}
      {selectedEvent && (
        <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} projectLookup={projectLookup} />
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
  const calendarViews: { key: ViewType; label: string }[] = [
    { key: 'year', label: 'Year' },
    { key: 'month', label: 'Month' },
    { key: 'week', label: 'Week' },
    { key: 'day', label: 'Day' },
  ]

  const dataViews: { key: ViewType; label: string; icon: React.ElementType }[] = [
    { key: 'list', label: 'List', icon: List },
    { key: 'table', label: 'Table', icon: Table },
    { key: 'cards', label: 'Cards', icon: LayoutGrid },
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

        {/* Calendar view switcher */}
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {calendarViews.map(v => (
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

        {/* Data view switcher */}
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {dataViews.map(v => {
            const Icon = v.icon
            return (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5',
                  view === v.key
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                )}
                title={`${v.label} (${v.key === 'list' ? '5' : v.key === 'table' ? '6' : '7'})`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            )
          })}
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
  allTags, enabledTags, toggleTag, showNoTags, setShowNoTags,
  projectLookup,
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
  allTags: string[]
  enabledTags: Set<string>
  toggleTag: (t: string) => void
  showNoTags: boolean
  setShowNoTags: (v: boolean) => void
  projectLookup: Map<string, Project>
}) {
  const [sourcesOpen, setSourcesOpen] = React.useState(true)
  const [typesOpen, setTypesOpen] = React.useState(false)
  const [projectsOpen, setProjectsOpen] = React.useState(false)
  const [tagsOpen, setTagsOpen] = React.useState(false)

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
              {projectCodes.map(code => {
                const project = projectLookup.get(code)
                const displayName = project?.name || code.replace('ACT-', '')
                const categoryColors: Record<string, string> = {
                  justice: 'bg-red-400',
                  enterprise: 'bg-amber-400',
                  community: 'bg-green-400',
                  infrastructure: 'bg-blue-400',
                  media: 'bg-purple-400',
                  education: 'bg-cyan-400',
                }
                const dotColor = project?.category ? categoryColors[project.category] || 'bg-indigo-400' : 'bg-indigo-400'
                return (
                  <label key={code} className="flex items-center gap-2 cursor-pointer" title={code}>
                    <input type="checkbox" checked={enabledProjects.has(code)} onChange={() => toggleProject(code)} className="sr-only" />
                    <div className={cn(
                      'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                      enabledProjects.has(code) ? 'bg-indigo-500/20 border-indigo-500/40' : 'border-white/20 bg-transparent'
                    )}>
                      {enabledProjects.has(code) && <div className={cn('w-1.5 h-1.5 rounded-sm', dotColor)} />}
                    </div>
                    <span className={cn('text-xs truncate', enabledProjects.has(code) ? 'text-white/80' : 'text-white/30')}>
                      {displayName}
                    </span>
                  </label>
                )
              })}
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

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="glass-card p-4">
          <button
            onClick={() => setTagsOpen(!tagsOpen)}
            className="flex items-center justify-between w-full mb-2"
          >
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Tags</h3>
            <ChevronRight className={cn('h-3 w-3 text-white/30 transition-transform', tagsOpen && 'rotate-90')} />
          </button>
          {tagsOpen && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {allTags.map(tag => (
                <label key={tag} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={enabledTags.has(tag)} onChange={() => toggleTag(tag)} className="sr-only" />
                  <div className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                    enabledTags.has(tag) ? 'bg-emerald-500/20 border-emerald-500/40' : 'border-white/20 bg-transparent'
                  )}>
                    {enabledTags.has(tag) && <div className="w-1.5 h-1.5 rounded-sm bg-emerald-400" />}
                  </div>
                  <span className={cn('text-xs truncate', enabledTags.has(tag) ? 'text-white/80' : 'text-white/30')}>
                    {tag}
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showNoTags} onChange={() => setShowNoTags(!showNoTags)} className="sr-only" />
                <div className={cn(
                  'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                  showNoTags ? 'bg-white/10 border-white/30' : 'border-white/20 bg-transparent'
                )}>
                  {showNoTags && <div className="w-1.5 h-1.5 rounded-sm bg-white/40" />}
                </div>
                <span className={cn('text-xs', showNoTags ? 'text-white/60' : 'text-white/30')}>No tags</span>
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
                {safeAttendees(event.attendees).length > 0 && (
                  <div className="text-[10px] text-white/30 mt-0.5">
                    {safeAttendees(event.attendees).length} attendee{safeAttendees(event.attendees).length !== 1 ? 's' : ''}
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

function EventDetail({ event, onClose, projectLookup }: { event: CalendarEvent; onClose: () => void; projectLookup?: Map<string, Project> }) {
  const style = getEventStyle(event.event_type)
  const Icon = style.icon
  const start = parseISO(event.start_time)
  const end = event.end_time ? parseISO(event.end_time) : null
  const knowledgeId = (event.metadata?.knowledge_id as string) || null

  // Lazy-fetch meeting note if knowledge_id exists
  const { data: noteData } = useQuery({
    queryKey: ['meeting-note', knowledgeId],
    queryFn: () => getMeetingNote(knowledgeId!),
    enabled: !!knowledgeId,
  })
  const meetingNote = noteData?.meeting

  // Contact matches from attendee_contact_matches
  const contactMatches = React.useMemo(() => {
    const matches = event.metadata?.attendee_contact_matches
    if (!matches || typeof matches !== 'object') return []
    return Object.entries(matches as Record<string, { name?: string; email?: string }>).map(([id, info]) => ({
      id,
      name: info?.name || info?.email || id,
    }))
  }, [event.metadata])

  const projectName = event.project_code && projectLookup?.get(event.project_code)?.name

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
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400" title={event.project_code}>
                  {projectName || event.project_code}
                </span>
              )}
              {knowledgeId && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Notes
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
              {event.tags?.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  {tag}
                </span>
              ))}
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

          {safeAttendees(event.attendees).length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-white/50 mb-1.5">
                <Users className="h-4 w-4" />
                <span className="text-xs">{safeAttendees(event.attendees).length} attendee{safeAttendees(event.attendees).length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-wrap gap-1 ml-6">
                {safeAttendees(event.attendees).map((a, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/60">
                    {a.name || a.email}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matched contacts */}
          {contactMatches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-white/50 mb-1.5">
                <UserCircle className="h-4 w-4" />
                <span className="text-xs">{contactMatches.length} matched contact{contactMatches.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-wrap gap-1 ml-6">
                {contactMatches.map(c => (
                  <span key={c.id} className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meeting Notes */}
          {meetingNote && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-violet-400 mb-2">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Meeting Notes</span>
              </div>
              {meetingNote.summary && (
                <p className="text-xs text-white/60 mb-2">{meetingNote.summary}</p>
              )}
              {meetingNote.action_items && meetingNote.action_items.length > 0 && (
                <div className="mb-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Action Items</span>
                  <ul className="mt-1 space-y-0.5">
                    {meetingNote.action_items.map((item, i) => (
                      <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
                        <span className="text-violet-400 mt-0.5">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {meetingNote.topics && meetingNote.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {meetingNote.topics.map((topic, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400/70">{topic}</span>
                  ))}
                </div>
              )}
              {meetingNote.participants && meetingNote.participants.length > 0 && (
                <div className="text-[10px] text-white/30">
                  Participants: {meetingNote.participants.join(', ')}
                </div>
              )}
              {meetingNote.source_url && (
                <Link
                  href={meetingNote.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 mt-1"
                >
                  <ExternalLink className="h-3 w-3" /> View in Notion
                </Link>
              )}
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

// ─── Tag Input ────────────────────────────────────────────────────

function TagInput({
  currentTags, recentTags, onAddTag, onRemoveTag,
}: {
  currentTags: string[]
  recentTags: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const suggestions = recentTags.filter(t => !currentTags.includes(t) && (!input || t.toLowerCase().includes(input.toLowerCase())))

  function handleAdd(tag: string) {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !currentTags.includes(trimmed)) {
      onAddTag(trimmed)
    }
    setInput('')
  }

  return (
    <div className="relative inline-flex items-center gap-1 flex-wrap">
      {currentTags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
          {tag}
          <button onClick={(e) => { e.stopPropagation(); onRemoveTag(tag) }} className="hover:text-emerald-200">
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {open ? (
        <div className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && input.trim()) { handleAdd(input); }
              if (e.key === 'Escape') { setOpen(false); setInput('') }
            }}
            onBlur={() => setTimeout(() => { setOpen(false); setInput('') }, 150)}
            placeholder="Add tag..."
            className="w-24 text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 outline-none focus:border-emerald-500/40"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-[#1a1a2e] border border-white/10 rounded-md shadow-lg py-1 min-w-[120px]">
              {suggestions.slice(0, 6).map(tag => (
                <button
                  key={tag}
                  onMouseDown={e => { e.preventDefault(); handleAdd(tag); }}
                  className="block w-full text-left text-[10px] px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white/80"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true) }}
          className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-emerald-400 transition-all"
          title="Add tag"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ─── Project Picker ──────────────────────────────────────────────

function ProjectPicker({
  currentCode, projectCodes, projectLookup, onChange, compact,
}: {
  currentCode: string | null
  projectCodes: string[]
  projectLookup: Map<string, Project>
  onChange: (code: string | null) => void
  compact?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  // Get all active projects from lookup, plus any codes found in events
  const allCodes = React.useMemo(() => {
    const codes = new Set(projectCodes)
    projectLookup.forEach((p, code) => {
      if (p.status === 'active') codes.add(code)
    })
    return Array.from(codes).sort((a, b) => {
      const nameA = projectLookup.get(a)?.name || a
      const nameB = projectLookup.get(b)?.name || b
      return nameA.localeCompare(nameB)
    })
  }, [projectCodes, projectLookup])

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-indigo-400 transition-all"
          title={currentCode ? `Project: ${projectLookup.get(currentCode)?.name || currentCode}` : 'Set project'}
        >
          <Tag className="h-3 w-3" />
        </button>
        {open && (
          <div className="absolute top-full right-0 mt-1 z-20 bg-[#1a1a2e] border border-white/10 rounded-md shadow-lg py-1 min-w-[160px] max-h-48 overflow-y-auto">
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className={cn('block w-full text-left text-[10px] px-2 py-1 hover:bg-white/10', !currentCode ? 'text-white/60' : 'text-white/40')}
            >
              No project
            </button>
            {allCodes.map(code => (
              <button
                key={code}
                onClick={() => { onChange(code); setOpen(false) }}
                className={cn('block w-full text-left text-[10px] px-2 py-1 hover:bg-white/10', currentCode === code ? 'text-indigo-400' : 'text-white/60')}
              >
                {projectLookup.get(code)?.name || code}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'text-[10px] px-1.5 py-0.5 rounded text-center cursor-pointer hover:ring-1 hover:ring-indigo-500/30 transition-all',
          currentCode ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/20 hover:text-white/40'
        )}
      >
        {currentCode ? (projectLookup.get(currentCode)?.name || currentCode) : '—'}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-[#1a1a2e] border border-white/10 rounded-md shadow-lg py-1 min-w-[160px] max-h-48 overflow-y-auto">
          <button
            onClick={() => { onChange(null); setOpen(false) }}
            className={cn('block w-full text-left text-[10px] px-2 py-1 hover:bg-white/10', !currentCode ? 'text-white/60' : 'text-white/40')}
          >
            No project
          </button>
          {allCodes.map(code => (
            <button
              key={code}
              onClick={() => { onChange(code); setOpen(false) }}
              className={cn('block w-full text-left text-[10px] px-2 py-1 hover:bg-white/10', currentCode === code ? 'text-indigo-400' : 'text-white/60')}
            >
              {projectLookup.get(code)?.name || code}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────

function ListView({
  events, onEventClick, todayTrigger,
}: {
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  todayTrigger: number
}) {
  // Group events by date
  const grouped = React.useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => {
      const key = format(parseISO(e.start_time), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const todayRef = React.useRef<HTMLDivElement>(null)

  // Scroll to today on mount and when todayTrigger changes
  React.useEffect(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [todayTrigger])

  return (
    <div className="glass-card divide-y divide-white/[0.06]">
      {grouped.length === 0 && (
        <div className="p-8 text-center text-white/30 text-sm">No events in this period</div>
      )}
      {grouped.map(([dateKey, dayEvents]) => {
        const dateIsToday = isToday(parseISO(dateKey))
        return (
        <div key={dateKey} ref={dateIsToday ? todayRef : undefined}>
          {/* Date header */}
          <div className={cn('px-4 py-2 sticky top-0 z-10', dateIsToday ? 'bg-indigo-500/10' : 'bg-white/[0.02]')}>
            <span className={cn('text-xs font-semibold', dateIsToday ? 'text-indigo-400' : 'text-white/50')}>
              {format(parseISO(dateKey), 'EEEE, MMMM d')}
              {dateIsToday && ' — Today'}
            </span>
            <span className="text-[10px] text-white/30 ml-2">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</span>
          </div>
          {/* Event rows */}
          {dayEvents.map(event => {
            const style = getEventStyle(event.event_type)
            const Icon = style.icon
            const isExpanded = expandedId === event.id
            return (
              <div key={event.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.03] transition-all text-left"
                >
                  {/* Time */}
                  <span className="text-xs text-white/40 w-12 shrink-0 text-right">
                    {event.is_all_day ? 'All day' : format(parseISO(event.start_time), 'HH:mm')}
                  </span>
                  {/* Type icon */}
                  <div className={cn('p-1 rounded', style.bg)}>
                    <Icon className={cn('h-3 w-3', style.color)} />
                  </div>
                  {/* Title */}
                  <span className="text-sm text-white/80 truncate flex-1">{event.title}</span>
                  {/* Indicators */}
                  {!!event.metadata?.knowledge_id && (
                    <span title="Has meeting notes"><FileText className="h-3 w-3 text-violet-400 shrink-0" /></span>
                  )}
                  {/* Badges */}
                  {event.event_type && (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0', style.bg, style.color)}>
                      {style.label}
                    </span>
                  )}
                  {event.project_code && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 shrink-0">
                      {event.project_code}
                    </span>
                  )}
                  {event.tags?.map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                      {tag}
                    </span>
                  ))}
                  {event.sync_source && (
                    <span className={cn(
                      'text-[9px] px-1 py-0.5 rounded font-medium shrink-0',
                      event.sync_source === 'notion' ? 'bg-white/10 text-white/40' : 'bg-blue-500/10 text-blue-400/50'
                    )}>
                      {event.sync_source === 'notion' ? 'N' : 'G'}
                    </span>
                  )}
                  <ChevronDown className={cn('h-3 w-3 text-white/20 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
                </button>
                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-3 pl-[76px] space-y-2">
                    {event.end_time && (
                      <div className="text-xs text-white/40">
                        {format(parseISO(event.start_time), 'HH:mm')} – {format(parseISO(event.end_time), 'HH:mm')}
                      </div>
                    )}
                    {event.location && (
                      <div className="text-xs text-white/50 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {event.location}
                      </div>
                    )}
                    {safeAttendees(event.attendees).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {safeAttendees(event.attendees).map((a, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                            {a.name || a.email}
                          </span>
                        ))}
                      </div>
                    )}
                    {event.description && (
                      <p className="text-xs text-white/40 whitespace-pre-wrap line-clamp-3">{event.description}</p>
                    )}
                    <button
                      onClick={() => onEventClick(event)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300"
                    >
                      View full detail
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )
      })}
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────

type SortField = 'date' | 'title' | 'type' | 'project' | 'source'
type SortDir = 'asc' | 'desc'

function TableView({
  events, onEventClick, selectedIds, toggleSelection, onUpdateEvent, recentTags, projectCodes, projectLookup, todayTrigger,
}: {
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  selectedIds: Set<string>
  toggleSelection: (id: string) => void
  onUpdateEvent: (id: string, updates: { tags?: string[]; manual_project_code?: string | null }) => void
  recentTags: string[]
  projectCodes: string[]
  projectLookup: Map<string, Project>
  todayTrigger: number
}) {
  const [sortField, setSortField] = React.useState<SortField>('date')
  const [sortDir, setSortDir] = React.useState<SortDir>('asc')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const todayRowRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    todayRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [todayTrigger])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = React.useMemo(() => {
    const arr = [...events]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      switch (sortField) {
        case 'date': return dir * (a.start_time.localeCompare(b.start_time))
        case 'title': return dir * (a.title.localeCompare(b.title))
        case 'type': return dir * ((a.event_type || '').localeCompare(b.event_type || ''))
        case 'project': return dir * ((a.project_code || '').localeCompare(b.project_code || ''))
        case 'source': return dir * ((a.sync_source || '').localeCompare(b.sync_source || ''))
        default: return 0
      }
    })
    return arr
  }, [events, sortField, sortDir])

  const allSelected = events.length > 0 && events.every(e => selectedIds.has(e.id))

  function toggleAll() {
    if (allSelected) {
      // Deselect all visible
      const visible = new Set(events.map(e => e.id))
      const next = new Set(selectedIds)
      visible.forEach(id => next.delete(id))
      // We can't call setSelectedIds directly, so use toggleSelection for each
      events.forEach(e => { if (selectedIds.has(e.id)) toggleSelection(e.id) })
    } else {
      events.forEach(e => { if (!selectedIds.has(e.id)) toggleSelection(e.id) })
    }
  }

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <button onClick={() => handleSort(field)} className="flex items-center gap-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider hover:text-white/60">
        {children}
        {sortField === field && <ArrowUpDown className={cn('h-2.5 w-2.5', sortDir === 'desc' && 'rotate-180')} />}
      </button>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[32px_80px_1fr_80px_100px_80px_140px] gap-2 px-4 py-2 border-b border-white/[0.06] items-center">
        <div>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/30 h-3.5 w-3.5"
          />
        </div>
        <SortHeader field="date">Date</SortHeader>
        <SortHeader field="title">Title</SortHeader>
        <SortHeader field="type">Type</SortHeader>
        <SortHeader field="project">Project</SortHeader>
        <SortHeader field="source">Source</SortHeader>
        <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Tags</div>
      </div>

      {/* Rows */}
      <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
        {sorted.length === 0 && (
          <div className="p-8 text-center text-white/30 text-sm">No events in this period</div>
        )}
        {sorted.map((event, idx) => {
          const style = getEventStyle(event.event_type)
          const Icon = style.icon
          const isExpanded = expandedId === event.id
          const isSelected = selectedIds.has(event.id)
          const eventIsToday = isToday(parseISO(event.start_time))
          // Attach ref to first today row
          const isFirstToday = eventIsToday && !sorted.slice(0, idx).some(e => isToday(parseISO(e.start_time)))
          return (
            <div key={event.id} ref={isFirstToday ? todayRowRef : undefined} className={cn(isSelected && 'bg-indigo-500/5', eventIsToday && 'bg-indigo-500/[0.03]')}>
              <div className="grid grid-cols-[32px_80px_1fr_80px_100px_80px_140px] gap-2 px-4 py-2 items-center border-b border-white/[0.03] hover:bg-white/[0.02] transition-all">
                {/* Checkbox */}
                <div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(event.id)}
                    className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/30 h-3.5 w-3.5"
                  />
                </div>
                {/* Date */}
                <span className="text-xs text-white/50">
                  {format(parseISO(event.start_time), 'MMM d')}
                  <br />
                  <span className="text-[10px] text-white/30">
                    {event.is_all_day ? 'All day' : format(parseISO(event.start_time), 'HH:mm')}
                  </span>
                </span>
                {/* Title + expand */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="flex items-center gap-2 text-left min-w-0"
                >
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', style.color)} />
                  <span className="text-sm text-white/80 truncate">{event.title}</span>
                  {!!event.metadata?.knowledge_id && (
                    <span title="Has meeting notes"><FileText className="h-3 w-3 text-violet-400 shrink-0" /></span>
                  )}
                  {(event.ghl_contact_ids?.length ?? 0) > 0 && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400/70 shrink-0" title="Matched contacts">
                      {event.ghl_contact_ids!.length}
                    </span>
                  )}
                  <ChevronDown className={cn('h-3 w-3 text-white/20 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
                </button>
                {/* Type */}
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded text-center', style.bg, style.color)}>
                  {style.label}
                </span>
                {/* Project */}
                <div onClick={e => e.stopPropagation()}>
                  <ProjectPicker
                    currentCode={event.project_code || null}
                    projectCodes={projectCodes}
                    projectLookup={projectLookup}
                    onChange={(code) => onUpdateEvent(event.id, { manual_project_code: code })}
                  />
                </div>
                {/* Source */}
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded text-center font-medium',
                  event.sync_source === 'notion' ? 'bg-white/10 text-white/40' : 'bg-blue-500/10 text-blue-400/50'
                )}>
                  {event.sync_source === 'notion' ? 'Notion' : 'Google'}
                </span>
                {/* Tags */}
                <div onClick={e => e.stopPropagation()}>
                  <TagInput
                    currentTags={event.tags || []}
                    recentTags={recentTags}
                    onAddTag={(tag) => onUpdateEvent(event.id, { tags: [...(event.tags || []), tag] })}
                    onRemoveTag={(tag) => onUpdateEvent(event.id, { tags: (event.tags || []).filter(t => t !== tag) })}
                  />
                </div>
              </div>
              {/* Expanded row */}
              {isExpanded && (
                <div className="px-4 pb-3 pl-12 space-y-2 border-b border-white/[0.03]">
                  {event.end_time && (
                    <div className="text-xs text-white/40">
                      {format(parseISO(event.start_time), 'HH:mm')} – {format(parseISO(event.end_time), 'HH:mm')}
                    </div>
                  )}
                  {event.location && (
                    <div className="text-xs text-white/50 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {event.location}
                    </div>
                  )}
                  {safeAttendees(event.attendees).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {safeAttendees(event.attendees).map((a, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                          {a.name || a.email}
                        </span>
                      ))}
                    </div>
                  )}
                  {event.description && (
                    <p className="text-xs text-white/40 whitespace-pre-wrap line-clamp-4">{event.description}</p>
                  )}
                  {event.link && (
                    <Link
                      href={event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300"
                    >
                      <ExternalLink className="h-3 w-3" /> Open in calendar
                    </Link>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Cards View ──────────────────────────────────────────────────

function CardsView({
  events, onEventClick, onUpdateEvent, recentTags, projectCodes, projectLookup, todayTrigger,
}: {
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onUpdateEvent: (id: string, updates: { tags?: string[]; manual_project_code?: string | null }) => void
  recentTags: string[]
  projectCodes: string[]
  projectLookup: Map<string, Project>
  todayTrigger: number
}) {
  // Group by date
  const grouped = React.useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => {
      const key = format(parseISO(e.start_time), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  const todayRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [todayTrigger])

  return (
    <div className="space-y-6">
      {grouped.length === 0 && (
        <div className="glass-card p-8 text-center text-white/30 text-sm">No events in this period</div>
      )}
      {grouped.map(([dateKey, dayEvents]) => {
        const dateIsToday = isToday(parseISO(dateKey))
        return (
        <div key={dateKey} ref={dateIsToday ? todayRef : undefined}>
          <h3 className={cn('text-xs font-semibold mb-3', dateIsToday ? 'text-indigo-400' : 'text-white/50')}>
            {format(parseISO(dateKey), 'EEEE, MMMM d')}
            {dateIsToday && ' — Today'}
            <span className="text-white/30 ml-2">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {dayEvents.map(event => {
              const style = getEventStyle(event.event_type)
              const Icon = style.icon
              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={cn(
                    'glass-card p-3 cursor-pointer hover:border-white/20 transition-all group relative',
                    `border-l-2`,
                  )}
                  style={{ borderLeftColor: style.color.includes('blue') ? '#60a5fa' : style.color.includes('amber') ? '#fbbf24' : style.color.includes('purple') ? '#c084fc' : style.color.includes('green') ? '#4ade80' : style.color.includes('cyan') ? '#22d3ee' : style.color.includes('orange') ? '#fb923c' : style.color.includes('red') ? '#f87171' : '#818cf8' }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className={cn('p-1 rounded shrink-0', style.bg)}>
                      <Icon className={cn('h-3.5 w-3.5', style.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white/90 truncate">{event.title}</h4>
                      <span className="text-[10px] text-white/40">
                        {event.is_all_day ? 'All day' : (
                          <>
                            {format(parseISO(event.start_time), 'HH:mm')}
                            {event.end_time && ` – ${format(parseISO(event.end_time), 'HH:mm')}`}
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Location */}
                  {event.location && (
                    <div className="text-[10px] text-white/40 flex items-center gap-1 mb-2 truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0" /> {event.location}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {!!event.metadata?.knowledge_id && (
                      <span title="Has meeting notes"><FileText className="h-3 w-3 text-violet-400" /></span>
                    )}
                    {(event.ghl_contact_ids?.length ?? 0) > 0 && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400/70" title="Matched contacts">
                        <UserCircle className="h-2.5 w-2.5 inline mr-0.5" />{event.ghl_contact_ids!.length}
                      </span>
                    )}
                    {event.project_code && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400" title={event.project_code}>
                        {projectLookup.get(event.project_code)?.name || event.project_code}
                      </span>
                    )}
                    {event.tags?.map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Quick actions on hover */}
                  <div
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <ProjectPicker
                      currentCode={event.project_code || null}
                      projectCodes={projectCodes}
                      projectLookup={projectLookup}
                      onChange={(code) => onUpdateEvent(event.id, { manual_project_code: code })}
                      compact
                    />
                    <TagInput
                      currentTags={event.tags || []}
                      recentTags={recentTags}
                      onAddTag={(tag) => onUpdateEvent(event.id, { tags: [...(event.tags || []), tag] })}
                      onRemoveTag={(tag) => onUpdateEvent(event.id, { tags: (event.tags || []).filter(t => t !== tag) })}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )
      })}
    </div>
  )
}

// ─── Bulk Tag Bar ────────────────────────────────────────────────

function BulkTagBar({
  count, onClear, onBulkUpdate, recentTags, projectCodes,
}: {
  count: number
  onClear: () => void
  onBulkUpdate: (updates: { tags?: string[]; manual_project_code?: string | null }) => void
  recentTags: string[]
  projectCodes: string[]
}) {
  const [tagInput, setTagInput] = React.useState('')
  const [projectOpen, setProjectOpen] = React.useState(false)

  function addTag() {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed) {
      onBulkUpdate({ tags: [trimmed] })
      setTagInput('')
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 glass-card px-4 py-3 flex items-center gap-4 shadow-xl border border-indigo-500/30">
      <span className="text-sm font-medium text-white">{count} selected</span>

      {/* Tag input */}
      <div className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-emerald-400" />
        <input
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTag() }}
          placeholder="Add tag..."
          className="w-28 text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80 outline-none focus:border-emerald-500/40"
        />
        {recentTags.slice(0, 4).map(tag => (
          <button
            key={tag}
            onClick={() => onBulkUpdate({ tags: [tag] })}
            className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/70 hover:bg-emerald-500/20 hover:text-emerald-400"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Project dropdown */}
      <div className="relative">
        <button
          onClick={() => setProjectOpen(!projectOpen)}
          className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white/80 flex items-center gap-1"
        >
          Set project <ChevronDown className="h-3 w-3" />
        </button>
        {projectOpen && (
          <div className="absolute bottom-full left-0 mb-1 bg-[#1a1a2e] border border-white/10 rounded-md shadow-lg py-1 min-w-[140px]">
            <button
              onClick={() => { onBulkUpdate({ manual_project_code: null }); setProjectOpen(false) }}
              className="block w-full text-left text-xs px-3 py-1.5 text-white/40 hover:bg-white/10"
            >
              Clear project
            </button>
            {projectCodes.map(code => (
              <button
                key={code}
                onClick={() => { onBulkUpdate({ manual_project_code: code }); setProjectOpen(false) }}
                className="block w-full text-left text-xs px-3 py-1.5 text-white/70 hover:bg-white/10"
              >
                {code}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear */}
      <button onClick={onClear} className="text-xs text-white/40 hover:text-white/60">
        Clear
      </button>
    </div>
  )
}
