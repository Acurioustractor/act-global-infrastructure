import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/finance/cost-reassign — reassign the project_code of Xero cost lines from the cost-drill.
 *
 * Writes ONLY to our own Supabase mirror (reversible, Tier 1-2):
 *   - transaction → xero_transactions.project_code  (+ project_code_source='manual')
 *   - invoice     → xero_invoices.project_code       (+ project_code_source='manual')
 * Setting source='manual' protects the row from the auto-taggers (which skip manual%).
 * It does NOT push to Xero — the live ledger is untouched (that stays a UI/SL reconcile step).
 *
 * Reversible by design: the response returns applied[] with { prevCode, newCode } so the cockpit
 * can "Undo last apply" by POSTing the prevCodes back through this same endpoint. The project
 * attribution (the P&L-relevant field) fully reverts; source stays 'manual' after an undo
 * (a human-reviewed row stays manual-protected, which is the safe state). Invalid codes are
 * rejected up-front against the projects registry so a bad payload can't corrupt P&L attribution.
 *
 * Mirrors /api/finance/tagging-apply (opps/subs) for Xero transactions/invoices.
 * Plan: thoughts/shared/plans/2026-06-03-cost-drill-view.md
 */

type Kind = 'transaction' | 'invoice'

interface Decision {
  kind: Kind
  id: string
  code: string
}

interface Applied {
  kind: Kind
  id: string
  prevCode: string | null
  newCode: string
}

const TABLE: Record<Kind, string> = {
  transaction: 'xero_transactions',
  invoice: 'xero_invoices',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const decisions: Decision[] = Array.isArray(body?.decisions) ? body.decisions : []
    if (decisions.length === 0) {
      return NextResponse.json({ error: 'decisions[] is required and must be non-empty' }, { status: 400 })
    }

    // Normalise + shape validation.
    const clean = decisions
      .filter((d) => (d?.kind === 'transaction' || d?.kind === 'invoice') && d?.id && d?.code)
      .map((d) => ({ kind: d.kind, id: String(d.id), code: String(d.code).trim().toUpperCase() }))
    if (clean.length === 0) {
      return NextResponse.json({ error: 'No valid decisions (each needs kind transaction|invoice, id, code)' }, { status: 400 })
    }

    // Guard: every code must exist in the registry — never write a code that isn't a real project.
    const { data: projRows, error: projErr } = await supabase.from('projects').select('code')
    if (projErr) throw projErr
    const validCodes = new Set((projRows || []).map((p) => String(p.code).toUpperCase()))
    const invalid = [...new Set(clean.filter((d) => !validCodes.has(d.code)).map((d) => d.code))]
    if (invalid.length) {
      return NextResponse.json({ error: `Unknown project code(s): ${invalid.join(', ')}` }, { status: 400 })
    }

    const applied: Applied[] = []
    const failed: { kind: Kind; id: string; error: string }[] = []

    for (const kind of ['transaction', 'invoice'] as Kind[]) {
      const forKind = clean.filter((d) => d.kind === kind)
      if (!forKind.length) continue
      const table = TABLE[kind]

      // Snapshot current project_code for Undo.
      const ids = forKind.map((d) => d.id)
      const { data: cur, error: selErr } = await supabase.from(table).select('id, project_code').in('id', ids)
      if (selErr) throw selErr
      const prevById = new Map((cur || []).map((r) => [r.id, (r.project_code as string) ?? null]))

      // Group by target code → one UPDATE per distinct code (fast for grouped/bulk reassign).
      const byCode = new Map<string, string[]>()
      for (const d of forKind) byCode.set(d.code, [...(byCode.get(d.code) || []), d.id])

      for (const [code, idsForCode] of byCode) {
        const { data, error } = await supabase
          .from(table)
          .update({ project_code: code, project_code_source: 'manual' })
          .in('id', idsForCode)
          .select('id')
        if (error) {
          for (const id of idsForCode) failed.push({ kind, id, error: error.message })
          continue
        }
        const updatedIds = new Set((data || []).map((r) => r.id))
        for (const id of idsForCode) {
          if (updatedIds.has(id)) applied.push({ kind, id, prevCode: prevById.get(id) ?? null, newCode: code })
          else failed.push({ kind, id, error: 'row not found' })
        }
      }
    }

    return NextResponse.json({
      ok: true,
      appliedCount: applied.length,
      failedCount: failed.length,
      transactions: applied.filter((a) => a.kind === 'transaction').length,
      invoices: applied.filter((a) => a.kind === 'invoice').length,
      applied,
      failed,
    })
  } catch (e) {
    console.error('[finance/cost-reassign] POST failed:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
