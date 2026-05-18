'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { VendorSidebar } from '@/components/finance/VendorSidebar'

type Vendor = {
  vendor: string
  total_count: number
  total_sum: number
  untagged_count: number
  untagged_sum: number
  last_date: string
  first_date: string
  top_project: string | null
  confidence: number | null
}

type SortField = 'vendor' | 'total_sum' | 'total_count' | 'untagged_count' | 'last_date' | 'top_project'

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
}

export default function VendorsIndex() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [projects, setProjects] = useState<{ code: string | null; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [hasUntaggedOnly, setHasUntaggedOnly] = useState(false)
  const [noSuggestionOnly, setNoSuggestionOnly] = useState(false)
  const [minSum, setMinSum] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('total_sum')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [openVendor, setOpenVendor] = useState<string | null>(null)

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/finance/vendors').then((r) => r.json()),
      fetch('/api/finance/transactions?project=ACT-CORE').then((r) => r.json()), // just to grab projects list
    ]).then(([v, t]) => {
      setVendors((v.vendors || []).map((x: any) => ({ ...x, total_sum: Number(x.total_sum), untagged_sum: Number(x.untagged_sum), total_count: Number(x.total_count), untagged_count: Number(x.untagged_count), confidence: x.confidence != null ? Number(x.confidence) : null })))
      setProjects(t.projects || [])
    }).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => {
    let r = vendors
    if (hasUntaggedOnly) r = r.filter((v) => v.untagged_count > 0)
    if (noSuggestionOnly) r = r.filter((v) => !v.top_project)
    if (projectFilter !== 'all') r = r.filter((v) => v.top_project === projectFilter)
    if (minSum) { const m = parseFloat(minSum); if (!isNaN(m)) r = r.filter((v) => v.total_sum >= m) }
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((v) => v.vendor.toLowerCase().includes(q))
    }
    r = [...r].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'total_sum') return dir * (a.total_sum - b.total_sum)
      if (sortField === 'total_count') return dir * (a.total_count - b.total_count)
      if (sortField === 'untagged_count') return dir * (a.untagged_count - b.untagged_count)
      if (sortField === 'last_date') return dir * String(a.last_date).localeCompare(String(b.last_date))
      if (sortField === 'top_project') return dir * String(a.top_project || 'z').localeCompare(String(b.top_project || 'z'))
      return dir * a.vendor.localeCompare(b.vendor)
    })
    return r
  }, [vendors, search, hasUntaggedOnly, noSuggestionOnly, projectFilter, minSum, sortField, sortDir])

  const stats = useMemo(() => {
    const sum = filtered.reduce((a, v) => a + v.total_sum, 0)
    const untaggedSum = filtered.reduce((a, v) => a + v.untagged_sum, 0)
    const untaggedCount = filtered.reduce((a, v) => a + v.untagged_count, 0)
    return { count: filtered.length, sum, untaggedSum, untaggedCount }
  }, [filtered])

  function toggleSort(f: SortField) {
    if (sortField === f) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir(f === 'vendor' || f === 'top_project' ? 'asc' : 'desc') }
  }

  function exportCsv() {
    const headers = ['vendor', 'total_count', 'total_sum', 'untagged_count', 'untagged_sum', 'last_date', 'first_date', 'top_project', 'confidence']
    const lines = [headers.join(',')]
    for (const v of filtered) {
      lines.push([
        `"${v.vendor.replace(/"/g, '""')}"`, v.total_count, v.total_sum.toFixed(2),
        v.untagged_count, v.untagged_sum.toFixed(2), v.last_date, v.first_date,
        v.top_project || '', v.confidence ?? '',
      ].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `vendors-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold">Vendors</h1>
            <div className="text-xs text-white/40">Sweep through every vendor · click to drill in · bulk-tag untagged rows</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{fmt(stats.sum)}</div>
            <div className="text-xs text-white/40">{stats.count} vendors · {stats.untaggedCount} untagged txns worth {fmt(stats.untaggedSum)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-3 grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className="col-span-2">
            <label className="text-xs text-white/40 block mb-1">Search vendor name</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. kennedy, bunnings, qantas" className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Top project = </label>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm">
              <option value="all">any</option>
              {projects.filter(p => p.code).map(p => <option key={p.code} value={p.code!}>{p.code}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Min total $</label>
            <input value={minSum} onChange={(e) => setMinSum(e.target.value)} placeholder="0" className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
          </div>
          <label className="text-xs flex items-end gap-1 cursor-pointer pb-1">
            <input type="checkbox" checked={hasUntaggedOnly} onChange={(e) => setHasUntaggedOnly(e.target.checked)} /> Has untagged
          </label>
          <label className="text-xs flex items-end gap-1 cursor-pointer pb-1">
            <input type="checkbox" checked={noSuggestionOnly} onChange={(e) => setNoSuggestionOnly(e.target.checked)} /> No suggestion
          </label>
          <div className="col-span-6 flex gap-2 pt-2 border-t border-white/10">
            <button onClick={exportCsv} className="text-xs px-3 py-1 border border-white/20 rounded hover:bg-white/10">Export CSV</button>
            <button onClick={() => { setSearch(''); setHasUntaggedOnly(false); setNoSuggestionOnly(false); setProjectFilter('all'); setMinSum('') }} className="text-xs px-3 py-1 border border-white/20 rounded hover:bg-white/10">Reset</button>
            <span className="ml-auto text-xs text-white/40 self-center">{filtered.length} of {vendors.length}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          {loading ? <div className="p-6 text-white/40">Loading…</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/10 text-white/60 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('vendor')}>Vendor {sortField === 'vendor' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                    <th className="text-right px-3 py-2 cursor-pointer" onClick={() => toggleSort('total_count')}>Txns {sortField === 'total_count' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                    <th className="text-right px-3 py-2 cursor-pointer" onClick={() => toggleSort('total_sum')}>Total $ {sortField === 'total_sum' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                    <th className="text-right px-3 py-2 cursor-pointer" onClick={() => toggleSort('untagged_count')}>Untagged {sortField === 'untagged_count' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                    <th className="text-right px-3 py-2">Untagged $</th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('top_project')}>Top project {sortField === 'top_project' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                    <th className="text-right px-3 py-2">Conf.</th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('last_date')}>Last txn {sortField === 'last_date' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 1000).map((v, i) => (
                    <tr key={v.vendor} onClick={() => setOpenVendor(v.vendor)}
                      className={`border-t border-white/5 cursor-pointer hover:bg-white/[0.05] ${v.untagged_count > 0 ? 'bg-red-500/5' : i % 2 ? 'bg-white/[0.02]' : ''}`}>
                      <td className="px-3 py-1.5 text-white font-medium">{v.vendor}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-white/80">{v.total_count}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-white/90">{fmt(v.total_sum)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {v.untagged_count > 0 ? <span className="text-red-300">{v.untagged_count}</span> : <span className="text-white/30">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-white/60">{v.untagged_sum > 0 ? fmt(v.untagged_sum) : '—'}</td>
                      <td className="px-3 py-1.5 text-white/80">{v.top_project || <span className="text-white/30">—</span>}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-white/60">{v.confidence != null ? `${v.confidence}%` : ''}</td>
                      <td className="px-3 py-1.5 text-white/60 whitespace-nowrap">{v.last_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="p-6 text-center text-white/40">No vendors match filters.</div>}
              {filtered.length > 1000 && <div className="p-3 text-center text-xs text-amber-400">Showing first 1,000 of {filtered.length} — narrow filters or use CSV.</div>}
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-white/40 flex justify-between">
          <span>Click any row to open the vendor sidebar: project distribution, suggested tag, bulk-tag UNTAGGED rows, full transaction list.</span>
          <span><Link href="/finance/transactions" className="underline">→ all transactions</Link></span>
        </div>
      </div>

      {openVendor && (
        <VendorSidebar
          vendor={openVendor}
          onClose={() => setOpenVendor(null)}
          projects={projects}
          onTagged={() => { load() }}
        />
      )}
    </div>
  )
}
