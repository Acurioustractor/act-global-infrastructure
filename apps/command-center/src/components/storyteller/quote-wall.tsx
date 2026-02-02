'use client'

import { Quote } from 'lucide-react'
import type { StorytellerQuote } from '@/lib/api'

function impactColor(score: number) {
  if (score >= 0.8) return 'border-pink-500/30'
  if (score >= 0.6) return 'border-indigo-500/20'
  return 'border-white/10'
}

export function QuoteWall({ quotes }: { quotes: StorytellerQuote[] | undefined }) {
  if (!quotes || quotes.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-white/40 text-sm">
        No quotes available
      </div>
    )
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white/70 mb-4">
        Featured Quotes ({quotes.length})
      </h3>
      <div className="columns-1 sm:columns-2 gap-3 space-y-3">
        {quotes.slice(0, 12).map((q, i) => (
          <div
            key={i}
            className={`break-inside-avoid rounded-xl border bg-white/[0.02] p-4 ${impactColor(q.impactScore)}`}
          >
            <Quote className="h-4 w-4 text-pink-400/40 mb-2" />
            <p className="text-sm text-white/80 italic leading-relaxed">
              &ldquo;{q.text}&rdquo;
            </p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/60">
                  — {q.storyteller}
                </p>
                {q.project && (
                  <p className="text-[10px] text-white/30">{q.project}</p>
                )}
              </div>
              {q.theme && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300">
                  {q.theme.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
