'use client'

import { useDeferredValue, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  CheckCheck,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  Link2,
  Loader2,
  PlusCircle,
  Receipt,
  ScanSearch,
  Search,
  ShieldAlert,
  Undo2,
} from 'lucide-react'
import { formatMoney } from '@/lib/finance/format'
import { cn } from '@/lib/utils'

// Mirrors ReconcileAction + ApiLineResult in the engine / route. Read-only co-pilot.
type ReconcileAction =
  | 'match_bill'
  | 'approve_draft'
  | 'match_txn'
  | 'already_reconciled'
  | 'duplicate'
  | 'create'
  | 'transfer'
  | 'refund'
type ActionFilter = ReconcileAction | 'all'
type SortMode = 'date' | 'action'

interface CardLine {
  id: string
  date: string | null
  vendor: string
  amount: number
  status: string | null
  projectCode: string | null
  bankAccount: string | null
  direction?: 'debit' | 'credit'
}

interface MatchedRef {
  contactName: string | null
  date: string | null
  amount: number
  status?: string | null
  isReconciled?: boolean | null
  xeroId?: string | null // bill InvoiceID
  xeroTxnId?: string | null // BankTransactionID
}

interface LineResult {
  line: CardLine
  action: ReconcileAction
  matchedBill?: MatchedRef
  matchedTxn?: MatchedRef
  surcharge: number
  suggestedProject: string | null
  suggestedAccount: string | null
  receiptUrl: string | null
  receiptSignedUrl: string | null
  receiptIsImage: boolean
  fromDext: boolean
  note: string
  danger: boolean
  offsetLineId?: string
}

interface Summary {
  totalLines: number
  totalValue: number
  matchCount: number
  matchValue: number
  duplicateCount: number
  duplicateValue: number
  createCount: number
  createValue: number
  alreadyReconciledCount: number
  alreadyReconciledValue: number
  transferCount: number
  transferValue: number
  refundCount: number
  refundValue: number
  surchargeCount: number
  surchargeTotal: number
}

interface ReconcileResponse {
  window: { start: string; end: string; account: string }
  filters: { action: ActionFilter; q: string; minAmount: number; limit: number; sort?: SortMode }
  summary: Summary
  totalMatching: number
  results: LineResult[]
  projects: { code: string; name: string | null }[]
}

const ACTION_META: Record<ReconcileAction, { label: string; xeroVerb: string; icon: typeof Link2; chip: string; bar: string }> = {
  duplicate: { label: 'Duplicate', xeroVerb: 'Delete the duplicate card txn, match the bill', icon: Copy, chip: 'bg-red-400/15 text-red-100 border-red-400/30', bar: 'bg-red-400/70' },
  match_bill: { label: 'Match bill', xeroVerb: 'Match this bank line to the bill', icon: Link2, chip: 'bg-cyan-400/15 text-cyan-100 border-cyan-400/30', bar: 'bg-cyan-400/70' },
  approve_draft: { label: 'Approve draft', xeroVerb: 'Approve the draft bill, then match', icon: FileCheck2, chip: 'bg-amber-400/15 text-amber-100 border-amber-400/30', bar: 'bg-amber-400/70' },
  match_txn: { label: 'Match txn', xeroVerb: 'Match to the existing card txn', icon: Link2, chip: 'bg-sky-400/15 text-sky-100 border-sky-400/30', bar: 'bg-sky-400/70' },
  transfer: { label: 'Transfer', xeroVerb: 'Code as Transfer from ACT Everyday', icon: ArrowLeftRight, chip: 'bg-blue-400/15 text-blue-100 border-blue-400/30', bar: 'bg-blue-400/70' },
  refund: { label: 'Refund', xeroVerb: 'Offset the original charge / match a credit note', icon: Undo2, chip: 'bg-teal-400/15 text-teal-100 border-teal-400/30', bar: 'bg-teal-400/70' },
  already_reconciled: { label: 'Already in Xero', xeroVerb: 'Verify the existing entry — do NOT create', icon: CheckCheck, chip: 'bg-violet-400/15 text-violet-100 border-violet-400/30', bar: 'bg-violet-400/70' },
  create: { label: 'Create', xeroVerb: 'Create a coded transaction', icon: PlusCircle, chip: 'bg-emerald-400/15 text-emerald-100 border-emerald-400/30', bar: 'bg-emerald-400/70' },
}

