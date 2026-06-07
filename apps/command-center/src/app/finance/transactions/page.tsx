'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { suggest as ruleSuggest, type Suggestion as TierSuggestion } from '@/lib/tag-suggester'

type Row = {
  id: string
  xeroId: string
  source: 'bill' | 'spend' | 'spend-overpay' | 'receive'
  date: string
  contact: string
  total: number
  status: string
  projectCode: string | null
  projectSource: string | null
  description: string
  hasAttachments: boolean
  xeroLink: string
  note?: string
  bankAccount: string | null
}
const ACT_ACCOUNTS = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday']
type ProjectOpt = { code: string | null; name?: string | null; status?: string | null; tier?: string | null; count: number }

function projectLabel(p: ProjectOpt | undefined | null): string {
  if (!p) return ''
  if (!p.code) return 'UNTAGGED'
  return p.name ? `${p.name} (${p.code})` : p.code
}
type Suggestion = { vendor: string; project_code: string; n: number; total: number; confidence: number }
type SortField = 'date' | 'contact' | 'total' | 'source' | 'status' | 'projectCode'

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
}

function chip(text: string, color: string) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${color}`} style={{ fontFamily: 'ui-monospace, monospace' }}>{text}</span>
}

// Deterministic colour per project so the same code reads the same everywhere.
// Full literal class strings (not interpolated) so Tailwind compiles them.
const PROJECT_PALETTE = [
  'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:border-emerald-400',
  'bg-blue-500/15 border-blue-500/40 text-blue-200 hover:border-blue-400',
  'bg-purple-500/15 border-purple-500/40 text-purple-200 hover:border-purple-400',
  'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 hover:border-cyan-400',
  'bg-pink-500/15 border-pink-500/40 text-pink-200 hover:border-pink-400',
  'bg-indigo-500/15 border-indigo-500/40 text-indigo-200 hover:border-indigo-400',
  'bg-teal-500/15 border-teal-500/40 text-teal-200 hover:border-teal-400',
  'bg-orange-500/15 border-orange-500/40 text-orange-200 hover:border-orange-400',
  'bg-lime-500/15 border-lime-500/40 text-lime-200 hover:border-lime-400',
  'bg-violet-500/15 border-violet-500/40 text-violet-200 hover:border-violet-400',
]
function projectColor(code: string): string {
  if (!code || code === 'UNTAGGED') return 'bg-amber-500/10 border-amber-500/50 text-amber-300 hover:border-amber-400'
  let h = 0
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0
  return PROJECT_PALETTE[h % PROJECT_PALETTE.length]
}
const SOURCE_COLOR: Record<string, string> = {
  spend: 'bg-rose-500/15 border-rose-500/40 text-rose-200 hover:border-rose-400',
  'spend-overpay': 'bg-rose-500/15 border-rose-500/40 text-rose-200 hover:border-rose-400',
  bill: 'bg-amber-500/15 border-amber-500/40 text-amber-200 hover:border-amber-400',
  receive: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:border-emerald-400',
}

function auditNote(r: Row): string {
  const id = r.xeroId
  const n = (r.contact || '').toLowerCase()
  const desc = (r.description || '').toLowerCase()
  if (id === '0e7e9885-4c3e-4100-a6fc-40433e2e1e6d') return '⚠ DUPLICATE — to void'
  if (id === '9ae29a04-f83b-48d1-a158-22565e2bd0cc') return '★ St Mary\'s 10t decking'
  if (id === 'e8ab116e-7920-40fc-92ce-0ffbd2ea09d0') return '★ St Mary\'s 2.5t + recycled'
  if (id === '310fa568-bf02-4fdf-b6d4-c7e41f0ff4a4') return '? Carbatec router-table maybe-dup'
  if (id === '6bf82502-d122-45ab-8f1c-843415d36441') return '? Carbatec bandsaw maybe-dup'
  if (n === 'flight bar witta') return '⚠ NT travel — should be ACT-OO'
  if (n === 'claire marchesi' && r.total === 8888) return '? purpose unconfirmed'
  if (n.includes('longara')) return 'milk crates'
  if (n.includes('rnm carpentry')) return '⚠ flagged not Harvest'
  if (n.includes('bunnings') && desc.includes('act-in')) return '⚠ line desc says ACT-IN'
  return ''
}

type Preset = { name: string; filters: any }
const PRESETS_KEY = 'act-tx-presets'

export default function TransactionsExplorer() {
  const [rows, setRows] = useState<Row[]>([])
  const [projects, setProjects] = useState<ProjectOpt[]>([])
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({})
  const [loading, setLoading] = useState(true)
  // Gate the first data load until URL filters are read, so we don't fire two
  // races (default UNTAGGED vs the URL-driven view) where the slower one wins.
  const [initialized, setInitialized] = useState(false)

  // server-side filters
  // Default to all (tagged + untagged). Untagged is ~empty now that FY26 is fully
  // tagged, so the old 'UNTAGGED' default landed on a blank list.
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [since, setSince] = useState('2025-07-01')
  const [accountFilter, setAccountFilter] = useState<string>('act-only') // 'act-only', 'all', or specific account name
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([])

  // client-side filters
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [auditOnly, setAuditOnly] = useState(false)
  const [hasReceiptOnly, setHasReceiptOnly] = useState(false)
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [vendorOnly, setVendorOnly] = useState('')
  const [groupByMonth, setGroupByMonth] = useState(false)

  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkProject, setBulkProject] = useState<string>('')
  const [bulkBusy, setBulkBusy] = useState(false)

  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [presets, setPresets] = useState<Preset[]>([])

  // OCR + notes + vendor sidebar
  const [ocrBusy, setOcrBusy] = useState<Set<string>>(new Set())
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [openVendor, setOpenVendor] = useState<string | null>(null)
  const [vendorData, setVendorData] = useState<any>(null)
  const [vendorLoading, setVendorLoading] = useState(false)

  // Paint-bucket mode (Feature B): click any row to apply the active project
  const [paintMode, setPaintMode] = useState(false)
  const [paintProject, setPaintProject] = useState<string>('')

  // Batch OCR state (Feature C)
  const [batchOcrBusy, setBatchOcrBusy] = useState(false)
  const [batchOcrProgress, setBatchOcrProgress] = useState({ done: 0, total: 0 })

  // Reality-check strip (org-wide stats, separate from the filter-scoped row set)
  const [reality, setReality] = useState<any>(null)
  const [realityLoading, setRealityLoading] = useState(false)

  async function runOcr(row: Row) {
    if (!row.hasAttachments) { setToast('No Xero attachment on this row'); setTimeout(() => setToast(null), 2000); return }
    setOcrBusy((s) => { const n = new Set(s); n.add(row.id); return n })
    try {
      const r = await fetch('/api/finance/transactions/ocr', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, source: row.source }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'failed')
      setRows((prev) => prev.map((x) => x.id === row.id ? { ...x, description: `[OCR] ${d.summary}` } : x))
      setToast(`OCR ✓ ${row.contact}: ${d.summary?.slice(0, 80) || ''} (${d.confidence})`)
      setTimeout(() => setToast(null), 4500)
    } catch (e: any) {
      setToast(`OCR failed: ${e.message}`); setTimeout(() => setToast(null), 4000)
    } finally {
      setOcrBusy((s) => { const n = new Set(s); n.delete(row.id); return n })
    }
  }

  async function saveNote(row: Row, note: string) {
    if ((row.note || '') === note) return // no change
    try {
      const r = await fetch('/api/finance/transactions/note', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, source: row.source, note }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'failed')
      setRows((prev) => prev.map((x) => x.id === row.id ? { ...x, note } : x))
      setNoteDraft((s) => { const n = { ...s }; delete n[row.id]; return n })
      setToast(`Note saved on ${row.contact}`); setTimeout(() => setToast(null), 1500)
    } catch (e: any) {
      setToast(`Note failed: ${e.message}`); setTimeout(() => setToast(null), 3500)
    }
  }

  async function openVendorSidebar(vendor: string) {
    setOpenVendor(vendor); setVendorLoading(true); setVendorData(null)
    try {
      const r = await fetch(`/api/finance/vendors/${encodeURIComponent(vendor)}`)
      const d = await r.json()
      setVendorData(d)
    } finally { setVendorLoading(false) }
  }
  async function bulkTagVendor(targetProject: string) {
    if (!vendorData?.rows?.length) return
    const items = vendorData.rows.filter((r: any) => !r.projectCode).map((r: any) => ({ id: r.id, source: r.source }))
    if (!items.length) { setToast('No untagged rows for this vendor'); setTimeout(() => setToast(null), 2000); return }
    const resp = await fetch('/api/finance/transactions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, projectCode: targetProject === 'UNTAGGED' ? null : targetProject }),
    })
    const d = await resp.json()
    if (!resp.ok) { setToast(`Vendor bulk failed: ${d.error}`); setTimeout(() => setToast(null), 4000); return }
    setToast(`Tagged ${d.total} ${openVendor} rows → ${targetProject}`)
    setTimeout(() => setToast(null), 2500)
    // refresh vendor sidebar + main list
    openVendorSidebar(openVendor!); load()
  }

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRESETS_KEY)
      if (stored) setPresets(JSON.parse(stored))
    } catch {}
  }, [])

  // Deep-linkable filters: initialise the server-side filters from the URL on mount
  // (e.g. ?project=ACT-HV&since=2026-01-01&accounts=all opens straight onto that view).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const p = sp.get('project'); if (p) setProjectFilter(p)
    const s = sp.get('since'); if (s) setSince(s)
    const a = sp.get('accounts'); if (a) setAccountFilter(a)
    setInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the URL in sync as filters change, so a view is shareable + survives refresh.
  // Gated on `initialized` so this never overwrites the incoming ?project= before the
  // init effect above has read it (else a deep-link like ?project=ACT-GD gets clobbered).
  useEffect(() => {
    if (!initialized) return
    const sp = new URLSearchParams()
    if (projectFilter !== 'all') sp.set('project', projectFilter)
    if (since !== '2025-07-01') sp.set('since', since)
    if (accountFilter !== 'act-only') sp.set('accounts', accountFilter)
    const qs = sp.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [projectFilter, since, accountFilter, initialized])

  function load() {
    setLoading(true)
    const sp = new URLSearchParams()
    if (projectFilter !== 'all') sp.set('project', projectFilter)
    if (since) sp.set('since', since)
    if (accountFilter) sp.set('accounts', accountFilter)
    fetch(`/api/finance/transactions?${sp.toString()}`)
      .then((r) => r.json())
      .then((d) => { setRows(d.rows || []); setProjects(d.projects || []); setAvailableAccounts(d.accounts || []) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch('/api/finance/transactions/vendor-suggestions')
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, Suggestion> = {}
        for (const s of d.suggestions || []) map[s.vendor.toLowerCase()] = s
        setSuggestions(map)
      })
  }, [])

  useEffect(() => { if (initialized) load() }, [projectFilter, since, accountFilter, initialized])

  // Load reality stats once per (since, accountFilter) change — org-wide, ignores project filter
  useEffect(() => {
    setRealityLoading(true)
    const sp = new URLSearchParams({ accounts: accountFilter, since })
    fetch(`/api/finance/transactions/reality?${sp.toString()}`)
      .then(r => r.json())
      .then(setReality)
      .finally(() => setRealityLoading(false))
  }, [since, accountFilter])

  const filtered = useMemo(() => {
    let r = rows
    if (source !== 'all') r = r.filter((x) => x.source === source)
    if (status !== 'all') r = r.filter((x) => x.status === status)
    if (auditOnly) r = r.filter((x) => auditNote(x))
    if (hasReceiptOnly) r = r.filter((x) => x.hasAttachments)
    if (minAmount) { const m = parseFloat(minAmount); if (!isNaN(m)) r = r.filter((x) => x.total >= m) }
    if (maxAmount) { const m = parseFloat(maxAmount); if (!isNaN(m)) r = r.filter((x) => x.total <= m) }
    if (vendorOnly) r = r.filter((x) => x.contact.toLowerCase() === vendorOnly.toLowerCase())
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((x) => x.contact.toLowerCase().includes(q) || x.description.toLowerCase().includes(q) || (x.projectCode || '').toLowerCase().includes(q))
    }
    r = [...r].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'total') return dir * (a.total - b.total)
      const av = String(a[sortField] ?? '')
      const bv = String(b[sortField] ?? '')
      return dir * av.localeCompare(bv)
    })
    return r
  }, [rows, search, source, status, auditOnly, hasReceiptOnly, minAmount, maxAmount, vendorOnly, sortField, sortDir])

  const stats = useMemo(() => {
    const sum = filtered.reduce((a, r) => a + r.total, 0)
    const byProject = new Map<string, { count: number; sum: number }>()
    const bySource = new Map<string, { count: number; sum: number }>()
    for (const r of filtered) {
      const p = r.projectCode || 'UNTAGGED'
      const pp = byProject.get(p) || { count: 0, sum: 0 }
      pp.count += 1; pp.sum += r.total; byProject.set(p, pp)
      const ss = bySource.get(r.source) || { count: 0, sum: 0 }
      ss.count += 1; ss.sum += r.total; bySource.set(r.source, ss)
    }
    return { count: filtered.length, sum, byProject: [...byProject.entries()].sort((a, b) => b[1].sum - a[1].sum), bySource: [...bySource.entries()] }
  }, [filtered])

  const vendorTops = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of filtered) m.set(r.contact, (m.get(r.contact) || 0) + r.total)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [filtered])

  function toggleSort(f: SortField) {
    if (sortField === f) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir(f === 'total' || f === 'date' ? 'desc' : 'asc') }
  }

  async function retag(row: Row, newCode: string | null) {
    setSavingId(row.id)
    try {
      const r = await fetch('/api/finance/transactions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: row.id, source: row.source }], projectCode: newCode }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'failed')
      setRows((prev) => prev.map((x) => x.id === row.id ? { ...x, projectCode: newCode, projectSource: 'manual' } : x))
      setToast(`Re-tagged ${row.contact} → ${newCode || 'UNTAGGED'}`)
      setTimeout(() => setToast(null), 2000)
    } catch (e: any) {
      setToast(`Failed: ${e.message}`); setTimeout(() => setToast(null), 3500)
    } finally { setSavingId(null) }
  }

  // Feature A — bulk apply all Tier A and B suggestions visible
  async function applyAllTierAB() {
    const items: Array<{ id: string; source: string; code: string }> = []
    for (const r of filtered) {
      if (r.projectCode) continue
      const s = ruleSuggest({ contact: r.contact, date: r.date, description: r.description })
      if (!s || (s.tier !== 'A' && s.tier !== 'B')) continue
      items.push({ id: r.id, source: r.source, code: s.code })
    }
    if (items.length === 0) { setToast('No Tier A or B suggestions for visible rows'); setTimeout(() => setToast(null), 2500); return }
    if (!confirm(`Apply ${items.length} high-confidence (Tier A+B) suggestions?`)) return
    setBulkBusy(true)
    // Group by target code so we can do one PATCH per code
    const byCode: Record<string, Array<{ id: string; source: string }>> = {}
    for (const it of items) {
      (byCode[it.code] ||= []).push({ id: it.id, source: it.source })
    }
    try {
      let ok = 0
      for (const [code, group] of Object.entries(byCode)) {
        const resp = await fetch('/api/finance/transactions', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: group, projectCode: code }),
        })
        const d = await resp.json()
        if (!resp.ok) throw new Error(d.error || 'failed')
        ok += d.total || group.length
        const ids = new Set(group.map(g => g.id))
        setRows(prev => prev.map(x => ids.has(x.id) ? { ...x, projectCode: code, projectSource: 'manual' } : x))
      }
      setToast(`Applied ${ok} suggestions across ${Object.keys(byCode).length} projects`)
      setTimeout(() => setToast(null), 3500)
    } catch (e: any) {
      setToast(`Apply-all failed: ${e.message}`); setTimeout(() => setToast(null), 4000)
    } finally { setBulkBusy(false) }
  }

  // Feature B — paint-bucket: row click in paint mode applies the active project
  async function paintRow(row: Row) {
    if (!paintProject) { setToast('Pick a project first'); setTimeout(() => setToast(null), 2000); return }
    const code = paintProject === 'UNTAGGED' ? null : paintProject
    await retag(row, code)
  }

  // Feature C — batch OCR every visible row with an attachment
  async function batchOcrVisible() {
    const targets = filtered.filter(r => r.hasAttachments && !r.description.startsWith('[OCR]'))
    if (targets.length === 0) { setToast('No rows to OCR (need attachment + not already OCR’d)'); setTimeout(() => setToast(null), 2500); return }
    if (!confirm(`Batch OCR ${targets.length} rows? Each call hits Gemini (~$0.0003 per row).`)) return
    setBatchOcrBusy(true)
    setBatchOcrProgress({ done: 0, total: targets.length })
    let done = 0, fail = 0
    for (const r of targets) {
      try {
        const resp = await fetch('/api/finance/transactions/ocr', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: r.id, source: r.source }),
        })
        const d = await resp.json()
        if (resp.ok) {
          setRows(prev => prev.map(x => x.id === r.id ? { ...x, description: `[OCR] ${d.summary}` } : x))
          done += 1
        } else fail += 1
      } catch { fail += 1 }
      setBatchOcrProgress({ done: done + fail, total: targets.length })
    }
    setBatchOcrBusy(false)
    setToast(`Batch OCR done: ${done} ok, ${fail} failed`)
    setTimeout(() => setToast(null), 4000)
  }

  async function bulkRetag() {
    if (!selected.size || !bulkProject) return
    const items = filtered.filter((r) => selected.has(r.id)).map((r) => ({ id: r.id, source: r.source }))
    setBulkBusy(true)
    try {
      const r = await fetch('/api/finance/transactions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, projectCode: bulkProject === 'UNTAGGED' ? null : bulkProject }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'failed')
      const newCode = bulkProject === 'UNTAGGED' ? null : bulkProject
      setRows((prev) => prev.map((x) => selected.has(x.id) ? { ...x, projectCode: newCode, projectSource: 'manual' } : x))
      setToast(`Bulk re-tagged ${d.total} rows → ${bulkProject}`)
      setSelected(new Set())
      setTimeout(() => setToast(null), 2500)
    } catch (e: any) {
      setToast(`Bulk failed: ${e.message}`); setTimeout(() => setToast(null), 4000)
    } finally { setBulkBusy(false) }
  }

  function toggleRow(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }
  function toggleAllVisible() {
    if (selected.size === filtered.length && filtered.length > 0) setSelected(new Set())
    else setSelected(new Set(filtered.slice(0, 1000).map((r) => r.id)))
  }

  function exportCsv() {
    const headers = ['date', 'source', 'vendor', 'amount', 'status', 'project_code', 'description', 'audit_note', 'xero_link']
    const lines = [headers.join(',')]
    for (const r of filtered) {
      lines.push([
        r.date, r.source, `"${(r.contact||'').replace(/"/g, '""')}"`, r.total.toFixed(2), r.status,
        r.projectCode || '', `"${(r.description||'').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${auditNote(r).replace(/"/g, '""')}"`, r.xeroLink,
      ].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `transactions-${projectFilter}-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  function savePreset() {
    const name = prompt('Preset name?')
    if (!name) return
    const next: Preset[] = [...presets, { name, filters: { projectFilter, since, accountFilter, search, source, status, auditOnly, hasReceiptOnly, minAmount, maxAmount, vendorOnly, groupByMonth } }]
    setPresets(next)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next))
  }
  function loadPreset(p: Preset) {
    const f = p.filters || {}
    setProjectFilter(f.projectFilter ?? 'all'); setSince(f.since ?? '2025-07-01')
    setAccountFilter(f.accountFilter ?? 'act-only')
    setSearch(f.search ?? ''); setSource(f.source ?? 'all'); setStatus(f.status ?? 'all')
    setAuditOnly(!!f.auditOnly); setHasReceiptOnly(!!f.hasReceiptOnly)
    setMinAmount(f.minAmount ?? ''); setMaxAmount(f.maxAmount ?? '')
    setVendorOnly(f.vendorOnly ?? ''); setGroupByMonth(!!f.groupByMonth)
  }
  function deletePreset(name: string) {
    const next = presets.filter((p) => p.name !== name)
    setPresets(next); localStorage.setItem(PRESETS_KEY, JSON.stringify(next))
  }

  // Group rows by month if toggled
  const visibleRows = filtered.slice(0, 1000)
  const groupedRows = useMemo(() => {
    if (!groupByMonth) return null
    const groups = new Map<string, Row[]>()
    for (const r of visibleRows) {
      const m = r.date.slice(0, 7)
      if (!groups.has(m)) groups.set(m, [])
      groups.get(m)!.push(r)
    }
    return [...groups.entries()].sort((a, b) => sortDir === 'desc' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]))
  }, [groupByMonth, visibleRows, sortDir])

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-none mx-auto">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold">All transactions</h1>
            <div className="text-xs text-white/40">Filter · tag · audit · play</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{fmt(stats.sum)}</div>
            <div className="text-xs text-white/40">{stats.count} rows visible{selected.size ? ` · ${selected.size} selected` : ''}</div>
          </div>
        </div>

        {toast && <div className="mb-3 px-3 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded text-sm">{toast}</div>}

        {/* Stats strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-2">By project (filtered set)</div>
            <div className="flex flex-wrap gap-1">
              {stats.byProject.slice(0, 12).map(([code, s]) => {
                const lbl = code === 'UNTAGGED' ? 'UNTAGGED' : (projects.find(p => p.code === code)?.name || code)
                return (
                  <button key={code} onClick={() => setProjectFilter(code === 'UNTAGGED' ? 'UNTAGGED' : code)}
                    title={code}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${projectColor(code)} ${projectFilter === code ? 'ring-1 ring-white/50' : ''}`}>
                    <span className="font-mono opacity-60">{code === 'UNTAGGED' ? '—' : code}</span> {lbl} · {s.count} · {fmt(s.sum)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-2">By source</div>
            <div className="flex flex-wrap gap-1">
              {stats.bySource.map(([src, s]) => (
                <button key={src} onClick={() => setSource(src)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${SOURCE_COLOR[src] || 'border-white/10 hover:border-white/30'} ${source === src ? 'ring-1 ring-white/50' : ''}`}>
                  {src} · {s.count} · {fmt(s.sum)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <div>
              <label className="text-xs text-white/40 block mb-1">Project</label>
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm">
                <option value="all">all ({projects.reduce((a, p) => a + p.count, 0)})</option>
                <option value="UNTAGGED">UNTAGGED ({projects.find(p => p.code === null)?.count || 0})</option>
                {projects.filter(p => p.code).map(p => <option key={p.code} value={p.code!}>{projectLabel(p)} ({p.count})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Since</label>
              <input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Bank account</label>
              <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} className={`w-full bg-black border rounded px-2 py-1 text-sm ${accountFilter === 'act-only' ? 'border-emerald-500/40 text-emerald-200' : accountFilter === 'all' ? 'border-amber-500/40 text-amber-200' : 'border-white/20'}`}>
                <option value="act-only">ACT only (Visa + Everyday) ✓</option>
                <option value="all">all accounts (incl. NM Personal)</option>
                {availableAccounts.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 block mb-1">Search vendor / desc / code</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. kennedy, fuel, ACT-HV" className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm">
                <option value="all">all</option>
                <option value="bill">bill</option>
                <option value="spend">spend</option>
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
            <div className="flex items-end gap-2">
              <button onClick={exportCsv} className="text-xs px-2 py-1 border border-white/20 rounded hover:bg-white/10 w-full">CSV</button>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <div>
              <label className="text-xs text-white/40 block mb-1">Min $</label>
              <input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Max $</label>
              <input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="∞" className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
            </div>
            <label className="text-xs flex items-end gap-1 cursor-pointer pb-1">
              <input type="checkbox" checked={auditOnly} onChange={(e) => setAuditOnly(e.target.checked)} /> Audit-flagged
            </label>
            <label className="text-xs flex items-end gap-1 cursor-pointer pb-1">
              <input type="checkbox" checked={hasReceiptOnly} onChange={(e) => setHasReceiptOnly(e.target.checked)} /> Has receipt
            </label>
            <label className="text-xs flex items-end gap-1 cursor-pointer pb-1">
              <input type="checkbox" checked={groupByMonth} onChange={(e) => setGroupByMonth(e.target.checked)} /> Group by month
            </label>
            {vendorOnly && (
              <button onClick={() => setVendorOnly('')} className="text-xs px-2 py-1 border border-red-500/50 text-red-300 rounded">clear vendor</button>
            )}
          </div>

          {/* Presets row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <span className="text-xs text-white/40">Presets:</span>
            {presets.map((p) => (
              <span key={p.name} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-white/20">
                <button onClick={() => loadPreset(p)} className="hover:underline">{p.name}</button>
                <button onClick={() => deletePreset(p.name)} className="text-red-300 hover:text-red-200">×</button>
              </span>
            ))}
            <button onClick={savePreset} className="text-xs px-2 py-0.5 rounded border border-white/20 hover:bg-white/10">+ save current</button>
          </div>

          {vendorTops.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-white/40 mr-1">top vendors:</span>
              {vendorTops.map(([v, t]) => (
                <button key={v} onClick={() => setVendorOnly(vendorOnly === v ? '' : v)}
                  className={`text-xs px-2 py-0.5 rounded border ${vendorOnly === v ? 'bg-white/20 border-white/50' : 'border-white/10 hover:border-white/30'}`}>
                  {v} · {fmt(t)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reality-check strip — org-wide, click any tile to drill in */}
        {reality && !reality.error && (
          <div className="bg-white/5 border border-white/15 rounded-lg p-3 mb-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Volume</div>
              <div className="text-xl font-bold text-white tabular-nums">{reality.totalDeduped.toLocaleString()}</div>
              <div className="text-[10px] text-white/40">{reality.billsCount} bills + {reality.spendsRaw - reality.matchedPairs} unmatched spends</div>
              <div className="text-[10px] text-white/30">{reality.matchedPairs} bill↔spend pairs deduped</div>
            </div>
            <button
              onClick={() => { setProjectFilter('UNTAGGED'); setSelected(new Set()) }}
              className={`text-center rounded p-1 transition-colors ${reality.taggedPct >= 95 ? 'hover:bg-emerald-500/10' : 'hover:bg-amber-500/10'}`}
              title="Click to filter to UNTAGGED rows"
            >
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Tagged</div>
              <div className={`text-xl font-bold tabular-nums ${reality.taggedPct >= 95 ? 'text-emerald-300' : reality.taggedPct >= 80 ? 'text-amber-300' : 'text-red-300'}`}>{reality.taggedPct}%</div>
              <div className="text-[10px] text-white/40">{reality.tagged.toLocaleString()} of {reality.totalDeduped.toLocaleString()}</div>
              <div className="text-[10px] text-white/30">{reality.untagged.toLocaleString()} need tags →</div>
            </button>
            <Link
              href="/finance/reconciliation"
              className={`text-center rounded p-1 transition-colors block ${reality.receiptedPct >= 95 ? 'hover:bg-emerald-500/10' : 'hover:bg-amber-500/10'}`}
              title="Open reconciliation — match bank lines to receipts"
            >
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Receipted</div>
              <div className={`text-xl font-bold tabular-nums ${reality.receiptedPct >= 95 ? 'text-emerald-300' : reality.receiptedPct >= 80 ? 'text-amber-300' : 'text-red-300'}`}>{reality.receiptedPct}%</div>
              <div className="text-[10px] text-white/40">{reality.receipted.toLocaleString()} of {(reality.receiptableTotal ?? reality.totalDeduped).toLocaleString()}</div>
              <div className="text-[10px] text-white/30">{reality.unreceipted.toLocaleString()} missing → · {reality.noReceiptNeeded ?? 0} excluded (transfers/ATO)</div>
            </Link>
            <Link
              href="/finance/audit"
              className={`text-center rounded p-1 transition-colors block ${(reality.duplicates + reality.mismatches) === 0 ? 'hover:bg-emerald-500/10' : 'hover:bg-red-500/10'}`}
              title="Open audit — duplicates and project-tag mismatches"
            >
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Audit issues</div>
              <div className={`text-xl font-bold tabular-nums ${(reality.duplicates + reality.mismatches) === 0 ? 'text-emerald-300' : 'text-red-300'}`}>{reality.duplicates + reality.mismatches}</div>
              <div className="text-[10px] text-white/40">{reality.duplicates} dups · {reality.mismatches} mismatch</div>
              <div className="text-[10px] text-white/30">go to audit →</div>
            </Link>
          </div>
        )}
        {realityLoading && !reality && <div className="bg-white/5 border border-white/15 rounded-lg p-3 mb-3 text-center text-xs text-white/40">Loading reality check…</div>}

        {/* Auto-suggest + paint-bucket + batch-OCR toolbar */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 mb-3 flex flex-wrap items-center gap-3">
          <span className="text-xs text-emerald-200/70 uppercase tracking-wider">Quick tagger</span>
          {(() => {
            const eligible = filtered.filter(r => {
              if (r.projectCode) return false
              const s = ruleSuggest({ contact: r.contact, date: r.date, description: r.description })
              return s && (s.tier === 'A' || s.tier === 'B')
            }).length
            return (
              <button
                onClick={applyAllTierAB}
                disabled={bulkBusy || eligible === 0}
                title="Apply every Tier A (Dext line desc) and Tier B (vendor whitelist) suggestion to currently-visible untagged rows"
                className="text-sm px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded hover:bg-emerald-500/30 disabled:opacity-40">
                ✓ Apply {eligible} Tier A+B suggestions
              </button>
            )
          })()}

          <span className="text-white/20">·</span>

          <label className={`flex items-center gap-1 text-sm ${paintMode ? 'text-amber-200' : 'text-white/70'}`}>
            <input type="checkbox" checked={paintMode} onChange={e => setPaintMode(e.target.checked)} />
            🎨 Paint-bucket mode
          </label>
          {paintMode && (
            <select value={paintProject} onChange={e => setPaintProject(e.target.value)}
              className="bg-black border border-amber-500/40 text-amber-200 rounded px-2 py-1 text-sm">
              <option value="">Pick active project…</option>
              <option value="UNTAGGED">UNTAGGED</option>
              {projects.filter(p => p.code).map(p => <option key={p.code} value={p.code!}>{projectLabel(p)}</option>)}
            </select>
          )}

          <span className="text-white/20">·</span>

          <button
            onClick={batchOcrVisible}
            disabled={batchOcrBusy}
            title="OCR every visible row with an attachment (skips already-OCR’d). ~$0.0003 per receipt."
            className="text-sm px-3 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-200 rounded hover:bg-purple-500/30 disabled:opacity-40">
            {batchOcrBusy ? `📎 OCR ${batchOcrProgress.done}/${batchOcrProgress.total}…` : '📎 Batch OCR visible'}
          </button>
        </div>

        {paintMode && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-2 mb-3 text-amber-200 text-sm">
            🎨 <strong>Paint mode ON</strong> — clicking any row's vendor name will tag it as <code>{paintProject || '(pick a project)'}</code>. Turn off the toggle above to return to normal click behavior.
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/40 rounded-lg p-3 mb-3 flex items-center gap-3">
            <span className="text-sm">{selected.size} selected</span>
            <select value={bulkProject} onChange={(e) => setBulkProject(e.target.value)} className="bg-black border border-white/20 rounded px-2 py-1 text-sm">
              <option value="">Pick project…</option>
              <option value="UNTAGGED">UNTAGGED</option>
              {projects.filter(p => p.code).map(p => <option key={p.code} value={p.code!}>{projectLabel(p)}</option>)}
            </select>
            <button disabled={!bulkProject || bulkBusy} onClick={bulkRetag} className="text-sm px-3 py-1 bg-blue-500/30 border border-blue-500/60 rounded hover:bg-blue-500/40 disabled:opacity-40">
              {bulkBusy ? 'Saving…' : `Re-tag ${selected.size} → ${bulkProject || '…'}`}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-sm px-2 py-1 border border-white/20 rounded hover:bg-white/10">clear</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          {loading ? <div className="p-6 text-white/40">Loading…</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/10 text-white/60 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="px-2 py-2 w-8"><input type="checkbox" checked={selected.size > 0 && selected.size === Math.min(filtered.length, 1000)} onChange={toggleAllVisible} /></th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('date')}>Date {sortField === 'date' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('source')}>Src</th>
                    <th className="text-left px-3 py-2">Account</th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('contact')}>Vendor</th>
                    <th className="text-right px-3 py-2 cursor-pointer" onClick={() => toggleSort('total')}>$ {sortField === 'total' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('status')}>Status</th>
                    <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('projectCode')}>Project</th>
                    <th className="text-center px-3 py-2">📎</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-left px-3 py-2">Audit</th>
                    <th className="text-left px-3 py-2">Xero</th>
                  </tr>
                </thead>
                <tbody>
                  {!groupedRows && visibleRows.map((r, i) => (
                    <TxnRow key={`${r.source}-${r.id}`} r={r} i={i} selected={selected.has(r.id)} expanded={expanded.has(r.id)}
                      onToggle={() => toggleRow(r.id)} onExpand={() => { const n = new Set(expanded); n.has(r.id) ? n.delete(r.id) : n.add(r.id); setExpanded(n) }}
                      onRetag={(code) => retag(r, code)} projects={projects} savingId={savingId} suggestions={suggestions}
                      onVendorClick={() => openVendorSidebar(r.contact)}
                      ocrBusy={ocrBusy.has(r.id)} onOcr={() => runOcr(r)}
                      noteDraft={noteDraft[r.id]} setNoteDraft={(v: string) => setNoteDraft((s) => ({ ...s, [r.id]: v }))}
                      onSaveNote={(v: string) => saveNote(r, v)}
                      paintMode={paintMode} paintProject={paintProject} onPaint={() => paintRow(r)} />
                  ))}
                  {groupedRows && groupedRows.map(([month, monthRows]) => (
                    <MonthGroup key={month} month={month} rows={monthRows} selected={selected} expanded={expanded}
                      onToggle={toggleRow} onExpand={(id) => { const n = new Set(expanded); n.has(id) ? n.delete(id) : n.add(id); setExpanded(n) }}
                      onRetag={retag} projects={projects} savingId={savingId} suggestions={suggestions}
                      onVendorClick={(v) => openVendorSidebar(v)}
                      ocrBusy={ocrBusy} onOcr={runOcr}
                      noteDraft={noteDraft} setNoteDraft={(id: string, v: string) => setNoteDraft((s) => ({ ...s, [id]: v }))}
                      onSaveNote={saveNote}
                      paintMode={paintMode} paintProject={paintProject} onPaint={paintRow} />
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="p-6 text-center text-white/40">No rows match filters.</div>}
              {filtered.length > 1000 && <div className="p-3 text-center text-xs text-amber-400">Showing first 1,000 of {filtered.length} — narrow filters or use CSV export.</div>}
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-white/40 flex justify-between">
          <span>Re-tag writes Supabase mirror only — Xero stays untouched until a push step. Audit notes are heuristics from the 2026-05-17 review.</span>
          <span><Link href="/finance/projects/ACT-HV/transactions" className="underline">→ project-scoped view</Link></span>
        </div>
      </div>

      {openVendor && (
        <VendorSidebar
          vendor={openVendor}
          data={vendorData}
          loading={vendorLoading}
          onClose={() => { setOpenVendor(null); setVendorData(null) }}
          projects={projects}
          onBulkTag={bulkTagVendor}
          onOpenVendor={openVendorSidebar}
        />
      )}
    </div>
  )
}

function TxnRow({ r, i, selected, expanded, onToggle, onExpand, onRetag, projects, savingId, suggestions, onVendorClick, ocrBusy, onOcr, noteDraft, setNoteDraft, onSaveNote, paintMode, paintProject, onPaint }: {
  r: Row; i: number; selected: boolean; expanded: boolean;
  onToggle: () => void; onExpand: () => void; onRetag: (c: string | null) => void;
  projects: ProjectOpt[]; savingId: string | null; suggestions: Record<string, Suggestion>;
  onVendorClick: () => void;
  ocrBusy: boolean; onOcr: () => void;
  noteDraft: string | undefined; setNoteDraft: (v: string) => void; onSaveNote: (v: string) => void;
  paintMode?: boolean; paintProject?: string; onPaint?: () => void;
}) {
  const sug = !r.projectCode ? suggestions[r.contact.toLowerCase()] : null
  const tierSug = !r.projectCode ? ruleSuggest({ contact: r.contact, date: r.date, description: r.description }) : null
  const note = auditNote(r)
  const rowBg = paintMode && !r.projectCode ? 'bg-amber-500/5 hover:bg-amber-500/15' : note.startsWith('⚠') ? 'bg-amber-500/5' : note.startsWith('★') ? 'bg-emerald-500/5' : note.startsWith('?') ? 'bg-yellow-500/5' : selected ? 'bg-blue-500/10' : i % 2 ? 'bg-white/[0.02]' : ''
  const noteValue = noteDraft !== undefined ? noteDraft : (r.note || '')

  const tierChipColor: Record<string, string> = {
    A: 'bg-emerald-500/30 border-emerald-500/60 text-emerald-100',
    'A*': 'bg-amber-500/30 border-amber-500/60 text-amber-100',
    B: 'bg-blue-500/30 border-blue-500/60 text-blue-100',
    C: 'bg-purple-500/30 border-purple-500/60 text-purple-100',
    D: 'bg-fuchsia-500/30 border-fuchsia-500/60 text-fuchsia-100',
  }
  return (
    <>
      <tr className={`border-t border-white/5 ${rowBg}`}>
        <td className="px-2 py-1.5"><input type="checkbox" checked={selected} onChange={onToggle} /></td>
        <td className="px-3 py-1.5 whitespace-nowrap text-white/80 cursor-pointer" onClick={onExpand}>{r.date}</td>
        <td className="px-3 py-1.5 text-white/50">
          {r.source === 'bill' ? chip('bill', 'bg-blue-500/20 text-blue-200')
            : r.source === 'spend' ? chip('spnd', 'bg-purple-500/20 text-purple-200')
            : r.source === 'receive' ? chip('recv', 'bg-emerald-500/20 text-emerald-200')
            : chip(r.source, 'bg-white/10 text-white/60')}
        </td>
        <td className="px-3 py-1.5">
          {r.bankAccount ? (
            r.bankAccount === 'NAB Visa ACT #8815' ? chip('Visa #8815', 'bg-emerald-500/20 text-emerald-200')
              : r.bankAccount === 'NJ Marchesi T/as ACT Everyday' ? chip('ACT Everyday', 'bg-emerald-500/20 text-emerald-200')
              : r.bankAccount === 'NM Personal ' ? chip('NM Personal ⚠', 'bg-amber-500/20 text-amber-200')
              : chip(r.bankAccount.slice(0, 18), 'bg-white/10 text-white/60')
          ) : <span className="text-white/30 text-xs">—</span>}
        </td>
        <td className="px-3 py-1.5 text-white cursor-pointer hover:underline" onClick={paintMode && !r.projectCode && paintProject ? onPaint : onVendorClick}
          title={paintMode && !r.projectCode && paintProject ? `🎨 Click to tag this row as ${paintProject}` : 'Click to open vendor sidebar'}>
          {r.contact}
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums text-white/90">{fmt(r.total)}</td>
        <td className="px-3 py-1.5 text-white/50">
          {r.status === 'PAID' ? chip('PAID', 'bg-emerald-500/20 text-emerald-200')
            : r.status === 'AUTHORISED' ? chip('AUTH', 'bg-amber-500/20 text-amber-200')
            : chip(r.status, 'bg-white/10 text-white/60')}
        </td>
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1">
            <select value={r.projectCode || ''} disabled={savingId === r.id} onChange={(e) => onRetag(e.target.value || null)}
              title={r.projectCode ? projectLabel(projects.find(p => p.code === r.projectCode)) : 'UNTAGGED'}
              className={`bg-black border rounded px-1 py-0.5 text-xs max-w-[200px] ${r.projectCode ? 'border-white/30 text-white' : 'border-red-500/50 text-red-300'}`}>
              <option value="">UNTAGGED</option>
              {projects.filter(p => p.code).map(p => <option key={p.code} value={p.code!}>{projectLabel(p)}</option>)}
            </select>
            {tierSug && tierSug.code !== 'MANUAL' && (
              <button onClick={() => onRetag(tierSug.code)}
                title={`Tier ${tierSug.tier} (${tierSug.confidence}): ${tierSug.reason}`}
                className={`text-[10px] px-1 py-0.5 border rounded ${tierChipColor[tierSug.tier] || 'bg-white/10 border-white/30 text-white'}`}>
                {tierSug.tier} → {tierSug.code}
              </button>
            )}
            {tierSug && tierSug.code === 'MANUAL' && (
              <span title={tierSug.reason}
                className="text-[10px] px-1 py-0.5 bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200 rounded cursor-help">
                D · manual
              </span>
            )}
            {sug && !tierSug && (() => {
              const sugName = projects.find(p => p.code === sug.project_code)?.name
              return (
                <button onClick={() => onRetag(sug.project_code)}
                  title={`Vendor history: ${sug.confidence}% → ${sugName ? `${sugName} (${sug.project_code})` : sug.project_code}`}
                  className="text-[10px] px-1 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded hover:bg-emerald-500/30">
                  → {sugName || sug.project_code} ({sug.confidence}%)
                </button>
              )
            })()}
          </div>
        </td>
        <td className="px-3 py-1.5 text-center">
          {r.hasAttachments ? (
            <button onClick={onOcr} disabled={ocrBusy} title="OCR the Xero attachment" className="text-xs px-1.5 py-0.5 rounded border border-white/20 hover:bg-white/10 disabled:opacity-40">
              {ocrBusy ? '…' : '📎'}
            </button>
          ) : <span className="text-white/20 text-xs">—</span>}
        </td>
        <td className="px-3 py-1.5 text-white/70 max-w-[300px] truncate cursor-pointer" title={r.description} onClick={onExpand}>{r.description}</td>
        <td className="px-3 py-1.5 text-white/80 max-w-[200px] text-xs">{note}</td>
        <td className="px-3 py-1.5"><a href={r.xeroLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">↗</a></td>
      </tr>
      {(expanded || r.note || noteDraft !== undefined) && (
        <tr className="border-t border-white/5 bg-white/[0.03]">
          <td colSpan={12} className="px-6 py-3 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <div className="text-white/40 mb-1">Full description</div>
                <div className="text-white/80 whitespace-pre-wrap">{r.description || '(empty)'}</div>
              </div>
              <div>
                <div className="text-white/40 mb-1">Note</div>
                <textarea
                  value={noteValue}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onBlur={() => onSaveNote(noteValue)}
                  placeholder="Add a quick note (e.g. why this is tagged here, what to verify…)"
                  className="w-full bg-black border border-white/20 rounded px-2 py-1 text-xs h-16"
                />
                <div className="text-white/30 mt-1 text-[10px]">Saves on blur. Mirrored to Supabase line_items[0]._note.</div>
              </div>
              <div>
                <div className="text-white/40 mb-1">IDs</div>
                <div className="text-white/60 font-mono text-[10px] break-all">{r.source}<br/>sb: {r.id}<br/>xero: {r.xeroId}</div>
                <div className="text-white/40 mt-2 mb-1">Project source</div>
                <div className="text-white/60">{r.projectSource || 'unset'}</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function MonthGroup({ month, rows, selected, expanded, onToggle, onExpand, onRetag, projects, savingId, suggestions, onVendorClick, ocrBusy, onOcr, noteDraft, setNoteDraft, onSaveNote, paintMode, paintProject, onPaint }: {
  month: string; rows: Row[]; selected: Set<string>; expanded: Set<string>;
  onToggle: (id: string) => void; onExpand: (id: string) => void;
  onRetag: (r: Row, code: string | null) => void; projects: ProjectOpt[]; savingId: string | null;
  suggestions: Record<string, Suggestion>; onVendorClick: (v: string) => void;
  ocrBusy: Set<string>; onOcr: (r: Row) => void;
  noteDraft: Record<string, string>; setNoteDraft: (id: string, v: string) => void;
  onSaveNote: (r: Row, v: string) => void;
  paintMode?: boolean; paintProject?: string; onPaint?: (r: Row) => void;
}) {
  const sum = rows.reduce((a, r) => a + r.total, 0)
  return (
    <>
      <tr className="bg-white/10 border-t-2 border-white/20">
        <td colSpan={5} className="px-3 py-2 font-semibold text-white">{month} · {rows.length} rows</td>
        <td className="px-3 py-2 text-right tabular-nums font-semibold text-white">{fmt(sum)}</td>
        <td colSpan={6}></td>
      </tr>
      {rows.map((r, i) => (
        <TxnRow key={`${r.source}-${r.id}`} r={r} i={i} selected={selected.has(r.id)} expanded={expanded.has(r.id)}
          onToggle={() => onToggle(r.id)} onExpand={() => onExpand(r.id)} onRetag={(c) => onRetag(r, c)}
          projects={projects} savingId={savingId} suggestions={suggestions} onVendorClick={() => onVendorClick(r.contact)}
          ocrBusy={ocrBusy.has(r.id)} onOcr={() => onOcr(r)}
          noteDraft={noteDraft[r.id]} setNoteDraft={(v: string) => setNoteDraft(r.id, v)} onSaveNote={(v: string) => onSaveNote(r, v)}
          paintMode={paintMode} paintProject={paintProject} onPaint={() => onPaint?.(r)} />
      ))}
    </>
  )
}

function VendorSidebar({ vendor, data, loading, onClose, projects, onBulkTag, onOpenVendor }: {
  vendor: string; data: any; loading: boolean; onClose: () => void;
  projects: ProjectOpt[]; onBulkTag: (project: string) => void; onOpenVendor: (v: string) => void;
}) {
  const [bulkChoice, setBulkChoice] = useState<string>('')
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl h-full bg-zinc-950 border-l border-white/20 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-950 border-b border-white/10 p-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold">{vendor}</h2>
            {data && <div className="text-xs text-white/40">{data.totalCount} txns · {fmt(data.totalSum)} total · {data.untaggedCount} untagged</div>}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>
        <div className="p-4">
          {loading && <div className="text-white/40 text-sm">Loading…</div>}
          {data && !loading && (
            <>
              {data.suggested && (
                <div className="bg-emerald-500/10 border border-emerald-500/40 rounded p-3 mb-4">
                  <div className="text-xs text-emerald-200/70 mb-1">Suggested project (vendor history)</div>
                  <div className="text-emerald-200 text-base font-semibold">
                    {projectLabel(projects.find(p => p.code === data.suggested.projectCode)) || data.suggested.projectCode}
                    <span className="text-xs ml-2">{data.suggested.confidence}% of {data.totalCount}</span>
                  </div>
                </div>
              )}
              <div className="mb-4">
                <div className="text-xs text-white/40 mb-2">Project distribution</div>
                <div className="space-y-1">
                  {data.projectDistribution.map((p: any) => {
                    const lbl = p.code === 'UNTAGGED' ? 'UNTAGGED' : (projectLabel(projects.find(x => x.code === p.code)) || p.code)
                    return (
                      <div key={p.code} className="flex justify-between text-sm">
                        <span className={p.code === 'UNTAGGED' ? 'text-red-300' : 'text-white/80'} title={p.code}>{lbl}</span>
                        <span className="text-white/60 tabular-nums">{p.count} · {fmt(p.sum)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              {data.untaggedCount > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/40 rounded p-3 mb-4">
                  <div className="text-xs text-blue-200/70 mb-2">Bulk-tag {data.untaggedCount} UNTAGGED rows for {vendor}</div>
                  <div className="flex gap-2 items-center">
                    <select value={bulkChoice} onChange={(e) => setBulkChoice(e.target.value)} className="bg-black border border-white/20 rounded px-2 py-1 text-sm flex-1">
                      <option value="">Pick project…</option>
                      {data.suggested && (
                        <option value={data.suggested.projectCode}>
                          → {projectLabel(projects.find(p => p.code === data.suggested.projectCode)) || data.suggested.projectCode} (suggested)
                        </option>
                      )}
                      {projects.filter(p => p.code).map(p => <option key={p.code} value={p.code!}>{projectLabel(p)}</option>)}
                    </select>
                    <button disabled={!bulkChoice} onClick={() => onBulkTag(bulkChoice)}
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
                    <div key={`${r.source}-${r.id}`} className={`flex justify-between gap-2 px-2 py-1 rounded ${r.projectCode ? 'bg-white/[0.03]' : 'bg-red-500/10 border border-red-500/30'}`}>
                      <span className="text-white/60">{r.date}</span>
                      <span className="text-white/40">{r.source}</span>
                      <span className="tabular-nums text-white/80 text-right flex-1">{fmt(r.total)}</span>
                      <span className="text-white/60 w-16">{r.projectCode || 'UNTAGGED'}</span>
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
