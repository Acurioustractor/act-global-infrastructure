import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // filter by opportunity_type
    const stage = searchParams.get('stage')

    let query = supabase
      .from('opportunities_unified')
      .select('*')
      .order('updated_at', { ascending: false })

    if (type) query = query.eq('opportunity_type', type)
    if (stage) query = query.eq('stage', stage)

    const { data: opportunities, error } = await query.limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Pipeline value summary
    const { data: pipelineValue, error: pvError } = await supabase
      .from('v_pipeline_value')
      .select('*')

    if (pvError) {
      return NextResponse.json({ error: pvError.message }, { status: 500 })
    }

    // Group opportunities by stage for kanban
    const stages = [
      'identified', 'researching', 'pursuing', 'submitted',
      'negotiating', 'approved', 'realized', 'lost', 'expired'
    ]

    const grouped: Record<string, typeof opportunities> = {}
    for (const s of stages) {
      grouped[s] = (opportunities || []).filter(o => o.stage === s)
    }

    const totalWeightedValue = (pipelineValue || []).reduce(
      (sum: number, pv: any) => sum + Number(pv.weighted_value || 0), 0
    )
    const totalUnweightedValue = (pipelineValue || []).reduce(
      (sum: number, pv: any) => sum + Number(pv.total_value || 0), 0
    )

    return NextResponse.json({
      opportunities: opportunities || [],
      grouped,
      stages,
      pipelineValue: pipelineValue || [],
      summary: {
        totalOpportunities: (opportunities || []).length,
        totalWeightedValue: Math.round(totalWeightedValue),
        totalUnweightedValue: Math.round(totalUnweightedValue),
        byType: Object.fromEntries(
          ['grant', 'deal', 'investment', 'land_equity', 'community_capital', 'donation', 'earned_revenue']
            .map(t => [t, (opportunities || []).filter(o => o.opportunity_type === t).length])
            .filter(([, count]) => (count as number) > 0)
        ),
      },
    })
  } catch (error) {
    console.error('Error in unified pipeline:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

// Update opportunity stage
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, stage, notes } = body

    if (!id || !stage) {
      return NextResponse.json({ error: 'id and stage required' }, { status: 400 })
    }

    // Get current stage for history
    const { data: current } = await supabase
      .from('opportunities_unified')
      .select('stage')
      .eq('id', id)
      .single()

    // Update stage
    const { error: updateError } = await supabase
      .from('opportunities_unified')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Record stage change
    await supabase
      .from('opportunity_stage_history')
      .insert({
        opportunity_id: id,
        from_stage: current?.stage || null,
        to_stage: stage,
        changed_by: 'dashboard',
        notes: notes || null,
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
