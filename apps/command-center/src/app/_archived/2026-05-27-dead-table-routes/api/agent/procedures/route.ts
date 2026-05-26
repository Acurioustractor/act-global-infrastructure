import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('procedural_memory')
      .select('*')
      .order('execution_count', { ascending: false })
      .limit(50)

    if (error) throw error

    const procedures = (data || []).map(p => ({
      id: p.id,
      procedure_name: p.procedure_name,
      description: p.description,
      agent_id: p.agent_id,
      steps: p.steps,
      preconditions: p.preconditions,
      postconditions: p.postconditions,
      learned_from_episodes: p.learned_from_episodes,
      learned_from_decisions: p.learned_from_decisions,
      execution_count: p.execution_count,
      success_count: p.success_count,
      success_rate: p.success_rate,
      avg_duration_ms: p.avg_duration_ms,
      status: p.status,
      version: p.version,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }))

    return NextResponse.json({
      procedures,
      stats: {
        total: procedures.length,
        active: procedures.filter(p => p.status === 'active').length,
        totalExecutions: procedures.reduce((s, p) => s + (p.execution_count || 0), 0),
        avgSuccessRate: procedures.length > 0
          ? Math.round(procedures.reduce((s, p) => s + (Number(p.success_rate) || 0), 0) / procedures.length * 100) / 100
          : null,
      },
    })
  } catch (e) {
    console.error('Agent procedures error:', e)
    return NextResponse.json({
      procedures: [],
      stats: { total: 0, active: 0, totalExecutions: 0, avgSuccessRate: null },
    })
  }
}
