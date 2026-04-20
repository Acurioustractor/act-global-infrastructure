'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Tag,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Search,
  TrendingDown,
  Shield,
  Package,
  CreditCard,
  BarChart3,
  Target,
  Ban,
  FileCheck,
  Link2,
  X,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance'

// ── Types ─────────────────────────────────────────────────────────

interface CandidateMatch {
  type: 'bill' | 'receipt_email'
  id: string
  vendor: string
  amount: number
  date: string
  score: number
  label: string
  invoiceNumber?: string
  source?: string
}

interface InboxItem {
  id: string
  date: string
  payee: string
  particulars: string
  amount: number
  projectCode: string | null
  status: string
  rdEligible: boolean
  gstAtRisk: number
  rdAtRisk: number
  notes: string | null
  candidates: CandidateMatch[]
}

interface InboxData {
  items: InboxItem[]
  candidatePool: { bills: number; receipts: number }
  quarter: string
  dateStart: string
  dateEnd: string
}

interface BASReadiness {
  total: number
  matched: number
  noReceiptNeeded: number
  ambiguous: number
  unmatched: number
  covered: number
  coveragePct: number
  tagged: number
  taggedPct: number
}

interface DashboardData {
  bas: BASReadiness
  impact: {
    totalUnmatchedSpend: number
    gstAtRisk: number
    rdUnmatchedSpend: number
    rdOffsetAtRisk: number
    totalAtRisk: number
  }
  projects: {
    projectCode: string
    lineCount: number
    totalSpend: number
    coveragePct: number
    unmatchedCount: number
    unmatchedValue: number
    rdEligible: boolean
  }[]
  rd: {
    totalSpend: number
    potentialOffset: number
    offsetAtRisk: number
    coveragePct: number
    totalLines: number
    unmatchedCount: number
  }
  bills: { total: number; withReceipt: number; receiptPct: number; missing: number }
  vendors: { name: string; unmatchedCount: number; unmatchedValue: number; totalSpend: number; projectCodes: string[] }[]
  pipeline: Record<string, number>
  lastDate: string | null
}

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'
type View = 'inbox' | 'dashboard'

const QUARTER_LABELS: Record<Quarter, string> = {
  Q1: 'Q1 (Jul-Sep)',
  Q2: 'Q2 (Oct-Dec)',
  Q3: 'Q3 (Jan-Mar)',
  Q4: 'Q4 (Apr-Jun)',
}

// ── Inbox Item Card ──────────────────────────────────────────────

