'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Briefcase,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Flame,
  FlaskConical,
  Gauge,
  Info,
  Landmark,
  Layers,
  Loader2,
  Percent,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoney } from '@/lib/finance/format'
import { cn } from '@/lib/utils'

// Mirrors WeeklySnapshot + MonthlyPoint in lib/finance/ledger.ts.
interface WeeklySnapshot {
  cash: number
  cashAsOf: string | null
  cashStale: boolean
  monthIncome: number
  monthSpend: number
  monthNet: number
  weekNet: number
  monthlyBurn: number
  runwayMonths: number | null
  receiptedPct: number | null
  asOf: string
  ok: boolean
}
interface MonthlyPoint {
  month: string
  revenue: number
  expenses: number
  net: number
}
interface ProjectPLRow {
  code: string
  name: string | null
  income: number
  spend: number
  net: number
  budget: number
  variancePct: number | null
  pctConsumed: number | null
  funded: boolean
}
interface PeopleSpend {
  payroll: number
  drawings: number
  byProject: { code: string; amount: number }[]
}
interface GstPosition {
  collected: number
  paid: number
  net: number
}
// Mirrors PipelineFacts / Commitments in lib/finance/ledger.ts + the weekly API route.
interface BucketTotals {
  count: number
  value: number
  weighted: number
}
interface PileMixRow {
  pile: string
  value: number
  actualPct: number | null
  targetPct: number | null
}
interface TopOpp {
  title: string | null
  pile: string | null
  pipelineName: string | null
  value: number
  probability: number
  weighted: number
  stage: string | null
  contactName: string | null
}
interface PipelineFacts {
  summary: { worked: BucketTotals; demand: BucketTotals; wonWorked: BucketTotals }
  pileMix: PileMixRow[]
  concentration: { topName: string | null; pct: number | null; value: number }
  topOpps: TopOpp[]
  next90: { count: number; value: number }
  stalled: TopOpp[]
  securedUnbilledFloor: { count: number; value: number }
  ok: boolean
}
interface Commitments {
  openBills: number
  payrollMonthlyRunRate: number
  subsMonthlyRunRate: number
  monthlyCommittedRunRate: number
  cash: number
  weightedPipelineWorked: number
  weightedPipelineDemand: number
  securedUnbilledFloor: { count: number; value: number }
  ok: boolean
}
type AlertSeverity = 'critical' | 'warning' | 'info'
interface Alert {
  key: string
  severity: AlertSeverity
  title: string
  detail: string
}
interface InvoiceAging {
  total: number
  overdue: number
  newlyOverdue: number
  dueInWindow: number
  dueLater: number
  undated: number
  count: number
  oldestDate: string | null
}
interface Projection {
  weeks: number
  projectedCash: number
  cash: number
  arCollectible: number
  burnOverHorizon: number
  ok: boolean
}
interface WeeklyResponse {
  snapshot: WeeklySnapshot
  series: MonthlyPoint[]
  seriesOk: boolean
  projects: ProjectPLRow[]
  projectsOk: boolean
  people: PeopleSpend
  peopleOk: boolean
  gst: GstPosition
  receiptedPct: number | null
  commitments: Commitments
  pipeline: PipelineFacts
  alerts: Alert[]
  projection: Projection
  aging: { ar: InvoiceAging; ap: InvoiceAging; ok: boolean }
  fyStart: string
  fyEnd: string
}

const RUNWAY_ALERT_MONTHS = 6 // §4 alert: runway under 6 months = fundraise/cut now
const CONCENTRATION_ALERT_PCT = 50 // §4 alert: single funder > 50% of the open worked book

async function fetchWeekly(): Promise<WeeklyResponse> {
  const res = await fetch('/api/finance/weekly')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load the weekly report')
  return data
}

