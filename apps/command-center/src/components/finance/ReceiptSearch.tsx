'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Search,
  X,
  Loader2,
  Mail,
  Calendar,
  CreditCard,
  FileText,
  ExternalLink,
  Link2,
  Sparkles,
} from 'lucide-react'
import { searchReceipts, type UnifiedSearchResult, type SuggestedMatch } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ReceiptSearchProps {
  isOpen: boolean
  onClose: () => void
  onMatch?: (transactionId: string, emailId: string) => void
}

const SOURCE_ICONS = {
  xero: CreditCard,
  gmail: Mail,
  calendar: Calendar,
}

const SOURCE_COLORS = {
  xero: 'text-blue-400 bg-blue-500/20',
  gmail: 'text-red-400 bg-red-500/20',
  calendar: 'text-purple-400 bg-purple-500/20',
}

export default function ReceiptSearch({ isOpen, onClose, onMatch }: ReceiptSearchProps) {
  const [query, setQuery] = useState('')
  const [sources, setSources] = useState<string[]>(['xero', 'gmail', 'calendar'])
  const [results, setResults] = useState<UnifiedSearchResult[]>([])
  const [suggestedMatches, setSuggestedMatches] = useState<SuggestedMatch[]>([])

  const searchMutation = useMutation({
    mutationFn: (q: string) => searchReceipts({ query: q, sources }),
    onSuccess: (data) => {
      setResults(data.results || [])
      setSuggestedMatches(data.suggested_matches || [])
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      searchMutation.mutate(query.trim())
    }
  }

  const toggleSource = (source: string) => {
    if (sources.includes(source)) {
      if (sources.length > 1) {
        setSources(sources.filter(s => s !== source))
      }
    } else {
      setSources([...sources, source])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-[#1a1a2e] rounded-xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-green-400" />
            Find Receipt
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-white/60" />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="p-4 border-b border-white/10">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search: Qantas $580 January..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || searchMutation.isPending}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-white/10 disabled:text-white/40 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {searchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>

          {/* Source Filters */}
          <div className="flex gap-2 mt-3">
            <span className="text-xs text-white/50 py-1">Sources:</span>
            {(['xero', 'gmail', 'calendar'] as const).map((source) => {
              const Icon = SOURCE_ICONS[source]
              const isActive = sources.includes(source)
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => toggleSource(source)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors',
                    isActive
                      ? SOURCE_COLORS[source]
                      : 'text-white/40 bg-white/5 hover:bg-white/10'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </button>
              )
            })}
          </div>
        </form>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Suggested Matches */}
          {suggestedMatches.length > 0 && (
            <div className="p-4 border-b border-white/10 bg-green-500/5">
              <h3 className="text-sm font-medium text-green-400 flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4" />
                Suggested Matches
              </h3>
              <div className="space-y-2">
                {suggestedMatches.slice(0, 3).map((match, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-white font-medium">
                          {match.transaction_vendor}
                        </span>
                        <span className="text-xs text-white/50">
                          ${match.transaction_amount?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Link2 className="h-3 w-3 text-white/40" />
                        <Mail className="h-3 w-3 text-red-400" />
                        <span className="text-xs text-white/70 truncate max-w-[300px]">
                          {match.email_subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-green-400">
                          {match.confidence}% confidence
                        </span>
                        <span className="text-xs text-white/40">
                          {match.reasons.join(' | ')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onMatch?.(match.transaction_id, match.email_id)}
                      className="px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                    >
                      Link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Results */}
          {results.length > 0 ? (
            <div className="p-4">
              <h3 className="text-sm font-medium text-white/60 mb-3">
                {results.length} results found
              </h3>
              <div className="space-y-2">
                {results.map((result, i) => {
                  const Icon = SOURCE_ICONS[result.source]
                  return (
                    <div
                      key={`${result.source}-${result.id}-${i}`}
                      className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn('p-2 rounded-lg', SOURCE_COLORS[result.source])}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {result.source === 'xero' && result.vendor}
                              {result.source === 'gmail' && result.subject}
                              {result.source === 'calendar' && result.title}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                              <span>
                                {result.date && format(new Date(result.date), 'MMM d, yyyy')}
                              </span>
                              {result.amount !== undefined && (
                                <span className="font-medium text-white/70">
                                  ${result.amount.toFixed(2)}
                                </span>
                              )}
                              {result.from && (
                                <span className="truncate max-w-[200px]">
                                  From: {result.from}
                                </span>
                              )}
                              {result.has_attachment && (
                                <span className="text-green-400 flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Attachment
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            result.relevance_score >= 80 ? 'bg-green-500/20 text-green-400' :
                            result.relevance_score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-white/10 text-white/50'
                          )}>
                            {result.relevance_score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : searchMutation.isSuccess && results.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords or expand your sources</p>
            </div>
          ) : !searchMutation.isPending && (
            <div className="p-8 text-center text-white/40">
              <p>Enter a search query to find receipts</p>
              <p className="text-sm mt-2">
                Try: "Qantas $580" or "Adobe subscription" or "hotel January"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>Searches Xero transactions, Gmail, and Calendar</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">Enter</kbd>
            to search
          </span>
        </div>
      </div>
    </div>
  )
}
