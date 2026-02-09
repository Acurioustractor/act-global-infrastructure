'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Activity, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProjectsSummary, type ProjectSummaryRow } from '@/lib/api'

function healthColor(score: number | null) {
  if (score == null) return { text: 'text-white/30', bg: 'bg-white/10' }
  if (score >= 60) return { text: 'text-green-400', bg: 'bg-green-500/20' }
  if (score >= 30) return { text: 'text-amber-400', bg: 'bg-amber-500/20' }
  return { text: 'text-red-400', bg: 'bg-red-500/20' }
}

export function ProjectHealthGrid() {
  const { data } = useQuery({
    queryKey: ['projects', 'summary'],
    queryFn: () => getProjectsSummary(),
    refetchInterval: 60 * 1000,
  })

  const projects = (data?.projects || [])
    .filter((p: ProjectSummaryRow) => p.health_score !== null)
    .slice(0, 12)

  if (projects.length === 0) return null

  return (
    <div className="glass-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-400" />
          Project Health
        </h2>
        <Link href="/projects" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
          All <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {projects.map((p: ProjectSummaryRow) => {
          const color = healthColor(p.health_score)
          return (
            <Link
              key={p.project_code}
              href={`/projects/${p.project_code}`}
              className="glass-card-sm p-3 hover:border-indigo-500/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/60">{p.project_code}</span>
                <span className={cn('text-xs font-bold tabular-nums', color.text)}>
                  {p.health_score ?? '—'}
                </span>
              </div>
              <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                {p.project_name}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
                {p.total_income > 0 && (
                  <span className="text-green-400">${(p.total_income / 1000).toFixed(0)}k in</span>
                )}
                {p.pipeline_value > 0 && (
                  <span className="text-purple-400">${(p.pipeline_value / 1000).toFixed(0)}k pipe</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
