'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/supabase-client'
import { getIntelligenceFeed, updateInsight, type IntelligenceInsight, type InsightAction } from '@/lib/api'
import {
  Mail,
  UserPlus,
  TrendingDown,
  Zap,
  Users,
  Radio,
  GitBranch,
  Search,
  ThumbsUp,
  ThumbsDown,
  Flame,
  Trash2,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const TYPE_CONFIG: Record<string, { icon: typeof Mail; color: string; bg: string; label: string }> = {
  follow_up: { icon: Mail, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Follow-up' },
  relationship_change: { icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Relationship' },
  new_contact: { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'New Contact' },
  cross_domain: { icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Pattern' },
  contact_suggestion: { icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Suggestion' },
  ecosystem_signal: { icon: Radio, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Signal' },
  knowledge_alignment: { icon: GitBranch, color: 'text-violet-400', bg: 'bg-violet-500/20', label: 'Knowledge' },
  contact_research: { icon: Search, color: 'text-indigo-400', bg: 'bg-indigo-500/20', label: 'Research' },
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'border-red-500/30 bg-red-500/5',
  high: 'border-orange-500/20',
  medium: '',
  low: 'opacity-80',
}

type VoteState = 'up' | 'down' | 'important' | null

function InsightCard({ insight, onAction }: {
  insight: IntelligenceInsight
  onAction: (id: string, action: InsightAction) => void
}) {
  const [vote, setVote] = useState<VoteState>(null)
  const config = TYPE_CONFIG[insight.insight_type] || TYPE_CONFIG.cross_domain
  const Icon = config.icon
  const priorityClass = PRIORITY_COLORS[insight.priority] || ''

  const contactId = insight.data?.contact_id as string | undefined
  const href = contactId ? `/people/${contactId}` : undefined

  const timeAgo = getTimeAgo(insight.created_at)

  const handleVote = (action: InsightAction) => {
    if (action === 'upvote') {
      setVote(vote === 'up' ? null : 'up')
    } else if (action === 'downvote') {
      setVote(vote === 'down' ? null : 'down')
    } else if (action === 'important') {
      setVote(vote === 'important' ? null : 'important')
    }
    onAction(insight.id, action)
  }

  return (
    <div className={cn('glass-card-sm p-3 transition-all', priorityClass)}>
      <div className="flex items-start gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          {href ? (
            <Link href={href} className="text-sm font-medium text-white hover:text-indigo-300 transition-colors truncate block">
              {insight.title}
            </Link>
          ) : (
            <p className="text-sm font-medium text-white truncate">{insight.title}</p>
          )}
          {insight.description && (
            <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{insight.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', config.bg, config.color)}>
              {config.label}
            </span>
            <span className="text-[10px] text-white/30">{timeAgo}</span>
            {insight.priority === 'critical' && (
              <span className="text-[10px] text-red-400 font-medium">CRITICAL</span>
            )}
            {insight.priority === 'high' && (
              <span className="text-[10px] text-red-400">!</span>
            )}
          </div>
        </div>

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.preventDefault(); handleVote('upvote') }}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              vote === 'up' ? 'bg-green-500/20 text-green-400' : 'text-white/30 hover:bg-green-500/10 hover:text-green-400'
            )}
            title="Upvote — boost importance"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); handleVote('downvote') }}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              vote === 'down' ? 'bg-red-500/20 text-red-400' : 'text-white/30 hover:bg-red-500/10 hover:text-red-400'
            )}
            title="Downvote — lower importance"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); handleVote('important') }}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              vote === 'important' ? 'bg-amber-500/20 text-amber-400' : 'text-white/30 hover:bg-amber-500/10 hover:text-amber-400'
            )}
            title="Mark critical"
          >
            <Flame className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onAction(insight.id, 'dismiss') }}
            className="p-1.5 rounded-lg text-white/30 hover:bg-white/10 hover:text-white/60 transition-colors"
            title="Dismiss"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function IntelligenceFeed({
  maxItems = 10,
  type,
  showHeader = true,
}: {
  maxItems?: number
  type?: string
  showHeader?: boolean
}) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['intelligence', 'feed', type],
    queryFn: () => getIntelligenceFeed({ limit: maxItems, type }),
    refetchInterval: 30000,
  })

  // Subscribe to Realtime inserts
  useEffect(() => {
    const channel = supabaseClient
      .channel('intelligence-insights')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intelligence_insights',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['intelligence', 'feed'] })
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [queryClient])

  const handleAction = useCallback(async (id: string, action: InsightAction) => {
    await updateInsight(id, action)
    if (action === 'dismiss') {
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'feed'] })
    }
  }, [queryClient])

  const insights = data?.insights || []

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            Intelligence Feed
          </h3>
          <Link
            href="/intelligence"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-6 text-white/40">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No active insights</p>
          <p className="text-xs mt-1">Intelligence will appear here as it&apos;s generated</p>
        </div>
      ) : (
        <div className="space-y-2">
          {insights.slice(0, maxItems).map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}
