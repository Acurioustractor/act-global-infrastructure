'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ShieldCheck, Paperclip, Tags, CircleDollarSign, Layers, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/format'

// STATE-surface trust strip (plan 2026-05-29 P2). Renders the live trust meters
// (reconciliation / receipt coverage / tagging) + the General Expenses catch-all
// + a compact pile-mix concentration read folded up from the retired
// /finance/command cockpit. Dark theme to sit inside the overview canvas.

interface TrustMeterData {
  reconciliation: { reconciled: number; total: number; pct: number }
  receiptCoverage: { withReceipt: number; total: number; pct: number }
  tagging: { tagged: number; total: number; pct: number }
  uncategorised429: { bills: number; amount: number }
}

interface PileRow {
  pile: string
  weighted: number
  pctOfWeighted: number
}
interface CommandData {
  pileMix?: { piles: PileRow[]; concentrationWarning: string | null }
}

function barColor(pctVal: number): string {
  if (pctVal >= 90) return 'bg-emerald-400'
  if (pctVal >= 70) return 'bg-amber-400'
  return 'bg-red-400'
}
function textColor(pctVal: number): string {
  if (pctVal >= 90) return 'text-emerald-400'
  if (pctVal >= 70) return 'text-amber-400'
  return 'text-red-400'
}

const PILE_COLORS: Record<string, string> = {
  Voice: 'bg-purple-400',
  Flow: 'bg-cyan-400',
  Ground: 'bg-emerald-400',
  Grants: 'bg-amber-400',
}

function Meter({
  icon: Icon,
  label,
  pct,
  sub,
  href,
}: {
  icon: typeof ShieldCheck
  label: string
  pct: number
  sub: string
  href: string
}) {
  return (
    <Link href={href} className="glass-card p-4 block hover:bg-white/[0.07] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-white/40" />
        <span className="text-xs text-white/40 uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn('text-2xl font-bold tabular-nums', textColor(pct))}>{pct}%</p>
      <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
        <div className={cn('h-full rounded-full', barColor(pct))} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="text-[11px] text-white/40 mt-1.5">{sub}</p>
    </Link>
  )
}

export function TrustMeters() {
  const { data, isLoading } = useQuery<TrustMeterData>({
    queryKey: ['finance', 'trust-meters'],
    queryFn: async () => {
      const res = await fetch('/api/finance/trust-meters')
      if (!res.ok) throw new Error('trust-meters fetch failed')
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  })

  // Pile mix folded up from the retired command cockpit; best-effort.
  const { data: command } = useQuery<CommandData>({
    queryKey: ['finance', 'command', 'pile-mix'],
    queryFn: async () => {
      const res = await fetch('/api/finance/command')
      if (!res.ok) throw new Error('command fetch failed')
      return res.json()
    },
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (isLoading || !data) {
    return (
      <section id="trust">
        <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
      </section>
    )
  }

  const piles = command?.pileMix?.piles ?? []

  return (
    <section id="trust">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-400" />
        Trust &amp; Coverage
        <span className="text-xs font-normal text-white/40">— is the data clean enough to act on?</span>
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Meter
          icon={ShieldCheck}
          label="Reconciliation"
          pct={data.reconciliation.pct}
          sub={`${data.reconciliation.reconciled}/${data.reconciliation.total} ACT spend reconciled`}
          href="/finance/xero-page-copilot"
        />
        <Meter
          icon={Paperclip}
          label="Receipt coverage"
          pct={data.receiptCoverage.pct}
          sub={`${data.receiptCoverage.withReceipt}/${data.receiptCoverage.total} have a receipt in Xero`}
          href="/finance/receipts-triage"
        />
        <Meter
          icon={Tags}
          label="Tagging coverage"
          pct={data.tagging.pct}
          sub={`${data.tagging.tagged}/${data.tagging.total} tagged to a project`}
          href="/finance/tagger-v2"
        />
        <Link
          href="/finance/audit"
          className="glass-card p-4 block hover:bg-white/[0.07] transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign className="h-4 w-4 text-white/40" />
            <span className="text-xs text-white/40 uppercase tracking-wide">Uncategorised (429)</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-400">{formatMoney(data.uncategorised429.amount)}</p>
          <p className="text-[11px] text-white/40 mt-2.5">
            {data.uncategorised429.bills} bills still in General Expenses — lower is better
          </p>
        </Link>
      </div>

      {/* Pile mix concentration — folded up from /finance/command */}
      {piles.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/40 uppercase tracking-wide flex items-center gap-2">
              <Layers className="h-4 w-4" /> Pile mix (weighted pipeline)
            </span>
            {command?.pileMix?.concentrationWarning && (
              <span className="text-[11px] text-amber-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {command.pileMix.concentrationWarning}
              </span>
            )}
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
            {piles.map((p) => (
              <div
                key={p.pile}
                className={cn('h-full', PILE_COLORS[p.pile] ?? 'bg-white/30')}
                style={{ width: `${p.pctOfWeighted}%` }}
                title={`${p.pile}: ${formatMoney(p.weighted)} (${p.pctOfWeighted.toFixed(1)}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {piles.map((p) => (
              <span key={p.pile} className="text-[11px] text-white/50 flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', PILE_COLORS[p.pile] ?? 'bg-white/30')} />
                {p.pile} {p.pctOfWeighted.toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
