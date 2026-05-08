'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'

interface Project {
  code: string
  name: string
  spend: number
  rd_spend: number
  earned: number
  grant: number
  revenue: number
  invoice_count: number
}

interface Invoice {
  xero_id: string
  invoice_number: string | null
  contact_name: string | null
  date: string
  status: string
  total: number
  project_code: string
  leaf_code: string
  income_kind: string
  attribution_source: string
  attribution_variant: string
  override_note?: string | null
  tags?: string[]
}

const AVAILABLE_TAGS = ['art', 'event', 'research', 'travel', 'hardware', 'retreat']

const PROJECT_CODE_OPTIONS: Array<[string, string]> = [
  ['ACT-IN', 'ACT-IN — ACT Infrastructure'],
  ['ACT-FM', 'ACT-FM — The Farm'],
  ['ACT-HV', 'ACT-HV — The Harvest Witta'],
  ['ACT-GD', 'ACT-GD — Goods'],
  ['ACT-EL', 'ACT-EL — Empathy Ledger'],
  ['ACT-JH', 'ACT-JH — JusticeHub'],
  ['ACT-MY', 'ACT-MY — Mounty Yarns'],
  ['ACT-BG', 'ACT-BG — BG Fit'],
  ['ACT-CB', 'ACT-CB — Marriage Celebrant'],
  ['ACT-ER', 'ACT-ER — PICC Elders Room'],
  ['ACT-FG', 'ACT-FG — Feel Good Project'],
  ['ACT-JP', "ACT-JP — June's Patch"],
  ['ACT-PI', 'ACT-PI — PICC'],
  ['ACT-PS', 'ACT-PS — PICC Photo Studio'],
  ['ACT-TR', 'ACT-TR — Treacher'],
  ['ACT-TW', "ACT-TW — Travelling Women's Car"],
  ['ACT-UA', 'ACT-UA — Uncle Allan Palm Island Art'],
  ['ACT-WE', 'ACT-WE — Westpac Summit 2025'],
  ['ACT-TN', 'ACT-TN — TOMNET'],
  ['ACT-10', 'ACT-10 — 10x10 Retreat'],
  ['ACT-OO', 'ACT-OO — Oonchiumpa'],
  ['ACT-BB', 'ACT-BB — Barkly Backbone'],
  ['ACT-BM', 'ACT-BM — Bimberi'],
  ['ACT-BR', 'ACT-BR — ACT Bali Retreat'],
  ['ACT-BV', 'ACT-BV — Black Cockatoo Valley'],
  ['ACT-CA', 'ACT-CA — Caring for those who care'],
  ['ACT-CF', 'ACT-CF — The Confessional'],
  ['ACT-CN', 'ACT-CN — Contained'],
  ['ACT-DG', 'ACT-DG — Diagrama'],
  ['ACT-DL', 'ACT-DL — DadLab'],
  ['ACT-DO', 'ACT-DO — Designing for Obsolescence'],
  ['ACT-FA', 'ACT-FA — Festival Activations'],
  ['ACT-FO', 'ACT-FO — Fishers Oysters'],
  ['ACT-FP', 'ACT-FP — Fairfax PLACE Tech'],
  ['ACT-GL', 'ACT-GL — Global Laundry Alliance'],
  ['ACT-GP', 'ACT-GP — Gold Phone'],
  ['ACT-HS', 'ACT-HS — Project Her-Self'],
  ['ACT-MC', 'ACT-MC — Cars and Microcontrollers'],
  ['ACT-MD', 'ACT-MD — ACT Monthly Dinners'],
  ['ACT-MM', 'ACT-MM — MMEIC Justice'],
  ['ACT-MR', 'ACT-MR — MingaMinga Rangers'],
  ['ACT-RA', 'ACT-RA — Regional Arts Fellowship'],
  ['ACT-SM', 'ACT-SM — SMART'],
  ['ACT-SS', 'ACT-SS — Storm Stories'],
  ['UNATTRIBUTED', '⚠️  UNATTRIBUTED (pick one above)'],
]
const PROJECT_CODES = PROJECT_CODE_OPTIONS.map(([c]) => c)

interface Totals { spend: number; rd_spend: number; earned: number; grant: number; revenue: number }

