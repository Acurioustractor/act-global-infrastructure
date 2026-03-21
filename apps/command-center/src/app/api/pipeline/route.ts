import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const stage = searchParams.get('stage')
    const minUrgency = searchParams.get('min_urgency')
    const search = searchParams.get('q')

    let query = supabase
      .from('relationship_pipeline')
      .select('*')
      .order('urgency_score', { ascending: false })
      .order('updated_at', { ascending: false })

    if (entityType) query = query.eq('entity_type', entityType)
    if (stage) query = query.eq('stage', stage)
    if (minUrgency) query = query.gte('urgency_score', parseInt(minUrgency))
    if (search) query = query.ilike('entity_name', `%${search}%`)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Group by stage for board view
    const stages = ['cold', 'warm', 'engaged', 'active', 'partner', 'dormant', 'lost']
    const board: Record<string, typeof data> = {}
    for (const s of stages) {
      board[s] = (data || []).filter(r => r.stage === s)
    }

    const summary = {
      total: (data || []).length,
      byType: {
        grant: (data || []).filter(r => r.entity_type === 'grant').length,
        foundation: (data || []).filter(r => r.entity_type === 'foundation').length,
        business: (data || []).filter(r => r.entity_type === 'business').length,
        person: (data || []).filter(r => r.entity_type === 'person').length,
        opportunity: (data || []).filter(r => r.entity_type === 'opportunity').length,
      },
      totalValue: (data || []).reduce((sum, r) => sum + (r.value_high || 0), 0),
      needsAttention: (data || []).filter(r => r.urgency_score >= 4).length,
    }

    return NextResponse.json({ board, items: data, summary })
  } catch (error) {
    console.error('Pipeline GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entity_type, entity_id, entity_name, stage, ...rest } = body

    if (!entity_type || !entity_id || !entity_name) {
      return NextResponse.json({ error: 'entity_type, entity_id, and entity_name are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('relationship_pipeline')
      .upsert(
        { entity_type, entity_id, entity_name, stage: stage || 'cold', ...rest },
        { onConflict: 'entity_type,entity_id' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Pipeline POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
