'use client'

import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  AlertTriangle,
  Shield,
  Clock,
  PieChart,
  Flame,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RunwayData {
  runwayMonths: number
  burnRate: number
  currentBalance: number
  diversificationIndex: number
  restrictedFunds: number
  unrestrictedFunds: number
  burnTrend: Array<{ month: string; burn: number; income: number }>
  grantCliffs: Array<{
    name: string
    projectCode: string
    amount: number
    expiresAt: string
    daysRemaining: number
  }>
  revenueSources: Array<{ source: string; amount: number; percentage: number }>
  scenarios: Array<{
    name: string
    runwayMonths: number
    adjustments: Record<string, number>
  }>
  fundraisingPipeline: Array<{
    name: string
    amount: number
    status: string
    projectCode: string
  }>
  lastUpdated: string
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
}

function runwayColor(months: number) {
  if (months >= 12) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Healthy' }
  if (months >= 6) return { text: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Caution' }
  return { text: 'text-red-400', bg: 'bg-red-500/10', label: 'Critical' }
}

// Burn Rate Trend Chart (SVG)
const BurnTrendChart = ({ data }: { data: RunwayData['burnTrend'] }) => {
  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-white/40">No data</div>

  const padding = 40
  const width = 700
  const height = 280
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const maxVal = Math.max(...data.map(d => Math.max(Math.abs(d.burn), d.income)))
  const barWidth = chartWidth / data.length

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const y = height - padding - chartHeight * ratio
        return (
          <g key={ratio}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <text x={padding - 8} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.4)">
              {formatCurrency(maxVal * ratio)}
            </text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const x = padding + i * barWidth
        const burnH = maxVal > 0 ? (Math.abs(d.burn) / maxVal) * chartHeight : 0
        const incomeH = maxVal > 0 ? (d.income / maxVal) * chartHeight : 0
        const bw = barWidth * 0.35

        return (
          <g key={i}>
            <rect
              x={x + barWidth * 0.1}
              y={height - padding - incomeH}
              width={bw}
              height={incomeH}
              fill="rgba(34, 197, 94, 0.7)"
            >
              <title>{`${formatMonth(d.month)}: Income ${formatCurrency(d.income)}`}</title>
            </rect>
            <rect
              x={x + barWidth * 0.1 + bw + 2}
              y={height - padding - burnH}
              width={bw}
              height={burnH}
              fill={d.burn > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 197, 94, 0.5)'}
            >
              <title>{`${formatMonth(d.month)}: Net ${formatCurrency(d.burn)}`}</title>
            </rect>
            <text
              x={x + barWidth / 2}
              y={height - padding + 16}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.5)"
            >
              {formatMonth(d.month)}
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <rect x={padding} y={8} width={10} height={10} fill="rgba(34, 197, 94, 0.7)" />
      <text x={padding + 14} y={17} fontSize="10" fill="rgba(255,255,255,0.6)">Income</text>
      <rect x={padding + 70} y={8} width={10} height={10} fill="rgba(239, 68, 68, 0.7)" />
      <text x={padding + 84} y={17} fontSize="10" fill="rgba(255,255,255,0.6)">Net Burn</text>
    </svg>
  )
}

