'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Users, AlertTriangle, MessageSquare, ChevronRight } from 'lucide-react'

interface Summary {
  total: number
  tiers: Record<string, number>
  criticalOutstanding: number
  needsReply: number
  totalPaidLifetimeAud: number
  totalOutstandingAud: number
  totalOpenOppValueAud: number
}

function fmtMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${Math.round(n)}`
}

export function SupportersGlanceCard() {
  const { data } = useQuery<{ summary: Summary }>({
    queryKey: ['supporters', 'glance'],
    queryFn: () => fetch('/api/supporters').then((r) => r.json()),
    refetchOnWindowFocus: false,
  })

  if (!data) return null
  const s = data.summary

  return (
    <Link
      href="/supporters"
      className="block glass-card p-5 hover:bg-white/5 transition-colors border border-emerald-500/20"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-400" />
          Supporters
        </h2>
        <span className="text-xs text-emerald-400 flex items-center gap-1">
          Open <ChevronRight className="h-3 w-3" />
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Total</div>
          <div className="text-xl font-semibold mt-1">{s.total}</div>
        </div>
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Lifetime Paid</div>
          <div className="text-xl font-semibold mt-1 text-green-400 tabular-nums">{fmtMoney(s.totalPaidLifetimeAud)}</div>
        </div>
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Outstanding</div>
          <div className="text-xl font-semibold mt-1 text-orange-400 tabular-nums">{fmtMoney(s.totalOutstandingAud)}</div>
        </div>
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-1.5 shrink-0" />
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Critical</div>
            <div className="text-xl font-semibold mt-1 text-red-400">{s.criticalOutstanding}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 text-amber-400 mt-1.5 shrink-0" />
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Needs Reply</div>
            <div className="text-xl font-semibold mt-1 text-amber-400">{s.needsReply}</div>
          </div>
        </div>
      </div>
    </Link>
  )
}
