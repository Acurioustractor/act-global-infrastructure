import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txId: string }> }
) {
  try {
    const { txId } = await params

    const { data: receipt, error } = await supabase
      .from('receipt_matches')
      .select('*')
      .eq('id', txId)
      .single()

    if (error) throw error

    const suggestions = []
    if (receipt?.suggested_email_subject) {
      suggestions.push({
        type: 'email',
        subject: receipt.suggested_email_subject,
        confidence: receipt.match_confidence || 0,
        email_id: receipt.suggested_email_id,
      })
    }

    return NextResponse.json({
      success: true,
      receipt,
      suggestions,
    })
  } catch (e) {
    console.error('Receipt suggestions error:', e)
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
