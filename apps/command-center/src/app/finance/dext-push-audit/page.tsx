'use client'

import { startTransition, useDeferredValue, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Filter,
  Loader2,
  Receipt,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Tags,
} from 'lucide-react'
import { formatMoney } from '@/lib/finance/format'
import { cn } from '@/lib/utils'

type StatusFilter =
  | 'needs_action'
  | 'duplicate_risk'
  | 'match_candidate'
  | 'ambiguous'
  | 'project_review'
  | 'done'
  | 'all'

interface ProjectOption {
  code: string
  name: string | null
  tier: string | null
  status: string | null
}

interface AuditCandidate {
  id: string
  date: string | null
  payee: string
  amount: number
  status: string | null
  bankAccount: string | null
  dateDeltaDays: number | null
  vendorScore: number
  amountDelta: number
  projectCode: string | null
  projectSource: string | null
}

interface AuditItem {
  id: string
  xeroId: string | null
  date: string | null
  vendor: string
  amount: number
  amountDue: number
  amountPaid: number
  xeroStatus: string | null
  reference: string | null
  dextRef: string | null
  hasAttachment: boolean
  projectCode: string | null
  projectSource: string | null
  accountCode: string | null
  taxType: string | null
  description: string | null
  paymentCount: number
  paymentReconciled: boolean
  payments: Array<{
    id: string
    xeroPaymentId: string | null
    date: string | null
    amount: number
    status: string | null
    isReconciled: boolean | null
    accountName: string | null
    reference: string | null
  }>
  candidates: AuditCandidate[]
  decision: 'done' | 'find_match' | 'duplicate_risk' | 'ambiguous' | 'project_review' | 'bookkeeper' | 'unknown'
  decisionLabel: string
  nextStep: string
  riskLevel: 'low' | 'medium' | 'high'
  needsProjectReview: boolean
  receiptEvidenceUrl: string
}

interface DextPushAuditResponse {
  fy: { start: string; end: string }
  filters: {
    status: StatusFilter
    project: string
    q: string
    limit: number
  }
  summary: {
    total: number
    totalAmount: number
    needsAction: number
    duplicateRisk: number
    matchCandidates: number
    ambiguous: number
    projectReview: number
    done: number
    paymentReconciled: number
  }
  projects: ProjectOption[]
  caveat: string
  totalMatching: number
  items: AuditItem[]
}

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'needs_action', label: 'Needs action' },
  { value: 'duplicate_risk', label: 'Duplicate risk' },
  { value: 'match_candidate', label: 'Find & Match' },
  { value: 'ambiguous', label: 'Ambiguous' },
  { value: 'project_review', label: 'Project review' },
  { value: 'done', label: 'Done' },
  { value: 'all', label: 'All Dext pushes' },
]

function initialOption<T extends string>(
  param: string,
  options: Array<{ value: T }>,
  fallback: T
): T {
  if (typeof window === 'undefined') return fallback
  const value = new URLSearchParams(window.location.search).get(param)
  return options.some((option) => option.value === value) ? (value as T) : fallback
}

function initialParam(param: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback
  return new URLSearchParams(window.location.search).get(param) || fallback
}

