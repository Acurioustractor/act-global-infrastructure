import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Pass 2C C2 — ack state for AT RISK pane.
//
// Returns most-recent ack per obligation/idea within the lookback window so the
// page can decorate each row with ✓/age vs red, and compute the debt counter
// (items unacked > DEBT_HOURS where the underlying risk is still active).
//
// Snapshot semantics (Q11): debt counter is "right now", not cumulative.

const LOOKBACK_DAYS = 14
const DEBT_HOURS = 24

interface AckRow {
  acked_at: string
  acked_by: string
}

export interface AckStateResponse {
  generatedAt: string
  lookbackDays: number
  debtHours: number
  compliance: Record<string, AckRow>
  idea: Record<string, AckRow>
}

export async function GET() {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: comp, error: compErr }, { data: idea, error: ideaErr }] = await Promise.all([
    supabase
      .from('compliance_ack')
      .select('obligation_id, acked_at, acked_by')
      .gte('acked_at', since)
      .order('acked_at', { ascending: false }),
    supabase
      .from('idea_ack')
      .select('idea_id, acked_at, acked_by')
      .gte('acked_at', since)
      .order('acked_at', { ascending: false }),
  ])

  if (compErr || ideaErr) {
    return NextResponse.json(
      { error: (compErr ?? ideaErr)!.message, hint: 'apply supabase/migrations/20260518000100_ack_tables.sql' },
      { status: 500 },
    )
  }

  // ordered desc, so first row wins = most recent ack
  const compliance: Record<string, AckRow> = {}
  for (const r of comp ?? []) {
    if (!compliance[r.obligation_id]) {
      compliance[r.obligation_id] = { acked_at: r.acked_at, acked_by: r.acked_by }
    }
  }
  const idea_: Record<string, AckRow> = {}
  for (const r of idea ?? []) {
    if (!idea_[r.idea_id]) {
      idea_[r.idea_id] = { acked_at: r.acked_at, acked_by: r.acked_by }
    }
  }

  const response: AckStateResponse = {
    generatedAt: new Date().toISOString(),
    lookbackDays: LOOKBACK_DAYS,
    debtHours: DEBT_HOURS,
    compliance,
    idea: idea_,
  }
  return NextResponse.json(response)
}
