import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Serve The Field's generated HTML surfaces (built by the 6:50am cron into
 * thoughts/shared/) through command-center, so the day-to-day front door is
 * ONE url — no file:// paths, no terminal. Read-only.
 * Also accepts POST /api/field/surface (capture) → field-capture ledger.
 */
const REPO = path.resolve(process.cwd(), '..', '..')
const SURFACES: Record<string, string> = {
  morning: 'thoughts/shared/the-field-morning.html',
  orbit: 'thoughts/shared/orbit-viz.html',
  scope: 'thoughts/shared/project-scope-board.html',
  whole: 'thoughts/shared/the-whole-picture.html',
  monday: 'thoughts/shared/monday-card.html',
}

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get('name') || 'morning'
  const file = SURFACES[name]
  if (!file) return NextResponse.json({ error: 'unknown surface' }, { status: 404 })
  try {
    const html = await fs.readFile(path.join(REPO, file), 'utf8')
    return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  } catch {
    return new NextResponse(`<html><body style="background:#0b0e14;color:#8b98a9;font-family:sans-serif;padding:40px">surface not built yet — runs 6:50am daily, or: node scripts/build-field-surfaces.mjs</body></html>`,
      { headers: { 'content-type': 'text/html' } })
  }
}

/** Quick capture: a line about a person → field-capture ledger (same file the
 *  CLI uses; field-capture.mjs resolves names + writes person pages on next run). */
export async function POST(req: Request) {
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })
  const entry = { ts: new Date().toISOString(), text: String(text).trim().slice(0, 500), source: 'field-hub' }
  await fs.appendFile(path.join(REPO, 'thoughts/shared/field-captures.jsonl'), JSON.stringify(entry) + '\n')
  return NextResponse.json({ ok: true })
}
