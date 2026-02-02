import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { query, dateRange = {}, amount = {} } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    // Search receipt_matches by vendor name
    let dbQuery = supabase
      .from('receipt_matches')
      .select('*')
      .ilike('vendor_name', `%${query}%`)
      .order('transaction_date', { ascending: false })
      .limit(50)

    if (dateRange.from) {
      dbQuery = dbQuery.gte('transaction_date', dateRange.from)
    }
    if (dateRange.to) {
      dbQuery = dbQuery.lte('transaction_date', dateRange.to)
    }
    if (amount.min) {
      dbQuery = dbQuery.gte('amount', amount.min)
    }
    if (amount.max) {
      dbQuery = dbQuery.lte('amount', amount.max)
    }

    const { data: results, error } = await dbQuery

    if (error) throw error

    return NextResponse.json({
      success: true,
      results: results || [],
      count: results?.length || 0,
    })
  } catch (e) {
    console.error('Receipt search error:', e)
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
