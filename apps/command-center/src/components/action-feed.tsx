'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Mail,
  UserX,
  Lightbulb,
  ListChecks,
  AlertCircle,
  ChevronRight,
  Inbox,
  EyeOff,
  Clock,
  Building2,
  Phone,
  MessageCircle,
  TrendingDown,
  Thermometer,
  ThumbsUp,
  ThumbsDown,
  FolderPlus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getActionFeed,
  snoozeContact,
  voteContact,
  linkContactProject,
  unlinkContactProject,
  getEcosystemProjectCodes,
  type ActionItem,
} from '@/lib/api'

const REFRESH_INTERVAL = 30 * 1000

const typeConfig: Record<string, { icon: typeof Mail; color: string; bg: string; label: string }> = {
  email_reply: { icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Reply needed' },
  follow_up: { icon: Mail, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Follow up' },
  overdue_contact: { icon: UserX, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Reconnect' },
  insight: { icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Insight' },
  task: { icon: ListChecks, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Task' },
  deal_risk: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Deal risk' },
  relationship_alert: { icon: Thermometer, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Cooling' },
}

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageCircle,
  phone: Phone,
}

const priorityColors: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-blue-500',
  low: 'border-l-white/20',
}

interface ActionFeedProps {
  maxItems?: number
}

export function ActionFeed({ maxItems = 15 }: ActionFeedProps) {
  const queryClient = useQueryClient()
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set())
  const [snoozed, setSnoozed] = React.useState<Set<string>>(new Set())
  const [animatingOut, setAnimatingOut] = React.useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['action-feed'],
    queryFn: () => getActionFeed({ limit: maxItems + 10 }),
    refetchInterval: REFRESH_INTERVAL,
  })

  const allActions = data?.actions || []
  const actions = allActions
    .filter(a => !dismissed.has(a.id) && !snoozed.has(a.id) && !animatingOut.has(a.id))
    .slice(0, maxItems)
  const counts = data?.counts || {}

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
  }

  const handleSnooze = async (action: ActionItem) => {
    setSnoozed(prev => new Set([...prev, action.id]))
    if (action.entity_id) {
      try {
        await snoozeContact(action.entity_id, 7)
      } catch {
        // Still keep snoozed in UI even if backend fails
      }
    }
  }

  const handleVote = async (action: ActionItem, vote: 'up' | 'down') => {
    if (!action.entity_id) return
    if (vote === 'down') {
      // Animate out then remove
      setAnimatingOut(prev => new Set([...prev, action.id]))
      setTimeout(() => {
        setAnimatingOut(prev => {
          const next = new Set(prev)
          next.delete(action.id)
          return next
        })
        setDismissed(prev => new Set([...prev, action.id]))
      }, 300)
    }
    try {
      await voteContact(action.entity_id, vote)
      queryClient.invalidateQueries({ queryKey: ['action-feed'] })
    } catch {
      // Silently fail
    }
  }

  const handleLinkProject = async (action: ActionItem, projectCode: string) => {
    if (!action.entity_id) return
    try {
      await linkContactProject(action.entity_id, projectCode)
      queryClient.invalidateQueries({ queryKey: ['action-feed'] })
    } catch {
      // Silently fail
    }
  }

  const handleUnlinkProject = async (action: ActionItem, projectCode: string) => {
    if (!action.entity_id) return
    try {
      await unlinkContactProject(action.entity_id, projectCode)
      queryClient.invalidateQueries({ queryKey: ['action-feed'] })
    } catch {
      // Silently fail
    }
  }

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="h-6 w-40 bg-white/5 rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-5 md:p-6 border-indigo-500/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-indigo-400" />
          Actions Needed
        </h2>
        <div className="flex items-center gap-2">
          {(counts.email_reply || 0) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
              {counts.email_reply} emails
            </span>
          )}
          {((counts.deal_risk || 0) + (counts.relationship_alert || 0)) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
              {(counts.deal_risk || 0) + (counts.relationship_alert || 0)} risks
            </span>
          )}
          {(counts.task || 0) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
              {counts.task} tasks
            </span>
          )}
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No actions needed right now</p>
          <p className="text-xs mt-1">You're all caught up</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action) => (
            <ActionRow
              key={action.id}
              action={action}
              onDismiss={() => handleDismiss(action.id)}
              onSnooze={() => handleSnooze(action)}
              onVote={(vote) => handleVote(action, vote)}
              onLinkProject={(code) => handleLinkProject(action, code)}
              onUnlinkProject={(code) => handleUnlinkProject(action, code)}
            />
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <Link
          href="/intelligence"
          className="btn-glass w-full mt-4 flex items-center justify-center gap-2 text-sm"
        >
          View All Actions
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

