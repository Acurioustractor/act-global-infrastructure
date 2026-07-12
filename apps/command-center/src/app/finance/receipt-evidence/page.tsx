'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Receipt,
  RefreshCw,
  Search,
  Upload,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance'

type Quarter = 'Q2' | 'Q3' | 'Q4' | 'Q1'

interface EvidenceCandidate {
  link_id: string
  document_id: string
  source: string
  source_record_id: string
  source_table?: string | null
  vendor_name: string | null
  document_number?: string | null
  document_date: string | null
  received_at: string | null
  amount_total: number | null
  attachment_filename: string | null
  attachment_content_type: string | null
  status: string
  link_status: string
  match_method: string
  confidence: number | null
  rank: number | null
  amount_delta: number | null
  date_delta_days: number | null
  xero_action: string
  xero_invoice_id?: string | null
  xero_bank_transaction_id?: string | null
  signed_url?: string | null
}

interface EvidenceRow {
  id: string
  date: string
  payee: string | null
  particulars: string | null
  reference: string | null
  amount: number
  status: string | null
  bank_account: string | null
  matched_xero_transaction_id: string | null
  xero_transaction_id: string | null
  project_code: string | null
  rd_eligible: boolean | null
  receipt_match_status: string | null
  candidate_count: number
  best_confidence: number | null
  best_source: string | null
  best_vendor_name: string | null
  evidence_status: string
  legacy_evidence_status?: string | null
  legacy_no_receipt_candidate?: boolean
  receipt_candidates: EvidenceCandidate[]
}

interface CalendarEvent {
  id: string
  title: string | null
  start_time: string
  end_time?: string | null
  location?: string | null
  relevance?: number
}

interface CalendarContext {
  count: number
  hint: string | null
  vendor_matched: CalendarEvent[]
  contextual: CalendarEvent[]
}

interface EvidenceResponse {
  quarter: Quarter
  dateStart: string
  dateEnd: string
  status: string
  rows: EvidenceRow[]
  count: number
  totalMatchingFilter: number
  stats: Record<string, number>
  error?: string
}

const STATUSES = [
  { value: 'needs_receipt', label: 'Need receipt' },
  { value: 'ready_to_review', label: 'Review candidates' },
  { value: 'high_confidence_candidate', label: 'High confidence' },
  { value: 'legacy_no_receipt_candidates', label: 'Small receipts found' },
  { value: 'candidate', label: 'Candidates' },
  { value: 'uncovered', label: 'Uncovered' },
  { value: 'covered_unreconciled', label: 'Covered, unreconciled' },
  { value: 'unreconciled', label: 'Xero mirror unreconciled' },
  { value: 'reconciled', label: 'Xero mirror reconciled' },
  { value: 'covered_evidence', label: 'Evidence covered' },
  { value: 'covered_legacy', label: 'Legacy covered' },
  { value: 'no_receipt_needed', label: 'No receipt needed' },
  { value: 'paper_on_file', label: 'Paper on file' },
  { value: 'lost', label: 'Lost (GST forfeited)' },
  { value: 'all', label: 'All' },
]

function pct(value: number | null | undefined) {
  if (!value) return '0%'
  return `${Math.round(value * 100)}%`
}

function statusLabel(value: string) {
  return value.replace(/_/g, ' ')
}

function statusClass(value: string) {
  if (value === 'covered_evidence' || value === 'covered_legacy' || value === 'no_receipt_needed' || value === 'paper_on_file') {
    return 'bg-emerald-500/10 text-emerald-300'
  }
  if (value === 'high_confidence_candidate') return 'bg-amber-500/10 text-amber-300'
  if (value === 'candidate') return 'bg-blue-500/10 text-blue-300'
  if (value === 'lost') return 'bg-slate-500/15 text-slate-300'
  return 'bg-red-500/10 text-red-300'
}

function sourceLabel(source: string) {
  return source.replace(/_/g, ' ')
}

function isImage(candidate: EvidenceCandidate) {
  const mime = candidate.attachment_content_type || ''
  const filename = candidate.attachment_filename || ''
  return mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|tiff?)$/i.test(filename)
}

function isPdf(candidate: EvidenceCandidate) {
  const mime = candidate.attachment_content_type || ''
  const filename = candidate.attachment_filename || ''
  return mime.includes('pdf') || /\.pdf$/i.test(filename)
}

function hasPreviewableFile(candidate: EvidenceCandidate) {
  return Boolean(candidate.signed_url && (isImage(candidate) || isPdf(candidate)))
}

