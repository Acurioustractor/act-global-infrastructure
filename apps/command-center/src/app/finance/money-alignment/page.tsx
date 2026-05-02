'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Banknote,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileCheck2,
  Gauge,
  Landmark,
  Layers,
  LockKeyhole,
  NotebookTabs,
  RefreshCcw,
  ShieldCheck,
  Tags,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type GateStatus = 'fund-with-controls' | 'advice-needed' | 'pause' | 'clean-up'
type FreshnessStatus = 'current' | 'usable' | 'stale'

interface AllocationRow {
  code: string
  name: string
  revenue: number
  expenses: number
  net: number
  lines: number
  gateStatus: GateStatus
  workspace: string
  decision: string
}

interface CoverageRow {
  source: string
  total: number
  tagged: number
  untagged: number
  coverage_pct: number
  min_date: string | null
  max_date: string | null
}

interface FreshnessRow {
  source: string
  latest_synced_at: string | null
  latest_updated_at: string | null
  latest_xero_date: string | null
  status: FreshnessStatus
  note: string
}

interface ReviewQueueRow {
  type: 'transaction' | 'invoice'
  contact_name: string
  item_count: number
  abs_total: number
  amount_due: number | null
  first_date: string | null
  last_date: string | null
}

interface MoneyAlignmentData {
  generatedAt: string
  period: { fy: string; start: string; snapshotDate: string; snapshotTo: string }
  sources: { reportPath: string; provenancePath: string; notionHqUrl: string; notionGateUrl: string }
  workspaceModel: Array<{ name: string; role: string; owns: string }>
  allocation: {
    rows: AllocationRow[]
    totals: { revenue: number; expenses: number; net: number; lines: number }
    source: string
  }
  coverage: CoverageRow[]
  rules: Array<{ source: string; total: number; auto_apply: number | null; project_codes: number; rd_eligible: number | null }>
  freshness: FreshnessRow[]
  reviewQueue: { topTransactions: ReviewQueueRow[]; topInvoices: ReviewQueueRow[] }
  nextActions: string[]
  verification: { verified: string[]; unverified: string[] }
}

const gateStyles: Record<GateStatus, string> = {
  'fund-with-controls': 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  'advice-needed': 'bg-amber-500/15 text-amber-300 border-amber-400/20',
  pause: 'bg-red-500/15 text-red-300 border-red-400/20',
  'clean-up': 'bg-blue-500/15 text-blue-300 border-blue-400/20',
}

const freshnessStyles: Record<FreshnessStatus, string> = {
  current: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  usable: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
  stale: 'bg-red-500/15 text-red-300 border-red-400/20',
}

const workspaceIcons: Record<string, typeof Database> = {
  Xero: Landmark,
  Supabase: Database,
  'Command Center': Gauge,
  Notion: NotebookTabs,
  Wiki: Layers,
  'Drive / LastPass': LockKeyhole,
}

function money(value: number) {
  const abs = Math.abs(value)
  const formatted = abs >= 1_000_000
    ? `${(abs / 1_000_000).toFixed(2)}M`
    : abs >= 1000
      ? Math.round(abs).toLocaleString()
      : abs.toLocaleString()
  return `${value < 0 ? '-' : ''}$${formatted}`
}

function pct(value: number) {
  return `${value.toFixed(1)}%`
}

function sourceLabel(source: string) {
  return source
    .replaceAll('_', ' ')
    .replace('fy26 ytd', 'FY26 YTD')
    .replace('xero', 'Xero')
}

