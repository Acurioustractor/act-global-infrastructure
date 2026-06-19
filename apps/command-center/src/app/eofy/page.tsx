'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Copy,
  CircleDollarSign,
  FileText,
  Filter,
  GitBranch,
  Landmark,
  Link2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Split,
  TimerReset,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  CriticalPathItem,
  EofyCommandResponse,
  MoneyRunSheetItem,
  MoneyRoute,
  SourceReference,
  Tone,
} from '@/lib/eofy/types'

type RangeMode = 'today' | 'week' | 'workstream'
type FilterKey = 'P0' | 'P1' | 'Blocked'

async function fetchCommand(): Promise<EofyCommandResponse> {
  const res = await fetch('/api/eofy/command')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load ACT Business Command')
  return data
}

function fmtDay(iso: string | null) {
  if (!iso) return 'No date'
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function fmtLongDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sourceById(sources: SourceReference[]) {
  return sources.reduce<Record<string, SourceReference>>((acc, source) => {
    acc[source.id] = source
    return acc
  }, {})
}

function toneClass(tone: Tone) {
  switch (tone) {
    case 'good': return 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200'
    case 'warn': return 'border-amber-500/25 bg-amber-500/[0.08] text-amber-200'
    case 'bad': return 'border-red-500/25 bg-red-500/[0.08] text-red-200'
    case 'info': return 'border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-200'
    default: return 'border-white/10 bg-white/[0.03] text-white/75'
  }
}

function compactToneText(tone: Tone) {
  switch (tone) {
    case 'good': return 'text-emerald-300'
    case 'warn': return 'text-amber-300'
    case 'bad': return 'text-red-300'
    case 'info': return 'text-cyan-300'
    default: return 'text-white/70'
  }
}

function statusClass(status: string) {
  if (status === 'Done') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
  if (status === 'Blocked') return 'bg-red-500/15 text-red-300 border-red-500/25'
  if (status === 'Doing') return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25'
  if (status === 'Open' || status === 'To do') return 'bg-amber-500/15 text-amber-300 border-amber-500/25'
  return 'bg-white/[0.06] text-white/55 border-white/10'
}

function confidenceClass(confidence: string) {
  if (confidence === 'queried') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
  if (confidence === 'needs SL confirmation') return 'bg-amber-500/10 text-amber-300 border-amber-500/20'
  if (confidence === 'scenario') return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
  return 'bg-white/[0.06] text-white/50 border-white/10'
}

function openTarget(href?: string) {
  if (href) window.open(href, '_blank', 'noopener,noreferrer')
}

function itemTarget(item: CriticalPathItem, source?: SourceReference) {
  return item.url ?? source?.href
}

function phaseLabel(phase: MoneyRunSheetItem['phase']) {
  return phase === 'talk-through' ? 'Talk-through' : 'Actualise'
}

function buildMoneyRunSheetTsv(rows: MoneyRunSheetItem[], sources: Record<string, SourceReference>) {
  const headers = [
    'Date',
    'Phase',
    'Move',
    'From',
    'To',
    'Amount',
    'Owner',
    'Status',
    'Confidence',
    'Required before move',
    'Evidence',
    'Source',
  ]
  const values = rows.map(row => [
    fmtLongDay(row.date),
    phaseLabel(row.phase),
    row.move,
    row.from,
    row.to,
    row.amount,
    row.owner,
    row.status,
    row.confidence,
    row.requiredBeforeMove.join('; '),
    row.evidence.join('; '),
    sources[row.sourceId]?.label ?? row.sourceId,
  ])
  return [headers, ...values].map(cols => cols.join('\t')).join('\n')
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall back for embedded browsers that expose clipboard but block writes.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-1000px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  return copied
}

export default function EofyPage() {
  const [rangeMode, setRangeMode] = useState<RangeMode>('week')
  const [filters, setFilters] = useState<FilterKey[]>(['P0'])

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['eofy-command'],
    queryFn: fetchCommand,
    refetchOnWindowFocus: true,
  })

  const sources = useMemo(() => sourceById(data?.sources ?? []), [data?.sources])
  const filteredCriticalPath = useMemo(() => {
    const rows = data?.criticalPath ?? []
    return rows.filter(item => {
      const inRange =
        rangeMode === 'workstream' ||
        (rangeMode === 'today' ? item.daysUntilDue != null && item.daysUntilDue <= 0 : item.daysUntilDue == null || item.daysUntilDue <= 7)
      const hasFilter =
        filters.length === 0 ||
        filters.some(filter => filter === item.priority || (filter === 'Blocked' && item.status === 'Blocked'))
      return inRange && hasFilter
    })
  }, [data?.criticalPath, filters, rangeMode])

  const workstreamRows = data?.tracker.byCategory ?? []
  const sourceBacked = data && !data.needsConnection

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 text-white sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">FY26 close</span>
            <span className="rounded border border-red-500/20 bg-red-500/[0.06] px-2 py-1">30 Jun 2026</span>
            <span className="rounded border border-emerald-500/20 bg-emerald-500/[0.06] px-2 py-1">Pty starts 1 Jul</span>
            <span className={cn('rounded border px-2 py-1', sourceBacked ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-200' : 'border-amber-500/20 bg-amber-500/[0.06] text-amber-200')}>
              {sourceBacked ? 'source-backed' : 'source check needed'}
            </span>
          </div>
          <h1 className="mt-3 flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Landmark className="h-7 w-7 text-cyan-200" />
            {data?.title ?? 'ACT Business Command'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
            {data?.subtitle ?? 'Loading EOFY command surface...'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={data?.notionUrl ?? 'https://www.notion.so/63cbc05e64ba4203b514beb8eb4f9445'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 hover:bg-white/[0.08]"
          >
            <Link2 className="h-3.5 w-3.5" />
            edit in Notion
          </a>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 hover:bg-white/[0.08]"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-white/45">
          Loading the command cockpit...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/[0.06] p-5 text-sm text-red-200">
          Could not load ACT Business Command.
        </div>
      )}

      {data?.needsConnection && (
        <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
            <Lock className="h-4 w-4" />
            Notion status is not connected
          </div>
          <p className="mt-2 text-sm text-white/65">{data.reason}</p>
          <p className="mt-1 text-xs text-white/40">
            The cockpit still shows the repo-backed plan, but live task counts and row statuses need the Notion tracker.
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-5">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {data.metrics.map(metric => (
              <div key={metric.id} className={cn('rounded-lg border p-4', toneClass(metric.tone))}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">{metric.label}</p>
                  <span className={cn('rounded border px-1.5 py-0.5 text-[10px]', confidenceClass(metric.confidence))}>
                    {metric.confidence}
                  </span>
                </div>
                <p className={cn('mt-3 text-3xl font-semibold tabular-nums tracking-tight', compactToneText(metric.tone))}>
                  {metric.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/50">{metric.detail}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
            <div className="rounded-lg border border-white/10 bg-white/[0.025]">
              <div className="border-b border-white/10 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-white/85">
                      <TimerReset className="h-4 w-4 text-red-200" />
                      Critical path
                    </h2>
                    <p className="mt-1 text-xs text-white/45">
                      Click a row to open its Notion task where available, otherwise its source document.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['today', 'week', 'workstream'] as RangeMode[]).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setRangeMode(mode)}
                        className={cn(
                          'rounded border px-2.5 py-1.5 text-xs capitalize',
                          rangeMode === mode ? 'border-cyan-500/35 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white/75',
                        )}
                      >
                        {mode === 'workstream' ? 'By workstream' : mode}
                      </button>
                    ))}
                    {(['P0', 'P1', 'Blocked'] as FilterKey[]).map(filter => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setFilters(current => current.includes(filter) ? current.filter(f => f !== filter) : [...current, filter])}
                        className={cn(
                          'inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs',
                          filters.includes(filter) ? 'border-amber-500/35 bg-amber-500/15 text-amber-200' : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white/75',
                        )}
                      >
                        <Filter className="h-3 w-3" />
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div>
                  <div className="grid grid-cols-[minmax(180px,1.25fr)_minmax(75px,0.7fr)_70px_minmax(190px,1.55fr)_minmax(90px,0.7fr)] gap-3 border-b border-white/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
                    <span>Step</span>
                    <span>Owner</span>
                    <span>Due</span>
                    <span>Why</span>
                    <span>Status</span>
                  </div>
                  {filteredCriticalPath.map(item => {
                    const source = sources[item.sourceId]
                    const href = itemTarget(item, source)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openTarget(href)}
                        disabled={!href}
                        className="grid w-full grid-cols-[minmax(180px,1.25fr)_minmax(75px,0.7fr)_70px_minmax(190px,1.55fr)_minmax(90px,0.7fr)] gap-3 border-b border-white/[0.06] px-4 py-3 text-left transition last:border-b-0 hover:bg-white/[0.04] disabled:cursor-default"
                      >
                        <span>
                          <span className="flex items-center gap-2 text-sm font-medium text-white/90">
                            <span className={cn('h-2 w-2 rounded-full', item.tone === 'bad' ? 'bg-red-400' : item.tone === 'warn' ? 'bg-amber-400' : item.tone === 'good' ? 'bg-emerald-400' : 'bg-cyan-300')} />
                            {item.step}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-white/35">
                            <span>{item.priority}</span>
                            <span>{item.category}</span>
                            <span>{source?.label ?? item.sourceId}</span>
                          </span>
                        </span>
                        <span className="text-xs leading-5 text-white/60">{item.owner}</span>
                        <span className={cn('text-xs tabular-nums leading-5', item.daysUntilDue != null && item.daysUntilDue < 0 ? 'text-red-300' : 'text-white/60')}>
                          {fmtDay(item.due)}
                          {item.daysUntilDue != null && <span className="block text-[11px] text-white/35">{item.daysUntilDue < 0 ? `${Math.abs(item.daysUntilDue)}d late` : `${item.daysUntilDue}d`}</span>}
                        </span>
                        <span className="text-xs leading-5 text-white/55">{item.why}</span>
                        <span>
                          <span className={cn('inline-flex rounded border px-2 py-1 text-[11px] font-medium', statusClass(item.status))}>
                            {item.status}
                          </span>
                          <span className={cn('mt-1 block w-fit rounded border px-1.5 py-0.5 text-[10px]', confidenceClass(item.confidence))}>
                            {item.confidence}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                  {filteredCriticalPath.length === 0 && (
                    <div className="px-4 py-8 text-sm text-white/45">
                      No rows match the current filters.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DecisionQueue data={data} sources={sources} />
          </section>

          <MoneyRunSheet rows={data.moneyRunSheet} sources={sources} />

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <MoneyRoutes routes={data.moneyRoutes} sources={sources} />
            <RdWindow data={data} sources={sources} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <EntityMap data={data} sources={sources} />
            <SourceRail data={data} />
          </section>

          <footer className="flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <span>Generated {fmtDateTime(data.generatedAt)}. Notion remains the editable task source.</span>
            <span>{data.disclaimer}</span>
          </footer>
        </div>
      )}
    </main>
  )
}

function DecisionQueue({ data, sources }: { data: EofyCommandResponse; sources: Record<string, SourceReference> }) {
  return (
    <aside className="rounded-lg border border-white/10 bg-white/[0.025]">
      <div className="border-b border-white/10 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white/85">
          <Split className="h-4 w-4 text-amber-200" />
          Decision queue
        </h2>
        <p className="mt-1 text-xs text-white/45">The decisions that change the mechanics underneath the task table.</p>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {data.decisions.map(decision => {
          const source = sources[decision.sourceId]
          return (
            <a
              key={decision.id}
              href={source?.href ?? data.notionUrl}
              target="_blank"
              rel="noreferrer"
              className="block p-4 transition hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-medium text-white/90">{decision.title}</h3>
                <span className={cn('shrink-0 rounded border px-2 py-1 text-[11px]', statusClass(decision.status))}>{decision.status}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/55">{decision.decision}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/35">
                <span>{decision.owner}</span>
                <span>due {fmtDay(decision.due)}</span>
                <span>{source?.label ?? decision.sourceId}</span>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-amber-200/75">{decision.why}</p>
            </a>
          )
        })}
      </div>
    </aside>
  )
}

function MoneyRunSheet({ rows, sources }: { rows: MoneyRunSheetItem[]; sources: Record<string, SourceReference> }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const rowsByDate = useMemo(() => {
    return rows.reduce<Record<string, MoneyRunSheetItem[]>>((acc, row) => {
      acc[row.date] = [...(acc[row.date] ?? []), row]
      return acc
    }, {})
  }, [rows])
  const dates = Object.keys(rowsByDate).sort()

  async function copyForNotion() {
    const copied = await copyText(buildMoneyRunSheetTsv(rows, sources))
    setCopyState(copied ? 'copied' : 'failed')
    window.setTimeout(() => setCopyState('idle'), 1800)
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.025]">
      <div className="border-b border-white/10 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white/85">
              <ClipboardList className="h-4 w-4 text-emerald-200" />
              Money movement run sheet
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-white/45">
              Monday is for alignment and go/no-go calls. Tuesday is for only the rows that are green-lit. Account labels stay high level; bank details belong in Notion, Xero, and the bank.
            </p>
          </div>
          <button
            type="button"
            onClick={copyForNotion}
            className="inline-flex w-fit items-center gap-1.5 rounded border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/[0.12]"
          >
            {copyState === 'copied' ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copyState === 'copied' ? 'Copied for Notion' : copyState === 'failed' ? 'Copy failed' : 'Copy Notion table'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-2">
        {dates.map(date => {
          const dayRows = rowsByDate[date]
          const phase = dayRows[0]?.phase ?? 'talk-through'
          return (
            <div key={date} className="rounded-lg border border-white/[0.08] bg-black/10">
              <div className="border-b border-white/[0.08] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">{phaseLabel(phase)}</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{fmtLongDay(date)}</h3>
                  </div>
                  <span className={cn(
                    'rounded border px-2 py-1 text-[11px]',
                    phase === 'talk-through' ? 'border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-200' : 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200',
                  )}>
                    {phase === 'talk-through' ? 'no unscheduled transfers' : 'green rows only'}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {dayRows.map((row, index) => {
                  const source = sources[row.sourceId]
                  return (
                    <article key={row.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-medium text-white/55">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-white/90">{row.move}</h4>
                              <p className="mt-1 text-xs leading-5 text-white/50">
                                <span className="text-white/35">From</span> {row.from}
                                <span className="px-1.5 text-white/20">-&gt;</span>
                                <span className="text-white/35">To</span> {row.to}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-1.5">
                              <span className={cn('rounded border px-2 py-1 text-[11px]', statusClass(row.status))}>{row.status}</span>
                              <span className={cn('rounded border px-2 py-1 text-[11px]', confidenceClass(row.confidence))}>{row.confidence}</span>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <div className="rounded border border-white/[0.06] bg-white/[0.025] p-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">Amount</p>
                              <p className="mt-1 text-xs font-medium text-white/80">{row.amount}</p>
                            </div>
                            <div className="rounded border border-white/[0.06] bg-white/[0.025] p-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">Owner</p>
                              <p className="mt-1 text-xs font-medium text-white/70">{row.owner}</p>
                            </div>
                            <div className="rounded border border-white/[0.06] bg-white/[0.025] p-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">Source</p>
                              <p className="mt-1 text-xs font-medium text-white/70">{source?.label ?? row.sourceId}</p>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">Required before move</p>
                              <ul className="mt-1.5 space-y-1">
                                {row.requiredBeforeMove.map(item => (
                                  <li key={item} className="flex gap-2 text-xs leading-5 text-white/55">
                                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-300/80" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">Evidence to attach</p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {row.evidence.map(item => (
                                  <span key={item} className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/50">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MoneyRoutes({ routes, sources }: { routes: MoneyRoute[]; sources: Record<string, SourceReference> }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white/85">
            <CircleDollarSign className="h-4 w-4 text-emerald-200" />
            Money movement
          </h2>
          <p className="mt-1 text-xs text-white/45">Two different mechanisms, shown separately so the $100K routes do not blur.</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {routes.map(route => {
          const source = sources[route.sourceId]
          return (
            <article key={route.id} className="rounded-lg border border-white/[0.08] bg-black/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">{route.founder}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{route.amount}</h3>
                </div>
                <span className={cn('rounded border px-2 py-1 text-[11px]', confidenceClass(route.confidence))}>{route.confidence}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/65">{route.route}</p>
              <div className="mt-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">Mechanics</p>
                <ul className="mt-2 space-y-1.5">
                  {route.mechanics.map(item => (
                    <li key={item} className="flex gap-2 text-xs leading-5 text-white/55">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 rounded border border-amber-500/15 bg-amber-500/[0.05] p-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-200/80">Cautions</p>
                <ul className="mt-2 space-y-1">
                  {route.cautions.map(item => (
                    <li key={item} className="text-xs leading-5 text-white/55">{item}</li>
                  ))}
                </ul>
              </div>
              {source?.href && (
                <a href={source.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-200 hover:text-cyan-100">
                  Source <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RdWindow({ data, sources }: { data: EofyCommandResponse; sources: Record<string, SourceReference> }) {
  const rd = data.rdWindow
  const source = sources[rd.sourceId]
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white/85">
            <ShieldCheck className="h-4 w-4 text-cyan-200" />
            {rd.title}
          </h2>
          <p className="mt-1 text-xs text-white/45">{rd.period}</p>
        </div>
        <span className={cn('rounded border px-2 py-1 text-[11px]', confidenceClass(rd.confidence))}>{rd.confidence}</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/[0.08] bg-black/10 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">Eligible basis</p>
          <p className="mt-2 text-2xl font-semibold text-white">{rd.basis}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-200/70">Potential refund</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-200">{rd.refund}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {rd.timeline.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3">
            <div className="flex flex-col items-center">
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold', toneClass(item.tone))}>{index + 1}</span>
              {index < rd.timeline.length - 1 && <span className="h-full w-px bg-white/10" />}
            </div>
            <div className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-white/90">{item.label}</h3>
                <span className={cn('rounded border px-1.5 py-0.5 text-[10px]', toneClass(item.tone))}>{item.status}</span>
              </div>
              <p className="mt-1 text-xs text-white/35">{item.dateRange}</p>
              <p className="mt-2 text-xs leading-5 text-white/55">{item.note}</p>
            </div>
          </div>
        ))}
      </div>

      {source?.href && (
        <a href={source.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-200 hover:text-cyan-100">
          Source <ArrowUpRight className="h-3 w-3" />
        </a>
      )}
    </section>
  )
}

function EntityMap({ data, sources }: { data: EofyCommandResponse; sources: Record<string, SourceReference> }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white/85">
          <GitBranch className="h-4 w-4 text-cyan-200" />
          Entity map
        </h2>
        <p className="mt-1 text-xs text-white/45">Current state plus pending branches. Nothing here treats Butterfly as a simple share-owned subsidiary.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.entityMap.nodes.map(node => {
          const source = sources[node.sourceId]
          return (
            <a
              key={node.id}
              href={source?.href ?? '#'}
              target={source?.href ? '_blank' : undefined}
              rel={source?.href ? 'noreferrer' : undefined}
              className={cn('rounded-lg border p-4 transition hover:bg-white/[0.04]', toneClass(node.tone))}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white/90">{node.label}</h3>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/35" />
              </div>
              <p className="mt-2 text-xs leading-5 text-white/55">{node.role}</p>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">{node.status}</p>
            </a>
          )
        })}
      </div>
      <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/10 p-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">Relationships</p>
        <div className="grid gap-2 md:grid-cols-2">
          {data.entityMap.edges.map(edge => (
            <div key={`${edge.from}-${edge.to}-${edge.label}`} className="flex items-center gap-2 text-xs text-white/55">
              <span className="font-mono text-white/70">{edge.from}</span>
              <span className="text-white/25">-&gt;</span>
              <span className="font-mono text-white/70">{edge.to}</span>
              <span className="text-white/30">/ {edge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SourceRail({ data }: { data: EofyCommandResponse }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white/85">
          <FileText className="h-4 w-4 text-white/60" />
          Source and provenance
        </h2>
        <p className="mt-1 text-xs text-white/45">Facts, scenario mechanics, and live status are kept separate.</p>
      </div>
      <div className="space-y-3">
        {data.sources.map(source => {
          const Icon = source.type === 'notion' ? CalendarClock : source.type === 'config' ? Banknote : FileText
          return (
            <a
              key={source.id}
              href={source.href ?? '#'}
              target={source.href ? '_blank' : undefined}
              rel={source.href ? 'noreferrer' : undefined}
              className="block rounded-lg border border-white/[0.08] bg-black/10 p-3 transition hover:bg-white/[0.04]"
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/45" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-white/85">{source.label}</h3>
                    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/35">{source.type}</span>
                  </div>
                  {source.path && <p className="mt-1 truncate font-mono text-[11px] text-white/35">{source.path}</p>}
                  <p className="mt-2 text-xs leading-5 text-white/50">{source.note}</p>
                </div>
              </div>
            </a>
          )
        })}
      </div>
      <div className="mt-4 rounded border border-amber-500/15 bg-amber-500/[0.05] p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" />
          Confidence rule
        </div>
        <p className="mt-1 text-xs leading-5 text-white/55">
          Dollar figures marked scenario or needs SL confirmation are not verified accounting outputs. Queried labels are only used for values read from the live tracker/API.
        </p>
      </div>
    </section>
  )
}
