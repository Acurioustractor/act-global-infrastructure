'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ClipboardCheck,
  Tag,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileCheck,
  Ban,
  DollarSign,
  Mail,
  Search,
  PlayCircle,
  TrendingDown,
  Shield,
  Zap,
  Package,
  CreditCard,
  Plane,
  Building2,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance'

// ── Types ─────────────────────────────────────────────────────────

interface VendorRow {
  name: string
  count: number
  totalSpend: number
  withReceipt: number
  withoutReceipt: number
  rdCount: number
  category: 'bank_fee' | 'email_receipt' | 'manual'
}

interface BillCoverage {
  total: number
  withReceipt: number
  tagged: number
  receiptPct: number
  taggedPct: number
  missingReceipt: number
  untagged: number
}

interface ReconciliationData {
  summary: {
    total: number
    tagged: number
    reconciled: number
    withReceipt: number
    taggedPct: number
    reconciledPct: number
    receiptPct: number
    spendWithoutReceipt: number
  }
  bills: BillCoverage
  impact: {
    totalSpendWithoutReceipt: number
    gstAtRisk: number
    rdSpendWithoutReceipt: number
    rdOffsetAtRisk: number
    totalAtRisk: number
    autoResolvable: number
    autoMarkable: number
  }
  vendors: VendorRow[]
  pipeline: Record<string, number>
  matches: Record<string, number>
  lastSyncAt: string | null
  fyStart: string
  transactions: Transaction[]
  projects: { code: string; name: string }[]
}

interface Transaction {
  id: string
  contact_name: string
  total: number
  date: string
  type: string
  project_code: string | null
  project_code_source: string | null
  bank_account: string | null
  is_reconciled: boolean
  has_attachments: boolean
}

type StatusFilter = 'all' | 'needs_tag' | 'needs_receipt' | 'needs_reconcile' | 'done'

const vendorIcon = (cat: VendorRow['category']) => {
  switch (cat) {
    case 'bank_fee': return CreditCard
    case 'email_receipt': return Mail
    case 'manual': return HelpCircle
  }
}

const vendorActionLabel = (cat: VendorRow['category']) => {
  switch (cat) {
    case 'bank_fee': return 'Auto-mark: no receipt needed'
    case 'email_receipt': return 'Find in email'
    case 'manual': return 'Manual upload needed'
  }
}

const vendorActionColor = (cat: VendorRow['category']) => {
  switch (cat) {
    case 'bank_fee': return 'text-emerald-400 bg-emerald-500/10'
    case 'email_receipt': return 'text-blue-400 bg-blue-500/10'
    case 'manual': return 'text-amber-400 bg-amber-500/10'
  }
}

// ── Pipeline Funnel ───────────────────────────────────────────────

function PipelineFunnel({ pipeline }: { pipeline: Record<string, number> }) {
  const stages = [
    { key: 'captured', label: 'Captured', color: 'bg-blue-500' },
    { key: 'matched', label: 'Matched', color: 'bg-indigo-500' },
    { key: 'review', label: 'In Review', color: 'bg-amber-500' },
    { key: 'uploaded', label: 'Uploaded', color: 'bg-emerald-500' },
  ]
  const total = stages.reduce((sum, s) => sum + (pipeline[s.key] || 0), 0)
  const failed = pipeline['failed'] || 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {stages.map((stage, i) => {
          const count = pipeline[stage.key] || 0
          const pct = total > 0 ? Math.max((count / total) * 100, 8) : 25
          return (
            <div key={stage.key} className="flex items-center" style={{ flex: pct }}>
              <div className="flex-1">
                <div className={cn('h-8 rounded-lg flex items-center justify-center relative', stage.color)}>
                  <span className="text-xs font-bold text-white">{count}</span>
                </div>
                <p className="text-[10px] text-white/40 mt-1 text-center">{stage.label}</p>
              </div>
              {i < stages.length - 1 && (
                <ChevronRight className="h-3 w-3 text-white/20 mx-1 shrink-0" />
              )}
            </div>
          )
        })}
      </div>
      {failed > 0 && (
        <p className="text-xs text-red-400">{failed} failed — check pipeline logs</p>
      )}
    </div>
  )
}

