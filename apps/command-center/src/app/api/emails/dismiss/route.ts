import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { ids, reason = 'manually_dismissed' } = await request.json()

    if (!ids?.length) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('communications_history')
      .update({
        dismissed_at: new Date().toISOString(),
        dismissed_reason: reason,
      })
      .in('id', ids)
      .select('id')

    if (error) throw error

    return NextResponse.json({ success: true, dismissed: data?.length ?? 0 })
  } catch (e) {
    console.error('Email dismiss error:', e)
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
