'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Receipt,
  FileCheck,
  Tag,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toFixed(2)}`
}

type StatusFilter = 'all' | 'needs_tag' | 'needs_receipt' | 'needs_reconcile' | 'done'
type TypeFilter = 'all' | 'spend' | 'transfers'

interface Transaction {
  id: string
  contact_name: string | null
  total: number
  date: string
  type: string
  project_code: string | null
  project_code_source: string | null
  bank_account: string | null
  is_reconciled: boolean | null
  has_attachments: boolean | null
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

async function fetchReconciliation(params: {
  status: StatusFilter
  project: string
  type: TypeFilter
  from: string
  to: string
  page: number
}): Promise<ReconciliationData> {
  const sp = new URLSearchParams()
  if (params.status !== 'all') sp.set('status', params.status)
  if (params.project) sp.set('project', params.project)
  if (params.type !== 'all') sp.set('type', params.type)
  if (params.from) sp.set('from', params.from)
  if (params.to) sp.set('to', params.to)
  sp.set('page', String(params.page))
  const res = await fetch(`/api/finance/reconciliation?${sp}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

async function bulkUpdate(body: { ids: string[]; projectCode?: string; noReceiptNeeded?: boolean }) {
  const res = await fetch('/api/finance/reconciliation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to update')
  return res.json()
}

function getRowStatus(tx: Transaction): 'done' | 'partial' | 'needs_attention' {
  const hasTag = !!tx.project_code
  const isReconciled = !!tx.is_reconciled
  const isTransfer = tx.type === 'SPEND-TRANSFER' || tx.type === 'RECEIVE-TRANSFER'

  if (hasTag && isReconciled) return 'done'
  if (hasTag || isReconciled || isTransfer) return 'partial'
  return 'needs_attention'
}

