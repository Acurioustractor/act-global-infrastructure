'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Paperclip,
  FileText,
  ChevronDown,
  X,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/format'

// --- Types ---

interface InvoiceItem {
  id: string
  invoiceNumber: string | null
  vendor: string
  direction: 'in' | 'out'
  status: string
  amount: number
  amountDue: number
  amountPaid: number
  date: string | null
  dueDate: string | null
  paidDate: string | null
  daysOverdue: number
  daysUntilDue: number
  isOverdue: boolean
  isDueSoon: boolean
  isPaid: boolean
  hasReceipt: boolean
  projectCode: string | null
  description: string | null
}

interface Project {
  code: string
  name: string
  tier: string
}

interface StatsGroup {
  total: number
  count: number
}

interface InvoicesResponse {
  items: InvoiceItem[]
  projects: Project[]
  stats: {
    receivable: StatsGroup
    payable: StatsGroup
    overdue: StatsGroup
    dueThisWeek: StatsGroup
    paid: StatsGroup
    totalItems: number
  }
}

type FilterKey = 'all' | 'overdue' | 'due-soon' | 'receivable' | 'payable' | 'paid'
type SortField = 'vendor' | 'amount' | 'date' | 'due' | 'project'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(d))
}

function daysLabel(days: number) {
  if (days === 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [projectFilter, setProjectFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('due')
  const [sortAsc, setSortAsc] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery<InvoicesResponse>({
    queryKey: ['finance', 'invoices'],
    queryFn: () => fetch('/api/finance/invoices').then(r => r.json()),
    staleTime: 30_000,
  })

  // Tag mutation (reuse existing endpoint)
  const tagMutation = useMutation({
    mutationFn: async (payload: { ids: string[]; projectCode: string }) => {
      const res = await fetch('/api/transactions/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: payload.ids, projectCode: payload.projectCode }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] })
    },
  })

  const items = data?.items || []
  const projects = data?.projects || []
  const stats = data?.stats

  function projectName(code: string) {
    return projects.find(p => p.code === code)?.name || code
  }

  // Filter
  const filteredItems = useMemo(() => {
    let filtered = items

    switch (activeFilter) {
      case 'overdue': filtered = filtered.filter(i => i.isOverdue); break
      case 'due-soon': filtered = filtered.filter(i => i.isDueSoon); break
      case 'receivable': filtered = filtered.filter(i => i.direction === 'in' && !i.isPaid); break
      case 'payable': filtered = filtered.filter(i => i.direction === 'out' && !i.isPaid); break
      case 'paid': filtered = filtered.filter(i => i.isPaid); break
    }

    if (projectFilter) {
      filtered = filtered.filter(i => i.projectCode === projectFilter)
    }

    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      filtered = filtered.filter(i =>
        i.vendor.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.invoiceNumber || '').toLowerCase().includes(q)
      )
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortField) {
        case 'vendor': return sortAsc ? a.vendor.localeCompare(b.vendor) : b.vendor.localeCompare(a.vendor)
        case 'amount': return sortAsc ? a.amount - b.amount : b.amount - a.amount
        case 'date': return sortAsc ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '')
        case 'due': {
          // Overdue first (highest days), then by due date
          if (a.isOverdue && !b.isOverdue) return -1
          if (!a.isOverdue && b.isOverdue) return 1
          return sortAsc
            ? (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
            : (b.dueDate || '').localeCompare(a.dueDate || '')
        }
        case 'project': {
          const ap = a.projectCode || 'zzz'
          const bp = b.projectCode || 'zzz'
          return sortAsc ? ap.localeCompare(bp) : bp.localeCompare(ap)
        }
        default: return 0
      }
    })

    return filtered
  }, [items, activeFilter, projectFilter, searchFilter, sortField, sortAsc])

  function handleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(field === 'due') }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <Receipt className="h-10 w-10 text-emerald-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading invoices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Receipt className="h-7 w-7 text-emerald-400" />
            Invoice Command
          </h1>
          <span className="text-sm text-white/30">{stats?.totalItems || 0} invoices</span>
        </div>
      </header>

      {/* Hero Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => setActiveFilter(activeFilter === 'receivable' ? 'all' : 'receivable')}
            className={cn(
              'glass-card p-4 text-left transition-all',
              activeFilter === 'receivable' && 'ring-2 ring-emerald-500/40'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Receivable</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatMoney(stats.receivable.total)}</p>
            <p className="text-xs text-white/30">{stats.receivable.count} invoices owed to us</p>
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === 'overdue' ? 'all' : 'overdue')}
            className={cn(
              'glass-card p-4 text-left transition-all',
              activeFilter === 'overdue' && 'ring-2 ring-red-500/40'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-400 tabular-nums">{formatMoney(stats.overdue.total)}</p>
            <p className="text-xs text-white/30">{stats.overdue.count} items past due</p>
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === 'payable' ? 'all' : 'payable')}
            className={cn(
              'glass-card p-4 text-left transition-all',
              activeFilter === 'payable' && 'ring-2 ring-orange-500/40'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownLeft className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Payable</span>
            </div>
            <p className="text-2xl font-bold text-orange-400 tabular-nums">{formatMoney(stats.payable.total)}</p>
            <p className="text-xs text-white/30">{stats.payable.count} bills we owe</p>
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === 'due-soon' ? 'all' : 'due-soon')}
            className={cn(
              'glass-card p-4 text-left transition-all',
              activeFilter === 'due-soon' && 'ring-2 ring-amber-500/40'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Due This Week</span>
            </div>
            <p className="text-2xl font-bold text-amber-400 tabular-nums">{formatMoney(stats.dueThisWeek.total)}</p>
            <p className="text-xs text-white/30">{stats.dueThisWeek.count} items due soon</p>
          </button>
        </div>
      )}

      {/* Filter pills + search */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-1.5 flex-1">
            {([
              { key: 'all', label: 'All', count: items.length },
              { key: 'overdue', label: 'Overdue', count: stats?.overdue.count || 0 },
              { key: 'due-soon', label: 'Due Soon', count: stats?.dueThisWeek.count || 0 },
              { key: 'receivable', label: 'Receivable', count: stats?.receivable.count || 0 },
              { key: 'payable', label: 'Payable', count: stats?.payable.count || 0 },
              { key: 'paid', label: 'Paid', count: stats?.paid.count || 0 },
            ] as { key: FilterKey; label: string; count: number }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs transition-colors border',
                  activeFilter === f.key
                    ? 'bg-white/15 border-white/20 text-white'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                )}
              >
                {f.label} <span className="opacity-50 ml-1">{f.count}</span>
              </button>
            ))}

            {/* Project filter */}
            <div className="w-px bg-white/10 mx-1 self-stretch" />
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="bg-transparent border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/50 focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-48 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20"
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-white/30 uppercase tracking-wider border-b border-white/5 mb-1">
        <div className="w-5 shrink-0" />
        <button onClick={() => handleSort('vendor')} className="flex-1 text-left hover:text-white/60 transition-colors">
          Contact {sortField === 'vendor' && (sortAsc ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('date')} className="w-20 text-right hover:text-white/60 transition-colors">
          Issued {sortField === 'date' && (sortAsc ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('due')} className="w-28 text-right hover:text-white/60 transition-colors">
          Due {sortField === 'due' && (sortAsc ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('amount')} className="w-24 text-right hover:text-white/60 transition-colors">
          Amount {sortField === 'amount' && (sortAsc ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('project')} className="w-24 text-center hover:text-white/60 transition-colors">
          Project {sortField === 'project' && (sortAsc ? '↑' : '↓')}
        </button>
        <div className="w-20 text-center">Status</div>
      </div>

      {/* Invoice rows */}
      {filteredItems.length === 0 ? (
        <div className="glass-card p-12 text-center mt-4">
          <p className="text-white/40">
            {searchFilter ? `No invoices matching "${searchFilter}"` : 'No invoices match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {filteredItems.map(item => {
            const isExpanded = expandedId === item.id
            return (
              <div key={item.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-colors',
                    isExpanded
                      ? 'bg-white/[0.06] border border-white/15'
                      : item.isOverdue
                        ? 'bg-red-500/[0.03] border border-red-500/10 hover:bg-red-500/[0.06]'
                        : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]',
                  )}
                >
                  {/* Direction icon */}
                  <div className="w-5 shrink-0">
                    {item.direction === 'in'
                      ? <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      : <ArrowDownLeft className="h-4 w-4 text-red-400" />
                    }
                  </div>

                  {/* Vendor + description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/80 truncate">{item.vendor}</span>
                      {item.invoiceNumber && (
                        <span className="text-[10px] text-white/20 font-mono">{item.invoiceNumber}</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-white/25 truncate">{item.description}</p>
                    )}
                  </div>

                  {/* Issued date */}
                  <span className="text-xs text-white/30 w-20 text-right shrink-0">
                    {formatDate(item.date)}
                  </span>

                  {/* Due date + overdue badge */}
                  <div className="w-28 text-right shrink-0">
                    {item.isPaid ? (
                      <span className="text-xs text-white/20">Paid {formatDate(item.paidDate)}</span>
                    ) : item.isOverdue ? (
                      <span className="text-xs text-red-400 font-medium">
                        {daysLabel(item.daysOverdue)} overdue
                      </span>
                    ) : item.isDueSoon ? (
                      <span className="text-xs text-amber-400">
                        Due in {daysLabel(item.daysUntilDue)}
                      </span>
                    ) : (
                      <span className="text-xs text-white/30">{formatDate(item.dueDate)}</span>
                    )}
                  </div>

                  {/* Amount */}
                  <span className={cn(
                    'text-sm tabular-nums w-24 text-right shrink-0 font-medium',
                    item.direction === 'in' ? 'text-emerald-400/80' : 'text-red-400/70'
                  )}>
                    {item.direction === 'in' ? '+' : '-'}{formatMoney(item.amount)}
                  </span>

                  {/* Project */}
                  <span className="w-24 text-center shrink-0">
                    {item.projectCode ? (
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                        {item.projectCode}
                      </span>
                    ) : (
                      <span className="text-xs text-white/15">—</span>
                    )}
                  </span>

                  {/* Status */}
                  <div className="w-20 text-center shrink-0 flex items-center justify-center gap-1">
                    {item.isPaid ? (
                      <span className="flex items-center gap-1 text-xs text-green-400/60">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </span>
                    ) : item.isOverdue ? (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <AlertTriangle className="h-3 w-3" /> Overdue
                      </span>
                    ) : (
                      <span className="text-xs text-white/30">{item.status}</span>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="ml-8 mt-1 mb-2 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Total</p>
                        <p className="text-sm text-white/80 tabular-nums">{formatMoney(item.amount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Amount Due</p>
                        <p className="text-sm text-white/80 tabular-nums">{formatMoney(item.amountDue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Amount Paid</p>
                        <p className="text-sm text-white/80 tabular-nums">{formatMoney(item.amountPaid)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Receipt</p>
                        <p className="text-sm">
                          {item.hasReceipt
                            ? <span className="text-green-400/60 flex items-center gap-1"><Paperclip className="h-3 w-3" /> Attached</span>
                            : <span className="text-white/20">None</span>
                          }
                        </p>
                      </div>
                    </div>

                    {/* Project re-tag */}
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
                        Project Tag {item.projectCode && <span className="normal-case text-white/50">— currently {item.projectCode} ({projectName(item.projectCode)})</span>}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {projects.map(project => (
                          <button
                            key={project.code}
                            onClick={() => tagMutation.mutate({ ids: [item.id], projectCode: project.code })}
                            disabled={tagMutation.isPending || project.code === item.projectCode}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg text-xs transition-colors border',
                              project.code === item.projectCode
                                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400/50 cursor-not-allowed'
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/90',
                              'disabled:opacity-30',
                            )}
                          >
                            {project.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
