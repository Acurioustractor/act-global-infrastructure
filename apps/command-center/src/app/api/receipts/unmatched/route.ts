import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const category = searchParams.get('category')

    let query = supabase
      .from('receipt_matches')
      .select('*')
      .in('status', ['pending', 'email_suggested', 'deferred'])
      .gte('transaction_date', '2025-10-01')
      .order('transaction_date', { ascending: false })
      .limit(limit)

    if (category) {
      query = query.eq('category', category)
    }

    const { data: receipts, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      receipts: receipts || [],
      count: receipts?.length || 0,
    })
  } catch (e) {
    console.error('Unmatched receipts error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
