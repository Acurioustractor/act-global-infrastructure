'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderKanban,
  FileText,
  Tag,
  Beaker,
  Target,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Shield,
  Send,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────

interface WeeklyReviewData {
  weekOf: string
  generatedAt: string
  filters?: {
    from: string
    to: string
    account: string | null
  }
  cashPosition: {
    balance: number
    change: number
    burnRate: number
    runway: number
  }
  weeklyFlow: {
    income: number
    expenses: number
    net: number
    topIncome: Array<{ name: string; amount: number }>
    topExpenses: Array<{ name: string; amount: number }>
    transactionCount: number
  }
  invoices: {
    totalDue: number
    totalOverdue: number
    overdueCount: number
    totalCount: number
    buckets: {
      current: number
      days30: number
      days60: number
      days90: number
      days120plus: number
      counts: Record<string, number>
    }
    invoices: Array<{
      invoice_number: string
      contact_name: string
      amount_due: number
      due_date: string
      days_overdue: number
    }>
  }
  receiptGap: {
    total: number
    matched: number
    missing: number
    score: number
  }
  topProjects: Array<{
    code: string
    name: string
    spend: number
  }>
  grantDeadlines: Array<{
    name: string
    projectCode: string
    deadline: string
    daysRemaining: number
    amount: number
    status: string
  }>
  rdSpend: {
    thisWeek: number
    ytd: number
    offset43pct: number
    fyStart: string
  }
  dataQuality: {
    untagged: number
    total: number
    tagged: number
    coverage: number
  }
  strategicRisks: {
    revenueConcentration: {
      hhi: number
      concentrationIndex: number
      topSources: Array<{ name: string; amount: number; pct: number }>
      risk: 'high' | 'medium' | 'low'
    }
    receivableRecovery: {
      totalAR: number
      expectedRecovery: number
      recoveryRate: number
      risk: 'high' | 'medium' | 'low'
    }
    portfolioHealth: {
      topProjects: Array<{ code: string; score: number }>
      avgScore: number
    }
    rdCapture: {
      totalSpend: number
      rdSpend: number
      captureRate: number
      potentialOffset: number
    }
  }
  incomingForecast: {
    items: Array<{
      source: 'invoice' | 'pipeline'
      name: string
      contact: string
      amount: number
      confidence: 'high' | 'medium' | 'low'
      confidencePct: number
      weighted: number
      projectCodes: string[]
      detail: string
    }>
    tiers: Record<'high' | 'medium' | 'low', { total: number; weighted: number; count: number }>
    totalExpected: number
    totalFaceValue: number
  }
  actions: Array<{
    type: string
    priority: 'high' | 'medium' | 'low'
    description: string
  }>
}

type SectionId = 'actions' | 'cashflow' | 'incoming' | 'invoices' | 'receipts' | 'projects' | 'grants' | 'rd' | 'dataQuality' | 'risks'

