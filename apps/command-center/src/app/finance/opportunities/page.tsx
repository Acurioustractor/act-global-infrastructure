'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft, ExternalLink, Landmark, HeartHandshake, Building2, ShoppingBag,
  Receipt, Clock, MessageCircle, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/format'

interface Warmth {
  lastTouchDays: number | null
  lastTouchSubject: string | null
  lastTouchDirection: string | null
  total365d: number | null
}

interface Card {
  id: string
  title: string
  value: number | null
  stage: string | null
  sub: string | null
  badge: string | null
  link: string | null
  warmthRank: number
  warmth: Warmth | null
}

interface Lane {
  cards: Card[]
  count: number
  total: number
}

interface Rung0Invoice {
  id: string
  invoiceNumber: string | null
  contactName: string | null
  total: number
  amountDue: number
  date: string | null
  dueDate: string | null
  daysOutstanding: number | null
}

interface OpportunitiesResponse {
  rung0: { invoices: Rung0Invoice[]; count: number; total: number }
  lanes: {
    grants: Lane
    philanthropy: Lane
    procurement: Lane
    buyers: Lane
  }
  error?: string
}

type LaneKey = 'grants' | 'philanthropy' | 'procurement' | 'buyers'

const LANE_META: Record<
  LaneKey,
  { label: string; sub: string; icon: any; color: string; bg: string; border: string }
