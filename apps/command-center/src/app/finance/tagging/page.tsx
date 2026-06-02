'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Clock, Flag, Loader2, RotateCcw, Tags } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoverageRow { area: string; n: number; tagged: number; pct: number }
interface Conflict { id: string; name: string | null; oppCode: string; invoiceCode: string; proposed: string; reason?: string }
interface FillItem { id: string; name?: string | null; code: string | null; confidence: number; source: string }
interface FillBucket { auto: FillItem[]; review: FillItem[]; none: FillItem[] }
interface SweepRun {
  run_at: string
  coverage: CoverageRow[]
  conflicts: Conflict[]
  fill: { opps: FillBucket; subs: FillBucket }
}
interface Project { code: string; name: string; tier?: number }
interface SweepResponse { run: SweepRun | null; projects: Project[]; ok: boolean }
interface AppliedItem { kind: 'opp' | 'sub'; id: string; prevCode: string | null; newCode: string }

const LAZY_DEFAULT = 'ACT-CA' // the catch-all that produced most conflicts; invoice always wins over it.

async function fetchSweep(): Promise<SweepResponse> {
  const res = await fetch('/api/finance/tagging-sweep')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load the tagging sweep')
  return data
}

async function applyDecisions(decisions: { kind: 'opp' | 'sub'; id: string; code: string }[]) {
  const res = await fetch('/api/finance/tagging-apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Apply failed')
  return data as { appliedCount: number; opps: number; subs: number; applied: AppliedItem[]; failed: unknown[] }
}

function CoverageBar({ row }: { row: CoverageRow }) {
  const tone = row.pct >= 90 ? 'bg-emerald-400/60' : row.pct >= 70 ? 'bg-cyan-400/60' : 'bg-amber-400/70'
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-xs text-white/70">{row.area}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.min(100, row.pct)}%` }} />
      </div>
      <span className="w-28 shrink-0 text-right text-xs tabular-nums text-white/55">
        <span className="text-white/85">{row.pct}%</span> ({row.tagged}/{row.n})
      </span>
    </div>
  )
}

