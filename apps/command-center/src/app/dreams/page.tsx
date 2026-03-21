'use client'

import { useState, useEffect, useCallback } from 'react'
import { PenLine, Plus, Search, Mic, Send, Trash2, ArrowLeft, ExternalLink } from 'lucide-react'

const CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  dream: { label: 'Dream', emoji: '🌙', color: 'purple' },
  story: { label: 'Story', emoji: '📖', color: 'pink' },
  reflection: { label: 'Reflection', emoji: '🪞', color: 'blue' },
  excitement: { label: 'Excitement', emoji: '⚡', color: 'amber' },
  idea: { label: 'Idea', emoji: '💡', color: 'emerald' },
  experience: { label: 'Experience', emoji: '✨', color: 'cyan' },
  love: { label: 'Love', emoji: '❤️', color: 'red' },
  vision: { label: 'Vision', emoji: '🔮', color: 'violet' },
}

const COLOR_MAP: Record<string, string> = {
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  pink: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  red: 'bg-red-500/15 text-red-400 border-red-500/20',
  violet: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
}

interface DreamEntry {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  source: string
  author: string
  media_url?: string
  media_type?: string
  ai_themes?: string[]
  ai_linked_projects?: string[]
  created_at: string
  updated_at: string
}

export default function DreamsPage() {
  const [entries, setEntries] = useState<DreamEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<DreamEntry | null>(null)
  const [quickText, setQuickText] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filter !== 'all') params.set('category', filter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/dream-journal?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries)
      }
    } catch (err) {
      console.error('Failed to fetch dreams:', err)
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Auto-refresh every 30s for Telegram entries
  useEffect(() => {
    const interval = setInterval(fetchEntries, 30000)
    return () => clearInterval(interval)
  }, [fetchEntries])

  const quickSave = async () => {
    if (!quickText.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/dream-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: quickText.trim() }),
      })
      if (res.ok) {
        setQuickText('')
        fetchEntries()
      }
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    try {
      await fetch(`/api/dream-journal/${id}`, { method: 'DELETE' })
      setSelectedEntry(null)
      fetchEntries()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const counts: Record<string, number> = { all: entries.length }
  entries.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1 })

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PenLine className="w-5 h-5 text-purple-400" />
            <div>
              <h1 className="text-lg font-semibold">Dream Journal</h1>
              <p className="text-xs text-white/40">Love & Future Wiki — {entries.length} entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            Synced — send /dream on Telegram to capture on the go
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar filters */}
        <div className="w-56 border-r border-white/5 p-4 space-y-1 shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex justify-between items-center ${filter === 'all' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
          >
            All <span className="text-xs opacity-50">{counts.all}</span>
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex justify-between items-center ${filter === key ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
            >
              <span>{cat.emoji} {cat.label}</span>
              <span className="text-xs opacity-50">{counts[key] || 0}</span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-6">
          {/* Quick add + search */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search dreams..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          {/* Quick add bar */}
          <div className="mb-6 flex gap-2">
            <textarea
              value={quickText}
              onChange={e => setQuickText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); quickSave() }}}
              placeholder="Quick thought... hit Enter to save (Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 resize-none"
            />
            <button
              onClick={quickSave}
              disabled={saving || !quickText.trim()}
              className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-30 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Entry detail or list */}
          {selectedEntry ? (
            <div className="max-w-2xl">
              <button onClick={() => setSelectedEntry(null)} className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex items-center gap-2 mb-3">
                {(() => { const cat = CATEGORIES[selectedEntry.category] || CATEGORIES.idea; return (
                  <span className={`px-2 py-0.5 rounded text-xs border ${COLOR_MAP[cat.color] || COLOR_MAP.purple}`}>{cat.emoji} {cat.label}</span>
                )})()}
                {selectedEntry.source === 'telegram' && <span className="text-xs text-white/30">📱 via Telegram</span>}
                {selectedEntry.source === 'voice' && <span className="text-xs text-white/30">🎙️ Voice</span>}
                <span className="text-xs text-white/30 ml-auto">{new Date(selectedEntry.created_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <h2 className="text-2xl font-semibold mb-4">{selectedEntry.title}</h2>
              {selectedEntry.media_url && (
                <img src={selectedEntry.media_url} alt="" className="max-w-full rounded-xl border border-white/10 mb-4" />
              )}
              <div className="text-white/70 leading-relaxed whitespace-pre-wrap text-[15px]">{selectedEntry.content}</div>
              {selectedEntry.tags?.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-4">
                  {selectedEntry.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 bg-white/5 rounded text-white/40">#{t}</span>)}
                </div>
              )}
              {selectedEntry.ai_linked_projects && selectedEntry.ai_linked_projects.length > 0 && (
                <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-400/60 mb-1">Linked Projects</div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedEntry.ai_linked_projects.map(p => <span key={p} className="text-xs px-2 py-0.5 bg-emerald-500/10 rounded text-emerald-400">{p}</span>)}
                  </div>
                </div>
              )}
              <div className="mt-6 pt-4 border-t border-white/5">
                <button onClick={() => deleteEntry(selectedEntry.id)} className="flex items-center gap-1 text-xs text-red-400/60 hover:text-red-400">
                  <Trash2 className="w-3 h-3" /> Delete entry
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center text-white/30 py-12">Loading dreams...</div>
              ) : entries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🌱</div>
                  <h3 className="text-lg font-medium mb-1">Start dreaming</h3>
                  <p className="text-sm text-white/40">Capture stories, reflections, wild ideas, and moments of love.</p>
                  <p className="text-xs text-white/30 mt-2">Use the quick-add bar above, or send /dream on Telegram</p>
                </div>
              ) : entries.map(entry => {
                const cat = CATEGORIES[entry.category] || CATEGORIES.idea
                const projects = entry.ai_linked_projects || []
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] hover:border-white/10 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] border ${COLOR_MAP[cat.color] || COLOR_MAP.purple}`}>{cat.emoji} {cat.label}</span>
                      {entry.source === 'telegram' && <span className="text-[11px] text-white/25">📱</span>}
                      {entry.source === 'voice' && <span className="text-[11px] text-white/25">🎙️</span>}
                      {projects.length > 0 && <span className="text-[11px] text-emerald-400/60">{projects.join(' ')}</span>}
                      <span className="text-[11px] text-white/20 ml-auto">{new Date(entry.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <h3 className="font-medium text-sm mb-1">{entry.title}</h3>
                    <p className="text-xs text-white/40 line-clamp-2">{entry.content}</p>
                    {entry.tags?.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {entry.tags.slice(0, 5).map(t => <span key={t} className="text-[10px] text-white/25">#{t}</span>)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
