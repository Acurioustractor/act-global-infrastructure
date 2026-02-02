import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ghl_pipelines')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    const pipelines = (data || []).map((p) => ({
      id: p.id,
      ghl_id: p.ghl_id || p.ghl_pipeline_id || p.id,
      name: p.name,
      stages: p.stages || [],
    }))

    return NextResponse.json({ pipelines })
  } catch (e) {
    console.error('GHL pipelines error:', e)
    return NextResponse.json({ pipelines: [] })
  }
}
