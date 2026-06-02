import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/finance/tagging-apply — apply approved project-code decisions from the tagging cockpit.
 *
 * Writes ONLY to our own Supabase mirror tables (reversible, Tier 1-2):
 *   - opp → ghl_opportunities.project_code (text)
 *   - sub → subscriptions.project_codes (text[])  ← replaced with [code]
 * It does NOT push to the live GHL CRM (that is a separate gated step, pushback-ghl-project-tags.mjs).
 *
 * Reversible by design: the response returns applied[] with { prevCode, newCode } so the cockpit can
 * "Undo last apply" by POSTing the prevCodes back through this same endpoint. Invalid codes are
 * rejected up-front against the projects registry so a bad payload can't corrupt P&L attribution.
 *
 * Plan: thoughts/shared/plans/2026-06-03-unified-tagging-engine.md (T4 tracer, T5/T6 writers).
 */

interface Decision {
  kind: 'opp' | 'sub'
  id: string
  code: string
}

interface Applied {
  kind: 'opp' | 'sub'
  id: string
  prevCode: string | null
  newCode: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const decisions: Decision[] = Array.isArray(body?.decisions) ? body.decisions : []
    if (decisions.length === 0) {
      return NextResponse.json({ error: 'decisions[] is required and must be non-empty' }, { status: 400 })
    }

    // Normalise + basic shape validation.
    const clean = decisions
      .filter((d) => (d?.kind === 'opp' || d?.kind === 'sub') && d?.id && d?.code)
      .map((d) => ({ kind: d.kind, id: String(d.id), code: String(d.code).trim().toUpperCase() }))
    if (clean.length === 0) {
      return NextResponse.json({ error: 'No valid decisions (each needs kind opp|sub, id, code)' }, { status: 400 })
    }

    // Guard: every code must exist in the registry — never write a code that isn't a real project.
    const { data: projRows, error: projErr } = await supabase.from('projects').select('code')
    if (projErr) throw projErr
    const validCodes = new Set((projRows || []).map((p) => String(p.code).toUpperCase()))
    const invalid = [...new Set(clean.filter((d) => !validCodes.has(d.code)).map((d) => d.code))]
    if (invalid.length) {
      return NextResponse.json({ error: `Unknown project code(s): ${invalid.join(', ')}` }, { status: 400 })
    }

    const oppDecisions = clean.filter((d) => d.kind === 'opp')
    const subDecisions = clean.filter((d) => d.kind === 'sub')

    const applied: Applied[] = []
    const failed: { kind: string; id: string; error: string }[] = []

    // ── GHL opportunities ────────────────────────────────────────────────────
    if (oppDecisions.length) {
      const ids = oppDecisions.map((d) => d.id)
      const { data: cur, error: selErr } = await supabase
        .from('ghl_opportunities')
        .select('id, project_code')
        .in('id', ids)
      if (selErr) throw selErr
      const prevById = new Map((cur || []).map((r) => [r.id, r.project_code ?? null]))

      // Group by target code so each distinct code is one UPDATE (fast for the bulk auto-fill).
      const byCode = new Map<string, string[]>()
      for (const d of oppDecisions) byCode.set(d.code, [...(byCode.get(d.code) || []), d.id])

      for (const [code, idsForCode] of byCode) {
        const { data, error } = await supabase
          .from('ghl_opportunities')
          .update({ project_code: code, updated_at: new Date().toISOString() })
          .in('id', idsForCode)
          .select('id')
        if (error) {
          for (const id of idsForCode) failed.push({ kind: 'opp', id, error: error.message })
          continue
        }
        const updatedIds = new Set((data || []).map((r) => r.id))
        for (const id of idsForCode) {
          if (updatedIds.has(id)) applied.push({ kind: 'opp', id, prevCode: prevById.get(id) ?? null, newCode: code })
          else failed.push({ kind: 'opp', id, error: 'row not found' })
        }
      }
    }

    // ── Subscriptions (project_codes is text[]) ───────────────────────────────
    if (subDecisions.length) {
      const ids = subDecisions.map((d) => d.id)
      const { data: cur, error: selErr } = await supabase
        .from('subscriptions')
        .select('id, project_codes')
        .in('id', ids)
      if (selErr) throw selErr
      const prevById = new Map(
        (cur || []).map((r) => [r.id, Array.isArray(r.project_codes) && r.project_codes.length ? String(r.project_codes[0]) : null]),
      )

      const byCode = new Map<string, string[]>()
      for (const d of subDecisions) byCode.set(d.code, [...(byCode.get(d.code) || []), d.id])

      for (const [code, idsForCode] of byCode) {
        const { data, error } = await supabase
          .from('subscriptions')
          .update({ project_codes: [code], updated_at: new Date().toISOString() })
          .in('id', idsForCode)
          .select('id')
        if (error) {
          for (const id of idsForCode) failed.push({ kind: 'sub', id, error: error.message })
          continue
        }
        const updatedIds = new Set((data || []).map((r) => r.id))
        for (const id of idsForCode) {
          if (updatedIds.has(id)) applied.push({ kind: 'sub', id, prevCode: prevById.get(id) ?? null, newCode: code })
          else failed.push({ kind: 'sub', id, error: 'row not found' })
        }
      }
    }

    return NextResponse.json({
      ok: true,
      appliedCount: applied.length,
      failedCount: failed.length,
      opps: applied.filter((a) => a.kind === 'opp').length,
      subs: applied.filter((a) => a.kind === 'sub').length,
      applied,
      failed,
    })
  } catch (e) {
    console.error('[finance/tagging-apply] POST failed:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
