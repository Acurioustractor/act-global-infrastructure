import { NextResponse } from 'next/server'
import { getFYDates } from '@/lib/finance/dates'
import { execSql } from '@/lib/finance/query'

export const dynamic = 'force-dynamic'

const OVERHEAD_CODES = new Set(['ACT-HQ', 'ACT-CORE'])

type MonthRow = { month: string; income: number; spend: number }
type ProjectRow = { project_code: string; income: number; spend: number; tx_count: number }
type TotalsRow = { fy: string; income: number; spend: number }
type TypeRow = { income_type: string; total: number; count: number }
type OppRow = { id: string; title: string; value_mid: number; contact_name: string; project_codes: string[] }
type PayerRow = { contact_name: string; total: number; tx_count: number }

export async function GET() {
  try {
    const { fyStart, prevFyStart, monthsElapsed } = getFYDates()

    const [monthly, byProjectRows, totalsRows, byTypeRows, wonOppsRows, topPayersRows] = await Promise.all([
      execSql<MonthRow>('monthly-income', `
        SELECT date_trunc('month', date)::date as month,
               coalesce(sum(total) FILTER (WHERE type IN ('RECEIVE','RECEIVE-TRANSFER')), 0) as income,
               coalesce(sum(total) FILTER (WHERE type IN ('SPEND','SPEND-TRANSFER')), 0) as spend
        FROM xero_transactions WHERE date >= '${fyStart}'
        GROUP BY 1 ORDER BY 1`),

      execSql<ProjectRow>('income-by-project', `
        SELECT project_code,
               coalesce(sum(total) FILTER (WHERE type IN ('RECEIVE','RECEIVE-TRANSFER')), 0) as income,
               coalesce(sum(total) FILTER (WHERE type IN ('SPEND','SPEND-TRANSFER')), 0) as spend,
               count(*) as tx_count
        FROM xero_transactions WHERE date >= '${fyStart}' AND project_code IS NOT NULL
        GROUP BY 1 ORDER BY income DESC NULLS LAST`),

      execSql<TotalsRow>('fy-totals', `
        SELECT CASE WHEN date >= '${fyStart}' THEN 'current' ELSE 'previous' END as fy,
               coalesce(sum(total) FILTER (WHERE type IN ('RECEIVE','RECEIVE-TRANSFER')), 0) as income,
               coalesce(sum(total) FILTER (WHERE type IN ('SPEND','SPEND-TRANSFER')), 0) as spend
        FROM xero_transactions WHERE date >= '${prevFyStart}'
        GROUP BY 1`),

      execSql<TypeRow>('income-by-type', `
        SELECT COALESCE(income_type, 'unclassified') as income_type,
               sum(total) as total, count(*) as count
        FROM xero_invoices
        WHERE type = 'ACCREC' AND status IN ('PAID','AUTHORISED')
          AND date >= '${fyStart}'
        GROUP BY 1 ORDER BY total DESC`),

      execSql<OppRow>('won-opps', `
        SELECT id, title, value_mid, contact_name, project_codes
        FROM opportunities_unified
        WHERE stage IN ('realized','won')
          AND updated_at >= '${fyStart}'`),

      execSql<PayerRow>('top-payers', `
        SELECT contact_name, sum(total) as total, count(*) as tx_count
        FROM xero_transactions
        WHERE type IN ('RECEIVE','RECEIVE-TRANSFER')
          AND date >= '${fyStart}' AND contact_name IS NOT NULL
        GROUP BY 1 ORDER BY total DESC LIMIT 15`),
    ])

    // Process results
    const processedMonthly = monthly.map(r => ({
      month: r.month,
      income: Number(r.income),
      spend: Number(r.spend),
    }))

    const byProject = byProjectRows.map(r => ({
      code: r.project_code,
      income: Number(r.income),
      spend: Number(r.spend),
      txCount: Number(r.tx_count),
    }))

    const currentRow = totalsRows.find(r => r.fy === 'current')
    const previousRow = totalsRows.find(r => r.fy === 'previous')
    const currentIncome = Number(currentRow?.income || 0)
    const currentSpend = Number(currentRow?.spend || 0)
    const previousIncome = Number(previousRow?.income || 0)
    const previousSpend = Number(previousRow?.spend || 0)

    const byType = byTypeRows.map(r => ({
      type: r.income_type,
      total: Number(r.total),
      count: Number(r.count),
    }))

    const wonOpps = wonOppsRows.map(r => ({
      id: r.id,
      title: r.title,
      value: Number(r.value_mid || 0),
      contact: r.contact_name || '',
      projects: r.project_codes || [],
    }))

    const topPayers = topPayersRows.map(r => ({
      name: r.contact_name,
      total: Number(r.total),
      count: Number(r.tx_count),
    }))

    // Computed metrics
    const hqIncome = byProject
      .filter(p => OVERHEAD_CODES.has(p.code))
      .reduce((sum, p) => sum + p.income, 0)
    const hqConcentrationPct = currentIncome > 0 ? Math.round((hqIncome / currentIncome) * 100) : 0

    const grantTypeTotal = byType
      .filter(t => t.type.toLowerCase().includes('grant'))
      .reduce((s, t) => s + t.total, 0)
    const grantDependencyPct = currentIncome > 0 ? Math.round((grantTypeTotal / currentIncome) * 100) : 0

    const monthlyAvg = processedMonthly.length > 0
      ? Math.round(processedMonthly.reduce((s, m) => s + m.income, 0) / processedMonthly.length)
      : 0

    const annualizedCurrent = (currentIncome / monthsElapsed) * 12
    const yoyGrowthPct = previousIncome > 0
      ? Math.round(((annualizedCurrent - previousIncome) / previousIncome) * 100)
      : 0

    const peakMonth = processedMonthly.reduce(
      (best, m) => m.income > best.income ? m : best,
      { month: '', income: 0, spend: 0 }
    )

    const deadMonths = processedMonthly
      .filter(m => m.income === 0)
      .map(m => m.month)

    const wonTotal = wonOpps.reduce((s, o) => s + o.value, 0)
    const pipelineCashGap = currentIncome - wonTotal

    return NextResponse.json({
      monthly: processedMonthly,
      byProject,
      totals: { currentIncome, currentSpend, previousIncome, previousSpend },
      byType,
      wonOpps,
      topPayers,
      computed: {
        hqConcentrationPct,
        grantDependencyPct,
        monthlyAvg,
        yoyGrowthPct,
        peakMonth,
        deadMonths,
        pipelineCashGap,
      },
    })
  } catch (e) {
    console.error('Revenue reality error:', e)
    return NextResponse.json({ error: 'Failed to load revenue reality' }, { status: 500 })
  }
}
