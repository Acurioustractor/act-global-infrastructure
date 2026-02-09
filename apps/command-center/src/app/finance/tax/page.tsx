'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign,
  Download,
  Calculator,
  Building2,
  PieChart,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BASLabel {
  label: string
  amount: number
  description: string
}

interface TaxData {
  quarter: string
  basLabels: Record<string, BASLabel>
  gstSummary: { collected: number; paid: number; net: number }
  acncRevenue: Array<{ category: string; amount: number; percentage: number }>
  acncExpenses: Array<{ category: string; amount: number; percentage: number }>
  entitySelector: string[]
  lastUpdated: string
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

function generateQuarterOptions(): string[] {
  const options: string[] = []
  const now = new Date()
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
    const q = Math.floor(d.getMonth() / 3) + 1
    options.push(`${d.getFullYear()}-Q${q}`)
  }
  return [...new Set(options)]
}

// Revenue donut
const RevenueDonut = ({ data }: { data: TaxData['acncRevenue'] }) => {
  if (data.length === 0) return <p className="text-white/40 text-sm">No revenue data</p>

  const colors = ['rgba(34, 197, 94, 0.8)', 'rgba(168, 85, 247, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)']
  const total = data.reduce((s, d) => s + d.amount, 0)
  const r = 55
  const circumference = 2 * Math.PI * r
  let offset = -circumference / 4

  return (
    <div className="flex items-center gap-4">
      <svg width={130} height={130} viewBox="0 0 130 130">
        {data.map((d, i) => {
          const arc = (d.amount / total) * circumference
          const el = (
            <circle
              key={i}
              cx={65} cy={65} r={r}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={14}
              strokeDasharray={`${arc} ${circumference - arc}`}
              strokeDashoffset={-offset}
            />
          )
          offset += arc
          return el
        })}
        <text x={65} y={62} textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">
          {formatCurrency(total)}
        </text>
        <text x={65} y={76} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)">
          Total Revenue
        </text>
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-white/70 text-xs">{d.category} ({d.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TaxPage() {
  const quarterOptions = generateQuarterOptions()
  const [selectedQuarter, setSelectedQuarter] = useState(quarterOptions[0])
  const [selectedEntity, setSelectedEntity] = useState(0)

  const { data, isLoading } = useQuery<TaxData>({
    queryKey: ['finance', 'tax', selectedQuarter],
    queryFn: () => fetch(`/api/finance/tax?quarter=${selectedQuarter}`).then(r => r.json()),
  })

  const handleExport = () => {
    window.open(`/api/finance/tax/export?quarter=${selectedQuarter}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-white">Tax & BAS</h1>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 glass-card rounded-lg animate-pulse bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  const basLabels = data?.basLabels || {}
  const gst = data?.gstSummary || { collected: 0, paid: 0, net: 0 }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Tax & BAS</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedQuarter}
            onChange={e => setSelectedQuarter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            {quarterOptions.map(q => (
              <option key={q} value={q} className="bg-gray-900">{q}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 rounded-lg bg-blue-500/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-2">Net GST</p>
              <p className={cn('text-3xl font-bold', gst.net >= 0 ? 'text-blue-400' : 'text-emerald-400')}>
                {formatCurrency(Math.abs(gst.net))}
              </p>
              <p className="text-white/40 text-xs mt-1">{gst.net >= 0 ? 'Payable to ATO' : 'Refund due'}</p>
            </div>
            <Calculator className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-lg bg-emerald-500/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-2">Total Sales</p>
              <p className="text-3xl font-bold text-emerald-400">
                {formatCurrency(basLabels.G1?.amount || 0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-lg bg-amber-500/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-2">Total Wages</p>
              <p className="text-3xl font-bold text-amber-400">
                {formatCurrency(basLabels.W1?.amount || 0)}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* BAS Labels Table */}
          <div className="glass-card p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-400" />
              BAS Labels — {selectedQuarter}
            </h2>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left text-xs font-medium text-white/40 uppercase px-4 py-2 w-16">Label</th>
                    <th className="text-left text-xs font-medium text-white/40 uppercase px-4 py-2">Description</th>
                    <th className="text-right text-xs font-medium text-white/40 uppercase px-4 py-2 w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(basLabels).map(([code, bas]) => (
                    <tr key={code} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-sm font-mono font-bold text-blue-400">{code}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white">{bas.label}</p>
                        <p className="text-xs text-white/40">{bas.description}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/80 text-right tabular-nums font-medium">
                        {formatCurrency(bas.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GST Reconciliation */}
          <div className="glass-card p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-purple-400" />
              GST Reconciliation
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 px-4 rounded-lg bg-white/5">
                <span className="text-white/70">1A: GST Collected on Sales</span>
                <span className="text-emerald-400 font-medium tabular-nums">{formatCurrency(gst.collected)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-4 rounded-lg bg-white/5">
                <span className="text-white/70">1B: GST Paid on Purchases</span>
                <span className="text-red-400 font-medium tabular-nums">({formatCurrency(gst.paid)})</span>
              </div>
              <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-white/10 border border-white/20">
                <span className="text-white font-semibold">Net GST {gst.net >= 0 ? 'Payable' : 'Refund'}</span>
                <span className={cn('text-lg font-bold tabular-nums', gst.net >= 0 ? 'text-blue-400' : 'text-emerald-400')}>
                  {formatCurrency(Math.abs(gst.net))}
                </span>
              </div>
            </div>
          </div>

          {/* ACNC Revenue/Expense Breakdown */}
          <div className="glass-card p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-amber-400" />
              ACNC Revenue & Expense Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue */}
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-3">Revenue by Source</h3>
                <div className="space-y-2">
                  {(data?.acncRevenue || []).map((r, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/70">{r.category}</span>
                          <span className="text-white/50">{r.percentage}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${r.percentage}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-white/60 w-20 text-right tabular-nums">{formatCurrency(r.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expenses */}
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-3">Expenses by Category</h3>
                <div className="space-y-2">
                  {(data?.acncExpenses || []).map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/70">{e.category}</span>
                          <span className="text-white/50">{e.percentage}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${e.percentage}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-white/60 w-20 text-right tabular-nums">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Revenue Donut (ACNC format) */}
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-sm font-semibold text-white mb-4">Revenue Mix (ACNC)</h3>
            <RevenueDonut data={data?.acncRevenue || []} />
          </div>

          {/* Entity Selector */}
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              Entity
            </h3>
            <div className="space-y-2">
              {(data?.entitySelector || []).map((entity, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedEntity(i)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedEntity === i
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  )}
                >
                  {entity}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleExport}
                className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export {selectedQuarter} CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
