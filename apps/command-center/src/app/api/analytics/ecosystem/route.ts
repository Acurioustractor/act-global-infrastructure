/**
 * GET /api/analytics/ecosystem
 *
 * Belonging analytics across the ACT ecosystem, read from the existing GHL mirror.
 * Funnel by journey rung, consent state, source of arrival, per-project segmentation.
 * Belonging, not sales — see lib/analytics/ecosystem.ts.
 */
import { NextResponse } from 'next/server'
import { getEcosystemAnalytics } from '@/lib/analytics/ecosystem'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getEcosystemAnalytics()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in /api/analytics/ecosystem:', error)
    return NextResponse.json(
      { error: 'Failed to compute ecosystem analytics' },
      { status: 500 },
    )
  }
}
