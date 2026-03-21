'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Tag,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Paperclip,
  SkipForward,
  Undo2,
  Zap,
  FileText,
  Building2,
  ListFilter,
  Eye,
  Pencil,
  ArrowDownLeft,
  CalendarDays,
  MapPin,
  StickyNote,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// --- Types ---

interface QueueItem {
  id: string
  vendor: string
  amount: number
  date: string
  type: 'invoice' | 'transaction'
  description: string | null
  hasReceipt: boolean
  suggestedProject: string | null
  currentProject: string | null
  confidence: number
  siblingCount: number
}

interface Project {
  code: string
  name: string
  tier: string
}

interface QueueResponse {
  items: QueueItem[]
  projects: Project[]
  stats: { totalUntagged: number; totalValue: number; totalItems?: number }
}

interface SessionStats {
  tagged: number
  rulesCreated: number
  gstRecovered: number
  rdRecovered: number
  startTime: number
}

interface UndoEntry {
  item: QueueItem
  projectCode: string
  autoTagged: number
}

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  location: string | null
  relevance: number
}

interface CalendarContext {
  events: CalendarEvent[]
  vendor_matched: CalendarEvent[]
  contextual: CalendarEvent[]
  hint: string | null
}

function formatTime(d: string) {
  return new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(d))
}

