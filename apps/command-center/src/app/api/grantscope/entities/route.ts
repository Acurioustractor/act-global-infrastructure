import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/grantscope/entities
 * Full entity profile from GrantScope's unified entity model
 *
 * Query params:
 *   abn - lookup by ABN
 *   q - text search by name
 *   type - filter by entity_type (foundation, charity, government, company)
 *   state - filter by state
 *   community_controlled - filter to community-controlled orgs (true/false)
 *   limit - results per page (default 50, max 200)
 *   offset - pagination offset
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const abn = params.get('abn')
  const q = params.get('q')
  const type = params.get('type')
  const state = params.get('state')
  const communityControlled = params.get('community_controlled')
  const limit = Math.min(Number(params.get('limit') || 50), 200)
  const offset = Number(params.get('offset') || 0)

  // ABN lookup — return single entity with relationships
  if (abn) {
    const cleanAbn = abn.replace(/\s/g, '')
    const { data: entity, error } = await supabase
      .from('gs_entities')
      .select('*')
      .eq('abn', cleanAbn)
      .single()

    if (error || !entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    // Fetch relationships for this entity
    const { data: relationships } = await supabase
      .from('gs_relationships')
      .select('*')
      .or(`source_entity_id.eq.${entity.id},target_entity_id.eq.${entity.id}`)
      .limit(100)

    // Check ACNC data
    const { data: acncData } = await supabase
      .from('acnc_charities')
      .select('*')
      .eq('abn', cleanAbn)
      .single()

    // Check foundation data
    const { data: foundationData } = await supabase
      .from('foundations')
      .select('*, foundation_programs(id, name, focus_area, grant_size_min, grant_size_max)')
      .eq('acnc_abn', cleanAbn)
      .single()

    return NextResponse.json({
      entity,
      relationships: relationships || [],
      acnc: acncData || null,
      foundation: foundationData || null,
    })
  }

  // Search mode
  let query = supabase
    .from('gs_entities')
    .select('id, canonical_name, abn, entity_type, state, sector, latest_revenue, latest_assets, website, is_community_controlled, tags', { count: 'exact' })

  if (q) {
    query = query.ilike('canonical_name', `%${q}%`)
  }
  if (type) {
    query = query.eq('entity_type', type)
  }
  if (state) {
    query = query.eq('state', state.toUpperCase())
  }
  if (communityControlled === 'true') {
    query = query.eq('is_community_controlled', true)
  }

  query = query
    .order('latest_revenue', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    entities: data,
    total: count,
    limit,
    offset,
  })
}
