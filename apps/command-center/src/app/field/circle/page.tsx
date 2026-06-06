'use client'

/**
 * The Field — circle session UI. One card, one human, one read.
 *
 * Recognition beats recall: the card leads with the ACTUAL email subjects and
 * who they appear alongside — the machine's ring guess is a hint chip, not the headline.
 * Keyboard-first: 1/2/3/4 = ring 5/15/50/150 · 0 = out · n = no idea · s = skip · ⌘↵ = save.
 * Every save appends to field-decisions.jsonl — same ledger the morning read,
 * person pages and the gated GHL applier already consume. No GHL writes from here.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, SkipForward, HelpCircle, Sparkles, MessageSquare, Mail, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Card {
  name: string; email: string; org: string; machineW: number
  ringGuess: string; guess: string; confidence: string
  beeper: string; gmail: string; lastContact: string
  tags: string[]; flags: string; uncaptured: boolean
  subjects: string[]; partners: string[]
}
interface Queue { queue: Card[]; total: number; doneToday: number }

const RINGS = [
  { v: '5', label: '5 · inner', key: '1', hue: 'bg-rose-600 hover:bg-rose-500' },
  { v: '15', label: '15 · close', key: '2', hue: 'bg-orange-600 hover:bg-orange-500' },
  { v: '50', label: '50 · active', key: '3', hue: 'bg-amber-600 hover:bg-amber-500' },
  { v: '150', label: '150 · field', key: '4', hue: 'bg-emerald-700 hover:bg-emerald-600' },
  { v: 'out', label: 'out', key: '0', hue: 'bg-zinc-700 hover:bg-zinc-600' },
]

export default function CirclePage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<Queue>({
    queryKey: ['field-circle'],
    queryFn: () => fetch('/api/field/circle').then(r => r.json()),
  })
  const [idx, setIdx] = useState(0)
  const [relation, setRelation] = useState('')
  const [pendingRing, setPendingRing] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [saved, setSaved] = useState(0)
  const relRef = useRef<HTMLTextAreaElement>(null)

  const card = data?.queue?.[idx]

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/field/circle', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(r => { if (!r.ok) throw new Error('save failed'); return r.json() }),
    onSuccess: () => {
      setStreak(s => s + 1); setSaved(s => s + 1)
      setRelation(''); setPendingRing(null); setIdx(i => i + 1)
    },
  })

  const submit = useCallback((extra: Record<string, unknown> = {}) => {
    if (!card || save.isPending) return
    save.mutate({ name: card.name, email: card.email || undefined, ring: pendingRing || undefined, relation: relation || undefined, ...extra })
  }, [card, pendingRing, relation, save])

  const skip = useCallback(() => { setRelation(''); setPendingRing(null); setIdx(i => i + 1) }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const inText = document.activeElement === relRef.current
      if (inText) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() }
        return
      }
      const ring = RINGS.find(r => r.key === e.key)
      if (ring) { e.preventDefault(); setPendingRing(p => (p === ring.v ? null : ring.v)) }
      else if (e.key === 'n') { e.preventDefault(); submit({ noIdea: true }) }
      else if (e.key === 's') { e.preventDefault(); skip() }
      else if (e.key === 'Enter') { e.preventDefault(); submit() }
      else if (e.key === '/') { e.preventDefault(); relRef.current?.focus() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [submit, skip])

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> loading the field…</div>

  if (!card) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-100">
        <Sparkles className="h-10 w-10 text-amber-400" />
        <div className="text-2xl font-semibold">Queue clear.</div>
        <div className="text-zinc-400">{saved} reads this sitting · every one now feeds the pages, the morning read, and the next pre-reads.</div>
        <button onClick={() => { setIdx(0); qc.invalidateQueries({ queryKey: ['field-circle'] }) }}
          className="mt-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700">re-check the queue</button>
      </div>
    )
  }

  const remaining = (data?.queue.length || 0) - idx

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        {/* progress */}
        <div className="mb-6 flex items-center justify-between text-sm text-zinc-400">
          <div>The Field — circle session</div>
          <div className="flex items-center gap-4">
            {streak >= 3 && <span className="text-amber-400">🔥 {streak} streak</span>}
            <span>{remaining} left · {(data?.doneToday || 0) + saved} read today</span>
          </div>
        </div>
        <div className="mb-8 h-1 w-full overflow-hidden rounded bg-zinc-800">
          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${(idx / Math.max(data?.queue.length || 1, 1)) * 100}%` }} />
        </div>

        {/* the human */}
        <div className="mb-1 flex items-baseline gap-3">
          <h1 className="text-4xl font-bold tracking-tight">{card.name}</h1>
          {card.org && <span className="text-lg text-zinc-400">{card.org}</span>}
        </div>
        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          {card.uncaptured && <span className="rounded bg-violet-900/60 px-2 py-0.5 text-violet-300">uncaptured — not in GHL</span>}
          {card.beeper && <span className="rounded bg-zinc-800 px-2 py-0.5"><MessageSquare className="mr-1 inline h-3 w-3" />{card.beeper}</span>}
          {card.gmail && <span className="rounded bg-zinc-800 px-2 py-0.5"><Mail className="mr-1 inline h-3 w-3" />in/out {card.gmail}</span>}
          {card.lastContact && <span className="rounded bg-zinc-800 px-2 py-0.5">last {card.lastContact}</span>}
          {card.tags.map(t => <span key={t} className="rounded bg-zinc-800/60 px-2 py-0.5 text-zinc-400">{t}</span>)}
        </div>

        {/* recognition anchors — the point of the card */}
        {card.subjects.length > 0 && (
          <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">the actual thread</div>
            <ul className="space-y-1 font-mono text-sm text-zinc-300">
              {card.subjects.map((s, i) => <li key={i} className="truncate">{s.replace(/^- /, '')}</li>)}
            </ul>
          </div>
        )}
        {card.partners.length > 0 && (
          <div className="mb-4 text-sm text-zinc-400">
            <Users className="mr-1 inline h-4 w-4" /> appears alongside {card.partners.join(' · ')}
          </div>
        )}
        {card.flags && <div className="mb-4 text-sm text-amber-400/90">{card.flags}</div>}

        {/* machine hint — deliberately small */}
        <div className="mb-6 text-xs text-zinc-500">
          machine: ring {card.ringGuess} ({card.confidence}) — {card.guess}
        </div>

        {/* the read */}
        <div className="mb-4 flex flex-wrap gap-2">
          {RINGS.map(r => (
            <button key={r.v} onClick={() => setPendingRing(p => (p === r.v ? null : r.v))}
              className={cn('rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition',
                r.hue, pendingRing === r.v ? 'ring-2 ring-white' : 'opacity-80')}>
              {r.label} <span className="ml-1 text-xs opacity-60">{r.key}</span>
            </button>
          ))}
        </div>
        <textarea ref={relRef} value={relation} onChange={e => setRelation(e.target.value)}
          placeholder="who are they to you — your words ( / to focus · ⌘↵ to save )"
          rows={2}
          className="mb-4 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none" />

        <div className="flex items-center gap-3">
          <button onClick={() => submit()} disabled={save.isPending || (!pendingRing && !relation)}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'save read ↵'}
          </button>
          <button onClick={() => submit({ noIdea: true })}
            className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm hover:bg-zinc-700">
            <HelpCircle className="mr-1 inline h-4 w-4" />no idea <span className="text-xs text-zinc-500">n</span>
          </button>
          <button onClick={skip} className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800">
            <SkipForward className="mr-1 inline h-4 w-4" />skip <span className="text-xs text-zinc-600">s</span>
          </button>
        </div>
      </div>
    </div>
  )
}
