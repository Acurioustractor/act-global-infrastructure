'use client'

/**
 * The Field — triage mode. Every supporter-lane human, one list, flick-speed.
 *
 * The "align the whole field" pass Ben asked for (2026-06-06): ~300 signal people
 * at a few seconds each. Three verbs, no essays:
 *   → / u   pull closer (upvote — energy-giving, want more)
 *   ← / d   push out   (downvote — drift, vendor-ish, not mine)
 *   space   right where they are (confirm)
 *   n       no idea (identity-confusion class)
 *   j / k   move without voting
 * Votes append to field-decisions.jsonl (source: triage-ui) — ledger only, no GHL
 * writes, warmth v2 consumes them. Community lane never appears here (OCAP).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, HelpCircle, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Person {
  name: string; org: string; position: string
  signal: number; beeper: string; gmail: string
  lastContact: string; tags: string[]; uncaptured: boolean
  ring: string | null; vote: string | null; relation: string | null
}
interface TriageData { people: Person[]; total: number }

type Verdict = 'up' | 'down' | 'confirm' | 'noidea'
const VERDICT_STYLE: Record<Verdict, string> = {
  up: 'border-l-emerald-500 bg-emerald-950/30',
  down: 'border-l-zinc-600 bg-zinc-900/60 opacity-50',
  confirm: 'border-l-sky-600 bg-sky-950/20',
  noidea: 'border-l-violet-600 bg-violet-950/20 opacity-60',
}
const MILESTONES = [25, 50, 100, 150, 200, 250, 300]

export default function TriagePage() {
  const { data, isLoading } = useQuery<TriageData>({
    queryKey: ['field-triage'],
    queryFn: () => fetch('/api/field/circle?mode=triage').then(r => r.json()),
    refetchOnWindowFocus: false,
  })
  const [idx, setIdx] = useState(0)
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
  const [streak, setStreak] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  const people = data?.people || []
  const done = Object.keys(verdicts).length
  const alreadyRead = people.filter(p => p.ring || p.vote).length

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/field/circle', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(r => { if (!r.ok) throw new Error('save failed'); return r.json() }),
  })

  const vote = useCallback((v: Verdict) => {
    const p = people[idx]; if (!p) return
    setVerdicts(prev => ({ ...prev, [p.name]: v }))
    setStreak(s => {
      const n = s + 1
      if (MILESTONES.includes(n)) { setToast(`${n} in a row 🔥`); setTimeout(() => setToast(null), 1800) }
      return n
    })
    save.mutate(v === 'noidea' ? { name: p.name, noIdea: true } : { name: p.name, vote: v })
    setIdx(i => Math.min(i + 1, people.length - 1))
  }, [people, idx, save])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'u') { e.preventDefault(); vote('up') }
      else if (e.key === 'ArrowLeft' || e.key === 'd') { e.preventDefault(); vote('down') }
      else if (e.key === ' ') { e.preventDefault(); vote('confirm') }
      else if (e.key === 'n') { e.preventDefault(); vote('noidea') }
      else if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, people.length - 1)) }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [vote, people.length])

  useEffect(() => {
    rowRefs.current[idx]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [idx])

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> gathering the field…</div>

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* sticky header */}
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between text-sm">
          <div className="font-semibold">The Field — triage <span className="ml-2 text-xs font-normal text-zinc-500">→ closer · ← out · space confirm · n no idea · j/k move</span></div>
          <div className="flex items-center gap-3 text-zinc-400">
            {streak >= 5 && <span className="text-amber-400">🔥 {streak}</span>}
            <span>{done + alreadyRead} / {people.length}</span>
          </div>
        </div>
        <div className="mx-auto mt-2 h-1 max-w-3xl overflow-hidden rounded bg-zinc-800">
          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${((done + alreadyRead) / Math.max(people.length, 1)) * 100}%` }} />
        </div>
      </div>

      {toast && <div className="fixed left-1/2 top-20 z-20 -translate-x-1/2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 shadow-lg">{toast}</div>}

      {/* the list */}
      <div className="mx-auto max-w-3xl px-6 py-4">
        {people.map((p, i) => {
          const v = verdicts[p.name]
          const focused = i === idx
          return (
            <div key={p.name} ref={el => { rowRefs.current[i] = el }}
              onClick={() => setIdx(i)}
              className={cn(
                'mb-1.5 cursor-pointer rounded-lg border-l-4 border-zinc-800 px-4 py-2.5 transition',
                v ? VERDICT_STYLE[v] : 'border-l-transparent',
                focused ? 'bg-zinc-900 ring-1 ring-zinc-600' : !v && 'bg-zinc-900/40 hover:bg-zinc-900/70',
              )}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2 truncate">
                  <span className={cn('font-semibold', focused && 'text-lg')}>{p.name}</span>
                  {p.org && <span className="truncate text-sm text-zinc-400">{p.org}{p.position ? ` · ${p.position}` : ''}</span>}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
                  {p.ring && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">ring {p.ring}</span>}
                  {p.uncaptured && <span className="text-violet-400">uncaptured</span>}
                  {p.lastContact && <span>{p.lastContact}</span>}
                  <span className="text-zinc-600">w{p.signal}</span>
                </div>
              </div>
              {focused && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  {p.relation && <span className="text-emerald-400/90">"{p.relation}"</span>}
                  {p.beeper && <span className="rounded bg-zinc-800 px-1.5 py-0.5">beeper: {p.beeper}</span>}
                  {p.gmail && <span className="rounded bg-zinc-800 px-1.5 py-0.5">email in/out {p.gmail}</span>}
                  {p.tags.map(t => <span key={t} className="rounded bg-zinc-800/60 px-1.5 py-0.5">{t}</span>)}
                  <span className="ml-auto flex gap-1.5">
                    <button onClick={e => { e.stopPropagation(); vote('down') }} className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700" title="push out (←)"><ArrowLeft className="h-3.5 w-3.5" /></button>
                    <button onClick={e => { e.stopPropagation(); vote('confirm') }} className="rounded bg-sky-900 p-1.5 hover:bg-sky-800" title="right where they are (space)"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={e => { e.stopPropagation(); vote('noidea') }} className="rounded bg-violet-900 p-1.5 hover:bg-violet-800" title="no idea (n)"><HelpCircle className="h-3.5 w-3.5" /></button>
                    <button onClick={e => { e.stopPropagation(); vote('up') }} className="rounded bg-emerald-800 p-1.5 hover:bg-emerald-700" title="pull closer (→)"><ArrowRight className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
              )}
            </div>
          )
        })}
        {done + alreadyRead >= people.length && people.length > 0 && (
          <div className="my-12 flex flex-col items-center gap-3 text-center">
            <Sparkles className="h-10 w-10 text-amber-400" />
            <div className="text-2xl font-semibold">The whole field, aligned.</div>
            <div className="text-zinc-400">{done} votes this sitting. Warmth v2 eats these next.</div>
          </div>
        )}
      </div>
    </div>
  )
}