interface SectionConfig {
  id: SectionId
  label: string
  icon: typeof DollarSign
  color: string
  badge?: (data: WeeklyReviewData) => string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toLocaleString()}`
}

function AgingBar({ label, amount, count, color }: { label: string; amount: number; count: number; color: string }) {
  if (amount === 0) return null
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-white/50 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden relative">
        <div className={cn('h-full rounded-lg', color)} style={{ width: '100%' }} />
        <div className="absolute inset-0 flex items-center justify-between px-2">
          <span className="text-xs font-medium text-white">{fmt(amount)}</span>
          <span className="text-xs text-white/70">{count} inv</span>
        </div>
      </div>
    </div>
  )
}

// ── Section definitions ─────────────────────────────────────────────────

const SECTIONS: SectionConfig[] = [
  {
    id: 'actions',
    label: 'Action Items',
    icon: AlertTriangle,
    color: 'text-amber-400',
    badge: (d) => d.actions.length > 0 ? `${d.actions.length}` : null,
  },
  {
    id: 'cashflow',
    label: 'Cash Flow',
    icon: DollarSign,
    color: 'text-indigo-400',
    badge: (d) => d.weeklyFlow.net >= 0 ? `+${fmt(d.weeklyFlow.net)}` : fmt(d.weeklyFlow.net),
  },
  {
    id: 'incoming',
    label: 'Incoming Money',
    icon: TrendingUp,
    color: 'text-emerald-400',
    badge: (d) => d.incomingForecast ? fmt(d.incomingForecast.totalExpected) : null,
  },
  {
    id: 'invoices',
    label: 'Invoice Aging',
    icon: Receipt,
    color: 'text-blue-400',
    badge: (d) => d.invoices.overdueCount > 0 ? `${d.invoices.overdueCount} overdue` : null,
  },
  {
    id: 'receipts',
    label: 'Receipts',
    icon: Receipt,
    color: 'text-green-400',
    badge: (d) => `${d.receiptGap.score}%`,
  },
  {
    id: 'projects',
    label: 'Project Spend',
    icon: FolderKanban,
    color: 'text-purple-400',
    badge: (d) => d.topProjects.length > 0 ? `${d.topProjects.length} active` : null,
  },
  {
    id: 'grants',
    label: 'Grant Deadlines',
    icon: Target,
    color: 'text-emerald-400',
    badge: (d) => d.grantDeadlines.length > 0 ? `${d.grantDeadlines.length} upcoming` : null,
  },
  {
    id: 'rd',
    label: 'R&D Tax',
    icon: Beaker,
    color: 'text-cyan-400',
    badge: (d) => fmt(d.rdSpend.offset43pct),
  },
  {
    id: 'dataQuality',
    label: 'Data Quality',
    icon: Tag,
    color: 'text-amber-400',
    badge: (d) => `${d.dataQuality.coverage}%`,
  },
  {
    id: 'risks',
    label: 'Strategic Risks',
    icon: Shield,
    color: 'text-red-400',
    badge: (d) => {
      const highRisks = [
        d.strategicRisks?.revenueConcentration?.risk,
        d.strategicRisks?.receivableRecovery?.risk,
      ].filter(r => r === 'high').length
      return highRisks > 0 ? `${highRisks} high` : null
    },
  },
]

// ── Collapsible Section wrapper ─────────────────────────────────────────

function Section({
  config,
  expanded,
  onToggle,
  detail,
  onToggleDetail,
  badge,
  children,
  summaryContent,
}: {
  config: SectionConfig
  expanded: boolean
  onToggle: () => void
  detail: boolean
  onToggleDetail: () => void
  badge: string | null
  children: React.ReactNode
  summaryContent?: React.ReactNode
}) {
  const Icon = config.icon
  return (
    <div className="glass-card overflow-hidden">
      {/* Section header — always visible, clickable */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <Icon className={cn('h-5 w-5', config.color)} />
          <span className="text-sm font-semibold text-white">{config.label}</span>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleDetail() }}
              className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10"
              title={detail ? 'Show summary' : 'Show detail'}
            >
              {detail ? <List className="h-3 w-3" /> : <LayoutGrid className="h-3 w-3" />}
              {detail ? 'Detail' : 'Summary'}
            </button>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-white/40" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/40" />
          )}
        </div>
      </div>

      {/* Collapsed: show summary line */}
      {!expanded && summaryContent && (
        <div className="px-4 pb-3 -mt-1">
          {summaryContent}
        </div>
      )}

      {/* Expanded: full content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────

export default function WeeklyReviewPage() {
  // Date range & account filters (drive the API query)
  const defaultFrom = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 6)
    return d.toISOString().split('T')[0]
  }, [])
  const defaultTo = useMemo(() => new Date().toISOString().split('T')[0], [])

  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo, setDateTo] = useState(defaultTo)
  const [accountFilter, setAccountFilter] = useState<string>('')

  const queryParams = useMemo(() => {
    const p = new URLSearchParams()
    if (dateFrom) p.set('from', dateFrom)
    if (dateTo) p.set('to', dateTo)
    if (accountFilter) p.set('account', accountFilter)
    return p.toString()
  }, [dateFrom, dateTo, accountFilter])

  const { data, isLoading, error } = useQuery<WeeklyReviewData>({
    queryKey: ['finance', 'weekly-review', dateFrom, dateTo, accountFilter],
    queryFn: () => fetch(`/api/finance/weekly-review?${queryParams}`).then(r => r.json()),
  })

  // Section visibility & expand state
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    new Set(['actions', 'cashflow', 'incoming', 'invoices'])
  )
  const [detailSections, setDetailSections] = useState<Set<SectionId>>(new Set())
  const [hiddenSections, setHiddenSections] = useState<Set<SectionId>>(new Set())
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // Filters (client-side — project filter narrows within current data)
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)

  const toggleExpand = useCallback((id: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleDetail = useCallback((id: SectionId) => {
    setDetailSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleHidden = useCallback((id: SectionId) => {
    setHiddenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedSections(new Set(SECTIONS.map(s => s.id)))
  }, [])

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set())
  }, [])

  // Filter projects from data
  const filteredProjects = useMemo(() => {
    if (!data || !projectFilter) return data?.topProjects || []
    return (data.topProjects || []).filter(p =>
      p.code.toLowerCase().includes(projectFilter.toLowerCase()) ||
      p.name.toLowerCase().includes(projectFilter.toLowerCase())
    )
  }, [data, projectFilter])

  const filteredInvoices = useMemo(() => {
    if (!data) return []
    let invs = data.invoices.invoices
    if (projectFilter) {
      // Can't filter invoices by project since API doesn't return project_code per invoice
      // but we keep the full list
    }
    return invs
  }, [data, projectFilter])

  const filteredGrants = useMemo(() => {
    if (!data || !projectFilter) return data?.grantDeadlines || []
    return (data.grantDeadlines || []).filter(g =>
      g.projectCode.toLowerCase().includes(projectFilter.toLowerCase()) ||
      g.name.toLowerCase().includes(projectFilter.toLowerCase())
    )
  }, [data, projectFilter])

  // Visible sections (respecting hidden + showOnlyIssues filter)
  const visibleSections = useMemo(() => {
    return SECTIONS.filter(s => {
      if (hiddenSections.has(s.id)) return false
      if (showOnlyIssues && data) {
        // Only show sections with issues
        if (s.id === 'actions') return data.actions.length > 0
        if (s.id === 'invoices') return data.invoices.overdueCount > 0
        if (s.id === 'receipts') return data.receiptGap.score < 80
        if (s.id === 'dataQuality') return data.dataQuality.coverage < 90
        if (s.id === 'risks') return (
          data.strategicRisks?.revenueConcentration?.risk === 'high' ||
          data.strategicRisks?.receivableRecovery?.risk === 'high'
        )
        if (s.id === 'grants') return data.grantDeadlines.some(g => g.daysRemaining <= 7)
        // Always show cashflow, projects, rd
        return true
      }
      return true
    })
  }, [hiddenSections, showOnlyIssues, data])

  // Unique project codes for filter dropdown
  const projectCodes = useMemo(() => {
    if (!data) return []
    const codes = new Set<string>()
    data.topProjects.forEach(p => codes.add(p.code))
    data.grantDeadlines.forEach(g => { if (g.projectCode) codes.add(g.projectCode) })
    return Array.from(codes).sort()
  }, [data])

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-400" />
            Weekly Financial Review
          </h1>
          <p className="text-lg text-white/60 mt-1">Loading review data...</p>
        </header>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-16 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-400" />
            Weekly Financial Review
          </h1>
        </header>
        <div className="glass-card p-8 text-center text-white/50">
          Failed to load weekly review data. Check API connection.
        </div>
      </div>
    )
  }

  const { cashPosition, weeklyFlow, invoices, receiptGap, topProjects, grantDeadlines, rdSpend, dataQuality, strategicRisks, incomingForecast, actions } = data

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="h-8 w-8 text-indigo-400" />
              Weekly Financial Review
            </h1>
            <p className="text-lg text-white/60 mt-1">
              {dateFrom} → {dateTo}
              {accountFilter && <span className="ml-2 text-indigo-400">({accountFilter.replace(/NJ Marchesi T\/as /, '')})</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/finance" className="btn-glass flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Finance Home
            </Link>
            <a
              href="https://go.xero.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Xero
            </a>
          </div>
        </div>
      </header>

      {/* KPI Strip — always visible */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-white/50">Cash Balance</p>
              <p className="text-xl font-bold text-emerald-400">{fmt(cashPosition.balance)}</p>
              <p className={cn('text-xs', cashPosition.change >= 0 ? 'text-green-400' : 'text-red-400')}>
                {cashPosition.change >= 0 ? '+' : ''}{fmt(cashPosition.change)}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              cashPosition.runway >= 6 ? 'bg-green-500/20' : cashPosition.runway >= 3 ? 'bg-amber-500/20' : 'bg-red-500/20'
            )}>
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-white/50">Runway</p>
              <p className={cn(
                'text-xl font-bold',
                cashPosition.runway >= 6 ? 'text-green-400' : cashPosition.runway >= 3 ? 'text-amber-400' : 'text-red-400'
              )}>
                {cashPosition.runway}mo
              </p>
              <p className="text-xs text-white/40">Burn: {fmt(cashPosition.burnRate)}/mo</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-white/50">Week Income</p>
              <p className="text-xl font-bold text-green-400">{fmt(weeklyFlow.income)}</p>
              <p className="text-xs text-white/40">{weeklyFlow.transactionCount} txns</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-white/50">Week Expenses</p>
              <p className="text-xl font-bold text-red-400">{fmt(weeklyFlow.expenses)}</p>
              <p className={cn('text-xs', weeklyFlow.net >= 0 ? 'text-green-400' : 'text-red-400')}>
                Net: {weeklyFlow.net >= 0 ? '+' : ''}{fmt(weeklyFlow.net)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Filters + View Controls */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-white/40" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
            />
            <span className="text-xs text-white/30">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
            />
            {(dateFrom !== defaultFrom || dateTo !== defaultTo) && (
              <button
                onClick={() => { setDateFrom(defaultFrom); setDateTo(defaultTo) }}
                className="text-xs text-indigo-400 hover:text-indigo-300 px-1"
                title="Reset to last 7 days"
              >
                Reset
              </button>
            )}
          </div>

          {/* Account (entity) filter */}
          <div className="relative">
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 appearance-none pr-8 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">All accounts</option>
              <option value="NJ Marchesi T/as ACT Everyday">ACT Everyday</option>
              <option value="NJ Marchesi T/as ACT Maximiser">ACT Maximiser</option>
              <option value="NAB Visa ACT #8815">NAB Visa</option>
              <option value="NM Personal ">NM Personal</option>
            </select>
            <Building2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40 pointer-events-none" />
          </div>

          {/* Project filter */}
          <div className="relative">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 appearance-none pr-8 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">All projects</option>
              {projectCodes.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40 pointer-events-none" />
          </div>

          {/* Issues only toggle */}
          <button
            onClick={() => setShowOnlyIssues(!showOnlyIssues)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors',
              showOnlyIssues
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Issues only
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Section visibility toggle */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors',
              showFilterPanel
                ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
            )}
          >
            {showFilterPanel ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            Sections
          </button>

          <button
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white/60 hover:text-white/80"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white/60 hover:text-white/80"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Section visibility panel */}
      {showFilterPanel && (
        <div className="glass-card p-4 mb-4">
          <p className="text-xs text-white/50 mb-2">Toggle sections on/off:</p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map(s => {
              const Icon = s.icon
              const hidden = hiddenSections.has(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggleHidden(s.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors',
                    hidden
                      ? 'bg-white/5 border-white/10 text-white/30 line-through'
                      : 'bg-white/10 border-white/20 text-white/80'
                  )}
                >
                  <Icon className={cn('h-3 w-3', hidden ? 'text-white/30' : s.color)} />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">

        {/* ── ACTION ITEMS ── */}
        {visibleSections.find(s => s.id === 'actions') && (
          <Section
            config={SECTIONS.find(s => s.id === 'actions')!}
            expanded={expandedSections.has('actions')}
            onToggle={() => toggleExpand('actions')}
            detail={detailSections.has('actions')}
            onToggleDetail={() => toggleDetail('actions')}
            badge={actions.length > 0 ? `${actions.length}` : null}
            summaryContent={actions.length > 0 ? (
              <p className="text-xs text-amber-400">{actions.filter(a => a.priority === 'high').length} high priority</p>
            ) : (
              <p className="text-xs text-green-400">All clear</p>
            )}
          >
            <div className="space-y-2 pt-3">
              {actions.length === 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <p className="text-sm text-green-400">No action items this week</p>
                </div>
              ) : actions.map((action, i) => (
                <div key={i} className={cn(
                  'flex items-center gap-3 p-2.5 rounded-lg',
                  action.priority === 'high' ? 'bg-red-500/10' : action.priority === 'medium' ? 'bg-amber-500/10' : 'bg-white/5'
                )}>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded shrink-0',
                    action.priority === 'high' ? 'bg-red-500/20 text-red-400' : action.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/60'
                  )}>
                    {action.priority}
                  </span>
                  <span className="text-sm text-white/80 flex-1">{action.description}</span>
                  {action.type === 'chase' && (
                    <Link href="/finance" className="btn-glass text-xs px-2.5 py-1 flex items-center gap-1">
                      <Send className="h-3 w-3" /> Chase
                    </Link>
                  )}
                  {action.type === 'receipts' && (
                    <Link href="/finance/receipts" className="btn-glass text-xs px-2.5 py-1 flex items-center gap-1">
                      <Receipt className="h-3 w-3" /> Capture
                    </Link>
                  )}
                  {action.type === 'tag' && (
                    <Link href="/finance/tagger" className="btn-glass text-xs px-2.5 py-1 flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Tag
                    </Link>
                  )}
                  {action.type === 'grants' && (
                    <Link href="/grants" className="btn-glass text-xs px-2.5 py-1 flex items-center gap-1">
                      <Target className="h-3 w-3" /> View
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── CASH FLOW ── */}
        {visibleSections.find(s => s.id === 'cashflow') && (
          <Section
            config={SECTIONS.find(s => s.id === 'cashflow')!}
            expanded={expandedSections.has('cashflow')}
            onToggle={() => toggleExpand('cashflow')}
            detail={detailSections.has('cashflow')}
            onToggleDetail={() => toggleDetail('cashflow')}
            badge={weeklyFlow.net >= 0 ? `+${fmt(weeklyFlow.net)}` : fmt(weeklyFlow.net)}
            summaryContent={
              <p className="text-xs text-white/50">
                In: {fmt(weeklyFlow.income)} | Out: {fmt(weeklyFlow.expenses)} | Net: {weeklyFlow.net >= 0 ? '+' : ''}{fmt(weeklyFlow.net)}
              </p>
            }
          >
            <div className="grid grid-cols-2 gap-6 pt-3">
              <div>
                <h3 className="text-sm text-white/50 mb-3">Top Income</h3>
                {weeklyFlow.topIncome.length > 0 ? (
                  <div className="space-y-2">
                    {weeklyFlow.topIncome.map(item => (
                      <div key={item.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5">
                        <span className="text-sm text-white truncate max-w-[250px]">{item.name}</span>
                        <span className="text-sm font-semibold text-green-400 tabular-nums">+{fmt(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">No income this week</p>
                )}
              </div>
              <div>
                <h3 className="text-sm text-white/50 mb-3">Top Expenses</h3>
                {weeklyFlow.topExpenses.length > 0 ? (
                  <div className="space-y-2">
                    {weeklyFlow.topExpenses.map(item => (
                      <div key={item.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5">
                        <span className="text-sm text-white truncate max-w-[250px]">{item.name}</span>
                        <span className="text-sm font-semibold text-red-400 tabular-nums">-{fmt(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">No expenses this week</p>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ── INCOMING MONEY ── */}
        {visibleSections.find(s => s.id === 'incoming') && incomingForecast && (
          <Section
            config={SECTIONS.find(s => s.id === 'incoming')!}
            expanded={expandedSections.has('incoming')}
            onToggle={() => toggleExpand('incoming')}
            detail={detailSections.has('incoming')}
            onToggleDetail={() => toggleDetail('incoming')}
            badge={fmt(incomingForecast.totalExpected)}
            summaryContent={
              <div className="flex gap-4">
                <span className="text-xs text-white/50">
                  Face value: <span className="text-white/70">{fmt(incomingForecast.totalFaceValue)}</span>
                </span>
                <span className="text-xs text-white/50">
                  Expected: <span className="text-emerald-400">{fmt(incomingForecast.totalExpected)}</span>
                </span>
              </div>
            }
          >
            <div className="pt-3 space-y-4">
              {/* Confidence tiers summary */}
              <div className="grid grid-cols-3 gap-3">
                {(['high', 'medium', 'low'] as const).map(tier => {
                  const t = incomingForecast.tiers[tier]
                  const colors = { high: 'emerald', medium: 'amber', low: 'red' }
                  const c = colors[tier]
                  return (
                    <div key={tier} className={`rounded-lg bg-${c}-500/10 p-3`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium text-${c}-400 capitalize`}>{tier} confidence</span>
                        <span className="text-xs text-white/40">{t.count} items</span>
                      </div>
                      <p className={`text-lg font-bold text-${c}-400`}>{fmt(t.weighted)}</p>
                      <p className="text-xs text-white/40">of {fmt(t.total)} face value</p>
                    </div>
                  )
                })}
              </div>

              {/* Stacked bar showing confidence breakdown */}
              {incomingForecast.totalExpected > 0 && (
                <div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
                    {incomingForecast.tiers.high.weighted > 0 && (
                      <div
                        className="bg-emerald-500/60 h-full"
                        style={{ width: `${(incomingForecast.tiers.high.weighted / incomingForecast.totalExpected) * 100}%` }}
                        title={`High: ${fmt(incomingForecast.tiers.high.weighted)}`}
                      />
                    )}
                    {incomingForecast.tiers.medium.weighted > 0 && (
                      <div
                        className="bg-amber-500/60 h-full"
                        style={{ width: `${(incomingForecast.tiers.medium.weighted / incomingForecast.totalExpected) * 100}%` }}
                        title={`Medium: ${fmt(incomingForecast.tiers.medium.weighted)}`}
                      />
                    )}
                    {incomingForecast.tiers.low.weighted > 0 && (
                      <div
                        className="bg-red-500/40 h-full"
                        style={{ width: `${(incomingForecast.tiers.low.weighted / incomingForecast.totalExpected) * 100}%` }}
                        title={`Low: ${fmt(incomingForecast.tiers.low.weighted)}`}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-emerald-400">High {fmt(incomingForecast.tiers.high.weighted)}</span>
                    <span className="text-xs text-amber-400">Med {fmt(incomingForecast.tiers.medium.weighted)}</span>
                    <span className="text-xs text-red-400">Low {fmt(incomingForecast.tiers.low.weighted)}</span>
                  </div>
                </div>
              )}

              {/* Individual items */}
              {detailSections.has('incoming') && (
                <div className="border-t border-white/10 pt-3 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm text-white/50">Breakdown</h3>
                    <div className="flex gap-3 text-xs text-white/40">
                      <span>Source</span>
                      <span>Amount</span>
                      <span>Conf.</span>
                      <span>Expected</span>
                    </div>
                  </div>
                  {incomingForecast.items.map((item, i) => (
                    <div key={i} className={cn(
                      'flex items-center justify-between py-2 px-3 rounded-lg',
                      item.confidence === 'high' ? 'bg-emerald-500/5' : item.confidence === 'medium' ? 'bg-amber-500/5' : 'bg-white/5'
                    )}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded shrink-0',
                            item.source === 'invoice' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                          )}>
                            {item.source === 'invoice' ? 'INV' : 'PIPE'}
                          </span>
                          <p className="text-sm text-white font-medium truncate">{item.contact || item.name}</p>
                        </div>
                        <p className="text-xs text-white/40 ml-12">
                          {item.name}{item.projectCodes?.length > 0 && ` — ${item.projectCodes.join(', ')}`}
                          {item.detail && ` · ${item.detail}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-4 text-right">
                        <div>
                          <p className="text-sm text-white/60 tabular-nums">{fmt(item.amount)}</p>
                        </div>
                        <div className="w-12">
                          <p className={cn(
                            'text-xs font-medium',
                            item.confidence === 'high' ? 'text-emerald-400' : item.confidence === 'medium' ? 'text-amber-400' : 'text-red-400'
                          )}>
                            {item.confidencePct}%
                          </p>
                        </div>
                        <div className="w-20">
                          <p className="text-sm font-semibold text-emerald-400 tabular-nums">{fmt(item.weighted)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── INVOICES ── */}
        {visibleSections.find(s => s.id === 'invoices') && (
          <Section
            config={SECTIONS.find(s => s.id === 'invoices')!}
            expanded={expandedSections.has('invoices')}
            onToggle={() => toggleExpand('invoices')}
            detail={detailSections.has('invoices')}
            onToggleDetail={() => toggleDetail('invoices')}
            badge={invoices.overdueCount > 0 ? `${invoices.overdueCount} overdue (${fmt(invoices.totalOverdue)})` : `${invoices.totalCount} current`}
            summaryContent={
              <p className="text-xs text-white/50">
                {fmt(invoices.totalDue)} due across {invoices.totalCount} invoices
                {invoices.overdueCount > 0 && <span className="text-red-400 ml-1">({invoices.overdueCount} overdue)</span>}
              </p>
            }
          >
            <div className="pt-3">
              {/* Aging buckets */}
              <div className="mb-4 space-y-1">
                <AgingBar label="Current" amount={invoices.buckets.current} count={invoices.buckets.counts.current} color="bg-green-500/40" />
                <AgingBar label="1-30d" amount={invoices.buckets.days30} count={invoices.buckets.counts.days30} color="bg-amber-500/40" />
                <AgingBar label="31-60d" amount={invoices.buckets.days60} count={invoices.buckets.counts.days60} color="bg-orange-500/40" />
                <AgingBar label="61-90d" amount={invoices.buckets.days90} count={invoices.buckets.counts.days90} color="bg-red-500/40" />
                <AgingBar label="90d+" amount={invoices.buckets.days120plus} count={invoices.buckets.counts.days120plus} color="bg-red-700/40" />
              </div>

              {/* Detail: individual invoices with chase buttons */}
              {detailSections.has('invoices') && filteredInvoices.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                  <h3 className="text-sm text-white/50 mb-2">Chase List</h3>
                  <div className="space-y-2">
                    {filteredInvoices.map(inv => (
                      <div key={inv.invoice_number} className="flex items-center justify-between py-2 px-3 rounded-lg bg-red-500/5 hover:bg-red-500/10">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium">{inv.contact_name}</p>
                          <p className="text-xs text-white/40">{inv.invoice_number} — Due: {inv.due_date}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-red-400">{fmt(inv.amount_due)}</p>
                            <p className="text-xs text-red-400/70">{inv.days_overdue}d</p>
                          </div>
                          <a
                            href={`mailto:?subject=Invoice ${inv.invoice_number} — Payment reminder&body=Hi ${inv.contact_name},%0A%0AJust a friendly reminder that invoice ${inv.invoice_number} for ${fmt(inv.amount_due)} is now ${inv.days_overdue} days overdue.%0A%0ACould you please arrange payment at your earliest convenience?%0A%0AThanks`}
                            className="btn-glass text-xs px-2 py-1 flex items-center gap-1 text-red-400 border-red-500/30"
                          >
                            <Send className="h-3 w-3" /> Chase
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── RECEIPTS ── */}
        {visibleSections.find(s => s.id === 'receipts') && (
          <Section
            config={SECTIONS.find(s => s.id === 'receipts')!}
            expanded={expandedSections.has('receipts')}
            onToggle={() => toggleExpand('receipts')}
            detail={detailSections.has('receipts')}
            onToggleDetail={() => toggleDetail('receipts')}
            badge={`${receiptGap.score}%`}
            summaryContent={
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', receiptGap.score >= 80 ? 'bg-green-500' : receiptGap.score >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${receiptGap.score}%` }}
                  />
                </div>
                <span className="text-xs text-white/50">{receiptGap.missing} missing</span>
              </div>
            }
          >
            <div className="pt-3 flex items-center gap-6">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="35" fill="none"
                    stroke={receiptGap.score >= 80 ? '#22c55e' : receiptGap.score >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeDasharray={`${(receiptGap.score / 100) * 220} 220`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{receiptGap.score}%</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/70">{receiptGap.matched} of {receiptGap.total} transactions matched</p>
                {receiptGap.missing > 0 && (
                  <p className="text-sm text-yellow-400 mb-2">{receiptGap.missing} missing receipts</p>
                )}
                <Link href="/finance/receipts" className="btn-glass text-xs px-3 py-1.5 inline-flex items-center gap-1">
                  <Receipt className="h-3 w-3" /> Capture receipts
                </Link>
              </div>
            </div>
          </Section>
        )}

        {/* ── PROJECTS ── */}
        {visibleSections.find(s => s.id === 'projects') && (
          <Section
            config={SECTIONS.find(s => s.id === 'projects')!}
            expanded={expandedSections.has('projects')}
            onToggle={() => toggleExpand('projects')}
            detail={detailSections.has('projects')}
            onToggleDetail={() => toggleDetail('projects')}
            badge={filteredProjects.length > 0 ? `${filteredProjects.length} active` : null}
            summaryContent={filteredProjects.length > 0 ? (
              <p className="text-xs text-white/50">
                Top: {filteredProjects[0]?.code} (-{fmt(filteredProjects[0]?.spend)})
                {filteredProjects.length > 1 && ` + ${filteredProjects.length - 1} more`}
              </p>
            ) : <p className="text-xs text-white/40">No project spend this week</p>}
          >
            <div className="pt-3 space-y-2">
              {filteredProjects.length > 0 ? filteredProjects.map((p, i) => (
                <Link
                  key={p.code}
                  href={`/finance/projects/${p.code}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/30 w-5">{i + 1}.</span>
                    <div>
                      <p className="text-sm text-white font-medium">{p.name}</p>
                      <p className="text-xs text-white/40">{p.code}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-red-400 tabular-nums">-{fmt(p.spend)}</span>
                </Link>
              )) : (
                <p className="text-sm text-white/40">No project spend this week</p>
              )}
            </div>
          </Section>
        )}

        {/* ── GRANTS ── */}
        {visibleSections.find(s => s.id === 'grants') && (
          <Section
            config={SECTIONS.find(s => s.id === 'grants')!}
            expanded={expandedSections.has('grants')}
            onToggle={() => toggleExpand('grants')}
            detail={detailSections.has('grants')}
            onToggleDetail={() => toggleDetail('grants')}
            badge={filteredGrants.length > 0 ? `${filteredGrants.length} upcoming` : null}
            summaryContent={filteredGrants.length > 0 ? (
              <p className="text-xs text-white/50">
                Next: {filteredGrants[0]?.name.slice(0, 40)} ({filteredGrants[0]?.daysRemaining}d)
              </p>
            ) : <p className="text-xs text-green-400">No deadlines in 14 days</p>}
          >
            <div className="pt-3">
              {filteredGrants.length > 0 ? (
                <div className="space-y-2">
                  {filteredGrants.map((g, i) => (
                    <div key={i} className={cn(
                      'flex items-center justify-between py-2 px-3 rounded-lg',
                      g.daysRemaining <= 3 ? 'bg-red-500/10' : g.daysRemaining <= 7 ? 'bg-amber-500/10' : 'bg-white/5'
                    )}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{g.name}</p>
                        <p className="text-xs text-white/40">
                          {g.projectCode && <span className="mr-2">{g.projectCode}</span>}
                          {g.deadline} — {g.status}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        {g.amount > 0 && <p className="text-sm text-emerald-400">{fmt(g.amount)}</p>}
                        <p className={cn(
                          'text-xs font-medium',
                          g.daysRemaining <= 3 ? 'text-red-400' : g.daysRemaining <= 7 ? 'text-amber-400' : 'text-white/50'
                        )}>
                          {g.daysRemaining}d remaining
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <p className="text-sm text-green-400">No grant deadlines in the next 14 days</p>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-white/10">
                <Link href="/grants" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  View full pipeline <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </Section>
        )}

        {/* ── R&D ── */}
        {visibleSections.find(s => s.id === 'rd') && (
          <Section
            config={SECTIONS.find(s => s.id === 'rd')!}
            expanded={expandedSections.has('rd')}
            onToggle={() => toggleExpand('rd')}
            detail={detailSections.has('rd')}
            onToggleDetail={() => toggleDetail('rd')}
            badge={fmt(rdSpend.offset43pct)}
            summaryContent={
              <p className="text-xs text-white/50">
                Week: {fmt(rdSpend.thisWeek)} | YTD: {fmt(rdSpend.ytd)} | Offset: {fmt(rdSpend.offset43pct)}
              </p>
            }
          >
            <div className="pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">This week</span>
                <span className="text-sm font-semibold text-cyan-400">{fmt(rdSpend.thisWeek)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">YTD (since {rdSpend.fyStart})</span>
                <span className="text-sm font-semibold text-cyan-400">{fmt(rdSpend.ytd)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-sm text-white/50">43.5% offset value</span>
                <span className="text-sm font-bold text-green-400">{fmt(rdSpend.offset43pct)}</span>
              </div>
              <Link href="/finance/rd-tracking" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-1">
                R&D details <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Section>
        )}

        {/* ── DATA QUALITY ── */}
        {visibleSections.find(s => s.id === 'dataQuality') && (
          <Section
            config={SECTIONS.find(s => s.id === 'dataQuality')!}
            expanded={expandedSections.has('dataQuality')}
            onToggle={() => toggleExpand('dataQuality')}
            detail={detailSections.has('dataQuality')}
            onToggleDetail={() => toggleDetail('dataQuality')}
            badge={`${dataQuality.coverage}%`}
            summaryContent={
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', dataQuality.coverage >= 90 ? 'bg-green-500' : dataQuality.coverage >= 70 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${dataQuality.coverage}%` }}
                  />
                </div>
                <span className="text-xs text-white/50">{dataQuality.untagged} untagged</span>
              </div>
            }
          >
            <div className="pt-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/50">Tagging coverage</span>
                  <span className={cn(
                    'text-sm font-semibold',
                    dataQuality.coverage >= 90 ? 'text-green-400' : dataQuality.coverage >= 70 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {dataQuality.coverage}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      dataQuality.coverage >= 90 ? 'bg-green-500' : dataQuality.coverage >= 70 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                    style={{ width: `${dataQuality.coverage}%` }}
                  />
                </div>
                <p className="text-xs text-white/40 mt-1">
                  {dataQuality.tagged} tagged / {dataQuality.total} total ({dataQuality.untagged} untagged)
                </p>
              </div>
              {dataQuality.untagged > 0 && (
                <Link href="/finance/tagger" className="btn-glass text-xs px-3 py-1.5 inline-flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tag {dataQuality.untagged} transactions
                </Link>
              )}
            </div>
          </Section>
        )}

        {/* ── STRATEGIC RISKS ── */}
        {visibleSections.find(s => s.id === 'risks') && strategicRisks && (
          <Section
            config={SECTIONS.find(s => s.id === 'risks')!}
            expanded={expandedSections.has('risks')}
            onToggle={() => toggleExpand('risks')}
            detail={detailSections.has('risks')}
            onToggleDetail={() => toggleDetail('risks')}
            badge={(() => {
              const highCount = [
                strategicRisks.revenueConcentration?.risk,
                strategicRisks.receivableRecovery?.risk,
              ].filter(r => r === 'high').length
              return highCount > 0 ? `${highCount} high risk` : 'OK'
            })()}
            summaryContent={
              <div className="flex gap-4">
                <span className="text-xs text-white/50">
                  Concentration: <span className={cn(
                    strategicRisks.revenueConcentration.risk === 'high' ? 'text-red-400' : 'text-white/70'
                  )}>{strategicRisks.revenueConcentration.concentrationIndex}%</span>
                </span>
                <span className="text-xs text-white/50">
                  Recovery: <span className={cn(
                    strategicRisks.receivableRecovery.recoveryRate < 70 ? 'text-red-400' : 'text-white/70'
                  )}>{strategicRisks.receivableRecovery.recoveryRate}%</span>
                </span>
              </div>
            }
          >
            <div className="pt-3 space-y-4">
              {/* Revenue Concentration */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/50">Revenue concentration</span>
                  <span className={cn(
                    'text-xs font-medium px-1.5 py-0.5 rounded',
                    strategicRisks.revenueConcentration.risk === 'high' ? 'bg-red-500/20 text-red-400' :
                    strategicRisks.revenueConcentration.risk === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-green-500/20 text-green-400'
                  )}>
                    {strategicRisks.revenueConcentration.concentrationIndex}% HHI
                  </span>
                </div>
                {detailSections.has('risks') && strategicRisks.revenueConcentration.topSources.map(s => (
                  <div key={s.name} className="flex items-center justify-between py-0.5 px-2">
                    <span className="text-xs text-white/40 truncate max-w-[200px]">{s.name}</span>
                    <span className="text-xs text-white/60">{s.pct}% ({fmt(s.amount)})</span>
                  </div>
                ))}
              </div>

              {/* Receivable Recovery */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/50">Receivable recovery probability</span>
                  <span className={cn(
                    'text-sm font-medium',
                    strategicRisks.receivableRecovery.recoveryRate >= 85 ? 'text-green-400' :
                    strategicRisks.receivableRecovery.recoveryRate >= 70 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {strategicRisks.receivableRecovery.recoveryRate}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      strategicRisks.receivableRecovery.recoveryRate >= 85 ? 'bg-green-500' :
                      strategicRisks.receivableRecovery.recoveryRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                    style={{ width: `${strategicRisks.receivableRecovery.recoveryRate}%` }}
                  />
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  {fmt(strategicRisks.receivableRecovery.expectedRecovery)} of {fmt(strategicRisks.receivableRecovery.totalAR)} expected
                </p>
              </div>

              {/* Portfolio Health */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/50">Portfolio health</span>
                  <span className={cn(
                    'text-sm font-medium',
                    strategicRisks.portfolioHealth.avgScore >= 70 ? 'text-green-400' :
                    strategicRisks.portfolioHealth.avgScore >= 40 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    avg {strategicRisks.portfolioHealth.avgScore}/100
                  </span>
                </div>
                <div className="flex gap-1">
                  {strategicRisks.portfolioHealth.topProjects.slice(0, 10).map(p => (
                    <div
                      key={p.code}
                      title={`${p.code}: ${p.score}/100`}
                      className={cn(
                        'h-5 flex-1 rounded-sm cursor-help',
                        p.score >= 70 ? 'bg-green-500/40' : p.score >= 40 ? 'bg-amber-500/40' : 'bg-red-500/40'
                      )}
                    />
                  ))}
                </div>
                {detailSections.has('risks') && (
                  <div className="mt-2 space-y-0.5">
                    {strategicRisks.portfolioHealth.topProjects.map(p => (
                      <div key={p.code} className="flex items-center justify-between px-2 py-0.5">
                        <Link href={`/projects/${p.code}`} className="text-xs text-indigo-400 hover:text-indigo-300">{p.code}</Link>
                        <span className={cn('text-xs', p.score >= 70 ? 'text-green-400' : p.score >= 40 ? 'text-amber-400' : 'text-red-400')}>
                          {p.score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* R&D Capture */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/50">R&D capture rate</span>
                  <span className="text-sm font-medium text-cyan-400">
                    {strategicRisks.rdCapture.captureRate}% of spend
                  </span>
                </div>
                <p className="text-xs text-white/40">
                  {fmt(strategicRisks.rdCapture.rdSpend)} R&D of {fmt(strategicRisks.rdCapture.totalSpend)} total — offset: {fmt(strategicRisks.rdCapture.potentialOffset)}
                </p>
              </div>
            </div>
          </Section>
        )}
      </div>

      {/* Quick nav footer */}
      <div className="grid grid-cols-4 gap-3 mt-6">
        {[
          { href: '/finance/runway', icon: Clock, color: 'text-emerald-400', label: 'Runway & Burn' },
          { href: '/finance/ecosystem', icon: FolderKanban, color: 'text-purple-400', label: 'Project P&L' },
          { href: '/finance/data-quality', icon: AlertTriangle, color: 'text-amber-400', label: 'Data Quality' },
          { href: '/finance/rd-tracking', icon: Beaker, color: 'text-cyan-400', label: 'R&D Tracking' },
        ].map(link => (
          <Link key={link.href} href={link.href}>
            <div className="glass-card p-3 hover:border-white/20 transition-colors cursor-pointer group flex items-center justify-between">
              <div className="flex items-center gap-2">
                <link.icon className={cn('h-4 w-4', link.color)} />
                <span className="text-sm text-white/70 group-hover:text-white">{link.label}</span>
              </div>
              <ChevronRight className="h-3 w-3 text-white/30 group-hover:text-white/60" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
