'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Users,
  Tractor,
  FlaskConical,
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CircleDot,
  DollarSign,
  HelpCircle,
  ListChecks,
  ArrowRight,
  Calculator,
  BarChart3,
  MessageSquare,
  Send,
  Loader2,
  Banknote,
  TrendingUp,
  Target,
  ExternalLink,
  Receipt,
  Briefcase,
  ChevronDown,
  Lightbulb,
  Link2,
} from 'lucide-react'
import {
  getBusinessOverview,
  getBalanceSheet,
  getRevenueModel,
  askBusinessAdvisor,
  type BusinessData,
  type BalanceSheetData,
  type RevenueModelData,
  type AdvisorResponse,
} from '@/lib/api'
import { cn } from '@/lib/utils'

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase()
  let classes = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium '
  if (lower === 'active' || lower === 'done' || lower === 'complete') {
    classes += 'bg-green-500/20 text-green-400 border border-green-500/30'
  } else if (lower === 'in progress' || lower === 'setup in progress') {
    classes += 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  } else if (lower === 'upcoming') {
    classes += 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
  } else if (lower === 'overdue') {
    classes += 'bg-red-500/20 text-red-400 border border-red-500/30'
  } else {
    classes += 'bg-white/10 text-white/60 border border-white/10'
  }
  return <span className={classes}>{status}</span>
}

