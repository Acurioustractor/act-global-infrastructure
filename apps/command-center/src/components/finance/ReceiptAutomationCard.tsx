'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ScanLine, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataQualityResponse {
  scores?: Array<{ source: string; coverage_pct?: number | null; total?: number | null; tagged?: number | null }>
  untagged?: Array<{ source: string; contact_name: string | null; abs_total: number | null }>
  [k: string]: unknown
}

interface ReceiptsTriageResponse {
  bucket: string
  rows: Array<{ id: string; vendor_name: string | null; amount_detected: number | null; received_at: string | null }>
  counts?: Record<string, number>
  total: number
}

function pct(value: number) {
  return `${value.toFixed(1)}%`
}
function money(value: number) {
  const abs = Math.abs(value)
  return abs >= 1000 ? `$${Math.round(abs).toLocaleString()}` : `$${abs.toFixed(0)}`
}

export function ReceiptAutomationCard() {
  const dq = useQuery<DataQualityResponse>({
    queryKey: ['finance', 'data-quality'],
    queryFn: async () => {
      const res = await fetch('/api/finance/data-quality')
      if (!res.ok) throw new Error('data-quality fetch failed')
      return res.json()
    },
  })

  const tri = useQuery<ReceiptsTriageResponse>({
    queryKey: ['finance', 'receipts-triage', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/finance/receipts-triage?bucket=pending')
      if (!res.ok) throw new Error('receipts-triage fetch failed')
      return res.json()
    },
  })

  const isLoading = dq.isLoading || tri.isLoading
  const hasError = dq.error || tri.error

  if (isLoading) return <div className="glass-card p-5 text-white/40 text-sm">Loading receipt automation...</div>

  const transactionScore = dq.data?.scores?.find(s => s.source?.includes('xero_transactions'))
  const coverage = transactionScore?.coverage_pct ?? null
  const tagged = transactionScore?.tagged ?? 0
  const total = transactionScore?.total ?? 0
  const queueSize = tri.data?.total ?? 0
  const queueAbs = (tri.data?.rows || []).reduce((s, r) => s + Math.abs(r.amount_detected || 0), 0)
  const topVendors = Object.entries(
    (tri.data?.rows || []).reduce<Record<string, number>>((acc, r) => {
      const k = r.vendor_name || 'Unknown'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-cyan-400" />
            Receipt Automation
          </h2>
          <p className="text-xs text-white/40 mt-1">Capture coverage + manual queue</p>
        </div>
        <Link href="/finance/reconciliation" className="text-white/40 hover:text-white text-xs inline-flex items-center gap-1">
          Open <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {hasError && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
          Data sources partially unavailable. Showing what we have.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat
          icon={CheckCircle2}
          label="Coverage"
          value={coverage !== null ? pct(coverage) : '—'}
          sub={total > 0 ? `${tagged.toLocaleString()} / ${total.toLocaleString()} tagged` : 'no source data'}
          tone={coverage !== null && coverage >= 90 ? 'emerald' : coverage !== null && coverage >= 70 ? 'amber' : 'red'}
        />
        <Stat
          icon={AlertTriangle}
          label="Manual queue"
          value={queueSize.toLocaleString()}
          sub={queueAbs > 0 ? `${money(queueAbs)} pending` : 'queue empty'}
          tone={queueSize === 0 ? 'emerald' : queueSize < 20 ? 'amber' : 'red'}
        />
      </div>

      <div>
        <p className="text-xs text-white/40 mb-2">Top vendors needing attention</p>
        {topVendors.length > 0 ? (
          <div className="space-y-1.5">
            {topVendors.map(([vendor, count]) => (
              <div key={vendor} className="flex items-center justify-between text-sm">
                <span className="text-white/70 truncate">{vendor}</span>
                <span className="text-white/40 text-xs tabular-nums shrink-0 ml-2">{count} item{count === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/35">All clear — no pending receipts.</p>
        )}
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof CheckCircle2
  label: string
  value: string
  sub: string
  tone: 'emerald' | 'amber' | 'red'
}) {
  const toneClass = tone === 'emerald' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : 'text-red-300'
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <Icon className={cn('h-4 w-4 mb-2', toneClass)} />
      <p className={cn('text-xl font-bold tabular-nums', toneClass)}>{value}</p>
      <p className="text-xs text-white/40 mt-1">{label}</p>
      <p className="text-[11px] text-white/35 mt-1">{sub}</p>
    </div>
  )
}
