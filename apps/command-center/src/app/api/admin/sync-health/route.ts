import { NextResponse } from 'next/server'
import { execSync } from 'node:child_process'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface SyncRow {
  name: string
  schedule: string | null
  status: 'online' | 'stopped' | 'errored' | 'unknown'
  lastRunMs: number | null
  lastRunIso: string | null
  restartCount: number
  ageHours: number | null
  scriptPath: string | null
  category: 'notion-out' | 'notion-in' | 'reconciliation' | 'cron-other' | 'service'
  health: 'green' | 'yellow' | 'red'
}

interface Response {
  generatedAt: string
  totals: { total: number; green: number; yellow: number; red: number }
  notionSyncs: SyncRow[]
  otherCron: SyncRow[]
  services: SyncRow[]
}

// Threshold: how long since last run before we worry?
// For each cron, derive an expected interval, then yellow = 2× expected, red = 4× expected.
function expectedHours(cron: string | null): number | null {
  if (!cron) return null
  // Quick heuristics for common patterns
  if (cron.startsWith('*/5')) return 0.1
  if (cron.startsWith('*/15')) return 0.3
  if (cron.startsWith('0 *')) return 1
  if (cron.includes('* * * *') && !cron.startsWith('*')) return 24 // daily
  if (cron.endsWith('* * 1')) return 24 * 7 // weekly mon
  if (cron.endsWith('* * *')) return 24
  return 24
}

function categoriseAndScore(row: Omit<SyncRow, 'health' | 'category'>): SyncRow {
  // Categorise
  let category: SyncRow['category'] = 'cron-other'
  if (!row.schedule) {
    category = 'service'
  } else if (row.name.includes('sync') && row.name.includes('notion')) {
    category = 'notion-out'
  } else if (
    row.name === 'notion-sync' ||
    row.name.startsWith('notion-inbound') ||
    row.name === 'meeting-sync'
  ) {
    category = 'notion-in'
  } else if (
    row.name.includes('reconciliation') ||
    row.name.includes('digest') ||
    row.name.includes('framework') ||
    row.name.includes('dashboard') ||
    row.name.includes('forecast') ||
    row.name.includes('act-now') ||
    row.name.includes('pile') ||
    row.name.includes('cash') ||
    row.name.includes('kpis') ||
    row.name.includes('budget') ||
    row.name.includes('metrics') ||
    row.name.includes('planning') ||
    row.name.includes('entity-hub') ||
    row.name.includes('opportunities') ||
    row.name.includes('compliance')
  ) {
    category = 'notion-out'
  }

  // Health
  let health: SyncRow['health'] = 'green'
  if (category === 'service') {
    health = row.status === 'online' ? 'green' : 'red'
  } else {
    const expected = expectedHours(row.schedule)
    if (expected != null && row.ageHours != null) {
      if (row.ageHours > expected * 4) health = 'red'
      else if (row.ageHours > expected * 2) health = 'yellow'
    } else if (row.lastRunMs == null) {
      health = 'red'
    }
  }

  return { ...row, category, health }
}

export async function GET() {
  let raw: string
  try {
    raw = execSync('pm2 jlist', { encoding: 'utf8', timeout: 5000 })
  } catch (err) {
    return NextResponse.json(
      { error: 'pm2 not available', detail: String(err) },
      { status: 503 },
    )
  }

  let procs: Array<{
    name: string
    pm2_env: {
      status: string
      restart_time?: number
      pm_uptime?: number
      cron_restart?: string | null
      pm_exec_path?: string | null
    }
  }>
  try {
    procs = JSON.parse(raw)
  } catch (err) {
    return NextResponse.json(
      { error: 'pm2 jlist returned invalid JSON', detail: String(err) },
      { status: 502 },
    )
  }

  const now = Date.now()
  const rows: SyncRow[] = procs.map(p => {
    const lastRunMs = p.pm2_env?.pm_uptime ?? null
    const ageHours = lastRunMs ? (now - lastRunMs) / (1000 * 60 * 60) : null
    const status = (p.pm2_env?.status ?? 'unknown') as SyncRow['status']
    return categoriseAndScore({
      name: p.name,
      schedule: p.pm2_env?.cron_restart ?? null,
      status,
      lastRunMs,
      lastRunIso: lastRunMs ? new Date(lastRunMs).toISOString() : null,
      restartCount: p.pm2_env?.restart_time ?? 0,
      ageHours,
      scriptPath: p.pm2_env?.pm_exec_path ?? null,
    })
  })

  const notionSyncs = rows
    .filter(r => r.category === 'notion-out' || r.category === 'notion-in')
    .sort((a, b) => (a.lastRunMs ?? 0) - (b.lastRunMs ?? 0))
  const otherCron = rows
    .filter(r => r.category === 'cron-other')
    .sort((a, b) => (a.lastRunMs ?? 0) - (b.lastRunMs ?? 0))
  const services = rows
    .filter(r => r.category === 'service')
    .sort((a, b) => a.name.localeCompare(b.name))

  const totals = rows.reduce(
    (acc, r) => {
      acc.total++
      acc[r.health]++
      return acc
    },
    { total: 0, green: 0, yellow: 0, red: 0 },
  )

  const response: Response = {
    generatedAt: new Date().toISOString(),
    totals,
    notionSyncs,
    otherCron,
    services,
  }
  return NextResponse.json(response)
}
