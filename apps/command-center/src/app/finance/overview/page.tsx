'use client'

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
  Telescope,
  BarChart3,
  Layers,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(Math.abs(n)).toLocaleString()}`
  return `$${Math.abs(n).toFixed(0)}`
}

function formatMoneyCompact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(Math.abs(n) / 1000).toFixed(0)}K`
  return `$${Math.abs(n).toFixed(0)}`
}

interface OverviewData {
  actuals: {
    fyRevenue: number
    fyExpenses: number
    fyNet: number
    receivables: number
    payables: number
    monthlyBurn: number
    runway: number
    receivablesAging: { current: number; overdue30: number; overdue60: number; overdue90: number }
    byProject: Array<{
      code: string; name: string; tier: string
      revenue: number; expenses: number; net: number; budgetPct: number | null
    }>
  }
  pipeline: {
    totalWeighted: number
    totalCount: number
    byStage: Array<{ stage: string; count: number; value: number; weighted: number; avgProb: number }>
    topOpportunities: Array<{
      title: string; value: number; probability: number; weighted: number
      stage: string; project_codes: string[]; expected_close: string | null; source: string
    }>
    byProject: Array<{ code: string; weighted: number; count: number }>
    realizedGrants: Array<{
      title: string; value: number; project_codes: string[]; source: string
      recognizedRevenue: number; gap: number; status: 'reconciled' | 'partial' | 'unreconciled'
    }>
  }
  scenarios: Record<string, { fy26Total: number; fy27Total: number; description: string; assumptions: Record<string, unknown> }>
  overheadAllocation: {
    hqExpenses: number
    hqRevenue: number
    directExpenseTotal: number
    byProject: Array<{
      code: string; name: string; directExpenses: number; directRevenue: number
      overheadShare: number; allocatedOverhead: number; fullyLoadedNet: number
    }>
  }
  fy: string
}

const STAGE_COLORS: Record<string, string> = {
  identified: 'bg-white/10',
  researching: 'bg-blue-500/30',
  pursuing: 'bg-indigo-500/40',
  submitted: 'bg-purple-500/50',
  shortlisted: 'bg-amber-500/50',
  realized: 'bg-green-500/50',
  won: 'bg-emerald-500/60',
}

