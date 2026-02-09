'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface APIRevenueStream {
  id: string
  name: string
  source_type: string
  project_code: string
  target_monthly: number
  projected_revenue: number
  is_active: boolean
  created_at: string
}

interface APIPipelineItem {
  id: string
  name: string
  funder: string
  type: string
  amount: number
  probability: number
  status: 'identified' | 'applying' | 'submitted' | 'approved' | 'declined'
  expected_date: string
  notes: string
  created_at: string
}

interface APIRevenueEntry {
  id: string
  stream_id: string
  amount: number
  month: string
  notes: string
  created_at: string
}

interface APIRevenueData {
  streams: APIRevenueStream[]
  entries: APIRevenueEntry[]
  pipeline: APIPipelineItem[]
  metrics: {
    totalMonthly: number
    fastestGrowing: { name: string; growthRate: number; [key: string]: any } | null
    onTarget: number
    pipelineValue: number
  }
}

// Transformed types for UI
interface RevenueStream {
  id: string
  name: string
  monthlyAmount: number
  target: number
  color: string
}

interface PipelineItem {
  id: string
  name: string
  source: string
  amount: number
  status: 'identified' | 'applying' | 'submitted' | 'approved' | 'declined'
  probability: number
  expectedDate: string
}

interface RevenueData {
  totalMonthlyRevenue: number
  fastestGrowingStream: { name: string; growthRate: number } | null
  streamsOnTarget: number
  pipelineValue: number
  streams: RevenueStream[]
  monthlyData: {
    month: string
    [key: string]: number | string
  }[]
  pipelineItems: PipelineItem[]
  isEmpty: boolean
}

const COLORS = ['#10B981', '#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899', '#EF4444']

const transformAPIResponse = (apiData: APIRevenueData): RevenueData => {
  // Calculate current month total for each stream
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const streamsWithAmounts: RevenueStream[] = apiData.streams.map((stream, index) => ({
    id: stream.id,
    name: stream.name,
    monthlyAmount: stream.projected_revenue || stream.target_monthly || 0,
    target: stream.target_monthly || 0,
    color: COLORS[index % COLORS.length]
  }))

  const totalMonthly = streamsWithAmounts.reduce((sum, s) => sum + s.monthlyAmount, 0)
  const onTarget = streamsWithAmounts.filter(s => s.monthlyAmount >= s.target).length

  // Generate monthly data - use entries to build history
  const monthlyData = generateMonthlyData(apiData.entries, streamsWithAmounts)

  const transformedPipeline: PipelineItem[] = apiData.pipeline.map(item => ({
    id: item.id,
    name: item.name,
    source: item.funder,
    amount: item.amount,
    status: item.status,
    probability: item.probability,
    expectedDate: item.expected_date
  }))

  const isEmpty = apiData.streams.length === 0 && apiData.pipeline.length === 0

  return {
    totalMonthlyRevenue: totalMonthly,
    fastestGrowingStream: apiData.metrics.fastestGrowing || null,
    streamsOnTarget: onTarget,
    pipelineValue: apiData.metrics.pipelineValue,
    streams: streamsWithAmounts,
    monthlyData,
    pipelineItems: transformedPipeline,
    isEmpty
  }
}

const generateMonthlyData = (entries: APIRevenueEntry[], streams: RevenueStream[]) => {
  // Group entries by month
  const monthlyMap = new Map<string, Record<string, number>>()

  entries.forEach(entry => {
    const date = new Date(entry.month)
    const monthKey = date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {})
    }

    const streamName = streams.find(s => s.id === entry.stream_id)?.name || 'Unknown'
    const current = monthlyMap.get(monthKey) || {}
    current[streamName] = (current[streamName] || 0) + entry.amount
    monthlyMap.set(monthKey, current)
  })

  // Convert to array and sort by date
  const data = Array.from(monthlyMap.entries())
    .map(([monthKey, amounts]) => ({
      month: monthKey,
      ...amounts
    }))
    .slice(-6) // Last 6 months

  // If no data, return empty array for empty state
  return data.length > 0 ? data : []
}

const STATUS_CONFIG = {
  identified: { label: 'Identified', color: '#6B7280', bgColor: 'bg-gray-500/10' },
  applying: { label: 'Applying', color: '#3B82F6', bgColor: 'bg-blue-500/10' },
  submitted: { label: 'Submitted', color: '#F59E0B', bgColor: 'bg-amber-500/10' },
  approved: { label: 'Approved', color: '#10B981', bgColor: 'bg-green-500/10' },
  declined: { label: 'Declined', color: '#EF4444', bgColor: 'bg-red-500/10' },
}

