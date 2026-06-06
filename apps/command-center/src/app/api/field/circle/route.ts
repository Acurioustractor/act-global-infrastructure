import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * The Field — circle-session API.
 *
 * GET  → the undealt pre-read queue, each person enriched with RECOGNITION anchors
 *        (real email subjects from their person page, co-occurrence partners, signals)
 *        — the 2026-06-06 lesson: qwen's one-line guess alone is useless; the thread
 *        is what makes Ben go "oh, THAT person".
 * POST → append Ben's read to thoughts/shared/field-decisions.jsonl (the same ledger
 *        the workbench + person pages + morning read consume). Local file write only —
 *        GHL writes stay in the gated applier (apply-field-decisions.mjs).
 */

const REPO = path.resolve(process.cwd(), '..', '..')
const PREREADS = path.join(REPO, 'thoughts/shared/field-prereads.jsonl')
const DECISIONS = path.join(REPO, 'thoughts/shared/field-decisions.jsonl')
const WORKLIST = path.join(REPO, 'thoughts/shared/unified-orbit-worklist.csv')
const COOC = path.join(REPO, 'thoughts/shared/orbit-cooccurrence.csv')
const PEOPLE = path.join(REPO, 'thoughts/shared/people')

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function parseCSV(t: string): string[][] {
  const R: string[][] = []; let r: string[] = [], f = '', Q = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (Q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else Q = false } else f += c }
    else if (c === '"') Q = true
    else if (c === ',') { r.push(f); f = '' }
    else if (c === '\n') { r.push(f); R.push(r); r = []; f = '' }
    else if (c !== '\r') f += c
  }
  if (f || r.length) { r.push(f); R.push(r) }
  return R
}
function rows(t: string): Record<string, string>[] {
  const R = parseCSV(t); const h = R[0]
  return R.slice(1).filter(x => x.length === h.length).map(x => Object.fromEntries(h.map((k, i) => [k, x[i]])))
}
async function readIf(p: string): Promise<string> { try { return await fs.readFile(p, 'utf8') } catch { return '' } }
function jsonl(t: string): any[] {
  return t.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
}

const SOIL = path.join(REPO, 'thoughts/shared/orbit-soil.csv')
const isHandle = (n: string) => /@/.test(n) || /^\+?\d[\d \-()]{6,}$/.test((n || '').trim())
const isInternal = (n: string) => /^(ben(jamin)? knight|nic(holas)? marchesi( oam)?|a curious tractor)$/i.test((n || '').trim())

/** Triage mode: EVERY supporter-lane human in one fast list — upvote (pull closer),
 *  downvote (push out), confirm (right where they are). Community lane never appears
 *  (OCAP — never laddered). Votes are ledger-only; warmth v2 consumes them. */
async function triageList() {
  const [decTxt, wlTxt, soilTxt] = await Promise.all([readIf(DECISIONS), readIf(WORKLIST), readIf(SOIL)])
  const reads = new Map<string, any>()
  for (const d of jsonl(decTxt)) reads.set(norm(d.name), d) // latest wins
  const soil = new Map<string, Record<string, string>>()
  for (const s of rows(soilTxt)) { const k = norm(s.name); if (k && !soil.has(k)) soil.set(k, s) }

  const seen = new Set<string>()
  const people = []
  for (const p of rows(wlTxt)) {
    if (p.status === 'community' || p.status === 'ghost' || p.vendor === 'yes') continue
    if (isHandle(p.name || '') || isInternal(p.name || '')) continue
    const k = norm(p.name); if (!k || seen.has(k)) continue; seen.add(k)
    const bs = Number(p.beeper_score) || 0
    const [gi, go] = (p.gmail_in_out || '').split('/').map(Number)
    const signal = bs + ((gi && go) ? Math.min(gi, go) : 0)
    const d = reads.get(k)
    const s = soil.get(k)
    const tags = (p.rel_tags || '').split(' ').filter(Boolean)
    people.push({
      name: p.name, email: (p.email || '').toLowerCase(),
      org: s?.company || '', position: s?.position || '',
      signal, beeper: p.beeper_pattern || '', gmail: p.gmail_in_out || '',
      lastContact: p.last_contact || '',
      projects: tags.filter(t => t.startsWith('project:')).map(t => t.slice(8)),
      roles: tags.filter(t => t.startsWith('role:')).map(t => t.slice(5)),
      uncaptured: p.in_ghl === 'n',
      ring: d?.ring || null, vote: d?.vote || null, relation: d?.relation || null,
    })
  }
  people.sort((a, b) => b.signal - a.signal)
  return people
}

/** Per-person context for the triage screen: recent email subjects (recognition
 *  anchor, live from the spine) + what the Stage-F needs-matcher thinks they
 *  could help with. Fetched lazily per card — 1,846 people, only the current one. */
