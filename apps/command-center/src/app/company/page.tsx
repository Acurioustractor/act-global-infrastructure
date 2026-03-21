'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity, DollarSign, AlertTriangle, TrendingUp,
  Users, FileText, Clock, Shield, Sparkles,
} from 'lucide-react'
import { AskAboutThis } from '@/components/ask-about-this'

interface IntelligenceData {
  timestamp: string
  fy: string
  financial: {
    revenue: number
    expenses: number
    net: number
    cash_on_hand: number
    monthly_burn: number
    runway_months: number
    runway_status: string
  }
  receivables: {
    total: number
    count: number
    pct_overdue: number
    buckets: { current: number; overdue_30: number; overdue_60: number; overdue_90: number }
  }
  projects: {
    avg_health: number
    total_projects: number
    critical: number
    attention: number
    healthy: number
    projects: Array<{ code: string; name: string; tier: string; health: number; status: string }>
  }
  relationships: {
    needing_attention: number
    lowest_engagement: Array<{ name: string; score: number; last_contact: string }>
  }
  pipeline: {
    count: number
    total_value: number
    weighted_value: number
  }
  receipts: {
    pending_count: number
    rd_receipts_missing: number
    rd_refund_at_risk: number
    rd_coverage_pct: number
  }
  rd: {
    eligible_spend: number
    potential_refund: number
    days_until_deadline: number
  }
  activity: {
    last_30_days: { emails: number; transactions: number; meetings: number }
  }
}

function fmt(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
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

  const { financial: fin, receivables: recv, projects: proj, relationships: rel, pipeline: pipe, receipts: rcpt, rd, activity: act } = data

  // Collect alerts
  const alerts: Array<{ severity: 'critical' | 'warning' | 'info'; message: string }> = []
  if (fin.runway_status === 'critical') alerts.push({ severity: 'critical', message: `Cash runway: ${fin.runway_months} months — below 2-month threshold` })
  else if (fin.runway_status === 'warning') alerts.push({ severity: 'warning', message: `Cash runway: ${fin.runway_months} months — below 3-month safety margin` })
  if (recv.pct_overdue > 50) alerts.push({ severity: 'warning', message: `${recv.pct_overdue}% of receivables overdue (${fmt(recv.total - recv.buckets.current)})` })
  if (rcpt.rd_receipts_missing > 0) alerts.push({ severity: 'warning', message: `${rcpt.rd_receipts_missing} missing R&D receipts — ${fmt(rcpt.rd_refund_at_risk)} refund at risk` })
  if (rd.days_until_deadline <= 45) alerts.push({ severity: 'critical', message: `R&D registration deadline in ${rd.days_until_deadline} days (Apr 30)` })
  if (proj.critical > 0) alerts.push({ severity: 'warning', message: `${proj.critical} project(s) in critical health` })

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
        <KpiCard icon={DollarSign} label="Cash on Hand" value={fmt(fin.cash_on_hand)} sub={`${fin.runway_months}mo runway`} status={fin.runway_status} />
        <KpiCard icon={TrendingUp} label="Net P&L" value={fmt(fin.net)} sub={`${fmt(fin.revenue)} rev / ${fmt(fin.expenses)} exp`} status={fin.net >= 0 ? 'healthy' : 'warning'} />
        <KpiCard icon={FileText} label="Receivables" value={fmt(recv.total)} sub={`${recv.pct_overdue}% overdue`} status={recv.pct_overdue > 50 ? 'warning' : 'healthy'} />
        <KpiCard icon={Shield} label="R&D Refund" value={fmt(rd.potential_refund)} sub={`${rd.days_until_deadline}d to deadline`} status={rd.days_until_deadline <= 45 ? 'critical' : 'healthy'} />
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Project Health */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-400" />
            Project Health ({proj.avg_health}/100 avg)
          </h2>
          <div className="space-y-2">
            {proj.projects.map(p => (
              <div key={p.code} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <StatusDot status={p.status} />
                  <span className="text-white/70">{p.code}</span>
                  <span className="text-white/40">{p.name}</span>
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
              Funding Pipeline
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
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-white">{rcpt.rd_coverage_pct}%</div>
                <div className="text-xs text-white/40">R&D receipt coverage</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">{rcpt.rd_receipts_missing}</div>
                <div className="text-xs text-white/40">missing ({fmt(rcpt.rd_refund_at_risk)} at risk)</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              Relationships
            </h2>
            <div className="text-sm text-white/60">
              <span className="text-amber-400 font-medium">{rel.needing_attention}</span> contacts need follow-up (no contact &gt;30 days)
            </div>
          </div>
        </div>
      </div>

      {/* Activity Footer */}
      <div className="glass-card p-4 flex items-center justify-between text-sm text-white/40">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Last 30 days
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
