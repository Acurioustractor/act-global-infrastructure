import { NextResponse } from 'next/server'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'

// Repo root is two levels up from apps/command-center.
const REPO = path.resolve(process.cwd(), '..', '..')
const SNAPSHOT_DIR = path.join(REPO, 'thoughts', 'shared', 'data', 'compliance-calendar')

interface Obligation {
  id: string
  title: string
  type: string
  entity: string
  due_date: string | null
  earliest_filable?: string | null
  status: string
  lead_times_days?: number[]
  notes?: string
  owner: string
  expected_refund_aud?: number
  project_code?: string | null
  source: 'wiki' | 'ghl_opportunities'
  monetary_value?: number
  days_until_due: number | null
  severity: 'critical' | 'high' | 'medium' | null
  at_risk: boolean
  last_filed_at?: string | null
}

interface CalendarResponse {
  generatedAt: string
  source: 'snapshot' | 'live'
  sources: {
    wiki: { path: string; count: number }
    grants: { table: string; count: number }
  }
  counters: { critical: number; high: number; medium: number; filed: number }
  obligations: Obligation[]
}

export async function GET() {
  const snap = readLatestSnapshot()
  if (!snap) {
    return NextResponse.json(
      {
        error: 'No compliance-calendar snapshot found',
        hint: 'Run `node scripts/build-compliance-calendar.mjs` to seed thoughts/shared/data/compliance-calendar/.',
      },
      { status: 503 },
    )
  }
  // Recompute time-sensitive fields LIVE from each obligation's due_date, so countdowns are correct
  // even when the snapshot is stale (its baked days_until_due freezes at build time). Mirrors the
  // scoring in scripts/build-compliance-calendar.mjs.
  const obligations = snap.obligations.map(o => {
    const dDays = daysUntil(o.due_date)
    const sev = severity(o.status, dDays)
    return { ...o, days_until_due: dDays, severity: sev, at_risk: sev != null }
  })
  obligations.sort((a, b) => {
    if (a.at_risk !== b.at_risk) return a.at_risk ? -1 : 1
    if (a.days_until_due == null) return b.days_until_due == null ? 0 : 1
    if (b.days_until_due == null) return -1
    return a.days_until_due - b.days_until_due
  })
  const counters = obligations.reduce(
    (acc, o) => {
      if (o.severity === 'critical') acc.critical += 1
      else if (o.severity === 'high') acc.high += 1
      else if (o.severity === 'medium') acc.medium += 1
      else if (o.status === 'filed') acc.filed += 1
      return acc
    },
    { critical: 0, high: 0, medium: 0, filed: 0 },
  )
  return NextResponse.json({ ...snap, source: 'snapshot', recomputedAt: new Date().toISOString(), counters, obligations })
}

function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null
  const due = new Date(dateIso.slice(0, 10) + 'T00:00:00Z').getTime()
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime()
  return Math.round((due - today) / 86400000)
}

function severity(status: string, dDays: number | null): 'critical' | 'high' | 'medium' | null {
  if (status === 'filed' || status === 'superseded' || status === 'waived') return null
  if (dDays == null) return null
  if (dDays < 0 || dDays <= 7) return 'critical'
  if (dDays <= 30) return 'high'
  if (dDays <= 90) return 'medium'
  return null
}

function readLatestSnapshot(): CalendarResponse | null {
  if (!existsSync(SNAPSHOT_DIR)) return null
  // Prefer the stable latest.json (the only snapshot tracked in git / deployed); fall back to the
  // most recent dated file for local dev where dated history is present.
  const latest = path.join(SNAPSHOT_DIR, 'latest.json')
  let file: string | null = existsSync(latest) ? latest : null
  if (!file) {
    const dated = readdirSync(SNAPSHOT_DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
    if (dated.length === 0) return null
    file = path.join(SNAPSHOT_DIR, dated[dated.length - 1])
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

