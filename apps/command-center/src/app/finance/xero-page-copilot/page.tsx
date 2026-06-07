'use client'

import { useMemo, useState, startTransition } from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSearch,
  GitCompareArrows,
  Loader2,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { formatMoney } from '@/lib/finance/format'
import { cn } from '@/lib/utils'
import { ReceiptInXero } from '@/components/finance/ReceiptInXero'
import { RetagSelect, type ProjectOption } from '@/components/finance/RetagSelect'

// OPERATE workspace (plan 2026-05-29 P3) — the surfaces this copilot anchors.
const OPERATE_TABS: Array<{ href: string; label: string }> = [
  { href: '/finance/xero-page-copilot', label: 'Reconcile Copilot' },
  { href: '/finance/reconcile', label: 'Card Cockpit' },
  { href: '/finance/tagger-v2', label: 'Tagger' },
  { href: '/finance/receipts-triage', label: 'Receipts' },
  { href: '/finance/reconciliation', label: 'Reconciliation' },
  { href: '/finance/ai-suggestions', label: 'AI Suggestions' },
  { href: '/finance/dext-push-audit', label: 'Dext Audit' },
  { href: '/finance/workbench', label: 'Workbench' },
  { href: '/finance/actions', label: 'Open Actions' },
]

type SuggestedAction =
  | 'click_ok_existing_match'
  | 'wrong_xero_suggestion'
  | 'transfer'
  | 'find_match_bill'
  | 'create_with_evidence'
  | 'create_low_value'
  | 'refund_review'
  | 'skip_done'
  | 'bookkeeper_review'
  | 'unsafe_create'

interface CopilotRow {
  rowNumber: number
  date: string
  description: string
  transactionType: string
  amount: number
  hasOkButton: boolean
  suggestedWho: string | null
  suggestedAccount: string | null
  suggestedWhy: string | null
  suggestedTaxRate: string | null
  existingMatchLabel: string | null
  recommendedFields: {
    who: string
    account: string
    why: string
    taxRate: string
  }
  suggestedAction: SuggestedAction
  actionLabel: string
  risk: 'low' | 'medium' | 'high'
  nextStep: string
  receiptEvidenceUrl: string
  bestXeroBillUrl: string | null
  bankLine: {
    id: string
    date: string | null
    payee: string | null
    amount: number
    status: string | null
    bankAccount: string | null
    projectCode: string | null
    projectSource: string | null
    dateDeltaDays: number | null
    vendorScore: number
  } | null
  evidence: {
    id: string
    status: string
    bestConfidence: number
    bestSource: string | null
    bestVendorName: string | null
    candidateCount: number
    hasApprovedLink: boolean
  } | null
  billCandidates: Array<{
    id: string
    xeroId: string | null
    invoiceNumber: string | null
    contactName: string | null
    date: string | null
    total: number
    status: string | null
    amountPaid: number
    amountDue: number
    hasAttachments: boolean
    reference: string | null
    projectCode: string | null
    dateDeltaDays: number | null
    vendorScore: number
    xeroUrl: string
  }>
}

interface CopilotResponse {
  parsedCount: number
  dateRange?: { start: string; end: string }
  sourceCounts?: {
    bankLines: number
    evidenceRows: number
    xeroBills: number
  }
  summary: Record<string, number>
  rows: CopilotRow[]
  warnings: string[]
}

const actionLabels: Record<SuggestedAction, string> = {
  click_ok_existing_match: 'OK existing match',
  wrong_xero_suggestion: 'Wrong Xero match',
  transfer: 'Transfer',
  find_match_bill: 'Find & Match bill',
  create_with_evidence: 'Create with receipt',
  create_low_value: 'Low-value create',
  refund_review: 'Refund review',
  skip_done: 'Skip done',
  bookkeeper_review: 'Human review',
  unsafe_create: 'Check before create',
}

const actionOrder: SuggestedAction[] = [
  'wrong_xero_suggestion',
  'click_ok_existing_match',
  'transfer',
  'find_match_bill',
  'create_with_evidence',
  'create_low_value',
  'refund_review',
  'unsafe_create',
  'bookkeeper_review',
  'skip_done',
]