export default function ReconciliationPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCode, setBulkCode] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['reconciliation', statusFilter, projectFilter, typeFilter, dateFrom, dateTo, page],
    queryFn: () => fetchReconciliation({
      status: statusFilter,
      project: projectFilter,
      type: typeFilter,
      from: dateFrom,
      to: dateTo,
      page,
    }),
  })

  const mutation = useMutation({
    mutationFn: bulkUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] })
      setSelectedIds(new Set())
      setBulkCode('')
    },
  })

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (!data) return
    const allIds = data.transactions.map(t => t.id)
    const allSelected = allIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }, [data, selectedIds])

  const summary = data?.summary
  const transactions = data?.transactions || []
  const projects = data?.projects || []

  const statusColors: Record<StatusFilter, string> = {
    all: 'text-white/50',
    needs_tag: 'text-red-400',
    needs_receipt: 'text-amber-400',
    needs_reconcile: 'text-blue-400',
    done: 'text-green-400',
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/finance" className="text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-blue-400" />
            Reconciliation Review
          </h1>
        </div>
        <p className="text-lg text-white/60">
          Full journey: receipt → Dext → Xero → project tag → reconciled
        </p>
      </header>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="text-xs text-white/40 mb-1">Total Transactions</div>
            <div className="text-2xl font-bold text-white tabular-nums">{summary.total.toLocaleString()}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Tagged
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{summary.taggedPct}%</div>
            <div className="text-xs text-white/30">{summary.tagged.toLocaleString()} / {summary.total.toLocaleString()}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Reconciled
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{summary.reconciledPct}%</div>
            <div className="text-xs text-white/30">{summary.reconciled.toLocaleString()} / {summary.total.toLocaleString()}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
              <Receipt className="h-3 w-3" /> Has Receipt
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{summary.receiptPct}%</div>
            <div className="text-xs text-white/30">{summary.withReceipt.toLocaleString()} / {summary.total.toLocaleString()}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Untagged Value
            </div>
            <div className="text-2xl font-bold text-red-400 tabular-nums">{formatMoney(summary.untaggedValue)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Status filter */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <Filter className="h-4 w-4 text-white/40 ml-2" />
          {(['all', 'needs_tag', 'needs_receipt', 'needs_reconcile', 'done'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                statusFilter === s
                  ? `bg-white/15 ${statusColors[s]}`
                  : 'text-white/50 hover:text-white/70'
              )}
            >
              {s === 'all' ? 'All' : s === 'needs_tag' ? 'Needs Tag' : s === 'needs_receipt' ? 'Needs Receipt' : s === 'needs_reconcile' ? 'Unreconciled' : 'Done'}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {(['all', 'spend', 'transfers'] as TypeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1) }}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                typeFilter === t ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/70'
              )}
            >
              {t === 'all' ? 'All Types' : t === 'spend' ? 'Spend Only' : 'Transfers'}
            </button>
          ))}
        </div>

        {/* Project filter */}
        <select
          value={projectFilter}
          onChange={e => { setProjectFilter(e.target.value); setPage(1) }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
          ))}
        </select>

        {/* Date range */}
        <input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1) }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1) }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
          placeholder="To"
        />
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 mb-4 glass-card p-3">
          <span className="text-sm text-white/60">{selectedIds.size} selected</span>
          <select
            value={bulkCode}
            onChange={e => setBulkCode(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
          >
            <option value="">Assign project...</option>
            {projects.map(p => (
              <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
            ))}
          </select>
          {bulkCode && (
            <button
              onClick={() => mutation.mutate({ ids: Array.from(selectedIds), projectCode: bulkCode })}
              disabled={mutation.isPending}
              className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              Apply Tag
            </button>
          )}
          <button
            onClick={() => mutation.mutate({ ids: Array.from(selectedIds), noReceiptNeeded: true })}
            disabled={mutation.isPending}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            No Receipt Needed
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="glass-card p-12 text-center text-white/40">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white">No transactions match filters</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-4 text-left">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={transactions.length > 0 && transactions.every(t => selectedIds.has(t.id))}
                    className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0 h-4 w-4"
                  />
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Vendor</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-white/50">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Project</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-white/50">Receipt</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-white/50">Reconciled</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Source</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const rowStatus = getRowStatus(tx)
                return (
                  <tr
                    key={tx.id}
                    className={cn(
                      'border-b border-white/5 hover:bg-white/5 transition-colors',
                      rowStatus === 'done' && 'bg-green-500/5',
                      rowStatus === 'partial' && 'bg-amber-500/5',
                      rowStatus === 'needs_attention' && 'bg-red-500/5',
                      selectedIds.has(tx.id) && 'bg-blue-500/10'
                    )}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleSelect(tx.id)}
                        className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0 h-4 w-4"
                      />
                    </td>
                    <td className="py-3 px-4 text-sm text-white/70 tabular-nums whitespace-nowrap">
                      {tx.date?.substring(0, 10)}
                    </td>
                    <td className="py-3 px-4 text-sm text-white max-w-[200px] truncate">
                      {tx.contact_name || '(No contact)'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right tabular-nums whitespace-nowrap">
                      <span className={Number(tx.total) < 0 ? 'text-red-400' : 'text-green-400'}>
                        {formatMoney(Math.abs(Number(tx.total)))}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                        tx.type?.includes('TRANSFER')
                          ? 'bg-purple-500/20 text-purple-400'
                          : tx.type === 'SPEND'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-green-500/20 text-green-400'
                      )}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {tx.project_code ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                          {tx.project_code}
                        </span>
                      ) : (
                        <span className="text-xs text-white/20">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.has_attachments ? (
                        <Receipt className="h-4 w-4 text-green-400 mx-auto" />
                      ) : tx.type?.includes('TRANSFER') ? (
                        <span className="text-xs text-white/20">n/a</span>
                      ) : (
                        <span className="text-xs text-red-400/50">missing</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.is_reconciled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                      ) : (
                        <span className="text-xs text-amber-400/50">no</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-white/30">
                        {tx.project_code_source || '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-white/40">
          Page {page}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-md text-white/50 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={transactions.length < 100}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-md text-white/50 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
