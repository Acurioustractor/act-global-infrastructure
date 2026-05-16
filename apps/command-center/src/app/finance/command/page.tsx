'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  ExternalLink,
  Gauge,
  History,
  RefreshCw,
  Sparkles,
  Tags,
  Target,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'

type Tier = 'ecosystem' | 'satellite' | 'studio' | 'background' | null

interface ProjectMoneyRow {
  project_code: string
  project_name: string
  tier: Tier
  income_fy: number
  expenses_fy: number
  net_fy: number
  receivables: number
  pipeline_weighted: number
  grants_in_flight: number
  txn_count_fy: number
  txn_untagged_fy: number
  inv_count_fy: number
  inv_untagged_fy: number
  opp_open_count: number
  opp_untagged_count: number
  last_transaction_at: string | null
  last_invoice_paid_at: string | null
  last_opp_update_at: string | null
  days_since_transaction: number | null
  days_since_invoice_paid: number | null
  days_since_opp_update: number | null
}

interface DriftItem {
  kind: 'invoice' | 'opportunity' | 'transaction'
  reason: 'untagged' | 'mismatch'
  id: string
  label: string
  amount: number
  meta: Record<string, unknown>
  workbenchUrl: string | null
}

interface CommandResponse {
  generatedAt: string
  fy: { start: string; end: string }
  top: {
    cashInBank: number | null
    fyIncome: number
    fyExpenses: number
    fyNet: number
    receivables: number
    pipelineWeighted: number
    grantsInFlight: number
    projectedIncoming90d: number
    incomingStack: Array<{ source: string; amount: number; note: string }>
  }
  middle: {
    coverage: Array<{ source: string; total: number; tagged: number; pct: number }>
    projects: ProjectMoneyRow[]
    drift: DriftItem[]
  }
  bottom: {
    actionLinks: Array<{ href: string; label: string; note: string }>
  }
}

interface LifetimeCustomer {
  contact_name: string
  paid_count: number
  paid_total: number
  authorised_outstanding: number
  draft_total: number
  last_invoice_date: string | null
  in_funder_snapshot: boolean
}

interface LifetimeResponse {
  generatedAt: string
  totals: {
    distinctCustomers: number
    payingCustomers: number
    lifetimePaid: number
    lifetimeAuthorised: number
    lifetimeDraft: number
    visibleBook: number
  }
  coverageGap: {
    snapshotRows: number
    xeroPayers: number
    matched: number
    missingFromSnapshot: number
    missingNames: string[]
  }
  topCustomers: LifetimeCustomer[]
}

