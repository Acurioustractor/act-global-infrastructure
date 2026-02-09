'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign,
  Trophy,
  Target,
  Calendar,
  Clock,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface GrantCard {
  id: string
  name: string
  status: string
  amount: number
  outcomeAmount: number | null
  projectCode: string | null
  leadContact: string | null
  submittedAt: string | null
  provider: string | null
  deadline: string | null
  fitScore: number | null
  url: string | null
  ghlStage: string | null
  ghlValue: number | null
  milestones: any[]
  notes: string | null
}

interface PipelineData {
  stages: string[]
  grouped: Record<string, GrantCard[]>
}

interface MetricsData {
  pipelineValue: number
  activeCount: number
  winRate: number
  totalAwarded: number
  nextDeadline: string | null
  nextDeadlineName: string | null
  upcomingDeadlines: Array<{
    name: string
    closesAt: string
    fitScore: number
    daysRemaining: number
  }>
}

interface Opportunity {
  id: string
  name: string
  provider: string
  amountMin: number
  amountMax: number
  closesAt: string
  fitScore: number
  alignedProjects: string[]
  url: string
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const stageLabels: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  under_review: 'Under Review',
  successful: 'Successful',
}

const stageColors: Record<string, string> = {
  draft: 'border-white/20',
  in_progress: 'border-blue-500/40',
  submitted: 'border-purple-500/40',
  under_review: 'border-amber-500/40',
  successful: 'border-emerald-500/40',
}

