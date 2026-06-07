import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// "Xero data as of …" freshness for every finance surface.
//
// Two possible sources, in order of preference:
//   1. `.xero-sync-state.json` lastSync — when the incremental sync last RAN
//      (the honest "we've pulled everything Xero changed up to T" signal).
//      Written by scripts/sync-xero-to-supabase.mjs at repo root. Local only —
//      it does not exist on Vercel.
//   2. max(synced_at) across xero_transactions + xero_invoices — when any row
//      was last written. Works everywhere (Vercel included), but lags lastSync
//      when an incremental sync found nothing to change.
//
// Thresholds (plan 2026-05-29): green <6h · amber 6–12h · red >12h.

const GREEN_MAX_MIN = 6 * 60
const AMBER_MAX_MIN = 12 * 60

type Freshness = {
  lastSync: string | null
  ageMinutes: number | null
  status: 'green' | 'amber' | 'red' | 'unknown'
  source: 'sync-state-file' | 'max-synced-at' | 'none'
  detail: { fileLastSync: string | null; maxSyncedAt: string | null }
}

function readSyncStateFile(): string | null {
  // The sync script writes to <repo-root>/.xero-sync-state.json. Depending on
  // where the Next.js server is launched, cwd may be the app dir or the repo
  // root, so probe both (and one level up for good measure).
  const candidates = [
    resolve(process.cwd(), '.xero-sync-state.json'),
    resolve(process.cwd(), '../../.xero-sync-state.json'),
    resolve(process.cwd(), '../.xero-sync-state.json'),
  ]
  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue
      const parsed = JSON.parse(readFileSync(path, 'utf8'))
      if (parsed?.lastSync) return parsed.lastSync as string
    } catch {
      // unreadable/parse error → try next candidate
    }
  }
  return null
}

async function maxSyncedAt(): Promise<string | null> {
  const [txns, invoices] = await Promise.all([
    supabase.from('xero_transactions').select('synced_at').order('synced_at', { ascending: false }).limit(1),
    supabase.from('xero_invoices').select('synced_at').order('synced_at', { ascending: false }).limit(1),
  ])
  const candidates = [txns.data?.[0]?.synced_at, invoices.data?.[0]?.synced_at].filter(Boolean) as string[]
  if (candidates.length === 0) return null
  return candidates.sort().at(-1) ?? null
}

function classify(lastSync: string | null): { ageMinutes: number | null; status: Freshness['status'] } {
  if (!lastSync) return { ageMinutes: null, status: 'unknown' }
  const ageMs = Date.now() - new Date(lastSync).getTime()
  const ageMinutes = Math.max(0, Math.round(ageMs / 60000))
  const status = ageMinutes <= GREEN_MAX_MIN ? 'green' : ageMinutes <= AMBER_MAX_MIN ? 'amber' : 'red'
  return { ageMinutes, status }
}

export async function GET() {
  try {
    const fileLastSync = readSyncStateFile()
    const maxRowSync = await maxSyncedAt()

    // Prefer the sync-state file (honest "sync ran" timestamp); fall back to
    // max(synced_at) when the file is absent (e.g. on Vercel).
    const lastSync = fileLastSync ?? maxRowSync
    const source: Freshness['source'] = fileLastSync ? 'sync-state-file' : maxRowSync ? 'max-synced-at' : 'none'
    const { ageMinutes, status } = classify(lastSync)

    const body: Freshness = {
      lastSync,
      ageMinutes,
      status,
      source,
      detail: { fileLastSync, maxSyncedAt: maxRowSync },
    }
    return NextResponse.json(body)
  } catch (err) {
    return NextResponse.json(
      {
        lastSync: null,
        ageMinutes: null,
        status: 'unknown',
        source: 'none',
        detail: { fileLastSync: null, maxSyncedAt: null },
        error: err instanceof Error ? err.message : 'sync-freshness failed',
      },
      { status: 200 }, // never break a header on freshness lookup
    )
  }
}
