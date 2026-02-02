'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, X, RefreshCw, User, FolderKanban, FileQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import { search } from '@/lib/api'

interface SearchResult {
  id: string
  type: string
  name: string
  score: number
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  // Handle search
  const handleSearch = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const data = await search(query)
      setSearchResults(data.results || [])
    } catch (e) {
      console.error('Search failed:', e)
      setSearchResults([])
    }
    setIsSearching(false)
  }, [])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  // Keyboard shortcut: ESC to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        setSearchQuery('')
        setSearchResults([])
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Reset state when closed
  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl mx-4 animate-slide-up">
        <div className="glass-card p-2 border-indigo-500/30">
          <div className="flex items-center gap-3 px-3">
            <Search className="h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="Search contacts, projects, knowledge..."
              className="flex-1 bg-transparent py-3 text-white placeholder:text-white/40 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="h-4 w-4 text-white/40" />
              </button>
            )}
            <kbd className="hidden md:inline-flex px-2 py-1 text-xs text-white/30 bg-white/5 rounded">
              ESC
            </kbd>
          </div>

          {/* Search Results */}
          {(searchResults.length > 0 || isSearching) && (
            <div className="border-t border-white/10 mt-2 pt-2 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="py-8 text-center text-white/40">
                  <RefreshCw className="h-5 w-5 mx-auto animate-spin mb-2" />
                  <p className="text-sm">Searching...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((result) => (
                    <Link
                      key={result.id}
                      href={
                        result.type === 'contact'
                          ? `/people`
                          : result.type === 'project'
                            ? `/projects/${result.id}`
                            : `/compendium`
                      }
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          result.type === 'contact' && 'bg-blue-500/20',
                          result.type === 'project' && 'bg-purple-500/20',
                          !['contact', 'project'].includes(result.type) && 'bg-amber-500/20'
                        )}
                      >
                        {result.type === 'contact' ? (
                          <User className="h-4 w-4 text-blue-400" />
                        ) : result.type === 'project' ? (
                          <FolderKanban className="h-4 w-4 text-purple-400" />
                        ) : (
                          <FileQuestion className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{result.name}</p>
                        <p className="text-xs text-white/40 capitalize">{result.type}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="border-t border-white/10 mt-2 pt-4 pb-2 text-center text-white/40">
              <p className="text-sm">No results for &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
