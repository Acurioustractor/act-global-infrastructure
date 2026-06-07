'use client'

import { useEffect, useMemo, useState, use as usePromise } from 'react'
import Link from 'next/link'

type Row = {
  id: string
  xeroId: string
  source: 'bill' | 'spend' | 'spend-overpay' | 'receive'
  date: string
  contact: string
  total: number
  status: string
  ref: string
  description: string
  auditNote: string
  flagDuplicate: boolean
  paymentOfBill: boolean
  xeroLink: string
  projectCode: string | null
}
type ProjectOpt = { code: string | null; name?: string | null; status?: string | null; tier?: string | null; count: number }

function projectLabel(p: ProjectOpt | undefined | null): string {
  if (!p) return ''
  if (!p.code) return 'UNTAGGED'
  return p.name ? `${p.name} (${p.code})` : p.code
}

type SortField = 'date' | 'contact' | 'total' | 'source' | 'status' | 'auditNote'
type SortDir = 'asc' | 'desc'

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
}

function chip(text: string, color: string) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs ${color}`}
      style={{ fontFamily: 'ui-monospace, monospace' }}
    >
      {text}
    </span>
  )
}

export default function TransactionsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = usePromise(params)
  const projectCode = decodeURIComponent(code).toUpperCase()
  const [rows, setRows] = useState<Row[]>([])
  const [projects, setProjects] = useState<ProjectOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function retag(row: Row, newCode: string | null) {
    setSavingId(row.id)
    try {
      const r = await fetch('/api/finance/transactions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: row.id, source: row.source }], projectCode: newCode }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'failed')
      if (newCode !== projectCode) {
        // moved out of this project — drop from this view
        setRows((prev) => prev.filter((x) => x.id !== row.id))
        setToast(`Moved ${row.contact} out → ${newCode || 'UNTAGGED'}`)
      } else {
        setRows((prev) => prev.map((x) => x.id === row.id ? { ...x, projectCode: newCode } : x))
        setToast(`Kept ${row.contact} → ${newCode}`)
      }
      setTimeout(() => setToast(null), 2000)
    } catch (e: any) {
      setToast(`Failed: ${e.message}`); setTimeout(() => setToast(null), 3500)
    } finally { setSavingId(null) }
  }

  // filters
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [source, setSource] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [excludePaymentOfBill, setExcludePaymentOfBill] = useState(true)
  const [auditOnly, setAuditOnly] = useState(false)
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [vendorOnly, setVendorOnly] = useState('')

  // sorting
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/finance/projects/${projectCode}/transactions`).then((r) => r.json()),
      fetch(`/api/finance/transactions?project=ACT-CORE&limit=1`).then((r) => r.json()),
    ]).then(([scoped, all]) => {
      setRows(scoped.rows || [])
      setProjects(all.projects || [])
    }).finally(() => setLoading(false))
  }, [projectCode])

  const filtered = useMemo(() => {
    let r = rows
    if (excludePaymentOfBill) r = r.filter((x) => !x.paymentOfBill)
    if (auditOnly) r = r.filter((x) => x.auditNote)
    if (source !== 'all') r = r.filter((x) => x.source === source)
    if (status !== 'all') r = r.filter((x) => x.status === status)
    if (dateFrom) r = r.filter((x) => x.date >= dateFrom)
    if (dateTo) r = r.filter((x) => x.date <= dateTo)
    if (minAmount) {
      const m = parseFloat(minAmount)
      if (!isNaN(m)) r = r.filter((x) => x.total >= m)
    }
    if (maxAmount) {
      const m = parseFloat(maxAmount)
      if (!isNaN(m)) r = r.filter((x) => x.total <= m)
    }
    if (vendorOnly) {
      const v = vendorOnly.toLowerCase()
      r = r.filter((x) => x.contact.toLowerCase() === v)
    }
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(
        (x) =>
          x.contact.toLowerCase().includes(q) ||
          x.description.toLowerCase().includes(q) ||
          x.auditNote.toLowerCase().includes(q) ||
          x.ref.toLowerCase().includes(q)
      )
    }
    r = [...r].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'total') return dir * (a.total - b.total)
      const av = String(a[sortField] ?? '')
      const bv = String(b[sortField] ?? '')
      return dir * av.localeCompare(bv)
    })
    return r
  }, [rows, search, dateFrom, dateTo, source, status, excludePaymentOfBill, auditOnly, minAmount, maxAmount, vendorOnly, sortField, sortDir])

  const stats = useMemo(() => {
    const sum = filtered.reduce((a, r) => a + r.total, 0)
    const billsSum = filtered.filter((r) => r.source === 'bill').reduce((a, r) => a + r.total, 0)
    const spendsSum = filtered.filter((r) => r.source !== 'bill' && r.source !== 'receive').reduce((a, r) => a + r.total, 0)
    return { count: filtered.length, sum, billsSum, spendsSum }
  }, [filtered])

  // Top vendors of the filtered set for quick filter chips
  const vendorTops = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of filtered) m.set(r.contact, (m.get(r.contact) || 0) + r.total)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [filtered])

  function toggleSort(f: SortField) {
    if (sortField === f) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(f)
      setSortDir(f === 'total' || f === 'date' ? 'desc' : 'asc')
    }
  }

  function exportCsv() {
    const headers = ['date', 'source', 'vendor', 'amount', 'status', 'description', 'audit_note', 'xero_link']
    const lines = [headers.join(',')]
    for (const r of filtered) {
      const csv = [
        r.date,
        r.source,
        `"${(r.contact || '').replace(/"/g, '""')}"`,
        r.total.toFixed(2),
        r.status,
        `"${(r.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(r.auditNote || '').replace(/"/g, '""')}"`,
        r.xeroLink,
      ]
      lines.push(csv.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectCode}-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function resetFilters() {
    setSearch(''); setDateFrom(''); setDateTo(''); setSource('all'); setStatus('all')
    setExcludePaymentOfBill(true); setAuditOnly(false); setMinAmount(''); setMaxAmount(''); setVendorOnly('')
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              {projects.find(p => p.code === projectCode)?.name || projectCode}
              <span className="text-white/30 text-base ml-2">({projectCode})</span>
              <span className="text-white/40 text-base ml-2">— Transactions</span>
            </h1>
            <Link href={`/finance/projects/${projectCode}`} className="text-sm text-white/40 hover:text-white/80">
              ← back to project overview
            </Link>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{fmt(stats.sum)}</div>
            <div className="text-xs text-white/40">{stats.count} rows · bills {fmt(stats.billsSum)} · spend {fmt(stats.spendsSum)}</div>
          </div>
        </div>

        {toast && <div className="mb-3 px-3 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded text-sm">{toast}</div>}

        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-white/40 block mb-1">Search vendor / description / note</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. kennedy, decking, st mary"
                className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Date from</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Date to</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm">
                <option value="all">all</option>
                <option value="bill">bill (ACCPAY)</option>
                <option value="spend">bank spend</option>
                <option value="spend-overpay">spend-overpay</option>
                <option value="receive">receive</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm">
                <option value="all">all</option>
                <option value="PAID">PAID</option>
                <option value="AUTHORISED">AUTHORISED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="DELETED">DELETED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <div>
              <label className="text-xs text-white/40 block mb-1">Min $</label>
              <input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Max $</label>
              <input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="∞" className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
            </div>
            <div className="flex items-end">
              <label className="text-xs flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={excludePaymentOfBill} onChange={(e) => setExcludePaymentOfBill(e.target.checked)} />
                Exclude bill-payment dups
              </label>
            </div>
            <div className="flex items-end">
              <label className="text-xs flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={auditOnly} onChange={(e) => setAuditOnly(e.target.checked)} />
                Audit-flagged only
              </label>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={resetFilters} className="text-xs px-2 py-1 border border-white/20 rounded hover:bg-white/10">reset</button>
              <button onClick={exportCsv} className="text-xs px-2 py-1 border border-white/20 rounded hover:bg-white/10">export CSV</button>
            </div>
          </div>

          {/* Quick vendor chips */}
          {vendorTops.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-white/40 mr-1">top vendors:</span>
              {vendorTops.map(([v, t]) => (
                <button
                  key={v}
                  onClick={() => setVendorOnly(vendorOnly === v ? '' : v)}
                  className={`text-xs px-2 py-0.5 rounded border ${vendorOnly === v ? 'bg-white/20 border-white/50' : 'border-white/10 hover:border-white/30'}`}
                >
                  {v} · {fmt(t)}
                </button>
              ))}
              {vendorOnly && (
                <button onClick={() => setVendorOnly('')} className="text-xs px-2 py-0.5 rounded border border-red-500/50 text-red-300">clear vendor</button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-6 text-white/40">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/10 text-white/60 text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('date')}>
                      Date {sortField === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('source')}>
                      Src {sortField === 'source' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('contact')}>
                      Vendor {sortField === 'contact' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-right px-3 py-2 cursor-pointer" onClick={() => toggleSort('total')}>
                      $ {sortField === 'total' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('status')}>
                      Status {sortField === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left px-3 py-2">Project</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('auditNote')}>
                      Audit note {sortField === 'auditNote' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left px-3 py-2">Xero</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr
                      key={r.xeroId}
                      className={`border-t border-white/5 ${r.flagDuplicate ? 'bg-red-500/5' : r.auditNote.startsWith('★') ? 'bg-emerald-500/5' : r.auditNote.startsWith('⚠') ? 'bg-amber-500/5' : r.auditNote.startsWith('?') ? 'bg-yellow-500/5' : i % 2 ? 'bg-white/[0.02]' : ''}`}
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap text-white/80">{r.date}</td>
                      <td className="px-3 py-1.5 text-white/50">{r.source === 'bill' ? chip('bill', 'bg-blue-500/20 text-blue-200') : r.source === 'spend' ? chip('spnd', 'bg-purple-500/20 text-purple-200') : chip(r.source, 'bg-white/10 text-white/60')}</td>
                      <td className="px-3 py-1.5 text-white">{r.contact}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-white/90">{fmt(r.total)}</td>
                      <td className="px-3 py-1.5 text-white/50">{r.status === 'PAID' ? chip('PAID', 'bg-emerald-500/20 text-emerald-200') : r.status === 'AUTHORISED' ? chip('AUTH', 'bg-amber-500/20 text-amber-200') : chip(r.status, 'bg-white/10 text-white/60')}</td>
                      <td className="px-3 py-1.5">
                        <select value={r.projectCode || ''} disabled={savingId === r.id} onChange={(e) => retag(r, e.target.value || null)}
                          title={r.projectCode ? projectLabel(projects.find(p => p.code === r.projectCode)) : 'UNTAGGED'}
                          className={`bg-black border rounded px-1 py-0.5 text-xs max-w-[200px] ${r.projectCode === projectCode ? 'border-emerald-500/40 text-emerald-200' : r.projectCode ? 'border-amber-500/40 text-amber-200' : 'border-red-500/50 text-red-300'}`}>
                          <option value="">UNTAGGED</option>
                          {projects.filter(p => p.code).map(p => <option key={p.code} value={p.code!}>{projectLabel(p)}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-white/70 max-w-[400px] truncate" title={r.description}>{r.description}</td>
                      <td className="px-3 py-1.5 text-white/80 max-w-[300px]">{r.auditNote}</td>
                      <td className="px-3 py-1.5"><a href={r.xeroLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">open</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="p-6 text-center text-white/40">No rows match filters.</div>}
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-white/40">
          Source: <code>xero_invoices</code> (ACCPAY) + <code>xero_transactions</code> (SPEND/SPEND-OVERPAYMENT/RECEIVE) where <code>project_code = {projectCode}</code>.
          Bill-payment dedup matches vendor + amount + date ±14d. Toggle off to show every raw row.
          Audit notes reflect the 2026-05-17 OCR-driven review (St Mary&apos;s Cathedral discovery, Kennedy&apos;s duplicate, Flight Bar Witta miscoding, Carbatec maybe-duplicates).
        </div>
      </div>
    </div>
  )
}
