'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Tag,
  BarChart3,
  Star,
  Sparkles,
  Globe,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react'
import { BarChart, DonutChart, ProgressBar } from '@tremor/react'
import { getProjectFinancialsSummary, type ProjectFinancialSummary, type FinancialsSummaryResponse } from '@/lib/api'
import { LoadingPage } from '@/components/ui/loading'
import { cn } from '@/lib/utils'

function fmt(n: number): string {
  if (n === 0) return '-'
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n}`
}

function fmtFull(n: number): string {
  if (n === 0) return '$0'
  return `$${Math.round(n).toLocaleString()}`
}

const tierConfig: Record<string, { icon: typeof Star; label: string; color: string; bg: string }> = {
  ecosystem: { icon: Star, label: 'Ecosystem', color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  studio: { icon: Sparkles, label: 'Studio', color: 'text-pink-400', bg: 'bg-pink-500/20' },
  satellite: { icon: Globe, label: 'Satellite', color: 'text-white/50', bg: 'bg-white/5' },
}

function NetBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-white/20">-</span>
  const positive = value > 0
  return (
    <span className={cn('text-xs font-mono tabular-nums flex items-center gap-0.5', positive ? 'text-green-400' : 'text-red-400')}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {fmt(Math.abs(value))}
    </span>
  )
}

export default function EcosystemFinancePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', 'financials-summary'],
    queryFn: getProjectFinancialsSummary,
  })

  const projects = data?.projects || []
  const summary = data?.summary
  const rd = data?.rd
  const coverage = data?.coverage

  // Separate by tier
  const ecosystem = projects.filter(p => p.tier === 'ecosystem').sort((a, b) => b.fy_expenses - a.fy_expenses)
  const studio = projects.filter(p => p.tier === 'studio').sort((a, b) => b.fy_expenses - a.fy_expenses)
  const satellite = projects.filter(p => p.tier === 'satellite' || !p.tier).sort((a, b) => b.fy_expenses - a.fy_expenses)

  // Chart data: top projects by expense
  const expenseChart = projects
    .filter(p => p.fy_expenses > 0)
    .sort((a, b) => b.fy_expenses - a.fy_expenses)
    .slice(0, 10)
    .map(p => ({ name: p.code, Expenses: p.fy_expenses, Income: p.fy_income }))

  // Donut data: expenses by tier
  const tierExpenses = [
    { name: 'Ecosystem', value: ecosystem.reduce((s, p) => s + p.fy_expenses, 0) },
    { name: 'Studio', value: studio.reduce((s, p) => s + p.fy_expenses, 0) },
    { name: 'Satellite', value: satellite.reduce((s, p) => s + p.fy_expenses, 0) },
  ].filter(t => t.value > 0)

  // Revenue sources
  const revenueProjects = projects.filter(p => p.fy_income > 0 || p.pipeline_value > 0 || p.grant_funding > 0)
    .sort((a, b) => (b.fy_income + b.pipeline_value + b.grant_funding) - (a.fy_income + a.pipeline_value + a.grant_funding))

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Ecosystem Financials</h1>
            <p className="text-white/60 mt-1">Per-project financial health across {projects.length} projects</p>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 mb-1">FY Income</p>
              <p className="text-2xl font-bold text-green-400 tabular-nums">{fmtFull(summary.fy_income)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 mb-1">FY Expenses</p>
              <p className="text-2xl font-bold text-red-400 tabular-nums">{fmtFull(summary.fy_expenses)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 mb-1">Net Position</p>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                summary.fy_income - summary.fy_expenses >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {fmtFull(summary.fy_income - summary.fy_expenses)}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 mb-1">Pipeline</p>
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{fmtFull(summary.pipeline_value)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 mb-1">Grants</p>
              <p className="text-2xl font-bold text-purple-400 tabular-nums">{fmtFull(summary.grant_funding)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 mb-1">Monthly Subs</p>
              <p className="text-2xl font-bold text-blue-400 tabular-nums">
                {fmtFull(projects.reduce((s, p) => s + p.monthly_subscriptions, 0))}
              </p>
            </div>
          </div>
        )}
      </header>

      {isLoading ? (
        <LoadingPage />
      ) : error ? (
        <div className="glass-card p-6 border-red-500/30">
          <p className="text-red-400">Failed to load financial data</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Projects by Expense */}
            <div className="glass-card p-6 lg:col-span-2">
              <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                FY Expenses vs Income by Project
              </h3>
              {expenseChart.length > 0 ? (
                <BarChart
                  data={expenseChart}
                  index="name"
                  categories={['Expenses', 'Income']}
                  colors={['rose', 'emerald']}
                  valueFormatter={(v) => `$${Math.round(v).toLocaleString()}`}
                  className="h-64"
                  showAnimation
                />
              ) : (
                <p className="text-white/30 text-sm">No financial data yet</p>
              )}
            </div>

            {/* Expenses by Tier */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Expenses by Tier
              </h3>
              {tierExpenses.length > 0 ? (
                <>
                  <DonutChart
                    data={tierExpenses}
                    category="value"
                    index="name"
                    colors={['indigo', 'pink', 'slate']}
                    valueFormatter={(v) => `$${Math.round(v).toLocaleString()}`}
                    className="h-52"
                    showAnimation
                  />
                  <div className="flex justify-center gap-4 mt-3">
                    {tierExpenses.map((t, i) => (
                      <div key={t.name} className="flex items-center gap-1.5">
                        <div className={cn('w-2 h-2 rounded-full', i === 0 ? 'bg-indigo-400' : i === 1 ? 'bg-pink-400' : 'bg-white/30')} />
                        <span className="text-xs text-white/40">{t.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-white/30 text-sm">No data yet</p>
              )}
            </div>
          </div>

          {/* Revenue Sources */}
          {revenueProjects.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Revenue Sources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {revenueProjects.map(p => (
                  <Link key={p.code} href={`/projects/${p.code}`} className="glass-card p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{p.name}</span>
                      <span className="text-xs font-mono text-white/30">{p.code}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {p.fy_income > 0 && (
                        <div>
                          <p className="text-white/30">Income</p>
                          <p className="text-green-400 font-mono tabular-nums">{fmt(p.fy_income)}</p>
                        </div>
                      )}
                      {p.pipeline_value > 0 && (
                        <div>
                          <p className="text-white/30">Pipeline</p>
                          <p className="text-amber-400 font-mono tabular-nums">{fmt(p.pipeline_value)}</p>
                        </div>
                      )}
                      {p.grant_funding > 0 && (
                        <div>
                          <p className="text-white/30">Grants</p>
                          <p className="text-purple-400 font-mono tabular-nums">{fmt(p.grant_funding)}</p>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* R&D Expenses + Tagging Coverage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* R&D Eligible Expenses */}
            {rd && rd.total > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-cyan-400" />
                  R&D Eligible Expenses
                </h3>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-bold text-cyan-400 tabular-nums">{fmtFull(rd.total)}</span>
                  <span className="text-sm text-white/40">{rd.vendor_count} vendors &middot; {rd.transaction_count} transactions</span>
                </div>
                <div className="space-y-2">
                  {rd.by_vendor.slice(0, 8).map(v => (
                    <div key={v.name} className="flex items-center justify-between">
                      <span className="text-sm text-white/70">{v.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/30">{v.count} txns</span>
                        <span className="text-sm font-mono tabular-nums text-cyan-400">{fmt(v.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tagging Coverage */}
            {coverage && (
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  Transaction Tagging Coverage
                </h3>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className={cn(
                    'text-3xl font-bold tabular-nums',
                    coverage.pct >= 80 ? 'text-green-400' : coverage.pct >= 50 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {coverage.pct}%
                  </span>
                  <span className="text-sm text-white/40">
                    {coverage.tagged.toLocaleString()} / {coverage.total.toLocaleString()} tagged
                  </span>
                </div>
                <ProgressBar
                  value={coverage.pct}
                  color={coverage.pct >= 80 ? 'emerald' : coverage.pct >= 50 ? 'amber' : 'rose'}
                  className="mb-4"
                />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-400 tabular-nums">{coverage.tagged.toLocaleString()}</p>
                    <p className="text-xs text-white/40">Tagged</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400 tabular-nums">{coverage.untagged.toLocaleString()}</p>
                    <p className="text-xs text-white/40">Untagged</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white/60 tabular-nums">{coverage.total.toLocaleString()}</p>
                    <p className="text-xs text-white/40">Total</p>
                  </div>
                </div>
                <Link
                  href="/finance/tagger"
                  className="mt-4 block text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Open Transaction Tagger →
                </Link>
              </div>
            )}
          </div>

          {/* Project Tables by Tier */}
          {ecosystem.length > 0 && (
            <ProjectTierTable
              tier="ecosystem"
              projects={ecosystem}
            />
          )}
          {studio.length > 0 && (
            <ProjectTierTable
              tier="studio"
              projects={studio}
            />
          )}
          {satellite.length > 0 && (
            <ProjectTierTable
              tier="satellite"
              projects={satellite}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ProjectTierTable({ tier, projects }: { tier: string; projects: ProjectFinancialSummary[] }) {
  const config = tierConfig[tier] || tierConfig.satellite
  const Icon = config.icon

  const tierIncome = projects.reduce((s, p) => s + p.fy_income, 0)
  const tierExpenses = projects.reduce((s, p) => s + p.fy_expenses, 0)
  const tierTxCount = projects.reduce((s, p) => s + p.transaction_count, 0)

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">{config.label}</h2>
          <p className="text-xs text-white/40">
            {projects.length} projects &middot; {fmtFull(tierExpenses)} expenses &middot; {fmtFull(tierIncome)} income &middot; {tierTxCount} transactions
          </p>
        </div>
      </div>

      <div className={cn('glass-card overflow-hidden', tier === 'ecosystem' && 'ring-1 ring-indigo-500/20')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-white/40 py-3 px-4">Project</th>
                <th className="text-right text-xs font-medium text-white/40 py-3 px-3">FY Income</th>
                <th className="text-right text-xs font-medium text-white/40 py-3 px-3">FY Expenses</th>
                <th className="text-right text-xs font-medium text-white/40 py-3 px-3">Net</th>
                <th className="text-right text-xs font-medium text-white/40 py-3 px-3">All-Time Inc</th>
                <th className="text-right text-xs font-medium text-white/40 py-3 px-3">All-Time Exp</th>
                <th className="text-right text-xs font-medium text-white/40 py-3 px-3">Receivable</th>
                <th className="text-right text-xs font-medium text-white/40 py-3 px-3">Pipeline</th>
                <th className="text-right text-xs font-medium text-white/40 py-3 px-3">Grants</th>
                <th className="text-right text-xs font-medium text-white/40 py-3 px-3">Subs/mo</th>
                <th className="text-center text-xs font-medium text-white/40 py-3 px-3">Txns</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.code} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <Link href={`/projects/${p.code}`} className="hover:text-indigo-400 transition-colors">
                      <span className="text-sm font-medium text-white">{p.name}</span>
                      <span className="text-xs text-white/30 ml-2 font-mono">{p.code}</span>
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn('text-sm font-mono tabular-nums', p.fy_income > 0 ? 'text-green-400' : 'text-white/20')}>
                      {p.fy_income > 0 ? fmt(p.fy_income) : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn('text-sm font-mono tabular-nums', p.fy_expenses > 0 ? 'text-red-400' : 'text-white/20')}>
                      {p.fy_expenses > 0 ? fmt(p.fy_expenses) : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <NetBadge value={p.fy_income - p.fy_expenses} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn('text-xs font-mono tabular-nums', p.total_income > 0 ? 'text-green-400/70' : 'text-white/20')}>
                      {p.total_income > 0 ? fmt(p.total_income) : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn('text-xs font-mono tabular-nums', p.total_expenses > 0 ? 'text-red-400/70' : 'text-white/20')}>
                      {p.total_expenses > 0 ? fmt(p.total_expenses) : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn('text-xs font-mono tabular-nums', p.receivable > 0 ? 'text-amber-400' : 'text-white/20')}>
                      {p.receivable > 0 ? fmt(p.receivable) : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn('text-xs font-mono tabular-nums', p.pipeline_value > 0 ? 'text-amber-400' : 'text-white/20')}>
                      {p.pipeline_value > 0 ? fmt(p.pipeline_value) : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn('text-xs font-mono tabular-nums', p.grant_funding > 0 ? 'text-purple-400' : 'text-white/20')}>
                      {p.grant_funding > 0 ? fmt(p.grant_funding) : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn('text-xs font-mono tabular-nums', p.monthly_subscriptions > 0 ? 'text-blue-400' : 'text-white/20')}>
                      {p.monthly_subscriptions > 0 ? fmt(p.monthly_subscriptions) : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={cn('text-xs font-mono tabular-nums', p.transaction_count > 0 ? 'text-white/60' : 'text-white/20')}>
                      {p.transaction_count || '-'}
                    </span>
                  </td>
                </tr>
              ))}
              {/* Tier totals */}
              <tr className="border-t border-white/10 bg-white/5">
                <td className="py-3 px-4 text-sm font-medium text-white/60">Total</td>
                <td className="py-3 px-3 text-right text-sm font-mono tabular-nums text-green-400">
                  {tierIncome > 0 ? fmt(tierIncome) : '-'}
                </td>
                <td className="py-3 px-3 text-right text-sm font-mono tabular-nums text-red-400">
                  {tierExpenses > 0 ? fmt(tierExpenses) : '-'}
                </td>
                <td className="py-3 px-3 text-right">
                  <NetBadge value={tierIncome - tierExpenses} />
                </td>
                <td colSpan={7} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
