'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ListChecks,
  AlertTriangle,
  Clock,
  Loader2,
  Users,
  Check,
  Archive,
  Plus,
  ChevronDown,
} from 'lucide-react'
import {
  getKnowledgeActions,
  createAction,
  updateActionStatus,
  getEcosystemProjectCodes,
  type KnowledgeAction,
} from '@/lib/api'
import { cn } from '@/lib/utils'

type FilterTab = 'open' | 'overdue' | 'completed' | 'all'

export default function ActionsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = React.useState<FilterTab>('open')
  const [projectFilter, setProjectFilter] = React.useState<string>('')

  // Queries
  const openActions = useQuery({
    queryKey: ['knowledge-actions', 'open', projectFilter],
    queryFn: () => getKnowledgeActions({ status: 'open', project: projectFilter || undefined, limit: 200 }),
  })

  const overdueActions = useQuery({
    queryKey: ['knowledge-actions', 'overdue', projectFilter],
    queryFn: () => getKnowledgeActions({ overdue: true, project: projectFilter || undefined, limit: 200 }),
  })

  const completedActions = useQuery({
    queryKey: ['knowledge-actions', 'completed', projectFilter],
    queryFn: () => getKnowledgeActions({ status: 'completed', project: projectFilter || undefined, limit: 100 }),
    enabled: filter === 'completed' || filter === 'all',
  })

  const allActions = useQuery({
    queryKey: ['knowledge-actions', 'all', projectFilter],
    queryFn: () => getKnowledgeActions({ project: projectFilter || undefined, limit: 200 }),
    enabled: filter === 'all',
  })

  const projects = useQuery({
    queryKey: ['ecosystem', 'project-codes'],
    queryFn: getEcosystemProjectCodes,
    staleTime: Infinity,
  })

  // Derived data
  const dataMap: Record<FilterTab, typeof openActions> = {
    open: openActions,
    overdue: overdueActions,
    completed: completedActions,
    all: allActions,
  }
  const current = dataMap[filter]
  const actions = current.data?.actions || []
  const isLoading = current.isLoading
  const overdueCount = openActions.data?.overdueCount || 0
  const openCount = openActions.data?.totalActions || 0
  const completedCount = openActions.data?.completedCount || 0

  // Mutations
  const completeMutation = useMutation({
    mutationFn: (id: string) => updateActionStatus(id, 'completed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-actions'] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => updateActionStatus(id, 'archived'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-actions'] })
    },
  })

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'open', label: `Open (${openCount})` },
    { id: 'overdue', label: `Overdue (${overdueCount})` },
    { id: 'completed', label: `Completed (${completedCount})` },
    { id: 'all', label: 'All' },
  ]

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <ListChecks className="h-5 w-5 text-white" />
            </div>
            Actions
          </h1>
          <p className="text-white/50 mt-1">
            {openCount} open{overdueCount > 0 && (
              <span className="text-red-400"> &middot; {overdueCount} overdue</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Project filter */}
          <div className="relative">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-8 text-sm text-white/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="">All Projects</option>
              {(projects.data?.projects || []).map((p) => (
                <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  filter === t.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/70'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick-add bar */}
      <QuickAddBar
        projects={projects.data?.projects || []}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['knowledge-actions'] })}
      />

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && actions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-white/30">
          <ListChecks className="h-10 w-10 mb-3" />
          <p className="text-sm">
            {filter === 'overdue' ? 'No overdue actions' : filter === 'completed' ? 'No completed actions' : 'No actions found'}
          </p>
        </div>
      )}

      {/* Actions list */}
      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((action) => {
            const isOverdue = action.status === 'open' && action.follow_up_date && new Date(action.follow_up_date) < new Date()
            const isCompleted = action.status === 'completed'
            return (
              <div
                key={action.id}
                className={cn(
                  'glass-card p-4 transition-colors',
                  isCompleted
                    ? 'opacity-60'
                    : isOverdue
                      ? 'border border-red-500/20 bg-red-500/5'
                      : 'hover:bg-white/[0.03]'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Complete checkbox */}
                  {!isCompleted ? (
                    <button
                      onClick={() => completeMutation.mutate(action.id)}
                      disabled={completeMutation.isPending}
                      className="h-5 w-5 rounded border border-white/20 hover:border-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                      title="Complete action"
                    >
                      {completeMutation.isPending && completeMutation.variables === action.id ? (
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                      ) : null}
                    </button>
                  ) : (
                    <div className="h-5 w-5 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                  )}

                  {/* Icon */}
                  {isOverdue ? (
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <ListChecks className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className={cn('text-sm font-medium', isCompleted ? 'text-white/50 line-through' : 'text-white')}>
                      {action.title}
                    </h4>
                    {action.content && (
                      <p className="text-xs text-white/50 mt-1 line-clamp-2">{action.content}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {action.project_name && (
                        <span className="text-xs text-violet-400">{action.project_name}</span>
                      )}
                      {!action.project_name && action.project_code && (
                        <span className="text-xs text-violet-400">{action.project_code}</span>
                      )}
                      {action.participants && action.participants.length > 0 && (
                        <span className="text-xs text-white/30 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {action.participants.join(', ')}
                        </span>
                      )}
                      {action.recorded_at && (
                        <span className="text-xs text-white/20">
                          Created {formatDistanceToNow(new Date(action.recorded_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right space-y-1 flex items-center gap-2">
                    <div className="space-y-1">
                      {action.follow_up_date && (
                        <div className={cn(
                          'flex items-center gap-1 text-xs',
                          isOverdue ? 'text-red-400' : 'text-white/30'
                        )}>
                          <Clock className="h-3 w-3" />
                          {format(new Date(action.follow_up_date), 'MMM d')}
                        </div>
                      )}
                      {action.importance && (
                        <span className={cn(
                          'inline-block px-1.5 py-0.5 rounded text-[10px]',
                          action.importance === 'high' || action.importance === 'critical'
                            ? 'bg-red-500/20 text-red-400'
                            : action.importance === 'medium'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-white/5 text-white/30'
                        )}>
                          {action.importance}
                        </span>
                      )}
                    </div>
                    {/* Archive button */}
                    {!isCompleted && (
                      <button
                        onClick={() => archiveMutation.mutate(action.id)}
                        disabled={archiveMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white/50 transition-colors"
                        title="Archive action"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function QuickAddBar({
  projects,
  onCreated,
}: {
  projects: Array<{ code: string; name: string }>
  onCreated: () => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [projectCode, setProjectCode] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [importance, setImportance] = React.useState('medium')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: () => createAction({
      title,
      project_code: projectCode || undefined,
      follow_up_date: dueDate || undefined,
      importance,
    }),
    onSuccess: () => {
      setTitle('')
      setProjectCode('')
      setDueDate('')
      setImportance('medium')
      setExpanded(false)
      onCreated()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-4">
      <div className="flex items-center gap-3">
        <Plus className="h-4 w-4 text-emerald-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Add a new action..."
          className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
        />
        {title.trim() && (
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex items-center gap-3 mt-3 pl-7">
          <div className="relative">
            <select
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 pr-7 text-xs text-white/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.code} value={p.code}>{p.code}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
          </div>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          <div className="flex gap-1">
            {['low', 'medium', 'high'].map((imp) => (
              <button
                key={imp}
                type="button"
                onClick={() => setImportance(imp)}
                className={cn(
                  'px-2 py-1 rounded text-[10px] transition-colors',
                  importance === imp
                    ? imp === 'high' ? 'bg-red-500/20 text-red-400' : imp === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/50'
                    : 'bg-white/5 text-white/30 hover:text-white/50'
                )}
              >
                {imp}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setExpanded(false); setTitle('') }}
            className="text-xs text-white/30 hover:text-white/50 ml-auto"
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  )
}