function hasLinkedFile(candidate: EvidenceCandidate) {
  return Boolean(candidate.signed_url)
}

function isReceiptEvidenceCandidate(candidate: EvidenceCandidate) {
  const source = candidate.source || ''
  const sourceTable = candidate.source_table || ''
  return Boolean(
    candidate.signed_url ||
    candidate.xero_action === 'attach_file' ||
    source.includes('receipt') ||
    source.includes('dext') ||
    source.includes('xero_me') ||
    sourceTable === 'receipt_emails',
  )
}

function bestReceiptCandidate(candidates: EvidenceCandidate[]) {
  return candidates.find((candidate) => isReceiptEvidenceCandidate(candidate) && hasPreviewableFile(candidate))
    || candidates.find((candidate) => isReceiptEvidenceCandidate(candidate) && hasLinkedFile(candidate))
    || candidates.find(isReceiptEvidenceCandidate)
    || candidates.find(hasLinkedFile)
    || candidates[0]
    || null
}

function bestXeroCandidate(candidates: EvidenceCandidate[]) {
  return candidates.find((candidate) => candidate.source === 'xero_bill' && candidate.xero_invoice_id)
    || candidates.find((candidate) => Boolean(candidate.xero_invoice_id))
    || candidates.find((candidate) => candidate.source === 'xero_transaction' && candidate.xero_bank_transaction_id)
    || candidates.find((candidate) => Boolean(candidate.xero_bank_transaction_id))
    || candidates.find((candidate) => candidate.source.startsWith('xero_'))
    || null
}

