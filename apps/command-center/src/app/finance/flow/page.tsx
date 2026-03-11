'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Mail,
  FileText,
  Link2,
  Tag,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────

interface StageItem {
  id: string
  vendor: string
  amount: number
  date: string
  type?: string
  project_code?: string | null
  confidence?: number | null
  dext_id?: string | null
  file_type?: string | null
  days_old: number
}

interface StageSummary {
  stage: string
  label: string
  count: number
  amount: number
  items: StageItem[]
}

interface FlowData {
  generatedAt: string
  stages: StageSummary[]
  kpis: {
    totalTransactions: number
    totalAmount: number
    receiptCoverage: number
    tagCoverage: number
    reconciliationRate: number
    missingReceiptValue: number
    stuckInDext: number
    vendorGaps: number
  }
  vendorGaps: { vendor: string; receiptCount: number }[]
  forwarding: {
    lastForward: string | null
    hoursSince: number | null
    totalForwarded: number
    totalDextReceipts: number
    matchedReceipts: number
    unmatchedReceipts: number
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toFixed(0)}`
}

function timeAgo(iso: string | null) {
  if (!iso) return 'never'
  const h = (Date.now() - new Date(iso).getTime()) / 3600000
  if (h < 1) return `${Math.round(h * 60)}m ago`
  if (h < 24) return `${Math.round(h)}h ago`
  return `${Math.round(h / 24)}d ago`
}

const stageIcons: Record<string, React.ReactNode> = {
  card_spend: <CreditCard className="h-5 w-5" />,
  receipt_found: <Mail className="h-5 w-5" />,
  in_dext: <FileText className="h-5 w-5" />,
  xero_matched: <Link2 className="h-5 w-5" />,
  tagged: <Tag className="h-5 w-5" />,
  reconciled: <CheckCircle2 className="h-5 w-5" />,
}

const stageColors: Record<string, string> = {
  card_spend: 'text-red-400 bg-red-500/10 border-red-500/20',
  receipt_found: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  in_dext: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  xero_matched: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  tagged: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  reconciled: 'text-green-400 bg-green-500/10 border-green-500/20',
}

const stageIconColors: Record<string, string> = {
  card_spend: 'text-red-400',
  receipt_found: 'text-amber-400',
  in_dext: 'text-orange-400',
  xero_matched: 'text-blue-400',
  tagged: 'text-purple-400',
  reconciled: 'text-green-400',
}

// ── Stage Card ──────────────────────────────────────────────────────────

function StageCard({ stage, total }: { stage: StageSummary; total: number }) {
  const [expanded, setExpanded] = useState(false)
  const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0
  const colors = stageColors[stage.stage] || 'text-white/50 bg-white/5 border-white/10'
  const iconColor = stageIconColors[stage.stage] || 'text-white/50'

  return (
    <div className={cn('glass-card border overflow-hidden', colors)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={iconColor}>{stageIcons[stage.stage]}</span>
            <span className="text-sm font-medium text-white">{stage.label}</span>
          </div>
          {stage.items.length > 0 && (
            expanded
              ? <ChevronDown className="h-4 w-4 text-white/30" />
              : <ChevronRight className="h-4 w-4 text-white/30" />
          )}
        </div>
        <div className="text-3xl font-bold text-white tabular-nums">{stage.count.toLocaleString()}</div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-white/40">{pct}% of total</span>
          {stage.amount > 0 && (
            <span className="text-xs text-white/50 tabular-nums">{formatMoney(stage.amount)}</span>
          )}
        </div>
        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
          <div
            className={cn('h-1.5 rounded-full transition-all', {
              'bg-red-400': stage.stage === 'card_spend',
              'bg-amber-400': stage.stage === 'receipt_found',
              'bg-orange-400': stage.stage === 'in_dext',
              'bg-blue-400': stage.stage === 'xero_matched',
              'bg-purple-400': stage.stage === 'tagged',
              'bg-green-400': stage.stage === 'reconciled',
            })}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </button>

      {/* Expanded item list */}
      {expanded && stage.items.length > 0 && (
        <div className="border-t border-white/5 max-h-64 overflow-y-auto">
          {stage.items.map(item => (
            <div key={item.id} className="flex items-center justify-between px-4 py-2 hover:bg-white/5 text-sm border-b border-white/5 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="text-white truncate">{item.vendor}</div>
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <span>{item.date?.substring(0, 10)}</span>
                  {item.days_old > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {item.days_old}d old
                    </span>
                  )}
                  {item.project_code && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">{item.project_code}</span>
                  )}
                  {item.dext_id && (
                    <span className="text-white/20">Dext #{item.dext_id.substring(0, 8)}</span>
                  )}
                </div>
              </div>
              {item.amount > 0 && (
                <span className="text-white/60 tabular-nums ml-2">{formatMoney(item.amount)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Flow Arrow ──────────────────────────────────────────────────────────

function FlowArrow() {
  return (
    <div className="hidden lg:flex items-center justify-center">
      <ArrowRight className="h-5 w-5 text-white/15" />
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────

export default function FinanceFlowPage() {
  const { data, isLoading, refetch, isFetching } = useQuery<FlowData>({
    queryKey: ['finance-flow'],
    queryFn: async () => {
      const res = await fetch('/api/finance/flow')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40 flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" /> Loading flow data...
        </div>
      </div>
    )
  }

  if (!data) return null

  const { stages, kpis, vendorGaps, forwarding } = data
  const totalStageCount = stages.reduce((s, st) => s + st.count, 0)

  return (
    <div className="min-h-screen p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href="/finance" className="text-white/40 hover:text-white/70 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-400" />
              Money Flow
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>
        <p className="text-white/50 text-sm">
          End-to-end: Card → Receipt → Dext → Xero → Tagged → Reconciled
          <span className="ml-3 text-white/30">
            Generated {new Date(data.generatedAt).toLocaleString('en-AU')}
          </span>
        </p>
      </header>

      {/* KPI Strip */}
      <div className="grid grid-cols-6 gap-3 mb-8">
        <div className="glass-card p-3 text-center">
          <div className="text-xs text-white/40 mb-1">Total SPEND</div>
          <div className="text-xl font-bold text-white tabular-nums">{kpis.totalTransactions.toLocaleString()}</div>
          <div className="text-xs text-white/30">{formatMoney(kpis.totalAmount)}</div>
        </div>
        <div className={cn('glass-card p-3 text-center border', kpis.receiptCoverage >= 50 ? 'border-green-500/20' : 'border-red-500/20')}>
          <div className="text-xs text-white/40 mb-1">Receipt Coverage</div>
          <div className={cn('text-xl font-bold tabular-nums', kpis.receiptCoverage >= 50 ? 'text-green-400' : 'text-red-400')}>{kpis.receiptCoverage}%</div>
        </div>
        <div className={cn('glass-card p-3 text-center border', kpis.tagCoverage >= 60 ? 'border-green-500/20' : 'border-amber-500/20')}>
          <div className="text-xs text-white/40 mb-1">Tag Coverage</div>
          <div className={cn('text-xl font-bold tabular-nums', kpis.tagCoverage >= 60 ? 'text-green-400' : 'text-amber-400')}>{kpis.tagCoverage}%</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-xs text-white/40 mb-1">Reconciled</div>
          <div className="text-xl font-bold text-white tabular-nums">{kpis.reconciliationRate}%</div>
        </div>
        <div className={cn('glass-card p-3 text-center border', kpis.missingReceiptValue > 10000 ? 'border-red-500/20' : 'border-white/5')}>
          <div className="text-xs text-white/40 mb-1">Missing Receipt $</div>
          <div className="text-xl font-bold text-red-400 tabular-nums">{formatMoney(kpis.missingReceiptValue)}</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-xs text-white/40 mb-1">Vendor Gaps</div>
          <div className="text-xl font-bold text-amber-400 tabular-nums">{kpis.vendorGaps}</div>
        </div>
      </div>

      {/* Flow Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] gap-3 mb-8">
        {stages.map((stage, i) => (
          <div key={stage.stage} className="contents">
            <StageCard stage={stage} total={totalStageCount} />
            {i < stages.length - 1 && <FlowArrow />}
          </div>
        ))}
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-2 gap-6">
        {/* Vendor Gaps */}
        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Vendor Rule Gaps
            <span className="text-sm font-normal text-white/40">({vendorGaps.length} vendors in Dext with no auto-tag rule)</span>
          </h2>
          {vendorGaps.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-white/50 text-sm">All Dext vendors have matching rules</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {vendorGaps.map(gap => (
                <div key={gap.vendor} className="flex items-center justify-between p-2 bg-white/5 rounded text-sm">
                  <span className="text-white">{gap.vendor}</span>
                  <span className="text-xs text-white/40 tabular-nums">{gap.receiptCount} receipts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Forwarding Status */}
        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-400" />
            Dext Pipeline
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-xs text-white/40 mb-1">Last Forward</div>
              <div className="text-lg font-semibold text-white">{timeAgo(forwarding.lastForward)}</div>
              {forwarding.hoursSince && forwarding.hoursSince > 24 && (
                <div className="text-xs text-red-400 mt-1">Forwarding may be stale</div>
              )}
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-xs text-white/40 mb-1">Emails Forwarded</div>
              <div className="text-lg font-semibold text-white tabular-nums">{forwarding.totalForwarded}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-xs text-white/40 mb-1">Total in Dext</div>
              <div className="text-lg font-semibold text-white tabular-nums">{forwarding.totalDextReceipts}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-xs text-white/40 mb-1">Matched to Xero</div>
              <div className="text-lg font-semibold text-white tabular-nums">
                {forwarding.matchedReceipts}
                <span className="text-xs text-white/30 ml-1">
                  / {forwarding.totalDextReceipts} ({forwarding.totalDextReceipts > 0 ? Math.round(forwarding.matchedReceipts / forwarding.totalDextReceipts * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-white/40 mb-2">Unmatched Dext Receipts</div>
            <div className="text-2xl font-bold text-amber-400 tabular-nums">{forwarding.unmatchedReceipts}</div>
            <div className="text-xs text-white/30 mt-1">
              Need manual matching or improved fuzzy matching rules
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
