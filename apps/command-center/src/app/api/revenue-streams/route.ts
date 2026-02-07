import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3))

    // Fetch all required data
    const [streamsRes, entriesRes, pipelineRes] = await Promise.all([
      supabase.from('revenue_streams').select('*'),
      supabase.from('revenue_stream_entries').select('*').gte('month', threeMonthsAgo.toISOString().split('T')[0]),
      supabase.from('fundraising_pipeline').select('*'),
    ])

    if (streamsRes.error || entriesRes.error || pipelineRes.error) {
      throw new Error('Failed to fetch revenue data')
    }

    const streams = streamsRes.data || []
    const entries = entriesRes.data || []
    const pipeline = pipelineRes.data || []

    // Calculate metrics
    const currentMonthEntries = entries.filter((e: any) => {
      const entryDate = new Date(e.month)
      return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear
    })

    const totalMonthly = currentMonthEntries.reduce((sum, e) => sum + (e.amount || 0), 0)

    // Calculate growth rates per stream
    const streamMetrics = streams.map((stream) => {
      const streamEntries = entries.filter((e) => e.stream_id === stream.id)
      const currentMonthAmount = currentMonthEntries
        .filter((e) => e.stream_id === stream.id)
        .reduce((sum, e) => sum + (e.amount || 0), 0)

      const threeMonthTotal = streamEntries.reduce((sum, e) => sum + (e.amount || 0), 0)
      const growthRate = threeMonthTotal > 0 ? ((currentMonthAmount - threeMonthTotal / 3) / (threeMonthTotal / 3)) * 100 : 0

      return {
        ...stream,
        currentMonthAmount,
        growthRate,
      }
    })

    const fastestGrowing = streamMetrics.reduce((max, s) => (s.growthRate > max.growthRate ? s : max), streamMetrics[0] || {})

    const onTarget = streams.filter((s) => {
      const monthlyAmount = currentMonthEntries
        .filter((e) => e.stream_id === s.id)
        .reduce((sum, e) => sum + (e.amount || 0), 0)
      return monthlyAmount >= (s.target_monthly || 0)
    }).length

    const pipelineValue = pipeline.reduce((sum, p) => sum + ((p.amount || 0) * (p.probability || 0)), 0)

    return NextResponse.json({
      streams,
      entries: currentMonthEntries,
      pipeline,
      metrics: {
        totalMonthly,
        fastestGrowing,
        onTarget,
        pipelineValue,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
