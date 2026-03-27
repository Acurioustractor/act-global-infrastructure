import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/grantscope/intelligence
 * GrantScope intelligence dashboard — key metrics and insights
 * for the ACT command center
 */
export async function GET() {
  const now = new Date().toISOString()
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Run all queries in parallel
  const [
    entityCount,
    foundationCount,
    grantCount,
    openGrants,
    closingSoon,
    topFunders,
    recentGrants,
    pipelineValue,
  ] = await Promise.all([
    supabase.from('gs_entities').select('id', { count: 'exact', head: true }),
    supabase.from('foundations').select('id', { count: 'exact', head: true }),
    supabase.from('grant_opportunities').select('id', { count: 'exact', head: true }),
    supabase.from('grant_opportunities').select('id', { count: 'exact', head: true })
      .gte('close_date', now),
    supabase.from('grant_opportunities').select('id, title, close_date, amount_max, funder_name', { count: 'exact' })
      .gte('close_date', now).lte('close_date', thirtyDays)
      .order('close_date', { ascending: true })
      .limit(10),
    supabase.from('foundations')
      .select('id, name, total_giving_annual, website')
      .not('total_giving_annual', 'is', null)
      .order('total_giving_annual', { ascending: false })
      .limit(10),
    supabase.from('grant_opportunities')
      .select('id, title, funder_name, amount_max, close_date, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('v_pipeline_value').select('*').limit(1).single(),
  ])

  return NextResponse.json({
    overview: {
      total_entities: entityCount.count || 0,
      total_foundations: foundationCount.count || 0,
      total_grants: grantCount.count || 0,
      open_grants: openGrants.count || 0,
      closing_within_30_days: closingSoon.count || 0,
    },
    closing_soon: closingSoon.data || [],
    top_funders: topFunders.data || [],
    recently_discovered: recentGrants.data || [],
    pipeline: pipelineValue.data || null,
    generated_at: new Date().toISOString(),
  })
}
