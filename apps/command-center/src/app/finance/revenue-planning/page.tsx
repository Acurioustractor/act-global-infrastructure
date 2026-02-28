'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  ChevronLeft,
  BarChart3,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RevenueStream {
  id: string
  name: string
  code: string
  category: string
  color: string | null
  target_monthly: number
}

interface Scenario {
  id: string
  name: string
  description: string | null
  assumptions: Record<string, any>
  annual_targets: Record<string, number>
  yearlyTotals: Record<number, { total: number; streams: Record<string, number> }>
}

interface RevenueScenarioData {
  scenarios: Scenario[]
  streams: RevenueStream[]
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toLocaleString('en-AU')}`
}

const scenarioColors: Record<string, string> = {
  conservative: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  moderate: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  aggressive: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
}

const scenarioBarColors: Record<string, string> = {
  conservative: 'bg-blue-500/60',
  moderate: 'bg-emerald-500/60',
  aggressive: 'bg-purple-500/60',
}

const streamColors = [
  'bg-blue-400', 'bg-emerald-400', 'bg-amber-400',
  'bg-purple-400', 'bg-rose-400', 'bg-cyan-400',
  'bg-orange-400', 'bg-indigo-400',
]

export default function RevenuePlanningPage() {
  const [selectedScenario, setSelectedScenario] = useState<string>('moderate')
  const [compareMode, setCompareMode] = useState(false)

  const { data, isLoading } = useQuery<RevenueScenarioData>({
    queryKey: ['revenue-scenarios'],
    queryFn: () => fetch('/api/finance/revenue-scenarios').then(r => r.json()),
  })

  const scenarios = data?.scenarios || []
  const streams = data?.streams || []

  const active = scenarios.find(s => s.name === selectedScenario)
  const years = useMemo(() => {
    if (!active?.yearlyTotals) return []
    return Object.keys(active.yearlyTotals)
      .map(Number)
      .sort()
  }, [active])

  // Calculate max value across all scenarios for chart scaling
  const maxValue = useMemo(() => {
    let max = 0
    for (const s of scenarios) {
      for (const [, yt] of Object.entries(s.yearlyTotals || {})) {
        if (yt.total > max) max = yt.total
      }
    }
    return max || 1_000_000
  }, [scenarios])

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-white">Revenue Planning</h1>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 glass-card rounded-lg animate-pulse bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  if (scenarios.length === 0) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/finance" className="text-white/40 hover:text-white/60">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            Revenue Planning
          </h1>
        </div>
        <div className="glass-card p-12 text-center">
          <BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Revenue Scenarios Yet</h2>
          <p className="text-white/50 max-w-md mx-auto">
            Run <code className="bg-white/10 px-2 py-0.5 rounded text-sm">node scripts/build-revenue-scenarios.mjs</code> to generate
            Conservative, Moderate, and Aggressive 10-year projections from your current revenue streams.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/finance" className="text-white/40 hover:text-white/60">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            10-Year Revenue Planning
          </h1>
        </div>
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={cn(
            'px-4 py-2 text-sm rounded-lg transition-colors',
            compareMode ? 'bg-white/10 text-white' : 'bg-white/5 text-white/50 hover:text-white/70'
          )}
        >
          <Layers className="w-4 h-4 inline-block mr-2" />
          {compareMode ? 'Single View' : 'Compare All'}
        </button>
      </div>

      {/* Scenario Selector */}
      {!compareMode && (
        <div className="flex gap-4">
          {scenarios.map(s => {
            const colors = scenarioColors[s.name] || 'text-white/60 bg-white/5 border-white/10'
            const firstYear = Object.keys(s.yearlyTotals || {})[0]
            const lastYear = Object.keys(s.yearlyTotals || {}).pop()
            const firstTotal = firstYear ? s.yearlyTotals[Number(firstYear)]?.total || 0 : 0
            const lastTotal = lastYear ? s.yearlyTotals[Number(lastYear)]?.total || 0 : 0
            const growth = firstTotal > 0 ? ((lastTotal / firstTotal - 1) * 100) : 0

            return (
              <button
                key={s.id}
                onClick={() => setSelectedScenario(s.name)}
                className={cn(
                  'flex-1 glass-card p-5 rounded-lg border-2 transition-all text-left',
                  selectedScenario === s.name ? colors : 'border-transparent opacity-50 hover:opacity-75'
                )}
              >
                <h3 className="text-lg font-semibold text-white capitalize">{s.name}</h3>
                {s.description && <p className="text-white/40 text-xs mt-1">{s.description}</p>}
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <p className="text-white/40 text-xs">Year 10</p>
                    <p className="text-white font-bold text-lg">{formatCompact(lastTotal)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {growth > 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                    )}
                    <span className={cn('text-sm font-medium', growth > 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {growth.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Chart — Compare Mode */}
      {compareMode && (
        <div className="glass-card p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-4">Scenario Comparison</h2>
          <div className="space-y-1">
            {years.map(year => {
              return (
                <div key={year} className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-12 shrink-0 tabular-nums">{year}</span>
                  <div className="flex-1 flex gap-1">
                    {scenarios.map(s => {
                      const total = s.yearlyTotals?.[year]?.total || 0
                      const pct = (total / maxValue) * 100
                      const barColor = scenarioBarColors[s.name] || 'bg-white/20'
                      return (
                        <div key={s.id} className="flex-1 group relative">
                          <div
                            className={cn('h-6 rounded-sm transition-all', barColor)}
                            style={{ width: `${pct}%` }}
                          />
                          <div className="absolute hidden group-hover:block -top-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/20 rounded px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                            {s.name}: {formatCurrency(total)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 shrink-0">
                    {scenarios.map(s => (
                      <span key={s.id} className={cn('text-xs tabular-nums w-16 text-right', scenarioColors[s.name]?.split(' ')[0] || 'text-white/40')}>
                        {formatCompact(s.yearlyTotals?.[year]?.total || 0)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-4 justify-end">
            {scenarios.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-sm', scenarioBarColors[s.name])} />
                <span className="text-xs text-white/50 capitalize">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stacked bar chart — Single Scenario */}
      {!compareMode && active && years.length > 0 && (
        <div className="glass-card p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Annual Revenue by Stream — <span className="capitalize">{active.name}</span>
          </h2>
          <div className="space-y-2">
            {years.map(year => {
              const yt = active.yearlyTotals[year]
              if (!yt) return null
              const total = yt.total
              const streamEntries = Object.entries(yt.streams).sort((a, b) => b[1] - a[1])

              return (
                <div key={year} className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-12 shrink-0 tabular-nums">{year}</span>
                  <div className="flex-1 flex h-8 rounded-md overflow-hidden bg-white/5">
                    {streamEntries.map(([name, val], i) => {
                      const pct = total > 0 ? (val / maxValue) * 100 : 0
                      return (
                        <div
                          key={name}
                          className={cn('h-full transition-all group relative', streamColors[i % streamColors.length])}
                          style={{ width: `${pct}%` }}
                          title={`${name}: ${formatCurrency(val)}`}
                        >
                          <div className="absolute hidden group-hover:block -top-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/20 rounded px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                            {name}: {formatCurrency(val)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <span className="text-sm text-white/70 w-20 text-right tabular-nums shrink-0">
                    {formatCompact(total)}
                  </span>
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-4 flex-wrap">
            {streams.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-sm', streamColors[i % streamColors.length])} />
                <span className="text-xs text-white/50">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annual Totals Table */}
      {!compareMode && active && years.length > 0 && (
        <div className="glass-card rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                <th className="text-left p-3">Year</th>
                {streams.map(s => (
                  <th key={s.id} className="text-right p-3">{s.name}</th>
                ))}
                <th className="text-right p-3 font-bold">Total</th>
                <th className="text-right p-3">YoY Growth</th>
              </tr>
            </thead>
            <tbody>
              {years.map((year, yi) => {
                const yt = active.yearlyTotals[year]
                if (!yt) return null
                const prevYt = yi > 0 ? active.yearlyTotals[years[yi - 1]] : null
                const growth = prevYt && prevYt.total > 0
                  ? ((yt.total / prevYt.total - 1) * 100)
                  : null

                return (
                  <tr key={year} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3 text-white/70 font-medium tabular-nums">{year}</td>
                    {streams.map(s => (
                      <td key={s.id} className="p-3 text-right text-white/60 text-sm tabular-nums">
                        {formatCompact(yt.streams[s.name] || 0)}
                      </td>
                    ))}
                    <td className="p-3 text-right text-white font-bold tabular-nums">
                      {formatCurrency(yt.total)}
                    </td>
                    <td className="p-3 text-right">
                      {growth !== null ? (
                        <span className={cn(
                          'text-sm',
                          growth > 0 ? 'text-emerald-400' : growth < 0 ? 'text-red-400' : 'text-white/40'
                        )}>
                          {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-white/20">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assumptions */}
      {!compareMode && active?.assumptions && Object.keys(active.assumptions).length > 0 && (
        <div className="glass-card p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-3">Assumptions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(active.assumptions).map(([key, value]) => (
              <div key={key} className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-white font-medium mt-1">
                  {typeof value === 'number' && value < 1 ? `${(value * 100).toFixed(0)}%` : String(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Revenue Streams */}
      <div className="glass-card p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-amber-400" />
          Current Revenue Streams
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {streams.map((s, i) => (
            <div key={s.id} className="bg-white/5 rounded-lg p-4 flex items-start gap-3">
              <div className={cn('w-3 h-3 rounded-sm mt-1 shrink-0', streamColors[i % streamColors.length])} />
              <div>
                <p className="text-white font-medium text-sm">{s.name}</p>
                <p className="text-white/40 text-xs capitalize">{s.category}</p>
                <p className="text-emerald-400 text-sm mt-1">
                  {formatCurrency(Number(s.target_monthly))}/mo
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
