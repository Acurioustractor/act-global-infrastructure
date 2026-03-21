'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertCircle,
  Layers,
  Filter,
  Handshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'

// ── Types ──

interface PipelineItem {
  id: string
  title: string
  stage: string
  value: number
  probability: number
  weighted: number
  expectedClose: string | null
  type: string
  contact: string | null
}

interface CashFlowMonth {
  month: string
  expected: number
}

interface ProjectPlan {
  code: string
  name: string
  tier: string
  revenue: number
  expenses: number
  net: number
  annualBudget: number | null
  revenueTarget: number | null
  pipelineCount: number
  pipelineTotal: number
  pipelineWeighted: number
  pipelineItems: PipelineItem[]
  cashFlowTimeline: CashFlowMonth[]
  netWithPipeline: number
  nextExpectedIncome: { title: string; value: number; date: string } | null
  topVendors: Array<{ name: string; spend: number }>
  actions: string[]
}

interface ProjectPlanData {
  projects: ProjectPlan[]
  totals: {
    revenue: number
    expenses: number
    net: number
    pipelineTotal: number
    pipelineWeighted: number
    pipelineCount: number
  }
  fy: string
}

const TIER_LABELS: Record<string, string> = {
  ecosystem: 'Ecosystem',
  studio: 'Studio',
  satellite: 'Satellite',
  unknown: 'Other',
}

