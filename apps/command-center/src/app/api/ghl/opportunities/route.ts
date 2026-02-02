import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pipeline = searchParams.get('pipeline')

    let query = supabase
      .from('ghl_opportunities')
      .select('*')
      .order('updated_at', { ascending: false })

    if (pipeline) {
      query = query.eq('pipeline_id', pipeline)
    }

    const { data, error } = await query

    if (error) throw error

    const opportunities = (data || []).map((o) => ({
      id: o.id,
      name: o.name,
      contact_name: o.contact_name,
      pipeline_name: o.pipeline_name || 'Default',
      stage_name: o.stage_name || o.status || 'Unknown',
      monetary_value: o.monetary_value || o.value || 0,
      status: o.status || 'open',
    }))

    return NextResponse.json({ opportunities })
  } catch (e) {
    console.error('GHL opportunities error:', e)
    return NextResponse.json({ opportunities: [] })
  }
}
