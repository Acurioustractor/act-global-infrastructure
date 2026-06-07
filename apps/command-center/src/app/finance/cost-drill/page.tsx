'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, ExternalLink,
  Loader2, Receipt, RotateCcw, Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── types mirroring the two APIs ──────────────────────────────────────────────
type Kind = 'transaction' | 'invoice'
interface PLRow { code: string; name: string | null; tier: string | null; revenue: number; expenses: number; net: number }
interface PLResponse { rows: PLRow[]; totals: { revenue: number; expenses: number; net: number }; projects: { code: string; name: string }[]; fy: string }
interface LineRow {
  id: string; xeroId: string; source: 'bill' | 'spend' | 'spend-overpay' | 'receive'
  date: string; contact: string; total: number; status: string; ref: string
  description: string; auditNote: string; flagDuplicate: boolean; paymentOfBill: boolean
  xeroLink: string; projectCode: string | null; hasReceipt: boolean
}
interface DrillResponse { projectCode: string; count: number; rows: LineRow[] }
interface Applied { kind: Kind; id: string; prevCode: string | null; newCode: string }

const EXPENSE_SOURCES = new Set(['bill', 'spend', 'spend-overpay'])
const kindFor = (source: LineRow['source']): Kind => (source === 'bill' ? 'invoice' : 'transaction')
const money = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`

async function fetchPL(): Promise<PLResponse> {
  const res = await fetch('/api/finance/cost-drill')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load the P&L table')
  return data
}
// FY26 window so the drilled lines reconcile with the FY26 P&L table.
const FY_FROM = '2025-07-01'
const FY_TO = '2026-06-30'
async function fetchDrill(code: string): Promise<DrillResponse> {
  const res = await fetch(`/api/finance/projects/${encodeURIComponent(code)}/transactions?from=${FY_FROM}&to=${FY_TO}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load project lines')
  return data
}
async function reassign(decisions: { kind: Kind; id: string; code: string }[]) {
  const res = await fetch('/api/finance/cost-reassign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Reassign failed')
  return data as { appliedCount: number; transactions: number; invoices: number; applied: Applied[]; failed: unknown[] }
}

