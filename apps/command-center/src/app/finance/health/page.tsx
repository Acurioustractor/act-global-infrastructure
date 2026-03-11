'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Activity,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  Tag,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  DollarSign,
  Zap,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────

interface HealthData {
  healthScore: number
  generatedAt: string
  systemHealth: {
    overallStatus: 'green' | 'amber' | 'red'
    syncs: Array<{
      name: string
      status: 'green' | 'amber' | 'red'
      lastSuccess: string | null
      recordCount: number
      lastError: string | null
      hoursSince: number
    }>
    dext: {
      status: 'green' | 'amber' | 'red'
      lastForward: string | null
      hoursSince: number
    }
    pipeline: Record<string, number>
    tagging: { total: number; tagged: number; pct: number; remaining: number }
  }
  compliance: {
    overallStatus: 'green' | 'amber' | 'red'
    quarter: string
    basDueDate: string
    gst: { collected: number; paid: number; net: number; position: 'payable' | 'refundable' }
    receipts: { totalSpend: number; withReceipt: number; pct: number; missing: number }
    rdTax: {
      eligibleVendors: number
      totalSpend: number
      projectedOffset: number
      threshold: number
      onTrack: boolean
    }
    entities: Array<{ name: string; abn: string }>
  }
  spending: {
    thisMonth: number
    lastMonth: number
    changePercent: number
    direction: 'up' | 'down' | 'flat'
    topProjects: Array<{ code: string; amount: number }>
    subscriptions: { count: number; monthlySpend: number }
    tips: string[]
    taggingPct: number
  }
  invoicing: {
    totalOutstanding: number
    totalOverdue: number
    overdueCount: number
    totalCount: number
    topOutstanding: Array<{ name: string; amount: number }>
    collectionRate: number
  }
  actionQueue: {
    items: Array<{
      type: string
      priority: 'critical' | 'high' | 'medium'
      title: string
      count: number
      actionUrl: string
      actionLabel: string
      estimatedMinutes: number
    }>
    totalItems: number
    totalMinutes: number
  }
}

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toFixed(0)}`
}

function statusIcon(status: 'green' | 'amber' | 'red') {
  if (status === 'green') return <CheckCircle2 className="h-4 w-4 text-green-400" />
  if (status === 'amber') return <AlertTriangle className="h-4 w-4 text-amber-400" />
  return <AlertTriangle className="h-4 w-4 text-red-400" />
}

function statusBg(status: 'green' | 'amber' | 'red') {
  if (status === 'green') return 'bg-green-500/10 border-green-500/20'
  if (status === 'amber') return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

function priorityBadge(p: 'critical' | 'high' | 'medium') {
  const styles = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-amber-500/20 text-amber-400',
    medium: 'bg-blue-500/20 text-blue-400',
  }
  return <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', styles[p])}>{p}</span>
}

function timeAgo(iso: string | null) {
  if (!iso) return 'never'
  const h = (Date.now() - new Date(iso).getTime()) / 3600000
  if (h < 1) return `${Math.round(h * 60)}m ago`
  if (h < 24) return `${Math.round(h)}h ago`
  return `${Math.round(h / 24)}d ago`
}

// ── Section Component ──────────────────────────────────────────────────

function Section({
  title,
  icon,
  status,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: React.ReactNode
  status?: 'green' | 'amber' | 'red'
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {status && statusIcon(status)}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-white/5 pt-4">{children}</div>}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────

export default function FinanceHealthPage() {
  const { data, isLoading, refetch, isFetching } = useQuery<HealthData>({
    queryKey: ['finance-health'],
    queryFn: async () => {
      const res = await fetch('/api/finance/health')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40 flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" /> Loading health dashboard...
        </div>
      </div>
    )
  }

  if (!data) return null

  const { systemHealth, compliance, spending, invoicing, actionQueue } = data

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href="/finance" className="text-white/40 hover:text-white/70 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Activity className="h-8 w-8 text-emerald-400" />
              Finance Health
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>
        <p className="text-white/50 text-sm">
          Generated {new Date(data.generatedAt).toLocaleString('en-AU')}
        </p>
      </header>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {/* Health Score */}
        <div className={cn('glass-card p-4 border', statusBg(
          data.healthScore >= 75 ? 'green' : data.healthScore >= 50 ? 'amber' : 'red'
        ))}>
          <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
            <Activity className="h-3 w-3" /> Health Score
          </div>
          <div className="text-3xl font-bold text-white tabular-nums">{data.healthScore}%</div>
        </div>

        {/* Compliance */}
        <div className={cn('glass-card p-4 border', statusBg(compliance.overallStatus))}>
          <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
            <Shield className="h-3 w-3" /> Compliance
          </div>
          <div className="text-3xl font-bold text-white tabular-nums">{compliance.receipts.pct}%</div>
          <div className="text-xs text-white/30">receipt coverage</div>
        </div>

        {/* Tagging Coverage */}
        <div className="glass-card p-4">
          <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
            <Tag className="h-3 w-3" /> Tagged
          </div>
          <div className="text-3xl font-bold text-white tabular-nums">{spending.taggingPct}%</div>
          <div className="text-xs text-white/30">{systemHealth.tagging.remaining} remaining</div>
        </div>

        {/* Action Items */}
        <div className={cn('glass-card p-4 border', actionQueue.totalItems > 0 ? statusBg('amber') : statusBg('green'))}>
          <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Action Items
          </div>
          <div className="text-3xl font-bold text-white tabular-nums">{actionQueue.totalItems}</div>
          <div className="text-xs text-white/30">~{actionQueue.totalMinutes}min estimated</div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">

        {/* Action Queue — always open */}
        <Section
          title={`Action Queue (${actionQueue.items.length} items)`}
          icon={<Zap className="h-5 w-5 text-amber-400" />}
          status={actionQueue.totalItems > 0 ? 'amber' : 'green'}
          defaultOpen={true}
        >
          {actionQueue.items.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-2" />
              <p className="text-white/60">All caught up — no overdue items</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actionQueue.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    {priorityBadge(item.priority)}
                    <span className="text-sm text-white">{item.title}</span>
                    <span className="text-xs text-white/30 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> ~{item.estimatedMinutes}min
                    </span>
                  </div>
                  <Link
                    href={item.actionUrl}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {item.actionLabel} <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* System Health */}
        <Section
          title="System Health"
          icon={<RefreshCw className="h-5 w-5 text-blue-400" />}
          status={systemHealth.overallStatus}
          defaultOpen={systemHealth.overallStatus !== 'green'}
        >
          <div className="grid grid-cols-2 gap-3">
            {systemHealth.syncs.map(sync => (
              <div key={sync.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  {statusIcon(sync.status)}
                  <span className="text-sm text-white">{sync.name.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/50">{timeAgo(sync.lastSuccess)}</div>
                  <div className="text-xs text-white/30">{(sync.recordCount || 0).toLocaleString()} records</div>
                </div>
              </div>
            ))}
            {/* Dext */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                {statusIcon(systemHealth.dext.status)}
                <span className="text-sm text-white">Dext Forwarding</span>
              </div>
              <div className="text-xs text-white/50">{timeAgo(systemHealth.dext.lastForward)}</div>
            </div>
            {/* Tagging */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-white">Transaction Tagging</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/50">{systemHealth.tagging.pct}%</div>
                <div className="text-xs text-white/30">{systemHealth.tagging.remaining} remaining</div>
              </div>
            </div>
          </div>
          {/* Pipeline stages */}
          {Object.keys(systemHealth.pipeline).length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs text-white/40 mb-2 font-medium">Receipt Pipeline Stages</h3>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(systemHealth.pipeline).map(([stage, count]) => (
                  <div key={stage} className="px-3 py-1.5 bg-white/5 rounded-lg">
                    <span className="text-xs text-white/50">{stage.replace(/_/g, ' ')}</span>
                    <span className="text-sm text-white ml-2 font-medium tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Compliance Scoreboard */}
        <Section
          title={`Compliance — ${compliance.quarter}`}
          icon={<Shield className="h-5 w-5 text-emerald-400" />}
          status={compliance.overallStatus}
        >
          <div className="grid grid-cols-3 gap-4">
            {/* GST */}
            <div className="p-4 bg-white/5 rounded-lg">
              <h3 className="text-xs text-white/40 mb-3 font-medium">GST Position</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">1A Collected</span>
                  <span className="text-green-400 tabular-nums">{formatMoney(compliance.gst.collected)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">1B Paid</span>
                  <span className="text-red-400 tabular-nums">{formatMoney(compliance.gst.paid)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-medium">
                  <span className="text-white/80">Net GST</span>
                  <span className={cn('tabular-nums', compliance.gst.position === 'payable' ? 'text-amber-400' : 'text-green-400')}>
                    {formatMoney(Math.abs(compliance.gst.net))} {compliance.gst.position}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-white/30">
                BAS due: {compliance.basDueDate}
              </div>
            </div>

            {/* Receipt Compliance */}
            <div className="p-4 bg-white/5 rounded-lg">
              <h3 className="text-xs text-white/40 mb-3 font-medium">Receipt Compliance</h3>
              <div className="text-3xl font-bold text-white tabular-nums mb-1">{compliance.receipts.pct}%</div>
              <div className="text-xs text-white/40">
                {compliance.receipts.withReceipt.toLocaleString()} / {compliance.receipts.totalSpend.toLocaleString()} spend transactions
              </div>
              {compliance.receipts.missing > 0 && (
                <div className="mt-2 text-xs text-amber-400">
                  {compliance.receipts.missing.toLocaleString()} missing — ATO requires 5-year retention
                </div>
              )}
            </div>

            {/* R&D Tax */}
            <div className="p-4 bg-white/5 rounded-lg">
              <h3 className="text-xs text-white/40 mb-3 font-medium">R&D Tax Incentive</h3>
              <div className="text-xl font-bold text-white tabular-nums mb-1">
                {formatMoney(compliance.rdTax.totalSpend)}
              </div>
              <div className="text-xs text-white/40 mb-2">
                eligible spend ({compliance.rdTax.eligibleVendors} vendors)
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">43.5% offset</span>
                <span className="text-green-400 tabular-nums">{formatMoney(compliance.rdTax.projectedOffset)}</span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div
                    className={cn('h-1.5 rounded-full', compliance.rdTax.onTrack ? 'bg-green-400' : 'bg-amber-400')}
                    style={{ width: `${Math.min(100, (compliance.rdTax.totalSpend / compliance.rdTax.threshold) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-white/30 mt-1">
                  {compliance.rdTax.onTrack ? 'Above $20K threshold' : `${formatMoney(compliance.rdTax.threshold - compliance.rdTax.totalSpend)} to threshold`}
                </div>
              </div>
            </div>
          </div>

          {/* Entities */}
          <div className="mt-4 flex gap-2">
            {compliance.entities.map(e => (
              <div key={e.abn} className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/50">
                {e.name} — ABN {e.abn}
              </div>
            ))}
          </div>
        </Section>

        {/* Spending Intelligence */}
        <Section
          title="Spending Intelligence"
          icon={<DollarSign className="h-5 w-5 text-purple-400" />}
        >
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* MoM comparison */}
            <div className="p-4 bg-white/5 rounded-lg">
              <h3 className="text-xs text-white/40 mb-2 font-medium">This Month</h3>
              <div className="text-2xl font-bold text-white tabular-nums">{formatMoney(spending.thisMonth)}</div>
              <div className="flex items-center gap-1 mt-1">
                {spending.direction === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-red-400" />
                ) : spending.direction === 'down' ? (
                  <TrendingDown className="h-3 w-3 text-green-400" />
                ) : (
                  <Minus className="h-3 w-3 text-white/40" />
                )}
                <span className={cn('text-xs tabular-nums',
                  spending.direction === 'up' ? 'text-red-400' : spending.direction === 'down' ? 'text-green-400' : 'text-white/40'
                )}>
                  {spending.changePercent > 0 ? '+' : ''}{spending.changePercent}% vs last month ({formatMoney(spending.lastMonth)})
                </span>
              </div>
            </div>

            {/* Top projects */}
            <div className="p-4 bg-white/5 rounded-lg">
              <h3 className="text-xs text-white/40 mb-2 font-medium">Top Projects (This Month)</h3>
              <div className="space-y-1.5">
                {spending.topProjects.map(p => (
                  <div key={p.code} className="flex justify-between text-sm">
                    <span className="text-white/60">{p.code}</span>
                    <span className="text-white tabular-nums">{formatMoney(p.amount)}</span>
                  </div>
                ))}
                {spending.topProjects.length === 0 && (
                  <span className="text-xs text-white/30">No spend this month</span>
                )}
              </div>
            </div>

            {/* Subscriptions */}
            <div className="p-4 bg-white/5 rounded-lg">
              <h3 className="text-xs text-white/40 mb-2 font-medium">Subscriptions</h3>
              <div className="text-2xl font-bold text-white tabular-nums">{formatMoney(spending.subscriptions.monthlySpend)}</div>
              <div className="text-xs text-white/40">{spending.subscriptions.count} active subscriptions/mo</div>
              <Link href="/finance/subscriptions" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-flex items-center gap-1">
                Manage <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Saving tips */}
          {spending.tips.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs text-white/40 font-medium flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Saving Tips
              </h3>
              {spending.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                  <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-white/70">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Invoicing & Receivables */}
        <Section
          title="Invoicing & Receivables"
          icon={<FileText className="h-5 w-5 text-cyan-400" />}
          status={invoicing.overdueCount > 0 ? 'amber' : 'green'}
        >
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <div className="text-xs text-white/40 mb-1">Outstanding</div>
              <div className="text-xl font-bold text-white tabular-nums">{formatMoney(invoicing.totalOutstanding)}</div>
              <div className="text-xs text-white/30">{invoicing.totalCount} invoices</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <div className="text-xs text-white/40 mb-1">Overdue</div>
              <div className="text-xl font-bold text-red-400 tabular-nums">{formatMoney(invoicing.totalOverdue)}</div>
              <div className="text-xs text-white/30">{invoicing.overdueCount} invoices</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <div className="text-xs text-white/40 mb-1">Collection Rate</div>
              <div className="text-xl font-bold text-white tabular-nums">{invoicing.collectionRate}%</div>
              <div className="text-xs text-white/30">6-month average</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <Link href="/finance/revenue" className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                Revenue Dashboard <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {invoicing.topOutstanding.length > 0 && (
            <div>
              <h3 className="text-xs text-white/40 mb-2 font-medium">Top Outstanding</h3>
              <div className="space-y-1.5">
                {invoicing.topOutstanding.map(inv => (
                  <div key={inv.name} className="flex justify-between text-sm p-2 bg-white/5 rounded">
                    <span className="text-white/60">{inv.name}</span>
                    <span className="text-white tabular-nums font-medium">{formatMoney(inv.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
