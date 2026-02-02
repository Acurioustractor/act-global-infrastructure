import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Today's email count
    const { count: todayCount } = await supabase
      .from('communications_history')
      .select('id', { count: 'exact', head: true })
      .eq('channel', 'email')
      .gte('occurred_at', todayStart.toISOString())

    // Unread / waiting for response
    const { count: waitingResponse } = await supabase
      .from('communications_history')
      .select('id', { count: 'exact', head: true })
      .eq('channel', 'email')
      .eq('waiting_for_response', true)

    // Requires response from us
    const { count: requiresResponse } = await supabase
      .from('communications_history')
      .select('id', { count: 'exact', head: true })
      .eq('channel', 'email')
      .eq('waiting_for_response', true)
      .eq('response_needed_by', 'us')

    return NextResponse.json({
      success: true,
      unread: waitingResponse || 0,
      requiresResponse: requiresResponse || 0,
      todayCount: todayCount || 0,
    })
  } catch (e) {
    console.error('Email stats error:', e)
    return NextResponse.json({
      success: true,
      unread: 0,
      requiresResponse: 0,
      todayCount: 0,
    })
  }
}