const STAGE_TEXT: Record<string, string> = {
  identified: 'text-white/40',
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

export default function FinanceOverview() {
  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ['finance', 'overview'],
    queryFn: () => fetch('/api/finance/overview').then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40">Loading financial overview...</div>
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

  const { actuals, pipeline, scenarios, overheadAllocation } = data
  const topProjects = actuals.byProject.slice(0, 8)

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Layers className="h-8 w-8 text-emerald-400" />
            Financial Overview
          </h1>
          <p className="text-white/50 mt-1">{data.fy} — everything in one view</p>
        </div>
        <div className="flex gap-2">
          <Link href="/finance/projects" className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            Projects P&L
          </Link>
          <Link href="/finance/pipeline-kanban" className="px-3 py-1.5 rounded-lg text-xs bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/30 transition-colors">
            Pipeline Board
          </Link>
          <Link href="/finance/pipeline-viz" className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            Pipeline Viz
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
      {/* SECTION 1: RIGHT NOW — Current Position     */}
      {/* ═══════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          Right Now
        </h2>

        {/* Hero cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">FY26 Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-400 tabular-nums">{formatMoney(actuals.fyRevenue)}</p>
            {actuals.receivables > 0 && (
              <p className="text-xs text-white/30 mt-1">+{formatMoney(actuals.receivables)} receivable</p>
            )}
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">FY26 Expenses</span>
            </div>
            <p className="text-2xl font-bold text-red-400 tabular-nums">{formatMoney(actuals.fyExpenses)}</p>
            {actuals.payables > 0 && (
              <p className="text-xs text-white/30 mt-1">{formatMoney(actuals.payables)} payable</p>
            )}
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">Monthly Burn</span>
            </div>
            <p className="text-2xl font-bold text-orange-400 tabular-nums">{formatMoney(actuals.monthlyBurn)}</p>
            <p className="text-xs text-white/30 mt-1">avg over completed months</p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">Net Position</span>
            </div>
            <p className={cn('text-2xl font-bold tabular-nums', actuals.fyNet >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {actuals.fyNet >= 0 ? '+' : '-'}{formatMoney(actuals.fyNet)}
            </p>
            <p className="text-xs text-white/30 mt-1">revenue - expenses YTD</p>
          </div>
        </div>

        {/* Two-column: Projects + Receivables */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Projects mini-table */}
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
                          <span className={cn(
                            'text-xs tabular-nums',
                            p.budgetPct > 100 ? 'text-red-400' : p.budgetPct > 80 ? 'text-amber-400' : 'text-blue-400'
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
        </h2>

        {/* Pipeline hero + funnel */}
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-indigo-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">Weighted Pipeline</span>
            </div>
            <p className="text-2xl font-bold text-indigo-400 tabular-nums">{formatMoney(pipeline.totalWeighted)}</p>
            <p className="text-xs text-white/30 mt-1">{pipeline.totalCount} opportunities (value x probability)</p>
          </div>

          {/* Stage funnel */}
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
            <Link href="/opportunities" className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
              All opportunities <ChevronRight className="h-3 w-3" />
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
                        'text-white/40 bg-white/5'
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

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 2b: GRANTS → REVENUE RECONCILIATION  */}
      {/* ═══════════════════════════════════════════ */}
      {pipeline.realizedGrants && pipeline.realizedGrants.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            Grants → Revenue
          </h2>
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <span className="text-sm font-medium text-white/60">Realized grants vs recognized Xero revenue</span>
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
                        'text-red-400 bg-red-500/10'
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

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 4: OVERHEAD ALLOCATION               */}
      {/* ═══════════════════════════════════════════ */}
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
              <p className="text-xs text-white/30 mt-1">ACT-HQ total expenses</p>
            </div>
            <div className="glass-card p-5">
              <span className="text-xs text-white/40 uppercase tracking-wide">HQ Revenue</span>
              <p className="text-2xl font-bold text-green-400 tabular-nums mt-1">{formatMoney(overheadAllocation.hqRevenue)}</p>
              <p className="text-xs text-white/30 mt-1">Consulting &amp; services through HQ</p>
            </div>
            <div className="glass-card p-5">
              <span className="text-xs text-white/40 uppercase tracking-wide">Allocation Basis</span>
              <p className="text-2xl font-bold text-white/70 tabular-nums mt-1">{formatMoney(overheadAllocation.directExpenseTotal)}</p>
              <p className="text-xs text-white/30 mt-1">Total direct expenses (non-HQ)</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <span className="text-sm font-medium text-white/60">Fully-loaded project P&L (direct + proportional HQ overhead)</span>
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
                        {formatMoneyCompact(p.directExpenses)}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums text-xs text-white/40">
                        {p.overheadShare}%
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums text-xs text-cyan-400">
                        {formatMoneyCompact(p.allocatedOverhead)}
                      </td>
                      <td className={cn('py-2 px-4 text-right tabular-nums text-xs font-medium',
                        p.fullyLoadedNet >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {p.fullyLoadedNet >= 0 ? '+' : '-'}{formatMoneyCompact(p.fullyLoadedNet)}
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
      {/* SECTION 5: WHAT IF — Scenarios               */}
      {/* ═══════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          What If
        </h2>

        {Object.keys(scenarios).length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {['conservative', 'moderate', 'aggressive'].map(key => {
              const s = scenarios[key]
              if (!s) return null
              const colors: Record<string, { border: string; text: string; bg: string; label: string }> = {
                conservative: { border: 'border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Conservative' },
                moderate: { border: 'border-purple-500/20', text: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Moderate' },
                aggressive: { border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Aggressive' },
              }
              const c = colors[key] || colors.moderate
              return (
                <div key={key} className={cn('glass-card p-5 border', c.border)}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn('text-sm font-semibold', c.text)}>{c.label}</span>
                  </div>
                  {s.description && (
                    <p className="text-xs text-white/30 mb-3">{s.description}</p>
                  )}
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-white/40">FY26 Revenue</span>
                      <p className={cn('text-xl font-bold tabular-nums', c.text)}>{formatMoney(s.fy26Total)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-white/40">FY27 Revenue</span>
                      <p className={cn('text-xl font-bold tabular-nums', c.text)}>{formatMoney(s.fy27Total)}</p>
                    </div>
                    {s.fy26Total > 0 && (
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-xs text-white/30">
                          YoY Growth: {s.fy27Total > 0 ? `${Math.round(((s.fy27Total - s.fy26Total) / s.fy26Total) * 100)}%` : 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <BarChart3 className="h-8 w-8 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No scenarios configured yet.</p>
            <Link href="/finance/revenue-planning" className="text-xs text-purple-400 hover:text-purple-300 mt-2 inline-flex items-center gap-1">
              Set up revenue planning <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {Object.keys(scenarios).length > 0 && (
          <div className="mt-3 text-center">
            <Link href="/finance/revenue-planning" className="text-xs text-white/30 hover:text-white/50 inline-flex items-center gap-1 transition-colors">
              Deep dive into revenue planning <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
