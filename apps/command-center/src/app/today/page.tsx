'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  Calendar,
  Search,
  X,
  RefreshCw,
  Sun,
  Moon,
  ChevronRight,
  FolderKanban,
  BookOpen,
  User,
  FileQuestion,
  Brain,
  MessageSquare,
  ListChecks,
  Gavel,
  Send,
  Edit3,
  Check,
} from 'lucide-react'
import {
  getCalendarEvents,
  saveCalendarNote,
  search,
  searchKnowledge,
  type KnowledgeSearchHit,
} from '@/lib/api'
import { cn, getGreeting } from '@/lib/utils'
import { QuickStats } from '@/components/today/quick-stats'
import { CommunicationsNeeded } from '@/components/today/communications-needed'
import { GrantsPipeline } from '@/components/today/grants-pipeline'
import { UpcomingDeadlines } from '@/components/today/upcoming-deadlines'
import { FinanceSummary } from '@/components/today/finance-summary'
import { BusinessTasks } from '@/components/today/business-tasks'
import { MorningBriefing } from '@/components/today/morning-briefing'
import { ProjectPulseGrid } from '@/components/today/project-pulse'
import { PriorityInbox } from '@/components/today/priority-inbox'
import { WeeklyDigestCard } from '@/components/today/weekly-digest'
import { EcosystemPulse } from '@/components/today/ecosystem-pulse'
import { PartnerTouchpoints } from '@/components/today/partner-touchpoints'

const REFRESH_INTERVAL = 30 * 1000

