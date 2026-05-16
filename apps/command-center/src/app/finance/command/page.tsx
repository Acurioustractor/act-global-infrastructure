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

interface PileRow {
  pile: string
  openCount: number
  rawValue: number
  weighted: number
  pctOfWeighted: number
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
  pileMix: {
    pileCoverage: { total: number; tagged: number; pct: number }
    piles: PileRow[]
    concentrationWarning: string | null
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

interface ComplianceObligation {
  id: string
  title: string
  type: string
  entity: string
  due_date: string | null
  status: string
  notes?: string
  owner: string
  expected_refund_aud?: number
  monetary_value?: number
  days_until_due: number | null
  severity: 'critical' | 'high' | 'medium' | null
  at_risk: boolean
  source: 'wiki' | 'ghl_opportunities'
}

interface ComplianceResponse {
  generatedAt: string
  source: 'snapshot' | 'live'
  sources: { wiki: { count: number }; grants: { count: number } }
  counters: { critical: number; high: number; medium: number; filed: number }
  obligations: ComplianceObligation[]
}

interface PilotRiskItem {
  id: string
  severity: 'high' | 'medium'
  stage: 'scope' | 'fundraise'
  text: string
  owner: string
  age_days: number
  snooze_count: number
  snooze_burned: boolean
  value_estimate: number
  href: string
}

interface PilotRisksResponse {
  generatedAt: string
  items: PilotRiskItem[]
  counters: { high: number; medium: number; snooze_burned: number }
}

interface DeltaResponse {
  available: boolean
  reason?: string
  from?: string
  to?: string
  deltas?: {
    cash: number | null
    projected90d: number | null
    receivables: number | null
    pipelineWeighted: number | null
    grantsInFlight: number | null
    lifetimePaid: number | null
    lifetimeAr: number | null
    coverage: {
      transactions: number | null
      invoices: number | null
      opportunities: number | null
    }
    payingCustomers: number
  }
  driftNew?: Array<{ kind: string; amount: number; label: string }>
  driftResolved?: Array<{ kind: string; amount: number; label: string }>
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
  const { data: delta } = useQuery<DeltaResponse>({
    queryKey: ['finance', 'command-delta'],
    queryFn: async () => {
      const res = await fetch('/api/finance/command-delta', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
  })
  const { data: compliance } = useQuery<ComplianceResponse>({
    queryKey: ['finance', 'compliance-calendar'],
    queryFn: async () => {
      const res = await fetch('/api/finance/compliance-calendar', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
  })
  const { data: pilotRisks } = useQuery<PilotRisksResponse>({
    queryKey: ['finance', 'pilot-risks'],
    queryFn: async () => {
      const res = await fetch('/api/finance/pilot-risks', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
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
            {/* AT RISK TODAY — unified attention pane */}
            <AtRiskTodaySection compliance={compliance} pilotRisks={pilotRisks} top={data.top} drift={data.middle.drift} />
            {/* TOP LAYER */}
            <TopLayer top={data.top} />
            {/* MIDDLE LAYER */}
            <MiddleLayer middle={data.middle} />
            {/* PILE MIX — Voice/Flow/Ground/Grants concentration */}
            <PileMixSection data={data.pileMix} />
            {/* LIFETIME LEDGER — surfaces xero_invoices as the canonical record */}
            {lifetime && <LifetimeLedgerSection data={lifetime} />}
            {/* DELTA — what changed since yesterday's snapshot */}
            {delta && <DeltaSection data={delta} />}
            {/* BOTTOM LAYER */}
            <BottomLayer bottom={data.bottom} generatedAt={data.generatedAt} />
          </>
        )}
      </div>
    </div>
  )
}

function AtRiskTodaySection({
  compliance,
  pilotRisks,
  top,
  drift,
}: {
  compliance: ComplianceResponse | undefined
  pilotRisks: PilotRisksResponse | undefined
  top: CommandResponse['top']
  drift: DriftItem[]
}) {
  // Build risk items in severity order: critical (red), high (orange), medium (yellow)
  type Risk = {
    severity: 'critical' | 'high' | 'medium'
    icon: string
    label: string
    note: string
    href: string
  }
  const items: Risk[] = []

  // Compliance items
  if (compliance) {
    for (const o of compliance.obligations) {
      if (!o.severity) continue
      const dd = o.days_until_due
      const tag = dd == null ? '' : dd < 0 ? `T+${Math.abs(dd)}d` : `T-${dd}d`
      items.push({
        severity: o.severity,
        icon: '📋',
        label: `[${tag}] ${o.title}`,
        note: o.notes ? o.notes.split('\n')[0].slice(0, 60) : `${o.type} · ${o.entity}`,
        href:
          o.source === 'ghl_opportunities'
            ? '/finance/workbench'
            : 'https://github.com/Acurioustractor/act-global-infrastructure/blob/main/wiki/finance/compliance-calendar.md',
      })
    }
  }

  // Cash / runway derived risks (compute from top totals if cash is known)
  if (top.cashInBank != null) {
    const monthlyBurn = (top.fyExpenses - top.fyIncome) / Math.max(1, monthsSince('2025-07-01'))
    if (monthlyBurn > 0) {
      const runwayMonths = top.cashInBank / monthlyBurn
      if (runwayMonths < 2) {
        items.push({
          severity: 'critical',
          icon: '🔥',
          label: `runway ${runwayMonths.toFixed(1)} months`,
          note: `cash ${formatMoneyCompact(top.cashInBank)} · monthly burn ${formatMoneyCompact(monthlyBurn)}`,
          href: '/finance/overview',
        })
      } else if (runwayMonths < 3) {
        items.push({
          severity: 'medium',
          icon: '⏱️',
          label: `runway ${runwayMonths.toFixed(1)} months`,
          note: `cash ${formatMoneyCompact(top.cashInBank)} · monthly burn ${formatMoneyCompact(monthlyBurn)}`,
          href: '/finance/overview',
        })
      }
    }
  }

  // Drift items above $5K
  for (const d of drift.slice(0, 3)) {
    if (Math.abs(d.amount) < 5000) continue
    items.push({
      severity: Math.abs(d.amount) >= 50000 ? 'high' : 'medium',
      icon: '🔀',
      label: `drift ${formatMoneyCompact(Math.abs(d.amount))}`,
      note: d.label.slice(0, 60),
      href: d.workbenchUrl ?? '/finance/workbench',
    })
  }

  // Pilot lifecycle risks (Pass 2B B6) — stale scope/fundraise + snooze-burned
  if (pilotRisks) {
    for (const p of pilotRisks.items.slice(0, 5)) {
      const stageIcon = p.stage === 'fundraise' ? '💸' : '🔍'
      const valueTag = p.value_estimate > 0 ? ` · ~${formatMoneyCompact(p.value_estimate)}` : ''
      const burnTag = p.snooze_burned ? ' · 💤×3 forced decision' : p.snooze_count > 0 ? ` · 💤×${p.snooze_count}` : ''
      items.push({
        severity: p.severity,
        icon: stageIcon,
        label: `[${p.stage} ${p.age_days}d idle${valueTag}${burnTag}]`,
        note: p.text.slice(0, 60),
        href: p.href,
      })
    }
  }

  // Sort by severity (critical first, then high, then medium)
  const sevOrder = { critical: 0, high: 1, medium: 2 }
  items.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])

  const SEV_TONE: Record<Risk['severity'], { icon: string; bg: string; text: string }> = {
    critical: { icon: '🔴', bg: 'border-rose-900/60 bg-rose-950/30', text: 'text-rose-300' },
    high: { icon: '🟠', bg: 'border-amber-900/60 bg-amber-950/20', text: 'text-amber-300' },
    medium: { icon: '🟡', bg: 'border-yellow-900/40 bg-yellow-950/10', text: 'text-yellow-300' },
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-wider">
        <AlertTriangle size={14} className="text-rose-400" />
        At risk today
        <span className="text-neutral-600 normal-case font-normal tracking-normal">
          · {items.length} {items.length === 1 ? 'item' : 'items'}
          {compliance ? ` · compliance refreshed ${new Date(compliance.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/15 p-4 text-sm text-emerald-300">
          <CheckCircle2 size={14} className="inline mr-2 -mt-0.5" />
          All clear — you have a clean board today.
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 space-y-1.5">
          {items.map((r, i) => {
            const tone = SEV_TONE[r.severity]
            return (
              <Link
                key={i}
                href={r.href}
                target={r.href.startsWith('http') ? '_blank' : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded border hover:bg-neutral-800/50 transition-colors',
                  tone.bg,
                )}
              >
                <span className="text-base shrink-0">{tone.icon}</span>
                <span className={cn('text-sm font-medium shrink-0', tone.text)}>{r.label}</span>
                <span className="text-xs text-neutral-500 flex-1 truncate">{r.note}</span>
                <ArrowRight size={12} className="text-neutral-600 shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

function monthsSince(isoDate: string): number {
  const start = new Date(isoDate + 'T00:00:00Z').getTime()
  const now = Date.now()
  return Math.max(1, (now - start) / (1000 * 60 * 60 * 24 * 30.44))
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

function PileMixSection({ data }: { data: CommandResponse['pileMix'] }) {
  const PILE_TONE: Record<string, { bg: string; text: string; accent: string }> = {
    Voice: { bg: 'bg-purple-500/15', text: 'text-purple-300', accent: 'bg-purple-500/80' },
    Flow: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', accent: 'bg-cyan-500/80' },
    Ground: { bg: 'bg-amber-500/15', text: 'text-amber-300', accent: 'bg-amber-500/80' },
    Grants: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', accent: 'bg-emerald-500/80' },
    Other: { bg: 'bg-neutral-500/15', text: 'text-neutral-300', accent: 'bg-neutral-500/80' },
    '(unclassified)': { bg: 'bg-rose-500/15', text: 'text-rose-300', accent: 'bg-rose-500/80' },
  }

  const totalWeighted = data.piles.reduce((s, p) => s + p.weighted, 0)

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-wider">
        <Tags size={14} /> Pile mix — Voice · Flow · Ground · Grants
        <span className="text-neutral-600 normal-case font-normal tracking-normal">
          · weighted by stage probability
        </span>
      </div>

      {/* Coverage bar */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
          <span>Pile coverage on open opportunities</span>
          <span className="tabular-nums">
            {data.pileCoverage.tagged} / {data.pileCoverage.total} ({data.pileCoverage.pct.toFixed(1)}%)
          </span>
        </div>
        <div className="h-2 rounded bg-neutral-800 overflow-hidden">
          <div
            className={cn(
              'h-full',
              data.pileCoverage.pct >= 80 ? 'bg-emerald-500' :
              data.pileCoverage.pct >= 60 ? 'bg-amber-500' : 'bg-rose-500',
            )}
            style={{ width: `${data.pileCoverage.pct}%` }}
          />
        </div>
      </div>

      {/* Concentration warning */}
      {data.concentrationWarning && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-200">
          <AlertTriangle size={14} className="inline mr-2 -mt-0.5" />
          {data.concentrationWarning}
        </div>
      )}

      {/* Pile cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.piles.map(p => {
          const tone = PILE_TONE[p.pile] ?? PILE_TONE.Other
          return (
            <div key={p.pile} className={cn('rounded-lg border border-neutral-800 p-3', tone.bg)}>
              <div className={cn('text-xs font-medium uppercase tracking-wider mb-1', tone.text)}>{p.pile}</div>
              <div className="text-lg font-semibold tabular-nums text-neutral-100">
                {formatMoneyCompact(p.weighted)}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {p.openCount} open · {p.pctOfWeighted.toFixed(0)}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Stacked bar visualizing concentration */}
      {totalWeighted > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="text-xs text-neutral-500 mb-2">Weighted pipeline distribution</div>
          <div className="flex h-6 rounded overflow-hidden">
            {data.piles.map(p => {
              const tone = PILE_TONE[p.pile] ?? PILE_TONE.Other
              const width = totalWeighted === 0 ? 0 : (p.weighted / totalWeighted) * 100
              if (width < 0.1) return null
              return (
                <div
                  key={p.pile}
                  className={cn('h-full', tone.accent)}
                  style={{ width: `${width}%` }}
                  title={`${p.pile}: ${formatMoney(p.weighted)} (${p.pctOfWeighted.toFixed(1)}%)`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-neutral-400">
            {data.piles.map(p => {
              const tone = PILE_TONE[p.pile] ?? PILE_TONE.Other
              return (
                <span key={p.pile} className="inline-flex items-center gap-1.5">
                  <span className={cn('inline-block w-2 h-2 rounded-sm', tone.accent)} />
                  {p.pile}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function DeltaSection({ data }: { data: DeltaResponse }) {
  if (!data.available) {
    return (
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-wider">
          <RefreshCw size={14} /> What's changed
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-500">
          {data.reason ?? 'no snapshot data'} — run <code>node scripts/money-command-digest.mjs</code> daily to enable deltas
        </div>
      </section>
    )
  }
  const d = data.deltas!
  const arrow = (n: number | null) => {
    if (n == null || Math.abs(n) < 0.005) return ''
    return n > 0 ? '↑' : '↓'
  }
  const tone = (n: number | null, goodWhenPositive = true) => {
    if (n == null || Math.abs(n) < 0.005) return 'text-neutral-500'
    const good = goodWhenPositive ? n > 0 : n < 0
    return good ? 'text-emerald-400' : 'text-rose-400'
  }
  const fmtDeltaMoney = (n: number | null) => {
    if (n == null) return '—'
    if (Math.abs(n) < 1) return '$0'
    const sign = n > 0 ? '+' : '−'
    return `${sign}${formatMoneyCompact(Math.abs(n))}`
  }
  const fmtDeltaPct = (n: number | null) => {
    if (n == null) return '—'
    if (Math.abs(n) < 0.05) return '0%'
    const sign = n > 0 ? '+' : '−'
    return `${sign}${Math.abs(n).toFixed(1)}pp`
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-wider">
        <RefreshCw size={14} /> What's changed
        <span className="text-neutral-600 normal-case font-normal tracking-normal">
          · {data.from} → {data.to}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DeltaCard label="Cash" value={fmtDeltaMoney(d.cash)} arrow={arrow(d.cash)} tone={tone(d.cash)} />
        <DeltaCard label="Projected 90d" value={fmtDeltaMoney(d.projected90d)} arrow={arrow(d.projected90d)} tone={tone(d.projected90d)} />
        <DeltaCard label="Receivables" value={fmtDeltaMoney(d.receivables)} arrow={arrow(d.receivables)} tone={tone(d.receivables, false)} />
        <DeltaCard label="Pipeline ×p" value={fmtDeltaMoney(d.pipelineWeighted)} arrow={arrow(d.pipelineWeighted)} tone={tone(d.pipelineWeighted)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <DeltaCard label="Txn coverage" value={fmtDeltaPct(d.coverage.transactions)} arrow={arrow(d.coverage.transactions)} tone={tone(d.coverage.transactions)} />
        <DeltaCard label="Inv coverage" value={fmtDeltaPct(d.coverage.invoices)} arrow={arrow(d.coverage.invoices)} tone={tone(d.coverage.invoices)} />
        <DeltaCard label="Opp coverage" value={fmtDeltaPct(d.coverage.opportunities)} arrow={arrow(d.coverage.opportunities)} tone={tone(d.coverage.opportunities)} />
      </div>

      {(data.driftNew && data.driftNew.length > 0) || (data.driftResolved && data.driftResolved.length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-4">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-medium uppercase tracking-wider mb-2">
              <AlertTriangle size={12} /> New drift since {data.from}
            </div>
            {(data.driftNew ?? []).length === 0 ? (
              <div className="text-xs text-neutral-500">none</div>
            ) : (
              <ul className="text-xs space-y-1">
                {(data.driftNew ?? []).slice(0, 5).map((d, i) => (
                  <li key={i} className="text-neutral-300 truncate">
                    <span className="text-amber-400 mr-1">[{d.kind}]</span>
                    {formatMoneyCompact(Math.abs(d.amount))} · {d.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-4">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-medium uppercase tracking-wider mb-2">
              <CheckCircle2 size={12} /> Resolved since {data.from}
            </div>
            {(data.driftResolved ?? []).length === 0 ? (
              <div className="text-xs text-neutral-500">none</div>
            ) : (
              <ul className="text-xs space-y-1">
                {(data.driftResolved ?? []).slice(0, 5).map((d, i) => (
                  <li key={i} className="text-neutral-300 truncate">
                    <span className="text-emerald-400 mr-1">[{d.kind}]</span>
                    {formatMoneyCompact(Math.abs(d.amount))} · {d.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function DeltaCard({
  label,
  value,
  arrow,
  tone,
}: {
  label: string
  value: string
  arrow: string
  tone: string
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={cn('text-lg font-semibold tabular-nums flex items-baseline gap-1', tone)}>
        <span>{arrow}</span>
        <span>{value}</span>
      </div>
    </div>
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
