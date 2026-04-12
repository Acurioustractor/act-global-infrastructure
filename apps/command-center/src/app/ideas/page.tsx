'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import {
  Plus, Search, X, Lightbulb, Landmark, Gift, DollarSign,
  Users, Cpu, FolderKanban, HelpCircle, Flame, Link2, Trash2,
  LayoutGrid, Columns3, ChevronRight, Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---- Types ----

interface Idea {
  id: string
  text: string
  category: string
  tags: string[]
  color: string | null
  links: string[]
  pipeline_link_id: string | null
  project_code: string | null
  energy: number
  status: string
  notes: string | null
  value_estimate: number
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  { id: 'idea', label: 'Idea', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  { id: 'foundation', label: 'Foundation', icon: Landmark, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  { id: 'grant', label: 'Grant', icon: Gift, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  { id: 'partner', label: 'Partner', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  { id: 'tech', label: 'Tech', icon: Cpu, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
  { id: 'project', label: 'Project', icon: FolderKanban, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  { id: 'question', label: 'Question', icon: HelpCircle, color: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500/30' },
] as const

const STAGES = [
  { id: 'open', label: 'Spark', icon: '💡', color: 'border-yellow-500/30', desc: 'Raw ideas' },
  { id: 'exploring', label: 'Exploring', icon: '🔍', color: 'border-blue-500/30', desc: 'Researching' },
  { id: 'doing', label: 'Building', icon: '🔨', color: 'border-green-500/30', desc: 'In progress' },
  { id: 'parked', label: 'Parked', icon: '⏸️', color: 'border-white/10', desc: 'On hold' },
  { id: 'done', label: 'Done', icon: '✅', color: 'border-emerald-500/30', desc: 'Completed' },
] as const

const PROJECT_CODES = ['EL', 'JH', 'GOC', 'BCV', 'HARVEST', 'FARM', 'ART', 'ACT-CORE', 'ACT-EL', 'ACT-JH', 'ACT-GD', 'ACT-HV'] as const

// ---- API ----

async function fetchIdeas(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`/api/ideas${qs}`)
  return res.json()
}

async function createIdea(idea: Partial<Idea>) {
  const res = await fetch('/api/ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(idea),
  })
  return res.json()
}

async function updateIdea(id: string, updates: Partial<Idea>) {
  const res = await fetch(`/api/ideas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return res.json()
}

async function deleteIdea(id: string) {
  await fetch(`/api/ideas/${id}`, { method: 'DELETE' })
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  if (n > 0) return `$${n}`
  return ''
}

// ---- Page ----

export default function IdeasPage() {
  const queryClient = useQueryClient()
  const [newText, setNewText] = React.useState('')
  const [newCategory, setNewCategory] = React.useState('idea')
  const [newProject, setNewProject] = React.useState<string | null>(null)
  const [newTags, setNewTags] = React.useState<string[]>([])
  const [newTagInput, setNewTagInput] = React.useState('')
  const [newValue, setNewValue] = React.useState('')
  const [newEnergy, setNewEnergy] = React.useState(0)
  const [showAddDetails, setShowAddDetails] = React.useState(false)
  const [filterCategory, setFilterCategory] = React.useState<string | null>(null)
  const [filterProject, setFilterProject] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [view, setView] = React.useState<'grid' | 'board'>('board')
  const [groupBy, setGroupBy] = React.useState<'none' | 'category' | 'project'>('none')
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  const queryParams: Record<string, string> = {}
  if (filterCategory) queryParams.category = filterCategory
  if (searchQuery) queryParams.q = searchQuery

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['ideas', queryParams],
    queryFn: () => fetchIdeas(Object.keys(queryParams).length ? queryParams : undefined),
    refetchInterval: 30_000,
  })

  const addMutation = useMutation({
    mutationFn: createIdea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      resetAddForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Idea> }) => updateIdea(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteIdea,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas'] }),
  })

  // Filter by project client-side
  const filteredIdeas = filterProject
    ? ideas.filter((i: Idea) => i.project_code === filterProject)
    : ideas

  // Totals
  const totalValue = filteredIdeas.reduce((sum: number, i: Idea) => sum + (i.value_estimate || 0), 0)
  const hotCount = filteredIdeas.filter((i: Idea) => i.energy >= 4).length

  // Collect popular tags from existing ideas for suggestions
  const popularTags = React.useMemo(() => {
    const tagCounts: Record<string, number> = {}
    for (const idea of ideas) {
      for (const tag of idea.tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag)
  }, [ideas])

  const resetAddForm = () => {
    setNewText('')
    setNewProject(null)
    setNewTags([])
    setNewTagInput('')
    setNewValue('')
    setNewEnergy(0)
    setShowAddDetails(false)
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim()) return

    let text = newText
    const tags = [...newTags]
    let projectCode = newProject
    let valueEstimate = 0

    // Parse $XXK or $XXXK from value field or text
    if (newValue) {
      const valMatch = newValue.match(/(\d+(?:\.\d+)?)\s*([KkMm])?/)
      if (valMatch) {
        let val = parseFloat(valMatch[1])
        if (valMatch[2]?.toUpperCase() === 'K') val *= 1000
        if (valMatch[2]?.toUpperCase() === 'M') val *= 1_000_000
        valueEstimate = val
      }
    }

    // Also parse inline #tags and @PROJECT from text
    const tagMatches = text.match(/#(\w+)/g)
    if (tagMatches) {
      tagMatches.forEach(t => {
        const tag = t.slice(1)
        if (!tags.includes(tag)) tags.push(tag)
        text = text.replace(t, '').trim()
      })
    }
    const projectMatch = text.match(/@([\w-]+)/)
    if (projectMatch && !projectCode) {
      const code = projectMatch[1].toUpperCase()
      if (PROJECT_CODES.includes(code as typeof PROJECT_CODES[number])) {
        projectCode = code
        text = text.replace(projectMatch[0], '').trim()
      }
    }

    addMutation.mutate({
      text,
      category: newCategory,
      tags,
      project_code: projectCode,
      value_estimate: valueEstimate,
      energy: newEnergy,
    })
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStatus = destination.droppableId
    updateMutation.mutate({ id: draggableId, updates: { status: newStatus } })
  }

  // Board: group by status
  const board = React.useMemo(() => {
    const cols: Record<string, Idea[]> = {}
    for (const stage of STAGES) cols[stage.id] = []
    for (const idea of filteredIdeas) {
      const status = idea.status || 'open'
      if (cols[status]) cols[status].push(idea)
      else cols['open'].push(idea)
    }
    return cols
  }, [filteredIdeas])

  // Grid: group by selected dimension
  const grouped = React.useMemo(() => {
    if (groupBy === 'none') return { 'All Ideas': filteredIdeas }
    const groups: Record<string, Idea[]> = {}
    for (const idea of filteredIdeas) {
      const key = groupBy === 'category' ? idea.category : idea.project_code || 'unassigned'
      if (!groups[key]) groups[key] = []
      groups[key].push(idea)
    }
    return groups
  }, [filteredIdeas, groupBy])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 glass-card border-b border-white/[0.06] rounded-none px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            <h1 className="text-lg font-semibold text-white">Ideas</h1>
            <span className="text-sm text-white/30">{filteredIdeas.length} ideas</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Totals */}
            {totalValue > 0 && (
              <span className="text-sm font-medium text-green-400">
                {formatMoney(totalValue)} total
              </span>
            )}
            {hotCount > 0 && (
              <span className="flex items-center gap-1 text-sm font-medium text-orange-400">
                <Flame className="h-3.5 w-3.5" /> {hotCount} Hot
              </span>
            )}

            <span className="w-px h-5 bg-white/10" />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 pl-8 pr-8 py-1.5 text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-white/30 hover:text-white/60" />
                </button>
              )}
            </div>

            {/* View toggle */}
            <div className="flex bg-white/[0.06] rounded-lg p-0.5">
              <button
                onClick={() => setView('board')}
                className={cn('p-1.5 rounded-md transition-all', view === 'board' ? 'bg-white/[0.1] text-white' : 'text-white/30 hover:text-white/50')}
                title="Board view"
              >
                <Columns3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={cn('p-1.5 rounded-md transition-all', view === 'grid' ? 'bg-white/[0.1] text-white' : 'text-white/30 hover:text-white/50')}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {/* Group by (grid only) */}
            {view === 'grid' && (
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
                className="px-3 py-1.5 text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg text-white/60 focus:outline-none focus:border-yellow-500/50 appearance-none cursor-pointer"
              >
                <option value="none">No grouping</option>
                <option value="category">By type</option>
                <option value="project">By project</option>
              </select>
            )}
          </div>
        </div>

        {/* Quick-add */}
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Row 1: Text input + submit */}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={newText}
              onChange={(e) => {
                setNewText(e.target.value)
                if (e.target.value.length > 0 && !showAddDetails) setShowAddDetails(true)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder="What's the idea?"
              rows={1}
              className="flex-1 min-w-0 px-4 py-2.5 text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-white/25 focus:outline-none focus:border-yellow-500/40 resize-none"
            />
            <button
              type="submit"
              disabled={!newText.trim() || addMutation.isPending}
              className="flex-shrink-0 px-4 py-2 bg-yellow-500/80 hover:bg-yellow-500 text-black font-medium text-sm rounded-lg transition-colors disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Row 2: Category + Project + Value + Energy (always visible) */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Category icons */}
            <div className="flex gap-0.5">
              {CATEGORIES.map(cat => {
                const isFiltered = filterCategory === cat.id
                const isSelected = newCategory === cat.id
                const count = ideas.filter((i: Idea) => i.category === cat.id).length
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      if (isFiltered) {
                        setFilterCategory(null)
                      } else if (isSelected) {
                        setFilterCategory(cat.id)
                      } else {
                        setNewCategory(cat.id)
                      }
                    }}
                    className={cn(
                      'relative p-1.5 rounded-lg transition-all',
                      isFiltered
                        ? `${cat.bg} ${cat.color} ring-2 ring-white/30`
                        : isSelected
                          ? `${cat.bg} ${cat.color}`
                          : 'text-white/20 hover:text-white/40'
                    )}
                    title={`${cat.label} (${count})`}
                  >
                    <cat.icon className="h-4 w-4" />
                    {isFiltered && count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-white/20 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center font-medium px-0.5">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <span className="w-px h-5 bg-white/10" />

            {/* Project quick-select */}
            <div className="flex gap-1 flex-wrap">
              {(['ACT-CORE', 'ACT-EL', 'ACT-JH', 'ACT-GD', 'ACT-HV', 'FARM', 'BCV', 'ART'] as const).map(pc => (
                <button
                  key={pc}
                  type="button"
                  onClick={() => setNewProject(newProject === pc ? null : pc)}
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-mono rounded-md transition-all',
                    newProject === pc
                      ? 'bg-indigo-500/30 text-indigo-300 ring-1 ring-indigo-500/50'
                      : 'text-white/20 hover:text-white/40 hover:bg-white/[0.04]'
                  )}
                >
                  {pc.replace('ACT-', '')}
                </button>
              ))}
            </div>

            <span className="w-px h-5 bg-white/10" />

            {/* Value input */}
            <div className="relative">
              <DollarSign className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-green-400/50" />
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="0"
                className="w-20 pl-5 pr-2 py-1 text-xs bg-white/[0.04] border border-white/[0.06] rounded-md text-green-400 placeholder-white/15 focus:outline-none focus:border-green-500/40 tabular-nums"
              />
            </div>

            {/* Energy */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNewEnergy(newEnergy === n ? 0 : n)}
                  className={cn(
                    'p-0.5 rounded transition-all',
                    n <= newEnergy ? 'text-orange-400' : 'text-white/10 hover:text-white/30'
                  )}
                >
                  <Flame className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            {filterCategory && (
              <button
                type="button"
                onClick={() => setFilterCategory(null)}
                className="ml-auto text-[10px] text-white/30 hover:text-white/50 flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear filter
              </button>
            )}
          </div>

          {/* Row 3: Tags (shown when typing or has tags) */}
          {(showAddDetails || newTags.length > 0) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-white/20">Tags:</span>
              {newTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setNewTags(newTags.filter(t => t !== tag))}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.08] text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                >
                  #{tag} <X className="h-2 w-2 inline ml-0.5" />
                </button>
              ))}
              <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ' || e.key === ',') && newTagInput.trim()) {
                    e.preventDefault()
                    const tag = newTagInput.trim().replace(/^#/, '')
                    if (tag && !newTags.includes(tag)) setNewTags([...newTags, tag])
                    setNewTagInput('')
                  }
                }}
                placeholder="add tag..."
                className="text-[10px] px-1.5 py-0.5 bg-white/[0.04] rounded-md text-white/30 w-20 focus:outline-none focus:w-28 transition-all"
              />
              {/* Popular tag suggestions */}
              {popularTags.filter(t => !newTags.includes(t)).slice(0, 8).map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => { if (!newTags.includes(tag)) setNewTags([...newTags, tag]) }}
                  className="text-[10px] px-1.5 py-0.5 rounded-md text-white/15 hover:text-white/40 hover:bg-white/[0.04] transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[11px] text-white/30 uppercase tracking-wider">Filter:</span>
          {CATEGORIES.map(cat => {
            const count = ideas.filter((i: Idea) => i.category === cat.id).length
            if (count === 0) return null
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 text-xs rounded-md transition-colors',
                  filterCategory === cat.id ? `${cat.bg} ${cat.color}` : 'text-white/30 hover:text-white/50'
                )}
              >
                <cat.icon className="h-3 w-3" />
                {cat.label} <span className="text-white/20">{count}</span>
              </button>
            )
          })}

          {/* Project filters */}
          {PROJECT_CODES.some(pc => ideas.some((i: Idea) => i.project_code === pc)) && (
            <>
              <span className="w-px h-4 bg-white/10 mx-1" />
              {PROJECT_CODES.map(pc => {
                const count = ideas.filter((i: Idea) => i.project_code === pc).length
                if (count === 0) return null
                return (
                  <button
                    key={pc}
                    onClick={() => setFilterProject(filterProject === pc ? null : pc)}
                    className={cn(
                      'px-2 py-0.5 text-xs rounded-md transition-colors font-mono',
                      filterProject === pc ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
                    )}
                  >
                    {pc}
                  </button>
                )
              })}
            </>
          )}

          {(filterCategory || filterProject) && (
            <button
              onClick={() => { setFilterCategory(null); setFilterProject(null) }}
              className="text-xs text-white/20 hover:text-white/40 ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-white/30 text-sm">Loading ideas...</div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb className="h-12 w-12 mx-auto mb-3 text-yellow-500/20" />
          <p className="text-white/30 text-sm">No ideas yet. Start typing above.</p>
          <p className="text-white/15 text-xs mt-1">Use #tags @PROJECT $50K to organize</p>
        </div>
      ) : view === 'board' ? (
        /* ===== KANBAN BOARD VIEW ===== */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 p-4 overflow-x-auto min-h-[calc(100vh-14rem)]">
            {STAGES.map((stage) => {
              const items = board[stage.id] || []
              const colValue = items.reduce((s, i) => s + (i.value_estimate || 0), 0)
              const isTerminal = stage.id === 'parked' || stage.id === 'done'

              return (
                <Droppable key={stage.id} droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex-shrink-0 rounded-xl border transition-colors',
                        isTerminal ? 'w-48' : 'w-72',
                        stage.color,
                        snapshot.isDraggingOver ? 'bg-white/[0.06] border-yellow-500/40' : 'bg-white/[0.02]'
                      )}
                    >
                      {/* Column header */}
                      <div className="sticky top-0 px-3 py-2.5 border-b border-white/[0.06] bg-inherit rounded-t-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{stage.icon}</span>
                            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                              {stage.label}
                            </span>
                          </div>
                          <span className="text-xs text-white/30 tabular-nums">{items.length}</span>
                        </div>
                        {colValue > 0 && (
                          <div className="text-xs text-green-400/70 font-medium mt-0.5">
                            {formatMoney(colValue)}
                          </div>
                        )}
                      </div>

                      {/* Cards */}
                      <div className="p-2 space-y-2 min-h-[4rem]">
                        {items.map((idea, index) => (
                          <Draggable key={idea.id} draggableId={idea.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <IdeaCard
                                  idea={idea}
                                  allIdeas={ideas}
                                  compact={isTerminal}
                                  isEditing={editingId === idea.id}
                                  isDragging={dragSnapshot.isDragging}
                                  onEdit={() => setEditingId(editingId === idea.id ? null : idea.id)}
                                  onUpdate={(updates) => updateMutation.mutate({ id: idea.id, updates })}
                                  onDelete={() => deleteMutation.mutate(idea.id)}
                                  onLink={(targetId) => {
                                    const newLinks = idea.links.includes(targetId)
                                      ? idea.links.filter(l => l !== targetId)
                                      : [...idea.links, targetId]
                                    updateMutation.mutate({ id: idea.id, updates: { links: newLinks } })
                                  }}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>
        </DragDropContext>
      ) : (
        /* ===== GRID VIEW ===== */
        <div className="p-4">
          {Object.entries(grouped).map(([groupLabel, groupIdeas]) => (
            <div key={groupLabel} className="mb-6">
              {groupBy !== 'none' && (
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                  {getCategoryIcon(groupLabel)}
                  {groupLabel}
                  <span className="text-white/20">({(groupIdeas as Idea[]).length})</span>
                  {(() => {
                    const gv = (groupIdeas as Idea[]).reduce((s, i) => s + (i.value_estimate || 0), 0)
                    return gv > 0 ? <span className="text-green-400/60 ml-2">{formatMoney(gv)}</span> : null
                  })()}
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {(groupIdeas as Idea[]).map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    allIdeas={ideas}
                    isEditing={editingId === idea.id}
                    onEdit={() => setEditingId(editingId === idea.id ? null : idea.id)}
                    onUpdate={(updates) => updateMutation.mutate({ id: idea.id, updates })}
                    onDelete={() => deleteMutation.mutate(idea.id)}
                    onLink={(targetId) => {
                      const newLinks = idea.links.includes(targetId)
                        ? idea.links.filter(l => l !== targetId)
                        : [...idea.links, targetId]
                      updateMutation.mutate({ id: idea.id, updates: { links: newLinks } })
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getCategoryIcon(cat: string) {
  const found = CATEGORIES.find(c => c.id === cat)
  if (!found) return null
  return <found.icon className={cn('h-3.5 w-3.5', found.color)} />
}

// ---- Idea Card ----

function IdeaCard({
  idea,
  allIdeas,
  compact,
  isEditing,
  isDragging,
  onEdit,
  onUpdate,
  onDelete,
  onLink,
}: {
  idea: Idea
  allIdeas: Idea[]
  compact?: boolean
  isEditing: boolean
  isDragging?: boolean
  onEdit: () => void
  onUpdate: (updates: Partial<Idea>) => void
  onDelete: () => void
  onLink: (targetId: string) => void
}) {
  const cat = CATEGORIES.find(c => c.id === idea.category) || CATEGORIES[0]
  const [editText, setEditText] = React.useState(idea.text)
  const [editNotes, setEditNotes] = React.useState(idea.notes || '')
  const [editValue, setEditValue] = React.useState(String(idea.value_estimate || ''))
  const [showLinkPicker, setShowLinkPicker] = React.useState(false)
  const [tagInput, setTagInput] = React.useState('')

  React.useEffect(() => {
    setEditText(idea.text)
    setEditNotes(idea.notes || '')
    setEditValue(String(idea.value_estimate || ''))
  }, [idea.text, idea.notes, idea.value_estimate])

  const linkedIdeas = allIdeas.filter(i => (idea.links || []).includes(i.id))

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isEditing ? `${cat.border} bg-white/[0.06]` : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.1]',
        isDragging && 'shadow-xl shadow-black/40 ring-1 ring-yellow-500/50',
      )}
    >
      <div className={cn('p-3', compact && 'p-2')}>
        {/* Top row: category + project + value + energy */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <cat.icon className={cn('h-3.5 w-3.5 flex-shrink-0', cat.color)} />
          <span className={cn('text-[10px] font-semibold uppercase tracking-wider', cat.color)}>
            {idea.category}
          </span>
          {idea.project_code && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white/[0.06] rounded text-white/40">
              {idea.project_code}
            </span>
          )}
          <span className="flex-1" />
          {idea.value_estimate > 0 && (
            <span className="text-xs font-medium text-green-400/80 tabular-nums">
              {formatMoney(idea.value_estimate)}
            </span>
          )}
          {idea.energy > 0 && !compact && (
            <span className="flex gap-0.5" title={`Energy: ${idea.energy}/5`}>
              {Array.from({ length: Math.min(idea.energy, 5) }).map((_, i) => (
                <Flame key={i} className="h-3 w-3 text-orange-400" />
              ))}
            </span>
          )}
        </div>

        {/* Text */}
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={() => { if (editText !== idea.text) onUpdate({ text: editText }) }}
            className="w-full bg-transparent text-sm text-white border-none focus:outline-none resize-none mb-2"
            rows={3}
            autoFocus
          />
        ) : (
          <p
            className={cn(
              'text-sm text-white/80 leading-relaxed cursor-pointer mb-2',
              compact && 'text-xs line-clamp-2'
            )}
            onClick={onEdit}
          >
            {idea.text}
          </p>
        )}

        {/* Tags */}
        {!compact && (idea.tags.length > 0 || isEditing) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {idea.tags.map(tag => (
              <span
                key={tag}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-md',
                  isEditing ? 'bg-white/[0.08] text-white/50 cursor-pointer hover:bg-red-500/20 hover:text-red-400' : 'bg-white/[0.05] text-white/30',
                )}
                onClick={() => isEditing && onUpdate({ tags: idea.tags.filter(t => t !== tag) })}
                title={isEditing ? 'Click to remove' : undefined}
              >
                #{tag}
              </span>
            ))}
            {isEditing && (
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault()
                    onUpdate({ tags: [...idea.tags, tagInput.trim()] })
                    setTagInput('')
                  }
                }}
                placeholder="+tag"
                className="text-[10px] px-1.5 py-0.5 bg-white/[0.04] rounded-md text-white/30 w-14 focus:outline-none focus:w-20 transition-all"
              />
            )}
          </div>
        )}

        {/* Linked ideas */}
        {!compact && linkedIdeas.length > 0 && (
          <div className="flex flex-col gap-1 mb-2">
            {linkedIdeas.slice(0, 3).map(linked => {
              const lcat = CATEGORIES.find(c => c.id === linked.category) || CATEGORIES[0]
              return (
                <div key={linked.id} className="flex items-center gap-1.5 text-[10px] text-white/25">
                  <Link2 className="h-2.5 w-2.5" />
                  <lcat.icon className={cn('h-2.5 w-2.5', lcat.color)} />
                  <span className="truncate">{linked.text.slice(0, 40)}</span>
                  {isEditing && (
                    <button onClick={() => onLink(linked.id)} className="ml-auto text-white/15 hover:text-red-400">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              )
            })}
            {linkedIdeas.length > 3 && (
              <span className="text-[10px] text-white/15">+{linkedIdeas.length - 3} more</span>
            )}
          </div>
        )}

        {/* Quick action bar (always visible, not just when editing) */}
        {!isEditing && !compact && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Status quick-advance button */}
            {idea.status !== 'done' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const statusOrder = ['open', 'exploring', 'doing', 'done']
                  const idx = statusOrder.indexOf(idea.status)
                  if (idx < statusOrder.length - 1) {
                    onUpdate({ status: statusOrder[idx + 1] })
                  }
                }}
                className="flex items-center gap-0.5 text-[10px] text-white/20 hover:text-white/50 px-1 py-0.5 rounded hover:bg-white/[0.04]"
                title={`Move to next stage`}
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Editing controls */}
        {isEditing && (
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            {/* Value + Notes row */}
            <div className="flex gap-2">
              <div className="relative w-28">
                <DollarSign className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-green-400/50" />
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(editValue) || 0
                    if (val !== (idea.value_estimate || 0)) onUpdate({ value_estimate: val })
                  }}
                  placeholder="0"
                  className="w-full pl-6 pr-2 py-1.5 text-xs bg-white/[0.04] border border-white/[0.06] rounded-md text-green-400 placeholder-white/15 focus:outline-none tabular-nums"
                />
              </div>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                onBlur={() => { if (editNotes !== (idea.notes || '')) onUpdate({ notes: editNotes || null }) }}
                placeholder="Notes..."
                rows={1}
                className="flex-1 px-2 py-1.5 text-xs bg-white/[0.04] border border-white/[0.06] rounded-md text-white/60 placeholder-white/15 focus:outline-none resize-none"
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status */}
              <select
                value={idea.status}
                onChange={(e) => onUpdate({ status: e.target.value })}
                className="text-[10px] px-2 py-1 bg-white/[0.06] border border-white/[0.06] rounded text-white/50 focus:outline-none cursor-pointer"
              >
                {STAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                ))}
              </select>

              {/* Category */}
              <select
                value={idea.category}
                onChange={(e) => onUpdate({ category: e.target.value })}
                className="text-[10px] px-2 py-1 bg-white/[0.06] border border-white/[0.06] rounded text-white/50 focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>

              {/* Project */}
              <select
                value={idea.project_code || ''}
                onChange={(e) => onUpdate({ project_code: e.target.value || null })}
                className="text-[10px] px-2 py-1 bg-white/[0.06] border border-white/[0.06] rounded text-white/50 focus:outline-none cursor-pointer"
              >
                <option value="">No project</option>
                {PROJECT_CODES.map(pc => (
                  <option key={pc} value={pc}>{pc}</option>
                ))}
              </select>

              {/* Energy */}
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => onUpdate({ energy: idea.energy === n ? 0 : n })}
                    className={cn(
                      'p-0.5 rounded transition-all',
                      n <= idea.energy ? 'text-orange-400' : 'text-white/10 hover:text-white/30'
                    )}
                  >
                    <Flame className="h-3 w-3" />
                  </button>
                ))}
              </div>

              {/* Link */}
              <button
                onClick={() => setShowLinkPicker(!showLinkPicker)}
                className="text-white/20 hover:text-white/50 p-1"
                title="Link to another idea"
              >
                <Link2 className="h-3 w-3" />
              </button>

              {/* Delete */}
              <button
                onClick={onDelete}
                className="text-white/15 hover:text-red-400 p-1 ml-auto"
                title="Delete idea"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {/* Link picker */}
            {showLinkPicker && (
              <LinkPicker
                ideas={allIdeas.filter(i => i.id !== idea.id)}
                linkedIds={idea.links || []}
                onLink={(id) => { onLink(id); setShowLinkPicker(false) }}
                onClose={() => setShowLinkPicker(false)}
              />
            )}
          </div>
        )}

        {/* Status badge (grid view, not editing) */}
        {!isEditing && !compact && idea.status !== 'open' && (
          <div className="mt-1">
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded capitalize',
              idea.status === 'exploring' ? 'bg-blue-500/15 text-blue-400' :
              idea.status === 'doing' ? 'bg-green-500/15 text-green-400' :
              idea.status === 'parked' ? 'bg-white/[0.06] text-white/30' :
              idea.status === 'done' ? 'bg-emerald-500/15 text-emerald-400' :
              'text-white/30'
            )}>
              {idea.status}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Link Picker ----

function LinkPicker({
  ideas,
  linkedIds,
  onLink,
  onClose,
}: {
  ideas: Idea[]
  linkedIds: string[]
  onLink: (id: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = React.useState('')
  const filtered = search
    ? ideas.filter(i => i.text.toLowerCase().includes(search.toLowerCase()))
    : ideas.slice(0, 10)

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search ideas to link..."
        autoFocus
        className="w-full px-2 py-1 text-xs bg-transparent text-white placeholder-white/20 focus:outline-none mb-1"
      />
      <div className="max-h-32 overflow-y-auto space-y-0.5">
        {filtered.map(idea => {
          const cat = CATEGORIES.find(c => c.id === idea.category) || CATEGORIES[0]
          const isLinked = linkedIds.includes(idea.id)
          return (
            <button
              key={idea.id}
              onClick={() => onLink(idea.id)}
              className={cn(
                'w-full flex items-center gap-1.5 px-2 py-1 text-xs rounded text-left transition-colors',
                isLinked ? 'bg-white/[0.06] text-white/50' : 'text-white/30 hover:bg-white/[0.04] hover:text-white/50'
              )}
            >
              <cat.icon className={cn('h-3 w-3 flex-shrink-0', cat.color)} />
              <span className="truncate">{idea.text.slice(0, 50)}</span>
              {isLinked && <span className="text-[9px] text-white/20 ml-auto">linked</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
