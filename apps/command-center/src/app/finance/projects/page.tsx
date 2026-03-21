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
}

interface ProjectsHubData {
  projects: ProjectRow[]
  totals: { revenue: number; expenses: number; net: number; rdSpend: number }
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
    }),
    { revenue: 0, expenses: 0, net: 0, rdSpend: 0 }
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-5 text-center">
          <TrendingUp className="h-5 w-5 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-400 tabular-nums">{formatMoney(filteredTotals.revenue)}</p>
          <p className="text-sm text-white/40 mt-1">Total Revenue</p>
        </div>
        <div className="glass-card p-5 text-center">
          <TrendingDown className="h-5 w-5 text-red-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-400 tabular-nums">{formatMoney(Math.abs(filteredTotals.expenses))}</p>
          <p className="text-sm text-white/40 mt-1">Total Expenses</p>
        </div>
        <div className="glass-card p-5 text-center">
          <BarChart3 className="h-5 w-5 text-blue-400 mx-auto mb-2" />
          <p className={cn('text-2xl font-bold tabular-nums', filteredTotals.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {filteredTotals.net >= 0 ? '' : '-'}{formatMoney(filteredTotals.net)}
          </p>
          <p className="text-sm text-white/40 mt-1">Net Position</p>
        </div>
        <div className="glass-card p-5 text-center">
          <FlaskConical className="h-5 w-5 text-lime-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-lime-400 tabular-nums">{formatMoney(filteredTotals.rdSpend)}</p>
          <p className="text-sm text-white/40 mt-1">R&D Eligible Spend</p>
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
                <th className="text-right py-3 px-4 text-white/50 font-medium">Revenue</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Expenses</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Net</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Margin</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">R&D %</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Budget</th>
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
                    {project.revenue > 0 ? formatMoney(project.revenue) : <span className="text-white/20">—</span>}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-red-400">
                    {formatMoney(Math.abs(project.expenses))}
                  </td>
                  <td className={cn('py-3 px-4 text-right tabular-nums font-medium', project.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {project.net >= 0 ? '+' : '-'}{formatMoney(project.net)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {project.revenue > 0 ? (
                      <span className={cn(
                        'text-xs tabular-nums font-medium',
                        project.net >= 0 ? 'text-emerald-400' : project.net > -project.revenue ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {Math.round((project.net / project.revenue) * 100)}%
                      </span>
                    ) : (
                      <span className="text-white/20 text-xs">—</span>
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
                  <td className="py-3 px-4 text-right">
                    {project.budgetPct !== null ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              project.budgetPct > 100 ? 'bg-red-500/60' : project.budgetPct > 80 ? 'bg-amber-500/60' : 'bg-blue-500/60'
                            )}
                            style={{ width: `${Math.min(project.budgetPct, 100)}%` }}
                          />
                        </div>
                        <span className={cn(
                          'text-xs tabular-nums',
                          project.budgetPct > 100 ? 'text-red-400' : project.budgetPct > 80 ? 'text-amber-400' : 'text-blue-400'
                        )}>
                          {project.budgetPct}%
                        </span>
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
                <td className="py-3 px-4 text-right tabular-nums font-semibold text-green-400">{formatMoney(filteredTotals.revenue)}</td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold text-red-400">{formatMoney(Math.abs(filteredTotals.expenses))}</td>
                <td className={cn('py-3 px-4 text-right tabular-nums font-semibold', filteredTotals.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {filteredTotals.net >= 0 ? '+' : '-'}{formatMoney(filteredTotals.net)}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-xs font-medium">
                  {filteredTotals.revenue > 0 ? (
                    <span className={filteredTotals.net >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {Math.round((filteredTotals.net / filteredTotals.revenue) * 100)}%
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-lime-400 text-xs font-medium">
                  {Math.abs(filteredTotals.expenses) > 0
                    ? `${Math.round((filteredTotals.rdSpend / Math.abs(filteredTotals.expenses)) * 100)}%`
                    : '—'}
                </td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
