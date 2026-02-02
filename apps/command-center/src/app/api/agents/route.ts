import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Check if we have agent data in the audit log
    const { data: recentActivity } = await supabase
      .from('agent_audit_log')
      .select('agent_name, action, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    // Derive agent list from recent activity
    const agentMap = new Map<string, { last: string; count: number }>()
    for (const entry of recentActivity || []) {
      const existing = agentMap.get(entry.agent_name)
      if (!existing) {
        agentMap.set(entry.agent_name, { last: entry.created_at, count: 1 })
      } else {
        existing.count++
      }
    }

    // Build agents list — include known agents even if no recent activity
    const knownAgents = [
      { id: 'cultivator', name: 'Cultivator', domain: 'relationships', autonomy_level: 2 },
      { id: 'receipt-agent', name: 'Receipt Agent', domain: 'finance', autonomy_level: 2 },
      { id: 'briefing-agent', name: 'Briefing Agent', domain: 'knowledge', autonomy_level: 3 },
      { id: 'health-monitor', name: 'Health Monitor', domain: 'infrastructure', autonomy_level: 3 },
      { id: 'subscription-scout', name: 'Subscription Scout', domain: 'finance', autonomy_level: 2 },
    ]

    const agents = knownAgents.map((agent) => {
      const activity = agentMap.get(agent.name) || agentMap.get(agent.id)
      return {
        id: agent.id,
        name: agent.name,
        type: agent.domain,
        domain: agent.domain,
        autonomy_level: agent.autonomy_level,
        enabled: true,
        status: activity ? 'active' : 'idle',
        last_heartbeat: activity?.last || new Date().toISOString(),
        completed_today: activity?.count || 0,
        pending_review: 0,
      }
    })

    return NextResponse.json({ agents })
  } catch (e) {
    console.error('Agents list error:', e)
    return NextResponse.json({ agents: [] })
  }
}
