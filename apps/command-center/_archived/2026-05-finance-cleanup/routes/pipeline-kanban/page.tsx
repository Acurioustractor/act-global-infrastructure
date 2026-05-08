'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import {
  ArrowLeft,
  Layers,
  History,
  X,
  ChevronDown,
  Filter,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────

interface Opportunity {
  id: string
  title: string
  funder: string
  value: number
  weighted: number
  probability: number
  stage: string
  type: string
  projectCodes: string[]
  expectedClose: string | null
}

interface ProjectSummary {
  code: string
  name: string
  tier: string
  active?: boolean
  totalWeighted: number
  count: number
}

interface VizData {
  bubbles: Opportunity[]
  projects: ProjectSummary[]
  totalOpps: number
  totalWeighted: number
}

interface ChangeRecord {
  id: string
  opportunity_title: string
  changes: string
  note: string | null
  old_values: Record<string, unknown>
  new_values: Record<string, unknown>
  created_at: string
}

// ── Constants ──────────────────────────────────────────────────────────

const STAGES = ['researching', 'pursuing', 'submitted', 'shortlisted', 'realized'] as const

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; headerBg: string }> = {
  researching: { label: 'Researching', color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20', headerBg: 'bg-blue-500/15' },
  pursuing: { label: 'Pursuing', color: 'text-indigo-400', bg: 'bg-indigo-500/5', border: 'border-indigo-500/20', headerBg: 'bg-indigo-500/15' },
  submitted: { label: 'Submitted', color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/20', headerBg: 'bg-purple-500/15' },
  shortlisted: { label: 'Shortlisted', color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20', headerBg: 'bg-amber-500/15' },
  realized: { label: 'Realized', color: 'text-green-400', bg: 'bg-green-500/5', border: 'border-green-500/20', headerBg: 'bg-green-500/15' },
}

const PROJECT_COLORS: Record<string, string> = {}
const PALETTE = [
  '#34D399', '#60A5FA', '#F472B6', '#FBBF24', '#A78BFA',
  '#FB923C', '#2DD4BF', '#E879F9', '#84CC16', '#F87171',
]

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(Math.abs(n) / 1000).toFixed(0)}K`
  return `$${Math.abs(n).toFixed(0)}`
}

// ── Kanban Card ──────────────────────────────────────────────────────

function KanbanCard({ opp, index, projects, onProjectChange }: {
  opp: Opportunity
  index: number
  projects: ProjectSummary[]
  onProjectChange: (id: string, codes: string[]) => void
}) {
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  const projectCode = opp.projectCodes?.[0] || 'Unassigned'
  const pi = projects.findIndex(p => p.code === projectCode)
  const color = PALETTE[pi % PALETTE.length] || '#6B7280'

  return (
    <Draggable draggableId={opp.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'rounded-lg p-3 mb-2 border transition-all cursor-grab active:cursor-grabbing',
            snapshot.isDragging
              ? 'bg-white/15 border-white/30 shadow-2xl scale-[1.02] rotate-1'
              : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/15'
          )}
        >
          <p className="text-xs font-medium text-white leading-tight line-clamp-2">{opp.title}</p>
          {opp.funder !== opp.title && (
            <p className="text-[10px] text-white/30 mt-0.5 truncate">{opp.funder}</p>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-bold tabular-nums" style={{ color }}>
              {formatMoney(opp.weighted)}
            </span>
            <span className="text-[10px] text-white/30 tabular-nums">{opp.probability}%</span>
          </div>

          {/* Project tag — clickable to reassign */}
          <div className="relative mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowProjectPicker(!showProjectPicker) }}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white/10 hover:border-white/30 transition-all"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {projectCode}
              <ChevronDown className="h-2.5 w-2.5" />
            </button>

            {showProjectPicker && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-gray-900 border border-white/20 rounded-lg shadow-xl p-2 min-w-[200px] max-h-[360px] overflow-y-auto">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] text-white/50">Assign to project</span>
                  <button onClick={() => setShowProjectPicker(false)}>
                    <X className="h-3 w-3 text-white/30" />
                  </button>
                </div>
                {(() => {
                  let lastTier = ''
                  return projects.filter(p => p.code !== 'Unassigned' && p.active !== false).map((p, i) => {
                    const tierLabel = p.tier || 'other'
                    const showHeader = tierLabel !== lastTier
                    lastTier = tierLabel
                    return (
                      <div key={p.code}>
                        {showHeader && (
                          <div className="text-[9px] uppercase tracking-wider text-white/25 px-2 pt-2 pb-0.5">
                            {tierLabel}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            onProjectChange(opp.id, [p.code])
                            setShowProjectPicker(false)
                          }}
                          className={cn(
                            'w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/10 transition-colors flex items-center gap-2',
                            (opp.projectCodes || []).includes(p.code) && 'bg-white/10'
                          )}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                          <span className="text-white/70 font-medium">{p.code}</span>
                          <span className="text-white/30 truncate text-[10px]">{p.name}</span>
                        </button>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}

// ── Change Log Panel ──────────────────────────────────────────────────

function ChangeLog({ changes, onClose }: { changes: ChangeRecord[]; onClose: () => void }) {
  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900/98 border-l border-white/10 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-400" />
          Change Log
        </h2>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {changes.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No changes recorded yet. Drag cards between columns to see changes here.</p>
        ) : (
          changes.map(c => (
            <div key={c.id} className="bg-white/5 rounded-lg p-3 border border-white/5">
              <p className="text-xs font-medium text-white">{c.opportunity_title}</p>
              <p className="text-[10px] text-indigo-400 mt-1">{c.changes}</p>
              {c.note && <p className="text-[10px] text-white/30 mt-1">{c.note}</p>}
              <p className="text-[10px] text-white/20 mt-2">
                {new Date(c.created_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function PipelineKanbanPage() {
  const [showChangeLog, setShowChangeLog] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Array<{ id: string; title: string; change: string }>>([])
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<VizData>({
    queryKey: ['finance', 'pipeline-viz'],
    queryFn: () => fetch('/api/finance/pipeline-viz').then(r => r.json()),
  })

  const { data: changeData } = useQuery<{ changes: ChangeRecord[] }>({
    queryKey: ['finance', 'pipeline-changes'],
    queryFn: () => fetch('/api/finance/pipeline-update').then(r => r.json()),
    refetchInterval: 10000,
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; stage?: string; project_codes?: string[] }) => {
      const res = await fetch('/api/finance/pipeline-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return res.json()
    },
    onSuccess: (result) => {
      if (result.changes) {
        setPendingChanges(prev => [...prev, {
          id: result.id,
          title: result.title,
          change: result.changes.join('; '),
        }])
      }
      queryClient.invalidateQueries({ queryKey: ['finance', 'pipeline-viz'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'pipeline-changes'] })
    },
  })

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !data) return

    const { draggableId, destination } = result
    const newStage = destination.droppableId

    // Find the opportunity
    const opp = data.bubbles.find(b => b.id === draggableId)
    if (!opp || opp.stage === newStage) return

    // Optimistic update
    opp.stage = newStage

    // Send update
    updateMutation.mutate({ id: draggableId, stage: newStage })
  }, [data, updateMutation])

  const handleProjectChange = useCallback((id: string, codes: string[]) => {
    updateMutation.mutate({ id, project_codes: codes })
  }, [updateMutation])

  const opportunities = data?.bubbles || []
  const projects = data?.projects || []

  // Apply filters
  const filtered = opportunities.filter(o => {
    if (searchFilter && !o.title.toLowerCase().includes(searchFilter.toLowerCase()) &&
        !o.funder.toLowerCase().includes(searchFilter.toLowerCase())) return false
    if (projectFilter && !(o.projectCodes || []).includes(projectFilter)) return false
    return true
  })

  const changes = changeData?.changes || []

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 md:px-8 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/finance/overview" className="text-white/40 hover:text-white/80 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="h-6 w-6 text-indigo-400" />
              Pipeline Board
            </h1>
            {data && (
              <span className="text-xs text-white/30 ml-2">
                {filtered.length} opportunities — {formatMoney(filtered.reduce((s, o) => s + o.weighted, 0))} weighted
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 w-48"
              />
            </div>

            {/* Project filter */}
            <div className="relative">
              <select
                value={projectFilter || ''}
                onChange={e => setProjectFilter(e.target.value || null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 focus:outline-none appearance-none pr-7"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                ))}
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
            </div>

            {/* Pending changes badge */}
            {pendingChanges.length > 0 && (
              <div className="px-3 py-1.5 rounded-lg text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {pendingChanges.length} change{pendingChanges.length !== 1 ? 's' : ''} made
              </div>
            )}

            {/* Change log toggle */}
            <button
              onClick={() => setShowChangeLog(!showChangeLog)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all',
                showChangeLog
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
              )}
            >
              <History className="h-3.5 w-3.5" />
              Log
              {changes.length > 0 && (
                <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{changes.length}</span>
              )}
            </button>

            <Link href="/finance/pipeline-viz" className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/40 border border-white/10 hover:text-white/60">
              Visualize
            </Link>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white/40">Loading pipeline...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4 md:px-8">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 min-w-max">
              {STAGES.map(stage => {
                const config = STAGE_CONFIG[stage]
                const stageOpps = filtered
                  .filter(o => o.stage === stage)
                  .sort((a, b) => b.weighted - a.weighted)
                const stageTotal = stageOpps.reduce((s, o) => s + o.weighted, 0)

                return (
                  <div key={stage} className={cn('w-72 rounded-xl border flex flex-col', config.border, config.bg)}>
                    {/* Column header */}
                    <div className={cn('px-4 py-3 rounded-t-xl', config.headerBg)}>
                      <div className="flex items-center justify-between">
                        <h3 className={cn('text-sm font-semibold', config.color)}>{config.label}</h3>
                        <span className="text-[10px] text-white/30 tabular-nums">{stageOpps.length}</span>
                      </div>
                      <p className={cn('text-xs mt-0.5 tabular-nums', config.color, 'opacity-60')}>
                        {formatMoney(stageTotal)} weighted
                      </p>
                    </div>

                    {/* Droppable area */}
                    <Droppable droppableId={stage}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            'flex-1 p-2 min-h-[200px] transition-colors rounded-b-xl',
                            snapshot.isDraggingOver && 'bg-white/5'
                          )}
                        >
                          {stageOpps.map((opp, index) => (
                            <KanbanCard
                              key={opp.id}
                              opp={opp}
                              index={index}
                              projects={projects}
                              onProjectChange={handleProjectChange}
                            />
                          ))}
                          {provided.placeholder}
                          {stageOpps.length === 0 && (
                            <div className="text-center py-8 text-white/10 text-xs">
                              Drop here
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* Session changes bar */}
      {pendingChanges.length > 0 && (
        <div className="border-t border-white/10 bg-indigo-500/5 px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-indigo-400">Session changes:</span>
              <div className="flex gap-2 overflow-x-auto">
                {pendingChanges.slice(-5).map((c, i) => (
                  <span key={i} className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded whitespace-nowrap">
                    {c.title.substring(0, 30)}: {c.change}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setPendingChanges([])}
              className="text-xs text-white/30 hover:text-white/50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Change Log Slide-out */}
      {showChangeLog && <ChangeLog changes={changes} onClose={() => setShowChangeLog(false)} />}
    </div>
  )
}
