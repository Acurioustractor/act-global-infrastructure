'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, Tags } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoverageRow { area: string; n: number; tagged: number; pct: number }
interface Conflict { name: string | null; oppCode: string; invoiceCode: string; proposed: string; reason?: string }
interface FillItem { name?: string | null; code: string | null; confidence: number; source: string }
interface FillBucket { auto: FillItem[]; review: FillItem[]; none: FillItem[] }
interface SweepRun {
  run_at: string
  coverage: CoverageRow[]
  conflicts: Conflict[]
  fill: { opps: FillBucket; subs: FillBucket }
}

async function fetchSweep(): Promise<{ run: SweepRun | null; ok: boolean }> {
  const res = await fetch('/api/finance/tagging-sweep')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load the tagging sweep')
  return data
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

function FillRow({ label, b }: { label: string; b: FillBucket }) {
  const total = b.auto.length + b.review.length + b.none.length
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{total} untagged</p>
      <p className="mt-1 text-xs text-white/55">
        <span className="text-emerald-200">{b.auto.length} auto-fillable</span> ·{' '}
        <span className="text-amber-200">{b.review.length} review</span> ·{' '}
        <span className="text-white/40">{b.none.length} no-match</span>
      </p>
    </div>
  )
}

export default function TaggingSweepPage() {
  const query = useQuery({ queryKey: ['finance', 'tagging-sweep'], queryFn: fetchSweep })
  const run = query.data?.run

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.94))]" />
      <div className="relative mx-auto max-w-[1200px] px-6 py-8">
        <Link href="/finance" className="mb-6 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Finance
        </Link>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/75">
              <Tags className="h-3.5 w-3.5" /> Project-code tagging sweep
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Tagging health</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
              Read-only. Coverage per area, cross-area conflicts, and what the shared resolver could fill —
              from the latest <code className="text-white/75">tagging-sweep</code> run. Re-tagging writes are gated (day-shift).
            </p>
          </div>
          {run && (
            <p className="inline-flex items-center gap-1 text-xs text-white/45">
              <Clock className="h-3 w-3" /> run {new Date(run.run_at).toISOString().slice(0, 16).replace('T', ' ')}
            </p>
          )}
        </header>

        {query.isLoading && (
          <div className="mt-10 inline-flex items-center gap-2 text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
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
            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold text-white/80">Coverage by area</h2>
              <div className="mt-4 space-y-2">
                {run.coverage.map((r) => (
                  <CoverageBar key={r.area} row={r} />
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
                {run.conflicts.length > 0 ? <AlertTriangle className="h-4 w-4 text-amber-200" /> : <CheckCircle2 className="h-4 w-4 text-emerald-200" />}
                Cross-area conflicts (opp ↔ linked invoice): {run.conflicts.length}
              </h2>
              {run.conflicts.length === 0 ? (
                <p className="mt-2 text-xs text-emerald-200/80">No opp↔invoice conflicts. ✓</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-white/40">
                        <th className="pb-2 pr-3 font-medium">Opportunity</th>
                        <th className="pb-2 px-3 font-medium">Opp code</th>
                        <th className="pb-2 px-3 font-medium">Invoice code</th>
                        <th className="pb-2 pl-3 font-medium">Proposed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.conflicts.map((c, i) => (
                        <tr key={i} className="border-t border-white/[0.06]">
                          <td className="py-2 pr-3 text-white/80">{(c.name || '—').slice(0, 48)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-amber-200">{c.oppCode}</td>
                          <td className="px-3 py-2 font-mono text-xs text-white/60">{c.invoiceCode}</td>
                          <td className="py-2 pl-3 font-mono text-xs text-emerald-200">{c.proposed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-[11px] text-white/35">
                    Proposed = the invoice&apos;s code (Xero Project Tracking is the money source of truth). Applied by the gated
                    writer (Phase 3), tracer-first — not from this view.
                  </p>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold text-white/80">Fill preview — what the resolver would assign</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FillRow label="GHL opportunities" b={run.fill.opps} />
                <FillRow label="Subscriptions" b={run.fill.subs} />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-white/35">
                Auto-fillable = high-confidence (system tag / linked invoice / registry / vendor / pipeline). Review =
                low-confidence (name/keyword). No-match = the resolver won&apos;t guess. Auto-fills run via the gated writer,
                tracer-first; the ACT-CA catch-all from a pipeline hint is treated as review, never auto-applied over a sharper invoice code.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
