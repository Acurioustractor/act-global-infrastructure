'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(Math.abs(n)).toLocaleString()}`
  return `$${Math.abs(n).toLocaleString()}`
}

interface MonthlyRow {
  month: string
  revenue: number
  expenses: number
  net: number
  revenueBreakdown: Record<string, number>
  expenseBreakdown: Record<string, number>
  fyYtdRevenue: number
  fyYtdExpenses: number
  fyYtdNet: number
  transactionCount: number
  unmappedCount: number
}

interface VarianceRow {
  month: string
  type: string
  amountChange: number
  pctChange: number | null
  explanation: string
  severity: string
  topDrivers: any[] | null
}

interface ProjectFinancialsData {
  projectCode: string
  monthly: MonthlyRow[]
  totals: { revenue: number; expenses: number; net: number }
  expenseCategories: Record<string, number>
  revenueCategories: Record<string, number>
  variances: VarianceRow[]
  recentTransactions: Array<{
    id: string
    date: string
    contact: string
    amount: number
    type: string
  }>
}

export default function ProjectFinancialsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)

  const { data, isLoading } = useQuery<ProjectFinancialsData>({
    queryKey: ['finance', 'project', code],
    queryFn: () =>
      fetch(`/api/finance/projects/${encodeURIComponent(code)}`).then((r) => r.json()),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40">Loading financials...</div>
      </div>
    )
  }

  if (!data || !data.monthly?.length) {
    return (
      <div className="min-h-screen p-8">
        <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Finance
        </Link>
        <div className="glass-card p-12 text-center">
          <BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white/60 mb-2">No monthly data yet</h2>
          <p className="text-white/40">Run the monthly financials calculation to populate this page.</p>
        </div>
      </div>
    )
  }

  const monthly = data.monthly
  const totals = data.totals
  const maxMonthly = Math.max(...monthly.map((m) => Math.max(m.revenue, m.expenses, 1)))

  // Sort categories by total
  const topExpenses = Object.entries(data.expenseCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
  const topRevenue = Object.entries(data.revenueCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  const totalExpenseSum = topExpenses.reduce((s, [, v]) => s + v, 0)
  const totalRevenueSum = topRevenue.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Finance
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-green-400" />
          {data.projectCode} — P&L
        </h1>
        <p className="text-white/50 mt-1">
          {monthly.length} months of data ({monthly[0]?.month?.substring(0, 7)} to{' '}
          {monthly[monthly.length - 1]?.month?.substring(0, 7)})
        </p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 text-center">
          <p className="text-2xl font-bold text-green-400 tabular-nums">{formatMoney(totals.revenue)}</p>
          <p className="text-sm text-white/40 mt-1">Total Revenue</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-2xl font-bold text-red-400 tabular-nums">{formatMoney(totals.expenses)}</p>
          <p className="text-sm text-white/40 mt-1">Total Expenses</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className={cn('text-2xl font-bold tabular-nums', totals.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {totals.net >= 0 ? '' : '-'}{formatMoney(totals.net)}
          </p>
          <p className="text-sm text-white/40 mt-1">Net</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-2xl font-bold text-white tabular-nums">
            {formatMoney(Math.abs(totals.expenses) / Math.max(monthly.length, 1))}
          </p>
          <p className="text-sm text-white/40 mt-1">Avg Monthly Spend</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Monthly Trend Chart */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Monthly Trend
            </h2>
            <div className="space-y-2">
              {monthly.map((m) => {
                const label = new Date(m.month).toLocaleDateString('en-AU', {
                  month: 'short',
                  year: '2-digit',
                })
                const revPct = (m.revenue / maxMonthly) * 100
                const expPct = (m.expenses / maxMonthly) * 100
                return (
                  <div key={m.month} className="flex items-center gap-2 text-xs">
                    <span className="w-14 text-white/40">{label}</span>
                    <div className="flex-1 flex gap-1">
                      <div
                        className="h-5 rounded bg-emerald-500/60"
                        style={{ width: `${revPct}%`, minWidth: revPct > 0 ? '2px' : '0' }}
                        title={`Revenue: $${m.revenue.toLocaleString()}`}
                      />
                      <div
                        className="h-5 rounded bg-red-500/60"
                        style={{ width: `${expPct}%`, minWidth: expPct > 0 ? '2px' : '0' }}
                        title={`Expenses: $${m.expenses.toLocaleString()}`}
                      />
                    </div>
                    <span className={cn('w-20 text-right tabular-nums', m.net >= 0 ? 'text-green-400/70' : 'text-red-400/70')}>
                      {m.net >= 0 ? '+' : '-'}${Math.abs(Math.round(m.net)).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-white/30">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/60" /> Revenue</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/60" /> Expenses</span>
            </div>
          </div>

          {/* Variance Explanations */}
          {data.variances.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Variance Explanations
              </h2>
              <div className="space-y-3">
                {data.variances.map((v, i) => (
                  <div key={i} className={cn(
                    'p-3 rounded-lg border',
                    v.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                    v.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-white/10 bg-white/5'
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/70">
                        {new Date(v.month).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                        {' — '}{v.type.replace('_', ' ')}
                      </span>
                      <span className={cn(
                        'text-sm font-medium tabular-nums',
                        v.amountChange >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {v.amountChange >= 0 ? '+' : '-'}{formatMoney(v.amountChange)}
                        {v.pctChange != null && ` (${v.pctChange > 0 ? '+' : ''}${Math.round(v.pctChange)}%)`}
                      </span>
                    </div>
                    <p className="text-sm text-white/50">{v.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          {data.recentTransactions.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-indigo-400" />
                Recent Transactions
                <span className="text-sm text-white/40 font-normal ml-auto">{data.recentTransactions.length}</span>
              </h2>
              <div className="space-y-1">
                {data.recentTransactions.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                    <div>
                      <span className="text-sm text-white">{tx.contact || 'Unknown'}</span>
                      <span className="text-xs text-white/30 ml-2">{tx.date}</span>
                    </div>
                    <span className={cn(
                      'text-sm font-medium tabular-nums',
                      tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Expense Breakdown */}
          {topExpenses.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-400" />
                Expense Breakdown
              </h3>
              <div className="space-y-2">
                {topExpenses.map(([cat, amt]) => {
                  const pct = totalExpenseSum > 0 ? (amt / totalExpenseSum) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 truncate">{cat}</span>
                        <span className="text-white/40 tabular-nums">{formatMoney(amt)}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500/50 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Revenue Breakdown */}
          {topRevenue.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Revenue Breakdown
              </h3>
              <div className="space-y-2">
                {topRevenue.map(([cat, amt]) => {
                  const pct = totalRevenueSum > 0 ? (amt / totalRevenueSum) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 truncate">{cat}</span>
                        <span className="text-white/40 tabular-nums">{formatMoney(amt)}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/50 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* FY YTD from latest month */}
          {monthly.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-indigo-400" />
                FY Year-to-Date
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">YTD Revenue</span>
                  <span className="text-green-400 font-medium tabular-nums">{formatMoney(monthly[monthly.length - 1].fyYtdRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">YTD Expenses</span>
                  <span className="text-red-400 font-medium tabular-nums">{formatMoney(monthly[monthly.length - 1].fyYtdExpenses)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-white/40">YTD Net</span>
                  <span className={cn(
                    'font-medium tabular-nums',
                    monthly[monthly.length - 1].fyYtdNet >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {monthly[monthly.length - 1].fyYtdNet >= 0 ? '' : '-'}{formatMoney(monthly[monthly.length - 1].fyYtdNet)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Link to project page */}
          <Link
            href={`/projects/${data.projectCode}`}
            className="glass-card p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <span className="text-sm text-white/60">View Project Intelligence</span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
        </div>
      </div>
    </div>
  )
}
