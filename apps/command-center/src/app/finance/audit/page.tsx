'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Alert = { severity: 'high' | 'medium' | 'info'; title: string; detail: string; amount?: number; projectCode?: string | null; xeroLink?: string }
type ProjectStat = { code: string; name?: string | null; status?: string | null; tier?: string | null; count: number; sum: number }
type ReviewRow = {
  code: string
  name: string | null
  status: string | null
  tier: string | null
  count: number
  sum: number
  lastActivity: string | null
  activityDaysAgo: number | null
  recommendation: 'keep' | 'review' | 'archive-candidate' | 'unknown-code'
  reason: string
}

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toFixed(2)}`
}

type ReviewFilter = 'all' | 'archive-candidate' | 'review' | 'unknown-code' | 'keep'

const VALID_FILTERS: ReviewFilter[] = ['all', 'archive-candidate', 'review', 'unknown-code', 'keep']

export default function FinanceAuditPage() {
  const searchParams = useSearchParams()
  const filterParam = searchParams?.get('filter') as ReviewFilter | null
  const initialFilter: ReviewFilter = filterParam && VALID_FILTERS.includes(filterParam) ? filterParam : 'all'

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accountFilter, setAccountFilter] = useState('act-only')
  const [since, setSince] = useState('2025-07-01')

  function load() {
    setLoading(true)
    const sp = new URLSearchParams({ accounts: accountFilter, since })
    fetch(`/api/finance/audit?${sp.toString()}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }
  useEffect(load, [accountFilter, since])

  const alerts = data?.auditAlerts || []
  const findings = data?.notableFindings || []
  const ocr = data?.ocrFindings || []

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold">All-projects spend audit</h1>
            <div className="text-xs text-white/40">Cross-project view · ACT-only by default · audit alerts, notable findings, real spend totals</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{loading ? '…' : fmt(data?.totalSpend || 0)}</div>
            <div className="text-xs text-white/40">{data?.rowCount || 0} expense rows total</div>
          </div>
        </div>

        {/* Top filters */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-white/40 block mb-1">Bank account scope</label>
            <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} className={`w-full bg-black border rounded px-2 py-1 text-sm ${accountFilter === 'act-only' ? 'border-emerald-500/40 text-emerald-200' : 'border-amber-500/40 text-amber-200'}`}>
              <option value="act-only">ACT only (Visa + Everyday) ✓</option>
              <option value="all">all accounts (incl. NM Personal)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Since</label>
            <input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="w-full bg-black border border-white/20 rounded px-2 py-1 text-sm" />
          </div>
          <div className="col-span-2 flex items-end gap-2 text-xs">
            <Link href="/finance/transactions" className="px-3 py-1 border border-white/20 rounded hover:bg-white/10">→ transactions explorer</Link>
            <Link href="/finance/vendors" className="px-3 py-1 border border-white/20 rounded hover:bg-white/10">→ vendors</Link>
            <Link href="/finance/projects" className="px-3 py-1 border border-white/20 rounded hover:bg-white/10">→ projects index</Link>
          </div>
        </div>

        {loading && <div className="text-white/40 text-center py-8">Loading audit…</div>}

        {!loading && data && (
          <>
            {/* Stats strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40 mb-2">By project</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {data.byProject.map((p: ProjectStat) => (
                    <Link key={p.code} href={p.code === 'UNTAGGED' ? '/finance/transactions?project=UNTAGGED' : `/finance/projects/${p.code}`}
                      className="flex justify-between text-sm hover:bg-white/5 px-2 py-0.5 rounded" title={p.code}>
                      <span className={p.code === 'UNTAGGED' ? 'text-red-300' : 'text-white/80'}>{p.name || p.code}</span>
                      <span className="text-white/60 tabular-nums">{p.count} · {fmt(p.sum)}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40 mb-2">By bank account</div>
                <div className="space-y-1">
                  {data.byBank.map((b: any) => (
                    <div key={b.bank} className="flex justify-between text-sm">
                      <span className={b.bank.includes('ACT') ? 'text-emerald-200' : b.bank.includes('NM Personal') ? 'text-amber-200' : 'text-white/80'}>{b.bank}</span>
                      <span className="text-white/60 tabular-nums">{b.count} · {fmt(b.sum)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40 mb-2">By source</div>
                <div className="space-y-1">
                  {data.bySource.map((s: any) => (
                    <div key={s.source} className="flex justify-between text-sm">
                      <span className="text-white/80">{s.source}</span>
                      <span className="text-white/60 tabular-nums">{s.count} · {fmt(s.sum)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* DUPLICATES — definite + probable, one-click Xero open */}
            {(data.definiteDuplicates?.length > 0 || data.probableDuplicates?.length > 0) && (
              <DuplicatesPanel
                definite={data.definiteDuplicates || []}
                probable={data.probableDuplicates || []}
                summary={data.dupSummary}
              />
            )}

            {/* Notable findings */}
            {findings.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm uppercase text-white/40 mb-2">Notable findings</h2>
                <div className="space-y-2">
                  {findings.map((f: Alert, i: number) => (
                    <div key={i} className="border border-emerald-500/30 bg-emerald-500/5 rounded p-3 flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-emerald-200">{f.title}</div>
                        <div className="text-xs text-white/60 mt-0.5">{f.detail}</div>
                        {f.projectCode && <Link href={`/finance/projects/${f.projectCode}`} className="text-xs text-blue-400 hover:underline mt-1 inline-block">→ {f.projectCode}</Link>}
                      </div>
                      {f.amount != null && <div className="text-sm font-bold tabular-nums text-emerald-200 whitespace-nowrap">{fmt(f.amount)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit alerts */}
            {alerts.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm uppercase text-white/40 mb-2">Audit alerts ({alerts.length})</h2>
                <div className="space-y-2">
                  {alerts.map((a: Alert, i: number) => (
                    <div key={i} className={`border rounded p-3 flex items-start justify-between ${a.severity === 'high' ? 'border-red-500/40 bg-red-500/5' : a.severity === 'medium' ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/20 bg-white/5'}`}>
                      <div className="flex-1">
                        <div className={`text-sm font-semibold ${a.severity === 'high' ? 'text-red-200' : a.severity === 'medium' ? 'text-amber-200' : 'text-white/80'}`}>{a.title}</div>
                        <div className="text-xs text-white/60 mt-0.5">{a.detail}</div>
                        <div className="flex gap-3 mt-1">
                          {a.projectCode && <Link href={`/finance/projects/${a.projectCode}`} className="text-xs text-blue-400 hover:underline">→ {a.projectCode}</Link>}
                          {a.xeroLink && <a href={a.xeroLink} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">open in Xero ↗</a>}
                        </div>
                      </div>
                      {a.amount != null && <div className="text-sm font-bold tabular-nums whitespace-nowrap ml-3">{fmt(a.amount)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OCR findings */}
            {ocr.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm uppercase text-white/40 mb-2">OCR-discovered line items ({ocr.length})</h2>
                <div className="bg-white/5 border border-white/10 rounded p-3 space-y-1 text-xs">
                  {ocr.map((o: any, i: number) => (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="text-white/60 w-20">{o.date}</span>
                      <span className="text-white/80 w-32">{o.contact}</span>
                      <span className="text-white/70 flex-1 truncate">{o.summary}</span>
                      <span className="text-white/60 w-16">{o.projectCode || 'UNTAGGED'}</span>
                      <a href={o.xeroLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">↗</a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project review — every code seen + every canonical, with archive recs */}
            {data.projectReview?.length > 0 && (
              <ProjectReviewPanel review={data.projectReview as ReviewRow[]} counts={data.reviewCounts} initialFilter={initialFilter} />
            )}

            {/* Top vendors */}
            {data.topVendors?.length > 0 && (
              <div>
                <h2 className="text-sm uppercase text-white/40 mb-2">Top vendors</h2>
                <div className="bg-white/5 border border-white/10 rounded p-3 space-y-1 text-sm">
                  {data.topVendors.map((v: any) => (
                    <div key={v.contact} className="flex justify-between">
                      <Link href={`/finance/vendors`} className="text-white/80 hover:underline">{v.contact}</Link>
                      <span className="text-white/60 tabular-nums">{v.count} · {fmt(v.total)}</span>
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

type DupRow = { xeroId: string; status: string; reference: string | null; source: 'bill' | 'spend' | 'spend-overpay'; xeroLink: string }
type DupGroup = {
  vendor: string
  amount: number
  date: string
  projectCode: string | null
  confidence: 'definite' | 'probable'
  reason: string
  rows: DupRow[]
  extraDollars: number
}

function DuplicatesPanel({ definite, probable, summary }: { definite: DupGroup[]; probable: DupGroup[]; summary: any }) {
  const [showProbable, setShowProbable] = useState(true)

  function renderGroup(g: DupGroup, key: string) {
    return (
      <div key={key} className={`border rounded p-3 ${g.confidence === 'definite' ? 'border-red-500/50 bg-red-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">
              {g.confidence === 'definite' ? '🔴' : '🟡'} {g.vendor}
              <span className="ml-2 text-xs text-white/50">{g.date}</span>
              {g.projectCode && <Link href={`/finance/projects/${g.projectCode}`} className="ml-2 text-xs text-blue-400 hover:underline">{g.projectCode}</Link>}
            </div>
            <div className="text-xs text-white/60 mt-0.5">{g.reason}</div>
          </div>
          <div className="text-right whitespace-nowrap">
            <div className="text-base font-bold tabular-nums text-white">{fmt(g.amount)} × {g.rows.length}</div>
            <div className="text-[10px] text-white/40">overage: {fmt(g.extraDollars)}</div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {g.rows.map((r, i) => (
            <a key={i} href={r.xeroLink} target="_blank" rel="noreferrer"
              className={`text-xs px-2 py-1 rounded border hover:bg-white/10 ${r.status === 'PAID' ? 'border-emerald-500/40 text-emerald-200' : r.status === 'AUTHORISED' ? 'border-amber-500/40 text-amber-200' : 'border-white/30 text-white/70'}`}>
              {r.status} · {r.source} · {r.reference?.slice(0, 32) || r.xeroId.slice(0, 8)} ↗
            </a>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <h2 className="text-sm uppercase text-white/40 mb-2">
        Duplicates worth voiding
        <span className="ml-2 text-red-300/80">{summary?.definiteCount || 0} definite · {fmt(summary?.definiteDollars || 0)}</span>
        <span className="ml-2 text-amber-300/80">{summary?.probableCount || 0} probable · {fmt(summary?.probableDollars || 0)}</span>
      </h2>

      {definite.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-red-300/70 uppercase tracking-wider mb-1">Definite (same Dext import ID)</div>
          <div className="space-y-2">
            {definite.map((g, i) => renderGroup(g, `def-${i}`))}
          </div>
        </div>
      )}

      {probable.length > 0 && (
        <div>
          <div className="text-xs text-amber-300/70 uppercase tracking-wider mb-1 flex items-center gap-2">
            Probable (same vendor + amount + date)
            <button onClick={() => setShowProbable(!showProbable)} className="text-[10px] px-1.5 py-0.5 border border-white/20 rounded hover:bg-white/10">
              {showProbable ? 'hide' : `show ${probable.length}`}
            </button>
          </div>
          {showProbable && (
            <div className="space-y-2">
              {probable.map((g, i) => renderGroup(g, `prob-${i}`))}
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] text-white/40 mt-2">
        Click any chip to open the row in Xero. For PAID + AUTHORISED pairs, void the AUTHORISED one. For both-PAID, verify before voiding. After voiding, refresh — the alert clears once the bill no longer shows.
      </div>
    </div>
  )
}

function ProjectReviewPanel({ review, counts, initialFilter = 'all' }: { review: ReviewRow[]; counts: any; initialFilter?: ReviewFilter }) {
  const [showAll, setShowAll] = useState(initialFilter !== 'all')
  const [filter, setFilter] = useState<ReviewFilter>(initialFilter)

  const filtered = filter === 'all' ? review : review.filter(r => r.recommendation === filter)
  const display = showAll ? filtered : filtered.slice(0, 20)

  function badgeFor(rec: ReviewRow['recommendation']) {
    if (rec === 'keep') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">keep</span>
    if (rec === 'archive-candidate') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">archive</span>
    if (rec === 'unknown-code') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">unknown</span>
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">review</span>
  }

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm uppercase text-white/40">
          Project review · {counts?.total ?? review.length} codes
          <span className="ml-2 text-emerald-300/60">{counts?.keep ?? 0} keep</span>
          <span className="ml-2 text-amber-300/60">{counts?.review ?? 0} review</span>
          <span className="ml-2 text-red-300/60">{counts?.archiveCandidate ?? 0} archive-candidate</span>
          {(counts?.unknownCode ?? 0) > 0 && <span className="ml-2 text-fuchsia-300/60">{counts.unknownCode} unknown</span>}
        </h2>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="bg-black border border-white/20 rounded px-2 py-0.5 text-xs">
            <option value="all">all</option>
            <option value="archive-candidate">archive-candidate</option>
            <option value="review">review</option>
            <option value="unknown-code">unknown-code</option>
            <option value="keep">keep</option>
          </select>
          {filtered.length > 20 && (
            <button onClick={() => setShowAll(!showAll)} className="text-xs px-2 py-0.5 border border-white/20 rounded hover:bg-white/10">
              {showAll ? `show top 20` : `show all ${filtered.length}`}
            </button>
          )}
        </div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/40 text-xs">
            <tr>
              <th className="text-left px-3 py-2">Code</th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Tier</th>
              <th className="text-right px-3 py-2">Spend</th>
              <th className="text-right px-3 py-2">Rows</th>
              <th className="text-left px-3 py-2">Last activity</th>
              <th className="text-left px-3 py-2">Rec</th>
              <th className="text-left px-3 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {display.map((r) => (
              <tr key={r.code} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-3 py-1.5 font-mono text-xs text-white/80">
                  <Link href={`/finance/projects/${r.code}`} className="hover:underline">{r.code}</Link>
                </td>
                <td className="px-3 py-1.5 text-white/80">{r.name || <span className="text-fuchsia-400 italic">— not in projects table</span>}</td>
                <td className="px-3 py-1.5 text-xs text-white/60">{r.status || '—'}</td>
                <td className="px-3 py-1.5 text-xs text-white/60">{r.tier || '—'}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{r.sum > 0 ? fmt(r.sum) : <span className="text-white/30">—</span>}</td>
                <td className="px-3 py-1.5 text-right text-white/60 tabular-nums">{r.count}</td>
                <td className="px-3 py-1.5 text-xs text-white/60">{r.lastActivity || <span className="text-white/30">never</span>}{r.activityDaysAgo != null && <span className="ml-1 text-white/30">({r.activityDaysAgo}d)</span>}</td>
                <td className="px-3 py-1.5">{badgeFor(r.recommendation)}</td>
                <td className="px-3 py-1.5 text-xs text-white/50 max-w-[280px]">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-white/40 mt-2">
        Source: <code>projects</code> table joined with <code>xero_invoices</code> + <code>xero_transactions</code> spend since the chosen date.
        Archive-candidate = already <code>archived</code>/<code>transferred</code>/<code>sunsetting</code> AND inactive in the window. Unknown = code appears in Xero but not in our projects table.
      </div>
    </div>
  )
}
