'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Landmark, TrendingDown, Calendar, DollarSign, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Debt {
  id: string
  name: string
  type: string
  lender: string
  original_amount: number
  current_balance: number
  interest_rate: number
  monthly_payment: number
  start_date: string
  maturity_date: string
  offset_balance: number
  property_id: string
  notes: string
  is_active: boolean
}

interface Payment {
  id: string
  debt_id: string
  payment_date: string
  amount: number
  principal_portion: number
  interest_portion: number
  remaining_balance: number
}

interface Scenario {
  id: string
  name: string
  description: string
  adjustments: Record<string, any>
  projected_interest_original: number
  projected_interest_new: number
  projected_payoff_date_original: string
  projected_payoff_date_new: string
  created_at: string
}

interface Metrics {
  totalBalance: number
  equityPct: number
  monthlyPayment: number
  projectedPayoff: string
}

interface ApiResponse {
  debts: Debt[]
  payments: Payment[]
  scenarios: Scenario[]
  metrics: Metrics
}

const formatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
})

export default function DebtPage() {
  const [extraPayment, setExtraPayment] = useState(0)
  const [lumpSum, setLumpSum] = useState(0)
  const [selectedScenario, setSelectedScenario] = useState('current')

  const { data, isLoading, error } = useQuery({
    queryKey: ['debt'],
    queryFn: async () => {
      const response = await fetch('/api/debt')
      if (!response.ok) {
        throw new Error('Failed to fetch debt data')
      }
      return response.json() as Promise<ApiResponse>
    },
  })

  // Show empty state if no data
  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Landmark className="w-8 h-8 text-white" />
            <h1 className="text-4xl font-bold text-white">Property Payoff Tracker</h1>
          </div>
          <p className="text-white/60">Monitor your mortgage and plan your payoff strategy</p>
        </div>

        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Landmark className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/60 text-lg">No debt records yet — add your mortgage details to start tracking</p>
          </div>
        </div>
      </div>
    )
  }

  // Extract first debt for primary loan details
  const firstDebt = data.debts && data.debts.length > 0 ? data.debts[0] : null

  if (!firstDebt) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Landmark className="w-8 h-8 text-white" />
            <h1 className="text-4xl font-bold text-white">Property Payoff Tracker</h1>
          </div>
          <p className="text-white/60">Monitor your mortgage and plan your payoff strategy</p>
        </div>

        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Landmark className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/60 text-lg">No debt records yet — add your mortgage details to start tracking</p>
          </div>
        </div>
      </div>
    )
  }

  const currentBalance = data.metrics.totalBalance
  const equityPercentage = data.metrics.equityPct
  const monthlyPayment = data.metrics.monthlyPayment
  const projectedPayoffDate = data.metrics.projectedPayoff

  // Payment history from API
  const paymentHistory = data.payments || []

  const projectedPayoffMonths = 360

  const scenarios = {
    current: { extra: 0, label: 'Current pace', color: 'from-blue-500 to-cyan-500' },
    plus500: { extra: 500, label: '+$500/month', color: 'from-purple-500 to-pink-500' },
    plus1000: { extra: 1000, label: '+$1000/month', color: 'from-amber-500 to-orange-500' },
  }

  const handleScenarioSelect = (scenario: keyof typeof scenarios) => {
    setSelectedScenario(scenario)
    setExtraPayment(scenarios[scenario].extra)
  }

  const calculatedPayoffMonths = selectedScenario === 'current'
    ? projectedPayoffMonths
    : projectedPayoffMonths - (extraPayment * 12) / 3200

  const projectedInterestSaved = (extraPayment * 12 * 5) // Simplified calculation
  const projectedMonthsSaved = Math.round(projectedPayoffMonths - calculatedPayoffMonths)

  const StatCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: any }) => (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-sm font-medium">{label}</p>
          <p className="text-white text-2xl font-bold mt-2">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-white/30" />
      </div>
    </div>
  )

  const milestones = [
    { percent: 25, label: '25%', completed: equityPercentage >= 25 },
    { percent: 50, label: '50%', completed: equityPercentage >= 50 },
    { percent: 75, label: '75%', completed: equityPercentage >= 75 },
    { percent: 100, label: 'Payoff', completed: equityPercentage >= 100 },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Landmark className="w-8 h-8 text-white" />
          <h1 className="text-4xl font-bold text-white">Property Payoff Tracker</h1>
        </div>
        <p className="text-white/60">Monitor your mortgage and plan your payoff strategy</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Current Balance"
          value={formatter.format(currentBalance)}
          icon={DollarSign}
        />
        <StatCard
          label="Equity %"
          value={`${equityPercentage.toFixed(1)}%`}
          icon={TrendingDown}
        />
        <StatCard
          label="Monthly Payment"
          value={formatter.format(monthlyPayment + extraPayment)}
          icon={Calendar}
        />
        <StatCard
          label="Projected Payoff"
          value={new Date(projectedPayoffDate).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })}
          icon={Calendar}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column - Main Charts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Equity Progress */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold text-lg mb-6">Equity Growth Progress</h2>
            <div className="space-y-4">
              <div className="relative h-12 bg-white/5 rounded-lg overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 flex items-center justify-end pr-4"
                  style={{ width: `${equityPercentage}%` }}
                >
                  {equityPercentage > 10 && (
                    <span className="text-white font-bold text-sm">{equityPercentage.toFixed(1)}%</span>
                  )}
                </div>
              </div>

              {/* Milestones */}
              <div className="grid grid-cols-4 gap-3 mt-6">
                {milestones.map((milestone) => (
                  <div key={milestone.percent} className="flex flex-col items-center gap-2">
                    <div className="relative w-12 h-12 bg-white/5 rounded-full border border-white/10 flex items-center justify-center">
                      {milestone.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-white/30" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm">{milestone.label}</p>
                      <p className={cn('text-xs', milestone.completed ? 'text-green-400' : 'text-white/40')}>
                        {milestone.completed ? 'Complete' : 'Upcoming'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Amortisation Chart */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold text-lg mb-6">Loan Balance Trajectory</h2>
            <div className="h-64 bg-white/5 rounded-lg border border-white/10 p-4 flex items-end justify-between gap-1">
              {Array.from({ length: 24 }).map((_, i) => {
                const monthIndex = i * 15
                const currentTrajectory = firstDebt.original_amount * (1 - (monthIndex / (projectedPayoffMonths * 12)) * 0.9)
                const optimizedTrajectory = firstDebt.original_amount * (1 - (monthIndex / (Math.max(1, calculatedPayoffMonths) * 12)) * 0.95)
                const height = (currentTrajectory / firstDebt.original_amount) * 100

                return (
                  <div key={i} className="flex-1 relative h-full group">
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 opacity-70 hover:opacity-100 transition-opacity rounded-t"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                    {i % 4 === 0 && (
                      <div className="absolute bottom-0 left-0 text-white/40 text-xs whitespace-nowrap -translate-x-1/2 translate-y-5">
                        {i}y
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-6 flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-400 rounded" />
                <span className="text-white/70 text-sm">Current trajectory</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-400 rounded opacity-50" />
                <span className="text-white/70 text-sm">With extra payments</span>
              </div>
            </div>
          </div>

          {/* Scenario Builder */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold text-lg mb-6">Payoff Scenarios</h2>

            {/* Preset Scenarios */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {(Object.entries(scenarios) as [string, any][]).map(([key, scenario]) => (
                <button
                  key={key}
                  onClick={() => handleScenarioSelect(key as keyof typeof scenarios)}
                  className={cn(
                    'p-4 rounded-lg border transition-all',
                    selectedScenario === key
                      ? `bg-gradient-to-r ${scenario.color} border-white/30 text-white font-semibold`
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                  )}
                >
                  {scenario.label}
                </button>
              ))}
            </div>

            {/* Custom Adjustments */}
            <div className="space-y-6">
              <div>
                <label className="block text-white text-sm font-medium mb-3">
                  Extra Monthly Payment: {formatter.format(extraPayment)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={extraPayment}
                  onChange={(e) => {
                    setExtraPayment(Number(e.target.value))
                    setSelectedScenario('')
                  }}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between text-white/40 text-xs mt-2">
                  <span>$0</span>
                  <span>$2,000</span>
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-3">
                  Lump Sum Payment: {formatter.format(lumpSum)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="1000"
                  value={lumpSum}
                  onChange={(e) => setLumpSum(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-white/40 text-xs mt-2">
                  <span>$0</span>
                  <span>$50,000</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20">
                <p className="text-green-300 text-xs font-medium mb-1">Interest Saved</p>
                <p className="text-green-400 text-lg font-bold">{formatter.format(projectedInterestSaved)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg p-4 border border-blue-500/20">
                <p className="text-blue-300 text-xs font-medium mb-1">Months Saved</p>
                <p className="text-blue-400 text-lg font-bold">{projectedMonthsSaved}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
                <p className="text-purple-300 text-xs font-medium mb-1">New Payoff Date</p>
                <p className="text-purple-400 text-lg font-bold">
                  {new Date(Date.now() + calculatedPayoffMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold text-lg mb-6">Recent Payment History</h2>
            {paymentHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/60">No payment history available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/60 font-medium py-3 px-4">Date</th>
                      <th className="text-right text-white/60 font-medium py-3 px-4">Amount</th>
                      <th className="text-right text-white/60 font-medium py-3 px-4">Principal</th>
                      <th className="text-right text-white/60 font-medium py-3 px-4">Interest</th>
                      <th className="text-right text-white/60 font-medium py-3 px-4">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="text-white/80 py-3 px-4">
                          {new Date(payment.payment_date).toLocaleDateString('en-AU')}
                        </td>
                        <td className="text-white text-right py-3 px-4 font-medium">{formatter.format(payment.amount)}</td>
                        <td className="text-green-400 text-right py-3 px-4">{formatter.format(payment.principal_portion)}</td>
                        <td className="text-red-400 text-right py-3 px-4">{formatter.format(payment.interest_portion)}</td>
                        <td className="text-white/80 text-right py-3 px-4">{formatter.format(payment.remaining_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Loan Details */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold text-lg mb-6">Loan Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-start pb-4 border-b border-white/10">
                <span className="text-white/60 text-sm">Lender</span>
                <span className="text-white font-medium text-right">{firstDebt.lender}</span>
              </div>
              <div className="flex justify-between items-start pb-4 border-b border-white/10">
                <span className="text-white/60 text-sm">Loan Type</span>
                <span className="text-white font-medium text-right">{firstDebt.type}</span>
              </div>
              <div className="flex justify-between items-start pb-4 border-b border-white/10">
                <span className="text-white/60 text-sm">Interest Rate</span>
                <span className="text-white font-medium text-right">{firstDebt.interest_rate}%</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-white/60 text-sm">Original Amount</span>
                <span className="text-white font-medium text-right">{formatter.format(firstDebt.original_amount)}</span>
              </div>
            </div>
          </div>

          {/* Offset Account */}
          <div className="glass-card p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <p className="text-green-300 text-xs font-medium mb-2 uppercase">Offset Account Balance</p>
            <p className="text-white text-2xl font-bold">{formatter.format(firstDebt.offset_balance)}</p>
            <p className="text-green-400 text-xs mt-3">Interest reduction: {formatter.format((firstDebt.offset_balance * firstDebt.interest_rate) / 100 / 12)}/month</p>
          </div>

          {/* Key Dates */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold text-lg mb-6">Key Dates</h3>
            <div className="space-y-4">
              <div className="pb-4 border-b border-white/10">
                <p className="text-white/60 text-xs font-medium mb-1 uppercase">Start Date</p>
                <p className="text-white font-semibold">{new Date(firstDebt.start_date).toLocaleDateString('en-AU')}</p>
              </div>
              <div className="pb-4 border-b border-white/10">
                <p className="text-white/60 text-xs font-medium mb-1 uppercase">Maturity Date</p>
                <p className="text-white font-semibold">{new Date(firstDebt.maturity_date).toLocaleDateString('en-AU')}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs font-medium mb-1 uppercase">Projected Payoff</p>
                <p className="text-white font-semibold text-green-400">{new Date(projectedPayoffDate).toLocaleDateString('en-AU')}</p>
              </div>
            </div>
          </div>

          {/* Celebration Milestones */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold text-lg mb-6">Milestones</h3>
            <div className="space-y-3">
              {milestones.map((milestone) => (
                <div
                  key={milestone.percent}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    milestone.completed
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-white/5 border-white/10 opacity-50'
                  )}
                >
                  {milestone.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-white/30 flex-shrink-0" />
                  )}
                  <span className={cn('text-sm font-medium', milestone.completed ? 'text-green-400' : 'text-white/60')}>
                    {milestone.label} Equity
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
