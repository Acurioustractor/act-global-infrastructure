'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
  Rocket,
  TrendingUp,
  Zap,
  FlaskConical,
  Plus,
  ChevronDown,
  ChevronRight,
  Target,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award
} from 'lucide-react'

interface Initiative {
  id: string
  title: string
  type: 'product' | 'market' | 'partnership' | 'capability' | 'research' | 'experiment'
  status: 'ideation' | 'validating' | 'building' | 'testing' | 'launched' | 'completed' | 'archived'
  progress: number
  expected_revenue: number
  owner: string
  description: string
  hypothesis?: string
  created_at: string
}

interface RevenueStream {
  id: string
  initiative_id: string
  month: string
  projected_revenue: number
}

interface Metric {
  activeInitiatives: number
  totalRDSpend: number
  expectedRevenueImpact: number
  successRate: number
  experimentsRunning: number
}

const EMPTY_METRICS: Metric = {
  activeInitiatives: 0,
  totalRDSpend: 0,
  expectedRevenueImpact: 0,
  successRate: 0,
  experimentsRunning: 0
}

export default function BusinessDevPage() {
  const [expandForm, setExpandForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    type: 'product' as const,
    description: '',
    hypothesis: '',
    expectedRevenue: '',
    targetLaunchDate: ''
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['business-dev'],
    queryFn: async () => {
      const response = await fetch('/api/business-dev')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    },
    staleTime: 5 * 60 * 1000
  })

  const initiatives: Initiative[] = data?.initiatives || []
  const metrics: Metric = data?.metrics || EMPTY_METRICS

  const typeColors: Record<Initiative['type'], string> = {
    product: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    market: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    partnership: 'bg-green-500/20 text-green-300 border-green-500/30',
    capability: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    research: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    experiment: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  }

  const statusColors: Record<Initiative['status'], string> = {
    ideation: 'bg-gray-500/20 text-gray-300',
    validating: 'bg-yellow-500/20 text-yellow-300',
    building: 'bg-blue-500/20 text-blue-300',
    testing: 'bg-purple-500/20 text-purple-300',
    launched: 'bg-green-500/20 text-green-300',
    completed: 'bg-emerald-500/20 text-emerald-300',
    archived: 'bg-gray-600/20 text-gray-400'
  }

  const handleSubmitInitiative = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/business-dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (response.ok) {
        setFormData({
          title: '',
          type: 'product',
          description: '',
          hypothesis: '',
          expectedRevenue: '',
          targetLaunchDate: ''
        })
        setExpandForm(false)
      }
    } catch (error) {
      console.error('Error submitting initiative:', error)
    }
  }

  const groupedInitiatives = {
    ideation: initiatives.filter(i => i.status === 'ideation'),
    validating: initiatives.filter(i => i.status === 'validating'),
    building: initiatives.filter(i => i.status === 'building'),
    testing: initiatives.filter(i => i.status === 'testing'),
    launched: initiatives.filter(i => i.status === 'launched')
  }

  const typeDistribution = {
    product: initiatives.filter(i => i.type === 'product').length,
    market: initiatives.filter(i => i.type === 'market').length,
    partnership: initiatives.filter(i => i.type === 'partnership').length,
    capability: initiatives.filter(i => i.type === 'capability').length,
    research: initiatives.filter(i => i.type === 'research').length,
    experiment: initiatives.filter(i => i.type === 'experiment').length
  }

  const totalBudgeted = 600000
  const totalSpent = metrics.totalRDSpend

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="w-8 h-8 text-amber-400" />
            <h1 className="text-4xl font-bold text-white">Business Development & R&D</h1>
          </div>
          <p className="text-gray-400">Manage initiatives, track revenue impact, and monitor experiments</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Active Initiatives</span>
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-bold">{metrics.activeInitiatives}</div>
            <p className="text-sm text-gray-400 mt-1">Across all stages</p>
          </div>

          <div className="glass-card p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">R&D Investment</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-3xl font-bold">${(metrics.totalRDSpend / 1000).toFixed(0)}k</div>
            <p className="text-sm text-gray-400 mt-1">Allocated this quarter</p>
          </div>

          <div className="glass-card p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Revenue Impact</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold">${(metrics.expectedRevenueImpact / 1000).toFixed(0)}k</div>
            <p className="text-sm text-gray-400 mt-1">Expected within 12 months</p>
          </div>

          <div className="glass-card p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Experiments Running</span>
              <FlaskConical className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold">{metrics.experimentsRunning}</div>
            <p className="text-sm text-gray-400 mt-1">Active experiments</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          {/* Left Content - 8 cols */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Initiative Pipeline - Kanban */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                Initiative Pipeline
              </h2>
              {initiatives.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-400 text-sm">No initiatives found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-4">
                  {(['ideation', 'validating', 'building', 'testing', 'launched'] as const).map((status) => (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-300 capitalize">
                          {status === 'validating' ? 'Validating' : status}
                        </h3>
                        <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">
                          {groupedInitiatives[status].length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {groupedInitiatives[status].map((initiative) => (
                          <div
                            key={initiative.id}
                            className={cn(
                              'p-4 rounded-lg border backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-all',
                              'bg-white/5 border-white/10'
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-semibold text-white line-clamp-2">
                                {initiative.title}
                              </h4>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className={cn(
                                'text-xs px-2 py-1 rounded border capitalize',
                                typeColors[initiative.type]
                              )}>
                                {initiative.type}
                              </span>
                            </div>
                            <div className="mb-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-400">Progress</span>
                                <span className="text-xs text-gray-300 font-semibold">{initiative.progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                  style={{ width: `${initiative.progress}%` }}
                                />
                              </div>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 text-gray-400">
                                <DollarSign className="w-3 h-3 text-amber-400" />
                                <span>${(initiative.expected_revenue / 1000).toFixed(0)}k expected</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-400">
                                <Users className="w-3 h-3 text-blue-400" />
                                <span>{initiative.owner}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue Impact Tracker */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                12-Month Revenue Projection
              </h2>
              {initiatives.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-400 text-sm">No revenue projection data available.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { month: 'Month 1', revenue: 45000, color: 'bg-blue-500' },
                    { month: 'Month 2', revenue: 75000, color: 'bg-blue-500' },
                    { month: 'Month 3', revenue: 95000, color: 'bg-purple-500' },
                    { month: 'Month 4', revenue: 125000, color: 'bg-purple-500' },
                    { month: 'Month 5', revenue: 160000, color: 'bg-green-500' },
                    { month: 'Month 6', revenue: 210000, color: 'bg-green-500' },
                    { month: 'Month 7', revenue: 235000, color: 'bg-amber-500' },
                    { month: 'Month 8', revenue: 260000, color: 'bg-amber-500' },
                    { month: 'Month 9', revenue: 310000, color: 'bg-emerald-500' },
                    { month: 'Month 10', revenue: 380000, color: 'bg-emerald-500' },
                    { month: 'Month 11', revenue: 450000, color: 'bg-cyan-500' },
                    { month: 'Month 12', revenue: 520000, color: 'bg-cyan-500' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="text-xs text-gray-400 w-16 text-right">{item.month}</span>
                      <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden border border-white/10">
                        <div
                          className={cn('h-full', item.color)}
                          style={{ width: `${(item.revenue / 600000) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-white w-20 text-right">
                        ${(item.revenue / 1000).toFixed(0)}k
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Experiment Log */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-cyan-400" />
                Active Experiments
              </h2>
              {metrics.experimentsRunning === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-400 text-sm">No active experiments.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      id: '1',
                      title: 'Subscription Retention Test',
                      hypothesis: 'Weekly emails increase retention by 15%',
                      criteria: 'Reduce churn to <5% monthly',
                      status: 'running',
                      learnings: 'Open rate 32%, needs subject line testing'
                    },
                    {
                      id: '2',
                      title: 'Pricing Elasticity Study',
                      hypothesis: 'Premium tier at $99/mo captures 20% market',
                      criteria: 'Hit $40k MRR within 60 days',
                      status: 'running',
                      learnings: 'Early adoption from enterprise segment'
                    },
                    {
                      id: '3',
                      title: 'Content Distribution Channels',
                      hypothesis: 'TikTok drives 3x engagement vs Instagram',
                      criteria: 'Achieve 10k followers with <$1 CAC',
                      status: 'running',
                      learnings: 'Video format performs 5x better'
                    }
                  ].map((exp) => (
                    <div key={exp.id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-white text-sm">{exp.title}</h3>
                        <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 capitalize">
                          {exp.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs mb-4">
                        <div>
                          <span className="text-gray-400">Hypothesis:</span>
                          <p className="text-gray-300 mt-1">{exp.hypothesis}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Success Criteria:</span>
                          <p className="text-gray-300 mt-1">{exp.criteria}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Learning:</span>
                          <p className="text-amber-300 mt-1">{exp.learnings}</p>
                        </div>
                      </div>
                      <button className="w-full px-3 py-2 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all">
                        Record Learning
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* New Initiative Form */}
            <div className="glass-card p-6">
              <button
                onClick={() => setExpandForm(!expandForm)}
                className="w-full flex items-center justify-between text-white font-semibold hover:text-amber-400 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  New Initiative
                </span>
                <ChevronDown className={cn('w-5 h-5 transition-transform', expandForm && 'rotate-180')} />
              </button>

              {expandForm && (
                <form onSubmit={handleSubmitInitiative} className="mt-6 pt-6 border-t border-white/10 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Initiative Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Sustainable Packaging Initiative"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="product">Product</option>
                        <option value="market">Market Expansion</option>
                        <option value="partnership">Partnership</option>
                        <option value="capability">Capability Building</option>
                        <option value="research">Research</option>
                        <option value="experiment">Experiment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Expected Revenue ($)</label>
                      <input
                        type="number"
                        value={formData.expectedRevenue}
                        onChange={(e) => setFormData({ ...formData, expectedRevenue: e.target.value })}
                        placeholder="50000"
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the initiative..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Hypothesis</label>
                    <textarea
                      value={formData.hypothesis}
                      onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
                      placeholder="What assumption are we testing?"
                      rows={2}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Target Launch Date</label>
                    <input
                      type="date"
                      value={formData.targetLaunchDate}
                      onChange={(e) => setFormData({ ...formData, targetLaunchDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                    >
                      Create Initiative
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandForm(false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Sidebar - 4 cols */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Type Distribution */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                Initiative Types
              </h3>
              <div className="space-y-3">
                {Object.entries(typeDistribution).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 capitalize">{type}</span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white font-semibold text-sm">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Summary */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Budget Status
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Allocated</span>
                    <span className="text-sm font-semibold text-white">${(totalSpent / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      style={{ width: `${(totalSpent / totalBudgeted) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    of ${(totalBudgeted / 1000).toFixed(0)}k total budget
                  </p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-400 mb-2">Remaining: ${((totalBudgeted - totalSpent) / 1000).toFixed(0)}k</p>
                  <div className="text-sm font-semibold text-amber-400">
                    {Math.round((totalSpent / totalBudgeted) * 100)}% utilization
                  </div>
                </div>
              </div>
            </div>

            {/* Key Learnings */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                Key Learnings
              </h3>
              {initiatives.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-gray-400 text-sm">No learnings recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Learnings would be populated from API data */}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-semibold text-sm transition-all flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Experiment
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold text-sm transition-all flex items-center justify-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Record Learning
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-semibold text-sm transition-all flex items-center justify-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Review Pipeline
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