// R&D eligible project codes (43.5% refundable offset)
const RD_PROJECTS = new Set(['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'])

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toFixed(0)}`
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
}

// Prioritized project order for number keys (ecosystem first, then common)
const PROJECT_ORDER = [
  'ACT-HV', 'ACT-GD', 'ACT-JH', 'ACT-IN', 'ACT-EL', 'ACT-FM',
  'ACT-PI', 'ACT-HQ', 'ACT-CP',
]

type ViewMode = 'tag' | 'review'

export default function TaggerV2Page() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<ViewMode>('tag')
  const [reviewProject, setReviewProject] = useState<string>('')
  const [retaggingId, setRetaggingId] = useState<string | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    tagged: 0, rulesCreated: 0, gstRecovered: 0, rdRecovered: 0,
    startTime: Date.now(),
  })
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [initialTotal, setInitialTotal] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  // Build query params based on mode
  const queryParams = mode === 'review'
    ? `?mode=review${reviewProject ? `&project=${reviewProject}` : ''}`
    : ''

  // Fetch queue — staleTime avoids refetch on tab switch / mode toggle
  const { data, isLoading } = useQuery<QueueResponse>({
    queryKey: ['tagger-queue', mode, reviewProject],
    queryFn: () => fetch(`/api/finance/tagger-queue${queryParams}`).then(r => r.json()),
    staleTime: 30_000,
  })

  // Set initial total on first load (tag mode only)
  useEffect(() => {
    if (mode === 'tag' && data && initialTotal === null && data.stats.totalUntagged > 0) {
      setInitialTotal(data.stats.totalUntagged + sessionStats.tagged)
    }
  }, [data, initialTotal, sessionStats.tagged, mode])

  // Build ordered project list for keyboard shortcuts
  const orderedProjects = (() => {
    if (!data?.projects) return []
    const projectMap = new Map(data.projects.map(p => [p.code, p]))
    const ordered: Project[] = []
    for (const code of PROJECT_ORDER) {
      const p = projectMap.get(code)
      if (p) {
        ordered.push(p)
        projectMap.delete(code)
      }
    }
    for (const p of projectMap.values()) {
      ordered.push(p)
    }
    return ordered
  })()

  // Filter queue: skip skipped items to end (tag mode only)
  const queue = (() => {
    if (!data?.items) return []
    if (mode === 'review') return data.items
    const unskipped = data.items.filter(i => !skippedIds.has(i.id))
    const skipped = data.items.filter(i => skippedIds.has(i.id))
    return [...unskipped, ...skipped]
  })()

  const currentItem = mode === 'tag' ? (queue[0] || null) : null
  const previewItems = mode === 'tag' ? queue.slice(1, 4) : []

  // Determine which item to show calendar for
  const activeItem = mode === 'tag' ? (queue[0] || null) : (retaggingId ? queue.find(i => i.id === retaggingId) || null : null)

  // Fetch calendar context for the active item's date
  const { data: calData } = useQuery<CalendarContext>({
    queryKey: ['calendar-context', activeItem?.date, activeItem?.vendor],
    queryFn: () => fetch(`/api/receipts/calendar-context/${activeItem!.date}?days=1&vendor=${encodeURIComponent(activeItem!.vendor)}`).then(r => r.json()),
    enabled: !!activeItem?.date,
    staleTime: 60_000,
  })

  // Toast helper
  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // Tag mutation
  const tagMutation = useMutation({
    mutationFn: async (payload: { contactName: string; projectCode: string; saveAsRule: boolean }) => {
      const res = await fetch('/api/transactions/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return res.json()
    },
    onSuccess: (result, variables) => {
      const totalTagged = result.updated || 1

      // In review mode, find the item being retagged
      const taggedItem = mode === 'review'
        ? queue.find(i => i.id === retaggingId) || null
        : currentItem

      if (taggedItem) {
        const amount = taggedItem.amount
        setSessionStats(prev => ({
          ...prev,
          tagged: prev.tagged + totalTagged,
          rulesCreated: prev.rulesCreated + (result.ruleSaved ? 1 : 0),
          gstRecovered: prev.gstRecovered + (amount > 82.50 ? amount / 11 : 0),
          rdRecovered: prev.rdRecovered + (RD_PROJECTS.has(variables.projectCode) ? amount * 0.435 : 0),
        }))

        setUndoStack(prev => [...prev, {
          item: taggedItem,
          projectCode: variables.projectCode,
          autoTagged: totalTagged - 1,
        }])

        setSkippedIds(prev => {
          const next = new Set(prev)
          next.delete(taggedItem.id)
          return next
        })

        const autoMsg = totalTagged > 1 ? ` +${totalTagged - 1} auto-tagged` : ''
        const ruleMsg = result.ruleSaved ? ' Rule saved.' : ''
        showToast(`Tagged ${taggedItem.vendor} -> ${variables.projectCode}!${autoMsg}${ruleMsg}`)
      }

      setRetaggingId(null)
      queryClient.invalidateQueries({ queryKey: ['tagger-queue'] })
    },
  })

  // Handle tag action
  const handleTag = useCallback((projectCode: string) => {
    if (tagMutation.isPending) return

    if (mode === 'review' && retaggingId) {
      const item = queue.find(i => i.id === retaggingId)
      if (!item) return
      tagMutation.mutate({
        contactName: item.vendor,
        projectCode,
        saveAsRule: true,
      })
    } else if (mode === 'tag' && currentItem) {
      tagMutation.mutate({
        contactName: currentItem.vendor,
        projectCode,
        saveAsRule: true,
      })
    }
  }, [currentItem, tagMutation, mode, retaggingId, queue])

  // Handle skip
  const handleSkip = useCallback(() => {
    if (!currentItem || mode !== 'tag') return
    setSkippedIds(prev => new Set(prev).add(currentItem.id))
    showToast(`Skipped ${currentItem.vendor}`)
  }, [currentItem, showToast, mode])

  // Handle undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    const last = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    showToast(`Undo not yet supported server-side. Last: ${last.item.vendor} -> ${last.projectCode}`)
  }, [undoStack, showToast])

  // Keyboard shortcuts (tag mode only)
  useEffect(() => {
    if (mode !== 'tag') return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return

      const key = e.key

      if (key >= '1' && key <= '9') {
        e.preventDefault()
        const idx = parseInt(key) - 1
        if (idx < orderedProjects.length) handleTag(orderedProjects[idx].code)
        return
      }

      if ((key === 'Enter' || key === ' ') && currentItem?.suggestedProject) {
        e.preventDefault()
        handleTag(currentItem.suggestedProject)
        return
      }

      if (key === 'Tab') {
        e.preventDefault()
        handleSkip()
        return
      }

      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault()
        handleUndo()
        return
      }

      if (key === '/') {
        e.preventDefault()
        setShowNotes(prev => !prev)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, currentItem, orderedProjects, handleTag, handleSkip, handleUndo])

  // Progress calculation
  const totalForProgress = initialTotal || (data?.stats.totalUntagged || 0) + sessionStats.tagged
  const progressPct = totalForProgress > 0
    ? Math.min(100, Math.round((sessionStats.tagged / totalForProgress) * 100))
    : 0

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <Tag className="h-10 w-10 text-amber-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  // --- Header (shared across modes) ---
  const header = (
    <header className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Zap className="h-7 w-7 text-amber-400" />
            {mode === 'tag' ? 'Rapid Tagger' : 'Review Tags'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMode('tag'); setRetaggingId(null) }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              mode === 'tag'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/80'
            )}
          >
            <Pencil className="h-3.5 w-3.5" /> Tag
          </button>
          <button
            onClick={() => { setMode('review'); setRetaggingId(null) }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              mode === 'review'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/80'
            )}
          >
            <Eye className="h-3.5 w-3.5" /> Review
          </button>
        </div>
      </div>
    </header>
  )

  // ===================== REVIEW MODE =====================
  if (mode === 'review') {
    return (
      <div className="min-h-screen p-8 max-w-5xl mx-auto">
        {header}

        {/* Project filter */}
        <div className="glass-card p-4 mb-6 flex items-center gap-3">
          <ListFilter className="h-4 w-4 text-white/40" />
          <select
            value={reviewProject}
            onChange={e => { setReviewProject(e.target.value); setRetaggingId(null) }}
            className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none"
          >
            <option value="">All projects</option>
            {orderedProjects.map(p => (
              <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
            ))}
          </select>
          <span className="text-xs text-white/30 tabular-nums">
            {queue.length} items{data?.stats.totalValue ? ` / ${formatMoney(data.stats.totalValue)}` : ''}
          </span>
        </div>

        {/* Items list */}
        {queue.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-white/40">No items found{reviewProject ? ` for ${reviewProject}` : ''}.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {queue.map(item => {
              const isRetagging = retaggingId === item.id
              return (
                <div key={item.id}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer',
                      isRetagging
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : 'bg-white/[0.02] border border-white/5 hover:bg-white/5'
                    )}
                    onClick={() => setRetaggingId(isRetagging ? null : item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {item.type === 'invoice' ? (
                          <FileText className="h-3.5 w-3.5 text-red-400/60 shrink-0" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 text-red-400/60 shrink-0" />
                        )}
                        <span className="text-sm text-white/80 truncate">{item.vendor}</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-white/30 truncate mt-0.5 ml-5">{item.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-white/50 w-24 text-right shrink-0">{formatDate(item.date)}</span>
                    <span className="text-sm text-red-400/70 tabular-nums w-20 text-right shrink-0">{formatMoney(item.amount)}</span>
                    {item.currentProject ? (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-white/60 w-20 text-center shrink-0">
                        {item.currentProject}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 w-20 text-center shrink-0">
                        untagged
                      </span>
                    )}
                    {item.hasReceipt && <Paperclip className="h-3 w-3 text-green-400/50 shrink-0" />}
                  </div>

                  {/* Inline re-tag panel */}
                  {isRetagging && (
                    <div className="ml-8 mt-1 mb-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <p className="text-xs text-white/40 mb-2">
                        Re-tag <span className="text-white/70">{item.vendor}</span> — this will also update vendor rule
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {orderedProjects.slice(0, 9).map((project, idx) => (
                          <button
                            key={project.code}
                            onClick={(e) => {
                              e.stopPropagation()
                              tagMutation.mutate({
                                contactName: item.vendor,
                                projectCode: project.code,
                                saveAsRule: true,
                              })
                            }}
                            disabled={tagMutation.isPending}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg text-xs transition-colors border',
                              item.currentProject === project.code
                                ? 'bg-white/10 border-white/20 text-white/60'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80',
                              'disabled:opacity-40',
                            )}
                          >
                            <span className="text-white/30 mr-1">{idx + 1}</span>
                            {project.code}
                          </button>
                        ))}
                        {orderedProjects.length > 9 && orderedProjects.slice(9).map(project => (
                          <button
                            key={project.code}
                            onClick={(e) => {
                              e.stopPropagation()
                              tagMutation.mutate({
                                contactName: item.vendor,
                                projectCode: project.code,
                                saveAsRule: true,
                              })
                            }}
                            disabled={tagMutation.isPending}
                            className="px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
                          >
                            {project.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-6 py-3 text-sm text-white shadow-2xl">
              {toast}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===================== TAG MODE =====================

  // All clear state
  if (!data || queue.length === 0) {
    return (
      <div className="min-h-screen p-8 max-w-4xl mx-auto">
        {header}
        <div className="glass-card p-12 text-center max-w-lg mx-auto">
          <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-400 mb-2">All Clear!</h2>
          <p className="text-white/60 mb-1">Every transaction is tagged with a project code.</p>
          <button
            onClick={() => setMode('review')}
            className="mt-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <Eye className="h-4 w-4 inline mr-1.5" />
            Review existing tags
          </button>
          {sessionStats.tagged > 0 && (
            <div className="mt-6 pt-6 border-t border-white/10 text-sm text-white/50 space-y-1">
              <p>Session: {sessionStats.tagged} tagged, {sessionStats.rulesCreated} rules learned</p>
              {sessionStats.gstRecovered > 0 && <p>GST recovered: {formatMoney(sessionStats.gstRecovered)}</p>}
              {sessionStats.rdRecovered > 0 && <p>R&D offset: {formatMoney(sessionStats.rdRecovered)}</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Calendar sidebar component (reused in both modes)
  const calendarSidebar = activeItem && (
    <div className="glass-card p-4 sticky top-8">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-semibold text-white">{formatDate(activeItem.date)}</span>
      </div>
      {calData?.events && calData.events.length > 0 ? (
        <div className="space-y-1.5">
          {calData.events.slice(0, 8).map(ev => (
            <div key={ev.id} className={cn(
              'px-3 py-2 rounded-lg text-xs',
              calData.vendor_matched?.some(v => v.id === ev.id)
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-white/[0.03] border border-white/5'
            )}>
              <div className="flex items-center gap-1.5">
                <span className="text-white/30 tabular-nums shrink-0">{formatTime(ev.start_time)}</span>
                <span className="text-white/70 truncate">{ev.title}</span>
              </div>
              {ev.location && (
                <div className="flex items-center gap-1 mt-0.5 ml-[3.5rem]">
                  <MapPin className="h-2.5 w-2.5 text-white/20" />
                  <span className="text-white/30 truncate">{ev.location}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/20 py-3 text-center">No calendar events this day</p>
      )}
      {/* Show contextual events (nearby, relevant) that aren't already in the main list */}
      {calData?.contextual && calData.contextual.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[10px] uppercase tracking-wider text-white/20 mb-1.5">Nearby context</p>
          <div className="space-y-1.5">
            {calData.contextual.slice(0, 5).map(ev => (
              <div key={ev.id} className="px-3 py-2 rounded-lg text-xs bg-amber-500/5 border border-amber-500/10">
                <div className="flex items-center gap-1.5">
                  <span className="text-white/30 tabular-nums shrink-0">{formatTime(ev.start_time)}</span>
                  <span className="text-white/70 truncate">{ev.title}</span>
                </div>
                {ev.location && (
                  <div className="flex items-center gap-1 mt-0.5 ml-[3.5rem]">
                    <MapPin className="h-2.5 w-2.5 text-white/20" />
                    <span className="text-white/30 truncate">{ev.location}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      {header}

      {/* Progress Bar + Session Stats */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">
            <span className="text-white font-semibold">{sessionStats.tagged}</span> of{' '}
            <span className="text-white/80">{totalForProgress}</span> tagged this session
          </span>
          <div className="flex items-center gap-4 text-xs text-white/40">
            {sessionStats.rulesCreated > 0 && (
              <span>{sessionStats.rulesCreated} rules learned</span>
            )}
            {sessionStats.gstRecovered > 0 && (
              <span className="text-cyan-400">{formatMoney(sessionStats.gstRecovered)} GST</span>
            )}
            {sessionStats.rdRecovered > 0 && (
              <span className="text-lime-400">{formatMoney(sessionStats.rdRecovered)} R&D</span>
            )}
          </div>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-white/30">
          <span>{queue.length} remaining</span>
          <span>{formatMoney(data.stats.totalValue)} total value</span>
        </div>
      </div>

      {/* Two-column: Card + Buttons | Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div>
      {/* Current Card */}
      {currentItem && (
        <div className={cn(
          'glass-card p-8 mb-6 border-2 transition-all',
          currentItem.suggestedProject ? 'border-emerald-500/30' : 'border-white/10',
        )}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {currentItem.type === 'invoice' ? (
                  <FileText className="h-5 w-5 text-red-400" />
                ) : (
                  <Building2 className="h-5 w-5 text-red-400" />
                )}
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  currentItem.type === 'invoice'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-red-500/10 text-red-400'
                )}>
                  {currentItem.type === 'invoice' ? 'Supplier Bill' : 'Bank Payment'}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">{currentItem.vendor}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                <span className="flex items-center gap-1 text-xl font-semibold text-red-400 tabular-nums">
                  <ArrowDownLeft className="h-4 w-4" />
                  {formatMoney(currentItem.amount)}
                </span>
                <span>{formatDate(currentItem.date)}</span>
                {currentItem.description && (
                  <span className="text-white/30">{currentItem.description}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentItem.hasReceipt ? (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                  <Paperclip className="h-3 w-3" /> Proof attached
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-400/60 bg-amber-500/10 px-2 py-1 rounded-full">
                  <Paperclip className="h-3 w-3" /> No proof
                </span>
              )}
            </div>
          </div>

          {currentItem.suggestedProject ? (
            <div className="flex items-center gap-2 mb-6 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">
                Suggested: <span className="font-mono font-semibold">{currentItem.suggestedProject}</span>
                <span className="text-emerald-400/60 ml-1">({currentItem.confidence}%)</span>
              </span>
              <span className="text-xs text-white/30 ml-auto">Press Enter to accept</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-6 p-3 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-sm text-white/40">No suggestion — pick a project below</span>
            </div>
          )}

          {currentItem.siblingCount > 0 && (
            <p className="text-sm text-amber-400/80 mb-4">
              +{currentItem.siblingCount} more untagged item{currentItem.siblingCount > 1 ? 's' : ''} from this vendor
              — tagging will auto-tag all of them
            </p>
          )}

          {/* Notes */}
          <div>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <StickyNote className="h-3 w-3" />
              {showNotes ? 'Hide notes' : 'Add a note'}
              <kbd className="text-[10px] bg-white/10 px-1 py-0.5 rounded text-white/20">/</kbd>
            </button>
            {showNotes && (
              <textarea
                autoFocus
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="What is this for? Subscription to cancel? Need to investigate?"
                className="w-full mt-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 resize-none"
                rows={2}
              />
            )}
          </div>
        </div>
      )}

      {/* Project Buttons */}
      <div className="glass-card p-6 mb-6">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {orderedProjects.slice(0, 9).map((project, idx) => {
            const isRD = RD_PROJECTS.has(project.code)
            const isSuggested = currentItem?.suggestedProject === project.code
            return (
              <button
                key={project.code}
                onClick={() => handleTag(project.code)}
                disabled={tagMutation.isPending || !currentItem}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-3 rounded-xl text-left transition-all',
                  'border disabled:opacity-40',
                  isSuggested
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20',
                )}
              >
                <span className={cn(
                  'flex items-center justify-center w-6 h-6 rounded text-xs font-bold',
                  isSuggested ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40',
                )}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block truncate">{project.name}</span>
                  <span className="text-xs text-white/30 font-mono">{project.code}</span>
                </div>
                {isRD && (
                  <span className="text-[10px] text-lime-400 bg-lime-500/10 px-1.5 py-0.5 rounded">R&D</span>
                )}
              </button>
            )
          })}
        </div>

        {orderedProjects.length > 9 && (
          <div className="flex flex-wrap gap-1 mb-4 pt-2 border-t border-white/5">
            {orderedProjects.slice(9).map(project => (
              <button
                key={project.code}
                onClick={() => handleTag(project.code)}
                disabled={tagMutation.isPending || !currentItem}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors disabled:opacity-40"
              >
                {project.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-3 border-t border-white/5">
          <button
            onClick={handleSkip}
            disabled={!currentItem}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <SkipForward className="h-4 w-4" />
            Skip
            <kbd className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/30">Tab</kbd>
          </button>
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
            Undo
            <kbd className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/30">&#8984;Z</kbd>
          </button>
          {currentItem?.suggestedProject && (
            <button
              onClick={() => handleTag(currentItem.suggestedProject!)}
              disabled={tagMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40 ml-auto"
            >
              <Sparkles className="h-4 w-4" />
              Accept suggestion
              <kbd className="ml-1 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-300/50">Enter</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Queue Preview */}
      {previewItems.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-2 px-1">Up next</p>
          {previewItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-sm text-white/60 flex-1 truncate">{item.vendor}</span>
              <span className="text-sm text-white/40 tabular-nums">{formatMoney(item.amount)}</span>
              <span className="text-xs text-white/20">{formatDate(item.date)}</span>
              {item.suggestedProject && (
                <span className="text-xs text-emerald-400/60 font-mono">{item.suggestedProject}</span>
              )}
              {item.siblingCount > 0 && (
                <span className="text-xs text-amber-400/40">+{item.siblingCount}</span>
              )}
            </div>
          ))}
        </div>
      )}
      </div>{/* end left column */}

      {/* Right column: Calendar sidebar */}
      <div className="hidden lg:block">
        {calendarSidebar}
      </div>
      </div>{/* end two-column grid */}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-6 py-3 text-sm text-white shadow-2xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
