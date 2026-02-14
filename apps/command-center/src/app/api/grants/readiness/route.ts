import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/grants/readiness — Grant readiness overview across all applications
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_grant_readiness')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Overall readiness
    const applications = data || []
    const totalApps = applications.length
    const avgReadiness = totalApps > 0
      ? Math.round(applications.reduce((sum, a) => sum + (a.readiness_pct || 0), 0) / totalApps)
      : 0

    // Upcoming deadlines
    const upcoming = applications
      .filter(a => a.closes_at && new Date(a.closes_at) > new Date())
      .sort((a, b) => new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime())

    return NextResponse.json({
      applications,
      summary: {
        totalApps,
        avgReadiness,
        upcomingCount: upcoming.length,
        nextDeadline: upcoming[0]?.closes_at || null,
        nextDeadlineName: upcoming[0]?.grant_name || null,
      },
    })
  } catch (error) {
    console.error('Grant readiness error:', error)
    return NextResponse.json({ error: 'Failed to fetch readiness' }, { status: 500 })
  }
}
