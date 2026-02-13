import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch project financials, R&D expenses, and tagging coverage in parallel
    const [financialsResult, rdResult, coverageResult] = await Promise.all([
      supabase.from('v_project_financials').select('*'),
      supabase.from('v_rd_expenses').select('vendor_name, total, date'),
      supabase.from('xero_transactions').select('id, project_code', { count: 'exact', head: false }),
    ])

    if (financialsResult.error) throw financialsResult.error

    const projects = financialsResult.data || []
    const ecosystem = projects.filter(p => p.tier === 'ecosystem')
    const totalFyExpenses = projects.reduce((sum, p) => sum + Number(p.fy_expenses || 0), 0)
    const totalFyIncome = projects.reduce((sum, p) => sum + Number(p.fy_income || 0), 0)
    const totalPipeline = projects.reduce((sum, p) => sum + Number(p.pipeline_value || 0), 0)
    const totalGrants = projects.reduce((sum, p) => sum + Number(p.grant_funding || 0), 0)

    // R&D summary
    const rdExpenses = rdResult.data || []
    const rdByVendor: Record<string, { count: number; total: number }> = {}
    for (const r of rdExpenses) {
      if (!rdByVendor[r.vendor_name]) rdByVendor[r.vendor_name] = { count: 0, total: 0 }
      rdByVendor[r.vendor_name].count++
      rdByVendor[r.vendor_name].total += Math.abs(Number(r.total || 0))
    }
    const rdTotal = rdExpenses.reduce((s, r) => s + Math.abs(Number(r.total || 0)), 0)

    // Tagging coverage
    const allTx = coverageResult.data || []
    const totalTx = allTx.length
    const taggedTx = allTx.filter(t => t.project_code != null).length

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
      rd: {
        total: Math.round(rdTotal),
        vendor_count: Object.keys(rdByVendor).length,
        transaction_count: rdExpenses.length,
        by_vendor: Object.entries(rdByVendor)
          .map(([name, v]) => ({ name, count: v.count, total: Math.round(v.total) }))
          .sort((a, b) => b.total - a.total),
      },
      coverage: {
        total: totalTx,
        tagged: taggedTx,
        untagged: totalTx - taggedTx,
        pct: totalTx > 0 ? Math.round((taggedTx / totalTx) * 1000) / 10 : 0,
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
