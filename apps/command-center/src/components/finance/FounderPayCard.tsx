'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FounderInvoice {
  invoice_number: string | null
  date: string | null
  total: number
  status: string | null
}

interface FounderPayResponse {
  fy: string
  generatedAt: string
  era: 'pre-cutover' | 'post-cutover'
  cutoverDate: string
  nic: {
    channel: string
    ytdAmount: number
    note: string
    fy27Target: { monthly: number; annual: number }
  }
  ben: {
    channel: string
    ytdAmount: number
    invoiceCount: number
    lastInvoice: FounderInvoice | null
    note: string
    fy27Target: { monthly: number; annual: number }
  }
  caveats: string[]
}

function money(value: number) {
  const abs = Math.abs(value)
  const formatted =
    abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M` : abs >= 1000 ? Math.round(abs).toLocaleString() : abs.toLocaleString()
  return `${value < 0 ? '-' : ''}$${formatted}`
}

export function FounderPayCard() {
  const { data, isLoading, error } = useQuery<FounderPayResponse>({
    queryKey: ['finance', 'founder-pay'],
    queryFn: async () => {
      const res = await fetch('/api/finance/founder-pay')
      if (!res.ok) throw new Error('Failed to load founder pay')
      return res.json()
    },
  })

  if (isLoading) {
    return <div className="glass-card p-5 text-white/40 text-sm">Loading founder pay...</div>
  }
  if (error || !data) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 text-amber-300 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Founder pay unavailable</span>
        </div>
        <p className="text-xs text-white/40">Check Supabase + xero_invoices.</p>
      </div>
    )
  }

  const eraLabel = data.era === 'pre-cutover' ? `Pre-cutover · ${data.fy}` : `Post-cutover · ${data.fy}`

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            Founder Pay
          </h2>
          <p className="text-xs text-white/40 mt-1">{eraLabel} · cutover {data.cutoverDate}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60">YTD</span>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <FounderRow name="Nic" channel={data.nic.channel} ytdAmount={data.nic.ytdAmount} fy27Target={data.nic.fy27Target} note={data.nic.note} />
        <FounderRow name="Ben" channel={data.ben.channel} ytdAmount={data.ben.ytdAmount} fy27Target={data.ben.fy27Target} note={data.ben.note} extra={`${data.ben.invoiceCount} invoices${data.ben.lastInvoice?.date ? ` · last ${data.ben.lastInvoice.date}` : ''}`} />
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
        {data.caveats.map((c, i) => (
          <p key={i} className="text-xs text-amber-200/80 leading-snug">{c}</p>
        ))}
      </div>
    </div>
  )
}

function FounderRow({
  name,
  channel,
  ytdAmount,
  fy27Target,
  note,
  extra,
}: {
  name: string
  channel: string
  ytdAmount: number
  fy27Target: { monthly: number; annual: number }
  note: string
  extra?: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-semibold text-white">{name}</span>
        <span className={cn('text-lg font-bold tabular-nums', ytdAmount >= 0 ? 'text-emerald-300' : 'text-red-300')}>{money(ytdAmount)}</span>
      </div>
      <p className="text-xs text-white/55">{channel}</p>
      {extra && <p className="text-xs text-white/35 mt-1">{extra}</p>}
      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
        <span className="text-white/40">FY27+ target</span>
        <span className="text-white/60 tabular-nums">{money(fy27Target.monthly)}/mo · {money(fy27Target.annual)}/yr</span>
      </div>
      <p className="text-[11px] text-white/35 mt-2 leading-snug">{note}</p>
    </div>
  )
}
