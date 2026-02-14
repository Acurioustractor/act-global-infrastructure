import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/grants/assets — List all grant assets grouped by category
 * POST /api/grants/assets — Update an asset's status/details
 */
export async function GET() {
  try {
    const { data: assets, error } = await supabase
      .from('grant_assets')
      .select('*')
      .order('category')
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by category
    const grouped: Record<string, typeof assets> = {}
    for (const asset of assets || []) {
      if (!grouped[asset.category]) grouped[asset.category] = []
      grouped[asset.category].push(asset)
    }

    // Summary stats
    const total = (assets || []).length
    const ready = (assets || []).filter(a => a.is_current).length
    const expired = (assets || []).filter(a => a.expires_at && new Date(a.expires_at) < new Date()).length
    const missing = total - ready

    return NextResponse.json({
      assets: assets || [],
      grouped,
      summary: { total, ready, missing, expired, readinessPct: total > 0 ? Math.round((ready / total) * 100) : 0 },
    })
  } catch (error) {
    console.error('Grant assets error:', error)
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing asset id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('grant_assets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Grant asset update error:', error)
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
  }
}
