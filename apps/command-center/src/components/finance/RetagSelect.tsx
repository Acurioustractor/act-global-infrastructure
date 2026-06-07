'use client'

import { useState } from 'react'
import { Check, Loader2, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

// Inline re-tag for the OPERATE + MIRROR surfaces (plans 2026-05-29 P3 + mirror).
// Writes project_code straight to Supabase via the existing endpoints, all stamping
// a manual source so the auto-taggers won't overwrite it:
//   - bill        → PATCH /api/finance/transactions {id, source:'bill',  projectCode}
//   - spend       → PATCH /api/finance/transactions {id, source:'spend', projectCode}  (xero_transactions)
//   - bankLine    → POST  /api/finance/reconciliation/inbox {lineId, action:'tag', projectCode}
// The bank-line endpoint requires a projectCode (can't clear), so untag is bill/spend only.

export interface ProjectOption {
  code: string
  name: string
}

export function RetagSelect({
  kind,
  id,
  currentCode,
  projects,
  className,
}: {
  kind: 'bankLine' | 'bill' | 'spend'
  id: string
  currentCode: string | null
  projects: ProjectOption[]
  className?: string
}) {
  const [code, setCode] = useState(currentCode ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)

  async function save(next: string) {
    if (next === code) return
    setState('saving')
    setErr(null)
    try {
      const res =
        kind === 'bankLine'
          ? await fetch('/api/finance/reconciliation/inbox', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ lineId: id, action: 'tag', projectCode: next }),
            })
          : await fetch('/api/finance/transactions', {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ id, source: kind, projectCode: next || null }),
            })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      setCode(next)
      setState('saved')
      window.setTimeout(() => setState('idle'), 1800)
    } catch (e) {
      setState('error')
      setErr(e instanceof Error ? e.message : 'retag failed')
    }
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Tag className="h-3 w-3 text-white/40" />
      <select
        value={code}
        disabled={state === 'saving'}
        onChange={(e) => save(e.target.value)}
        className="rounded-md border border-white/15 bg-black/40 px-1.5 py-1 text-xs text-white/80 outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
        aria-label="Re-tag project"
      >
        {kind !== 'bankLine' ? (
          <option value="">untagged</option>
        ) : (
          !code && <option value="" disabled>set project…</option>
        )}
        {projects.map((p) => (
          <option key={p.code} value={p.code}>
            {p.code}
          </option>
        ))}
      </select>
      {state === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-white/50" />}
      {state === 'saved' && <Check className="h-3 w-3 text-emerald-300" />}
      {state === 'error' && (
        <span title={err || ''} className="text-[10px] font-medium text-red-300">
          err
        </span>
      )}
    </div>
  )
}
