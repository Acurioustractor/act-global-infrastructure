import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '10')

    // Query agent_audit_log for executed/completed actions as "insights"
    const { data } = await supabase
      .from('agent_audit_log')
      .select('*')
      .in('status', ['executed', 'completed', 'approved'])
      .order('created_at', { ascending: false })
      .limit(limit)

    const insights = (data || []).map((row) => ({
      id: row.id,
      agent_name: row.agent_name || 'system',
      insight_type: row.action_type === 'alert' ? 'alert' : 'suggestion',
      title: row.title || row.action_type || 'Agent insight',
      description: row.description || row.reasoning || '',
      data: row.context || row.metadata || null,
      created_at: row.created_at,
    }))

    return NextResponse.json({ insights })
  } catch (e) {
    console.error('Agent insights error:', e)
    return NextResponse.json({ insights: [] })
  }
}
