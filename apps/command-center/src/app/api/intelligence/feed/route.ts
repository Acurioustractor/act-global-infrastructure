import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status') || 'active'
  const type = searchParams.get('type')

  let query = supabase
    .from('intelligence_insights')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100))

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (type) {
    query = query.eq('insight_type', type)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    insights: data || [],
    count: data?.length || 0,
  })
}
