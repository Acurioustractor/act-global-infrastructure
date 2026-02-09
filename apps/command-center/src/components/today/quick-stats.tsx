'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  FolderKanban,
  TrendingUp,
  Mail,
  ListChecks,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getEcosystemOverview,
  getActionFeed,
  getBookkeepingProgress,
  getProjectsSummary,
} from '@/lib/api'

const REFRESH_INTERVAL = 30 * 1000

export function QuickStats() {
  const { data: ecosystem } = useQuery({
    queryKey: ['ecosystem', 'overview'],
    queryFn: getEcosystemOverview,
    refetchInterval: REFRESH_INTERVAL,
  })

  const { data: actionData } = useQuery({
    queryKey: ['action-feed'],
    queryFn: () => getActionFeed({ limit: 50 }),
    refetchInterval: REFRESH_INTERVAL,
  })

  const { data: financeData } = useQuery({
    queryKey: ['bookkeeping', 'progress'],
    queryFn: getBookkeepingProgress,
    refetchInterval: REFRESH_INTERVAL,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['projects', 'summary'],
    queryFn: () => getProjectsSummary(),
    refetchInterval: REFRESH_INTERVAL * 2,
  })

  const activeProjects = (ecosystem?.projects || []).filter(
    (p) => p.contacts > 0 || p.recentComms > 0 || p.opportunities > 0
  ).length
  const totalOpps = ecosystem?.totals?.opportunities || 0
  const totalOppValue = ecosystem?.totals?.opportunityValue || 0
  const emailActions = actionData?.counts?.email_reply || 0
  const taskActions = (actionData?.counts?.task || 0) + (actionData?.counts?.overdue_contact || 0)
  const netPosition = financeData?.summary?.netPosition || 0

  // Ecosystem health: weighted average of project health scores
  const healthProjects = (summaryData?.projects || []).filter((p: any) => p.health_score != null)
  const ecosystemHealth = healthProjects.length > 0
    ? Math.round(healthProjects.reduce((sum: number, p: any) => sum + p.health_score, 0) / healthProjects.length)
    : null

  const stats = [
    {
      label: 'Active Projects',
      value: activeProjects,
      icon: FolderKanban,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/20',
      href: '/compendium',
    },
    {
      label: 'Pipeline',
      value: `$${totalOppValue > 1000 ? `${(totalOppValue / 1000).toFixed(0)}k` : totalOppValue.toLocaleString()}`,
      sub: `${totalOpps} open`,
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      href: '/pipeline',
    },
    {
      label: 'Emails to Reply',
      value: emailActions,
      icon: Mail,
      color: emailActions > 0 ? 'text-amber-400' : 'text-green-400',
      bg: emailActions > 0 ? 'bg-amber-500/20' : 'bg-green-500/20',
      href: '/reports',
    },
    {
      label: 'Overdue Tasks',
      value: taskActions,
      icon: ListChecks,
      color: taskActions > 0 ? 'text-red-400' : 'text-green-400',
      bg: taskActions > 0 ? 'bg-red-500/20' : 'bg-green-500/20',
      href: '/knowledge/actions',
    },
    ...(ecosystemHealth != null ? [{
      label: 'Ecosystem Health',
      value: ecosystemHealth,
      sub: `${healthProjects.length} projects`,
      icon: Activity,
      color: ecosystemHealth >= 60 ? 'text-green-400' : ecosystemHealth >= 30 ? 'text-amber-400' : 'text-red-400',
      bg: ecosystemHealth >= 60 ? 'bg-green-500/20' : ecosystemHealth >= 30 ? 'bg-amber-500/20' : 'bg-red-500/20',
      href: '/projects',
    }] : []),
  ]

  return (
    <div className={cn('grid grid-cols-2 gap-2 md:gap-3', stats.length > 4 ? 'md:grid-cols-5' : 'md:grid-cols-4')}>
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Link
            key={stat.label}
            href={stat.href}
            className="glass-card-sm p-3 hover:border-indigo-500/30 transition-all group"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', stat.bg)}>
              <Icon className={cn('h-4 w-4', stat.color)} />
            </div>
            <p className="text-lg font-bold text-white">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5">{stat.label}</p>
            {stat.sub && (
              <p className="text-[10px] text-white/30">{stat.sub}</p>
            )}
          </Link>
        )
      })}
    </div>
  )
}