function addDays(dateString: string, days: number) {
  const d = new Date(`${dateString}T00:00:00+10:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function gmailSearchUrl(row: EvidenceRow) {
  const vendor = (row.payee || row.best_vendor_name || '').replace(/["()]/g, ' ').trim()
  const after = addDays(row.date, -7).replace(/-/g, '/')
  const before = addDays(row.date, 8).replace(/-/g, '/')
  const query = `"${vendor}" (receipt OR invoice OR tax OR booking OR confirmation) after:${after} before:${before}`
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`
}

function xeroInvoiceUrl(id: string) {
  return `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${id}`
}

function xeroBankTransactionUrl(id: string) {
  return `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${id}`
}

function pdfPreviewUrl(candidate: EvidenceCandidate, dpi = 180) {
  if (!candidate.signed_url) return ''
  const params = new URLSearchParams({
    url: candidate.signed_url,
    page: '1',
    dpi: String(dpi),
  })
  return `/api/finance/receipt-evidence/pdf-preview?${params.toString()}`
}

function initialParam(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  return new URLSearchParams(window.location.search).get(name) || fallback
}

function xeroNextAction(row: EvidenceRow, candidate?: EvidenceCandidate | null, xeroCandidate?: EvidenceCandidate | null) {
  if (!candidate) {
    return {
      tone: 'missing',
      title: 'Find or upload a receipt first',
      body: 'No usable receipt candidate is linked to this bank line yet.',
      steps: ['Search Gmail', 'Check Dext/Xero Files', 'Upload a PDF/image here if you have it'],
      href: gmailSearchUrl(row),
      label: 'Search Gmail',
    }
  }

  const invoiceCandidate = candidate.xero_invoice_id
    ? candidate
    : xeroCandidate?.xero_invoice_id
      ? xeroCandidate
      : null

  if (invoiceCandidate?.xero_invoice_id) {
    return {
      tone: 'match',
      title: 'Receipt is already on a Xero bill',
      body: 'Best next step: open the bill, then use Xero bank reconciliation Find & Match to match this bank-feed line to that bill. No receipt upload needed first.',
      steps: [
        'Approve this evidence link here',
        'Open the Xero bill and confirm amount/vendor/date',
        'In Xero bank reconciliation, Find & Match this bank line to the bill',
      ],
      href: xeroInvoiceUrl(invoiceCandidate.xero_invoice_id),
      label: 'Open Xero bill',
    }
  }

  const bankTxnId = candidate.xero_bank_transaction_id
    || xeroCandidate?.xero_bank_transaction_id
    || row.xero_transaction_id
    || row.matched_xero_transaction_id
  if (bankTxnId && candidate.signed_url) {
    return {
      tone: 'attach',
      title: 'Receipt can be attached to Xero',
      body: 'This file is in our receipt store and we have a Xero bank transaction ID. Actual upload should stay approval-gated because it writes to Xero.',
      steps: [
        'Approve this evidence link here',
        'Queue/approve Xero attachment upload',
        'Reopen Xero and reconcile the bank-feed line',
      ],
      href: xeroBankTransactionUrl(bankTxnId),
      label: 'Open Xero bank txn',
    }
  }

  if (candidate.signed_url && candidate.xero_action === 'attach_file') {
    return {
      tone: 'attach_after_reconcile',
      title: 'Receipt is ready; Xero target is not linked yet',
      body: 'The receipt file is in our evidence store, but this mirror does not know the exact Xero transaction ID yet. Reconcile/create the transaction in Xero UI, rerun Xero sync, then the attachment step can be automated safely.',
      steps: [
        'Confirm this receipt image matches amount/vendor/date',
        'Approve this evidence link here',
        'Use Xero UI to reconcile/create the bank transaction, then rerun Xero sync',
      ],
      href: candidate.signed_url,
      label: 'Open receipt file',
    }
  }

  return {
    tone: 'review',
    title: 'Receipt found, Xero target unclear',
    body: 'The receipt looks useful, but this mirror does not yet know the exact Xero bank transaction to attach it to.',
    steps: [
      'Approve the receipt evidence if it is correct',
      'Use Xero Find & Match if there is a matching bill',
      'If Xero was changed manually, rerun the Xero sync before upload',
    ],
    href: candidate.signed_url || gmailSearchUrl(row),
    label: candidate.signed_url ? 'Open receipt file' : 'Search Gmail',
  }
}

function ReceiptPreview({
  candidate,
  maxHeightClass = 'max-h-[560px]',
  frameHeightClass = 'h-[560px]',
}: {
  candidate: EvidenceCandidate
  maxHeightClass?: string
  frameHeightClass?: string
}) {
  const [largeOpen, setLargeOpen] = useState(false)

  useEffect(() => {
    if (!largeOpen) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLargeOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [largeOpen])

  if (isImage(candidate) && candidate.signed_url) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLargeOpen(true)}
          className="group relative w-full cursor-zoom-in overflow-hidden rounded-xl border border-white/10 bg-white"
        >
          <img
            src={candidate.signed_url}
            alt={candidate.attachment_filename || 'Receipt preview'}
            className={cn(maxHeightClass, 'w-full select-none object-contain')}
            draggable={false}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
            Click to view large
          </div>
        </button>
        {largeOpen && <ReceiptLargeModal candidate={candidate} onClose={() => setLargeOpen(false)} />}
      </>
    )
  }

  if (isPdf(candidate) && candidate.signed_url) {
    const previewUrl = pdfPreviewUrl(candidate)
    return (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-3 py-2">
          <span className="truncate text-xs font-semibold text-slate-600">PDF receipt, page 1</span>
          <button
            type="button"
            onClick={() => setLargeOpen(true)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            View large
          </button>
        </div>
        <button
          type="button"
          onClick={() => setLargeOpen(true)}
          className="group block w-full bg-white"
        >
          <img
            src={previewUrl}
            alt={candidate.attachment_filename || 'Receipt PDF page 1 preview'}
            className={cn(frameHeightClass, 'mx-auto w-full object-contain')}
          />
          <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 group-hover:bg-cyan-50">
            Rendered preview. Click to view large.
          </div>
        </button>
        {largeOpen && <ReceiptLargeModal candidate={candidate} onClose={() => setLargeOpen(false)} />}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white p-5 text-sm text-slate-700">
      Preview unavailable for this file type. Open the file directly.
    </div>
  )
}

function ReceiptLargeModal({
  candidate,
  onClose,
}: {
  candidate: EvidenceCandidate
  onClose: () => void
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {candidate.attachment_filename || candidate.vendor_name || 'Receipt'}
            </p>
            <p className="mt-0.5 text-xs text-white/45">{sourceLabel(candidate.source)} · {candidate.document_date || 'unknown date'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/15"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 bg-white">
          {candidate.signed_url && isImage(candidate) ? (
            <div className="flex h-full items-center justify-center overflow-auto bg-slate-100 p-4">
              <img
                src={candidate.signed_url}
                alt={candidate.attachment_filename || 'Receipt large preview'}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : candidate.signed_url && isPdf(candidate) ? (
            <div className="h-full overflow-auto bg-slate-100 p-4">
              <img
                src={pdfPreviewUrl(candidate, 220)}
                alt={candidate.attachment_filename || 'Receipt PDF large preview'}
                className="mx-auto h-auto max-w-full rounded-lg bg-white shadow"
              />
            </div>
          ) : (
            <div className="p-6 text-sm text-slate-700">Preview unavailable for this file type.</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function BestReceiptPanel({
  row,
  candidate,
  xeroCandidate,
  onAction,
  busy,
}: {
  row: EvidenceRow
  candidate: EvidenceCandidate | null
  xeroCandidate: EvidenceCandidate | null
  onAction: (action: string, payload: Record<string, unknown>) => void
  busy: boolean
}) {
  const next = xeroNextAction(row, candidate, xeroCandidate)
  const confidence = candidate?.confidence || 0
  const evidenceApproved = candidate?.link_status === 'approved'
  const queueLabel = next.tone === 'match'
    ? 'Queue Find & Match'
    : next.tone === 'attach'
      ? 'Queue Xero upload'
      : 'Queue Xero follow-up'

  return (
    <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/[0.07] p-4 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cyan-100">Best receipt</p>
          <p className="mt-1 text-xs text-cyan-100/55">
            Confirm the image first, then approve the evidence and do the Xero step.
          </p>
          {candidate && (
            <p className="mt-1 truncate text-xs text-cyan-100/40">
              {sourceLabel(candidate.source)}
              {candidate.attachment_filename ? ` · ${candidate.attachment_filename}` : ''}
              {candidate.document_number ? ` · ${candidate.document_number}` : ''}
            </p>
          )}
          {candidate && xeroCandidate && xeroCandidate.link_id !== candidate.link_id && (
            <p className="mt-1 truncate text-xs text-cyan-100/35">
              Xero signal: {sourceLabel(xeroCandidate.source)} · {pct(xeroCandidate.confidence)}
              {xeroCandidate.document_number ? ` · ${xeroCandidate.document_number}` : ''}
            </p>
          )}
        </div>
        {candidate && (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
              confidence >= 0.85 ? 'bg-emerald-400/15 text-emerald-200' :
                confidence >= 0.65 ? 'bg-amber-400/15 text-amber-200' :
                  'bg-white/10 text-white/55',
            )}
          >
            {pct(confidence)}
          </span>
        )}
      </div>

      {candidate?.signed_url ? (
        <ReceiptPreview candidate={candidate} />
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 bg-black/25 p-5 text-sm text-white/45">
          No receipt preview is available yet. Search Gmail or upload a file below.
        </div>
      )}

      {candidate && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-cyan-100/35">Vendor</p>
            <p className="truncate text-cyan-50/80">{candidate.vendor_name || row.best_vendor_name || 'unknown'}</p>
          </div>
          <div>
            <p className="text-cyan-100/35">Amount</p>
            <p className="text-cyan-50/80">{candidate.amount_total ? formatMoney(Number(candidate.amount_total)) : 'unknown'}</p>
          </div>
          <div>
            <p className="text-cyan-100/35">Date delta</p>
            <p className="text-cyan-50/80">
              {candidate.date_delta_days !== null ? `${candidate.date_delta_days}d` : 'unknown'}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
        <p className="text-sm font-semibold text-white/90">Xero next step: {next.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{next.body}</p>
        <div className="mt-3 space-y-1 text-xs text-white/55">
          {next.steps.map((step, index) => (
            <p key={step}>{index + 1}. {step}</p>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {candidate && (
            <button
              disabled={busy || evidenceApproved}
              onClick={() => onAction('approve_link', { linkId: candidate.link_id, syncLegacy: true })}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {evidenceApproved ? 'Evidence approved' : 'Approve evidence'}
            </button>
          )}
          {candidate && !evidenceApproved && (
            <button
              disabled={busy}
              onClick={() => onAction('reject_link', {
                linkId: candidate.link_id,
                reviewOwner: 'Ben',
                reviewNote: 'Rejected from best receipt preview: wrong amount/date/vendor for this bank line.',
              })}
              className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" />
              Wrong receipt
            </button>
          )}
          {candidate && (
            <button
              disabled={busy}
              onClick={() => onAction('needs_review', {
                linkId: candidate.link_id,
                reviewOwner: 'Ben/Xero',
                reviewNote: `Queued from receipt evidence hub: ${next.title}`,
              })}
              className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-40"
            >
              <Link2 className="h-3.5 w-3.5" />
              {queueLabel}
            </button>
          )}
          <a
            href={next.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/15"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {next.label}
          </a>
        </div>
      </div>
    </div>
  )
}

function CandidateCard({
  row,
  candidate,
  showPreview,
  onAction,
  busy,
}: {
  row: EvidenceRow
  candidate: EvidenceCandidate
  showPreview: boolean
  onAction: (action: string, payload: Record<string, unknown>) => void
  busy: boolean
}) {
  const confidence = candidate.confidence || 0
  const [previewOpen, setPreviewOpen] = useState(showPreview)
  const canPreview = Boolean(candidate.signed_url)

  useEffect(() => {
    setPreviewOpen(showPreview)
  }, [showPreview, candidate.link_id])

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-lg bg-cyan-500/10 p-2">
          <Receipt className="h-4 w-4 text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/90">
                {candidate.vendor_name || row.best_vendor_name || 'Unknown document'}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {sourceLabel(candidate.source)} · {candidate.match_method} · {candidate.xero_action}
              </p>
            </div>
            <span
              className={cn(
                'rounded-full px-2 py-1 text-xs font-semibold tabular-nums',
                confidence >= 0.85 ? 'bg-emerald-500/15 text-emerald-300' :
                  confidence >= 0.65 ? 'bg-amber-500/15 text-amber-300' :
                    'bg-white/10 text-white/50',
              )}
            >
              {pct(confidence)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-white/30">Amount</p>
              <p className="text-white/70">{candidate.amount_total ? formatMoney(Number(candidate.amount_total)) : 'unknown'}</p>
            </div>
            <div>
              <p className="text-white/30">Date</p>
              <p className="text-white/70">{candidate.document_date || candidate.received_at?.slice(0, 10) || 'unknown'}</p>
            </div>
            <div>
              <p className="text-white/30">Delta</p>
              <p className="text-white/70">
                {candidate.amount_delta !== null ? formatMoney(Number(candidate.amount_delta)) : 'n/a'}
                {candidate.date_delta_days !== null ? ` · ${candidate.date_delta_days}d` : ''}
              </p>
            </div>
          </div>

          {candidate.attachment_filename && (
            <p className="mt-2 truncate text-xs text-white/35">{candidate.attachment_filename}</p>
          )}

          {previewOpen && candidate.signed_url && (
            <div className="mt-3">
              <ReceiptPreview
                candidate={candidate}
                maxHeightClass="max-h-[420px]"
                frameHeightClass="h-[420px]"
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {canPreview && (
              <button
                type="button"
                onClick={() => setPreviewOpen((current) => !current)}
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/15"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {previewOpen ? 'Hide receipt' : 'Show receipt'}
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => onAction('approve_link', { linkId: candidate.link_id, syncLegacy: true })}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve + mark covered
            </button>
            <button
              disabled={busy}
              onClick={() => onAction('reject_link', { linkId: candidate.link_id })}
              className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UploadBox({
  row,
  onUploaded,
}: {
  row: EvidenceRow
  onUploaded: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [vendorName, setVendorName] = useState(row.payee || '')
  const [amountTotal, setAmountTotal] = useState(String(Math.abs(Number(row.amount) || 0)))
  const [documentDate, setDocumentDate] = useState(row.date)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload() {
    if (!file) {
      setError('Choose a receipt file first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('bankLineId', row.id)
      form.set('vendorName', vendorName)
      form.set('amountTotal', amountTotal)
      form.set('documentDate', documentDate)
      form.set('reviewNote', 'Manual upload from receipt evidence hub')
      const res = await fetch('/api/finance/receipt-evidence', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setFile(null)
      onUploaded()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
        <Upload className="h-4 w-4 text-cyan-300" />
        Add receipt manually
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-white/80"
        />
        <input
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          placeholder="Vendor"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 outline-none focus:border-cyan-400/50"
        />
        <input
          value={amountTotal}
          onChange={(e) => setAmountTotal(e.target.value)}
          type="number"
          step="0.01"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 outline-none focus:border-cyan-400/50"
        />
        <input
          value={documentDate}
          onChange={(e) => setDocumentDate(e.target.value)}
          type="date"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 outline-none focus:border-cyan-400/50"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          disabled={busy || !file}
          onClick={upload}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload + link
        </button>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    </div>
  )
}

export default function ReceiptEvidencePage() {
  const [quarter, setQuarter] = useState<Quarter>(() => initialParam('quarter', 'Q2').toUpperCase() as Quarter)
  const [status, setStatus] = useState(() => initialParam('status', 'needs_receipt'))
  const [search, setSearch] = useState(() => initialParam('search', ''))
  const [data, setData] = useState<EvidenceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calendarContext, setCalendarContext] = useState<CalendarContext | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ quarter, status, limit: '300' })
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/finance/receipt-evidence?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load receipt evidence')
      setData(json)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [quarter, status])

  const rows = data?.rows || []
  const stats = data?.stats || {}
  const totalSpend = Number(stats.spend || 0)
  const covered = Number(stats.covered_evidence || 0) + Number(stats.covered_legacy || 0) + Number(stats.no_receipt_needed || 0) + Number(stats.paper_on_file || 0)
  const total = Number(stats.total || 0)
  const coveragePct = total ? Math.round((covered / total) * 100) : 0

  useEffect(() => {
    if (!rows.length) {
      if (expandedId) setExpandedId(null)
      return
    }

    if (!expandedId || !rows.some((row) => row.id === expandedId)) {
      setExpandedId(rows[0].id)
    }
  }, [rows, expandedId])

  const selected = useMemo(() => rows.find((row) => row.id === expandedId) || null, [rows, expandedId])
  const receiptCandidate = useMemo(
    () => bestReceiptCandidate(selected?.receipt_candidates || []),
    [selected],
  )
  const xeroCandidate = useMemo(
    () => bestXeroCandidate(selected?.receipt_candidates || []),
    [selected],
  )
  const xeroTargetLabel = selected?.xero_transaction_id || selected?.matched_xero_transaction_id
    ? 'transaction linked'
    : xeroCandidate?.xero_bank_transaction_id
      ? 'transaction candidate'
      : xeroCandidate?.xero_invoice_id
        ? 'bill candidate'
        : 'not linked'
  const hasXeroTarget = xeroTargetLabel !== 'not linked'

  useEffect(() => {
    if (!selected) {
      setCalendarContext(null)
      return
    }

    let cancelled = false
    async function loadCalendarContext() {
      setCalendarLoading(true)
      try {
        const vendor = encodeURIComponent(selected?.payee || selected?.best_vendor_name || '')
        const res = await fetch(`/api/receipts/calendar-context/${selected?.date}?vendor=${vendor}&days=7`)
        const json = await res.json()
        if (!cancelled) setCalendarContext(json)
      } catch {
        if (!cancelled) setCalendarContext(null)
      } finally {
        if (!cancelled) setCalendarLoading(false)
      }
    }

    loadCalendarContext()
    return () => {
      cancelled = true
    }
  }, [selected])

  async function action(actionName: string, payload: Record<string, unknown>) {
    const busyKey = String(payload.linkId || payload.bankLineId || actionName)
    setBusyId(busyKey)
    setError(null)
    try {
      const res = await fetch('/api/finance/receipt-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionName, ...payload }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/finance" className="mt-1 text-white/40 hover:text-white/70">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
              <FileSearch className="h-6 w-6 text-cyan-300" />
              Receipt Evidence Hub
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-white/50">
              One bank-line mirror across Gmail, Dext, Xero bills, Xero Me, Xero attachments, and manual uploads.
              This does not reconcile in Xero; it makes the evidence visible and linkable first.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/15 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </header>

      <section className="glass-card mb-6 p-4">
        <div className="grid gap-4 md:grid-cols-7">
          <div>
            <p className="text-xs text-white/35">Lines</p>
            <p className="mt-1 text-2xl font-bold text-white">{total}</p>
          </div>
          <div>
            <p className="text-xs text-white/35">Debit spend</p>
            <p className="mt-1 text-2xl font-bold text-white">{formatMoney(totalSpend)}</p>
          </div>
          <div>
            <p className="text-xs text-white/35">Evidence coverage</p>
            <p className={cn('mt-1 text-2xl font-bold', coveragePct >= 90 ? 'text-emerald-300' : 'text-amber-300')}>
              {coveragePct}%
            </p>
          </div>
          <div>
            <p className="text-xs text-white/35">High-confidence</p>
            <p className="mt-1 text-2xl font-bold text-cyan-300">{Number(stats.highConfidence || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-white/35">Xero mirror unreconciled</p>
            <p className="mt-1 text-2xl font-bold text-amber-300">{Number(stats.bankUnreconciled || 0)}</p>
          </div>
          <button
            type="button"
            onClick={() => { setStatus('legacy_no_receipt_candidates'); setExpandedId(null) }}
            className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-left hover:bg-cyan-500/15"
          >
            <p className="text-xs text-cyan-100/60">Small receipts found</p>
            <p className="mt-1 text-2xl font-bold text-cyan-100">{Number(stats.legacyNoReceiptCandidates || 0)}</p>
          </button>
          <div>
            <p className="text-xs text-white/35">Still uncovered</p>
            <p className="mt-1 text-2xl font-bold text-red-300">{Number(stats.uncovered || 0)}</p>
          </div>
        </div>
      </section>

      <section className="mb-5 grid gap-2 md:grid-cols-6">
        {[
          { value: 'needs_receipt', label: '1. Find missing receipts', hint: 'Uncovered + candidate lines' },
          { value: 'ready_to_review', label: '2. Review matches', hint: 'Approve or reject evidence' },
          { value: 'legacy_no_receipt_candidates', label: '3. Small receipts found', hint: 'Dext export/Gmail receipts hidden by old no-receipt labels' },
          { value: 'covered_unreconciled', label: '4. Covered but not reconciled', hint: 'Ready for Xero UI work' },
          { value: 'unreconciled', label: '5. Xero mirror unreconciled', hint: 'What the last Xero sync still shows open' },
          { value: 'all', label: 'All lines', hint: 'Full bank mirror' },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => { setStatus(item.value); setExpandedId(null) }}
            className={cn(
              'rounded-xl border p-3 text-left transition-colors',
              status === item.value
                ? 'border-cyan-400/40 bg-cyan-500/10'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
            )}
          >
            <p className="text-sm font-semibold text-white/85">{item.label}</p>
            <p className="mt-1 text-xs text-white/40">{item.hint}</p>
          </button>
        ))}
      </section>

      <section className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-white/5 p-1">
          {(['Q2', 'Q3', 'Q4', 'Q1'] as Quarter[]).map((q) => (
            <button
              key={q}
              onClick={() => { setQuarter(q); setExpandedId(null) }}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold',
                quarter === q ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70',
              )}
            >
              {q}
            </button>
          ))}
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setExpandedId(null) }}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/70 outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <Search className="h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load() }}
            placeholder="Search vendor, reference, particulars..."
            className="w-full bg-transparent text-sm text-white/80 outline-none placeholder:text-white/25"
          />
        </div>
      </section>

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="glass-card overflow-hidden">
          <div className="border-b border-white/10 px-5 py-3 text-sm text-white/50">
            Showing {rows.length} of {data?.totalMatchingFilter || 0} matching lines
          </div>

          {loading && !rows.length ? (
            <div className="p-12 text-center text-white/40">Loading evidence...</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-white/40">No rows for this filter.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {rows.map((row) => (
                <button
                  key={row.id}
                  onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  className={cn(
                    'grid w-full grid-cols-[110px_minmax(0,1fr)_100px_120px_130px_110px] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.04]',
                    expandedId === row.id && 'bg-cyan-500/[0.06]',
                  )}
                >
                  <div>
                    <p className="text-sm font-bold tabular-nums text-white">{formatMoney(Math.abs(Number(row.amount) || 0))}</p>
                    <p className="text-xs text-white/35">{row.date}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white/85">{row.payee || 'Unknown payee'}</p>
                    <p className="truncate text-xs text-white/35">{row.particulars || row.reference || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/35">Candidates</p>
                    <p className="text-sm font-semibold text-white/75">{row.candidate_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/35">Xero</p>
                    <span className={cn(
                      'mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      row.status === 'reconciled' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300',
                    )}>
                      {row.status || 'unknown'}
                    </span>
                  </div>
                  <span className={cn('w-fit rounded-full px-2 py-1 text-xs font-medium capitalize', statusClass(row.evidence_status))}>
                    {statusLabel(row.evidence_status)}
                  </span>
                  {row.legacy_no_receipt_candidate && (
                    <span className="w-fit rounded-full bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-200">
                      was no receipt needed
                    </span>
                  )}
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-cyan-200">{pct(row.best_confidence)}</p>
                    <p className="truncate text-xs text-white/35">{row.best_source ? sourceLabel(row.best_source) : 'no source'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="glass-card h-fit p-5">
          {!selected ? (
            <div className="py-12 text-center text-white/35">
              <Link2 className="mx-auto mb-3 h-8 w-8" />
              Select a bank line to review candidates or upload a receipt.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-white">{formatMoney(Math.abs(Number(selected.amount) || 0))}</p>
                    <p className="mt-1 text-sm text-white/80">{selected.payee || 'Unknown payee'}</p>
                    <p className="mt-1 text-xs text-white/40">{selected.date} · {selected.particulars || selected.reference || '-'}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className={cn('rounded-full px-2 py-1 text-xs font-medium capitalize', statusClass(selected.evidence_status))}>
                      {statusLabel(selected.evidence_status)}
                    </span>
                    {selected.legacy_no_receipt_candidate && (
                      <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-200">
                        legacy no-receipt, receipt candidate found
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={cn(
                    'rounded-full px-2 py-1 text-xs font-medium capitalize',
                    selected.status === 'reconciled' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300',
                  )}>
                    Xero mirror: {selected.status || 'unknown'}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-white/60">
                    Receipt: {selected.receipt_match_status || 'unknown'}
                  </span>
                  <span className={cn(
                    'rounded-full px-2 py-1 text-xs font-medium',
                    hasXeroTarget
                      ? 'bg-cyan-500/10 text-cyan-300'
                      : 'bg-white/10 text-white/45',
                  )}>
                    Xero target: {xeroTargetLabel}
                  </span>
                </div>

                <div className="mt-4">
                  <BestReceiptPanel
                    row={selected}
                    candidate={receiptCandidate}
                    xeroCandidate={xeroCandidate}
                    busy={receiptCandidate ? busyId === receiptCandidate.link_id : false}
                    onAction={action}
                  />
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <a
                    href={gmailSearchUrl(selected)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/15"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Search Gmail
                  </a>
                  <Link
                    href={`/finance/reconciliation?quarter=${quarter}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/15"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open receipt inbox
                  </Link>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    disabled={busyId === selected.id}
                    onClick={() => action('no_receipt_needed', { bankLineId: selected.id })}
                    className="inline-flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/15 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark no receipt needed
                  </button>
                  <button
                    disabled={busyId === selected.id}
                    onClick={() => action('paper_on_file', { bankLineId: selected.id })}
                    title="I physically hold this receipt — GST stays claimable. Stops re-surfacing."
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Paper — have it
                  </button>
                  <button
                    disabled={busyId === selected.id}
                    onClick={() => action('lost', { bankLineId: selected.id })}
                    title="No receipt recoverable — GST credit forfeited. Stops re-surfacing."
                    className="inline-flex items-center gap-1 rounded-md bg-slate-500/15 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-500/25 disabled:opacity-40"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Lost — GST forfeited
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                    <CalendarDays className="h-4 w-4 text-amber-300" />
                    Calendar context
                  </div>
                  {calendarLoading && <Loader2 className="h-4 w-4 animate-spin text-white/30" />}
                </div>
                {!calendarLoading && !calendarContext?.count ? (
                  <p className="text-xs text-white/40">
                    No synced calendar context found within 7 days. Use Gmail/vendor search, Dext, Xero Files, or manual upload next.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {calendarContext?.hint && <p className="text-xs text-amber-200/80">{calendarContext.hint}</p>}
                    {[...(calendarContext?.vendor_matched || []), ...(calendarContext?.contextual || [])].slice(0, 4).map((event) => (
                      <div key={event.id} className="rounded-lg bg-black/20 p-2">
                        <p className="truncate text-xs font-semibold text-white/75">{event.title || 'Calendar event'}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-white/40">
                          <MapPin className="h-3 w-3" />
                          {new Date(event.start_time).toLocaleString('en-AU', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                          {event.location ? ` · ${event.location}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-sm font-semibold text-cyan-100">Where to look next</p>
                <div className="mt-2 space-y-1 text-xs text-cyan-100/70">
                  <p>1. Use the top receipt preview as the source of truth for amount/date/vendor.</p>
                  <p>2. Approve correct evidence, or reject bad matches so they stop confusing the queue.</p>
                  <p>3. If Xero mirror is unreconciled, use Xero UI Find & Match or reconcile/create the transaction next.</p>
                  <p>4. After Xero sync exposes a bill/transaction ID, attachment upload can be batched with approval.</p>
                </div>
              </div>

              <div className="space-y-3">
                {selected.receipt_candidates.length > 0 ? (
                  selected.receipt_candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.link_id}
                      row={selected}
                      candidate={candidate}
                      showPreview={false}
                      busy={busyId === candidate.link_id}
                      onAction={action}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/40">
                    No candidate receipts found yet.
                  </div>
                )}
              </div>

              <UploadBox row={selected} onUploaded={load} />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
