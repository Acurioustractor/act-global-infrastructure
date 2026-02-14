'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { TrendingUp, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getGHLPipelines, getGHLOpportunities } from '@/lib/api'
import { ProgressBar } from '@tremor/react'

const REFRESH_INTERVAL = 30 * 1000

export function GrantsPipeline() {
  const { data: pipelinesData } = useQuery({
    queryKey: ['ghl', 'pipelines'],
    queryFn: getGHLPipelines,
    refetchInterval: REFRESH_INTERVAL,
  })

  const { data: opportunitiesData } = useQuery({
    queryKey: ['ghl', 'opportunities'],
    queryFn: () => getGHLOpportunities(),
    refetchInterval: REFRESH_INTERVAL,
  })

  const pipelines = pipelinesData?.pipelines || []
  const opportunities = opportunitiesData?.opportunities || []
  const totalValue = opportunities.reduce((sum, o) => sum + (o.monetary_value || 0), 0)

  // Group by pipeline
  const pipelineStats = pipelines.map((pipeline) => {
    const pipelineOpps = opportunities.filter((o) => o.pipeline_name === pipeline.name)
    const value = pipelineOpps.reduce((sum, o) => sum + (o.monetary_value || 0), 0)
    return { ...pipeline, count: pipelineOpps.length, value, opportunities: pipelineOpps }
  }).filter(p => p.count > 0)

  const maxCount = Math.max(...pipelineStats.map(p => p.count), 1)

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-400" />
          Pipeline
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-400 font-medium">
            ${totalValue.toLocaleString()}
          </span>
          <Link href="/opportunities" className="text-xs text-indigo-400 hover:text-indigo-300">
            Board &rarr;
          </Link>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="text-center py-4 text-white/40">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No open opportunities</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pipelineStats.slice(0, 4).map((pipeline) => (
            <Link
              key={pipeline.id}
              href="/opportunities"
              className="glass-card-sm p-3 block hover:border-green-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{pipeline.name}</span>
                <span className="text-xs text-green-400">${pipeline.value.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <ProgressBar
                  value={Math.round((pipeline.count / maxCount) * 100)}
                  color="emerald"
                  className="flex-1"
                />
                <span className="text-xs text-white/50 min-w-[40px] text-right">
                  {pipeline.count} opp{pipeline.count !== 1 ? 's' : ''}
                </span>
              </div>
            </Link>
          ))}

          {/* Top opportunities by value */}
          {opportunities.filter(o => o.monetary_value && o.monetary_value > 0).length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wide">Top Opportunities</p>
              {opportunities
                .filter(o => o.monetary_value && o.monetary_value > 0)
                .sort((a, b) => (b.monetary_value || 0) - (a.monetary_value || 0))
                .slice(0, 3)
                .map((opp) => (
                  <Link
                    key={opp.id}
                    href="/opportunities"
                    className="flex items-center justify-between py-1.5 px-1 -mx-1 rounded hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm text-white truncate flex-1">{opp.name}</span>
                    <span className="text-xs text-green-400 ml-2">
                      ${(opp.monetary_value || 0).toLocaleString()}
                    </span>
                  </Link>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
