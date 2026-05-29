'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/format'

// Mirror surface — "showcase every project's funds incoming + outgoing".
// One chip per project (IN = revenue, OUT = expenses, net), plus an UNTAGGED
// chip. Clicking a chip filters the live mirror table below. Sourced from
// /api/finance/projects so the figures reconcile with /finance/projects.

export interface ProjectFin {
  code: string
  name: string
  revenue: number
  expenses: number
  net: number
  received: number
  pending: number
}
interface ProjectsResponse {
  projects: ProjectFin[]
  totals: { revenue: number; expenses: number; net: number }
}

export type RailSelection = string | 'UNTAGGED' | 'all'

function Chip({
  label,
  sub,
  inAmt,
  outAmt,
  net,
  active,
  tone,
  onClick,
}: {
  label: string
  sub?: string
  inAmt?: number
  outAmt?: number
  net?: number
  active: boolean
  tone?: 'amber'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-xl border px-3 py-2 text-left transition-colors',
        active
          ? 'border-cyan-300/60 bg-cyan-500/10'
          : tone === 'amber'
            ? 'border-amber-300/30 bg-amber-500/[0.06] hover:bg-amber-500/10'
            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-white/90">{label}</span>
        {sub && <span className="text-[10px] text-white/40">{sub}</span>}
      </div>
      {tone === 'amber' ? (
        <div className="mt-1 text-sm font-bold tabular-nums text-amber-300">{formatMoney(outAmt ?? 0)}</div>
      ) : (
        <div className="mt-1 flex items-baseline gap-2 tabular-nums">
          <span className="text-xs font-medium text-emerald-400" title="FY26 accrual revenue">↑{formatMoney(inAmt ?? 0)}</span>
          <span className="text-xs font-medium text-red-400" title="FY26 expenses">↓{formatMoney(Math.abs(outAmt ?? 0))}</span>
          <span className={cn('text-[11px] font-semibold', (net ?? 0) >= 0 ? 'text-emerald-300/70' : 'text-red-300/70')}>
            {(net ?? 0) >= 0 ? '+' : ''}{formatMoney(net ?? 0)}
          </span>
        </div>
      )}
    </button>
  )
}

export function MirrorProjectRail({
  active,
  onSelect,
  untaggedCount,
}: {
  active: RailSelection
  onSelect: (sel: RailSelection) => void
  untaggedCount: number
}) {
  const { data, isLoading } = useQuery<ProjectsResponse>({
    queryKey: ['finance', 'projects-hub'],
    queryFn: () => fetch('/api/finance/projects').then((r) => r.json()),
    staleTime: 60 * 1000,
  })

  if (isLoading) return <div className="h-20 rounded-xl bg-white/5 animate-pulse" />

  const projects = (data?.projects ?? [])
    .filter((p) => p.revenue !== 0 || p.expenses !== 0)
    .sort((a, b) => Math.abs(b.expenses) + b.revenue - (Math.abs(a.expenses) + a.revenue))
  const totals = data?.totals ?? { revenue: 0, expenses: 0, net: 0 }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <Chip
        label="All projects"
        inAmt={totals.revenue}
        outAmt={totals.expenses}
        net={totals.net}
        active={active === 'all'}
        onClick={() => onSelect('all')}
      />
      <Chip
        label="Untagged"
        sub={`${untaggedCount} rows`}
        outAmt={0}
        tone="amber"
        active={active === 'UNTAGGED'}
        onClick={() => onSelect('UNTAGGED')}
      />
      {projects.map((p) => (
        <Chip
          key={p.code}
          label={p.code}
          sub={p.name && p.name !== p.code ? p.name.slice(0, 16) : undefined}
          inAmt={p.revenue}
          outAmt={p.expenses}
          net={p.net}
          active={active === p.code}
          onClick={() => onSelect(p.code)}
        />
      ))}
    </div>
  )
}
