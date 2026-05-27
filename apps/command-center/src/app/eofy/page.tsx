'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  CalendarClock, AlertTriangle, CheckCircle2, Lock, ExternalLink, RefreshCw, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NOTION_DB_URL = 'https://www.notion.so/63cbc05e64ba4203b514beb8eb4f9445'

interface EofyTask {
  id: string; task: string; category: string; status: string; owner: string; priority: string
  due: string | null; doneDate: string | null; daysUntilDue: number | null
  overdue: boolean; blocked: boolean; done: boolean; evidence: string; source: string; url: string
}
interface BurndownPoint { date: string; ideal: number | null; actual: number | null; projected: number | null }
interface EofyData {
  generatedAt: string; cutover: string; daysToCutover: number; weeksToCutover: number
  needsConnection?: boolean; reason?: string
  totals?: { total: number; open: number; doing: number; blocked: number; done: number; overdue: number; pctComplete: number }
  byCategory?: { category: string; total: number; open: number; done: number; overdue: number }[]
  byOwner?: { owner: string; open: number; overdue: number }[]
  byPriority?: { priority: string; open: number; overdue: number }[]
  atRisk?: EofyTask[]
  allOpen?: EofyTask[]
  burndown?: BurndownPoint[]
  forecastFinish?: string | null
}

