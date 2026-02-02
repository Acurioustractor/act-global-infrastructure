import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const statuses = ['pending', 'approved', 'rejected', 'executed']
    const results: Record<string, number> = {}

    for (const s of statuses) {
      const { count } = await supabase
        .from('agent_audit_log')
        .select('id', { count: 'exact', head: true })
        .eq('status', s)
      results[s] = count || 0
    }

    return NextResponse.json(results)
  } catch (e) {
    console.error('Proposal stats error:', e)
    return NextResponse.json({ pending: 0, approved: 0, rejected: 0, executed: 0 })
  }
}
