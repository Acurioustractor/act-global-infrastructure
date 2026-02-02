'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Bot,
  MessageSquare,
  ClipboardList,
  Brain,
  Shield,
  Workflow,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentChat } from '@/components/agent-chat'

// ─── Types ───────────────────────────────────────────────────────

interface Proposal {
  id: string
  agent_id: string
  action_name: string
  title: string
  description: string
  reasoning: string
  proposed_action: unknown
  expected_outcome: string
  impact_assessment: unknown
  priority: string
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  execution_result: unknown
  execution_error: string | null
  coordination_status: string | null
  created_at: string
  updated_at: string
}

interface Learning {
  id: string
  agent_id: string
  learning_type: string
  content: string
  context: string
  confidence: number
  applied_count: number
  last_applied: string | null
  created_at: string
}

interface MistakePattern {
  id: string
  agent_id: string
  action_name: string
  pattern_description: string
  mistake_category: string
  occurrence_count: number
  first_seen_at: string
  last_seen_at: string
  status: string
  autonomy_adjustment: unknown
  resolution_notes: string | null
}

interface Calibration {
  id: string
  agent_id: string
  action_name: string
  total_actions: number
  mean_confidence: number
  mean_success_rate: number
  calibration_error: number
  overconfidence_rate: number
  underconfidence_rate: number
  confidence_adjustment: number
  calculated_at: string
}

interface Procedure {
  id: string
  procedure_name: string
  description: string
  agent_id: string
  steps: unknown[]
  preconditions: unknown
  postconditions: unknown
  execution_count: number
  success_count: number
  success_rate: number
  avg_duration_ms: number
  status: string
  version: number
  created_at: string
}

interface AutonomyTransition {
  id: string
  action_name: string
  agent_id: string
  previous_level: number
  new_level: number
  reason: string
  evidence: unknown
  approved_by: string | null
  status: string
  created_at: string
}

interface CurrentLevel {
  action: string
  level: number
  agent_id: string
  last_change: string
}

// ─── Tabs ────────────────────────────────────────────────────────

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'proposals', label: 'Proposals', icon: ClipboardList },
  { id: 'learning', label: 'Learning', icon: Brain },
  { id: 'autonomy', label: 'Autonomy', icon: Shield },
  { id: 'procedures', label: 'Procedures', icon: Workflow },
] as const

type TabId = (typeof TABS)[number]['id']

// ─── Main Page ───────────────────────────────────────────────────

export default function AgentPage() {
  const [tab, setTab] = React.useState<TabId>('proposals')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0f1a]/60 backdrop-blur-xl">
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Agent Intelligence</h1>
              <p className="text-xs text-white/40">Proposals, learning, autonomy, and procedures</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
                  tab === t.id
                    ? 'bg-white/10 text-white border-b-2 border-purple-400'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {tab === 'chat' && <AgentChat />}
        {tab === 'proposals' && <ProposalsTab />}
        {tab === 'learning' && <LearningTab />}
        {tab === 'autonomy' && <AutonomyTab />}
        {tab === 'procedures' && <ProceduresTab />}
      </div>
    </div>
  )
}

// ─── Proposals Tab ───────────────────────────────────────────────

