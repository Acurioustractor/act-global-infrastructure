'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import {
  MessageSquare,
  Users,
  CalendarDays,
  Loader2,
  ChevronDown,
  CheckSquare,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Star,
  FileText,
  TrendingUp,
  ExternalLink,
} from 'lucide-react'
import { getKnowledgeMeetings, type KnowledgeMeeting } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function MeetingsPage() {
  const [days, setDays] = React.useState(30)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-meetings', days],
    queryFn: () => getKnowledgeMeetings({ days, limit: 100 }),
  })

  const sentimentIcon = (s?: string) => {
    if (s === 'positive') return <ThumbsUp className="h-3 w-3 text-green-400" />
    if (s === 'negative') return <ThumbsDown className="h-3 w-3 text-red-400" />
    return <Minus className="h-3 w-3 text-white/30" />
  }

  const importanceColor = (i?: string) => {
    if (i === 'critical') return 'text-red-400 bg-red-500/10'
    if (i === 'high') return 'text-orange-400 bg-orange-500/10'
    if (i === 'medium') return 'text-yellow-400 bg-yellow-500/10'
    return 'text-white/40 bg-white/5'
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            Meetings
          </h1>
          <p className="text-white/50 mt-1">
            {data ? `${data.count} meetings` : 'Loading...'} &middot; Last {days} days
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      {/* Project breakdown */}
      {data?.byProject && Object.keys(data.byProject).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.byProject)
            .sort((a, b) => b[1] - a[1])
            .map(([project, count]) => (
              <span key={project} className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                {project} <span className="text-blue-400/50">{count}</span>
              </span>
            ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      )}

      {data && data.meetings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-white/30">
          <MessageSquare className="h-10 w-10 mb-3" />
          <p className="text-sm">No meetings found</p>
        </div>
      )}

      {/* Meetings list */}
      {data && data.meetings.length > 0 && (
        <div className="space-y-3">
          {data.meetings.map((m) => {
            const isExpanded = expandedId === m.id
            const meeting = m as KnowledgeMeeting & {
              action_items?: string[]
              importance?: string
              sentiment?: string
              action_required?: boolean
            }
            const hasIntelligence = meeting.action_items?.length || meeting.importance || meeting.sentiment || meeting.action_required

            return (
              <div
                key={m.id}
                className="glass-card overflow-hidden hover:bg-white/[0.03] transition-colors"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-blue-400 shrink-0" />
                        <h4 className="text-sm font-medium text-white truncate">{m.title}</h4>
                        {m.source_url && (
                          <a
                            href={m.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-white/30 hover:text-white/70 transition-colors shrink-0"
                            title="Open in Notion"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}

                        {/* Intelligence badges */}
                        {meeting.importance && (
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', importanceColor(meeting.importance))}>
                            {meeting.importance}
                          </span>
                        )}
                        {meeting.sentiment && sentimentIcon(meeting.sentiment)}
                        {meeting.action_required && (
                          <AlertCircle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        )}

                        <ChevronDown className={cn(
                          'h-4 w-4 text-white/30 transition-transform shrink-0 ml-auto',
                          isExpanded && 'rotate-180'
                        )} />
                      </div>
                      {m.summary && (
                        <p className={cn(
                          'text-xs text-white/50 ml-6',
                          !isExpanded && 'line-clamp-1'
                        )}>
                          {m.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 ml-6 flex-wrap">
                        {m.project_name && (
                          <span className="text-xs text-violet-400">{m.project_name}</span>
                        )}
                        {m.participants && m.participants.length > 0 && (
                          <span className="text-xs text-white/30 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {m.participants.length}
                          </span>
                        )}
                        {meeting.action_items && meeting.action_items.length > 0 && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            {meeting.action_items.length} action{meeting.action_items.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {m.topics && m.topics.length > 0 && (
                          <div className="flex gap-1">
                            {m.topics.slice(0, 4).map((t) => (
                              <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/40">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-white/30 shrink-0">
                      {m.recorded_at && (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(m.recorded_at), 'MMM d')}
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 ml-6 space-y-3 border-t border-white/5">
                    {/* Action Items */}
                    {meeting.action_items && meeting.action_items.length > 0 && (
                      <div className="pt-3">
                        <div className="text-xs font-medium text-emerald-400/80 mb-2 flex items-center gap-1.5">
                          <CheckSquare className="h-3.5 w-3.5" />
                          Action Items
                        </div>
                        <div className="space-y-1.5">
                          {meeting.action_items.map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <div className="h-4 w-4 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[9px] text-emerald-400 font-medium">{i + 1}</span>
                              </div>
                              <span className="text-white/70">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Intelligence metadata */}
                    {hasIntelligence && (
                      <div className="flex flex-wrap gap-3 pt-1">
                        {meeting.sentiment && (
                          <div className="flex items-center gap-1.5 text-xs text-white/40">
                            {sentimentIcon(meeting.sentiment)}
                            <span className="capitalize">{meeting.sentiment}</span>
                          </div>
                        )}
                        {meeting.importance && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Star className="h-3 w-3 text-yellow-400" />
                            <span className={cn('capitalize', importanceColor(meeting.importance).split(' ')[0])}>
                              {meeting.importance} importance
                            </span>
                          </div>
                        )}
                        {meeting.action_required && (
                          <div className="flex items-center gap-1.5 text-xs text-orange-400">
                            <AlertCircle className="h-3 w-3" />
                            Action Required
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    {m.content && (
                      <div>
                        <div className="text-xs font-medium text-white/40 mb-1 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          Content
                        </div>
                        <div className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                          {m.content}
                        </div>
                      </div>
                    )}

                    {/* Participants */}
                    {m.participants && m.participants.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-white/40 mb-1 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Participants
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {m.participants.map((p) => (
                            <span key={p} className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/60">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timestamp & Notion link */}
                    <div className="flex items-center justify-between">
                      {m.recorded_at && (
                        <div className="text-xs text-white/30">
                          {format(new Date(m.recorded_at), 'EEEE, MMMM d, yyyy')} &middot;{' '}
                          {formatDistanceToNow(new Date(m.recorded_at), { addSuffix: true })}
                        </div>
                      )}
                      {m.source_url && (
                        <a
                          href={m.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open in Notion
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