export default function TaggingCockpitPage() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['finance', 'tagging-sweep'], queryFn: fetchSweep })
  const run = query.data?.run
  const projects = useMemo(() => query.data?.projects ?? [], [query.data?.projects])
  const codeName = useMemo(() => new Map(projects.map((p) => [p.code, p.name])), [projects])

  // ── selection state ────────────────────────────────────────────────────────
  // Conflicts: id -> { include, code }. Lazy ACT-CA default-accept; specific-vs-specific default-keep (flagged).
  const [conflictSel, setConflictSel] = useState<Record<string, { include: boolean; code: string }>>({})
  // Auto-fills are pre-included; excluding removes from the apply set. code = the resolver's proposed code.
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  // Items already written this session (optimistically hidden) + the last batch for Undo.
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [lastBatch, setLastBatch] = useState<AppliedItem[] | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [showNoMatch, setShowNoMatch] = useState(false)

  const conflicts = (run?.conflicts ?? []).filter((c) => !appliedIds.has(c.id))
  const oppAuto = (run?.fill.opps.auto ?? []).filter((i) => i.code && !appliedIds.has(i.id))
  const subAuto = (run?.fill.subs.auto ?? []).filter((i) => i.code && !appliedIds.has(i.id))
  const noMatch = [...(run?.fill.opps.none ?? []), ...(run?.fill.subs.none ?? [])]

  const confState = (c: Conflict) => conflictSel[c.id] ?? { include: c.oppCode === LAZY_DEFAULT, code: c.proposed }
  const isExcluded = (id: string) => excluded.has(id)

  function toggleExclude(id: string, on: boolean) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (on) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Group auto-fills by proposed code for collapsible review.
  function groupByCode(items: FillItem[]) {
    const m = new Map<string, FillItem[]>()
    for (const i of items) m.set(i.code as string, [...(m.get(i.code as string) || []), i])
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }
  const oppGroups = useMemo(() => groupByCode(oppAuto), [oppAuto])
  const subGroups = useMemo(() => groupByCode(subAuto), [subAuto])

  // Build the apply set.
  const decisions = useMemo(() => {
    const out: { kind: 'opp' | 'sub'; id: string; code: string }[] = []
    for (const c of conflicts) {
      const s = confState(c)
      if (s.include && s.code) out.push({ kind: 'opp', id: c.id, code: s.code })
    }
    for (const i of oppAuto) if (!isExcluded(i.id) && i.code) out.push({ kind: 'opp', id: i.id, code: i.code })
    for (const i of subAuto) if (!isExcluded(i.id) && i.code) out.push({ kind: 'sub', id: i.id, code: i.code })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conflicts, oppAuto, subAuto, conflictSel, excluded])

  const applyMut = useMutation({
    mutationFn: applyDecisions,
    onSuccess: (res) => {
      setAppliedIds((prev) => new Set([...prev, ...res.applied.map((a) => a.id)]))
      setLastBatch(res.applied)
    },
  })

  const undoMut = useMutation({
    mutationFn: (batch: AppliedItem[]) =>
      applyDecisions(batch.filter((a) => a.prevCode).map((a) => ({ kind: a.kind, id: a.id, code: a.prevCode as string }))),
    onSuccess: (_res, batch) => {
      setAppliedIds((prev) => {
        const next = new Set(prev)
        for (const a of batch) next.delete(a.id)
        return next
      })
      setLastBatch(null)
    },
  })

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070a] pb-28 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.94))]" />
      <div className="relative mx-auto max-w-[1200px] px-6 py-8">
        <Link href="/finance" className="mb-6 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Finance
        </Link>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/75">
              <Tags className="h-3.5 w-3.5" /> Project-code tagging cockpit
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Retag &amp; reconcile</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
              Review what the shared resolver found, fix conflicts, and save across opportunities + subscriptions in one pass.
              Writes go to our operating DB only (reversible) — the live GHL CRM is untouched.
            </p>
          </div>
          {run && (
            <p className="inline-flex items-center gap-1 text-xs text-white/45">
              <Clock className="h-3 w-3" /> sweep {new Date(run.run_at).toISOString().slice(0, 16).replace('T', ' ')}
            </p>
          )}
        </header>

        {query.isLoading && (
          <div className="mt-10 inline-flex items-center gap-2 text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        )}
        {query.isError && (
          <div className="mt-8 rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">{(query.error as Error).message}</div>
        )}
        {query.isSuccess && !run && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/60">
            No sweep run yet. Run <code className="text-white/80">node scripts/tagging-sweep.mjs</code> to populate this view.
          </div>
        )}

        {run && (
          <>
            {/* Coverage — the "make sense of it all" overview */}
            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold text-white/80">Coverage by area</h2>
              <div className="mt-4 space-y-2">{run.coverage.map((r) => <CoverageBar key={r.area} row={r} />)}</div>
            </section>

            {/* Conflicts */}
            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
                  {conflicts.length > 0 ? <AlertTriangle className="h-4 w-4 text-amber-200" /> : <CheckCircle2 className="h-4 w-4 text-emerald-200" />}
                  Conflicts — opportunity vs its linked invoice ({conflicts.length})
                </h2>
                {conflicts.some((c) => c.oppCode === LAZY_DEFAULT) && (
                  <button
                    onClick={() => setConflictSel((prev) => {
                      const next = { ...prev }
                      for (const c of conflicts) if (c.oppCode === LAZY_DEFAULT) next[c.id] = { include: true, code: c.proposed }
                      return next
                    })}
                    className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[11px] text-emerald-100/85 transition hover:bg-emerald-300/20"
                  >
                    Accept all {conflicts.filter((c) => c.oppCode === LAZY_DEFAULT).length} invoice-wins
                  </button>
                )}
              </div>

              {conflicts.length === 0 ? (
                <p className="mt-3 text-xs text-emerald-200/80">No opp↔invoice conflicts. ✓</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {conflicts.map((c) => {
                    const s = confState(c)
                    const lazy = c.oppCode === LAZY_DEFAULT
                    return (
                      <div key={c.id} className={cn('rounded-2xl border p-3', s.include ? 'border-emerald-300/25 bg-emerald-300/[0.06]' : 'border-white/10 bg-white/[0.03]')}>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={s.include}
                              onChange={(e) => setConflictSel((prev) => ({ ...prev, [c.id]: { include: e.target.checked, code: s.code } }))}
                              className="h-4 w-4 accent-emerald-400"
                            />
                            <span className="text-sm text-white/85">{c.name || '—'}</span>
                          </label>
                          {!lazy && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-100/90">
                              <Flag className="h-3 w-3" /> your call
                            </span>
                          )}
                          <span className="ml-auto inline-flex items-center gap-2 text-xs">
                            <span className="font-mono text-amber-200/90 line-through decoration-amber-300/40">{c.oppCode}</span>
                            <span className="text-white/30">→</span>
                            <select
                              value={s.code}
                              onChange={(e) => setConflictSel((prev) => ({ ...prev, [c.id]: { include: prev[c.id]?.include ?? lazy, code: e.target.value } }))}
                              className="rounded-lg border border-white/15 bg-[#0b1016] px-2 py-1 font-mono text-xs text-emerald-200 focus:border-cyan-300/50 focus:outline-none"
                            >
                              {/* invoice code first (the SoR proposal), then full registry */}
                              <option value={c.invoiceCode}>{c.invoiceCode} (invoice)</option>
                              <option value={c.oppCode}>{c.oppCode} (keep opp)</option>
                              {projects.filter((p) => p.code !== c.invoiceCode && p.code !== c.oppCode).map((p) => (
                                <option key={p.code} value={p.code}>{p.code}</option>
                              ))}
                            </select>
                          </span>
                        </div>
                        <p className="mt-1 pl-6 text-[11px] text-white/40">
                          invoice tagged <span className="font-mono text-white/60">{c.invoiceCode}</span>
                          {codeName.get(c.invoiceCode) ? ` · ${codeName.get(c.invoiceCode)}` : ''} — {c.reason || 'Xero invoice is the money source of truth'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Auto-fill opps */}
            <FillSection
              title="Auto-fill · opportunities"
              subtitle="Currently untagged · high-confidence resolver matches"
              groups={oppGroups}
              kind="opp"
              codeName={codeName}
              excluded={excluded}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              toggleExclude={toggleExclude}
              setExcluded={setExcluded}
            />

            {/* Auto-fill subs */}
            <FillSection
              title="Auto-fill · subscriptions"
              subtitle="Currently untagged · high-confidence resolver matches"
              groups={subGroups}
              kind="sub"
              codeName={codeName}
              excluded={excluded}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              toggleExclude={toggleExclude}
              setExcluded={setExcluded}
            />

            {/* No-match (info) */}
            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <button onClick={() => setShowNoMatch((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold text-white/70">
                <span>No-match — the resolver won&apos;t guess ({noMatch.length})</span>
                {showNoMatch ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <p className="mt-1 text-[11px] text-white/35">Handle these in the per-record tagger; they need a human code, not a guess.</p>
              {showNoMatch && (
                <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto text-xs text-white/55">
                  {noMatch.map((i) => <li key={i.id} className="truncate">· {i.name || i.id}</li>)}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {/* Sticky apply bar */}
      {run && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#070b11]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-6 py-3">
            {applyMut.isSuccess && lastBatch ? (
              <>
                <span className="inline-flex items-center gap-2 text-sm text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" /> Applied {applyMut.data?.appliedCount} ({applyMut.data?.opps} opps · {applyMut.data?.subs} subs)
                </span>
                <span className="text-[11px] text-white/40">Re-run <code className="text-white/60">node scripts/tagging-sweep.mjs</code> to refresh coverage.</span>
                <button
                  onClick={() => undoMut.mutate(lastBatch)}
                  disabled={undoMut.isPending}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                >
                  {undoMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Undo last apply
                </button>
                <button onClick={() => { applyMut.reset(); qc.invalidateQueries({ queryKey: ['finance', 'tagging-sweep'] }) }} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90">Done</button>
              </>
            ) : (
              <>
                <span className="text-sm text-white/70">
                  <span className="font-semibold text-white">{decisions.length}</span> change{decisions.length === 1 ? '' : 's'} staged
                  {applyMut.isError && <span className="ml-3 text-red-300">— {(applyMut.error as Error).message}</span>}
                </span>
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
      )}
    </main>
  )
}

// ── Collapsible auto-fill section, grouped by proposed code ───────────────────
function FillSection({
  title, subtitle, groups, kind, codeName, excluded, openGroups, toggleGroup, toggleExclude, setExcluded,
}: {
  title: string
  subtitle: string
  groups: [string, FillItem[]][]
  kind: 'opp' | 'sub'
  codeName: Map<string, string>
  excluded: Set<string>
  openGroups: Set<string>
  toggleGroup: (key: string) => void
  toggleExclude: (id: string, on: boolean) => void
  setExcluded: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  const total = groups.reduce((s, [, items]) => s + items.length, 0)
  const included = groups.reduce((s, [, items]) => s + items.filter((i) => !excluded.has(i.id)).length, 0)
  if (total === 0) return null

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white/80">{title} — {included}/{total} selected</h2>
          <p className="mt-0.5 text-[11px] text-white/40">{subtitle}</p>
        </div>
        <div className="flex gap-2 text-[11px]">
          <button
            onClick={() => setExcluded((prev) => { const n = new Set(prev); groups.forEach(([, items]) => items.forEach((i) => n.delete(i.id))); return n })}
            className="rounded-full border border-white/15 px-3 py-1 text-white/70 transition hover:bg-white/10"
          >Select all</button>
          <button
            onClick={() => setExcluded((prev) => { const n = new Set(prev); groups.forEach(([, items]) => items.forEach((i) => n.add(i.id))); return n })}
            className="rounded-full border border-white/15 px-3 py-1 text-white/70 transition hover:bg-white/10"
          >Clear</button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {groups.map(([code, items]) => {
          const key = `${kind}:${code}`
          const open = openGroups.has(key)
          const sel = items.filter((i) => !excluded.has(i.id)).length
          const allOn = sel === items.length
          return (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allOn}
                  ref={(el) => { if (el) el.indeterminate = sel > 0 && !allOn }}
                  onChange={(e) => setExcluded((prev) => { const n = new Set(prev); items.forEach((i) => (e.target.checked ? n.delete(i.id) : n.add(i.id))); return n })}
                  className="h-4 w-4 accent-emerald-400"
                />
                <button onClick={() => toggleGroup(key)} className="flex flex-1 items-center gap-2 text-left">
                  {open ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
                  <span className="font-mono text-sm text-emerald-200">{code}</span>
                  <span className="text-xs text-white/55">{codeName.get(code) || ''}</span>
                  <span className="ml-auto text-xs tabular-nums text-white/45">{sel}/{items.length}</span>
                </button>
              </div>
              {open && (
                <ul className="space-y-1 border-t border-white/[0.06] px-3 py-2">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={!excluded.has(i.id)} onChange={(e) => toggleExclude(i.id, e.target.checked)} className="h-3.5 w-3.5 accent-emerald-400" />
                      <span className="truncate text-white/70">{i.name || i.id}</span>
                      <span className="ml-auto shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/45">{i.source} · {Math.round(i.confidence * 100)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
