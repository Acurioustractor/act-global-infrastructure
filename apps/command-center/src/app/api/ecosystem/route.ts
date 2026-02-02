import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ecosystem_sites')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) throw error

    const sites = (data || []).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      url: s.url,
      description: s.description || '',
      category: s.category || 'other',
      status: s.health_status || s.status || 'healthy',
      health_score: s.health_score ?? 100,
      health_trend: s.health_trend || 'stable',
      response_time_ms: s.response_time_ms ?? 0,
      last_check_at: s.last_check_at || s.updated_at,
      ssl_expires_at: s.ssl_expires_at,
      github_repo: s.github_repo,
      vercel_project_name: s.vercel_project_name,
    }))

    // Group by category
    const categories: Record<string, { name: string; sites: typeof sites }> = {}
    for (const site of sites) {
      if (!categories[site.category]) {
        categories[site.category] = { name: site.category, sites: [] }
      }
      categories[site.category].sites.push(site)
    }

    const healthy = sites.filter(s => s.status === 'healthy').length

    return NextResponse.json({
      categories,
      sites,
      health: {
        healthy,
        total: sites.length,
        percentage: sites.length > 0 ? Math.round((healthy / sites.length) * 100) : 100,
      },
    })
  } catch (e) {
    console.error('Ecosystem error:', e)
    return NextResponse.json({ categories: {}, sites: [], health: { healthy: 0, total: 0, percentage: 100 } })
  }
}