function compactMoney(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

function monthLabel(m: string): string {
  // m = 'YYYY-MM'
  const [y, mo] = m.split('-')
  return new Intl.DateTimeFormat('en-AU', { month: 'short' }).format(new Date(Number(y), Number(mo) - 1, 1))
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = 'default',
}: {
  title: string
  value: string
  detail?: string
  icon: typeof Banknote
  tone?: 'default' | 'good' | 'bad' | 'warn'
}) {
  const toneCls =
    tone === 'bad' ? 'text-red-200' : tone === 'good' ? 'text-emerald-200' : tone === 'warn' ? 'text-amber-200' : 'text-white'
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">{title}</p>
        <Icon className="h-5 w-5 text-cyan-200" />
      </div>
      <p className={cn('mt-2 text-3xl font-semibold tracking-tight', toneCls)}>{value}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-white/50">{detail}</p>}
    </div>
  )
}

function ProjectPLSection({ rows, ok }: { rows: ProjectPLRow[]; ok: boolean }) {
  const [showAll, setShowAll] = useState(false)
  const subsidised = rows.filter((r) => !r.funded)
  const selfSustaining = rows.length - subsidised.length
  const subsidyTotal = rows.reduce((s, r) => s + (r.net < 0 ? -r.net : 0), 0)
  // Exceptions = the projects that need a look: ACT-subsidised OR near/over budget (>90% consumed).
  const exceptions = rows.filter((r) => !r.funded || (r.pctConsumed != null && r.pctConsumed > 90))
  const shown = showAll ? rows : exceptions

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
          <Layers className="h-4 w-4 text-cyan-200" /> Per-project P&amp;L — {showAll ? 'all projects' : 'needs attention'}
        </h2>
        <p className="text-xs text-white/50">
          <span className="text-emerald-200">{selfSustaining} self-sustaining</span> ·{' '}
          <span className="text-amber-200">{subsidised.length} ACT-subsidised</span> ·{' '}
          {formatMoney(subsidyTotal)} net subsidy
        </p>
      </div>
      {!ok && <p className="mt-2 text-xs text-amber-200/80">⚠ Some project queries did not complete — list may be partial.</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-white/40">
              <th className="pb-2 pr-3 font-medium">Project</th>
              <th className="pb-2 px-3 text-right font-medium">Income</th>
              <th className="pb-2 px-3 text-right font-medium">Spend</th>
              <th className="pb-2 px-3 text-right font-medium">Net</th>
              <th className="pb-2 px-3 text-right font-medium">% of budget</th>
              <th className="pb-2 pl-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const overBudget = r.pctConsumed != null && r.pctConsumed > 100
              const nearBudget = r.pctConsumed != null && r.pctConsumed > 90 && !overBudget
              return (
                <tr key={r.code} className="border-t border-white/[0.06]">
                  <td className="py-2 pr-3">
                    <span className="font-mono text-xs text-white/90">{r.code}</span>
                    {r.name && <span className="ml-2 text-white/50">{r.name}</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/75">{formatMoney(r.income)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/75">{formatMoney(r.spend)}</td>
                  <td className={cn('px-3 py-2 text-right tabular-nums', r.net < 0 ? 'text-red-200' : 'text-emerald-200')}>
                    {formatMoney(r.net)}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 text-right tabular-nums',
                      r.pctConsumed == null ? 'text-white/30' : overBudget ? 'text-red-300' : nearBudget ? 'text-amber-200' : 'text-white/60',
                    )}
                  >
                    {r.pctConsumed == null ? '—' : `${r.pctConsumed}%`}
                    {overBudget && ' ⚠'}
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-0.5 text-[11px]',
                        r.funded ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/30 bg-amber-400/10 text-amber-100',
                      )}
                    >
                      {r.funded ? 'self-sustaining' : 'ACT-subsidised'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="py-6 text-center text-sm text-white/40">
            {rows.length === 0 ? 'No project data.' : 'All projects on budget and self-sustaining ✓'}
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-white/35">
          Accrual (project_monthly_financials). % of budget = spend ÷ annual expense budget; ⚠ = over.
          &ldquo;ACT-subsidised&rdquo; = spend &gt; project income. {showAll ? '' : 'Showing subsidised / near-or-over budget only.'}
        </p>
        {rows.length > exceptions.length && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
          >
            {showAll ? `Show needs-attention only (${exceptions.length})` : `Show all ${rows.length} projects`}
          </button>
        )}
      </div>
    </section>
  )
}

