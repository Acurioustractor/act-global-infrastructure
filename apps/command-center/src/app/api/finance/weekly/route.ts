import { NextResponse } from 'next/server'
import { getWeeklySnapshot, getMonthlySeries, getProjectPL, getLineItemFacts } from '@/lib/finance/ledger'
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
    const [snapshot, series, projects, lineItems] = await Promise.all([
      getWeeklySnapshot(now),
      getMonthlySeries({ fyStart, fyEnd }),
      getProjectPL({ fyStart, fyEnd, now }),
      getLineItemFacts({ fyStart, fyEnd }),
    ])
    // R&D is intentionally NOT restated here — the rd_eligible flag is drawings-inflated; the
    // net basis lives on /finance/rd-dashboard. GST is derived (10% of line_amount by tax_type).
    return NextResponse.json({
      snapshot,
      series: series.points,
      seriesOk: series.ok,
      projects: projects.rows,
      projectsOk: projects.ok,
      people: lineItems.people,
      peopleOk: lineItems.ok,
      gst: lineItems.gst,
      receiptedPct: lineItems.receiptedPct,
      fyStart,
      fyEnd,
    })
  } catch (error) {
    console.error('[finance/weekly] GET failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
