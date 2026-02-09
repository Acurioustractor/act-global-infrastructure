'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  GitBranch,
  DollarSign,
  Clock,
  AlertTriangle,
  Trophy,
  TrendingUp,
  CircleDot,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  List,
  LayoutGrid,
  Calendar,
} from 'lucide-react'
import {
  getPipelineBoard,
  type PipelineOpportunity,
  type PipelineBoard,
} from '@/lib/api'
import { FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'

const GHL_APP_URL = 'https://app.gohighlevel.com'

function formatCurrency(amount: number | undefined | null) {
  if (amount == null) return '$0'
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`
  return `$${amount.toLocaleString('en-AU')}`
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })
}

function ghlOpportunityUrl(locationId: string, oppGhlId: string) {
  if (!locationId || !oppGhlId) return null
  return `${GHL_APP_URL}/v2/location/${locationId}/opportunities/list?opportunityId=${oppGhlId}`
}

function ghlPipelineUrl(locationId: string, pipelineGhlId: string) {
  if (!locationId || !pipelineGhlId) return null
  return `${GHL_APP_URL}/v2/location/${locationId}/opportunities/list?pipelineId=${pipelineGhlId}`
}

function OpportunityCard({ opp, locationId }: { opp: PipelineOpportunity; locationId: string }) {
  const isStale = opp.daysInStage > 14
  const ghlUrl = ghlOpportunityUrl(locationId, opp.ghlId)

  return (
    <div className={cn(
      'rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors',
      isStale && 'border-amber-500/30'
    )}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-sm font-medium text-white truncate flex-1">{opp.name}</h4>
        <div className="flex items-center gap-1.5 shrink-0">
          {opp.value > 0 && (
            <span className="text-sm font-semibold text-green-400 tabular-nums">
              {formatCurrency(opp.value)}
            </span>
          )}
          {ghlUrl && (
            <a
              href={ghlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/20 hover:text-indigo-400 transition-colors"
              title="Open in GHL"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
      {opp.contactName && (
        <Link
          href={`/people?search=${encodeURIComponent(opp.contactName)}`}
          className="text-xs text-white/50 hover:text-indigo-400 transition-colors mb-1.5 block truncate"
        >
          {opp.contactName}
        </Link>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {opp.projectCode && (
          <Link
            href={`/projects/${opp.projectCode}`}
            className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors flex items-center gap-1"
          >
            <FolderKanban className="h-3 w-3" />
            {opp.projectCode}
          </Link>
        )}
        <span className={cn(
          'text-xs flex items-center gap-1',
          isStale ? 'text-amber-400' : 'text-white/30'
        )}>
          <Clock className="h-3 w-3" />
          {opp.daysInStage}d in stage
        </span>
        {opp.updatedAt && (
          <span className="text-xs text-white/20 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(opp.updatedAt)}
          </span>
        )}
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

function StageColumn({ stage, locationId }: { stage: { id: string; name: string; opportunities: PipelineOpportunity[] }; locationId: string }) {
  const stageValue = stage.opportunities.reduce((sum, o) => sum + o.value, 0)

  return (
    <div className="flex-1 min-w-[240px] max-w-[300px]">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">{stage.name}</h3>
          <span className="text-xs text-white/30 tabular-nums">{stage.opportunities.length}</span>
        </div>
        {stageValue > 0 && (
          <p className="text-xs text-green-400/70 tabular-nums">{formatCurrency(stageValue)}</p>
        )}
      </div>
      <div className="space-y-2">
        {stage.opportunities.map(opp => (
          <OpportunityCard key={opp.id} opp={opp} locationId={locationId} />
        ))}
        {stage.opportunities.length === 0 && (
          <div className="py-6 text-center text-xs text-white/20">
            No deals
          </div>
        )}
      </div>
    </div>
  )
}

function PipelineSection({ pipeline, defaultExpanded }: { pipeline: PipelineBoard; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const ghlUrl = ghlPipelineUrl(pipeline.ghlLocationId, pipeline.ghlId)
  const hasOpps = pipeline.stages.some(s => s.opportunities.length > 0)

  return (
    <div className="glass-card overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
          )}
          <GitBranch className="h-5 w-5 text-indigo-400 shrink-0" />
          <h2 className="text-base font-semibold text-white">{pipeline.name}</h2>
          <span className="text-xs text-white/30 tabular-nums">{pipeline.openCount} open</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-green-400 font-semibold tabular-nums">{formatCurrency(pipeline.totalValue)}</span>
          {ghlUrl && (
            <a
              href={ghlUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-indigo-400/70 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              Open in GHL
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </button>
      {expanded && hasOpps && (
        <div className="px-5 pb-5">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {pipeline.stages.map(stage => (
              <StageColumn key={stage.id} stage={stage} locationId={pipeline.ghlLocationId} />
            ))}
          </div>
        </div>
      )}
      {expanded && !hasOpps && (
        <div className="px-5 pb-5 text-center text-sm text-white/30 py-4">
          No opportunities in this pipeline yet.
        </div>
      )}
    </div>
  )
}

// Aggregate view — flat list of all opportunities across all pipelines
function AllOpportunitiesView({ pipelines }: { pipelines: PipelineBoard[] }) {
  const [sortBy, setSortBy] = useState<'value' | 'updated' | 'name'>('value')

  const allOpps = useMemo(() => {
    const opps: Array<PipelineOpportunity & { pipelineName: string; stageName: string; locationId: string }> = []
    for (const p of pipelines) {
      for (const s of p.stages) {
        for (const o of s.opportunities) {
          opps.push({ ...o, pipelineName: p.name, stageName: s.name, locationId: p.ghlLocationId })
        }
      }
    }
    if (sortBy === 'value') opps.sort((a, b) => b.value - a.value)
    else if (sortBy === 'updated') opps.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    else opps.sort((a, b) => a.name.localeCompare(b.name))
    return opps
  }, [pipelines, sortBy])

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <List className="h-5 w-5 text-indigo-400" />
          All Opportunities ({allOpps.length})
        </h2>
        <div className="flex gap-1">
          {(['value', 'updated', 'name'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md transition-colors',
                sortBy === opt ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              )}
            >
              {opt === 'value' ? 'By Value' : opt === 'updated' ? 'By Date' : 'By Name'}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        {allOpps.map(opp => {
          const ghlUrl = ghlOpportunityUrl(opp.locationId, opp.ghlId)
          const isStale = opp.daysInStage > 14
          return (
            <div
              key={opp.id}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors',
                isStale && 'border-l-2 border-amber-500/50'
              )}
            >
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-white truncate">{opp.name}</h4>
                  {opp.status !== 'open' && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 uppercase tracking-wider',
                      opp.status === 'won' ? 'bg-green-500/20 text-green-400' :
                      opp.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                      'bg-white/10 text-white/40'
                    )}>
                      {opp.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/30">{opp.pipelineName}</span>
                  <span className="text-white/10">&middot;</span>
                  <span className="text-xs text-white/30">{opp.stageName}</span>
                  {opp.contactName && (
                    <>
                      <span className="text-white/10">&middot;</span>
                      <span className="text-xs text-white/40">{opp.contactName}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {opp.updatedAt && (
                  <span className="text-xs text-white/20">{formatDate(opp.updatedAt)}</span>
                )}
                {opp.value > 0 && (
                  <span className="text-sm font-semibold text-green-400 tabular-nums w-16 text-right">
                    {formatCurrency(opp.value)}
                  </span>
                )}
                <span className={cn(
                  'text-xs w-8 text-right',
                  isStale ? 'text-amber-400' : 'text-white/30'
                )}>
                  {opp.daysInStage}d
                </span>
                {ghlUrl && (
                  <a
                    href={ghlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/20 hover:text-indigo-400 transition-colors"
                    title="Open in GHL"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type ViewMode = 'board' | 'list'

export default function PipelinePage() {
  const [view, setView] = useState<ViewMode>('board')

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-indigo-400" />
              Pipeline
            </h1>
            <p className="text-lg text-white/60 mt-1">
              Client opportunities and sales pipeline
            </p>
          </div>
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setView('board')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition-colors',
                view === 'board' ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/40 hover:text-white/60'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Boards
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition-colors',
                view === 'list' ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/40 hover:text-white/60'
              )}
            >
              <List className="h-4 w-4" />
              All Deals
            </button>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/50">Pipeline Value</p>
                <p className="text-lg font-bold text-green-400 tabular-nums truncate">{formatCurrency(summary.totalValue)}</p>
                <p className="text-xs text-white/30">{summary.openDeals} open deals</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-white/50">Won (Quarter)</p>
                <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatCurrency(summary.wonValueThisQuarter || 0)}</p>
                <p className="text-xs text-white/30">{summary.wonThisQuarter || 0} deals</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-white/50">Lost (Quarter)</p>
                <p className="text-lg font-bold text-red-400 tabular-nums">{formatCurrency(summary.lostValueThisQuarter || 0)}</p>
                <p className="text-xs text-white/30">{summary.lostThisQuarter || 0} deals</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                <CircleDot className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-white/50">Win Rate</p>
                <p className="text-lg font-bold text-purple-400 tabular-nums">{summary.winRate || 0}%</p>
                <p className="text-xs text-white/30">
                  {summary.wonAllTime || 0}W / {(summary.wonAllTime || 0) + (summary.lostThisQuarter || 0)}T
                  {summary.staleDeals > 0 && <span className="text-amber-400 ml-1">• {summary.staleDeals} stale</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="py-12 text-center text-white/40">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400 mx-auto mb-3" />
          Loading pipeline data...
        </div>
      )}

      {/* Board View — collapsible pipeline sections */}
      {view === 'board' && data?.pipelines && data.pipelines.length > 0 && (
        <div>
          {data.pipelines.map((pipeline, i) => (
            <PipelineSection
              key={pipeline.id}
              pipeline={pipeline}
              defaultExpanded={i < 3 && pipeline.openCount > 0}
            />
          ))}
        </div>
      )}

      {/* List View — all opportunities flat */}
      {view === 'list' && data?.pipelines && data.pipelines.length > 0 && (
        <AllOpportunitiesView pipelines={data.pipelines} />
      )}

      {/* Empty state */}
      {!isLoading && data?.pipelines && data.pipelines.length === 0 && (
        <div className="glass-card p-12 text-center">
          <GitBranch className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white/60 mb-2">No pipelines configured</h2>
          <p className="text-white/40">
            Connect GoHighLevel to see your sales pipelines here.
          </p>
        </div>
      )}

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
    </div>
  )
}
