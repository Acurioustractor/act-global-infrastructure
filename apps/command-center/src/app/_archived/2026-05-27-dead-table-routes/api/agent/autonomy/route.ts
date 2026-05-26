import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('agent_autonomy_transitions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    const transitions = (data || []).map(t => ({
      id: t.id,
      action_name: t.action_name,
      agent_id: t.agent_id,
      previous_level: t.previous_level,
      new_level: t.new_level,
      reason: t.reason,
      evidence: t.evidence,
      approved_by: t.approved_by,
      approved_at: t.approved_at,
      status: t.status,
      created_at: t.created_at,
    }))

    // Compute current autonomy levels per action
    const currentLevels: Record<string, { action: string; level: number; agent_id: string; last_change: string }> = {}
    for (const t of transitions) {
      if (t.status === 'approved' || t.status === 'active') {
        if (!currentLevels[t.action_name] || new Date(t.created_at) > new Date(currentLevels[t.action_name].last_change)) {
          currentLevels[t.action_name] = {
            action: t.action_name,
            level: t.new_level,
            agent_id: t.agent_id,
            last_change: t.created_at,
          }
        }
      }
    }

    return NextResponse.json({
      transitions,
      currentLevels: Object.values(currentLevels),
      stats: {
        totalTransitions: transitions.length,
        pendingApproval: transitions.filter(t => t.status === 'pending').length,
        uniqueActions: Object.keys(currentLevels).length,
      },
    })
  } catch (e) {
    console.error('Agent autonomy error:', e)
    return NextResponse.json({
      transitions: [],
      currentLevels: [],
      stats: { totalTransitions: 0, pendingApproval: 0, uniqueActions: 0 },
    })
  }
}
