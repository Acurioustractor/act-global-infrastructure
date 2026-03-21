'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Flame,
  Clock,
  Target,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Telescope,
  BarChart3,
  Layers,
  CheckCircle2,
  AlertCircle,
  Building2,
  Bell,
  Activity,
  Wallet,
  Sliders,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'

// ── Types ────────────────────────────────────────────────────────────

interface OverviewData {
  actuals: {
    cashInBank: number | null
    fyRevenue: number
    fyExpenses: number
    fyNet: number
    receivables: number
    payables: number
    monthlyBurn: number
    monthlyRevenue: number
    runway: number
    receivablesAging: { current: number; overdue30: number; overdue60: number; overdue90: number }
    byProject: Array<{
      code: string; name: string; tier: string
      revenue: number; expenses: number; net: number; budgetPct: number | null
    }>
    sparklineData: {
      months: string[]
      revenue: number[]
      expenses: number[]
      net: number[]
    }
    monthDeltas: {
      revenue: number; revenuePct: number | null
      expenses: number; expensesPct: number | null
      currentMonth: string; previousMonth: string
    } | null
  }
  pipeline: {
    totalWeighted: number
    totalCount: number
    truncated: boolean
    byStage: Array<{ stage: string; count: number; value: number; weighted: number; avgProb: number }>
    topOpportunities: Array<{
      title: string; value: number; probability: number; weighted: number
      stage: string; project_codes: string[]; expected_close: string | null; source: string
    }>
    byProject: Array<{ code: string; weighted: number; count: number }>
    realizedGrants: Array<{
      title: string; value: number; project_codes: string[]; source: string; contact: string | null
      recognizedRevenue: number; gap: number; status: 'reconciled' | 'partial' | 'unreconciled'
    }>
  }
  scenarios: Record<string, { fy26Total: number; fy27Total: number; description: string; assumptions: Record<string, unknown> }>
  overheadAllocation: {
    hqExpenses: number; hqRevenue: number; directExpenseTotal: number
    byProject: Array<{
      code: string; name: string; directExpenses: number; directRevenue: number
      overheadShare: number; allocatedOverhead: number; fullyLoadedNet: number
    }>
  }
  healthScore: {
    level: 'strong' | 'attention' | 'critical'
    score: number
    factors: Array<{ name: string; level: 'strong' | 'attention' | 'critical'; detail: string }>
  }
  nudges: Array<{ type: string; severity: 'info' | 'warning' | 'critical'; message: string }>
  fy: string
  lastSyncAt: string | null
  generatedAt: string
}

// ── Sparkline SVG Component ──────────────────────────────────────────

function Sparkline({ data, color, width = 80, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="inline-block ml-2 opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Color maps ───────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  researching: 'bg-blue-500/30',
  pursuing: 'bg-indigo-500/40',
  submitted: 'bg-purple-500/50',
  shortlisted: 'bg-amber-500/50',
  realized: 'bg-green-500/50',
  won: 'bg-emerald-500/60',
}

const STAGE_TEXT: Record<string, string> = {
  researching: 'text-blue-400',
  pursuing: 'text-indigo-400',
  submitted: 'text-purple-400',
  shortlisted: 'text-amber-400',
  realized: 'text-green-400',
  won: 'text-emerald-400',
}

const TIER_COLORS: Record<string, string> = {
  ecosystem: 'text-purple-400 bg-purple-500/20',
  studio: 'text-blue-400 bg-blue-500/20',
  satellite: 'text-white/50 bg-white/10',
  unknown: 'text-white/30 bg-white/5',
}

const HEALTH_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  strong: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
  attention: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/10' },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', glow: 'shadow-red-500/10' },
}

const HEALTH_LABELS: Record<string, string> = {
  strong: 'Financial Health: Strong',
  attention: 'Financial Health: Attention Needed',
  critical: 'Financial Health: Action Required',
}

const NUDGE_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
}

// ── Delta Badge ──────────────────────────────────────────────────────

