'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
  AlertCircle,
  DollarSign,
  Clock,
  FileText,
  User,
  ExternalLink,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { LoadingPage } from '@/components/ui/loading'
import { OppDrawer } from '@/components/opp-drawer'

// ━━━ Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type PipelineOpp = {
  id: string
  ghl_id: string
  name: string
  stage_name: string
  ghl_stage_id: string
  status: string
  monetary_value: number
  project_code: string | null
  assigned_to: string | null
  days_in_stage: number | null
  is_stale: boolean
  is_demand_signal: boolean
  contact: {
    full_name: string
    company_name: string | null
    email: string | null
    last_contact_date: string | null
    days_since_contact: number | null
  } | null
  invoice: {
    invoice_number: string
    date: string
    total: number
    paid: number
    due: number
    status: string
  } | null
}

type StageGroup = {
  id: string
  name: string
  position: number
  winProbability: number | null
  opps: PipelineOpp[]
}

type PipelineData = {
  summary: {
    buyer_pipeline_name: string
    demand_pipeline_name: string | null
    total_opps: number
    total_value: number
    paid_opps: number
    paid_value: number
    stale_opps: number
    demand_signals_still_in_buyer_pipeline: number
  }
  buyer_stages: StageGroup[]
  demand_stages: StageGroup[]
}

// ━━━ API helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchPipeline(): Promise<PipelineData> {
  const res = await fetch('/api/goods/pipeline')
  if (!res.ok) throw new Error('Failed to load pipeline')
  return res.json()
}

async function moveOpp(oppId: string, stageId: string, stageName: string): Promise<void> {
  const res = await fetch('/api/goods/pipeline', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oppId, stageId, stageName }),
  })
  if (!res.ok) throw new Error('Failed to move opp')
}