const STAGE_COLORS: Record<string, string> = {
  identified: 'bg-white/10 text-white/50',
  researching: 'bg-blue-500/20 text-blue-400',
  pursuing: 'bg-amber-500/20 text-amber-400',
  submitted: 'bg-indigo-500/20 text-indigo-400',
  negotiating: 'bg-purple-500/20 text-purple-400',
  approved: 'bg-green-500/20 text-green-400',
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatMonth(ym: string) {
  const [y, m] = ym.split('-')
  return `${MONTH_SHORT[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

function formatDate(d: string) {
  const date = new Date(d + 'T00:00:00')
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

// ── Project Card ──

function ProjectCard({ project }: { project: ProjectPlan }) {
  const [expanded, setExpanded] = useState(false)
  const hasPipeline = project.pipelineCount > 0
  const maxTimelineValue = Math.max(...project.cashFlowTimeline.map(m => m.expected), 1)

  return (
    <div className="glass-card overflow-hidden">
      {/* Summary Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-white/40" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white/40" />
          )}
        </div>

        {/* Project name */}
        <div className="min-w-[140px]">
          <div className="font-medium text-white">{project.code}</div>
          <div className="text-xs text-white/40 truncate">{project.name}</div>
        </div>

        {/* Spent */}
        <div className="min-w-[90px] text-right">
          <div className="text-sm text-red-400 tabular-nums">{formatMoney(project.expenses)}</div>
          <div className="text-[10px] text-white/30">spent</div>
        </div>

        {/* Revenue */}
        <div className="min-w-[90px] text-right">
          <div className={cn('text-sm tabular-nums', project.revenue > 0 ? 'text-green-400' : 'text-white/20')}>
            {project.revenue > 0 ? formatMoney(project.revenue) : '—'}
          </div>
          <div className="text-[10px] text-white/30">received</div>
        </div>

        {/* Pipeline (weighted) */}
        <div className="min-w-[100px] text-right">
          <div className={cn('text-sm tabular-nums', hasPipeline ? 'text-amber-400' : 'text-white/20')}>
            {hasPipeline ? formatMoney(project.pipelineWeighted) : '—'}
          </div>
          <div className="text-[10px] text-white/30">
            {hasPipeline ? `${project.pipelineCount} opps` : 'no pipeline'}
          </div>
        </div>

        {/* Net (with pipeline) */}
        <div className="min-w-[100px] text-right">
          <div className={cn(
            'text-sm font-medium tabular-nums',
            project.netWithPipeline >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {project.netWithPipeline >= 0 ? '+' : ''}{formatMoney(project.netWithPipeline)}
          </div>
          <div className="text-[10px] text-white/30">net + pipeline</div>
        </div>

        {/* Next expected income */}
        <div className="flex-1 min-w-[160px] text-right hidden lg:block">
          {project.nextExpectedIncome ? (
            <div>
              <div className="text-xs text-white/60 truncate">{project.nextExpectedIncome.title}</div>
              <div className="text-[10px] text-white/30">
                {formatMoneyCompact(project.nextExpectedIncome.value)} · {formatDate(project.nextExpectedIncome.date)}
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/20">—</div>
          )}
        </div>

        {/* Actions indicator */}
        {project.actions.length > 0 && (
          <div className="flex-shrink-0">
            <AlertCircle className="h-4 w-4 text-amber-400/60" />
          </div>
        )}
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-white/10 px-5 py-4 space-y-5">
          {/* Three columns: Spend | Pipeline | Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Spend breakdown */}
            <div>
              <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">Spend Breakdown</h4>
              {project.topVendors.length > 0 ? (
                <div className="space-y-2">
                  {project.topVendors.map((v, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-white/70 truncate mr-2">{v.name}</span>
                      <span className="text-red-400/80 tabular-nums flex-shrink-0">{formatMoney(v.spend)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/20">No vendor data</div>
              )}
              {project.annualBudget && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Budget</span>
                    <span className="text-white/60">{formatMoney(project.annualBudget)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        (project.expenses / project.annualBudget) > 1
                          ? 'bg-red-500'
                          : (project.expenses / project.annualBudget) > 0.8
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      )}
                      style={{ width: `${Math.min((project.expenses / project.annualBudget) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-white/30 mt-1">
                    {Math.round((project.expenses / project.annualBudget) * 100)}% utilised
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline Opportunities */}
            <div>
              <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
                Pipeline ({project.pipelineCount})
              </h4>
              {project.pipelineItems.length > 0 ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {project.pipelineItems.map(opp => (
                    <div key={opp.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0',
                          STAGE_COLORS[opp.stage] || STAGE_COLORS.identified
                        )}>
                          {opp.stage}
                        </span>
                        <span className="text-white/70 truncate">{opp.title}</span>
                      </div>
                      <div className="flex gap-3 text-[10px] text-white/30 mt-0.5 ml-1">
                        <span className="tabular-nums">{formatMoneyCompact(opp.value)}</span>
                        <span>{opp.probability}% prob</span>
                        <span className="text-amber-400/60 tabular-nums">→ {formatMoneyCompact(opp.weighted)}</span>
                        {opp.expectedClose && <span>{formatMonth(opp.expectedClose.substring(0, 7))}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/20">No pipeline opportunities</div>
              )}
              <div className="mt-3 pt-2 border-t border-white/5 flex justify-between text-xs">
                <span className="text-white/40">Total pipeline</span>
                <span className="text-amber-400 tabular-nums">{formatMoney(project.pipelineTotal)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-white/40">Weighted</span>
                <span className="text-amber-400/80 tabular-nums">{formatMoney(project.pipelineWeighted)}</span>
              </div>
            </div>

            {/* Cash Flow Timeline */}
            <div>
              <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
                Expected Inflows
              </h4>
              {project.cashFlowTimeline.length > 0 ? (
                <div className="space-y-2">
                  {project.cashFlowTimeline.map(m => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-white/40 w-14 flex-shrink-0 tabular-nums">{formatMonth(m.month)}</span>
                      <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
                        <div
                          className="h-full bg-green-500/40 rounded"
                          style={{ width: `${(m.expected / maxTimelineValue) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-green-400/70 tabular-nums w-16 text-right flex-shrink-0">
                        {formatMoneyCompact(m.expected)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/20">No dated pipeline opportunities</div>
              )}
            </div>
          </div>

          {/* Action items */}
          {project.actions.length > 0 && (
            <div className="pt-3 border-t border-white/5">
              <h4 className="text-xs font-medium text-amber-400/60 uppercase tracking-wider mb-2">Action Items</h4>
              <div className="flex flex-wrap gap-2">
                {project.actions.map((a, i) => (
                  <span key={i} className="text-xs bg-amber-500/10 text-amber-400/80 px-2 py-1 rounded">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Link to project detail */}
          <div className="text-right">
            <Link
              href={`/finance/projects/${project.code}`}
              className="text-xs text-blue-400/60 hover:text-blue-400 transition-colors"
            >
              View full P&L →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──

export default function ProjectPlanPage() {
  const [tierFilter, setTierFilter] = useState<string>('all')

  const { data, isLoading } = useQuery<ProjectPlanData>({
    queryKey: ['finance', 'project-plan'],
    queryFn: () => fetch('/api/finance/project-plan').then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40">Loading project financial plans...</div>
      </div>
    )
  }

  if (!data?.projects?.length) {
    return (
      <div className="min-h-screen p-8">
        <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Finance
        </Link>
        <div className="glass-card p-12 text-center">
          <Layers className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white/60 mb-2">No project data</h2>
          <p className="text-white/40">Run financial sync and pipeline alignment first.</p>
        </div>
      </div>
    )
  }

  const tiers = [...new Set(data.projects.map(p => p.tier))].sort()
  const filtered = tierFilter === 'all' ? data.projects : data.projects.filter(p => p.tier === tierFilter)
  const t = data.totals

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-[1400px] mx-auto">
      <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Finance
      </Link>

      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Target className="h-8 w-8 text-indigo-400" />
            Project Financial Plans — {data.fy}
          </h1>
          <p className="text-white/50 mt-1">
            Actuals + pipeline + timing for {data.projects.length} projects
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/40" />
          <div className="flex gap-1">
            <button
              onClick={() => setTierFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                tierFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
              )}
            >
              All
            </button>
            {tiers.map(tier => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  tierFilter === tier ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
                )}
              >
                {TIER_LABELS[tier] || tier}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="glass-card p-4 text-center">
          <DollarSign className="h-4 w-4 text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-green-400 tabular-nums">{formatMoney(t.revenue)}</p>
          <p className="text-[10px] text-white/40 mt-1">Revenue Received</p>
        </div>
        <div className="glass-card p-4 text-center">
          <TrendingUp className="h-4 w-4 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-400 tabular-nums">{formatMoney(t.expenses)}</p>
          <p className="text-[10px] text-white/40 mt-1">Total Spent</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Handshake className="h-4 w-4 text-amber-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-amber-400 tabular-nums">{formatMoney(t.pipelineWeighted)}</p>
          <p className="text-[10px] text-white/40 mt-1">Pipeline (weighted)</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Layers className="h-4 w-4 text-indigo-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-indigo-400 tabular-nums">{formatMoney(t.pipelineTotal)}</p>
          <p className="text-[10px] text-white/40 mt-1">Pipeline (total)</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Calendar className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
          <p className={cn(
            'text-xl font-bold tabular-nums',
            (t.net + t.pipelineWeighted) >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {(t.net + t.pipelineWeighted) >= 0 ? '+' : ''}{formatMoney(t.net + t.pipelineWeighted)}
          </p>
          <p className="text-[10px] text-white/40 mt-1">Net + Pipeline</p>
        </div>
      </div>

      {/* Project Cards */}
      <div className="space-y-2">
        {filtered.map(project => (
          <ProjectCard key={project.code} project={project} />
        ))}
      </div>

      {/* Totals footer */}
      <div className="mt-4 glass-card px-5 py-3 flex items-center gap-4 text-sm">
        <span className="font-medium text-white min-w-[140px] ml-8">TOTALS ({filtered.length} projects)</span>
        <span className="min-w-[90px] text-right text-red-400 tabular-nums">{formatMoney(t.expenses)}</span>
        <span className="min-w-[90px] text-right text-green-400 tabular-nums">{formatMoney(t.revenue)}</span>
        <span className="min-w-[100px] text-right text-amber-400 tabular-nums">{formatMoney(t.pipelineWeighted)}</span>
        <span className={cn(
          'min-w-[100px] text-right font-medium tabular-nums',
          (t.net + t.pipelineWeighted) >= 0 ? 'text-emerald-400' : 'text-red-400'
        )}>
          {(t.net + t.pipelineWeighted) >= 0 ? '+' : ''}{formatMoney(t.net + t.pipelineWeighted)}
        </span>
      </div>
    </div>
  )
}
