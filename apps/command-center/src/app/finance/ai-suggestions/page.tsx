'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  X,
  Sparkles,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/format'

type Filter = 'high_conf' | 'review' | 'all'

interface Suggestion {
  id: string
  source_table: 'bank_statement_lines' | 'receipt_emails' | 'xero_transactions' | 'finance_receipt_documents'
  source_record_id: string
  vendor_name: string | null
  amount: number | string | null
  txn_date: string | null
  bank_account: string | null
  description: string | null
  suggested_project_code: string
  confidence: number
  reason: string | null
  risk_flags: string[] | null
  model: string
  prompt_version: string
  created_at: string
}

interface QueueResponse {
  filter: Filter
  counts: {
    highConf: number
    review: number
    applied: number
  }
  suggestions: Suggestion[]
}

const CODE_TONE: Record<string, string> = {
  'ACT-IN': 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
  'ACT-HV': 'bg-amber-500/15 border-amber-500/30 text-amber-200',
  'ACT-FM': 'bg-amber-500/15 border-amber-500/30 text-amber-200',
  'ACT-GD': 'bg-orange-500/15 border-orange-500/30 text-orange-200',
  'ACT-JH': 'bg-blue-500/15 border-blue-500/30 text-blue-200',
  'ACT-CORE': 'bg-slate-500/15 border-slate-500/30 text-slate-200',
  'ACT-EL': 'bg-pink-500/15 border-pink-500/30 text-pink-200',
  'ACT-PS': 'bg-violet-500/15 border-violet-500/30 text-violet-200',
  'ACT-MY': 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200',
  'ACT-OO': 'bg-rose-500/15 border-rose-500/30 text-rose-200',
  ASK_USER: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-100',
  SL_REVIEW: 'bg-purple-500/15 border-purple-500/30 text-purple-200',
}

function confidenceTone(c: number) {
  if (c >= 0.9) return 'text-emerald-300'
  if (c >= 0.75) return 'text-cyan-300'
  if (c >= 0.6) return 'text-amber-300'
  return 'text-rose-300'
}

function sourceLabel(t: Suggestion['source_table']) {
  switch (t) {
    case 'bank_statement_lines':
      return 'bank line'
    case 'receipt_emails':
      return 'receipt email'
    case 'xero_transactions':
      return 'Xero txn'
    case 'finance_receipt_documents':
      return 'Dext doc'
    default:
      return t
  }
}

