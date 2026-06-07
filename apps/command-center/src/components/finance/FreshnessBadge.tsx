'use client'

import { useQuery } from '@tanstack/react-query'
import { RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Trust primitive (plan 2026-05-29 P1): "Xero data as of HH:MM (Nm ago)".
// Renders on every finance surface header — this is what makes any number on
// the page trustworthy. Colour reflects sync age: green <6h / amber 6–12h / red >12h.

interface Freshness {
  lastSync: string | null
  ageMinutes: number | null
  status: 'green' | 'amber' | 'red' | 'unknown'
  source: 'sync-state-file' | 'max-synced-at' | 'none'
  detail?: { fileLastSync: string | null; maxSyncedAt: string | null }
}

function formatAge(minutes: number | null): string {
  if (minutes === null) return 'unknown'
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    const rem = minutes % 60
    return rem > 0 ? `${hours}h ${rem}m ago` : `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatClock(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return '—'
  }
}

const STYLES: Record<Freshness['status'], { wrap: string; Icon: typeof CheckCircle2 }> = {
  green: { wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  amber: { wrap: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertTriangle },
  red: { wrap: 'bg-red-50 text-red-700 border-red-200', Icon: AlertCircle },
  unknown: { wrap: 'bg-gray-50 text-gray-500 border-gray-200', Icon: HelpCircle },
}

export function FreshnessBadge({
  className,
  variant = 'full',
}: {
  className?: string
  /** `full` shows the clock + age; `compact` shows just the age. */
  variant?: 'full' | 'compact'
}) {
  const { data, isLoading, refetch, isFetching } = useQuery<Freshness>({
    queryKey: ['finance', 'sync-freshness'],
    queryFn: async () => {
      const res = await fetch('/api/finance/sync-freshness')
      if (!res.ok) throw new Error('sync-freshness fetch failed')
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000, // re-check every 5 min so the age stays live
    staleTime: 60 * 1000,
  })

  const status = data?.status ?? 'unknown'
  const { wrap, Icon } = STYLES[status]
  const age = formatAge(data?.ageMinutes ?? null)
  const clock = formatClock(data?.lastSync ?? null)

  const title =
    data?.source === 'max-synced-at'
      ? `Freshness from latest row write (max synced_at). Last: ${data?.lastSync ?? '—'}`
      : data?.source === 'sync-state-file'
        ? `Freshness from Xero sync run (.xero-sync-state.json). Last: ${data?.lastSync ?? '—'}`
        : 'No sync timestamp available yet'

  return (
    <button
      type="button"
      onClick={() => refetch()}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:brightness-95',
        wrap,
        className,
      )}
    >
      {isLoading ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className={cn('h-3.5 w-3.5', isFetching && 'animate-pulse')} />
      )}
      {variant === 'full' ? (
        <span>
          Xero data as of <span className="tabular-nums">{clock}</span>{' '}
          <span className="opacity-70">({age})</span>
        </span>
      ) : (
        <span className="tabular-nums">{age}</span>
      )}
    </button>
  )
}
