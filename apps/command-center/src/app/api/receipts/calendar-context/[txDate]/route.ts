import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txDate: string }> }
) {
  try {
    const { txDate } = await params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const startDate = new Date(txDate)
    startDate.setDate(startDate.getDate() - days)
    const endDate = new Date(txDate)
    endDate.setDate(endDate.getDate() + days)

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      events: events || [],
      count: events?.length || 0,
    })
  } catch (e) {
    console.error('Calendar context error:', e)
    return NextResponse.json({
      success: true,
      events: [],
      count: 0,
    })
  }
}
