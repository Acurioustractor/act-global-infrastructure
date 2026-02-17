'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Mail, MessageSquare, Clock, ChevronRight, Archive, Star, CalendarCheck,
  X, Undo2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getPendingCommunications,
  setCommunicationAction,
  removeCommunicationAction,
  type PendingCommunication,
} from '@/lib/api'

const REFRESH_INTERVAL = 30 * 1000

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SWIPEABLE CARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SWIPE_THRESHOLD = 80

function SwipeableCommCard({
  item,
  onAction,
}: {
  item: PendingCommunication
  onAction: (id: string, action: 'archived' | 'important' | 'follow_up_today' | 'undo') => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [startX, setStartX] = useState<number | null>(null)
  const [swiping, setSwiping] = useState(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setSwiping(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startX === null) return
    const diff = e.touches[0].clientX - startX
    // Clamp to ±150px
    setOffsetX(Math.max(-150, Math.min(150, diff)))
  }, [startX])

  const handleTouchEnd = useCallback(() => {
    setSwiping(false)
    if (offsetX > SWIPE_THRESHOLD) {
      // Swipe right → mark important
      onAction(item.id, item.priority === 'important' ? 'undo' : 'important')
    } else if (offsetX < -SWIPE_THRESHOLD) {
      // Swipe left → archive
      onAction(item.id, 'archived')
    }
    setStartX(null)
    setOffsetX(0)
  }, [offsetX, item.id, item.priority, onAction])

  // Background colors revealed by swiping
  const showRight = offsetX > 20
  const showLeft = offsetX < -20

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe backgrounds */}
      <div className="absolute inset-0 flex">
        {/* Right swipe bg (important) */}
        <div className={cn(
          'flex items-center justify-start pl-3 w-1/2 transition-opacity',
          showRight ? 'opacity-100' : 'opacity-0',
          offsetX > SWIPE_THRESHOLD ? 'bg-amber-500/30' : 'bg-amber-500/15'
        )}>
          <Star className="h-4 w-4 text-amber-400" />
          <span className="ml-1.5 text-xs text-amber-400">Important</span>
        </div>
        {/* Left swipe bg (archive) */}
        <div className={cn(
          'flex items-center justify-end pr-3 w-1/2 ml-auto transition-opacity',
          showLeft ? 'opacity-100' : 'opacity-0',
          offsetX < -SWIPE_THRESHOLD ? 'bg-red-500/30' : 'bg-red-500/15'
        )}>
          <span className="mr-1.5 text-xs text-red-400">Archive</span>
          <Archive className="h-4 w-4 text-red-400" />
        </div>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className={cn(
          'relative glass-card-sm p-2.5 flex items-center gap-3 bg-[#0a0f1a]',
          !swiping && 'transition-transform duration-200'
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
          item.priority === 'important'
            ? 'bg-amber-500/20 text-amber-400'
            : item.priority === 'follow_up_today'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-blue-500/20 text-blue-400'
        )}>
          {item.contactName?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{item.contactName}</p>
          <p className="text-xs text-white/40 truncate">{item.subject}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Quick action buttons (desktop) */}
          <button
            onClick={(e) => { e.preventDefault(); onAction(item.id, 'follow_up_today') }}
            className={cn(
              'hidden md:flex h-6 w-6 items-center justify-center rounded transition-colors',
              item.priority === 'follow_up_today'
                ? 'bg-green-500/30 text-green-400'
                : 'hover:bg-white/10 text-white/20 hover:text-green-400'
            )}
            title="Follow up today"
          >
            <CalendarCheck className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onAction(item.id, 'important') }}
            className={cn(
              'hidden md:flex h-6 w-6 items-center justify-center rounded transition-colors',
              item.priority === 'important'
                ? 'bg-amber-500/30 text-amber-400'
                : 'hover:bg-white/10 text-white/20 hover:text-amber-400'
            )}
            title="Mark important"
          >
            <Star className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onAction(item.id, 'archived') }}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded hover:bg-white/10 text-white/20 hover:text-red-400 transition-colors"
            title="Archive"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-white/30" />
            <span className={cn(
              'text-xs',
              item.daysWaiting > 7 ? 'text-red-400' : item.daysWaiting > 3 ? 'text-amber-400' : 'text-white/40'
            )}>
              {item.daysWaiting}d
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Section({
  label,
  icon,
  iconColor,
  items,
  onAction,
  defaultOpen = true,
}: {
  label: string
  icon: React.ReactNode
  iconColor: string
  items: PendingCommunication[]
  onAction: (id: string, action: 'archived' | 'important' | 'follow_up_today' | 'undo') => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (items.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-1.5 w-full text-left"
      >
        <span className={iconColor}>{icon}</span>
        <span className="text-[10px] font-medium text-white/50 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-[10px] text-white/30">({items.length})</span>
        <ChevronRight className={cn(
          'h-3 w-3 text-white/20 ml-auto transition-transform',
          open && 'rotate-90'
        )} />
      </button>
      {open && (
        <div className="space-y-1.5">
          {items.map((item) => (
            <SwipeableCommCard key={item.id} item={item} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN WIDGET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function CommunicationsNeeded() {
  const queryClient = useQueryClient()
  const [lastArchived, setLastArchived] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['communications', 'pending'],
    queryFn: getPendingCommunications,
    refetchInterval: REFRESH_INTERVAL,
  })

  const handleAction = useCallback(async (
    id: string,
    action: 'archived' | 'important' | 'follow_up_today' | 'undo'
  ) => {
    const item = data?.pending.find(i => i.id === id)

    if (action === 'undo') {
      // Remove the action entirely
      await removeCommunicationAction(id)
    } else if (action === 'archived') {
      if (item) setLastArchived({ id, name: item.contactName })
      await setCommunicationAction(id, 'archived')
    } else {
      // Toggle: if already set to this action, undo it
      if (item?.priority === action) {
        await removeCommunicationAction(id)
      } else {
        await setCommunicationAction(id, action)
      }
    }
    queryClient.invalidateQueries({ queryKey: ['communications', 'pending'] })
  }, [data, queryClient])

  const handleUndoArchive = useCallback(async () => {
    if (!lastArchived) return
    await removeCommunicationAction(lastArchived.id)
    setLastArchived(null)
    queryClient.invalidateQueries({ queryKey: ['communications', 'pending'] })
  }, [lastArchived, queryClient])

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="h-5 w-48 bg-white/5 rounded mb-4 animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const important = data?.important || []
  const followUpToday = data?.followUpToday || []
  const other = data?.other || []
  const total = data?.total || 0

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-400" />
          Communications Needed
        </h2>
        <span className="text-xs text-white/40">{total} pending</span>
      </div>

      {total === 0 ? (
        <div className="text-center py-4 text-white/40">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">All caught up</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Section
            label="Important"
            icon={<Star className="h-3 w-3" />}
            iconColor="text-amber-400"
            items={important}
            onAction={handleAction}
          />
          <Section
            label="Follow Up Today"
            icon={<CalendarCheck className="h-3 w-3" />}
            iconColor="text-green-400"
            items={followUpToday}
            onAction={handleAction}
          />
          <Section
            label="Pending"
            icon={<Clock className="h-3 w-3" />}
            iconColor="text-white/40"
            items={other}
            onAction={handleAction}
            defaultOpen={important.length === 0 && followUpToday.length === 0}
          />

          {/* Swipe hint (mobile only) */}
          <p className="text-[10px] text-white/20 text-center md:hidden">
            Swipe right = important · Swipe left = archive
          </p>
        </div>
      )}

      {/* Undo toast */}
      {lastArchived && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
          <span className="text-xs text-white/50">
            Archived {lastArchived.name}
          </span>
          <button
            onClick={handleUndoArchive}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </button>
        </div>
      )}

      {total > 0 && (
        <Link
          href="/reports"
          className="flex items-center justify-center gap-1 mt-3 text-xs text-blue-400 hover:text-blue-300"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}
