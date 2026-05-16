'use client'

import { startTransition, useDeferredValue, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  FlaskConical,
  Loader2,
  RefreshCcw,
  Receipt,
  Search,
  Tags,
  Upload,
  X,
} from 'lucide-react'
import { formatMoney } from '@/lib/finance/format'
import { cn } from '@/lib/utils'

type SourceFilter = 'all' | 'bank_lines' | 'xero_transactions' | 'xero_invoices'
type DirectionFilter = 'all' | 'spend' | 'income'
type StatusFilter =
  | 'needs_action'
  | 'xero_drafts'
  | 'receipt_gap'
  | 'candidate_receipts'
  | 'no_receipt_needed'
  | 'needs_project'
  | 'project_review'
  | 'unreconciled'
  | 'rd_review'
  | 'all'

interface ProjectOption {
  code: string
  name: string | null
  tier: string | null
  status: string | null
}

interface WorkbenchItem {
  id: string
  source: Exclude<SourceFilter, 'all'>
  direction: 'spend' | 'income'
  date: string | null
  vendor: string
  description: string | null
  amount: number
  xeroStatus: string | null
  isReconciled: boolean | null
  projectCode: string | null
  projectSource: string | null
  hasReceipt: boolean
  receiptState: string
  receiptSignal: string | null
  candidateCount: number
  confidence: number | null
  rdEligible: boolean | null
  rdCategory: string | null
  needsProject: boolean
  needsProjectReview: boolean
  needsReceipt: boolean
  needsReconciliation: boolean
  needsXeroDraft: boolean
  xeroDraftHint: string | null
  needsRdReview: boolean
  xeroReference: string | null
  receiptEvidenceUrl: string
}

interface WorkbenchResponse {
  fy: { start: string; end: string }
  filters: {
    source: SourceFilter
    direction: DirectionFilter
    status: StatusFilter
    project: string
    q: string
    limit: number
  }
  summary: {
    bankLines: number
    receiptGaps: number
    receiptGapValue: number
    candidateReceipts: number
    xeroDraftCandidates: number
    xeroDraftCandidateValue: number
    unreconciledBankLines: number
    unreconciledValue: number
    bankProjectGaps: number
    xeroProjectGaps: number
    invoiceProjectGaps: number
    actInReview: number
    rdReview: number
    rdEligibleSpend: number
  }
  projects: ProjectOption[]
  totalMatching: number
  items: WorkbenchItem[]
}

const sourceOptions: Array<{ value: SourceFilter; label: string }> = [
  { value: 'bank_lines', label: 'Bank lines' },
  { value: 'xero_transactions', label: 'Xero txns' },
  { value: 'xero_invoices', label: 'Xero invoices' },
  { value: 'all', label: 'All mirrors' },
]

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'needs_action', label: 'Needs action' },
  { value: 'xero_drafts', label: 'Xero draft assist' },
  { value: 'receipt_gap', label: 'Receipt gaps' },
  { value: 'candidate_receipts', label: 'Receipt candidates' },
  { value: 'no_receipt_needed', label: 'No receipt needed' },
  { value: 'needs_project', label: 'No project' },
  { value: 'project_review', label: 'Review ACT-IN' },
  { value: 'unreconciled', label: 'Unreconciled' },
  { value: 'rd_review', label: 'R&D review' },
  { value: 'all', label: 'All rows' },
]

const directionOptions: Array<{ value: DirectionFilter; label: string }> = [
  { value: 'all', label: 'In + out' },
  { value: 'spend', label: 'Outgoing' },
  { value: 'income', label: 'Incoming' },
]

const rdOptions = [
  { value: 'none', label: 'Not R&D' },
  { value: 'review', label: 'Review' },
  { value: 'supporting', label: 'R&D supporting' },
  { value: 'core', label: 'R&D core' },
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

function sourceLabel(source: WorkbenchItem['source']): string {
  if (source === 'bank_lines') return 'Bank line'
  if (source === 'xero_transactions') return 'Xero txn'
  return 'Xero invoice'
}

function receiptLabel(item: WorkbenchItem): string {
  if (item.hasReceipt) return 'Receipt linked'
  if (item.receiptState === 'no_receipt_needed') return 'No receipt needed'
  if (item.receiptState === 'low_value_no_file') return 'Low value no file'
  if (item.receiptState === 'transfer') return 'Transfer'
  if (item.needsReceipt) return 'Needs receipt'
  return item.receiptState.replaceAll('_', ' ')
}

function rdValue(item: WorkbenchItem): string {
  if (item.rdCategory === 'core' || item.rdCategory === 'supporting' || item.rdCategory === 'review') {
    return item.rdCategory
  }
  if (item.rdEligible) return 'supporting'
  return 'none'
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
        'rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/10',
        active && 'border-cyan-400/50 bg-cyan-400/10'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-cyan-300" />
      </div>
      <p className="mt-2 text-xs text-white/50">{detail}</p>
    </button>
  )
}

