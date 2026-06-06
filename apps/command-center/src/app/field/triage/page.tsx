'use client'

/**
 * The Field — triage. One person. Two buttons. Click, click, click.
 *
 * v2 after Ben's "too many things, I can't remember the shortcuts": no keyboard
 * to memorise, no list to manage. One face at a time, two giant buttons —
 * "closer" / "not really" — plus a small "who?" for genuine strangers
 * (identity-confusion signal) and "skip". Arrow keys ← → also work but the
 * buttons say so; nothing to remember.
 *
 * Votes append to field-decisions.jsonl (source: triage-ui). Ledger only,
 * no GHL writes. Community lane never appears (OCAP).
 */

import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Sparkles } from 'lucide-react'

interface Person {
  name: string; org: string; position: string
  signal: number; beeper: string; gmail: string
  lastContact: string; tags: string[]; uncaptured: boolean
  ring: string | null; vote: string | null; relation: string | null
}
interface TriageData { people: Person[]; total: number }

export default function TriagePage() {
  const { data, isLoading } = useQuery<TriageData>({
    queryKey: ['field-triage'],
    queryFn: () => fetch('/api/field/circle?mode=triage').then(r => r.json()),
    refetchOnWindowFocus: false,
  })
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(0)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  // unvoted people only — resume where you left off, skip anyone already read
  // (a ring, a vote, OR a relation in the ledger all count as "read")
  const queue = (data?.people || []).filter(p => !p.vote && !p.ring && !p.relation)
  const person = queue[idx]
  const total = data?.people.length || 0
  const already = total - queue.length

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/field/circle', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })

  const vote = useCallback((v: 'up' | 'down' | 'noidea' | 'skip') => {
    if (!person) return
    if (v !== 'skip') {
      save.mutate(v === 'noidea' ? { name: person.name, noIdea: true } : { name: person.name, vote: v })
      setDone(d => d + 1)
      if (v !== 'noidea') { setFlash(v); setTimeout(() => setFlash(null), 250) }
    }
    setIdx(i => i + 1)
  }, [person, save])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); vote('up') }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); vote('down') }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [vote])

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> gathering the field…</div>

  if (!person) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-100">
        <Sparkles className="h-12 w-12 text-amber-400" />
        <div className="text-3xl font-bold">The whole field, aligned.</div>
        <div className="text-zinc-400">{done} votes this sitting.</div>
      </div>
    )
  }

  return (
    <div className={`flex h-screen flex-col bg-zinc-950 text-zinc-100 transition-colors duration-200 ${flash === 'up' ? 'bg-emerald-950' : flash === 'down' ? 'bg-zinc-900' : ''}`}>
      {/* progress — one number */}
      <div className="px-6 pt-5 text-center text-sm text-zinc-500">
        {already + done} of {total} · {done} this sitting{done >= 25 ? ' 🔥' : ''}
      </div>
      <div className="mx-auto mt-2 h-1 w-64 overflow-hidden rounded bg-zinc-800">
        <div className="h-full bg-emerald-600 transition-all" style={{ width: `${((already + done) / Math.max(total, 1)) * 100}%` }} />
      </div>

      {/* the person — centred, big */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">{person.name}</h1>
        {(person.org || person.position) && (
          <div className="mt-3 text-xl text-zinc-400">{person.org}{person.position ? ` · ${person.position}` : ''}</div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-500">
          {person.beeper && <span>chats: {person.beeper}</span>}
          {person.gmail && <span>emails {person.gmail}</span>}
          {person.lastContact && <span>last {person.lastContact}</span>}
        </div>
        <button onClick={() => vote('noidea')}
          className="mt-6 rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800">
          who? never heard of them
        </button>
      </div>

      {/* two buttons. that's it. */}
      <div className="flex gap-3 p-6 pb-10">
        <button onClick={() => vote('down')}
          className="flex-1 rounded-2xl bg-zinc-800 py-8 text-2xl font-bold text-zinc-300 transition hover:bg-zinc-700 active:scale-95">
          👎 not really
          <div className="mt-1 text-xs font-normal text-zinc-500">←</div>
        </button>
        <button onClick={() => vote('up')}
          className="flex-1 rounded-2xl bg-emerald-700 py-8 text-2xl font-bold transition hover:bg-emerald-600 active:scale-95">
          👍 closer
          <div className="mt-1 text-xs font-normal text-emerald-300/60">→</div>
        </button>
      </div>
      <button onClick={() => vote('skip')} className="pb-4 text-center text-xs text-zinc-600 hover:text-zinc-400">skip this one</button>
    </div>
  )
}
