'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Plus,
  Calculator,
  Wallet,
  Activity,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HistoryPoint {
  month: string
  income: number
  expenses: number
  balance: number
}

interface ProjectionMonth {
  month: string
  projected_income: number
  projected_expenses: number
  projected_balance: number
  confidence: number
}

interface Scenario {
  id: string
  name: string
  description: string
  adjustments: Record<string, number>
}

interface CashflowData {
  history: HistoryPoint[]
  projections: ProjectionMonth[]
  scenarios: Scenario[]
  metrics: {
    burnRate: number
    runway: number
    trend: 'increasing' | 'decreasing' | 'stable'
    trendPercent: number
  }
  currentBalance: number
  lastUpdated: string
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
}

// SVG Chart Component for Cash Flow
const CashFlowChart = ({ history, projections }: { history: HistoryPoint[]; projections: ProjectionMonth[] }) => {
  const allMonths = [...history.slice(-12), ...projections.slice(0, 6)]

  if (allMonths.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-white/40">
        No data available
      </div>
    )
  }

  const maxValue = Math.max(
    ...allMonths.map((m: any) => Math.max(
      m.income || m.projected_income || 0,
      m.expenses || m.projected_expenses || 0
    ))
  )

  const padding = 40
  const width = 800
  const height = 300
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  const barWidth = chartWidth / allMonths.length
  const barGroupWidth = barWidth * 0.8
  const singleBarWidth = barGroupWidth / 2

  return (
    <svg
      width={width}
      height={height}
      className="w-full border border-white/10 rounded-lg bg-white/5 p-4"
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Y-axis */}
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="2"
      />
      {/* X-axis */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="2"
      />

      {/* Grid lines and labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = height - padding - chartHeight * ratio
        const value = maxValue * ratio
        return (
          <g key={`grid-${ratio}`}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              strokeDasharray="4"
            />
            <text
              x={padding - 10}
              y={y + 5}
              textAnchor="end"
              fontSize="12"
              fill="rgba(255,255,255,0.4)"
            >
              {formatCurrency(value)}
            </text>
          </g>
        )
      })}

      {/* Bars and labels */}
      {allMonths.map((month, idx) => {
        const isProjection = idx >= history.length - 1
        const income = (month as any).income || (month as any).projected_income || 0
        const expenses = (month as any).expenses || (month as any).projected_expenses || 0

        const incomePx = (income / maxValue) * chartHeight
        const expensesPx = (expenses / maxValue) * chartHeight

        const x = padding + idx * barWidth
        const barStartX = x + (barWidth - barGroupWidth) / 2

        const baseY = height - padding

        return (
          <g key={`bar-${idx}`}>
            {/* Income bar (green) */}
            <rect
              x={barStartX}
              y={baseY - incomePx}
              width={singleBarWidth}
              height={incomePx}
              fill={isProjection ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.8)'}
              opacity={isProjection ? 0.6 : 1}
              style={{ cursor: 'pointer' }}
            >
              <title>{`${formatMonth(month.month)}: Income ${formatCurrency(income)}`}</title>
            </rect>

            {/* Expenses bar (red) */}
            <rect
              x={barStartX + singleBarWidth}
              y={baseY - expensesPx}
              width={singleBarWidth}
              height={expensesPx}
              fill={isProjection ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.8)'}
              opacity={isProjection ? 0.6 : 1}
              style={{ cursor: 'pointer' }}
            >
              <title>{`${formatMonth(month.month)}: Expenses ${formatCurrency(expenses)}`}</title>
            </rect>

            {/* Month label */}
            <text
              x={x + barWidth / 2}
              y={baseY + 20}
              textAnchor="middle"
              fontSize="11"
              fill="rgba(255,255,255,0.5)"
            >
              {formatMonth(month.month)}
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <g>
        <rect x={padding + 10} y={15} width={12} height={12} fill="rgba(34, 197, 94, 0.8)" />
        <text x={padding + 30} y={24} fontSize="12" fill="rgba(255,255,255,0.7)">
          Income
        </text>

        <rect x={padding + 120} y={15} width={12} height={12} fill="rgba(239, 68, 68, 0.8)" />
        <text x={padding + 140} y={24} fontSize="12" fill="rgba(255,255,255,0.7)">
          Expenses
        </text>

        <rect x={padding + 220} y={15} width={12} height={3} fill="rgba(255,255,255,0.5)" />
        <text x={padding + 240} y={21} fontSize="12" fill="rgba(255,255,255,0.7)">
          Net (Historical)
        </text>
      </g>
    </svg>
  )
}

// Stat Card Component
const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  color = 'blue',
}: {
  icon: React.ComponentType<any>
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'blue' | 'green' | 'red' | 'amber'
}) => {
  const bgColor = {
    blue: 'bg-blue-500/10',
    green: 'bg-emerald-500/10',
    red: 'bg-red-500/10',
    amber: 'bg-amber-500/10',
  }[color]

  const iconColor = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
  }[color]

  return (
    <div className={cn('glass-card p-6 rounded-lg border border-white/10', bgColor)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-white/60 text-sm mb-2">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-red-400" />
              ) : trend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              ) : (
                <Activity className="w-4 h-4 text-blue-400" />
              )}
              <span className={cn('text-sm font-semibold', {
                'text-red-400': trend === 'up',
                'text-emerald-400': trend === 'down',
                'text-blue-400': trend === 'neutral',
              })}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <Icon className={cn('w-8 h-8', iconColor)} />
      </div>
    </div>
  )
}

