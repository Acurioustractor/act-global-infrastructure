'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Sparkles,
  ExternalLink,
  Zap,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  FlaskConical,
  DollarSign,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'

// --- Types ---

interface PipelineItem {
  id: string
  title: string
  funder: string
  value: number
  weighted: number
  probability: number
  stage: string
  stageIndex: number
  type: string
  projectCodes: string[]
  expectedClose: string | null
  daysInStage: number
  isWon: boolean
}

interface ProjectRef {
  code: string
  name: string
  tier: string
}

interface PipelineResponse {
  items: PipelineItem[]
  projects: ProjectRef[]
  types: Record<string, { count: number; value: number }>
  stages: Record<string, { count: number; value: number }>
  stats: {
    totalPipeline: number
    totalWeighted: number
    confirmed: { total: number; count: number }
    totalItems: number
  }
}

interface GrantMatchProject {
  project_code: string
  project_name: string
  match_count: number
  top_score: number
  top_matches: { id: string; name: string; provider: string; fit_score: number; amount_max: number | null; closes_at: string | null }[]
}

interface GrantMatchesResponse {
  projects: GrantMatchProject[]
  total_matches: number
  projects_with_matches: number
}

interface IntelInsight {
  type: string
  icon: string
  title: string
  detail: string
  priority: number
}

interface IntelligenceResponse {
  coverage: {
    transactions: { total: number; tagged: number; pct: number }
    opportunities: { untagged: number; untaggedValue: number }
    staleCount: number
  }
  projectPipeline: {
    code: string; name: string; tier: string
    oppCount: number; pipelineValue: number; weightedValue: number
    wonCount: number; wonValue: number
  }[]
  cashFlow: { monthlyBurn: number; monthlyIncome: number; netMonthly: number }
  rd: { eligibleSpend: number; potentialRefund: number; projects: string[] }
  insights: IntelInsight[]
  staleOpps: { id: string; title: string; stage: string; value: number; daysSinceUpdate: number }[]
}

interface RdProject {
  code: string
  name: string
  category: string
  spend: number
  txCount: number
  topVendors: { name: string; spend: number }[]
}

interface RdDashboardResponse {
  projects: RdProject[]
  salary: {
    nic: { total: number; rdAllocation: number; rdAmount: number }
    ben: { total: number; rdAllocation: number; rdAmount: number; potential: number }
  }
  totals: {
    core: number; supporting: number; salary: number
    total: number; refund: number; totalFySpend: number; rdPct: number
  }
  projection: {
    monthsElapsed: number; monthsRemaining: number
    projectedFullYear: number; projectedRefund: number
    withBenOnPayroll: number; benPotentialRd: number
  }
  monthly: { month: string; core: number; supporting: number; salary: number }[]
  definitions: {
    core: { projects: string[]; description: string }
    supporting: { projects: string[]; description: string }
    rate: number; note: string
  }
}

interface RevenueRealityResponse {
  monthly: { month: string; income: number; spend: number }[]
  byProject: { code: string; income: number; spend: number; txCount: number }[]
  totals: {
    currentIncome: number; currentSpend: number
    previousIncome: number; previousSpend: number
  }
  byType: { type: string; total: number; count: number }[]
  wonOpps: { id: string; title: string; value: number; contact: string; projects: string[] }[]
  topPayers: { name: string; total: number; count: number }[]
  computed: {
    hqConcentrationPct: number
    grantDependencyPct: number
    monthlyAvg: number
    yoyGrowthPct: number
    peakMonth: { month: string; income: number }
    deadMonths: string[]
    pipelineCashGap: number
  }
}

type FilterKey = 'all' | string

