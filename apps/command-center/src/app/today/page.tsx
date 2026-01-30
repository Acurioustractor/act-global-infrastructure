'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  Calendar,
  Users,
  Clock,
  Mail,
  Phone,
  ChevronRight,
  Flame,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Building2,
  TrendingUp,
  BookOpen,
  Database,
  FileText,
  Layers,
  Globe,
  Github,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Target,
  CheckCheck,
  Clock3,
  Lightbulb,
  Sparkles,
  Bell,
  DollarSign,
  Wallet,
  Receipt,
  RefreshCw,
  Inbox,
  MailOpen,
  MailWarning,
  Search,
  X,
  User,
  FolderKanban,
  FileQuestion,
  Sun,
  Moon,
  Brain,
  ListChecks,
  Gavel,
  AlertTriangle,
  GitBranch,
  Activity,
  ShieldAlert,
  TrendingDown,
  UserCheck,
} from 'lucide-react'
import { DonutChart, BarList, ProgressBar } from '@tremor/react'
import {
  getRelationships,
  getRelationshipHealth,
  getCalendarEvents,
  getAttentionNeeded,
  getOverdueContacts,
  getProposals,
  getKnowledgeStats,
  getKnowledgeBriefing,
  getKnowledgeActions,
  searchKnowledge,
  type KnowledgeStatsResponse,
  type KnowledgeBriefingResponse,
  type KnowledgeSearchHit,
  getConnectors,
  getAgents,
  getGHLPipelines,
  getGHLOpportunities,
  getAgentInsights,
  getBookkeepingProgress,
  markContactedToday,
  snoozeContact,
  search,
  getEmailStats,
  getRecentEmails,
  type Contact,
  type CalendarEvent,
} from '@/lib/api'
import { cn, formatRelativeDate, getGreeting } from '@/lib/utils'
import { ContactTodayRow } from '@/components/today'
import { LiveActivityFeed } from '@/components/live-activity-feed'

// Sprint 4: Auto-refresh interval (30 seconds)
const REFRESH_INTERVAL = 30 * 1000

