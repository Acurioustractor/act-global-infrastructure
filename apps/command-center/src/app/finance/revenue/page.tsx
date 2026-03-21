'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  BarChart3,
  DollarSign,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'

// --- Types ---

interface RevenueStream {
  id: string
  name: string
  code: string
  category: string
  color: string | null
  targetMonthly: number
}

interface ScenarioData {
  id: string
  name: string
  description: string | null
  assumptions: Record<string, unknown> | null
  yearlyTotals: Record<number, { total: number; streams: Record<string, number> }>
}

interface MonthlyActual {
  total: number
  byProject: Record<string, number>
}

interface RevenueModelResponse {
  streams: RevenueStream[]
  scenarios: ScenarioData[]
  timeline: {
    months: string[]
    actuals: Record<string, MonthlyActual>
  }
  stats: {
    avgMonthlyRevenue: number
    fyTotal: number
    fyLabel: string
    totalStreams: number
  }
}

const STREAM_COLORS = [
  'bg-emerald-400', 'bg-blue-400', 'bg-amber-400', 'bg-purple-400',
  'bg-pink-400', 'bg-cyan-400', 'bg-orange-400', 'bg-indigo-400',
]
const STREAM_TEXT_COLORS = [
  'text-emerald-400', 'text-blue-400', 'text-amber-400', 'text-purple-400',
  'text-pink-400', 'text-cyan-400', 'text-orange-400', 'text-indigo-400',
]

