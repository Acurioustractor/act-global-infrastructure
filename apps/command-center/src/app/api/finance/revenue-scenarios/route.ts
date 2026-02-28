import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch scenarios
    const { data: scenarios, error: scenError } = await supabase
      .from('revenue_scenarios')
      .select('*')
      .order('name')

    if (scenError) {
      return NextResponse.json({ error: scenError.message }, { status: 500 })
    }

    // Fetch all projections
    const { data: projections, error: projError } = await supabase
      .from('revenue_stream_projections')
      .select('*, revenue_streams(name, code, category, color)')
      .order('year')

    if (projError) {
      return NextResponse.json({ error: projError.message }, { status: 500 })
    }

    // Fetch revenue streams for reference
    const { data: streams, error: streamError } = await supabase
      .from('revenue_streams')
      .select('*')
      .order('name')

    if (streamError) {
      return NextResponse.json({ error: streamError.message }, { status: 500 })
    }

    // Group projections by scenario
    const scenarioData = (scenarios || []).map((s: any) => {
      const scenProjections = (projections || []).filter((p: any) => p.scenario_id === s.id)

      // Group by year
      const years: Record<number, { total: number; streams: Record<string, number> }> = {}
      for (const p of scenProjections) {
        if (!years[p.year]) years[p.year] = { total: 0, streams: {} }
        years[p.year].total += Number(p.projected_annual || 0)
        const streamName = (p.revenue_streams as any)?.name || 'Unknown'
        years[p.year].streams[streamName] = Number(p.projected_annual || 0)
      }

      return {
        ...s,
        projections: scenProjections,
        yearlyTotals: years,
      }
    })

    return NextResponse.json({
      scenarios: scenarioData,
      streams: streams || [],
    })
  } catch (error) {
    console.error('Error in revenue scenarios:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
