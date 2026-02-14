import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch pipeline from view
    const { data: pipeline, error: pErr } = await supabase
      .from('grant_applications')
      .select(`
        id,
        application_name,
        status,
        amount_requested,
        outcome_amount,
        submitted_at,
        project_code,
        lead_contact,
        milestones,
        ghl_opportunity_id,
        opportunity_id,
        notes,
        created_at,
        updated_at
      `)
      .not('status', 'in', '("unsuccessful","withdrawn")')
      .order('created_at', { ascending: false })

    if (pErr) throw pErr

    // Fetch linked opportunities
    const { data: opportunities } = await supabase
      .from('grant_opportunities')
      .select('id, name, provider, closes_at, fit_score, relevance_score, aligned_projects, url')

    const oppMap: Record<string, any> = {}
    for (const opp of opportunities || []) {
      oppMap[opp.id] = opp
    }

    // Fetch GHL opportunity statuses
    const ghlIds = (pipeline || [])
      .map(p => p.ghl_opportunity_id)
      .filter(Boolean)

    let ghlMap: Record<string, any> = {}
    if (ghlIds.length > 0) {
      const { data: ghlOpps } = await supabase
        .from('ghl_opportunities')
        .select('id, name, stage_name, monetary_value')
        .in('id', ghlIds)

      for (const g of ghlOpps || []) {
        ghlMap[g.id] = g
      }
    }

    // Group by status (Kanban columns)
    const stages = ['draft', 'in_progress', 'submitted', 'under_review', 'successful']
    const grouped: Record<string, any[]> = {}
    for (const stage of stages) {
      grouped[stage] = []
    }

    for (const app of pipeline || []) {
      const opp = app.opportunity_id ? oppMap[app.opportunity_id] : null
      const ghl = app.ghl_opportunity_id ? ghlMap[app.ghl_opportunity_id] : null

      const card = {
        id: app.id,
        name: app.application_name,
        status: app.status,
        amount: app.amount_requested || 0,
        outcomeAmount: app.outcome_amount,
        projectCode: app.project_code,
        leadContact: app.lead_contact,
        submittedAt: app.submitted_at,
        provider: opp?.provider || null,
        deadline: opp?.closes_at || null,
        fitScore: opp?.fit_score ?? opp?.relevance_score ?? null,
        url: opp?.url || null,
        ghlStage: ghl?.stage_name || null,
        ghlValue: ghl?.monetary_value || null,
        milestones: app.milestones || [],
        notes: app.notes,
      }

      if (grouped[app.status]) {
        grouped[app.status].push(card)
      }
    }

    return NextResponse.json({ stages, grouped })
  } catch (error) {
    console.error('Error in grants pipeline:', error)
    return NextResponse.json({ stages: [], grouped: {} }, { status: 500 })
  }
}
