import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Read-only endpoint for Notion agents to pull mission control data
// Replaces: sync-mission-control-to-notion.mjs (Phase 2)
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    const [alertsRes, calendarRes, actionsRes, activityRes, invoicesRes, cashflowRes, pipelineRes, subsRes] = await Promise.all([
      // Projects needing attention (alerts)
      supabase
        .from('v_projects_needing_attention')
        .select('*')
        .limit(10),
      // Today's calendar
      supabase
        .from('calendar_events')
        .select('summary, start_time, end_time, location, calendar_name')
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`)
        .order('start_time', { ascending: true }),
      // Pending actions (top 10)
      supabase
        .from('project_knowledge')
        .select('id, title, content, project_code, recorded_at')
        .eq('knowledge_type', 'action_item')
        .order('recorded_at', { ascending: false })
        .limit(10),
      // Recent cross-domain activity
      supabase
        .from('v_activity_stream')
        .select('*')
        .limit(10),
      // Overdue invoices
      supabase
        .from('v_outstanding_invoices')
        .select('*')
        .limit(10),
      // Cashflow summary
      supabase
        .from('v_cashflow_summary')
        .select('*')
        .limit(3),
      // Pipeline
      supabase
        .from('ghl_opportunities')
        .select('name, status, monetary_value, pipeline_stage')
        .in('status', ['open', 'won'])
        .order('monetary_value', { ascending: false })
        .limit(10),
      // Subscription alerts
      supabase
        .from('v_subscription_alerts')
        .select('*')
        .limit(5),
    ])

    // Compute summary stats
    const overdueTotal = (invoicesRes.data || []).reduce(
      (sum, inv) => sum + Math.abs(Number(inv.amount_due || inv.outstanding || 0)), 0
    )
    const pipelineTotal = (pipelineRes.data || []).reduce(
      (sum, o) => sum + Number(o.monetary_value || 0), 0
    )

    return NextResponse.json({
      alerts: {
        projects: alertsRes.data || [],
        overdue_invoices: invoicesRes.data || [],
        subscription_warnings: subsRes.data || [],
      },
      focus: {
        calendar: calendarRes.data || [],
        top_actions: actionsRes.data || [],
      },
      health: {
        cashflow: cashflowRes.data || [],
        pipeline: {
          total_value: Math.round(pipelineTotal),
          deals: pipelineRes.data || [],
        },
        overdue_total: Math.round(overdueTotal),
      },
      activity: activityRes.data || [],
      updated_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Notion agent mission error:', e)
    return NextResponse.json({ error: 'Failed to fetch mission data' }, { status: 500 })
  }
}
