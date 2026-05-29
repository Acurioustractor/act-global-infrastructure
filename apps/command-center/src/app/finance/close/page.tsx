'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/format'
import { FreshnessBadge } from '@/components/finance/FreshnessBadge'

// Close-the-books panel (#4 fast-follow) — live counterpart of
// scripts/close-the-books.mjs. Renders the period ready-to-close gate from
// /api/finance/close. Formulas live in the route; this is presentation only.

interface CloseData {
  period: string
  human: string
  window: { start: string; end: string }
  scope: string
  counts: { bills: number; sales: number; txns: number; spends: number }
  lenses: {
    recon: { pct: number; done: number; total: number; band: Band }
    receipts: { coveragePct: number; gap: number; unreceipted: number; overThreshold: number; top: Array<{ vendor: string; amount: number; kind: string }>; band: Band }
    tagging: { pct: number; untagged: number; untaggedDollars: number; band: Band }
    cleanliness: { voidCandidates: number; voidConfirmed: number; sameDayDups: number; ge429Bills: number; ge429Dollars: number; band: Band }
    pnl: { salesInvoiced: number; bankSpend: number; billsRaised: number; netCash: number; byProject: Array<{ project: string; sales: number; spend: number; bills: number }> }
    bas: null | { gstOnSales1A: number; gstCredits1B: number; netGst: number; note: string }
    rd: { classified: number; eligibleDollars: number; byCategory: { core: number; supporting: number; review: number }; receiptCoveragePct: number; note: string }
  }
  gate: { verdict: string; worst: Band; blockers: string[] }
}
type Band = 'green' | 'amber' | 'red'

const PERIODS = ['FY26-Q1', 'FY26-Q2', 'FY26-Q3', 'FY26-Q4', 'FY26', '2026-04', '2026-03', '2026-02']
const dot: Record<Band, string> = { green: '🟢', amber: '🟡', red: '🔴' }
const bandRing: Record<Band, string> = {
  green: 'border-emerald-400/30 bg-emerald-500/5',
  amber: 'border-amber-400/30 bg-amber-500/5',
  red: 'border-red-400/30 bg-red-500/5',
}
const verdictBg: Record<Band, string> = {
  green: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  amber: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  red: 'border-red-400/40 bg-red-500/10 text-red-200',
}
const pct = (n: number) => `${Math.round(n)}%`

function Lens({ band, label, value, children }: { band: Band; label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border p-3', bandRing[band])}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-white/50">{label}</span>
        <span>{dot[band]}</span>
      </div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {children ? <div className="mt-1 text-xs text-white/55">{children}</div> : null}
    </div>
  )
}

