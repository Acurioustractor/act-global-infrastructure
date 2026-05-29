'use client'

import { useRef, useState } from 'react'
import { Loader2, Check, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

// Mirror close-the-loop Phase 1: pick a file → POST it to Xero's Attachments API
// (server route resolves the Xero GUID + endpoint) → row flips to a receipt ✓.
// Used in place of the red ✗ on bills flagged "no receipt".

export function AttachReceiptButton({
  id,
  source,
  onAttached,
  className,
}: {
  id: string
  source: string
  onAttached?: () => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setState('uploading')
    setErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('id', id)
      fd.append('source', source)
      const res = await fetch('/api/finance/xero-pushback/attach', { method: 'POST', body: fd })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      setState('done')
      onAttached?.()
    } catch (e) {
      setState('error')
      setErr(e instanceof Error ? e.message : 'upload failed')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (state === 'done') {
    return (
      <span title="Receipt attached in Xero" className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200', className)}>
        <Check className="h-3 w-3" />
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center', className)}>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
      <button
        type="button"
        disabled={state === 'uploading'}
        onClick={() => inputRef.current?.click()}
        title={err || 'Attach a receipt to this bill in Xero'}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition disabled:opacity-50',
          state === 'error' ? 'border-red-300/40 text-red-300 hover:bg-red-500/10' : 'border-cyan-300/40 text-cyan-200 hover:bg-cyan-500/10',
        )}
      >
        {state === 'uploading' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        {state === 'error' ? 'retry' : 'attach'}
      </button>
    </span>
  )
}
