import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Read-only view of the latest project-code tagging sweep (scripts/tagging-sweep.mjs persists each run
 * to tagging_sweep_runs). The .mjs sweep is the single resolver engine; this just serves its output —
 * no resolver logic is duplicated in TypeScript. Plan: 2026-06-03-unified-tagging-engine (T3).
 */
interface ProjectMeta { metadata?: { legacy_wrapper?: boolean } | null }

export async function GET() {
  try {
    // Latest sweep run + the active project registry (for the cockpit's override dropdown).
    const [runResult, projResult] = await Promise.all([
      supabase
        .from('tagging_sweep_runs')
        .select('run_at, summary, coverage, conflicts, fill')
        .order('run_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('projects')
        .select('code, name, tier, metadata')
        .eq('status', 'active')
        .order('tier')
        .order('name'),
    ])
    if (runResult.error) throw runResult.error
    if (projResult.error) throw projResult.error

    const projects = (projResult.data || [])
      .filter((p: ProjectMeta) => !p.metadata?.legacy_wrapper)
      .map((p) => ({ code: p.code, name: p.name, tier: p.tier }))

    return NextResponse.json({ run: runResult.data, projects, ok: true })
  } catch (error) {
    console.error('[finance/tagging-sweep] GET failed:', error)
    return NextResponse.json({ error: (error as Error).message, ok: false }, { status: 500 })
  }
}