async function personContext(name: string, email: string) {
  let subjects: string[] = []
  if (email) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      // spine join key is ghl_contact_id, NOT email (same lesson as build-person-pages.mjs)
      const { data: contacts } = await sb.from('ghl_contacts').select('ghl_id').eq('email', email.toLowerCase()).limit(10)
      const ids = (contacts || []).map(c => c.ghl_id).filter(Boolean)
      const q = sb.from('communications_history').select('occurred_at,direction,subject')
        .order('occurred_at', { ascending: false }).limit(6)
      const { data } = ids.length
        ? await q.in('ghl_contact_id', ids)
        : await q.eq('contact_email', email.toLowerCase())
      subjects = (data || []).filter(r => r.subject)
        .map(r => `${(r.occurred_at || '').slice(0, 10)} ${r.direction === 'inbound' ? '←' : '→'} ${r.subject.slice(0, 80)}`)
    } catch { /* spine unavailable → subjects stay empty */ }
  }
  const needs: string[] = []
  const matchTxt = await readIf(path.join(REPO, 'thoughts/shared/project-needs-match.csv'))
  if (matchTxt) {
    for (const r of rows(matchTxt)) {
      if (norm(r.name || r.person || '') === norm(name) && (r.need || r.need_label))
        needs.push(`${r.project || ''} — ${r.need || r.need_label}`.replace(/^ — /, ''))
    }
  }
  return { subjects, needs: needs.slice(0, 3) }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  if (params.get('context') != null)
    return NextResponse.json(await personContext(params.get('context') || '', params.get('email') || ''))
  if (params.get('mode') === 'triage') {
    const people = await triageList()
    return NextResponse.json({ people, total: people.length })
  }
  const [preTxt, decTxt, wlTxt, coocTxt] = await Promise.all([
    readIf(PREREADS), readIf(DECISIONS), readIf(WORKLIST), readIf(COOC),
  ])
  const dealt = new Set(jsonl(decTxt).map(d => norm(d.name)))
  const decisionsToday = jsonl(decTxt).filter(d => d.ts === new Date().toLocaleDateString('en-CA')).length
  const wl = new Map<string, Record<string, string>>()
  for (const r of rows(wlTxt)) { const k = norm(r.name); if (k && !wl.has(k)) wl.set(k, r) }
  const cooc = rows(coocTxt)

  const queue = []
  for (const p of jsonl(preTxt)) {
    if (dealt.has(norm(p.name))) continue
    const w = wl.get(norm(p.name))
    // recognition anchor: the actual email subjects off their person page
    let subjects: string[] = []
    const page = await readIf(path.join(PEOPLE, `${slug(p.name)}.md`))
    const hist = page.match(/## Shared history[^\n]*\n([\s\S]*?)(\n## |$)/)
    if (hist) subjects = hist[1].split('\n').filter(l => l.startsWith('- 20')).slice(0, 8)
    const partners = cooc
      .filter(r => norm(r.a) === norm(p.name) || norm(r.b) === norm(p.name))
      .sort((a, b) => +b.emails_together - +a.emails_together).slice(0, 4)
      .map(r => (norm(r.a) === norm(p.name) ? r.b : r.a))
    queue.push({
      name: p.name, org: p.org || '', machineW: p.machine_w,
      ringGuess: p.ring_guess, guess: p.guess, confidence: p.confidence,
      beeper: w?.beeper_pattern || '', gmail: w?.gmail_in_out || '',
      lastContact: w?.last_contact || '', tags: (w?.rel_tags || '').split(' ').filter(Boolean),
      flags: w?.flags || '', uncaptured: w?.in_ghl === 'n',
      subjects, partners,
    })
  }
  queue.sort((a, b) => b.machineW - a.machineW)
  return NextResponse.json({ queue, total: queue.length, doneToday: decisionsToday })
}

export async function POST(req: Request) {
  const body = await req.json()
  const name = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const ring = body.ring != null ? String(body.ring) : undefined
  if (ring && !['5', '15', '50', '150', 'out'].includes(ring))
    return NextResponse.json({ error: 'ring must be 5|15|50|150|out' }, { status: 400 })

  const vote = body.vote ? String(body.vote) : undefined
  if (vote && !['up', 'down', 'confirm'].includes(vote))
    return NextResponse.json({ error: 'vote must be up|down|confirm' }, { status: 400 })

  const entry: Record<string, unknown> = {
    ts: new Date().toLocaleDateString('en-CA'),
    source: vote ? 'triage-ui' : 'circle-ui',
    name,
  }
  if (vote) entry.vote = vote
  if (ring) entry.ring = ring
  if (typeof body.energy === 'number') entry.energy = body.energy
  if (body.relation) entry.relation = String(body.relation).slice(0, 500)
  if (body.noIdea) {
    entry.ring = 'out'; entry.energy = 5
    entry.relation = entry.relation || "Ben doesn't know this person"
    entry.algo_note = 'identity-confusion class — unrecognized in circle UI'
  }
  await fs.appendFile(DECISIONS, JSON.stringify(entry) + '\n')
  return NextResponse.json({ ok: true, entry })
}
