import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const fyStart = '2025-07-01'

    // 3 parallel queries: projects, pipeline, receivables
    const [projectsResult, pipelineResult, receivablesResult] = await Promise.all([
      // --- Projects with aggregated financials ---
      supabase.rpc('exec_sql', {
        sql: `
          WITH project_fin AS (
            SELECT
              project_code,
              SUM(revenue) as revenue,
              SUM(expenses) as expenses,
              SUM(net) as net,
              COUNT(DISTINCT month) as months_active
            FROM project_monthly_financials
            GROUP BY project_code
          ),
          project_receivables AS (
            SELECT
              m.project_code,
              SUM(CASE WHEN i.status IN ('AUTHORISED','SUBMITTED') THEN i.total ELSE 0 END) as pending_receivables,
              COUNT(*) FILTER (WHERE i.status IN ('AUTHORISED','SUBMITTED')) as pending_count
            FROM invoice_project_map m
            JOIN xero_invoices i ON i.id = m.invoice_id
            WHERE i.type = 'ACCREC'
            GROUP BY m.project_code
          ),
          project_pipeline AS (
            SELECT
              unnest(project_codes) as project_code,
              SUM(COALESCE(value_mid, value_low, 0) * COALESCE(probability, 10) / 100) as weighted_pipeline,
              COUNT(*) as opp_count
            FROM opportunities_unified
            WHERE stage NOT IN ('lost','expired','identified','discovered')
            GROUP BY 1
          )
          SELECT
            p.code,
            p.name,
            p.tier,
            p.status,
            p.priority,
            p.category,
            COALESCE(f.revenue, 0) as revenue,
            COALESCE(f.expenses, 0) as expenses,
            COALESCE(f.net, 0) as net,
            COALESCE(f.months_active, 0) as months_active,
            COALESCE(r.pending_receivables, 0) as pending_receivables,
            COALESCE(r.pending_count, 0) as pending_count,
            COALESCE(pp.weighted_pipeline, 0) as weighted_pipeline,
            COALESCE(pp.opp_count, 0) as pipeline_count
          FROM projects p
          LEFT JOIN project_fin f ON f.project_code = p.code
          LEFT JOIN project_receivables r ON r.project_code = p.code
          LEFT JOIN project_pipeline pp ON pp.project_code = p.code
          WHERE p.status != 'archived'
          ORDER BY ABS(COALESCE(f.revenue, 0)) + ABS(COALESCE(f.expenses, 0)) DESC
        `,
      }),

      // --- Pipeline: researching+ stage only ---
      supabase.rpc('exec_sql', {
        sql: `
          SELECT
            id,
            title,
            contact_name,
            value_low,
            value_mid,
            value_high,
            probability,
            stage,
            project_codes,
            source_system,
            expected_close,
            created_at,
            updated_at,
            EXTRACT(DAY FROM NOW() - COALESCE(updated_at, created_at))::int as days_in_stage
          FROM opportunities_unified
          WHERE stage IN ('researching','pursuing','submitted','negotiating','approved','realized','shortlisted')
          ORDER BY
            CASE stage
              WHEN 'realized' THEN 0
              WHEN 'approved' THEN 1
              WHEN 'shortlisted' THEN 2
              WHEN 'submitted' THEN 3
              WHEN 'negotiating' THEN 4
              WHEN 'pursuing' THEN 5
              WHEN 'researching' THEN 6
            END,
            COALESCE(value_mid, value_low, 0) * COALESCE(probability, 10) / 100 DESC
        `,
      }),

      // --- Receivables: outstanding ACCREC invoices ---
      supabase.rpc('exec_sql', {
        sql: `
          SELECT
            i.id,
            i.invoice_number,
            i.contact_name,
            i.total,
            i.amount_due,
            i.amount_paid,
            i.status,
            i.date,
            i.due_date,
            i.line_items,
            m.project_code,
            m.chase_status,
            CASE
              WHEN i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE
              THEN EXTRACT(DAY FROM CURRENT_DATE - i.due_date)::int
              ELSE 0
            END as days_overdue
          FROM xero_invoices i
          LEFT JOIN invoice_project_map m ON m.invoice_id = i.id
          WHERE i.type = 'ACCREC'
            AND i.status IN ('AUTHORISED','SUBMITTED')
          ORDER BY
            CASE
              WHEN i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE
              THEN EXTRACT(DAY FROM CURRENT_DATE - i.due_date)
              ELSE 0
            END DESC
        `,
      }),
    ])

    const projects = projectsResult.data || []
    const pipeline = pipelineResult.data || []
    const receivables = receivablesResult.data || []

    // Compute summary stats
    const projectStats = {
      total: projects.length,
      focus: projects.filter((p: Record<string, unknown>) => p.priority === 'high').length,
      active: projects.filter((p: Record<string, unknown>) => p.priority === 'medium').length,
      background: projects.filter((p: Record<string, unknown>) => p.priority === 'low').length,
      unreviewed: projects.filter((p: Record<string, unknown>) => !p.priority || p.priority === '').length,
    }

    const pipelineStats = {
      total: pipeline.length,
      pursuing: pipeline.filter((p: Record<string, unknown>) => p.stage === 'pursuing').length,
      submitted: pipeline.filter((p: Record<string, unknown>) => ['submitted', 'shortlisted', 'negotiating', 'approved'].includes(p.stage as string)).length,
      realized: pipeline.filter((p: Record<string, unknown>) => p.stage === 'realized').length,
      researching: pipeline.filter((p: Record<string, unknown>) => p.stage === 'researching').length,
      totalValue: pipeline.reduce((s: number, p: Record<string, unknown>) =>
        s + (Number(p.value_mid) || Number(p.value_low) || 0) * (Number(p.probability) || 10) / 100, 0),
    }

    const receivableStats = {
      total: receivables.length,
      totalAmount: receivables.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.amount_due) || Number(r.total) || 0), 0),
      chasing: receivables.filter((r: Record<string, unknown>) => r.chase_status === 'chasing').length,
      chasingAmount: receivables.filter((r: Record<string, unknown>) => r.chase_status === 'chasing')
        .reduce((s: number, r: Record<string, unknown>) => s + (Number(r.amount_due) || Number(r.total) || 0), 0),
      disputed: receivables.filter((r: Record<string, unknown>) => r.chase_status === 'dispute').length,
      disputedAmount: receivables.filter((r: Record<string, unknown>) => r.chase_status === 'dispute')
        .reduce((s: number, r: Record<string, unknown>) => s + (Number(r.amount_due) || Number(r.total) || 0), 0),
      paymentPlan: receivables.filter((r: Record<string, unknown>) => r.chase_status === 'payment_plan').length,
      paymentPlanAmount: receivables.filter((r: Record<string, unknown>) => r.chase_status === 'payment_plan')
        .reduce((s: number, r: Record<string, unknown>) => s + (Number(r.amount_due) || Number(r.total) || 0), 0),
      unreviewed: receivables.filter((r: Record<string, unknown>) => !r.chase_status).length,
      unreviewedAmount: receivables.filter((r: Record<string, unknown>) => !r.chase_status)
        .reduce((s: number, r: Record<string, unknown>) => s + (Number(r.amount_due) || Number(r.total) || 0), 0),
      overdue60: receivables.filter((r: Record<string, unknown>) => (Number(r.days_overdue) || 0) > 60).length,
    }

    return NextResponse.json({
      projects,
      pipeline,
      receivables,
      stats: {
        projects: projectStats,
        pipeline: pipelineStats,
        receivables: receivableStats,
      },
    })
  } catch (error) {
    console.error('Error in review API:', error)
    return NextResponse.json({ error: 'Failed to load review data' }, { status: 500 })
  }
}
