'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Activity,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { getProjectPulse, type ProjectPulse } from '@/lib/api'
import { cn } from '@/lib/utils'

const activityColors = {
  active: 'border-l-emerald-500',
  quiet: 'border-l-amber-500',
  dormant: 'border-l-white/10',
}

const activityBadge = {
  active: 'bg-emerald-500/20 text-emerald-400',
  quiet: 'bg-amber-500/20 text-amber-400',
  dormant: 'bg-white/10 text-white/30',
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function ProjectPulseGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects', 'pulse'],
    queryFn: getProjectPulse,
    refetchInterval: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="glass-card p-5 md:p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const pulse = data?.pulse || []
  const totals = data?.totals || { active: 0, quiet: 0, dormant: 0 }
  // Show active + quiet projects, hide dormant by default
  const visible = pulse.filter(p => p.activityLevel !== 'dormant').slice(0, 10)

  return (
    <div className="glass-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-400" />
          Project Pulse
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
            {totals.active} active
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
            {totals.quiet} quiet
          </span>
          <Link href="/projects" className="text-xs text-indigo-400 hover:text-indigo-300 ml-1">
            All <ChevronRight className="h-3 w-3 inline" />
          </Link>
        </div>
      </div>

      <div className="space-y-1.5">
        {visible.map(project => (
          <PulseRow key={project.code} project={project} />
        ))}
        {visible.length === 0 && (
          <p className="text-center text-white/40 py-4 text-sm">No active projects</p>
        )}
      </div>
    </div>
  )
}

function PulseRow({ project }: { project: ProjectPulse }) {
  const slug = project.name.toLowerCase().replace(/\s+/g, '-')

  return (
    <Link
      href={`/compendium/${slug}`}
      className={cn(
        'glass-card-sm p-2.5 flex items-center gap-3 border-l-2 hover:border-indigo-500/30 transition-all group',
        activityColors[project.activityLevel]
      )}
    >
      {/* Project name */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/40">{project.code.replace('ACT-', '')}</span>
          <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
            {project.name}
          </p>
        </div>
      </div>

      {/* Signal pills */}
      <div className="flex items-center gap-1.5 shrink-0">
        {project.emailsThisWeek > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-blue-400" title="Emails this week">
            <Mail className="h-3 w-3" />
            {project.emailsThisWeek}
          </span>
        )}
        {project.meetingsThisWeek > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-indigo-400" title="Meetings this week">
            <Calendar className="h-3 w-3" />
            {project.meetingsThisWeek}
          </span>
        )}
        {project.actionsOverdue > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-orange-400" title="Overdue actions">
            <AlertCircle className="h-3 w-3" />
            {project.actionsOverdue}
          </span>
        )}
        {project.spendThisMonth > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-white/40" title="Spend this month">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(project.spendThisMonth)}
          </span>
        )}
        {project.pipelineValue > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-green-400" title="Pipeline value">
            <TrendingUp className="h-3 w-3" />
            {formatCurrency(project.pipelineValue)}
          </span>
        )}
      </div>

      {/* Activity badge */}
      <span className={cn(
        'text-[9px] px-1.5 py-0.5 rounded-full shrink-0',
        activityBadge[project.activityLevel]
      )}>
        {project.activityLevel}
      </span>
    </Link>
  )
}
