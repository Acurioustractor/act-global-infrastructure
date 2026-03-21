'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import {
  Compass,
  Flame,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  ArrowRight,
  Zap,
  Beaker,
  Rocket,
  DollarSign,
  BarChart3,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────

interface NeedleMover {
  rank: number
  title: string
  dollarValue: number
  deadline: string | null
  daysUntil: number | null
  actionType: string
  projectCodes: string[]
  why: string
  urgency: 'critical' | 'urgent' | 'important'
}

interface StrategicProject {
  code: string
  name: string
  tier: string
  status: string
  category: string
  revenueModel: string
  timeToRevenue: string
  productReadiness: number
  rdEligible: boolean
  rdCategory: string
  tamAnnual: number
  samAnnual: number
  oneLiner: string
  biggestBlocker: string
  fastestWin: string
  independenceScore: number
  contributesTo: string[]
  dependsOn: string[]
  feedsInto: string[]
  budget: number
  revenueTarget: number
  fyRevenue: number
  fyExpenses: number
  fyNet: number
  pipelineCount: number
  pipelineWeighted: number
}

interface Objective {
  id: string
  title: string
  type: string
  parentId: string | null
  projectCodes: string[]
  revenueTarget: number
  status: string
  progressPct: number
  targetQuarter: string
  targetDate: string | null
  owner: string
  flywheelSegment: string
  keyResults: Array<{ metric: string; current: number; target: number }>
}

interface HotOpp {
  id: string
  title: string
  stage: string
  value: number
  probability: number
  weighted: number
  projectCodes: string[]
  deadline: string
  daysUntil: number
  source: string
}

interface StrategyData {
  needleMovers: NeedleMover[]
  projects: StrategicProject[]
  objectives: Objective[]
  financialPosition: {
    fyRevenue: number
    fyExpenses: number
    fyNet: number
    totalReceivables: number
    totalPayables: number
    overdueReceivables: Array<{ contact: string; amount: number; dueDate: string; daysOverdue: number; projectCode: string }>
    monthlyBurn: number
    runway: number
    totalBudget: number
    totalRevenueTarget: number
    budgetUtilization: number
  }
  pipeline: {
    totalWeighted: number
    totalCount: number
    hotOpportunities: HotOpp[]
  }
  grantTracking: {
    total: number
    linked: number
    unlinked: number
    totalValue: number
    linkedValue: number
    grants: Array<{
      id: string
      opportunityId: string
      projectCode: string
      grantName: string
      value: number
      status: string
      xeroInvoiceNumber: string | null
      linked: boolean
      acquittalDueDate: string | null
      acquittalStatus: string | null
      notes: string | null
    }>
  }
  scenarios: Record<string, { fy26: number; fy27: number; fy28: number; description: string }>
  flywheel: Array<{ segment: string; projects: string[]; objectiveCount: number }>
  synergy: Array<{ from: string; to: string; type: string }>
  fy: string
}

// ── Helpers ────────────────────────────────────────────────

function $(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(Math.abs(n) / 1000).toFixed(0)}K`
  return `$${Math.abs(n).toFixed(0)}`
}

function $full(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${Math.round(Math.abs(n)).toLocaleString()}`
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  Apply: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  Build: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  Chase: { bg: 'bg-red-500/20', text: 'text-red-400' },
  Register: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  Launch: { bg: 'bg-green-500/20', text: 'text-green-400' },
  Unblock: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  Accelerate: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
}