function formatMonth(ym: string) {
  const [y, m] = ym.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`
}

function isCurrentMonth(ym: string) {
  const now = new Date()
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return ym === current
}

function isPastMonth(ym: string) {
  const now = new Date()
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return ym < current
}

export default function RevenueSequencingPage() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)

  const { data, isLoading } = useQuery<RevenueModelResponse>({
    queryKey: ['finance', 'revenue-model'],
    queryFn: () => fetch('/api/finance/revenue-model').then(r => r.json()),
    staleTime: 30_000,
  })

  const streams = data?.streams || []
  const scenarios = data?.scenarios || []
  const timeline = data?.timeline
  const stats = data?.stats

  // Auto-select "moderate" scenario or first
  const activeScenario = useMemo(() => {
    if (!scenarios.length) return null
    if (selectedScenario) return scenarios.find(s => s.id === selectedScenario) || scenarios[0]
    return scenarios.find(s => s.name.toLowerCase().includes('moderate')) || scenarios[0]
  }, [scenarios, selectedScenario])

  // Max actual for chart scaling
  const maxMonthly = useMemo(() => {
    if (!timeline) return 1
    return Math.max(
      1,
      ...Object.values(timeline.actuals).map(a => a.total),
      ...streams.map(s => s.targetMonthly || 0)
    )
  }, [timeline, streams])

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <TrendingUp className="h-10 w-10 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading revenue model...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-purple-400" />
            Revenue Sequencing
          </h1>
          <span className="text-sm text-white/30">{streams.length} streams</span>
        </div>
      </header>

      {/* Hero Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Avg Monthly</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatMoneyCompact(stats.avgMonthlyRevenue)}</p>
            <p className="text-xs text-white/30">Last 6 months average</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">{stats.fyLabel} Total</span>
            </div>
            <p className="text-2xl font-bold text-blue-400 tabular-nums">{formatMoney(stats.fyTotal)}</p>
            <p className="text-xs text-white/30">Year to date actual</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Streams</span>
            </div>
            <p className="text-2xl font-bold text-purple-400 tabular-nums">{stats.totalStreams}</p>
            <p className="text-xs text-white/30">Revenue streams defined</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Monthly Target</span>
            </div>
            <p className="text-2xl font-bold text-amber-400 tabular-nums">
              {formatMoneyCompact(streams.reduce((s, st) => s + (st.targetMonthly || 0), 0))}
            </p>
            <p className="text-xs text-white/30">Combined target</p>
          </div>
        </div>
      )}

      {/* Revenue Streams */}
      {streams.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Revenue Streams</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {streams.map((stream, idx) => (
              <div key={stream.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('w-2 h-2 rounded-full', STREAM_COLORS[idx % STREAM_COLORS.length])} />
                  <span className="text-sm text-white/80 font-medium truncate">{stream.name}</span>
                </div>
                <p className={cn('text-lg font-bold tabular-nums', STREAM_TEXT_COLORS[idx % STREAM_TEXT_COLORS.length])}>
                  {stream.targetMonthly > 0 ? formatMoneyCompact(stream.targetMonthly) : '$0'}
                  <span className="text-xs text-white/20 font-normal">/mo</span>
                </p>
                <p className="text-[10px] text-white/20 capitalize">{stream.category}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Timeline */}
      {timeline && (
        <div className="glass-card p-4 mb-6 overflow-x-auto">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Monthly Revenue Timeline</p>

          <div className="min-w-[800px]">
            {/* Bar chart */}
            <div className="flex items-end gap-1 h-40 mb-2">
              {timeline.months.map(month => {
                const actual = timeline.actuals[month]
                const total = actual?.total || 0
                const barHeight = maxMonthly > 0 ? Math.max(1, (total / maxMonthly) * 100) : 0
                const isCurrent = isCurrentMonth(month)
                const isPast = isPastMonth(month)

                return (
                  <div key={month} className="flex-1 flex flex-col items-center justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                      <div className="bg-black/90 border border-white/20 rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap">
                        <p className="font-medium">{formatMonth(month)}</p>
                        <p className="tabular-nums">{formatMoney(total)}</p>
                        {actual?.byProject && Object.entries(actual.byProject).length > 0 && (
                          <div className="mt-0.5 pt-0.5 border-t border-white/10">
                            {Object.entries(actual.byProject)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 5)
                              .map(([code, amt]) => (
                                <p key={code} className="text-white/50">
                                  {code}: {formatMoneyCompact(amt)}
                                </p>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bar */}
                    <div
                      className={cn(
                        'w-full rounded-t transition-all',
                        isPast
                          ? 'bg-emerald-400/60'
                          : isCurrent
                            ? 'bg-emerald-400 shadow-lg shadow-emerald-400/20'
                            : 'bg-white/10',
                        total === 0 && 'bg-white/5'
                      )}
                      style={{ height: `${barHeight}%`, minHeight: total > 0 ? '4px' : '2px' }}
                    />
                  </div>
                )
              })}
            </div>

            {/* Month labels */}
            <div className="flex gap-1">
              {timeline.months.map(month => (
                <div
                  key={month}
                  className={cn(
                    'flex-1 text-center text-[9px] tabular-nums',
                    isCurrentMonth(month) ? 'text-emerald-400 font-bold' : 'text-white/20'
                  )}
                >
                  {formatMonth(month)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scenario Comparison */}
      {scenarios.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-white/40 uppercase tracking-wider">Scenario Projections</p>
            <div className="flex gap-1">
              {scenarios.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedScenario(s.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs transition-colors border capitalize',
                    (activeScenario?.id === s.id)
                      ? 'bg-white/15 border-white/20 text-white'
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {activeScenario && (
            <>
              {activeScenario.description && (
                <p className="text-xs text-white/30 mb-3">{activeScenario.description}</p>
              )}

              {/* Year-by-year table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-[10px] text-white/30 uppercase tracking-wider py-2 pr-4">Year</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider py-2 px-3">Total</th>
                      {streams.map((s, idx) => (
                        <th key={s.id} className={cn('text-right text-[10px] uppercase tracking-wider py-2 px-3', STREAM_TEXT_COLORS[idx % STREAM_TEXT_COLORS.length] + '/50')}>
                          {s.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(activeScenario.yearlyTotals)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([year, data]) => (
                        <tr key={year} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-2 pr-4 text-white/60 font-medium">{year}</td>
                          <td className="py-2 px-3 text-right text-white/80 tabular-nums font-bold">
                            {formatMoneyCompact(data.total)}
                          </td>
                          {streams.map((s, idx) => {
                            const val = data.streams[s.name] || 0
                            return (
                              <td key={s.id} className={cn('py-2 px-3 text-right tabular-nums', val > 0 ? STREAM_TEXT_COLORS[idx % STREAM_TEXT_COLORS.length] + '/70' : 'text-white/10')}>
                                {val > 0 ? formatMoneyCompact(val) : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Assumptions */}
              {activeScenario.assumptions && Object.keys(activeScenario.assumptions).length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Assumptions</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(activeScenario.assumptions).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="text-white/30 capitalize">{key.replace(/_/g, ' ')}: </span>
                        <span className="text-white/60">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Cross-links */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <Link
          href="/finance/revenue-planning"
          className="text-xs text-purple-400/60 hover:text-purple-400 transition-colors"
        >
          10-Year Revenue Planning →
        </Link>
        <Link
          href="/finance/pipeline"
          className="text-xs text-indigo-400/60 hover:text-indigo-400 transition-colors"
        >
          Pipeline Confidence →
        </Link>
        <Link
          href="/finance/invoices"
          className="text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors"
        >
          Invoice Command →
        </Link>
      </div>
    </div>
  )
}