export default function CostDrillPage() {
  const qc = useQueryClient()
  const plQuery = useQuery({ queryKey: ['finance', 'cost-drill'], queryFn: fetchPL })
  const projects = useMemo(() => plQuery.data?.projects ?? [], [plQuery.data?.projects])

  const [selected, setSelected] = useState<string | null>(null)
  // staged reassignments, keyed by line id (global so you can stage across vendors then apply once).
  const [staged, setStaged] = useState<Record<string, { kind: Kind; code: string }>>({})
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [lastBatch, setLastBatch] = useState<Applied[] | null>(null)
  const [openVendors, setOpenVendors] = useState<Set<string>>(new Set())

  const drillQuery = useQuery({
    queryKey: ['finance', 'cost-drill', 'lines', selected],
    queryFn: () => fetchDrill(selected as string),
    enabled: !!selected,
  })

  // Expense lines for the selected project, minus anything already reassigned this session.
  const lines = useMemo(
    () => (drillQuery.data?.rows ?? []).filter((r) => EXPENSE_SOURCES.has(r.source) && !appliedIds.has(r.id)),
    [drillQuery.data?.rows, appliedIds],
  )

  // Group by vendor/contact, desc by group total.
  const vendorGroups = useMemo(() => {
    const m = new Map<string, LineRow[]>()
    for (const r of lines) m.set(r.contact || '—', [...(m.get(r.contact || '—') || []), r])
    return [...m.entries()]
      .map(([contact, rows]) => ({ contact, rows, total: rows.reduce((a, r) => a + r.total, 0) }))
      .sort((a, b) => b.total - a.total)
  }, [lines])

  const decisions = useMemo(
    () =>
      Object.entries(staged)
        .filter(([id]) => !appliedIds.has(id))
        .map(([id, s]) => ({ kind: s.kind, id, code: s.code })),
    [staged, appliedIds],
  )

  const applyMut = useMutation({
    mutationFn: reassign,
    onSuccess: (res) => {
      setAppliedIds((prev) => new Set([...prev, ...res.applied.map((a) => a.id)]))
      setLastBatch(res.applied)
      setStaged((prev) => {
        const next = { ...prev }
        for (const a of res.applied) delete next[a.id]
        return next
      })
    },
  })

  const undoMut = useMutation({
    mutationFn: (batch: Applied[]) =>
      reassign(batch.filter((a) => a.prevCode).map((a) => ({ kind: a.kind, id: a.id, code: a.prevCode as string }))),
    onSuccess: (_res, batch) => {
      setAppliedIds((prev) => { const n = new Set(prev); for (const a of batch) n.delete(a.id); return n })
      setLastBatch(null)
      drillQuery.refetch()
    },
  })

  function stageOne(id: string, kind: Kind, code: string) {
    setStaged((prev) => { const n = { ...prev }; if (code) n[id] = { kind, code }; else delete n[id]; return n })
  }
  function stageGroup(rows: LineRow[], code: string) {
    setStaged((prev) => {
      const n = { ...prev }
      for (const r of rows) { if (code) n[r.id] = { kind: kindFor(r.source), code }; else delete n[r.id] }
      return n
    })
  }
  function toggleVendor(key: string) {
    setOpenVendors((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  const codeOptions = projects.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)

  // The drill panel — rendered inline directly under the selected project row (a real dropdown).
  const drillContent = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
          Cost lines behind <span className="font-mono text-cyan-200">{selected}</span>
          {drillQuery.data && <span className="text-white/45">· {lines.length} lines · {money(lines.reduce((a, r) => a + r.total, 0))}</span>}
        </h2>
        <button onClick={() => setSelected(null)} className="text-xs text-white/45 transition hover:text-white">close ✕</button>
      </div>
      <p className="mt-1 text-[11px] text-white/40">
        Grouped by vendor — reassign a whole vendor in one pick, or override per line. Shows FY26 bills + bank spend
        (income excluded); <span className="text-white/55">payment of bill</span> lines are a bill&apos;s settlement, not extra cost.
        The P&amp;L table above is the maintained rollup (bank cash basis), so its expense total differs from this line sum
        (which includes unpaid authorised bills). Reassigning moves the line immediately &amp; reversibly; the table
        refreshes after <code className="text-white/60">node scripts/calculate-project-monthly-financials.mjs</code>.
      </p>

      {drillQuery.isLoading && <div className="mt-6 inline-flex items-center gap-2 text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Loading lines…</div>}
      {drillQuery.isError && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{(drillQuery.error as Error).message}</div>}
      {drillQuery.data && lines.length === 0 && <p className="mt-6 text-sm text-emerald-200/80">No remaining cost lines for this project. ✓</p>}

      <div className="mt-4 space-y-2">
        {vendorGroups.map(({ contact, rows, total }) => {
          const key = contact
          const open = openVendors.has(key)
          const stagedInGroup = rows.filter((r) => staged[r.id]).length
          const codes = new Set(rows.map((r) => staged[r.id]?.code).filter(Boolean))
          const groupCode = codes.size === 1 ? [...codes][0] : ''
          const withReceipt = rows.filter((r) => r.hasReceipt).length
          const hasFlag = rows.some((r) => r.auditNote || r.flagDuplicate)
          return (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                <button onClick={() => toggleVendor(key)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  {open ? <ChevronDown className="h-4 w-4 shrink-0 text-white/40" /> : <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />}
                  <span className="truncate text-sm text-white/85">{contact}</span>
                  {hasFlag && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300/80" />}
                  <span className="shrink-0 text-xs text-white/40">{rows.length} · {money(total)}</span>
                  <span className="shrink-0 text-[10px] text-white/30"><Receipt className="mr-0.5 inline h-3 w-3" />{withReceipt}/{rows.length}</span>
                </button>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  <span className="text-white/40">reassign all →</span>
                  <select
                    value={groupCode}
                    onChange={(e) => stageGroup(rows, e.target.value)}
                    className="rounded-lg border border-white/15 bg-[#0b1016] px-2 py-1 font-mono text-xs text-cyan-100 focus:border-cyan-300/50 focus:outline-none"
                  >
                    <option value="">— leave —</option>
                    {codeOptions}
                  </select>
                  {stagedInGroup > 0 && <span className="text-emerald-200/80">{stagedInGroup} set</span>}
                </span>
              </div>
              {open && (
                <ul className="space-y-1 border-t border-white/[0.06] px-3 py-2">
                  {rows.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 tabular-nums text-white/45">{r.date?.slice(0, 10)}</span>
                      <span className="min-w-0 flex-1 truncate text-white/65">
                        {r.description || r.ref || r.source}
                        {r.auditNote && <span className="ml-2 text-amber-200/80">{r.auditNote}</span>}
                        {r.paymentOfBill && <span className="ml-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/40">payment of bill</span>}
                      </span>
                      {r.hasReceipt && <Receipt className="h-3 w-3 shrink-0 text-emerald-300/70" />}
                      <span className="w-20 shrink-0 text-right tabular-nums text-white/70">{money(r.total)}</span>
                      <a href={r.xeroLink} target="_blank" rel="noreferrer" className="shrink-0 text-white/30 transition hover:text-cyan-200"><ExternalLink className="h-3 w-3" /></a>
                      <select
                        value={staged[r.id]?.code || ''}
                        onChange={(e) => stageOne(r.id, kindFor(r.source), e.target.value)}
                        className="w-36 shrink-0 rounded-lg border border-white/15 bg-[#0b1016] px-2 py-0.5 font-mono text-[11px] text-cyan-100 focus:border-cyan-300/50 focus:outline-none"
                      >
                        <option value="">— leave —</option>
                        {codeOptions}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070a] pb-28 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.94))]" />
      <div className="relative mx-auto max-w-[1200px] px-6 py-8">
        <Link href="/finance" className="mb-6 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Finance
        </Link>

        <header>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/75">
            <Layers className="h-3.5 w-3.5" /> Per-project cost drill
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Cost drill</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
            FY26 P&amp;L per project (legacy codes folded). Click a project to drill into the actual Xero
            lines behind its costs, then reassign cost-by-cost — grouped, bulk, reversible. Writes go to our
            operating DB only; Xero is untouched.
          </p>
        </header>

        {plQuery.isLoading && <div className="mt-10 inline-flex items-center gap-2 text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
        {plQuery.isError && <div className="mt-8 rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">{(plQuery.error as Error).message}</div>}

        {/* ── P&L table ── */}
        {plQuery.data && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-white/45">
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium">Expenses</th>
                  <th className="px-4 py-3 text-right font-medium">Net</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {plQuery.data.rows.map((r) => {
                  const isSel = selected === r.code
                  return (
                    <Fragment key={r.code}>
                      <tr
                        onClick={() => setSelected(isSel ? null : r.code)}
                        className={cn('cursor-pointer border-b border-white/[0.05] transition hover:bg-white/[0.04]', isSel && 'bg-cyan-300/[0.07]')}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-cyan-200/90">{r.code}</span>
                          <span className="ml-2 text-white/55">{r.name}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-white/75">{money(r.revenue)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-white/75">{money(r.expenses)}</td>
                        <td className={cn('px-4 py-3 text-right tabular-nums', r.net < 0 ? 'text-rose-300' : 'text-emerald-300/85')}>{money(r.net)}</td>
                        <td className="px-4 py-3 text-right text-white/30">{isSel ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}</td>
                      </tr>
                      {isSel && (
                        <tr className="bg-cyan-300/[0.03]">
                          <td colSpan={5} className="p-0">
                            <div className="border-b border-white/10 px-4 py-4">{drillContent}</div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="text-sm font-semibold">
                  <td className="px-4 py-3 text-white/70">Total · {plQuery.data.fy}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/90">{money(plQuery.data.totals.revenue)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/90">{money(plQuery.data.totals.expenses)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/90">{money(plQuery.data.totals.net)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </section>
        )}
      </div>

      {/* sticky apply bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#070b11]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-6 py-3">
          {applyMut.isSuccess && lastBatch ? (
            <>
              <span className="inline-flex items-center gap-2 text-sm text-emerald-200">
                <CheckCircle2 className="h-4 w-4" /> Reassigned {applyMut.data?.appliedCount} ({applyMut.data?.transactions} txns · {applyMut.data?.invoices} bills)
              </span>
              <span className="text-[11px] text-white/40">Re-run <code className="text-white/60">node scripts/calculate-project-monthly-financials.mjs</code> to refresh the P&amp;L table.</span>
              <button
                onClick={() => undoMut.mutate(lastBatch)}
                disabled={undoMut.isPending}
                className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-50"
              >
                {undoMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Undo last reassign
              </button>
              <button onClick={() => { applyMut.reset(); qc.invalidateQueries({ queryKey: ['finance', 'cost-drill'] }) }} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90">Done</button>
            </>
          ) : (
            <>
              <span className="text-sm text-white/70">
                <span className="font-semibold text-white">{decisions.length}</span> reassignment{decisions.length === 1 ? '' : 's'} staged
                {applyMut.isError && <span className="ml-3 text-red-300">— {(applyMut.error as Error).message}</span>}
              </span>
              <button
                onClick={() => applyMut.mutate(decisions)}
                disabled={decisions.length === 0 || applyMut.isPending}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
              >
                {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Apply {decisions.length} reassignment{decisions.length === 1 ? '' : 's'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
