'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Activity, Zap, DollarSign, Clock, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LoadingPage } from '@/components/ui/loading'
import { useState } from 'react'

interface UsageData {
  summary: {
    totalCalls: number
    totalCost: number
    totalTokens: number
    days: number
    periodStart: string
  }
  byModel: Array<{
    model: string
    calls: number
    inputTokens: number
    outputTokens: number
    cost: number
    avgLatency: number
  }>
  byDay: Array<{
    date: string
    calls: number
    cost: number
    tokens: number
  }>
  byScript: Array<{
    script: string
    calls: number
    cost: number
  }>
  recentCalls: Array<{
    model: string
    inputTokens: number
    outputTokens: number
    cost: number
    latencyMs: number
    source: string
    time: string
  }>
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// Simple bar for visual representation
function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-2 w-full rounded-full bg-white/5">
      <div className={cn('h-2 rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function UsagePage() {
  const [days, setDays] = useState(30)

  const { data, isLoading } = useQuery<UsageData>({
    queryKey: ['system-usage', days],
    queryFn: () => fetch(`/api/system/usage?days=${days}`).then(r => r.json()),
    refetchInterval: 60_000,
  })

  if (isLoading) return <LoadingPage />

  if (!data) {
    return (
      <div className="min-h-screen p-8">
        <p className="text-white/40">No usage data available</p>
      </div>
    )
  }

  const maxDayCost = Math.max(...data.byDay.map(d => d.cost), 0.01)
  const maxModelCost = Math.max(...data.byModel.map(m => m.cost), 0.01)

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart className="h-8 w-8 text-emerald-400" />
              AI Usage
            </h1>
            <p className="text-lg text-white/60 mt-1">
              Agent costs, tokens, and latency
            </p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  days === d
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Total Cost</p>
              <p className="text-2xl font-bold text-white">{formatCost(data.summary.totalCost)}</p>
            </div>
          </div>
          <p className="text-xs text-white/30">Last {data.summary.days} days</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">API Calls</p>
              <p className="text-2xl font-bold text-white">{data.summary.totalCalls.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-white/30">
            {data.summary.totalCalls > 0
              ? `${(data.summary.totalCost / data.summary.totalCalls).toFixed(3)}/call avg`
              : 'No calls'}
          </p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Tokens</p>
              <p className="text-2xl font-bold text-white">{formatTokens(data.summary.totalTokens)}</p>
            </div>
          </div>
          <p className="text-xs text-white/30">Input + output combined</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Models</p>
              <p className="text-2xl font-bold text-white">{data.byModel.length}</p>
            </div>
          </div>
          <p className="text-xs text-white/30">
            {data.byModel[0]?.model || 'None'} most used
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Cost by Day */}
        <div className="col-span-8">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-cyan-400" />
              Daily Spend
            </h2>
            {data.byDay.length === 0 ? (
              <p className="text-white/40 text-center py-8">No data for this period</p>
            ) : (
              <div className="space-y-1.5">
                {data.byDay.slice(-14).map(day => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-xs text-white/40 w-20 shrink-0 font-mono">
                      {day.date.slice(5)}
                    </span>
                    <div className="flex-1">
                      <Bar value={day.cost} max={maxDayCost} color="bg-emerald-500" />
                    </div>
                    <span className="text-xs text-white/60 w-14 text-right font-mono">
                      {formatCost(day.cost)}
                    </span>
                    <span className="text-xs text-white/30 w-10 text-right">
                      {day.calls}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* By Model */}
        <div className="col-span-4">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Bot className="h-5 w-5 text-purple-400" />
              By Model
            </h2>
            <div className="space-y-4">
              {data.byModel.map(m => (
                <div key={m.model}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium truncate">{m.model}</span>
                    <span className="text-sm text-emerald-400 font-mono">{formatCost(m.cost)}</span>
                  </div>
                  <Bar value={m.cost} max={maxModelCost} color="bg-purple-500" />
                  <div className="flex gap-3 mt-1 text-[10px] text-white/30">
                    <span>{m.calls} calls</span>
                    <span>{formatTokens(m.inputTokens)} in</span>
                    <span>{formatTokens(m.outputTokens)} out</span>
                    <span>{m.avgLatency}ms avg</span>
                  </div>
                </div>
              ))}
              {data.byModel.length === 0 && (
                <p className="text-white/40 text-center py-4">No model data</p>
              )}
            </div>
          </div>

          {/* By Source */}
          <div className="glass-card p-6 mt-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-orange-400" />
              By Source
            </h2>
            <div className="space-y-2">
              {data.byScript.slice(0, 10).map(s => (
                <div key={s.script} className="flex items-center justify-between">
                  <span className="text-sm text-white/70 truncate">{s.script}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/30">{s.calls}</span>
                    <span className="text-xs text-emerald-400 font-mono w-14 text-right">{formatCost(s.cost)}</span>
                  </div>
                </div>
              ))}
              {data.byScript.length === 0 && (
                <p className="text-white/40 text-center py-4">No source data</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div className="mt-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-blue-400" />
            Recent Calls
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/10">
                  <th className="pb-2 text-left font-medium">Time</th>
                  <th className="pb-2 text-left font-medium">Model</th>
                  <th className="pb-2 text-left font-medium">Source</th>
                  <th className="pb-2 text-right font-medium">In</th>
                  <th className="pb-2 text-right font-medium">Out</th>
                  <th className="pb-2 text-right font-medium">Cost</th>
                  <th className="pb-2 text-right font-medium">Latency</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCalls.map((call, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 text-white/40 text-xs">{timeAgo(call.time)}</td>
                    <td className="py-2">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-medium',
                        call.model?.includes('haiku') ? 'bg-blue-500/20 text-blue-400' :
                        call.model?.includes('sonnet') ? 'bg-purple-500/20 text-purple-400' :
                        'bg-white/10 text-white/60'
                      )}>
                        {call.model?.split('-').slice(-2).join('-') || 'unknown'}
                      </span>
                    </td>
                    <td className="py-2 text-white/60 text-xs">{call.source}</td>
                    <td className="py-2 text-right text-white/40 font-mono text-xs">{formatTokens(call.inputTokens)}</td>
                    <td className="py-2 text-right text-white/40 font-mono text-xs">{formatTokens(call.outputTokens)}</td>
                    <td className="py-2 text-right text-emerald-400 font-mono text-xs">{formatCost(call.cost)}</td>
                    <td className="py-2 text-right text-white/30 font-mono text-xs">
                      {call.latencyMs ? `${(call.latencyMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                  </tr>
                ))}
                {data.recentCalls.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-white/40">No recent calls</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
