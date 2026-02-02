'use client'

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import {
  Brain,
  MessageSquare,
  ListChecks,
  Gavel,
  Search,
  Send,
  AlertTriangle,
  Clock,
  TrendingUp,
  Tag,
  Users,
  ChevronRight,
  Loader2,
  Sparkles,
  CalendarDays,
  ArrowRight,
  ExternalLink,
  Activity,
  GitBranch,
  Database,
  Zap,
  Layers,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  getKnowledgeBriefing,
  getKnowledgeActions,
  askKnowledge,
  searchKnowledge,
  getKnowledgeStats,
  getKnowledgeGraph,
  getKnowledgeGraphOverview,
  getKnowledgeEpisodes,
  type KnowledgeBriefingResponse,
  type KnowledgeAskResponse,
  type KnowledgeAction,
  type KnowledgeSearchHit,
  type KnowledgeSearchResult,
  type KnowledgeStatsResponse,
  type KnowledgeGraphNeighbor,
  type KnowledgeEpisode,
  type KnowledgeEpisodesResponse,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import { KnowledgeGraph } from '@/components/knowledge-graph'

export default function KnowledgePage() {
  const [question, setQuestion] = React.useState('')
  const [askResult, setAskResult] = React.useState<KnowledgeAskResponse | null>(null)
  const [activeTab, setActiveTab] = React.useState<'briefing' | 'search' | 'meetings' | 'actions' | 'decisions' | 'episodes' | 'system'>('briefing')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Briefing data (last 14 days for good coverage)
  const briefing = useQuery({
    queryKey: ['knowledge-briefing'],
    queryFn: () => getKnowledgeBriefing(14),
    refetchInterval: 60_000,
  })

  // Overdue actions
  const overdueActions = useQuery({
    queryKey: ['knowledge-actions-overdue'],
    queryFn: () => getKnowledgeActions({ overdue: true }),
  })

  // Search results (hybrid: vector + decay + graph)
  const searchResults = useQuery({
    queryKey: ['knowledge-search', debouncedQuery],
    queryFn: () => searchKnowledge(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  })

  // Ask mutation
  const askMutation = useMutation({
    mutationFn: (q: string) => askKnowledge(q),
    onSuccess: (data) => setAskResult(data),
  })

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    askMutation.mutate(question.trim())
  }

  const b = briefing.data

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            Knowledge
          </h1>
          <p className="text-white/50 mt-1">Meetings, decisions, and actions across all projects</p>
        </div>
        {b && (
          <div className="text-sm text-white/40">
            Last 14 days &middot; Updated {format(new Date(), 'h:mm a')}
          </div>
        )}
      </div>

      {/* Ask Anything Bar */}
      <div className="glass-card p-6 border border-violet-500/20">
        <form onSubmit={handleAsk} className="flex gap-3">
          <div className="relative flex-1">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-violet-400" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about meetings, decisions, projects..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={askMutation.isPending || !question.trim()}
            className="px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center gap-2 transition-colors"
          >
            {askMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Ask
          </button>
        </form>

        {/* Answer */}
        {askResult && (
          <div className="mt-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <div className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
              {askResult.answer}
            </div>
            {askResult.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-violet-500/20">
                <div className="text-xs text-white/40 mb-2">Sources ({askResult.sources.length})</div>
                <div className="flex flex-wrap gap-2">
                  {askResult.sources.map((s, i) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-white/60"
                    >
                      [{i + 1}] {s.title}
                      <span className="text-white/30">&middot; {s.type}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {b && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Meetings"
            value={b.recent.meetingCount}
            total={b.totals.meetings}
            icon={MessageSquare}
            color="blue"
          />
          <StatCard
            label="Actions"
            value={b.recent.actionCount}
            total={b.totals.actions}
            icon={ListChecks}
            color="green"
          />
          <StatCard
            label="Decisions"
            value={b.recent.decisionCount}
            total={b.totals.decisions}
            icon={Gavel}
            color="amber"
          />
          <StatCard
            label="Overdue"
            value={b.alerts.overdueCount}
            total={null}
            icon={AlertTriangle}
            color="red"
          />
        </div>
      )}

      {/* Alerts Banner */}
      {b && b.alerts.overdueCount > 0 && (
        <div className="glass-card p-4 border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-medium text-red-400">
                {b.alerts.overdueCount} overdue action{b.alerts.overdueCount !== 1 ? 's' : ''} need attention
              </span>
            </div>
            <button
              onClick={() => setActiveTab('actions')}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              View <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5">
        {[
          { id: 'briefing' as const, label: 'Briefing', icon: TrendingUp },
          { id: 'search' as const, label: 'Search', icon: Search },
          { id: 'meetings' as const, label: 'Meetings', icon: MessageSquare },
          { id: 'actions' as const, label: 'Actions', icon: ListChecks },
          { id: 'decisions' as const, label: 'Decisions', icon: Gavel },
          { id: 'episodes' as const, label: 'Episodes', icon: Layers },
          { id: 'system' as const, label: 'System', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'briefing' && b && <BriefingTab briefing={b} />}
      {activeTab === 'search' && (
        <SearchTab
          query={searchQuery}
          onQueryChange={(q) => { setSearchQuery(q); }}
          results={searchResults.data}
          isLoading={searchResults.isLoading}
        />
      )}
      {activeTab === 'meetings' && b && <MeetingsTab meetings={b.recent.meetings} />}
      {activeTab === 'actions' && <ActionsTab overdue={overdueActions.data} recent={b?.recent.actions || []} />}
      {activeTab === 'decisions' && b && <DecisionsTab decisions={b.recent.decisions} />}
      {activeTab === 'episodes' && <EpisodesTab />}
      {activeTab === 'system' && <SystemTab />}

      {/* Loading state */}
      {briefing.isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  total,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  total: number | null
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'amber' | 'red'
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
  }

  return (
    <div className={cn('glass-card p-4 border bg-gradient-to-br', colors[color])}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5" />
        <span className="text-xs text-white/30">14d</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/40 mt-1">
        {label}
        {total !== null && <span className="text-white/20"> &middot; {total} total</span>}
      </div>
    </div>
  )
}

// ─── Briefing Tab ─────────────────────────────────────────────────

function BriefingTab({ briefing: b }: { briefing: KnowledgeBriefingResponse }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: Project Activity + Topics */}
      <div className="lg:col-span-2 space-y-6">
        {/* Project Activity */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Project Activity (14 days)
          </h3>
          <div className="space-y-3">
            {Object.entries(b.projectActivity)
              .sort((a, b) => {
                const aTotal = a[1].meetings + a[1].actions + a[1].decisions
                const bTotal = b[1].meetings + b[1].actions + b[1].decisions
                return bTotal - aTotal
              })
              .map(([code, activity]) => {
                const total = activity.meetings + activity.actions + activity.decisions
                return (
                  <div key={code} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-white/70 font-medium truncate">{code}</div>
                    <div className="flex-1 flex gap-1 h-6">
                      {activity.meetings > 0 && (
                        <div
                          className="bg-blue-500/60 rounded-md flex items-center justify-center text-[10px] text-white/80"
                          style={{ width: `${(activity.meetings / total) * 100}%`, minWidth: '20px' }}
                        >
                          {activity.meetings}
                        </div>
                      )}
                      {activity.actions > 0 && (
                        <div
                          className="bg-emerald-500/60 rounded-md flex items-center justify-center text-[10px] text-white/80"
                          style={{ width: `${(activity.actions / total) * 100}%`, minWidth: '20px' }}
                        >
                          {activity.actions}
                        </div>
                      )}
                      {activity.decisions > 0 && (
                        <div
                          className="bg-amber-500/60 rounded-md flex items-center justify-center text-[10px] text-white/80"
                          style={{ width: `${(activity.decisions / total) * 100}%`, minWidth: '20px' }}
                        >
                          {activity.decisions}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-white/30 w-8 text-right">{total}</div>
                  </div>
                )
              })}
          </div>
          <div className="flex gap-4 mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <div className="w-3 h-3 rounded bg-blue-500/60" /> Meetings
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <div className="w-3 h-3 rounded bg-emerald-500/60" /> Actions
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <div className="w-3 h-3 rounded bg-amber-500/60" /> Decisions
            </div>
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        {b.alerts.upcoming.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming Follow-ups (7 days)
            </h3>
            <div className="space-y-2">
              {b.alerts.upcoming.map((action) => (
                <ActionRow key={action.id} action={action} variant="upcoming" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column: Topics + Quick Stats */}
      <div className="space-y-6">
        {/* Top Topics */}
        {b.topTopics.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Hot Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {b.topTopics.map(({ topic, count }) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm"
                >
                  <span className="text-white/70">{topic}</span>
                  <span className="text-white/30 text-xs">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Actions */}
        {b.alerts.overdueCount > 0 && (
          <div className="glass-card p-5 border border-red-500/20">
            <h3 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue ({b.alerts.overdueCount})
            </h3>
            <div className="space-y-2">
              {b.alerts.overdue.map((action) => (
                <ActionRow key={action.id} action={action} variant="overdue" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Episodes Tab ────────────────────────────────────────────────

function EpisodesTab() {
  const [projectFilter, setProjectFilter] = React.useState<string>('')
  const [statusFilter, setStatusFilter] = React.useState<string>('')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-episodes', projectFilter, statusFilter],
    queryFn: () =>
      getKnowledgeEpisodes({
        projectCode: projectFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  const episodes = data?.episodes || []
  const stats = data?.stats
  const projectCodes = data?.projectCodes || []

  const typeConfig: Record<string, { color: string; label: string }> = {
    project_phase: { color: 'bg-blue-500/20 text-blue-400', label: 'Phase' },
    decision_sequence: { color: 'bg-amber-500/20 text-amber-400', label: 'Decisions' },
  }

  const statusConfig: Record<string, { color: string }> = {
    active: { color: 'bg-emerald-500/20 text-emerald-400' },
    completed: { color: 'bg-white/10 text-white/50' },
    abandoned: { color: 'bg-red-500/20 text-red-400' },
  }

  return (
    <div className="space-y-4">
      {/* Stats + Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            {stats && (
              <>
                <div className="text-sm text-white/70">
                  <span className="text-2xl font-bold text-white mr-1">{stats.total}</span>
                  episodes
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-400">{stats.active} active</span>
                  <span className="text-white/40">{stats.completed} completed</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 pr-7 text-xs text-white focus:outline-none focus:border-violet-500/50"
            >
              <option value="">All Projects</option>
              {projectCodes.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 pr-7 text-xs text-white focus:outline-none focus:border-violet-500/50"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Episode Cards */}
      {episodes.length === 0 ? (
        <EmptyState icon={Layers} message="No episodes found. Run detect-episodes.mjs to create episodes." />
      ) : (
        <div className="space-y-3">
          {episodes.map((ep) => {
            const isExpanded = expandedId === ep.id
            const tc = typeConfig[ep.episode_type] || typeConfig.project_phase
            const sc = statusConfig[ep.status] || statusConfig.completed
            const startDate = new Date(ep.started_at)
            const endDate = new Date(ep.ended_at)
            const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

            return (
              <div key={ep.id} className="glass-card hover:bg-white/[0.03] transition-colors overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ep.id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start gap-3">
                    <Layers className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm font-medium text-white">{ep.title}</h4>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', tc.color)}>
                          {tc.label}
                        </span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', sc.color)}>
                          {ep.status}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 line-clamp-2">{ep.summary}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-violet-400">{ep.project_code}</span>
                        <span className="text-xs text-white/30">
                          {format(startDate, 'MMM d')} — {format(endDate, 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-white/20">{durationDays}d</span>
                        <span className="text-xs text-white/20">{ep.key_events?.length || 0} events</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-white/30" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-white/30" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-white/5 mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                      {/* Key Events Timeline */}
                      <div>
                        <h5 className="text-xs font-semibold text-white/50 mb-3">Key Events</h5>
                        <div className="space-y-2">
                          {(ep.key_events || []).map((event, i) => {
                            const eventTypeColors: Record<string, string> = {
                              meeting: 'text-blue-400',
                              action: 'text-emerald-400',
                              decision: 'text-amber-400',
                            }
                            const eventTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
                              meeting: MessageSquare,
                              action: ListChecks,
                              decision: Gavel,
                            }
                            const EventIcon = eventTypeIcons[event.type] || Brain
                            const eventColor = eventTypeColors[event.type] || 'text-white/50'

                            return (
                              <div key={event.id || i} className="flex items-start gap-2.5">
                                <div className="relative flex flex-col items-center">
                                  <EventIcon className={cn('h-3.5 w-3.5 shrink-0', eventColor)} />
                                  {i < (ep.key_events?.length || 0) - 1 && (
                                    <div className="w-px h-4 bg-white/10 mt-1" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-white/70 truncate">{event.title}</div>
                                  <div className="text-[10px] text-white/30">
                                    {event.date ? format(new Date(event.date), 'MMM d') : ''}
                                    <span className="ml-1.5 text-white/20">{event.type}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Topics + Metadata */}
                      <div className="space-y-4">
                        {ep.topics && ep.topics.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-white/50 mb-2">Topics</h5>
                            <div className="flex flex-wrap gap-1.5">
                              {ep.topics.map((topic) => (
                                <span
                                  key={topic}
                                  className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-white/50"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {ep.outcome && (
                          <div>
                            <h5 className="text-xs font-semibold text-white/50 mb-1">Outcome</h5>
                            <p className="text-xs text-white/60">{ep.outcome}</p>
                          </div>
                        )}

                        {ep.lessons_learned && ep.lessons_learned.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-white/50 mb-1">Lessons Learned</h5>
                            <ul className="space-y-1">
                              {ep.lessons_learned.map((lesson, i) => (
                                <li key={i} className="text-xs text-white/60 flex items-start gap-1.5">
                                  <span className="text-violet-400 shrink-0">•</span>
                                  {lesson}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {ep.decay_score != null && (
                          <div className="flex items-center gap-3 text-[10px] text-white/20">
                            <span>Decay: {(ep.decay_score * 100).toFixed(0)}%</span>
                            <span>Accessed: {ep.access_count || 0}x</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── System Tab (Memory Health) ──────────────────────────────────

function SystemTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: getKnowledgeStats,
    refetchInterval: 30_000,
  })

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['knowledge-graph-overview'],
    queryFn: () => getKnowledgeGraphOverview(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  const s = data?.stats
  if (!s) return <EmptyState icon={Activity} message="Could not load system stats" />

  const decayChunksTotal = (s.decay?.chunks_stale || 0) + (s.decay?.chunks_fresh || 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Memory Overview */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Memory Overview
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Knowledge Records" value={s.knowledge.total} />
          <MiniStat label="Memory Chunks" value={s.chunks.total} />
          <MiniStat label="Embeddings" value={s.chunks.withEmbedding} sub={`${s.chunks.coveragePercent}% coverage`} />
          <MiniStat label="Communications" value={s.communications.embedded} sub="embedded" />
        </div>
      </div>

      {/* Knowledge Graph */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Knowledge Graph
        </h3>
        <div className="text-3xl font-bold text-white">{s.graph.totalEdges}</div>
        <div className="text-xs text-white/40">total edges</div>
        {s.graph.byType.length > 0 && (
          <div className="space-y-2 pt-2">
            {s.graph.byType.map(({ edge_type, count }) => (
              <div key={edge_type} className="flex items-center gap-2">
                <div className="flex-1 text-xs text-white/60">{edge_type.replace(/_/g, ' ')}</div>
                <div className="w-24 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500/60"
                    style={{ width: `${(count / s.graph.totalEdges) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-white/30 w-8 text-right">{count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Knowledge Graph Visualization */}
      <div className="glass-card p-5 space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Knowledge Graph
            {graphData?.stats && (
              <span className="text-xs text-white/30 font-normal ml-2">
                {graphData.stats.nodeCount} nodes &middot; {graphData.stats.edgeCount} edges
              </span>
            )}
          </h3>
          <Link
            href="/knowledge/graph"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Full explorer →
          </Link>
        </div>
        {graphLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          </div>
        ) : graphData?.nodes && graphData.nodes.length > 0 ? (
          <KnowledgeGraph
            nodes={graphData.nodes}
            edges={graphData.edges}
            className="w-full h-[400px]"
          />
        ) : (
          <div className="flex items-center justify-center py-16 text-white/30 text-sm">
            No graph data yet. Run meeting sync to generate edges.
          </div>
        )}
      </div>

      {/* Decay Health */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Memory Freshness
        </h3>
        {s.decay ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                label="Chunks Avg Decay"
                value={`${(s.decay.chunks_avg_decay * 100).toFixed(0)}%`}
                sub={`${s.decay.chunks_fresh} fresh / ${s.decay.chunks_stale} stale`}
              />
              <MiniStat
                label="Knowledge Avg Decay"
                value={`${(s.decay.knowledge_avg_decay * 100).toFixed(0)}%`}
                sub={`${s.decay.knowledge_fresh} fresh / ${s.decay.knowledge_stale} stale`}
              />
            </div>
            {/* Freshness bar */}
            {decayChunksTotal > 0 && (
              <div className="pt-2">
                <div className="text-xs text-white/40 mb-1">Chunk freshness distribution</div>
                <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
                  <div
                    className="bg-emerald-500/60"
                    style={{ width: `${(s.decay.chunks_fresh / decayChunksTotal) * 100}%` }}
                    title={`${s.decay.chunks_fresh} fresh`}
                  />
                  <div
                    className="bg-red-500/40"
                    style={{ width: `${(s.decay.chunks_stale / decayChunksTotal) * 100}%` }}
                    title={`${s.decay.chunks_stale} stale`}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-emerald-400/60">fresh ({s.decay.chunks_fresh})</span>
                  <span className="text-[10px] text-red-400/60">stale ({s.decay.chunks_stale})</span>
                </div>
              </div>
            )}
            {s.decay.last_decay_run && (
              <div className="text-xs text-white/20">
                Last decay run: {format(new Date(s.decay.last_decay_run), 'MMM d, h:mm a')}
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-white/30">No decay data available. Run decay cycle first.</div>
        )}
      </div>

      {/* Advanced Memory */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Advanced Memory
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Episodes" value={s.memory.episodes} />
          <MiniStat label="Procedures" value={s.memory.procedures} />
          <MiniStat label="Working Sessions" value={s.memory.activeWorkingSessions} />
          <MiniStat label="Consolidations" value={s.memory.consolidationEvents} />
        </div>
        {s.agents && (
          <div className="pt-3 border-t border-white/5">
            <div className="text-xs text-white/40 mb-2">Agent Intelligence</div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Proposals" value={s.agents.proposals} sub="agent actions" />
              <MiniStat label="Learnings" value={s.agents.learnings} sub="from patterns" />
            </div>
            <Link
              href="/agent"
              className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              Agent Dashboard <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03]">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
      {sub && <div className="text-[10px] text-white/20 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Search Tab ──────────────────────────────────────────────────

function SearchTab({
  query,
  onQueryChange,
  results,
  isLoading,
}: {
  query: string
  onQueryChange: (q: string) => void
  results?: KnowledgeSearchResult
  isLoading: boolean
}) {
  const typeColors: Record<string, string> = {
    meeting: 'text-blue-400 bg-blue-500/20',
    action: 'text-emerald-400 bg-emerald-500/20',
    decision: 'text-amber-400 bg-amber-500/20',
  }
  const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    meeting: MessageSquare,
    action: ListChecks,
    decision: Gavel,
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search meetings, decisions, actions... (semantic + graph)"
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 text-sm"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-violet-400" />
          )}
        </div>
        {results && (
          <div className="flex items-center gap-3 mt-3 text-xs text-white/40">
            <span>{results.count} result{results.count !== 1 ? 's' : ''}</span>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium">
              {results.mode}
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      {results && results.results.length > 0 && (
        <div className="space-y-2">
          {results.results.map((hit) => {
            const TypeIcon = typeIcons[hit.knowledge_type || ''] || Brain
            const typeColor = typeColors[hit.knowledge_type || ''] || 'text-white/50 bg-white/10'

            return (
              <div key={hit.id} className="glass-card p-4 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-start gap-3">
                  <TypeIcon className={cn('h-4 w-4 shrink-0 mt-0.5', typeColor.split(' ')[0])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-white truncate">{hit.title}</h4>
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', typeColor)}>
                        {hit.knowledge_type}
                      </span>
                    </div>
                    {(hit.summary || hit.content) && (
                      <p className="text-xs text-white/50 line-clamp-2">
                        {hit.summary || hit.content?.slice(0, 200)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {hit.project_name && (
                        <span className="text-xs text-violet-400">{hit.project_name}</span>
                      )}
                      {hit.recorded_at && (
                        <span className="text-xs text-white/30">
                          {format(new Date(hit.recorded_at), 'MMM d, yyyy')}
                        </span>
                      )}
                      {hit.importance && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px]',
                          hit.importance === 'high' || hit.importance === 'critical'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-white/5 text-white/30'
                        )}>
                          {hit.importance}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Scores */}
                  {hit.similarity != null && (
                    <div className="shrink-0 text-right space-y-0.5">
                      <div className="text-xs font-mono text-violet-400">
                        {(hit.similarity * 100).toFixed(0)}%
                      </div>
                      {hit.vector_score != null && (
                        <div className="text-[10px] text-white/20" title="vector | decay | graph">
                          {(hit.vector_score * 100).toFixed(0)}v
                          {hit.decay_score != null && ` ${(hit.decay_score * 100).toFixed(0)}d`}
                          {hit.graph_score != null && ` ${(hit.graph_score * 100).toFixed(0)}g`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty states */}
      {query.length >= 2 && !isLoading && results && results.results.length === 0 && (
        <EmptyState icon={Search} message={`No results for "${query}"`} />
      )}
      {query.length < 2 && (
        <EmptyState icon={Search} message="Type at least 2 characters to search" />
      )}
    </div>
  )
}

// ─── Meetings Tab ─────────────────────────────────────────────────

function MeetingsTab({ meetings }: { meetings: KnowledgeBriefingResponse['recent']['meetings'] }) {
  if (meetings.length === 0) {
    return <EmptyState icon={MessageSquare} message="No meetings found in the last 14 days" />
  }

  return (
    <div className="space-y-3">
      {meetings.map((m) => (
        <div key={m.id} className="glass-card p-4 hover:bg-white/[0.03] transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-blue-400 shrink-0" />
                <h4 className="text-sm font-medium text-white truncate">{m.title}</h4>
              </div>
              {m.summary && (
                <p className="text-xs text-white/50 line-clamp-2 ml-6">{m.summary}</p>
              )}
              <div className="flex items-center gap-3 mt-2 ml-6">
                {m.project_name && (
                  <span className="text-xs text-violet-400">{m.project_name}</span>
                )}
                {m.participants && m.participants.length > 0 && (
                  <span className="text-xs text-white/30 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {m.participants.length}
                  </span>
                )}
                {m.topics && m.topics.length > 0 && (
                  <div className="flex gap-1">
                    {m.topics.slice(0, 3).map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/40">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-white/30 shrink-0">
              {m.recorded_at && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(m.recorded_at), 'MMM d')}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Actions Tab ──────────────────────────────────────────────────

function ActionsTab({
  overdue,
  recent,
}: {
  overdue?: { actions: KnowledgeAction[]; overdueCount: number }
  recent: KnowledgeAction[]
}) {
  return (
    <div className="space-y-6">
      {/* Overdue section */}
      {overdue && overdue.overdueCount > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Overdue ({overdue.overdueCount})
          </h3>
          <div className="space-y-2">
            {overdue.actions.map((a) => (
              <ActionRow key={a.id} action={a} variant="overdue" />
            ))}
          </div>
        </div>
      )}

      {/* Recent actions */}
      <div>
        <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Recent Actions
        </h3>
        {recent.length === 0 ? (
          <EmptyState icon={ListChecks} message="No actions found in the last 14 days" />
        ) : (
          <div className="space-y-2">
            {recent.map((a) => (
              <ActionRow key={a.id} action={a} variant="default" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Decisions Tab ────────────────────────────────────────────────

function DecisionsTab({ decisions }: { decisions: KnowledgeBriefingResponse['recent']['decisions'] }) {
  if (decisions.length === 0) {
    return <EmptyState icon={Gavel} message="No decisions found in the last 14 days" />
  }

  return (
    <div className="space-y-3">
      {decisions.map((d) => (
        <div key={d.id} className="glass-card p-4 hover:bg-white/[0.03] transition-colors">
          <div className="flex items-start gap-3">
            <Gavel className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white">{d.title}</h4>
              {d.decision_rationale && (
                <p className="text-xs text-white/50 mt-1 line-clamp-2">{d.decision_rationale}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                {d.project_name && (
                  <span className="text-xs text-violet-400">{d.project_name}</span>
                )}
                {d.decision_status && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium',
                    d.decision_status === 'approved' || d.decision_status === 'final'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : d.decision_status === 'pending'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-white/10 text-white/50'
                  )}>
                    {d.decision_status}
                  </span>
                )}
                {d.recorded_at && (
                  <span className="text-xs text-white/30">
                    {format(new Date(d.recorded_at), 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Shared Components ────────────────────────────────────────────

function ActionRow({
  action,
  variant,
}: {
  action: KnowledgeAction
  variant: 'overdue' | 'upcoming' | 'default'
}) {
  const isOverdue = variant === 'overdue'

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-colors',
      isOverdue ? 'bg-red-500/5 border border-red-500/10' : 'bg-white/[0.02] hover:bg-white/[0.04]'
    )}>
      <ListChecks className={cn('h-4 w-4 shrink-0', isOverdue ? 'text-red-400' : 'text-emerald-400')} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/80 truncate">{action.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {action.project_name && (
            <span className="text-xs text-white/30">{action.project_name}</span>
          )}
          {action.participants && action.participants.length > 0 && (
            <span className="text-xs text-white/20">
              {action.participants.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
      </div>
      {action.follow_up_date && (
        <span className={cn(
          'text-xs shrink-0',
          isOverdue ? 'text-red-400' : 'text-white/30'
        )}>
          {format(new Date(action.follow_up_date), 'MMM d')}
        </span>
      )}
      {action.importance && (
        <span className={cn(
          'px-1.5 py-0.5 rounded text-[10px] shrink-0',
          action.importance === 'high' || action.importance === 'critical'
            ? 'bg-red-500/20 text-red-400'
            : action.importance === 'medium'
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-white/5 text-white/30'
        )}>
          {action.importance}
        </span>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-white/30">
      <Icon className="h-10 w-10 mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
