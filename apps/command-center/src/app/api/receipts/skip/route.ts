import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { receiptId, reason = 'no_receipt_needed' } = await request.json()

    if (!receiptId) {
      return NextResponse.json({ error: 'receiptId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('receipt_matches')
      .update({
        status: reason,
        resolved_at: new Date().toISOString(),
        resolved_by: 'skip',
      })
      .eq('id', receiptId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, receipt: data })
  } catch (e) {
    console.error('Receipt skip error:', e)
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