type SortKey = 'spend' | 'revenue' | 'earned' | 'grant' | 'net' | 'self_reliance' | 'earned_only'

export default function SelfReliancePage() {
  const [data, setData] = useState<{
    totals: Totals; projects: Project[]; invoices: Invoice[];
    commentary: Record<string, string>;
    unattributed_count: number; unattributed_total: number;
    generated_at?: string;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [filter, setFilter] = useState('')
  const [showUnattributedOnly, setShowUnattributedOnly] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ project_code: string; income_kind: string; note: string; tags: string[] }>({ project_code: '', income_kind: 'earned', note: '', tags: [] })
  const [tagFilter, setTagFilter] = useState<string>('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [kindFilter, setKindFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [invSortKey, setInvSortKey] = useState<'date' | 'invoice_number' | 'contact_name' | 'total' | 'project_code' | 'income_kind' | 'attribution_source' | 'status'>('date')
  const [invSortDir, setInvSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleInvSort = (k: typeof invSortKey) => {
    if (invSortKey === k) setInvSortDir(invSortDir === 'asc' ? 'desc' : 'asc')
    else { setInvSortKey(k); setInvSortDir(k === 'total' || k === 'date' ? 'desc' : 'asc') }
  }
  const [commentaryDraft, setCommentaryDraft] = useState<Record<string, string>>({})
  const [openCommentary, setOpenCommentary] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/finance/self-reliance')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const saveInvoice = async (xero_id: string) => {
    if (!editForm.project_code || editForm.project_code === 'UNATTRIBUTED') {
      alert('Pick a project code before saving (not UNATTRIBUTED).')
      return
    }
    try {
      const res = await fetch('/api/finance/self-reliance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice_override', xero_invoice_id: xero_id, ...editForm }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'unknown' }))
        alert(`Save failed: ${err.error || res.status}`)
        return
      }
      setEditingInvoice(null)
      load()
    } catch (e) {
      alert(`Save error: ${(e as Error).message}`)
    }
  }

  const clearOverride = async (xero_id: string) => {
    await fetch('/api/finance/self-reliance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clear_override', xero_invoice_id: xero_id }),
    })
    load()
  }

  const saveCommentary = async (project_code: string) => {
    const text = commentaryDraft[project_code] ?? data?.commentary[project_code] ?? ''
    await fetch('/api/finance/self-reliance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'commentary', project_code, commentary: text }),
    })
    setCommentaryDraft((d) => { const n = { ...d }; delete n[project_code]; return n })
    load()
  }

  const projectsSorted = useMemo(() => {
    if (!data?.projects) return []
    const arr = [...data.projects]
    arr.sort((a, b) => {
      if (sortKey === 'spend') return b.spend - a.spend
      if (sortKey === 'revenue') return b.revenue - a.revenue
      if (sortKey === 'earned') return b.earned - a.earned
      if (sortKey === 'grant') return b.grant - a.grant
      if (sortKey === 'net') return (b.revenue - b.spend) - (a.revenue - a.spend)
      if (sortKey === 'self_reliance') {
        const ra = a.spend > 0 ? a.revenue / a.spend : -1
        const rb = b.spend > 0 ? b.revenue / b.spend : -1
        return rb - ra
      }
      if (sortKey === 'earned_only') {
        const ra = a.spend > 0 ? a.earned / a.spend : -1
        const rb = b.spend > 0 ? b.earned / b.spend : -1
        return rb - ra
      }
      return 0
    })
    return arr
  }, [data, sortKey])

  const invoicesFiltered = useMemo(() => {
    if (!data?.invoices) return []
    const needle = filter.toLowerCase().trim()
    const filtered = data.invoices.filter((i) => {
      if (showUnattributedOnly && i.project_code !== 'UNATTRIBUTED') return false
      if (tagFilter && !(i.tags || []).includes(tagFilter)) return false
      if (projectFilter && i.project_code !== projectFilter) return false
      if (kindFilter && i.income_kind !== kindFilter) return false
      if (statusFilter && i.status !== statusFilter) return false
      if (sourceFilter && i.attribution_source !== sourceFilter) return false
      if (needle) {
        return (
          (i.contact_name || '').toLowerCase().includes(needle) ||
          (i.invoice_number || '').toLowerCase().includes(needle) ||
          i.project_code.toLowerCase().includes(needle) ||
          i.income_kind.toLowerCase().includes(needle)
        )
      }
      return true
    })
    // Sort
    filtered.sort((a, b) => {
      let cmp = 0
      if (invSortKey === 'total') cmp = (Number(a.total) || 0) - (Number(b.total) || 0)
      else {
        const av = ((a as unknown as Record<string, unknown>)[invSortKey] || '') as string
        const bv = ((b as unknown as Record<string, unknown>)[invSortKey] || '') as string
        cmp = av < bv ? -1 : av > bv ? 1 : 0
      }
      return invSortDir === 'asc' ? cmp : -cmp
    })
    return filtered
  }, [data, filter, showUnattributedOnly, tagFilter, projectFilter, kindFilter, statusFilter, sourceFilter, invSortKey, invSortDir])

  if (loading) return <div style={wrap}><p>Loading…</p></div>
  if (!data) return <div style={wrap}><p>No data.</p></div>

  const t = data.totals
  const earnedOnlyRatio = t.spend > 0 ? t.earned / t.spend : 0
  const fullRatio = t.spend > 0 ? t.revenue / t.spend : 0

  return (
    <div style={wrap}>
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Self-reliance — FY26 YTD</h1>
        <p style={{ color: '#555', margin: '8px 0 0', fontSize: 14 }}>
          🔒 Private. Reads from <code>xero_invoices</code> (ACCREC) + <code>bank_statement_lines</code>. Attribution: tracking category first, contact-name fallback. Last: {new Date(data.generated_at || Date.now()).toLocaleString()}.
        </p>
      </div>

      {/* Headline numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
        <Card label="Total spend" value={fmt(t.spend)} sub={`R&D ${fmt(t.rd_spend)}`} />
        <Card label="Total revenue" value={fmt(t.revenue)} sub={`${data.projects.length} projects`} />
        <Card label="Earned" value={fmt(t.earned)} sub={pct(t.earned, t.revenue) + ' of revenue'} tone="green" />
        <Card label="Grants" value={fmt(t.grant)} sub={pct(t.grant, t.revenue) + ' of revenue'} tone="amber" />
        <Card label="Self-reliance" value={(fullRatio * 100).toFixed(0) + '%'} sub={`Earned-only: ${(earnedOnlyRatio * 100).toFixed(0)}%`} tone={fullRatio >= 1 ? 'green' : 'red'} />
      </div>

      {/* Projects table */}
      <h2 style={{ fontSize: 20, marginTop: 16, marginBottom: 12 }}>By project</h2>
      <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
        Sort: {(['spend','revenue','earned','grant','net','self_reliance','earned_only'] as SortKey[]).map((k) => (
          <button key={k} onClick={() => setSortKey(k)} style={sortBtn(sortKey === k)}>{k.replace('_', ' ')}</button>
        ))}
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 32 }}>
        <table style={table}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={th}>Code</th>
              <th style={th}>Project</th>
              <th style={thR}>Spend</th>
              <th style={thR}>R&D</th>
              <th style={thR}>Earned</th>
              <th style={thR}>Grants</th>
              <th style={thR}>Revenue</th>
              <th style={thR}>Net</th>
              <th style={thR}>SR%</th>
              <th style={thR}>Earned-only%</th>
              <th style={thR}># inv</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {projectsSorted.map((p) => {
              const net = p.revenue - p.spend
              const sr = p.spend > 0 ? (p.revenue / p.spend) * 100 : null
              const eo = p.spend > 0 ? (p.earned / p.spend) * 100 : null
              const savedComm = data?.commentary?.[p.code] || ''
              const draftComm = commentaryDraft[p.code]
              const activeComm = draftComm ?? savedComm
              const isOpen = openCommentary === p.code
              const hasNote = !!savedComm
              return (
                <Fragment key={p.code}>
                  <tr style={{ borderBottom: isOpen ? 'none' : '1px solid #eee' }}>
                    <td style={{ ...td, fontFamily: 'monospace', fontWeight: 600 }}>{p.code}</td>
                    <td style={td}>{p.name}</td>
                    <td style={tdR}>{fmt(p.spend)}</td>
                    <td style={{ ...tdR, color: '#6366f1' }}>{fmt(p.rd_spend)}</td>
                    <td style={{ ...tdR, color: '#059669', fontWeight: 500 }}>{fmt(p.earned)}</td>
                    <td style={{ ...tdR, color: '#d97706' }}>{fmt(p.grant)}</td>
                    <td style={tdR}>{fmt(p.revenue)}</td>
                    <td style={{ ...tdR, color: net >= 0 ? '#059669' : '#dc2626', fontWeight: 500 }}>{fmt(net)}</td>
                    <td style={tdR}>{sr === null ? '—' : sr.toFixed(0) + '%'}</td>
                    <td style={tdR}>{eo === null ? '—' : eo.toFixed(0) + '%'}</td>
                    <td style={tdR}>{p.invoice_count}</td>
                    <td style={td}>
                      <button onClick={() => setOpenCommentary(isOpen ? null : p.code)} style={{ padding: '2px 8px', background: hasNote ? '#fef3c7' : '#f3f4f6', border: '1px solid #ddd', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}>
                        {hasNote ? '📝 note' : '+ note'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr style={{ borderBottom: '1px solid #eee', background: '#fffbeb' }}>
                      <td colSpan={12} style={{ padding: 12 }}>
                        <textarea
                          value={activeComm}
                          onChange={(e) => setCommentaryDraft((d) => ({ ...d, [p.code]: e.target.value }))}
                          placeholder={`Commentary on ${p.code} — context, decisions, why the numbers are what they are…`}
                          style={{ width: '100%', minHeight: 80, padding: 8, fontFamily: 'system-ui', fontSize: 13, border: '1px solid #ddd', borderRadius: 4, color: '#111', background: 'white' }}
                        />
                        <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                          <button onClick={() => saveCommentary(p.code)} style={{ padding: '4px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}>Save note</button>
                          <button onClick={() => { setOpenCommentary(null); setCommentaryDraft((d) => { const n = { ...d }; delete n[p.code]; return n }) }} style={{ padding: '4px 12px', background: '#f3f4f6', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Full invoice list */}
      <h2 style={{ fontSize: 20, marginTop: 24, marginBottom: 12 }}>
        All incoming invoices ({invoicesFiltered.length} / {data.invoices.length})
        {data.unattributed_count > 0 && <span style={{ color: '#d97706', fontSize: 14, marginLeft: 12 }}>· {data.unattributed_count} unattributed ({fmt(data.unattributed_total)})</span>}
      </h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
        <input
          type="text" placeholder="Filter by contact, invoice #, project, earned/grant…"
          value={filter} onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
        />
        <label style={{ fontSize: 13, color: '#555' }}>
          <input type="checkbox" checked={showUnattributedOnly} onChange={(e) => setShowUnattributedOnly(e.target.checked)} style={{ marginRight: 6 }} />
          Unattributed only
        </label>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#666' }}>Tag:</span>
          <button onClick={() => setTagFilter('')} style={{ padding: '4px 10px', fontSize: 11, background: tagFilter === '' ? '#111' : '#f3f4f6', color: tagFilter === '' ? 'white' : '#111', border: 'none', borderRadius: 12, cursor: 'pointer' }}>all</button>
          {AVAILABLE_TAGS.map((t) => (
            <button key={t} onClick={() => setTagFilter(tagFilter === t ? '' : t)}
              style={{ padding: '4px 10px', fontSize: 11, background: tagFilter === t ? '#111' : '#f3f4f6', color: tagFilter === t ? 'white' : '#111', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#666' }}>Filter:</span>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={smallSel}>
          <option value="">All projects</option>
          {PROJECT_CODE_OPTIONS.map(([c, label]) => <option key={c} value={c}>{label}</option>)}
        </select>
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} style={smallSel}>
          <option value="">All kinds</option>
          <option value="earned">earned</option>
          <option value="grant">grant</option>
          <option value="other">other</option>
          <option value="unknown">unknown</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={smallSel}>
          <option value="">All statuses</option>
          <option value="PAID">PAID</option>
          <option value="AUTHORISED">AUTHORISED</option>
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={smallSel}>
          <option value="">All sources</option>
          <option value="tracking">tracking</option>
          <option value="contact">contact</option>
          <option value="override">override</option>
          <option value="none">none (unattributed)</option>
        </select>
        <button onClick={() => { setProjectFilter(''); setKindFilter(''); setStatusFilter(''); setSourceFilter(''); setTagFilter(''); setFilter(''); setShowUnattributedOnly(false) }} style={{ padding: '4px 10px', fontSize: 11, background: '#f3f4f6', border: '1px solid #ddd', borderRadius: 3, cursor: 'pointer' }}>Clear</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={table}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <SortHeader label="Date" k="date" curK={invSortKey} dir={invSortDir} onClick={toggleInvSort} />
              <SortHeader label="Invoice #" k="invoice_number" curK={invSortKey} dir={invSortDir} onClick={toggleInvSort} />
              <SortHeader label="Contact" k="contact_name" curK={invSortKey} dir={invSortDir} onClick={toggleInvSort} />
              <SortHeader label="Amount" k="total" curK={invSortKey} dir={invSortDir} onClick={toggleInvSort} align="right" />
              <SortHeader label="Project" k="project_code" curK={invSortKey} dir={invSortDir} onClick={toggleInvSort} />
              <SortHeader label="Kind" k="income_kind" curK={invSortKey} dir={invSortDir} onClick={toggleInvSort} />
              <SortHeader label="Source" k="attribution_source" curK={invSortKey} dir={invSortDir} onClick={toggleInvSort} />
              <SortHeader label="Status" k="status" curK={invSortKey} dir={invSortDir} onClick={toggleInvSort} />
              <th style={th}>Fix</th>
            </tr>
          </thead>
          <tbody>
            {invoicesFiltered.map((i) => {
              const editing = editingInvoice === i.xero_id
              const isOverride = i.attribution_source === 'override'
              return (
                <Fragment key={i.xero_id}>
                  <tr style={{ borderBottom: editing ? 'none' : '1px solid #eee', background: isOverride ? '#ecfdf5' : undefined }}>
                    <td style={td}>{i.date}</td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{i.invoice_number || '—'}</td>
                    <td style={td}>{i.contact_name || '—'}</td>
                    <td style={{ ...tdR, fontWeight: 500 }}>{fmt(i.total)}</td>
                    <td style={{ ...td, fontFamily: 'monospace', color: i.project_code === 'UNATTRIBUTED' ? '#dc2626' : '#111' }}>
                      {i.project_code}
                      {i.leaf_code !== i.project_code && <span style={{ color: '#999' }}> ←{i.leaf_code}</span>}
                      {i.tags && i.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                          {i.tags.map((t) => <span key={t} style={{ padding: '1px 6px', fontSize: 10, background: '#e0e7ff', color: '#1e40af', borderRadius: 8 }}>{t}</span>)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, color: i.income_kind === 'grant' ? '#d97706' : i.income_kind === 'earned' ? '#059669' : '#999' }}>{i.income_kind}</td>
                    <td style={{ ...td, fontSize: 11, color: '#666' }}>{i.attribution_source}{i.attribution_variant ? `: ${i.attribution_variant.slice(0, 30)}` : ''}</td>
                    <td style={td}>{i.status}</td>
                    <td style={td}>
                      {editing ? (
                        <button onClick={() => setEditingInvoice(null)} style={btnGrey}>Cancel</button>
                      ) : (
                        <button
                          onClick={() => { setEditingInvoice(i.xero_id); setEditForm({ project_code: i.project_code, income_kind: i.income_kind || 'earned', note: i.override_note || '', tags: i.tags || [] }) }}
                          style={btnGrey}
                        >✏️</button>
                      )}
                      {isOverride && !editing && (
                        <button onClick={() => clearOverride(i.xero_id)} style={{ ...btnGrey, marginLeft: 4, color: '#dc2626' }} title="Clear override (revert to auto-attribution)">↺</button>
                      )}
                    </td>
                  </tr>
                  {editing && (
                    <tr style={{ borderBottom: '1px solid #eee', background: '#eff6ff' }}>
                      <td colSpan={9} style={{ padding: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 11, color: '#555', minWidth: 280 }}>Project
                            <select value={editForm.project_code} onChange={(e) => setEditForm({ ...editForm, project_code: e.target.value })} style={{ ...selStyle, width: '100%' }}>
                              {PROJECT_CODE_OPTIONS.map(([c, label]) => <option key={c} value={c}>{label}</option>)}
                            </select>
                          </label>
                          <label style={{ fontSize: 11, color: '#555' }}>Kind
                            <select value={editForm.income_kind} onChange={(e) => setEditForm({ ...editForm, income_kind: e.target.value })} style={selStyle}>
                              <option value="earned">earned</option>
                              <option value="grant">grant</option>
                              <option value="other">other</option>
                            </select>
                          </label>
                          <label style={{ fontSize: 11, color: '#555', flex: 1, minWidth: 240 }}>Note (why this attribution)
                            <input type="text" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} style={{ ...selStyle, width: '100%' }} placeholder="e.g. Centre build work for ACT-PI"/>
                          </label>
                          <div style={{ fontSize: 11, color: '#555', width: '100%' }}>Tags
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                              {AVAILABLE_TAGS.map((t) => {
                                const on = editForm.tags.includes(t)
                                return (
                                  <button key={t} type="button" onClick={() => setEditForm({ ...editForm, tags: on ? editForm.tags.filter((x) => x !== t) : [...editForm.tags, t] })}
                                    style={{ padding: '4px 10px', fontSize: 11, background: on ? '#111' : '#f3f4f6', color: on ? 'white' : '#111', border: '1px solid ' + (on ? '#111' : '#ddd'), borderRadius: 12, cursor: 'pointer' }}>
                                    {on ? '✓ ' : '+ '}{t}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          <button onClick={() => saveInvoice(i.xero_id)} style={{ padding: '6px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 13 }}>Save override</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function fmt(n: number) {
  return (Number(n) || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function pct(n: number, d: number) {
  if (!d) return '—'
  return (n / d * 100).toFixed(0) + '%'
}

const wrap: React.CSSProperties = { padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1600, margin: '0 auto', background: 'white', color: '#111', minHeight: '100vh' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13, background: 'white' }
const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: '#555', textAlign: 'left' }
const thR: React.CSSProperties = { ...th, textAlign: 'right' }
const td: React.CSSProperties = { padding: '8px 10px', color: '#111' }
const tdR: React.CSSProperties = { ...td, textAlign: 'right' }
const sortBtn = (active: boolean): React.CSSProperties => ({ marginLeft: 6, padding: '2px 8px', fontSize: 11, background: active ? '#2563eb' : '#f3f4f6', color: active ? 'white' : '#111', border: 'none', borderRadius: 3, cursor: 'pointer' })
const btnGrey: React.CSSProperties = { padding: '2px 8px', fontSize: 11, background: '#f3f4f6', color: '#111', border: '1px solid #ddd', borderRadius: 3, cursor: 'pointer' }
const selStyle: React.CSSProperties = { display: 'block', marginTop: 2, padding: '4px 6px', fontSize: 13, border: '1px solid #ccc', borderRadius: 3, background: 'white', color: '#111', colorScheme: 'light' }
const smallSel: React.CSSProperties = { padding: '4px 8px', fontSize: 12, border: '1px solid #ccc', borderRadius: 3, background: 'white', color: '#111', colorScheme: 'light' }

function SortHeader<K extends string>({ label, k, curK, dir, onClick, align }: { label: string; k: K; curK: string; dir: 'asc' | 'desc'; onClick: (k: K) => void; align?: 'right' }) {
  const active = curK === k
  return (
    <th style={{ ...(align === 'right' ? thR : th), cursor: 'pointer', userSelect: 'none', background: active ? '#e5e7eb' : undefined }} onClick={() => onClick(k)}>
      {label}{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'green' | 'red' | 'amber' }) {
  const toneColor = tone === 'green' ? '#059669' : tone === 'red' ? '#dc2626' : tone === 'amber' ? '#d97706' : '#111'
  return (
    <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: toneColor, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
