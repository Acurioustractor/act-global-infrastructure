import { NextResponse } from 'next/server'
import { getWeeklySnapshot, getMonthlySeries } from '@/lib/finance/ledger'
import { getFYDates } from '@/lib/finance/dates'

export const dynamic = 'force-dynamic'

/**
 * Weekly business-strength report — slice 1: the whole-org snapshot + the FY monthly trend.
 * Read-only. All money math comes from lib/finance/ledger.ts (the one ledger), so this page,
 * the other finance surfaces, and the Notion weekly digest can't disagree.
 */
export async function GET() {
  try {
    const now = new Date()
    const { fyStart, fyEnd } = getFYDates(now)
    const [snapshot, series] = await Promise.all([
      getWeeklySnapshot(now),
      getMonthlySeries({ fyStart, fyEnd }),
    ])
    return NextResponse.json({ snapshot, series: series.points, seriesOk: series.ok, fyStart, fyEnd })
  } catch (error) {
    console.error('[finance/weekly] GET failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
