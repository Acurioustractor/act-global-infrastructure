import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  // Get contact suggestions from intelligence_insights
  const { data, error } = await supabase
    .from('intelligence_insights')
    .select('*')
    .eq('insight_type', 'contact_suggestion')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 50))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    suggestions: data || [],
    count: data?.length || 0,
  })
}
