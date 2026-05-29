'use client'

import { Paperclip, Check, X, CircleDashed } from 'lucide-react'
import { cn } from '@/lib/utils'

// Trust primitive (plan 2026-05-29 P1): "see for certain when receipts are
// connected in Xero." Reads straight from xero_transactions.has_attachments /
// xero_invoices.has_attachments — the authoritative source, not a guess.
//
// Three states:
//   ✓  attached      — has_attachments === true   (receipt is in Xero)
//   ✗  missing       — has_attachments === false  (no receipt attached in Xero)
//   ◌  pipeline-only — row isn't in Xero yet (forecast/pipeline) or unknown

type ReceiptState = 'attached' | 'missing' | 'pipeline-only' | 'unknown'

function resolveState(hasAttachment: boolean | null | undefined, pipelineOnly?: boolean): ReceiptState {
  if (pipelineOnly) return 'pipeline-only'
  if (hasAttachment === true) return 'attached'
  if (hasAttachment === false) return 'missing'
  return 'unknown'
}

const CONFIG: Record<ReceiptState, { label: string; wrap: string; Icon: typeof Check }> = {
  attached: { label: 'Receipt in Xero', wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: Check },
  missing: { label: 'No receipt', wrap: 'bg-red-50 text-red-700 border-red-200', Icon: X },
  'pipeline-only': { label: 'Pipeline-only', wrap: 'bg-gray-50 text-gray-500 border-gray-200', Icon: CircleDashed },
  unknown: { label: 'Unknown', wrap: 'bg-gray-50 text-gray-400 border-gray-200', Icon: Paperclip },
}

export function ReceiptInXero({
  hasAttachment,
  pipelineOnly,
  variant = 'icon',
  className,
}: {
  hasAttachment: boolean | null | undefined
  /** Row exists only in pipeline/forecast, not yet pushed to Xero. */
  pipelineOnly?: boolean
  /** `icon` = badge with just the glyph (table cells); `full` = glyph + label. */
  variant?: 'icon' | 'full'
  className?: string
}) {
  const state = resolveState(hasAttachment, pipelineOnly)
  const { label, wrap, Icon } = CONFIG[state]

  if (variant === 'icon') {
    return (
      <span
        title={label}
        aria-label={label}
        className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full border', wrap, className)}
      >
        <Icon className="h-3 w-3" />
      </span>
    )
  }

  return (
    <span
      title={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        wrap,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
