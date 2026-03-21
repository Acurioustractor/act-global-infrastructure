import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const fyStart = '2025-07-01'
    const now = new Date()

    // Parallel fetch all data sources
    const [
      strategicResult,
      objectivesResult,
      pipelineResult,
      financialsResult,
      receivablesResult,
      payablesResult,
      scenariosResult,
      budgetsResult,
      grantTrackingResult,
    ] = await Promise.all([
      // Project strategic summaries via the view
      supabase
        .from('v_project_strategic_summary')
        .select('*')
        .limit(200),

      // All strategic objectives
      supabase
        .from('strategic_objectives')
        .select('*')
        .order('objective_type')
        .limit(200),

      // Active pipeline opportunities (not lost/expired/identified)
      supabase
        .from('opportunities_unified')
        .select('id, title, stage, probability, value_mid, project_codes, expected_close, source_system, deadline')
        .not('stage', 'in', '(lost,expired,identified)')
        .limit(500),

      // FY26 monthly financials totals
      supabase
        .from('project_monthly_financials')
        .select('project_code, month, revenue, expenses, net')
        .gte('month', fyStart)
        .limit(1000),

      // Outstanding receivables
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_due, date, due_date, status, project_code')
        .eq('type', 'ACCREC')
        .in('status', ['AUTHORISED', 'SENT'])
        .limit(500),

      // Outstanding payables
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_due, date, due_date, status, project_code')
        .eq('type', 'ACCPAY')
        .in('status', ['AUTHORISED', 'SENT'])
        .limit(500),

      // Revenue scenarios
      supabase
        .from('revenue_scenarios')
        .select('id, name, description, assumptions, annual_targets')
        .limit(10),

      // FY26 budgets (row-per-type: budget_type = expense/revenue/grant)
      supabase
        .from('project_budgets')
        .select('project_code, fy_year, budget_type, budget_amount')
        .eq('fy_year', 'FY26')
        .limit(500),

      // Grant financial tracking (links grants → Xero invoices)
      supabase
        .from('grant_financial_tracking')
        .select('id, opportunity_id, project_code, grant_name, monetary_value, status, xero_invoice_id, xero_invoice_number, approved_date, received_date, acquittal_due_date, acquittal_status, notes')
        .limit(200),
    ])

    // ── Projects ──────────────────────────────────────────────
    const projects = (strategicResult.data || []).map((p) => ({
      code: p.code,
      name: p.name,
      tier: p.tier,
      status: p.project_status,
      category: p.category,
      revenueModel: p.revenue_model,
      timeToRevenue: p.time_to_revenue,
      productReadiness: p.product_readiness_pct,
      rdEligible: p.rd_eligible,
      rdCategory: p.rd_category,
      tamAnnual: Number(p.tam_annual || 0),
      samAnnual: Number(p.sam_annual || 0),
      oneLiner: p.one_liner,
      biggestBlocker: p.biggest_blocker,
      fastestWin: p.fastest_win,
      independenceScore: p.independence_score,
      contributesTo: p.contributes_to || [],
      dependsOn: p.depends_on || [],
      feedsInto: p.feeds_into || [],
      budget: Number(p.annual_budget || 0),
      revenueTarget: Number(p.annual_revenue_target || 0),
      fyRevenue: Number(p.fy_revenue || 0),
      fyExpenses: Number(p.fy_expenses || 0),
      fyNet: Number(p.fy_net || 0),
      pipelineCount: Number(p.pipeline_count || 0),
      pipelineWeighted: Number(p.pipeline_weighted || 0),
    }))

    // ── Objectives ────────────────────────────────────────────
    const objectives = (objectivesResult.data || []).map((o) => ({
      id: o.id,
      title: o.title,
      type: o.objective_type,
      parentId: o.parent_id,
      projectCodes: o.project_codes || [],
      revenueTarget: Number(o.revenue_target || 0),
      status: o.status,
      progressPct: o.progress_pct || 0,
      targetQuarter: o.target_quarter,
      targetDate: o.target_date,
      owner: o.owner,
      flywheelSegment: o.flywheel_segment,
      keyResults: o.key_results || [],
    }))

    // ── Financial Position ────────────────────────────────────
    const monthlyData = financialsResult.data || []
    let fyRevenue = 0
    let fyExpenses = 0
    const monthlyTotals = new Map<string, { revenue: number; expenses: number }>()
    for (const row of monthlyData) {
      fyRevenue += Number(row.revenue || 0)
      fyExpenses += Number(row.expenses || 0)
      const m = row.month
      const entry = monthlyTotals.get(m) || { revenue: 0, expenses: 0 }
      entry.revenue += Number(row.revenue || 0)
      entry.expenses += Number(row.expenses || 0)
      monthlyTotals.set(m, entry)
    }

    const completedMonths = [...monthlyTotals.entries()]
      .filter(([m]) => m < now.toISOString().slice(0, 7) + '-01')
      .sort((a, b) => a[0].localeCompare(b[0]))
    const avgMonthlyBurn = completedMonths.length > 0
      ? completedMonths.reduce((sum, [, v]) => sum + Math.abs(v.expenses), 0) / completedMonths.length
      : 0

    const receivables = (receivablesResult.data || [])
    const payables = (payablesResult.data || [])
    const totalReceivables = receivables.reduce((s, r) => s + Number(r.amount_due || 0), 0)
    const totalPayables = payables.reduce((s, p) => s + Math.abs(Number(p.amount_due || 0)), 0)

    // Overdue receivables detail
    const overdueReceivables = receivables
      .filter((r) => new Date(r.due_date) < now)
      .map((r) => ({
        contact: r.contact_name,
        amount: Number(r.amount_due || 0),
        dueDate: r.due_date,
        daysOverdue: Math.floor((now.getTime() - new Date(r.due_date).getTime()) / 86400000),
        projectCode: r.project_code,
      }))
      .sort((a, b) => b.amount - a.amount)

    const cashPosition = fyRevenue - fyExpenses
    const runway = avgMonthlyBurn > 0
      ? Math.round(((cashPosition + totalReceivables) / avgMonthlyBurn) * 10) / 10
      : 0

    // ── Pipeline Heat ─────────────────────────────────────────
    const pipelineData = pipelineResult.data || []
    const ninetyDaysOut = new Date(now.getTime() + 90 * 86400000)

    const hotOpportunities = pipelineData
      .filter((o) => {
        const deadline = o.deadline || o.expected_close
        return deadline && new Date(deadline) <= ninetyDaysOut
      })
      .map((o) => {
        const deadline = o.deadline || o.expected_close
        const deadlineDate = new Date(deadline)
        const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000)
        const weighted = Number(o.value_mid || 0) * (Number(o.probability || 0) / 100)
        return {
          id: o.id,
          title: o.title,
          stage: o.stage,
          value: Number(o.value_mid || 0),
          probability: Number(o.probability || 0),
          weighted,
          projectCodes: o.project_codes || [],
          deadline,
          daysUntil,
          source: o.source_system,
        }
      })
      .sort((a, b) => b.weighted - a.weighted)

    const totalPipelineWeighted = pipelineData.reduce(
      (s, o) => s + Number(o.value_mid || 0) * (Number(o.probability || 0) / 100),
      0,
    )

    // ── Scenarios ─────────────────────────────────────────────
    const scenariosData = scenariosResult.data || []
    const scenarios: Record<string, { fy26: number; fy27: number; fy28: number; description: string }> = {}
    for (const s of scenariosData) {
      const key = (s.name || '').toLowerCase()
      const targets = s.annual_targets || {}
      scenarios[key] = {
        fy26: Number(targets['2026'] || 0),
        fy27: Number(targets['2027'] || 0),
        fy28: Number(targets['2028'] || 0),
        description: s.description || '',
      }
    }

    // ── Budget totals (row-per-type: expense/revenue/grant) ──
    const budgets = budgetsResult.data || []
    const totalBudget = budgets
      .filter((b) => b.budget_type === 'expense')
      .reduce((s, b) => s + Number(b.budget_amount || 0), 0)
    const totalRevenueTarget = budgets
      .filter((b) => b.budget_type === 'revenue' || b.budget_type === 'grant')
      .reduce((s, b) => s + Number(b.budget_amount || 0), 0)

    // ══════════════════════════════════════════════════════════
    // 5 NEEDLE MOVERS
    // Rank by (dollar_value × time_urgency) / effort
    // ══════════════════════════════════════════════════════════
    const needleMovers: Array<{
      rank: number
      title: string
      dollarValue: number
      deadline: string | null
      daysUntil: number | null
      actionType: string
      projectCodes: string[]
      why: string
      urgency: 'critical' | 'urgent' | 'important'
    }> = []

    // 1. R&D registration deadline ($407K at stake)
    const rdDeadline = '2026-04-30'
    const rdDaysUntil = Math.ceil((new Date(rdDeadline).getTime() - now.getTime()) / 86400000)
    needleMovers.push({
      rank: 0,
      title: 'R&D Tax Incentive Registration',
      dollarValue: 407000,
      deadline: rdDeadline,
      daysUntil: rdDaysUntil,
      actionType: 'Register',
      projectCodes: ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'],
      why: '43.5% refundable offset on eligible R&D spend — biggest single cash injection available',
      urgency: rdDaysUntil <= 30 ? 'critical' : rdDaysUntil <= 60 ? 'urgent' : 'important',
    })

    // 2. Overdue receivables (money already owed)
    if (overdueReceivables.length > 0) {
      const totalOverdue = overdueReceivables.reduce((s, r) => s + r.amount, 0)
      needleMovers.push({
        rank: 0,
        title: `Chase ${overdueReceivables.length} overdue invoices`,
        dollarValue: totalOverdue,
        deadline: null,
        daysUntil: 0,
        actionType: 'Chase',
        projectCodes: [...new Set(overdueReceivables.map((r) => r.projectCode).filter(Boolean))],
        why: `${overdueReceivables.length} invoices overdue — oldest ${overdueReceivables[0]?.daysOverdue || 0} days. Cash in hand, just needs follow-up`,
        urgency: 'critical',
      })
    }

    // 3. Top pipeline opportunities with deadlines
    for (const opp of hotOpportunities.slice(0, 3)) {
      if (opp.weighted >= 10000) {
        needleMovers.push({
          rank: 0,
          title: opp.title,
          dollarValue: opp.weighted,
          deadline: opp.deadline,
          daysUntil: opp.daysUntil,
          actionType: 'Apply',
          projectCodes: opp.projectCodes,
          why: `${opp.stage} stage, ${opp.probability}% probability — ${opp.daysUntil} days until deadline`,
          urgency: opp.daysUntil <= 7 ? 'critical' : opp.daysUntil <= 30 ? 'urgent' : 'important',
        })
      }
    }

    // 4. Products with readiness ≥ 80% and no revenue
    const launchReady = projects.filter(
      (p) => (p.productReadiness || 0) >= 80 && p.fyRevenue <= 0 && p.revenueModel !== 'internal',
    )
    for (const p of launchReady) {
      needleMovers.push({
        rank: 0,
        title: `Launch ${p.name} (${p.productReadiness}% ready)`,
        dollarValue: p.samAnnual > 0 ? p.samAnnual * 0.01 : 50000, // 1% of SAM as conservative first-year
        deadline: null,
        daysUntil: null,
        actionType: 'Launch',
        projectCodes: [p.code],
        why: p.oneLiner || `${p.productReadiness}% product readiness, ${p.revenueModel} model — needs billing to generate revenue`,
        urgency: 'urgent',
      })
    }

    // 5. At-risk or blocked objectives
    const atRiskObjectives = objectives.filter(
      (o) => (o.status === 'at_risk' || o.status === 'blocked') && o.revenueTarget > 0,
    )
    for (const o of atRiskObjectives) {
      needleMovers.push({
        rank: 0,
        title: o.title,
        dollarValue: o.revenueTarget,
        deadline: o.targetDate,
        daysUntil: o.targetDate
          ? Math.ceil((new Date(o.targetDate).getTime() - now.getTime()) / 86400000)
          : null,
        actionType: o.status === 'blocked' ? 'Unblock' : 'Accelerate',
        projectCodes: o.projectCodes,
        why: `${o.status} — ${o.type.replace('_', ' ')} with $${(o.revenueTarget / 1000).toFixed(0)}K at stake`,
        urgency: 'critical',
      })
    }

    // Sort by urgency score: (dollarValue × timeUrgency)
    needleMovers.sort((a, b) => {
      const urgencyMultiplier = { critical: 3, urgent: 2, important: 1 }
      const scoreA = a.dollarValue * (urgencyMultiplier[a.urgency] || 1)
      const scoreB = b.dollarValue * (urgencyMultiplier[b.urgency] || 1)
      return scoreB - scoreA
    })

    // Assign ranks and take top 5
    const top5 = needleMovers.slice(0, 5).map((nm, i) => ({ ...nm, rank: i + 1 }))

    // ── Flywheel segments ─────────────────────────────────────
    const flywheelSegments = [
      'community_impact',
      'evidence_stories',
      'funding',
      'platform_dev',
      'revenue',
      'rd_refund',
    ].map((segment) => ({
      segment,
      projects: projects
        .filter((p) => (p.contributesTo || []).includes(segment.replace('funding', 'funding_leverage')))
        .map((p) => p.code),
      objectiveCount: objectives.filter((o) => o.flywheelSegment === segment).length,
    }))

    // ── Synergy Map ───────────────────────────────────────────
    const synergyLinks: Array<{ from: string; to: string; type: string }> = []
    for (const p of projects) {
      if (p.feedsInto) {
        for (const target of p.feedsInto) {
          synergyLinks.push({ from: p.code, to: target, type: 'feeds_data' })
        }
      }
      if (p.dependsOn) {
        for (const dep of p.dependsOn) {
          synergyLinks.push({ from: dep, to: p.code, type: 'dependency' })
        }
      }
    }

    // ── Grant Tracking ──────────────────────────────────────
    const grantTracking = (grantTrackingResult.data || []).map((g) => ({
      id: g.id,
      opportunityId: g.opportunity_id,
      projectCode: g.project_code,
      grantName: g.grant_name,
      value: Number(g.monetary_value || 0),
      status: g.status,
      xeroInvoiceId: g.xero_invoice_id,
      xeroInvoiceNumber: g.xero_invoice_number,
      approvedDate: g.approved_date,
      receivedDate: g.received_date,
      acquittalDueDate: g.acquittal_due_date,
      acquittalStatus: g.acquittal_status,
      notes: g.notes,
      linked: !!g.xero_invoice_id,
    }))

    const grantsSummary = {
      total: grantTracking.length,
      linked: grantTracking.filter((g) => g.linked).length,
      unlinked: grantTracking.filter((g) => !g.linked).length,
      totalValue: grantTracking.reduce((s, g) => s + g.value, 0),
      linkedValue: grantTracking.filter((g) => g.linked).reduce((s, g) => s + g.value, 0),
      grants: grantTracking,
    }

    return NextResponse.json({
      needleMovers: top5,
      projects,
      objectives,
      financialPosition: {
        fyRevenue,
        fyExpenses,
        fyNet: cashPosition,
        totalReceivables,
        totalPayables,
        overdueReceivables: overdueReceivables.slice(0, 10),
        monthlyBurn: avgMonthlyBurn,
        runway,
        totalBudget,
        totalRevenueTarget,
        budgetUtilization: totalBudget > 0 ? Math.round((fyExpenses / totalBudget) * 100) : 0,
      },
      pipeline: {
        totalWeighted: totalPipelineWeighted,
        totalCount: pipelineData.length,
        hotOpportunities: hotOpportunities.slice(0, 10),
      },
      grantTracking: grantsSummary,
      scenarios,
      flywheel: flywheelSegments,
      synergy: synergyLinks,
      fy: 'FY26',
      generatedAt: now.toISOString(),
    })
  } catch (error) {
    console.error('Error in strategy API:', error)
    return NextResponse.json({ error: 'Failed to load strategy data' }, { status: 500 })
  }
}
