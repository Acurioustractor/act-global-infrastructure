'use client'

import { useQuery } from '@tanstack/react-query'
import { Activity, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncRow {
  name: string
  schedule: string | null
  status: string
  lastRunMs: number | null
  lastRunIso: string | null
  restartCount: number
  ageHours: number | null
  scriptPath: string | null
  category: string
  health: 'green' | 'yellow' | 'red'
}

interface Response {
  generatedAt: string
  totals: { total: number; green: number; yellow: number; red: number }
  notionSyncs: SyncRow[]
  otherCron: SyncRow[]
  services: SyncRow[]
}

function formatAge(ageHours: number | null): string {
  if (ageHours == null) return '—'
  if (ageHours < 1) return `${Math.round(ageHours * 60)}m ago`
  if (ageHours < 48) return `${Math.round(ageHours)}h ago`
  return `${Math.round(ageHours / 24)}d ago`
}

function healthClasses(health: SyncRow['health']): string {
  switch (health) {
    case 'green':
      return 'border-emerald-800/50 bg-emerald-950/30 text-emerald-300'
    case 'yellow':
      return 'border-yellow-800/60 bg-yellow-950/30 text-yellow-300'
    case 'red':
      return 'border-red-800/60 bg-red-950/40 text-red-300'
  }
}

function SyncTable({ title, rows }: { title: string; rows: SyncRow[] }) {
  if (rows.length === 0) return null
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-400 mb-2">
        {title} <span className="text-neutral-600">· {rows.length}</span>
      </h2>
      <div className="rounded-lg border border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Schedule</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Last run</th>
              <th className="text-left px-3 py-2 font-medium">Restarts</th>
              <th className="text-left px-3 py-2 font-medium">Health</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name} className="border-t border-neutral-900 hover:bg-neutral-900/40">
                <td className="px-3 py-2 font-mono text-xs">{r.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-neutral-500">
                  {r.schedule ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-400">{r.status}</td>
                <td className="px-3 py-2 text-xs text-neutral-300">{formatAge(r.ageHours)}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">{r.restartCount}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'inline-block rounded px-2 py-0.5 text-xs border',
                      healthClasses(r.health),
                    )}
                  >
                    {r.health}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function SyncHealthPage() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery<Response>({
    queryKey: ['admin', 'sync-health'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sync-health', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 30 * 1000,
    staleTime: 25 * 1000,
  })

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium uppercase tracking-wider mb-1">
              <Activity size={16} /> Sync Health
            </div>
            <h1 className="text-3xl font-semibold">PM2 cron + service status</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Live from <code className="mx-1 px-1.5 py-0.5 rounded bg-neutral-900 text-xs">pm2 jlist</code>.
              Refreshes every 30s.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-900"
            disabled={isRefetching}
          >
            <RefreshCw size={14} className={cn(isRefetching && 'animate-spin')} />
            Refresh
          </button>
        </header>

        {isLoading && (
          <div className="text-neutral-500 text-sm">Loading…</div>
        )}
        {error && (
          <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-300">
            Failed to load: {String((error as Error).message)}.
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                <div className="text-neutral-400 text-xs uppercase tracking-wider">Total</div>
                <div className="text-2xl font-semibold mt-1">{data.totals.total}</div>
              </div>
              <div className={cn('rounded-lg border p-4', healthClasses('green'))}>
                <div className="text-xs uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={12} /> Healthy
                </div>
                <div className="text-2xl font-semibold mt-1">{data.totals.green}</div>
              </div>
              <div className={cn('rounded-lg border p-4', healthClasses('yellow'))}>
                <div className="text-xs uppercase tracking-wider">Watch</div>
                <div className="text-2xl font-semibold mt-1">{data.totals.yellow}</div>
              </div>
              <div className={cn('rounded-lg border p-4', healthClasses('red'))}>
                <div className="text-xs uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle size={12} /> Stale / Errored
                </div>
                <div className="text-2xl font-semibold mt-1">{data.totals.red}</div>
              </div>
            </div>

            <SyncTable title="Notion syncs" rows={data.notionSyncs} />
            <SyncTable title="Other cron jobs" rows={data.otherCron} />
            <SyncTable title="Long-running services" rows={data.services} />

            <p className="text-xs text-neutral-600">
              Generated at {new Date(data.generatedAt).toLocaleString()}.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
