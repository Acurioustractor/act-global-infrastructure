import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Filter = 'high_conf' | 'review' | 'all'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const filter = (url.searchParams.get('filter') as Filter) || 'high_conf'
  const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200)

  let query = supabase
    .from('finance_ai_routing_suggestions')
    .select('id,source_table,source_record_id,vendor_name,amount,txn_date,bank_account,description,suggested_project_code,confidence,reason,risk_flags,model,prompt_version,created_at,applied_to_source,rejected_at')
    .eq('applied_to_source', false)
    .is('rejected_at', null)
    .order('confidence', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filter === 'high_conf') {
    query = query.gte('confidence', 0.85).not('suggested_project_code', 'in', '(ASK_USER,SL_REVIEW)')
  } else if (filter === 'review') {
    query = query.or('confidence.lt.0.85,suggested_project_code.in.(ASK_USER,SL_REVIEW)')
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bucketed counts for the filter tab UI
  const [{ count: totalHighConf }, { count: totalReview }, { count: totalApplied }] = await Promise.all([
    supabase
      .from('finance_ai_routing_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('applied_to_source', false)
      .is('rejected_at', null)
      .gte('confidence', 0.85)
      .not('suggested_project_code', 'in', '(ASK_USER,SL_REVIEW)'),
    supabase
      .from('finance_ai_routing_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('applied_to_source', false)
      .is('rejected_at', null)
      .or('confidence.lt.0.85,suggested_project_code.in.(ASK_USER,SL_REVIEW)'),
    supabase
      .from('finance_ai_routing_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('applied_to_source', true),
  ])

  return NextResponse.json({
    filter,
    counts: {
      highConf: totalHighConf ?? 0,
      review: totalReview ?? 0,
      applied: totalApplied ?? 0,
    },
    suggestions: data || [],
  })
}
