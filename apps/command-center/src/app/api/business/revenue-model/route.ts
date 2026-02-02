import { NextResponse } from 'next/server'

/**
 * GET /api/business/revenue-model
 *
 * Returns revenue model configuration and gap analysis.
 * Config data sourced from founder interview + entity-structure.md.
 * Current revenue will eventually come from Xero.
 */
export async function GET() {
  const founderTarget = 120000
  const founders = 2
  const estimatedOperating = 60000
  const estimatedProjectBudgets = 80000
  const estimatedReinvestment = 40000

  const founderDistributions = founderTarget * founders
  const requiredRevenue = founderDistributions + estimatedOperating + estimatedProjectBudgets + estimatedReinvestment

  // TODO: Pull current revenue from Xero once Pty Ltd is connected
  const annualRevenue = 0
  const monthlyRevenue = 0

  const gap = Math.max(0, requiredRevenue - annualRevenue)
  const gapPercentage = requiredRevenue > 0
    ? Math.round((gap / requiredRevenue) * 100)
    : 100

  const data = {
    config: {
      founderTarget,
      founders,
      estimatedOperating,
      estimatedProjectBudgets,
      estimatedReinvestment,
      notes: 'Revenue targets based on founder interview (31 Jan 2026). Current revenue placeholder — connect Xero for live data.',
    },
    breakdown: {
      founderDistributions,
      operating: estimatedOperating,
      projectBudgets: estimatedProjectBudgets,
      reinvestment: estimatedReinvestment,
      requiredRevenue,
    },
    current: {
      annualRevenue,
      monthlyRevenue,
      source: 'placeholder',
    },
    gap,
    gapPercentage,
  }

  return NextResponse.json(data)
}
