import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_project_financials')
      .select('*')

    if (error) throw error

    // Compute summary
    const projects = data || []
    const ecosystem = projects.filter(p => p.tier === 'ecosystem')
    const totalFyExpenses = projects.reduce((sum, p) => sum + Number(p.fy_expenses || 0), 0)
    const totalFyIncome = projects.reduce((sum, p) => sum + Number(p.fy_income || 0), 0)
    const totalPipeline = projects.reduce((sum, p) => sum + Number(p.pipeline_value || 0), 0)
    const totalGrants = projects.reduce((sum, p) => sum + Number(p.grant_funding || 0), 0)

    return NextResponse.json({
      projects: projects.map(p => ({
        code: p.code,
        name: p.name,
        tier: p.tier,
        importance_weight: p.importance_weight,
        total_income: Math.round(Number(p.total_income || 0)),
        total_expenses: Math.round(Number(p.total_expenses || 0)),
        net_position: Math.round(Number(p.net_position || 0)),
        fy_expenses: Math.round(Number(p.fy_expenses || 0)),
        fy_income: Math.round(Number(p.fy_income || 0)),
        transaction_count: Number(p.transaction_count || 0),
        receivable: Math.round(Number(p.receivable || 0)),
        pipeline_value: Math.round(Number(p.pipeline_value || 0)),
        grant_funding: Math.round(Number(p.grant_funding || 0)),
        monthly_subscriptions: Math.round(Number(p.monthly_subscriptions || 0)),
      })),
      summary: {
        total_projects: projects.length,
        ecosystem_count: ecosystem.length,
        fy_expenses: Math.round(totalFyExpenses),
        fy_income: Math.round(totalFyIncome),
        pipeline_value: Math.round(totalPipeline),
        grant_funding: Math.round(totalGrants),
      },
    })
  } catch (e) {
    console.error('Project financials error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch project financials' },
      { status: 500 }
    )
  }
}
