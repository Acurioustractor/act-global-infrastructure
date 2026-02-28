import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const projectCode = decodeURIComponent(code).toUpperCase()

    // Parallel fetch all intelligence data
    const [
      snapshot,
      focusAreas,
      relationships,
      activityStream,
      health,
      recentKnowledge,
    ] = await Promise.all([
      // Latest snapshot
      supabase
        .from('project_intelligence_snapshots')
        .select('*')
        .eq('project_code', projectCode)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Focus areas
      supabase
        .from('project_focus_areas')
        .select('*')
        .eq('project_code', projectCode)
        .in('status', ['current', 'upcoming', 'blocked'])
        .order('priority', { ascending: true }),

      // Key relationships (top 10 by temperature)
      supabase
        .from('v_project_relationships')
        .select('*')
        .eq('project_code', projectCode)
        .order('temperature', { ascending: false, nullsFirst: false })
        .limit(10),

      // Activity stream (last 20 items)
      supabase
        .from('v_project_activity_stream')
        .select('*')
        .eq('project_code', projectCode)
        .order('activity_date', { ascending: false })
        .limit(20),

      // Health scores
      supabase
        .from('project_health')
        .select('*')
        .eq('project_code', projectCode)
        .maybeSingle(),

      // Recent knowledge items
      supabase
        .from('project_knowledge')
        .select('id, title, knowledge_type, importance, recorded_at, action_required, follow_up_date')
        .eq('project_code', projectCode)
        .order('recorded_at', { ascending: false })
        .limit(10),
    ])

    // Calculate burn rate from snapshot or recent transactions
    const snapshotData = snapshot.data
    const burnRate = snapshotData?.monthly_burn_rate || 0
    const pipelineValue = snapshotData?.pipeline_value || 0

    // Group focus areas by status
    const focus = {
      current: (focusAreas.data || []).filter((f: any) => f.status === 'current'),
      upcoming: (focusAreas.data || []).filter((f: any) => f.status === 'upcoming'),
      blocked: (focusAreas.data || []).filter((f: any) => f.status === 'blocked'),
    }

    return NextResponse.json({
      projectCode,
      snapshot: snapshotData || null,
      focus,
      relationships: (relationships.data || []).map((r: any) => ({
        contactId: r.contact_id,
        name: r.contact_name,
        email: r.email,
        company: r.company_name,
        tags: r.tags,
        temperature: r.temperature,
        trend: r.temperature_trend,
        lastContact: r.last_contact_at,
      })),
      activityStream: (activityStream.data || []).map((a: any) => ({
        id: a.activity_id,
        type: a.activity_type,
        title: a.title,
        description: a.description,
        date: a.activity_date,
        metadata: a.metadata,
      })),
      health: health.data ? {
        overall: health.data.health_score,
        momentum: health.data.momentum_score,
        engagement: health.data.engagement_score,
        financial: health.data.financial_score,
        timeline: health.data.timeline_score,
        calculatedAt: health.data.calculated_at,
      } : null,
      recentKnowledge: (recentKnowledge.data || []).map((k: any) => ({
        id: k.id,
        title: k.title,
        type: k.knowledge_type,
        importance: k.importance,
        recordedAt: k.recorded_at,
        actionRequired: k.action_required,
        followUpDate: k.follow_up_date,
      })),
      summary: {
        burnRate,
        pipelineValue,
        contactCount: snapshotData?.contact_count || (relationships.data || []).length,
        activeGrants: snapshotData?.active_grant_count || 0,
        recentWins: snapshotData?.recent_wins || [],
        blockers: snapshotData?.blockers || [],
      },
    })
  } catch (error) {
    console.error('Error in project intelligence:', error)
    return NextResponse.json({ error: 'Failed to load intelligence' }, { status: 500 })
  }
}