const sampleText = `1 Oct 2025
LINKTREE COLLINGWOOD
XXXXXXXXXXXXXXX1656
Credit Card Purchase
More details
8.20
OK
MatchCreateTransferDiscussFind & Match
Who
Linktree
What
485 - Subscriptions
Why
No Invoice - Under $82.50
GST on Expenses`

function dateLabel(date: string | null): string {
  if (!date) return 'No date'
  return new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function riskClass(risk: CopilotRow['risk']) {
  if (risk === 'high') return 'border-red-400/35 bg-red-500/10 text-red-100'
  if (risk === 'medium') return 'border-amber-400/35 bg-amber-500/10 text-amber-100'
  return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
}

function actionClass(action: SuggestedAction) {
  if (action === 'wrong_xero_suggestion') return 'bg-red-500/20 text-red-100'
  if (action === 'bookkeeper_review' || action === 'unsafe_create') return 'bg-red-400/15 text-red-100'
  if (action === 'refund_review') return 'bg-amber-400/15 text-amber-100'
  if (action === 'transfer') return 'bg-blue-400/15 text-blue-100'
  if (action === 'find_match_bill' || action === 'create_with_evidence') return 'bg-cyan-400/15 text-cyan-100'
  if (action === 'click_ok_existing_match' || action === 'create_low_value' || action === 'skip_done') return 'bg-emerald-400/15 text-emerald-100'
  return 'bg-white/10 text-white/65'
}

async function analyzePage(text: string): Promise<CopilotResponse> {
  const res = await fetch('/api/finance/xero-page-copilot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to analyse Xero page')
  return data
}

function buildCopyText(rows: CopilotRow[]) {
  return rows.map((row) => {
    const bits = [
      `${row.rowNumber}. ${dateLabel(row.date)} ${row.description} ${formatMoney(row.amount)}`,
      `Action: ${row.actionLabel}`,
      `Next: ${row.nextStep}`,
      `Use: Who=${row.recommendedFields.who || row.suggestedWho || ''}; What=${row.recommendedFields.account}; Why=${row.recommendedFields.why}; Tax=${row.recommendedFields.taxRate}`,
    ]
    if (row.billCandidates[0]) {
      bits.push(`Bill: ${row.billCandidates[0].contactName || 'unknown'} ${formatMoney(row.billCandidates[0].total)} ${row.billCandidates[0].status || ''}`)
    }
    if (row.evidence) {
      bits.push(`Evidence: ${row.evidence.status} ${Math.round(row.evidence.bestConfidence * 100)}% ${row.evidence.bestSource || ''}`)
    }
    return bits.join(' | ')
  }).join('\n')
}

function StatCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/10',
        active && 'border-cyan-300/50 bg-cyan-300/10'
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.26em] text-white/40">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </button>
  )
}