async function fetchWorkbench(params: {
  source: SourceFilter
  status: StatusFilter
  direction: DirectionFilter
  project: string
  q: string
}): Promise<WorkbenchResponse> {
  const qs = new URLSearchParams()
  qs.set('source', params.source)
  qs.set('status', params.status)
  qs.set('direction', params.direction)
  qs.set('project', params.project)
  qs.set('limit', '300')
  if (params.q.trim()) qs.set('q', params.q.trim())

  const res = await fetch(`/api/finance/workbench?${qs.toString()}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load finance workbench')
  return data
}

export default function FinanceWorkbenchPage() {
  const queryClient = useQueryClient()
  const [source, setSource] = useState<SourceFilter>(() => initialOption('source', sourceOptions, 'bank_lines'))
  const [status, setStatus] = useState<StatusFilter>(() => initialOption('status', statusOptions, 'needs_action'))
  const [direction, setDirection] = useState<DirectionFilter>(() => initialOption('direction', directionOptions, 'all'))
  const [project, setProject] = useState(() => initialParam('project', 'all'))
  const [search, setSearch] = useState(() => initialParam('q'))
  const deferredSearch = useDeferredValue(search)
  const [pendingProjects, setPendingProjects] = useState<Record<string, string>>({})
  const [pendingRd, setPendingRd] = useState<Record<string, string>>({})
  const [uploadTarget, setUploadTarget] = useState<WorkbenchItem | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadVendor, setUploadVendor] = useState('')
  const [uploadAmount, setUploadAmount] = useState('')
  const [uploadDate, setUploadDate] = useState('')
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadDragging, setUploadDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['finance', 'workbench', source, status, direction, project, deferredSearch],
    queryFn: () => fetchWorkbench({ source, status, direction, project, q: deferredSearch }),
  })

  const mutation = useMutation({
    mutationFn: async (payload: { id: string; source: WorkbenchItem['source']; projectCode?: string; rdCategory?: string }) => {
      const res = await fetch('/api/finance/workbench', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save row')
      return data
    },
    onSuccess: () => {
      setPendingProjects({})
      setPendingRd({})
      queryClient.invalidateQueries({ queryKey: ['finance', 'workbench'] })
    },
  })

  const data = query.data
  const projects = data?.projects || []
  const rows = data?.items || []
  const summary = data?.summary

  function selectUploadTarget(item: WorkbenchItem) {
    setUploadTarget(item)
    setUploadVendor(item.vendor)
    setUploadAmount(item.amount ? String(item.amount) : '')
    setUploadDate(item.date || '')
    setUploadError(null)
    setUploadMessage(null)
  }

  function clearUploadTarget() {
    setUploadTarget(null)
    setUploadVendor('')
    setUploadAmount('')
    setUploadDate('')
  }

  function addUploadFiles(files: FileList | File[]) {
    const next = Array.from(files).filter((file) => file.size > 0)
    if (!next.length) return
    setUploadFiles((current) => [...current, ...next])
    setUploadError(null)
    setUploadMessage(null)
  }

  async function uploadReceipts() {
    if (!uploadFiles.length) {
      setUploadError('Drop or choose at least one receipt file first.')
      return
    }

    setUploadBusy(true)
    setUploadError(null)
    setUploadMessage(null)

    try {
      for (const file of uploadFiles) {
        const form = new FormData()
        form.set('file', file)
        if (uploadTarget?.source === 'bank_lines') {
          form.set('bankLineId', uploadTarget.id)
        }
        if (uploadVendor.trim()) form.set('vendorName', uploadVendor.trim())
        if (uploadAmount.trim()) form.set('amountTotal', uploadAmount.trim())
        if (uploadDate) form.set('documentDate', uploadDate)
        form.set('reviewNote', uploadTarget
          ? `Manual upload from finance workbench for ${uploadTarget.vendor}`
          : 'Manual unlinked upload from finance workbench')

        const res = await fetch('/api/finance/receipt-evidence', { method: 'POST', body: form })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || `Upload failed for ${file.name}`)
      }

      setUploadFiles([])
      setUploadMessage(uploadTarget?.source === 'bank_lines'
        ? 'Receipt uploaded and linked to the selected bank line.'
        : 'Receipt uploaded as an unlinked candidate for later matching.')
      queryClient.invalidateQueries({ queryKey: ['finance', 'workbench'] })
    } catch (error) {
      setUploadError((error as Error).message)
    } finally {
      setUploadBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#070b10] text-white">
      <div className="mx-auto max-w-[1500px] px-6 py-8">
        <Link href="/finance" className="mb-6 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Finance
        </Link>

        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">Finance Workbench</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Receipts, projects, income, outgoing</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
              Use bank lines for receipt coverage, then switch to Xero transactions or invoices for project realignment.
              Saves are single-row only: no broad vendor rule updates from this surface.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Source of truth for spend receipt coverage: <span className="font-semibold">bank statement lines</span>.
          </div>
        </header>

        {summary && (
          <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              title="Receipt gaps"
              value={summary.receiptGaps.toLocaleString()}
              detail={`${formatMoney(summary.receiptGapValue)} bank-line spend without final evidence`}
              icon={Receipt}
              active={status === 'receipt_gap'}
              onClick={() => {
                setSource('bank_lines')
                setStatus('receipt_gap')
              }}
            />
            <StatCard
              title="Candidates"
              value={summary.candidateReceipts.toLocaleString()}
              detail="Likely files to approve or reject"
              icon={CheckCircle2}
              active={status === 'candidate_receipts'}
              onClick={() => {
                setSource('bank_lines')
                setStatus('candidate_receipts')
              }}
            />
            <StatCard
              title="Draft assist"
              value={summary.xeroDraftCandidates.toLocaleString()}
              detail={`${formatMoney(summary.xeroDraftCandidateValue)} missing mirrored Xero target`}
              icon={FileText}
              active={status === 'xero_drafts'}
              onClick={() => {
                setSource('bank_lines')
                setDirection('spend')
                setStatus('xero_drafts')
              }}
            />
            <StatCard
              title="Unreconciled"
              value={summary.unreconciledBankLines.toLocaleString()}
              detail={`${formatMoney(summary.unreconciledValue)} in bank mirror queue`}
              icon={AlertTriangle}
              active={status === 'unreconciled'}
              onClick={() => {
                setSource('bank_lines')
                setStatus('unreconciled')
              }}
            />
            <StatCard
              title="Project gaps"
              value={(summary.bankProjectGaps + summary.xeroProjectGaps + summary.invoiceProjectGaps).toLocaleString()}
              detail="Rows without a project code across mirrors"
              icon={Tags}
              active={status === 'needs_project'}
              onClick={() => setStatus('needs_project')}
            />
            <StatCard
              title="R&D review"
              value={summary.rdReview.toLocaleString()}
              detail={`${formatMoney(summary.rdEligibleSpend)} currently marked eligible`}
              icon={FlaskConical}
              active={status === 'rd_review'}
              onClick={() => {
                setSource('xero_transactions')
                setStatus('rd_review')
              }}
            />
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_210px_160px_220px_1fr_auto]">
            <label className="space-y-1">
              <span className="text-xs text-white/40">Source</span>
              <select value={source} onChange={(e) => setSource(e.target.value as SourceFilter)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-white/40">Queue</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-white/40">Direction</span>
              <select value={direction} onChange={(e) => setDirection(e.target.value as DirectionFilter)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                {directionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-white/40">Project</span>
              <select value={project} onChange={(e) => setProject(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                <option value="all">All projects</option>
                <option value="__blank__">No project</option>
                {projects.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} · {p.name || 'Unnamed'}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-white/40">Search</span>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <Search className="h-4 w-4 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => startTransition(() => setSearch(e.target.value))}
                  placeholder="Vendor, reference, project..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                />
              </div>
            </label>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <RefreshCcw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </section>

        {status === 'xero_drafts' && (
          <section className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Xero draft assist</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Approve the hidden draft, then reconcile the bank line.</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">
                  These are unreconciled spend lines where our mirror has no Xero accounting target yet. Use the row amount/date/vendor plus project/R&D tag while approving Xero Expenses drafts. This page only updates ACT/Supabase mirror context, not Xero accounting state.
                </p>
              </div>
              <a
                href="https://go.xero.com/app/expenses"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20"
              >
                Open Xero Expenses
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </section>
        )}

        <section className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4 xl:grid-cols-[1fr_420px]">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setUploadDragging(true)
            }}
            onDragLeave={() => setUploadDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setUploadDragging(false)
              addUploadFiles(e.dataTransfer.files)
            }}
            className={cn(
              'flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/30 bg-black/25 px-5 py-6 text-center transition',
              uploadDragging && 'border-cyan-200 bg-cyan-300/10'
            )}
          >
            <Upload className="h-8 w-8 text-cyan-200" />
            <h2 className="mt-3 text-base font-semibold text-white">Drop receipts here</h2>
            <p className="mt-1 max-w-xl text-sm text-white/55">
              Select a bank-line row first to attach directly. If no row is selected, the file is saved as an unlinked receipt candidate.
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/15 hover:text-white">
              <FileText className="h-4 w-4" />
              Choose files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addUploadFiles(e.target.files)
                  e.currentTarget.value = ''
                }}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">Upload target</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {uploadTarget ? uploadTarget.vendor : 'No row selected'}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {uploadTarget?.source === 'bank_lines'
                    ? `${dateLabel(uploadTarget.date)} · ${formatMoney(uploadTarget.amount)} · links to bank line`
                    : 'Upload will be saved as an unlinked candidate.'}
                </p>
              </div>
              {uploadTarget && (
                <button
                  type="button"
                  onClick={clearUploadTarget}
                  className="rounded-lg border border-white/10 p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
                  aria-label="Clear upload target"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                value={uploadVendor}
                onChange={(e) => setUploadVendor(e.target.value)}
                placeholder="Vendor"
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/50"
              />
              <input
                value={uploadAmount}
                onChange={(e) => setUploadAmount(e.target.value)}
                placeholder="Amount"
                type="number"
                step="0.01"
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/50"
              />
              <input
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                type="date"
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
              />
            </div>

            {uploadFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {uploadFiles.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/65">
                    {file.name}
                    <button
                      type="button"
                      onClick={() => setUploadFiles((current) => current.filter((_, i) => i !== index))}
                      className="text-white/40 hover:text-white"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={uploadBusy || uploadFiles.length === 0}
                onClick={uploadReceipts}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload receipt
              </button>
              {uploadError && <p className="text-xs text-red-300">{uploadError}</p>}
              {uploadMessage && <p className="text-xs text-emerald-300">{uploadMessage}</p>}
            </div>
          </div>
        </section>

        {query.error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {(query.error as Error).message}
          </div>
        )}

        {mutation.error && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {(mutation.error as Error).message}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm text-white/55">
              Showing <span className="font-semibold text-white">{rows.length.toLocaleString()}</span>
              {data ? ` of ${data.totalMatching.toLocaleString()} matching rows` : ''}.
            </p>
            <p className="text-xs text-white/35">Project changes save to Supabase mirrors only. Xero accounting state is not changed here.</p>
          </div>

          <div className="max-h-[760px] overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#101722] text-left text-xs uppercase tracking-[0.18em] text-white/35">
                <tr>
                  <th className="px-4 py-3">Money line</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Xero</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">R&D</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-white/45">Loading finance workbench...</td>
                  </tr>
                )}

                {!query.isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-white/45">No rows match these filters.</td>
                  </tr>
                )}

                {rows.map((item) => {
                  const key = `${item.source}:${item.id}`
                  const selectedProject = pendingProjects[key] ?? item.projectCode ?? ''
                  const selectedRd = pendingRd[key] ?? rdValue(item)
                  const projectChanged = selectedProject !== (item.projectCode ?? '')
                  const rdChanged = selectedRd !== rdValue(item)
                  const canEditRd = item.source !== 'xero_invoices'
                  const canSave = projectChanged || (canEditRd && rdChanged)

                  return (
                    <tr key={key} className="border-b border-white/5 align-top transition hover:bg-white/[0.035]">
                      <td className="max-w-[360px] px-4 py-4">
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              'mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              item.direction === 'income' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-orange-400/15 text-orange-200'
                            )}
                          >
                            {item.direction}
                          </span>
                          <div>
                            <p className="font-medium text-white">{item.vendor}</p>
                            <p className="mt-1 text-xs text-white/45">{dateLabel(item.date)} · {sourceLabel(item.source)}</p>
                            {item.description && <p className="mt-1 line-clamp-2 text-xs text-white/40">{item.description}</p>}
                            {item.xeroReference && <p className="mt-1 text-[11px] text-white/30">Ref {item.xeroReference}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">{formatMoney(item.amount)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-1 text-xs',
                            item.hasReceipt && 'bg-emerald-400/15 text-emerald-200',
                            !item.hasReceipt && item.needsReceipt && 'bg-red-400/15 text-red-200',
                            !item.hasReceipt && !item.needsReceipt && 'bg-white/10 text-white/50'
                          )}
                        >
                          {receiptLabel(item)}
                        </span>
                        {(item.candidateCount > 0 || item.confidence != null) && (
                          <p className="mt-1 text-[11px] text-white/35">
                            {item.candidateCount > 0 ? `${item.candidateCount} candidate${item.candidateCount === 1 ? '' : 's'}` : ''}
                            {item.confidence != null ? ` · ${Math.round(item.confidence)}%` : ''}
                          </p>
                        )}
                        {item.receiptSignal && <p className="mt-1 text-[11px] text-white/30">{item.receiptSignal}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-1 text-xs',
                            item.isReconciled === true && 'bg-emerald-400/15 text-emerald-200',
                            item.isReconciled === false && 'bg-amber-400/15 text-amber-100',
                            item.isReconciled == null && 'bg-white/10 text-white/45'
                          )}
                        >
                          {item.isReconciled === true ? 'Reconciled' : item.isReconciled === false ? 'Unreconciled' : item.xeroStatus || 'Unknown'}
                        </span>
                        {item.xeroStatus && <p className="mt-1 text-[11px] text-white/35">{item.xeroStatus}</p>}
                        {item.needsXeroDraft && (
                          <p className="mt-2 max-w-[220px] rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[11px] leading-4 text-cyan-100/75">
                            {item.xeroDraftHint || 'Missing mirrored Xero target'}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={selectedProject}
                          onChange={(e) => setPendingProjects((current) => ({ ...current, [key]: e.target.value }))}
                          className={cn(
                            'w-56 rounded-lg border bg-black/30 px-2 py-2 text-xs text-white outline-none',
                            item.needsProject ? 'border-red-400/40' : item.needsProjectReview ? 'border-amber-400/40' : 'border-white/10'
                          )}
                        >
                          <option value="">No project</option>
                          {projects.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.code} · {p.name || 'Unnamed'}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[11px] text-white/35">
                          {item.projectSource || 'no source'}
                          {item.needsProjectReview ? ' · review broad tag' : ''}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {canEditRd ? (
                          <select
                            value={selectedRd}
                            onChange={(e) => setPendingRd((current) => ({ ...current, [key]: e.target.value }))}
                            className={cn(
                              'w-36 rounded-lg border bg-black/30 px-2 py-2 text-xs text-white outline-none',
                              item.needsRdReview ? 'border-amber-400/40' : 'border-white/10'
                            )}
                          >
                            {rdOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-white/35">Invoice</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!canSave || mutation.isPending}
                            onClick={() => {
                              const payload: { id: string; source: WorkbenchItem['source']; projectCode?: string; rdCategory?: string } = {
                                id: item.id,
                                source: item.source,
                              }
                              if (projectChanged) payload.projectCode = selectedProject
                              if (canEditRd && rdChanged) payload.rdCategory = selectedRd
                              mutation.mutate(payload)
                            }}
                            className="rounded-lg bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            Save row
                          </button>
                          <Link
                            href={item.receiptEvidenceUrl}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 transition hover:bg-white/10 hover:text-white"
                          >
                            Receipt
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          {item.needsXeroDraft && (
                            <a
                              href="https://go.xero.com/app/expenses"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/20 px-3 py-2 text-xs text-cyan-100/75 transition hover:bg-cyan-300/10 hover:text-cyan-50"
                            >
                              Xero drafts
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {item.source === 'bank_lines' && (
                            <button
                              type="button"
                              onClick={() => selectUploadTarget(item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/20 px-3 py-2 text-xs text-cyan-100/75 transition hover:bg-cyan-300/10 hover:text-cyan-50"
                            >
                              Upload
                              <Upload className="h-3 w-3" />
                            </button>
                          )}
                          {item.projectCode && (
                            <Link
                              href={`/finance/projects/${item.projectCode}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 transition hover:bg-white/10 hover:text-white"
                            >
                              Project
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
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
