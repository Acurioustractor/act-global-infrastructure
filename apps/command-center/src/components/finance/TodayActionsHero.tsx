'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'

interface Signal {
  severity: 'high' | 'medium' | 'low'
  label: string
  detail: string
  href: string
  count?: number
}

interface TodayActionsResponse {
  generatedAt: string
  hasWork: boolean
  signals: Signal[]
  counts: {
    untaggedTxns: number
    untaggedInvs: number
    receiptsReady: number
    aiSuggestions: number
    overdueAR: number
    narrativeAgeDays: number | null
  }
}

const SEV_TONE: Record<Signal['severity'], { dot: string; chip: string }> = {
  high: { dot: 'bg-rose-400', chip: 'text-rose-200 border-rose-500/30 bg-rose-500/5' },
  medium: { dot: 'bg-amber-400', chip: 'text-amber-200 border-amber-500/30 bg-amber-500/5' },
  low: { dot: 'bg-cyan-400', chip: 'text-cyan-200 border-cyan-500/30 bg-cyan-500/5' },
}

export function TodayActionsHero() {
  const { data, isLoading, error } = useQuery<TodayActionsResponse>({
    queryKey: ['finance', 'today-actions'],
    queryFn: async () => {
      const res = await fetch('/api/finance/today-actions', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="mb-6 animate-pulse rounded-2xl border border-border bg-card p-5">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-2/3 rounded bg-muted/60" />
          <div className="h-3 w-1/2 rounded bg-muted/60" />
        </div>
      </div>
    )
  }

  if (error || !data) return null

  if (!data.hasWork) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm text-emerald-100">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Nothing waiting on you right now.</p>
          <p className="mt-0.5 text-emerald-200/70">
            Workbench is clear, receipts attached, AI suggestions accepted. Explore below or open{' '}
            <Link href="/finance/command" className="underline">Money Command</Link>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.06] to-rose-500/[0.04] p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-300" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          {data.signals.length === 1 ? '1 thing waiting' : `${data.signals.length} things waiting`}
        </p>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {data.signals.map((s, i) => {
          const tone = SEV_TONE[s.severity]
          return (
            <li key={i}>
              <Link
                href={s.href}
                className={`group flex h-full flex-col justify-between gap-2 rounded-xl border px-4 py-3 transition hover:border-foreground/40 ${tone.chip}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                  <p className="text-sm font-semibold leading-snug">{s.label}</p>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{s.detail}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
