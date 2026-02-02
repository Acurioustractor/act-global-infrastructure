import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Number(searchParams.get('limit')) || 50

    let query = supabase
      .from('agent_proposals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    const proposals = (data || []).map((p) => ({
      id: p.id,
      agent_id: p.agent_id,
      agent_version: p.agent_version,
      action_id: p.action_id,
      action_name: p.action_name,
      title: p.title,
      description: p.description,
      reasoning: p.reasoning,
      proposed_action: p.proposed_action,
      expected_outcome: p.expected_outcome,
      impact_assessment: p.impact_assessment,
      priority: p.priority || 'medium',
      deadline: p.deadline,
      status: p.status || 'pending',
      reviewed_by: p.reviewed_by,
      reviewed_at: p.reviewed_at,
      review_notes: p.review_notes,
      modified_action: p.modified_action,
      execution_started_at: p.execution_started_at,
      execution_completed_at: p.execution_completed_at,
      execution_result: p.execution_result,
      execution_error: p.execution_error,
      parent_proposal_id: p.parent_proposal_id,
      coordination_status: p.coordination_status,
      target_agent_id: p.target_agent_id,
      coordination_context: p.coordination_context,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }))

    // Stats
    const pending = proposals.filter(p => p.status === 'pending_review').length
    const approved = proposals.filter(p => p.status === 'approved').length
    const rejected = proposals.filter(p => p.status === 'rejected').length
    const executed = proposals.filter(p => p.status === 'executed').length

    return NextResponse.json({
      proposals,
      stats: { pending, approved, rejected, executed, total: proposals.length },
    })
  } catch (e) {
    console.error('Agent proposals error:', e)
    return NextResponse.json({ proposals: [], stats: { pending: 0, approved: 0, rejected: 0, executed: 0, total: 0 } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action } = body // action: 'approve' | 'reject'

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (action === 'approve') {
      updates.status = 'approved'
      updates.reviewed_by = 'human'
      updates.reviewed_at = new Date().toISOString()
    } else if (action === 'reject') {
      updates.status = 'rejected'
      updates.reviewed_by = 'human'
      updates.reviewed_at = new Date().toISOString()
      if (body.review_notes) updates.review_notes = body.review_notes
    }

    const { error } = await supabase
      .from('agent_proposals')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Proposal action error:', e)
    return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 })
  }
}