function DeltaBadge({ value, pct, invertColor }: { value: number; pct: number | null; invertColor?: boolean }) {
  // invertColor: true means "lower is better" (e.g. expenses)
  const isPositive = value > 0
  const isGood = invertColor ? !isPositive : isPositive
  const color = isGood ? 'text-green-400' : 'text-red-400'
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight

  return (
    <span className={cn('text-xs flex items-center gap-0.5 mt-1', color)}>
      <Icon className="h-3 w-3" />
      {formatMoneyCompact(Math.abs(value))}
      {pct !== null && <span className="text-white/30 ml-0.5">({pct > 0 ? '+' : ''}{pct}%)</span>}
    </span>
  )
}

// ── Interactive Scenario Builder ─────────────────────────────────────

function ScenarioBuilder({ data }: { data: OverviewData }) {
  const { actuals, pipeline } = data

  // State for toggles/sliders
  const [selectedOpps, setSelectedOpps] = useState<Set<number>>(new Set())
  const [newHireCost, setNewHireCost] = useState(0)
  const [extraMonthly, setExtraMonthly] = useState(0)

  const toggleOpp = (idx: number) => {
    setSelectedOpps(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  // Calculate scenario impact
  const scenario = useMemo(() => {
    const additionalRevenue = pipeline.topOpportunities
      .filter((_, i) => selectedOpps.has(i))
      .reduce((sum, o) => sum + o.value, 0)

    const additionalAnnualCost = newHireCost + (extraMonthly * 12)
    const additionalMonthlyCost = additionalAnnualCost / 12

    const currentBurn = actuals.monthlyBurn
    const currentRevenue = actuals.monthlyRevenue
    const modeledBurn = currentBurn + additionalMonthlyCost
    const modeledRevenue = currentRevenue + (additionalRevenue / 12) // spread over FY

    const cashBase = actuals.cashInBank ?? Math.max(0, actuals.fyNet + actuals.receivables)

    // Project 6 months forward
    const months: Array<{ month: string; current: number; modeled: number }> = []
    const now = new Date()
    let currentCash = cashBase
    let modeledCash = cashBase

    for (let i = 1; i <= 6; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const label = m.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
      currentCash += currentRevenue - currentBurn
      modeledCash += modeledRevenue - modeledBurn
      months.push({ month: label, current: Math.max(0, currentCash), modeled: Math.max(0, modeledCash) })
    }

    const currentRunway = (currentBurn - currentRevenue) > 0
      ? cashBase / (currentBurn - currentRevenue)
      : 999
    const modeledRunway = (modeledBurn - modeledRevenue) > 0
      ? cashBase / (modeledBurn - modeledRevenue)
      : 999

    return {
      additionalRevenue,
      additionalAnnualCost,
      modeledBurn,
      modeledRevenue,
      months,
      currentRunway: Math.min(currentRunway, 999),
      modeledRunway: Math.min(modeledRunway, 999),
      runwayDelta: modeledRunway - currentRunway,
    }
  }, [selectedOpps, newHireCost, extraMonthly, actuals, pipeline.topOpportunities])

  // Simple SVG chart for cash projection
  const chartWidth = 400
  const chartHeight = 120
  const maxCash = Math.max(...scenario.months.map(m => Math.max(m.current, m.modeled)), 1)

  const toPath = (values: number[]) => {
    return values.map((v, i) => {
      const x = (i / (values.length - 1)) * chartWidth
      const y = chartHeight - (v / maxCash) * (chartHeight - 10) - 5
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ')
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-semibold text-white">Model a Scenario</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Pipeline toggles */}
          <div>
            <span className="text-xs text-white/40 uppercase tracking-wide block mb-2">Win these opportunities</span>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {pipeline.topOpportunities.slice(0, 10).map((opp, i) => (
                <button
                  key={i}
                  onClick={() => toggleOpp(i)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all flex justify-between items-center',
                    selectedOpps.has(i)
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent',
                  )}
                >
                  <span className="truncate mr-2">{opp.title}</span>
                  <span className="tabular-nums whitespace-nowrap">{formatMoneyCompact(opp.value)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cost sliders */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide block mb-1">
              New hire annual cost: <span className="text-white/70 tabular-nums">{formatMoney(newHireCost)}/yr</span>
            </label>
            <input
              type="range"
              min={0}
              max={200000}
              step={10000}
              value={newHireCost}
              onChange={e => setNewHireCost(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide block mb-1">
              Extra monthly expenses: <span className="text-white/70 tabular-nums">{formatMoney(extraMonthly)}/mo</span>
            </label>
            <input
              type="range"
              min={0}
              max={20000}
              step={500}
              value={extraMonthly}
              onChange={e => setExtraMonthly(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Impact summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-xs text-white/40 block">Modeled Runway</span>
              <span className={cn('text-lg font-bold tabular-nums', scenario.modeledRunway > 6 ? 'text-emerald-400' : scenario.modeledRunway > 3 ? 'text-amber-400' : 'text-red-400')}>
                {scenario.modeledRunway >= 999 ? '∞' : `${scenario.modeledRunway.toFixed(1)}mo`}
              </span>
              {scenario.runwayDelta !== 0 && (
                <span className={cn('text-xs', scenario.runwayDelta > 0 ? 'text-green-400' : 'text-red-400')}>
                  {scenario.runwayDelta > 0 ? '+' : ''}{scenario.runwayDelta.toFixed(1)}mo
                </span>
              )}
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-xs text-white/40 block">Additional Revenue</span>
              <span className="text-lg font-bold tabular-nums text-green-400">
                {scenario.additionalRevenue > 0 ? `+${formatMoneyCompact(scenario.additionalRevenue)}` : '$0'}
              </span>
              {scenario.additionalAnnualCost > 0 && (
                <span className="text-xs text-red-400">-{formatMoneyCompact(scenario.additionalAnnualCost)}/yr cost</span>
              )}
            </div>
          </div>

          {/* Cash projection chart */}
          <div>
            <span className="text-xs text-white/40 block mb-2">6-Month Cash Projection</span>
            <div className="bg-white/5 rounded-lg p-3">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ height: chartHeight }}>
                {/* Current trajectory */}
                <path d={toPath(scenario.months.map(m => m.current))} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4 3" />
                {/* Modeled trajectory */}
                <path d={toPath(scenario.months.map(m => m.modeled))} fill="none" stroke="#a78bfa" strokeWidth="2" />
                {/* Break-even line */}
                <line x1="0" y1={chartHeight - 5} x2={chartWidth} y2={chartHeight - 5} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              </svg>
              <div className="flex justify-between text-xs text-white/30 mt-1">
                {scenario.months.map(m => (
                  <span key={m.month}>{m.month}</span>
                ))}
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-white/30 flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-white/20 inline-block" style={{ borderTop: '1.5px dashed rgba(255,255,255,0.3)' }} /> Current
                </span>
                <span className="text-purple-400 flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-purple-400 inline-block" /> Modeled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────

export default function FinanceOverview() {
  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ['finance', 'overview'],
    queryFn: () => fetch('/api/finance/overview').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // match server cache
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40 flex items-center gap-3">
          <Activity className="h-5 w-5 animate-pulse" />
          Loading financial overview...
        </div>
      </div>
    )
  }

  if (error || !data?.actuals) {
    return (
      <div className="min-h-screen p-8">
        <div className="glass-card p-12 text-center">
          <DollarSign className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white/60 mb-2">Failed to load overview</h2>
          <p className="text-white/40">Check API and database connection.</p>
        </div>
      </div>
    )
  }

  const { actuals, pipeline, scenarios, overheadAllocation, healthScore, nudges } = data
  const topProjects = actuals.byProject.slice(0, 8)
  const hc = HEALTH_COLORS[healthScore.level]

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      {/* ═══ HEALTH BANNER ═══ */}
      <div className={cn('rounded-xl border p-4 shadow-lg flex items-center justify-between', hc.bg, hc.border, hc.glow)}>
        <div className="flex items-center gap-3">
          <div className={cn('w-3 h-3 rounded-full animate-pulse', healthScore.level === 'strong' ? 'bg-emerald-400' : healthScore.level === 'attention' ? 'bg-amber-400' : 'bg-red-400')} />
          <span className={cn('text-sm font-semibold', hc.text)}>{HEALTH_LABELS[healthScore.level]}</span>
          <span className="text-xs text-white/30">Score: {healthScore.score}/100</span>
        </div>
        <div className="flex gap-3">
          {healthScore.factors.map(f => (
            <span key={f.name} className={cn('text-xs px-2 py-0.5 rounded-full',
              HEALTH_COLORS[f.level].bg, HEALTH_COLORS[f.level].text,
            )}>
              {f.name}: {f.detail}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ SMART NUDGES ═══ */}
      {nudges.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {nudges.map((nudge, i) => (
            <div key={i} className={cn('text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5', NUDGE_COLORS[nudge.severity])}>
              {nudge.severity === 'critical' ? <AlertCircle className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
              {nudge.message}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Layers className="h-8 w-8 text-emerald-400" />
            Financial Overview
          </h1>
          <p className="text-white/50 mt-1">{data.fy} — everything in one view</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/finance/projects" className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            Projects P&L
          </Link>
          <Link href="/finance/pipeline-kanban" className="px-3 py-1.5 rounded-lg text-xs bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/30 transition-colors">
            Pipeline Board
          </Link>
          <Link href="/finance/board" className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            Board Report
          </Link>
          <Link href="/finance/revenue-planning" className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            Revenue Planning
          </Link>
        </div>
      </header>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 1: RIGHT NOW                        */}
      {/* ═══════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          Right Now
        </h2>

        {/* Hero cards with sparklines + deltas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Cash in Bank */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">Cash in Bank</span>
            </div>
            {actuals.cashInBank !== null ? (
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatMoney(actuals.cashInBank)}</p>
            ) : (
              <p className="text-lg text-white/30 italic">Sync pending</p>
            )}
            {actuals.receivables > 0 && (
              <p className="text-xs text-white/30 mt-1">+{formatMoney(actuals.receivables)} receivable</p>
            )}
          </div>

          {/* FY26 Revenue */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">FY26 Revenue</span>
              {actuals.sparklineData.revenue.length > 1 && (
                <Sparkline data={actuals.sparklineData.revenue} color="#4ade80" />
              )}
            </div>
            <p className="text-2xl font-bold text-green-400 tabular-nums">{formatMoney(actuals.fyRevenue)}</p>
            {actuals.monthDeltas && (
              <DeltaBadge value={actuals.monthDeltas.revenue} pct={actuals.monthDeltas.revenuePct} />
            )}
          </div>

          {/* FY26 Expenses */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">FY26 Expenses</span>
              {actuals.sparklineData.expenses.length > 1 && (
                <Sparkline data={actuals.sparklineData.expenses} color="#f87171" />
              )}
            </div>
            <p className="text-2xl font-bold text-red-400 tabular-nums">{formatMoney(actuals.fyExpenses)}</p>
            {actuals.monthDeltas && (
              <DeltaBadge value={actuals.monthDeltas.expenses} pct={actuals.monthDeltas.expensesPct} invertColor />
            )}
          </div>

          {/* Runway */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">Runway</span>
            </div>
            <p className={cn('text-2xl font-bold tabular-nums',
              actuals.runway >= 6 ? 'text-emerald-400' : actuals.runway >= 3 ? 'text-amber-400' : 'text-red-400',
            )}>
              {actuals.runway >= 999 ? '∞' : `${actuals.runway}mo`}
            </p>
            <p className="text-xs text-white/30 mt-1">
              <Flame className="h-3 w-3 inline text-orange-400" /> {formatMoney(actuals.monthlyBurn)}/mo burn
            </p>
          </div>
        </div>

        {/* Two-column: Projects + Receivables */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-medium text-white/60">Project Actuals</span>
              <Link href="/finance/projects" className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
                All projects <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-4 text-white/40 font-medium text-xs">Project</th>
                    <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Revenue</th>
                    <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Expenses</th>
                    <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Net</th>
                    <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {topProjects.map(p => (
                    <tr key={p.code} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-4">
                        <Link href={`/finance/projects/${p.code}`} className="hover:text-blue-400 transition-colors">
                          <span className="font-medium text-white text-xs">{p.code}</span>
                          <span className={cn('ml-2 text-xs px-1.5 py-0.5 rounded-full', TIER_COLORS[p.tier] || TIER_COLORS.unknown)}>
                            {p.tier}
                          </span>
                        </Link>
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums text-xs text-green-400">
                        {p.revenue > 0 ? formatMoneyCompact(p.revenue) : <span className="text-white/15">—</span>}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums text-xs text-red-400">
                        {formatMoneyCompact(Math.abs(p.expenses))}
                      </td>
                      <td className={cn('py-2 px-4 text-right tabular-nums text-xs font-medium', p.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {p.net >= 0 ? '+' : '-'}{formatMoneyCompact(p.net)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {p.budgetPct !== null ? (
                          <span className={cn('text-xs tabular-nums',
                            p.budgetPct > 100 ? 'text-red-400' : p.budgetPct > 80 ? 'text-amber-400' : 'text-blue-400',
                          )}>
                            {p.budgetPct}%
                          </span>
                        ) : (
                          <span className="text-white/15 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receivables aging */}
          <div className="glass-card p-4">
            <span className="text-sm font-medium text-white/60 block mb-3">Receivables Aging</span>
            <div className="space-y-3">
              {[
                { label: 'Current', value: actuals.receivablesAging.current, color: 'bg-emerald-500' },
                { label: '1-30 days', value: actuals.receivablesAging.overdue30, color: 'bg-amber-500' },
                { label: '31-60 days', value: actuals.receivablesAging.overdue60, color: 'bg-orange-500' },
                { label: '60+ days', value: actuals.receivablesAging.overdue90, color: 'bg-red-500' },
              ].map(bucket => (
                <div key={bucket.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/40">{bucket.label}</span>
                    <span className="text-white/70 tabular-nums">{formatMoney(bucket.value)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', bucket.color)}
                      style={{ width: `${actuals.receivables > 0 ? (bucket.value / actuals.receivables * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-white/10 flex justify-between text-xs">
                <span className="text-white/50">Total Outstanding</span>
                <span className="text-white font-medium tabular-nums">{formatMoney(actuals.receivables)}</span>
              </div>
              {actuals.payables > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Payables</span>
                  <span className="text-red-400 font-medium tabular-nums">-{formatMoney(actuals.payables)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 2: WHAT'S COMING — Pipeline         */}
      {/* ═══════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Telescope className="h-5 w-5 text-indigo-400" />
          What&apos;s Coming
          {pipeline.truncated && (
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full ml-2">
              Showing first 500 — more exist
            </span>
          )}
        </h2>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-indigo-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">Weighted Pipeline</span>
            </div>
            <p className="text-2xl font-bold text-indigo-400 tabular-nums">{formatMoney(pipeline.totalWeighted)}</p>
            <p className="text-xs text-white/30 mt-1">{pipeline.totalCount} opportunities (value x probability)</p>
          </div>

          <div className="md:col-span-2 glass-card p-4">
            <span className="text-xs text-white/40 uppercase tracking-wide mb-3 block">Pipeline by Stage</span>
            <div className="space-y-2">
              {pipeline.byStage.map(stage => {
                const maxWeighted = Math.max(...pipeline.byStage.map(s => s.weighted))
                const pct = maxWeighted > 0 ? (stage.weighted / maxWeighted) * 100 : 0
                return (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className={cn('text-xs w-20 capitalize', STAGE_TEXT[stage.stage] || 'text-white/40')}>
                      {stage.stage}
                    </span>
                    <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden relative">
                      <div
                        className={cn('h-full rounded', STAGE_COLORS[stage.stage] || 'bg-white/10')}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                      <span className="absolute right-2 top-0 h-full flex items-center text-xs text-white/50 tabular-nums">
                        {formatMoneyCompact(stage.weighted)} ({stage.count})
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Top opportunities table */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-white/60">Top Opportunities (by weighted value)</span>
            <Link href="/finance/pipeline-kanban" className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
              Pipeline board <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-4 text-white/40 font-medium text-xs">Opportunity</th>
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs">Stage</th>
                  <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Value</th>
                  <th className="text-right py-2 px-3 text-white/40 font-medium text-xs">Prob</th>
                  <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Weighted</th>
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs">Projects</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.topOpportunities.map((opp, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-4">
                      <div className="text-white text-xs font-medium max-w-[300px] truncate">{opp.title}</div>
                      {opp.source && <div className="text-white/25 text-xs">{opp.source}</div>}
                    </td>
                    <td className="py-2 px-3">
                      <span className={cn('text-xs capitalize', STAGE_TEXT[opp.stage] || 'text-white/40')}>
                        {opp.stage}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-xs text-white/60">
                      {formatMoney(opp.value)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={cn(
                        'text-xs tabular-nums px-1.5 py-0.5 rounded',
                        opp.probability >= 70 ? 'text-emerald-400 bg-emerald-500/10' :
                        opp.probability >= 40 ? 'text-amber-400 bg-amber-500/10' :
                        'text-white/40 bg-white/5',
                      )}>
                        {opp.probability}%
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-xs font-medium text-indigo-400">
                      {formatMoneyCompact(opp.weighted)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1 flex-wrap">
                        {opp.project_codes.slice(0, 3).map(code => (
                          <span key={code} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/40">{code}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ GRANTS → REVENUE ═══ */}
      {pipeline.realizedGrants && pipeline.realizedGrants.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            Grants → Revenue
          </h2>
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <span className="text-sm font-medium text-white/60">Realized grants vs recognized Xero revenue (matched by contact)</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-4 text-white/40 font-medium text-xs">Grant</th>
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs">Projects</th>
                  <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Grant Value</th>
                  <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Xero Revenue</th>
                  <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Gap</th>
                  <th className="text-center py-2 px-3 text-white/40 font-medium text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.realizedGrants.map((g, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-4 text-white text-xs font-medium max-w-[250px] truncate">{g.title}</td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1 flex-wrap">
                        {g.project_codes.map(code => (
                          <span key={code} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/40">{code}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-xs text-indigo-400">{formatMoney(g.value)}</td>
                    <td className="py-2 px-4 text-right tabular-nums text-xs text-green-400">
                      {g.recognizedRevenue > 0 ? formatMoney(g.recognizedRevenue) : <span className="text-white/15">—</span>}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-xs text-amber-400">
                      {g.gap > 0 ? formatMoney(g.gap) : <span className="text-green-400">✓</span>}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        g.status === 'reconciled' ? 'text-green-400 bg-green-500/10' :
                        g.status === 'partial' ? 'text-amber-400 bg-amber-500/10' :
                        'text-red-400 bg-red-500/10',
                      )}>
                        {g.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-white/10 flex justify-between text-xs">
              <span className="text-white/40">
                {pipeline.realizedGrants.filter(g => g.status === 'reconciled').length}/{pipeline.realizedGrants.length} reconciled
              </span>
              <span className="text-amber-400 tabular-nums">
                {formatMoney(pipeline.realizedGrants.reduce((s, g) => s + g.gap, 0))} unreconciled
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ═══ OVERHEAD ALLOCATION ═══ */}
      {overheadAllocation && overheadAllocation.byProject.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan-400" />
            Overhead Allocation
          </h2>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="glass-card p-5">
              <span className="text-xs text-white/40 uppercase tracking-wide">HQ Overhead Pool</span>
              <p className="text-2xl font-bold text-cyan-400 tabular-nums mt-1">{formatMoney(overheadAllocation.hqExpenses)}</p>
            </div>
            <div className="glass-card p-5">
              <span className="text-xs text-white/40 uppercase tracking-wide">HQ Revenue</span>
              <p className="text-2xl font-bold text-green-400 tabular-nums mt-1">{formatMoney(overheadAllocation.hqRevenue)}</p>
            </div>
            <div className="glass-card p-5">
              <span className="text-xs text-white/40 uppercase tracking-wide">Allocation Basis</span>
              <p className="text-2xl font-bold text-white/70 tabular-nums mt-1">{formatMoney(overheadAllocation.directExpenseTotal)}</p>
              <p className="text-xs text-white/30 mt-1">Total direct expenses (non-HQ)</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <span className="text-sm font-medium text-white/60">Fully-loaded project P&L</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-4 text-white/40 font-medium text-xs">Project</th>
                    <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Direct Rev</th>
                    <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Direct Exp</th>
                    <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">OH Share</th>
                    <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">OH Allocated</th>
                    <th className="text-right py-2 px-4 text-white/40 font-medium text-xs">Fully Loaded</th>
                  </tr>
                </thead>
                <tbody>
                  {overheadAllocation.byProject.map(p => (
                    <tr key={p.code} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-4">
                        <Link href={`/finance/projects/${p.code}`} className="hover:text-blue-400 transition-colors">
                          <span className="font-medium text-white text-xs">{p.code}</span>
                          <span className="text-white/30 text-xs ml-2">{p.name}</span>
                        </Link>
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums text-xs text-green-400">
                        {p.directRevenue > 0 ? formatMoneyCompact(p.directRevenue) : <span className="text-white/15">—</span>}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums text-xs text-red-400">
                        {formatMoneyCompact(Math.abs(p.directExpenses))}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums text-xs text-white/40">
                        {p.overheadShare}%
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums text-xs text-cyan-400">
                        {formatMoneyCompact(p.allocatedOverhead)}
                      </td>
                      <td className={cn('py-2 px-4 text-right tabular-nums text-xs font-medium',
                        p.fullyLoadedNet >= 0 ? 'text-emerald-400' : 'text-red-400',
                      )}>
                        {p.fullyLoadedNet >= 0 ? '+' : '-'}{formatMoneyCompact(Math.abs(p.fullyLoadedNet))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 5: WHAT IF — Scenarios + Builder    */}
      {/* ═══════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          What If
        </h2>

        {/* Static scenarios */}
        {Object.keys(scenarios).length > 0 && (
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {['conservative', 'moderate', 'aggressive'].map(key => {
              const s = scenarios[key]
              if (!s) return null
              const colors: Record<string, { border: string; text: string; label: string }> = {
                conservative: { border: 'border-blue-500/20', text: 'text-blue-400', label: 'Conservative' },
                moderate: { border: 'border-purple-500/20', text: 'text-purple-400', label: 'Moderate' },
                aggressive: { border: 'border-amber-500/20', text: 'text-amber-400', label: 'Aggressive' },
              }
              const c = colors[key] || colors.moderate
              return (
                <div key={key} className={cn('glass-card p-5 border', c.border)}>
                  <span className={cn('text-sm font-semibold', c.text)}>{c.label}</span>
                  {s.description && <p className="text-xs text-white/30 mt-1 mb-3">{s.description}</p>}
                  <div className="space-y-3 mt-3">
                    <div>
                      <span className="text-xs text-white/40">FY26 Revenue</span>
                      <p className={cn('text-xl font-bold tabular-nums', c.text)}>{formatMoney(s.fy26Total)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-white/40">FY27 Revenue</span>
                      <p className={cn('text-xl font-bold tabular-nums', c.text)}>{formatMoney(s.fy27Total)}</p>
                    </div>
                    {s.fy26Total > 0 && s.fy27Total > 0 && (
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-xs text-white/30">
                          YoY Growth: {Math.round(((s.fy27Total - s.fy26Total) / s.fy26Total) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Interactive scenario builder */}
        <ScenarioBuilder data={data} />

        {Object.keys(scenarios).length > 0 && (
          <div className="mt-3 text-center">
            <Link href="/finance/revenue-planning" className="text-xs text-white/30 hover:text-white/50 inline-flex items-center gap-1 transition-colors">
              Deep dive into revenue planning <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </section>

      {/* ═══ DATA FRESHNESS ═══ */}
      <footer className="text-center text-xs text-white/20 pb-4">
        Data as of {new Date(data.generatedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
        {data.lastSyncAt && (
          <> · Last Xero sync: {new Date(data.lastSyncAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</>
        )}
      </footer>
    </div>
  )
}
