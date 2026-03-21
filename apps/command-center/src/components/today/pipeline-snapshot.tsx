'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, ChevronRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const REFRESH_INTERVAL = 60 * 1000

const STAGE_CONFIG: Record<string, { color: string; bg: string; order: number }> = {
  identified: { color: 'text-gray-400', bg: 'bg-gray-500/20', order: 0 },
  researching: { color: 'text-blue-400', bg: 'bg-blue-500/20', order: 1 },
  pursuing: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', order: 2 },
  applied: { color: 'text-violet-400', bg: 'bg-violet-500/20', order: 3 },
  in_discussion: { color: 'text-amber-400', bg: 'bg-amber-500/20', order: 4 },
  negotiating: { color: 'text-orange-400', bg: 'bg-orange-500/20', order: 5 },
  committed: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', order: 6 },
}

async function fetchPipelineSnapshot() {
  const res = await fetch('/api/briefing/morning')
  const data = await res.json()
  return data.pipeline || null
}

export function PipelineSnapshot() {
  const { data: pipeline, isLoading } = useQuery({
    queryKey: ['pipeline-snapshot'],
    queryFn: fetchPipelineSnapshot,
    refetchInterval: REFRESH_INTERVAL,
  })

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="h-5 w-36 bg-white/5 rounded mb-4 animate-pulse" />
        <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!pipeline || pipeline.totalOpportunities === 0) {
    return null
  }

  // Sort stages by pipeline order
  const stages = Object.entries(pipeline.byStage || {})
    .map(([stage, data]: [string, any]) => ({
      stage,
      ...data,
      ...(STAGE_CONFIG[stage] || { color: 'text-white/50', bg: 'bg-white/10', order: 99 }),
    }))
    .sort((a, b) => a.order - b.order)

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          Pipeline
        </h2>
        <Link href="/opportunities" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
          Board <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="glass-card-sm p-3 text-center">
          <p className="text-lg font-bold text-white">
            ${Math.round(pipeline.totalWeighted).toLocaleString()}
          </p>
          <p className="text-xs text-white/40">Weighted Pipeline</p>
        </div>
        <div className="glass-card-sm p-3 text-center">
          <p className="text-lg font-bold text-indigo-400">
            {pipeline.totalOpportunities}
          </p>
          <p className="text-xs text-white/40">Opportunities</p>
        </div>
      </div>

      {/* Stage breakdown */}
      <div className="space-y-1.5">
        {stages.map(s => {
          const pct = pipeline.totalValue > 0 ? (s.value / pipeline.totalValue) * 100 : 0
          return (
            <div key={s.stage} className="flex items-center gap-2">
              <span className={cn('text-[10px] w-20 truncate', s.color)}>
                {s.stage.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', s.bg)}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="text-[10px] text-white/40 w-8 text-right">{s.count}</span>
              <span className="text-[10px] text-white/30 w-16 text-right">
                ${Math.round(s.value / 1000)}k
              </span>
            </div>
          )
        })}
      </div>

      {/* Top deals */}
      {pipeline.topDeals?.length > 0 && (
        <>
          <div className="border-t border-white/5 my-3" />
          <p className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Top Deals</p>
          <div className="space-y-1.5">
            {pipeline.topDeals.slice(0, 3).map((deal: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{deal.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-white/30">{deal.stage}</span>
                    {deal.projects?.[0] && (
                      <span className="text-[10px] text-indigo-400/60">{deal.projects[0]}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-emerald-400 shrink-0 ml-2">
                  ${Number(deal.value).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