const URGENCY_COLORS: Record<string, string> = {
  critical: 'border-red-500/40 bg-red-500/5',
  urgent: 'border-amber-500/30 bg-amber-500/5',
  important: 'border-white/10 bg-white/[0.02]',
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  completed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  in_progress: { icon: Rocket, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  at_risk: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  blocked: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10' },
  not_started: { icon: Circle, color: 'text-white/30', bg: 'bg-white/5' },
}

const TIER_COLORS: Record<string, string> = {
  ecosystem: 'text-purple-400 bg-purple-500/20',
  studio: 'text-blue-400 bg-blue-500/20',
  satellite: 'text-white/50 bg-white/10',
}

const REVENUE_MODEL_LABELS: Record<string, { label: string; color: string }> = {
  saas: { label: 'SaaS', color: 'text-emerald-400 bg-emerald-500/15' },
  grant_funded: { label: 'Grant', color: 'text-blue-400 bg-blue-500/15' },
  fee_for_service: { label: 'Fee', color: 'text-amber-400 bg-amber-500/15' },
  internal: { label: 'Internal', color: 'text-white/40 bg-white/10' },
  hybrid: { label: 'Hybrid', color: 'text-purple-400 bg-purple-500/15' },
}

const FLYWHEEL_SEGMENTS: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  community_impact: { label: 'Community Impact', color: 'text-green-400', icon: Target },
  evidence_stories: { label: 'Evidence & Stories', color: 'text-pink-400', icon: Beaker },
  funding: { label: 'Funding Secured', color: 'text-blue-400', icon: DollarSign },
  platform_dev: { label: 'Platform Dev', color: 'text-purple-400', icon: Rocket },
  revenue: { label: 'Revenue', color: 'text-emerald-400', icon: TrendingUp },
  rd_refund: { label: 'R&D Refund', color: 'text-amber-400', icon: Zap },
}

// ── Component ──────────────────────────────────────────────