function dateLabel(date: string | null): string {
  if (!date) return 'No date'
  return new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function riskClass(risk: AuditItem['riskLevel']) {
  if (risk === 'high') return 'border-red-400/40 bg-red-500/10 text-red-100'
  if (risk === 'medium') return 'border-amber-400/40 bg-amber-500/10 text-amber-100'
  return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
}

function decisionClass(decision: AuditItem['decision']) {
  if (decision === 'duplicate_risk') return 'bg-red-400/15 text-red-100'
  if (decision === 'ambiguous' || decision === 'bookkeeper') return 'bg-amber-400/15 text-amber-100'
  if (decision === 'find_match') return 'bg-cyan-400/15 text-cyan-100'
  if (decision === 'done') return 'bg-emerald-400/15 text-emerald-100'
  return 'bg-white/10 text-white/55'
}

function paymentLabel(item: AuditItem): string {
  if (item.paymentReconciled) return 'Payment reconciled'
  if (item.paymentCount > 0) return 'Manual payment not reconciled'
  if (item.amountPaid > 0) return 'Paid in Xero, no payment mirror'
  return 'Bill exists, no payment'
}

function xeroBillUrl(item: AuditItem): string {
  if (!item.xeroId) return 'https://go.xero.com/AccountsPayable/Search.aspx'
  return `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${encodeURIComponent(item.xeroId)}`
}

async function fetchAudit(params: {
  status: StatusFilter
  project: string
  q: string
}): Promise<DextPushAuditResponse> {
  const qs = new URLSearchParams()
  qs.set('status', params.status)
  qs.set('project', params.project)
  qs.set('limit', '300')
  if (params.q.trim()) qs.set('q', params.q.trim())

  const res = await fetch(`/api/finance/dext-push-audit?${qs.toString()}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load Dext push audit')
  return data
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  active,
  onClick,
}: {
  title: string
  value: string
  detail: string
  icon: typeof Receipt
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left shadow-[0_0_40px_rgba(34,211,238,0.03)] transition hover:border-cyan-300/40 hover:bg-cyan-300/10',
        active && 'border-cyan-300/50 bg-cyan-300/10'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-cyan-200" />
      </div>
      <p className="mt-2 text-xs leading-5 text-white/50">{detail}</p>
    </button>
  )
}

export default function DextPushAuditPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<StatusFilter>(() => initialOption('status', statusOptions, 'needs_action'))
  const [project, setProject] = useState(() => initialParam('project', 'all'))
  const [search, setSearch] = useState(() => initialParam('q'))
  const deferredSearch = useDeferredValue(search)
  const [pendingProjects, setPendingProjects] = useState<Record<string, string>>({})

  const query = useQuery({
    queryKey: ['finance', 'dext-push-audit', status, project, deferredSearch],
    queryFn: () => fetchAudit({ status, project, q: deferredSearch }),
  })

  const mutation = useMutation({
    mutationFn: async (payload: { id: string; projectCode: string }) => {
      const res = await fetch('/api/finance/dext-push-audit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save project')
      return data
    },
    onSuccess: () => {
      setPendingProjects({})
      queryClient.invalidateQueries({ queryKey: ['finance', 'dext-push-audit'] })
    },
  })

  const data = query.data
  const rows = data?.items || []
  const projects = data?.projects || []
  const summary = data?.summary

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(248,113,113,0.16),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.94))]" />
      <div className="relative mx-auto max-w-[1560px] px-6 py-8">
        <Link href="/finance" className="mb-6 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Finance
        </Link>

        <header className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_420px] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/75">
              <Sparkles className="h-3.5 w-3.5" />
              Dext Push Audit
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl">
              Stop duplicates. Match what Dext already pushed.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-white/60">
              This page isolates Xero ACCPAY bills created by Dext using the
              <span className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">auto-pushed dext_import</span>
              reference. It does not reconcile in Xero. It tells us whether to leave it, Find & Match, or escalate.
            </p>
          </div>

          <aside className="rounded-3xl border border-red-300/20 bg-red-500/[0.08] p-5">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-200" />
              <div>
                <h2 className="font-semibold text-red-50">Hard rule</h2>
                <p className="mt-2 text-sm leading-6 text-red-50/70">
                  If Dext already created a paid bill/payment, do not create another Xero transaction from the bank feed.
                  Use Find & Match only when the live Xero bank line is visible and correct.
                </p>
              </div>
            </div>
          </aside>
        </header>

        {summary && (
          <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              title="Dext pushed"
              value={summary.total.toLocaleString()}
              detail={`${formatMoney(summary.totalAmount)} in Dext-created Xero bills`}
              icon={Receipt}
              active={status === 'all'}
              onClick={() => setStatus('all')}
            />
            <StatCard
              title="Duplicate risk"
              value={summary.duplicateRisk.toLocaleString()}
              detail="Paid in Xero and bank-line mirror still has candidate"
              icon={ShieldAlert}
              active={status === 'duplicate_risk'}
              onClick={() => setStatus('duplicate_risk')}
            />
            <StatCard
              title="Find & Match"
              value={summary.matchCandidates.toLocaleString()}
              detail="One mirror candidate. Verify in live Xero before clicking"
              icon={FileSearch}
              active={status === 'match_candidate'}
              onClick={() => setStatus('match_candidate')}
            />
            <StatCard
              title="Ambiguous"
              value={summary.ambiguous.toLocaleString()}
              detail="Multiple candidates or uncertain match path"
              icon={AlertTriangle}
              active={status === 'ambiguous'}
              onClick={() => setStatus('ambiguous')}
            />
            <StatCard
              title="Project review"
              value={summary.projectReview.toLocaleString()}
              detail="Missing or broad project tagging on Dext bill"
              icon={Tags}
              active={status === 'project_review'}
              onClick={() => setStatus('project_review')}
            />
            <StatCard
              title="Done"
              value={summary.done.toLocaleString()}
              detail={`${summary.paymentReconciled.toLocaleString()} payments marked reconciled`}
              icon={CheckCircle2}
              active={status === 'done'}
              onClick={() => setStatus('done')}
            />
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_260px_1fr_auto]">
            <label className="space-y-1">
              <span className="text-xs text-white/40">Queue</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white">
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-white/40">Project</span>
              <select value={project} onChange={(e) => setProject(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white">
                <option value="all">All projects</option>
                <option value="__blank__">No project</option>
                {projects.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {p.name || 'Unnamed'}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-white/40">Search</span>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <Search className="h-4 w-4 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => startTransition(() => setSearch(e.target.value))}
                  placeholder="Vendor, dext ref, project, bank candidate..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                />
              </div>
            </label>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <RefreshCcw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </section>

        {data?.caveat && (
          <section className="mt-5 rounded-3xl border border-amber-300/20 bg-amber-300/[0.08] px-5 py-4 text-sm leading-6 text-amber-50/75">
            <div className="flex gap-3">
              <Filter className="mt-0.5 h-4 w-4 shrink-0 text-amber-100" />
              <p>{data.caveat}</p>
            </div>
          </section>
        )}

        {query.error && (
          <div className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {(query.error as Error).message}
          </div>
        )}

        {mutation.error && (
          <div className="mt-4 rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {(mutation.error as Error).message}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-white/55">
              Showing <span className="font-semibold text-white">{rows.length.toLocaleString()}</span>
              {data ? ` of ${data.totalMatching.toLocaleString()} matching Dext-pushed bills` : ''}.
            </p>
            <p className="text-xs text-white/35">Project saves update Supabase/Xero mirror only. No Xero accounting state is changed here.</p>
          </div>

          <div className="max-h-[760px] overflow-auto">
            <table className="w-full min-w-[1320px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#101722] text-left text-[11px] uppercase tracking-[0.22em] text-white/35">
                <tr>
                  <th className="px-5 py-4">Dext-created Xero bill</th>
                  <th className="px-5 py-4">Payment state</th>
                  <th className="px-5 py-4">Decision</th>
                  <th className="px-5 py-4">Bank-line mirror candidates</th>
                  <th className="px-5 py-4">Project</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-white/45">Loading Dext push audit...</td>
                  </tr>
                )}

                {!query.isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-white/45">No Dext-pushed bills match these filters.</td>
                  </tr>
                )}

                {rows.map((item) => {
                  const selectedProject = pendingProjects[item.id] ?? item.projectCode ?? ''
                  const projectChanged = selectedProject !== (item.projectCode ?? '')

                  return (
                    <tr key={item.id} className="border-b border-white/5 align-top transition hover:bg-white/[0.035]">
                      <td className="max-w-[380px] px-5 py-5">
                        <div className="flex items-start gap-3">
                          <div className={cn('mt-1 h-3 w-3 rounded-full border', riskClass(item.riskLevel))} />
                          <div>
                            <p className="text-base font-semibold text-white">{item.vendor}</p>
                            <p className="mt-1 text-xs text-white/45">{dateLabel(item.date)} - {formatMoney(item.amount)}</p>
                            <p className="mt-2 font-mono text-[11px] text-cyan-100/65">{item.reference || 'No reference'}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                              <span className="rounded-full bg-white/10 px-2 py-1 text-white/55">{item.xeroStatus || 'unknown'}</span>
                              <span className={cn('rounded-full px-2 py-1', item.hasAttachment ? 'bg-emerald-400/15 text-emerald-100' : 'bg-red-400/15 text-red-100')}>
                                {item.hasAttachment ? 'receipt attached' : 'no attachment'}
                              </span>
                              {item.accountCode && <span className="rounded-full bg-white/10 px-2 py-1 text-white/55">acct {item.accountCode}</span>}
                              {item.taxType && <span className="rounded-full bg-white/10 px-2 py-1 text-white/55">{item.taxType}</span>}
                            </div>
                            {item.description && <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/38">{item.description}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-3 py-1 text-xs',
                            item.paymentReconciled ? 'bg-emerald-400/15 text-emerald-100' : 'bg-amber-400/15 text-amber-100'
                          )}
                        >
                          {paymentLabel(item)}
                        </span>
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-white/45">Paid {formatMoney(item.amountPaid)} - Due {formatMoney(item.amountDue)}</p>
                          {item.payments.slice(0, 2).map((payment) => (
                            <div key={payment.id} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/55">
                              {dateLabel(payment.date)} - {formatMoney(payment.amount)}
                              <br />
                              {payment.accountName || 'No account'} - {payment.isReconciled ? 'reconciled' : 'not reconciled'}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="max-w-[320px] px-5 py-5">
                        <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', decisionClass(item.decision))}>
                          {item.decisionLabel}
                        </span>
                        <p className="mt-3 text-sm leading-6 text-white/60">{item.nextStep}</p>
                      </td>

                      <td className="max-w-[380px] px-5 py-5">
                        {item.candidates.length === 0 ? (
                          <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-white/45">
                            No local bank-line mirror candidate. This can still exist in live Xero, but this page cannot prove it.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {item.candidates.map((candidate) => (
                              <div key={candidate.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-white">{candidate.payee}</p>
                                    <p className="mt-1 text-xs text-white/45">
                                      {dateLabel(candidate.date)} - {formatMoney(candidate.amount)} - {candidate.bankAccount || 'bank account unknown'}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      'rounded-full px-2 py-1 text-[11px]',
                                      candidate.status === 'reconciled' ? 'bg-emerald-400/15 text-emerald-100' : 'bg-amber-400/15 text-amber-100'
                                    )}
                                  >
                                    {candidate.status || 'unknown'}
                                  </span>
                                </div>
                                <p className="mt-2 text-[11px] text-white/35">
                                  vendor {candidate.vendorScore}% - date delta {candidate.dateDeltaDays ?? '?'}d - project {candidate.projectCode || 'none'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <select
                          value={selectedProject}
                          onChange={(e) => setPendingProjects((current) => ({ ...current, [item.id]: e.target.value }))}
                          className={cn(
                            'w-60 rounded-xl border bg-black/35 px-3 py-2 text-xs text-white outline-none',
                            item.needsProjectReview ? 'border-amber-400/50' : 'border-white/10'
                          )}
                        >
                          <option value="">No project</option>
                          {projects.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.code} - {p.name || 'Unnamed'}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-[11px] text-white/35">
                          {item.projectSource || 'no source'}
                          {item.needsProjectReview ? ' - review' : ''}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            disabled={!projectChanged || mutation.isPending}
                            onClick={() => mutation.mutate({ id: item.id, projectCode: selectedProject })}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tags className="h-3 w-3" />}
                            Save project
                          </button>
                          <a
                            href={xeroBillUrl(item)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
                          >
                            Open Xero bill
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <Link
                            href={item.receiptEvidenceUrl}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
                          >
                            Receipt evidence
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