function ProposalsTab() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = React.useState<string>('all')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['agent-proposals'],
    queryFn: () => fetch('/api/agent/proposals').then(r => r.json()) as Promise<{
      proposals: Proposal[]
      stats: { pending: number; approved: number; rejected: number; executed: number; total: number }
    }>,
  })

  const mutation = useMutation({
    mutationFn: (params: { id: string; action: 'approve' | 'reject' }) =>
      fetch('/api/agent/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-proposals'] }),
  })

  const proposals = data?.proposals || []
  const stats = data?.stats || { pending: 0, approved: 0, rejected: 0, executed: 0, total: 0 }

  const filtered = filter === 'all'
    ? proposals
    : proposals.filter(p => p.status === filter)

  const priorityColor = (p: string) => {
    if (p === 'critical') return 'text-red-400 bg-red-500/10'
    if (p === 'high') return 'text-orange-400 bg-orange-500/10'
    if (p === 'medium') return 'text-yellow-400 bg-yellow-500/10'
    return 'text-white/40 bg-white/5'
  }

  const statusIcon = (s: string) => {
    if (s === 'pending_review' || s === 'pending') return <Clock className="h-4 w-4 text-yellow-400" />
    if (s === 'approved') return <CheckCircle2 className="h-4 w-4 text-green-400" />
    if (s === 'rejected') return <XCircle className="h-4 w-4 text-red-400" />
    if (s === 'executed') return <Zap className="h-4 w-4 text-purple-400" />
    return <Clock className="h-4 w-4 text-white/30" />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
          { label: 'Approved', value: stats.approved, color: 'text-green-400' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
          { label: 'Executed', value: stats.executed, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending_review', 'approved', 'rejected', 'executed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-white/40 hover:text-white/60'
            )}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      )}

      {/* Proposals list */}
      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 text-white/30">
          <ClipboardList className="h-10 w-10 mx-auto mb-3" />
          <p>No proposals found</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(p => {
          const expanded = expandedId === p.id
          return (
            <div key={p.id} className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : p.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(p.status)}
                      <h4 className="text-sm font-medium text-white truncate">{p.title}</h4>
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', priorityColor(p.priority))}>
                        {p.priority}
                      </span>
                      <ChevronDown className={cn('h-4 w-4 text-white/30 transition-transform ml-auto shrink-0', expanded && 'rotate-180')} />
                    </div>
                    <p className="text-xs text-white/50 line-clamp-1 ml-6">{p.description}</p>
                    <div className="flex items-center gap-3 mt-2 ml-6">
                      <span className="text-[10px] text-purple-400">{p.agent_id}</span>
                      {p.action_name && <span className="text-[10px] text-white/30">{p.action_name}</span>}
                      <span className="text-[10px] text-white/30">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                  {p.description && (
                    <div className="pt-3">
                      <div className="text-xs font-medium text-white/40 mb-1">Description</div>
                      <p className="text-xs text-white/60">{p.description}</p>
                    </div>
                  )}
                  {p.reasoning && (
                    <div>
                      <div className="text-xs font-medium text-white/40 mb-1">Reasoning</div>
                      <p className="text-xs text-white/60">{p.reasoning}</p>
                    </div>
                  )}
                  {p.expected_outcome && (
                    <div>
                      <div className="text-xs font-medium text-white/40 mb-1">Expected Outcome</div>
                      <p className="text-xs text-white/60">{p.expected_outcome}</p>
                    </div>
                  )}
                  {p.proposed_action ? (
                    <div>
                      <div className="text-xs font-medium text-white/40 mb-1">Proposed Action</div>
                      <pre className="text-[10px] text-white/50 bg-white/5 rounded p-2 overflow-x-auto">
                        {typeof p.proposed_action === 'string' ? p.proposed_action : JSON.stringify(p.proposed_action, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                  {p.execution_result ? (
                    <div>
                      <div className="text-xs font-medium text-green-400/80 mb-1">Execution Result</div>
                      <pre className="text-[10px] text-white/50 bg-green-500/5 rounded p-2 overflow-x-auto">
                        {typeof p.execution_result === 'string' ? p.execution_result : JSON.stringify(p.execution_result, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                  {p.execution_error && (
                    <div>
                      <div className="text-xs font-medium text-red-400/80 mb-1">Execution Error</div>
                      <p className="text-xs text-red-400/60">{p.execution_error}</p>
                    </div>
                  )}
                  {p.review_notes && (
                    <div>
                      <div className="text-xs font-medium text-white/40 mb-1">Review Notes</div>
                      <p className="text-xs text-white/60">{p.review_notes}</p>
                    </div>
                  )}

                  {/* Action buttons for pending proposals */}
                  {(p.status === 'pending_review' || p.status === 'pending') && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => mutation.mutate({ id: p.id, action: 'approve' })}
                        disabled={mutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => mutation.mutate({ id: p.id, action: 'reject' })}
                        disabled={mutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}

                  <div className="text-[10px] text-white/20 pt-1">
                    Created {format(new Date(p.created_at), 'PPpp')}
                    {p.reviewed_at && ` | Reviewed ${format(new Date(p.reviewed_at), 'PPpp')} by ${p.reviewed_by}`}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Learning Tab ────────────────────────────────────────────────

function LearningTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['agent-learning'],
    queryFn: () => fetch('/api/agent/learning').then(r => r.json()) as Promise<{
      learnings: Learning[]
      mistakes: MistakePattern[]
      calibration: Calibration[]
      stats: {
        totalLearnings: number
        totalMistakes: number
        activeMistakes: number
        resolvedMistakes: number
        calibrationEntries: number
        avgCalibrationError: number | null
      }
    }>,
  })

  const [section, setSection] = React.useState<'learnings' | 'mistakes' | 'calibration'>('learnings')
  const stats = data?.stats

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Learnings', value: stats?.totalLearnings ?? 0, color: 'text-blue-400', icon: Brain },
          { label: 'Mistake Patterns', value: stats?.totalMistakes ?? 0, color: 'text-orange-400', icon: AlertTriangle },
          { label: 'Active Mistakes', value: stats?.activeMistakes ?? 0, color: 'text-red-400', icon: AlertTriangle },
          { label: 'Avg Calibration Error', value: stats?.avgCalibrationError !== null ? `${((stats?.avgCalibrationError ?? 0) * 100).toFixed(1)}%` : 'N/A', color: 'text-purple-400', icon: Target },
        ].map(s => (
          <div key={s.label} className="glass-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={cn('h-4 w-4', s.color)} />
              <span className="text-xs text-white/40">{s.label}</span>
            </div>
            <div className={cn('text-xl font-bold', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Section switcher */}
      <div className="flex gap-2">
        {(['learnings', 'mistakes', 'calibration'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
              section === s ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-white/40 hover:text-white/60'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      )}

      {/* Learnings */}
      {section === 'learnings' && (
        <div className="space-y-3">
          {(data?.learnings || []).length === 0 && !isLoading && (
            <EmptyState icon={Brain} message="No learnings recorded yet. The agent learns from completed proposals and feedback." />
          )}
          {(data?.learnings || []).map(l => (
            <div key={l.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[10px] font-medium text-blue-400">{l.learning_type}</span>
                    <span className="text-[10px] text-white/30">{l.agent_id}</span>
                  </div>
                  <p className="text-sm text-white/80">{l.content}</p>
                  {l.context && <p className="text-xs text-white/40 mt-1">{l.context}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                    <span>Confidence: {Math.round((l.confidence || 0) * 100)}%</span>
                    <span>Applied {l.applied_count}x</span>
                    <span>{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mistakes */}
      {section === 'mistakes' && (
        <div className="space-y-3">
          {(data?.mistakes || []).length === 0 && !isLoading && (
            <EmptyState icon={AlertTriangle} message="No mistake patterns detected. Patterns emerge from repeated failures in proposals." />
          )}
          {(data?.mistakes || []).map(m => (
            <div key={m.id} className="glass-card p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn('h-5 w-5 mt-0.5 shrink-0', m.status === 'resolved' ? 'text-green-400' : 'text-orange-400')} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{m.action_name}</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-medium',
                      m.status === 'resolved' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                    )}>
                      {m.status}
                    </span>
                    <span className="text-[10px] text-white/30">x{m.occurrence_count}</span>
                  </div>
                  <p className="text-xs text-white/60">{m.pattern_description}</p>
                  {m.mistake_category && <span className="text-[10px] text-white/30 mt-1 inline-block">Category: {m.mistake_category}</span>}
                  {m.resolution_notes && (
                    <p className="text-xs text-green-400/60 mt-1">Resolution: {m.resolution_notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calibration */}
      {section === 'calibration' && (
        <div className="space-y-3">
          {(data?.calibration || []).length === 0 && !isLoading && (
            <EmptyState icon={Target} message="No calibration data yet. Calibration measures how well the agent's confidence matches actual outcomes." />
          )}
          {(data?.calibration || []).map(c => (
            <div key={c.id} className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">{c.action_name}</span>
                  <span className="text-[10px] text-white/30">{c.agent_id}</span>
                </div>
                <span className="text-[10px] text-white/30">{c.total_actions} actions</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] text-white/40">Confidence</div>
                  <div className="text-sm font-medium text-blue-400">{(c.mean_confidence * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">Success Rate</div>
                  <div className="text-sm font-medium text-green-400">{(c.mean_success_rate * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">Error</div>
                  <div className={cn('text-sm font-medium', c.calibration_error > 0.1 ? 'text-orange-400' : 'text-white/60')}>
                    {(c.calibration_error * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              {(c.overconfidence_rate > 0 || c.underconfidence_rate > 0) && (
                <div className="flex gap-3 mt-2 text-[10px]">
                  {c.overconfidence_rate > 0 && (
                    <span className="text-orange-400">Overconfident: {(c.overconfidence_rate * 100).toFixed(0)}%</span>
                  )}
                  {c.underconfidence_rate > 0 && (
                    <span className="text-blue-400">Underconfident: {(c.underconfidence_rate * 100).toFixed(0)}%</span>
                  )}
                  {c.confidence_adjustment !== 0 && (
                    <span className="text-white/40">Adjustment: {c.confidence_adjustment > 0 ? '+' : ''}{(c.confidence_adjustment * 100).toFixed(1)}%</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Autonomy Tab ────────────────────────────────────────────────

function AutonomyTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['agent-autonomy'],
    queryFn: () => fetch('/api/agent/autonomy').then(r => r.json()) as Promise<{
      transitions: AutonomyTransition[]
      currentLevels: CurrentLevel[]
      stats: { totalTransitions: number; pendingApproval: number; uniqueActions: number }
    }>,
  })

  const levelLabel = (level: number) => {
    if (level === 1) return 'Manual'
    if (level === 2) return 'Supervised'
    if (level === 3) return 'Autonomous'
    return `L${level}`
  }

  const levelColor = (level: number) => {
    if (level === 1) return 'text-white/60 bg-white/5'
    if (level === 2) return 'text-yellow-400 bg-yellow-500/10'
    if (level === 3) return 'text-green-400 bg-green-500/10'
    return 'text-white/40 bg-white/5'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-white">{data?.stats?.totalTransitions ?? 0}</div>
          <div className="text-xs text-white/40">Total Transitions</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{data?.stats?.pendingApproval ?? 0}</div>
          <div className="text-xs text-white/40">Pending Approval</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{data?.stats?.uniqueActions ?? 0}</div>
          <div className="text-xs text-white/40">Actions Tracked</div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      )}

      {/* Current autonomy levels */}
      {(data?.currentLevels || []).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white/60 mb-3">Current Autonomy Levels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data!.currentLevels.map(cl => (
              <div key={cl.action} className="glass-card p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{cl.action}</div>
                  <div className="text-[10px] text-white/30">{cl.agent_id}</div>
                </div>
                <span className={cn('px-3 py-1 rounded-lg text-xs font-medium', levelColor(cl.level))}>
                  {levelLabel(cl.level)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transition history */}
      <div>
        <h3 className="text-sm font-medium text-white/60 mb-3">Transition History</h3>
        {(data?.transitions || []).length === 0 && !isLoading && (
          <EmptyState icon={Shield} message="No autonomy transitions yet. Transitions happen when agents earn or lose trust." />
        )}
        <div className="space-y-3">
          {(data?.transitions || []).map(t => (
            <div key={t.id} className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', levelColor(t.previous_level))}>
                    {levelLabel(t.previous_level)}
                  </span>
                  {t.new_level > t.previous_level
                    ? <ArrowUpRight className="h-4 w-4 text-green-400" />
                    : <ArrowDownRight className="h-4 w-4 text-red-400" />
                  }
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', levelColor(t.new_level))}>
                    {levelLabel(t.new_level)}
                  </span>
                </div>
                <span className="text-sm text-white">{t.action_name}</span>
                <span className={cn(
                  'ml-auto px-2 py-0.5 rounded text-[10px]',
                  t.status === 'approved' ? 'bg-green-500/10 text-green-400' : t.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-white/5 text-white/40'
                )}>
                  {t.status}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-2">{t.reason}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                <span>{t.agent_id}</span>
                {t.approved_by && <span>Approved by {t.approved_by}</span>}
                <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Procedures Tab ──────────────────────────────────────────────

function ProceduresTab() {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['agent-procedures'],
    queryFn: () => fetch('/api/agent/procedures').then(r => r.json()) as Promise<{
      procedures: Procedure[]
      stats: { total: number; active: number; totalExecutions: number; avgSuccessRate: number | null }
    }>,
  })

  const stats = data?.stats

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Procedures', value: stats?.total ?? 0, color: 'text-indigo-400' },
          { label: 'Active', value: stats?.active ?? 0, color: 'text-green-400' },
          { label: 'Total Executions', value: stats?.totalExecutions ?? 0, color: 'text-blue-400' },
          { label: 'Avg Success', value: stats?.avgSuccessRate !== null ? `${((stats?.avgSuccessRate ?? 0) * 100).toFixed(0)}%` : 'N/A', color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      )}

      {(data?.procedures || []).length === 0 && !isLoading && (
        <EmptyState icon={Workflow} message="No procedures learned yet. Procedures are extracted from repeated successful patterns." />
      )}

      <div className="space-y-3">
        {(data?.procedures || []).map(p => {
          const expanded = expandedId === p.id
          return (
            <div key={p.id} className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : p.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Workflow className="h-4 w-4 text-indigo-400" />
                      <h4 className="text-sm font-medium text-white">{p.procedure_name}</h4>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-medium',
                        p.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'
                      )}>
                        {p.status}
                      </span>
                      <span className="text-[10px] text-white/30">v{p.version}</span>
                      <ChevronDown className={cn('h-4 w-4 text-white/30 ml-auto shrink-0 transition-transform', expanded && 'rotate-180')} />
                    </div>
                    <p className="text-xs text-white/50 ml-6 line-clamp-1">{p.description}</p>
                    <div className="flex items-center gap-4 mt-2 ml-6 text-[10px] text-white/30">
                      <span>Executed {p.execution_count}x</span>
                      <span className={p.success_rate >= 0.8 ? 'text-green-400' : p.success_rate >= 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                        {((p.success_rate || 0) * 100).toFixed(0)}% success
                      </span>
                      {p.avg_duration_ms > 0 && <span>{(p.avg_duration_ms / 1000).toFixed(1)}s avg</span>}
                    </div>
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                  <div className="pt-3">
                    <div className="text-xs font-medium text-white/40 mb-1">Description</div>
                    <p className="text-xs text-white/60">{p.description}</p>
                  </div>

                  {p.steps && Array.isArray(p.steps) && p.steps.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-white/40 mb-1">Steps</div>
                      <div className="space-y-1">
                        {(p.steps as Array<{ name?: string; description?: string }>).map((step, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-indigo-400 font-medium shrink-0">{i + 1}.</span>
                            <span className="text-white/60">{step.name || step.description || JSON.stringify(step)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.preconditions ? (
                    <div>
                      <div className="text-xs font-medium text-white/40 mb-1">Preconditions</div>
                      <pre className="text-[10px] text-white/50 bg-white/5 rounded p-2 overflow-x-auto">
                        {JSON.stringify(p.preconditions, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  <div className="text-[10px] text-white/20">
                    Agent: {p.agent_id} | Created {format(new Date(p.created_at), 'PPp')}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-white/30">
      <Icon className="h-10 w-10 mb-3" />
      <p className="text-sm text-center max-w-md">{message}</p>
    </div>
  )
}
