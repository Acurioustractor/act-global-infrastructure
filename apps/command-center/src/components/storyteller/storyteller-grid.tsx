'use client'

import { useState } from 'react'
import { User, Search, ChevronDown, ChevronUp, Quote, Star, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StorytellerSummary } from '@/lib/api'

export function StorytellerGrid({ storytellers }: { storytellers: StorytellerSummary[] | undefined }) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = (storytellers || []).filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.displayName.toLowerCase().includes(q) ||
      s.themes.some((t) => t.toLowerCase().includes(q)) ||
      s.projects.some((p) => p.name.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-semibold text-white/70">
          Storytellers ({filtered.length})
        </h3>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Search name, theme, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/40 text-sm">
          No storytellers found
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const expanded = expandedId === s.id
            return (
              <div
                key={s.id}
                className="glass-card p-4 hover:border-pink-500/20 transition-colors cursor-pointer"
                onClick={() => setExpandedId(expanded ? null : s.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-white truncate">
                        {s.displayName}
                      </h4>
                      {s.isElder && (
                        <span className="flex-shrink-0" aria-label="Elder">
                          <Shield className="h-3.5 w-3.5 text-amber-400" />
                        </span>
                      )}
                      {s.isFeatured && (
                        <span className="flex-shrink-0" aria-label="Featured">
                          <Star className="h-3.5 w-3.5 text-yellow-400" />
                        </span>
                      )}
                    </div>

                    {s.projects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.projects.map((p) => (
                          <span
                            key={p.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {s.themes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.themes.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300"
                          >
                            {t.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {s.themes.length > 3 && (
                          <span className="text-[10px] text-white/30">
                            +{s.themes.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button className="text-white/20 hover:text-white/40 p-1">
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {expanded && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    {s.bio && (
                      <p className="text-xs text-white/50 line-clamp-3 mb-2">{s.bio}</p>
                    )}
                    {s.quoteCount > 0 && (
                      <div className={cn('flex items-center gap-1 text-xs text-white/40')}>
                        <Quote className="h-3 w-3" />
                        {s.quoteCount} quote{s.quoteCount !== 1 ? 's' : ''} extracted
                      </div>
                    )}
                    {s.culturalBackground.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.culturalBackground.map((c) => (
                          <span
                            key={c}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
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
