import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '10')

    // Surface reviewed/ready agent proposals as "insights" (agent_proposals, not the
    // request-level agent_audit_log — that table has no status/proposal lifecycle).
    const { data } = await supabase
      .from('agent_proposals')
      .select('*')
      .in('status', ['approved', 'completed', 'draft_ready'])
      .order('created_at', { ascending: false })
      .limit(limit)

    const insights = (data || []).map((row) => ({
      id: row.id,
      agent_name: row.agent_id || 'system',
      insight_type: row.priority === 'high' ? 'alert' : 'suggestion',
      title: row.title || row.action_name || 'Agent insight',
      description: row.description || row.reasoning || '',
      data: row.proposed_action || row.impact_assessment || null,
      created_at: row.created_at,
    }))

    return NextResponse.json({ insights })
  } catch (e) {
    console.error('Agent insights error:', e)
    return NextResponse.json({ insights: [] })
  }
}
