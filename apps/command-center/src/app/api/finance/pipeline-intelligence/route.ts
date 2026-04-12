import { NextResponse } from 'next/server'
import { getFYDates } from '@/lib/finance/dates'
import { execSql } from '@/lib/finance/query'

export const dynamic = 'force-dynamic'

const OVERHEAD_CODES = new Set(['ACT-HQ', 'ACT-CORE'])

type TaggingRow = { total: number; tagged: number }
type StaleOppRow = { id: string; title: string; stage: string; opportunity_type: string; value_mid: number; project_codes: string[]; updated_at: string }
type UntaggedRow = { count: number; total_value: number }
type ProjectPipelineRow = { code: string; name: string; tier: string; opp_count: number; pipeline_value: number; weighted_value: number; won_count: number; won_value: number }
type SpendRow = { project_code: string; spend: number }
type WonRow = { title: string; value_mid: number; project_codes: string[]; updated_at: string }
type CashRow = { total_outflow: number; total_inflow: number; tx_count: number }
type RevenueRow = { project_code: string; income: number }
type MonthlyIncomeRow = { month: string; income: number }
type PrevFyRow = { income: number }

export async function GET() {
  try {
    const { fyStart, prevFyStart, monthsElapsed } = getFYDates()

    const [
      taggingRows,
      staleOpps,
      untaggedRows,
      projectPipelineRows,
      spendRows,
      recentWins,
      cashRows,
      revenueByProject,
      monthlyIncomeRows,
      prevFyRows,
    ] = await Promise.all([
      execSql<TaggingRow>('tagging-coverage', `
        SELECT count(*) as total,
               count(*) FILTER (WHERE project_code IS NOT NULL) as tagged
        FROM xero_transactions WHERE date >= '${fyStart}' AND total IS NOT NULL`),

      execSql<StaleOppRow>('stale-opportunities', `
        SELECT id, title, stage, opportunity_type, value_mid,
               project_codes, updated_at
        FROM opportunities_unified
        WHERE stage IN ('researching','pursuing')
        AND updated_at < now() - interval '60 days'
        ORDER BY value_mid DESC NULLS LAST LIMIT 10`),

      execSql<UntaggedRow>('untagged-opps', `
        SELECT count(*) as count, sum(value_mid) as total_value
        FROM opportunities_unified
        WHERE stage IN ('researching','pursuing','submitted','shortlisted','realized','won')
        AND (project_codes IS NULL OR array_length(project_codes, 1) IS NULL)`),

      execSql<ProjectPipelineRow>('project-pipeline', `
        SELECT p.code, p.name, p.tier,
               count(o.*) as opp_count,
               coalesce(sum(o.value_mid), 0) as pipeline_value,
               coalesce(sum(o.value_mid * coalesce(o.probability, 10) / 100.0), 0) as weighted_value,
               count(*) FILTER (WHERE o.stage IN ('realized','won')) as won_count,
               coalesce(sum(o.value_mid) FILTER (WHERE o.stage IN ('realized','won')), 0) as won_value
        FROM projects p
        LEFT JOIN opportunities_unified o ON p.code = ANY(o.project_codes)
          AND o.stage IN ('researching','pursuing','submitted','shortlisted','realized','won')
        WHERE p.status IN ('active','ideation')
        GROUP BY p.code, p.name, p.tier
        HAVING count(o.*) > 0
        ORDER BY coalesce(sum(o.value_mid), 0) DESC`),

      execSql<SpendRow>('xero-spend-by-project', `
        SELECT project_code, sum(total) as spend
        FROM xero_transactions
        WHERE date >= '${fyStart}' AND type IN ('SPEND','SPEND-TRANSFER') AND project_code IS NOT NULL
        GROUP BY project_code ORDER BY spend DESC`),

      execSql<WonRow>('recently-won', `
        SELECT title, value_mid, project_codes, updated_at
        FROM opportunities_unified
        WHERE stage IN ('realized','won')
        AND updated_at >= now() - interval '90 days'
        ORDER BY value_mid DESC LIMIT 5`),

      execSql<CashRow>('cash-position', `
        SELECT sum(total) FILTER (WHERE type IN ('SPEND','SPEND-TRANSFER')) as total_outflow,
               sum(total) FILTER (WHERE type IN ('RECEIVE','RECEIVE-TRANSFER')) as total_inflow,
               count(*) as tx_count
        FROM xero_transactions
        WHERE date >= '${fyStart}'`),

      execSql<RevenueRow>('revenue-by-project', `
        SELECT project_code,
               coalesce(sum(total) FILTER (WHERE type IN ('RECEIVE','RECEIVE-TRANSFER')), 0) as income
        FROM xero_transactions WHERE date >= '${fyStart}' AND project_code IS NOT NULL
        GROUP BY 1 ORDER BY income DESC`),

      execSql<MonthlyIncomeRow>('monthly-income', `
        SELECT date_trunc('month', date)::date as month,
               coalesce(sum(total) FILTER (WHERE type IN ('RECEIVE','RECEIVE-TRANSFER')), 0) as income
        FROM xero_transactions WHERE date >= '${fyStart}'
        GROUP BY 1 ORDER BY 1`),

      execSql<PrevFyRow>('prev-fy-income', `
        SELECT coalesce(sum(total) FILTER (WHERE type IN ('RECEIVE','RECEIVE-TRANSFER')), 0) as income
        FROM xero_transactions WHERE date >= '${prevFyStart}' AND date < '${fyStart}'`),
    ])

    // Process tagging
    const tagging = taggingRows[0] || { total: 0, tagged: 0 }
    const tagPct = Number(tagging.total) > 0 ? Math.round((Number(tagging.tagged) / Number(tagging.total)) * 100) : 0

    // Process project pipeline
    const projectPipeline = projectPipelineRows.map(p => ({
      code: p.code,
      name: p.name,
      tier: p.tier,
      oppCount: Number(p.opp_count),
      pipelineValue: Number(p.pipeline_value),
      weightedValue: Number(p.weighted_value),
      wonCount: Number(p.won_count),
      wonValue: Number(p.won_value),
    }))

    // Concentration risk
    const totalPipeline = projectPipeline.reduce((s, p) => s + p.pipelineValue, 0)
    const topProject = projectPipeline[0]
    const concentrationPct = totalPipeline > 0 && topProject
      ? Math.round((topProject.pipelineValue / totalPipeline) * 100)
      : 0

    // R&D eligible projects
    const rdProjects = ['ACT-EL', 'ACT-JH', 'ACT-GD', 'ACT-IN', 'ACT-FM']
    const rdSpend = spendRows
      .filter(s => rdProjects.includes(s.project_code))
      .reduce((sum, s) => sum + Number(s.spend), 0)
    const rdRefund = Math.round(rdSpend * 0.435)

    // Cash flow
    const cashFlow = cashRows[0] || { total_outflow: 0, total_inflow: 0 }
    const monthlyBurn = Number(cashFlow.total_outflow || 0) / monthsElapsed
    const monthlyIncome = Number(cashFlow.total_inflow || 0) / monthsElapsed

    // Untagged opps
    const untaggedOpps = untaggedRows[0] || { count: 0, total_value: 0 }

    // Generate insights
    const insights: { type: string; icon: string; title: string; detail: string; priority: number }[] = []

    if (concentrationPct >= 50 && topProject) {
      insights.push({
        type: 'risk',
        icon: '⚠️',
        title: `${concentrationPct}% pipeline concentration in ${topProject.name}`,
        detail: `$${Math.round(topProject.pipelineValue / 1000)}K of $${Math.round(totalPipeline / 1000)}K is one project. Diversify funding sources.`,
        priority: 1,
      })
    }

    if (rdSpend > 0) {
      insights.push({
        type: 'opportunity',
        icon: '🔬',
        title: `R&D Tax Incentive: $${Math.round(rdRefund / 1000)}K potential refund`,
        detail: `$${Math.round(rdSpend / 1000)}K eligible R&D spend across ${rdProjects.length} projects × 43.5% = $${Math.round(rdRefund / 1000)}K from ATO.`,
        priority: 2,
      })
    }

    if (monthlyBurn > 0) {
      const netMonthly = monthlyIncome - monthlyBurn
      if (netMonthly > 0) {
        insights.push({
          type: 'positive',
          icon: '📈',
          title: `Cash flow positive: +$${Math.round(netMonthly / 1000)}K/month`,
          detail: `Income $${Math.round(monthlyIncome / 1000)}K/mo vs burn $${Math.round(monthlyBurn / 1000)}K/mo. Safe to invest in growth.`,
          priority: 3,
        })
      } else {
        insights.push({
          type: 'risk',
          icon: '🔥',
          title: `Cash flow negative: -$${Math.round(Math.abs(netMonthly) / 1000)}K/month`,
          detail: `Burn $${Math.round(monthlyBurn / 1000)}K/mo exceeds income $${Math.round(monthlyIncome / 1000)}K/mo. Focus on conversion.`,
          priority: 1,
        })
      }
    }

    if (Number(untaggedOpps.count) > 5) {
      insights.push({
        type: 'action',
        icon: '🏷️',
        title: `${untaggedOpps.count} opportunities missing project tags`,
        detail: `$${Math.round(Number(untaggedOpps.total_value || 0) / 1000)}K in pipeline can't be tracked to projects. Tag them.`,
        priority: 2,
      })
    }

    if (staleOpps.length > 0) {
      const staleValue = staleOpps.reduce((s, o) => s + (Number(o.value_mid) || 0), 0)
      insights.push({
        type: 'action',
        icon: '⏰',
        title: `${staleOpps.length} stale opportunities (60+ days without update)`,
        detail: `$${Math.round(staleValue / 1000)}K stuck in pipeline. Review and update or close.`,
        priority: 2,
      })
    }

    if (recentWins.length > 0) {
      const wonTotal = recentWins.reduce((s, w) => s + (Number(w.value_mid) || 0), 0)
      insights.push({
        type: 'positive',
        icon: '🏆',
        title: `${recentWins.length} wins in last 90 days ($${Math.round(wonTotal / 1000)}K)`,
        detail: recentWins.map(w => w.title).join(', '),
        priority: 3,
      })
    }

    // HQ concentration insight
    const totalRevenue = revenueByProject.reduce((s, r) => s + Number(r.income), 0)
    const hqRevenue = revenueByProject
      .filter(r => OVERHEAD_CODES.has(r.project_code))
      .reduce((sum, row) => sum + Number(row.income || 0), 0)
    const hqPct = totalRevenue > 0 ? Math.round((hqRevenue / totalRevenue) * 100) : 0
    if (hqPct > 80) {
      insights.push({
        type: 'risk',
        icon: '🏢',
        title: `${hqPct}% of income tagged to studio / ops`,
        detail: `$${Math.round(hqRevenue / 1000)}K of $${Math.round(totalRevenue / 1000)}K is still landing on ACT-CORE / legacy ACT-HQ instead of project-specific codes. Re-tag to improve project-level visibility.`,
        priority: 1,
      })
    }

    // Dead months insight
    const deadMonths = monthlyIncomeRows.filter(m => Number(m.income) === 0)
    if (deadMonths.length > 0) {
      const deadLabels = deadMonths.map(m =>
        new Date(m.month + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short' })
      ).join(', ')
      insights.push({
        type: 'risk',
        icon: '📉',
        title: `${deadMonths.length} month${deadMonths.length > 1 ? 's' : ''} with zero income`,
        detail: `${deadLabels} — feast-or-famine cash flow. Build recurring revenue or stagger grant milestones.`,
        priority: 1,
      })
    }

    // YoY growth insight
    const prevFyIncome = Number(prevFyRows[0]?.income || 0)
    if (prevFyIncome > 0 && totalRevenue > 0) {
      const annualized = (totalRevenue / monthsElapsed) * 12
      const yoyPct = Math.round(((annualized - prevFyIncome) / prevFyIncome) * 100)
      if (yoyPct > 10) {
        insights.push({
          type: 'positive',
          icon: '🚀',
          title: `Revenue tracking ${yoyPct}% above FY25`,
          detail: `Annualized $${Math.round(annualized / 1000)}K vs FY25 $${Math.round(prevFyIncome / 1000)}K. Momentum is strong.`,
          priority: 3,
        })
      } else if (yoyPct < -10) {
        insights.push({
          type: 'risk',
          icon: '📉',
          title: `Revenue tracking ${Math.abs(yoyPct)}% below FY25`,
          detail: `Annualized $${Math.round(annualized / 1000)}K vs FY25 $${Math.round(prevFyIncome / 1000)}K. Pipeline conversion needs attention.`,
          priority: 1,
        })
      }
    }

    // Pipeline weighted value as founder draw signal
    const totalWeighted = projectPipeline.reduce((s, p) => s + p.weightedValue, 0)
    if (totalWeighted > 500000) {
      insights.push({
        type: 'opportunity',
        icon: '💰',
        title: `Weighted pipeline: $${Math.round(totalWeighted / 1000)}K`,
        detail: `Strong weighted pipeline. Consider founder draw based on probability-adjusted revenue.`,
        priority: 3,
      })
    }

    insights.sort((a, b) => a.priority - b.priority)

    return NextResponse.json({
      coverage: {
        transactions: { total: Number(tagging.total), tagged: Number(tagging.tagged), pct: tagPct },
        opportunities: {
          untagged: Number(untaggedOpps.count),
          untaggedValue: Number(untaggedOpps.total_value || 0),
        },
        staleCount: staleOpps.length,
      },
      projectPipeline,
      cashFlow: {
        monthlyBurn: Math.round(monthlyBurn),
        monthlyIncome: Math.round(monthlyIncome),
        netMonthly: Math.round(monthlyIncome - monthlyBurn),
      },
      rd: {
        eligibleSpend: Math.round(rdSpend),
        potentialRefund: rdRefund,
        projects: rdProjects,
      },
      insights,
      staleOpps: staleOpps.map(o => ({
        id: o.id,
        title: o.title,
        stage: o.stage,
        value: Number(o.value_mid || 0),
        daysSinceUpdate: Math.round((Date.now() - new Date(o.updated_at).getTime()) / 86400000),
      })),
    })
  } catch (e) {
    console.error('Pipeline intelligence error:', e)
    return NextResponse.json({ error: 'Failed to load intelligence' }, { status: 500 })
  }
}
