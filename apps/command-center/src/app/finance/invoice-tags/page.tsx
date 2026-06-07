'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Loader2, Receipt, RotateCcw, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type InvType = 'ACCREC' | 'ACCPAY'
interface InvoiceRow {
  id: string; xeroId: string | null; date: string | null; number: string | null
  contact: string | null; total: number; status: string | null; projectCode: string | null
  hasReceipt: boolean; xeroLink: string
}
interface Project { code: string; name: string }
interface Response { type: InvType; rows: InvoiceRow[]; projects: Project[]; stats: { count: number; totalValue: number; taggedCount: number } }
interface Applied { kind: 'invoice' | 'transaction'; id: string; prevCode: string | null; newCode: string }

const money = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`

async function fetchInvoices(type: InvType): Promise<Response> {
  const res = await fetch(`/api/finance/invoice-tags?type=${type}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load invoices')
  return data
}
async function reassign(decisions: { kind: 'invoice'; id: string; code: string }[]) {
  const res = await fetch('/api/finance/cost-reassign', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Reassign failed')
  return data as { appliedCount: number; applied: Applied[] }
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || '').toUpperCase()
  const tone = s === 'PAID' ? 'bg-emerald-400/15 text-emerald-200' : s === 'AUTHORISED' ? 'bg-amber-400/15 text-amber-200' : 'bg-white/[0.06] text-white/45'
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px]', tone)}>{s || '—'}</span>
}