const ENGINE_PROJECTS = new Set(['ACT-GD', 'ACT-HV', 'ACT-FM', 'ACT-EL', 'ACT-JH', 'ACT-PI', 'ACT-PC', 'ACT-HQ', 'ACT-IN'])

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  researching: { label: 'Researching', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  pursuing: { label: 'Pursuing', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  submitted: { label: 'Submitted', color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  shortlisted: { label: 'Shortlisted', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  realized: { label: 'Won', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  won: { label: 'Won', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
}

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  engine: { label: 'Engine', color: 'text-amber-400' },
  campaign: { label: 'Campaign', color: 'text-blue-400' },
  community: { label: 'Community', color: 'text-emerald-400' },
  art: { label: 'Art', color: 'text-purple-400' },
  satellite: { label: 'Satellite', color: 'text-slate-400' },
  studio: { label: 'Studio', color: 'text-pink-400' },
}

const INSIGHT_STYLES: Record<string, { border: string; bg: string }> = {
  risk: { border: 'border-red-500/30', bg: 'bg-red-500/5' },
  action: { border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  opportunity: { border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
  positive: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(d))
}

export default function PipelineReviewPage() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<FilterKey>('all')
  const [stageFilter, setStageFilter] = useState<FilterKey>('all')
  const [projectFilter, setProjectFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(true)
  const [showIntel, setShowIntel] = useState(true)

  const { data, isLoading } = useQuery<PipelineResponse>({
    queryKey: ['finance', 'pipeline-review'],
    queryFn: () => fetch('/api/finance/pipeline-review').then(r => r.json()),
    staleTime: 30_000,
  })

  const { data: grantMatches } = useQuery<GrantMatchesResponse>({
    queryKey: ['finance', 'grant-matches'],
    queryFn: () => fetch('/api/finance/grant-matches').then(r => r.json()),
    staleTime: 120_000,
  })

  const { data: intel } = useQuery<IntelligenceResponse>({
    queryKey: ['finance', 'pipeline-intelligence'],
    queryFn: () => fetch('/api/finance/pipeline-intelligence').then(r => r.json()),
    staleTime: 60_000,
  })

  const { data: revenue } = useQuery<RevenueRealityResponse>({
    queryKey: ['finance', 'revenue-reality'],
    queryFn: () => fetch('/api/finance/revenue-reality').then(r => r.json()),
    staleTime: 60_000,
  })

  const { data: rd } = useQuery<RdDashboardResponse>({
    queryKey: ['finance', 'rd-dashboard'],
    queryFn: () => fetch('/api/finance/rd-dashboard').then(r => r.json()),
    staleTime: 60_000,
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; stage?: string; project_codes?: string[]; note?: string }) => {
      const res = await fetch('/api/finance/pipeline-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'pipeline-review'] })
    },
  })

  const items = data?.items || []
  const projects = data?.projects || []
  const stats = data?.stats
  const types = data?.types || {}

  // Filter — Layer 1: Focus mode filters to engine-tier projects
  const filteredItems = useMemo(() => {
    let filtered = items

    if (focusMode) {
      filtered = filtered.filter(i =>
        i.projectCodes.length === 0 || i.projectCodes.some(pc => ENGINE_PROJECTS.has(pc))
      )
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(i => i.type === typeFilter)
    }
    if (stageFilter !== 'all') {
      filtered = filtered.filter(i => i.stage === stageFilter)
    }
    if (projectFilter) {
      filtered = filtered.filter(i => i.projectCodes.includes(projectFilter))
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.funder.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [items, typeFilter, stageFilter, projectFilter, searchFilter, focusMode])

  const filteredStats = useMemo(() => {
    const total = filteredItems.reduce((s, i) => s + i.value, 0)
    const weighted = filteredItems.reduce((s, i) => s + i.weighted, 0)
    return { total, weighted, count: filteredItems.length }
  }, [filteredItems])

  // Engine project pipeline for the project breakdown
  const enginePipeline = useMemo(() => {
    return (intel?.projectPipeline || []).filter(p => p.tier === 'engine')
  }, [intel])

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <Target className="h-10 w-10 text-indigo-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading pipeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Target className="h-7 w-7 text-indigo-400" />
            Pipeline Autopilot
          </h1>
          <span className="text-sm text-white/30">{stats?.totalItems || 0} opportunities</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border',
                focusMode
                  ? 'bg-amber-500/15 border-amber-500/25 text-amber-400'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
              )}
            >
              {focusMode ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {focusMode ? 'Engines Only' : 'All Projects'}
            </button>
            <button
              onClick={() => setShowIntel(!showIntel)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border',
                showIntel
                  ? 'bg-blue-500/15 border-blue-500/25 text-blue-400'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
              )}
            >
              <Zap className="h-3 w-3" />
              Intel
            </button>
          </div>
        </div>
      </header>

      {/* Hero Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-indigo-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Pipeline</span>
            </div>
            <p className="text-2xl font-bold text-indigo-400 tabular-nums">{formatMoneyCompact(filteredStats.total)}</p>
            <p className="text-xs text-white/30">{filteredStats.count} opportunities</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Weighted</span>
            </div>
            <p className="text-2xl font-bold text-purple-400 tabular-nums">{formatMoneyCompact(filteredStats.weighted)}</p>
            <p className="text-xs text-white/30">Probability-adjusted</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Won</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatMoney(stats.confirmed.total)}</p>
            <p className="text-xs text-white/30">{stats.confirmed.count} secured</p>
          </div>

          {intel?.rd && intel.rd.potentialRefund > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-white/40 uppercase tracking-wider">R&D Refund</span>
              </div>
              <p className="text-2xl font-bold text-cyan-400 tabular-nums">{formatMoneyCompact(intel.rd.potentialRefund)}</p>
              <p className="text-xs text-white/30">{formatMoneyCompact(intel.rd.eligibleSpend)} eligible @ 43.5%</p>
            </div>
          )}
        </div>
      )}

      {/* Layer 3: Intelligence Insights */}
      {showIntel && intel?.insights && intel.insights.length > 0 && (
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white/80">Autopilot Intelligence</span>
          </div>
          <div className="space-y-2">
            {intel.insights.map((insight, i) => {
              const style = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.action
              return (
                <div key={i} className={cn('rounded-lg border p-3', style.border, style.bg)}>
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">{insight.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 font-medium">{insight.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{insight.detail}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Revenue Reality */}
      {showIntel && revenue && (
        <div className="space-y-3 mb-4">
          {/* Revenue Hero Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card p-4 border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-white/40 uppercase tracking-wider">Received</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatMoneyCompact(revenue.totals.currentIncome)}</p>
              <p className="text-xs text-white/30">FY26 YTD actual cash</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-white/40 uppercase tracking-wider">YoY Growth</span>
              </div>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                revenue.computed.yoyGrowthPct >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {revenue.computed.yoyGrowthPct >= 0 ? '+' : ''}{revenue.computed.yoyGrowthPct}%
              </p>
              <p className="text-xs text-white/30">Annualized vs FY25 ({formatMoneyCompact(revenue.totals.previousIncome)})</p>
            </div>

            <div className={cn('glass-card p-4', revenue.computed.grantDependencyPct > 80 ? 'border-amber-500/20' : '')}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-white/40 uppercase tracking-wider">Grant Ratio</span>
              </div>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                revenue.computed.grantDependencyPct > 80 ? 'text-amber-400' : 'text-white/80'
              )}>
                {revenue.computed.grantDependencyPct}%
              </p>
              <p className="text-xs text-white/30">
                {revenue.computed.grantDependencyPct > 80 ? 'High grant dependency' : 'Income from grants'}
              </p>
            </div>

            <div className={cn('glass-card p-4', revenue.computed.hqConcentrationPct > 80 ? 'border-red-500/20' : '')}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-white/40 uppercase tracking-wider">HQ Tagged</span>
              </div>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                revenue.computed.hqConcentrationPct > 80 ? 'text-red-400' : 'text-white/80'
              )}>
                {revenue.computed.hqConcentrationPct}%
              </p>
              <p className="text-xs text-white/30">
                {revenue.computed.hqConcentrationPct > 80 ? 'Needs project re-tagging' : 'Tagged to ACT-HQ'}
              </p>
            </div>
          </div>

          {/* Monthly Income Chart */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-white/80">Monthly Income</span>
              <span className="text-xs text-white/30">FY26 actual cash received</span>
            </div>
            <div className="space-y-1.5">
              {revenue.monthly.map(m => {
                const maxIncome = Math.max(...revenue.monthly.map(x => x.income), 1)
                const barWidth = Math.max(2, (m.income / maxIncome) * 100)
                const monthLabel = new Date(m.month + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
                const isDead = m.income === 0
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 w-14 shrink-0 text-right font-mono">{monthLabel}</span>
                    <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden relative">
                      {isDead ? (
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-red-400/60">No income</span>
                      ) : (
                        <div
                          className="h-full rounded-full bg-emerald-400/40"
                          style={{ width: `${barWidth}%` }}
                        />
                      )}
                    </div>
                    <span className={cn(
                      'text-xs tabular-nums w-16 text-right',
                      isDead ? 'text-red-400/40' : 'text-white/50'
                    )}>
                      {isDead ? '$0' : formatMoneyCompact(m.income)}
                    </span>
                  </div>
                )
              })}
              {revenue.computed.monthlyAvg > 0 && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-white/20 w-14 shrink-0 text-right">avg</span>
                  <div className="flex-1 h-px border-t border-dashed border-white/10" />
                  <span className="text-xs text-white/30 tabular-nums w-16 text-right">{formatMoneyCompact(revenue.computed.monthlyAvg)}/mo</span>
                </div>
              )}
            </div>
          </div>

          {/* Who's Paying + Pipeline→Cash Gap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Top Payers */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-white/80">Who&apos;s Paying</span>
                <span className="text-xs text-white/30">Top 5 FY26</span>
              </div>
              <div className="space-y-1.5">
                {revenue.topPayers.slice(0, 5).map((payer, i) => {
                  const maxPayer = revenue.topPayers[0]?.total || 1
                  const barWidth = Math.max(3, (payer.total / maxPayer) * 100)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-white/50 w-36 shrink-0 truncate" title={payer.name}>{payer.name}</span>
                      <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-400/40"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/50 tabular-nums w-16 text-right">{formatMoneyCompact(payer.total)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pipeline → Cash Gap */}
            <div className="glass-card p-4 border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-white/80">Pipeline → Cash Gap</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400 tabular-nums">{formatMoneyCompact(revenue.totals.currentIncome)}</span>
                  <span className="text-xs text-white/30">received in FY26</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-white/50 tabular-nums">{formatMoneyCompact(revenue.totals.currentIncome - revenue.computed.pipelineCashGap)}</span>
                  <span className="text-xs text-white/30">linked to won opportunities</span>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-amber-400 tabular-nums">{formatMoneyCompact(revenue.computed.pipelineCashGap)}</span>
                    <span className="text-xs text-amber-400/50">untracked — no pipeline trail</span>
                  </div>
                  <p className="text-[10px] text-white/20 mt-1">Income that arrived without a matching &quot;won&quot; opportunity. Link these to projects for accurate forecasting.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* R&D Tax Incentive */}
      {showIntel && rd && (
        <div className="space-y-3 mb-4">
          {/* R&D Hero Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card p-4 border-cyan-500/20">
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-white/40 uppercase tracking-wider">R&D Eligible</span>
              </div>
              <p className="text-2xl font-bold text-cyan-400 tabular-nums">{formatMoneyCompact(rd.totals.total)}</p>
              <p className="text-xs text-white/30">{rd.totals.rdPct}% of FY spend</p>
            </div>

            <div className="glass-card p-4 border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-white/40 uppercase tracking-wider">43.5% Refund</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatMoneyCompact(rd.totals.refund)}</p>
              <p className="text-xs text-white/30">FY26 YTD @ 43.5%</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-white/40 uppercase tracking-wider">Full Year</span>
              </div>
              <p className="text-2xl font-bold text-purple-400 tabular-nums">{formatMoneyCompact(rd.projection.projectedRefund)}</p>
              <p className="text-xs text-white/30">Projected from {rd.projection.monthsElapsed}mo trend</p>
            </div>

            <div className={cn('glass-card p-4', rd.salary.ben.total === 0 ? 'border-red-500/20' : '')}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-white/40 uppercase tracking-wider">If Ben Joins</span>
              </div>
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{formatMoneyCompact(rd.projection.withBenOnPayroll)}</p>
              <p className="text-xs text-white/30">
                {rd.salary.ben.total === 0
                  ? `+${formatMoneyCompact(rd.projection.benPotentialRd)} R&D in ${rd.projection.monthsRemaining}mo`
                  : 'Both founders on payroll'}
              </p>
            </div>
          </div>

          {/* R&D Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* By Project */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-white/80">R&D by Project</span>
              </div>
              <div className="space-y-1.5">
                {rd.projects.map(project => {
                  const maxSpend = rd.projects[0]?.spend || 1
                  const barWidth = Math.max(3, (project.spend / maxSpend) * 100)
                  const isCore = rd.definitions.core.projects.includes(project.code)
                  return (
                    <div key={project.code} className="flex items-center gap-3">
                      <span className={cn(
                        'text-[10px] font-mono w-14 shrink-0',
                        isCore ? 'text-cyan-400/70' : 'text-blue-400/70'
                      )}>{project.code}</span>
                      <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', isCore ? 'bg-cyan-400/40' : 'bg-blue-400/40')}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/50 tabular-nums w-16 text-right">{formatMoneyCompact(project.spend)}</span>
                      <span className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded',
                        isCore ? 'bg-cyan-500/15 text-cyan-400' : 'bg-blue-500/15 text-blue-400'
                      )}>
                        {isCore ? 'core' : 'supporting'}
                      </span>
                    </div>
                  )
                })}
                {/* Salary line */}
                {rd.salary.nic.rdAmount > 0 && (
                  <div className="flex items-center gap-3 pt-1.5 mt-1.5 border-t border-white/5">
                    <span className="text-[10px] font-mono text-amber-400/70 w-14 shrink-0">Salary</span>
                    <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400/40"
                        style={{ width: `${Math.max(3, (rd.salary.nic.rdAmount / (rd.projects[0]?.spend || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/50 tabular-nums w-16 text-right">{formatMoneyCompact(rd.salary.nic.rdAmount)}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                      {Math.round(rd.salary.nic.rdAllocation * 100)}% of Nic
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* R&D Refund Calculator */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-white/80">Refund Calculator</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Core R&D (EL, JH, IN, DO)</span>
                  <span className="text-cyan-400 tabular-nums">{formatMoneyCompact(rd.totals.core)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Supporting R&D (GD, FM)</span>
                  <span className="text-blue-400 tabular-nums">{formatMoneyCompact(rd.totals.supporting)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Nic salary ({Math.round(rd.salary.nic.rdAllocation * 100)}% of {formatMoneyCompact(rd.salary.nic.total)})</span>
                  <span className="text-amber-400 tabular-nums">{formatMoneyCompact(rd.salary.nic.rdAmount)}</span>
                </div>
                {rd.salary.ben.total === 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-red-400/60">Ben salary (NOT ON PAYROLL)</span>
                    <span className="text-red-400/60 tabular-nums">$0</span>
                  </div>
                )}
                <div className="flex justify-between text-xs pt-2 border-t border-white/10">
                  <span className="text-white/60 font-medium">Total R&D eligible</span>
                  <span className="text-white/80 tabular-nums font-medium">{formatMoneyCompact(rd.totals.total)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-emerald-400 font-medium">ATO Refund @ 43.5%</span>
                  <span className="text-emerald-400 tabular-nums font-bold">{formatMoneyCompact(rd.totals.refund)}</span>
                </div>

                {rd.salary.ben.total === 0 && rd.projection.monthsRemaining > 0 && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="text-xs text-amber-400 font-medium">Missing: Ben on payroll</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      If Ben starts at $200K (85% R&D) for the remaining {rd.projection.monthsRemaining} months:
                      +{formatMoneyCompact(rd.projection.benPotentialRd)} R&D eligible
                      = {formatMoneyCompact(rd.projection.withBenOnPayroll)} total refund
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layer 2: Coverage Strip */}
      {intel?.coverage && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={cn(
            'glass-card p-3 flex items-center gap-3',
            intel.coverage.transactions.pct === 100 ? 'border-emerald-500/20' : 'border-amber-500/20'
          )}>
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
              intel.coverage.transactions.pct === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            )}>
              {intel.coverage.transactions.pct}%
            </div>
            <div>
              <p className="text-xs text-white/60">Xero Tagged</p>
              <p className="text-[10px] text-white/30">{intel.coverage.transactions.tagged}/{intel.coverage.transactions.total} FY</p>
            </div>
          </div>

          <div className={cn(
            'glass-card p-3 flex items-center gap-3',
            intel.coverage.opportunities.untagged === 0 ? 'border-emerald-500/20' : 'border-amber-500/20'
          )}>
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
              intel.coverage.opportunities.untagged === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            )}>
              {intel.coverage.opportunities.untagged === 0 ? (
                <Shield className="h-4 w-4" />
              ) : (
                intel.coverage.opportunities.untagged
              )}
            </div>
            <div>
              <p className="text-xs text-white/60">Untagged Opps</p>
              <p className="text-[10px] text-white/30">{intel.coverage.opportunities.untagged > 0 ? formatMoneyCompact(intel.coverage.opportunities.untaggedValue) + ' unassigned' : 'All assigned'}</p>
            </div>
          </div>

          <div className={cn(
            'glass-card p-3 flex items-center gap-3',
            intel.coverage.staleCount === 0 ? 'border-emerald-500/20' : 'border-red-500/20'
          )}>
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
              intel.coverage.staleCount === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            )}>
              {intel.coverage.staleCount === 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                intel.coverage.staleCount
              )}
            </div>
            <div>
              <p className="text-xs text-white/60">Stale (60+ days)</p>
              <p className="text-[10px] text-white/30">{intel.coverage.staleCount === 0 ? 'All active' : 'Needs review'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Engine Project Breakdown */}
      {showIntel && enginePipeline.length > 0 && (
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-white/80">Engine Projects</span>
            <span className="text-xs text-white/30">Revenue drivers</span>
          </div>
          <div className="space-y-1.5">
            {enginePipeline.map(project => {
              const maxValue = enginePipeline[0]?.pipelineValue || 1
              const barWidth = Math.max(3, (project.pipelineValue / maxValue) * 100)
              return (
                <button
                  key={project.code}
                  onClick={() => setProjectFilter(projectFilter === project.code ? '' : project.code)}
                  className={cn(
                    'w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left',
                    projectFilter === project.code
                      ? 'bg-white/10 ring-1 ring-white/20'
                      : 'hover:bg-white/[0.04]'
                  )}
                >
                  <span className="text-[10px] font-mono text-white/30 w-14 shrink-0">{project.code}</span>
                  <span className="text-xs text-white/70 w-32 shrink-0 truncate">{project.name}</span>
                  <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400/40"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/50 tabular-nums w-16 text-right">{formatMoneyCompact(project.pipelineValue)}</span>
                  <span className="text-[10px] text-white/25 tabular-nums w-10 text-right">{project.oppCount}</span>
                  {project.wonCount > 0 && (
                    <span className="text-[10px] text-emerald-400/60">{project.wonCount} won</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* GrantScope Discovered Matches */}
      {showIntel && grantMatches && grantMatches.total_matches > 0 && (
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-white/80">AI-Discovered Grants</span>
              <span className="text-xs text-white/30">
                {grantMatches.total_matches} matches across {grantMatches.projects_with_matches} projects
              </span>
            </div>
            <a
              href="https://grantscope.au/profile/matches"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400/60 hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              Open GrantScope <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {grantMatches.projects
              .filter(p => p.match_count > 0)
              .filter(p => !focusMode || ENGINE_PROJECTS.has(p.project_code))
              .map(project => (
                <div
                  key={project.project_code}
                  className="rounded-lg bg-white/[0.03] border border-white/5 p-3"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-white/40">{project.project_code}</span>
                    <span className="text-[10px] text-amber-400/70">{project.top_score}% top</span>
                  </div>
                  <p className="text-sm font-medium text-white/70 mb-1 truncate">{project.project_name}</p>
                  <p className="text-xs text-white/30">{project.match_count} matching grants</p>
                  {project.top_matches[0] && (
                    <p className="text-[10px] text-white/20 mt-1 truncate" title={project.top_matches[0].name}>
                      Top: {project.top_matches[0].name}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs transition-colors border',
                typeFilter === 'all'
                  ? 'bg-white/15 border-white/20 text-white'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
              )}
            >
              All
            </button>
            {Object.entries(types).map(([type, info]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs transition-colors border capitalize',
                  typeFilter === type
                    ? 'bg-white/15 border-white/20 text-white'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                )}
              >
                {type} <span className="opacity-50 ml-1">{info.count}</span>
              </button>
            ))}
          </div>

          <div className="w-px bg-white/10 self-stretch" />

          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="bg-transparent border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/50 focus:outline-none"
          >
            <option value="all">All Stages</option>
            {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="bg-transparent border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/50 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects
              .filter(p => !focusMode || ENGINE_PROJECTS.has(p.code))
              .map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
          </select>

          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20" />
            <input
              type="text"
              placeholder="Search..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-48 pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20"
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {(typeFilter !== 'all' || stageFilter !== 'all' || projectFilter || searchFilter || focusMode) && (
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-4 text-xs text-white/30">
            <span>{filteredStats.count} shown</span>
            <span>Total: {formatMoneyCompact(filteredStats.total)}</span>
            <span>Weighted: {formatMoneyCompact(filteredStats.weighted)}</span>
            {focusMode && <span className="text-amber-400/50">Engine focus</span>}
          </div>
        )}
      </div>

      {/* Opportunity cards */}
      {filteredItems.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-white/40">No opportunities match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => {
            const isExpanded = expandedId === item.id
            const stageConf = STAGE_CONFIG[item.stage] || STAGE_CONFIG.researching
            const probPct = Math.min(100, Math.max(0, item.probability))
            const isEngine = item.projectCodes.some(pc => ENGINE_PROJECTS.has(pc))

            return (
              <div key={item.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className={cn(
                    'px-5 py-4 rounded-xl cursor-pointer transition-colors border',
                    isExpanded
                      ? 'bg-white/[0.06] border-white/15'
                      : isEngine
                        ? 'bg-white/[0.03] border-white/8 hover:bg-white/[0.05]'
                        : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] opacity-60',
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/90 truncate">{item.title}</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize', stageConf.bg, stageConf.color)}>
                          {stageConf.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-white/30">{item.funder}</span>
                        {item.type && (
                          <span className="text-[10px] text-white/20 capitalize">{item.type}</span>
                        )}
                        {item.expectedClose && (
                          <span className="text-[10px] text-white/20">Expected: {formatDate(item.expectedClose)}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 w-28">
                      <p className="text-sm font-bold text-white/80 tabular-nums">{formatMoneyCompact(item.value)}</p>
                      <p className="text-[10px] text-white/25 tabular-nums">
                        Weighted: {formatMoneyCompact(item.weighted)}
                      </p>
                    </div>

                    <div className="w-32 shrink-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              probPct >= 70 ? 'bg-emerald-400' :
                              probPct >= 40 ? 'bg-amber-400' :
                              'bg-red-400'
                            )}
                            style={{ width: `${probPct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-white/40 w-8 text-right">{probPct}%</span>
                      </div>
                    </div>

                    <div className="w-24 shrink-0 flex flex-wrap gap-1 justify-end">
                      {item.projectCodes.length > 0 ? (
                        item.projectCodes.slice(0, 2).map(pc => {
                          const tier = projects.find(p => p.code === pc)?.tier
                          const tierConf = tier ? TIER_CONFIG[tier] : null
                          return (
                            <span key={pc} className={cn(
                              'text-[10px] font-mono px-1.5 py-0.5 rounded',
                              tierConf ? `bg-white/10 ${tierConf.color}` : 'bg-white/10 text-white/50'
                            )}>
                              {pc}
                            </span>
                          )
                        })
                      ) : (
                        <span className="text-[10px] text-white/15">—</span>
                      )}
                    </div>

                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-white/20 shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-white/20 shrink-0" />
                    }
                  </div>
                </div>

                {isExpanded && (
                  <div className="ml-5 mt-1 mb-2 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Total Value</p>
                        <p className="text-sm text-white/80 tabular-nums">{formatMoney(item.value)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Weighted</p>
                        <p className="text-sm text-white/80 tabular-nums">{formatMoney(item.weighted)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Days In Stage</p>
                        <p className="text-sm text-white/80 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-white/20" />
                          {item.daysInStage} days
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Expected Close</p>
                        <p className="text-sm text-white/80">{formatDate(item.expectedClose)}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Stage Progression</p>
                      <div className="flex gap-1">
                        {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (key !== item.stage) {
                                updateMutation.mutate({ id: item.id, stage: key })
                              }
                            }}
                            disabled={updateMutation.isPending}
                            className={cn(
                              'flex-1 py-2 rounded-lg text-[10px] transition-colors border text-center',
                              key === item.stage
                                ? `${cfg.bg} border-current ${cfg.color} font-medium`
                                : 'bg-white/[0.02] border-white/5 text-white/20 hover:bg-white/[0.05] hover:text-white/40',
                            )}
                          >
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
                        Project Assignment
                        {item.projectCodes.length > 0 && (
                          <span className="normal-case text-white/50 ml-1">— {item.projectCodes.join(', ')}</span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {projects
                          .filter(p => !focusMode || ENGINE_PROJECTS.has(p.code) || item.projectCodes.includes(p.code))
                          .map(project => {
                            const isAssigned = item.projectCodes.includes(project.code)
                            const tierConf = project.tier ? TIER_CONFIG[project.tier] : null
                            return (
                              <button
                                key={project.code}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const newCodes = isAssigned
                                    ? item.projectCodes.filter(c => c !== project.code)
                                    : [...item.projectCodes, project.code]
                                  updateMutation.mutate({ id: item.id, project_codes: newCodes })
                                }}
                                disabled={updateMutation.isPending}
                                className={cn(
                                  'px-2.5 py-1.5 rounded-lg text-xs transition-colors border',
                                  isAssigned
                                    ? 'bg-blue-500/15 border-blue-500/25 text-blue-400'
                                    : tierConf
                                      ? `bg-white/5 border-white/10 ${tierConf.color} hover:bg-white/10`
                                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70',
                                  'disabled:opacity-30',
                                )}
                              >
                                {project.name}
                              </button>
                            )
                          })}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3">
                      <Link
                        href="/finance/pipeline-kanban"
                        className="text-xs text-indigo-400/60 hover:text-indigo-400 transition-colors"
                      >
                        View in Kanban →
                      </Link>
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
