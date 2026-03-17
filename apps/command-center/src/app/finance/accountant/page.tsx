'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
  Tag,
  Calculator,
  Clock,
  TrendingDown,
  BarChart3,
  ShieldCheck,
} from 'lucide-react'
import { ProgressBar, BarChart } from '@tremor/react'
import {
  getBookkeepingProgress,
  getTaxData,
  getRdTracking,
  getReceiptScore,
  getSpendingByProject,
} from '@/lib/api'
import { cn } from '@/lib/utils'

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toFixed(2)}`
}

function pctColor(pct: number) {
  if (pct >= 90) return 'text-green-400'
  if (pct >= 70) return 'text-yellow-400'
  return 'text-red-400'
}

function pctBg(pct: number) {
  if (pct >= 90) return 'bg-green-500/20'
  if (pct >= 70) return 'bg-yellow-500/20'
  return 'bg-red-500/20'
}

interface ReconciliationData {
  summary: {
    total: number
    tagged: number
    reconciled: number
    withReceipt: number
    untaggedValue: number
    taggedPct: number
    reconciledPct: number
    receiptPct: number
  }
  transactions: Array<{
    id: string
    contact_name: string | null
    total: number
    date: string
    type: string
    project_code: string | null
    is_reconciled: boolean | null
    has_attachments: boolean | null
  }>
  projects: Array<{ code: string; name: string }>
}

export default function AccountantPortalPage() {
  const { data: reconciliation, isLoading: reconLoading } = useQuery<ReconciliationData>({
    queryKey: ['accountant', 'reconciliation'],
    queryFn: () =>
      fetch('/api/finance/reconciliation?status=all&limit=50').then(r => r.json()),
  })

  const { data: progress } = useQuery({
    queryKey: ['bookkeeping', 'progress'],
    queryFn: getBookkeepingProgress,
  })

  const { data: taxData } = useQuery({
    queryKey: ['tax', 'data'],
    queryFn: () => getTaxData(),
  })

  const { data: rdData } = useQuery({
    queryKey: ['rd', 'tracking'],
    queryFn: getRdTracking,
  })

  const { data: receiptScore } = useQuery({
    queryKey: ['receipts', 'score'],
    queryFn: getReceiptScore,
  })

  const { data: projectSpending } = useQuery({
    queryKey: ['spending', 'by-project', 12],
    queryFn: () => getSpendingByProject(12),
  })

  const summary = reconciliation?.summary
  const overdueInvoices = progress?.overdueInvoices?.invoices || []
  const needsTag = reconciliation?.transactions?.filter(t => !t.project_code) || []
  const needsReceipt = reconciliation?.transactions?.filter(
    t => !t.has_attachments && !['SPEND-TRANSFER', 'RECEIVE-TRANSFER'].includes(t.type)
  ) || []

  // BAS quarter info
  const now = new Date()
  const quarter = Math.ceil((now.getMonth() + 1) / 3)
  const basQuarter = `Q${quarter}`
  const basYear = now.getFullYear()

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/finance" className="text-white/40 hover:text-white/80 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Calculator className="h-8 w-8 text-blue-400" />
                Accountant Portal
              </h1>
              <p className="text-lg text-white/60 mt-1">
                Reconciliation, BAS prep, receipt coverage
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/finance" className="btn-glass flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Operator View
            </Link>
            <Link href="/finance/board" className="btn-glass flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Board View
            </Link>
          </div>
        </div>
      </header>

      {/* Reconciliation Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', pctBg(summary?.taggedPct || 0))}>
              <Tag className={cn('h-5 w-5', pctColor(summary?.taggedPct || 0))} />
            </div>
            <div>
              <p className="text-sm text-white/50">Project Tagged</p>
              <p className={cn('text-2xl font-bold', pctColor(summary?.taggedPct || 0))}>
                {summary?.taggedPct || 0}%
              </p>
            </div>
          </div>
          <p className="text-xs text-white/40">{summary?.tagged?.toLocaleString() || 0} of {summary?.total?.toLocaleString() || 0} transactions</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', pctBg(summary?.reconciledPct || 0))}>
              <CheckCircle2 className={cn('h-5 w-5', pctColor(summary?.reconciledPct || 0))} />
            </div>
            <div>
              <p className="text-sm text-white/50">Reconciled</p>
              <p className={cn('text-2xl font-bold', pctColor(summary?.reconciledPct || 0))}>
                {summary?.reconciledPct || 0}%
              </p>
            </div>
          </div>
          <p className="text-xs text-white/40">{summary?.reconciled?.toLocaleString() || 0} of {summary?.total?.toLocaleString() || 0}</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', pctBg(summary?.receiptPct || 0))}>
              <Receipt className={cn('h-5 w-5', pctColor(summary?.receiptPct || 0))} />
            </div>
            <div>
              <p className="text-sm text-white/50">Receipt Coverage</p>
              <p className={cn('text-2xl font-bold', pctColor(summary?.receiptPct || 0))}>
                {summary?.receiptPct || 0}%
              </p>
            </div>
          </div>
          <p className="text-xs text-white/40">{summary?.withReceipt?.toLocaleString() || 0} with attachments</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Untagged Value</p>
              <p className="text-2xl font-bold text-orange-400">
                {formatMoney(summary?.untaggedValue || 0)}
              </p>
            </div>
          </div>
          <p className="text-xs text-white/40">needs project allocation</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* BAS Preparation */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-purple-400" />
            BAS Preparation — {basQuarter} {basYear}
          </h2>

          {taxData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-1">GST Collected (1A)</p>
                  <p className="text-xl font-bold text-green-400">
                    {formatMoney(taxData.gstSummary?.collected || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-1">GST Paid (1B)</p>
                  <p className="text-xl font-bold text-red-400">
                    {formatMoney(taxData.gstSummary?.paid || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-1">Net GST</p>
                  <p className={cn(
                    'text-xl font-bold',
                    (taxData.gstSummary?.net || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {formatMoney(taxData.gstSummary?.net || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-1">Total Sales</p>
                  <p className="text-xl font-bold text-white">
                    {formatMoney(taxData.basLabels?.['G1']?.amount || 0)}
                  </p>
                </div>
              </div>

              {/* BAS Readiness Checklist */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-medium text-white/70 mb-3">Readiness Checklist</h3>
                <div className="space-y-2">
                  {[
                    { label: 'All transactions tagged', ok: (summary?.taggedPct || 0) >= 95 },
                    { label: 'Receipts for GST credits', ok: (summary?.receiptPct || 0) >= 90 },
                    { label: 'Bank reconciled', ok: (summary?.reconciledPct || 0) >= 95 },
                    { label: 'Overdue invoices resolved', ok: overdueInvoices.length === 0 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {item.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      )}
                      <span className={cn('text-sm', item.ok ? 'text-white/70' : 'text-yellow-300')}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-white/5 rounded-lg" />
              ))}
            </div>
          )}
        </div>

        {/* R&D Tax Offset Summary */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-emerald-400" />
            R&D Tax Offset (43.5%)
          </h2>

          {rdData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-1">FY24-25 R&D Spend</p>
                  <p className="text-xl font-bold text-white">
                    {formatMoney(rdData.spendByFY?.['FY2024-25']?.total || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-1">FY24-25 Offset</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {formatMoney(rdData.offset43pct?.fy2425 || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-1">FY25-26 R&D Spend</p>
                  <p className="text-xl font-bold text-white">
                    {formatMoney(rdData.spendByFY?.['FY2025-26']?.total || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-1">FY25-26 Offset</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {formatMoney(rdData.offset43pct?.fy2526 || 0)}
                  </p>
                </div>
              </div>

              {/* Tagging Coverage for R&D */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-medium text-white/70 mb-3">Project Tagging (R&D Eligibility)</h3>
                <div className="space-y-3">
                  {Object.entries(rdData.taggingCoverage || {}).map(([fy, data]: [string, any]) => (
                    <div key={fy}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/60">{fy.toUpperCase()}</span>
                        <span className={pctColor(data.pct)}>{data.pct}% tagged</span>
                      </div>
                      <ProgressBar value={data.pct} color={data.pct >= 90 ? 'green' : data.pct >= 70 ? 'yellow' : 'red'} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Top R&D Vendors */}
              {rdData.topVendors && rdData.topVendors.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-sm font-medium text-white/70 mb-3">Top R&D Vendors</h3>
                  <div className="space-y-2">
                    {rdData.topVendors.slice(0, 8).map((v: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-white/70 truncate mr-4">{v.vendor}</span>
                        <span className="text-white font-mono">{formatMoney(v.spend)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-white/5 rounded-lg" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Spending by Project — Receipt Coverage */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-amber-400" />
          Receipt Coverage by Project (Last 12 Months)
        </h2>

        {receiptScore ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-white/50 mb-1">Receipt Score</p>
                <p className={cn('text-3xl font-bold', pctColor(receiptScore.score || 0))}>
                  {receiptScore.score || 0}%
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-white/50 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {receiptScore.pending || 0}
                </p>
                <p className="text-xs text-white/40">unmatched receipts</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-white/50 mb-1">Resolved This Week</p>
                <p className="text-3xl font-bold text-green-400">
                  {receiptScore.resolvedThisWeek || 0}
                </p>
                <p className="text-xs text-white/40">{receiptScore.streak || 0} day streak</p>
              </div>
            </div>

            {/* Reconciliation coverage from summary */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-medium text-white/70 mb-3">Coverage Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: 'Project Tagged', pct: summary?.taggedPct || 0 },
                  { label: 'Reconciled', pct: summary?.reconciledPct || 0 },
                  { label: 'With Receipts', pct: summary?.receiptPct || 0 },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/60">{item.label}</span>
                      <span className={pctColor(item.pct)}>{item.pct}%</span>
                    </div>
                    <ProgressBar value={item.pct} color={item.pct >= 90 ? 'green' : item.pct >= 70 ? 'yellow' : 'red'} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-pulse h-48 bg-white/5 rounded-lg" />
        )}
      </div>

      {/* Overdue Invoices + Unmatched Items */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Overdue Invoices */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-red-400" />
            Overdue Invoices ({overdueInvoices.length})
          </h2>

          {overdueInvoices.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-400/40" />
              <p>No overdue invoices</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {overdueInvoices.map((inv: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <p className="text-sm text-white/80">{inv.contact_name}</p>
                    <p className="text-xs text-white/40">{inv.invoice_number} — due {inv.due_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-red-400">{formatMoney(inv.amount_due)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items Needing Attention */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            Items Needing Judgment
          </h2>

          <div className="space-y-4">
            {/* Untagged transactions (top 10) */}
            <div>
              <h3 className="text-sm text-white/50 mb-2">
                Untagged Transactions ({needsTag.length})
              </h3>
              {needsTag.length === 0 ? (
                <p className="text-xs text-green-400/60">All transactions tagged</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {needsTag.slice(0, 10).map((t, i) => (
                    <div key={i} className="flex justify-between text-xs bg-white/5 rounded p-2">
                      <span className="text-white/70 truncate mr-2">{t.contact_name || 'Unknown'}</span>
                      <span className="text-white/50 font-mono">{formatMoney(Math.abs(t.total))}</span>
                    </div>
                  ))}
                  {needsTag.length > 10 && (
                    <Link href="/finance/reconciliation?status=needs_tag" className="text-xs text-blue-400 hover:underline">
                      +{needsTag.length - 10} more...
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Missing receipts (top 10) */}
            <div className="border-t border-white/10 pt-3">
              <h3 className="text-sm text-white/50 mb-2">
                Missing Receipts ({needsReceipt.length})
              </h3>
              {needsReceipt.length === 0 ? (
                <p className="text-xs text-green-400/60">All transactions have receipts</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {needsReceipt.slice(0, 10).map((t, i) => (
                    <div key={i} className="flex justify-between text-xs bg-white/5 rounded p-2">
                      <span className="text-white/70 truncate mr-2">{t.contact_name || 'Unknown'}</span>
                      <span className="text-white/50 font-mono">{formatMoney(Math.abs(t.total))}</span>
                    </div>
                  ))}
                  {needsReceipt.length > 10 && (
                    <Link href="/finance/reconciliation?status=needs_receipt" className="text-xs text-blue-400 hover:underline">
                      +{needsReceipt.length - 10} more...
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* R&D Deadlines */}
      {rdData?.deadlines && rdData.deadlines.length > 0 && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-400" />
            Compliance Deadlines
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {rdData.deadlines.map((d: any, i: number) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg p-3 border',
                  d.status === 'overdue' ? 'bg-red-500/10 border-red-500/30' :
                  d.status === 'urgent' ? 'bg-orange-500/10 border-orange-500/30' :
                  d.status === 'upcoming' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-white/5 border-white/10'
                )}
              >
                <p className="text-sm font-medium text-white/90">{d.name}</p>
                <p className="text-xs text-white/50 mt-1">{d.description}</p>
                <p className={cn(
                  'text-xs mt-2 font-medium',
                  d.status === 'overdue' ? 'text-red-400' :
                  d.status === 'urgent' ? 'text-orange-400' :
                  d.status === 'upcoming' ? 'text-yellow-400' :
                  'text-white/40'
                )}>
                  {d.daysUntil < 0 ? `${Math.abs(d.daysUntil)} days overdue` :
                   d.daysUntil === 0 ? 'Due today' :
                   `${d.daysUntil} days remaining`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <Link href="/finance/reconciliation" className="btn-glass flex items-center gap-2 justify-center py-3">
            <CheckCircle2 className="h-4 w-4" />
            Reconciliation
          </Link>
          <Link href="/finance/tagger" className="btn-glass flex items-center gap-2 justify-center py-3">
            <Tag className="h-4 w-4" />
            Tag Transactions
          </Link>
          <Link href="/finance/rd-tracking" className="btn-glass flex items-center gap-2 justify-center py-3">
            <FileText className="h-4 w-4" />
            R&D Tracking
          </Link>
          <Link href="/finance/tax" className="btn-glass flex items-center gap-2 justify-center py-3">
            <Calculator className="h-4 w-4" />
            Tax / BAS
          </Link>
        </div>
      </div>
    </div>
  )
}