export default function TodayPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const greeting = getGreeting()

  // Sprint 7: Search state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [knowledgeResults, setKnowledgeResults] = React.useState<KnowledgeSearchHit[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  // Sprint 8: Theme state
  const [isDark, setIsDark] = React.useState(true)

  // Apply theme class to document
  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light-theme')
      document.documentElement.classList.add('dark-theme')
    } else {
      document.documentElement.classList.remove('dark-theme')
      document.documentElement.classList.add('light-theme')
    }
  }, [isDark])

  // Handle search — parallel: legacy contacts/projects + hybrid knowledge
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
      setSearchResults(
        legacyData.status === 'fulfilled' ? legacyData.value.results || [] : []
      )
      setKnowledgeResults(
        knowledgeData.status === 'fulfilled' ? knowledgeData.value.results || [] : []
      )
    } catch (e) {
      console.error('Search failed:', e)
      setSearchResults([])
      setKnowledgeResults([])
    }
    setIsSearching(false)
  }, [])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  // Keyboard shortcut: Cmd+K to open search
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

  // Fetch ALL data with auto-refresh
  const { data: health } = useQuery({
    queryKey: ['relationships', 'health'],
    queryFn: getRelationshipHealth,
    refetchInterval: REFRESH_INTERVAL,
  })

  const { data: attentionData } = useQuery({
    queryKey: ['relationships', 'attention'],
    queryFn: getAttentionNeeded,
  })

  const { data: calendarData } = useQuery({
    queryKey: ['calendar', 'events', today],
    queryFn: () => getCalendarEvents(today),
    refetchInterval: REFRESH_INTERVAL,
  })

  const { data: proposalsData } = useQuery({
    queryKey: ['proposals', 'pending'],
    queryFn: () => getProposals('pending'),
  })

  const { data: knowledgeStats } = useQuery({
    queryKey: ['knowledge', 'stats'],
    queryFn: getKnowledgeStats,
  })

  // Knowledge briefing for Today page intelligence card
  const { data: knowledgeBriefing } = useQuery({
    queryKey: ['knowledge', 'briefing-today'],
    queryFn: () => getKnowledgeBriefing(7),
    refetchInterval: REFRESH_INTERVAL,
  })

  const { data: overdueActionsData } = useQuery({
    queryKey: ['knowledge', 'actions-overdue'],
    queryFn: () => getKnowledgeActions({ overdue: true }),
  })

  const { data: connectorsData } = useQuery({
    queryKey: ['connectors'],
    queryFn: getConnectors,
  })

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  })

  const { data: hotContacts } = useQuery({
    queryKey: ['relationships', 'hot'],
    queryFn: () => getRelationships({ limit: 10, temperature: 'hot' }),
  })

  const { data: overdueData } = useQuery({
    queryKey: ['relationships', 'overdue'],
    queryFn: getOverdueContacts,
  })

  // Sprint 2: GHL Pipeline data
  const { data: pipelinesData } = useQuery({
    queryKey: ['ghl', 'pipelines'],
    queryFn: getGHLPipelines,
  })

  const { data: opportunitiesData } = useQuery({
    queryKey: ['ghl', 'opportunities'],
    queryFn: () => getGHLOpportunities(),
  })

  // Sprint 3: Agent Insights
  const { data: insightsData } = useQuery({
    queryKey: ['agent', 'insights'],
    queryFn: () => getAgentInsights(8),
    refetchInterval: REFRESH_INTERVAL,
  })

  // Sprint 4: Finance / Cash Position
  const { data: financeData } = useQuery({
    queryKey: ['bookkeeping', 'progress'],
    queryFn: getBookkeepingProgress,
    refetchInterval: REFRESH_INTERVAL,
  })

  // Get contacts with project tags for Sprint 1 feature
  const { data: warmContacts } = useQuery({
    queryKey: ['relationships', 'warm'],
    queryFn: () => getRelationships({ limit: 20, temperature: 'warm' }),
  })

  // Email data
  const { data: emailStats } = useQuery({
    queryKey: ['emails', 'stats'],
    queryFn: getEmailStats,
    refetchInterval: REFRESH_INTERVAL,
  })

  const { data: recentEmails } = useQuery({
    queryKey: ['emails', 'recent'],
    queryFn: () => getRecentEmails(5),
    refetchInterval: REFRESH_INTERVAL,
  })

  // Map API fields to frontend expected fields
  const mapContact = (c: any) => ({
    ...c,
    name: c.contact_name || c.name || c.full_name || '(unnamed)',
    email: c.contact_email || c.email,
    company: c.company_name || c.company,
  })

  const needsAttention = (attentionData as any)?.attention || []
  const overdueContacts = overdueData?.overdue || []
  const warmRelationships = warmContacts?.relationships || []

  // Combine and sort contacts to reach out to today (with field mapping)
  const contactTodayFlat = [
    ...overdueContacts.map(c => ({ ...mapContact(c), reason: 'overdue', priority: 1 })),
    ...needsAttention.slice(0, 5).map((c: any) => ({ ...mapContact(c), reason: 'cooling', priority: 2 })),
    ...warmRelationships.filter(c => (c.days_since_contact || 0) > 14).slice(0, 5).map(c => ({ ...mapContact(c), reason: 'maintain', priority: 3 })),
  ]
    .filter(c => c.name && c.name.trim() !== '' && c.name !== '(unnamed)') // Filter out unnamed contacts
    .slice(0, 12)

  // Sprint 2: Group contacts by project
  const projectPatterns = [
    { key: 'justicehub', label: 'JusticeHub', color: 'blue' },
    { key: 'empathy', label: 'Empathy Ledger', color: 'pink' },
    { key: 'harvest', label: 'The Harvest', color: 'green' },
    { key: 'farm', label: 'The Farm', color: 'amber' },
    { key: 'studio', label: 'The Studio', color: 'purple' },
    { key: 'picc', label: 'PICC', color: 'cyan' },
  ]

  const contactsByProject: Record<string, any[]> = { 'Other': [] }
  projectPatterns.forEach(p => { contactsByProject[p.label] = [] })

  contactTodayFlat.forEach((contact: any) => {
    const tags = (contact.tags || []).map((t: string) => t.toLowerCase()).join(' ')
    let assigned = false
    for (const proj of projectPatterns) {
      if (tags.includes(proj.key)) {
        contactsByProject[proj.label].push(contact)
        assigned = true
        break
      }
    }
    if (!assigned) contactsByProject['Other'].push(contact)
  })

  // Filter out empty project groups
  const activeProjectGroups = Object.entries(contactsByProject).filter(([_, contacts]) => contacts.length > 0)
  const events = calendarData?.events || []
  const proposals = proposalsData?.proposals || []
  const hot = (hotContacts?.relationships || []).map(mapContact)
  const connectors = connectorsData?.connectors || []
  const agents = agentsData?.agents || []

  const configuredConnectors = connectors.filter((c: any) => c.status === 'configured')

  // Sprint 2: GHL Pipeline processing
  const pipelines = pipelinesData?.pipelines || []
  const opportunities = opportunitiesData?.opportunities || []

  // Group opportunities by pipeline and stage
  const pipelineStats = pipelines.map((pipeline: any) => {
    const pipelineOpps = opportunities.filter((o: any) => o.pipeline_name === pipeline.name)
    const totalValue = pipelineOpps.reduce((sum: number, o: any) => sum + (o.monetary_value || 0), 0)
    return {
      ...pipeline,
      count: pipelineOpps.length,
      value: totalValue,
      opportunities: pipelineOpps,
    }
  })

  const totalPipelineValue = opportunities.reduce((sum: number, o: any) => sum + (o.monetary_value || 0), 0)

  // Sprint 3: Agent insights
  const insights = insightsData?.insights || []

  // Sprint 4: Finance data
  const finance = financeData?.summary || null
  const overdueInvoices = financeData?.overdueInvoices || { count: 0, total: 0 }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Sprint 7: Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => {
              setSearchOpen(false)
              setSearchQuery('')
              setSearchResults([])
              setKnowledgeResults([])
            }}
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
                      setSearchResults([])
                      setKnowledgeResults([])
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

              {/* Search Results */}
              {(searchResults.length > 0 || knowledgeResults.length > 0 || isSearching) && (
                <div className="border-t border-white/10 mt-2 pt-2 max-h-[60vh] overflow-y-auto">
                  {isSearching ? (
                    <div className="py-8 text-center text-white/40">
                      <RefreshCw className="h-5 w-5 mx-auto animate-spin mb-2" />
                      <p className="text-sm">Searching across contacts, projects & knowledge...</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* Contacts & Projects */}
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
                              onClick={() => setSearchOpen(false)}
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

                      {/* Knowledge Results (hybrid: vector + decay + graph) */}
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
                                onClick={() => setSearchOpen(false)}
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
                              onClick={() => setSearchOpen(false)}
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

        {/* Search + Theme Toggle */}
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

          {/* Sprint 8: Theme Toggle */}
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

      {/* Morning Brief - Intelligence Summary */}
      <div className="glass-card p-5 md:p-6 mb-6 md:mb-8 border-indigo-500/20 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
            <Activity className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Morning Brief</h2>
            <p className="text-xs text-white/40">Your daily intelligence at a glance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Agent Approvals */}
          <Link href="/system" className="glass-card-sm p-4 hover:border-purple-500/30 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <ShieldAlert className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-white/70">Agent Approvals</span>
            </div>
            {proposals.length > 0 ? (
              <div>
                <p className="text-3xl font-bold text-purple-400">{proposals.length}</p>
                <p className="text-xs text-white/40 mt-1">
                  pending review{proposals.length > 0 && proposals[0]?.agent_name ? ` from ${proposals[0].agent_name}` : ''}
                </p>
                {proposals.length > 1 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Array.from(new Set(proposals.map((p) => p.agent_name))).slice(0, 3).map((agent) => (
                      <span key={agent} className="px-1.5 py-0.5 rounded bg-purple-500/10 text-[10px] text-purple-400">
                        {agent}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">All clear</span>
              </div>
            )}
          </Link>

          {/* Relationship Alerts */}
          <Link href="/people?filter=attention" className="glass-card-sm p-4 hover:border-orange-500/30 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <TrendingDown className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-medium text-white/70">Relationship Alerts</span>
            </div>
            {(overdueContacts.length > 0 || needsAttention.length > 0) ? (
              <div>
                <p className="text-3xl font-bold text-orange-400">
                  {overdueContacts.length + needsAttention.length}
                </p>
                <p className="text-xs text-white/40 mt-1">contacts need attention</p>
                <div className="flex gap-3 mt-2">
                  {overdueContacts.length > 0 && (
                    <span className="text-[10px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {overdueContacts.length} overdue
                    </span>
                  )}
                  {needsAttention.length > 0 && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {needsAttention.length} cooling
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">All healthy</span>
              </div>
            )}
          </Link>

          {/* Key Metrics Summary */}
          <div className="glass-card-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium text-white/70">Key Metrics</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Total Contacts</span>
                <span className="text-sm font-semibold text-blue-400">{health?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Pipeline Value</span>
                <span className="text-sm font-semibold text-green-400">
                  ${totalPipelineValue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Today&apos;s Events</span>
                <span className="text-sm font-semibold text-indigo-400">{events.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Pending Items</span>
                <span className="text-sm font-semibold text-amber-400">
                  {proposals.length + (overdueActionsData?.overdueCount || 0) + (emailStats?.requiresResponse || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Stats Row - Responsive Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 mb-6 md:mb-8">
        <StatCard
          label="Contacts"
          value={health?.total || 0}
          icon={Users}
          color="blue"
          href="/people"
        />
        <StatCard
          label="Hot"
          value={health?.hot || 0}
          icon={Flame}
          color="red"
          href="/people?filter=hot"
        />
        <StatCard
          label="Need Attention"
          value={health?.needsAttention || 0}
          icon={AlertCircle}
          color="orange"
          href="/people?filter=attention"
        />
        <StatCard
          label="Memory Chunks"
          value={knowledgeStats?.stats?.chunks?.total || 0}
          icon={Database}
          color="purple"
          href="/knowledge"
        />
        <StatCard
          label="Knowledge"
          value={knowledgeStats?.stats?.knowledge?.total || 0}
          icon={FileText}
          color="pink"
          href="/knowledge"
        />
        <StatCard
          label="Integrations"
          value={configuredConnectors.length}
          icon={Zap}
          color="green"
          href="/system"
        />
      </div>

      {/* Main Grid - Mobile: Stack vertically, Desktop: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Mobile: Contact Today comes first (order-1), Desktop: Left column (order-2) */}
        <div className="order-2 lg:order-1 lg:col-span-4 space-y-4 md:space-y-6">
          {/* Wiki - Quick Access */}
          <Link href="/wiki" className="glass-card p-6 block hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">ACT Wiki</h2>
                <p className="text-sm text-white/50">Mission, methodology, projects & stories</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-indigo-400 transition-colors" />
            </div>
          </Link>

          {/* Today's Calendar */}
          <div className="glass-card p-6">
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
                  <Link key={event.id} href={event.link || '/today'} target={event.link ? '_blank' : undefined} rel={event.link ? 'noopener noreferrer' : undefined} className="glass-card-sm p-3 flex items-center gap-3 hover:border-indigo-500/30 transition-all">
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

          {/* Agent Proposals */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-400" />
                Agent Proposals
              </h2>
              <span className="badge-warm">{proposals.length} pending</span>
            </div>

            {proposals.length === 0 ? (
              <div className="text-center py-6 text-white/40">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-400 opacity-50" />
                <p>All caught up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {proposals.slice(0, 4).map((p) => (
                  <Link key={p.id} href="/system" className="glass-card-sm p-3 flex items-center justify-between hover:border-purple-500/30 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.title}</p>
                      <p className="text-xs text-white/50">{p.agent_name}</p>
                    </div>
                    <span className="btn-action text-xs">Review</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sprint 2: GHL Pipeline Overview */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Sales Pipeline
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-green-400 font-medium">
                  ${totalPipelineValue.toLocaleString()}
                </span>
                <Link href="/pipeline" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  View board &rarr;
                </Link>
              </div>
            </div>

            {opportunities.length === 0 ? (
              <div className="text-center py-6 text-white/40">
                <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No opportunities yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pipelineStats.filter((p: any) => p.count > 0).slice(0, 4).map((pipeline: any) => (
                  <Link key={pipeline.id} href="/pipeline" className="glass-card-sm p-3 block hover:border-green-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{pipeline.name}</span>
                      <span className="text-xs text-green-400">${pipeline.value.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={Math.round((pipeline.count / Math.max(...pipelineStats.map((p: any) => p.count), 1)) * 100)}
                        color="emerald"
                        className="flex-1"
                      />
                      <span className="text-xs text-white/50 min-w-[40px] text-right">
                        {pipeline.count} opp{pipeline.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </Link>
                ))}

                {/* Top opportunities */}
                {opportunities.filter((o: any) => o.monetary_value > 0).length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">Top Opportunities</p>
                    {opportunities
                      .filter((o: any) => o.monetary_value > 0)
                      .sort((a: any, b: any) => (b.monetary_value || 0) - (a.monetary_value || 0))
                      .slice(0, 3)
                      .map((opp: any) => (
                        <Link key={opp.id} href="/pipeline" className="flex items-center justify-between py-1.5 rounded-lg hover:bg-white/5 transition-colors px-1 -mx-1">
                          <span className="text-sm text-white truncate flex-1">{opp.name}</span>
                          <span className="text-xs text-green-400 ml-2">${(opp.monetary_value || 0).toLocaleString()}</span>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sprint 3: Agent Insights */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Agent Insights
              </h2>
              <span className="text-xs text-white/50">{insights.length} recent</span>
            </div>

            {insights.length === 0 ? (
              <div className="text-center py-6 text-white/40">
                <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No insights yet</p>
                <p className="text-xs mt-1">Agents will share discoveries here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {insights.slice(0, 5).map((insight: any) => (
                  <Link key={insight.id} href="/system" className="glass-card-sm p-3 block hover:border-amber-500/30 transition-all">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        insight.insight_type === 'alert' && 'bg-red-500/20',
                        insight.insight_type === 'discovery' && 'bg-green-500/20',
                        insight.insight_type === 'suggestion' && 'bg-amber-500/20',
                        insight.insight_type === 'pattern' && 'bg-purple-500/20',
                        !insight.insight_type && 'bg-blue-500/20'
                      )}>
                        {insight.insight_type === 'alert' ? (
                          <Bell className="h-4 w-4 text-red-400" />
                        ) : insight.insight_type === 'discovery' ? (
                          <Sparkles className="h-4 w-4 text-green-400" />
                        ) : (
                          <Lightbulb className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{insight.title}</p>
                        <p className="text-xs text-white/50 mt-0.5">{insight.agent_name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Knowledge Intelligence */}
          <Link href="/knowledge" className="glass-card p-6 block hover:border-violet-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-400" />
                Knowledge
              </h2>
              <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-violet-400 transition-colors" />
            </div>

            {knowledgeBriefing ? (
              <div className="space-y-3">
                {/* Quick stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="glass-card-sm p-2 text-center">
                    <p className="text-lg font-bold text-blue-400">{knowledgeBriefing.recent.meetingCount}</p>
                    <p className="text-[10px] text-white/40">Meetings</p>
                  </div>
                  <div className="glass-card-sm p-2 text-center">
                    <p className="text-lg font-bold text-emerald-400">{knowledgeBriefing.recent.actionCount}</p>
                    <p className="text-[10px] text-white/40">Actions</p>
                  </div>
                  <div className="glass-card-sm p-2 text-center">
                    <p className="text-lg font-bold text-amber-400">{knowledgeBriefing.recent.decisionCount}</p>
                    <p className="text-[10px] text-white/40">Decisions</p>
                  </div>
                </div>

                {/* Overdue alert */}
                {(overdueActionsData?.overdueCount || 0) > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    <span className="text-xs text-red-400">
                      {overdueActionsData?.overdueCount} overdue action{overdueActionsData?.overdueCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Memory health */}
                {knowledgeStats?.stats && (
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {knowledgeStats.stats.graph.totalEdges} edges
                    </span>
                    <span>{knowledgeStats.stats.chunks.coveragePercent}% embedded</span>
                    <span>{knowledgeStats.stats.communications.embedded} comms</span>
                  </div>
                )}

                {/* Top topics */}
                {knowledgeBriefing.topTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {knowledgeBriefing.topTopics.slice(0, 5).map(({ topic, count }) => (
                      <span key={topic} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-white/50">
                        {topic} <span className="text-white/30">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-white/40">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading knowledge...</p>
              </div>
            )}
          </Link>
        </div>

        {/* Center Column - CONTACT TODAY (Sprint 1 Feature) - First on mobile */}
        <div className="order-1 lg:order-2 lg:col-span-5">
          <div className="glass-card-accent p-4 md:p-6 h-full border-indigo-500/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Phone className="h-5 w-5 text-indigo-400" />
                Contact Today
              </h2>
              <span className="badge-warm">{contactTodayFlat.length} people</span>
            </div>

            <p className="text-sm text-white/50 mb-4">
              These relationships need your attention - sorted by urgency.
            </p>

            {contactTodayFlat.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400 opacity-50" />
                <p className="text-lg">All relationships healthy!</p>
                <p className="text-sm">No one needs follow-up today.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Sprint 2: Grouped by Project */}
                {activeProjectGroups.map(([projectName, contacts]) => (
                  <div key={projectName}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        projectName === 'JusticeHub' && 'bg-blue-400',
                        projectName === 'Empathy Ledger' && 'bg-pink-400',
                        projectName === 'The Harvest' && 'bg-green-400',
                        projectName === 'The Farm' && 'bg-amber-400',
                        projectName === 'The Studio' && 'bg-purple-400',
                        projectName === 'PICC' && 'bg-cyan-400',
                        projectName === 'Other' && 'bg-white/40'
                      )} />
                      <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                        {projectName}
                      </span>
                      <span className="text-xs text-white/40">({contacts.length})</span>
                    </div>
                    <div className="space-y-2">
                      {contacts.slice(0, 3).map((contact: any) => (
                        <ContactTodayRow key={contact.id} contact={contact} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link href="/people?filter=attention" className="btn-glass w-full mt-4 flex items-center justify-center gap-2">
              View All Relationships
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Right Column - Ecosystem Overview - Third on mobile */}
        <div className="order-3 lg:col-span-3 space-y-4 md:space-y-6">
          {/* Sprint 4: Cash Position */}
          <div className="glass-card p-5 glow-green">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-400" />
                Cash Position
              </h2>
              <Link href="/finance" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
                Details <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {finance ? (
              <div className="space-y-3">
                <Link href="/finance" className="glass-card-sm p-3 block hover:border-green-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">Bank Balance</span>
                    <span className="text-lg font-bold text-green-400">
                      ${(finance.bankBalance || 0).toLocaleString()}
                    </span>
                  </div>
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Link href="/finance" className="glass-card-sm p-2 text-center hover:border-emerald-500/30 transition-all">
                    <p className="text-sm font-semibold text-emerald-400">
                      ${(finance.receivables?.total || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-white/40">Receivable</p>
                  </Link>
                  <Link href="/finance" className="glass-card-sm p-2 text-center hover:border-orange-500/30 transition-all">
                    <p className="text-sm font-semibold text-orange-400">
                      ${(finance.payables?.total || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-white/40">Payable</p>
                  </Link>
                </div>

                {overdueInvoices.count > 0 && (
                  <Link href="/finance" className="glass-card-sm p-2 bg-red-500/10 border-red-500/20 block hover:bg-red-500/20 transition-all">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-red-400" />
                      <span className="text-xs text-red-400">
                        {overdueInvoices.count} overdue (${overdueInvoices.total.toLocaleString()})
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-white/40">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Finance data loading...</p>
              </div>
            )}
          </div>

          {/* Sprint 6: Email Summary */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Inbox className="h-4 w-4 text-blue-400" />
                Email
              </h2>
              <span className="text-xs text-white/40">{emailStats?.todayCount || 0} today</span>
            </div>

            {/* Email Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Link href="/reports" className="glass-card-sm p-3 text-center hover:border-blue-500/30 transition-all">
                <p className="text-2xl font-bold text-blue-400">{emailStats?.unread || 0}</p>
                <p className="text-xs text-white/40">Unread</p>
              </Link>
              <Link href="/reports" className="glass-card-sm p-3 text-center hover:border-amber-500/30 transition-all">
                <p className="text-2xl font-bold text-amber-400">{emailStats?.requiresResponse || 0}</p>
                <p className="text-xs text-white/40">Need Reply</p>
              </Link>
            </div>

            {/* Recent Emails */}
            <div className="space-y-2">
              {(recentEmails?.emails || []).slice(0, 3).map((email: any) => (
                <Link key={email.id} href="/reports" className="glass-card-sm p-2 block hover:border-blue-500/30 transition-all">
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                      email.read ? "bg-white/20" : "bg-blue-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{email.subject}</p>
                      <p className="text-xs text-white/40 truncate">{email.from?.split('<')[0]?.trim()}</p>
                    </div>
                  </div>
                </Link>
              ))}
              {(!recentEmails?.emails || recentEmails.emails.length === 0) && (
                <div className="text-center py-2 text-white/40 text-xs">
                  No recent emails
                </div>
              )}
            </div>
          </div>

          {/* LCAA Stage Breakdown with Tremor */}
          <Link href="/ecosystem" className="glass-card p-5 block hover:border-violet-500/30 transition-all">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-400" />
              LCAA Stages
            </h2>
            <BarList
              data={[
                { name: 'Listen', value: (health as any)?.byStage?.listen || 0, color: 'indigo' },
                { name: 'Connect', value: (health as any)?.byStage?.connect || 0, color: 'violet' },
                { name: 'Act', value: (health as any)?.byStage?.act || 0, color: 'emerald' },
                { name: 'Amplify', value: (health as any)?.byStage?.amplify || 0, color: 'amber' },
              ]}
              className="mt-2"
            />
          </Link>

          {/* Temperature Distribution */}
          <Link href="/people" className="glass-card p-5 block hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-400" />
                Relationship Health
              </h2>
            </div>
            <DonutChart
              data={[
                { name: 'Hot', value: health?.hot || 0 },
                { name: 'Warm', value: health?.warm || 0 },
                { name: 'Cool', value: health?.cool || 0 },
              ]}
              category="value"
              index="name"
              colors={['red', 'orange', 'blue']}
              className="h-32"
              showAnimation={true}
              showTooltip={true}
            />
            <div className="flex justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-white/60">Hot ({health?.hot || 0})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-xs text-white/60">Warm ({health?.warm || 0})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-white/60">Cool ({health?.cool || 0})</span>
              </div>
            </div>
          </Link>

          {/* Hot Relationships */}
          <div className="glass-card p-5 glow-hot">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-400" />
                Hot Relationships
              </h2>
              <Link href="/people?filter=hot" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                {hot.length} total <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {hot.slice(0, 5).map((contact) => (
                <Link key={contact.id} href={`/people/${contact.id}`} className="flex items-center gap-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors px-1 -mx-1">
                  <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-medium text-red-400">
                    {contact.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{contact.name}</p>
                  </div>
                </Link>
              ))}
              {hot.length === 0 && (
                <p className="text-sm text-white/40 text-center py-2">No hot contacts</p>
              )}
            </div>
          </div>

          {/* Live Activity Feed */}
          <LiveActivityFeed maxEvents={10} />

          {/* Quick Links */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white mb-4">Quick Links</h2>
            <div className="space-y-2">
              <Link href="/pipeline" className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <FolderKanban className="h-4 w-4 text-indigo-400" />
                <span className="text-sm text-white">Pipeline Board</span>
              </Link>
              <Link href="/reports" className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <FileText className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-white">Weekly Report</span>
              </Link>
              <a href="https://github.com/ACTforACT" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <Github className="h-4 w-4 text-white/60" />
                <span className="text-sm text-white">GitHub Organization</span>
              </a>
              <a href="https://vercel.com/actforact" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <Globe className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-white">Vercel Dashboard</span>
              </a>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <Database className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white">Supabase Dashboard</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string
  value: number
  icon: any
  color: string
  href: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/10 text-blue-400',
    red: 'from-red-500/20 to-red-600/10 text-red-400',
    orange: 'from-orange-500/20 to-orange-600/10 text-orange-400',
    purple: 'from-purple-500/20 to-purple-600/10 text-purple-400',
    pink: 'from-pink-500/20 to-pink-600/10 text-pink-400',
    green: 'from-green-500/20 to-green-600/10 text-green-400',
  }

  return (
    <Link href={href} className="glass-card-sm p-3 md:p-4 hover:border-indigo-500/30 transition-all group">
      <div className={cn('w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2 md:mb-3', colorMap[color])}>
        <Icon className="h-4 w-4 md:h-5 md:w-5" />
      </div>
      <p className="text-lg md:text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-[10px] md:text-xs text-white/50 mt-0.5 md:mt-1 truncate">{label}</p>
    </Link>
  )
}
