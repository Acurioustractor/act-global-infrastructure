'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardList, ExternalLink, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionRow {
  id: string
  name: string
  description: string
  status: string
  owner: string
  priority: string
  source: string
  due: string | null
  daysUntilDue: number | null
  overdue: boolean
  url: string
  createdAt: string
  linkedDecisions: string[]
}

interface Response {
  generatedAt: string
  totals: { total: number; open: number; blocked: number; done: number; overdue: number }
  ownerRollup: Array<{ owner: string; total: number; open: number; blocked: number; overdue: number }>
  priorityRollup: Array<{ priority: string; open: number }>
  byOwner: Record<string, ActionRow[]>
  allOpen: ActionRow[]
}

const STATUS_COLORS: Record<string, string> = {
  'To do': 'border-neutral-800 bg-neutral-900 text-neutral-400',
  Doing: 'border-blue-800/60 bg-blue-950/30 text-blue-300',
  Blocked: 'border-red-800/60 bg-red-950/40 text-red-300',
  Done: 'border-emerald-800/50 bg-emerald-950/30 text-emerald-300',
  Cancelled: 'border-neutral-800 bg-neutral-950 text-neutral-600',
}
const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-900/40 text-red-300',
  High: 'bg-orange-900/40 text-orange-300',
  Medium: 'bg-yellow-900/30 text-yellow-300',
  Low: 'bg-neutral-900 text-neutral-500',
}

function formatDue(due: string | null, days: number | null, overdue: boolean): string {
  if (!due) return '—'
  if (overdue) return `${due} · T+${Math.abs(days!)}d overdue`
  if (days === 0) return `${due} · today`
  if (days! < 0) return `${due} · T+${Math.abs(days!)}d`
  return `${due} · T-${days}d`
}

export default function FinanceActionsPage() {
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)

  const { data, isLoading, error, refetch, isRefetching } = useQuery<Response>({
    queryKey: ['finance', 'actions'],
    queryFn: async () => {
      const res = await fetch('/api/finance/actions', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  function filterRow(r: ActionRow): boolean {
    if (priorityFilter && r.priority !== priorityFilter) return false
    if (sourceFilter && r.source !== sourceFilter) return false
    return true
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium uppercase tracking-wider mb-1">
              <ClipboardList size={16} /> All Open Actions
            </div>
            <h1 className="text-3xl font-semibold">Grouped by owner · sorted by priority + due</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Live from Notion Action Items DB · refreshes every 5 min · click a row to open in Notion
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-900"
            disabled={isRefetching}
          >
            <RefreshCw size={14} className={cn(isRefetching && 'animate-spin')} />
            Refresh
          </button>
        </header>

        {isLoading && <div className="text-neutral-500 text-sm">Loading…</div>}
        {error && (
          <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-300">
            Failed to load: {String((error as Error).message)}
          </div>
        )}

        {data && (
          <>
            {/* TOTALS STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Tile label="Total" value={data.totals.total} />
              <Tile label="Open" value={data.totals.open} accent="blue" />
              <Tile label="Blocked" value={data.totals.blocked} accent="red" />
              <Tile label="Overdue" value={data.totals.overdue} accent="red" />
              <Tile label="Done" value={data.totals.done} accent="green" />
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="text-neutral-500">Filter:</span>
              {data.priorityRollup.map(p => (
                <button
                  key={p.priority}
                  onClick={() => setPriorityFilter(priorityFilter === p.priority ? null : p.priority)}
                  className={cn(
                    'rounded-md px-2.5 py-1 border text-xs',
                    priorityFilter === p.priority
                      ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                      : 'border-neutral-800 hover:bg-neutral-900',
                  )}
                  disabled={p.open === 0}
                >
                  {p.priority} · {p.open}
                </button>
              ))}
              <span className="text-neutral-700 mx-1">|</span>
              {['Standard Ledger meeting', 'Cron alert', 'Friday Digest', 'Money Sync', 'Manual'].map(
                src => {
                  const count = data.allOpen.filter(r => r.source === src).length
                  if (count === 0) return null
                  return (
                    <button
                      key={src}
                      onClick={() => setSourceFilter(sourceFilter === src ? null : src)}
                      className={cn(
                        'rounded-md px-2.5 py-1 border text-xs',
                        sourceFilter === src
                          ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                          : 'border-neutral-800 hover:bg-neutral-900',
                      )}
                    >
                      {src} · {count}
                    </button>
                  )
                },
              )}
              {(priorityFilter || sourceFilter) && (
                <button
                  onClick={() => {
                    setPriorityFilter(null)
                    setSourceFilter(null)
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-300 underline ml-2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* OWNER COLUMNS */}
            <div className="space-y-6">
              {data.ownerRollup.map(rollup => {
                const items = (data.byOwner[rollup.owner] ?? []).filter(filterRow)
                if (items.length === 0) return null
                return (
                  <section key={rollup.owner}>
                    <div className="flex items-baseline gap-3 mb-2">
                      <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-300">
                        {rollup.owner}
                      </h2>
                      <span className="text-xs text-neutral-500">
                        {items.length} shown · {rollup.open} total open
                        {rollup.overdue > 0 && (
                          <span className="text-red-400 ml-2">· {rollup.overdue} overdue</span>
                        )}
                        {rollup.blocked > 0 && (
                          <span className="text-red-400 ml-2">· {rollup.blocked} blocked</span>
                        )}
                      </span>
                    </div>
                    <div className="rounded-lg border border-neutral-800 overflow-hidden divide-y divide-neutral-900">
                      {items.map(item => (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-4 py-3 hover:bg-neutral-900/40 transition"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide shrink-0',
                                PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.Medium,
                              )}
                              style={{ minWidth: '52px', textAlign: 'center' }}
                            >
                              {item.priority}
                            </span>
                            <span
                              className={cn(
                                'inline-block rounded border px-1.5 py-0.5 text-[10px] shrink-0',
                                STATUS_COLORS[item.status] ?? STATUS_COLORS['To do'],
                              )}
                              style={{ minWidth: '60px', textAlign: 'center' }}
                            >
                              {item.status}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-neutral-200">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-neutral-500 mt-1 line-clamp-2">
                                  {item.description}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 text-xs shrink-0 ml-2">
                              <span
                                className={cn(
                                  'whitespace-nowrap',
                                  item.overdue ? 'text-red-400' : 'text-neutral-500',
                                )}
                              >
                                {formatDue(item.due, item.daysUntilDue, item.overdue)}
                              </span>
                              {item.source && (
                                <span className="text-neutral-600 text-[10px] uppercase tracking-wider">
                                  {item.source}
                                </span>
                              )}
                            </div>
                            <ExternalLink size={12} className="text-neutral-700 shrink-0 mt-1" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>

            <p className="text-xs text-neutral-600">
              Generated at {new Date(data.generatedAt).toLocaleString()}. Source:{' '}
              <a
                href="https://www.notion.so/6e92d3e0b5ce479987688f7bbb584f69"
                className="underline hover:text-neutral-400"
              >
                Action Items DB
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'blue' | 'red' | 'green'
}) {
  const accentClass =
    accent === 'red'
      ? 'border-red-800/60 bg-red-950/30 text-red-300'
      : accent === 'blue'
        ? 'border-blue-800/60 bg-blue-950/30 text-blue-300'
        : accent === 'green'
          ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-300'
          : 'border-neutral-800 bg-neutral-900/40'
  return (
    <div className={cn('rounded-lg border p-3', accentClass)}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  )
}