// ━━━ Utilities ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function fmtCurrency(n: number): string {
  if (n === 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${Math.round(n)}`
}

const ANCHOR_KEYWORDS = ['centrecorp', 'palm island', 'picc', 'oonchiumpa', 'miwatj', 'anyinginyi', 'julalikari', 'alpa', 'outback stores']

function isAnchor(opp: PipelineOpp): boolean {
  const haystack = `${opp.name} ${opp.contact?.full_name ?? ''} ${opp.contact?.company_name ?? ''}`.toLowerCase()
  return ANCHOR_KEYWORDS.some(a => haystack.includes(a))
}

// ━━━ Page ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type FilterMode = 'all' | 'anchors' | 'stale' | 'non-signal'

export default function GoodsPipelinePage() {
  const queryClient = useQueryClient()
  const [filterMode, setFilterMode] = useState<FilterMode>('non-signal')
  const [view, setView] = useState<'buyer' | 'demand'>('buyer')
  const [selectedOpp, setSelectedOpp] = useState<PipelineOpp | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['goods', 'pipeline'],
    queryFn: fetchPipeline,
  })

  const moveMutation = useMutation({
    mutationFn: ({ oppId, stageId, stageName }: { oppId: string; stageId: string; stageName: string }) =>
      moveOpp(oppId, stageId, stageName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goods', 'pipeline'] }),
  })

  const stages = useMemo<StageGroup[]>(() => {
    if (!data) return []
    const source = view === 'buyer' ? data.buyer_stages : data.demand_stages
    return source.map(s => ({
      ...s,
      opps: s.opps.filter(o => {
        if (filterMode === 'anchors') return isAnchor(o)
        if (filterMode === 'stale') return o.is_stale
        if (filterMode === 'non-signal') return !o.is_demand_signal
        return true
      }),
    }))
  }, [data, view, filterMode])

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const destStage = stages.find(s => s.id === destination.droppableId)
    if (!destStage) return

    moveMutation.mutate({
      oppId: draggableId,
      stageId: destStage.id,
      stageName: destStage.name,
    })
  }

  if (isLoading) return <LoadingPage />
  if (error || !data) {
    return (
      <div className="min-h-screen p-8">
        <div className="glass-card p-6 border-red-500/30">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load pipeline. {(error as Error)?.message}</span>
          </div>
        </div>
      </div>
    )
  }

  const { summary } = data

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Goods Pipeline</h1>
            <p className="text-white/60 mt-1">
              {summary.total_opps} opps · {fmtCurrency(summary.total_value)} total ·{' '}
              {summary.paid_opps} paid ({fmtCurrency(summary.paid_value)}) ·{' '}
              <span className={summary.stale_opps > 0 ? 'text-amber-400' : ''}>
                {summary.stale_opps} stale
              </span>
            </p>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['goods', 'pipeline'] })}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {summary.demand_signals_still_in_buyer_pipeline > 0 && (
          <div className="glass-card p-4 border-amber-500/30 mb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="text-sm text-white/80">
              <strong>{summary.demand_signals_still_in_buyer_pipeline} demand signals</strong> are
              still in the Buyer Pipeline. Run{' '}
              <code className="text-xs bg-white/10 px-2 py-0.5 rounded">
                node scripts/migrate-goods-demand-signals.mjs --apply
              </code>{' '}
              to move them to the Demand Register.
            </div>
          </div>
        )}

        {/* View toggle + filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
            <button
              onClick={() => setView('buyer')}
              className={`px-3 py-1.5 text-sm rounded transition ${
                view === 'buyer' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              Buyer Pipeline
            </button>
            <button
              onClick={() => setView('demand')}
              className={`px-3 py-1.5 text-sm rounded transition ${
                view === 'demand' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
              }`}
              disabled={!data.demand_stages.length}
            >
              Demand Register {!data.demand_stages.length && <span className="text-xs">(not set up)</span>}
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-white/40" />
            {(['non-signal', 'anchors', 'stale', 'all'] as FilterMode[]).map(f => (
              <button
                key={f}
                onClick={() => setFilterMode(f)}
                className={`px-3 py-1 rounded transition ${
                  filterMode === f ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/60 hover:text-white/90'
                }`}
              >
                {f === 'non-signal' ? 'Real buyers' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Kanban */}
      {stages.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-white/60">
            {view === 'demand'
              ? 'Demand Register pipeline not yet created in GHL. See setup instructions.'
              : 'No stages found for this pipeline.'}
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map(stage => (
              <Droppable droppableId={stage.id} key={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-80 rounded-lg p-3 transition ${
                      snapshot.isDraggingOver ? 'bg-white/10' : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{stage.name}</h3>
                        <p className="text-xs text-white/50">
                          {stage.opps.length} opp{stage.opps.length !== 1 ? 's' : ''} ·{' '}
                          {fmtCurrency(stage.opps.reduce((s, o) => s + o.monetary_value, 0))}
                        </p>
                      </div>
                      {stage.winProbability !== null && (
                        <span className="text-xs text-white/40">{stage.winProbability}%</span>
                      )}
                    </div>

                    <div className="space-y-2 min-h-[50px]">
                      {stage.opps.map((opp, index) => (
                        <Draggable draggableId={opp.id} index={index} key={opp.id}>
                          {(dragProvided, dragSnapshot) => (
                            <OppCard
                              opp={opp}
                              provided={dragProvided}
                              isDragging={dragSnapshot.isDragging}
                              onClick={() => setSelectedOpp(opp)}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      <OppDrawer opp={selectedOpp} onClose={() => setSelectedOpp(null)} />
    </div>
  )
}

// ━━━ Opp Card ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type OppCardProps = {
  opp: PipelineOpp
  provided: Parameters<Parameters<typeof Draggable>[0]['children']>[0]
  isDragging: boolean
  onClick: () => void
}

function OppCard({ opp, provided, isDragging, onClick }: OppCardProps) {
  const isAnchorOpp = isAnchor(opp)

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => {
        if (!isDragging) onClick()
      }}
      className={`rounded-lg p-3 transition cursor-pointer ${
        isDragging
          ? 'bg-white/20 shadow-lg ring-2 ring-emerald-400/50'
          : 'bg-white/10 hover:bg-white/15'
      } ${opp.is_stale ? 'border-l-2 border-amber-400' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isAnchorOpp && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                anchor
              </span>
            )}
            {opp.is_demand_signal && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                signal
              </span>
            )}
            {opp.is_stale && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                {opp.days_in_stage}d stale
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium text-white truncate mt-1">{opp.name}</h4>
        </div>
        <span className="text-sm font-semibold text-emerald-400 whitespace-nowrap">
          {fmtCurrency(opp.monetary_value)}
        </span>
      </div>

      {opp.contact && (
        <div className="flex items-center gap-1.5 text-xs text-white/60 mb-1">
          <User className="h-3 w-3" />
          <span className="truncate">{opp.contact.full_name}</span>
          {opp.contact.days_since_contact !== null && (
            <span className={opp.contact.days_since_contact > 21 ? 'text-amber-400' : ''}>
              · {opp.contact.days_since_contact}d
            </span>
          )}
        </div>
      )}

      {opp.invoice && (
        <div className="flex items-center gap-1.5 text-xs text-white/60">
          <FileText className="h-3 w-3" />
          <span className="truncate">
            {opp.invoice.invoice_number} · {opp.invoice.status}
          </span>
        </div>
      )}

      {opp.days_in_stage !== null && !opp.is_stale && opp.days_in_stage > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-white/40 mt-1">
          <Clock className="h-3 w-3" />
          <span>{opp.days_in_stage}d in stage</span>
        </div>
      )}
    </div>
  )
}
