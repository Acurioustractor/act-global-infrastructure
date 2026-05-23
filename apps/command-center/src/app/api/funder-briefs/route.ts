import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Returns funder × project briefs.
 *
 * Query params:
 *   ?funder=snow-foundation   → all briefs for a funder
 *   ?project=ACT-GD           → all briefs for a project
 *   ?status=active            → filter by status
 *
 * Pattern from the QBE Catalysing Impact HQ Notion template — generalised
 * so every supporter × project intersection can have one structured brief
 * showing asks both ways + alignment + procurement + next move.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const funder = searchParams.get('funder')
    const project = searchParams.get('project')
    const status = searchParams.get('status')

    let q = supabase
      .from('funder_briefs')
      .select('*')
      .order('next_move_due', { ascending: true, nullsFirst: false })

    if (funder) q = q.eq('funder_slug', funder)
    if (project) q = q.eq('project_code', project)
    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) throw error

    const briefs = (data || []).map((r: any) => ({
      id: r.id,
      funderSlug: r.funder_slug,
      projectCode: r.project_code,
      briefTitle: r.brief_title,
      status: r.status,
      asksFromThem: r.asks_from_them || [],
      askAmountAud: r.ask_amount_aud,
      askOutcome: r.ask_outcome,
      askStatus: r.ask_status,
      askSubmittedAt: r.ask_submitted_at,
      askDecisionDue: r.ask_decision_due,
      alignmentStatus: r.alignment_status,
      alignmentNotes: r.alignment_notes,
      procurementDeliveredCount: r.procurement_delivered_count,
      procurementUnit: r.procurement_unit,
      procurementDemandCount: r.procurement_demand_count,
      procurementNotes: r.procurement_notes,
      strategyTheirPriorities: r.strategy_their_priorities || [],
      strategyOurClaims: r.strategy_our_claims || [],
      nextMove: r.next_move,
      nextMoveOwner: r.next_move_owner,
      nextMoveDue: r.next_move_due,
      notionHqUrl: r.notion_hq_url,
      relatedFiles: r.related_files || [],
      lastFeedbackDate: r.last_feedback_date,
      lastFeedbackSummary: r.last_feedback_summary,
      updatedAt: r.updated_at,
    }))

    const summary = {
      total: briefs.length,
      byStatus: briefs.reduce((acc: Record<string, number>, b: any) => {
        acc[b.status] = (acc[b.status] || 0) + 1
        return acc
      }, {}),
      byAlignment: briefs.reduce((acc: Record<string, number>, b: any) => {
        acc[b.alignmentStatus] = (acc[b.alignmentStatus] || 0) + 1
        return acc
      }, {}),
      openAsksFromThem: briefs.reduce(
        (s: number, b: any) => s + (b.asksFromThem || []).filter((a: any) => !a.done).length,
        0,
      ),
      overdue: briefs.filter(
        (b: any) => b.nextMoveDue && new Date(b.nextMoveDue) < new Date(),
      ).length,
    }

    return NextResponse.json({ briefs, summary })
  } catch (e: any) {
    console.error('funder-briefs API failed:', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
