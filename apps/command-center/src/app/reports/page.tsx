'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  FileBarChart,
  DollarSign,
  GitBranch,
  Users,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  Flame,
  Thermometer,
  Snowflake,
  Clock,
} from 'lucide-react'
import { getWeeklyReport, type WeeklyReport } from '@/lib/api'
import { cn } from '@/lib/utils'

function formatCurrency(amount: number) {
  return `$${Math.abs(amount).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatCard({ icon: Icon, iconColor, label, value, subtext, alert }: {
  icon: typeof DollarSign
  iconColor: string
  label: string
  value: string
  subtext?: string
  alert?: boolean
}) {
  return (
    <div className={cn('glass-card-sm p-4', alert && 'border-amber-500/20')}>
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', iconColor)} />
        <div>
          <p className="text-xs text-white/40">{label}</p>
          <p className={cn('text-lg font-bold tabular-nums', alert ? 'text-amber-400' : 'text-white')}>{value}</p>
          {subtext && <p className="text-xs text-white/30">{subtext}</p>}
        </div>
      </div>
    </div>
  )
}

function FinancialSection({ data }: { data: WeeklyReport['sections']['financial'] }) {
  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-green-400" />
        Financial Summary
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Banknote}
          iconColor="text-green-400"
          label="Net Position"
          value={formatCurrency(data.cashPosition.net || 0)}
        />
        <StatCard
          icon={TrendingUp}
          iconColor="text-emerald-400"
          label="Receivable"
          value={formatCurrency(data.cashPosition.receivable || 0)}
        />
        <StatCard
          icon={TrendingDown}
          iconColor="text-red-400"
          label="Payable"
          value={formatCurrency(data.cashPosition.payable || 0)}
        />
        <StatCard
          icon={AlertTriangle}
          iconColor="text-amber-400"
          label="Overdue Invoices"
          value={`${data.overdueInvoices.count}`}
          subtext={data.overdueInvoices.total > 0 ? formatCurrency(data.overdueInvoices.total) : undefined}
          alert={data.overdueInvoices.count > 0}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="glass-card-sm p-4">
          <p className="text-xs text-white/40 mb-1">Monthly Revenue</p>
          <p className="text-xl font-bold text-green-400 tabular-nums">
            {formatCurrency(data.monthlySummary.revenue || 0)}
          </p>
        </div>
        <div className="glass-card-sm p-4">
          <p className="text-xs text-white/40 mb-1">Monthly Expenses</p>
          <p className="text-xl font-bold text-red-400 tabular-nums">
            {formatCurrency(data.monthlySummary.expenses || 0)}
          </p>
        </div>
      </div>
    </div>
  )
}

function PipelineSection({ data }: { data: WeeklyReport['sections']['pipeline'] }) {
  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-indigo-400" />
        Pipeline
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={DollarSign} iconColor="text-green-400" label="Total Value" value={formatCurrency(data.totalValue)} />
        <StatCard icon={GitBranch} iconColor="text-blue-400" label="Open Deals" value={`${data.openDeals}`} />
        <StatCard icon={TrendingUp} iconColor="text-emerald-400" label="Avg Deal" value={formatCurrency(data.avgDealSize)} />
        <StatCard
          icon={AlertTriangle}
          iconColor="text-amber-400"
          label="Stale"
          value={`${data.staleDeals}`}
          alert={data.staleDeals > 0}
        />
        <StatCard icon={CheckCircle2} iconColor="text-purple-400" label="Won This Month" value={`${data.wonThisMonth}`} />
      </div>
    </div>
  )
}

function RelationshipsSection({ data }: { data: WeeklyReport['sections']['relationships'] }) {
  const total = data.total || 0
  const hotPct = total > 0 ? Math.round(((data.hot || 0) / total) * 100) : 0
  const warmPct = total > 0 ? Math.round(((data.warm || 0) / total) * 100) : 0
  const coolPct = total > 0 ? Math.round(((data.cool || 0) / total) * 100) : 0

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-pink-400" />
        Relationships
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Users} iconColor="text-white/60" label="Total Contacts" value={`${total}`} />
        <StatCard icon={Flame} iconColor="text-red-400" label={`Hot (${hotPct}%)`} value={`${data.hot || 0}`} />
        <StatCard icon={Thermometer} iconColor="text-orange-400" label={`Warm (${warmPct}%)`} value={`${data.warm || 0}`} />
        <StatCard icon={Snowflake} iconColor="text-blue-400" label={`Cool (${coolPct}%)`} value={`${data.cool || 0}`} />
        <StatCard
          icon={Clock}
          iconColor="text-amber-400"
          label="Need Follow-up"
          value={`${data.overdue || 0}`}
          alert={(data.overdue || 0) > 0}
        />
      </div>
      {/* Temperature bar */}
      {total > 0 && (
        <div className="mt-4">
          <div className="h-3 rounded-full overflow-hidden flex">
            <div className="bg-red-500" style={{ width: `${hotPct}%` }} />
            <div className="bg-orange-500" style={{ width: `${warmPct}%` }} />
            <div className="bg-blue-500" style={{ width: `${coolPct}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-xs text-white/30">
            <span>Hot {hotPct}%</span>
            <span>Warm {warmPct}%</span>
            <span>Cool {coolPct}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ComplianceSection({ data }: { data: WeeklyReport['sections']['compliance'] }) {
  if (data.length === 0) return null

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-indigo-400" />
        Upcoming Compliance
      </h2>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className={cn(
            'flex items-center justify-between py-3 px-4 rounded-xl',
            item.overdue ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'
          )}>
            <div className="flex items-center gap-3">
              {item.overdue ? (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              ) : (
                <CalendarClock className="h-4 w-4 text-indigo-400" />
              )}
              <div>
                <span className="text-sm font-medium text-white">{item.name}</span>
                <span className="text-xs text-white/40 ml-2">{item.owner}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-sm', item.overdue ? 'text-red-400 font-semibold' : 'text-white/50')}>
                {formatDate(item.dueDate)}
              </span>
              {item.overdue && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">Overdue</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'weekly'],
    queryFn: getWeeklyReport,
  })

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <Link href="/today" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileBarChart className="h-8 w-8 text-indigo-400" />
              Weekly Report
            </h1>
            <p className="text-lg text-white/60 mt-1">
              {data ? (
                <>Week of {formatDate(data.weekStart)} to {formatDate(data.reportDate)}</>
              ) : (
                'Business overview across all domains'
              )}
            </p>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="py-12 text-center text-white/40">Generating weekly report...</div>
      )}

      {data && (
        <div className="space-y-6">
          <FinancialSection data={data.sections.financial} />
          <PipelineSection data={data.sections.pipeline} />
          <RelationshipsSection data={data.sections.relationships} />
          <ComplianceSection data={data.sections.compliance} />
        </div>
      )}
    </div>
  )
}
