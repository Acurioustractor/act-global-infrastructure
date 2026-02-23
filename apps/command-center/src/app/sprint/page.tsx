'use client'

import * as React from 'react'
import { format } from 'date-fns'
import {
  CheckCircle2,
  Circle,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SprintItem = {
  id: string
  title: string
  stream: string
  status: string
  priority: string
  owner: string | null
  project_code: string | null
  time_est: string | null
  notes: string | null
  done_date: string | null
  sort_order: number
}

const STREAM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Harvest': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Business': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'PICC': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Empathy Ledger': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  'Infrastructure': { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  'Goods': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'JusticeHub': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
}

const PRIORITY_BADGE: Record<string, string> = {
  'now': 'bg-red-500/20 text-red-400',
  'next': 'bg-orange-500/20 text-orange-400',
  'later': 'bg-white/10 text-white/40',
}

const TIME_LABELS: Record<string, string> = {
  'quick': '15m',
  'short': '30m',
  'medium': '1h',
  'long': '2h',
}

export default function SprintPage() {
  const [items, setItems] = React.useState<SprintItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showBacklog, setShowBacklog] = React.useState(false)
  const [showDone, setShowDone] = React.useState(false)
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const [newStream, setNewStream] = React.useState('Infrastructure')
  const [toggling, setToggling] = React.useState<Set<string>>(new Set())

  const fetchItems = React.useCallback(async () => {
    try {
      const res = await fetch('/api/sprint')
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      // silent
    }
    setLoading(false)
  }, [])

  React.useEffect(() => { fetchItems() }, [fetchItems])

  const todayItems = items.filter(i => i.status === 'today' || i.status === 'in_progress')
  const doneItems = items.filter(i => i.status === 'done')
  const backlogItems = items.filter(i => i.status === 'backlog')

  // Group today items by stream
  const streams = Array.from(new Set(todayItems.map(i => i.stream)))
  const streamGroups = streams.map(stream => ({
    stream,
    items: todayItems.filter(i => i.stream === stream),
  }))

  const toggleDone = async (item: SprintItem) => {
    const done = item.status !== 'done'
    setToggling(prev => new Set(prev).add(item.id))

    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === item.id
        ? { ...i, status: done ? 'done' : 'today', done_date: done ? new Date().toISOString() : null }
        : i
    ))

    await fetch('/api/sprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id: item.id, done }),
    })

    setToggling(prev => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
  }

  const moveToToday = async (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'today' } : i))
    await fetch('/api/sprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move_to_today', id }),
    })
  }

  const moveToBacklog = async (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'backlog' } : i))
    await fetch('/api/sprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move_to_backlog', id }),
    })
  }

  const addItem = async () => {
    if (!newTitle.trim()) return
    await fetch('/api/sprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', title: newTitle, stream: newStream }),
    })
    setNewTitle('')
    setShowAddForm(false)
    fetchItems()
  }

  const todayDoneCount = doneItems.filter(i => {
    if (!i.done_date) return false
    return format(new Date(i.done_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  }).length
  const todayTotal = todayItems.length + todayDoneCount
  const pct = todayTotal > 0 ? Math.round((todayDoneCount / todayTotal) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Daily Sprint</h1>
        <p className="text-white/50 mt-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-mono text-white/50">
            {todayDoneCount}/{todayTotal}
          </span>
        </div>
      </header>

      {/* Today's Items by Stream */}
      <div className="space-y-6">
        {streamGroups.map(({ stream, items: streamItems }) => {
          const colors = STREAM_COLORS[stream] || STREAM_COLORS['Infrastructure']
          const streamDone = doneItems.filter(i => i.stream === stream && i.done_date &&
            format(new Date(i.done_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
          ).length

          return (
            <div key={stream}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('text-sm font-semibold', colors.text)}>{stream}</span>
                <span className="text-xs text-white/30">
                  {streamDone}/{streamItems.length + streamDone}
                </span>
              </div>
              <div className="space-y-1">
                {streamItems.map(item => (
                  <SprintItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleDone(item)}
                    onMoveToBacklog={() => moveToBacklog(item.id)}
                    isToggling={toggling.has(item.id)}
                  />
                ))}
                {/* Show done items for this stream inline */}
                {doneItems
                  .filter(i => i.stream === stream && i.done_date &&
                    format(new Date(i.done_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  )
                  .map(item => (
                    <SprintItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleDone(item)}
                      onMoveToBacklog={() => moveToBacklog(item.id)}
                      isToggling={toggling.has(item.id)}
                    />
                  ))
                }
              </div>
            </div>
          )
        })}
      </div>

      {/* Add item */}
      <div className="mt-6">
        {showAddForm ? (
          <div className="glass-card p-4 space-y-3">
            <input
              type="text"
              placeholder="What needs doing?"
              className="w-full bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <select
                value={newStream}
                onChange={e => setNewStream(e.target.value)}
                className="bg-white/5 text-white/70 text-xs rounded px-2 py-1 outline-none border border-white/10"
              >
                {Object.keys(STREAM_COLORS).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="flex-1" />
              <button
                onClick={() => setShowAddForm(false)}
                className="text-xs text-white/40 hover:text-white/60 px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={addItem}
                className="text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-3 py-1 rounded"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors py-2"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        )}
      </div>

      {/* Backlog */}
      {backlogItems.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setShowBacklog(!showBacklog)}
            className="flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white/70 mb-3"
          >
            {showBacklog ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Backlog ({backlogItems.length})
          </button>
          {showBacklog && (
            <div className="space-y-1">
              {backlogItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 group"
                >
                  <Circle className="h-4 w-4 text-white/20 shrink-0" />
                  <span className="text-sm text-white/50 flex-1">{item.title}</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded', STREAM_COLORS[item.stream]?.text || 'text-white/30')}>
                    {item.stream}
                  </span>
                  <button
                    onClick={() => moveToToday(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-opacity"
                  >
                    <ArrowRight className="h-3 w-3" /> Today
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Previously Done */}
      {doneItems.filter(i => !i.done_date || format(new Date(i.done_date), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')).length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white/70 mb-3"
          >
            {showDone ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Previously Done ({doneItems.filter(i => !i.done_date || format(new Date(i.done_date), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')).length})
          </button>
          {showDone && (
            <div className="space-y-1">
              {doneItems
                .filter(i => !i.done_date || format(new Date(i.done_date), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd'))
                .map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg opacity-40">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-sm text-white line-through flex-1">{item.title}</span>
                    {item.done_date && (
                      <span className="text-[10px] text-white/30">{format(new Date(item.done_date), 'dd MMM')}</span>
                    )}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SprintItemRow({
  item,
  onToggle,
  onMoveToBacklog,
  isToggling,
}: {
  item: SprintItem
  onToggle: () => void
  onMoveToBacklog: () => void
  isToggling: boolean
}) {
  const isDone = item.status === 'done'
  const colors = STREAM_COLORS[item.stream] || STREAM_COLORS['Infrastructure']

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all group',
        isDone ? 'opacity-50' : 'hover:bg-white/5'
      )}
    >
      <button
        onClick={onToggle}
        disabled={isToggling}
        className="shrink-0 transition-transform active:scale-90"
      >
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        ) : (
          <Circle className="h-5 w-5 text-white/20 hover:text-white/40" />
        )}
      </button>

      <span className={cn('text-sm flex-1', isDone ? 'text-white/40 line-through' : 'text-white')}>
        {item.title}
      </span>

      {!isDone && item.priority === 'now' && (
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', PRIORITY_BADGE['now'])}>
          now
        </span>
      )}

      {!isDone && item.time_est && TIME_LABELS[item.time_est] && (
        <span className="text-[10px] text-white/30 font-mono">
          {TIME_LABELS[item.time_est]}
        </span>
      )}

      {item.owner && (
        <span className="text-[10px] text-white/30 hidden sm:inline">
          {item.owner}
        </span>
      )}

      {!isDone && (
        <button
          onClick={onMoveToBacklog}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title="Move to backlog"
        >
          <ArrowLeft className="h-3 w-3 text-white/20 hover:text-white/40" />
        </button>
      )}
    </div>
  )
}
