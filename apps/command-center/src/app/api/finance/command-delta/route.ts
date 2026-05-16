import { NextResponse } from 'next/server'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'

// Snapshots are written by scripts/money-command-digest.mjs to
// thoughts/shared/data/money-command-snapshots/YYYY-MM-DD.json
const SNAPSHOT_DIR = path.resolve(process.cwd(), '..', '..', 'thoughts', 'shared', 'data', 'money-command-snapshots')

interface Snapshot {
  today: string
  coverage: {
    transactions: { total: number; tagged: number; pct: number }
    invoices: { total: number; tagged: number; pct: number }
    opportunities: { total: number; tagged: number; pct: number }
  }
  incoming: { receivables: number; pipelineWeighted: number; grantsInFlight: number; projected90d: number }
  cash: number | null
  lifetime: { visibleBook: number; paying: number; paid: number; ar: number }
  drift: Array<{ kind: string; amount: number; label: string }>
}

export async function GET() {
  if (!existsSync(SNAPSHOT_DIR)) {
    return NextResponse.json({ available: false, reason: 'no snapshot dir yet' })
  }
  const files = readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.json')).sort()
  if (files.length === 0) {
    return NextResponse.json({ available: false, reason: 'no snapshots yet — run scripts/money-command-digest.mjs' })
  }
  const latest = parseSnapshot(path.join(SNAPSHOT_DIR, files[files.length - 1]))
  const previous = files.length >= 2 ? parseSnapshot(path.join(SNAPSHOT_DIR, files[files.length - 2])) : null

  if (!previous) {
    return NextResponse.json({
      available: false,
      reason: 'only one snapshot — deltas need at least two days',
      seedDate: latest?.today,
    })
  }

  if (!latest) {
    return NextResponse.json({ available: false, reason: 'latest snapshot unreadable' })
  }

  return NextResponse.json({
    available: true,
    from: previous.today,
    to: latest.today,
    deltas: {
      cash: deltaMoney(latest.cash, previous.cash),
      projected90d: deltaMoney(latest.incoming?.projected90d, previous.incoming?.projected90d),
      receivables: deltaMoney(latest.incoming?.receivables, previous.incoming?.receivables),
      pipelineWeighted: deltaMoney(latest.incoming?.pipelineWeighted, previous.incoming?.pipelineWeighted),
      grantsInFlight: deltaMoney(latest.incoming?.grantsInFlight, previous.incoming?.grantsInFlight),
      lifetimePaid: deltaMoney(latest.lifetime?.paid, previous.lifetime?.paid),
      lifetimeAr: deltaMoney(latest.lifetime?.ar, previous.lifetime?.ar),
      coverage: {
        transactions: deltaPct(latest.coverage?.transactions?.pct, previous.coverage?.transactions?.pct),
        invoices: deltaPct(latest.coverage?.invoices?.pct, previous.coverage?.invoices?.pct),
        opportunities: deltaPct(latest.coverage?.opportunities?.pct, previous.coverage?.opportunities?.pct),
      },
      payingCustomers: (latest.lifetime?.paying ?? 0) - (previous.lifetime?.paying ?? 0),
    },
    driftNew: latest.drift.filter(d =>
      !previous.drift.some(p => p.label === d.label && p.kind === d.kind),
    ),
    driftResolved: previous.drift.filter(p =>
      !latest.drift.some(d => d.label === p.label && d.kind === p.kind),
    ),
  })
}

function parseSnapshot(file: string): Snapshot | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Snapshot
  } catch {
    return null
  }
}

function deltaMoney(curr: number | null | undefined, prev: number | null | undefined) {
  if (curr == null || prev == null) return null
  return Number((curr - prev).toFixed(2))
}

function deltaPct(curr: number | undefined, prev: number | undefined) {
  if (curr == null || prev == null) return null
  return Number((curr - prev).toFixed(1))
}
