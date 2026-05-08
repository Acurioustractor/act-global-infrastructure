'use client'

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Zap,
  FileText,
  Building2,
  Paperclip,
  ArrowDownLeft,
  Layers,
  X,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// --- Types ---

interface QueueItem {
  id: string
  vendor: string
  amount: number
  date: string
  type: 'invoice' | 'transaction'
  description: string | null
  hasReceipt: boolean
  suggestedProject: string | null
  currentProject: string | null
  confidence: number
  siblingCount: number
}

interface Project {
  code: string
  name: string
  tier: string
}

interface QueueResponse {
  items: QueueItem[]
  projects: Project[]
  stats: { totalUntagged: number; totalValue: number; totalItems?: number }
}

const RD_PROJECTS = new Set(['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'])

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toFixed(0)}`
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(d))
}

type SortField = 'vendor' | 'amount' | 'date' | 'project'

export default function TaggerBulkPage() {
  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<string | null>(null) // null=all, 'untagged', or project code
  const [searchFilter, setSearchFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [retaggingId, setRetaggingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch both untagged + tagged
  const { data: untaggedData, isLoading: l1 } = useQuery<QueueResponse>({
    queryKey: ['tagger-queue', 'untagged'],
    queryFn: () => fetch('/api/finance/tagger-queue').then(r => r.json()),
    staleTime: 30_000,
  })

  const { data: taggedData, isLoading: l2 } = useQuery<QueueResponse>({
    queryKey: ['tagger-queue', 'tagged'],
    queryFn: () => fetch('/api/finance/tagger-queue?mode=review').then(r => r.json()),
    staleTime: 30_000,
  })

  const isLoading = l1 || l2

  // Merge and deduplicate
  const allItems = useMemo(() => {
    const seen = new Set<string>()
    const merged: QueueItem[] = []
    for (const item of [...(untaggedData?.items || []), ...(taggedData?.items || [])]) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        merged.push(item)
      }
    }
    return merged
  }, [untaggedData, taggedData])

  const projects = useMemo(() => {
    return untaggedData?.projects || taggedData?.projects || []
  }, [untaggedData, taggedData])

  // Build tag summary for pills
  const tagSummary = useMemo(() => {
    const counts = new Map<string, { count: number; value: number }>()
    let untaggedCount = 0
    let untaggedValue = 0
    for (const item of allItems) {
      if (item.currentProject) {
        const entry = counts.get(item.currentProject) || { count: 0, value: 0 }
        entry.count++
        entry.value += item.amount
        counts.set(item.currentProject, entry)
      } else {
        untaggedCount++
        untaggedValue += item.amount
      }
    }
    // Sort by count descending
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([code, stats]) => ({ code, ...stats }))
    return { projects: sorted, untaggedCount, untaggedValue }
  }, [allItems])

  // Project name lookup
  function projectName(code: string) {
    return projects.find(p => p.code === code)?.name || code
  }

  // Filter + search
  const filteredItems = useMemo(() => {
    let items = allItems

    // Tag filter
    if (activeFilter === 'untagged') {
      items = items.filter(i => !i.currentProject)
    } else if (activeFilter) {
      items = items.filter(i => i.currentProject === activeFilter)
    }

    // Text search
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      items = items.filter(i =>
        i.vendor.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.currentProject || '').toLowerCase().includes(q)
      )
    }

    // Sort
    items = [...items].sort((a, b) => {
      switch (sortField) {
        case 'vendor': return sortAsc ? a.vendor.localeCompare(b.vendor) : b.vendor.localeCompare(a.vendor)
        case 'amount': return sortAsc ? a.amount - b.amount : b.amount - a.amount
        case 'date': return sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
        case 'project': {
          const ap = a.currentProject || 'zzz'
          const bp = b.currentProject || 'zzz'
          return sortAsc ? ap.localeCompare(bp) : bp.localeCompare(ap)
        }
        default: return 0
      }
    })

    return items
  }, [allItems, activeFilter, searchFilter, sortField, sortAsc])

  // Selection
  const selectedItems = useMemo(() => filteredItems.filter(i => selectedIds.has(i.id)), [filteredItems, selectedIds])
  const selectedTotal = useMemo(() => selectedItems.reduce((s, i) => s + i.amount, 0), [selectedItems])

  function toggleItem(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)))
    }
  }

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  function handleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  // Tag mutation
  const tagMutation = useMutation({
    mutationFn: async (payload: { contactName: string; projectCode: string; ids: string[] }) => {
      const res = await fetch('/api/transactions/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: payload.contactName,
          ids: payload.ids,
          projectCode: payload.projectCode,
          saveAsRule: true,
        }),
      })
      return res.json()
    },
    onSuccess: (result, variables) => {
      const count = result.updated || 1
      showToast(`Tagged ${count} item${count > 1 ? 's' : ''} → ${variables.projectCode}`)
      setRetaggingId(null)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['tagger-queue'] })
    },
  })

  function handleTag(projectCode: string, item: QueueItem) {
    tagMutation.mutate({ contactName: item.vendor, projectCode, ids: [item.id] })
  }

  function handleBulkTag(projectCode: string) {
    if (selectedItems.length === 0) return
    // Group by vendor for rule creation
    const vendorMap = new Map<string, string[]>()
    for (const item of selectedItems) {
      if (!vendorMap.has(item.vendor)) vendorMap.set(item.vendor, [])
      vendorMap.get(item.vendor)!.push(item.id)
    }
    // Fire sequentially
    ;(async () => {
      let total = 0
      for (const [vendor, ids] of vendorMap) {
        try {
          const result = await tagMutation.mutateAsync({ contactName: vendor, projectCode, ids })
          total += result.updated || ids.length
        } catch { /* continue */ }
      }
      showToast(`Bulk tagged ${total} items → ${projectCode}`)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['tagger-queue'] })
    })()
  }

  const allSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length
  const someSelected = selectedIds.size > 0

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <Layers className="h-10 w-10 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading all items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Layers className="h-7 w-7 text-purple-400" />
              Bulk Tagger
            </h1>
            <span className="text-sm text-white/30">{allItems.length} items · {formatMoney(allItems.reduce((s, i) => s + i.amount, 0))}</span>
          </div>
          <Link
            href="/finance/tagger-v2"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-white/5 text-white/50 border border-white/10 hover:text-white/80 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" /> Rapid Tagger
          </Link>
        </div>
      </header>

      {/* Tag pills — the main filter UI */}
      <div className="glass-card p-4 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {/* All */}
          <button
            onClick={() => { setActiveFilter(null); setSelectedIds(new Set()) }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs transition-colors border',
              activeFilter === null
                ? 'bg-white/15 border-white/20 text-white'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
            )}
          >
            All <span className="text-white/30 ml-1">{allItems.length}</span>
          </button>

          {/* Untagged */}
          {tagSummary.untaggedCount > 0 && (
            <button
              onClick={() => { setActiveFilter('untagged'); setSelectedIds(new Set()) }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs transition-colors border',
                activeFilter === 'untagged'
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  : 'bg-amber-500/5 border-amber-500/10 text-amber-400/60 hover:text-amber-400'
              )}
            >
              Untagged <span className="opacity-60 ml-1">{tagSummary.untaggedCount}</span>
              <span className="opacity-40 ml-1">({formatMoney(tagSummary.untaggedValue)})</span>
            </button>
          )}

          {/* Divider */}
          <div className="w-px bg-white/10 mx-1 self-stretch" />

          {/* Project pills */}
          {tagSummary.projects.map(({ code, count, value }) => (
            <button
              key={code}
              onClick={() => { setActiveFilter(activeFilter === code ? null : code); setSelectedIds(new Set()) }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs transition-colors border',
                activeFilter === code
                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
              )}
            >
              {projectName(code)} <span className="opacity-40 ml-1">{count}</span>
              <span className="opacity-30 ml-1">({formatMoney(value)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + controls */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search vendors or descriptions..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20"
        />
        {searchFilter && (
          <button onClick={() => setSearchFilter('')} className="text-white/30 hover:text-white/60">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="glass-card p-4 mb-4 border-2 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white">
              <span className="font-semibold text-amber-400">{selectedIds.size}</span> selected
              <span className="text-white/40 ml-2">({formatMoney(selectedTotal)})</span>
            </span>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-white/40 hover:text-white/60">
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {projects.map(project => (
              <button
                key={project.code}
                onClick={() => handleBulkTag(project.code)}
                disabled={tagMutation.isPending}
                className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                <span className="font-semibold">{project.name}</span>
                <span className="text-white/30 ml-1">{project.code}</span>
                {RD_PROJECTS.has(project.code) && <span className="text-lime-400 ml-1">R&D</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-white/30 uppercase tracking-wider border-b border-white/5 mb-1">
        <button onClick={selectAll} className="w-5 text-white/30 hover:text-white/60 transition-colors shrink-0">
          {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : someSelected ? <MinusSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        </button>
        <div className="w-4 shrink-0" />
        <button onClick={() => handleSort('vendor')} className="flex-1 text-left hover:text-white/60 transition-colors">
          Vendor {sortField === 'vendor' && (sortAsc ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('date')} className="w-24 text-right hover:text-white/60 transition-colors">
          Date {sortField === 'date' && (sortAsc ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('amount')} className="w-24 text-right hover:text-white/60 transition-colors">
          Amount {sortField === 'amount' && (sortAsc ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('project')} className="w-28 text-center hover:text-white/60 transition-colors">
          Tag {sortField === 'project' && (sortAsc ? '↑' : '↓')}
        </button>
        <div className="w-5 shrink-0" />
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="glass-card p-12 text-center mt-4">
          <p className="text-white/40">
            {searchFilter ? `No items matching "${searchFilter}"` : 'No items found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {filteredItems.map(item => {
            const isSelected = selectedIds.has(item.id)
            const isRetagging = retaggingId === item.id

            return (
              <div key={item.id}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors',
                    isRetagging
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : isSelected
                        ? 'bg-white/[0.06] border border-amber-500/15'
                        : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]',
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-5 shrink-0 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {isSelected
                      ? <CheckSquare className="h-3.5 w-3.5 text-amber-400/60" />
                      : <Square className="h-3.5 w-3.5" />
                    }
                  </button>

                  {/* Type icon */}
                  <div className="w-4 shrink-0">
                    {item.type === 'invoice'
                      ? <FileText className="h-3.5 w-3.5 text-red-400/40" />
                      : <Building2 className="h-3.5 w-3.5 text-red-400/40" />
                    }
                  </div>

                  {/* Vendor + description */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white/80">{item.vendor}</span>
                    {item.description && (
                      <span className="text-xs text-white/25 ml-2 truncate">{item.description}</span>
                    )}
                  </div>

                  {/* Date */}
                  <span className="text-xs text-white/30 w-24 text-right shrink-0">{formatDate(item.date)}</span>

                  {/* Amount */}
                  <span className="text-sm text-red-400/70 tabular-nums w-24 text-right shrink-0">
                    <ArrowDownLeft className="h-3 w-3 inline mr-0.5" />
                    {formatMoney(item.amount)}
                  </span>

                  {/* Current tag — click to re-tag */}
                  <button
                    onClick={() => setRetaggingId(isRetagging ? null : item.id)}
                    className={cn(
                      'w-28 text-center shrink-0 px-2 py-1 rounded-lg text-xs transition-colors border',
                      item.currentProject
                        ? isRetagging
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-400/70 hover:border-blue-500/40 hover:text-blue-400'
                        : isRetagging
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                          : 'bg-amber-500/5 border-amber-500/10 text-amber-400/50 hover:text-amber-400'
                    )}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {item.currentProject || 'untagged'}
                      <ChevronDown className="h-3 w-3 opacity-40" />
                    </span>
                  </button>

                  {/* Receipt */}
                  <div className="w-5 shrink-0 flex justify-center">
                    {item.hasReceipt && <Paperclip className="h-3 w-3 text-green-400/40" />}
                  </div>
                </div>

                {/* Inline re-tag panel */}
                {isRetagging && (
                  <div className="ml-9 mt-1 mb-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <p className="text-xs text-white/40 mb-2">
                      Re-tag <span className="text-white/70">{item.vendor}</span>
                      {item.currentProject && <span> — currently <span className="text-blue-400">{item.currentProject}</span></span>}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {projects.map(project => (
                        <button
                          key={project.code}
                          onClick={() => handleTag(project.code, item)}
                          disabled={tagMutation.isPending || project.code === item.currentProject}
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-xs transition-colors border',
                            project.code === item.currentProject
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400/50 cursor-not-allowed'
                              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/90',
                            'disabled:opacity-30',
                          )}
                        >
                          {project.name}
                          {RD_PROJECTS.has(project.code) && <span className="text-lime-400 ml-1">R&D</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-6 py-3 text-sm text-white shadow-2xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
