'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { cn, formatRelativeDate } from '@/lib/utils'
import {
  Bot,
  Check,
  X,
  AlertTriangle,
  Zap,
  Info,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from 'lucide-react'

interface AgentProposal {
  id: string
  agent_name: string
  action_type: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: string
  context: Record<string, unknown>
  created_at: string
  reviewed_at?: string
}

const priorityConfig = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  high: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  medium: { icon: Info, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
}

export function AgentApprovals() {
  const [proposals, setProposals] = useState<AgentProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabaseClient
      .from('agent_proposals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    if (fetchError) {
      setError(fetchError.message)
      setProposals([])
    } else {
      setProposals(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
    setActionInProgress(id)

    const { error: updateError } = await supabaseClient
      .from('agent_proposals')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      setError(`Failed to ${newStatus === 'approved' ? 'approve' : 'reject'}: ${updateError.message}`)
    } else {
      // Remove from list optimistically
      setProposals((prev) => prev.filter((p) => p.id !== id))
    }

    setActionInProgress(null)
  }

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-6 w-48 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-20 bg-white/10 rounded" />
          <div className="h-20 bg-white/10 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-6 border border-red-500/20">
        <div className="flex items-center gap-3 text-red-400">
          <ShieldAlert className="h-5 w-5" />
          <span>Failed to load proposals: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          Agent Approvals
        </h2>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium',
            proposals.length > 0
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-green-500/20 text-green-400'
          )}
        >
          {proposals.length} pending
        </span>
      </div>

      {proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400 mb-3" />
          <p className="text-white/60">All caught up!</p>
          <p className="text-sm text-white/40">No agent proposals need your attention</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => {
            const priority =
              priorityConfig[proposal.priority] || priorityConfig.medium
            const PriorityIcon = priority.icon
            const isActioning = actionInProgress === proposal.id

            return (
              <div
                key={proposal.id}
                className="glass-card-sm p-4 flex items-start gap-3"
              >
                {/* Priority indicator */}
                <div className={cn('rounded-lg p-2 mt-0.5', priority.bg)}>
                  <PriorityIcon className={cn('h-4 w-4', priority.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-3.5 w-3.5 text-white/40" />
                    <span className="text-xs font-medium text-white/40">
                      {proposal.agent_name}
                    </span>
                    <span className="text-xs text-white/30">
                      {formatRelativeDate(proposal.created_at)}
                    </span>
                  </div>
                  <h3 className="font-medium text-white truncate">
                    {proposal.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/50 line-clamp-2">
                    {proposal.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAction(proposal.id, 'approved')}
                    disabled={isActioning}
                    className="rounded-lg p-2 text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                    title="Approve"
                  >
                    {isActioning ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Check className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleAction(proposal.id, 'rejected')}
                    disabled={isActioning}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Reject"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
