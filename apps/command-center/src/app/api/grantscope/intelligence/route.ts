import { NextResponse } from 'next/server'
import { civicgraph, supabase } from '@/lib/supabase'

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
    civicgraph.from('gs_entities').select('id', { count: 'exact', head: true }),
    civicgraph.from('foundations').select('id', { count: 'exact', head: true }),
    civicgraph.from('grant_opportunities').select('id', { count: 'exact', head: true }),
    civicgraph.from('grant_opportunities').select('id', { count: 'exact', head: true })
      .gte('closes_at', now),
    civicgraph.from('grant_opportunities').select('id, title:name, close_date:closes_at, amount_max, funder_name:provider', { count: 'exact' })
      .gte('closes_at', now).lte('closes_at', thirtyDays)
      .order('closes_at', { ascending: true })
      .limit(10),
    civicgraph.from('foundations')
      .select('id, name, total_giving_annual, website')
      .not('total_giving_annual', 'is', null)
      .order('total_giving_annual', { ascending: false })
      .limit(10),
    civicgraph.from('grant_opportunities')
      .select('id, title:name, funder_name:provider, amount_max, close_date:closes_at, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    // v_pipeline_value: ownership unresolved — likely aggregates grant_opportunities/applications,
    // so at data-move time it probably travels with the grant estate (→ civicgraph). Left on the
    // app's own client for now; resolve when CivicGraph's estate actually moves.
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