function PeopleCostsSection({ people, fySpend }: { people: PeopleSpend; fySpend: number }) {
  const pct = fySpend > 0 ? Math.round((people.payroll / fySpend) * 1000) / 10 : null
  const topProjects = people.byProject.slice(0, 6)
  const maxProj = topProjects.reduce((m, p) => Math.max(m, p.amount), 0)
  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
        <Users className="h-4 w-4 text-cyan-200" /> People costs (this FY)
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Payroll + contractors</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{formatMoney(people.payroll)}</p>
          <p className="mt-2 text-xs text-white/50">Wages + super + sub-contractors (acct 477/478/486)</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">% of total spend</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{pct == null ? '—' : `${pct}%`}</p>
          <p className="mt-2 text-xs text-white/50">people cost ÷ FY expenses</p>
        </div>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200/70">Founder drawings</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-100">{formatMoney(people.drawings)}</p>
          <p className="mt-2 text-xs text-amber-100/60">owner draw (acct 880/882) — NOT a business people cost; excluded above</p>
        </div>
      </div>

      {topProjects.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-white/40">Payroll by project</p>
          <div className="mt-2 space-y-1.5">
            {topProjects.map((p) => (
              <div key={p.code} className="flex items-center gap-3">
                <span className="w-20 shrink-0 font-mono text-xs text-white/70">{p.code}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-cyan-400/60" style={{ width: `${maxProj > 0 ? (p.amount / maxProj) * 100 : 0}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right tabular-nums text-xs text-white/60">{formatMoney(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function TaxRdSection({ gst, receiptedPct }: { gst: GstPosition; receiptedPct: number | null }) {
  const owes = gst.net >= 0
  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
        <Landmark className="h-4 w-4 text-cyan-200" /> Tax &amp; GST (this FY)
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">GST collected (1A)</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-200">{formatMoney(gst.collected)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">GST paid (1B)</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white/85">{formatMoney(gst.paid)}</p>
        </div>
        <div className={cn('rounded-2xl border p-4', owes ? 'border-amber-300/25 bg-amber-400/[0.06]' : 'border-emerald-400/25 bg-emerald-400/[0.06]')}>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">BAS position</p>
          <p className={cn('mt-2 text-2xl font-semibold tracking-tight', owes ? 'text-amber-100' : 'text-emerald-200')}>
            {formatMoney(Math.abs(gst.net))}
          </p>
          <p className="mt-1 text-xs text-white/50">{owes ? 'owed to the ATO' : 'refund position'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.24em] text-white/40">
            <Percent className="h-3 w-3" /> Receipt coverage
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white/85">{receiptedPct == null ? '—' : `${receiptedPct}%`}</p>
          <p className="mt-1 text-xs text-white/40">approx — has_attachments (drifts low)</p>
        </div>
      </div>

      <a
        href="/finance/rd-dashboard"
        className="mt-3 flex items-start gap-3 rounded-2xl border border-violet-300/20 bg-violet-400/[0.06] p-4 transition hover:border-violet-300/40"
      >
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" />
        <div>
          <p className="text-sm font-medium text-violet-50">R&amp;D Tax Incentive — net basis on the R&amp;D dashboard →</p>
          <p className="mt-1 text-xs leading-5 text-violet-100/60">
            The weekly view intentionally doesn&apos;t restate the 43.5% offset: the <code className="text-violet-100/80">rd_eligible</code> flag
            is inflated by founder drawings (≈$55K real basis vs the gross flag). Use the dedicated surface for the claim figure.
          </p>
        </div>
      </a>
      <p className="mt-3 text-[11px] text-white/35">
        GST derived as 10% of line_amount by tax_type (OUTPUT=income, INPUT=expense); GST-free / BAS-excluded carry none.
        Indicative — not a lodged BAS.
      </p>
    </section>
  )
}

function IncomeAndCommitmentsSection({ c, ar }: { c: Commitments; ar: InvoiceAging }) {
  // Income coming + forward commitments. Dated AR (overdue + due ≤13wk) is the HARD near-term inflow;
  // weighted pipeline is the SOFT forward signal. Open AP is intentionally absent — it's a phantom-data
  // alert, not a commitment. No composite cash gap: real secured income (grant tranches) lives in Notion.
  const arCollectible = ar.overdue + ar.dueInWindow
  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
        <Briefcase className="h-4 w-4 text-cyan-200" /> Income coming &amp; commitments
      </h2>
      {!c.ok && <p className="mt-2 text-xs text-amber-200/80">⚠ Some queries did not complete — figures may be partial.</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">AR coming (dated)</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-200">{formatMoney(arCollectible)}</p>
          <p className="mt-1 text-xs text-white/50">
            {formatMoney(ar.overdue)} overdue (chase) + {formatMoney(ar.dueInWindow)} due ≤13wk
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Weighted pipeline</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-cyan-100">{formatMoney(c.weightedPipelineWorked)}</p>
          <p className="mt-1 text-xs text-white/50">
            worked deals (value×prob), uncommitted · + {formatMoney(c.weightedPipelineDemand)} Goods demand signal
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Monthly run-rate</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white/85">{formatMoney(c.monthlyCommittedRunRate)}</p>
          <p className="mt-1 text-xs text-white/50">
            payroll {formatMoney(c.payrollMonthlyRunRate)} + subs {formatMoney(c.subsMonthlyRunRate)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Secured-unbilled (floor)</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-200">{formatMoney(c.securedUnbilledFloor.value)}</p>
          <p className="mt-1 text-xs text-white/50">{c.securedUnbilledFloor.count} GHL won opps, not yet invoiced</p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-white/35">
        GHL captures only {formatMoney(c.securedUnbilledFloor.value)} of secured-unbilled (a floor). ACT&apos;s real secured income —
        grant tranches (~$1.9M FY26 invoiced) — lives in Xero + the Notion{' '}
        <span className="text-white/55">Grant Tranches DB</span>, the source of truth for secured forward income.
      </p>
    </section>
  )
}

function PileBar({ row }: { row: PileMixRow }) {
  const actual = row.actualPct ?? 0
  const target = row.targetPct ?? 0
  const over = actual > target + 0.05
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-white/70">{row.pile}</span>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn('h-full rounded-full', over ? 'bg-amber-400/70' : 'bg-cyan-400/60')}
          style={{ width: `${Math.min(100, actual)}%` }}
        />
        {/* target marker */}
        <div className="absolute top-[-2px] h-[14px] w-0.5 bg-white/70" style={{ left: `${Math.min(100, target)}%` }} />
      </div>
      <span className="w-28 shrink-0 text-right text-xs text-white/55">
        <span className="tabular-nums text-white/80">{row.actualPct ?? 0}%</span> / {row.targetPct ?? '—'}% target
      </span>
      <span className="hidden w-20 shrink-0 text-right text-xs tabular-nums text-white/45 sm:inline">{formatMoney(row.value)}</span>
    </div>
  )
}

function OpportunitiesSection({ p }: { p: PipelineFacts }) {
  const conc = p.concentration
  const concAlert = conc.pct != null && conc.pct > CONCENTRATION_ALERT_PCT
  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
          <Target className="h-4 w-4 text-cyan-200" /> Opportunities (open worked book)
        </h2>
        <p className="text-xs text-white/45">
          {p.summary.worked.count} open worked deals · {formatMoney(p.summary.worked.value)} ({formatMoney(p.summary.worked.weighted)} weighted)
        </p>
      </div>
      {!p.ok && <p className="mt-2 text-xs text-amber-200/80">⚠ Some pipeline queries did not complete — figures may be partial.</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.24em] text-white/40">
            <Coins className="h-3 w-3" /> Top funder concentration
          </p>
          <p className={cn('mt-2 text-2xl font-semibold tracking-tight', concAlert ? 'text-amber-100' : 'text-white/85')}>
            {conc.pct == null ? '—' : `${conc.pct}%`}
          </p>
          <p className="mt-1 truncate text-xs text-white/50">{conc.topName ?? 'no named funder'} · {formatMoney(conc.value)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.24em] text-white/40">
            <Wallet className="h-3 w-3" /> Next-90-day inflows
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-200">{formatMoney(p.next90.value)}</p>
          <p className="mt-1 text-xs text-white/50">{p.next90.count} opps closing by date</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.24em] text-white/40">
            <Clock className="h-3 w-3" /> Stalled (60+ days)
          </p>
          <p className={cn('mt-2 text-2xl font-semibold tracking-tight', p.stalled.length > 0 ? 'text-amber-100' : 'text-white/85')}>
            {p.stalled.length}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {formatMoney(p.stalled.reduce((s, o) => s + o.value, 0))} not touched in 60 days
          </p>
        </div>
      </div>

      {p.topOpps.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <p className="text-xs text-white/40">Top open opportunities</p>
          <table className="mt-2 w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-white/40">
                <th className="pb-2 pr-3 font-medium">Opportunity</th>
                <th className="pb-2 px-3 font-medium">Pile</th>
                <th className="pb-2 px-3 text-right font-medium">Value</th>
                <th className="pb-2 px-3 text-right font-medium">Prob</th>
                <th className="pb-2 pl-3 text-right font-medium">Weighted</th>
              </tr>
            </thead>
            <tbody>
              {p.topOpps.map((o, i) => (
                <tr key={`${o.title}-${i}`} className="border-t border-white/[0.06]">
                  <td className="py-2 pr-3">
                    <span className="text-white/85">{(o.title || 'Untitled').slice(0, 52)}</span>
                    {o.contactName && <span className="ml-2 text-white/40">{o.contactName}</span>}
                  </td>
                  <td className="px-3 py-2 text-white/55">{o.pile ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/75">{formatMoney(o.value)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/55">{o.probability}%</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-cyan-100">{formatMoney(o.weighted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-5 text-white/35">
        GHL CRM book only. The &ldquo;Grants&rdquo; pipeline (GrantScope radar, ~$272M) is excluded; the Goods Demand Register
        ({formatMoney(p.summary.demand.value)} of buyer EOIs) is broken out as a demand signal, not counted in the worked headline.
      </p>
    </section>
  )
}

function alertStyle(sev: AlertSeverity): { box: string; icon: string; Icon: typeof AlertTriangle } {
  if (sev === 'critical') return { box: 'border-red-400/40 bg-red-500/[0.12]', icon: 'text-red-200', Icon: ShieldAlert }
  if (sev === 'warning') return { box: 'border-amber-400/30 bg-amber-400/[0.08]', icon: 'text-amber-200', Icon: AlertTriangle }
  return { box: 'border-white/10 bg-white/[0.04]', icon: 'text-cyan-200', Icon: Info }
}

function AttentionPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <section className="mt-6 flex items-center gap-3 rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.07] p-5">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-200" />
        <p className="text-sm text-emerald-50">Nothing needs your attention this week.</p>
      </section>
    )
  }
  return (
    <section className="mt-6 space-y-2">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
        <ShieldAlert className="h-4 w-4 text-amber-200" /> Needs attention this week ({alerts.length})
      </h2>
      {alerts.map((a) => {
        const st = alertStyle(a.severity)
        return (
          <div key={a.key} className={cn('flex items-start gap-3 rounded-2xl border p-4', st.box)}>
            <st.Icon className={cn('mt-0.5 h-5 w-5 shrink-0', st.icon)} />
            <div>
              <p className="text-sm font-semibold text-white/90">{a.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/60">{a.detail}</p>
            </div>
          </div>
        )
      })}
    </section>
  )
}

function ProjectedCashHeadline({ projection, snapshot }: { projection: Projection; snapshot: WeeklySnapshot }) {
  const p = projection
  const negative = p.projectedCash < 0
  return (
    <section className={cn('mt-6 rounded-3xl border p-6', negative ? 'border-red-400/40 bg-red-500/[0.10]' : 'border-cyan-300/25 bg-cyan-300/[0.06]')}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/45">
            <Wallet className="h-3.5 w-3.5" /> Projected cash · ~{p.weeks} weeks
          </p>
          <p className={cn('mt-2 text-5xl font-semibold tracking-tight', negative ? 'text-red-200' : 'text-white')}>{formatMoney(p.projectedCash)}</p>
          <p className="mt-2 max-w-xl text-xs leading-5 text-white/55">
            {formatMoney(p.cash)} cash + {formatMoney(p.arCollectible)} collectible AR − {formatMoney(p.burnOverHorizon)} burn. Hard
            data only — excludes phantom AP and uncommitted pipeline.
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Runway</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white/90">{snapshot.runwayMonths == null ? '—' : `${snapshot.runwayMonths}mo`}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Burn /mo</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white/90">{compactMoney(snapshot.monthlyBurn)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Net (mo)</p>
            <p className={cn('mt-1 text-2xl font-semibold tabular-nums', snapshot.monthNet < 0 ? 'text-red-200' : 'text-emerald-200')}>
              {compactMoney(snapshot.monthNet)}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PileMixSection({ p }: { p: PipelineFacts }) {
  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
        <Target className="h-4 w-4 text-cyan-200" /> Pile mix vs FY27 target
      </h2>
      <p className="mt-1 text-xs text-white/40">open worked pipeline by pile · tick = target share (Voice $200K / Flow $1.45M / Ground $150K / Grants $1M)</p>
      <div className="mt-4 space-y-2">
        {p.pileMix.map((row) => (
          <PileBar key={row.pile} row={row} />
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-white/35">
        Denominator is all open worked value, so Voice/Flow/Ground/Grants can sum to &lt;100% — the remainder is Other/Uncoded.
        Strategic, reviewed monthly — not a weekly-action number.
      </p>
    </section>
  )
}

export default function WeeklyReportPage() {
  const query = useQuery({ queryKey: ['finance', 'weekly'], queryFn: fetchWeekly })
  const data = query.data
  const s = data?.snapshot
  const runwayLow = s?.runwayMonths != null && s.runwayMonths < RUNWAY_ALERT_MONTHS

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.94))]" />
      <div className="relative mx-auto max-w-[1400px] px-6 py-8">
        <Link href="/finance" className="mb-6 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Finance
        </Link>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/75">
              <CalendarRange className="h-3.5 w-3.5" />
              Weekly business-strength report
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Business strength</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
              What needs attention this week, then projected cash and the evidence behind it. Computed through the
              one ledger (the same numbers the Notion weekly digest emits).
            </p>
          </div>
          {s && (
            <div className="text-right text-xs text-white/45">
              <p>as of {s.asOf}</p>
              {s.cashAsOf && (
                <p className={cn('mt-1 inline-flex items-center gap-1', s.cashStale && 'text-amber-200')}>
                  <Clock className="h-3 w-3" /> cash balance {s.cashStale ? 'stale' : 'fresh'} ({s.cashAsOf.slice(0, 10)})
                </p>
              )}
            </div>
          )}
        </header>

        {query.isLoading && (
          <div className="mt-10 inline-flex items-center gap-2 text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {query.isError && (
          <div className="mt-8 rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">
            {(query.error as Error).message}
          </div>
        )}

        {s && (
          <>
            {/* ① What needs attention this week */}
            {data?.alerts && <AttentionPanel alerts={data.alerts} />}

            {/* ② Glance — projected-cash headline + the survival numbers */}
            {data?.projection && <ProjectedCashHeadline projection={data.projection} snapshot={s} />}

            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard
                title="Cash on hand"
                value={formatMoney(s.cash)}
                detail="NAB Visa #8815 + ACT Everyday (excl. personal/savings)"
                icon={Banknote}
                tone={s.cash <= 0 ? 'bad' : 'default'}
              />
              <StatCard
                title="Runway"
                value={s.runwayMonths == null ? '—' : `${s.runwayMonths} mo`}
                detail={s.runwayMonths == null ? 'no net burn (month net-positive)' : `at ${formatMoney(s.monthlyBurn)}/mo burn`}
                icon={Gauge}
                tone={runwayLow ? 'bad' : s.runwayMonths == null ? 'good' : 'default'}
              />
              <StatCard
                title="Monthly burn"
                value={formatMoney(s.monthlyBurn)}
                detail="trailing 3-month avg expense"
                icon={Flame}
              />
              <StatCard
                title="Income (month)"
                value={formatMoney(s.monthIncome)}
                detail="this month, cash basis (excl. settlements)"
                icon={TrendingUp}
                tone="good"
              />
              <StatCard
                title="Spend (month)"
                value={formatMoney(s.monthSpend)}
                detail={`net ${formatMoney(s.monthNet)} this month (cash)`}
                icon={TrendingDown}
                tone={s.monthNet < 0 ? 'bad' : 'default'}
              />
              <StatCard
                title="Net (7 days)"
                value={formatMoney(s.weekNet)}
                detail="cash movement, excl. transfers"
                icon={s.weekNet < 0 ? TrendingDown : TrendingUp}
                tone={s.weekNet < 0 ? 'bad' : 'good'}
              />
            </section>

            {!s.ok && (
              <p className="mt-3 text-xs text-amber-200/80">
                ⚠ Some underlying queries did not complete — figures may be partial. Re-check the data feeds.
              </p>
            )}

            {data?.commitments && data?.aging && (
              <IncomeAndCommitmentsSection c={data.commitments} ar={data.aging.ar} />
            )}

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/80">Income vs spend by month (this FY)</h2>
                <span className="text-xs text-white/40">net line = income − expense</span>
              </div>
              <div className="mt-4 h-72 w-full">
                {data && data.series.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                      <YAxis tickFormatter={compactMoney} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} width={56} />
                      <Tooltip
                        contentStyle={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                        formatter={(v, name) => [formatMoney(Number(v ?? 0)), String(name)]}
                        labelFormatter={(label) => monthLabel(String(label))}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="revenue" name="Income" fill="rgba(16,185,129,0.7)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Spend" fill="rgba(248,113,113,0.6)" radius={[4, 4, 0, 0]} />
                      <Line dataKey="net" name="Net" stroke="rgba(34,211,238,0.95)" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/40">No monthly data.</div>
                )}
              </div>
            </section>

            {/* ③ Evidence — projects (exceptions), opportunities, people */}
            <ProjectPLSection rows={data?.projects || []} ok={data?.projectsOk ?? true} />

            {data?.pipeline && <OpportunitiesSection p={data.pipeline} />}

            <PeopleCostsSection
              people={data?.people || { payroll: 0, drawings: 0, byProject: [] }}
              fySpend={(data?.series || []).reduce((acc, p) => acc + p.expenses, 0)}
            />

            {/* ④ Periodic & reference — collapsed by default (strategic, not weekly-action) */}
            <details className="group mt-6 rounded-3xl border border-white/10 bg-white/[0.02]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-5 text-sm font-semibold text-white/70 transition hover:text-white">
                <span className="inline-flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /> Periodic &amp; reference — GST/BAS · pile mix
                </span>
                <span className="text-xs font-normal text-white/35">strategic / quarterly — not weekly action</span>
              </summary>
              <div className="px-4 pb-4">
                <TaxRdSection gst={data?.gst || { collected: 0, paid: 0, net: 0 }} receiptedPct={data?.receiptedPct ?? null} />
                {data?.pipeline && <PileMixSection p={data.pipeline} />}
              </div>
            </details>

            <p className="mt-6 text-xs leading-6 text-white/40">
              Weekly business-strength report (issue #140 §4) — action-first: what needs attention · projected cash · income &amp;
              commitments · projects (exceptions) · opportunities · periodic reference. Read-only — the reconcile click and any coding stay in Xero.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
