import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch business initiatives
    const { data: initiatives, error: initiativesError } = await supabase
      .from('business_initiatives')
      .select('*')
      .order('created_at', { ascending: false })

    if (initiativesError) throw initiativesError

    // Fetch revenue streams
    const { data: revenueStreams, error: revenueError } = await supabase
      .from('revenue_streams')
      .select('*')
      .order('created_at', { ascending: false })

    if (revenueError) throw revenueError

    // Fetch fundraising pipeline
    const { data: fundraisingPipeline, error: fundraisingError } = await supabase
      .from('fundraising_pipeline')
      .select('*')
      .order('created_at', { ascending: false })

    if (fundraisingError) throw fundraisingError

    // Calculate metrics
    const activeInitiatives = initiatives?.filter(i => i.status !== 'completed' && i.status !== 'archived').length || 0
    const totalRDSpend = initiatives?.reduce((sum, i) => sum + (i.budget_allocated || 0), 0) || 0
    const expectedRevenueImpact = revenueStreams?.reduce((sum, r) => sum + (r.projected_revenue || 0), 0) || 0
    const successRate = initiatives && initiatives.length > 0
      ? Math.round((initiatives.filter(i => i.status === 'completed' && i.success === true).length / initiatives.filter(i => i.status === 'completed').length) * 100) || 0
      : 0
    const experimentsRunning = initiatives?.filter(i => i.type === 'experiment').length || 0

    return NextResponse.json({
      initiatives: initiatives || [],
      revenueStreams: revenueStreams || [],
      fundraisingPipeline: fundraisingPipeline || [],
      metrics: {
        activeInitiatives,
        totalRDSpend,
        expectedRevenueImpact,
        successRate,
        experimentsRunning
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('business_initiatives')
      .insert([
        {
          title: body.title,
          type: body.type,
          description: body.description,
          hypothesis: body.hypothesis,
          expected_revenue: body.expectedRevenue,
          target_launch_date: body.targetLaunchDate,
          status: 'ideation',
          owner: body.owner,
          progress: 10,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
