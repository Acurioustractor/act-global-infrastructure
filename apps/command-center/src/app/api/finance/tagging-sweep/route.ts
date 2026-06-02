import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Read-only view of the latest project-code tagging sweep (scripts/tagging-sweep.mjs persists each run
 * to tagging_sweep_runs). The .mjs sweep is the single resolver engine; this just serves its output —
 * no resolver logic is duplicated in TypeScript. Plan: 2026-06-03-unified-tagging-engine (T3).
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('tagging_sweep_runs')
      .select('run_at, summary, coverage, conflicts, fill')
      .order('run_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return NextResponse.json({ run: data, ok: true })
  } catch (error) {
    console.error('[finance/tagging-sweep] GET failed:', error)
    return NextResponse.json({ error: (error as Error).message, ok: false }, { status: 500 })
  }
}
