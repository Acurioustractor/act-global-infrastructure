'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  FileText,
  ChevronRight,
  FlaskConical,
  Target,
  Users,
  Gift,
  Heart,
  ShoppingBag,
  Briefcase,
  Palette,
  Landmark,
  Clock,
  CheckCircle2,
  Circle,
  ExternalLink,
  Gauge,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AskAboutThis } from '@/components/ask-about-this'
import { searchKnowledge, type KnowledgeSearchHit } from '@/lib/api'

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(Math.abs(n)).toLocaleString()}`
  return `$${Math.abs(n).toLocaleString()}`
}

interface MonthlyRow {
  month: string
  revenue: number
  expenses: number
  net: number
  revenueBreakdown: Record<string, number>
  expenseBreakdown: Record<string, number>
  fyYtdRevenue: number
  fyYtdExpenses: number
  fyYtdNet: number
  transactionCount: number
  unmappedCount: number
}

interface VarianceRow {
  month: string
  type: string
  amountChange: number
  pctChange: number | null
  explanation: string
  severity: string
  topDrivers: any[] | null
}

interface BudgetVsActual {
  annualBudget: number
  ytdBudget: number
  ytdActual: number
  variance: number
  utilisationPct: number | null
}

interface RdVendor {
  vendor: string
  category: string
  spend: number
  txCount: number
}

interface RdSummary {
  totalSpend: number
  pctOfExpenses: number
  potentialOffset: number
  topVendors: RdVendor[]
}

interface SalaryAllocation {
  personName: string
  role: string
  allocationPct: number
  monthlyCost: number
  annualCost: number
  rdEligible: boolean
}

interface SalaryAllocations {
  allocations: SalaryAllocation[]
  totalAnnualCost: number
  rdEligibleCost: number
}

interface InvoiceItem {
  invoiceId: string
  invoiceNumber: string
  contact: string
  total: number
  status: string
  type: string
  date: string
  dueDate: string | null
  incomeType: string
  milestone: string | null
  notes: string | null
  description: string | null
}

interface PipelineItem {
  id: string
  name: string
  provider: string | null
  program: string | null
  amountMin: number | null
  amountMax: number | null
  status: string
  stage: string | null
  closesAt: string | null
  probability: number | null
}

interface IncomeTypeGroup {
  received: number
  pending: number
  items: InvoiceItem[]
}

interface ExpenseItem {
  invoiceId: string
  invoiceNumber: string
  contact: string
  total: number
  status: string
  date: string
  dueDate: string | null
  category: string
  rdEligible: boolean
  description: string | null
}

interface ExpenseCategoryGroup {
  total: number
  rdEligible: boolean
  vendors: Record<string, number>
  items: ExpenseItem[]
}

interface ProjectFinancialsData {
  projectCode: string
  monthly: MonthlyRow[]
  totals: { revenue: number; expenses: number; net: number }
  expenseCategories: Record<string, number>
  revenueCategories: Record<string, number>
  budgetVsActual: BudgetVsActual | null
  rdSummary: RdSummary
  salaryAllocations: SalaryAllocations
  revenueStreams: Array<{
    id: string
    name: string
    category: string
    targetMonthly: number
    status: string
  }>
  variances: VarianceRow[]
  recentTransactions: Array<{
    id: string
    date: string
    contact: string
    amount: number
    type: string
  }>
  invoices: InvoiceItem[]
  invoiceSummary: {
    totalReceived: number
    totalPending: number
    totalDraft: number
    count: number
  }
  incomeByType: Record<string, IncomeTypeGroup>
  pipeline: PipelineItem[]
  pipelineWeightedTotal: number
  pipelineRawCount?: number
  expenses: ExpenseItem[]
  expensesByCategory: Record<string, ExpenseCategoryGroup>
  topVendors: Array<{ vendor: string; total: number }>
  totalExpenseInvoices: number
  auditAlerts?: Array<{ severity: 'high' | 'medium' | 'info'; title: string; detail: string; amount?: number; xeroLink?: string }>
  notableFindings?: Array<{ severity: 'high' | 'medium' | 'info'; title: string; detail: string; amount?: number; xeroLink?: string }>
  realExpenseRowCount?: number
  realExpenseTotal?: number
  // S4 2026-05-21: burn-rate + runway impact
  burnMetrics?: {
    projectBurn3moAvg: number
    projectBurn12moAvg: number
    burnAccelerationPct: number | null
    projectShareOfBurnPct: number | null
    orgBurn3moAvg: number
    currentOrgBalance: number
    projectRunwayMonths: number | null
  }
  // S1 2026-05-21: funder allocations
  funding?: Array<{
    allocationId: string
    funder: string
    grantRef: string | null
    committed: number
    drawn: number
    remaining: number
    drawnPct: number | null
    status: 'proposed' | 'committed' | 'drawing' | 'closed' | 'withdrawn'
    periodStart: string | null
    periodEnd: string | null
    pileTag: string | null
    lastDrawnAt: string | null
    drawdownCount: number
    notes: string | null
  }>
  fundingSummary?: {
    totalCommitted: number
    totalDrawn: number
    totalRemaining: number
    activeAllocations: number
    proposedAllocations: number
    closedAllocations: number
  }
  // Item 4 2026-05-21: linked contacts
  contacts?: Array<{
    id: string
    name: string
    entityType: string | null
    email: string | null
    company: string | null
    engagementStatus: string | null
    tags: string[]
    confidence: number | null
    role: 'funder' | 'partner' | 'advisor' | 'lead' | 'responsive' | string
    linkedAt: string
  }>
  contactsSummary?: {
    total: number
    funders: number
    partners: number
    advisors: number
    leads: number
  }
}

const INCOME_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  grant: { label: 'Grants', icon: Gift, color: 'text-amber-400' },
  philanthropy: { label: 'Philanthropy', icon: Heart, color: 'text-pink-400' },
  commercial: { label: 'Commercial', icon: ShoppingBag, color: 'text-blue-400' },
  fee_for_service: { label: 'Fee for Service', icon: Briefcase, color: 'text-cyan-400' },
  arts: { label: 'Arts & Cultural', icon: Palette, color: 'text-purple-400' },
  loan: { label: 'Loans & Investment', icon: Landmark, color: 'text-orange-400' },
  other: { label: 'Other', icon: DollarSign, color: 'text-white/50' },
}

export default function ProjectFinancialsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)

  const { data, isLoading } = useQuery<ProjectFinancialsData>({
    queryKey: ['finance', 'project', code],
    queryFn: () =>
      fetch(`/api/finance/projects/${encodeURIComponent(code)}`).then((r) => r.json()),
  })

  const { data: knowledgeData } = useQuery({
    queryKey: ['knowledge', 'project', code],
    queryFn: () => searchKnowledge(code, { project: code }),
    enabled: !!code,
  })

  const knowledgeHits: KnowledgeSearchHit[] = knowledgeData?.results?.slice(0, 5) || []

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40">Loading financials...</div>
      </div>
    )
  }

  const hasMonthly = (data?.monthly?.length ?? 0) > 0
  const hasInvoices = (data?.invoices?.length ?? 0) > 0
  const hasPipeline = (data?.pipeline?.length ?? 0) > 0

  if (!data || (!hasMonthly && !hasInvoices && !hasPipeline)) {
    return (
      <div className="min-h-screen p-8">
        <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Finance
        </Link>
        <div className="glass-card p-12 text-center">
          <BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white/60 mb-2">No data yet</h2>
          <p className="text-white/40">No invoices, transactions, or pipeline entries for this project.</p>
        </div>
      </div>
    )
  }

  const monthly = data.monthly || []
  const totals = data.totals || { revenue: 0, expenses: 0, net: 0 }
  const maxMonthly = monthly.length > 0 ? Math.max(...monthly.map((m) => Math.max(m.revenue, m.expenses, 1))) : 1

  // Sort categories by total
  const topExpenses = Object.entries(data.expenseCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
  const topRevenue = Object.entries(data.revenueCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  const totalExpenseSum = topExpenses.reduce((s, [, v]) => s + v, 0)
  const totalRevenueSum = topRevenue.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Link href="/finance/projects" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> All Projects
      </Link>

      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-400" />
            {data.projectCode} — P&L
          </h1>
          <p className="text-white/50 mt-1">
            {monthly.length} months of data ({monthly[0]?.month?.substring(0, 7)} to{' '}
            {monthly[monthly.length - 1]?.month?.substring(0, 7)})
          </p>
        </div>
        {/* QW3 2026-05-21: cross-link to Notion pile page (based on first funding's pile_tag, else Money Framework) */}
        {(() => {
          const PILE_LINKS: Record<string, { href: string; label: string }> = {
            voice: { href: 'https://www.notion.so/357ebcf981cf814f9ad3c02a7c9adbe6', label: 'Voice pile in Notion' },
            flow: { href: 'https://www.notion.so/357ebcf981cf815e8926f8d4836ac3ff', label: 'Flow pile in Notion' },
            ground: { href: 'https://www.notion.so/357ebcf981cf81419fc0e527e479932d', label: 'Ground pile in Notion' },
            grants: { href: 'https://www.notion.so/357ebcf981cf81a28e19fa10b077ff7f', label: 'Grants pile in Notion' },
          }
          const firstPile = data.funding?.find((f) => f.pileTag)?.pileTag
          const link = (firstPile && PILE_LINKS[firstPile]) || {
            href: 'https://www.notion.so/357ebcf981cf8101bc12dd5eab9ebec5',
            label: 'Money Framework in Notion',
          }
          return (
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs bg-amber-500/10 text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1.5 self-start"
              title={link.label}
            >
              {link.label} <ExternalLink className="h-3 w-3" />
            </a>
          )
        })()}
      </header>

      {/* Audit alerts + notable findings */}
      {((data.auditAlerts?.length ?? 0) > 0 || (data.notableFindings?.length ?? 0) > 0) && (
        <div className="mb-6 space-y-2">
          {data.notableFindings?.map((f: any, i: number) => (
            <div key={`nf-${i}`} className="glass-card border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-200">{f.title}</div>
                <div className="text-xs text-white/60 mt-0.5">{f.detail}</div>
              </div>
              {f.amount != null && <div className="text-sm font-bold tabular-nums text-emerald-200 whitespace-nowrap">{formatMoney(f.amount)}</div>}
            </div>
          ))}
          {data.auditAlerts?.map((a: any, i: number) => (
            <div key={`aa-${i}`} className={cn(
              'glass-card border p-3 flex items-start justify-between',
              a.severity === 'high' ? 'border-red-500/40 bg-red-500/5' :
              a.severity === 'medium' ? 'border-amber-500/40 bg-amber-500/5' :
              'border-white/20 bg-white/5'
            )}>
              <div className="flex-1">
                <div className={cn(
                  'text-sm font-semibold',
                  a.severity === 'high' ? 'text-red-200' : a.severity === 'medium' ? 'text-amber-200' : 'text-white/80'
                )}>{a.title}</div>
                <div className="text-xs text-white/60 mt-0.5">{a.detail}</div>
                {a.xeroLink && <a href={a.xeroLink} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline mt-1 inline-block">open in Xero ↗</a>}
              </div>
              {a.amount != null && <div className="text-sm font-bold tabular-nums whitespace-nowrap ml-3">{formatMoney(a.amount)}</div>}
            </div>
          ))}
          <div className="flex gap-3 text-xs text-white/40 pt-1">
            <Link href={`/finance/projects/${data.projectCode}/transactions`} className="underline hover:text-white">→ full transaction ledger ({data.realExpenseRowCount} rows)</Link>
            {data.realExpenseTotal != null && <span>Real cost commitment: <span className="text-white font-medium">{formatMoney(data.realExpenseTotal)}</span> (incl. bills, deduped where bank spend pays a bill)</span>}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {hasInvoices ? (
          <>
            <div className="glass-card p-5 text-center">
              <p className="text-2xl font-bold text-green-400 tabular-nums">{formatMoney(data.invoiceSummary.totalReceived)}</p>
              <p className="text-sm text-white/40 mt-1">Received</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{formatMoney(data.invoiceSummary.totalPending)}</p>
              <p className="text-sm text-white/40 mt-1">Pending</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="text-2xl font-bold text-red-400 tabular-nums">{formatMoney(data.totalExpenseInvoices)}</p>
              <p className="text-sm text-white/40 mt-1">Spent</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                (data.invoiceSummary.totalReceived - data.totalExpenseInvoices) >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {(data.invoiceSummary.totalReceived - data.totalExpenseInvoices) >= 0 ? '' : '-'}
                {formatMoney(data.invoiceSummary.totalReceived - data.totalExpenseInvoices)}
              </p>
              <p className="text-sm text-white/40 mt-1">Net Position</p>
            </div>
          </>
        ) : (
          <>
            <div className="glass-card p-5 text-center">
              <p className="text-2xl font-bold text-green-400 tabular-nums">{formatMoney(totals.revenue)}</p>
              <p className="text-sm text-white/40 mt-1">Total Revenue</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="text-2xl font-bold text-red-400 tabular-nums">{formatMoney(totals.expenses)}</p>
              <p className="text-sm text-white/40 mt-1">Total Expenses</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className={cn('text-2xl font-bold tabular-nums', totals.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {totals.net >= 0 ? '' : '-'}{formatMoney(totals.net)}
              </p>
              <p className="text-sm text-white/40 mt-1">Net</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="text-2xl font-bold text-white tabular-nums">
                {formatMoney(Math.abs(totals.expenses) / Math.max(monthly.length, 1))}
              </p>
              <p className="text-sm text-white/40 mt-1">Avg Monthly Spend</p>
            </div>
          </>
        )}
      </div>

      {/* S4 2026-05-21: Burn rate + runway impact */}
      {data.burnMetrics && data.burnMetrics.projectBurn3moAvg > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-white/40">3-month burn</p>
              <TrendingDown className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{formatMoney(data.burnMetrics.projectBurn3moAvg)}</p>
            <p className="text-xs text-white/40 mt-1">
              per month, rolling 3mo avg
              {data.burnMetrics.burnAccelerationPct != null && data.burnMetrics.projectBurn12moAvg > 0 && (
                <>
                  {' '}&middot;{' '}
                  <span className={cn(
                    'font-medium',
                    data.burnMetrics.burnAccelerationPct > 20 ? 'text-red-400' :
                    data.burnMetrics.burnAccelerationPct > 0 ? 'text-amber-400' :
                    'text-emerald-400'
                  )}>
                    {data.burnMetrics.burnAccelerationPct > 0 ? '+' : ''}{data.burnMetrics.burnAccelerationPct}% vs 12mo
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-white/40">Share of org burn</p>
              <Gauge className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">
              {data.burnMetrics.projectShareOfBurnPct != null ? `${data.burnMetrics.projectShareOfBurnPct}%` : '—'}
            </p>
            <p className="text-xs text-white/40 mt-1">
              of org-wide monthly burn ({formatMoney(data.burnMetrics.orgBurn3moAvg)}/mo)
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-white/40">Runway impact</p>
              <Clock className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">
              {data.burnMetrics.projectRunwayMonths != null ? `${data.burnMetrics.projectRunwayMonths}mo` : '—'}
            </p>
            <p className="text-xs text-white/40 mt-1">
              if only this project burned, {formatMoney(data.burnMetrics.currentOrgBalance)} lasts {data.burnMetrics.projectRunwayMonths}mo
            </p>
          </div>
        </div>
      )}

      {/* S1 2026-05-21: Funding sources */}
      {data.funding && data.funding.length > 0 && data.fundingSummary && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
            <Landmark className="h-5 w-5 text-amber-400" />
            Funding sources
          </h2>
          <p className="text-sm text-white/40 mb-4">
            {formatMoney(data.fundingSummary.totalCommitted)} committed
            {data.fundingSummary.totalDrawn > 0 && <> &middot; {formatMoney(data.fundingSummary.totalDrawn)} drawn</>}
            {data.fundingSummary.totalRemaining > 0 && <> &middot; {formatMoney(data.fundingSummary.totalRemaining)} remaining</>}
            {data.fundingSummary.proposedAllocations > 0 && <> &middot; {data.fundingSummary.proposedAllocations} proposed</>}
          </p>
          <div className="space-y-4">
            {data.funding.map((f) => {
              const drawnPct = f.drawnPct ?? (f.committed > 0 ? Math.round(100 * f.drawn / f.committed) : 0)
              const statusColor = f.status === 'drawing' ? 'text-emerald-400' :
                f.status === 'committed' ? 'text-blue-400' :
                f.status === 'proposed' ? 'text-amber-400' :
                f.status === 'closed' ? 'text-white/40' :
                'text-white/30'
              return (
                <div key={f.allocationId} className="border border-white/5 rounded-lg p-4">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white truncate">{f.funder}</div>
                      {f.grantRef && <div className="text-xs text-white/40 truncate mt-0.5">{f.grantRef}</div>}
                    </div>
                    <span className={cn('text-[10px] uppercase tracking-wide font-medium', statusColor)}>{f.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          f.status === 'proposed' ? 'bg-amber-500/40' :
                          drawnPct >= 100 ? 'bg-emerald-500' :
                          drawnPct >= 80 ? 'bg-amber-500' :
                          'bg-blue-500'
                        )}
                        style={{ width: `${Math.min(drawnPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/50 tabular-nums shrink-0">{drawnPct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/40 tabular-nums">
                    <span>{formatMoney(f.drawn)} drawn{f.drawdownCount > 0 ? ` (${f.drawdownCount})` : ''}</span>
                    <span>{formatMoney(f.remaining)} remaining of {formatMoney(f.committed)}</span>
                  </div>
                  {f.notes && f.notes.includes('⚠') && (
                    <div className="mt-2 text-xs text-amber-300 italic">{f.notes}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Item 4 2026-05-21: Linked Contacts panel */}
      {data.contacts && data.contacts.length > 0 && data.contactsSummary && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-cyan-400" />
            Key contacts
          </h2>
          <p className="text-sm text-white/40 mb-4">
            {data.contactsSummary.total} linked contacts
            {data.contactsSummary.funders > 0 && <> &middot; <span className="text-amber-300">{data.contactsSummary.funders} funder{data.contactsSummary.funders === 1 ? '' : 's'}</span></>}
            {data.contactsSummary.partners > 0 && <> &middot; <span className="text-blue-300">{data.contactsSummary.partners} partner{data.contactsSummary.partners === 1 ? '' : 's'}</span></>}
            {data.contactsSummary.advisors > 0 && <> &middot; <span className="text-purple-300">{data.contactsSummary.advisors} advisor{data.contactsSummary.advisors === 1 ? '' : 's'}</span></>}
            {data.contactsSummary.leads > 0 && <> &middot; <span className="text-white/40">{data.contactsSummary.leads} leads</span></>}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.contacts.slice(0, 12).map((c) => {
              const roleColor =
                c.role === 'funder' ? 'text-amber-300 bg-amber-500/10' :
                c.role === 'partner' ? 'text-blue-300 bg-blue-500/10' :
                c.role === 'advisor' ? 'text-purple-300 bg-purple-500/10' :
                c.role === 'responsive' ? 'text-emerald-300 bg-emerald-500/10' :
                'text-white/40 bg-white/5'
              return (
                <div key={c.id} className="border border-white/5 rounded-lg p-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate capitalize">{c.name}</span>
                      <span className={cn('text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded', roleColor)}>{c.role}</span>
                    </div>
                    {c.company && <div className="text-xs text-white/50 truncate mt-0.5">{c.company}</div>}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-xs text-white/40 hover:text-cyan-300 truncate block mt-0.5">{c.email}</a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {data.contacts.length > 12 && (
            <div className="mt-4 text-xs text-white/40 text-center">
              + {data.contacts.length - 12} more linked contacts (view via /relationships)
            </div>
          )}
        </div>
      )}

      {/* Income Streams by Type */}
      {hasInvoices && data.incomeByType && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
            <DollarSign className="h-5 w-5 text-green-400" />
            Income Streams
          </h2>
          <p className="text-sm text-white/40 mb-4">
            {formatMoney(data.invoiceSummary.totalReceived)} received
            {data.invoiceSummary.totalPending > 0 && <> &middot; {formatMoney(data.invoiceSummary.totalPending)} pending</>}
            {data.invoiceSummary.totalDraft > 0 && <> &middot; {formatMoney(data.invoiceSummary.totalDraft)} draft</>}
          </p>

          <div className="space-y-6">
            {Object.entries(data.incomeByType).map(([typeKey, group]) => {
              const config = INCOME_TYPE_CONFIG[typeKey] || INCOME_TYPE_CONFIG.other
              const Icon = config.icon
              const typeTotal = group.received + group.pending
              return (
                <div key={typeKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={cn('h-4 w-4', config.color)} />
                    <span className="text-sm font-medium text-white">{config.label}</span>
                    <span className="text-xs text-white/30 ml-auto tabular-nums">{formatMoney(typeTotal)}</span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((inv: InvoiceItem) => (
                      <div
                        key={inv.invoiceId}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {inv.status === 'PAID' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : inv.status === 'AUTHORISED' ? (
                          <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-white/20 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm text-white truncate">{inv.contact}</span>
                            {inv.milestone && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-white/50 shrink-0">
                                {inv.milestone}
                              </span>
                            )}
                          </div>
                          {inv.notes && (
                            <p className="text-xs text-white/30 truncate mt-0.5">{inv.notes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn(
                            'text-sm font-medium tabular-nums',
                            inv.status === 'PAID' ? 'text-green-400' : 'text-amber-400'
                          )}>
                            {formatMoney(inv.total)}
                          </span>
                          <div className="text-[10px] text-white/30">
                            {inv.invoiceNumber}
                            {inv.dueDate && inv.status !== 'PAID' && (
                              <> &middot; due {new Date(inv.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Milestone Timeline */}
      {hasInvoices && data.invoices.some((i: InvoiceItem) => i.milestone) && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-blue-400" />
            Milestones
          </h2>
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-white/10" />
            <div className="space-y-4">
              {data.invoices
                .filter((i: InvoiceItem) => i.milestone)
                .sort((a: InvoiceItem, b: InvoiceItem) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((inv: InvoiceItem) => (
                  <div key={inv.invoiceId} className="flex items-start gap-4 relative">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10',
                      inv.status === 'PAID' ? 'bg-green-500/20' : 'bg-amber-500/20'
                    )}>
                      {inv.status === 'PAID' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-white">{inv.milestone}</span>
                        <span className={cn(
                          'text-sm font-medium tabular-nums shrink-0',
                          inv.status === 'PAID' ? 'text-green-400' : 'text-amber-400'
                        )}>
                          {formatMoney(inv.total)}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">{inv.contact}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30">
                        <span>{new Date(inv.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className={cn(
                          'px-1.5 py-0.5 rounded font-medium',
                          inv.status === 'PAID' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                        )}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Grant Pipeline */}
      {hasPipeline && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
            <ExternalLink className="h-5 w-5 text-indigo-400" />
            Grant Pipeline
          </h2>
          <p className="text-sm text-white/40 mb-4">
            {data.pipeline.length} unique opportunities &middot; {formatMoney(data.pipelineWeightedTotal)} weighted value
            {typeof data.pipelineRawCount === 'number' && data.pipelineRawCount > data.pipeline.length && (
              <span className="text-xs text-amber-400/80 ml-2">({data.pipelineRawCount - data.pipeline.length} duplicates collapsed)</span>
            )}
            <span className="text-xs text-white/30 ml-2">· showing top 5 by weighted value</span>
          </p>
          <div className="space-y-2">
            {[...data.pipeline]
              .sort((a, b) => {
                const aw = (a.amountMax || a.amountMin || 0) * ((a.probability ?? 0.1))
                const bw = (b.amountMax || b.amountMin || 0) * ((b.probability ?? 0.1))
                return bw - aw
              })
              .slice(0, 5)
              .map((g: PipelineItem) => {
              const amt = g.amountMax || g.amountMin || 0
              return (
                <div key={g.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-white">{g.name}</span>
                    {g.stage && (
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded ml-2',
                        g.stage === 'realized' ? 'bg-green-500/20 text-green-400' :
                        g.stage === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                        g.stage === 'pursuing' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-white/10 text-white/50'
                      )}>
                        {g.stage}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {amt > 0 && (
                      <span className="text-sm font-medium text-white/70 tabular-nums">{formatMoney(amt)}</span>
                    )}
                    {g.probability != null && (
                      <div className="text-[10px] text-white/30">{Math.round(g.probability * 100)}% probability</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <Link
            href="/finance/pipeline"
            className="block text-xs text-blue-400 hover:text-blue-300 pt-2 mt-3 border-t border-white/10 transition-colors"
          >
            View full pipeline →
          </Link>
        </div>
      )}

      {/* Outgoing — Expense Invoices by Category */}
      {data?.expenses && data.expenses.length > 0 && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
            <TrendingDown className="h-5 w-5 text-red-400" />
            Outgoing
          </h2>
          <p className="text-sm text-white/40 mb-4">
            {formatMoney(data.totalExpenseInvoices)} across {data.expenses.length} invoices
          </p>

          {/* Top Vendors */}
          {data.topVendors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">Top Vendors</h3>
              <div className="space-y-2">
                {data.topVendors.slice(0, 8).map((v) => {
                  const pct = data.totalExpenseInvoices > 0 ? (v.total / data.totalExpenseInvoices) * 100 : 0
                  return (
                    <div key={v.vendor}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 truncate mr-2">{v.vendor}</span>
                        <span className="text-white/40 tabular-nums shrink-0">{formatMoney(v.total)}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500/40 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* By Category */}
          {data.expensesByCategory && Object.keys(data.expensesByCategory).length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">By Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(data.expensesByCategory)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([cat, group]) => (
                    <div key={cat} className="p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-white">{cat}</span>
                        {group.rdEligible && (
                          <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-lime-500/20 text-lime-400">R&D</span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-red-400 tabular-nums">{formatMoney(group.total)}</p>
                      <p className="text-[10px] text-white/30">{group.items.length} invoices</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Budget vs Actual + R&D Eligibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Budget vs Actual */}
        {data.budgetVsActual ? (
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-400" />
              Budget vs Actual — FY26
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Annual Budget</span>
                <span className="text-white font-medium tabular-nums">{formatMoney(data.budgetVsActual.annualBudget)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">YTD Actual</span>
                <span className="text-red-400 font-medium tabular-nums">{formatMoney(data.budgetVsActual.ytdActual)}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    (data.budgetVsActual.utilisationPct ?? 0) > 100 ? 'bg-red-500' :
                    (data.budgetVsActual.utilisationPct ?? 0) > 80 ? 'bg-amber-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${Math.min(data.budgetVsActual.utilisationPct ?? 0, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Utilisation</span>
                <span className={cn(
                  'font-medium tabular-nums',
                  (data.budgetVsActual.utilisationPct ?? 0) > 100 ? 'text-red-400' :
                  (data.budgetVsActual.utilisationPct ?? 0) > 80 ? 'text-amber-400' : 'text-blue-400'
                )}>
                  {data.budgetVsActual.utilisationPct ?? 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                <span className="text-white/40">Variance</span>
                <span className={cn(
                  'font-medium tabular-nums',
                  data.budgetVsActual.variance >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {data.budgetVsActual.variance >= 0 ? '+' : '-'}{formatMoney(data.budgetVsActual.variance)} {data.budgetVsActual.variance >= 0 ? 'under' : 'over'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-white/20" />
              Budget vs Actual
            </h3>
            <p className="text-sm text-white/30">No budget set for this project. Add a row to <code className="text-xs">project_budgets</code> to enable tracking.</p>
          </div>
        )}

        {/* R&D Eligibility */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-lime-400" />
            R&D Eligibility
          </h3>
          {data.rdSummary.totalSpend > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">R&D Eligible Spend</span>
                <span className="text-lime-400 font-medium tabular-nums">{formatMoney(data.rdSummary.totalSpend)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">% of Expenses</span>
                <span className="text-lime-400 font-medium tabular-nums">{data.rdSummary.pctOfExpenses}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-lime-500/60 rounded-full" style={{ width: `${Math.min(data.rdSummary.pctOfExpenses, 100)}%` }} />
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                <span className="text-white/40">43.5% Offset</span>
                <span className="text-emerald-400 font-medium tabular-nums">{formatMoney(data.rdSummary.potentialOffset)}</span>
              </div>
              {data.rdSummary.topVendors.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <p className="text-xs text-white/30 mb-1">Top R&D vendors</p>
                  {data.rdSummary.topVendors.slice(0, 5).map(v => (
                    <div key={v.vendor} className="flex justify-between text-xs">
                      <span className="text-white/50 truncate mr-2">{v.vendor}</span>
                      <span className="text-lime-400/70 tabular-nums">{formatMoney(v.spend)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/finance/board"
                className="block text-xs text-blue-400 hover:text-blue-300 pt-1 transition-colors"
              >
                View full R&D tracking →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-white/30">No R&D-eligible spend detected for this project.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Monthly Trend Chart */}
          {hasMonthly && <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Monthly Trend
            </h2>
            <div className="space-y-2">
              {monthly.map((m) => {
                const label = new Date(m.month).toLocaleDateString('en-AU', {
                  month: 'short',
                  year: '2-digit',
                })
                const revPct = (m.revenue / maxMonthly) * 100
                const expPct = (m.expenses / maxMonthly) * 100
                return (
                  <div key={m.month} className="flex items-center gap-2 text-xs">
                    <span className="w-14 text-white/40">{label}</span>
                    <div className="flex-1 flex gap-1">
                      <div
                        className="h-5 rounded bg-emerald-500/60"
                        style={{ width: `${revPct}%`, minWidth: revPct > 0 ? '2px' : '0' }}
                        title={`Revenue: $${m.revenue.toLocaleString()}`}
                      />
                      <div
                        className="h-5 rounded bg-red-500/60"
                        style={{ width: `${expPct}%`, minWidth: expPct > 0 ? '2px' : '0' }}
                        title={`Expenses: $${m.expenses.toLocaleString()}`}
                      />
                    </div>
                    <span className={cn('w-20 text-right tabular-nums', m.net >= 0 ? 'text-green-400/70' : 'text-red-400/70')}>
                      {m.net >= 0 ? '+' : '-'}${Math.abs(Math.round(m.net)).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-white/30">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/60" /> Revenue</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/60" /> Expenses</span>
            </div>
          </div>}

          {/* Variance Explanations */}
          {data.variances.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Variance Explanations
              </h2>
              <div className="space-y-3">
                {data.variances.map((v, i) => (
                  <div key={i} className={cn(
                    'p-3 rounded-lg border',
                    v.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                    v.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-white/10 bg-white/5'
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/70">
                        {new Date(v.month).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                        {' — '}{v.type.replace('_', ' ')}
                      </span>
                      <span className={cn(
                        'text-sm font-medium tabular-nums',
                        v.amountChange >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {v.amountChange >= 0 ? '+' : '-'}{formatMoney(v.amountChange)}
                        {v.pctChange != null && ` (${v.pctChange > 0 ? '+' : ''}${Math.round(v.pctChange)}%)`}
                      </span>
                    </div>
                    <p className="text-sm text-white/50">{v.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          {data.recentTransactions.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-indigo-400" />
                Recent Transactions
                <span className="text-sm text-white/40 font-normal ml-auto">{data.recentTransactions.length}</span>
              </h2>
              <div className="space-y-1">
                {data.recentTransactions.slice(0, 20).map((tx) => {
                  const isOutflow = tx.type === 'SPEND' || tx.type === 'SPEND-OVERPAYMENT' || tx.type === 'ACCPAY'
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                      <div>
                        <span className="text-sm text-white">{tx.contact || 'Unknown'}</span>
                        <span className="text-xs text-white/30 ml-2">{tx.date}</span>
                      </div>
                      <span className={cn('text-sm font-medium tabular-nums', isOutflow ? 'text-red-400' : 'text-green-400')}>
                        {isOutflow ? '−' : '+'}${Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Expense Breakdown */}
          {topExpenses.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-400" />
                Expense Breakdown
              </h3>
              <div className="space-y-2">
                {topExpenses.map(([cat, amt]) => {
                  const pct = totalExpenseSum > 0 ? (amt / totalExpenseSum) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 truncate">{cat}</span>
                        <span className="text-white/40 tabular-nums">{formatMoney(amt)}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500/50 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Revenue Breakdown */}
          {topRevenue.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Revenue Breakdown
              </h3>
              <div className="space-y-2">
                {topRevenue.map(([cat, amt]) => {
                  const pct = totalRevenueSum > 0 ? (amt / totalRevenueSum) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 truncate">{cat}</span>
                        <span className="text-white/40 tabular-nums">{formatMoney(amt)}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/50 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Salary Allocations */}
          {data.salaryAllocations.allocations.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                Team Cost Allocation
              </h3>
              <div className="space-y-2">
                {data.salaryAllocations.allocations.map(a => (
                  <div key={`${a.personName}-${a.role}`} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-white">{a.personName}</span>
                      {a.role && <span className="text-white/30 text-xs ml-1">({a.role})</span>}
                      {a.rdEligible && <span className="text-lime-400/60 text-xs ml-1">R&D</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-white/60 tabular-nums">{Math.round(a.allocationPct * 100)}%</span>
                      <span className="text-white/30 text-xs ml-2 tabular-nums">{formatMoney(a.monthlyCost)}/mo</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Annual Cost</span>
                  <span className="text-white font-medium tabular-nums">{formatMoney(data.salaryAllocations.totalAnnualCost)}</span>
                </div>
                {data.salaryAllocations.rdEligibleCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">R&D Salary</span>
                    <span className="text-lime-400 font-medium tabular-nums">{formatMoney(data.salaryAllocations.rdEligibleCost)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Revenue Streams */}
          {data.revenueStreams.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Revenue Streams
              </h3>
              <div className="space-y-2">
                {data.revenueStreams.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-white">{s.name}</span>
                      <span className="text-white/20 text-xs ml-1">{s.category}</span>
                    </div>
                    {s.targetMonthly > 0 && (
                      <span className="text-purple-400/70 tabular-nums text-xs">{formatMoney(s.targetMonthly)}/mo</span>
                    )}
                  </div>
                ))}
              </div>
              <Link
                href="/finance/overview"
                className="block text-xs text-blue-400 hover:text-blue-300 pt-2 mt-2 border-t border-white/10 transition-colors"
              >
                View all revenue streams →
              </Link>
            </div>
          )}

          {/* FY YTD from latest month */}
          {monthly.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-indigo-400" />
                FY Year-to-Date
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">YTD Revenue</span>
                  <span className="text-green-400 font-medium tabular-nums">{formatMoney(monthly[monthly.length - 1].fyYtdRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">YTD Expenses</span>
                  <span className="text-red-400 font-medium tabular-nums">{formatMoney(monthly[monthly.length - 1].fyYtdExpenses)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-white/40">YTD Net</span>
                  <span className={cn(
                    'font-medium tabular-nums',
                    monthly[monthly.length - 1].fyYtdNet >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {monthly[monthly.length - 1].fyYtdNet >= 0 ? '' : '-'}{formatMoney(monthly[monthly.length - 1].fyYtdNet)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Knowledge Surfacing */}
          {knowledgeHits.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                Related Knowledge
              </h3>
              <div className="space-y-2">
                {knowledgeHits.map((hit) => (
                  <div key={hit.id} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded uppercase shrink-0 mt-0.5',
                        hit.knowledge_type === 'meeting_note' ? 'bg-blue-500/20 text-blue-400' :
                        hit.knowledge_type === 'decision' ? 'bg-amber-500/20 text-amber-400' :
                        hit.knowledge_type === 'action_item' ? 'bg-green-500/20 text-green-400' :
                        'bg-white/10 text-white/50'
                      )}>
                        {hit.knowledge_type?.replace('_', ' ') || 'note'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 truncate">{hit.title}</p>
                        {hit.recorded_at && (
                          <p className="text-[10px] text-white/30 mt-0.5">
                            {new Date(hit.recorded_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href={`/knowledge?project=${data.projectCode}`}
                className="block text-xs text-blue-400 hover:text-blue-300 pt-2 mt-2 border-t border-white/10 transition-colors"
              >
                View all knowledge →
              </Link>
            </div>
          )}

          {/* Link to project page */}
          <Link
            href={`/projects/${data.projectCode}`}
            className="glass-card p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <span className="text-sm text-white/60">View Project Intelligence</span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
        </div>
      </div>

      <AskAboutThis
        pageTitle={`Project ${data.projectCode}`}
        getContext={() => {
          const latest = data.monthly[data.monthly.length - 1]
          const parts: string[] = [
            `Project: ${data.projectCode}`,
            `FY YTD Revenue: $${latest?.fyYtdRevenue?.toLocaleString()}`,
            `FY YTD Expenses: $${latest?.fyYtdExpenses?.toLocaleString()}`,
            `FY YTD Net: $${latest?.fyYtdNet?.toLocaleString()}`,
            `Total Revenue: $${data.totals.revenue?.toLocaleString()}`,
            `Total Expenses: $${data.totals.expenses?.toLocaleString()}`,
          ]
          if (data.rdSummary?.totalSpend) {
            parts.push(`R&D Spend: $${data.rdSummary.totalSpend.toLocaleString()} (${data.rdSummary.pctOfExpenses}% of expenses)`)
            parts.push(`R&D Offset: $${data.rdSummary.potentialOffset?.toLocaleString()}`)
          }
          if (data.rdSummary?.topVendors?.length) {
            parts.push(`Top R&D Vendors: ${data.rdSummary.topVendors.map(v => `${v.vendor} ($${v.spend?.toLocaleString()})`).join(', ')}`)
          }
          return parts.join('\n')
        }}
      />
    </div>
  )
}
