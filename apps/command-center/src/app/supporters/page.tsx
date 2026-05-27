'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Mail,
  MessageSquare,
  Phone,
  Users,
  Filter,
  Search,
  ExternalLink,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Supporter {
  slug: string
  name: string
  tier: 'PAID' | 'OUTSTANDING' | 'WARM' | 'COLD' | 'PROSPECT'
  stage: string | null
  totalPaidAud: number
  outstandingAud: number
  outstandingAlert: 'CRITICAL' | 'AGING' | 'FLAGGED' | 'CLEAR'
  outstandingAgeDays: number | null
  projects: string[]
  primaryEmail: string | null
  primaryContact: string | null
  themes: string[]
  nextReportDue: string | null
  openOppCount: number
  openOppValueAud: number
  wonOppCount: number
  wonOppValueAud: number
  pipelines: string[]
  latestStage: string | null
  latestStagePipeline: string | null
  domain: string | null
  lastTouchAt: string | null
  lastTouchChannel: string | null
  lastTouchDirection: string | null
  lastTouchSubject: string | null
  lastTouchSnippet: string | null
  total30d: number
  total90d: number
  in30d: number
  out30d: number
  waitingForResponseCount: number
  channels: string[]
  needsReply: boolean
}

interface SupportersResponse {
  supporters: Supporter[]
  summary: {
    total: number
    tiers: Record<string, number>
    criticalOutstanding: number
    needsReply: number
    totalPaidLifetimeAud: number
    totalOutstandingAud: number
    totalOpenOppValueAud: number
  }
}

const TIER_COLORS: Record<string, string> = {
  PAID: 'bg-green-500/15 text-green-400 border-green-500/30',
  OUTSTANDING: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  WARM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  COLD: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  PROSPECT: 'bg-white/10 text-white/50 border-white/20',
}

const ALERT_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400',
  AGING: 'bg-amber-500/20 text-amber-400',
  FLAGGED: 'bg-yellow-500/15 text-yellow-400',
  CLEAR: 'bg-white/5 text-white/30',
}

function fmtMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${Math.round(n)}`
}

function fmtDays(at: string | null) {
  if (!at) return 'never'
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 86400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function SupportersPage() {
  const searchParams = useSearchParams()
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [needsReplyOnly, setNeedsReplyOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Supporter | null>(null)

  // Initialize filters from URL params (e.g. /supporters?project=ACT-GD&tier=PAID&needsReply=1)
  useEffect(() => {
    const project = searchParams?.get('project')
    const tier = searchParams?.get('tier')
    const needsReply = searchParams?.get('needsReply')
    const q = searchParams?.get('q')
    if (project) setProjectFilter(project)
    if (tier) setTierFilter(tier)
    if (needsReply === '1') setNeedsReplyOnly(true)
    if (q) setSearch(q)
  }, [searchParams])

  const { data, isLoading } = useQuery<SupportersResponse>({
    queryKey: ['supporters'],
    queryFn: () => fetch('/api/supporters').then((r) => r.json()),
    refetchOnWindowFocus: false,
  })

  type SortKey =
    | 'name' | 'tier' | 'totalPaidAud' | 'outstandingAud'
    | 'openOppValueAud' | 'lastTouchAt' | 'in30out' | 'waiting' | 'projects'
  const [sortKey, setSortKey] = useState<SortKey>('outstandingAud')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'name' || key === 'tier' || key === 'projects' ? 'asc' : 'desc') }
  }

  const filtered = useMemo(() => {
    if (!data?.supporters) return []
    let rows = [...data.supporters]
    if (tierFilter !== 'all') rows = rows.filter((s) => s.tier === tierFilter)
    if (projectFilter !== 'all') rows = rows.filter((s) => s.projects?.includes(projectFilter))
    if (needsReplyOnly) rows = rows.filter((s) => s.needsReply)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.primaryEmail || '').toLowerCase().includes(q) ||
          (s.primaryContact || '').toLowerCase().includes(q),
      )
    }
    // Sort
    const sign = sortDir === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      let av: any, bv: any
      switch (sortKey) {
        case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break
        case 'tier': av = a.tier; bv = b.tier; break
        case 'totalPaidAud': av = a.totalPaidAud; bv = b.totalPaidAud; break
        case 'outstandingAud': av = a.outstandingAud; bv = b.outstandingAud; break
        case 'openOppValueAud': av = a.openOppValueAud; bv = b.openOppValueAud; break
        case 'lastTouchAt': av = a.lastTouchAt ? new Date(a.lastTouchAt).getTime() : 0; bv = b.lastTouchAt ? new Date(b.lastTouchAt).getTime() : 0; break
        case 'in30out': av = (a.in30d + a.out30d); bv = (b.in30d + b.out30d); break
        case 'waiting': av = a.waitingForResponseCount; bv = b.waitingForResponseCount; break
        case 'projects': av = (a.projects || []).join(','); bv = (b.projects || []).join(','); break
      }
      if (av < bv) return -1 * sign
      if (av > bv) return 1 * sign
      return 0
    })
    return rows
  }, [data, tierFilter, projectFilter, needsReplyOnly, search, sortKey, sortDir])

  function SortBtn({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'right' }) {
    const active = sortKey === k
    return (
      <button
        onClick={() => toggleSort(k)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-white transition-colors',
          align === 'right' && 'justify-end',
          active && 'text-white',
        )}
      >
        {label}
        <span className={cn('text-[8px]', active ? 'opacity-100' : 'opacity-20')}>{active && sortDir === 'asc' ? '▲' : '▼'}</span>
      </button>
    )
  }

  const allProjects = useMemo(() => {
    if (!data?.supporters) return []
    const set = new Set<string>()
    for (const s of data.supporters) {
      for (const p of s.projects || []) set.add(p)
    }
    return [...set].sort()
  }, [data])

  if (isLoading) {
    return <div className="p-8 text-white/40">Loading supporters…</div>
  }

  if (!data) {
    return <div className="p-8 text-red-400">Failed to load.</div>
  }

  const s = data.summary

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/finance" className="text-white/40 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-semibold">Supporters</h1>
          <span className="text-xs text-white/30">refreshed daily 06:00 / 06:15 AEST</span>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="glass-card p-4">
            <div className="text-xs text-white/40 uppercase tracking-wider">Total</div>
            <div className="text-2xl font-semibold mt-1">{s.total}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-white/40 uppercase tracking-wider">Lifetime Paid</div>
            <div className="text-2xl font-semibold mt-1 text-green-400">{fmtMoney(s.totalPaidLifetimeAud)}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-white/40 uppercase tracking-wider">Outstanding</div>
            <div className="text-2xl font-semibold mt-1 text-orange-400">{fmtMoney(s.totalOutstandingAud)}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-white/40 uppercase tracking-wider">Open Opps $</div>
            <div className="text-2xl font-semibold mt-1 text-fuchsia-400">{fmtMoney(s.totalOpenOppValueAud)}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-white/40 uppercase tracking-wider">Critical</div>
            <div className="text-2xl font-semibold mt-1 text-red-400">{s.criticalOutstanding}</div>
          </div>
          <button
            onClick={() => setNeedsReplyOnly(!needsReplyOnly)}
            className={cn(
              'glass-card p-4 text-left transition-colors',
              needsReplyOnly ? 'ring-2 ring-amber-400' : 'hover:ring-1 hover:ring-amber-400/50',
            )}
          >
            <div className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Needs Reply
            </div>
            <div className="text-2xl font-semibold mt-1 text-amber-400">{s.needsReply}</div>
          </button>
        </div>

        {/* Filter bar */}
        <div className="glass-card p-3 mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-white/40">
            <Filter className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Filters</span>
          </div>

          {/* Tier */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          >
            <option value="all">All Tiers</option>
            {Object.keys(s.tiers).map((t) => (
              <option key={t} value={t}>
                {t} ({s.tiers[t]})
              </option>
            ))}
          </select>

          {/* Project */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          >
            <option value="all">All Projects</option>
            {allProjects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="flex-1 flex items-center gap-1 bg-white/5 border border-white/10 rounded px-2 py-1">
            <Search className="h-4 w-4 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, contact…"
              className="bg-transparent text-sm text-white flex-1 outline-none"
            />
          </div>

          <span className="text-xs text-white/40">{filtered.length} shown</span>

          {/* CSV export */}
          <button
            onClick={() => {
              const header = ['Name', 'Tier', 'Stage', 'Paid AUD', 'Outstanding AUD', 'Alert', 'Open opps', 'Open opp AUD', 'Won opps', 'Won opp AUD', 'Last touch', 'Days silent', 'Channel', 'Direction', 'In 30d', 'Out 30d', 'Waiting', 'Projects', 'Pipelines', 'Primary contact', 'Primary email']
              const rows = filtered.map((r) => [
                r.name, r.tier, r.stage ?? '', r.totalPaidAud, r.outstandingAud, r.outstandingAlert,
                r.openOppCount, r.openOppValueAud, r.wonOppCount, r.wonOppValueAud,
                r.lastTouchAt ?? '', r.lastTouchAt ? Math.floor((Date.now() - new Date(r.lastTouchAt).getTime()) / 86400_000) : '',
                r.lastTouchChannel ?? '', r.lastTouchDirection ?? '',
                r.in30d, r.out30d, r.waitingForResponseCount,
                (r.projects || []).join('; '), (r.pipelines || []).join('; '),
                r.primaryContact ?? '', r.primaryEmail ?? '',
              ])
              const csv = [header, ...rows].map((line) =>
                line.map((v) => {
                  const s = String(v ?? '')
                  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
                }).join(',')
              ).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `supporters-${new Date().toISOString().slice(0, 10)}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70"
          >
            ⬇ CSV
          </button>
        </div>

        {/* Data freshness banner */}
        <div className="text-[10px] text-white/30 mb-3 flex flex-wrap gap-3">
          <span>📊 Supporters intelligence: rebuilds 06:00am</span>
          <span>🔀 Project pipelines: rebuilds 06:10am</span>
          <span>📧 Comms summary: rebuilds 06:15am</span>
          <span>🔔 Nudge: fires 07:15am if anything critical</span>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs text-white/40 uppercase tracking-wider">
              <tr>
                <th className="text-left p-3"><SortBtn k="name" label="Supporter" /></th>
                <th className="text-left p-3"><SortBtn k="tier" label="Tier" /></th>
                <th className="text-right p-3"><SortBtn k="totalPaidAud" label="$ Paid" align="right" /></th>
                <th className="text-right p-3"><SortBtn k="outstandingAud" label="$ Outstanding" align="right" /></th>
                <th className="text-right p-3"><SortBtn k="openOppValueAud" label="Open Opps" align="right" /></th>
                <th className="text-left p-3"><SortBtn k="lastTouchAt" label="Last Touch" /></th>
                <th className="text-right p-3"><SortBtn k="in30out" label="In/Out 30d" align="right" /></th>
                <th className="text-right p-3"><SortBtn k="waiting" label="Waiting" align="right" /></th>
                <th className="text-left p-3"><SortBtn k="projects" label="Projects" /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.slug}
                  onClick={() => setSelected(row)}
                  className={cn(
                    'border-t border-white/5 cursor-pointer transition-colors hover:bg-white/5',
                    row.needsReply && 'bg-amber-500/5',
                  )}
                >
                  <td className="p-3">
                    <div className="font-medium text-white">{row.name}</div>
                    {row.primaryContact && (
                      <div className="text-xs text-white/40 mt-0.5">{row.primaryContact}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs border', TIER_COLORS[row.tier])}>
                      {row.tier}
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums text-green-400">
                    {row.totalPaidAud > 0 ? fmtMoney(row.totalPaidAud) : <span className="text-white/20">—</span>}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {row.outstandingAud > 0 ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px]', ALERT_COLORS[row.outstandingAlert])}>
                          {row.outstandingAlert}
                        </span>
                        <span className="text-orange-400">{fmtMoney(row.outstandingAud)}</span>
                      </div>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {row.openOppCount > 0 ? (
                      <span className="text-fuchsia-400">
                        {row.openOppCount} / {fmtMoney(row.openOppValueAud)}
                      </span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    {row.lastTouchAt ? (
                      <div>
                        <div className="text-white/80">{fmtDays(row.lastTouchAt)}</div>
                        <div className="flex items-center gap-1 text-white/40 mt-0.5">
                          {row.lastTouchDirection === 'inbound' || row.lastTouchDirection === 'in' ? (
                            <ArrowDownRight className="h-3 w-3 text-blue-400" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3 text-green-400" />
                          )}
                          <span className="truncate max-w-[200px]">{row.lastTouchSubject || row.lastTouchChannel}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-white/20">never</span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums text-xs">
                    {row.total30d > 0 ? (
                      <span>
                        <span className="text-blue-400">{row.in30d}</span>
                        <span className="text-white/40 mx-0.5">/</span>
                        <span className="text-green-400">{row.out30d}</span>
                      </span>
                    ) : (
                      <span className="text-white/20">0</span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {row.waitingForResponseCount > 0 ? (
                      <span className="text-amber-400 font-medium">{row.waitingForResponseCount}</span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(row.projects || []).slice(0, 3).map((p) => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/60">
                          {p}
                        </span>
                      ))}
                      {(row.projects || []).length > 3 && (
                        <span className="text-[10px] text-white/30">+{row.projects.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Drilldown drawer */}
        {selected && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex justify-end"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-zinc-900 border-l border-white/10 w-full max-w-2xl h-full overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{selected.name}</h2>
                  <div className="text-sm text-white/40 mt-1">{selected.primaryContact}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="glass-card p-3">
                  <div className="text-[10px] text-white/40 uppercase">Tier</div>
                  <div className={cn('text-sm font-medium mt-1', TIER_COLORS[selected.tier].split(' ')[1])}>
                    {selected.tier}
                  </div>
                </div>
                <div className="glass-card p-3">
                  <div className="text-[10px] text-white/40 uppercase">Lifetime Paid</div>
                  <div className="text-sm font-medium mt-1 text-green-400 tabular-nums">
                    {fmtMoney(selected.totalPaidAud)}
                  </div>
                </div>
                <div className="glass-card p-3">
                  <div className="text-[10px] text-white/40 uppercase">Outstanding</div>
                  <div className="text-sm font-medium mt-1 text-orange-400 tabular-nums">
                    {fmtMoney(selected.outstandingAud)}
                  </div>
                </div>
                <div className="glass-card p-3">
                  <div className="text-[10px] text-white/40 uppercase">Open Opp $</div>
                  <div className="text-sm font-medium mt-1 text-fuchsia-400 tabular-nums">
                    {fmtMoney(selected.openOppValueAud)}
                  </div>
                </div>
              </div>

              {/* Comms */}
              <div className="glass-card p-4 mb-4">
                <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Communications
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-white/40">Last touch</dt>
                    <dd className="text-white">
                      {selected.lastTouchAt ? `${fmtDays(selected.lastTouchAt)} (${selected.lastTouchAt.slice(0, 10)})` : 'never'}
                    </dd>
                  </div>
                  {selected.lastTouchSubject && (
                    <div className="flex justify-between">
                      <dt className="text-white/40">Subject</dt>
                      <dd className="text-white max-w-[60%] text-right truncate">{selected.lastTouchSubject}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-white/40">In / Out (30d)</dt>
                    <dd className="text-white tabular-nums">
                      <span className="text-blue-400">{selected.in30d}</span> /{' '}
                      <span className="text-green-400">{selected.out30d}</span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-white/40">Total (90d)</dt>
                    <dd className="text-white tabular-nums">{selected.total90d}</dd>
                  </div>
                  {selected.waitingForResponseCount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-white/40">Waiting for reply</dt>
                      <dd className="text-amber-400 font-medium">{selected.waitingForResponseCount}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-white/40">Channels</dt>
                    <dd className="text-white">{selected.channels.join(', ') || '—'}</dd>
                  </div>
                </dl>
              </div>

              {/* Pipelines */}
              {selected.pipelines && selected.pipelines.length > 0 && (
                <div className="glass-card p-4 mb-4">
                  <h3 className="text-sm font-medium text-white/70 mb-3">GHL Pipelines</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selected.pipelines.map((p) => (
                      <span key={p} className="text-xs px-2 py-1 rounded bg-fuchsia-500/15 text-fuchsia-300">
                        {p}
                      </span>
                    ))}
                  </div>
                  {selected.latestStage && (
                    <div className="text-xs text-white/40 mt-2">
                      Latest stage: <span className="text-white">{selected.latestStage}</span>
                      {selected.latestStagePipeline && (
                        <span className="text-white/40"> in {selected.latestStagePipeline}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Funder briefs — QBE-HQ pattern */}
              <SupporterBriefs funderSlug={selected.slug} />

              {/* Projects */}
              {selected.projects && selected.projects.length > 0 && (
                <div className="glass-card p-4 mb-4">
                  <h3 className="text-sm font-medium text-white/70 mb-3">Projects funded</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.projects.map((p) => (
                      <Link
                        key={p}
                        href={`/finance/projects/${p}`}
                        className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1"
                      >
                        {p}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {selected.primaryEmail && (
                <a
                  href={`mailto:${selected.primaryEmail.split(',')[0]}`}
                  className="block w-full text-center py-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors font-medium"
                >
                  Email {selected.primaryContact || selected.name}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SupporterBriefs — embeds funder × project briefs in the drawer
// ─────────────────────────────────────────────────────────────────────

interface FunderBrief {
  id: string
  funderSlug: string
  projectCode: string
  briefTitle: string | null
  status: string
  asksFromThem: Array<{ ask: string; source: string; done?: boolean }>
  askAmountAud: number | null
  askOutcome: string | null
  askStatus: string | null
  alignmentStatus: 'PASS' | 'WARN' | 'FAIL'
  alignmentNotes: string | null
  procurementDeliveredCount: number | null
  procurementUnit: string | null
  procurementDemandCount: number | null
  nextMove: string | null
  nextMoveOwner: string | null
  nextMoveDue: string | null
  notionHqUrl: string | null
  lastFeedbackSummary: string | null
}

function SupporterBriefs({ funderSlug }: { funderSlug: string }) {
  const { data } = useQuery<{ briefs: FunderBrief[] }>({
    queryKey: ['funder-briefs', funderSlug],
    queryFn: () => fetch(`/api/funder-briefs?funder=${funderSlug}`).then((r) => r.json()),
    refetchOnWindowFocus: false,
  })

  const briefs = data?.briefs || []
  if (briefs.length === 0) return null

  return (
    <div className="glass-card p-4 mb-4">
      <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-purple-400" />
        Briefs ({briefs.length})
      </h3>
      <div className="space-y-3">
        {briefs.map((b) => {
          const openAsks = (b.asksFromThem || []).filter((a) => !a.done).length
          const overdue = b.nextMoveDue ? new Date(b.nextMoveDue) < new Date() : false
          return (
            <div key={b.id} className="rounded border border-white/5 p-3 bg-white/[0.02]">
              <div className="flex items-baseline gap-2 flex-wrap mb-1">
                <Link href={`/finance/projects/${b.projectCode}`} className="text-xs text-fuchsia-400 hover:text-fuchsia-300">
                  {b.projectCode}
                </Link>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded',
                  b.alignmentStatus === 'PASS' ? 'bg-green-500/20 text-green-400' :
                  b.alignmentStatus === 'WARN' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                )}>{b.alignmentStatus}</span>
                {b.askStatus && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">{b.askStatus}</span>
                )}
                {overdue && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">OVERDUE</span>
                )}
                {b.askAmountAud && (
                  <span className="text-xs text-green-400 tabular-nums font-medium ml-auto">{fmtMoney(b.askAmountAud)}</span>
                )}
              </div>
              {b.briefTitle && <div className="text-sm text-white">{b.briefTitle}</div>}
              {openAsks > 0 && (
                <div className="text-[11px] text-amber-400 mt-1">
                  {openAsks} open ask{openAsks === 1 ? '' : 's'} from them
                </div>
              )}
              {b.procurementDeliveredCount !== null && b.procurementUnit && (
                <div className="text-[11px] text-white/50 mt-1">
                  <span className="text-emerald-400 font-medium">{b.procurementDeliveredCount}</span> {b.procurementUnit} delivered
                  {b.procurementDemandCount && <> · <span className="text-fuchsia-400 font-medium">{b.procurementDemandCount}</span> demand</>}
                </div>
              )}
              {b.nextMove && (
                <div className="text-xs text-white/70 mt-2 pt-2 border-t border-white/5">
                  <span className="text-white/40">Next:</span> {b.nextMove}
                  {b.nextMoveOwner && <span className="text-white/40"> · {b.nextMoveOwner}</span>}
                  {b.nextMoveDue && <span className={cn('text-[10px] ml-2 tabular-nums', overdue ? 'text-red-400' : 'text-white/40')}>due {b.nextMoveDue}</span>}
                </div>
              )}
              {b.notionHqUrl && (
                <a href={b.notionHqUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:text-blue-300 mt-2 inline-flex items-center gap-1">
                  Notion HQ <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
