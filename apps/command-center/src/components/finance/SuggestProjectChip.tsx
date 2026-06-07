'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { suggestProject } from '@/lib/finance/suggest-project'

// Mirror AI-assist: for an untagged row, suggest a project from the proven
// location/vendor rules with the reason on hover; one click tags it (same PATCH
// path as RetagSelect, manual source). Only renders if the suggested code is a
// real project. Low-confidence (default) suggestions render muted.

export function SuggestProjectChip({
  vendor,
  description,
  id,
  source,
  validCodes,
  onAccepted,
}: {
  vendor: string | null
  description?: string | null
  id: string
  source: 'bill' | 'spend'
  validCodes: Set<string>
  onAccepted?: () => void
}) {
  const s = suggestProject(vendor, description)
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')

  if (!validCodes.has(s.code) || state === 'done') return null

  async function accept() {
    setState('saving')
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, source, projectCode: s.code }),
      })
      if (!res.ok) throw new Error('save failed')
      setState('done')
      onAccepted?.()
    } catch {
      setState('error')
    }
  }

  const tone =
    state === 'error'
      ? 'border-red-300/40 text-red-300'
      : s.confidence === 'high'
        ? 'border-emerald-300/40 text-emerald-200 hover:bg-emerald-500/10'
        : s.confidence === 'medium'
          ? 'border-cyan-300/40 text-cyan-200 hover:bg-cyan-500/10'
          : 'border-white/15 text-white/40 hover:bg-white/5'

  return (
    <button
      type="button"
      onClick={accept}
      disabled={state === 'saving'}
      title={`${s.reason} · ${s.confidence} confidence — click to tag ${s.code}`}
      className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition disabled:opacity-50', tone)}
    >
      {state === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {state === 'error' ? 'retry' : s.code}
    </button>
  )
}
