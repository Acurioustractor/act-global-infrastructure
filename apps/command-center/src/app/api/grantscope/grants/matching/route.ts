import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/grantscope/grants/matching
 * Find grants matching ACT projects by sector, eligibility, and deadline
 *
 * Query params:
 *   project - ACT project code (e.g., ACT-EL, ACT-JH, ACT-GD)
 *   status - grant status (open, closing_soon, closed)
 *   min_amount - minimum grant amount
 *   max_amount - maximum grant amount
 *   state - state filter
 *   closing_within_days - grants closing within N days
 *   limit - results per page (default 50, max 200)
 *   offset - pagination offset
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const project = params.get('project')
  const status = params.get('status')
  const minAmount = params.get('min_amount')
  const maxAmount = params.get('max_amount')
  const state = params.get('state')
  const closingDays = params.get('closing_within_days')
  const limit = Math.min(Number(params.get('limit') || 50), 200)
  const offset = Number(params.get('offset') || 0)

  let query = supabase
    .from('grant_opportunities')
    .select('*', { count: 'exact' })

  // Project-based filtering via tags/sector matching
  if (project) {
    const projectSectors: Record<string, string[]> = {
      'ACT-EL': ['arts', 'culture', 'community', 'digital', 'storytelling', 'indigenous'],
      'ACT-JH': ['justice', 'legal', 'indigenous', 'human rights', 'community'],
      'ACT-GD': ['environment', 'indigenous', 'social enterprise', 'remote', 'logistics'],
      'ACT-BCV': ['environment', 'conservation', 'agriculture', 'indigenous', 'land'],
      'ACT-TH': ['agriculture', 'community', 'wellbeing', 'food', 'rural'],
      'ACT-FM': ['agriculture', 'environment', 'conservation', 'research', 'innovation'],
      'ACT-ART': ['arts', 'culture', 'indigenous', 'community', 'creative'],
    }
    const sectors = projectSectors[project]
    if (sectors) {
      const sectorFilter = sectors.map(s => `sector.ilike.%${s}%`).join(',')
      query = query.or(sectorFilter)
    }
  }

  if (status === 'open') {
    query = query.gte('close_date', new Date().toISOString())
  } else if (status === 'closing_soon') {
    const now = new Date()
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    query = query.gte('close_date', now.toISOString()).lte('close_date', soon.toISOString())
  }

  if (closingDays) {
    const now = new Date()
    const deadline = new Date(now.getTime() + Number(closingDays) * 24 * 60 * 60 * 1000)
    query = query.gte('close_date', now.toISOString()).lte('close_date', deadline.toISOString())
  }

  if (minAmount) {
    query = query.gte('amount_max', Number(minAmount))
  }
  if (maxAmount) {
    query = query.lte('amount_min', Number(maxAmount))
  }
  if (state) {
    query = query.ilike('eligibility_states', `%${state}%`)
  }

  query = query
    .order('close_date', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    grants: data,
    total: count,
    limit,
    offset,
  })
}