export default function MoneyCommandPage() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery<CommandResponse>({
    queryKey: ['finance', 'command'],
    queryFn: async () => {
      const res = await fetch('/api/finance/command', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 60 * 1000,
  })
  const { data: lifetime } = useQuery<LifetimeResponse>({
    queryKey: ['finance', 'lifetime-ledger'],
    queryFn: async () => {
      const res = await fetch('/api/finance/lifetime-ledger', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* HEADER */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium uppercase tracking-wider mb-1">
              <Compass size={16} /> Money Command
            </div>
            <h1 className="text-3xl font-semibold">Money in · out · alignment · incoming</h1>
            <p className="text-neutral-400 text-sm mt-1">
              FY26 ({data?.fy.start ?? '2025-07-01'} → {data?.fy.end ?? '2026-06-30'}). Live from
              <code className="mx-1 px-1.5 py-0.5 rounded bg-neutral-900 text-xs">v_project_money_state</code>.
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

        {isLoading && <SkeletonBlocks />}
        {error && (
          <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-300">
            Failed to load: {String((error as Error).message)}. Try{' '}
            <button onClick={() => refetch()} className="underline">refresh</button>.
          </div>
        )}

        {data && (
          <>
            {/* TOP LAYER */}
            <TopLayer top={data.top} />
            {/* MIDDLE LAYER */}
            <MiddleLayer middle={data.middle} />
            {/* LIFETIME LEDGER — surfaces xero_invoices as the canonical record */}
            {lifetime && <LifetimeLedgerSection data={lifetime} />}
            {/* BOTTOM LAYER */}
            <BottomLayer bottom={data.bottom} generatedAt={data.generatedAt} />
          </>
        )}
      </div>
    </div>
  )
}

function TopLayer({ top }: { top: CommandResponse['top'] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-wider">
        <Wallet size={14} /> Money now · money next
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Cash in bank"
          value={top.cashInBank == null ? '—' : formatMoney(top.cashInBank)}
          note={top.cashInBank == null ? 'wire to xero_bank_balances' : 'latest sync'}
        />
        <KpiCard
          label="FY26 net"
          value={formatMoney(top.fyNet)}
          tone={top.fyNet >= 0 ? 'positive' : 'negative'}
          note={`${formatMoneyCompact(top.fyIncome)} in · ${formatMoneyCompact(top.fyExpenses)} out`}
        />
        <KpiCard
          label="Receivables (AR)"
          value={formatMoney(top.receivables)}
          note="unpaid invoices"
        />
        <KpiCard
          label="Projected 90d incoming"
          value={formatMoney(top.projectedIncoming90d)}
          tone="positive"
          note="AR + weighted pipeline + grants"
        />
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
        <h3 className="text-sm font-medium text-neutral-300 mb-3">Projected incoming — stack</h3>
        <ProjectedIncomingStack stack={top.incomingStack} total={top.projectedIncoming90d} />
      </div>
    </section>
  )
}

function ProjectedIncomingStack({
  stack,
  total,
}: {
  stack: CommandResponse['top']['incomingStack']
  total: number
}) {
  return (
    <div className="space-y-2">
      {stack.map(row => {
        const pct = total === 0 ? 0 : Math.round((row.amount / total) * 100)
        return (
          <div key={row.source} className="flex items-center gap-3">
            <div className="w-44 text-sm text-neutral-300 shrink-0">{row.source}</div>
            <div className="flex-1 h-6 rounded bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500/80"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="w-32 text-right text-sm tabular-nums">{formatMoney(row.amount)}</div>
            <div className="w-16 text-right text-xs text-neutral-500 tabular-nums">{pct}%</div>
          </div>
        )
      })}
    </div>
  )
}

function MiddleLayer({ middle }: { middle: CommandResponse['middle'] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-wider">
        <Gauge size={14} /> Alignment quality
      </div>

      {/* Coverage strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {middle.coverage.map(c => (
          <div key={c.source} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{c.source}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-semibold tabular-nums">{c.pct.toFixed(1)}%</div>
              <div className="text-xs text-neutral-500">{c.tagged} / {c.total} tagged</div>
            </div>
            <div className="mt-2 h-1.5 rounded bg-neutral-800 overflow-hidden">
              <div
                className={cn(
                  'h-full',
                  c.pct >= 95 ? 'bg-emerald-500' : c.pct >= 80 ? 'bg-amber-500' : 'bg-red-500',
                )}
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Drift queue */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-amber-400" />
          <h3 className="text-sm font-medium text-neutral-300">Drift queue — top 10 by $</h3>
        </div>
        {middle.drift.length === 0 ? (
          <div className="text-sm text-neutral-500">No drift — every $ has a project_code.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
                  <th className="py-2 pr-3 font-medium">Kind</th>
                  <th className="py-2 pr-3 font-medium">Reason</th>
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium text-right">Amount</th>
                  <th className="py-2 pr-3 font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {middle.drift.map(d => (
                  <tr key={`${d.kind}-${d.id}`} className="border-b border-neutral-900 last:border-0">
                    <td className="py-2 pr-3">
                      <span className={cn(
                        'inline-block px-1.5 py-0.5 rounded text-xs font-medium',
                        d.kind === 'invoice' && 'bg-emerald-500/20 text-emerald-300',
                        d.kind === 'opportunity' && 'bg-indigo-500/20 text-indigo-300',
                        d.kind === 'transaction' && 'bg-cyan-500/20 text-cyan-300',
                      )}>
                        {d.kind}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={cn(
                        'inline-block px-1.5 py-0.5 rounded text-xs font-medium',
                        d.reason === 'mismatch' ? 'bg-red-500/20 text-red-300' : 'bg-neutral-700/40 text-neutral-300',
                      )}>
                        {d.reason}
                      </span>
                    </td>
                    <td className="py-2 pr-3 max-w-[28ch] truncate text-neutral-300">{d.label}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(Math.abs(d.amount))}</td>
                    <td className="py-2 pr-3">
                      {d.workbenchUrl ? (
                        <Link href={d.workbenchUrl} className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                          fix <ArrowUpRight size={12} />
                        </Link>
                      ) : (
                        <span className="text-xs text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Heartbeat table */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-emerald-400" />
          <h3 className="text-sm font-medium text-neutral-300">Project heartbeats — FY26 activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
                <th className="py-2 pr-3 font-medium">Project</th>
                <th className="py-2 pr-3 font-medium text-right">Net FY</th>
                <th className="py-2 pr-3 font-medium text-right">AR</th>
                <th className="py-2 pr-3 font-medium text-right">Pipeline×p</th>
                <th className="py-2 pr-3 font-medium text-right">Grants</th>
                <th className="py-2 pr-3 font-medium text-right">Last txn</th>
                <th className="py-2 pr-3 font-medium text-right">Last opp</th>
                <th className="py-2 pr-3 font-medium text-right">Untagged</th>
              </tr>
            </thead>
            <tbody>
              {middle.projects.map(p => {
                const untagged = p.txn_untagged_fy + p.inv_untagged_fy + p.opp_untagged_count
                return (
                  <tr key={p.project_code} className="border-b border-neutral-900 last:border-0 hover:bg-neutral-900/40">
                    <td className="py-2 pr-3">
                      <Link href={`/finance/projects/${p.project_code}`} className="text-emerald-400 hover:text-emerald-300">
                        {p.project_code}
                      </Link>
                      <div className="text-xs text-neutral-500 max-w-[24ch] truncate">{p.project_name}</div>
                    </td>
                    <td className={cn('py-2 pr-3 text-right tabular-nums', p.net_fy >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                      {formatMoneyCompact(p.net_fy)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-neutral-300">
                      {p.receivables ? formatMoneyCompact(p.receivables) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-neutral-300">
                      {p.pipeline_weighted ? formatMoneyCompact(p.pipeline_weighted) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-neutral-300">
                      {p.grants_in_flight ? formatMoneyCompact(p.grants_in_flight) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right text-xs text-neutral-500 tabular-nums">
                      {formatDays(p.days_since_transaction)}
                    </td>
                    <td className="py-2 pr-3 text-right text-xs text-neutral-500 tabular-nums">
                      {formatDays(p.days_since_opp_update)}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {untagged > 0 ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-medium">
                          {untagged}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-700">0</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function LifetimeLedgerSection({ data }: { data: LifetimeResponse }) {
  const { totals, coverageGap, topCustomers } = data
  const matchedPct = coverageGap.xeroPayers === 0 ? 0 :
    Math.round((coverageGap.matched / coverageGap.xeroPayers) * 100)

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-wider">
        <History size={14} /> Lifetime ledger
        <span className="text-neutral-600 normal-case font-normal tracking-normal">
          · the canonical record is <code className="text-neutral-500">xero_invoices</code>
        </span>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Visible book (lifetime)"
          value={formatMoney(totals.visibleBook)}
          tone="positive"
          note={`${totals.distinctCustomers} distinct customers · ${totals.payingCustomers} have paid`}
        />
        <KpiCard
          label="Paid (all-time)"
          value={formatMoney(totals.lifetimePaid)}
          tone="positive"
          note="status = PAID"
        />
        <KpiCard
          label="Outstanding AR"
          value={formatMoney(totals.lifetimeAuthorised)}
          note="AUTHORISED / SUBMITTED"
        />
        <KpiCard
          label="Draft"
          value={formatMoney(totals.lifetimeDraft)}
          note="not yet sent"
        />
      </div>

      {/* Coverage gap callout */}
      <div className={cn(
        'rounded-lg border p-4',
        matchedPct < 50
          ? 'border-amber-900/60 bg-amber-950/20'
          : 'border-neutral-800 bg-neutral-900/50',
      )}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-200">
              {matchedPct < 50 ? <AlertTriangle size={14} className="text-amber-400" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
              CivicGraph coverage gap
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Only <strong className="text-neutral-200">{coverageGap.matched} of {coverageGap.xeroPayers}</strong> paying
              customers ({matchedPct}%) are in <code className="text-neutral-500">funder_context_snapshot</code> —
              the dossier feeding the kanban + narrative tools. {coverageGap.missingFromSnapshot} relationship histories
              are invisible to grant-recommendation and outreach drafting.
            </p>
            {coverageGap.missingNames.length > 0 && (
              <details className="mt-2 text-xs text-neutral-400">
                <summary className="cursor-pointer hover:text-neutral-200">
                  Missing from snapshot (top {coverageGap.missingNames.length} by paid):
                </summary>
                <ul className="mt-2 pl-4 list-disc space-y-0.5">
                  {coverageGap.missingNames.map(n => (
                    <li key={n} className="text-neutral-400">{n}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <div className="text-xs text-neutral-500 max-w-xs">
            Fix: extend <code>scripts/refresh-funder-context.mjs</code> to pull <code>DISTINCT contact_name FROM xero_invoices WHERE type=&apos;ACCREC&apos;</code> alongside the foundations seed.
          </div>
        </div>
      </div>

      {/* Top customers table */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
        <h3 className="text-sm font-medium text-neutral-300 mb-3">
          Top {topCustomers.length} customers by paid + outstanding
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Customer / Funder</th>
                <th className="py-2 pr-3 font-medium text-right">Invoices</th>
                <th className="py-2 pr-3 font-medium text-right">Paid</th>
                <th className="py-2 pr-3 font-medium text-right">Outstanding</th>
                <th className="py-2 pr-3 font-medium text-right">Draft</th>
                <th className="py-2 pr-3 font-medium text-right">Last</th>
                <th className="py-2 pr-3 font-medium">CG?</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => (
                <tr key={c.contact_name} className="border-b border-neutral-900 last:border-0 hover:bg-neutral-900/40">
                  <td className="py-2 pr-3 text-xs text-neutral-500 tabular-nums">{i + 1}</td>
                  <td className="py-2 pr-3 text-neutral-200">{c.contact_name}</td>
                  <td className="py-2 pr-3 text-right text-xs text-neutral-500 tabular-nums">{c.paid_count}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-emerald-300">
                    {c.paid_total > 0 ? formatMoney(c.paid_total) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-amber-300">
                    {c.authorised_outstanding > 0 ? formatMoney(c.authorised_outstanding) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-400">
                    {c.draft_total > 0 ? formatMoney(c.draft_total) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right text-xs text-neutral-500 tabular-nums">
                    {c.last_invoice_date ?? '—'}
                  </td>
                  <td className="py-2 pr-3">
                    {c.in_funder_snapshot
                      ? <CheckCircle2 size={14} className="text-emerald-400" />
                      : <AlertTriangle size={12} className="text-amber-500/60" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-neutral-600 mt-3">
          <strong>CG?</strong> = in <code>funder_context_snapshot</code> (the dossier feeding kanban + narrative tools).
          Amber = missing.
        </div>
      </div>
    </section>
  )
}

function BottomLayer({
  bottom,
  generatedAt,
}: {
  bottom: CommandResponse['bottom']
  generatedAt: string
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-wider">
        <Target size={14} /> Action hooks
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {bottom.actionLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 hover:border-emerald-700 hover:bg-emerald-950/20 transition-colors"
          >
            <div className="text-sm font-medium text-neutral-200 group-hover:text-emerald-300 flex items-center gap-1">
              {link.label}
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-xs text-neutral-500 mt-1">{link.note}</div>
          </Link>
        ))}
      </div>
      <div className="text-xs text-neutral-600 pt-2">
        Generated {new Date(generatedAt).toLocaleString()} ·
        <Link href="https://notion.so/ACT-Money-Framework-357ebcf981cf8101bc12dd5eab9ebec5" className="ml-1 text-emerald-400 hover:underline" target="_blank">
          Notion ACT Money Framework <ExternalLink size={10} className="inline" />
        </Link>
      </div>
    </section>
  )
}

function KpiCard({
  label,
  value,
  note,
  tone = 'neutral',
}: {
  label: string
  value: string
  note?: string
  tone?: 'positive' | 'negative' | 'neutral'
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={cn(
        'text-2xl font-semibold tabular-nums',
        tone === 'positive' && 'text-emerald-300',
        tone === 'negative' && 'text-rose-300',
      )}>
        {value}
      </div>
      {note && <div className="text-xs text-neutral-500 mt-1">{note}</div>}
    </div>
  )
}

function SkeletonBlocks() {
  return (
    <div className="space-y-4">
      <div className="h-32 rounded-lg bg-neutral-900/50 animate-pulse" />
      <div className="h-64 rounded-lg bg-neutral-900/50 animate-pulse" />
    </div>
  )
}

function formatDays(days: number | null): string {
  if (days == null) return '—'
  if (days === 0) return 'today'
  if (days === 1) return '1d'
  return `${days}d`
}
