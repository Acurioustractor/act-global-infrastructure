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
  return NextResponse.json({ ...snap, source: 'snapshot' })
}

function readLatestSnapshot(): CalendarResponse | null {
  if (!existsSync(SNAPSHOT_DIR)) return null
  const files = readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.json')).sort()
  if (files.length === 0) return null
  try {
    return JSON.parse(readFileSync(path.join(SNAPSHOT_DIR, files[files.length - 1]), 'utf8'))
  } catch {
    return null
  }
}

