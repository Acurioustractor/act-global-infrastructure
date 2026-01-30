'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  DollarSign,
  Clock,
  ChevronDown,
  ChevronRight,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Client-side Supabase (uses anon key, respects RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey)
}

interface GHLOpportunity {
  id: string
  ghl_id: string
  ghl_contact_id: string | null
  ghl_pipeline_id: string
  ghl_stage_id: string
  name: string
  pipeline_name: string | null
  stage_name: string | null
  status: string | null
  monetary_value: number | null
  assigned_to: string | null
  ghl_created_at: string | null
  ghl_updated_at: string | null
  created_at: string
  updated_at: string
}

interface PipelineGroup {
  pipelineName: string
  pipelineId: string
  stages: StageGroup[]
  totalValue: number
  count: number
}

interface StageGroup {
  stageName: string
  stageId: string
  opportunities: GHLOpportunity[]
  totalValue: number
}

function formatCurrency(amount: number) {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`
  }
  return `$${amount.toLocaleString('en-AU')}`
}

function daysAgo(dateStr: string | null): number {
  if (!dateStr) return 0
  const date = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusColor(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'won':
      return 'bg-green-500/20 text-green-400'
    case 'lost':
      return 'bg-red-500/20 text-red-400'
    case 'abandoned':
      return 'bg-white/10 text-white/40'
    case 'open':
    default:
      return 'bg-blue-500/20 text-blue-400'
  }
}

function OpportunityRow({ opp }: { opp: GHLOpportunity }) {
  const days = daysAgo(opp.ghl_updated_at || opp.updated_at)
  const isStale = days > 14

  return (
    <div className={cn(
      'flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors hover:bg-white/5',
      isStale && 'border-l-2 border-amber-500/50'
    )}>
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-white truncate">{opp.name}</h4>
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 uppercase tracking-wider',
            getStatusColor(opp.status)
          )}>
            {opp.status || 'open'}
          </span>
        </div>
        {opp.stage_name && (
          <p className="text-xs text-white/40 mt-0.5">{opp.stage_name}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {(opp.monetary_value ?? 0) > 0 && (
          <span className="text-sm font-semibold text-green-400 tabular-nums">
            {formatCurrency(opp.monetary_value!)}
          </span>
        )}
        <span className={cn(
          'text-xs flex items-center gap-1',
          isStale ? 'text-amber-400' : 'text-white/30'
        )}>
          <Clock className="h-3 w-3" />
          {days}d
        </span>
      </div>
    </div>
  )
}

function PipelineGroupCard({ group, defaultExpanded }: { group: PipelineGroup; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-white/40" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white/40" />
          )}
          <h3 className="text-sm font-semibold text-white">{group.pipelineName}</h3>
          <span className="text-xs text-white/30 tabular-nums">{group.count} deals</span>
        </div>
        <div className="flex items-center gap-4">
          {group.totalValue > 0 && (
            <span className="text-sm font-semibold text-green-400 tabular-nums">
              {formatCurrency(group.totalValue)}
            </span>
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {group.stages.map(stage => (
            <div key={stage.stageId} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  {stage.stageName}
                </h4>
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <span>{stage.opportunities.length}</span>
                  {stage.totalValue > 0 && (
                    <span className="text-green-400/60 tabular-nums">{formatCurrency(stage.totalValue)}</span>
                  )}
                </div>
              </div>
              <div className="space-y-0.5">
                {stage.opportunities.map(opp => (
                  <OpportunityRow key={opp.id} opp={opp} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type FilterStatus = 'all' | 'open' | 'won' | 'lost'

export function OpportunitiesPanel() {
  const [opportunities, setOpportunities] = useState<GHLOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    async function fetchOpportunities() {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setError('Supabase not configured')
        setLoading(false)
        return
      }

      try {
        const { data, error: dbError } = await supabase
          .from('ghl_opportunities')
          .select('*')
          .order('ghl_updated_at', { ascending: false, nullsFirst: false })

        if (dbError) {
          console.error('Failed to fetch opportunities:', dbError)
          setError(dbError.message)
        } else {
          setOpportunities(data || [])
        }
      } catch (err) {
        console.error('Failed to fetch opportunities:', err)
        setError('Unable to load opportunities')
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return opportunities
    return opportunities.filter(o => (o.status || 'open').toLowerCase() === filter)
  }, [opportunities, filter])

  const grouped = useMemo(() => {
    const pipelineMap = new Map<string, PipelineGroup>()

    for (const opp of filtered) {
      const pipelineKey = opp.ghl_pipeline_id
      const pipelineName = opp.pipeline_name || 'Unknown Pipeline'

      if (!pipelineMap.has(pipelineKey)) {
        pipelineMap.set(pipelineKey, {
          pipelineName,
          pipelineId: pipelineKey,
          stages: [],
          totalValue: 0,
          count: 0,
        })
      }

      const pipeline = pipelineMap.get(pipelineKey)!
      pipeline.totalValue += opp.monetary_value || 0
      pipeline.count += 1

      let stage = pipeline.stages.find(s => s.stageId === opp.ghl_stage_id)
      if (!stage) {
        stage = {
          stageName: opp.stage_name || 'Unknown Stage',
          stageId: opp.ghl_stage_id,
          opportunities: [],
          totalValue: 0,
        }
        pipeline.stages.push(stage)
      }

      stage.opportunities.push(opp)
      stage.totalValue += opp.monetary_value || 0
    }

    return Array.from(pipelineMap.values()).sort((a, b) => b.totalValue - a.totalValue)
  }, [filtered])

  const totalValue = useMemo(
    () => filtered.reduce((sum, o) => sum + (o.monetary_value || 0), 0),
    [filtered]
  )

  const statusCounts = useMemo(() => {
    const counts = { open: 0, won: 0, lost: 0 }
    for (const opp of opportunities) {
      const s = (opp.status || 'open').toLowerCase()
      if (s in counts) counts[s as keyof typeof counts]++
    }
    return counts
  }, [opportunities])

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center justify-center gap-3 text-white/40">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          Loading opportunities...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-6 border-amber-500/20">
        <p className="text-sm text-amber-400">{error}</p>
        <p className="text-xs text-white/30 mt-1">
          Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
        </p>
      </div>
    )
  }

  if (opportunities.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Users className="h-10 w-10 text-white/20 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white/50 mb-1">No opportunities found</h3>
        <p className="text-sm text-white/30">
          Opportunities from GoHighLevel will appear here once synced.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row with filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Opportunities
          </h2>
          <span className="text-sm text-white/40 tabular-nums">
            {filtered.length} deals
            {totalValue > 0 && (
              <> &middot; <span className="text-green-400">{formatCurrency(totalValue)}</span></>
            )}
          </span>
        </div>
        <div className="flex gap-1">
          {(['all', 'open', 'won', 'lost'] as FilterStatus[]).map(opt => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
                filter === opt
                  ? 'bg-indigo-500/30 text-indigo-300'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              )}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
              {opt !== 'all' && (
                <span className="ml-1 opacity-60">({statusCounts[opt as keyof typeof statusCounts] || 0})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped pipeline cards */}
      {grouped.map((group, i) => (
        <PipelineGroupCard key={group.pipelineId} group={group} defaultExpanded={i === 0} />
      ))}

      {filtered.length === 0 && (
        <div className="glass-card p-6 text-center text-white/40 text-sm">
          No {filter} opportunities found.
        </div>
      )}
    </div>
  )
}
