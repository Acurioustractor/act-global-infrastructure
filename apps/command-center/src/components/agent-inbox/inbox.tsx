'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProposals, approveProposal, rejectProposal, type Proposal } from '@/lib/api'
import { ProposalCard } from './proposal-card'
import { Inbox, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AgentInbox() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['proposals', 'pending'],
    queryFn: () => getProposals('pending'),
  })

  const approveMutation = useMutation({
    mutationFn: approveProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: rejectProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })

  const proposals = data?.proposals || []
  const pendingCount = proposals.length

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 w-32 bg-bg-elevated rounded mb-4" />
        <div className="space-y-3">
          <div className="h-20 bg-bg-elevated rounded" />
          <div className="h-20 bg-bg-elevated rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-red-500/20">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load proposals. Is the API running?</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-listen" />
          <h2 className="text-lg font-semibold text-text-primary">Agent Inbox</h2>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium',
            pendingCount > 0 ? 'bg-listen/10 text-listen' : 'bg-action/10 text-action'
          )}
        >
          {pendingCount} pending
        </span>
      </div>

      {proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="h-12 w-12 text-action mb-3" />
          <p className="text-text-secondary">All caught up!</p>
          <p className="text-sm text-text-muted">No agent proposals need your attention</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.slice(0, 5).map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onApprove={() => approveMutation.mutate(proposal.id)}
              onReject={() => rejectMutation.mutate(proposal.id)}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
            />
          ))}
          {proposals.length > 5 && (
            <p className="text-center text-sm text-text-muted">
              +{proposals.length - 5} more proposals
            </p>
          )}
        </div>
      )}
    </div>
  )
}
