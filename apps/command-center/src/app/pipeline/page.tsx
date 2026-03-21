'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Filter, Search, X, Handshake } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PipelineBoard } from './pipeline-board'
import { RelationshipPreview } from './relationship-preview'
import { AddRelationshipModal } from './add-relationship'
import { entityColor, type RelationshipItem } from './utils'

const ENTITY_TYPES = ['grant', 'foundation', 'business', 'person', 'opportunity'] as const

async function fetchPipeline(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`/api/pipeline${qs}`)
  if (!res.ok) throw new Error('Failed to fetch pipeline')
  return res.json()
}

async function updateRelationship(id: string, updates: Partial<RelationshipItem>) {
  const res = await fetch(`/api/pipeline/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update')
  return res.json()
}

export default function PipelinePage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [showAdd, setShowAdd] = React.useState(false)
  const [filterType, setFilterType] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [showFilters, setShowFilters] = React.useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['pipeline', filterType],
    queryFn: () => fetchPipeline(filterType ? { entity_type: filterType } : undefined),
    refetchInterval: 30_000,
  })

  const mutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<RelationshipItem> }) =>
      updateRelationship(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
  })

  const board = data?.board || {}
  const summary = data?.summary || { total: 0, byType: {}, totalValue: 0, needsAttention: 0 }
  const allItems: RelationshipItem[] = data?.items || []

  // Client-side search filter
  const filteredBoard = React.useMemo(() => {
    if (!searchQuery) return board
    const q = searchQuery.toLowerCase()
    const filtered: Record<string, RelationshipItem[]> = {}
    for (const [stage, items] of Object.entries(board)) {
      filtered[stage] = (items as RelationshipItem[]).filter(
        (r) =>
          r.entity_name.toLowerCase().includes(q) ||
          r.subtitle?.toLowerCase().includes(q) ||
          r.key_contact?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [board, searchQuery])

  const selectedItem = selectedId
    ? allItems.find((r) => r.id === selectedId) || null
    : null

  const handleStageChange = (itemId: string, newStage: string) => {
    mutation.mutate({ id: itemId, updates: { stage: newStage } })
  }

  const handleUpdateItem = (id: string, updates: Partial<RelationshipItem>) => {
    mutation.mutate({ id, updates })
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 glass-card border-b border-white/[0.06] rounded-none px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Handshake className="h-5 w-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-white">Relationship Pipeline</h1>
            <span className="text-sm text-white/40 ml-2">
              {summary.total} relationships &middot; ${Math.round(summary.totalValue).toLocaleString()} total value
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-8 pr-8 py-1.5 text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-white/30 hover:text-white/60" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors',
                showFilters || filterType
                  ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                  : 'bg-white/[0.06] border-white/[0.08] text-white/60 hover:text-white/80'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>

            {/* Add button */}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
            <span className="text-xs text-white/40 mr-1">Type:</span>
            <button
              onClick={() => setFilterType(null)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md transition-colors',
                !filterType ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              )}
            >
              All ({summary.total})
            </button>
            {ENTITY_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type === filterType ? null : type)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md transition-colors flex items-center gap-1',
                  filterType === type
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', entityColor(type))} />
                {type} ({summary.byType?.[type] || 0})
              </button>
            ))}
            {summary.needsAttention > 0 && (
              <span className="ml-auto text-xs text-amber-400">
                {summary.needsAttention} need attention
              </span>
            )}
          </div>
        )}
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-white/40 text-sm">Loading pipeline...</div>
        </div>
      ) : (
        <PipelineBoard
          board={filteredBoard}
          onStageChange={handleStageChange}
          onSelect={setSelectedId}
          selectedId={selectedId}
        />
      )}

      {/* Preview panel */}
      {selectedItem && (
        <RelationshipPreview
          item={selectedItem}
          onClose={() => setSelectedId(null)}
          onUpdate={(updates) => handleUpdateItem(selectedItem.id, updates)}
        />
      )}

      {/* Add modal */}
      {showAdd && (
        <AddRelationshipModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false)
            queryClient.invalidateQueries({ queryKey: ['pipeline'] })
          }}
        />
      )}
    </div>
  )
}
