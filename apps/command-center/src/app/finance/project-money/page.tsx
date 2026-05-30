'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertTriangle, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Row {
  code: string; name: string; tier: string | null; status: string | null
  income: number; received: number; billsOutstanding: number; spendExpense: number
  expense: number; net: number; untagged: boolean
}
interface CovSide { tagged: { n: number; $: number }; untagged: { n: number; $: number }; pct: number }
interface Resp {
  fyStart: string
  rows: Row[]
  totals: { income: number; received: number; expense: number; net: number }
  coverage: { income: CovSide; expense: CovSide }
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  const a = Math.abs(n)
  const s = a >= 1_000_000 ? `$${(a / 1_000_000).toFixed(2)}M` : a >= 1000 ? `$${Math.round(a).toLocaleString()}` : `$${Math.round(a)}`
  return n < 0 ? `-${s}` : s
}

function CoverageCard({ label, side, href }: { label: string; side: CovSide; href: string }) {
  const done = side.untagged.n === 0
  return (
    <div className={cn('rounded-xl border p-4', done ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10')}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
        {done ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
        {label} tagging
      </div>
      <div className="mt-1 text-2xl font-bold">{side.pct}%</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {done ? 'All tagged' : (
          <Link href={href} className="hover:underline">
            {side.untagged.n} untagged · {fmt(side.untagged.$)} →
          </Link>
        )}
      </div>
    </div>
  )
}

export default function ProjectMoneyPage() {
  const [hideEmpty, setHideEmpty] = useState(true)
  const { data, isLoading, error } = useQuery<Resp>({
    queryKey: ['project-money'],
    queryFn: async () => {
      const r = await fetch('/api/finance/project-money')
      if (!r.ok) throw new Error((await r.json()).error || 'Failed')
      return r.json()
    },
  })

  const rows = (data?.rows || []).filter(r => !hideEmpty || r.income !== 0 || r.expense !== 0)

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Link href="/finance" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Finance
      </Link>

      <div className="mb-1 flex items-center gap-2">
        <Wallet className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold">Project Money</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Live income, expense &amp; net per project — straight from the Xero mirror. FY26 (from {data?.fyStart}), excl. voided. Income = invoiced ACCREC; expense = bank/card spend + unpaid bills (cash basis, no double-count).
      </p>

      {isLoading && <div className="text-muted-foreground">Loading…</div>}
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">{(error as Error).message}</div>}

      {data && (
        <>
          {/* Coverage + totals */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <CoverageCard label="Income" side={data.coverage.income} href="/finance/invoices" />
            <CoverageCard label="Expense" side={data.coverage.expense} href="/finance/transactions" />
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/80"><ArrowUpRight className="h-4 w-4 text-emerald-400" /> Income</div>
              <div className="mt-1 text-2xl font-bold text-emerald-400">{fmt(data.totals.income)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{fmt(data.totals.received)} received</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/80"><ArrowDownRight className="h-4 w-4 text-red-400" /> Expense</div>
              <div className="mt-1 text-2xl font-bold text-red-400">{fmt(data.totals.expense)}</div>
              <div className={cn('mt-1 text-xs', data.totals.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>net {fmt(data.totals.net)}</div>
            </div>
          </div>

          <div className="mb-2 flex justify-end">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={hideEmpty} onChange={e => setHideEmpty(e.target.checked)} />
              Hide projects with no money
            </label>
          </div>

          {/* Per-project table */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-right">Income</th>
                  <th className="px-3 py-2 text-right">Received</th>
                  <th className="px-3 py-2 text-right">Expense</th>
                  <th className="px-3 py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.code} className={cn('border-t border-border/60', r.untagged && 'bg-amber-500/5')}>
                    <td className="px-3 py-2">
                      {r.untagged ? (
                        <span className="inline-flex items-center gap-1 text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> Untagged</span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <Link href={`/finance/transactions?project=${r.code}&since=2025-07-01`} className="hover:underline" title={`Review & retag ${r.code} transactions`}>
                            <span className="font-mono text-xs text-muted-foreground">{r.code}</span> {r.name}
                          </Link>
                          <Link href={`/finance/projects/${r.code}`} className="text-[10px] uppercase tracking-wide text-muted-foreground/50 hover:text-foreground">P&amp;L</Link>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-400/90">{r.income ? fmt(r.income) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.received ? fmt(r.received) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-400/90">{r.expense ? fmt(r.expense) : '—'}</td>
                    <td className={cn('px-3 py-2 text-right font-medium tabular-nums', r.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>{fmt(r.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-muted/30 font-semibold">
                <tr>
                  <td className="px-3 py-2">Total ({rows.filter(r => !r.untagged).length} projects)</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-400">{fmt(data.totals.income)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(data.totals.received)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-400">{fmt(data.totals.expense)}</td>
                  <td className={cn('px-3 py-2 text-right tabular-nums', data.totals.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>{fmt(data.totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
