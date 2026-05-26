'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity, DollarSign, AlertTriangle, TrendingUp,
  Users, FileText, Clock, Shield, Sparkles,
} from 'lucide-react'
import { AskAboutThis } from '@/components/ask-about-this'

type Wired = 'ok' | 'not_wired' | 'stale'

interface IntelligenceData {
  timestamp: string
  fy: string
  data_quality: Record<string, Wired>
  financial: {
    revenue: number
    expenses: number
    net: number
    basis: string
    cash_received: number
    cash_spent: number
    committed_expense: number
    bills_outstanding: number
    cash_on_hand: number
    cash_as_of: string | null
    cash_stale: boolean
    monthly_burn: number
    runway_months: number | null
    runway_status: string
    wired: boolean
  }
  receivables: {
    wired: boolean
    total: number
    count: number
    pct_overdue: number
    buckets: { current: number; overdue_30: number; overdue_60: number; overdue_90: number }
  }
  projects: {
    wired: boolean
    avg_health: number | null
    total_projects: number
    critical: number
    attention: number
    healthy: number
    projects: Array<{ code: string; name: string; tier: string | null; health: number; status: string }>
  }
  relationships: {
    wired: boolean
    as_of: string | null
    stale: boolean
    needing_attention: number
    lowest_engagement: Array<{ name: string; days_since_contact: number; last_contact: string | null; summary: string | null }>
  }
  pipeline: {
    wired: boolean
    count: number
    total_value: number
    weighted_value: number
  }
  receipts: {
    wired: boolean
    pending_count: number
    rd_receipts_missing: number
    rd_refund_at_risk: number
    rd_coverage_pct: number | null
  }
  rd: {
    wired: boolean
    eligible_spend: number
    potential_refund: number
    fy: string
    applies: boolean
    window_open: boolean
    lodgement_close: string
    days_until_close: number
    note: string
  }
  activity: {
    wired: boolean
    last_30_days: { emails: number; transactions: number; meetings: number }
  }
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-400',
    warning: 'bg-amber-400',
    attention: 'bg-amber-400',
    healthy: 'bg-emerald-400',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'}`} />
}