export default function InvoiceTagsPage() {
  const qc = useQueryClient()
  const [type, setType] = useState<InvType>('ACCREC')
  const [search, setSearch] = useState('')
  const [staged, setStaged] = useState<Record<string, string>>({})
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [lastBatch, setLastBatch] = useState<Applied[] | null>(null)

  const query = useQuery({ queryKey: ['finance', 'invoice-tags', type], queryFn: () => fetchInvoices(type) })
  const projects = useMemo(() => query.data?.projects ?? [], [query.data?.projects])
  const codeName = useMemo(() => new Map(projects.map((p) => [p.code, p.name])), [projects])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (query.data?.rows ?? []).filter((r) =>
      !q || (r.contact || '').toLowerCase().includes(q) || (r.number || '').toLowerCase().includes(q) || (r.projectCode || '').toLowerCase().includes(q),
    )
  }, [query.data?.rows, search])

  // current select value: staged override → original tag → '' ; staged only when different from original.
  const valueFor = (r: InvoiceRow) => staged[r.id] ?? r.projectCode ?? ''
  const isChanged = (r: InvoiceRow) => r.id in staged && staged[r.id] !== (r.projectCode ?? '')

  function setRow(r: InvoiceRow, code: string) {
    setStaged((prev) => {
      const n = { ...prev }
      if (code === (r.projectCode ?? '')) delete n[r.id]
      else n[r.id] = code
      return n
    })
  }

  const decisions = useMemo(
    () => Object.entries(staged)
      .filter(([id, code]) => code && !appliedIds.has(id))
      .map(([id, code]) => ({ kind: 'invoice' as const, id, code })),
    [staged, appliedIds],
  )

  const applyMut = useMutation({
    mutationFn: reassign,
    onSuccess: (res) => {
      setAppliedIds((prev) => new Set([...prev, ...res.applied.map((a) => a.id)]))
      setLastBatch(res.applied)
      setStaged({})
    },
  })
  const undoMut = useMutation({
    mutationFn: (batch: Applied[]) => reassign(batch.filter((a) => a.prevCode).map((a) => ({ kind: 'invoice' as const, id: a.id, code: a.prevCode as string }))),
    onSuccess: () => { setLastBatch(null); setAppliedIds(new Set()); query.refetch() },
  })

  const optionsFor = (r: InvoiceRow) => {
    const have = new Set(projects.map((p) => p.code))
    const extra = r.projectCode && !have.has(r.projectCode) ? [{ code: r.projectCode, name: r.projectCode }] : []
    return [...extra, ...projects]
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070a] pb-28 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.94))]" />
      <div className="relative mx-auto max-w-[1200px] px-6 py-8">
        <Link href="/finance" className="mb-6 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Finance
        </Link>

        <header>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/75">
            <FileText className="h-3.5 w-3.5" /> Invoice tags
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Every invoice &amp; its project</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
            Every {type === 'ACCREC' ? 'income' : 'bill'} invoice and the project it&apos;s tagged to. Change any project
            in-line, then Apply — reversible, writes to our operating DB only (Xero untouched).
          </p>
        </header>

        {/* controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-sm">
            <button onClick={() => setType('ACCREC')} className={cn('rounded-full px-4 py-1.5 transition', type === 'ACCREC' ? 'bg-white text-black' : 'text-white/60 hover:text-white')}>Income</button>
            <button onClick={() => setType('ACCPAY')} className={cn('rounded-full px-4 py-1.5 transition', type === 'ACCPAY' ? 'bg-white text-black' : 'text-white/60 hover:text-white')}>Bills</button>
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer / invoice # / code…"
              className="w-full rounded-full border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/40 focus:outline-none"
            />
          </div>
          {query.data && (
            <span className="text-xs text-white/45">
              {rows.length} of {query.data.stats.count} · {money(rows.reduce((a, r) => a + r.total, 0))}
            </span>
          )}
        </div>

        {query.isLoading && <div className="mt-10 inline-flex items-center gap-2 text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
        {query.isError && <div className="mt-8 rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">{(query.error as Error).message}</div>}

        {query.data && (
          <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-white/45">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">{type === 'ACCREC' ? 'Customer' : 'Vendor'}</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const changed = isChanged(r)
                  const applied = appliedIds.has(r.id)
                  return (
                    <tr key={r.id} className={cn('border-b border-white/[0.05]', changed && 'bg-emerald-300/[0.06]', applied && 'opacity-50')}>
                      <td className="px-4 py-2.5 tabular-nums text-white/55">{r.date?.slice(0, 10)}</td>
                      <td className="px-4 py-2.5">
                        <a href={r.xeroLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-200/80 transition hover:text-cyan-100">
                          {r.number || '—'} <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-2.5 text-white/80">
                        {r.contact || '—'}
                        {r.hasReceipt && <Receipt className="ml-1.5 inline h-3 w-3 text-emerald-300/60" />}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white/80">{money(r.total)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-2.5">
                        <select
                          value={valueFor(r)}
                          onChange={(e) => setRow(r, e.target.value)}
                          className={cn('rounded-lg border bg-[#0b1016] px-2 py-1 font-mono text-xs focus:outline-none', changed ? 'border-emerald-400/50 text-emerald-200' : 'border-white/15 text-cyan-100 focus:border-cyan-300/50')}
                        >
                          <option value="">— untagged —</option>
                          {optionsFor(r).map((p) => <option key={p.code} value={p.code}>{p.code}{codeName.get(p.code) ? ` — ${codeName.get(p.code)}` : ''}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[10px] text-white/35">{changed && <span className="text-emerald-300/80">moved</span>}</td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-white/40">No invoices match.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {/* sticky apply bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#070b11]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-6 py-3">
          {applyMut.isSuccess && lastBatch ? (
            <>
              <span className="inline-flex items-center gap-2 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Moved {applyMut.data?.appliedCount} invoice{applyMut.data?.appliedCount === 1 ? '' : 's'}</span>
              <button onClick={() => undoMut.mutate(lastBatch)} disabled={undoMut.isPending} className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-50">
                {undoMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Undo
              </button>
              <button onClick={() => { applyMut.reset(); qc.invalidateQueries({ queryKey: ['finance', 'invoice-tags'] }) }} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90">Done</button>
            </>
          ) : (
            <>
              <span className="text-sm text-white/70"><span className="font-semibold text-white">{decisions.length}</span> change{decisions.length === 1 ? '' : 's'} staged{applyMut.isError && <span className="ml-3 text-red-300">— {(applyMut.error as Error).message}</span>}</span>
              <button
                onClick={() => applyMut.mutate(decisions)}
                disabled={decisions.length === 0 || applyMut.isPending}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
              >
                {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Apply {decisions.length} change{decisions.length === 1 ? '' : 's'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
