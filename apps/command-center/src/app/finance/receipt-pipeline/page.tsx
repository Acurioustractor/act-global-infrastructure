'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  FileWarning,
  Send,
  CheckCircle2,
  FileCheck,
  Receipt,
  AlertTriangle,
  Calendar,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
} from 'lucide-react'
import {
  getReceiptPipeline,
  getReceiptCalendarContext,
  type PipelineFunnelStage,
  type PipelineItem,
} from '@/lib/api'
import { cn } from '@/lib/utils'

const STAGE_CONFIG: Record<string, {
  icon: typeof FileWarning
  color: string
  bg: string
  description: string
}> = {
  missing_receipt: {
    icon: FileWarning,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    description: 'No receipt found — needs action',
  },
  forwarded_to_dext: {
    icon: Send,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    description: 'Email forwarded to Dext — waiting for processing',
  },
  dext_processed: {
    icon: FileCheck,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    description: 'Dext pushed attachment to Xero',
  },
  xero_bill_created: {
    icon: Receipt,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    description: 'Bill created in Xero',
  },
  reconciled: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    description: 'Fully reconciled',
  },
}

function FunnelBar({ stages }: { stages: PipelineFunnelStage[] }) {
  const total = stages.reduce((sum, s) => sum + s.count, 0)
  if (total === 0) return <div className="text-zinc-500 text-sm">No pipeline data yet. Run the correlation script first.</div>

  return (
    <div className="space-y-2">
      <div className="flex h-8 rounded-lg overflow-hidden">
        {stages.map(s => {
          const config = STAGE_CONFIG[s.stage]
          const pct = (s.count / total) * 100
          if (pct === 0) return null
          return (
            <div
              key={s.stage}
              className={cn('flex items-center justify-center text-xs font-medium', config?.bg)}
              style={{ width: `${pct}%`, minWidth: pct > 3 ? undefined : '24px' }}
              title={`${s.label}: ${s.count} ($${s.total_amount.toLocaleString()})`}
            >
              {pct > 8 && <span className={config?.color}>{s.count}</span>}
            </div>
          )
        })}
      </div>
      <div className="flex gap-4 flex-wrap text-xs">
        {stages.map(s => {
          const config = STAGE_CONFIG[s.stage]
          return (
            <div key={s.stage} className="flex items-center gap-1.5">
              <div className={cn('w-2 h-2 rounded-full', config?.bg)} />
              <span className="text-zinc-400">{s.label}:</span>
              <span className="text-zinc-200 font-medium">{s.count}</span>
              <span className="text-zinc-500">(${s.total_amount.toLocaleString()})</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StageCard({ stage, isExpanded, onToggle, items }: {
  stage: PipelineFunnelStage
  isExpanded: boolean
  onToggle: () => void
  items: PipelineItem[]
}) {
  const config = STAGE_CONFIG[stage.stage]
  const Icon = config?.icon || FileWarning

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', config?.bg)}>
            <Icon className={cn('w-4 h-4', config?.color)} />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-zinc-200">{stage.label}</div>
            <div className="text-xs text-zinc-500">{config?.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium text-zinc-200">{stage.count}</div>
            <div className="text-xs text-zinc-500">${stage.total_amount.toLocaleString()}</div>
          </div>
          {stage.stuck_count > 0 && (
            <div className="flex items-center gap-1 text-amber-400" title={`${stage.stuck_count} stuck > 14 days`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-xs">{stage.stuck_count}</span>
            </div>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800">
          {items.length === 0 ? (
            <div className="p-4 text-sm text-zinc-500">No items in this stage</div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {items.map(item => (
                <PipelineItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PipelineItemRow({ item }: { item: PipelineItem }) {
  const [showCalendar, setShowCalendar] = useState(false)
  const config = STAGE_CONFIG[item.stage]

  const daysOld = item.transaction_date
    ? Math.floor((Date.now() - new Date(item.transaction_date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const gmailSearchUrl = item.vendor_name
    ? `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`from:${item.vendor_name} receipt OR invoice`)}`
    : null

  return (
    <div className="p-3 hover:bg-zinc-800/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-1.5 h-8 rounded-full', config?.bg)} />
          <div className="min-w-0">
            <div className="text-sm text-zinc-200 truncate">{item.vendor_name || 'Unknown vendor'}</div>
            <div className="text-xs text-zinc-500 flex items-center gap-2">
              {item.transaction_date && (
                <span>{format(new Date(item.transaction_date), 'dd MMM yyyy')}</span>
              )}
              {daysOld !== null && daysOld > 14 && (
                <span className="text-amber-400 flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {daysOld}d
                </span>
              )}
              {item.gmail_message_id && (
                <span className="text-yellow-400 flex items-center gap-0.5">
                  <Mail className="w-3 h-3" />
                  Dext email matched
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-zinc-200">
            ${Math.abs(item.amount || 0).toLocaleString()}
          </div>
          <div className="flex gap-1">
            {gmailSearchUrl && (
              <a
                href={gmailSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Search Gmail for receipt"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
            {item.transaction_date && (
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className={cn(
                  'p-1.5 rounded hover:bg-zinc-700 transition-colors',
                  showCalendar ? 'text-teal-400' : 'text-zinc-500 hover:text-zinc-300'
                )}
                title="Show calendar context"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showCalendar && item.transaction_date && (
        <CalendarContext txDate={item.transaction_date} vendor={item.vendor_name || ''} />
      )}
    </div>
  )
}

function CalendarContext({ txDate, vendor }: { txDate: string; vendor: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['calendar-context', txDate, vendor],
    queryFn: () => getReceiptCalendarContext(txDate, 3, vendor),
  })

  if (isLoading) {
    return (
      <div className="mt-2 ml-5 p-2 text-xs text-zinc-500 flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading calendar context...
      </div>
    )
  }

  const events = [
    ...(data?.vendor_matched || []),
    ...(data?.contextual || []),
  ]

  if (events.length === 0) {
    return (
      <div className="mt-2 ml-5 p-2 text-xs text-zinc-500">
        No nearby calendar events found
      </div>
    )
  }

  return (
    <div className="mt-2 ml-5 space-y-1">
      {data?.hint && (
        <div className="text-xs text-teal-400 mb-1">{data.hint}</div>
      )}
      {events.slice(0, 5).map((event) => (
        <div key={event.id} className="flex items-center gap-2 text-xs text-zinc-400 p-1 rounded hover:bg-zinc-800/50">
          <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
          <span className="text-zinc-500">{format(new Date(event.start_time), 'dd MMM')}</span>
          <span className="truncate">{event.title}</span>
          {event.location && (
            <span className="text-zinc-600 truncate">@ {event.location}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ReceiptPipelinePage() {
  const [expandedStage, setExpandedStage] = useState<string | null>('missing_receipt')

  const { data, isLoading } = useQuery({
    queryKey: ['receipt-pipeline'],
    queryFn: () => getReceiptPipeline({ limit: 100 }),
  })

  // Fetch items for expanded stage
  const { data: stageData } = useQuery({
    queryKey: ['receipt-pipeline', 'stage', expandedStage],
    queryFn: () => getReceiptPipeline({ stage: expandedStage || undefined, limit: 50 }),
    enabled: !!expandedStage,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  const funnel = data?.funnel || []
  const summary = data?.summary

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/finance"
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Receipt Pipeline</h1>
            <p className="text-sm text-zinc-500">Track receipts from missing → Dext → Xero → reconciled</p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="text-xs text-zinc-500 mb-1">Total Tracked</div>
            <div className="text-xl font-semibold text-zinc-200">{summary.total_records}</div>
          </div>
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="text-xs text-zinc-500 mb-1">Unreconciled $</div>
            <div className="text-xl font-semibold text-red-400">
              ${summary.total_unreconciled_amount.toLocaleString()}
            </div>
          </div>
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="text-xs text-zinc-500 mb-1">Reconciliation Rate</div>
            <div className={cn(
              'text-xl font-semibold',
              summary.reconciliation_rate >= 80 ? 'text-green-400' :
              summary.reconciliation_rate >= 50 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {summary.reconciliation_rate}%
            </div>
          </div>
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="text-xs text-zinc-500 mb-1">Stuck Items</div>
            <div className={cn(
              'text-xl font-semibold',
              summary.stuck_count > 0 ? 'text-amber-400' : 'text-green-400'
            )}>
              {summary.stuck_count}
            </div>
            {summary.oldest_pending && (
              <div className="text-xs text-zinc-500 mt-0.5">
                Oldest: {format(new Date(summary.oldest_pending), 'dd MMM')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Funnel visualization */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Pipeline Funnel</h2>
        <FunnelBar stages={funnel} />
      </div>

      {/* Stage cards */}
      <div className="space-y-2">
        {funnel.map(stage => (
          <StageCard
            key={stage.stage}
            stage={stage}
            isExpanded={expandedStage === stage.stage}
            onToggle={() => setExpandedStage(
              expandedStage === stage.stage ? null : stage.stage
            )}
            items={expandedStage === stage.stage ? (stageData?.items || []) : []}
          />
        ))}
      </div>
    </div>
  )
}