export default function MoneyAlignmentPage() {
  const { data, isLoading, error } = useQuery<MoneyAlignmentData>({
    queryKey: ['finance', 'money-alignment'],
    queryFn: async () => {
      const res = await fetch('/api/finance/money-alignment')
      if (!res.ok) throw new Error('Failed to load money alignment')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <main className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <div className="text-white/40">Loading money alignment...</div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen p-6 md:p-8">
        <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Finance
        </Link>
        <section className="glass-card p-8">
          <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
          <h1 className="text-xl font-semibold text-white">Money alignment could not load</h1>
          <p className="text-white/50 mt-2">Check Supabase access and the finance API logs.</p>
        </section>
      </main>
    )
  }

  const transactionCoverage = data.coverage.find(row => row.source === 'xero_transactions_fy26_ytd')
  const invoiceCoverage = data.coverage.find(row => row.source === 'xero_invoices_fy26_ytd')
  const reviewValue =
    data.reviewQueue.topTransactions.reduce((sum, row) => sum + row.abs_total, 0) +
    data.reviewQueue.topInvoices.reduce((sum, row) => sum + row.abs_total, 0)

  return (
    <main className="min-h-screen p-4 md:p-8">
      <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Finance
      </Link>

      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            Read-only cockpit
          </div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CircleDollarSign className="h-8 w-8 text-emerald-400" />
            ACT Money Alignment
          </h1>
          <p className="text-white/50 mt-2 max-w-3xl">
            The front door for tracking where ACT money is accounted, automated, decided and documented.
            Live ledgers stay in Xero; this page shows the current operating truth and review queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={data.sources.notionHqUrl} className="btn-glass inline-flex items-center gap-2">
            <NotebookTabs className="h-4 w-4" /> Notion HQ
          </a>
          <a href={data.sources.notionGateUrl} className="btn-glass inline-flex items-center gap-2">
            <FileCheck2 className="h-4 w-4" /> Gates
          </a>
          <Link href="/finance/tagger-v2" className="btn-glass inline-flex items-center gap-2">
            <Tags className="h-4 w-4" /> Review tags
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard icon={Banknote} label="Snapshot revenue" value={money(data.allocation.totals.revenue)} tone="emerald" />
        <MetricCard icon={BarChart3} label="Snapshot expenses" value={money(data.allocation.totals.expenses)} tone="red" />
        <MetricCard icon={Gauge} label="Snapshot net" value={money(data.allocation.totals.net)} tone={data.allocation.totals.net >= 0 ? 'emerald' : 'red'} />
        <MetricCard icon={AlertTriangle} label="Top review queue" value={money(reviewValue)} tone="amber" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-6 mb-6">
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Project Gates</h2>
            <p className="text-sm text-white/45 mt-1">{data.allocation.source}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/45">
                  <th className="text-left font-medium py-3 px-4">Project</th>
                  <th className="text-left font-medium py-3 px-3">Gate</th>
                  <th className="text-right font-medium py-3 px-3">Revenue</th>
                  <th className="text-right font-medium py-3 px-3">Expenses</th>
                  <th className="text-right font-medium py-3 px-3">Net</th>
                  <th className="text-left font-medium py-3 px-4">Decision</th>
                </tr>
              </thead>
              <tbody>
                {data.allocation.rows.map(row => (
                  <tr key={row.code} className="border-b border-white/5 hover:bg-white/5 transition-colors align-top">
                    <td className="py-3 px-4">
                      <Link href={`/finance/projects/${row.code}`} className="font-medium text-white hover:text-emerald-300 transition-colors">
                        {row.code}
                      </Link>
                      <div className="text-xs text-white/40">{row.name} · {row.lines} lines</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn('inline-flex rounded-full border px-2 py-1 text-xs', gateStyles[row.gateStatus])}>
                        {row.gateStatus.replaceAll('-', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-emerald-300">{money(row.revenue)}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-red-300">{money(row.expenses)}</td>
                    <td className={cn('py-3 px-3 text-right tabular-nums font-medium', row.net >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                      {money(row.net)}
                    </td>
                    <td className="py-3 px-4 text-white/55 max-w-[360px]">{row.decision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Coverage</h2>
            <div className="space-y-4">
              {data.coverage.map(row => (
                <div key={row.source}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm text-white/70">{sourceLabel(row.source)}</span>
                    <span className="text-sm font-medium text-white tabular-nums">{pct(row.coverage_pct)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${Math.min(row.coverage_pct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-white/35 mt-1">{row.tagged.toLocaleString()} tagged · {row.untagged.toLocaleString()} untagged</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Rules Layer</h2>
            <div className="space-y-3">
              {data.rules.map(row => (
                <div key={row.source} className="flex items-center justify-between gap-4 rounded-lg bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-sm text-white/75">{sourceLabel(row.source)}</p>
                    <p className="text-xs text-white/35">{row.project_codes} project codes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{row.total.toLocaleString()}</p>
                    {row.rd_eligible !== null && <p className="text-xs text-lime-300">{row.rd_eligible} R&D</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Source Freshness</h2>
          <div className="space-y-3">
            {data.freshness.map(row => (
              <div key={row.source} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{sourceLabel(row.source)}</p>
                    <p className="text-xs text-white/40 mt-1">{row.note}</p>
                  </div>
                  <span className={cn('rounded-full border px-2 py-1 text-xs', freshnessStyles[row.status])}>{row.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/40">
                  <span>Synced: {row.latest_synced_at ? new Date(row.latest_synced_at).toLocaleDateString() : 'n/a'}</span>
                  <span>Latest Xero date: {row.latest_xero_date || 'n/a'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-white mb-4">What Lives Where</h2>
          <div className="space-y-3">
            {data.workspaceModel.map(row => {
              const Icon = workspaceIcons[row.name] || Database
              return (
                <div key={row.name} className="flex gap-3 rounded-lg bg-white/[0.03] border border-white/10 p-3">
                  <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-emerald-300" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{row.name} <span className="text-white/35 font-normal">· {row.role}</span></p>
                    <p className="text-sm text-white/45 mt-1">{row.owns}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <QueueCard title="Top Untagged Transactions" rows={data.reviewQueue.topTransactions} />
        <QueueCard title="Top Untagged Invoices" rows={data.reviewQueue.topInvoices} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-6">
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Next Actions</h2>
          <div className="space-y-3">
            {data.nextActions.map((action, index) => (
              <div key={action} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs text-emerald-300">
                  {index + 1}
                </span>
                <p className="text-sm text-white/65">{action}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Verification Boundary</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-300 mb-3">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Verified</span>
              </div>
              <ul className="space-y-2">
                {data.verification.verified.map(item => (
                  <li key={item} className="text-sm text-white/55">{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 text-amber-300 mb-3">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Unverified</span>
              </div>
              <ul className="space-y-2">
                {data.verification.unverified.map(item => (
                  <li key={item} className="text-sm text-white/55">{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/40">
            <span className="rounded-full bg-white/5 px-3 py-1">Report: {data.sources.reportPath}</span>
            <span className="rounded-full bg-white/5 px-3 py-1">Provenance: {data.sources.provenancePath}</span>
            <span className="rounded-full bg-white/5 px-3 py-1">Generated: {new Date(data.generatedAt).toLocaleString()}</span>
          </div>
        </div>
      </section>
    </main>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Database
  label: string
  value: string
  tone: 'emerald' | 'red' | 'amber'
}) {
  const toneClass = tone === 'emerald' ? 'text-emerald-300' : tone === 'red' ? 'text-red-300' : 'text-amber-300'
  return (
    <div className="glass-card p-4">
      <Icon className={cn('h-5 w-5 mb-3', toneClass)} />
      <p className={cn('text-xl font-bold tabular-nums', toneClass)}>{value}</p>
      <p className="text-xs text-white/40 mt-1">{label}</p>
    </div>
  )
}

function QueueCard({ title, rows }: { title: string; rows: ReviewQueueRow[] }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-white/40">Review only. No write-back from this page.</p>
        </div>
        <Link href="/finance/tagger-v2" className="text-white/40 hover:text-white inline-flex items-center gap-1 text-sm">
          Open tagger <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map(row => (
          <div key={`${row.type}-${row.contact_name}`} className="p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
            <div className="min-w-0">
              <p className="font-medium text-white truncate">{row.contact_name}</p>
              <p className="text-xs text-white/35">{row.item_count} item{row.item_count === 1 ? '' : 's'} · {row.first_date || 'n/a'} to {row.last_date || 'n/a'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-amber-300 tabular-nums">{money(row.abs_total)}</p>
              {row.amount_due !== null && row.amount_due > 0 && <p className="text-xs text-white/35">due {money(row.amount_due)}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