export default function GrantsPage() {
  const queryClient = useQueryClient()

  const { data: pipeline, isLoading: pipelineLoading } = useQuery<PipelineData>({
    queryKey: ['grants', 'pipeline'],
    queryFn: () => fetch('/api/grants/pipeline').then(r => r.json()),
  })

  const { data: metrics } = useQuery<MetricsData>({
    queryKey: ['grants', 'metrics'],
    queryFn: () => fetch('/api/grants/metrics').then(r => r.json()),
  })

  const { data: oppsData } = useQuery<{ opportunities: Opportunity[] }>({
    queryKey: ['grants', 'opportunities'],
    queryFn: () => fetch('/api/grants/opportunities').then(r => r.json()),
  })

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/grants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
    },
  })

  if (pipelineLoading) {
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-white">Grants Pipeline</h1>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-96 glass-card rounded-lg animate-pulse bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  const stages = pipeline?.stages || []
  const grouped = pipeline?.grouped || {}
  const opportunities = oppsData?.opportunities || []

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-white">Grants Pipeline</h1>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 rounded-lg bg-blue-500/10">
          <p className="text-white/60 text-xs mb-1">Pipeline Value</p>
          <p className="text-xl font-bold text-blue-400">{formatCurrency(metrics?.pipelineValue || 0)}</p>
        </div>
        <div className="glass-card p-4 rounded-lg bg-purple-500/10">
          <p className="text-white/60 text-xs mb-1">Active</p>
          <p className="text-xl font-bold text-purple-400">{metrics?.activeCount || 0}</p>
        </div>
        <div className="glass-card p-4 rounded-lg bg-emerald-500/10">
          <p className="text-white/60 text-xs mb-1">Win Rate</p>
          <p className="text-xl font-bold text-emerald-400">{metrics?.winRate || 0}%</p>
        </div>
        <div className="glass-card p-4 rounded-lg bg-amber-500/10">
          <p className="text-white/60 text-xs mb-1">Total Awarded</p>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(metrics?.totalAwarded || 0)}</p>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <p className="text-white/60 text-xs mb-1">Next Deadline</p>
          <p className="text-sm font-medium text-white/80">
            {metrics?.nextDeadline
              ? new Date(metrics.nextDeadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              : 'None'}
          </p>
          {metrics?.nextDeadlineName && (
            <p className="text-white/40 text-xs truncate">{metrics.nextDeadlineName}</p>
          )}
        </div>
      </div>

      {/* Main Content: Kanban + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kanban Board */}
        <div className="lg:col-span-9 overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {stages.map(stage => {
              const cards = grouped[stage] || []
              const stageTotal = cards.reduce((s, c) => s + c.amount, 0)

              return (
                <div
                  key={stage}
                  className={cn(
                    'w-64 flex-shrink-0 rounded-lg border bg-white/5 flex flex-col',
                    stageColors[stage] || 'border-white/10'
                  )}
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">{stageLabels[stage] || stage}</h3>
                      <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                        {cards.length}
                      </span>
                    </div>
                    {stageTotal > 0 && (
                      <p className="text-xs text-white/50 mt-1">{formatCurrency(stageTotal)}</p>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[600px]">
                    {cards.map(card => (
                      <KanbanCard
                        key={card.id}
                        card={card}
                        stages={stages}
                        currentStage={stage}
                        onMove={(newStatus) => moveMutation.mutate({ id: card.id, status: newStatus })}
                      />
                    ))}
                    {cards.length === 0 && (
                      <p className="text-white/20 text-xs text-center py-4">No grants</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          {/* Deadline Calendar */}
          <div className="glass-card p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Upcoming Deadlines
            </h3>
            {(metrics?.upcomingDeadlines || []).length === 0 ? (
              <p className="text-white/40 text-xs">No upcoming deadlines</p>
            ) : (
              <div className="space-y-2">
                {(metrics?.upcomingDeadlines || []).slice(0, 8).map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5">
                    <div className="min-w-0 flex-1">
                      <p className="text-white/80 text-xs truncate">{d.name}</p>
                      <p className="text-white/40 text-xs">
                        {new Date(d.closesAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs font-medium ml-2',
                      d.daysRemaining <= 7 ? 'text-red-400' :
                      d.daysRemaining <= 30 ? 'text-amber-400' : 'text-white/50'
                    )}>
                      {d.daysRemaining}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opportunity Discovery Feed */}
          <div className="glass-card p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Open Opportunities
            </h3>
            {opportunities.length === 0 ? (
              <p className="text-white/40 text-xs">No open opportunities</p>
            ) : (
              <div className="space-y-2">
                {opportunities.slice(0, 6).map((opp, i) => (
                  <div key={i} className="p-2 rounded bg-white/5">
                    <div className="flex items-start justify-between">
                      <p className="text-white/80 text-xs font-medium truncate flex-1">{opp.name}</p>
                      {opp.url && (
                        <a href={opp.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 text-white/30 hover:text-white/60 flex-shrink-0 ml-1" />
                        </a>
                      )}
                    </div>
                    <p className="text-white/40 text-xs">{opp.provider}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {opp.amountMax && (
                        <span className="text-white/50 text-xs">Up to {formatCurrency(opp.amountMax)}</span>
                      )}
                      {opp.fitScore && (
                        <span className={cn(
                          'text-xs',
                          opp.fitScore >= 70 ? 'text-emerald-400' : 'text-white/40'
                        )}>
                          Fit: {opp.fitScore}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KanbanCard({
  card,
  stages,
  currentStage,
  onMove,
}: {
  card: GrantCard
  stages: string[]
  currentStage: string
  onMove: (newStatus: string) => void
}) {
  const [showMove, setShowMove] = useState(false)
  const nextStages = stages.filter(s => s !== currentStage)

  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <p className="text-white/90 text-sm font-medium leading-tight">{card.name}</p>

      {card.provider && (
        <p className="text-white/40 text-xs mt-1">{card.provider}</p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {card.amount > 0 && (
          <span className="text-xs text-emerald-400 font-medium">{formatCurrency(card.amount)}</span>
        )}
        {card.projectCode && (
          <span className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded">{card.projectCode}</span>
        )}
        {card.fitScore && (
          <span className="text-xs text-white/40">Fit: {card.fitScore}%</span>
        )}
      </div>

      {card.deadline && (
        <div className="flex items-center gap-1 mt-2 text-white/40 text-xs">
          <Clock className="w-3 h-3" />
          {new Date(card.deadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
        </div>
      )}

      {card.ghlStage && (
        <div className="mt-2 text-xs text-blue-400/70">
          GHL: {card.ghlStage}
        </div>
      )}

      {/* Move dropdown */}
      <div className="mt-2 relative">
        <button
          onClick={() => setShowMove(!showMove)}
          className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1"
        >
          Move to <ChevronDown className="w-3 h-3" />
        </button>
        {showMove && (
          <div className="absolute z-10 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl py-1 w-36">
            {nextStages.map(s => (
              <button
                key={s}
                onClick={() => { onMove(s); setShowMove(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
              >
                {stageLabels[s] || s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
