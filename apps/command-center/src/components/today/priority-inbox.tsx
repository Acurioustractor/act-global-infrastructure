'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Inbox,
  AlertCircle,
  Mail,
  Clock,
  UserX,
  ChevronRight,
} from 'lucide-react'
import { getInbox, type InboxItem } from '@/lib/api'
import { cn } from '@/lib/utils'

const typeConfig = {
  overdue_action: { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Overdue' },
  unanswered_email: { icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Reply' },
  upcoming_deadline: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Due' },
  stale_contact: { icon: UserX, color: 'text-pink-400', bg: 'bg-pink-500/20', label: 'Reach out' },
}

const urgencyDot = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-amber-400',
  low: 'bg-white/30',
}

export function PriorityInbox() {
  const { data, isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: getInbox,
    refetchInterval: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="glass-card p-5 md:p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const items = data?.items || []
  const counts = data?.counts || {}

  if (items.length === 0) {
    return (
      <div className="glass-card p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
          <Inbox className="h-5 w-5 text-indigo-400" />
          Priority Inbox
        </h2>
        <div className="text-center py-4 text-white/40">
          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">All clear — nothing needs attention</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Inbox className="h-5 w-5 text-indigo-400" />
          Priority Inbox
        </h2>
        <span className="text-xs text-white/40">{counts.total || items.length} items</span>
      </div>

      {/* Type summary pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(counts.overdue_actions as number) > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
            {counts.overdue_actions} overdue
          </span>
        )}
        {(counts.unanswered_emails as number) > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
            {counts.unanswered_emails} to reply
          </span>
        )}
        {(counts.upcoming_deadlines as number) > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
            {counts.upcoming_deadlines} due soon
          </span>
        )}
        {(counts.stale_contacts as number) > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">
            {counts.stale_contacts} to reconnect
          </span>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-1">
        {items.slice(0, 10).map(item => (
          <InboxRow key={item.id} item={item} />
        ))}
      </div>

      {items.length > 10 && (
        <Link
          href="/knowledge/actions"
          className="block text-center text-xs text-indigo-400 hover:text-indigo-300 mt-3 pt-2 border-t border-white/5"
        >
          View all {items.length} items <ChevronRight className="h-3 w-3 inline" />
        </Link>
      )}
    </div>
  )
}

function InboxRow({ item }: { item: InboxItem }) {
  const config = typeConfig[item.type]
  const Icon = config.icon
  const Wrapper = item.link ? Link : 'div'
  const wrapperProps = item.link ? { href: item.link } : {}

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className="glass-card-sm p-2.5 flex items-center gap-2.5 hover:border-indigo-500/30 transition-all group cursor-pointer"
    >
      {/* Urgency dot */}
      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', urgencyDot[item.urgency])} />

      {/* Type icon */}
      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', config.bg)}>
        <Icon className={cn('h-3.5 w-3.5', config.color)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white truncate group-hover:text-indigo-300 transition-colors">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="text-[10px] text-white/40 truncate">{item.subtitle}</p>
        )}
      </div>

      {/* Project code */}
      {item.projectCode && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 shrink-0">
          {item.projectCode.replace('ACT-', '')}
        </span>
      )}
    </Wrapper>
  )
}
