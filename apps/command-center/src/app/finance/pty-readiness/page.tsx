'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Status = 'done' | 'doing' | 'todo' | 'blocked'
type Priority = 'critical' | 'high' | 'medium' | 'low'

interface Item {
  id: string
  label: string
  category: string
  owner: string
  priority: Priority
  due: string
  status: Status
  evidence?: string
}

interface CategoryRollup {
  category: string
  total: number
  done: number
  pct: number
  blocked: number
}

interface ApiResponse {
  generatedAt: string
  entity: string
  cutoverDate: string
  daysToCutover: number
  totals: { total: number; done: number; doing: number; todo: number; blocked: number; pct: number }
  critical: { total: number; done: number; pct: number }
  categories: CategoryRollup[]
  itemsByPriority: { priority: Priority; items: Item[] }[]
  gaps: Item[]
  error?: string
}

const STATUS_STYLE: Record<Status, { dot: string; label: string; text: string }> = {
  blocked: { dot: 'bg-red-500', label: 'Blocked', text: 'text-red-500' },
  doing: { dot: 'bg-amber-500', label: 'Doing', text: 'text-amber-500' },
  todo: { dot: 'bg-muted-foreground/40', label: 'To do', text: 'text-muted-foreground' },
  done: { dot: 'bg-emerald-500', label: 'Done', text: 'text-emerald-500' },
}

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function fmtDue(due: string, status: Status): { text: string; overdue: boolean } {
  if (status === 'done') return { text: due, overdue: false }
  const d = new Date(due + 'T00:00:00Z')
  const overdue = d.getTime() < Date.now()
  return { text: due, overdue }
}

export default function PtyReadinessPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/finance/pty-readiness')
      .then(r => r.json())
      .then(setData)
      .catch((e) => setData({ error: String(e) } as ApiResponse))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <main className="mx-auto max-w-5xl px-6 py-10"><p className="text-sm text-muted-foreground">Loading…</p></main>
  }
  if (!data || data.error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-red-500">Failed to load: {data?.error ?? 'unknown'}</p>
      </main>
    )
  }

  const { totals, critical } = data

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Finance · Plan</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">PTY Cutover Readiness</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {data.entity} — sole-trader → Pty cutover on{' '}
          <span className="font-medium text-foreground">{data.cutoverDate}</span>. Live from{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">config/pty-readiness.json</code> (git-tracked; each commit is an audit trail).
        </p>
      </header>

      {/* Headline cards */}
      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Days to cutover</p>
          <p className={`mt-1 text-3xl font-semibold ${data.daysToCutover <= 14 ? 'text-amber-500' : ''}`}>
            {data.daysToCutover}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Overall done</p>
          <p className="mt-1 text-3xl font-semibold">{totals.pct}%</p>
          <p className="mt-1 text-xs text-muted-foreground">{totals.done} / {totals.total} items</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Critical done</p>
          <p className={`mt-1 text-3xl font-semibold ${critical.pct < 100 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {critical.pct}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{critical.done} / {critical.total} critical</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Blocked</p>
          <p className={`mt-1 text-3xl font-semibold ${totals.blocked > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {totals.blocked}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{totals.doing} doing · {totals.todo} todo</p>
        </div>
      </section>

      {/* Gaps — critical + high not done */}
      {data.gaps.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            What stands between you and cutover ({data.gaps.length})
          </h2>
          <div className="space-y-2">
            {data.gaps.map(item => {
              const s = STATUS_STYLE[item.status]
              const due = fmtDue(item.due, item.status)
              return (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border bg-card p-4">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{item.label}</p>
                      <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
                      {item.priority === 'critical' && (
                        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-500">Critical</span>
                      )}
                      {due.overdue && (
                        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-500">Overdue {due.text}</span>
                      )}
                    </div>
                    {item.evidence && <p className="mt-1 text-xs text-muted-foreground">{item.evidence}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">Owner: {item.owner} · Due {item.due}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Category rollups */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">By category</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.categories.map(c => (
            <div key={c.category} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium capitalize">{c.category}</p>
                <p className="text-xs text-muted-foreground">{c.done}/{c.total}{c.blocked > 0 && <span className="text-red-500"> · {c.blocked} blocked</span>}</p>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Full list by priority */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">All items</h2>
        {data.itemsByPriority.filter(g => g.items.length > 0).map(group => (
          <div key={group.priority} className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{PRIORITY_LABEL[group.priority]}</p>
            <div className="space-y-1.5">
              {group.items.map(item => {
                const s = STATUS_STYLE[item.status]
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
                    <p className="flex-1 text-sm">{item.label}</p>
                    <span className="hidden text-xs capitalize text-muted-foreground sm:inline">{item.category}</span>
                    <span className={`w-16 text-right text-xs font-medium ${s.text}`}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      <footer className="mt-10 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span>Generated {new Date(data.generatedAt).toLocaleString()}</span>
        <Link href="/finance" className="hover:text-foreground">← Finance</Link>
      </footer>
    </main>
  )
}
