/**
 * Entity Match Review API
 *
 * GET  /api/entities/matches — List pending matches from v_duplicate_review_queue
 * PATCH /api/entities/matches — Update match status (approve/reject/defer)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const minScore = parseFloat(searchParams.get('minScore') || '0')

    const { data, error } = await supabase
      .from('v_duplicate_review_queue')
      .select('*')
      .gte('match_score', minScore)
      .order('match_score', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich with source info for each entity in the pair
    const enriched = await Promise.all((data || []).map(async (match) => {
      const [identA, identB] = await Promise.all([
        supabase
          .from('entity_identifiers')
          .select('source, identifier_type, identifier_value')
          .eq('entity_id', match.entity_a_id),
        supabase
          .from('entity_identifiers')
          .select('source, identifier_type, identifier_value')
          .eq('entity_id', match.entity_b_id),
      ])

      return {
        ...match,
        sources_a: [...new Set((identA.data || []).map(i => i.source))],
        sources_b: [...new Set((identB.data || []).map(i => i.source))],
        identifiers_a: identA.data || [],
        identifiers_b: identB.data || [],
      }
    }))

    // Get total pending count
    const { count } = await supabase
      .from('entity_potential_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return NextResponse.json({
      matches: enriched,
      total_pending: count || 0,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, status, notes } = body as {
      matchId: string
      status: 'approved' | 'rejected' | 'deferred'
      notes?: string
    }

    if (!matchId || !status) {
      return NextResponse.json({ error: 'matchId and status required' }, { status: 400 })
    }

    if (!['approved', 'rejected', 'deferred'].includes(status)) {
      return NextResponse.json({ error: 'status must be approved, rejected, or deferred' }, { status: 400 })
    }

    // For 'deferred', keep as pending but add notes
    const updateStatus = status === 'deferred' ? 'pending' : status

    const { data, error } = await supabase
      .from('entity_potential_matches')
      .update({
        status: updateStatus,
        reviewed_by: 'manual:dashboard',
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      })
      .eq('id', matchId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, match: data })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