export default function CloseBooksPage() {
  const [period, setPeriod] = useState('FY26-Q3')
  const { data, isLoading, error } = useQuery<CloseData>({
    queryKey: ['finance', 'close', period],
    queryFn: async () => {
      const res = await fetch(`/api/finance/close?period=${encodeURIComponent(period)}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `HTTP ${res.status}`)
      return res.json()
    },
  })
  const L = data?.lenses

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"><ArrowLeft className="h-4 w-4" /> Finance</Link>
          <FreshnessBadge />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-semibold"><ClipboardCheck className="h-5 w-5 text-cyan-400" /> Close pack</h1>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period"
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white">
            {PERIODS.map((p) => <option key={p} value={p} className="bg-[#0a0e1a]">{p}</option>)}
          </select>
        </div>

        {isLoading && <div className="mt-10 flex items-center gap-2 text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Computing close pack…</div>}
        {error && <div className="mt-10 rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-200">Failed: {(error as Error).message}</div>}

        {data && L && (
          <>
            <div className="mt-3 text-sm text-white/50">{data.human} · {data.scope} · {data.counts.bills} bills · {data.counts.sales} sales · {data.counts.txns} bank txns</div>

            {/* verdict */}
            <div className={cn('mt-4 rounded-xl border px-4 py-3 text-lg font-semibold', verdictBg[data.gate.worst])}>
              {data.gate.verdict}{data.gate.blockers.length ? ` — ${data.gate.blockers.length} item(s) to clear` : ''}
            </div>

            {/* lenses */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Lens band={L.recon.band} label="Reconciliation" value={pct(L.recon.pct)}>{L.recon.done}/{L.recon.total} ACT txns reconciled</Lens>
              <Lens band={L.receipts.band} label="Receipt coverage" value={pct(L.receipts.coveragePct)}>{formatMoney(L.receipts.gap)} unreceipted · {L.receipts.unreceipted} items{L.receipts.overThreshold ? ` · ${L.receipts.overThreshold} over $1k` : ''}</Lens>
              <Lens band={L.tagging.band} label="Tagging" value={pct(L.tagging.pct)}>{L.tagging.untagged} untagged · {formatMoney(L.tagging.untaggedDollars)}</Lens>
              <Lens band={L.cleanliness.band} label="Cleanliness" value={`${L.cleanliness.voidCandidates + L.cleanliness.sameDayDups + L.cleanliness.ge429Bills} flags`}>{L.cleanliness.voidCandidates} void-cand · {L.cleanliness.sameDayDups} same-day dup · GE-429: {L.cleanliness.ge429Bills}/{formatMoney(L.cleanliness.ge429Dollars)}</Lens>
            </div>

            {/* secondary rows */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-xs uppercase tracking-wide text-white/50">P&amp;L (cash)</div>
                <div className="mt-1 text-sm text-white/80">in {formatMoney(L.pnl.salesInvoiced)} · out {formatMoney(L.pnl.bankSpend)}</div>
                <div className="text-sm text-white/60">net {formatMoney(L.pnl.netCash)} · bills raised {formatMoney(L.pnl.billsRaised)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-xs uppercase tracking-wide text-white/50">BAS (indicative)</div>
                {L.bas ? <><div className="mt-1 text-sm text-white/80">1A {formatMoney(L.bas.gstOnSales1A)} − 1B {formatMoney(L.bas.gstCredits1B)}</div><div className="text-sm text-white/60">net GST {formatMoney(L.bas.netGst)}</div></> : <div className="mt-1 text-sm text-white/40">monthly view — pick a quarter/FY</div>}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-xs uppercase tracking-wide text-white/50">R&amp;D-eligible</div>
                <div className="mt-1 text-sm text-white/80">{formatMoney(L.rd.eligibleDollars)} · receipts {pct(L.rd.receiptCoveragePct)}</div>
                <div className="text-sm text-white/60">core {formatMoney(L.rd.byCategory.core)} / supp {formatMoney(L.rd.byCategory.supporting)}</div>
              </div>
            </div>

            {/* action list */}
            {data.gate.blockers.length > 0 && (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="text-sm font-medium text-white/80">To close {data.period}:</div>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-white/65">
                  {data.gate.blockers.map((b, i) => <li key={i}>{b}</li>)}
                </ol>
              </div>
            )}

            {/* by project */}
            {L.pnl.byProject.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03] text-white/50">
                    <tr><th className="px-3 py-2 text-left font-medium">Project</th><th className="px-3 py-2 text-right font-medium">Sales</th><th className="px-3 py-2 text-right font-medium">Bank spend</th><th className="px-3 py-2 text-right font-medium">Bills raised</th></tr>
                  </thead>
                  <tbody>
                    {L.pnl.byProject.map((p) => (
                      <tr key={p.project} className="border-t border-white/5">
                        <td className="px-3 py-1.5 text-white/80">{p.project}</td>
                        <td className="px-3 py-1.5 text-right text-white/70">{formatMoney(p.sales)}</td>
                        <td className="px-3 py-1.5 text-right text-white/70">{formatMoney(p.spend)}</td>
                        <td className="px-3 py-1.5 text-right text-white/70">{formatMoney(p.bills)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 text-xs text-white/35">
              BAS figures are indicative (accruals) — run <code className="text-white/50">prepare-bas.mjs</code> for the lodgement worksheet. {L.rd.classified === 0 ? L.rd.note : null} Deterministic — matches <code className="text-white/50">close-the-books.mjs {data.period}</code>.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