function InboxCard({
  item,
  isExpanded,
  onToggle,
  onAction,
  isPending,
}: {
  item: InboxItem
  isExpanded: boolean
  onToggle: () => void
  onAction: (action: string, candidateId?: string, candidateType?: string) => void
  isPending: boolean
}) {
  const hasCandidates = item.candidates.length > 0
  const bestScore = item.candidates[0]?.score || 0

  return (
    <div className={cn(
      'border-b border-white/5 transition-colors',
      isPending && 'opacity-40 pointer-events-none',
    )}>
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors text-left"
      >
        {/* Amount */}
        <div className="w-24 text-right">
          <p className="text-lg font-bold tabular-nums text-white">{formatMoney(item.amount)}</p>
          {item.gstAtRisk > 0 && (
            <p className="text-[10px] text-amber-400/70 tabular-nums">${item.gstAtRisk} GST risk</p>
          )}
        </div>

        {/* Vendor + details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">{item.payee || 'Unknown vendor'}</p>
          <p className="text-xs text-white/40 truncate">{item.particulars || '-'}</p>
        </div>

        {/* Date */}
        <span className="text-xs text-white/40 w-16 text-right">
          {format(new Date(item.date + 'T00:00:00'), 'dd MMM')}
        </span>

        {/* Project */}
        {item.projectCode ? (
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60 w-16 text-center">
            {item.projectCode.replace('ACT-', '')}
          </span>
        ) : (
          <span className="text-xs text-amber-400/60 w-16 text-center">untagged</span>
        )}

        {/* R&D badge */}
        {item.rdEligible && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">R&D</span>
        )}

        {/* Match indicator */}
        <div className="w-20 flex items-center justify-end gap-1">
          {hasCandidates ? (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              bestScore >= 75 ? 'bg-emerald-500/10 text-emerald-400' :
              bestScore >= 50 ? 'bg-amber-500/10 text-amber-400' :
              'bg-white/5 text-white/40'
            )}>
              {item.candidates.length} match{item.candidates.length !== 1 ? 'es' : ''}
            </span>
          ) : (
            <span className="text-xs text-red-400/60">no match</span>
          )}
        </div>

        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-white/20 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
        )}
      </button>

      {/* Expanded: candidate matches + actions */}
      {isExpanded && (
        <div className="px-5 pb-4 bg-white/[0.02]">
          {/* Candidates */}
          {item.candidates.length > 0 ? (
            <div className="space-y-2 mb-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Possible matches</p>
              {item.candidates.map(c => (
                <div key={`${c.type}-${c.id}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  {/* Type icon */}
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    c.type === 'bill' ? 'bg-blue-500/10' : 'bg-indigo-500/10'
                  )}>
                    {c.type === 'bill' ? (
                      <FileCheck className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Receipt className="h-4 w-4 text-indigo-400" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80">{c.label}</p>
                    <p className="text-xs text-white/40">
                      {c.type === 'bill' ? `Bill ${c.invoiceNumber || ''}` : `Receipt (${c.source || 'unknown'})`}
                      {' · '}{formatMoney(c.amount)}
                      {' · '}{format(new Date(c.date), 'dd MMM yyyy')}
                    </p>
                  </div>

                  {/* Confidence */}
                  <span className={cn(
                    'text-xs font-bold tabular-nums px-2 py-0.5 rounded',
                    c.score >= 75 ? 'bg-emerald-500/10 text-emerald-400' :
                    c.score >= 50 ? 'bg-amber-500/10 text-amber-400' :
                    'bg-white/5 text-white/40'
                  )}>
                    {c.score}%
                  </span>

                  {/* Link button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAction('match', c.id, c.type)
                    }}
                    className="px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                  >
                    <Link2 className="h-3 w-3" />
                    Link
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 mb-3">
              <p className="text-xs text-white/30">No matching bills or receipts found in the system.</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <button
              onClick={() => onAction('no_receipt')}
              className="px-3 py-1.5 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors flex items-center gap-1"
            >
              <Ban className="h-3 w-3" />
              No receipt needed
            </button>
            <button
              onClick={() => onAction('dismiss')}
              className="px-3 py-1.5 rounded-md bg-white/5 text-white/40 text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Skip for now
            </button>
            {item.gstAtRisk > 0 && (
              <span className="text-[10px] text-amber-400/50 ml-auto">
                Marking no-receipt forfeits ${item.gstAtRisk} GST
                {item.rdAtRisk > 0 && ` + $${item.rdAtRisk} R&D offset`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── BAS Readiness Compact ────────────────────────────────────────

function BASCompact({ bas }: { bas: BASReadiness }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (bas.coveragePct / 100) * circumference

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={radius} fill="none"
            stroke={bas.coveragePct >= 90 ? '#34d399' : bas.coveragePct >= 70 ? '#fbbf24' : '#f87171'}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            'text-xl font-bold tabular-nums',
            bas.coveragePct >= 90 ? 'text-emerald-400' : bas.coveragePct >= 70 ? 'text-amber-400' : 'text-red-400'
          )}>
            {bas.coveragePct}%
          </span>
        </div>
      </div>
      <div className="text-xs space-y-1">
        <p className="text-white/60"><span className="text-emerald-400 font-medium">{bas.matched}</span> matched · <span className="text-cyan-400 font-medium">{bas.noReceiptNeeded}</span> no receipt</p>
        <p className="text-white/40">{bas.unmatched + bas.ambiguous} need action · {bas.total} total</p>
        <p className="text-white/40">{bas.taggedPct}% project-tagged</p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const queryClient = useQueryClient()
  const [quarter, setQuarter] = useState<Quarter>('Q2')
  const [view, setView] = useState<View>('inbox')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  // Dashboard data
  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ['reconciliation', quarter],
    queryFn: () =>
      fetch(`/api/finance/reconciliation?quarter=${quarter}`).then(r => r.json()),
    staleTime: 2 * 60 * 1000,
  })

  // Inbox data
  const { data: inbox, isLoading: inboxLoading } = useQuery<InboxData>({
    queryKey: ['reconciliation-inbox', quarter],
    queryFn: () =>
      fetch(`/api/finance/reconciliation/inbox?quarter=${quarter}`).then(r => r.json()),
    staleTime: 60 * 1000,
  })

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: (payload: { lineId: string; action: string; candidateId?: string; candidateType?: string }) =>
      fetch('/api/finance/reconciliation/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json()),
    onMutate: ({ lineId }) => setPendingAction(lineId),
    onSettled: () => setPendingAction(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-inbox'] })
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] })
      setExpandedId(null)
    },
  })

  function handleAction(lineId: string, action: string, candidateId?: string, candidateType?: string) {
    actionMutation.mutate({ lineId, action, candidateId, candidateType })
  }

  const bas = dashboard?.bas
  const impact = dashboard?.impact
  const items = inbox?.items || []
  const projects = dashboard?.projects || []
  const vendors = dashboard?.vendors || []

  // Split inbox into priority tiers
  const highPriority = items.filter(i => i.amount > 500 && i.candidates.length > 0)
  const lowPriority = items.filter(i => i.amount <= 500 || i.candidates.length === 0)

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Shield className="h-6 w-6 text-cyan-400" />
                Spending Intelligence
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                {items.length > 0 ? `${items.length} items need attention` : 'All clear'}
                {' · '}{QUARTER_LABELS[quarter]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setView('inbox')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                  view === 'inbox' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                )}
              >
                <Inbox className="h-3.5 w-3.5" />
                Inbox
                {items.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">{items.length}</span>
                )}
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                  view === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Dashboard
              </button>
            </div>

            {/* Quarter selector */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map(q => (
                <button
                  key={q}
                  onClick={() => { setQuarter(q); setExpandedId(null) }}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    quarter === q ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {q}
                </button>
              ))}
            </div>

            <a href="https://go.xero.com" target="_blank" rel="noopener noreferrer" className="btn-glass flex items-center gap-2 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              Xero
            </a>
          </div>
        </div>
      </header>

      {/* BAS Compact + Impact strip */}
      {bas && impact && (
        <div className="glass-card p-4 mb-6 flex items-center gap-6">
          <BASCompact bas={bas} />
          <div className="h-12 w-px bg-white/10" />
          <div className="flex gap-6 flex-1">
            <div>
              <p className="text-xs text-white/40">Unreceipted</p>
              <p className="text-lg font-bold text-red-400 tabular-nums">{formatMoneyCompact(impact.totalUnmatchedSpend)}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">GST at risk</p>
              <p className="text-lg font-bold text-amber-400 tabular-nums">{formatMoneyCompact(impact.gstAtRisk)}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">R&D at risk</p>
              <p className="text-lg font-bold text-purple-400 tabular-nums">{formatMoneyCompact(impact.rdOffsetAtRisk)}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">Total at risk</p>
              <p className={cn('text-lg font-bold tabular-nums',
                impact.totalAtRisk > 5000 ? 'text-red-400' : impact.totalAtRisk > 1000 ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {formatMoneyCompact(impact.totalAtRisk)}
              </p>
            </div>
          </div>
          {dashboard?.bills && dashboard.bills.total > 0 && (
            <>
              <div className="h-12 w-px bg-white/10" />
              <div>
                <p className="text-xs text-white/40">Xero bills</p>
                <p className="text-sm text-emerald-400 font-medium">{dashboard.bills.receiptPct}% receipted</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── INBOX VIEW ──────────────────────────────────────────── */}
      {view === 'inbox' && (
        <>
          {inboxLoading ? (
            <div className="glass-card p-12 text-center text-white/40">Loading inbox...</div>
          ) : items.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-emerald-400">Inbox zero</p>
              <p className="text-sm text-white/40 mt-1">All statement lines have receipts or are marked no-receipt-needed</p>
            </div>
          ) : (
            <>
              {/* High priority — has candidates, worth matching */}
              {highPriority.length > 0 && (
                <div className="glass-card overflow-hidden mb-4">
                  <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Match these first — {highPriority.length} items with candidates
                    </h3>
                    <span className="text-xs text-white/30">
                      {formatMoney(highPriority.reduce((s, i) => s + i.amount, 0))} at stake
                    </span>
                  </div>
                  {highPriority.map(item => (
                    <InboxCard
                      key={item.id}
                      item={item}
                      isExpanded={expandedId === item.id}
                      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      onAction={(action, cId, cType) => handleAction(item.id, action, cId, cType)}
                      isPending={pendingAction === item.id}
                    />
                  ))}
                </div>
              )}

              {/* Low priority — small amounts or no candidates */}
              {lowPriority.length > 0 && (
                <div className="glass-card overflow-hidden mb-4">
                  <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Search className="h-4 w-4 text-white/40" />
                      {lowPriority.length} more items
                    </h3>
                    <span className="text-xs text-white/30">
                      {formatMoney(lowPriority.reduce((s, i) => s + i.amount, 0))} total
                    </span>
                  </div>
                  {lowPriority.map(item => (
                    <InboxCard
                      key={item.id}
                      item={item}
                      isExpanded={expandedId === item.id}
                      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      onAction={(action, cId, cType) => handleAction(item.id, action, cId, cType)}
                      isPending={pendingAction === item.id}
                    />
                  ))}
                </div>
              )}

              {inbox && (
                <p className="text-xs text-white/30 text-center mt-3">
                  Searching {inbox.candidatePool.bills} bills + {inbox.candidatePool.receipts} receipt emails for matches
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* ── DASHBOARD VIEW ──────────────────────────────────────── */}
      {view === 'dashboard' && dashboard && (
        <>
          {/* R&D Summary */}
          {dashboard.rd && dashboard.rd.totalLines > 0 && (
            <div className="glass-card p-5 mb-4 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">R&D Tax Offset (43.5%)</h3>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    dashboard.rd.coveragePct >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
                  )}>
                    {dashboard.rd.coveragePct}% receipted
                  </span>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-lg font-bold text-purple-400 tabular-nums">{formatMoneyCompact(dashboard.rd.totalSpend)}</p>
                    <p className="text-[10px] text-white/40">eligible spend</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatMoneyCompact(dashboard.rd.potentialOffset)}</p>
                    <p className="text-[10px] text-white/40">potential offset</p>
                  </div>
                  <div>
                    <p className={cn('text-lg font-bold tabular-nums', dashboard.rd.offsetAtRisk > 0 ? 'text-red-400' : 'text-emerald-400')}>
                      {formatMoneyCompact(dashboard.rd.offsetAtRisk)}
                    </p>
                    <p className="text-[10px] text-white/40">at risk</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Spend */}
          {projects.length > 0 && (
            <div className="glass-card mb-4 overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                  Project Spend — {QUARTER_LABELS[quarter]}
                </h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-white/30 uppercase tracking-wider border-b border-white/5">
                    <th className="text-left py-2 px-5">Project</th>
                    <th className="text-right py-2 px-3">Lines</th>
                    <th className="text-right py-2 px-3">Spend</th>
                    <th className="text-center py-2 px-3">Coverage</th>
                    <th className="text-right py-2 px-3">Unmatched</th>
                    <th className="text-center py-2 px-3">R&D</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.projectCode} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                      <td className="py-2.5 px-5">
                        <span className={cn(
                          'text-xs font-mono px-1.5 py-0.5 rounded',
                          p.projectCode === 'Untagged' ? 'bg-amber-500/10 text-amber-400' : 'bg-white/10 text-white/70'
                        )}>
                          {p.projectCode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{p.lineCount}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-white/70 font-medium">{formatMoney(p.totalSpend)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', p.coveragePct >= 90 ? 'bg-emerald-500' : p.coveragePct >= 70 ? 'bg-amber-500' : 'bg-red-500')}
                              style={{ width: `${p.coveragePct}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/40 tabular-nums w-8">{p.coveragePct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {p.unmatchedCount > 0 ? (
                          <span className="text-xs tabular-nums text-red-400">{p.unmatchedCount} ({formatMoneyCompact(p.unmatchedValue)})</span>
                        ) : (
                          <span className="text-xs text-emerald-400">clear</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.rdEligible ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium">43.5%</span>
                        ) : (
                          <span className="text-xs text-white/15">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Vendor Intelligence (collapsible) */}
          {vendors.length > 0 && (
            <div className="glass-card mb-4 overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'vendors' ? null : 'vendors')}
                className="w-full p-5 border-b border-white/10 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Search className="h-4 w-4 text-amber-400" />
                  Vendor Intelligence — {vendors.length} with gaps
                </h3>
                {expandedSection === 'vendors' ? <ChevronDown className="h-4 w-4 text-white/30" /> : <ChevronRight className="h-4 w-4 text-white/30" />}
              </button>
              {expandedSection === 'vendors' && (
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-white/30 uppercase tracking-wider border-b border-white/5">
                      <th className="text-left py-2 px-5">Vendor</th>
                      <th className="text-right py-2 px-3">Unmatched</th>
                      <th className="text-right py-2 px-3">Gap</th>
                      <th className="text-right py-2 px-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.slice(0, 20).map(v => (
                      <tr key={v.name} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                        <td className="py-2 px-5 text-white/80">{v.name || 'Unknown'}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-red-400">{v.unmatchedCount}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-red-400/70">{formatMoneyCompact(v.unmatchedValue)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-white/60">{formatMoneyCompact(v.totalSpend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Receipt Pipeline */}
          {Object.keys(dashboard.pipeline || {}).length > 0 && (
            <div className="glass-card p-5 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-400" />
                Receipt Pipeline
              </h3>
              <div className="flex gap-4">
                {[
                  { key: 'captured', label: 'Captured', color: 'text-blue-400' },
                  { key: 'matched', label: 'Matched', color: 'text-indigo-400' },
                  { key: 'review', label: 'Review', color: 'text-amber-400' },
                  { key: 'uploaded', label: 'Uploaded', color: 'text-emerald-400' },
                ].filter(s => dashboard.pipeline[s.key]).map(stage => (
                  <div key={stage.key} className="text-center">
                    <p className={cn('text-xl font-bold tabular-nums', stage.color)}>{dashboard.pipeline[stage.key]}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{stage.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <Link href="/finance/tagger" className="glass-card p-4 hover:bg-white/5 transition-colors group">
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">Transaction Tagger</p>
              <p className="text-xs text-white/40">Tag untagged lines</p>
            </div>
          </div>
        </Link>
        <Link href="/finance/overview" className="glass-card p-4 hover:bg-white/5 transition-colors group">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">Financial Overview</p>
              <p className="text-xs text-white/40">Cash, runway, P&L</p>
            </div>
          </div>
        </Link>
        <a href="https://go.xero.com" target="_blank" rel="noopener noreferrer" className="glass-card p-4 hover:bg-white/5 transition-colors group">
          <div className="flex items-center gap-3">
            <ExternalLink className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Open Xero</p>
              <p className="text-xs text-white/40">Bank reconciliation</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  )
}