function formatDate(dateString: string) {
  if (!dateString) return 'TBD'
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return `$${Math.abs(amount).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function getComplianceStatus(item: BusinessData['compliance'][0]): string {
  if (item.status === 'done') return 'done'
  if (!item.dueDate) return item.status
  const due = new Date(item.dueDate)
  const now = new Date()
  if (due < now) return 'overdue'
  const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil <= 14) return 'upcoming'
  return item.status
}

function ComplianceIcon({ status }: { status: string }) {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-green-400" />
  if (status === 'overdue') return <AlertTriangle className="h-4 w-4 text-red-400" />
  return <Clock className="h-4 w-4 text-indigo-400" />
}

function RoadmapIcon({ status }: { status: string }) {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-green-400" />
  if (status === 'in progress') return <CircleDot className="h-4 w-4 text-blue-400" />
  return <Clock className="h-4 w-4 text-white/30" />
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Revenue Target Calculator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RevenueCalculator({ revenueData }: { revenueData: RevenueModelData }) {
  const { breakdown, current, gap, gapPercentage } = revenueData

  const items = [
    { label: 'Founder Distributions', sublabel: `${revenueData.config.founderTarget.toLocaleString()} x ${revenueData.config.founders}`, amount: breakdown.founderDistributions, color: 'text-emerald-400' },
    { label: 'Operating Costs', sublabel: 'Staff, tools, infra', amount: breakdown.operating, color: 'text-orange-400' },
    { label: 'Project Budgets', sublabel: 'Harvest, Goods, etc.', amount: breakdown.projectBudgets, color: 'text-purple-400' },
    { label: 'R&D Reinvestment', sublabel: 'Platform dev', amount: breakdown.reinvestment, color: 'text-blue-400' },
  ]

  const progressPercent = breakdown.requiredRevenue > 0
    ? Math.min(100, Math.round((current.annualRevenue / breakdown.requiredRevenue) * 100))
    : 0

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-emerald-400" />
        Revenue Target Calculator
      </h2>
      <p className="text-sm text-white/50 mb-5">
        What revenue does ACT need to hit founder targets?
      </p>

      {/* Breakdown */}
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
            <div>
              <span className="text-sm font-medium text-white">{item.label}</span>
              <span className="text-xs text-white/40 ml-2">{item.sublabel}</span>
            </div>
            <span className={cn('font-semibold tabular-nums', item.color)}>
              {formatCurrency(item.amount)}
            </span>
          </div>
        ))}

        {/* Total Required */}
        <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-white/10 border border-white/10">
          <span className="text-sm font-bold text-white">Required Annual Revenue</span>
          <span className="text-lg font-bold text-white tabular-nums">
            {formatCurrency(breakdown.requiredRevenue)}
          </span>
        </div>
      </div>

      {/* Current vs Target */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="glass-card-sm p-4 text-center">
          <TrendingUp className="h-5 w-5 text-green-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-green-400 tabular-nums">{formatCurrency(current.annualRevenue)}</p>
          <p className="text-xs text-white/40 mt-1">
            Current Run Rate
            {current.source === 'xero' && <span className="text-green-400/60 ml-1">(Xero)</span>}
          </p>
        </div>
        <div className="glass-card-sm p-4 text-center">
          <Target className="h-5 w-5 text-blue-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-blue-400 tabular-nums">{formatCurrency(breakdown.requiredRevenue)}</p>
          <p className="text-xs text-white/40 mt-1">Target</p>
        </div>
        <div className="glass-card-sm p-4 text-center">
          <DollarSign className="h-5 w-5 text-amber-400 mx-auto mb-2" />
          <p className={cn('text-xl font-bold tabular-nums', gap > 0 ? 'text-amber-400' : 'text-green-400')}>
            {gap > 0 ? formatCurrency(gap) : 'On Target'}
          </p>
          <p className="text-xs text-white/40 mt-1">Gap</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/50">Progress to target</span>
          <span className="text-xs text-white/50">{progressPercent}%</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              progressPercent >= 100 ? 'bg-green-500' :
              progressPercent >= 50 ? 'bg-blue-500' :
              'bg-amber-500'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {revenueData.config.notes && (
        <p className="text-xs text-white/30 mt-4 italic">{revenueData.config.notes}</p>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Simple Balance Sheet
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function BalanceSheet({ balanceSheet }: { balanceSheet: BalanceSheetData }) {
  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-blue-400" />
        Balance Sheet
      </h2>
      <p className="text-sm text-white/50 mb-5">
        Simplified view from Xero
      </p>

      {/* Cash Position Highlight */}
      <div className="glass-card-sm p-4 mb-6 border-green-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Banknote className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-white">Cash Position</p>
              {balanceSheet.cashAccounts.map(acc => (
                <p key={acc.name} className="text-xs text-white/40">{acc.name}: {formatCurrency(acc.balance)}</p>
              ))}
            </div>
          </div>
          <p className="text-2xl font-bold text-green-400 tabular-nums">
            {formatCurrency(balanceSheet.cashPosition)}
          </p>
        </div>
      </div>

      {/* Three Column Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Assets */}
        <div>
          <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wider">Assets</h3>
          <div className="space-y-2">
            {balanceSheet.assets.items.map((item) => (
              <div key={item.code} className="flex items-center justify-between text-sm">
                <span className="text-white/70 truncate mr-2">{item.name}</span>
                <span className="text-white/90 tabular-nums shrink-0">{formatCurrency(item.balance)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="text-sm font-bold text-green-400 tabular-nums">{formatCurrency(balanceSheet.assets.total)}</span>
          </div>
        </div>

        {/* Liabilities */}
        <div>
          <h3 className="text-sm font-semibold text-red-400 mb-3 uppercase tracking-wider">Liabilities</h3>
          <div className="space-y-2">
            {balanceSheet.liabilities.items.map((item) => (
              <div key={item.code} className="flex items-center justify-between text-sm">
                <span className="text-white/70 truncate mr-2">{item.name}</span>
                <span className="text-white/90 tabular-nums shrink-0">{formatCurrency(item.balance)}</span>
              </div>
            ))}
            {balanceSheet.liabilities.items.length === 0 && (
              <p className="text-xs text-white/30 italic">None recorded</p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="text-sm font-bold text-red-400 tabular-nums">{formatCurrency(balanceSheet.liabilities.total)}</span>
          </div>
        </div>

        {/* Equity */}
        <div>
          <h3 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider">Equity</h3>
          <div className="space-y-2">
            {balanceSheet.equity.items.map((item) => (
              <div key={item.code} className="flex items-center justify-between text-sm">
                <span className="text-white/70 truncate mr-2">{item.name}</span>
                <span className="text-white/90 tabular-nums shrink-0">{formatCurrency(item.balance)}</span>
              </div>
            ))}
            {balanceSheet.equity.items.length === 0 && (
              <p className="text-xs text-white/30 italic">None recorded</p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="text-sm font-bold text-blue-400 tabular-nums">{formatCurrency(balanceSheet.equity.total)}</span>
          </div>
        </div>
      </div>

      {/* Net Assets */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Net Assets (Assets - Liabilities)</span>
          <span className={cn(
            'text-lg font-bold tabular-nums',
            balanceSheet.netAssets >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {formatCurrency(balanceSheet.netAssets)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Business Advisor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PRESET_QUESTIONS = [
  "What revenue do we need to hit founder targets?",
  "How should we structure R&D tax claims?",
  "What's the best salary vs distribution split?",
  "How should we allocate budget across projects?",
]

function BusinessAdvisor() {
  const [question, setQuestion] = useState('')
  const [conversations, setConversations] = useState<AdvisorResponse[]>([])

  const mutation = useMutation({
    mutationFn: askBusinessAdvisor,
    onSuccess: (data) => {
      setConversations(prev => [data, ...prev])
      setQuestion('')
    },
  })

  const handleSubmit = (q?: string) => {
    const finalQuestion = q || question
    if (!finalQuestion.trim() || mutation.isPending) return
    mutation.mutate(finalQuestion)
  }

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-violet-400" />
        Business Advisor
      </h2>
      <p className="text-sm text-white/50 mb-5">
        Ask questions about ACT's business direction — answers are informed by your actual data
      </p>

      {/* Preset Questions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESET_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleSubmit(q)}
            disabled={mutation.isPending}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20 hover:bg-violet-500/25 hover:border-violet-500/40 transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Question Input */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Ask a business question..."
          disabled={mutation.isPending}
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={mutation.isPending || !question.trim()}
          className="btn-action px-4 py-2.5 flex items-center gap-2 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Error */}
      {mutation.isError && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          Failed to get response. Check that the API server is running.
        </div>
      )}

      {/* Responses */}
      {conversations.length > 0 && (
        <div className="space-y-4">
          {conversations.map((conv, i) => (
            <div key={i} className="glass-card-sm p-4">
              <p className="text-sm font-medium text-violet-300 mb-3">{conv.question}</p>
              <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                {conv.answer}
              </div>
              <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-2">
                <span className="text-xs text-white/20">Sources: {conv.context.dataSourcesUsed.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Accountant & Costs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SETUP_COSTS = [
  { item: 'Pty Ltd Registration (ASIC)', cost: 576, notes: 'One-off' },
  { item: 'Accountant Setup (Pty Ltd)', cost: 500, notes: 'Standard Ledger estimate' },
  { item: 'Family Trust Deed (x2)', cost: 1000, notes: '~$500 each' },
  { item: 'Xero Setup + Migration', cost: 300, notes: 'Data migration from sole trader' },
]

const MONTHLY_COSTS = [
  { item: 'Bookkeeping (Standard Ledger)', low: 410, high: 670, notes: 'Or $75/mo DIY via Xero HQ' },
  { item: 'ASIC Annual Review', low: 25, high: 25, notes: '$310/yr prorated' },
  { item: 'Xero Subscription', low: 35, high: 35, notes: 'Growing plan' },
  { item: 'Payroll (per employee)', low: 57, high: 95, notes: 'STP compliant' },
]

const ANNUAL_COSTS = [
  { item: 'Company Tax Return', low: 1500, high: 2500, notes: 'Pty Ltd annual' },
  { item: 'R&D Tax Claim (flat fee)', low: 3000, high: 5000, notes: 'No percentage cut — Standard Ledger' },
  { item: 'Trust Tax Returns (x2)', low: 800, high: 1500, notes: '~$400-750 each' },
  { item: 'AKT ACNC/ASIC Compliance', low: 300, high: 500, notes: 'Annual statement + review' },
  { item: 'BAS Lodgements (quarterly)', low: 600, high: 1200, notes: '~$150-300 x4' },
]

function AccountantCosts() {
  const setupTotal = SETUP_COSTS.reduce((sum, c) => sum + c.cost, 0)
  const monthlyLow = MONTHLY_COSTS.reduce((sum, c) => sum + c.low, 0)
  const monthlyHigh = MONTHLY_COSTS.reduce((sum, c) => sum + c.high, 0)
  const annualLow = ANNUAL_COSTS.reduce((sum, c) => sum + c.low, 0)
  const annualHigh = ANNUAL_COSTS.reduce((sum, c) => sum + c.high, 0)
  const yearOneLow = setupTotal + (monthlyLow * 12) + annualLow
  const yearOneHigh = setupTotal + (monthlyHigh * 12) + annualHigh

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-teal-400" />
          Accountant &amp; Costs
        </h2>
        <a
          href="https://www.standardledger.co/book-a-call"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-teal-500/15 text-teal-300 border border-teal-500/20 hover:bg-teal-500/25 hover:border-teal-500/40 transition-colors"
        >
          Book Free Consultation
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <p className="text-sm text-white/50 mb-6">
        Standard Ledger — startup-native, cloud-first, R&D tax capable
      </p>

      {/* Year 1 Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card-sm p-4 text-center">
          <Receipt className="h-5 w-5 text-teal-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-teal-400 tabular-nums">{formatCurrency(setupTotal)}</p>
          <p className="text-xs text-white/40 mt-1">Setup (one-off)</p>
        </div>
        <div className="glass-card-sm p-4 text-center">
          <DollarSign className="h-5 w-5 text-orange-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-orange-400 tabular-nums">
            {formatCurrency(monthlyLow)}-{formatCurrency(monthlyHigh)}
          </p>
          <p className="text-xs text-white/40 mt-1">Monthly ongoing</p>
        </div>
        <div className="glass-card-sm p-4 text-center">
          <Calculator className="h-5 w-5 text-violet-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-violet-400 tabular-nums">
            {formatCurrency(yearOneLow)}-{formatCurrency(yearOneHigh)}
          </p>
          <p className="text-xs text-white/40 mt-1">Year 1 total estimate</p>
        </div>
      </div>

      {/* Setup Costs */}
      <div className="mb-5">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Setup Costs</h3>
        <div className="space-y-1">
          {SETUP_COSTS.map((c) => (
            <div key={c.item} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
              <div>
                <span className="text-sm text-white">{c.item}</span>
                <span className="text-xs text-white/30 ml-2">{c.notes}</span>
              </div>
              <span className="text-sm font-semibold text-teal-400 tabular-nums">{formatCurrency(c.cost)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/10 border border-white/10">
            <span className="text-sm font-semibold text-white">Total Setup</span>
            <span className="text-sm font-bold text-white tabular-nums">{formatCurrency(setupTotal)}</span>
          </div>
        </div>
      </div>

      {/* Monthly Costs */}
      <div className="mb-5">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Monthly Costs</h3>
        <div className="space-y-1">
          {MONTHLY_COSTS.map((c) => (
            <div key={c.item} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
              <div>
                <span className="text-sm text-white">{c.item}</span>
                <span className="text-xs text-white/30 ml-2">{c.notes}</span>
              </div>
              <span className="text-sm font-semibold text-orange-400 tabular-nums">
                {c.low === c.high ? formatCurrency(c.low) : `${formatCurrency(c.low)}-${formatCurrency(c.high)}`}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/10 border border-white/10">
            <span className="text-sm font-semibold text-white">Total Monthly</span>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatCurrency(monthlyLow)}-{formatCurrency(monthlyHigh)}
            </span>
          </div>
        </div>
      </div>

      {/* Annual Costs */}
      <div className="mb-5">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Annual Costs</h3>
        <div className="space-y-1">
          {ANNUAL_COSTS.map((c) => (
            <div key={c.item} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
              <div>
                <span className="text-sm text-white">{c.item}</span>
                <span className="text-xs text-white/30 ml-2">{c.notes}</span>
              </div>
              <span className="text-sm font-semibold text-violet-400 tabular-nums">
                {formatCurrency(c.low)}-{formatCurrency(c.high)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/10 border border-white/10">
            <span className="text-sm font-semibold text-white">Total Annual</span>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatCurrency(annualLow)}-{formatCurrency(annualHigh)}
            </span>
          </div>
        </div>
      </div>

      {/* Key Highlights */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-xs font-semibold text-green-400 mb-1">R&D Flat Fee</p>
          <p className="text-xs text-white/50">No percentage cut on R&D claims — fixed price</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs font-semibold text-blue-400 mb-1">No Success, No Fee</p>
          <p className="text-xs text-white/50">R&D claim only charged if successful</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs font-semibold text-amber-400 mb-1">DIY Option</p>
          <p className="text-xs text-white/50">$75/mo bookkeeping via Xero HQ self-service</p>
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Setup Roadmap Step Details
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface StepDetail {
  description: string
  suggestions: string[]
  links?: Array<{ label: string; url: string }>
  cost?: string
  owner?: string
  blockedBy?: string
}

const STEP_DETAILS: Record<string, StepDetail> = {
  'Choose company name': {
    description: 'Company name has been decided: A Curious Tractor Pty Ltd. Check ASIC registry to confirm availability before registration.',
    suggestions: [
      'Name confirmed — ready to proceed with registration',
      'ASIC name reservation lasts 2 months if needed ($55)',
      'Business name registration separate from company name ($39/yr or $92/3yr)',
    ],
    links: [
      { label: 'ASIC Name Check', url: 'https://connectonline.asic.gov.au/RegistrySearch/faces/landing/SearchRegisters.jspx' },
    ],
    cost: 'Free (name check)',
    owner: 'Ben',
  },
  'Engage accountant': {
    description: 'Standard Ledger is the recommended accountant — startup-native, cloud-first, handles Pty Ltd + trust setup, R&D tax claims, and Xero integration.',
    suggestions: [
      'Book free consultation via Standard Ledger website',
      'Ask: "Can you handle R&D for software + physical R&D (manufacturing, gardens)?"',
      'Ask: "We have a dormant ACNC charity — can you handle its compliance alongside the Pty Ltd?"',
      'Ask: "We want to automate bookkeeping through Xero + AI — are you set up for that?"',
      'Compare: Azure Group (R&D specialist), William Buck (NFP), Pitcher Partners (Brisbane)',
    ],
    links: [
      { label: 'Standard Ledger — Book a Call', url: 'https://www.standardledger.co/book-a-call' },
      { label: 'Azure Group', url: 'https://www.azuregroup.com.au/' },
      { label: 'William Buck', url: 'https://williambuck.com/' },
    ],
    cost: '$950-2,500 (setup package)',
    owner: 'Ben',
  },
  'Register with ASIC ($576)': {
    description: 'Register A Curious Tractor Pty Ltd with ASIC. The accountant can handle this or you can do it directly via ASIC. Need to decide directors, shareholders, registered office, and constitution.',
    suggestions: [
      'Let accountant handle — they submit the Form 201 and get it right first time',
      'Directors: Ben + Nic (minimum 1 required for Pty Ltd)',
      'Shareholders: Family trusts (once created) — accountant to advise on structure',
      'Registered office: Can use accountant\'s address or home address',
      'Constitution: Replaceable rules (free, ASIC default) or custom ($500-1,500)',
      'Company secretary: Optional for Pty Ltd but recommended — Ben or Nic',
    ],
    links: [
      { label: 'ASIC — Register a Company', url: 'https://asic.gov.au/for-business/registering-a-company/' },
    ],
    cost: '$576 (ASIC fee)',
    owner: 'Accountant',
    blockedBy: 'Engage accountant',
  },
  'Get new ABN': {
    description: 'Apply for a new ABN for the Pty Ltd once ASIC registration is complete. The ACN is assigned at registration; ABN applied for separately.',
    suggestions: [
      'Apply online via ABR — free and usually instant',
      'Need the ACN from ASIC registration',
      'Accountant can lodge this as part of setup package',
    ],
    links: [
      { label: 'ABR — Apply for ABN', url: 'https://www.abr.gov.au/business-super-funds-702charities/applying-abn' },
    ],
    cost: 'Free',
    owner: 'Accountant',
    blockedBy: 'Register with ASIC',
  },
  'Register for GST': {
    description: 'Register the Pty Ltd for GST. Required once turnover exceeds $75K (or voluntarily from day one). Recommended to register from day one to claim input tax credits.',
    suggestions: [
      'Register voluntarily from day one — claim GST on all setup costs',
      'BAS quarterly (standard) or monthly (if expecting regular GST refunds)',
      'Accountant handles via ATO Business Portal',
      'Cash or accrual accounting — accountant to advise (accrual is standard)',
    ],
    links: [
      { label: 'ATO — Register for GST', url: 'https://www.ato.gov.au/Business/GST/Registering-for-GST/' },
    ],
    cost: 'Free',
    owner: 'Accountant',
    blockedBy: 'Get new ABN',
  },
  'Open company bank account': {
    description: 'Open a new business bank account in the Pty Ltd name. NAB is the current bank for the sole trader — easiest to stay with them.',
    suggestions: [
      'NAB Business Everyday account — no monthly fee option available',
      'Need: ACN, ABN, company constitution, director IDs',
      'Set up a separate savings account for tax/BAS reserves',
      'Consider a separate account for grant funds (acquittal tracking)',
      'Enable PayID and direct debit for client payments',
    ],
    links: [
      { label: 'NAB Business Accounts', url: 'https://www.nab.com.au/business/accounts' },
    ],
    cost: 'Free / minimal',
    owner: 'Ben',
    blockedBy: 'Get new ABN',
  },
  'Set up Xero for new entity': {
    description: 'Create a new Xero organisation for the Pty Ltd or convert the existing sole trader org. New org is cleaner; conversion preserves history.',
    suggestions: [
      'New org recommended — clean start for new entity',
      'Import chart of accounts with project tracking codes',
      'Connect NAB bank feed immediately',
      'Set up tracking categories: by project (Harvest, Studio, JH, Goods, Farm)',
      'Enable Dext integration for receipt scanning',
      'Set up invoice templates with Pty Ltd details + ABN',
    ],
    links: [
      { label: 'Xero — Add Organisation', url: 'https://www.xero.com/au/' },
    ],
    cost: '$35/mo (Growing plan)',
    owner: 'Ben + Accountant',
    blockedBy: 'Open company bank account',
  },
  'Set up family trusts (x2)': {
    description: 'Create two discretionary family trusts — one for Ben, one for Nic. Each trust becomes a shareholder of the Pty Ltd, enabling tax-efficient distributions.',
    suggestions: [
      'Accountant drafts trust deeds — standard discretionary (family) trusts',
      'Individual trustees (Ben/Nic) vs corporate trustees — accountant to advise',
      'Ben\'s beneficiaries: Ben, wife, children, future children',
      'Nic\'s beneficiaries: Nic, family members',
      'Get TFN + ABN for each trust',
      'Open trust bank accounts for receiving distributions',
      'Shareholding: 50/50 split unless accountant advises otherwise',
    ],
    cost: '~$1,000 total ($500 each)',
    owner: 'Accountant',
    blockedBy: 'Engage accountant',
  },
  'Register as employer': {
    description: 'Register the Pty Ltd as an employer with the ATO. Required before paying wages to anyone (Ben, Nic, family members).',
    suggestions: [
      'Register via ATO Business Portal — free',
      'Set up Single Touch Payroll (STP) in Xero — mandatory for all employers',
      'Choose default super fund (or let employees choose)',
      'Super guarantee: 12% from 1 Jul 2025 (currently 11.5%)',
      'Define roles and market-rate pay for all family members',
      'Create simple timesheet system for family members (ATO scrutiny protection)',
    ],
    links: [
      { label: 'ATO — Register as Employer', url: 'https://www.ato.gov.au/Business/Registration/Work-out-your-registration/' },
    ],
    cost: 'Free',
    owner: 'Accountant',
    blockedBy: 'Register with ASIC',
  },
  'Get insurance ($20M PL)': {
    description: 'Public liability insurance is required for The Harvest lease (Clause 9 — minimum $20M). Also need workers comp, professional indemnity, and potentially product liability.',
    suggestions: [
      'Public liability $20M — required for Harvest lease, non-negotiable',
      'Workers compensation — required once employing anyone (QLD WorkCover)',
      'Professional indemnity — recommended for Innovation Studio consulting',
      'Product liability — may be needed for Goods marketplace + Harvest food',
      'D&O insurance — consider for AKT directors (Nic, Ben, Jessica)',
      'Get quotes from a commercial insurance broker — they compare across providers',
      'BizCover or CGU for online quotes as a starting point',
    ],
    links: [
      { label: 'BizCover — Quick Quote', url: 'https://www.bizcover.com.au/' },
      { label: 'QLD WorkCover', url: 'https://www.worksafe.qld.gov.au/insurance' },
    ],
    cost: 'Varies ($2,000-5,000+/yr estimated)',
    owner: 'Ben',
    blockedBy: 'Register with ASIC',
  },
  'Transfer operations from sole trader': {
    description: 'Migrate everything from the sole trader to the new Pty Ltd. Contracts, subscriptions, grants, IP, bank, Xero — all need to move.',
    suggestions: [
      'Transfer subscriptions: Supabase, Vercel, GHL, Xero, Notion, Adobe, OpenAI, Anthropic, Dext, GitHub',
      'New Harvest lease in Pty Ltd name (talk to philanthropist)',
      'Farm lease agreement: Nic personal to Pty Ltd (arm\'s length, market rate)',
      'Formally assign IP: codebases, brands (EL, JH, ALMA, LCAA, Goods)',
      'Notify all grant funders of entity change',
      'Update all contractor agreements to new entity',
      'Consider trademark registration for key brands: Empathy Ledger, JusticeHub, ALMA',
    ],
    cost: 'Administrative time',
    owner: 'Ben + Nic',
    blockedBy: 'Set up Xero for new entity',
  },
  'Register with AusIndustry for R&D': {
    description: 'Register R&D activities with the Department of Industry (DISR) for the R&D Tax Incentive. Must be done within 10 months of financial year end.',
    suggestions: [
      'Don\'t register until after first FY with the Pty Ltd',
      'Engage an R&D tax consultant (Standard Ledger offers flat-fee R&D claims)',
      'Start documenting R&D activities NOW — git commits, time logs, hypotheses',
      '43.5% refundable offset for companies with turnover < $20M',
      'Eligible: Empathy Ledger, JusticeHub, Goods, World Tour, Farm R&D, ALMA, LCAA, Agentic system',
      'New AusIndustry application form mandatory from FY25 onwards',
      'Both software and physical R&D (manufacturing, gardens) are eligible',
    ],
    links: [
      { label: 'AusIndustry R&D Tax Incentive', url: 'https://business.gov.au/grants-and-programs/research-and-development-tax-incentive' },
    ],
    cost: '$3,000-5,000 (flat fee claim via accountant)',
    owner: 'Accountant + R&D Consultant',
    blockedBy: 'Register with ASIC',
  },
}

const STEP_RESEARCH_PROMPTS: Record<string, string> = {
  'Choose company name': 'What should we consider when choosing the Pty Ltd company name? Any ASIC naming rules or restrictions we should know about?',
  'Engage accountant': 'Compare Standard Ledger vs Azure Group vs William Buck for our needs: Pty Ltd + 2 family trusts + R&D tax claims (software + physical) + Xero + dormant ACNC charity compliance. Who should we go with and why?',
  'Register with ASIC ($576)': 'Walk me through the ASIC Pty Ltd registration process step by step. What decisions do we need to make before registering? Directors, shareholders, constitution, registered office.',
  'Get new ABN': 'What do we need to apply for the Pty Ltd ABN? Can we register for GST at the same time?',
  'Register for GST': 'Should we register for GST voluntarily from day one? What are the pros and cons? Cash vs accrual accounting — which is better for us?',
  'Open company bank account': 'What documents do we need to open a NAB business account for a new Pty Ltd? Should we set up separate accounts for tax reserves and grant funds?',
  'Set up Xero for new entity': 'Should we create a new Xero org or convert the existing sole trader one? What tracking categories should we set up for our 7 projects?',
  'Set up family trusts (x2)': 'Explain the family trust setup process. Individual vs corporate trustee — pros and cons for our situation. How do trust distributions work with the Pty Ltd dividend?',
  'Register as employer': 'What do we need for employer registration? Walk through STP setup, super obligations, and what to know about employing family members (ATO compliance).',
  'Get insurance ($20M PL)': 'What insurance policies do we need and roughly what will they cost? We need $20M public liability for The Harvest lease, plus workers comp, professional indemnity, and product liability.',
  'Transfer operations from sole trader': 'Create a detailed migration checklist for transferring from sole trader to Pty Ltd. Include subscriptions, contracts, grants, IP, leases, and banking.',
  'Register with AusIndustry for R&D': 'How do we register for the R&D Tax Incentive? What documentation should we start collecting now? Can we claim international R&D activities from the World Tour?',
}

function SetupRoadmap({ roadmap }: { roadmap: BusinessData['setupRoadmap'] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [research, setResearch] = useState<Record<string, string>>({})

  const researchMutation = useMutation({
    mutationFn: askBusinessAdvisor,
    onSuccess: (data, variables) => {
      setResearch(prev => ({ ...prev, [variables]: data.answer }))
    },
  })

  const toggle = (step: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(step)) {
        next.delete(step)
      } else {
        next.add(step)
      }
      return next
    })
  }

  const doneCount = roadmap.filter(s => s.status === 'done').length

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-purple-400" />
          Setup Roadmap
        </h2>
        <span className="text-sm text-white/40">{doneCount}/{roadmap.length} complete</span>
      </div>
      <p className="text-sm text-white/50 mb-5">
        Click any step for details, suggestions, and action links
      </p>

      <div className="space-y-1">
        {roadmap.map((item, i) => {
          const detail = STEP_DETAILS[item.step]
          const isOpen = expanded.has(item.step)

          return (
            <div key={item.step}>
              <button
                onClick={() => toggle(item.step)}
                className="w-full flex items-start gap-3 py-3 px-3 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex flex-col items-center">
                  <RoadmapIcon status={item.status} />
                  {i < roadmap.length - 1 && (
                    <div className="w-px h-6 bg-white/10 mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      'text-sm font-medium',
                      item.status === 'done' ? 'text-white/50 line-through' : 'text-white'
                    )}>{item.step}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={item.status} />
                      {detail && (
                        <ChevronDown className={cn(
                          'h-4 w-4 text-white/30 transition-transform',
                          isOpen && 'rotate-180'
                        )} />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mt-1">{item.notes}</p>
                </div>
              </button>

              {/* Expanded Detail */}
              {isOpen && detail && (
                <div className="ml-10 mb-3 p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <p className="text-sm text-white/70">{detail.description}</p>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-3">
                    {detail.cost && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <DollarSign className="h-3 w-3" />
                        {detail.cost}
                      </span>
                    )}
                    {detail.owner && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Users className="h-3 w-3" />
                        {detail.owner}
                      </span>
                    )}
                    {detail.blockedBy && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="h-3 w-3" />
                        Needs: {detail.blockedBy}
                      </span>
                    )}
                  </div>

                  {/* Suggestions */}
                  <div>
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                      Suggestions
                    </p>
                    <ul className="space-y-1.5">
                      {detail.suggestions.map((s, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-white/60">
                          <span className="text-purple-400 mt-0.5 shrink-0">-</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Links + Ask Advisor */}
                  <div className="flex flex-wrap gap-2">
                    {detail.links?.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25 hover:border-purple-500/40 transition-colors"
                      >
                        <Link2 className="h-3 w-3" />
                        {link.label}
                      </a>
                    ))}
                    {STEP_RESEARCH_PROMPTS[item.step] && !research[STEP_RESEARCH_PROMPTS[item.step]] && (
                      <button
                        onClick={() => researchMutation.mutate(STEP_RESEARCH_PROMPTS[item.step])}
                        disabled={researchMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-teal-500/15 text-teal-300 border border-teal-500/20 hover:bg-teal-500/25 hover:border-teal-500/40 transition-colors disabled:opacity-50"
                      >
                        {researchMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <MessageSquare className="h-3 w-3" />
                        )}
                        Ask Advisor
                      </button>
                    )}
                  </div>

                  {/* Advisor Research Response */}
                  {research[STEP_RESEARCH_PROMPTS[item.step]] && (
                    <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/15">
                      <p className="text-xs font-semibold text-teal-400 mb-2 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Advisor Response
                      </p>
                      <div className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed">
                        {research[STEP_RESEARCH_PROMPTS[item.step]]}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function BusinessPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['business', 'overview'],
    queryFn: getBusinessOverview,
  })

  const { data: revenueData } = useQuery({
    queryKey: ['business', 'revenue-model'],
    queryFn: getRevenueModel,
  })

  const { data: balanceSheet } = useQuery({
    queryKey: ['business', 'balance-sheet'],
    queryFn: getBalanceSheet,
  })

  if (isLoading || !data) {
    return (
      <div className="min-h-screen p-8">
        <header className="mb-8">
          <Link href="/finance" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Finance
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-400" />
            Business
          </h1>
        </header>
        <div className="py-12 text-center text-white/40">Loading business structure...</div>
      </div>
    )
  }

  const overdueCount = data.compliance.filter(c => getComplianceStatus(c) === 'overdue').length
  const roadmapDone = data.setupRoadmap.filter(s => s.status === 'done').length
  const roadmapTotal = data.setupRoadmap.length

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <Link href="/finance" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Finance
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-400" />
            Business
          </h1>
          <p className="text-lg text-white/60 mt-1">
            Company setup, revenue planning, and compliance
          </p>
        </div>
      </header>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">ACT Pty Ltd</p>
              <StatusBadge status={data.entities.pty.status} />
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Founder Target (x2)</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(data.moneyFlow.founderTarget * 2)}</p>
              <p className="text-xs text-white/30">{data.moneyFlow.founderTargetLabel}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <ListChecks className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Setup Progress</p>
              <p className="text-lg font-bold text-white">{roadmapDone}/{roadmapTotal}</p>
              <p className="text-xs text-white/40">steps complete</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              overdueCount > 0 ? 'bg-red-500/20' : 'bg-green-500/20'
            )}>
              <CalendarClock className={cn('h-6 w-6', overdueCount > 0 ? 'text-red-400' : 'text-green-400')} />
            </div>
            <div>
              <p className="text-sm text-white/50">Compliance</p>
              <p className={cn('text-lg font-bold', overdueCount > 0 ? 'text-red-400' : 'text-green-400')}>
                {overdueCount > 0 ? `${overdueCount} Overdue` : 'On Track'}
              </p>
              <p className="text-xs text-white/40">{data.compliance.length} items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Accountant & Costs */}
      <div className="mb-6">
        <AccountantCosts />
      </div>

      {/* Revenue Calculator + Balance Sheet (full width, stacked) */}
      <div className="space-y-6 mb-6">
        {revenueData && <RevenueCalculator revenueData={revenueData} />}
        {balanceSheet && <BalanceSheet balanceSheet={balanceSheet} />}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-8 space-y-6">

          {/* Money Flow - How money moves */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Money Flow
            </h2>
            <p className="text-sm text-white/50 mb-5">
              How revenue flows through ACT to founders and projects
            </p>

            {/* Flow diagram */}
            <div className="flex items-center justify-center gap-3 py-4 flex-wrap mb-6">
              <div className="glass-card-sm px-5 py-4 text-center">
                <div className="font-bold text-emerald-400 text-lg">Revenue</div>
                <div className="text-xs text-white/40 mt-1">Clients &amp; grants</div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/20" />
              <div className="glass-card px-6 py-5 text-center border-blue-500/30">
                <div className="font-bold text-blue-400 text-lg">ACT Pty Ltd</div>
                <div className="text-xs text-white/40 mt-1">{data.entities.pty.status}</div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/20" />
              <div className="flex flex-col gap-2">
                <div className="glass-card-sm px-4 py-2 text-center border-emerald-500/20">
                  <div className="text-sm font-semibold text-emerald-400">BK Trust</div>
                </div>
                <div className="glass-card-sm px-4 py-2 text-center border-emerald-500/20">
                  <div className="text-sm font-semibold text-emerald-400">NM Trust</div>
                </div>
              </div>
            </div>

            {/* Allocations */}
            <div className="space-y-2 mb-6">
              {data.moneyFlow.allocations.map((alloc) => (
                <div key={alloc.name} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      alloc.type === 'founder' ? 'bg-emerald-400' :
                      alloc.type === 'operations' ? 'bg-orange-400' :
                      alloc.type === 'projects' ? 'bg-purple-400' :
                      'bg-blue-400'
                    )} />
                    <span className="text-sm font-medium text-white">{alloc.name}</span>
                  </div>
                  <span className="text-sm text-white/50">{alloc.notes}</span>
                </div>
              ))}
            </div>

            {/* Open Questions */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-amber-400" />
                Decisions Needed
              </h3>
              <div className="space-y-2">
                {data.moneyFlow.openQuestions.map((q) => (
                  <div key={q} className="flex items-start gap-2.5 py-2 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <span className="text-amber-400 mt-0.5 shrink-0 text-sm">?</span>
                    <span className="text-sm text-white/70">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Business Advisor */}
          <BusinessAdvisor />

          {/* Setup Roadmap */}
          <SetupRoadmap roadmap={data.setupRoadmap} />

          {/* R&D Tax Credit */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-blue-400" />
              R&D Tax Credit
            </h2>

            <div className="flex items-center gap-3 mb-5">
              <StatusBadge status={data.rdTaxCredit.status} />
              <span className="text-sm text-white/40">Tracking: {data.rdTaxCredit.trackingPlatform}</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card-sm p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{data.rdTaxCredit.refundRate}</p>
                <p className="text-xs text-white/40 mt-1">Refund Rate</p>
              </div>
              <div className="glass-card-sm p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">${(data.rdTaxCredit.minSpend / 1000).toFixed(0)}K</p>
                <p className="text-xs text-white/40 mt-1">Min Spend Threshold</p>
              </div>
              <div className="glass-card-sm p-4 text-center">
                <p className="text-2xl font-bold text-white">{data.rdTaxCredit.ausIndustryRegistered ? 'Yes' : 'No'}</p>
                <p className="text-xs text-white/40 mt-1">AusIndustry Registered</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Eligible Activities</p>
              <div className="flex flex-wrap gap-2">
                {data.rdTaxCredit.eligibleActivities.map((activity) => (
                  <span key={activity} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Compliance Calendar */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-indigo-400" />
              Compliance Calendar
            </h2>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Item</th>
                    <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Due Date</th>
                    <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {data.compliance.map((item) => {
                    const computedStatus = getComplianceStatus(item)
                    return (
                      <tr key={item.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <ComplianceIcon status={computedStatus} />
                            <span className="text-sm font-medium text-white">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-white/60">{formatDate(item.dueDate)}</td>
                        <td className="px-5 py-3"><StatusBadge status={computedStatus} /></td>
                        <td className="px-5 py-3 text-sm text-white/60">{item.owner}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-4 space-y-6">

          {/* Entity Structure */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-400" />
              Entity Structure
            </h3>
            <div className="glass-card-sm p-4 mb-3 border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-blue-400">{data.entities.pty.name}</span>
              </div>
              <StatusBadge status={data.entities.pty.status} />
              {data.entities.pty.abn && (
                <p className="text-xs text-white/30 mt-2">ABN: {data.entities.pty.abn}</p>
              )}
            </div>
            <div className="text-center text-white/20 text-sm py-1">&darr; distributes to &darr;</div>
            {data.trusts.map((trust) => (
              <div key={trust.name} className="glass-card-sm p-4 mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-emerald-400 text-sm">{trust.name}</span>
                  <StatusBadge status={trust.status} />
                </div>
                <p className="text-xs text-white/40">{trust.trustee} &middot; {trust.shareholding}</p>
                <p className="text-xs text-white/30 mt-1">{trust.role}</p>
              </div>
            ))}
          </div>

          {/* Family Trusts Detail */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              How Founders Get Paid
            </h3>
            <p className="text-sm text-white/50 mb-4">
              ACT Pty Ltd pays distributions to each family trust. The trusts then distribute to beneficiaries.
            </p>
            {data.trusts.map((trust) => (
              <div key={trust.name} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-sm font-medium text-white">{trust.name}</span>
                </div>
                <div className="ml-4 text-xs text-white/40 space-y-0.5">
                  <p>Trustee: {trust.trustee}</p>
                  <p>Beneficiaries: {trust.beneficiaries.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Farm Asset */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Tractor className="h-5 w-5 text-amber-400" />
              Farm Asset
            </h3>
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-white/40">Ownership</span>
                <span className="text-white/80">{data.farmAsset.ownership}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Lease</span>
                <StatusBadge status={data.farmAsset.leaseStatus} />
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">R&D Site</span>
                <span className="text-white/80">{data.farmAsset.rdSiteUsage ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/80">
              {data.farmAsset.notes}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
