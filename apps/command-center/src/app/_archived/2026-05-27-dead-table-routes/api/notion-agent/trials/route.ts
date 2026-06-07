import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: reliability summary for all agents
export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get('agent')

  if (agent) {
    // Detail view: recent runs for one agent
    const { data, error } = await supabase
      .from('notion_agent_trials')
      .select('*')
      .eq('agent_name', agent)
      .order('run_started_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ runs: data })
  }

  // Summary view: reliability stats
  const { data, error } = await supabase
    .from('v_notion_agent_reliability')
    .select('*')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agents: data })
}

// POST: log an agent run
export async function POST(req: NextRequest) {
  const body = await req.json()

  const { agent_name, status, run_duration_ms, output_summary, error_message, items_processed, notes, phase } = body

  if (!agent_name) {
    return NextResponse.json({ error: 'agent_name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('notion_agent_trials')
    .insert({
      agent_name,
      status: status || 'success',
      phase: phase || '1',
      run_duration_ms,
      output_summary,
      error_message,
      items_processed: items_processed || 0,
      notes,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trial: data })
}
