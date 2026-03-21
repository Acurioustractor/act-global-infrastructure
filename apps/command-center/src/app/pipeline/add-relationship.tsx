'use client'

import * as React from 'react'
import { Search, X, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { entityColor, entityTextColor } from './utils'

interface SearchResult {
  entity_type: string
  entity_id: string
  entity_name: string
  subtitle?: string
  value_high?: number
  already_tracked: boolean
}

interface AddRelationshipModalProps {
  onClose: () => void
  onAdded: () => void
}

export function AddRelationshipModal({ onClose, onAdded }: AddRelationshipModalProps) {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [adding, setAdding] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  React.useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/pipeline/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results || [])
      } catch {
        setResults([])
      }
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleAdd = async (result: SearchResult) => {
    setAdding(result.entity_id)
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: result.entity_type,
          entity_id: result.entity_id,
          entity_name: result.entity_name,
          subtitle: result.subtitle,
          value_high: result.value_high,
          stage: 'cold',
        }),
      })
      if (res.ok) {
        onAdded()
      }
    } catch {
      // Error handled silently
    }
    setAdding(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed z-[60] top-[20%] left-1/2 -translate-x-1/2 w-[32rem] bg-[#0d1117] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <Search className="h-4 w-4 text-white/30 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search grants, foundations, contacts, businesses..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X className="h-3.5 w-3.5 text-white/30 hover:text-white/60" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-white/30">Searching...</div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="p-4 text-center text-sm text-white/30">No results found</div>
          ) : (
            results.map((result) => (
              <div
                key={`${result.entity_type}:${result.entity_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
              >
                <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', entityColor(result.entity_type))} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium truncate">{result.entity_name}</span>
                    <span className={cn('text-[10px] font-semibold uppercase tracking-wider', entityTextColor(result.entity_type))}>
                      {result.entity_type}
                    </span>
                  </div>
                  {result.subtitle && (
                    <p className="text-xs text-white/30 truncate">{result.subtitle}</p>
                  )}
                </div>
                {result.value_high && (
                  <span className="text-xs text-green-400/60 tabular-nums flex-shrink-0">
                    ${result.value_high >= 1000 ? `${(result.value_high / 1000).toFixed(0)}K` : result.value_high}
                  </span>
                )}
                {result.already_tracked ? (
                  <span className="flex items-center gap-1 text-xs text-white/20 flex-shrink-0">
                    <Check className="h-3 w-3" />
                    Tracked
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(result)}
                    disabled={adding === result.entity_id}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-500/20 text-indigo-300 rounded-md hover:bg-indigo-500/30 transition-colors flex-shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                    {adding === result.entity_id ? '...' : 'Add'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-white/[0.06] flex justify-between items-center">
          <span className="text-[11px] text-white/20">
            Search across grants, foundations, contacts & Xero
          </span>
          <button
            onClick={onClose}
            className="text-xs text-white/40 hover:text-white/60"
          >
            Close <kbd className="ml-1 px-1 py-0.5 rounded bg-white/[0.06] text-[10px]">Esc</kbd>
          </button>
        </div>
      </div>
    </>
  )
}