export default function TodayPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const greeting = getGreeting()

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [knowledgeResults, setKnowledgeResults] = React.useState<KnowledgeSearchHit[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  // Theme state
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light-theme')
      document.documentElement.classList.add('dark-theme')
    } else {
      document.documentElement.classList.remove('dark-theme')
      document.documentElement.classList.add('light-theme')
    }
  }, [isDark])

  // Hybrid search: contacts/projects + knowledge
  const handleSearch = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setKnowledgeResults([])
      return
    }
    setIsSearching(true)
    try {
      const [legacyData, knowledgeData] = await Promise.allSettled([
        search(query),
        searchKnowledge(query),
      ])
      setSearchResults(legacyData.status === 'fulfilled' ? legacyData.value.results || [] : [])
      setKnowledgeResults(knowledgeData.status === 'fulfilled' ? knowledgeData.value.results || [] : [])
    } catch {
      setSearchResults([])
      setKnowledgeResults([])
    }
    setIsSearching(false)
  }, [])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  // Keyboard: Cmd+K to search, Esc to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
        setSearchResults([])
        setKnowledgeResults([])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Data queries
  const { data: calendarData } = useQuery({
    queryKey: ['calendar', 'events', today],
    queryFn: () => getCalendarEvents(today),
    refetchInterval: REFRESH_INTERVAL,
  })

  // Filter calendar to Ben's calendars only
  const BEN_CALENDARS = ['benjamin@act.place', 'bk@aimementoring.com']
  const events = (calendarData?.events || []).filter((e: any) =>
    !e.google_calendar_id || BEN_CALENDARS.includes(e.google_calendar_id)
  )

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Search Modal */}
      {searchOpen && (
        <SearchModal
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          knowledgeResults={knowledgeResults}
          isSearching={isSearching}
          onClose={() => {
            setSearchOpen(false)
            setSearchQuery('')
            setSearchResults([])
            setKnowledgeResults([])
          }}
        />
      )}

      {/* Header */}
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {greeting}, <span className="text-gradient">Ben</span>
          </h1>
          <p className="mt-1 text-sm md:text-lg text-white/60">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="glass-card-sm px-4 py-2 flex items-center gap-3 hover:border-indigo-500/30 transition-all animate-fade-in"
          >
            <Search className="h-4 w-4 text-white/40" />
            <span className="text-sm text-white/40">Search...</span>
            <kbd className="hidden md:inline-flex px-2 py-0.5 text-xs text-white/30 bg-white/5 rounded ml-4">
              ⌘K
            </kbd>
          </button>
          <button
            onClick={() => setIsDark(!isDark)}
            className="glass-card-sm p-2.5 hover:border-indigo-500/30 transition-all animate-fade-in"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-400" />
            )}
          </button>
        </div>
      </header>

      {/* Quick Stats Bar */}
      <div className="mb-6 md:mb-8 animate-fade-in">
        <QuickStats />
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* LEFT COLUMN: Briefing + Schedule + People */}
        <div className="order-1 lg:col-span-4 space-y-4 md:space-y-6">
          <MorningBriefing />

          {/* Today's Calendar */}
          <div className="glass-card p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <Link href="/calendar" className="text-lg font-semibold text-white flex items-center gap-2 hover:text-indigo-300 transition-colors">
                <Calendar className="h-5 w-5 text-indigo-400" />
                Today's Schedule
                <ChevronRight className="h-4 w-4 text-white/30" />
              </Link>
              <span className="text-sm text-white/50">{events.length} events</span>
            </div>
            {events.length === 0 ? (
              <div className="text-center py-6 text-white/40">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No events today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map((event) => (
                  <CalendarEventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>

          <CommunicationsNeeded />
          <PartnerTouchpoints />
        </div>

        {/* CENTER COLUMN: Ecosystem Pulse + Project Pulse + Priority Inbox */}
        <div className="order-2 lg:col-span-4 space-y-4 md:space-y-6">
          <EcosystemPulse />
          <ProjectPulseGrid />
          <PriorityInbox />

          {/* Wiki Quick Access */}
          <Link href="/wiki" className="glass-card p-5 block hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">ACT Wiki</h2>
                <p className="text-xs text-white/50">Mission, methodology & stories</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-indigo-400 transition-colors" />
            </div>
          </Link>
        </div>

        {/* RIGHT COLUMN: Finance + Pipeline + Deadlines + Business */}
        <div className="order-3 lg:col-span-4 space-y-4 md:space-y-6">
          <FinanceSummary />
          <GrantsPipeline />
          <UpcomingDeadlines />
          <WeeklyDigestCard />
          <BusinessTasks />

          {/* Quick Links */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white mb-4">Quick Links</h2>
            <div className="space-y-2">
              <Link href="/opportunities" className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <FolderKanban className="h-4 w-4 text-indigo-400" />
                <span className="text-sm text-white">Pipeline Board</span>
              </Link>
              <Link href="/reports" className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <ListChecks className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-white">Weekly Report</span>
              </Link>
              <Link href="/knowledge" className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <Brain className="h-4 w-4 text-violet-400" />
                <span className="text-sm text-white">Knowledge Base</span>
              </Link>
              <Link href="/business" className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-white">Business Overview</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar Event Card with Note Input ─────────────────────────

function CalendarEventCard({ event }: { event: { id: string; title: string; start_time: string; link?: string; is_all_day?: boolean; event_type?: string | null; attendees?: Array<{ email: string; name?: string }> } }) {
  const [showNoteInput, setShowNoteInput] = React.useState(false)
  const [noteText, setNoteText] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  const handleSaveNote = async () => {
    if (!noteText.trim()) return
    setSaving(true)
    try {
      await saveCalendarNote({
        eventId: event.id,
        eventTitle: event.title,
        note: noteText,
        attendees: event.attendees?.map(a => a.name || a.email) || [],
      })
      setSaved(true)
      setNoteText('')
      setTimeout(() => {
        setSaved(false)
        setShowNoteInput(false)
      }, 2000)
    } catch {
      // silent fail
    }
    setSaving(false)
  }

  // Check if event is in the past (could add reflection)
  const isPast = new Date(event.start_time) < new Date()

  return (
    <div className="glass-card-sm p-3 hover:border-indigo-500/30 transition-all">
      <div className="flex items-center gap-3">
        <div className="text-center min-w-[45px]">
          <p className="text-sm font-semibold text-white">
            {event.is_all_day ? 'All day' : event.start_time ? format(new Date(event.start_time), 'HH:mm') : '--:--'}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          {event.link ? (
            <Link
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-white truncate block hover:text-indigo-300 transition-colors"
            >
              {event.title}
            </Link>
          ) : (
            <p className="text-sm font-medium text-white truncate">{event.title}</p>
          )}
          {event.attendees && event.attendees.length > 0 && (
            <p className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
              <User className="h-2.5 w-2.5" />
              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isPast && (
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className={cn(
              'p-1.5 rounded-md transition-all shrink-0',
              showNoteInput ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-white/10 text-white/30'
            )}
            title="Add meeting reflection"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {showNoteInput && (
        <div className="mt-2 ml-[57px]">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="How did it go? Key takeaways..."
            className="w-full bg-white/5 rounded-md px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-indigo-500/30 resize-none"
            rows={2}
          />
          <div className="flex items-center justify-end gap-2 mt-1">
            {saved && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            <button
              onClick={handleSaveNote}
              disabled={saving || !noteText.trim()}
              className="text-[10px] px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-40 flex items-center gap-1"
            >
              <Send className="h-3 w-3" />
              {saving ? 'Saving...' : 'Save note'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Search Modal ─────────────────────────────────────────────────

function SearchModal({
  searchQuery,
  setSearchQuery,
  searchResults,
  knowledgeResults,
  isSearching,
  onClose,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: any[]
  knowledgeResults: KnowledgeSearchHit[]
  isSearching: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl mx-4 animate-slide-up">
        <div className="glass-card p-2 border-indigo-500/30">
          <div className="flex items-center gap-3 px-3">
            <Search className="h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="Search contacts, projects, meetings, decisions..."
              className="flex-1 bg-transparent py-3 text-white placeholder:text-white/40 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                }}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="h-4 w-4 text-white/40" />
              </button>
            )}
            <kbd className="hidden md:inline-flex px-2 py-1 text-xs text-white/30 bg-white/5 rounded">
              ESC
            </kbd>
          </div>

          {(searchResults.length > 0 || knowledgeResults.length > 0 || isSearching) && (
            <div className="border-t border-white/10 mt-2 pt-2 max-h-[60vh] overflow-y-auto">
              {isSearching ? (
                <div className="py-8 text-center text-white/40">
                  <RefreshCw className="h-5 w-5 mx-auto animate-spin mb-2" />
                  <p className="text-sm">Searching across contacts, projects & knowledge...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wide">
                        Contacts & Projects
                      </div>
                      {searchResults.map((result) => (
                        <Link
                          key={result.id}
                          href={
                            result.type === 'contact' ? `/people` :
                            result.type === 'project' ? `/projects/${result.id}` :
                            `/compendium`
                          }
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5"
                          onClick={onClose}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            result.type === 'contact' && 'bg-blue-500/20',
                            result.type === 'project' && 'bg-purple-500/20',
                            !['contact', 'project'].includes(result.type) && 'bg-amber-500/20'
                          )}>
                            {result.type === 'contact' ? (
                              <User className="h-4 w-4 text-blue-400" />
                            ) : result.type === 'project' ? (
                              <FolderKanban className="h-4 w-4 text-purple-400" />
                            ) : (
                              <FileQuestion className="h-4 w-4 text-amber-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{result.name}</p>
                            <p className="text-xs text-white/40 capitalize">{result.type}</p>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}

                  {knowledgeResults.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 mt-1 text-[10px] font-medium text-white/30 uppercase tracking-wide flex items-center gap-2">
                        Knowledge
                        <span className="px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[9px] normal-case">
                          hybrid
                        </span>
                      </div>
                      {knowledgeResults.slice(0, 8).map((hit) => {
                        const typeConfig: Record<string, { icon: typeof Brain; color: string; bg: string }> = {
                          meeting: { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/20' },
                          action: { icon: ListChecks, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
                          decision: { icon: Gavel, color: 'text-amber-400', bg: 'bg-amber-500/20' },
                        }
                        const config = typeConfig[hit.knowledge_type || ''] || { icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/20' }
                        const Icon = config.icon

                        return (
                          <Link
                            key={hit.id}
                            href={
                              hit.knowledge_type === 'meeting' ? '/knowledge/meetings' :
                              hit.knowledge_type === 'action' ? '/knowledge/actions' :
                              hit.knowledge_type === 'decision' ? '/knowledge/decisions' :
                              '/knowledge'
                            }
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5"
                            onClick={onClose}
                          >
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
                              <Icon className={cn('h-4 w-4', config.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{hit.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-white/40 capitalize">{hit.knowledge_type || 'knowledge'}</span>
                                {hit.project_name && (
                                  <span className="text-xs text-violet-400/70">{hit.project_name}</span>
                                )}
                              </div>
                            </div>
                            {hit.similarity != null && (
                              <span className="text-xs font-mono text-violet-400/70 shrink-0">
                                {(hit.similarity * 100).toFixed(0)}%
                              </span>
                            )}
                          </Link>
                        )
                      })}
                      {knowledgeResults.length > 8 && (
                        <Link
                          href={`/knowledge?q=${encodeURIComponent(searchQuery)}`}
                          className="block px-3 py-2 text-center text-xs text-violet-400 hover:text-violet-300"
                          onClick={onClose}
                        >
                          View all {knowledgeResults.length} knowledge results →
                        </Link>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && knowledgeResults.length === 0 && (
            <div className="border-t border-white/10 mt-2 pt-4 pb-2 text-center text-white/40">
              <p className="text-sm">No results for &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
