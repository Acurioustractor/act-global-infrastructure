'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  DollarSign,
  GitBranch,
  Telescope,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PulseData {
  summary: {
    totalReceivable: number
    totalOverdue: number
    totalPipeline: number
    grantDeadlinesCount: number
    coreProjectCount: number
  }
  projectPulse: Array<{
    code: string
    name: string
    tier: string
    fyIncome: number
    fyExpenses: number
    receivable: number
    pipelineValue: number
    netPosition: number
  }>
  overdueReceivables: Array<{
    contact: string
    amount: number
    dueDate: string
    project: string | null
    invoice: string
    daysOverdue: number
  }>
  grantDeadlines: Array<{
    name: string
    provider: string | null
    maxAmount: number | null
    closesAt: string
    alignedProjects: string[]
    status: string
    daysUntil: number
  }>
  weeklyActions: {
    overdueInvoices: number
    overdueTotal: number
    grantsDueSoon: number
  }
}

const formatK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return `$${n.toLocaleString('en-AU')}`
}

export function EcosystemPulse() {
  const { data, isLoading } = useQuery<PulseData>({
    queryKey: ['ecosystem', 'pulse'],
    queryFn: () => fetch('/api/ecosystem/pulse').then(r => r.json()),
    refetchInterval: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="glass-card p-5 space-y-4">
        <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { summary, projectPulse, weeklyActions } = data
  const totalActions = weeklyActions.overdueInvoices + weeklyActions.grantsDueSoon

  return (
    <div className="space-y-4">
      {/* Ecosystem Pulse Header */}
      <div className="glass-card p-5 glow-blue">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            Ecosystem Pulse
          </h2>
          <Link href="/opportunities" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            Full Pipeline <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Key Numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card-sm p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Banknote className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] text-white/50 uppercase tracking-wide">Receivable</span>
            </div>
            <p className="text-lg font-bold text-emerald-400">{formatK(summary.totalReceivable)}</p>
            {summary.totalOverdue > 0 && (
              <p className="text-[10px] text-red-400 mt-0.5">{formatK(summary.totalOverdue)} overdue</p>
            )}
          </div>
          <div className="glass-card-sm p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[10px] text-white/50 uppercase tracking-wide">Pipeline</span>
            </div>
            <p className="text-lg font-bold text-indigo-400">{formatK(summary.totalPipeline)}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{summary.grantDeadlinesCount} grants due soon</p>
          </div>
        </div>

        {/* Action Alert */}
        {totalActions > 0 && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-300">
              {totalActions} action{totalActions !== 1 ? 's' : ''} needed:
              {weeklyActions.overdueInvoices > 0 && ` ${weeklyActions.overdueInvoices} overdue invoices`}
              {weeklyActions.grantsDueSoon > 0 && ` · ${weeklyActions.grantsDueSoon} grants to apply`}
            </span>
          </div>
        )}
      </div>

      {/* Core Project Health */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Telescope className="h-4 w-4 text-purple-400" />
          Core Projects
        </h3>
        <div className="space-y-2">
          {projectPulse.map(project => {
            const totalFunding = project.receivable + project.pipelineValue
            const maxFunding = Math.max(...projectPulse.map(p => p.receivable + p.pipelineValue), 1)
            const barWidth = Math.round((totalFunding / maxFunding) * 100)
            const hasIncome = project.fyIncome > 0 || project.receivable > 0

            return (
              <Link
                key={project.code}
                href={`/projects/${project.code}`}
                className="block glass-card-sm p-3 hover:border-purple-500/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-purple-400">{project.code}</span>
                    <span className="text-sm text-white group-hover:text-purple-300 transition-colors">{project.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {project.receivable > 0 && (
                      <span className="text-emerald-400">{formatK(project.receivable)} due</span>
                    )}
                    {project.pipelineValue > 0 && (
                      <span className="text-indigo-400">{formatK(project.pipelineValue)} pipeline</span>
                    )}
                    {!hasIncome && project.fyExpenses > 0 && (
                      <span className="text-red-400">-{formatK(project.fyExpenses)}</span>
                    )}
                    {totalFunding === 0 && project.fyExpenses === 0 && (
                      <span className="text-white/20">dormant</span>
                    )}
                  </div>
                </div>
                {totalFunding > 0 && (
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full flex">
                      {project.receivable > 0 && (
                        <div
                          className="h-full bg-emerald-500/60"
                          style={{ width: `${(project.receivable / totalFunding) * barWidth}%` }}
                        />
                      )}
                      {project.pipelineValue > 0 && (
                        <div
                          className="h-full bg-indigo-500/40"
                          style={{ width: `${(project.pipelineValue / totalFunding) * barWidth}%` }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Overdue Receivables */}
      {data.overdueReceivables.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Chase These Invoices
          </h3>
          <div className="space-y-1.5">
            {data.overdueReceivables.slice(0, 5).map((inv, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-white/5 text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-white/80 truncate">{inv.contact}</span>
                  {inv.project && (
                    <span className="text-white/30 shrink-0">{inv.project}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-emerald-400 font-medium tabular-nums">{formatK(inv.amount)}</span>
                  <span className="text-red-400">{inv.daysOverdue}d overdue</span>
                </div>
              </div>
            ))}
            {data.overdueReceivables.length > 5 && (
              <Link href="/finance/revenue" className="block text-center text-xs text-white/30 hover:text-white/50 pt-1">
                +{data.overdueReceivables.length - 5} more
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Grant Deadlines */}
      {data.grantDeadlines.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Grant Deadlines
          </h3>
          <div className="space-y-1.5">
            {data.grantDeadlines.slice(0, 5).map((grant, i) => (
              <Link
                key={i}
                href="/opportunities"
                className="flex items-center justify-between py-1.5 px-2 rounded bg-white/5 text-xs hover:bg-white/10 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white/80 truncate">{grant.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {grant.provider && <span className="text-white/30">{grant.provider}</span>}
                    {grant.alignedProjects.length > 0 && (
                      <span className="text-purple-400/60">{grant.alignedProjects.slice(0, 2).join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {grant.maxAmount && grant.maxAmount > 0 && (
                    <span className="text-emerald-400 tabular-nums">{formatK(grant.maxAmount)}</span>
                  )}
                  <span className={cn(
                    'font-medium tabular-nums',
                    grant.daysUntil <= 7 ? 'text-red-400' : grant.daysUntil <= 30 ? 'text-amber-400' : 'text-white/40'
                  )}>
                    {grant.daysUntil}d
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