// ── Impact Card ───────────────────────────────────────────────────

function ImpactCard({
  label,
  amount,
  sublabel,
  icon: Icon,
  color,
}: {
  label: string
  amount: number
  sublabel?: string
  icon: typeof DollarSign
  color: string
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
          <p className={cn('text-2xl font-bold mt-1 tabular-nums', color)}>
            {formatMoneyCompact(amount)}
          </p>
          {sublabel && (
            <p className="text-xs text-white/40 mt-1">{sublabel}</p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color.replace('text-', 'bg-').replace('400', '500/20'))}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProject, setBulkProject] = useState('')

  const { data, isLoading } = useQuery<ReconciliationData>({
    queryKey: ['reconciliation', statusFilter],
    queryFn: () =>
      fetch(`/api/finance/reconciliation?status=${statusFilter}&view=${statusFilter !== 'all' ? 'list' : 'intelligence'}&limit=100`).then(r => r.json()),
    staleTime: 2 * 60 * 1000,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { ids: string[]; projectCode?: string; noReceiptNeeded?: boolean }) =>
      fetch('/api/finance/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] })
      setSelectedIds(new Set())
      setBulkProject('')
    },
  })

  const summary = data?.summary
  const impact = data?.impact
  const vendors = data?.vendors || []
  const pipeline = data?.pipeline || {}
  const matches = data?.matches || {}
  const transactions = data?.transactions || []
  const projects = data?.projects || []

  const overallPct = summary
    ? Math.round((summary.taggedPct + summary.reconciledPct + summary.receiptPct) / 3)
    : 0

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)))
    }
  }

  const checklistItems = [
    {
      id: 'tagged',
      label: 'All FY26 transactions tagged with project codes',
      pctKey: 'taggedPct' as const,
      countKey: 'tagged' as const,
      icon: Tag,
      color: 'amber',
      filter: 'needs_tag' as StatusFilter,
      link: '/finance/tagger',
      linkLabel: 'Open Tagger',
    },
    {
      id: 'receipts',
      label: 'Receipts attached for all spend transactions',
      pctKey: 'receiptPct' as const,
      countKey: 'withReceipt' as const,
      icon: Receipt,
      color: 'purple',
      filter: 'needs_receipt' as StatusFilter,
      link: null,
      linkLabel: null,
    },
    {
      id: 'reconciled',
      label: 'Bank reconciliation complete in Xero',
      pctKey: 'reconciledPct' as const,
      countKey: 'reconciled' as const,
      icon: FileCheck,
      color: 'cyan',
      filter: 'needs_reconcile' as StatusFilter,
      link: 'https://go.xero.com',
      linkLabel: 'Open Xero',
    },
  ]

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Shield className="h-8 w-8 text-cyan-400" />
                Receipt Intelligence
              </h1>
            </div>
            <p className="text-lg text-white/60 mt-1 ml-8">
              FY26 receipt coverage, financial impact, and automated resolution
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data?.lastSyncAt && (
              <span className="text-xs text-white/30">
                Data from {format(new Date(data.lastSyncAt), 'dd MMM HH:mm')}
              </span>
            )}
            <a
              href="https://go.xero.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Xero
            </a>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="glass-card p-12 text-center text-white/40">Loading receipt intelligence...</div>
      ) : !data ? (
        <div className="glass-card p-12 text-center text-red-400">Failed to load data</div>
      ) : (
        <>
          {/* ── Financial Impact Hero ──────────────────────────────────── */}
          {impact && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <ImpactCard
                label="Spend Without Receipts"
                amount={impact.totalSpendWithoutReceipt}
                sublabel={`${summary?.spendWithoutReceipt || 0} transactions`}
                icon={Receipt}
                color="text-red-400"
              />
              <ImpactCard
                label="GST Credits at Risk"
                amount={impact.gstAtRisk}
                sublabel="1/11 of unreceipted spend >$82.50"
                icon={TrendingDown}
                color="text-amber-400"
              />
              <ImpactCard
                label="R&D Offset at Risk"
                amount={impact.rdOffsetAtRisk}
                sublabel={`43.5% of ${formatMoneyCompact(impact.rdSpendWithoutReceipt)} R&D spend`}
                icon={Shield}
                color="text-purple-400"
              />
              <ImpactCard
                label="Total Money at Risk"
                amount={impact.totalAtRisk}
                sublabel="Recoverable with receipts"
                icon={DollarSign}
                color={impact.totalAtRisk > 5000 ? 'text-red-400' : impact.totalAtRisk > 1000 ? 'text-amber-400' : 'text-emerald-400'}
              />
            </div>
          )}

          {/* ── Xero App Receipt Coverage (Bills) ─────────────────────── */}
          {data?.bills && (
            <div className="glass-card p-5 mb-6 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Xero App Receipts (Bills)</h3>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    data.bills.receiptPct >= 95 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  )}>
                    {data.bills.receiptPct}% coverage
                  </span>
                </div>
                <p className="text-xs text-white/30">
                  Receipts uploaded via Xero app attach to bills, not bank transactions
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">{data.bills.withReceipt}</p>
                  <p className="text-xs text-white/40">Bills with receipts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white/70 tabular-nums">{data.bills.total}</p>
                  <p className="text-xs text-white/40">Total FY26 bills</p>
                </div>
                <div>
                  <p className={cn('text-2xl font-bold tabular-nums', data.bills.missingReceipt > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                    {data.bills.missingReceipt}
                  </p>
                  <p className="text-xs text-white/40">Missing receipts</p>
                </div>
                <div>
                  <p className={cn('text-2xl font-bold tabular-nums', data.bills.untagged > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                    {data.bills.untagged}
                  </p>
                  <p className="text-xs text-white/40">Untagged bills</p>
                </div>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.bills.receiptPct}%` }} />
              </div>
            </div>
          )}

          {/* ── Auto-Resolution Banner ────────────────────────────────── */}
          {impact && (impact.autoResolvable > 0 || impact.autoMarkable > 0) && (
            <div className="glass-card p-5 mb-6 border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {impact.autoResolvable + impact.autoMarkable} transactions can be auto-resolved
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {impact.autoResolvable > 0 && `${impact.autoResolvable} have email receipts available`}
                      {impact.autoResolvable > 0 && impact.autoMarkable > 0 && ' · '}
                      {impact.autoMarkable > 0 && `${impact.autoMarkable} are bank fees (no receipt needed)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">Run capture → match → upload</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Receipt Pipeline ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-400" />
                Receipt Pipeline
              </h3>
              <PipelineFunnel pipeline={pipeline} />
              <p className="text-xs text-white/30 mt-3">
                {Object.values(pipeline).reduce((a, b) => a + b, 0)} total receipt emails processed
              </p>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-cyan-400" />
                Receipt Matches
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pending', count: matches['pending'] || 0, color: 'text-amber-400' },
                  { label: 'No Receipt Needed', count: matches['no_receipt_needed'] || 0, color: 'text-emerald-400' },
                  { label: 'Matched', count: matches['matched'] || 0, color: 'text-blue-400' },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <p className={cn('text-xl font-bold tabular-nums', item.color)}>{item.count}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/30 mt-3">
                {Object.values(matches).reduce((a, b) => a + b, 0)} total receipt match records
              </p>
            </div>
          </div>

          {/* ── Vendor Intelligence ───────────────────────────────────── */}
          {vendors.length > 0 && (
            <div className="glass-card mb-6 overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Search className="h-4 w-4 text-amber-400" />
                  Vendor Intelligence — Missing Receipts
                </h3>
                <p className="text-xs text-white/40 mt-1">
                  Grouped by resolution strategy. Email receipt vendors can be auto-captured from Gmail.
                </p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-white/30 uppercase tracking-wider border-b border-white/5">
                    <th className="text-left py-2 px-5">Vendor</th>
                    <th className="text-right py-2 px-3">Missing</th>
                    <th className="text-right py-2 px-3">Spend</th>
                    <th className="text-center py-2 px-3">Coverage</th>
                    <th className="text-center py-2 px-3">R&D</th>
                    <th className="text-left py-2 px-5">Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => {
                    const Icon = vendorIcon(v.category)
                    const coveragePct = v.count > 0
                      ? Math.round((v.withReceipt / v.count) * 100)
                      : 0
                    return (
                      <tr key={v.name} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                        <td className="py-2.5 px-5 text-white/80 font-medium">{v.name}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-red-400 font-medium">
                          {v.withoutReceipt}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-white/60">
                          {formatMoneyCompact(v.totalSpend)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  coveragePct >= 80 ? 'bg-emerald-500' : coveragePct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                )}
                                style={{ width: `${coveragePct}%` }}
                              />
                            </div>
                            <span className="text-xs text-white/40 tabular-nums w-8">{coveragePct}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {v.rdCount > 0 ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium">
                              {v.rdCount}
                            </span>
                          ) : (
                            <span className="text-xs text-white/15">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-5">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1', vendorActionColor(v.category))}>
                            <Icon className="h-3 w-3" />
                            {vendorActionLabel(v.category)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Checklist ─────────────────────────────────────────────── */}
          <div className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">FY26 Close Progress</h3>
              <span className={cn(
                'text-2xl font-bold tabular-nums',
                overallPct >= 95 ? 'text-green-400' : overallPct >= 70 ? 'text-amber-400' : 'text-red-400'
              )}>
                {overallPct}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  overallPct >= 95 ? 'bg-green-500' : overallPct >= 70 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <div className="space-y-2">
              {summary && checklistItems.map(item => {
                const pct = summary[item.pctKey]
                const count = summary[item.countKey]
                const isComplete = pct >= 100

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (expandedSection === item.id) {
                        setExpandedSection(null)
                        setStatusFilter('all')
                      } else {
                        setExpandedSection(item.id)
                        setStatusFilter(item.filter)
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
                      isComplete ? 'bg-green-500/20' : `bg-${item.color}-500/20`
                    )}>
                      {isComplete ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <item.icon className={`h-3.5 w-3.5 text-${item.color}-400`} />
                      )}
                    </div>
                    <span className={cn('text-sm flex-1', isComplete ? 'text-green-400/70' : 'text-white/70')}>
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', isComplete ? 'bg-green-500' : `bg-${item.color}-500`)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/40 tabular-nums w-10 text-right">
                        {pct}%
                      </span>
                      {!isComplete && (
                        <span className="text-xs text-white/30">
                          ({summary.total - count} left)
                        </span>
                      )}
                    </div>
                    {item.link && (
                      item.link.startsWith('http') ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-0.5 rounded border border-white/10"
                        >
                          {item.linkLabel}
                        </a>
                      ) : (
                        <Link
                          href={item.link}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-0.5 rounded border border-white/10"
                        >
                          {item.linkLabel}
                        </Link>
                      )
                    )}
                    {expandedSection === item.id ? (
                      <ChevronDown className="h-3 w-3 text-white/20" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-white/20" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Expanded Transaction List ─────────────────────────────── */}
          {expandedSection && transactions.length > 0 && (
            <div className="glass-card overflow-hidden mb-6">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">
                  {statusFilter === 'needs_tag' && 'Untagged Transactions'}
                  {statusFilter === 'needs_receipt' && 'Transactions Missing Receipts'}
                  {statusFilter === 'needs_reconcile' && 'Unreconciled Transactions'}
                </h3>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">{selectedIds.size} selected</span>
                    {statusFilter === 'needs_tag' && (
                      <>
                        <select
                          value={bulkProject}
                          onChange={e => setBulkProject(e.target.value)}
                          className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none"
                        >
                          <option value="">Tag as...</option>
                          {projects.map(p => (
                            <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            if (selectedIds.size > 0 && bulkProject) {
                              updateMutation.mutate({ ids: Array.from(selectedIds), projectCode: bulkProject })
                            }
                          }}
                          disabled={!bulkProject || updateMutation.isPending}
                          className="btn-glass text-xs px-2 py-1 disabled:opacity-30"
                        >
                          Apply
                        </button>
                      </>
                    )}
                    {statusFilter === 'needs_receipt' && (
                      <button
                        onClick={() => {
                          if (selectedIds.size > 0) {
                            updateMutation.mutate({ ids: Array.from(selectedIds), noReceiptNeeded: true })
                          }
                        }}
                        disabled={updateMutation.isPending}
                        className="btn-glass text-xs px-2 py-1 flex items-center gap-1 disabled:opacity-30"
                      >
                        <Ban className="h-3 w-3" />
                        No Receipt Needed
                      </button>
                    )}
                  </div>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-white/30 uppercase tracking-wider border-b border-white/5">
                    <th className="text-left py-2 px-5 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === transactions.length && transactions.length > 0}
                        onChange={selectAll}
                        className="rounded border-white/20"
                      />
                    </th>
                    <th className="text-left py-2 px-2">Vendor</th>
                    <th className="text-left py-2 px-2">Type</th>
                    <th className="text-right py-2 px-2">Amount</th>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Project</th>
                    <th className="text-center py-2 px-2">Receipt</th>
                    <th className="text-center py-2 px-2">Reconciled</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                      <td className="py-2 px-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tx.id)}
                          onChange={() => toggleSelect(tx.id)}
                          className="rounded border-white/20"
                        />
                      </td>
                      <td className="py-2 px-2 text-white/80">{tx.contact_name || '—'}</td>
                      <td className="py-2 px-2">
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          tx.type?.startsWith('SPEND') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                        )}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-white/70 font-medium">
                        {formatMoney(Math.abs(Number(tx.total) || 0))}
                      </td>
                      <td className="py-2 px-2 text-white/40 text-xs">
                        {tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="py-2 px-2">
                        {tx.project_code ? (
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                            {tx.project_code}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400/60">untagged</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {tx.has_attachments ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-400/40 mx-auto" />
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {tx.is_reconciled ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                        ) : (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length >= 100 && (
                <p className="text-xs text-white/30 text-center py-3">
                  Showing first 100. Use the Tagger or Xero for the full list.
                </p>
              )}
            </div>
          )}

          {expandedSection && transactions.length === 0 && (
            <div className="glass-card p-8 text-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-green-400">All clear — nothing to action here</p>
            </div>
          )}

          {/* ── Quick Links ──────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">
            <Link
              href="/finance/tagger"
              className="glass-card p-5 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">
                    Transaction Tagger
                  </p>
                  <p className="text-xs text-white/40">
                    Tag {summary ? summary.total - summary.tagged : 0} untagged transactions
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/finance/overview"
              className="glass-card p-5 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                    Financial Overview
                  </p>
                  <p className="text-xs text-white/40">Cash, runway, and project P&L</p>
                </div>
              </div>
            </Link>
            <a
              href="https://go.xero.com"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-5 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                    Open Xero
                  </p>
                  <p className="text-xs text-white/40">Complete bank reconciliation</p>
                </div>
              </div>
            </a>
          </div>
        </>
      )}
    </div>
  )
}
