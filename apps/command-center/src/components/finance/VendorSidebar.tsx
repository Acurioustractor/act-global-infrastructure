'use client'

import { useEffect, useState } from 'react'

type ProjectOpt = { code: string | null; count: number }

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
}

export function VendorSidebar({ vendor, onClose, projects, onTagged }: {
  vendor: string;
  onClose: () => void;
  projects: ProjectOpt[];
  onTagged?: () => void;
}) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bulkChoice, setBulkChoice] = useState<string>('')
  const [toast, setToast] = useState<string | null>(null)

  function reload() {
    setLoading(true)
    fetch(`/api/finance/vendors/${encodeURIComponent(vendor)}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }

  useEffect(reload, [vendor]) // eslint-disable-line

  async function bulkTag(target: string) {
    if (!data?.rows?.length) return
    const items = data.rows.filter((r: any) => !r.projectCode).map((r: any) => ({ id: r.id, source: r.source }))
    if (!items.length) { setToast('No untagged rows'); setTimeout(() => setToast(null), 2000); return }
    const resp = await fetch('/api/finance/transactions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, projectCode: target === 'UNTAGGED' ? null : target }),
    })
    const d = await resp.json()
    if (!resp.ok) { setToast(`Failed: ${d.error}`); setTimeout(() => setToast(null), 3000); return }
    setToast(`Tagged ${d.total} rows → ${target}`); setTimeout(() => setToast(null), 2500)
    reload()
    onTagged?.()
  }

  async function tagOne(rowId: string, source: string, target: string | null) {
    const resp = await fetch('/api/finance/transactions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: rowId, source }], projectCode: target }),
    })
    if (resp.ok) { reload(); onTagged?.() }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl h-full bg-zinc-950 border-l border-white/20 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-950 border-b border-white/10 p-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold">{vendor}</h2>
            {data && <div className="text-xs text-white/40">{data.totalCount} txns · {fmt(data.totalSum)} total · {data.untaggedCount} untagged</div>}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl">✕</button>
        </div>
        {toast && <div className="mx-4 mt-2 px-3 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded text-sm">{toast}</div>}
        <div className="p-4">
          {loading && <div className="text-white/40 text-sm">Loading…</div>}
          {data && !loading && (
            <>
              {data.suggested && (
                <div className="bg-emerald-500/10 border border-emerald-500/40 rounded p-3 mb-4">
                  <div className="text-xs text-emerald-200/70 mb-1">Suggested project (vendor history)</div>
                  <div className="text-emerald-200 text-base font-semibold">{data.suggested.projectCode} <span className="text-xs">{data.suggested.confidence}%</span></div>
                </div>
              )}

              <div className="mb-4">
                <div className="text-xs text-white/40 mb-2">Project distribution</div>
                <div className="space-y-1">
                  {data.projectDistribution.map((p: any) => (
                    <div key={p.code} className="flex justify-between text-sm">
                      <span className={p.code === 'UNTAGGED' ? 'text-red-300' : 'text-white/80'}>{p.code}</span>
                      <span className="text-white/60 tabular-nums">{p.count} · {fmt(p.sum)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {data.untaggedCount > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/40 rounded p-3 mb-4">
                  <div className="text-xs text-blue-200/70 mb-2">Bulk-tag {data.untaggedCount} UNTAGGED rows</div>
                  <div className="flex gap-2 items-center">
                    <select value={bulkChoice} onChange={(e) => setBulkChoice(e.target.value)} className="bg-black border border-white/20 rounded px-2 py-1 text-sm flex-1">
                      <option value="">Pick project…</option>
                      {data.suggested && <option value={data.suggested.projectCode}>→ {data.suggested.projectCode} (suggested)</option>}
                      {projects.filter(p => p.code).map(p => <option key={p.code} value={p.code!}>{p.code}</option>)}
                    </select>
                    <button disabled={!bulkChoice} onClick={() => bulkTag(bulkChoice)}
                      className="text-sm px-3 py-1 bg-blue-500/30 border border-blue-500/60 rounded hover:bg-blue-500/40 disabled:opacity-40">
                      Tag {data.untaggedCount}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-white/40 mb-2">All transactions</div>
                <div className="space-y-1 text-xs">
                  {data.rows.map((r: any) => (
                    <div key={`${r.source}-${r.id}`} className={`flex justify-between gap-2 px-2 py-1 rounded items-center ${r.projectCode ? 'bg-white/[0.03]' : 'bg-red-500/10 border border-red-500/30'}`}>
                      <span className="text-white/60 w-20">{r.date}</span>
                      <span className="text-white/40 w-12">{r.source}</span>
                      <span className="tabular-nums text-white/80 text-right w-24">{fmt(r.total)}</span>
                      <select value={r.projectCode || ''} onChange={(e) => tagOne(r.id, r.source, e.target.value || null)}
                        className={`bg-black border rounded px-1 py-0.5 text-[10px] flex-1 ${r.projectCode ? 'border-white/30 text-white' : 'border-red-500/50 text-red-300'}`}>
                        <option value="">UNTAGGED</option>
                        {projects.filter(p => p.code).map(p => <option key={p.code} value={p.code!}>{p.code}</option>)}
                      </select>
                      <a href={r.xeroLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">↗</a>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
