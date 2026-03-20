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
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toLocaleString()}`
}

type StatusFilter = 'all' | 'needs_tag' | 'needs_receipt' | 'needs_reconcile' | 'done'

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
  transactions: Transaction[]
  projects: { code: string; name: string }[]
  page: number
  limit: number
}

const checklistItems = [
  {
    id: 'tagged',
    label: 'All transactions tagged with project codes',
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
    label: 'Bank reconciliation complete',
    pctKey: 'reconciledPct' as const,
    countKey: 'reconciled' as const,
    icon: FileCheck,
    color: 'cyan',
    filter: 'needs_reconcile' as StatusFilter,
    link: 'https://go.xero.com',
    linkLabel: 'Open Xero',
  },
]

export default function ReconciliationPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProject, setBulkProject] = useState('')

  const { data, isLoading } = useQuery<ReconciliationData>({
    queryKey: ['reconciliation', statusFilter],
    queryFn: () =>
      fetch(`/api/finance/reconciliation?status=${statusFilter}&limit=100`).then(r => r.json()),
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

  function bulkTag() {
    if (selectedIds.size > 0 && bulkProject) {
      updateMutation.mutate({ ids: Array.from(selectedIds), projectCode: bulkProject })
    }
  }

  function markNoReceiptNeeded() {
    if (selectedIds.size > 0) {
      updateMutation.mutate({ ids: Array.from(selectedIds), noReceiptNeeded: true })
    }
  }

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
                <ClipboardCheck className="h-8 w-8 text-cyan-400" />
                Reconciliation Checklist
              </h1>
            </div>
            <p className="text-lg text-white/60 mt-1 ml-8">
              Track completion of monthly close tasks — tagging, receipts, and bank reconciliation
            </p>
          </div>
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
      </header>

      {/* Overall Progress */}
      {summary && (
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Overall Progress</h2>
            <span className={cn(
              'text-3xl font-bold',
              overallPct >= 95 ? 'text-green-400' : overallPct >= 70 ? 'text-amber-400' : 'text-red-400'
            )}>
              {overallPct}%
            </span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                overallPct >= 95 ? 'bg-green-500' : overallPct >= 70 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2">
            {summary.total.toLocaleString()} total transactions
            {summary.untaggedValue > 0 && (
              <> &middot; {formatMoney(summary.untaggedValue)} untagged spend</>
            )}
          </p>
        </div>
      )}

      {/* Checklist Items */}
      {isLoading ? (
        <div className="glass-card p-12 text-center text-white/40">Loading reconciliation data...</div>
      ) : summary ? (
        <div className="space-y-3 mb-8">
          {checklistItems.map(item => {
            const pct = summary[item.pctKey]
            const count = summary[item.countKey]
            const isComplete = pct >= 100
            const isExpanded = expandedItem === item.id

            return (
              <div key={item.id} className={cn(
                'glass-card overflow-hidden transition-colors',
                isComplete ? 'border border-green-500/20' : 'border border-white/5'
              )}>
                <button
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedItem(null)
                      setStatusFilter('all')
                    } else {
                      setExpandedItem(item.id)
                      setStatusFilter(item.filter)
                    }
                  }}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-colors"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    isComplete ? 'bg-green-500/20' : `bg-${item.color}-500/20`
                  )}>
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    ) : (
                      <item.icon className={`h-5 w-5 text-${item.color}-400`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', isComplete ? 'text-green-400' : 'text-white')}>
                      {item.label}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {count.toLocaleString()} / {summary.total.toLocaleString()}
                      {!isComplete && ` — ${summary.total - count} remaining`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Progress bar */}
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isComplete ? 'bg-green-500' : pct >= 70 ? `bg-${item.color}-500` : 'bg-red-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={cn(
                      'text-sm font-semibold w-12 text-right tabular-nums',
                      isComplete ? 'text-green-400' : pct >= 70 ? 'text-white' : 'text-red-400'
                    )}>
                      {pct}%
                    </span>

                    {item.link && (
                      item.link.startsWith('http') ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-white/40 hover:text-white/60 transition-colors px-2 py-1 rounded border border-white/10"
                        >
                          {item.linkLabel}
                        </a>
                      ) : (
                        <Link
                          href={item.link}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-white/40 hover:text-white/60 transition-colors px-2 py-1 rounded border border-white/10"
                        >
                          {item.linkLabel}
                        </Link>
                      )
                    )}

                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-white/30" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white/30" />
                    )}
                  </div>
                </button>

                {/* Expanded transaction list */}
                {isExpanded && transactions.length > 0 && (
                  <div className="border-t border-white/10">
                    {/* Bulk actions */}
                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-3 px-5 py-3 bg-white/5 border-b border-white/10">
                        <span className="text-xs text-white/50">{selectedIds.size} selected</span>
                        {item.filter === 'needs_tag' && (
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
                              onClick={bulkTag}
                              disabled={!bulkProject || updateMutation.isPending}
                              className="btn-glass text-xs px-2 py-1 disabled:opacity-30"
                            >
                              Apply
                            </button>
                          </>
                        )}
                        {item.filter === 'needs_receipt' && (
                          <button
                            onClick={markNoReceiptNeeded}
                            disabled={updateMutation.isPending}
                            className="btn-glass text-xs px-2 py-1 flex items-center gap-1 disabled:opacity-30"
                          >
                            <Ban className="h-3 w-3" />
                            No Receipt Needed
                          </button>
                        )}
                      </div>
                    )}

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
                        Showing first 100 transactions. Use the Tagger or Xero for full list.
                      </p>
                    )}
                  </div>
                )}

                {isExpanded && transactions.length === 0 && (
                  <div className="border-t border-white/10 p-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-green-400">All clear — nothing to action here</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Quick Links */}
      {summary && (
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
                <p className="text-xs text-white/40">Tag {summary.total - summary.tagged} remaining</p>
              </div>
            </div>
          </Link>
          <Link
            href="/finance/board"
            className="glass-card p-5 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                  Board Report
                </p>
                <p className="text-xs text-white/40">Review R&D and financials</p>
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
      )}
    </div>
  )
}