const fmtDay = (iso: string) => {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
const statusColor = (s: string) =>
  s === 'Done' ? 'text-emerald-400 bg-emerald-500/10'
  : s === 'Blocked' ? 'text-red-400 bg-red-500/10'
  : s === 'Doing' ? 'text-blue-400 bg-blue-500/10'
  : 'text-white/50 bg-white/5'
const priorityColor = (p: string) =>
  p === 'P0' ? 'text-red-300 bg-red-500/20'
  : p === 'P1' ? 'text-amber-300 bg-amber-500/20'
  : 'text-white/40 bg-white/5'

export default function EofyPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<EofyData>({
    queryKey: ['eofy'],
    queryFn: () => fetch('/api/eofy').then(r => r.json()),
    refetchOnWindowFocus: true,
  })

  const t = data?.totals
  const burndown = data?.burndown ?? []
  const forecastLate = useMemo(() => {
    if (!data?.forecastFinish || !data?.cutover) return false
    return data.forecastFinish > data.cutover
  }, [data?.forecastFinish, data?.cutover])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-red-400" /> EOFY Cutover
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Sole trader → A Curious Tractor Pty Ltd · FY ends 30 June 2026 ·{' '}
            <a href={NOTION_DB_URL} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5">
              edit in Notion <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} /> Refresh
        </button>
      </div>

      {isLoading && <div className="text-white/40 text-sm">Loading the tracker…</div>}
      {error && <div className="text-red-400 text-sm">Couldn’t load the tracker.</div>}

      {/* Needs-connection state */}
      {data?.needsConnection && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 text-amber-300 font-medium"><Lock className="h-4 w-4" /> One setup step left</div>
          <p className="text-sm text-white/70 mt-2">{data.reason}</p>
          <a href={NOTION_DB_URL} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-1 mt-3 text-sm text-blue-400 hover:underline">
            Open the EOFY Setup Tracker in Notion <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="text-xs text-white/40 mt-2">
            In Notion: open the database → ••• menu → Connections → add the command-center integration. Then hit Refresh.
          </p>
        </div>
      )}

      {/* Countdown hero */}
      {data && !data.needsConnection && (
        <>
          <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-red-500/[0.07] to-transparent p-5">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="text-5xl font-bold tabular-nums">
                  {data.daysToCutover}<span className="text-lg font-normal text-white/50 ml-2">days to 30 June</span>
                </div>
                <div className="text-sm text-white/50 mt-1">{data.weeksToCutover} weeks · Pty starts trading 1 July</div>
              </div>
              {t && (
                <div className="flex gap-3 flex-wrap">
                  <Stat label="Open" value={t.open} tone="white" />
                  <Stat label="P0 open" value={data.byPriority?.find(p => p.priority === 'P0')?.open ?? 0} tone="red" />
                  <Stat label="Overdue" value={t.overdue} tone="red" />
                  <Stat label="Blocked" value={t.blocked} tone="amber" />
                  <Stat label="Done" value={t.done} tone="emerald" />
                </div>
              )}
            </div>
            {t && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>{t.pctComplete}% complete</span><span>{t.done}/{t.total}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-500/70 rounded-full transition-all" style={{ width: `${t.pctComplete}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Burndown */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-white/70 flex items-center gap-1.5"><Clock className="h-4 w-4" /> Burndown to 30 June</h2>
              {data.forecastFinish && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full', forecastLate ? 'text-red-300 bg-red-500/15' : 'text-emerald-300 bg-emerald-500/15')}>
                  Forecast finish {fmtDay(data.forecastFinish)} {forecastLate ? '· after cutover' : '· on track'}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={burndown} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0b0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(l) => fmtDay(String(l))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#6b7280" strokeDasharray="5 4" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="actual" name="Actual remaining" stroke="#34d399" dot={false} strokeWidth={2.5} connectNulls={false} />
                <Line type="monotone" dataKey="projected" name="Projected" stroke="#f59e0b" strokeDasharray="4 4" dot={false} strokeWidth={1.5} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-white/40 mt-2">
              Actual remaining drops as you set a <span className="text-white/60">Done date</span> on tasks in Notion. Projected extends today’s burn rate to a forecast finish.
            </p>
          </div>

          {/* At risk */}
          {data.atRisk && data.atRisk.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-5">
              <h2 className="text-sm font-medium text-red-300 flex items-center gap-1.5 mb-3">
                <AlertTriangle className="h-4 w-4" /> At risk — overdue &amp; P0 ({data.atRisk.length})
              </h2>
              <ul className="space-y-2">
                {data.atRisk.map(task => <TaskRow key={task.id} task={task} />)}
              </ul>
            </div>
          )}

          {/* By category */}
          {data.byCategory && (
            <div>
              <h2 className="text-sm font-medium text-white/70 mb-3">By workstream</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.byCategory.map(c => (
                  <div key={c.category} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="text-xs text-white/50 truncate">{c.category}</div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xl font-semibold tabular-nums">{c.open}</span>
                      <span className="text-xs text-white/40">open / {c.total}</span>
                    </div>
                    <div className="flex gap-2 mt-1 text-[11px]">
                      {c.overdue > 0 && <span className="text-red-400">{c.overdue} overdue</span>}
                      {c.done > 0 && <span className="text-emerald-400">{c.done} done</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By owner */}
          {data.byOwner && data.byOwner.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-white/70 mb-3">By owner</h2>
              <div className="flex flex-wrap gap-3">
                {data.byOwner.map(o => (
                  <div key={o.owner} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm">
                    <span className="text-white/80">{o.owner}</span>
                    <span className="text-white/40 ml-2">{o.open} open</span>
                    {o.overdue > 0 && <span className="text-red-400 ml-2">{o.overdue} overdue</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All open */}
          {data.allOpen && (
            <details className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <summary className="text-sm font-medium text-white/70 cursor-pointer">All open tasks ({data.allOpen.length})</summary>
              <ul className="space-y-2 mt-3">
                {data.allOpen.map(task => <TaskRow key={task.id} task={task} />)}
              </ul>
            </details>
          )}

          <p className="text-xs text-white/30">
            Source of truth: the EOFY Setup Tracker in Notion. Generated {new Date(data.generatedAt).toLocaleString('en-AU')}.
          </p>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'white' | 'red' | 'amber' | 'emerald' }) {
  const color = tone === 'red' ? 'text-red-400' : tone === 'amber' ? 'text-amber-400' : tone === 'emerald' ? 'text-emerald-400' : 'text-white'
  return (
    <div className="text-center min-w-[56px]">
      <div className={cn('text-2xl font-semibold tabular-nums', color)}>{value}</div>
      <div className="text-[11px] text-white/40">{label}</div>
    </div>
  )
}

function TaskRow({ task }: { task: EofyTask }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className={cn('shrink-0 mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded', priorityColor(task.priority))}>{task.priority}</span>
      <div className="flex-1 min-w-0">
        <a href={task.url} target="_blank" rel="noreferrer" className="text-white/90 hover:text-white hover:underline inline-flex items-center gap-1">
          {task.done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
          {task.task}
        </a>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/40 flex-wrap">
          <span className={cn('px-1.5 py-0.5 rounded', statusColor(task.status))}>{task.status}</span>
          <span>{task.category}</span>
          <span>· {task.owner}</span>
          {task.due && (
            <span className={cn(task.overdue ? 'text-red-400' : '')}>
              · due {fmtDay(task.due)}{task.overdue && task.daysUntilDue != null ? ` (${Math.abs(task.daysUntilDue)}d overdue)` : ''}
            </span>
          )}
        </div>
        {task.evidence && <div className="text-[11px] text-white/30 mt-0.5 line-clamp-1">{task.evidence}</div>}
      </div>
    </li>
  )
}