// Alert Card Component
const AlertCard = ({
  type,
  title,
  description,
}: {
  type: 'warning' | 'critical' | 'info'
  title: string
  description: string
}) => {
  const colors = {
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400' },
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-400' },
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400' },
  }

  const config = colors[type]

  return (
    <div className={cn('glass-card p-4 rounded-lg border', config.bg, config.border)}>
      <div className="flex gap-3">
        <AlertTriangle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.icon)} />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{title}</p>
          <p className="text-white/60 text-sm mt-1">{description}</p>
        </div>
      </div>
    </div>
  )
}

// Upcoming Items Component
const UpcomingItem = ({
  title,
  amount,
  date,
  type,
}: {
  title: string
  amount: number
  date: string
  type: 'receivable' | 'payable'
}) => {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">{title}</p>
        <p className="text-white/40 text-xs mt-0.5">Due {formatMonth(date)}</p>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <span className={cn('text-sm font-semibold', {
          'text-emerald-400': type === 'receivable',
          'text-red-400': type === 'payable',
        })}>
          {type === 'receivable' ? '+' : '-'}{formatCurrency(amount)}
        </span>
      </div>
    </div>
  )
}

// Scenario Form Component
const ScenarioForm = ({
  onSubmit,
  isLoading,
}: {
  onSubmit: (scenario: { name: string; description: string; adjustments: Record<string, number> }) => void
  isLoading: boolean
}) => {
  const [formOpen, setFormOpen] = useState(false)
  const [scenarioName, setScenarioName] = useState('')
  const [scenarioDesc, setScenarioDesc] = useState('')
  const [incomeAdjust, setIncomeAdjust] = useState(0)
  const [expenseAdjust, setExpenseAdjust] = useState(0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: scenarioName,
      description: scenarioDesc,
      adjustments: {
        income_adjustment: incomeAdjust,
        expense_adjustment: expenseAdjust,
      },
    })
    setFormOpen(false)
    setScenarioName('')
    setScenarioDesc('')
    setIncomeAdjust(0)
    setExpenseAdjust(0)
  }

  if (!formOpen) {
    return (
      <button
        onClick={() => setFormOpen(true)}
        className="w-full glass-card p-4 rounded-lg border border-white/10 hover:border-white/20 transition-colors flex items-center gap-2 text-white/60 hover:text-white"
      >
        <Plus className="w-4 h-4" />
        Create Scenario
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 rounded-lg border border-white/10 space-y-4">
      <input
        type="text"
        placeholder="Scenario name"
        value={scenarioName}
        onChange={(e) => setScenarioName(e.target.value)}
        required
        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
      />
      <textarea
        placeholder="Description"
        value={scenarioDesc}
        onChange={(e) => setScenarioDesc(e.target.value)}
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/60 text-sm block mb-1">Income Adjustment (%)</label>
          <input
            type="number"
            value={incomeAdjust}
            onChange={(e) => setIncomeAdjust(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label className="text-white/60 text-sm block mb-1">Expense Adjustment (%)</label>
          <input
            type="number"
            value={expenseAdjust}
            onChange={(e) => setExpenseAdjust(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading || !scenarioName}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-white/10 text-white rounded px-4 py-2 font-semibold transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Scenario'}
        </button>
        <button
          type="button"
          onClick={() => setFormOpen(false)}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded px-4 py-2 font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// Projection Details Component
const ProjectionDetails = ({ projections }: { projections: ProjectionMonth[] }) => {
  if (projections.length === 0) {
    return (
      <div className="text-white/40 text-center py-8">
        No projections available
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {projections.slice(0, 6).map((proj, idx) => {
        const net = proj.projected_income - proj.projected_expenses
        const isPositive = net >= 0

        return (
          <div
            key={idx}
            className="glass-card p-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold text-sm">
                {formatMonth(proj.month)}
              </span>
              <span className={cn('text-sm font-bold', {
                'text-emerald-400': isPositive,
                'text-red-400': !isPositive,
              })}>
                {formatCurrency(net)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-white/60">
                <span>Income:</span>
                <p className="text-white">{formatCurrency(proj.projected_income)}</p>
              </div>
              <div className="text-white/60">
                <span>Expenses:</span>
                <p className="text-white">{formatCurrency(proj.projected_expenses)}</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Balance:</span>
                <span className="text-white font-semibold">
                  {formatCurrency(proj.projected_balance)}
                </span>
              </div>
              <div className="mt-1 bg-white/5 rounded h-1.5 overflow-hidden">
                <div
                  className={cn('h-full', {
                    'bg-emerald-500': proj.confidence > 0.7,
                    'bg-amber-500': proj.confidence > 0.5 && proj.confidence <= 0.7,
                    'bg-red-500': proj.confidence <= 0.5,
                  })}
                  style={{ width: `${proj.confidence * 100}%` }}
                />
              </div>
              <p className="text-white/40 text-xs mt-1">
                Confidence: {Math.round(proj.confidence * 100)}%
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Main Page Component
export default function CashflowPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['cashflow'],
    queryFn: () =>
      fetch('/api/cashflow').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch cashflow data')
        return r.json()
      }),
    refetchInterval: 60000, // Refetch every minute
  })

  const createScenarioMutation = useMutation({
    mutationFn: (scenario: { name: string; description: string; adjustments: Record<string, number> }) =>
      fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })

  const cashflowData = data as CashflowData | undefined

  // Generate mock upcoming items for demo
  const mockUpcoming = [
    { title: 'AWS Services Invoice', amount: 12500, date: '2024-03', type: 'payable' as const },
    { title: 'Client A Monthly Payment', amount: 25000, date: '2024-03', type: 'receivable' as const },
    { title: 'Software Licenses', amount: 8900, date: '2024-04', type: 'payable' as const },
    { title: 'Client B Quarterly Project', amount: 50000, date: '2024-04', type: 'receivable' as const },
  ]

  // Generate alerts based on metrics
  const alerts: Array<{ type: 'warning' | 'critical' | 'info'; title: string; description: string }> = []
  if (cashflowData && cashflowData.metrics.runway < 3) {
    alerts.push({
      type: 'critical' as const,
      title: 'Low Cash Runway',
      description: `Only ${cashflowData.metrics.runway.toFixed(1)} months of runway remaining`,
    })
  } else if (cashflowData && cashflowData.metrics.runway < 6) {
    alerts.push({
      type: 'warning' as const,
      title: 'Runway Below Target',
      description: `Cash runway is ${cashflowData.metrics.runway.toFixed(1)} months. Target is 6+ months`,
    })
  }

  if (cashflowData && cashflowData.metrics.trend === 'increasing' && cashflowData.metrics.trendPercent > 10) {
    alerts.push({
      type: 'warning' as const,
      title: 'Increasing Burn Rate',
      description: `Expenses growing by ${cashflowData.metrics.trendPercent}%. Monitor spending closely`,
    })
  }

  if (alerts.length === 0 && cashflowData && cashflowData.metrics.runway > 12) {
    alerts.push({
      type: 'info' as const,
      title: 'Healthy Cash Position',
      description: 'Strong cash runway and stable expense trends',
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Wallet className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Cash Flow Intelligence</h1>
            <p className="text-white/60 mt-1">
              Real-time financial projections and burn rate analysis
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white/20" />
          <p className="text-white/60 mt-4">Loading cash flow data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <AlertCard
          type="critical"
          title="Failed to Load Data"
          description="Unable to fetch cash flow data. Please try refreshing the page."
        />
      )}

      {/* Main Content */}
      {cashflowData && !isLoading && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Calendar}
              label="Cash Runway"
              value={`${cashflowData.metrics.runway.toFixed(1)} mo`}
              color={
                cashflowData.metrics.runway > 6
                  ? 'green'
                  : cashflowData.metrics.runway > 3
                    ? 'amber'
                    : 'red'
              }
            />
            <StatCard
              icon={DollarSign}
              label="Monthly Burn Rate"
              value={formatCurrency(cashflowData.metrics.burnRate)}
              trend={cashflowData.metrics.trend === 'increasing' ? 'up' : 'down'}
              trendValue={`${cashflowData.metrics.trendPercent > 0 ? '+' : ''}${cashflowData.metrics.trendPercent}%`}
              color={cashflowData.metrics.trend === 'increasing' ? 'red' : 'green'}
            />
            <StatCard
              icon={Activity}
              label="Current Balance"
              value={formatCurrency(cashflowData.currentBalance)}
              color="blue"
            />
            <StatCard
              icon={TrendingUp}
              label="Trend"
              value={
                cashflowData.metrics.trend === 'increasing'
                  ? 'Worsening'
                  : cashflowData.metrics.trend === 'decreasing'
                    ? 'Improving'
                    : 'Stable'
              }
              color={
                cashflowData.metrics.trend === 'increasing' ? 'red' : 'green'
              }
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-12 gap-6 mb-8">
            {/* Left Column - Charts & Projections */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Cash Flow Chart */}
              <div className="glass-card p-6 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">
                    12-Month Cash Flow Forecast
                  </h2>
                </div>
                <CashFlowChart
                  history={cashflowData.history}
                  projections={cashflowData.projections}
                />
              </div>

              {/* Projections Section */}
              <div className="glass-card p-6 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-xl font-bold text-white">
                    6-Month Detailed Forecast
                  </h2>
                </div>
                <ProjectionDetails projections={cashflowData.projections} />
              </div>

              {/* Scenario Builder */}
              <div className="glass-card p-6 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">
                    Scenario Builder
                  </h2>
                </div>
                <p className="text-white/60 text-sm mb-4">
                  Create "what-if" scenarios to model different revenue and expense changes
                </p>
                <ScenarioForm
                  onSubmit={(scenario) =>
                    createScenarioMutation.mutate(scenario)
                  }
                  isLoading={createScenarioMutation.isPending}
                />
                {cashflowData.scenarios.length > 0 && (
                  <div className="mt-4">
                    <p className="text-white/60 text-sm mb-3">
                      Saved Scenarios
                    </p>
                    <div className="space-y-2">
                      {cashflowData.scenarios.slice(0, 3).map((scenario) => (
                        <div
                          key={scenario.id}
                          className="glass-card p-3 rounded-lg border border-white/10 flex items-start justify-between"
                        >
                          <div className="flex-1">
                            <p className="text-white text-sm font-semibold">
                              {scenario.name}
                            </p>
                            <p className="text-white/60 text-xs mt-0.5">
                              {scenario.description}
                            </p>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Metrics & Alerts */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* Quick Metrics */}
              <div className="glass-card p-6 rounded-lg border border-white/10">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Quick Metrics
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-white/60 text-sm mb-1">Avg Monthly Expenses</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(cashflowData.metrics.burnRate)}
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-white/60 text-sm mb-1">Last Month Balance</p>
                    <p className="text-2xl font-bold text-white">
                      {cashflowData.history.length > 0
                        ? formatCurrency(cashflowData.history[cashflowData.history.length - 1].balance)
                        : '$0'}
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-white/60 text-sm mb-1">Expense Trend</p>
                    <div className="flex items-center gap-2 mt-2">
                      {cashflowData.metrics.trend === 'increasing' ? (
                        <TrendingUp className="w-5 h-5 text-red-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-emerald-400" />
                      )}
                      <span className={cn('text-lg font-bold', {
                        'text-red-400': cashflowData.metrics.trend === 'increasing',
                        'text-emerald-400': cashflowData.metrics.trend !== 'increasing',
                      })}>
                        {cashflowData.metrics.trend === 'increasing' ? 'Growing' : 'Shrinking'}
                      </span>
                    </div>
                    <p className="text-white/60 text-xs mt-2">
                      {cashflowData.metrics.trendPercent > 0 ? '+' : ''}{cashflowData.metrics.trendPercent}% vs first 3 months
                    </p>
                  </div>
                </div>
              </div>

              {/* Upcoming Items */}
              <div className="glass-card p-6 rounded-lg border border-white/10">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Upcoming Items
                </h2>
                <div className="space-y-0">
                  {mockUpcoming.map((item, idx) => (
                    <UpcomingItem key={idx} {...item} />
                  ))}
                </div>
              </div>

              {/* Alerts */}
              <div className="glass-card p-6 rounded-lg border border-white/10">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Alerts & Insights
                </h2>
                <div className="space-y-3">
                  {alerts.map((alert, idx) => (
                    <AlertCard key={idx} {...alert} />
                  ))}
                </div>
              </div>

              {/* Data Freshness */}
              <div className="glass-card p-4 rounded-lg border border-white/10 text-center">
                <p className="text-white/60 text-xs">
                  Last updated {new Date(cashflowData.lastUpdated).toLocaleTimeString('en-AU')}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
