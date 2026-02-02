'use client'

import { type Proposal } from '@/lib/api'
import { formatRelativeDate, cn } from '@/lib/utils'
import { Check, X, ChevronRight, Bot, AlertTriangle, Zap, Info } from 'lucide-react'

interface ProposalCardProps {
  proposal: Proposal
  onApprove: () => void
  onReject: () => void
  isApproving?: boolean
  isRejecting?: boolean
}

const priorityConfig = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  high: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  medium: { icon: Info, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
}

export function ProposalCard({
  proposal,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: ProposalCardProps) {
  const priority = priorityConfig[proposal.priority] || priorityConfig.medium
  const PriorityIcon = priority.icon

  return (
    <div className="group relative rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-border/80">
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className={cn('rounded-lg p-2', priority.bg)}>
          <PriorityIcon className={cn('h-4 w-4', priority.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs font-medium text-text-muted">
              {proposal.agent_name}
            </span>
            <span className="text-xs text-text-muted">
              {formatRelativeDate(proposal.created_at)}
            </span>
          </div>

          <h3 className="font-medium text-text-primary truncate">
            {proposal.title}
          </h3>

          <p className="mt-1 text-sm text-text-secondary line-clamp-2">
            {proposal.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onApprove}
            disabled={isApproving || isRejecting}
            className="rounded-lg p-2 text-action hover:bg-action/10 transition-colors disabled:opacity-50"
            title="Approve"
          >
            <Check className="h-5 w-5" />
          </button>
          <button
            onClick={onReject}
            disabled={isApproving || isRejecting}
            className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            title="Reject"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            className="rounded-lg p-2 text-text-muted hover:bg-bg-card transition-colors"
            title="View details"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