// Donut chart for restricted/unrestricted
const FundsDonut = ({ restricted, unrestricted }: { restricted: number; unrestricted: number }) => {
  const total = restricted + unrestricted
  if (total === 0) return <div className="text-white/40 text-sm">No data</div>

  const restrictedPct = restricted / total
  const r = 60
  const circumference = 2 * Math.PI * r
  const restrictedArc = circumference * restrictedPct

  return (
    <div className="flex items-center gap-4">
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={16} />
        <circle
          cx={70} cy={70} r={r} fill="none"
          stroke="rgba(168, 85, 247, 0.8)"
          strokeWidth={16}
          strokeDasharray={`${restrictedArc} ${circumference - restrictedArc}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
        />
        <circle
          cx={70} cy={70} r={r} fill="none"
          stroke="rgba(34, 197, 94, 0.8)"
          strokeWidth={16}
          strokeDasharray={`${circumference - restrictedArc} ${restrictedArc}`}
          strokeDashoffset={circumference / 4 - restrictedArc}
          strokeLinecap="round"
        />
        <text x={70} y={66} textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">
          {formatCurrency(total)}
        </text>
        <text x={70} y={82} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)">
          Total
        </text>
      </svg>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-white/70 text-sm">Restricted {formatCurrency(restricted)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-white/70 text-sm">Unrestricted {formatCurrency(unrestricted)}</span>
        </div>
      </div>
    </div>
  )
}

export default function RunwayPage() {
  const { data, isLoading, error } = useQuery<RunwayData>({
    queryKey: ['finance', 'runway'],
    queryFn: () => fetch('/api/finance/runway').then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-white">Runway</h1>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-6 rounded-lg animate-pulse h-32 bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-4">Runway</h1>
        <div className="glass-card p-6 rounded-lg text-red-400">Failed to load runway data</div>
      </div>
    )
  }

  const rc = runwayColor(data.runwayMonths)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Runway</h1>
        <span className="text-white/40 text-sm">
          Updated {new Date(data.lastUpdated).toLocaleString('en-AU')}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn('glass-card p-6 rounded-lg', rc.bg)}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-2">Runway</p>
              <p className={cn('text-3xl font-bold', rc.text)}>
                {data.runwayMonths > 99 ? '99+' : data.runwayMonths} months
              </p>
              <span className={cn('text-xs mt-1 inline-block px-2 py-0.5 rounded-full', rc.bg, rc.text)}>
                {rc.label}
              </span>
            </div>
            <Clock className={cn('w-8 h-8', rc.text)} />
          </div>
        </div>

        <div className="glass-card p-6 rounded-lg bg-red-500/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-2">Monthly Burn Rate</p>
              <p className="text-3xl font-bold text-red-400">{formatCurrency(data.burnRate)}</p>
            </div>
            <Flame className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-lg bg-blue-500/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-2">Cash Balance</p>
              <p className="text-3xl font-bold text-blue-400">{formatCurrency(data.currentBalance)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-lg bg-purple-500/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-2">Diversification</p>
              <p className="text-3xl font-bold text-purple-400">{data.diversificationIndex}%</p>
              <span className={cn('text-xs mt-1', data.diversificationIndex < 30 ? 'text-red-400' : 'text-white/50')}>
                {data.diversificationIndex < 30 ? 'Concentrated risk' : 'Healthy mix'}
              </span>
            </div>
            <PieChart className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Burn Rate Trend */}
          <div className="glass-card p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Burn Rate Trend (12 Months)</h2>
            <BurnTrendChart data={data.burnTrend} />
          </div>

          {/* Scenario Comparison */}
          {data.scenarios.length > 0 && (
            <div className="glass-card p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Scenario Projections</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.scenarios.map((scenario, i) => {
                  const sc = runwayColor(scenario.runwayMonths)
                  return (
                    <div key={i} className={cn('rounded-lg p-4 border border-white/10', sc.bg)}>
                      <p className="text-white/70 text-sm font-medium mb-2">{scenario.name}</p>
                      <p className={cn('text-2xl font-bold', sc.text)}>
                        {scenario.runwayMonths > 99 ? '99+' : scenario.runwayMonths} mo
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Revenue Sources */}
          <div className="glass-card p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Revenue Sources</h2>
            <div className="space-y-3">
              {data.revenueSources.map((source, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-32 text-white/70 text-sm truncate">{source.source}</div>
                  <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        source.percentage > 30 ? 'bg-red-500/60' : 'bg-blue-500/60'
                      )}
                      style={{ width: `${Math.min(source.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-white/60 text-sm">
                    {formatCurrency(source.amount)}/mo
                  </div>
                  <div className={cn(
                    'w-12 text-right text-sm font-medium',
                    source.percentage > 30 ? 'text-red-400' : 'text-white/60'
                  )}>
                    {source.percentage}%
                  </div>
                </div>
              ))}
            </div>
            {data.revenueSources.some(s => s.percentage > 30) && (
              <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Revenue source over 30% — concentration risk
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Grant Cliff Alerts */}
          <div className="glass-card p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Grant Cliffs
            </h2>
            {data.grantCliffs.length === 0 ? (
              <p className="text-white/40 text-sm">No grant cliffs detected</p>
            ) : (
              <div className="space-y-3">
                {data.grantCliffs.slice(0, 8).map((cliff, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                      cliff.daysRemaining <= 30 ? 'bg-red-500' :
                      cliff.daysRemaining <= 90 ? 'bg-amber-500' : 'bg-emerald-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-medium truncate">{cliff.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white/50 text-xs">{cliff.projectCode}</span>
                        <span className="text-white/30">·</span>
                        <span className="text-white/50 text-xs">{formatCurrency(cliff.amount)}</span>
                      </div>
                      <p className={cn(
                        'text-xs mt-1',
                        cliff.daysRemaining <= 30 ? 'text-red-400' :
                        cliff.daysRemaining <= 90 ? 'text-amber-400' : 'text-white/40'
                      )}>
                        {cliff.daysRemaining <= 0 ? 'Expired' : `${cliff.daysRemaining}d remaining`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Restricted / Unrestricted Funds */}
          <div className="glass-card p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Fund Allocation
            </h2>
            <FundsDonut restricted={data.restrictedFunds} unrestricted={data.unrestrictedFunds} />
          </div>

          {/* Fundraising Pipeline */}
          <div className="glass-card p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Fundraising Pipeline</h2>
            {data.fundraisingPipeline.length === 0 ? (
              <p className="text-white/40 text-sm">No active fundraising</p>
            ) : (
              <div className="space-y-2">
                {data.fundraisingPipeline.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5">
                    <div className="min-w-0">
                      <p className="text-white/80 text-sm truncate">{item.name}</p>
                      <p className="text-white/40 text-xs">{item.projectCode}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-white/70 text-sm font-medium">{formatCurrency(item.amount)}</p>
                      <p className="text-white/40 text-xs capitalize">{item.status}</p>
                    </div>
                  </div>
                ))}
                <p className="text-white/50 text-sm font-medium pt-2 border-t border-white/10">
                  Total: {formatCurrency(data.fundraisingPipeline.reduce((s, f) => s + f.amount, 0))}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
