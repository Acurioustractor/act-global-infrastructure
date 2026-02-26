import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Read-only endpoint for Notion agents to pull project health data
// Replaces: sync-project-intelligence-to-notion.mjs (Phase 2)
export async function GET(req: NextRequest) {
  const projectCode = req.nextUrl.searchParams.get('project')

  try {
    if (projectCode) {
      // Single project detail — matches what the push script writes per-project
      const [projectRes, actionsRes, decisionsRes, meetingsRes, summaryRes, oppsRes] = await Promise.all([
        supabase
          .from('v_project_summary')
          .select('*')
          .eq('project_code', projectCode)
          .single(),
        supabase
          .from('project_knowledge')
          .select('id, title, content, knowledge_type, recorded_at')
          .eq('project_code', projectCode)
          .eq('knowledge_type', 'action_item')
          .order('recorded_at', { ascending: false })
          .limit(10),
        supabase
          .from('project_knowledge')
          .select('id, title, content, knowledge_type, recorded_at')
          .eq('project_code', projectCode)
          .eq('knowledge_type', 'decision')
          .order('recorded_at', { ascending: false })
          .limit(10),
        supabase
          .from('project_knowledge')
          .select('id, title, content, recorded_at')
          .eq('project_code', projectCode)
          .eq('knowledge_type', 'meeting_note')
          .order('recorded_at', { ascending: false })
          .limit(5),
        supabase
          .from('project_summaries')
          .select('summary, generated_at')
          .eq('project_code', projectCode)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('ghl_opportunities')
          .select('name, status, monetary_value, pipeline_stage')
          .ilike('tags', `%${projectCode}%`)
          .limit(10),
      ])

      if (projectRes.error) {
        return NextResponse.json({ error: `Project not found: ${projectCode}` }, { status: 404 })
      }

      return NextResponse.json({
        project: projectRes.data,
        actions: actionsRes.data || [],
        decisions: decisionsRes.data || [],
        recent_meetings: meetingsRes.data || [],
        ai_summary: summaryRes.data?.summary || null,
        summary_date: summaryRes.data?.generated_at || null,
        opportunities: oppsRes.data || [],
      })
    }

    // All projects overview — for dashboard-level agent
    const [projectsRes, attentionRes, healthRes] = await Promise.all([
      supabase
        .from('v_project_summary')
        .select('*')
        .order('health_score', { ascending: true }),
      supabase
        .from('v_projects_needing_attention')
        .select('*')
        .limit(10),
      supabase
        .from('v_project_health_summary')
        .select('*'),
    ])

    if (projectsRes.error) throw projectsRes.error

    return NextResponse.json({
      projects: projectsRes.data,
      needing_attention: attentionRes.data || [],
      health_summary: healthRes.data || [],
      updated_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Notion agent health error:', e)
    return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 })
  }
}
