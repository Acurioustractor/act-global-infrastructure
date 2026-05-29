'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Search, Layers, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/format'
import { FreshnessBadge } from '@/components/finance/FreshnessBadge'
import { TrustMeters } from '@/components/finance/TrustMeters'
import { RetagSelect } from '@/components/finance/RetagSelect'
import { ReceiptInXero } from '@/components/finance/ReceiptInXero'
import { MirrorProjectRail, type RailSelection } from '@/components/finance/MirrorProjectRail'
import { MirrorFlags, type MirrorFlag } from '@/components/finance/MirrorFlags'

// The Xero Mirror — one surface to align tagging against the live mirror, see
// every project's money in/out, and clear issues. Composes the existing finance
// APIs + trust primitives (plan: 2026-05-29-finance-xero-mirror-surface).

type RowSource = 'bill' | 'spend' | 'spend-overpay' | 'receive'
interface MirrorRow {
  id: string
  xeroId: string
  source: RowSource
  date: string
  contact: string
  total: number
  status: string
  projectCode: string | null
  projectSource: string | null
  description: string
  hasAttachments: boolean
  xeroLink: string
  note: string
  bankAccount: string | null
}
interface TxnResponse {
  count: number
  rows: MirrorRow[]
  projects: Array<{ code: string | null; name: string | null; count: number }>
  accounts: string[]
  actAccounts: string[]
}

const isExpense = (s: RowSource) => s === 'bill' || s === 'spend' || s === 'spend-overpay'
const isIncoming = (s: RowSource) => s === 'receive'
const rowKey = (r: MirrorRow) => `${r.source}:${r.id}`
// RetagSelect kind: bills hit the invoices table, everything else the txns table.
const retagKind = (s: RowSource): 'bill' | 'spend' => (s === 'bill' ? 'bill' : 'spend')
const patchSource = (s: RowSource): 'bill' | 'spend' => (s === 'bill' ? 'bill' : 'spend')

