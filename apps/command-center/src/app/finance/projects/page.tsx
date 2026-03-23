'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FlaskConical,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(Math.abs(n)).toLocaleString()}`
  return `$${Math.abs(n).toLocaleString()}`
}

interface ProjectRow {
  code: string
  name: string
  tier: string
  status: string
  revenue: number
  expenses: number
  net: number
  rdSpend: number
  rdPct: number
  budgetPct: number | null
  annualBudget: number | null
  received: number
  pending: number
  invoiceCount: number
  weightedPipeline: number
  pipelineCount: number
}

interface ProjectsHubData {
  projects: ProjectRow[]
  totals: {
    revenue: number; expenses: number; net: number; rdSpend: number
    received: number; pending: number; weightedPipeline: number
  }
  fy: string
}

const TIER_LABELS: Record<string, string> = {
  ecosystem: 'Ecosystem',
  studio: 'Studio',
  satellite: 'Satellite',
  unknown: 'Other',
}

const TIER_COLORS: Record<string, string> = {
  ecosystem: 'text-purple-400 bg-purple-500/20',
  studio: 'text-blue-400 bg-blue-500/20',
  satellite: 'text-white/50 bg-white/10',
  unknown: 'text-white/30 bg-white/5',
}

export default function ProjectsFinancialHub() {
  const [tierFilter, setTierFilter] = useState<string>('all')

  const { data, isLoading } = useQuery<ProjectsHubData>({
    queryKey: ['finance', 'projects-hub'],
    queryFn: () => fetch('/api/finance/projects').then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40">Loading project financials...</div>
      </div>
    )
  }

  if (!data?.projects?.length) {
    return (
      <div className="min-h-screen p-8">
        <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Finance
        </Link>
        <div className="glass-card p-12 text-center">
          <BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white/60 mb-2">No project financial data</h2>
          <p className="text-white/40">Run <code>calculate-project-monthly-financials.mjs</code> to populate.</p>
        </div>
      </div>
    )
  }

  const tiers = [...new Set(data.projects.map(p => p.tier))].sort()
  const filtered = tierFilter === 'all' ? data.projects : data.projects.filter(p => p.tier === tierFilter)

  // Calculate filtered totals
  const filteredTotals = filtered.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue,
      expenses: acc.expenses + p.expenses,
      net: acc.net + p.net,
      rdSpend: acc.rdSpend + p.rdSpend,
      received: acc.received + p.received,
      pending: acc.pending + p.pending,
      weightedPipeline: acc.weightedPipeline + p.weightedPipeline,
    }),
    { revenue: 0, expenses: 0, net: 0, rdSpend: 0, received: 0, pending: 0, weightedPipeline: 0 }
  )

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Finance
      </Link>

      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-400" />
            All Projects — {data.fy} YTD
          </h1>
          <p className="text-white/50 mt-1">{data.projects.length} projects with financial activity</p>
        </div>

        {/* Tier filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/40" />
          <div className="flex gap-1">
            <button
              onClick={() => setTierFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                tierFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
              )}
            >
              All
            </button>
            {tiers.map(tier => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  tierFilter === tier ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
                )}
              >
                {TIER_LABELS[tier] || tier}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-green-400 tabular-nums">{formatMoney(filteredTotals.received)}</p>
          <p className="text-xs text-white/40 mt-1">Received</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Clock className="h-5 w-5 text-amber-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-amber-400 tabular-nums">{formatMoney(filteredTotals.pending)}</p>
          <p className="text-xs text-white/40 mt-1">Pending</p>
        </div>
        <div className="glass-card p-4 text-center">
          <TrendingDown className="h-5 w-5 text-red-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-red-400 tabular-nums">{formatMoney(Math.abs(filteredTotals.expenses))}</p>
          <p className="text-xs text-white/40 mt-1">Expenses</p>
        </div>
        <div className="glass-card p-4 text-center">
          <BarChart3 className="h-5 w-5 text-blue-400 mx-auto mb-2" />
          <p className={cn('text-xl font-bold tabular-nums', filteredTotals.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {filteredTotals.net >= 0 ? '' : '-'}{formatMoney(filteredTotals.net)}
          </p>
          <p className="text-xs text-white/40 mt-1">Net Position</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Target className="h-5 w-5 text-purple-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-purple-400 tabular-nums">{formatMoney(filteredTotals.weightedPipeline)}</p>
          <p className="text-xs text-white/40 mt-1">Pipeline (wtd)</p>
        </div>
        <div className="glass-card p-4 text-center">
          <FlaskConical className="h-5 w-5 text-lime-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-lime-400 tabular-nums">{formatMoney(filteredTotals.rdSpend)}</p>
          <p className="text-xs text-white/40 mt-1">R&D Eligible</p>
        </div>
      </div>

      {/* Projects Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/50 font-medium">Project</th>
                <th className="text-left py-3 px-2 text-white/50 font-medium">Tier</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Received</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Pending</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Expenses</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Net</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Pipeline</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">R&D %</th>
                <th className="text-center py-3 px-2 text-white/50 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(project => (
                <tr key={project.code} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <Link href={`/finance/projects/${project.code}`} className="hover:text-blue-400 transition-colors">
                      <div className="font-medium text-white">{project.code}</div>
                      <div className="text-xs text-white/40">{project.name}</div>
                    </Link>
                  </td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', TIER_COLORS[project.tier] || TIER_COLORS.unknown)}>
                      {TIER_LABELS[project.tier] || project.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-green-400">
                    {project.received > 0 ? formatMoney(project.received) : <span className="text-white/20">—</span>}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-amber-400">
                    {project.pending > 0 ? formatMoney(project.pending) : <span className="text-white/20">—</span>}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-red-400">
                    {formatMoney(Math.abs(project.expenses))}
                  </td>
                  <td className={cn('py-3 px-4 text-right tabular-nums font-medium', project.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {project.net >= 0 ? '+' : '-'}{formatMoney(project.net)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {project.weightedPipeline > 0 ? (
                      <div>
                        <span className="text-purple-400">{formatMoney(project.weightedPipeline)}</span>
                        <span className="text-white/30 text-xs ml-1">({project.pipelineCount})</span>
                      </div>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {project.rdPct > 0 ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-lime-500/60 rounded-full" style={{ width: `${Math.min(project.rdPct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-lime-400 tabular-nums">{project.rdPct}%</span>
                      </div>
                    ) : (
                      <span className="text-white/20 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Link href={`/finance/projects/${project.code}`} className="text-white/30 hover:text-white transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/20 bg-white/5">
                <td className="py-3 px-4 font-semibold text-white" colSpan={2}>TOTALS</td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold text-green-400">{formatMoney(filteredTotals.received)}</td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold text-amber-400">{formatMoney(filteredTotals.pending)}</td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold text-red-400">{formatMoney(Math.abs(filteredTotals.expenses))}</td>
                <td className={cn('py-3 px-4 text-right tabular-nums font-semibold', filteredTotals.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {filteredTotals.net >= 0 ? '+' : '-'}{formatMoney(filteredTotals.net)}
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold text-purple-400">
                  {formatMoney(filteredTotals.weightedPipeline)}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-lime-400 text-xs font-medium">
                  {Math.abs(filteredTotals.expenses) > 0
                    ? `${Math.round((filteredTotals.rdSpend / Math.abs(filteredTotals.expenses)) * 100)}%`
                    : '—'}
                </td>
                <td className="py-3 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