/** No silent zeros: a tiny badge when a section's pipe is broken or stale. */
function WireBadge({ q }: { q: Wired | undefined }) {
  if (!q || q === 'ok') return null
  const label = q === 'not_wired' ? 'needs wiring' : 'stale data'
  const cls = q === 'not_wired' ? 'text-red-400 border-red-500/30' : 'text-amber-400 border-amber-500/30'
  return <span className={`ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>
}

export default function CompanyPage() {
  const [data, setData] = useState<IntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/intelligence')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const getContext = useCallback(() => {
    if (!data) return 'Loading...'
    return JSON.stringify(data, null, 2)
  }, [data])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-white/40 animate-pulse">Loading intelligence...</div>
      </div>
    )
  }

  if (!data) {
    return <div className="p-8 text-red-400">Failed to load intelligence data</div>
  }

  const { financial: fin, receivables: recv, projects: proj, relationships: rel, pipeline: pipe, receipts: rcpt, rd, activity: act, data_quality: dq } = data

  // Alerts — honest, no fabricated deadlines.
  const alerts: Array<{ severity: 'critical' | 'warning' | 'info'; message: string }> = []
  if (fin.runway_status === 'critical') alerts.push({ severity: 'critical', message: `Cash runway: ${fin.runway_months}mo — below 2-month threshold` })
  else if (fin.runway_status === 'warning') alerts.push({ severity: 'warning', message: `Cash runway: ${fin.runway_months}mo — below 3-month safety margin` })
  if (fin.cash_stale) alerts.push({ severity: 'info', message: `Bank balance last refreshed ${shortDate(fin.cash_as_of)} — re-sync Xero balances for live cash` })
  if (recv.wired && recv.pct_overdue > 50) alerts.push({ severity: 'warning', message: `${recv.pct_overdue}% of receivables overdue (${fmt(recv.total - recv.buckets.current)})` })
  if (rcpt.wired && rcpt.rd_receipts_missing > 0) alerts.push({ severity: 'warning', message: `${rcpt.rd_receipts_missing} bills missing receipts — ${fmt(rcpt.rd_refund_at_risk)} R&D refund at risk` })
  if (rd.window_open && rd.days_until_close <= 60) alerts.push({ severity: 'warning', message: `R&D lodgement window closes in ${rd.days_until_close} days (30 Apr 2027)` })
  if (proj.wired && proj.critical > 0) alerts.push({ severity: 'warning', message: `${proj.critical} project(s) in critical health` })

  // Sections that aren't wired — surface as their own honesty banner.
  const broken = Object.entries(dq).filter(([, v]) => v === 'not_wired').map(([k]) => k)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-400" />
          Company Overview
        </h1>
        <p className="text-sm text-white/40 mt-1">{data.fy} — {new Date(data.timestamp).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>

      {broken.length > 0 && (
        <div className="glass-card p-3 border-l-4 border-red-500/50 text-xs text-white/60">
          <span className="text-red-400 font-medium">Not wired:</span> {broken.join(', ')} — these sections have no live data source yet (shown as “—”, never as a fake 0).
        </div>
      )}

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-amber-500/50 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
            <AlertTriangle className="h-4 w-4" />
            {alerts.length} item{alerts.length > 1 ? 's' : ''} needing attention
          </div>
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <StatusDot status={a.severity} />
              <span className="text-white/70">{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Cash on Hand"
          value={fmt(fin.cash_on_hand)}
          sub={`${fin.runway_months == null ? '—' : fin.runway_months + 'mo'} runway · as of ${shortDate(fin.cash_as_of)}`}
          status={fin.cash_stale ? 'warning' : fin.runway_status}
        />
        <KpiCard icon={TrendingUp} label="Net P&L (FY26)" value={fmt(fin.net)} sub={`${fmt(fin.revenue)} rev / ${fmt(fin.expenses)} exp`} status={fin.net >= 0 ? 'healthy' : 'warning'} />
        <KpiCard icon={FileText} label="Receivables" value={recv.wired ? fmt(recv.total) : '—'} sub={recv.wired ? `${recv.pct_overdue}% overdue` : 'needs wiring'} status={recv.pct_overdue > 50 ? 'warning' : 'healthy'} />
        <KpiCard
          icon={Shield}
          label="R&D Refund (FY25-26)"
          value={fmt(rd.potential_refund)}
          sub={rd.window_open ? `${rd.days_until_close}d to lodge` : 'lodges Jul ’26–Apr ’27'}
          status="healthy"
        />
      </div>

      {/* Cash-flow context beneath the accrual headline */}
      <div className="text-xs text-white/40 -mt-2">
        Headline P&L is <span className="text-white/60">{fin.basis}</span> (matches Strategy). Cash flow:{' '}
        <span className="text-white/60">{fmt(fin.cash_received)}</span> received /{' '}
        <span className="text-white/60">{fmt(fin.cash_spent)}</span> spent · bills owed{' '}
        <span className="text-white/60">{fmt(fin.bills_outstanding)}</span>{' '}
        <span className="text-white/25">(verify — includes old/possibly-duplicate bills)</span>.
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Project Health */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-400" />
            Project Health ({proj.avg_health == null ? '—' : `${proj.avg_health}/100 avg`})
            <WireBadge q={dq.projects} />
          </h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {proj.projects.map(p => (
              <div key={p.code} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <StatusDot status={p.status} />
                  <span className="text-white/70">{p.code}</span>
                  <span className="text-white/40 truncate max-w-[180px]">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.health >= 80 ? 'bg-emerald-400' : p.health >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${p.health}%` }}
                    />
                  </div>
                  <span className="text-white/50 w-8 text-right">{p.health}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline + Receipts + Relationships */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              Funding Pipeline <span className="text-xs text-white/30">(ACT-linked)</span>
              <WireBadge q={dq.pipeline} />
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-white">{pipe.count}</div>
                <div className="text-xs text-white/40">Opportunities</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{fmt(pipe.total_value)}</div>
                <div className="text-xs text-white/40">Total Value</div>
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-400">{fmt(pipe.weighted_value)}</div>
                <div className="text-xs text-white/40">Weighted</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              Receipt & R&D Coverage
              <WireBadge q={dq.receipts} />
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-white">{rcpt.rd_coverage_pct == null ? '—' : `${rcpt.rd_coverage_pct}%`}</div>
                <div className="text-xs text-white/40">FY bills with receipts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">{rcpt.rd_receipts_missing}</div>
                <div className="text-xs text-white/40">missing ({fmt(rcpt.rd_refund_at_risk)} R&D at risk)</div>
              </div>
            </div>
            <div className="text-xs text-white/30 mt-3">
              R&D eligible spend YTD: <span className="text-white/60">{fmt(rd.eligible_spend)}</span> → {fmt(rd.potential_refund)} refund @ 43.5%
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              Relationships
              <WireBadge q={dq.relationships} />
            </h2>
            <div className="text-sm text-white/60">
              <span className="text-amber-400 font-medium">{rel.needing_attention}</span> contacts need follow-up (no contact &gt;30 days)
              {rel.stale && <span className="text-white/30 text-xs"> · signal as of {shortDate(rel.as_of)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Footer */}
      <div className="glass-card p-4 flex items-center justify-between text-sm text-white/40">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Last 30 days <WireBadge q={dq.activity} />
        </div>
        <div className="flex gap-6">
          <span>{act.last_30_days.emails.toLocaleString()} emails</span>
          <span>{act.last_30_days.transactions.toLocaleString()} transactions</span>
          <span>{act.last_30_days.meetings.toLocaleString()} meetings</span>
        </div>
      </div>

      <AskAboutThis
        pageTitle="Company Overview"
        getContext={getContext}
        suggestions={['How healthy is the business?', 'What needs urgent attention?', 'R&D position?', 'Receipt gaps?']}
      />
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, status }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
  status: string
}) {
  const borderColor = status === 'critical' ? 'border-red-500/30' : status === 'warning' ? 'border-amber-500/30' : 'border-white/10'
  return (
    <div className={`glass-card p-4 border ${borderColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-indigo-400" />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/40 mt-1">{sub}</div>
    </div>
  )
}