export default function RevenueStreamsPage() {
  const [showAddPipeline, setShowAddPipeline] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    source: '',
    amount: '',
    status: 'identified' as const,
    probability: '50',
    expectedDate: ''
  })

  const { data: apiData, isLoading, error } = useQuery<APIRevenueData>({
    queryKey: ['revenue-streams'],
    queryFn: async () => {
      const response = await fetch('/api/revenue-streams')
      if (!response.ok) throw new Error('Failed to fetch revenue data')
      return response.json()
    },
    staleTime: 1000 * 60 * 5,
  })

  const revenueData = apiData ? transformAPIResponse(apiData) : {
    totalMonthlyRevenue: 0,
    fastestGrowingStream: null,
    streamsOnTarget: 0,
    pipelineValue: 0,
    streams: [],
    monthlyData: [],
    pipelineItems: [],
    isEmpty: true
  }

  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  const maxMonthlyValue = revenueData.monthlyData.length > 0 ? Math.max(
    ...revenueData.monthlyData.map(m =>
      Object.entries(m)
        .filter(([k]) => k !== 'month')
        .reduce((sum, [, v]) => sum + (v as number), 0)
    )
  ) : 1

  const streamTotals = revenueData.streams.reduce((acc, stream) => {
    acc[stream.id] = stream.monthlyAmount
    return acc
  }, {} as Record<string, number>)

  const totalRevenue = Object.values(streamTotals).reduce((a, b) => a + b, 0)

  const handleAddPipeline = (e: React.FormEvent) => {
    e.preventDefault()
    setShowAddPipeline(false)
    setFormData({
      name: '',
      source: '',
      amount: '',
      status: 'identified',
      probability: '50',
      expectedDate: ''
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading revenue data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Revenue Streams</h1>
          </div>
          <p className="text-gray-400">Track income across all revenue sources</p>
        </div>

        {/* Empty State */}
        {revenueData.isEmpty && (
          <div className="glass-card p-12 text-center">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No revenue data yet</h2>
            <p className="text-gray-400 mb-6">Run Xero sync to populate revenue streams and entries</p>
            <button className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium">
              Sync from Xero
            </button>
          </div>
        )}

        {!revenueData.isEmpty && (
          <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">Total Monthly Revenue</p>
                <p className="text-2xl font-bold text-white">{formatter.format(revenueData.totalMonthlyRevenue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">Fastest Growing Stream</p>
                <p className="text-2xl font-bold text-white">{revenueData.fastestGrowingStream?.name ?? 'N/A'}</p>
                {revenueData.fastestGrowingStream && (
                <p className="text-emerald-400 text-sm mt-1">+{revenueData.fastestGrowingStream.growthRate.toFixed(1)}%</p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">Streams On Target</p>
                <p className="text-2xl font-bold text-white">{revenueData.streamsOnTarget} / {revenueData.streams.length}</p>
                <p className="text-amber-400 text-sm mt-1">{revenueData.streams.length > 0 ? Math.round((revenueData.streamsOnTarget / revenueData.streams.length) * 100) : 0}% on track</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/20">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">Pipeline Value</p>
                <p className="text-2xl font-bold text-white">{formatter.format(revenueData.pipelineValue)}</p>
                <p className="text-purple-400 text-sm mt-1">{revenueData.pipelineItems.length} opportunities</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/20">
                <AlertCircle className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Monthly Revenue Chart */}
            <div className="glass-card p-6 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-6">Revenue by Stream (Last 6 Months)</h2>
              <div className="space-y-4">
                {revenueData.monthlyData.map((monthData) => {
                  const monthTotal = Object.entries(monthData)
                    .filter(([k]) => k !== 'month')
                    .reduce((sum, [, v]) => sum + (v as number), 0)

                  return (
                    <div key={monthData.month}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-300">{monthData.month}</span>
                        <span className="text-sm text-gray-400">{formatter.format(monthTotal)}</span>
                      </div>
                      <div className="flex h-8 rounded-lg overflow-hidden gap-0.5 bg-slate-800/50">
                        {revenueData.streams.map((stream) => {
                          const value = (monthData[stream.name] || monthData[stream.id]) as number || 0
                          const percentage = (value / maxMonthlyValue) * 100
                          return (
                            <div
                              key={stream.id}
                              className="relative group"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: stream.color,
                              }}
                              title={`${stream.name}: ${formatter.format(value)}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
                {revenueData.streams.map((stream) => (
                  <div key={stream.id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: stream.color }}
                    />
                    <span className="text-sm text-gray-400">{stream.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Streams Cards */}
            <div className="glass-card p-6 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-6">Stream Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {revenueData.streams.map((stream) => {
                  const onTarget = stream.monthlyAmount >= stream.target
                  const percentOfTarget = (stream.target > 0) ? (stream.monthlyAmount / stream.target) * 100 : 0

                  return (
                    <div
                      key={stream.id}
                      className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-white mb-2">{stream.name}</h3>
                          <p className="text-2xl font-bold text-white">{formatter.format(stream.monthlyAmount)}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400">Target: {formatter.format(stream.target)}</span>
                            <span className="text-xs text-gray-400">{Math.round(percentOfTarget)}%</span>
                          </div>
                          <div className="w-full bg-slate-800/50 rounded-full h-2">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(percentOfTarget, 100)}%`,
                                backgroundColor: onTarget ? '#10B981' : '#F59E0B',
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          {onTarget ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>On target</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-amber-400" />
                              <span>{formatter.format(stream.target - stream.monthlyAmount)} to target</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Fundraising Pipeline */}
            <div className="glass-card p-6 rounded-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Fundraising Pipeline</h2>
                <button
                  onClick={() => setShowAddPipeline(!showAddPipeline)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {showAddPipeline && (
                <form onSubmit={handleAddPipeline} className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Opportunity Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 rounded bg-slate-700/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        placeholder="e.g., Community Garden Grant"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Source</label>
                      <input
                        type="text"
                        value={formData.source}
                        onChange={(e) => setFormData({...formData, source: e.target.value})}
                        className="w-full px-3 py-2 rounded bg-slate-700/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        placeholder="e.g., Department of Environment"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount (AUD)</label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full px-3 py-2 rounded bg-slate-700/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Expected Date</label>
                      <input
                        type="date"
                        value={formData.expectedDate}
                        onChange={(e) => setFormData({...formData, expectedDate: e.target.value})}
                        className="w-full px-3 py-2 rounded bg-slate-700/50 border border-white/10 text-white focus:outline-none focus:border-white/20"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-sm font-medium"
                    >
                      Add to Pipeline
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddPipeline(false)}
                      className="px-4 py-2 rounded-lg bg-slate-700/50 text-gray-400 hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Opportunity</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Source</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Probability</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Expected Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {revenueData.pipelineItems.map((item) => {
                      const config = STATUS_CONFIG[item.status]
                      return (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 text-white font-medium">{item.name}</td>
                          <td className="py-4 px-4 text-gray-400">{item.source}</td>
                          <td className="py-4 px-4 text-white font-medium">{formatter.format(item.amount)}</td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bgColor}`}
                              style={{ color: config.color }}
                            >
                              {config.label}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-800/50 rounded-full h-1.5">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${item.probability * 100}%`,
                                    backgroundColor: item.probability > 0.7 ? '#10B981' : item.probability > 0.4 ? '#F59E0B' : '#EF4444'
                                  }}
                                />
                              </div>
                              <span className="text-gray-400">{Math.round(item.probability * 100)}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-400">{new Date(item.expectedDate).toLocaleDateString('en-AU')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Revenue Mix */}
            <div className="glass-card p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-6">Revenue Mix</h3>
              <div className="space-y-4">
                {revenueData.streams.map((stream) => {
                  const percentage = totalRevenue > 0 ? (stream.monthlyAmount / totalRevenue) * 100 : 0
                  return (
                    <div key={stream.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">{stream.name}</span>
                        <span className="text-sm font-semibold text-white">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800/50 rounded-full h-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: stream.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Growth Insights */}
            <div className="glass-card p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4">Fastest Growing Stream</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 px-3 rounded bg-emerald-500/10">
                  <span className="text-sm text-gray-300">{revenueData.fastestGrowingStream?.name ?? 'N/A'}</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  {revenueData.streams.length} active revenue streams tracked
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="glass-card p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4">Key Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-sm text-gray-400">Avg. Stream Value</span>
                  <span className="text-white font-semibold">{formatter.format(totalRevenue / revenueData.streams.length)}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-sm text-gray-400">Total Under Target</span>
                  <span className="text-amber-400 font-semibold">
                    {formatter.format(
                      revenueData.streams
                        .filter(s => s.monthlyAmount < s.target)
                        .reduce((sum, s) => sum + (s.target - s.monthlyAmount), 0)
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-400">Weighted Pipeline</span>
                  <span className="text-purple-400 font-semibold">
                    {formatter.format(
                      revenueData.pipelineItems.reduce((sum, item) => sum + (item.amount * item.probability), 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
