/**
 * GET /api/analytics/vercel
 *
 * Latest production deploy state per ACT site (Vercel). Feeds the ecosystem hub's
 * deployment panel. Degrades gracefully when no team-scoped token is configured.
 */
import { NextResponse } from 'next/server'
import { getVercelDeployFeed } from '@/lib/analytics/vercel'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const feed = await getVercelDeployFeed()
    return NextResponse.json(feed)
  } catch (error) {
    console.error('Error in /api/analytics/vercel:', error)
    return NextResponse.json({ error: 'Failed to fetch Vercel feed' }, { status: 500 })
  }
}
