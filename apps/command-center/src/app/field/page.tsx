'use client'

/**
 * The Field — the one front door (bookmark this: /field).
 *
 * Day-to-day is FOUR moves, all from here:
 *   ☕ morning — the read is inline below; do its ≤7 things, close the tab
 *   📱 spare minutes — Triage (two buttons) or Circle (deep reads)
 *   ✍️ after a conversation — type one line in the capture box
 *   🔭 thinking time — the orbit / scope board
 */

import { useState } from 'react'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'

export default function FieldHub() {
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const capture = useMutation({
    mutationFn: (text: string) =>
      fetch('/api/field/surface', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
        .then(r => { if (!r.ok) throw new Error('failed'); return r.json() }),
    onSuccess: () => { setNote(''); setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* top bar: the four moves */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <div className="text-sm font-semibold">The Field</div>
        <nav className="flex gap-2 text-sm">
          <Link href="/field/triage" className="rounded-lg bg-emerald-800 px-3 py-1.5 hover:bg-emerald-700">👍👎 Triage</Link>
          <Link href="/field/circle" className="rounded-lg bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700">⭕ Circle reads</Link>
          <a href="/api/field/surface?name=orbit" target="_blank" className="rounded-lg bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700">🔭 Orbit</a>
          <a href="/api/field/surface?name=scope" target="_blank" className="rounded-lg bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700">🎯 Scope</a>
        </nav>
        {/* capture: one line about a person, lands on their page */}
        <form className="ml-auto flex w-[420px] items-center gap-2"
          onSubmit={e => { e.preventDefault(); if (note.trim()) capture.mutate(note) }}>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder='capture: "Andy keen to visit the farm in July"'
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none" />
          <button type="submit" disabled={capture.isPending || !note.trim()}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700 disabled:opacity-40">
            {capture.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4 text-emerald-400" /> : 'keep'}
          </button>
        </form>
      </div>
      {/* the morning read, inline — built 6:50am daily */}
      <iframe src="/api/field/surface?name=morning" className="w-full flex-1 border-0" title="The Field — morning read" />
    </div>
  )
}