export default function AISuggestionsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('high_conf')
  const [pending, setPending] = useState<string | null>(null)

  const { data, isLoading, refetch, isRefetching } = useQuery<QueueResponse>({
    queryKey: ['ai-suggestions', filter],
    queryFn: () =>
      fetch(`/api/finance/workbench/ai-queue?filter=${filter}&limit=100`, { cache: 'no-store' }).then((r) => r.json()),
    staleTime: 30 * 1000,
  })

  const accept = useMutation({
    mutationFn: (suggestionId: string) =>
      fetch('/api/finance/workbench/accept-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action: 'accept' }),
      }).then((r) => r.json()),
    onMutate: (id) => setPending(id),
    onSettled: () => setPending(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] }),
  })

  const reject = useMutation({
    mutationFn: (suggestionId: string) =>
      fetch('/api/finance/workbench/accept-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action: 'reject', rejectionReason: 'rejected via workbench AI queue' }),
      }).then((r) => r.json()),
    onMutate: (id) => setPending(id),
    onSettled: () => setPending(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] }),
  })

  const acceptAllSafe = useMutation({
    mutationFn: async () => {
      const safe = (data?.suggestions || []).filter(
        (s) => s.confidence >= 0.85 && !['ASK_USER', 'SL_REVIEW'].includes(s.suggested_project_code),
      )
      const results: Array<{ id: string; ok: boolean }> = []
      for (const s of safe) {
        try {
          const res = await fetch('/api/finance/workbench/accept-suggestion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ suggestionId: s.id, action: 'accept' }),
          })
          const j = await res.json()
          results.push({ id: s.id, ok: !!j.ok })
        } catch {
          results.push({ id: s.id, ok: false })
        }
      }
      return results
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] }),
  })

  const suggestions = data?.suggestions || []
  const counts = data?.counts || { highConf: 0, review: 0, applied: 0 }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 lg:p-8 text-neutral-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/finance" className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Finance
        </Link>

        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-emerald-300">
              <Sparkles className="h-3 w-3" />
              AI suggestions
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Review AI grades</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/55">
              Sonnet 4.6 graded these rows. Accept applies the project code to the source row; reject marks the suggestion dead. ASK_USER and SL_REVIEW codes never auto-apply — those need your call.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
            disabled={isRefetching}
          >
            <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
            Refresh
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          {(['high_conf', 'review', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition',
                filter === f
                  ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                  : 'border-white/10 text-white/55 hover:border-white/25 hover:text-white',
              )}
            >
              {f === 'high_conf' ? 'High confidence ≥85%' : f === 'review' ? 'Need review' : 'All open'}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums">
                {f === 'high_conf' ? counts.highConf : f === 'review' ? counts.review : counts.highConf + counts.review}
              </span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 text-xs text-white/45">
            <span>{counts.applied.toLocaleString()} accepted to date</span>
            {filter === 'high_conf' && suggestions.length > 0 && (
              <button
                type="button"
                onClick={() => acceptAllSafe.mutate()}
                disabled={acceptAllSafe.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
              >
                {acceptAllSafe.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Accept all {suggestions.length} safe
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
            Loading suggestions…
          </div>
        )}

        {!isLoading && suggestions.length === 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-100">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Nothing in this bucket.</p>
              <p className="mt-0.5 text-emerald-200/70">
                {filter === 'high_conf'
                  ? 'No safe high-confidence suggestions waiting. The poller queues them every 15 min; check back.'
                  : 'No suggestions need review right now.'}
              </p>
            </div>
          </div>
        )}

        {!isLoading && suggestions.length > 0 && (
          <ul className="space-y-2">
            {suggestions.map((s) => {
              const isPending = pending === s.id
              const blockedCode = ['ASK_USER', 'SL_REVIEW'].includes(s.suggested_project_code)
              const tone = CODE_TONE[s.suggested_project_code] || 'bg-white/10 border-white/15 text-white'

              return (
                <li
                  key={s.id}
                  className={cn(
                    'flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 lg:flex-row lg:items-center lg:gap-4',
                    isPending && 'opacity-50',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-white/45">
                      <span>{sourceLabel(s.source_table)}</span>
                      {s.txn_date && <span>·</span>}
                      {s.txn_date && <span>{s.txn_date}</span>}
                      {s.bank_account && <span>·</span>}
                      {s.bank_account && <span className="truncate">{s.bank_account}</span>}
                    </div>
                    <div className="mt-1 flex items-baseline gap-3">
                      <p className="truncate text-base font-semibold text-white">
                        {s.vendor_name || '(no vendor)'}
                      </p>
                      <p className="text-sm font-medium text-white/75 tabular-nums">
                        {s.amount != null ? formatMoney(Number(s.amount)) : '—'}
                      </p>
                    </div>
                    {s.reason && <p className="mt-1 text-xs leading-snug text-white/50">{s.reason}</p>}
                    {s.risk_flags && s.risk_flags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {s.risk_flags.map((flag) => (
                          <span
                            key={flag}
                            className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200"
                          >
                            <AlertTriangle className="-mt-px mr-1 inline h-2.5 w-2.5" />
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-md border px-2.5 py-1 text-xs font-bold tabular-nums', tone)}>
                        {s.suggested_project_code}
                      </span>
                      <span className={cn('text-sm font-bold tabular-nums', confidenceTone(s.confidence))}>
                        {(s.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => reject.mutate(s.id)}
                        disabled={isPending}
                        title="Reject this suggestion"
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/55 transition hover:border-rose-400/40 hover:text-rose-200 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => accept.mutate(s.id)}
                        disabled={isPending || blockedCode}
                        title={
                          blockedCode
                            ? `Cannot auto-apply ${s.suggested_project_code} — needs human review`
                            : `Apply ${s.suggested_project_code} to ${sourceLabel(s.source_table)}`
                        }
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                          blockedCode
                            ? 'bg-white/5 text-white/30 cursor-not-allowed'
                            : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
                        )}
                      >
                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Accept
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
