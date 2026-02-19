'use client'

import { useQuery } from '@tanstack/react-query'
import {
  FlaskConical,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  ExternalLink,
  Calendar,
  TrendingUp,
  Building2,
  FileSearch,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Deadline {
  name: string
  date: string
  description: string
  daysUntil: number
  status: 'overdue' | 'urgent' | 'upcoming' | 'future'
}

interface FYSpend {
  software: number
  hardware: number
  product: number
  travel: number
  operations: number
  total: number
}

interface ProjectSpend {
  code: string
  name: string
  rdSpend: number
  totalSpend: number
  rdPct: number
}

interface TopVendor {
  vendor: string
  project: string
  category: string
  spend: number
  rdEligible: boolean
}

interface ActionItem {
  task: string
  status: 'done' | 'in_progress' | 'pending' | 'overdue'
  dueDate?: string
  category: string
}

interface RdTrackingData {
  deadlines: Deadline[]
  spendByFY: Record<string, FYSpend>
  spendByProject: ProjectSpend[]
  topVendors: TopVendor[]
  actionChecklist: ActionItem[]
  offset43pct: { fy2425: number; fy2526: number; combined: number }
  taggingCoverage: Record<string, { total: number; tagged: number; pct: number }>
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(amount)
}

const statusConfig = {
  overdue: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Overdue' },
  urgent: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', label: 'Urgent' },
  upcoming: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', label: 'Upcoming' },
  future: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', border: 'border-zinc-500/30', label: 'Future' },
  done: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Done' },
  in_progress: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', label: 'In Progress' },
  pending: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', border: 'border-zinc-500/30', label: 'Pending' },
}

export default function RdTrackingPage() {
  const { data, isLoading } = useQuery<RdTrackingData>({
    queryKey: ['rd-tracking'],
    queryFn: () => fetch('/api/finance/rd-tracking').then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  const deadlines = data?.deadlines || []
  const spendByFY = data?.spendByFY || {}
  const spendByProject = data?.spendByProject || []
  const topVendors = data?.topVendors || []
  const checklist = data?.actionChecklist || []
  const offset = data?.offset43pct || { fy2425: 0, fy2526: 0, combined: 0 }
  const coverage = data?.taggingCoverage || {}

  // Find most urgent deadline
  const urgentDeadline = deadlines.find(d => d.status === 'overdue' || d.status === 'urgent')

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-lime-400" />
          R&D Tax Incentive Tracking
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          43.5% refundable tax offset on eligible R&D expenditure — FY2024-25 &amp; FY2025-26
        </p>
      </div>

      {/* Row 1: Deadline Alert Banner */}
      {urgentDeadline && (
        <div className={cn(
          'rounded-lg border p-4 flex items-center justify-between',
          urgentDeadline.status === 'overdue'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        )}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={cn(
              'h-5 w-5',
              urgentDeadline.status === 'overdue' ? 'text-red-400' : 'text-amber-400'
            )} />
            <div>
              <div className={cn(
                'font-medium',
                urgentDeadline.status === 'overdue' ? 'text-red-300' : 'text-amber-300'
              )}>
                {urgentDeadline.daysUntil < 0
                  ? `${Math.abs(urgentDeadline.daysUntil)} days overdue`
                  : `${urgentDeadline.daysUntil} days until ${urgentDeadline.name}`}
              </div>
              <div className="text-sm text-zinc-400">{urgentDeadline.description}</div>
            </div>
          </div>
          <div className={cn(
            'text-sm font-mono px-3 py-1 rounded',
            urgentDeadline.status === 'overdue' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
          )}>
            {new Date(urgentDeadline.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )}

      {/* Row 2: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Potential Offset */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="text-xs uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            Potential R&D Offset
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            {formatCurrency(offset.combined)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">43.5% of combined R&D spend</div>
        </div>

        {/* FY2024-25 Spend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="text-xs uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            FY2024-25 R&D Spend
          </div>
          <div className="text-3xl font-bold text-blue-400">
            {formatCurrency(spendByFY['FY2024-25']?.total || 0)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Offset: {formatCurrency(offset.fy2425)}
          </div>
        </div>

        {/* FY2025-26 Spend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="text-xs uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-purple-400" />
            FY2025-26 R&D Spend
          </div>
          <div className="text-3xl font-bold text-purple-400">
            {formatCurrency(spendByFY['FY2025-26']?.total || 0)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Offset: {formatCurrency(offset.fy2526)}
          </div>
        </div>

        {/* Tagging Coverage */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="text-xs uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
            <FileSearch className="h-3.5 w-3.5 text-cyan-400" />
            Tagging Coverage
          </div>
          <div className="text-3xl font-bold text-cyan-400">
            {coverage.fy2025?.pct || 0}% / {coverage.fy2026?.pct || 0}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">FY24-25 / FY25-26 transactions tagged</div>
        </div>
      </div>

      {/* Row 3: Project Spend + Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* R&D Spend by Project */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-lime-400" />
              R&D Spend by Project
            </h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
            {spendByProject.map(project => {
              const maxSpend = spendByProject[0]?.rdSpend || 1
              return (
                <div key={project.code} className="p-3 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-zinc-500">{project.code}</span>
                      <span className="text-sm text-zinc-200 truncate">{project.name}</span>
                    </div>
                    <div className="text-sm font-medium text-zinc-200 flex-shrink-0">
                      {formatCurrency(project.rdSpend)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime-500/60 rounded-full transition-all"
                        style={{ width: `${(project.rdSpend / maxSpend) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 flex-shrink-0 w-10 text-right">
                      {project.rdPct}%
                    </span>
                  </div>
                </div>
              )
            })}
            {spendByProject.length === 0 && (
              <div className="p-6 text-center text-zinc-500 text-sm">
                No R&D spend data found
              </div>
            )}
          </div>
        </div>

        {/* Key Deadlines & Milestones */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Key Deadlines &amp; Milestones
            </h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {deadlines.map(deadline => {
              const config = statusConfig[deadline.status]
              return (
                <div key={deadline.name} className="p-3 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-200">{deadline.name}</div>
                      <div className="text-xs text-zinc-500">{deadline.description}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn('text-xs', config.color)}>
                        {deadline.daysUntil < 0
                          ? `${Math.abs(deadline.daysUntil)}d overdue`
                          : `${deadline.daysUntil}d`}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', config.bg, config.color)}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="p-3 border-t border-zinc-800">
            <a
              href="https://business.gov.au/grants-and-programs/research-and-development-tax-incentive"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              AusIndustry R&D Registration Portal <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Row 4: Top Vendors + Action Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top R&D Vendors */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              Top R&D Vendors
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                  <th className="text-left p-3 font-medium">Vendor</th>
                  <th className="text-left p-3 font-medium">Project</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-right p-3 font-medium">Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {topVendors.map((vendor, i) => (
                  <tr key={`${vendor.vendor}-${i}`} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3 text-zinc-200 max-w-[180px] truncate">{vendor.vendor}</td>
                    <td className="p-3">
                      <span className="text-xs font-mono text-zinc-500">{vendor.project}</span>
                    </td>
                    <td className="p-3 text-xs text-zinc-400">{vendor.category}</td>
                    <td className="p-3 text-right text-zinc-200 font-medium">
                      {formatCurrency(vendor.spend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {topVendors.length === 0 && (
            <div className="p-6 text-center text-zinc-500 text-sm">
              No R&D vendor data found
            </div>
          )}
        </div>

        {/* Action Checklist */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Action Checklist
            </h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
            {checklist.map((item, i) => {
              const config = statusConfig[item.status]
              return (
                <div key={i} className="p-3 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {item.status === 'done' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : item.status === 'in_progress' ? (
                        <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                      ) : item.status === 'overdue' ? (
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        'text-sm',
                        item.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'
                      )}>
                        {item.task}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', config.bg, config.color)}>
                          {item.category}
                        </span>
                        {item.dueDate && (
                          <span className="text-xs text-zinc-500">
                            Due {new Date(item.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 5: FY Comparison */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-200">FY Comparison — R&D Spend by Category</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-zinc-800">
          {['FY2024-25', 'FY2025-26'].map(fy => {
            const spend = spendByFY[fy] || { software: 0, hardware: 0, product: 0, travel: 0, operations: 0, total: 0 }
            const categories = [
              { label: 'Software & Subscriptions', value: spend.software, color: 'bg-blue-500' },
              { label: 'Hardware & Materials', value: spend.hardware, color: 'bg-purple-500' },
              { label: 'Travel', value: spend.travel, color: 'bg-amber-500' },
              { label: 'Operations', value: spend.operations, color: 'bg-cyan-500' },
            ]
            return (
              <div key={fy} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-zinc-300">{fy}</span>
                  <span className="text-lg font-bold text-zinc-100">{formatCurrency(spend.total)}</span>
                </div>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat.label}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-zinc-400">{cat.label}</span>
                        <span className="text-zinc-300">{formatCurrency(cat.value)}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', cat.color)}
                          style={{ width: spend.total > 0 ? `${(cat.value / spend.total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between text-xs">
                  <span className="text-zinc-500">43.5% Offset</span>
                  <span className="text-emerald-400 font-medium">{formatCurrency(Math.round(spend.total * 0.435))}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