export default function XeroPageCopilotPage() {
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<SuggestedAction | 'all'>('all')
  const [copied, setCopied] = useState(false)

  const mutation = useMutation({
    mutationFn: analyzePage,
  })

  // Project codes for inline re-tag (P3).
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ['finance', 'project-codes'],
    queryFn: async () => {
      const res = await fetch('/api/finance/projects')
      if (!res.ok) throw new Error('projects fetch failed')
      const json = await res.json()
      return (json.projects ?? []).map((p: { code: string; name: string }) => ({ code: p.code, name: p.name }))
    },
    staleTime: 10 * 60 * 1000,
  })

  const rows = mutation.data?.rows || []
  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter((row) => row.suggestedAction === filter)
  }, [filter, rows])

  const summary = mutation.data?.summary || {}

  const copyPlan = async () => {
    if (!rows.length) return
    await navigator.clipboard.writeText(buildCopyText(filteredRows))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(245,158,11,0.14),transparent_26%),#05070d] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/finance" className="mb-5 inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Finance
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100">
              <Bot className="h-3.5 w-3.5" />
              Xero Page Copilot
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Paste one Xero reconcile page. Get the next safe click.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">
              It parses what Xero is showing, checks ACT mirror evidence, Dext-created bills, receipt
              status, transfers and refunds, and gives a per-row action queue. The Xero reconcile clicks
              stay yours — but you can now re-tag the project inline and jump straight to a missing receipt.
            </p>
          </div>
          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50 lg:max-w-sm">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Hard rule
            </div>
            <p className="mt-2 text-amber-100/75">
              If this page says a Dext/Xero bill already exists, use Find & Match. Do not Create duplicate spend.
            </p>
          </div>
        </header>

        {/* OPERATE workspace tabs (P3 fold) */}
        <nav aria-label="Operate workspace" className="mb-6 flex flex-wrap gap-2">
          {OPERATE_TABS.map((tab) => {
            const isCurrent = tab.href === '/finance/xero-page-copilot'
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                  isCurrent
                    ? 'bg-cyan-300 text-slate-950'
                    : 'border border-white/12 bg-white/5 text-white/55 hover:border-white/30 hover:text-white',
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Paste copied Xero page text</h2>
                <p className="mt-1 text-sm text-white/48">Copy from the visible Reconcile page. One page at a time is best.</p>
              </div>
              <button
                type="button"
                onClick={() => setText(sampleText)}
                className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:border-white/30 hover:text-white"
              >
                Sample
              </button>
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste the Xero reconcile page text here..."
              className="mt-4 min-h-[360px] w-full resize-y rounded-3xl border border-white/10 bg-black/35 p-4 font-mono text-xs leading-5 text-white/80 outline-none transition placeholder:text-white/25 focus:border-cyan-300/45"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!text.trim() || mutation.isPending}
                onClick={() => {
                  startTransition(() => {
                    setFilter('all')
                    mutation.mutate(text)
                  })
                }}
                className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analyse page
              </button>
              <button
                type="button"
                onClick={() => {
                  setText('')
                  mutation.reset()
                  setFilter('all')
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-white/65 transition hover:border-white/30 hover:text-white"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                type="button"
                disabled={!rows.length}
                onClick={copyPlan}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-white/65 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:text-white/25"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy plan'}
              </button>
            </div>
            {mutation.error && (
              <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                {(mutation.error as Error).message}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Rows parsed" value={mutation.data?.parsedCount || 0} active={filter === 'all'} onClick={() => setFilter('all')} />
              {actionOrder.slice(0, 5).map((action) => (
                <StatCard
                  key={action}
                  label={actionLabels[action]}
                  value={summary[action] || 0}
                  active={filter === action}
                  onClick={() => setFilter(action)}
                />
              ))}
            </div>

            {mutation.data?.warnings?.length ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">
                {mutation.data.warnings.map((warning) => (
                  <p key={warning} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                    <span>{warning}</span>
                  </p>
                ))}
              </div>
            ) : null}

            {mutation.data?.sourceCounts ? (
              <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 text-sm">
                <div>
                  <p className="text-white/35">Bank mirror</p>
                  <p className="mt-1 text-lg font-semibold">{mutation.data.sourceCounts.bankLines}</p>
                </div>
                <div>
                  <p className="text-white/35">Evidence rows</p>
                  <p className="mt-1 text-lg font-semibold">{mutation.data.sourceCounts.evidenceRows}</p>
                </div>
                <div>
                  <p className="text-white/35">Xero bills</p>
                  <p className="mt-1 text-lg font-semibold">{mutation.data.sourceCounts.xeroBills}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="font-semibold">Action queue</h2>
              <p className="text-sm text-white/45">Showing {filteredRows.length} of {rows.length} parsed rows.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={cn('rounded-full px-3 py-1.5 text-xs transition', filter === 'all' ? 'bg-white text-slate-950' : 'bg-white/10 text-white/55 hover:text-white')}
              >
                All
              </button>
              {actionOrder.map((action) => (
                <button
                  type="button"
                  key={action}
                  onClick={() => setFilter(action)}
                  className={cn('rounded-full px-3 py-1.5 text-xs transition', filter === action ? 'bg-white text-slate-950' : 'bg-white/10 text-white/55 hover:text-white')}
                >
                  {actionLabels[action]} {summary[action] ? `(${summary[action]})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {!mutation.data && (
              <div className="p-10 text-center text-white/45">
                <FileSearch className="mx-auto mb-3 h-8 w-8" />
                Paste a Xero page and analyse it.
              </div>
            )}

            {mutation.data && !filteredRows.length && (
              <div className="p-10 text-center text-white/45">
                No rows in this filter.
              </div>
            )}

            {filteredRows.map((row) => (
              <article key={`${row.rowNumber}-${row.date}-${row.description}`} className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/55">#{row.rowNumber}</span>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', actionClass(row.suggestedAction))}>{row.actionLabel}</span>
                    <span className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', riskClass(row.risk))}>{row.risk} risk</span>
                    {row.hasOkButton && <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs text-emerald-100">Xero OK visible</span>}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-white">{row.description}</h3>
                  <p className="mt-1 text-sm text-white/45">{dateLabel(row.date)} · {row.transactionType || 'Unknown type'}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">{formatMoney(row.amount)}</p>
                  <p className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white/70">{row.nextStep}</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                    <GitCompareArrows className="h-4 w-4 text-cyan-200" />
                    What Xero is suggesting
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/35">Who</dt>
                      <dd className="text-right text-white/75">{row.suggestedWho || 'not set'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/35">Account</dt>
                      <dd className="text-right text-white/75">{row.suggestedAccount || 'not set'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/35">Tax</dt>
                      <dd className="text-right text-white/75">{row.suggestedTaxRate || 'not set'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/35">Why</dt>
                      <dd className="text-right text-white/75">{row.suggestedWhy || 'not set'}</dd>
                    </div>
                  </dl>
                  {row.existingMatchLabel && (
                    <p className="mt-4 rounded-2xl bg-emerald-400/10 p-3 text-sm text-emerald-100">
                      Existing right-hand match: {row.existingMatchLabel}
                    </p>
                  )}
                  <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm">
                    <p className="font-semibold text-cyan-50">ACT recommended fields</p>
                    <dl className="mt-2 space-y-1 text-cyan-100/80">
                      <div className="flex justify-between gap-3">
                        <dt className="text-cyan-100/50">Who</dt>
                        <dd className="text-right">{row.recommendedFields.who || row.suggestedWho || 'use transfer account'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-cyan-100/50">What</dt>
                        <dd className="text-right">{row.recommendedFields.account}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-cyan-100/50">Tax</dt>
                        <dd className="text-right">{row.recommendedFields.taxRate}</dd>
                      </div>
                      <div>
                        <dt className="text-cyan-100/50">Why</dt>
                        <dd className="mt-1 leading-5">{row.recommendedFields.why}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                    <ReceiptText className="h-4 w-4 text-cyan-200" />
                    ACT evidence
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    {row.billCandidates[0] ? (
                      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-cyan-50">Xero bill candidate</p>
                          <ReceiptInXero hasAttachment={row.billCandidates[0].hasAttachments} variant="full" />
                        </div>
                        <p className="mt-1 text-cyan-100/75">
                          {row.billCandidates[0].contactName || 'Unknown'} · {dateLabel(row.billCandidates[0].date)} · {formatMoney(row.billCandidates[0].total)}
                        </p>
                        <p className="mt-1 text-cyan-100/60">
                          {row.billCandidates[0].status || 'no status'} · {row.billCandidates[0].reference || 'no reference'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <a href={row.billCandidates[0].xeroUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-100 hover:text-white">
                            Open Xero bill <ExternalLink className="h-3 w-3" />
                          </a>
                          <RetagSelect kind="bill" id={row.billCandidates[0].id} currentCode={row.billCandidates[0].projectCode} projects={projects} />
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-white/45">No exact Xero bill candidate found.</p>
                    )}

                    {row.evidence ? (
                      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                        <p className="font-medium text-emerald-50">
                          Receipt evidence: {row.evidence.status}
                        </p>
                        <p className="mt-1 text-emerald-100/70">
                          {Math.round(row.evidence.bestConfidence * 100)}% · {row.evidence.bestSource || 'unknown source'} · {row.evidence.candidateCount} candidates
                        </p>
                        <Link href={row.receiptEvidenceUrl} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-100 hover:text-white">
                          Open receipt evidence <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={row.receiptEvidenceUrl}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-50 transition hover:bg-amber-300/20"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          No receipt matched — find the missing receipt
                        </span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}

                    {row.bankLine && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-white/55">
                        <div className="flex items-center gap-2">
                          {String(row.bankLine.status || '').toLowerCase() === 'reconciled'
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                            : <AlertTriangle className="h-4 w-4 text-amber-200" />}
                          <span>Mirror: {row.bankLine.status || 'unknown'}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-white/45">date delta {row.bankLine.dateDeltaDays ?? '?'}d</span>
                          <RetagSelect kind="bankLine" id={row.bankLine.id} currentCode={row.bankLine.projectCode} projects={projects} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
