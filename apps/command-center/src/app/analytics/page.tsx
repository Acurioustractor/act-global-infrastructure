'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  RefreshCw,
  Users,
  MailCheck,
  MailX,
  ShieldQuestion,
  BookOpen,
  TrendingUp,
  Compass,
  Server,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react'
import type { EcosystemAnalytics } from '@/lib/analytics/ecosystem'
import type { VercelDeployFeed } from '@/lib/analytics/vercel'

async function fetchAnalytics(): Promise<EcosystemAnalytics> {
  const res = await fetch('/api/analytics/ecosystem')
  if (!res.ok) throw new Error('Failed to load ecosystem analytics')
  return res.json()
}

async function fetchVercel(): Promise<VercelDeployFeed> {
  const res = await fetch('/api/analytics/vercel')
  if (!res.ok) throw new Error('Failed to load Vercel feed')
  return res.json()
}

function deployTone(state: string): { dot: string; label: string } {
  if (state === 'READY') return { dot: 'bg-emerald-400', label: 'text-emerald-300' }
  if (state === 'ERROR') return { dot: 'bg-red-400', label: 'text-red-300' }
  if (state === 'BUILDING' || state === 'QUEUED') return { dot: 'bg-amber-400', label: 'text-amber-300' }
  return { dot: 'bg-slate-500', label: 'text-slate-400' }
}

const fmt = (n: number) => n.toLocaleString('en-AU')
const money = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `$${n.toFixed(0)}`

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'text-indigo-400',
}: {
  icon: typeof Users
  label: string
  value: string
  sub?: string
  tone?: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icon className={`h-4 w-4 ${tone}`} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['ecosystem-analytics'],
    queryFn: fetchAnalytics,
  })
  const { data: vercel } = useQuery({
    queryKey: ['ecosystem-vercel'],
    queryFn: fetchVercel,
  })

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 text-slate-100">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Activity className="h-6 w-6 text-emerald-400" />
            Ecosystem Analytics
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Belonging across the ACT ecosystem — how people arrive, the journey rung
            they reach, and their consent state. Belonging, not sales.
            {data?.generatedAt && (
              <span className="text-slate-600">
                {' '}· as of {new Date(data.generatedAt).toLocaleString('en-AU')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {isLoading && <div className="text-slate-400">Loading the ecosystem…</div>}
      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          Couldn’t load analytics. The GHL mirror query may have failed — check the
          server logs for <code>/api/analytics/ecosystem</code>.
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* Top-line */}
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={Users} label="Contacts" value={fmt(data.totalContacts)} tone="text-indigo-400" />
            <StatCard
              icon={MailCheck}
              label="Newsletter consented"
              value={fmt(data.consent.consented)}
              sub={`${data.totalContacts ? Math.round((data.consent.consented / data.totalContacts) * 100) : 0}% of contacts`}
              tone="text-emerald-400"
            />
            <StatCard icon={MailX} label="Unsubscribed" value={fmt(data.consent.unsubscribed)} tone="text-amber-400" />
            <StatCard icon={TrendingUp} label="Open opportunities" value={fmt(data.totalOpenOpps)} tone="text-sky-400" />
          </section>

          {/* Site deployments (Vercel) */}
          {vercel && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
                <Server className="h-5 w-5 text-sky-400" /> Site deployments
              </h2>
              {!vercel.configured ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  {vercel.note || 'Vercel feed not configured.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {vercel.sites.map((s) => {
                    const tone = deployTone(s.state)
                    return (
                      <div key={s.project} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between">
                          <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-medium text-slate-200 hover:underline">
                            {s.label}
                            <ExternalLink className="h-3 w-3 text-slate-500" />
                          </a>
                          <span className={`flex items-center gap-1.5 text-xs ${tone.label}`}>
                            <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                            {s.state === 'READY' ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.state === 'ERROR' ? <XCircle className="h-3.5 w-3.5" /> : null}
                            {s.state}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500" title={s.commitMessage || ''}>
                          {s.commitRef ? `${s.commitRef} · ` : ''}
                          {s.createdAt ? new Date(s.createdAt).toLocaleString('en-AU') : '—'}
                        </div>
                        {s.state === 'ERROR' && s.inspectorUrl && (
                          <a href={s.inspectorUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-red-300 hover:underline">
                            View build error →
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* Belonging funnels */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
              <Compass className="h-5 w-5 text-violet-400" /> Belonging journeys
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {data.funnels
                .filter((f) => f.total > 0)
                .map((f) => {
                  const max = Math.max(...f.stages.map((s) => s.count), 1)
                  return (
                    <div key={f.pipelineId} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3 flex items-baseline justify-between">
                        <h3 className="font-medium text-slate-200">{f.pipeline}</h3>
                        <span className="text-xs text-slate-500">{fmt(f.total)} open</span>
                      </div>
                      <div className="space-y-2">
                        {f.stages.map((s) => (
                          <div key={s.stageId || s.name} className="flex items-center gap-3">
                            <div className="w-28 shrink-0 truncate text-xs text-slate-400" title={s.name}>
                              {s.name}
                            </div>
                            <div className="h-5 flex-1 overflow-hidden rounded bg-white/5">
                              <div
                                className="h-full rounded bg-gradient-to-r from-violet-500/70 to-emerald-500/70"
                                style={{ width: `${(s.count / max) * 100}%` }}
                              />
                            </div>
                            <div className="w-10 shrink-0 text-right text-sm tabular-nums text-slate-300">
                              {fmt(s.count)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Consent state */}
            <section>
              <h2 className="mb-3 text-lg font-medium">Consent state</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={MailCheck} label="Consented (sendable)" value={fmt(data.consent.consented)} tone="text-emerald-400" />
                <StatCard icon={ShieldQuestion} label="No consent (held)" value={fmt(data.consent.noConsent)} tone="text-slate-400" />
                <StatCard icon={MailX} label="Unsubscribed" value={fmt(data.consent.unsubscribed)} tone="text-amber-400" />
                <StatCard icon={BookOpen} label="Storytellers (OCAP)" value={fmt(data.consent.storytellers)} sub="never funnelled" tone="text-pink-400" />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Only “consented” contacts may be sent to. Storytellers are shown for
                visibility and are governed by OCAP — never a marketing list.
              </p>
            </section>

            {/* Source of arrival */}
            <section>
              <h2 className="mb-3 text-lg font-medium">Where people arrive from</h2>
              <div className="space-y-1.5">
                {(() => {
                  const max = Math.max(...data.sources.map((s) => s.count), 1)
                  return data.sources.map((s) => (
                    <div key={s.source} className="flex items-center gap-3">
                      <div className="w-40 shrink-0 truncate text-xs text-slate-400" title={s.source}>
                        {s.source}
                      </div>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-white/5">
                        <div className="h-full rounded bg-sky-500/60" style={{ width: `${(s.count / max) * 100}%` }} />
                      </div>
                      <div className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-300">{fmt(s.count)}</div>
                    </div>
                  ))
                })()}
              </div>
            </section>
          </div>

          {/* Project segmentation */}
          <section>
            <h2 className="mb-3 text-lg font-medium">By project</h2>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Project code</th>
                    <th className="px-4 py-2 text-right">Opportunities</th>
                    <th className="px-4 py-2 text-right">Open</th>
                    <th className="px-4 py-2 text-right">Open pipeline value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.projects.map((p) => (
                    <tr key={p.projectCode} className="hover:bg-white/5">
                      <td className="px-4 py-2 font-mono text-slate-200">{p.projectCode}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-300">{fmt(p.opps)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-300">{fmt(p.openOpps)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-400">{money(p.pipelineValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
