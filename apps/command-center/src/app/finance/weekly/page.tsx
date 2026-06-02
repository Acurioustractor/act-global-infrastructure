'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarRange,
  Clock,
  Flame,
  Gauge,
  Loader2,
  TrendingDown,
  TrendingUp,
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
interface WeeklyResponse {
  snapshot: WeeklySnapshot
  series: MonthlyPoint[]
  seriesOk: boolean
  fyStart: string
  fyEnd: string
}

const RUNWAY_ALERT_MONTHS = 6 // §4 alert: runway under 6 months = fundraise/cut now

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
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Whole-org snapshot</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
              Cash, runway, burn and this month&apos;s income vs spend — one read of business strength. Computed
              through the one ledger (the same numbers the Notion weekly digest emits).
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
            {runwayLow && (
              <div className="mt-6 flex items-start gap-3 rounded-3xl border border-red-400/30 bg-red-500/[0.12] p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-200" />
                <p className="text-sm leading-6 text-red-50">
                  <span className="font-semibold">Runway under {RUNWAY_ALERT_MONTHS} months</span> — {s.runwayMonths} months
                  at {formatMoney(s.monthlyBurn)}/mo burn on {formatMoney(s.cash)} cash. Fundraise or cut now.
                </p>
              </div>
            )}

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

            <p className="mt-6 text-xs leading-6 text-white/40">
              Slice 1 of the weekly report (issue #140). Next sections: per-project P&amp;L, people costs, GST/tax + R&amp;D,
              committed/&ldquo;betting on&rdquo;, opportunities &amp; pile mix. Receipted % wires in with the GST/tax section.
              Read-only — the reconcile click and any coding stay in Xero.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