export default function StrategyPage() {
  const { data, isLoading, error } = useQuery<StrategyData>({
    queryKey: ['strategy'],
    queryFn: () => fetch('/api/strategy').then((r) => r.json()),
  })

  const [goalFilter, setGoalFilter] = useState<string>('all')
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40">Loading strategic alignment...</div>
      </div>
    )
  }

  if (error || !data?.needleMovers) {
    return (
      <div className="min-h-screen p-8">
        <div className="glass-card p-12 text-center">
          <Compass className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white/60 mb-2">Failed to load strategy data</h2>
          <p className="text-white/40">Check API and database connection. You may need to run the migration first.</p>
        </div>
      </div>
    )
  }

  const { needleMovers, projects, objectives, financialPosition: fin, pipeline, grantTracking, scenarios, flywheel, synergy } = data

  const ecosystemProjects = projects.filter((p) => p.tier === 'ecosystem')
  const otherProjects = projects.filter((p) => p.tier !== 'ecosystem' && p.oneLiner)

  // FY26 progress (Jul 2025 → Jun 2026)
  const fyStartMs = new Date('2025-07-01').getTime()
  const fyEndMs = new Date('2026-06-30').getTime()
  const nowMs = Date.now()
  const fyProgressPct = Math.min(100, Math.max(0, Math.round(((nowMs - fyStartMs) / (fyEndMs - fyStartMs)) * 100)))

  // Goal tree helpers
  const northStar = objectives.find((o) => o.type === 'north_star')
  const annualTargets = objectives.filter((o) => o.type === 'annual_target')
  const quarterlyGoals = objectives.filter((o) => o.type === 'quarterly_goal')

  const toggleGoal = (id: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredAnnual = annualTargets.filter((o) => {
    if (goalFilter === 'all') return true
    if (goalFilter === 'on_track') return o.status === 'in_progress' && o.progressPct >= 25
    if (goalFilter === 'at_risk') return o.status === 'at_risk' || o.status === 'blocked'
    return true
  })

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-10">
      {/* ═══════════ HEADER ═══════════ */}
      <header>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Compass className="h-8 w-8 text-amber-400" />
              Strategic Alignment
            </h1>
            <p className="text-white/50 mt-1">Phase 1: Build the Engine — Month {Math.ceil(fyProgressPct / (100 / 12))} of 12</p>
          </div>
          <div className="flex gap-2">
            <Link href="/finance/overview" className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              Finance Overview
            </Link>
            <Link href="/finance/projects" className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              Projects P&L
            </Link>
            <Link href="/finance/board" className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              Board Report
            </Link>
          </div>
        </div>
        {/* FY progress bar */}
        <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500/60 to-amber-400/80 rounded-full transition-all"
            style={{ width: `${fyProgressPct}%` }}
          />
          <span className="absolute right-0 -top-5 text-[10px] text-white/30 tabular-nums">{data.fy} — {fyProgressPct}% elapsed</span>
        </div>
      </header>

      {/* ═══════════ SECTION 1: NEEDLE MOVERS ═══════════ */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-400" />
          The Five Needle Movers
          <span className="text-xs text-white/30 font-normal ml-2">do these, nothing else matters</span>
        </h2>

        <div className="space-y-3">
          {needleMovers.map((nm) => {
            const actionColor = ACTION_COLORS[nm.actionType] || ACTION_COLORS.Apply
            return (
              <div
                key={nm.rank}
                className={cn(
                  'glass-card p-4 md:p-5 border transition-all hover:border-white/20',
                  URGENCY_COLORS[nm.urgency],
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <span className="text-xl font-black text-amber-400">{nm.rank}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', actionColor.bg, actionColor.text)}>
                        {nm.actionType}
                      </span>
                      <h3 className="text-white font-semibold text-sm md:text-base truncate">{nm.title}</h3>
                    </div>
                    <p className="text-white/40 text-xs mt-1">{nm.why}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {nm.projectCodes.map((c) => (
                        <Link key={c} href={`/finance/projects/${c}`} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/40 hover:text-white/70 transition-colors">
                          {c}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Value + Deadline */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-amber-400 tabular-nums">{$full(nm.dollarValue)}</p>
                    {nm.deadline && (
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full tabular-nums mt-1 inline-block',
                        nm.daysUntil !== null && nm.daysUntil <= 7 ? 'bg-red-500/20 text-red-400' :
                        nm.daysUntil !== null && nm.daysUntil <= 30 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-white/10 text-white/50',
                      )}>
                        {nm.daysUntil !== null && nm.daysUntil <= 0 ? 'OVERDUE' : `${nm.daysUntil}d left`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══════════ SECTION 2: PROJECT ALIGNMENT ═══════════ */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-purple-400" />
          Project Alignment Matrix
        </h2>

        {/* 2a: Flywheel strip */}
        <div className="glass-card p-4 mb-4 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-[700px]">
            {flywheel.map((seg, i) => {
              const config = FLYWHEEL_SEGMENTS[seg.segment]
              if (!config) return null
              const Icon = config.icon
              return (
                <div key={seg.segment} className="flex items-center">
                  <div className="flex flex-col items-center px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className={cn('h-3.5 w-3.5', config.color)} />
                      <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-center">
                      {seg.projects.map((code) => (
                        <span key={code} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                          {code}
                        </span>
                      ))}
                      {seg.projects.length === 0 && (
                        <span className="text-[10px] text-white/15">none</span>
                      )}
                    </div>
                  </div>
                  {i < flywheel.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-white/15 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 2b: Project cards — ecosystem */}
        {ecosystemProjects.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {ecosystemProjects.map((p) => (
              <ProjectCard key={p.code} project={p} />
            ))}
          </div>
        )}

        {/* Studio / other with strategic profiles */}
        {otherProjects.length > 0 && (
          <>
            <h3 className="text-sm text-white/40 mb-3">Studio & Satellite</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {otherProjects.map((p) => (
                <ProjectCard key={p.code} project={p} compact />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ═══════════ SECTION 3: MONEY ═══════════ */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-400" />
          Money
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Right Now */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-medium text-emerald-400 mb-4">Right Now</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">FY Revenue</span>
                <span className="text-sm font-bold text-green-400 tabular-nums">{$full(fin.fyRevenue)}</span>
              </div>
              {fin.totalRevenueTarget > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-white/30 mb-1">
                    <span>vs ${(fin.totalRevenueTarget / 1000).toFixed(0)}K target</span>
                    <span>{Math.round((fin.fyRevenue / fin.totalRevenueTarget) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500/50 rounded-full" style={{ width: `${Math.min(100, (fin.fyRevenue / fin.totalRevenueTarget) * 100)}%` }} />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">FY Expenses</span>
                <span className="text-sm font-bold text-red-400 tabular-nums">{$full(fin.fyExpenses)}</span>
              </div>
              {fin.totalBudget > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-white/30 mb-1">
                    <span>vs ${(fin.totalBudget / 1000).toFixed(0)}K budget</span>
                    <span>{fin.budgetUtilization}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', fin.budgetUtilization > 100 ? 'bg-red-500' : fin.budgetUtilization > 80 ? 'bg-amber-500' : 'bg-blue-500/50')}
                      style={{ width: `${Math.min(100, fin.budgetUtilization)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">Net Position</span>
                  <span className={cn('text-sm font-bold tabular-nums', fin.fyNet >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {fin.fyNet >= 0 ? '+' : '-'}{$full(fin.fyNet)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">Monthly Burn</span>
                  <span className="text-sm text-orange-400 tabular-nums">{$(fin.monthlyBurn)}/mo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">Runway</span>
                  <span className={cn('text-sm font-bold tabular-nums', fin.runway < 3 ? 'text-red-400' : fin.runway < 6 ? 'text-amber-400' : 'text-green-400')}>
                    {fin.runway > 0 ? `${fin.runway} months` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">Receivables</span>
                  <span className="text-sm text-white/60 tabular-nums">{$full(fin.totalReceivables)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* What's Coming */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-medium text-indigo-400 mb-4">What&apos;s Coming</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Weighted Pipeline</span>
                <span className="text-sm font-bold text-indigo-400 tabular-nums">{$full(pipeline.totalWeighted)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Active Opportunities</span>
                <span className="text-sm text-white/60 tabular-nums">{pipeline.totalCount}</span>
              </div>

              {/* Hot opps */}
              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] text-white/30 uppercase tracking-wide">Next 90 days</span>
                <div className="space-y-2 mt-2">
                  {pipeline.hotOpportunities.slice(0, 5).map((opp) => (
                    <div key={opp.id} className="flex items-center gap-2">
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        opp.daysUntil <= 7 ? 'bg-red-400' : opp.daysUntil <= 30 ? 'bg-amber-400' : 'bg-green-400',
                      )} />
                      <span className="text-xs text-white/60 truncate flex-1">{opp.title}</span>
                      <span className="text-xs text-indigo-400 tabular-nums flex-shrink-0">{$(opp.weighted)}</span>
                    </div>
                  ))}
                  {pipeline.hotOpportunities.length === 0 && (
                    <p className="text-xs text-white/20">No deadlines in next 90 days</p>
                  )}
                </div>
              </div>

              {/* R&D refund estimate */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">R&D Refund Estimate</span>
                  <span className="text-sm font-bold text-amber-400 tabular-nums">~$407K</span>
                </div>
                <p className="text-[10px] text-white/20 mt-1">43.5% of eligible R&D spend — registration due Apr 30</p>
              </div>
            </div>
          </div>

          {/* Where We're Headed */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-medium text-purple-400 mb-4">Where We&apos;re Headed</h3>
            <div className="space-y-3">
              {['conservative', 'moderate', 'aggressive'].map((key) => {
                const s = scenarios[key]
                if (!s) return null
                const colors: Record<string, { text: string; border: string }> = {
                  conservative: { text: 'text-blue-400', border: 'border-blue-500/20' },
                  moderate: { text: 'text-purple-400', border: 'border-purple-500/20' },
                  aggressive: { text: 'text-amber-400', border: 'border-amber-500/20' },
                }
                const c = colors[key] || colors.moderate
                return (
                  <div key={key} className={cn('p-3 rounded-lg border', c.border)}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn('text-xs font-medium capitalize', c.text)}>{key}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-[10px] text-white/30">FY26</span>
                        <p className={cn('text-sm font-bold tabular-nums', c.text)}>{$(s.fy26)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/30">FY27</span>
                        <p className={cn('text-sm font-bold tabular-nums', c.text)}>{$(s.fy27)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/30">FY28</span>
                        <p className={cn('text-sm font-bold tabular-nums', c.text)}>{$(s.fy28)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {Object.keys(scenarios).length === 0 && (
                <div className="text-center py-4">
                  <BarChart3 className="h-6 w-6 text-white/15 mx-auto mb-2" />
                  <p className="text-xs text-white/30">No scenarios configured</p>
                  <Link href="/finance/revenue-planning" className="text-xs text-purple-400 hover:text-purple-300 mt-1 inline-flex items-center gap-1">
                    Set up <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {/* Current track indicator */}
              {fin.fyRevenue > 0 && scenarios.moderate?.fy26 > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Actual vs Moderate</span>
                    <span className={cn(
                      'tabular-nums font-medium',
                      fin.fyRevenue >= scenarios.moderate.fy26 * (fyProgressPct / 100) ? 'text-green-400' : 'text-red-400',
                    )}>
                      {Math.round((fin.fyRevenue / scenarios.moderate.fy26) * 100)}% of FY target
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 3b: GRANTS → P&L ═══════════ */}
      {grantTracking && grantTracking.grants.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            Grants → P&L
            <span className="text-xs text-white/30 font-normal ml-2">
              {grantTracking.linked}/{grantTracking.total} linked to Xero
            </span>
          </h2>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="glass-card p-4">
              <span className="text-xs text-white/40 uppercase tracking-wide">Total Grant Value</span>
              <p className="text-xl font-bold text-green-400 tabular-nums mt-1">{$full(grantTracking.totalValue)}</p>
            </div>
            <div className="glass-card p-4">
              <span className="text-xs text-white/40 uppercase tracking-wide">Linked to Xero</span>
              <p className="text-xl font-bold text-emerald-400 tabular-nums mt-1">{$full(grantTracking.linkedValue)}</p>
              <p className="text-[10px] text-white/25 mt-1">{grantTracking.linked} grants with invoice numbers</p>
            </div>
            <div className="glass-card p-4">
              <span className="text-xs text-white/40 uppercase tracking-wide">Needs Invoicing</span>
              <p className="text-xl font-bold text-amber-400 tabular-nums mt-1">
                {$full(grantTracking.totalValue - grantTracking.linkedValue)}
              </p>
              <p className="text-[10px] text-white/25 mt-1">{grantTracking.unlinked} grants without Xero invoices</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-4 text-white/40 font-medium text-xs">Grant</th>
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs">Project</th>
                  <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Value</th>
                  <th className="text-center py-2 px-3 text-white/40 font-medium text-xs">Status</th>
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs">Xero Invoice</th>
                </tr>
              </thead>
              <tbody>
                {grantTracking.grants.map((g) => (
                  <tr key={g.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2 px-4 text-white text-xs font-medium max-w-[250px] truncate">{g.grantName}</td>
                    <td className="py-2 px-3">
                      <Link href={`/finance/projects/${g.projectCode}`} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/40 hover:text-white/70 transition-colors">
                        {g.projectCode}
                      </Link>
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-xs text-green-400">{$full(g.value)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        g.status === 'received' ? 'text-green-400 bg-green-500/10' :
                        g.status === 'approved' ? 'text-amber-400 bg-amber-500/10' :
                        'text-white/40 bg-white/5',
                      )}>
                        {g.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {g.linked ? (
                        <span className="text-xs text-emerald-400">{g.xeroInvoiceNumber}</span>
                      ) : (
                        <span className="text-xs text-red-400/60">Needs invoice</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ═══════════ SECTION 4: GOALS & MILESTONES ═══════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            Goals & Milestones
          </h2>
          <div className="flex gap-1">
            {['all', 'on_track', 'at_risk'].map((f) => (
              <button
                key={f}
                onClick={() => setGoalFilter(f)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-lg transition-colors',
                  goalFilter === f ? 'bg-purple-500/20 text-purple-400' : 'text-white/30 hover:text-white/50',
                )}
              >
                {f === 'all' ? 'All' : f === 'on_track' ? 'On Track' : 'At Risk'}
              </button>
            ))}
          </div>
        </div>

        {/* North Star */}
        {northStar && (
          <div className="glass-card p-5 mb-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Compass className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-400 uppercase tracking-wide font-medium">North Star</span>
            </div>
            <p className="text-white font-semibold">{northStar.title}</p>
            {northStar.keyResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {northStar.keyResults.map((kr, i) => (
                  <KeyResultBar key={i} kr={kr} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Annual → Quarterly tree */}
        <div className="space-y-3">
          {filteredAnnual.map((annual) => {
            const children = quarterlyGoals.filter((q) => q.parentId === annual.id)
            const isExpanded = expandedGoals.has(annual.id)
            const sc = STATUS_CONFIG[annual.status] || STATUS_CONFIG.not_started
            const StatusIcon = sc.icon

            return (
              <div key={annual.id} className="glass-card overflow-hidden">
                <button
                  onClick={() => toggleGoal(annual.id)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
                >
                  {children.length > 0 ? (
                    isExpanded ? <ChevronDown className="h-4 w-4 text-white/30 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-white/30 flex-shrink-0" />
                  ) : (
                    <div className="w-4" />
                  )}
                  <StatusIcon className={cn('h-4 w-4 flex-shrink-0', sc.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white font-medium">{annual.title}</span>
                      {annual.owner && <span className="text-[10px] text-white/25">{annual.owner}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', sc.bg, sc.color)}>
                        {annual.status.replace('_', ' ')}
                      </span>
                      {annual.projectCodes.map((c) => (
                        <span key={c} className="text-[10px] text-white/25">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {annual.revenueTarget > 0 && (
                      <span className="text-sm font-bold text-amber-400 tabular-nums">{$(annual.revenueTarget)}</span>
                    )}
                    <div className="w-20">
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', sc.color.replace('text-', 'bg-').replace('400', '500/60'))} style={{ width: `${annual.progressPct}%` }} />
                      </div>
                      <span className="text-[10px] text-white/25 tabular-nums">{annual.progressPct}%</span>
                    </div>
                  </div>
                </button>

                {/* Quarterly goals (children) */}
                {isExpanded && children.length > 0 && (
                  <div className="border-t border-white/5">
                    {children.map((q) => {
                      const qsc = STATUS_CONFIG[q.status] || STATUS_CONFIG.not_started
                      const QIcon = qsc.icon
                      return (
                        <div key={q.id} className="px-4 py-3 pl-12 border-b border-white/5 last:border-b-0">
                          <div className="flex items-center gap-3">
                            <QIcon className={cn('h-3.5 w-3.5 flex-shrink-0', qsc.color)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-white/80">{q.title}</span>
                                {q.targetDate && (
                                  <span className="text-[10px] text-white/25 tabular-nums">
                                    Due {new Date(q.targetDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>
                              {q.keyResults.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                  {q.keyResults.map((kr, i) => (
                                    <KeyResultBar key={i} kr={kr} compact />
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {q.revenueTarget > 0 && (
                                <span className="text-xs text-white/40 tabular-nums">{$(q.revenueTarget)}</span>
                              )}
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', qsc.bg, qsc.color)}>
                                {q.progressPct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══════════ SECTION 5: SYNERGY MAP ═══════════ */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-indigo-400" />
          Project Synergy Map
        </h2>

        <div className="glass-card p-5 overflow-x-auto">
          {synergy.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs">From</th>
                  <th className="text-center py-2 px-3 text-white/40 font-medium text-xs">Relationship</th>
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs">To</th>
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs">What Flows</th>
                </tr>
              </thead>
              <tbody>
                {synergy.map((link, i) => {
                  const fromProject = projects.find((p) => p.code === link.from)
                  const toProject = projects.find((p) => p.code === link.to)
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2 px-3">
                        <Link href={`/finance/projects/${link.from}`} className="text-xs font-medium text-white hover:text-blue-400 transition-colors">
                          {link.from}
                          {fromProject && <span className="text-white/25 ml-1">{fromProject.name}</span>}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-400/50 mx-auto" />
                      </td>
                      <td className="py-2 px-3">
                        <Link href={`/finance/projects/${link.to}`} className="text-xs font-medium text-white hover:text-blue-400 transition-colors">
                          {link.to}
                          {toProject && <span className="text-white/25 ml-1">{toProject.name}</span>}
                        </Link>
                      </td>
                      <td className="py-2 px-3">
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          link.type === 'feeds_data' ? 'text-indigo-400 bg-indigo-500/10' : 'text-amber-400 bg-amber-500/10',
                        )}>
                          {link.type === 'feeds_data' ? 'Data & narratives' : 'Depends on'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <GitBranch className="h-8 w-8 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No project synergies mapped yet.</p>
              <p className="text-white/20 text-xs mt-1">Add depends_on and feeds_into in project_strategic_profile to see connections.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

function ProjectCard({ project: p, compact }: { project: StrategicProject; compact?: boolean }) {
  const modelConfig = REVENUE_MODEL_LABELS[p.revenueModel] || REVENUE_MODEL_LABELS.internal
  const tierColor = TIER_COLORS[p.tier] || 'text-white/30 bg-white/5'

  return (
    <div className="glass-card p-4 hover:border-white/10 border border-transparent transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Link href={`/finance/projects/${p.code}`} className="text-sm font-semibold text-white hover:text-blue-400 transition-colors">
            {p.code}
          </Link>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', tierColor)}>{p.tier}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded', modelConfig.color)}>{modelConfig.label}</span>
        </div>
        {p.rdEligible && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
            R&D {p.rdCategory}
          </span>
        )}
      </div>

      {/* Name + one-liner */}
      <p className="text-xs text-white/70 font-medium mb-1">{p.name}</p>
      {p.oneLiner && <p className="text-xs text-white/30 mb-3">{p.oneLiner}</p>}

      {/* Independence score */}
      {p.independenceScore != null && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-white/30 mb-1">
            <span>Independence</span>
            <span className="tabular-nums">{p.independenceScore}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                p.independenceScore >= 70 ? 'bg-green-500' : p.independenceScore >= 40 ? 'bg-amber-500' : 'bg-red-500/50',
              )}
              style={{ width: `${p.independenceScore}%` }}
            />
          </div>
        </div>
      )}

      {!compact && (
        <>
          {/* Mini financials */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div>
              <span className="text-[10px] text-white/25 block">Revenue</span>
              <span className="text-xs text-green-400 tabular-nums">{p.fyRevenue > 0 ? $(p.fyRevenue) : '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/25 block">Expenses</span>
              <span className="text-xs text-red-400 tabular-nums">{$(Math.abs(p.fyExpenses))}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/25 block">Pipeline</span>
              <span className="text-xs text-indigo-400 tabular-nums">{p.pipelineWeighted > 0 ? $(p.pipelineWeighted) : '—'}</span>
            </div>
          </div>

          {/* Fastest win */}
          {p.fastestWin && (
            <div className="pt-2 border-t border-white/5">
              <span className="text-[10px] text-white/25">Fastest win:</span>
              <p className="text-xs text-emerald-400/80 mt-0.5">{p.fastestWin}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KeyResultBar({ kr, compact }: { kr: { metric: string; current: number; target: number }; compact?: boolean }) {
  const pct = kr.target > 0 ? Math.min(100, Math.round((kr.current / kr.target) * 100)) : 0
  const label = kr.metric.replace(/_/g, ' ')

  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-white/30 capitalize">{label}</span>
        <span className="text-white/40 tabular-nums">
          {kr.current.toLocaleString()} / {kr.target.toLocaleString()}
        </span>
      </div>
      <div className={cn('bg-white/5 rounded-full overflow-hidden', compact ? 'h-1' : 'h-1.5')}>
        <div
          className={cn('h-full rounded-full', pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500/60' : 'bg-white/20')}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  )
}
