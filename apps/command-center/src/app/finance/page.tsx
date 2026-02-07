'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  ExternalLink,
  CreditCard,
  Flame,
  ChevronRight,
  BarChart3,
  FolderKanban,
  Building2,
  Landmark,
} from 'lucide-react'
import { DonutChart, ProgressBar, BarChart } from '@tremor/react'
import {
  getBookkeepingProgress,
  getXeroTransactions,
  getSubscriptionsSummary,
  getReceiptScore,
  getSpendingByProject,
} from '@/lib/api'
import { cn } from '@/lib/utils'

export default function FinancePage() {
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['bookkeeping', 'progress'],
    queryFn: getBookkeepingProgress,
  })

  const { data: transactionsData, isLoading: txLoading } = useQuery({
    queryKey: ['xero', 'transactions'],
    queryFn: () => getXeroTransactions(15),
  })

  const { data: subscriptionsSummary } = useQuery({
    queryKey: ['subscriptions', 'summary'],
    queryFn: getSubscriptionsSummary,
  })

  const { data: receiptScore } = useQuery({
    queryKey: ['receipts', 'score'],
    queryFn: getReceiptScore,
  })

  const { data: projectSpending } = useQuery({
    queryKey: ['spending', 'by-project'],
    queryFn: () => getSpendingByProject(3),
  })

  const summary = progress?.summary
  const overdueInvoices = progress?.overdueInvoices
  const uncategorized = progress?.uncategorized
  const transactions = transactionsData?.transactions || []

  // Calculate net position
  const netPosition = (summary?.receivables?.total || 0) - (summary?.payables?.total || 0)

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-400" />
              Finance
            </h1>
            <p className="text-lg text-white/60 mt-1">
              Xero integration • Real-time financial data
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="https://go.xero.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Xero
            </a>
            <button className="btn-action flex items-center gap-2">
              Sync Now
            </button>
          </div>
        </div>
      </header>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Bank Balance</p>
              <p className="text-2xl font-bold text-white">
                ${(summary?.bankBalance || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ArrowDownRight className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Receivable</p>
              <p className="text-2xl font-bold text-blue-400">
                ${(summary?.receivables?.total || 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/40">{summary?.receivables?.count || 0} invoices</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Payable</p>
              <p className="text-2xl font-bold text-orange-400">
                ${(summary?.payables?.total || 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/40">{summary?.payables?.count || 0} bills</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              netPosition >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
            )}>
              {netPosition >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-400" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-white/50">Net Position</p>
              <p className={cn(
                'text-2xl font-bold',
                netPosition >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                ${Math.abs(netPosition).toLocaleString()}
              </p>
              <p className="text-xs text-white/40">receivable - payable</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Main Content */}
        <div className="col-span-8 space-y-6">
          {/* Project Spending Widget */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-purple-400" />
                Spending by Project
              </h2>
              <span className="text-sm text-white/50">{projectSpending?.period || 'Last 3 months'}</span>
            </div>

            {projectSpending?.projects && projectSpending.projects.length > 0 ? (
              <>
                <BarChart
                  data={projectSpending.projects.map(p => ({
                    name: p.name,
                    'Amount': p.total,
                  }))}
                  index="name"
                  categories={['Amount']}
                  colors={['purple']}
                  valueFormatter={(v) => `$${v.toLocaleString()}`}
                  className="h-48"
                  showAnimation={true}
                />
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-sm text-white/50">Total spending</span>
                  <span className="text-lg font-semibold text-white">
                    ${projectSpending.total.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-white/40">
                No project spending data available
              </div>
            )}
          </div>

          {/* Monthly Summary */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-400" />
              This Month
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Income</span>
                  <span className="text-lg font-semibold text-green-400">
                    +${(summary?.monthlyIncome || 0).toLocaleString()}
                  </span>
                </div>
                <ProgressBar value={70} color="green" className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Expenses</span>
                  <span className="text-lg font-semibold text-red-400">
                    -${(summary?.monthlyExpenses || 0).toLocaleString()}
                  </span>
                </div>
                <ProgressBar value={45} color="red" className="h-2" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Net this month</span>
                <span className={cn(
                  'text-xl font-bold',
                  (summary?.monthlyIncome || 0) - (summary?.monthlyExpenses || 0) >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                )}>
                  ${((summary?.monthlyIncome || 0) - (summary?.monthlyExpenses || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              Recent Transactions
            </h2>

            {txLoading ? (
              <div className="py-8 text-center text-white/40">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-white/40">No recent transactions</div>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 8).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg',
                          tx.amount >= 0
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        )}
                      >
                        {tx.amount >= 0 ? (
                          <ArrowDownRight className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white truncate max-w-[300px]">
                          {tx.description || 'No description'}
                        </p>
                        <p className="text-xs text-white/40">
                          {tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : ''} • {tx.account_name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Widgets & Alerts */}
        <div className="col-span-4 space-y-6">
          {/* Subscriptions Widget */}
          <Link href="/finance/subscriptions">
            <div className="glass-card p-5 hover:border-purple-500/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-purple-400" />
                  Subscriptions
                </h3>
                <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              </div>

              {subscriptionsSummary ? (
                <>
                  <div className="text-2xl font-bold text-white mb-1">
                    ${subscriptionsSummary.total_monthly_aud}/mo
                    {subscriptionsSummary.total_monthly_usd > 0 && (
                      <span className="text-sm font-normal text-white/50 ml-2">
                        + ${subscriptionsSummary.total_monthly_usd} USD
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/50 mb-3">
                    {subscriptionsSummary.count} active subscriptions
                  </p>

                  {/* Top 3 subscriptions */}
                  <div className="space-y-2">
                    {subscriptionsSummary.topSubscriptions?.slice(0, 3).map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between text-sm">
                        <span className="text-white/70">{sub.name}</span>
                        <span className="text-white/50">${sub.amount}/{sub.billing_cycle === 'annual' ? 'yr' : 'mo'}</span>
                      </div>
                    ))}
                  </div>

                  {subscriptionsSummary.unassigned > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-orange-400">
                        ⚠️ {subscriptionsSummary.unassigned} need project assignment
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-center text-white/40 text-sm">
                  Loading subscriptions...
                </div>
              )}
            </div>
          </Link>

          {/* Receipt Score Widget */}
          <Link href="/finance/receipts">
            <div className="glass-card p-5 hover:border-green-500/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-400" />
                  Receipt Score
                </h3>
                <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              </div>

              {receiptScore ? (
                <>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="35"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="35"
                          fill="none"
                          stroke={receiptScore.score >= 80 ? '#22c55e' : receiptScore.score >= 50 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="8"
                          strokeDasharray={`${(receiptScore.score / 100) * 220} 220`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">{receiptScore.score}%</span>
                      </div>
                    </div>
                    <div>
                      {receiptScore.streak > 0 && (
                        <div className="flex items-center gap-1.5 text-orange-400 mb-1">
                          <Flame className="h-4 w-4" />
                          <span className="text-sm font-medium">{receiptScore.streak}-week streak!</span>
                        </div>
                      )}
                      <p className="text-sm text-white/50">
                        {receiptScore.resolvedThisWeek} captured this week
                      </p>
                    </div>
                  </div>

                  {receiptScore.pending > 0 && (
                    <div className="text-sm text-yellow-400">
                      📄 {receiptScore.pending} missing receipts
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-center text-white/40 text-sm">
                  Loading receipt score...
                </div>
              )}
            </div>
          </Link>

          {/* Needs Attention Widget */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Needs Attention
            </h3>

            <div className="space-y-3">
              {/* Overdue Invoices */}
              {(overdueInvoices?.count || 0) > 0 && (
                <button className="w-full text-left p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-400">
                        {overdueInvoices?.count} Overdue
                      </p>
                      <p className="text-xs text-white/50">
                        ${overdueInvoices?.total?.toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded">
                      Chase
                    </span>
                  </div>
                </button>
              )}

              {/* Uncategorized */}
              {(uncategorized?.count || 0) > 0 && (
                <button className="w-full text-left p-3 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-400">
                        {uncategorized?.count} Uncategorized
                      </p>
                      <p className="text-xs text-white/50">
                        ${uncategorized?.amount?.toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs text-orange-400 bg-orange-500/20 px-2 py-1 rounded">
                      Review
                    </span>
                  </div>
                </button>
              )}

              {/* Missing Receipts */}
              {(receiptScore?.pending || 0) > 0 && (
                <Link href="/finance/receipts">
                  <button className="w-full text-left p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-400">
                          {receiptScore?.pending} Missing Receipts
                        </p>
                        <p className="text-xs text-white/50">
                          Match or skip
                        </p>
                      </div>
                      <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">
                        Find
                      </span>
                    </div>
                  </button>
                </Link>
              )}

              {/* All Good State */}
              {(overdueInvoices?.count || 0) === 0 &&
               (uncategorized?.count || 0) === 0 &&
               (receiptScore?.pending || 0) === 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-400">All Caught Up</p>
                    <p className="text-xs text-white/50">No outstanding items</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Reports Widget */}
          <Link href="/finance/reports">
            <div className="glass-card p-5 hover:border-indigo-500/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-400" />
                  Financial Reports
                </h3>
                <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              </div>
              <p className="text-sm text-white/50 mb-2">
                P&L statement, cash flow forecast
              </p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="px-2 py-0.5 rounded bg-green-500/15 text-green-400">P&L</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">Cash Flow</span>
              </div>
            </div>
          </Link>

          {/* Cash Flow Forecast Widget */}
          <Link href="/finance/cashflow">
            <div className="glass-card p-5 hover:border-emerald-500/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-400" />
                  Cash Flow Forecast
                </h3>
                <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              </div>
              <p className="text-sm text-white/50 mb-2">
                Burn rate, runway & projections
              </p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">Forecast</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">Scenarios</span>
              </div>
            </div>
          </Link>

          {/* Revenue Streams Widget */}
          <Link href="/finance/revenue">
            <div className="glass-card p-5 hover:border-blue-500/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Revenue Streams
                </h3>
                <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              </div>
              <p className="text-sm text-white/50 mb-2">
                Income by project & pipeline
              </p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">Streams</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-400">Pipeline</span>
              </div>
            </div>
          </Link>

          {/* Property Payoff Widget */}
          <Link href="/finance/debt">
            <div className="glass-card p-5 hover:border-amber-500/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-amber-400" />
                  Property Payoff
                </h3>
                <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              </div>
              <p className="text-sm text-white/50 mb-2">
                Mortgage tracking & scenarios
              </p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">Equity</span>
                <span className="px-2 py-0.5 rounded bg-green-500/15 text-green-400">Offset</span>
              </div>
            </div>
          </Link>

          {/* Business Widget */}
          <Link href="/business">
            <div className="glass-card p-5 hover:border-blue-500/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-400" />
                  Business
                </h3>
                <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
              </div>
              <p className="text-sm text-white/50 mb-2">
                Entity structure, R&D tax credits, compliance
              </p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">ACT Pty Ltd</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">R&D 43.5%</span>
              </div>
            </div>
          </Link>

          {/* Cash Flow Chart */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4">Cash Distribution</h3>
            <DonutChart
              data={[
                { name: 'Available', value: summary?.bankBalance || 0 },
                { name: 'Receivable', value: summary?.receivables?.total || 0 },
                { name: 'Payable', value: summary?.payables?.total || 0 },
              ]}
              category="value"
              index="name"
              colors={['green', 'blue', 'orange']}
              className="h-40"
              showAnimation={true}
            />
            <div className="flex justify-center gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-xs text-white/60">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-white/60">Receivable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-xs text-white/60">Payable</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
