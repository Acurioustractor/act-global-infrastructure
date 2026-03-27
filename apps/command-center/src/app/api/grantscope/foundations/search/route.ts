import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/grantscope/foundations/search
 * Search foundations by name, thematic focus, geographic focus, or DGR status
 *
 * Query params:
 *   q - text search query (name or description)
 *   focus - filter by thematic focus area
 *   geography - filter by geographic focus
 *   has_dgr - filter to DGR-endorsed only (true/false)
 *   min_giving - minimum annual giving
 *   type - foundation type filter
 *   limit - results per page (default 50, max 200)
 *   offset - pagination offset
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const q = params.get('q')
  const focus = params.get('focus')
  const geography = params.get('geography')
  const hasDgr = params.get('has_dgr')
  const minGiving = params.get('min_giving')
  const type = params.get('type')
  const limit = Math.min(Number(params.get('limit') || 50), 200)
  const offset = Number(params.get('offset') || 0)

  let query = supabase
    .from('foundations')
    .select('*, foundation_programs(id, name, focus_area, grant_size_min, grant_size_max)', { count: 'exact' })

  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,giving_philosophy.ilike.%${q}%`)
  }
  if (focus) {
    query = query.contains('thematic_focus', [focus])
  }
  if (geography) {
    query = query.contains('geographic_focus', [geography])
  }
  if (hasDgr === 'true') {
    query = query.eq('has_dgr', true)
  }
  if (type) {
    query = query.eq('type', type)
  }
  if (minGiving) {
    query = query.gte('total_giving_annual', Number(minGiving))
  }

  query = query
    .order('total_giving_annual', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    foundations: data,
    total: count,
    limit,
    offset,
  })
}
