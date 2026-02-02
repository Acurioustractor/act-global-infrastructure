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
  ArrowUpRight,
  User,
  FileQuestion,
  Brain,
  MessageSquare,
  ListChecks,
  Gavel,
} from 'lucide-react'
import {
  getCalendarEvents,
  getEcosystemOverview,
  search,
  searchKnowledge,
  type KnowledgeSearchHit,
  type EcosystemProject,
} from '@/lib/api'
import { cn, getGreeting } from '@/lib/utils'
import { ActionFeed } from '@/components/action-feed'
import { QuickStats } from '@/components/today/quick-stats'
import { CommunicationsNeeded } from '@/components/today/communications-needed'
import { GrantsPipeline } from '@/components/today/grants-pipeline'
import { UpcomingDeadlines } from '@/components/today/upcoming-deadlines'
import { FinanceSummary } from '@/components/today/finance-summary'
import { BusinessTasks } from '@/components/today/business-tasks'

const REFRESH_INTERVAL = 30 * 1000

// Project color mapping
const projectColors: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-400',
  pink: 'bg-pink-500/20 text-pink-400',
  green: 'bg-green-500/20 text-green-400',
  amber: 'bg-amber-500/20 text-amber-400',
  purple: 'bg-purple-500/20 text-purple-400',
  orange: 'bg-orange-500/20 text-orange-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
  teal: 'bg-teal-500/20 text-teal-400',
  slate: 'bg-slate-500/20 text-slate-400',
  indigo: 'bg-indigo-500/20 text-indigo-400',
}

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

  const { data: ecosystemData } = useQuery({
    queryKey: ['ecosystem', 'overview'],
    queryFn: getEcosystemOverview,
    refetchInterval: REFRESH_INTERVAL,
  })

  const events = calendarData?.events || []
  const projects = ecosystemData?.projects || []

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
        {/* LEFT COLUMN: Projects + Calendar */}
        <div className="order-2 lg:order-1 lg:col-span-4 space-y-4 md:space-y-6">
          {/* Projects Overview */}
          <div className="glass-card p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-indigo-400" />
                Projects
              </h2>
              <Link href="/compendium" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                All <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {projects
                .filter((p) => p.contacts > 0 || p.recentComms > 0 || p.opportunities > 0 || p.status === 'active')
                .slice(0, 8)
                .map((project) => (
                  <ProjectCard key={project.code} project={project} />
                ))}
            </div>
          </div>

          {/* Today's Calendar */}
          <div className="glass-card p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                Today's Schedule
              </h2>
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
                  <Link
                    key={event.id}
                    href={event.link || '/today'}
                    target={event.link ? '_blank' : undefined}
                    rel={event.link ? 'noopener noreferrer' : undefined}
                    className="glass-card-sm p-3 flex items-center gap-3 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="text-center min-w-[45px]">
                      <p className="text-sm font-semibold text-white">
                        {event.start_time ? format(new Date(event.start_time), 'HH:mm') : '--:--'}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white truncate">{event.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

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

        {/* CENTER COLUMN: Actions (primary focus) — shows first on mobile */}
        <div className="order-1 lg:order-2 lg:col-span-5 space-y-4 md:space-y-6">
          <ActionFeed maxItems={15} />
          <CommunicationsNeeded />
        </div>

        {/* RIGHT COLUMN: Finance + Pipeline + Deadlines */}
        <div className="order-3 lg:col-span-3 space-y-4 md:space-y-6">
          <FinanceSummary />
          <GrantsPipeline />
          <UpcomingDeadlines />
          <BusinessTasks />

          {/* Quick Links */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white mb-4">Quick Links</h2>
            <div className="space-y-2">
              <Link href="/pipeline" className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
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

// ─── Project Card ─────────────────────────────────────────────────

function ProjectCard({ project }: { project: EcosystemProject }) {
  const slug = project.name.toLowerCase().replace(/\s+/g, '-')
  const colorClasses = projectColors[project.color] || projectColors.indigo
  const hasActivity = project.contacts > 0 || project.recentComms > 0 || project.opportunities > 0

  return (
    <Link
      href={`/compendium/${slug}`}
      className="glass-card-sm p-3 hover:border-indigo-500/30 transition-all group"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold', colorClasses)}>
          {project.code}
        </div>
        {project.status !== 'active' && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/40">{project.status}</span>
        )}
      </div>
      <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
        {project.name}
      </p>
      {hasActivity && (
        <div className="flex items-center gap-2 mt-1">
          {project.contacts > 0 && (
            <span className="text-[10px] text-white/40">{project.contacts} contacts</span>
          )}
          {project.opportunities > 0 && (
            <span className="text-[10px] text-green-400">{project.opportunities} opps</span>
          )}
        </div>
      )}
    </Link>
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
