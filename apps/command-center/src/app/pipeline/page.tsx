'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  GitBranch,
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  Trophy,
  TrendingUp,
  CircleDot,
} from 'lucide-react'
import {
  getPipelineBoard,
  type PipelineOpportunity,
  type PipelineBoard,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import { OpportunitiesPanel } from '@/components/opportunities-panel'

function formatCurrency(amount: number | undefined | null) {
  if (amount == null) return '$0'
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`
  }
  return `$${amount.toLocaleString('en-AU')}`
}

function OpportunityCard({ opp }: { opp: PipelineOpportunity }) {
  const isStale = opp.daysInStage > 14

  return (
    <div className={cn(
      'glass-card-sm p-3 mb-2 hover:bg-white/10 transition-colors cursor-default',
      isStale && 'border-amber-500/30'
    )}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-sm font-medium text-white truncate">{opp.name}</h4>
        {opp.value > 0 && (
          <span className="text-sm font-semibold text-green-400 shrink-0 tabular-nums">
            {formatCurrency(opp.value)}
          </span>
        )}
      </div>
      {opp.contactName && (
        <p className="text-xs text-white/50 mb-1.5">{opp.contactName}</p>
      )}
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-xs flex items-center gap-1',
          isStale ? 'text-amber-400' : 'text-white/30'
        )}>
          <Clock className="h-3 w-3" />
          {opp.daysInStage}d
        </span>
        {opp.status === 'won' && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Won</span>
        )}
        {opp.status === 'lost' && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Lost</span>
        )}
      </div>
    </div>
  )
}

function StageColumn({ stage }: { stage: { id: string; name: string; opportunities: PipelineOpportunity[] } }) {
  const stageValue = stage.opportunities.reduce((sum, o) => sum + o.value, 0)

  return (
    <div className="flex-1 min-w-[220px] max-w-[300px]">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">{stage.name}</h3>
          <span className="text-xs text-white/30 tabular-nums">{stage.opportunities.length}</span>
        </div>
        {stageValue > 0 && (
          <p className="text-xs text-green-400/70 tabular-nums">{formatCurrency(stageValue)}</p>
        )}
      </div>
      <div className="space-y-0">
        {stage.opportunities.map(opp => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}
        {stage.opportunities.length === 0 && (
          <div className="py-8 text-center text-xs text-white/20">
            No deals
          </div>
        )}
      </div>
    </div>
  )
}

function PipelineSection({ pipeline }: { pipeline: PipelineBoard }) {
  return (
    <div className="glass-card p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-indigo-400" />
          {pipeline.name}
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/40">{pipeline.openCount} open</span>
          <span className="text-green-400 font-semibold tabular-nums">{formatCurrency(pipeline.totalValue)}</span>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {pipeline.stages.map(stage => (
          <StageColumn key={stage.id} stage={stage} />
        ))}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['pipeline', 'board'],
    queryFn: getPipelineBoard,
  })

  const summary = data?.summary

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <Link href="/today" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <GitBranch className="h-8 w-8 text-indigo-400" />
            Pipeline
          </h1>
          <p className="text-lg text-white/60 mt-1">
            Client opportunities and sales pipeline
          </p>
        </div>
      </header>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Pipeline Value</p>
                <p className="text-xl font-bold text-green-400 tabular-nums">{formatCurrency(summary.totalValue)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <CircleDot className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Open Deals</p>
                <p className="text-xl font-bold text-white tabular-nums">{summary.openDeals}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Avg Deal Size</p>
                <p className="text-xl font-bold text-emerald-400 tabular-nums">{formatCurrency(summary.avgDealSize)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Stale Deals</p>
                <p className={cn('text-xl font-bold tabular-nums', summary.staleDeals > 0 ? 'text-amber-400' : 'text-white/40')}>
                  {summary.staleDeals}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Won This Month</p>
                <p className="text-xl font-bold text-purple-400 tabular-nums">{summary.wonThisMonth}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Boards */}
      {isLoading && (
        <div className="py-12 text-center text-white/40">Loading pipeline data...</div>
      )}

      {data?.pipelines && data.pipelines.length > 0 ? (
        data.pipelines.map(pipeline => (
          <PipelineSection key={pipeline.id} pipeline={pipeline} />
        ))
      ) : !isLoading ? (
        <div className="glass-card p-12 text-center">
          <GitBranch className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white/60 mb-2">No pipelines configured</h2>
          <p className="text-white/40">
            Connect GoHighLevel to see your sales pipelines here.
          </p>
        </div>
      ) : null}

      {/* Stale Deals Alert */}
      {summary && summary.staleDealsList && summary.staleDealsList.length > 0 && (
        <div className="glass-card p-6 mt-6 border-amber-500/20">
          <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5" />
            Stale Deals (14+ days without update)
          </h2>
          <div className="space-y-2">
            {summary.staleDealsList.map((deal, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                <div>
                  <span className="text-sm font-medium text-white">{deal.name}</span>
                  {deal.contact && (
                    <span className="text-xs text-white/40 ml-2">{deal.contact}</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {deal.value > 0 && (
                    <span className="text-sm text-green-400 tabular-nums">{formatCurrency(deal.value)}</span>
                  )}
                  <span className="text-xs text-amber-400">{deal.daysSinceUpdate}d ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities Panel - Direct Supabase view */}
      <div className="mt-8">
        <OpportunitiesPanel />
      </div>
    </div>
  )
}
