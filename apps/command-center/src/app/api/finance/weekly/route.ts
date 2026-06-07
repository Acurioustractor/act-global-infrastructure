import { NextResponse } from 'next/server'
import {
  getWeeklySnapshot,
  getMonthlySeries,
  getProjectPL,
  getLineItemFacts,
  getOrgLedger,
  getPipelineFacts,
  getSubscriptionRunRate,
  getInvoiceAging,
  getTaggingGaps,
  monthlyBurnFromTrailing,
  projectedCashFlow,
  buildAttentionAlerts,
} from '@/lib/finance/ledger'
import { getFYDates } from '@/lib/finance/dates'

const PROJECTION_WEEKS = 13
const PROJECTION_MONTHS = 3 // 13 weeks ≈ 3 months

export const dynamic = 'force-dynamic'

/**
 * Weekly business-strength report — all sections (snapshot · per-project P&L · people · GST · the
 * "betting on" commitments · opportunities & pile mix). Read-only. All money math comes from
 * lib/finance/ledger.ts (the one ledger), so this page, the other finance surfaces, and the Notion
 * weekly digest can't disagree.
 */
export async function GET() {
  try {
    const now = new Date()
    const { fyStart, fyEnd, monthsElapsed } = getFYDates(now)
    const [snapshot, series, projects, lineItems, orgLedger, pipeline, subs, aging, taggingGaps] = await Promise.all([
      getWeeklySnapshot(now),
      getMonthlySeries({ fyStart, fyEnd }),
      getProjectPL({ fyStart, fyEnd, now }),
      getLineItemFacts({ fyStart, fyEnd }),
      getOrgLedger({ fyStart, fyEnd }),
      getPipelineFacts(now),
      getSubscriptionRunRate(),
      getInvoiceAging(now),
      getTaggingGaps(fyStart),
    ])

    // Slice 5 — commitments / "betting on". Each number comes from a tested function; the route only
    // sums already-derived figures. Per the secured-source decision (2026-06-03) there is intentionally
    // NO single composite cashGap — the secured side (grant tranches) lives in Notion, not Supabase — so
    // the components are surfaced honestly and the page links out to the Grant Tranches DB.
    const payrollMonthlyRunRate = monthlyBurnFromTrailing(lineItems.people.payroll, monthsElapsed)
    const commitments = {
      openBills: orgLedger.billsOutstanding,
      payrollMonthlyRunRate,
      subsMonthlyRunRate: subs.monthly,
      monthlyCommittedRunRate: payrollMonthlyRunRate + subs.monthly,
      cash: snapshot.cash,
      // pipeline weighted: worked headline vs broken-out demand signal (Goods Demand Register)
      weightedPipelineWorked: pipeline.summary.worked.weighted,
      weightedPipelineDemand: pipeline.summary.demand.weighted,
      securedUnbilledFloor: pipeline.securedUnbilledFloor,
      ok: orgLedger.ok && lineItems.ok && subs.ok && pipeline.ok,
    }

    // ~13-week projected cash — the glance HEADLINE. HARD DATA ONLY: cash + collectible AR − real burn.
    // Deliberately excludes open AP (phantom — see the alert) and soft pipeline. arCollectible = the AR
    // we can realistically expect (already-overdue + due within the window).
    const arCollectible = aging.ar.overdue + aging.ar.dueInWindow
    const projection = {
      weeks: PROJECTION_WEEKS,
      projectedCash: projectedCashFlow(snapshot.cash, arCollectible, snapshot.monthlyBurn, PROJECTION_MONTHS),
      cash: snapshot.cash,
      arCollectible,
      burnOverHorizon: Math.round(snapshot.monthlyBurn * PROJECTION_MONTHS),
      ok: aging.ok && snapshot.ok,
    }

    // Attention panel — only trustworthy, genuinely-triggered alerts, critical-first. Empty = all-clear.
    const alerts = buildAttentionAlerts({
      runwayMonths: snapshot.runwayMonths,
      ar: aging.ar,
      ap: aging.ap,
      concentration: pipeline.concentration,
      projects: projects.rows,
      untaggedIncome: taggingGaps.untaggedIncome,
      untaggedIncomeCount: taggingGaps.untaggedIncomeCount,
      oppDateCoveragePct: pipeline.openWithCloseDatePct,
    })

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
      commitments,
      pipeline,
      projection,
      aging,
      alerts,
      fyStart,
      fyEnd,
    })
  } catch (error) {
    console.error('[finance/weekly] GET failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
