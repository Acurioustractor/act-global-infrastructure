import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { receiptId, matchType = 'manual' } = await request.json()

    if (!receiptId) {
      return NextResponse.json({ error: 'receiptId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('receipt_matches')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: matchType,
      })
      .eq('id', receiptId)
      .select()
      .single()

    if (error) throw error

    await supabase.from('receipt_match_history').insert({
      receipt_match_id: receiptId,
      action: 'resolved',
      previous_status: 'pending',
      new_status: 'resolved',
      triggered_by: 'dashboard',
    })

    return NextResponse.json({ success: true, receipt: data })
  } catch (e) {
    console.error('Receipt match error:', e)
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
