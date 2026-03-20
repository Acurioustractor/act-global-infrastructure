'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  BarChart3,
  Calculator,
  Flame,
  Building2,
  FileText,
  ShieldCheck,
  DollarSign,
  PieChart,
  Share2,
  Check,
  Loader2,
} from 'lucide-react'
import { DonutChart, BarChart, AreaChart } from '@tremor/react'
import {
  getRunwayData,
  getRdTracking,
  getBookkeepingProgress,
  getSubscriptionsSummary,
  getCashflowExplained,
  getSpendingByProject,
} from '@/lib/api'
import { FolderKanban, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toFixed(0)}`
}

function runwayColor(months: number) {
  if (months >= 12) return 'text-green-400'
  if (months >= 6) return 'text-yellow-400'
  if (months >= 3) return 'text-orange-400'
  return 'text-red-400'
}

export default function BoardReportPage() {
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle')

  async function handleShare() {
    setShareState('loading')
    try {
      const res = await fetch('/api/finance/board-token', { method: 'POST' })
      const data = await res.json()
      await navigator.clipboard.writeText(data.url)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 3000)
    } catch {
      setShareState('idle')
    }
  }

  const { data: runway } = useQuery({
    queryKey: ['board', 'runway'],
    queryFn: getRunwayData,
  })

  const { data: rdData } = useQuery({
    queryKey: ['board', 'rd-tracking'],
    queryFn: getRdTracking,
  })

  const { data: progress } = useQuery({
    queryKey: ['board', 'bookkeeping'],
    queryFn: getBookkeepingProgress,
  })

  const { data: subscriptions } = useQuery({
    queryKey: ['board', 'subscriptions'],
    queryFn: getSubscriptionsSummary,
  })

  const { data: cashflow } = useQuery({
    queryKey: ['board', 'cashflow'],
    queryFn: getCashflowExplained,
  })

  const { data: projectSpending } = useQuery({
    queryKey: ['board', 'spending', 12],
    queryFn: () => getSpendingByProject(12),
  })

  const { data: studioData } = useQuery({
    queryKey: ['board', 'studio-economics'],
    queryFn: () => fetch('/api/finance/projects').then(r => r.json()),
  })

  const summary = progress?.summary

  // Cashflow chart data
  const cashflowChartData = (cashflow?.months || []).map((m: any) => ({
    month: m.month,
    Income: m.income,
    Expenses: Math.abs(m.expenses),
    'Net Cash': m.net,
  }))

  // Project spending for donut chart
  const projectDonutData = (projectSpending?.projects || [])
    .slice(0, 8)
    .map((p: any) => ({
      name: p.name || p.code,
      value: Math.abs(p.total),
    }))

  // Revenue sources for donut
  const revenueDonutData = (runway?.revenueSources || []).map((r: any) => ({
    name: r.source,
    value: r.amount,
  }))

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/finance" className="text-white/40 hover:text-white/80 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Building2 className="h-8 w-8 text-indigo-400" />
                Board Financial Report
              </h1>
              <p className="text-lg text-white/60 mt-1">
                Strategic overview — {new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              disabled={shareState === 'loading'}
              className="btn-glass flex items-center gap-2 border-indigo-500/30"
            >
              {shareState === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : shareState === 'copied' ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {shareState === 'copied' ? 'Link Copied' : 'Share'}
            </button>
            <Link href="/finance" className="btn-glass flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Operator View
            </Link>
            <Link href="/finance/accountant" className="btn-glass flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Accountant View
            </Link>
          </div>
        </div>
      </header>

      {/* Executive Summary — Big Numbers */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-5">
          <p className="text-sm text-white/50 mb-1">Cash Position</p>
          <p className="text-2xl font-bold text-white">
            {formatMoney(runway?.currentBalance || 0)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <p className="text-xs text-white/40">
              {formatMoney(runway?.unrestrictedFunds || 0)} unrestricted
            </p>
          </div>
        </div>

        <div className="glass-card p-5">
          <p className="text-sm text-white/50 mb-1">Monthly Burn</p>
          <p className="text-2xl font-bold text-red-400">
            {formatMoney(runway?.burnRate || 0)}
          </p>
          <p className="text-xs text-white/40">6-month rolling average</p>
        </div>

        <div className="glass-card p-5">
          <p className="text-sm text-white/50 mb-1">Runway</p>
          <p className={cn('text-2xl font-bold', runwayColor(runway?.runwayMonths || 0))}>
            {runway?.runwayMonths?.toFixed(1) || '—'} months
          </p>
          <p className="text-xs text-white/40">at current burn rate</p>
        </div>

        <div className="glass-card p-5">
          <p className="text-sm text-white/50 mb-1">Total Income</p>
          <p className="text-2xl font-bold text-green-400">
            {formatMoney(summary?.totalIncome || 0)}
          </p>
          <p className="text-xs text-white/40">all time</p>
        </div>

        <div className="glass-card p-5">
          <p className="text-sm text-white/50 mb-1">R&D Offset</p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatMoney(rdData?.offset43pct?.combined || 0)}
          </p>
          <p className="text-xs text-white/40">43.5% refundable</p>
        </div>
      </div>

      {/* Row 2: Cashflow Trend + Revenue Diversification */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Cashflow Trend (2/3 width) */}
        <div className="glass-card p-6 col-span-2">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Cash Flow Trend
          </h2>

          {cashflowChartData.length > 0 ? (
            <AreaChart
              className="h-64"
              data={cashflowChartData}
              index="month"
              categories={['Income', 'Expenses']}
              colors={['emerald', 'red']}
              valueFormatter={(v: number) => formatMoney(v)}
              showAnimation
              showLegend
              curveType="monotone"
            />
          ) : (
            <div className="animate-pulse h-64 bg-white/5 rounded-lg" />
          )}
        </div>

        {/* Revenue Diversification */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-purple-400" />
            Revenue Mix
          </h2>

          <div className="text-center mb-4">
            <p className="text-sm text-white/50">Diversification Index</p>
            <p className={cn(
              'text-3xl font-bold',
              (runway?.diversificationIndex || 0) >= 50 ? 'text-green-400' :
              (runway?.diversificationIndex || 0) >= 30 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {runway?.diversificationIndex || 0}%
            </p>
            <p className="text-xs text-white/40">0 = concentrated, 100 = diversified</p>
          </div>

          {revenueDonutData.length > 0 ? (
            <DonutChart
              className="h-40"
              data={revenueDonutData}
              category="value"
              index="name"
              valueFormatter={(v: number) => formatMoney(v)}
              colors={['emerald', 'blue', 'amber', 'purple', 'cyan']}
              showAnimation
            />
          ) : (
            <div className="animate-pulse h-40 bg-white/5 rounded-lg" />
          )}
        </div>
      </div>

      {/* Row 3: P&L by Project + R&D Summary */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Spending by Project */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-amber-400" />
            Spend by Project (12 Months)
          </h2>

          {projectDonutData.length > 0 ? (
            <>
              <DonutChart
                className="h-52"
                data={projectDonutData}
                category="value"
                index="name"
                valueFormatter={(v: number) => formatMoney(v)}
                colors={['blue', 'emerald', 'amber', 'purple', 'cyan', 'rose', 'indigo', 'lime']}
                showAnimation
              />
              <div className="mt-4 space-y-2">
                {projectDonutData.slice(0, 6).map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-white/70">{p.name}</span>
                    <span className="text-white font-mono">{formatMoney(p.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-2">
                  <span className="text-white">Total</span>
                  <span className="text-white font-mono">
                    {formatMoney(projectSpending?.total || 0)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="animate-pulse h-52 bg-white/5 rounded-lg" />
          )}
        </div>

        {/* R&D Eligible Spend */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            R&D Tax Incentive
          </h2>

          {rdData ? (
            <div className="space-y-6">
              {/* FY Comparison */}
              <div className="grid grid-cols-2 gap-4">
                {['FY2024-25', 'FY2025-26'].map(fy => {
                  const spend = rdData.spendByFY?.[fy] || {}
                  const offset = fy === 'FY2024-25' ? rdData.offset43pct?.fy2425 : rdData.offset43pct?.fy2526
                  return (
                    <div key={fy} className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-white/50 mb-3">{fy}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Software</span>
                          <span className="text-white font-mono">{formatMoney(spend.software || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Hardware</span>
                          <span className="text-white font-mono">{formatMoney(spend.hardware || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Travel</span>
                          <span className="text-white font-mono">{formatMoney(spend.travel || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Operations</span>
                          <span className="text-white font-mono">{formatMoney(spend.operations || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-2">
                          <span className="text-white">Total R&D</span>
                          <span className="text-white font-mono">{formatMoney(spend.total || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm bg-emerald-500/10 rounded p-2 mt-2">
                          <span className="text-emerald-300">43.5% Offset</span>
                          <span className="text-emerald-400 font-bold font-mono">{formatMoney(offset || 0)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* R&D by Project */}
              {rdData.spendByProject && rdData.spendByProject.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white/70 mb-3">R&D Spend by Project</h3>
                  <div className="space-y-2">
                    {rdData.spendByProject.slice(0, 6).map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm text-white/70 w-32 truncate">{p.name || p.code}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(p.rdPct || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/50 w-12 text-right">{p.rdPct}%</span>
                        <span className="text-sm font-mono text-white w-20 text-right">{formatMoney(p.rdSpend)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white/5 rounded-lg" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Subscriptions + Grant Cliffs */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Subscription Summary */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-orange-400" />
            Subscription Burn
          </h2>

          {subscriptions ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-1">Monthly Total</p>
                  <p className="text-xl font-bold text-orange-400">
                    {formatMoney(subscriptions.total_monthly_aud || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-1">Annual Total</p>
                  <p className="text-xl font-bold text-white">
                    {formatMoney(subscriptions.total_yearly_aud || 0)}
                  </p>
                </div>
              </div>

              {subscriptions.byCategory && (
                <BarChart
                  className="h-40"
                  data={Object.entries(subscriptions.byCategory || {}).map(([cat, val]: [string, any]) => ({
                    category: cat,
                    Amount: typeof val === 'number' ? val : val?.total || 0,
                  }))}
                  index="category"
                  categories={['Amount']}
                  colors={['orange']}
                  valueFormatter={(v: number) => formatMoney(v)}
                  showAnimation
                />
              )}

              <p className="text-xs text-white/40">
                {subscriptions.count || 0} active subscriptions
              </p>
            </div>
          ) : (
            <div className="animate-pulse h-48 bg-white/5 rounded-lg" />
          )}
        </div>

        {/* Grant Funding Cliffs */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-400" />
            Funding Cliffs & Pipeline
          </h2>

          {runway ? (
            <div className="space-y-4">
              {/* Grant cliffs */}
              {runway.grantCliffs && runway.grantCliffs.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm text-white/50">Expiring Funding</h3>
                  {runway.grantCliffs.slice(0, 5).map((g: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div>
                        <p className="text-sm text-white/80">{g.name}</p>
                        <p className="text-xs text-white/40">{g.projectCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-white">{formatMoney(g.amount)}</p>
                        <p className={cn(
                          'text-xs',
                          g.daysRemaining < 90 ? 'text-red-400' :
                          g.daysRemaining < 180 ? 'text-yellow-400' : 'text-white/40'
                        )}>
                          {g.daysRemaining}d remaining
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/40">No active grant funding tracked</p>
              )}

              {/* Fundraising pipeline */}
              {runway.fundraisingPipeline && runway.fundraisingPipeline.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-sm text-white/50 mb-2">Fundraising Pipeline</h3>
                  <div className="space-y-2">
                    {runway.fundraisingPipeline.slice(0, 5).map((f: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'w-2 h-2 rounded-full',
                            f.status === 'pledged' ? 'bg-green-400' :
                            f.status === 'proposal' ? 'bg-blue-400' :
                            f.status === 'cultivation' ? 'bg-yellow-400' :
                            'bg-white/30'
                          )} />
                          <span className="text-white/70 truncate">{f.name}</span>
                        </div>
                        <span className="text-white font-mono">{formatMoney(f.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scenario projections */}
              {runway.scenarios && runway.scenarios.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-sm text-white/50 mb-2">Runway Scenarios</h3>
                  <div className="space-y-2">
                    {runway.scenarios.map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-white/5 rounded p-2">
                        <span className="text-white/70">{s.name}</span>
                        <span className={cn('font-bold', runwayColor(s.runwayMonths))}>
                          {s.runwayMonths >= 999 ? 'Sustainable' : `${s.runwayMonths} months`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-white/5 rounded-lg" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Studio Economics — Project Contribution Margins */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-green-400" />
            Studio Economics — FY26 YTD
          </h2>
          <Link href="/finance/projects" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
            View all projects <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {studioData?.projects ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-white/50 font-medium">Project</th>
                  <th className="text-left py-2 px-2 text-white/50 font-medium">Tier</th>
                  <th className="text-right py-2 px-3 text-white/50 font-medium">Revenue</th>
                  <th className="text-right py-2 px-3 text-white/50 font-medium">Cost</th>
                  <th className="text-right py-2 px-3 text-white/50 font-medium">Net</th>
                  <th className="text-right py-2 px-3 text-white/50 font-medium">Margin</th>
                  <th className="text-right py-2 px-3 text-white/50 font-medium">R&D Offset</th>
                  <th className="text-right py-2 px-3 text-white/50 font-medium">Net + R&D</th>
                </tr>
              </thead>
              <tbody>
                {(studioData.projects as any[]).slice(0, 10).map((p: any) => {
                  const rdOffset = Math.round((p.rdSpend || 0) * 0.435)
                  const netWithRd = p.net + rdOffset
                  return (
                    <tr key={p.code} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3">
                        <Link href={`/finance/projects/${p.code}`} className="text-white hover:text-blue-400 transition-colors font-medium">
                          {p.code}
                        </Link>
                        <span className="text-white/30 text-xs ml-2">{p.name}</span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded',
                          p.tier === 'ecosystem' ? 'text-purple-400 bg-purple-500/20' :
                          p.tier === 'studio' ? 'text-blue-400 bg-blue-500/20' :
                          'text-white/40 bg-white/10'
                        )}>
                          {p.tier}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-green-400">
                        {p.revenue > 0 ? formatMoney(p.revenue) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-red-400">
                        {formatMoney(Math.abs(p.expenses))}
                      </td>
                      <td className={cn('py-2 px-3 text-right tabular-nums font-medium', p.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {p.net >= 0 ? '+' : ''}{formatMoney(p.net)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {p.revenue > 0 ? (
                          <span className={cn('text-xs font-medium',
                            p.net >= 0 ? 'text-emerald-400' : p.net > -p.revenue ? 'text-amber-400' : 'text-red-400'
                          )}>
                            {Math.round((p.net / p.revenue) * 100)}%
                          </span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-lime-400/70">
                        {rdOffset > 0 ? `+${formatMoney(rdOffset)}` : <span className="text-white/20">—</span>}
                      </td>
                      <td className={cn('py-2 px-3 text-right tabular-nums font-semibold', netWithRd >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {netWithRd >= 0 ? '+' : ''}{formatMoney(netWithRd)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/20 bg-white/5">
                  <td className="py-2 px-3 font-semibold text-white" colSpan={2}>TOTALS</td>
                  <td className="py-2 px-3 text-right tabular-nums font-semibold text-green-400">
                    {formatMoney(studioData.totals?.revenue || 0)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-semibold text-red-400">
                    {formatMoney(Math.abs(studioData.totals?.expenses || 0))}
                  </td>
                  <td className={cn('py-2 px-3 text-right tabular-nums font-semibold',
                    (studioData.totals?.net || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {(studioData.totals?.net || 0) >= 0 ? '+' : ''}{formatMoney(studioData.totals?.net || 0)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-xs font-medium">
                    {(studioData.totals?.revenue || 0) > 0 ? (
                      <span className={(studioData.totals?.net || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {Math.round(((studioData.totals?.net || 0) / (studioData.totals?.revenue || 1)) * 100)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-semibold text-lime-400/70">
                    +{formatMoney(Math.round((studioData.totals?.rdSpend || 0) * 0.435))}
                  </td>
                  <td className={cn('py-2 px-3 text-right tabular-nums font-bold', {
                    'text-emerald-400': (studioData.totals?.net || 0) + Math.round((studioData.totals?.rdSpend || 0) * 0.435) >= 0,
                    'text-red-400': (studioData.totals?.net || 0) + Math.round((studioData.totals?.rdSpend || 0) * 0.435) < 0,
                  })}>
                    {((studioData.totals?.net || 0) + Math.round((studioData.totals?.rdSpend || 0) * 0.435)) >= 0 ? '+' : ''}
                    {formatMoney((studioData.totals?.net || 0) + Math.round((studioData.totals?.rdSpend || 0) * 0.435))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="animate-pulse h-48 bg-white/5 rounded-lg" />
        )}
      </div>

      {/* Footer: Report Generated */}
      <div className="text-center text-xs text-white/30 mt-8">
        Report generated {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        {' '}— Data from Xero, Supabase, and pipeline tracking
      </div>
    </div>
  )
}
