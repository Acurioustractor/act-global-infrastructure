'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft, ArrowUpRight, Users, Plus, Flame, Cloud, Sun, Sprout, Snowflake,
  TrendingUp, Clock, DollarSign, AlertCircle, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Band = 'HOT' | 'WARM' | 'STEADY' | 'COOLING' | 'COLD'

interface FunderRow {
  funderName: string
  warmthBand: Band
  warmthScore: number
  nextMove: string
  invoiceCount: number
  paidCount: number
  authorisedCount: number
  grossRevenue: number
  paidRevenue: number
  outstanding: number
  firstInvoice: string
  lastInvoice: string
  daysSinceLast: number
  yearsActive: number
  projects: string[]
  ghl: { paid: number; open: number; pipelines: string[]; verdict: 'MATCH' | 'DRIFT' | 'PROSPECT' | null } | null
  allocationId: string | null
  committedAmount: number | null
  drawnAmount: number | null
  remainingAmount: number | null
  drawnPct: number | null
  allocationStatus: string | null
  grantRef: string | null
  pileTag: string | null
  nextReportDue: string | null
  nextReportName: string | null
}

interface FundersResponse {
  rows: FunderRow[]
  summary: {
    total: number
    byBand: Record<Band, number>
    totalGross: number
    totalOutstanding: number
    totalCommitted: number
    ghl?: { goodsPaidTotal: number; phantomCount: number; phantomPaid: number }
  }
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${Math.round(n)}`
}

const BAND_META: Record<Band, { icon: any; label: string; color: string; bg: string }> = {
  HOT: { icon: Flame, label: 'HOT', color: 'text-red-400', bg: 'bg-red-500/15' },
  WARM: { icon: Cloud, label: 'WARM', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  STEADY: { icon: Sun, label: 'STEADY', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  COOLING: { icon: Sprout, label: 'COOLING', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  COLD: { icon: Snowflake, label: 'COLD', color: 'text-cyan-300', bg: 'bg-cyan-500/10' },
}

export default function FundersPage() {
  const queryClient = useQueryClient()
  const [bandFilter, setBandFilter] = useState<Band | 'ALL'>('ALL')
  const [projectFilter, setProjectFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedFunder, setSelectedFunder] = useState<string | null>(null)
  const [reportFilter, setReportFilter] = useState<'all' | 'due30' | 'due90' | 'overdue'>('all')

  const { data, isLoading } = useQuery<FundersResponse>({
    queryKey: ['finance', 'funders'],
    queryFn: () => fetch('/api/finance/funders').then(r => r.json()),
  })

  const projectOptions = useMemo(() => {
    const set = new Set<string>()
    for (const r of data?.rows || []) for (const p of r.projects || []) if (p) set.add(p)
    return [...set].sort()
  }, [data?.rows])

  const filtered = useMemo(() => {
    if (!data?.rows) return []
    const today = new Date()
    return data.rows.filter(r => {
      if (bandFilter !== 'ALL' && r.warmthBand !== bandFilter) return false
      if (projectFilter !== 'ALL' && !r.projects.includes(projectFilter)) return false
      if (search && !r.funderName.toLowerCase().includes(search.toLowerCase())) return false
      if (reportFilter !== 'all') {
        if (!r.nextReportDue) return false
        const due = new Date(r.nextReportDue)
        const days = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (reportFilter === 'overdue' && days >= 0) return false
        if (reportFilter === 'due30' && (days < 0 || days > 30)) return false
        if (reportFilter === 'due90' && (days < 0 || days > 90)) return false
      }
      return true
    })
  }, [data?.rows, bandFilter, projectFilter, search, reportFilter])

  function daysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null
    return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white/40">Loading funders…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Link href="/finance" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Finance
      </Link>

      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-cyan-400" />
            Funders
          </h1>
          <p className="text-white/50 mt-1">
            {data?.summary.total} funders · {fmt(data?.summary.totalGross || 0)} gross · {fmt(data?.summary.totalOutstanding || 0)} outstanding · {fmt(data?.summary.totalCommitted || 0)} committed
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add funder allocation
          </button>
          <a
            href="https://www.notion.so/367ebcf981cf81fdb2a5ca192253f0a0"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg text-xs bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 inline-flex items-center gap-1.5"
          >
            Funder Reporting Hub <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Band filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setBandFilter('ALL')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs border transition-colors',
            bandFilter === 'ALL' ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-white/50 hover:text-white'
          )}
        >
          All ({data?.summary.total ?? 0})
        </button>
        {(Object.keys(BAND_META) as Band[]).map(b => {
          const meta = BAND_META[b]
          const Icon = meta.icon
          const count = data?.summary.byBand[b] ?? 0
          return (
            <button
              key={b}
              onClick={() => setBandFilter(b)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs border inline-flex items-center gap-1.5 transition-colors',
                bandFilter === b ? `border-white/30 ${meta.bg} ${meta.color}` : 'border-white/10 text-white/50 hover:text-white'
              )}
            >
              <Icon className="h-3 w-3" />
              {meta.label} ({count})
            </button>
          )
        })}
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/30"
          title="Filter funders by project"
        >
          <option value="ALL">All projects</option>
          {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search funder…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
        />
      </div>

      {/* Reports filter — surfaces upcoming reporting deadlines */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="text-white/40 self-center mr-1">Reports:</span>
        {([
          { id: 'all', label: 'All' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'due30', label: 'Due ≤30d' },
          { id: 'due90', label: 'Due ≤90d' },
        ] as const).map(opt => (
          <button
            key={opt.id}
            onClick={() => setReportFilter(opt.id)}
            className={cn(
              'px-3 py-1 rounded-full border transition-colors',
              reportFilter === opt.id ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-white/50 hover:text-white'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Phantom GHL alert — money the CRM claims as paid with no Xero backing */}
      {data?.summary.ghl && data.summary.ghl.phantomPaid > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong>{data.summary.ghl.phantomCount} GHL opportunities marked paid ({fmt(data.summary.ghl.phantomPaid)})</strong> have no matching Xero income — likely phantom or duplicate. GHL Goods &ldquo;paid&rdquo; totals {fmt(data.summary.ghl.goodsPaidTotal)}; the GHL column below flags each funder against Xero truth.
          </span>
        </div>
      )}

      {/* Funder table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-xs uppercase tracking-wide text-white/40">
                <th className="px-4 py-3">Funder</th>
                <th className="px-3 py-3">Band</th>
                <th className="px-3 py-3 text-right">Score</th>
                <th className="px-3 py-3 text-right">Gross</th>
                <th className="px-3 py-3 text-right">Outstanding</th>
                <th className="px-3 py-3 text-right">GHL vs Xero</th>
                <th className="px-3 py-3 text-right">Committed</th>
                <th className="px-3 py-3 text-right">Drawn %</th>
                <th className="px-3 py-3 text-right">Days since</th>
                <th className="px-3 py-3">Next report</th>
                <th className="px-3 py-3">Projects</th>
                <th className="px-3 py-3">Next move</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(r => {
                const meta = BAND_META[r.warmthBand]
                const Icon = meta.icon
                return (
                  <tr
                    key={r.funderName}
                    onClick={() => setSelectedFunder(r.funderName)}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{r.funderName}</td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', meta.bg, meta.color)}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-white/80">{r.warmthScore}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-white">{fmt(r.grossRevenue)}</td>
                    <td className={cn(
                      'px-3 py-3 text-right tabular-nums',
                      r.outstanding > 50000 ? 'text-red-400 font-medium' : r.outstanding > 0 ? 'text-amber-400' : 'text-white/30'
                    )}>{r.outstanding > 0 ? fmt(r.outstanding) : '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-xs">
                      {r.ghl && r.ghl.verdict ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 justify-end',
                            r.ghl.verdict === 'MATCH' ? 'text-emerald-400' :
                            r.ghl.verdict === 'DRIFT' ? 'text-amber-400' :
                            'text-white/40'
                          )}
                          title={`Xero cash ${fmt(r.paidRevenue)} · GHL paid ${fmt(r.ghl.paid)}${r.ghl.open ? ` · GHL open ${fmt(r.ghl.open)}` : ''}\nPipelines: ${r.ghl.pipelines.join(', ') || '—'}`}
                        >
                          {r.ghl.verdict === 'MATCH' ? '🟢' : r.ghl.verdict === 'DRIFT' ? '🟡' : '⚪'}
                          {r.ghl.verdict === 'PROSPECT' ? fmt(r.ghl.open) : fmt(r.ghl.paid)}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-white/80">{r.committedAmount != null ? fmt(r.committedAmount) : <span className="text-white/30">—</span>}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.drawnPct != null ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full',
                                r.drawnPct >= 100 ? 'bg-emerald-500' :
                                r.drawnPct >= 80 ? 'bg-amber-500' :
                                'bg-blue-500'
                              )}
                              style={{ width: `${Math.min(r.drawnPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-white/60 text-xs">{Math.round(r.drawnPct)}%</span>
                        </div>
                      ) : <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-white/60">{r.daysSinceLast}</td>
                    <td className="px-3 py-3 text-xs">
                      {r.nextReportDue ? (() => {
                        const d = daysUntil(r.nextReportDue)
                        const color = d == null ? 'text-white/30' : d < 0 ? 'text-red-400' : d <= 30 ? 'text-amber-400' : d <= 90 ? 'text-emerald-400' : 'text-white/50'
                        return (
                          <div className={color}>
                            <div className="font-medium">{d != null ? (d < 0 ? `${Math.abs(d)}d overdue` : `${d}d`) : '—'}</div>
                            {r.nextReportName && <div className="text-[10px] text-white/40 truncate max-w-[160px]" title={r.nextReportName}>{r.nextReportName}</div>}
                          </div>
                        )
                      })() : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-3 py-3 text-white/60 text-xs">{r.projects.join(', ')}</td>
                    <td className="px-3 py-3 text-white/70 text-xs max-w-[280px] truncate" title={r.nextMove}>{r.nextMove}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit side-panel */}
      {selectedFunder && (
        <FunderEditPanel
          funderName={selectedFunder}
          onClose={() => setSelectedFunder(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'funders'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'funder', selectedFunder] })
          }}
        />
      )}

      {/* Add allocation modal */}
      {showAdd && (
        <AddFunderModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false)
            queryClient.invalidateQueries({ queryKey: ['finance', 'funders'] })
          }}
        />
      )}
    </div>
  )
}

