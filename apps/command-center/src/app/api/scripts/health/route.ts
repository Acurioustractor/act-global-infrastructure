import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/scripts/health
 *
 * Returns sync script health data from sync_status and agent_audit_log tables.
 * Powers the script health dashboard for visibility into 311+ scripts.
 */
export async function GET() {
  try {
    // Fetch sync statuses
    const { data: syncStatuses, error: syncError } = await supabase
      .from('sync_status')
      .select('integration_name, status, last_success_at, last_attempt_at, last_error, record_count, avg_duration_ms, metadata, updated_at')
      .order('integration_name')

    if (syncError) {
      return NextResponse.json({ error: syncError.message }, { status: 500 })
    }

    // Fetch recent agent audit errors (last 24h)
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentErrors } = await supabase
      .from('agent_audit_log')
      .select('agent_id, action, target_table, error_message, timestamp')
      .eq('success', false)
      .gte('timestamp', cutoff24h)
      .order('timestamp', { ascending: false })
      .limit(50)

    // Fetch agent health summary (last 24h)
    const { data: agentHealth } = await supabase
      .rpc('get_agent_health', { p_hours: 24 })

    // Classify sync statuses
    const now = Date.now()
    const STALE_HOURS = 12
    const scripts = (syncStatuses || []).map(s => {
      const lastSuccess = s.last_success_at ? new Date(s.last_success_at).getTime() : 0
      const hoursAgo = lastSuccess ? Math.round((now - lastSuccess) / 3_600_000 * 10) / 10 : null
      const isStale = !lastSuccess || (now - lastSuccess) > STALE_HOURS * 3_600_000

      let health: 'healthy' | 'warning' | 'error' | 'stale'
      if (s.status === 'error') health = 'error'
      else if (isStale) health = 'stale'
      else if (hoursAgo && hoursAgo > 6) health = 'warning'
      else health = 'healthy'

      return {
        name: s.integration_name,
        health,
        status: s.status,
        lastSuccess: s.last_success_at,
        lastAttempt: s.last_attempt_at,
        lastError: s.last_error,
        recordCount: s.record_count,
        avgDurationMs: s.avg_duration_ms,
        hoursAgo,
        cursor: s.metadata?.last_cursor || null,
      }
    })

    // Summary counts
    const summary = {
      total: scripts.length,
      healthy: scripts.filter(s => s.health === 'healthy').length,
      warning: scripts.filter(s => s.health === 'warning').length,
      error: scripts.filter(s => s.health === 'error').length,
      stale: scripts.filter(s => s.health === 'stale').length,
    }

    return NextResponse.json({
      scripts,
      summary,
      recentErrors: recentErrors || [],
      agentHealth: agentHealth || [],
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