> = {
  grants: {
    label: 'Grants',
    sub: 'live applications',
    icon: Landmark,
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  philanthropy: {
    label: 'Philanthropy',
    sub: 'funded first → prospects',
    icon: HeartHandshake,
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  procurement: {
    label: 'Corporate / Procurement',
    sub: 'prospects — no current contracts',
    icon: Building2,
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  buyers: {
    label: 'Buyers',
    sub: 'Goods buyer + supporter journey',
    icon: ShoppingBag,
    color: 'text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
}

function WarmthLine({ warmth }: { warmth: Warmth | null }) {
  if (!warmth || warmth.lastTouchDays == null) return null
  const d = warmth.lastTouchDays
  const color = d <= 14 ? 'text-emerald-400' : d <= 60 ? 'text-amber-400' : 'text-white/40'
  return (
    <div className={cn('mt-2 flex items-center gap-1.5 text-[11px]', color)} title={warmth.lastTouchSubject || undefined}>
      <MessageCircle className="h-3 w-3 shrink-0" />
      <span>
        last touch {d}d ago
        {warmth.total365d != null ? ` · ${warmth.total365d} in 12mo` : ''}
        {warmth.lastTouchDirection ? ` · ${warmth.lastTouchDirection}` : ''}
      </span>
    </div>
  )
}

function OppCard({ card }: { card: Card }) {
  const inner = (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/25 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white leading-snug">{card.title}</p>
        {card.link && <ExternalLink className="h-3 w-3 shrink-0 text-white/30" />}
      </div>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        {card.value != null && (
          <span className="text-sm font-semibold tabular-nums text-white">{formatMoney(card.value)}</span>
        )}
        {card.stage && (
          <span className="text-[11px] text-white/50">{card.stage}</span>
        )}
      </div>
      {card.sub && <p className="mt-1 text-[11px] text-white/40">{card.sub}</p>}
      {card.badge && (
        <span
          className={cn(
            'mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
            card.badge === 'funded before' || card.badge === 'won'
              ? 'bg-emerald-500/15 text-emerald-300'
              : card.badge === 'declined'
              ? 'bg-red-500/15 text-red-300'
              : 'bg-white/10 text-white/50'
          )}
        >
          {card.badge}
        </span>
      )}
      <WarmthLine warmth={card.warmth} />
    </div>
  )
  if (card.link) {
    return (
      <a href={card.link} target="_blank" rel="noreferrer" className="block">
        {inner}
      </a>
    )
  }
  return inner
}

function LaneColumn({ laneKey, lane }: { laneKey: LaneKey; lane: Lane }) {
  const meta = LANE_META[laneKey]
  const Icon = meta.icon
  return (
    <div className="flex flex-col min-w-0">
      <div className={cn('rounded-t-lg border-x border-t px-3 py-2.5', meta.bg, meta.border)}>
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', meta.color)} />
          <h2 className={cn('text-sm font-semibold', meta.color)}>{meta.label}</h2>
        </div>
        <p className="mt-0.5 text-[11px] text-white/40">{meta.sub}</p>
        <p className="mt-1 text-xs text-white/60 tabular-nums">
          {lane.count} {lane.count === 1 ? 'card' : 'cards'} · Σ {formatMoney(lane.total)}
        </p>
      </div>
      <div className={cn('flex-1 space-y-2 rounded-b-lg border-x border-b p-2', meta.border, 'bg-black/20')}>
        {lane.cards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-[11px] text-white/30">
            Nothing live in this lane right now.
          </div>
        ) : (
          lane.cards.map(c => <OppCard key={c.id} card={c} />)
        )}
      </div>
    </div>
  )
}

export default function OpportunitiesPage() {
  const { data, isLoading } = useQuery<OpportunitiesResponse>({
    queryKey: ['finance', 'opportunities'],
    queryFn: () => fetch('/api/finance/opportunities').then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40">Loading the board…</div>
      </div>
    )
  }

  if (data?.error) {
    return (
      <div className="min-h-screen p-8">
        <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Finance
        </Link>
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <span>Could not load the board: {data.error}</span>
        </div>
      </div>
    )
  }

  const rung0 = data?.rung0
  const lanes = data?.lanes
  const laneOrder: LaneKey[] = ['grants', 'philanthropy', 'procurement', 'buyers']

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Finance
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Opportunities — four-lane board</h1>
        <p className="text-white/50 mt-1">
          Every funding opportunity, one board, warm → cold within each lane. Grants · Philanthropy · Corporate/Procurement · Buyers.
        </p>
      </header>

      {/* RUNG-0 STRIP — dollars already earned, not pipeline */}
      {rung0 && rung0.count > 0 && (
        <section className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4 text-emerald-300" />
            <h2 className="text-sm font-semibold text-emerald-300">Rung 0 — in-flight receivables</h2>
            <span className="text-xs text-white/50 tabular-nums">
              {rung0.count} invoice{rung0.count === 1 ? '' : 's'} · {formatMoney(rung0.total)} owed to ACT
            </span>
            <span className="ml-auto text-[11px] text-white/30">dollars already earned — chase these first</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-white/40">
                  <th className="px-2 py-1">Invoice</th>
                  <th className="px-2 py-1">Contact</th>
                  <th className="px-2 py-1 text-right">Owed</th>
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rung0.invoices.map(inv => {
                  const d = inv.daysOutstanding
                  const overdueColor =
                    d == null ? 'text-white/40' : d > 90 ? 'text-red-400 font-medium' : d > 30 ? 'text-amber-400' : 'text-white/60'
                  return (
                    <tr key={inv.id} className="hover:bg-white/5">
                      <td className="px-2 py-1.5 text-white/70">{inv.invoiceNumber || '—'}</td>
                      <td className="px-2 py-1.5 text-white/80 max-w-[260px] truncate" title={inv.contactName || undefined}>
                        {inv.contactName || '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-white">{formatMoney(inv.amountDue)}</td>
                      <td className="px-2 py-1.5 text-white/50">{inv.date || '—'}</td>
                      <td className={cn('px-2 py-1.5 text-right tabular-nums', overdueColor)}>
                        <span className="inline-flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          {d == null ? '—' : d < 0 ? `in ${Math.abs(d)}d` : `${d}d`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FOUR LANES */}
      {lanes && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {laneOrder.map(key => (
            <LaneColumn key={key} laneKey={key} lane={lanes[key]} />
          ))}
        </div>
      )}
    </div>
  )
}