function FunderEditPanel({ funderName, onClose, onSaved }: { funderName: string; onClose: () => void; onSaved: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'funder', funderName],
    queryFn: () => fetch(`/api/finance/funders/${encodeURIComponent(funderName)}`).then(r => r.json()),
  })

  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialise form once data arrives
  useMemo(() => {
    if (data?.allocation && !form) {
      setForm({ ...data.allocation })
    } else if (data && !data.allocation && !form) {
      setForm({
        projectCode: data.summary?.projects?.[0] || '',
        committedAmount: '',
        status: 'proposed',
        grantRef: '',
        periodStart: '',
        periodEnd: '',
        drawdownMethod: '',
        pileTag: '',
        notes: '',
      })
    }
  }, [data, form])

  async function save() {
    if (!data?.allocation) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/funders/${encodeURIComponent(funderName)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          committed_amount: Number(form.committedAmount),
          status: form.status,
          grant_or_contract_ref: form.grantRef,
          period_start: form.periodStart,
          period_end: form.periodEnd,
          drawdown_method: form.drawdownMethod || null,
          pile_tag: form.pileTag || null,
          notes: form.notes,
          project_code: form.projectCode,
          next_report_due: form.nextReportDue || null,
          next_report_name: form.nextReportName || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function createAllocation() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/funders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funder_org_name: funderName,
          project_code: form.projectCode,
          committed_amount: Number(form.committedAmount),
          status: form.status,
          grant_or_contract_ref: form.grantRef,
          period_start: form.periodStart || null,
          period_end: form.periodEnd || null,
          drawdown_method: form.drawdownMethod || null,
          pile_tag: form.pileTag || null,
          notes: form.notes,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Create failed')
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-gray-900 border-l border-white/10 overflow-y-auto z-50 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">{funderName}</h2>
            {data?.warmth && (
              <p className="text-sm text-white/50 mt-1">
                {data.warmth.band} · score {data.warmth.score}/100 · {data.warmth.daysSinceLast}d since last
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
        </div>

        {isLoading || !form ? (
          <div className="text-white/40">Loading…</div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Stat label="Gross invoiced" value={fmt(data.summary.grossRevenue)} />
              <Stat label="Paid" value={fmt(data.summary.paidRevenue)} />
              <Stat label="Outstanding" value={fmt(data.summary.outstanding)} accent={data.summary.outstanding > 0 ? 'amber' : 'neutral'} />
              <Stat label="Invoices" value={`${data.summary.paidCount} paid / ${data.summary.invoiceCount} total`} />
            </div>

            {/* Allocation form */}
            <h3 className="text-sm font-semibold text-white/80 mb-3">{data.allocation ? 'Edit allocation' : 'Create allocation'}</h3>
            <div className="space-y-3">
              <Field label="Project code">
                <input
                  type="text"
                  value={form.projectCode || ''}
                  onChange={e => setForm({ ...form, projectCode: e.target.value.toUpperCase() })}
                  className="form-input"
                  placeholder="ACT-GD"
                />
              </Field>

              <Field label="Committed amount (ex-GST)">
                <input
                  type="number"
                  value={form.committedAmount || ''}
                  onChange={e => setForm({ ...form, committedAmount: e.target.value })}
                  className="form-input tabular-nums"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <select
                    value={form.status || 'proposed'}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="form-input"
                  >
                    <option value="proposed">Proposed</option>
                    <option value="committed">Committed</option>
                    <option value="drawing">Drawing</option>
                    <option value="closed">Closed</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </Field>
                <Field label="Pile tag">
                  <select
                    value={form.pileTag || ''}
                    onChange={e => setForm({ ...form, pileTag: e.target.value })}
                    className="form-input"
                  >
                    <option value="">—</option>
                    <option value="voice">Voice</option>
                    <option value="flow">Flow</option>
                    <option value="ground">Ground</option>
                    <option value="grants">Grants</option>
                  </select>
                </Field>
              </div>

              <Field label="Grant / contract ref">
                <input
                  type="text"
                  value={form.grantRef || ''}
                  onChange={e => setForm({ ...form, grantRef: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Snow Foundation 2024/OC0014"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Period start">
                  <input
                    type="date"
                    value={form.periodStart || ''}
                    onChange={e => setForm({ ...form, periodStart: e.target.value })}
                    className="form-input"
                  />
                </Field>
                <Field label="Period end">
                  <input
                    type="date"
                    value={form.periodEnd || ''}
                    onChange={e => setForm({ ...form, periodEnd: e.target.value })}
                    className="form-input"
                  />
                </Field>
              </div>

              <Field label="Drawdown method">
                <select
                  value={form.drawdownMethod || ''}
                  onChange={e => setForm({ ...form, drawdownMethod: e.target.value })}
                  className="form-input"
                >
                  <option value="">—</option>
                  <option value="invoice">Invoice-based</option>
                  <option value="milestone">Milestone</option>
                  <option value="reimbursement">Reimbursement</option>
                  <option value="grant_lump_sum">Grant lump sum</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Next report due">
                  <input
                    type="date"
                    value={form.nextReportDue || ''}
                    onChange={e => setForm({ ...form, nextReportDue: e.target.value })}
                    className="form-input"
                  />
                </Field>
                <Field label="Next report name">
                  <input
                    type="text"
                    value={form.nextReportName || ''}
                    onChange={e => setForm({ ...form, nextReportName: e.target.value })}
                    className="form-input"
                    placeholder="e.g. FY26 Operational acquittal"
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={form.notes || ''}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={4}
                  className="form-input"
                  placeholder="Context, key contacts, reporting schedule, conversion notes…"
                />
              </Field>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{error}</div>
              )}

              <div className="flex gap-2 pt-2 flex-wrap">
                <button
                  onClick={data.allocation ? save : createAllocation}
                  disabled={saving || !form.projectCode || !form.committedAmount}
                  className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-300 text-sm"
                >
                  {saving ? 'Saving…' : data.allocation ? 'Save changes' : 'Create allocation'}
                </button>
                <a
                  href={`/finance/projects/${form.projectCode}`}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm inline-flex items-center gap-1"
                >
                  Open project <ExternalLink className="h-3 w-3" />
                </a>
                <SyncToNotionButton funderName={funderName} />
              </div>
            </div>

            {/* Add-drawdown inline form */}
            {data.allocation && (
              <AddDrawdownForm
                funderName={funderName}
                invoices={data.invoices}
                onAdded={onSaved}
              />
            )}

            {/* Invoice list */}
            {data.invoices?.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-white/80 mb-3">Invoice history</h3>
                <div className="space-y-1">
                  {data.invoices.map((i: any) => (
                    <div key={i.xeroId} className="flex items-center gap-3 py-2 px-3 bg-white/5 rounded text-xs">
                      <span className="text-white/40 min-w-[80px]">{i.invoiceNumber}</span>
                      <span className="text-white/60 min-w-[90px]">{i.date}</span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px]',
                        i.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' :
                        i.status === 'AUTHORISED' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-white/10 text-white/50'
                      )}>{i.status}</span>
                      <span className="text-white tabular-nums ml-auto">{fmt(i.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drawdown list */}
            {data.drawdowns?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white/80 mb-3">Drawdown ledger</h3>
                <div className="space-y-1">
                  {data.drawdowns.map((d: any) => (
                    <div key={d.id} className="flex items-center gap-3 py-2 px-3 bg-white/5 rounded text-xs">
                      <span className="text-white/60 min-w-[90px]">{d.drawnAt}</span>
                      <span className="text-white/40 text-[10px]">{d.source}</span>
                      <span className="text-white tabular-nums ml-auto">{fmt(d.drawnAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AddFunderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    funder_org_name: '',
    project_code: 'ACT-GD',
    committed_amount: '',
    status: 'proposed',
    grant_or_contract_ref: '',
    period_start: '',
    period_end: '',
    pile_tag: 'grants',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/funders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Create failed')
      onCreated()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-gray-900 border border-white/10 rounded-lg p-6 w-full max-w-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Add funder allocation</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
        </div>

        <div className="space-y-3">
          <Field label="Funder name">
            <input
              type="text"
              value={form.funder_org_name}
              onChange={e => setForm({ ...form, funder_org_name: e.target.value })}
              className="form-input"
              placeholder="e.g. Minderoo Foundation"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project code">
              <input
                type="text"
                value={form.project_code}
                onChange={e => setForm({ ...form, project_code: e.target.value.toUpperCase() })}
                className="form-input"
                placeholder="ACT-GD"
              />
            </Field>
            <Field label="Committed (ex-GST)">
              <input
                type="number"
                value={form.committed_amount}
                onChange={e => setForm({ ...form, committed_amount: e.target.value })}
                className="form-input tabular-nums"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="form-input">
                <option value="proposed">Proposed</option>
                <option value="committed">Committed</option>
                <option value="drawing">Drawing</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
            <Field label="Pile">
              <select value={form.pile_tag} onChange={e => setForm({ ...form, pile_tag: e.target.value })} className="form-input">
                <option value="">—</option>
                <option value="voice">Voice</option>
                <option value="flow">Flow</option>
                <option value="ground">Ground</option>
                <option value="grants">Grants</option>
              </select>
            </Field>
          </div>
          <Field label="Grant / contract ref">
            <input
              type="text"
              value={form.grant_or_contract_ref}
              onChange={e => setForm({ ...form, grant_or_contract_ref: e.target.value })}
              className="form-input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period start">
              <input type="date" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} className="form-input" />
            </Field>
            <Field label="Period end">
              <input type="date" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} className="form-input" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="form-input"
            />
          </Field>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{error}</div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={submit}
              disabled={saving || !form.funder_org_name || !form.project_code || !form.committed_amount}
              className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-300 text-sm"
            >
              {saving ? 'Creating…' : 'Create allocation'}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SyncToNotionButton({ funderName }: { funderName: string }) {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; action?: string; url?: string | null; error?: string } | null>(null)

  async function run(force: boolean) {
    setSyncing(true)
    setResult(null)
    try {
      const res = await fetch(`/api/finance/funders/${encodeURIComponent(funderName)}/sync-notion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const json = await res.json()
      setResult(json)
    } catch (e: any) {
      setResult({ ok: false, error: e.message })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => run(false)}
          disabled={syncing}
          className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 text-amber-300 text-sm inline-flex items-center gap-1"
          title="Create page in Notion if not present, otherwise no-op"
        >
          {syncing ? 'Syncing…' : 'Sync to Notion'}
        </button>
        <button
          onClick={() => run(true)}
          disabled={syncing}
          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white/60 text-xs"
          title="Force-refresh content of existing Notion page"
        >
          ↻ Force refresh
        </button>
      </div>
      {result && (
        <div className={cn(
          'text-[11px] mt-1 px-2 py-1 rounded',
          result.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
        )}>
          {result.ok ? (
            <>
              {result.action === 'created' && '✓ Created new page'}
              {result.action === 'refreshed' && '✓ Refreshed existing page'}
              {result.action === 'already-exists' && '⊙ Page already exists (use Force refresh to update)'}
              {result.url && <> · <a href={result.url} target="_blank" rel="noreferrer" className="underline">open</a></>}
            </>
          ) : (
            <>✗ {result.error}</>
          )}
        </div>
      )}
    </div>
  )
}

function AddDrawdownForm({ funderName, invoices, onAdded }: {
  funderName: string
  invoices: Array<{ xeroId: string; invoiceNumber: string; date: string; total: number; status: string }>
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    drawn_amount: '',
    drawn_at: new Date().toISOString().slice(0, 10),
    xero_invoice_id: '',
    source: 'manual',
    notes: '',
  })

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/funders/${encodeURIComponent(funderName)}/drawdowns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawn_amount: Number(form.drawn_amount),
          drawn_at: form.drawn_at,
          xero_invoice_id: form.xero_invoice_id || null,
          source: form.source,
          notes: form.notes || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Add failed')
      setOpen(false)
      setForm({ drawn_amount: '', drawn_at: new Date().toISOString().slice(0, 10), xero_invoice_id: '', source: 'manual', notes: '' })
      onAdded()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-6">
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-white/60 inline-flex items-center gap-1"
        >
          + Add drawdown record
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80">Add drawdown</h3>
        <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white text-xs">✕</button>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Drawn amount">
            <input
              type="number"
              value={form.drawn_amount}
              onChange={e => setForm({ ...form, drawn_amount: e.target.value })}
              className="form-input tabular-nums"
            />
          </Field>
          <Field label="Drawn at">
            <input
              type="date"
              value={form.drawn_at}
              onChange={e => setForm({ ...form, drawn_at: e.target.value })}
              className="form-input"
            />
          </Field>
        </div>
        <Field label="Linked invoice (optional)">
          <select
            value={form.xero_invoice_id}
            onChange={e => setForm({ ...form, xero_invoice_id: e.target.value })}
            className="form-input"
          >
            <option value="">— no linked invoice —</option>
            {invoices.map(i => (
              <option key={i.xeroId} value={i.xeroId}>
                {i.invoiceNumber} · {i.date} · {i.status} · ${Math.round(i.total).toLocaleString()}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Source">
          <select
            value={form.source}
            onChange={e => setForm({ ...form, source: e.target.value })}
            className="form-input"
          >
            <option value="manual">Manual</option>
            <option value="xero_invoice_auto">Xero invoice (auto)</option>
            <option value="xero_payment_auto">Xero payment (auto)</option>
            <option value="reimbursement">Reimbursement</option>
          </select>
        </Field>
        <Field label="Notes">
          <input
            type="text"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="form-input"
            placeholder="What milestone / phase / batch this represents"
          />
        </Field>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{error}</div>
        )}

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={saving || !form.drawn_amount || !form.drawn_at}
            className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-300 text-sm"
          >
            {saving ? 'Adding…' : 'Add drawdown'}
          </button>
          <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-white/40 mb-1">{label}</span>
      {children}
    </label>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'amber' | 'red' | 'emerald' | 'neutral' }) {
  const colorClass = accent === 'amber' ? 'text-amber-400' : accent === 'red' ? 'text-red-400' : accent === 'emerald' ? 'text-emerald-400' : 'text-white'
  return (
    <div className="bg-white/5 rounded p-3">
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
      <div className={cn('text-lg font-bold tabular-nums', colorClass)}>{value}</div>
    </div>
  )
}