function dateLabel(date: string | null): string {
  if (!date) return 'No date'
  return new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

const XERO_AP_SEARCH = 'https://go.xero.com/app/!/accounting/purchases/invoices'

async function fetchReconcile(params: { action: ActionFilter; q: string; minAmount: number; sort: SortMode }): Promise<ReconcileResponse> {
  const qs = new URLSearchParams()
  qs.set('action', params.action)
  qs.set('sort', params.sort)
  qs.set('limit', '400')
  if (params.q.trim()) qs.set('q', params.q.trim())
  if (params.minAmount > 0) qs.set('minAmount', String(params.minAmount))
  const res = await fetch(`/api/finance/reconcile?${qs.toString()}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load reconciliation cockpit')
  return data
}

// Copy the full Xero ID; show a short, scannable label. The reconcile screen matches on
// AMOUNT not date, so the exact ID is how Ben confirms he's on the right row.
function CopyId({ id, label }: { id: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(id)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      title={`Copy ${label} — ${id}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/55 transition hover:border-cyan-300/40 hover:text-white"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
      <span className="text-white/40">{label}</span>
      <span className="font-mono text-white/75">{id.slice(0, 8)}…</span>
    </button>
  )
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
        'rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/10',
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

function RefBadge({ label, ref: r }: { label: string; ref: MatchedRef }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className="mt-1 text-sm text-white/85">{r.contactName || 'Unknown contact'}</p>
      <p className="mt-0.5 text-xs text-white/45">
        {formatMoney(r.amount)} · {dateLabel(r.date)}
        {r.status ? ` · ${r.status}` : ''}
        {r.isReconciled === false ? ' · unreconciled' : ''}
      </p>
      {(r.xeroTxnId || r.xeroId) && (
        <div className="mt-2">
          {r.xeroTxnId ? (
            <CopyId id={r.xeroTxnId} label="BankTransactionID" />
          ) : (
            <CopyId id={r.xeroId!} label="Bill ID" />
          )}
        </div>
      )}
    </div>
  )
}

function LineCard({ r }: { r: LineResult }) {
  const meta = ACTION_META[r.action]
  const Icon = meta.icon
  const isCredit = r.line.direction === 'credit'
  return (
    <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className={cn('absolute inset-y-0 left-0 w-1', r.danger ? 'bg-red-500' : meta.bar)} />
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* LEFT — the bank line, as Xero shows it on the reconcile screen */}
        <div className="p-5 pl-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
            Bank line · {isCredit ? 'credit (money in)' : 'debit'}
          </p>
          <h3 className="mt-2 truncate text-lg font-semibold text-white">{r.line.vendor}</h3>
          <p className="mt-1 text-xs text-white/45">
            {dateLabel(r.line.date)}
            {r.line.projectCode ? ` · tagged ${r.line.projectCode}` : ' · untagged'}
          </p>
          <p className={cn('mt-3 text-2xl font-semibold tracking-tight', isCredit ? 'text-emerald-200' : 'text-white')}>
            {isCredit ? '+' : ''}
            {formatMoney(r.line.amount)}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-white/35">
            <Clock className="h-3 w-3" />
            mirror: {r.line.status || 'unreconciled'} — snapshot, confirm live in Xero
          </p>
        </div>

        {/* RIGHT — what to do in Xero */}
        <div className="border-t border-white/10 bg-white/[0.02] p-5 lg:border-l lg:border-t-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', meta.chip)}>
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </span>
            {r.danger && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-100">
                <ShieldAlert className="h-3.5 w-3.5" /> DANGER — real payment or phantom?
              </span>
            )}
            {Math.abs(r.surcharge) >= 0.005 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-100">
                ⚠️ surcharge {r.surcharge > 0 ? '+' : '−'}${Math.abs(r.surcharge).toFixed(2)}
              </span>
            )}
            {r.offsetLineId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-400/25 bg-teal-400/10 px-2.5 py-1 text-xs text-teal-100">
                ↔ offsets a charge
              </span>
            )}
            {r.fromDext && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-100">
                <Receipt className="h-3 w-3" /> receipt
              </span>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">In Xero</p>
            <p className="mt-1 text-sm font-medium leading-6 text-white/90">{meta.xeroVerb}</p>
            <p className="mt-1 text-sm leading-6 text-white/55">{r.note}</p>
          </div>

          {(r.suggestedProject || r.suggestedAccount) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {r.suggestedProject && (
                <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-white/70">
                  project: <span className="font-mono text-white/90">{r.suggestedProject}</span>
                </span>
              )}
              {r.suggestedAccount && (
                <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-white/70">
                  account: <span className="text-white/90">{r.suggestedAccount}</span>
                </span>
              )}
            </div>
          )}

          {(r.matchedBill || r.matchedTxn || r.receiptSignedUrl) && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {r.matchedBill && <RefBadge label="Xero bill" ref={r.matchedBill} />}
              {r.matchedTxn && <RefBadge label="Card txn" ref={r.matchedTxn} />}
              {r.receiptSignedUrl && (
                <a
                  href={r.receiptSignedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:border-emerald-300/40"
                >
                  {r.receiptIsImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.receiptSignedUrl} alt="receipt" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <Receipt className="h-6 w-6 text-emerald-200" />
                  )}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Receipt</p>
                    <p className="text-sm text-emerald-100 group-hover:underline">View {r.receiptIsImage ? 'image' : 'file'}</p>
                  </div>
                </a>
              )}
            </div>
          )}

          {(r.action === 'match_bill' || r.action === 'approve_draft' || r.action === 'duplicate' || r.action === 'already_reconciled') && (
            <a
              href={XERO_AP_SEARCH}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/60 transition hover:border-cyan-300/40 hover:text-white"
            >
              Open Xero bills <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default function ReconcileCockpitPage() {
  const [action, setAction] = useState<ActionFilter>('all')
  const [search, setSearch] = useState('')
  const [minAmount, setMinAmount] = useState(0)
  const [sort, setSort] = useState<SortMode>('date')
  const [dangerOnly, setDangerOnly] = useState(false)
  const deferredSearch = useDeferredValue(search)

  const query = useQuery({
    queryKey: ['finance', 'reconcile', action, deferredSearch, minAmount, sort],
    queryFn: () => fetchReconcile({ action, q: deferredSearch, minAmount, sort }),
  })

  const data = query.data
  const summary = data?.summary
  const allResults = data?.results || []
  const results = dangerOnly ? allResults.filter((r) => r.danger) : allResults
  const dangerCount = allResults.filter((r) => r.danger).length

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
              <ScanSearch className="h-3.5 w-3.5" />
              Reconciliation Cockpit
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl">
              Every NAB Visa line, beside your Xero screen.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-white/60">
              Read down in lockstep with Xero&apos;s reconcile screen (oldest-first). For each line the
              co-pilot says exactly what to do: match a bill (adding any card surcharge), kill a duplicate,
              code a Transfer for a card repayment, offset a refund, or create a coded transaction with the
              learned project and receipt image. You transcribe; you don&apos;t decide.
            </p>
          </div>

          <aside className="rounded-3xl border border-amber-300/20 bg-amber-500/[0.08] p-5">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
              <div>
                <h2 className="font-semibold text-amber-50">Read-only — the reconcile click stays in Xero</h2>
                <p className="mt-2 text-sm leading-6 text-amber-50/70">
                  The Xero API cannot set IsReconciled (Xero policy, 6 May 2026). Statuses here are a mirror
                  snapshot — the live state is always in Xero. <span className="font-semibold text-amber-50">DANGER</span> lines
                  match an AUTHORISED (unpaid) bill: a real payment or a phantom to void, so check each one.
                </p>
              </div>
            </div>
          </aside>
        </header>

        {summary && (
          <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="To reconcile"
              value={summary.totalLines.toLocaleString()}
              detail={`${formatMoney(summary.totalValue)} of unreconciled card lines`}
              icon={ScanSearch}
              active={action === 'all'}
              onClick={() => setAction('all')}
            />
            <StatCard
              title="Duplicates"
              value={summary.duplicateCount.toLocaleString()}
              detail={`${formatMoney(summary.duplicateValue)} double-counted — delete the card txn`}
              icon={Copy}
              active={action === 'duplicate'}
              onClick={() => setAction('duplicate')}
            />
            <StatCard
              title="Match to bill"
              value={summary.matchCount.toLocaleString()}
              detail={`${formatMoney(summary.matchValue)} have a bill/txn to match`}
              icon={Link2}
              active={action === 'match_bill'}
              onClick={() => setAction('match_bill')}
            />
            <StatCard
              title="Transfers"
              value={summary.transferCount.toLocaleString()}
              detail={`${formatMoney(summary.transferValue)} card repayments — code as Transfer, not income`}
              icon={ArrowLeftRight}
              active={action === 'transfer'}
              onClick={() => setAction('transfer')}
            />
            <StatCard
              title="Refunds"
              value={summary.refundCount.toLocaleString()}
              detail={`${formatMoney(summary.refundValue)} merchant credits — offset the charge`}
              icon={Undo2}
              active={action === 'refund'}
              onClick={() => setAction('refund')}
            />
            <StatCard
              title="Already in Xero"
              value={summary.alreadyReconciledCount.toLocaleString()}
              detail={`${formatMoney(summary.alreadyReconciledValue)} match a reconciled txn — verify, don't create`}
              icon={CheckCheck}
              active={action === 'already_reconciled'}
              onClick={() => setAction('already_reconciled')}
            />
            <StatCard
              title="Create"
              value={summary.createCount.toLocaleString()}
              detail={`${formatMoney(summary.createValue)} need a coded transaction`}
              icon={PlusCircle}
              active={action === 'create'}
              onClick={() => setAction('create')}
            />
            <StatCard
              title="Surcharges"
              value={summary.surchargeCount.toLocaleString()}
              detail={`${formatMoney(summary.surchargeTotal)} of card fees to add as Adjustments`}
              icon={ShieldAlert}
            />
          </section>
        )}

        <section className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <Search className="h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor, project, account…"
              className="w-64 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/60">
            <span className="text-white/40">min $</span>
            <input
              type="number"
              min={0}
              value={minAmount || ''}
              onChange={(e) => setMinAmount(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-20 bg-transparent text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>

          {/* Sort — date mirrors Xero's reconcile screen order (read down in lockstep) */}
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 text-sm">
            <button
              type="button"
              onClick={() => setSort('date')}
              className={cn('rounded-xl px-3 py-1.5 transition', sort === 'date' ? 'bg-cyan-300/15 text-white' : 'text-white/50 hover:text-white')}
            >
              Xero order
            </button>
            <button
              type="button"
              onClick={() => setSort('action')}
              className={cn('rounded-xl px-3 py-1.5 transition', sort === 'action' ? 'bg-cyan-300/15 text-white' : 'text-white/50 hover:text-white')}
            >
              By action
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDangerOnly((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm transition',
              dangerOnly
                ? 'border-red-400/50 bg-red-500/15 text-red-100'
                : 'border-white/10 text-white/55 hover:text-white'
            )}
          >
            <ShieldAlert className="h-4 w-4" />
            Danger only{dangerCount ? ` (${dangerCount})` : ''}
          </button>

          {action !== 'all' && (
            <button
              type="button"
              onClick={() => setAction('all')}
              className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/55 transition hover:text-white"
            >
              Clear action filter ({ACTION_META[action as ReconcileAction]?.label})
            </button>
          )}
          <span className="ml-auto text-sm text-white/45">
            {query.isFetching ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </span>
            ) : data ? (
              `${results.length} shown · ${data.totalMatching.toLocaleString()} matching`
            ) : null}
          </span>
        </section>

        {query.isError && (
          <div className="mt-8 rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">
            {(query.error as Error).message}
          </div>
        )}

        {data && results.length === 0 && !query.isFetching && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/50">
            {dangerOnly ? 'No DANGER lines in this view.' : 'No card lines match these filters.'}
          </div>
        )}

        <section className="mt-6 space-y-3 pb-16">
          {results.map((r) => (
            <LineCard key={r.line.id} r={r} />
          ))}
        </section>
      </div>
    </main>
  )
}
