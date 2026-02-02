'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Wallet,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { BarChart } from '@tremor/react'
import {
  getProfitLoss,
  getCashFlowForecast,
  type ProfitLossReport,
  type CashFlowForecast,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import { useState } from 'react'

function formatCurrency(amount: number) {
  return `$${Math.abs(amount).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function PLSection({ data }: { data: ProfitLossReport }) {
  const [showRevenueDetail, setShowRevenueDetail] = useState(false)
  const [showExpenseDetail, setShowExpenseDetail] = useState(false)

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-400" />
          Profit & Loss
        </h2>
        <span className="text-sm text-white/40">{data.period}</span>
      </div>

      {/* Revenue */}
      <div className="mb-4">
        <button
          onClick={() => setShowRevenueDetail(!showRevenueDetail)}
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-green-500/10 hover:bg-green-500/15 transition-colors"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">Revenue</span>
            {showRevenueDetail ? <ChevronUp className="h-3 w-3 text-white/30" /> : <ChevronDown className="h-3 w-3 text-white/30" />}
          </div>
          <span className="text-lg font-bold text-green-400 tabular-nums">{formatCurrency(data.revenue.total)}</span>
        </button>
        {showRevenueDetail && data.revenue.items.length > 0 && (
          <div className="ml-6 mt-2 space-y-1">
            {data.revenue.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-3 text-sm">
                <span className="text-white/60">{item.name}</span>
                <span className="text-white/50 tabular-nums">{formatCurrency(item.balance)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost of Sales */}
      {data.costOfSales.total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5">
            <span className="text-sm font-medium text-white/60">Cost of Sales</span>
            <span className="text-sm font-semibold text-red-400 tabular-nums">-{formatCurrency(data.costOfSales.total)}</span>
          </div>
        </div>
      )}

      {/* Gross Profit */}
      <div className="flex items-center justify-between py-3 px-4 mb-4 border-t border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Gross Profit</span>
          {data.grossMargin > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{data.grossMargin}% margin</span>
          )}
        </div>
        <span className={cn('text-lg font-bold tabular-nums', data.grossProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
          {data.grossProfit < 0 && '-'}{formatCurrency(data.grossProfit)}
        </span>
      </div>

      {/* Operating Expenses */}
      <div className="mb-4">
        <button
          onClick={() => setShowExpenseDetail(!showExpenseDetail)}
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/15 transition-colors"
        >
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Operating Expenses</span>
            {showExpenseDetail ? <ChevronUp className="h-3 w-3 text-white/30" /> : <ChevronDown className="h-3 w-3 text-white/30" />}
          </div>
          <span className="text-lg font-bold text-red-400 tabular-nums">-{formatCurrency(data.expenses.total)}</span>
        </button>
        {showExpenseDetail && data.expenses.items.length > 0 && (
          <div className="ml-6 mt-2 space-y-1">
            {data.expenses.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-3 text-sm">
                <span className="text-white/60">{item.name}</span>
                <span className="text-white/50 tabular-nums">{formatCurrency(item.balance)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Net Profit */}
      <div className="flex items-center justify-between py-4 px-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">Net Profit</span>
          {data.netMargin !== 0 && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              data.netMargin >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            )}>
              {data.netMargin}% margin
            </span>
          )}
        </div>
        <span className={cn('text-2xl font-bold tabular-nums', data.netProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
          {data.netProfit < 0 && '-'}{formatCurrency(data.netProfit)}
        </span>
      </div>
    </div>
  )
}

function CashFlowSection({ data }: { data: CashFlowForecast }) {
  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-blue-400" />
        Cash Flow Forecast
      </h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card-sm p-4">
          <p className="text-xs text-white/40">Current Balance</p>
          <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(data.currentBalance)}</p>
        </div>
        <div className="glass-card-sm p-4">
          <p className="text-xs text-white/40">Monthly Net</p>
          <p className={cn('text-xl font-bold tabular-nums', data.monthlyNet >= 0 ? 'text-green-400' : 'text-red-400')}>
            {data.monthlyNet >= 0 ? '+' : '-'}{formatCurrency(data.monthlyNet)}
          </p>
        </div>
        <div className="glass-card-sm p-4">
          <p className="text-xs text-white/40">Subscriptions</p>
          <p className="text-xl font-bold text-purple-400 tabular-nums">{formatCurrency(data.monthlySubscriptions)}/mo</p>
        </div>
        <div className="glass-card-sm p-4">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-white/40" />
            <p className="text-xs text-white/40">Runway</p>
          </div>
          <p className={cn(
            'text-xl font-bold tabular-nums',
            data.runway === null ? 'text-green-400' : data.runway > 6 ? 'text-green-400' : data.runway > 3 ? 'text-amber-400' : 'text-red-400'
          )}>
            {data.runway === null ? 'Profitable' : `${data.runway} months`}
          </p>
        </div>
      </div>

      {/* Forecast Chart */}
      {data.forecast.length > 0 && (
        <div className="mb-6">
          <BarChart
            data={data.forecast.map(m => ({
              month: m.label,
              'Inflow': m.inflow,
              'Outflow': m.outflow,
            }))}
            index="month"
            categories={['Inflow', 'Outflow']}
            colors={['emerald', 'red']}
            valueFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
            className="h-56"
            showAnimation={true}
          />
        </div>
      )}

      {/* Projected Balance Table */}
      {data.forecast.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white/60 mb-3">Projected Balance</h3>
          <div className="space-y-2">
            {data.forecast.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                <span className="text-sm text-white/70">{m.label}</span>
                <div className="flex items-center gap-6">
                  <span className="text-xs text-green-400/70 tabular-nums">+{formatCurrency(m.inflow)}</span>
                  <span className="text-xs text-red-400/70 tabular-nums">-{formatCurrency(m.outflow)}</span>
                  <span className={cn(
                    'text-sm font-semibold tabular-nums min-w-[80px] text-right',
                    m.balance >= 0 ? 'text-white' : 'text-red-400'
                  )}>
                    {m.balance < 0 && '-'}{formatCurrency(m.balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FinancialReportsPage() {
  const { data: pl, isLoading: plLoading } = useQuery({
    queryKey: ['reports', 'profit-loss'],
    queryFn: getProfitLoss,
  })

  const { data: cashFlow, isLoading: cfLoading } = useQuery({
    queryKey: ['reports', 'cash-flow-forecast'],
    queryFn: getCashFlowForecast,
  })

  const isLoading = plLoading || cfLoading

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <Link href="/finance" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Finance
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-400" />
            Financial Reports
          </h1>
          <p className="text-lg text-white/60 mt-1">
            Profit & Loss and Cash Flow Forecast from Xero
          </p>
        </div>
      </header>

      {isLoading && (
        <div className="py-12 text-center text-white/40">Loading financial reports...</div>
      )}

      <div className="space-y-6">
        {pl && <PLSection data={pl} />}
        {cashFlow && <CashFlowSection data={cashFlow} />}
      </div>
    </div>
  )
}