export default function XeroMirrorPage() {
  const qc = useQueryClient()
  const [accountScope, setAccountScope] = useState<'act-only' | 'all'>('act-only')
  const [railSel, setRailSel] = useState<RailSelection>('all')
  const [activeFlag, setActiveFlag] = useState<MirrorFlag | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Map<string, { id: string; source: 'bill' | 'spend' }>>(new Map())
  const [bulkCode, setBulkCode] = useState('')
  const [bulkState, setBulkState] = useState<'idle' | 'saving'>('idle')

  const { data, isLoading, isFetching, refetch } = useQuery<TxnResponse>({
    queryKey: ['finance', 'mirror', 'txns', accountScope],
    queryFn: () => fetch(`/api/finance/transactions?accounts=${accountScope}`).then((r) => r.json()),
    staleTime: 60 * 1000,
  })

  const rows = useMemo(() => data?.rows ?? [], [data])
  const projectOptions = useMemo(
    () => (data?.projects ?? []).filter((p): p is { code: string; name: string | null; count: number } => !!p.code).map((p) => ({ code: p.code, name: p.name || p.code })),
    [data],
  )

  const untaggedCount = useMemo(() => rows.filter((r) => !r.projectCode).length, [rows])
  // Bills are the receipt-bearing docs (Dext attachments); bank spends rarely
  // carry an individual receipt, so flagging them as "missing" is just noise.
  const missingReceiptCount = useMemo(() => rows.filter((r) => r.source === 'bill' && !r.hasAttachments).length, [rows])

  const filtered = useMemo(() => {
    let out = rows
    if (railSel === 'UNTAGGED') out = out.filter((r) => !r.projectCode)
    else if (railSel !== 'all') out = out.filter((r) => r.projectCode === railSel)
    if (activeFlag === 'untagged') out = out.filter((r) => !r.projectCode)
    else if (activeFlag === 'missing-receipt') out = out.filter((r) => r.source === 'bill' && !r.hasAttachments)
    const q = search.trim().toLowerCase()
    if (q) out = out.filter((r) => r.contact.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || (r.projectCode || '').toLowerCase().includes(q))
    return out
  }, [rows, railSel, activeFlag, search])

  const shown = filtered.slice(0, 500)
  const filteredTotals = useMemo(() => {
    let inAmt = 0, outAmt = 0
    for (const r of filtered) {
      if (isIncoming(r.source)) inAmt += r.total
      else if (isExpense(r.source)) outAmt += r.total
    }
    return { inAmt, outAmt, net: inAmt - outAmt }
  }, [filtered])

  function toggleRow(r: MirrorRow) {
    setSelected((prev) => {
      const next = new Map(prev)
      const k = rowKey(r)
      if (next.has(k)) next.delete(k)
      else next.set(k, { id: r.id, source: patchSource(r.source) })
      return next
    })
  }
  function selectAllShown() {
    setSelected((prev) => {
      const next = new Map(prev)
      const allSelected = shown.every((r) => next.has(rowKey(r)))
      if (allSelected) shown.forEach((r) => next.delete(rowKey(r)))
      else shown.forEach((r) => next.set(rowKey(r), { id: r.id, source: patchSource(r.source) }))
      return next
    })
  }

  async function applyBulk() {
    if (!selected.size) return
    setBulkState('saving')
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: [...selected.values()], projectCode: bulkCode || null }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `HTTP ${res.status}`)
      setSelected(new Map())
      setBulkCode('')
      await qc.invalidateQueries({ queryKey: ['finance', 'mirror', 'txns'] })
      await refetch()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'bulk retag failed')
    } finally {
      setBulkState('idle')
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-2 transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" /> Finance
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Layers className="h-7 w-7 text-cyan-400" /> Xero Mirror
          </h1>
          <p className="text-sm text-white/50 mt-1">Align tagging on the live Xero mirror · every project&apos;s money in/out · flagged issues — in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <FreshnessBadge />
          <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-xs text-white/70 hover:bg-white/10">
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </button>
        </div>
      </div>

      <TrustMeters />

      <section className="space-y-2">
        <div>
          <h2 className="text-sm uppercase tracking-wide text-white/40">Funds by project — FY26 P&amp;L · incoming ↑ · outgoing ↓</h2>
          <p className="text-[11px] text-white/30">Accrual revenue/expenses, FY26 to date. Lifetime cash differs — e.g. Goods lifetime received ≈ $649K vs FY26 ≈ $350K. Click a chip to filter the mirror below.</p>
        </div>
        <MirrorProjectRail active={railSel} onSelect={(s) => { setRailSel(s); setActiveFlag(null) }} untaggedCount={untaggedCount} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-white/40">Issues to clear</h2>
        <MirrorFlags untaggedCount={untaggedCount} missingReceiptCount={missingReceiptCount} activeFlag={activeFlag} onSelectFlag={setActiveFlag} />
      </section>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor / description / project…"
            className="w-72 rounded-lg border border-white/15 bg-black/40 pl-8 pr-3 py-1.5 text-sm text-white/80 outline-none focus:border-cyan-300/50"
          />
        </div>
        <div className="inline-flex rounded-lg border border-white/15 overflow-hidden text-xs">
          {(['act-only', 'all'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setAccountScope(s)} className={cn('px-3 py-1.5', accountScope === s ? 'bg-cyan-500/20 text-cyan-200' : 'text-white/50 hover:bg-white/5')}>
              {s === 'act-only' ? 'ACT accounts' : 'All accounts'}
            </button>
          ))}
        </div>
        <div className="text-xs text-white/40 tabular-nums">
          {filtered.length} rows · <span className="text-emerald-400">↑{formatMoney(filteredTotals.inAmt)}</span> <span className="text-red-400">↓{formatMoney(filteredTotals.outAmt)}</span>
          {filtered.length > shown.length && <span className="ml-1 text-amber-300/70">(showing first {shown.length})</span>}
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-4 py-2">
          <span className="text-sm text-cyan-100">{selected.size} selected</span>
          <select value={bulkCode} onChange={(e) => setBulkCode(e.target.value)} className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-white/80">
            <option value="">untag (clear project)</option>
            {projectOptions.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
          </select>
          <button type="button" disabled={bulkState === 'saving'} onClick={applyBulk} className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/80 px-3 py-1 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50">
            {bulkState === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Apply to {selected.size}
          </button>
          <button type="button" onClick={() => setSelected(new Map())} className="text-xs text-white/50 hover:text-white">clear</button>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center text-white/40">Loading the mirror…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-white/40">
                <th className="px-3 py-2"><input type="checkbox" checked={shown.length > 0 && shown.every((r) => selected.has(rowKey(r)))} onChange={selectAllShown} /></th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2 text-center">Receipt</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={rowKey(r)} className={cn('border-b border-white/5 hover:bg-white/[0.03]', selected.has(rowKey(r)) && 'bg-cyan-500/[0.06]')}>
                  <td className="px-3 py-2"><input type="checkbox" checked={selected.has(rowKey(r))} onChange={() => toggleRow(r)} /></td>
                  <td className="px-3 py-2 text-white/60 tabular-nums whitespace-nowrap">{r.date}</td>
                  <td className="px-3 py-2 text-white/90">
                    <div className="font-medium">{r.contact || <span className="text-white/30">—</span>}</div>
                    {r.description && <div className="text-[11px] text-white/40 truncate max-w-[28ch]" title={r.description}>{r.description}</div>}
                  </td>
                  <td className={cn('px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap', isIncoming(r.source) ? 'text-emerald-400' : 'text-red-400')}>
                    {isIncoming(r.source) ? '↑' : '↓'}{formatMoney(r.total)}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-white/40 whitespace-nowrap">{r.bankAccount ? (r.bankAccount.includes('Visa') ? 'NAB Visa' : r.bankAccount.includes('Everyday') ? 'ACT Everyday' : r.bankAccount) : r.source === 'bill' ? 'bill' : '—'}</td>
                  <td className="px-3 py-2"><RetagSelect kind={retagKind(r.source)} id={r.id} currentCode={r.projectCode} projects={projectOptions} /></td>
                  <td className="px-3 py-2 text-center">{r.source === 'bill' ? <ReceiptInXero hasAttachment={r.hasAttachments} /> : r.hasAttachments ? <ReceiptInXero hasAttachment /> : <span className="text-white/20" title="Bank spend — receipt n/a">—</span>}</td>
                  <td className="px-3 py-2"><a href={r.xeroLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-cyan-300/70 hover:text-cyan-300"><ExternalLink className="h-3 w-3" /></a></td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-12 text-center text-white/40">No rows match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
