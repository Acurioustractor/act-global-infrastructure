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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Sparkles } from 'lucide-react'

interface Person {
  name: string; email: string; org: string; position: string
  signal: number; beeper: string; gmail: string
  lastContact: string; projects: string[]; roles: string[]; uncaptured: boolean
  ring: string | null; vote: string | null; relation: string | null
}
interface TriageData { people: Person[]; total: number }
interface Context { story: string; subjects: string[]; partners: string[]; orgGuess: string; needs: string[] }

const PROJECT_NAMES: Record<string, string> = {
  'act-hv': 'Harvest', 'act-gd': 'Goods', 'act-jh': 'JusticeHub', 'act-cg': 'CivicGraph',
  'act-el': 'Empathy Ledger', 'act-in': 'Studio', 'act-st': 'Studio', 'act-oo': 'Oonchiumpa', 'act-ce': 'Custodian First Economy',
}
const projectName = (c: string) => PROJECT_NAMES[c] || c

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

  // story-so-far for the current card: qwen summary + subjects + partners + needs
  const qc = useQueryClient()
  const ctxFetch = (p: Person) =>
    fetch(`/api/field/circle?context=${encodeURIComponent(p.name)}&email=${encodeURIComponent(p.email)}`).then(r => r.json())
  const { data: ctx } = useQuery<Context>({
    queryKey: ['triage-ctx', person?.name],
    queryFn: () => ctxFetch(person!),
    enabled: !!person,
    staleTime: Infinity,
  })
  // prefetch the next card while Ben reads this one — qwen's draft time hides
  useEffect(() => {
    const next = queue[idx + 1]
    if (next) qc.prefetchQuery({ queryKey: ['triage-ctx', next.name], queryFn: () => ctxFetch(next), staleTime: Infinity })
  }, [idx, queue, qc]) // eslint-disable-line react-hooks/exhaustive-deps

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
        {(person.org || person.position) ? (
          <div className="mt-3 text-xl text-zinc-400">{person.org}{person.position ? ` · ${person.position}` : ''}</div>
        ) : ctx?.orgGuess ? (
          <div className="mt-3 text-xl text-zinc-500">{ctx.orgGuess} <span className="text-sm">(from their email domain)</span></div>
        ) : null}
        {(ctx?.partners?.length || 0) > 0 && (
          <div className="mt-2 text-sm text-zinc-500">appears alongside {ctx!.partners.join(' · ')}</div>
        )}
        {/* what they're on + what they could be on */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {person.projects.map(p => (
            <span key={p} className="rounded-full bg-emerald-900/50 px-3 py-1 text-sm text-emerald-300">{projectName(p)}</span>
          ))}
          {person.roles.map(r => (
            <span key={r} className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-400">{r}</span>
          ))}
        </div>
        {(ctx?.needs?.length || 0) > 0 && (
          <div className="mt-3 max-w-xl text-sm text-amber-400/90">
            could help: {ctx!.needs.join(' · ')}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-500">
          {person.beeper && <span>chats: {person.beeper}</span>}
          {person.gmail && <span>emails {person.gmail}</span>}
          {person.lastContact && <span>last {person.lastContact}</span>}
        </div>

        {/* the story so far — qwen's summary of what ACTUALLY happened */}
        {person.email && (
          <div className="mt-5 w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 text-left">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">the story so far</div>
            {!ctx ? (
              <div className="text-sm text-zinc-500">reading the thread…</div>
            ) : ctx.story ? (
              <p className="text-base leading-relaxed text-zinc-200">{ctx.story}</p>
            ) : (ctx.subjects?.length || 0) > 0 ? null : (
              <div className="text-sm text-zinc-500">no email record — {person.beeper ? `chat only (${person.beeper})` : 'signal is thin'}</div>
            )}
            {(ctx?.subjects?.length || 0) > 0 && (
              <ul className="mt-3 space-y-0.5 font-mono text-xs text-zinc-500">
                {ctx!.subjects.map((s, i) => <li key={i} className="truncate">{s}</li>)}
              </ul>
            )}
          </div>
        )}

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