function ActionRow({
  action,
  onDismiss,
  onSnooze,
  onVote,
  onLinkProject,
  onUnlinkProject,
}: {
  action: ActionItem
  onDismiss: () => void
  onSnooze: () => void
  onVote: (vote: 'up' | 'down') => void
  onLinkProject: (code: string) => void
  onUnlinkProject: (code: string) => void
}) {
  const [showProjectPicker, setShowProjectPicker] = React.useState(false)
  const [voteFlash, setVoteFlash] = React.useState<'up' | null>(null)
  const config = typeConfig[action.type] || typeConfig.task
  const Icon = config.icon
  const ChannelIcon = action.channel ? channelIcons[action.channel] || Mail : null
  const href = action.action_url || (action.entity_id ? `/people/${action.entity_id}` : '/intelligence')

  // Collect display tags: project codes first, then other tags
  const displayTags: string[] = []
  if (action.project_codes && action.project_codes.length > 0) {
    displayTags.push(...action.project_codes.slice(0, 2))
  } else if (action.project_code) {
    displayTags.push(action.project_code)
  }
  if (action.tags) {
    for (const tag of action.tags) {
      if (!displayTags.includes(tag)) displayTags.push(tag)
      if (displayTags.length >= 3) break
    }
  }

  const handleUpvote = (e: React.MouseEvent) => {
    e.preventDefault()
    setVoteFlash('up')
    setTimeout(() => setVoteFlash(null), 600)
    onVote('up')
  }

  const handleDownvote = (e: React.MouseEvent) => {
    e.preventDefault()
    onVote('down')
  }

  return (
    <div className={cn(
      'glass-card-sm p-3 border-l-2 transition-all group',
      priorityColors[action.priority] || priorityColors.medium,
      voteFlash === 'up' && 'ring-1 ring-emerald-500/40',
    )}>
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', config.bg)}>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <Link href={href} className="hover:text-indigo-300 transition-colors">
            <p className="text-sm font-medium text-white truncate">{action.title}</p>
          </Link>

          {/* Description / subject */}
          <p className="text-xs text-white/50 truncate mt-0.5">{action.description}</p>

          {/* Linked project pills */}
          {action.linked_projects && action.linked_projects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {action.linked_projects.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-400"
                >
                  {code}
                  <button
                    onClick={(e) => { e.preventDefault(); onUnlinkProject(code) }}
                    className="hover:text-white transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Meta row: type label, company, channel, tags, time */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded', config.bg, config.color)}>
              {config.label}
            </span>

            {action.company && (
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <Building2 className="h-2.5 w-2.5" />
                {action.company}
              </span>
            )}

            {ChannelIcon && action.channel && action.channel !== 'email' && (
              <span className="flex items-center gap-1 text-[10px] text-white/35">
                <ChannelIcon className="h-2.5 w-2.5" />
                {action.channel}
              </span>
            )}

            {displayTags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400"
              >
                {tag}
              </span>
            ))}

            {action.time_ago && (
              <span className="text-[10px] text-white/30 ml-auto">{action.time_ago}</span>
            )}
          </div>
        </div>

        {/* Score badge */}
        {action.rank_score != null && (
          <div className="flex-shrink-0 mt-1">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/30">
              {action.rank_score}
            </span>
          </div>
        )}

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
          {action.entity_id && (
            <>
              <button
                onClick={handleUpvote}
                className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 transition-colors"
                title="More like this"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDownvote}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                title="Less like this"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
              <div className="relative">
                <button
                  onClick={(e) => { e.preventDefault(); setShowProjectPicker(!showProjectPicker) }}
                  className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-white/40 hover:text-indigo-400 transition-colors"
                  title="Link to project"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
                {showProjectPicker && (
                  <ProjectPicker
                    onSelect={(code) => {
                      setShowProjectPicker(false)
                      onLinkProject(code)
                    }}
                    onClose={() => setShowProjectPicker(false)}
                    existingLinks={action.linked_projects || []}
                  />
                )}
              </div>
            </>
          )}
          <button
            onClick={(e) => { e.preventDefault(); onSnooze() }}
            className="p-1.5 rounded-lg hover:bg-amber-500/20 text-white/40 hover:text-amber-400 transition-colors"
            title="Snooze 7 days"
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onDismiss() }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            title="Dismiss"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectPicker({
  onSelect,
  onClose,
  existingLinks,
}: {
  onSelect: (code: string) => void
  onClose: () => void
  existingLinks: string[]
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['ecosystem', 'project-codes'],
    queryFn: getEcosystemProjectCodes,
    staleTime: Infinity,
  })

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const projects = (data?.projects || []).filter(p => !existingLinks.includes(p.code))

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-48 max-h-56 overflow-y-auto bg-gray-900 border border-white/10 rounded-lg shadow-xl p-1"
    >
      {projects.length === 0 ? (
        <p className="text-xs text-white/40 p-2">No projects available</p>
      ) : (
        projects.map((p) => (
          <button
            key={p.code}
            onClick={(e) => { e.preventDefault(); onSelect(p.code) }}
            className="w-full text-left px-2 py-1.5 rounded text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span className="font-medium text-indigo-400">{p.code}</span>
            <span className="ml-1.5 text-white/40">{p.name}</span>
          </button>
        ))
      )}
    </div>
  )
}
