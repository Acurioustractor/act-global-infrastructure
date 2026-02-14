import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Core ecosystem projects to highlight
const CORE_PROJECTS = ['ACT-GD', 'ACT-HV', 'ACT-JH', 'ACT-CA', 'ACT-EL', 'ACT-FM']

export async function GET() {
  try {
    const [
      financialsRes,
      receivablesRes,
      pipelineRes,
      grantDeadlinesRes,
      overdueInvoicesRes,
    ] = await Promise.all([
      // Per-project financials
      supabase.from('v_project_financials').select('*'),

      // Outstanding receivables (invoices we sent, not yet paid)
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_due, due_date, project_code, invoice_number, reference')
        .eq('type', 'ACCREC')
        .in('status', ['AUTHORISED', 'SUBMITTED', 'SENT'])
        .order('amount_due', { ascending: false }),

      // GHL pipeline by project
      supabase
        .from('ghl_opportunities')
        .select('name, monetary_value, project_code, stage_name, ghl_contact_id, ghl_updated_at')
        .eq('status', 'open')
        .order('monetary_value', { ascending: false }),

      // Grant deadlines in next 60 days
      supabase
        .from('grant_opportunities')
        .select('name, provider, amount_max, closes_at, aligned_projects, application_status')
        .gte('closes_at', new Date().toISOString())
        .lte('closes_at', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
        .order('closes_at', { ascending: true }),

      // Overdue receivables
      supabase
        .from('xero_invoices')
        .select('contact_name, amount_due, due_date, project_code, invoice_number')
        .eq('type', 'ACCREC')
        .in('status', ['AUTHORISED', 'SUBMITTED', 'SENT'])
        .lt('due_date', new Date().toISOString())
        .gt('amount_due', 0)
        .order('amount_due', { ascending: false }),
    ])

    // Build project-level pulse
    const financials = financialsRes.data || []
    const projectPulse = financials
      .filter(f => CORE_PROJECTS.includes(f.code))
      .map(f => ({
        code: f.code,
        name: f.name,
        tier: f.tier,
        fyIncome: parseFloat(f.fy_income) || 0,
        fyExpenses: parseFloat(f.fy_expenses) || 0,
        receivable: parseFloat(f.receivable) || 0,
        pipelineValue: parseFloat(f.pipeline_value) || 0,
        netPosition: parseFloat(f.net_position) || 0,
      }))

    // Aggregate totals
    const totalReceivable = (receivablesRes.data || []).reduce((sum, inv) => sum + (parseFloat(inv.amount_due) || 0), 0)
    const totalPipeline = (pipelineRes.data || []).reduce((sum, o) => sum + (parseFloat(o.monetary_value) || 0), 0)

    // Overdue receivables
    const overdueReceivables = (overdueInvoicesRes.data || []).map(inv => ({
      contact: inv.contact_name,
      amount: parseFloat(inv.amount_due) || 0,
      dueDate: inv.due_date,
      project: inv.project_code,
      invoice: inv.invoice_number,
      daysOverdue: Math.floor((Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    const totalOverdue = overdueReceivables.reduce((sum, inv) => sum + inv.amount, 0)

    // Grant deadlines
    const grantDeadlines = (grantDeadlinesRes.data || []).map(g => ({
      name: g.name,
      provider: g.provider,
      maxAmount: g.amount_max,
      closesAt: g.closes_at,
      alignedProjects: g.aligned_projects || [],
      status: g.application_status || 'not_applied',
      daysUntil: Math.ceil((new Date(g.closes_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }))

    // Weekly actions summary (financial focus only — relationships handled by /api/relationships/touchpoints)
    const weeklyActions = {
      overdueInvoices: overdueReceivables.length,
      overdueTotal: totalOverdue,
      grantsDueSoon: grantDeadlines.filter(g => g.daysUntil <= 30 && g.status === 'not_applied').length,
    }

    return NextResponse.json({
      summary: {
        totalReceivable,
        totalOverdue,
        totalPipeline,
        grantDeadlinesCount: grantDeadlines.length,
        coreProjectCount: projectPulse.length,
      },
      projectPulse,
      overdueReceivables: overdueReceivables.slice(0, 10),
      grantDeadlines: grantDeadlines.slice(0, 10),
      weeklyActions,
    })
  } catch (error) {
    console.error('Error in ecosystem pulse:', error)
    return NextResponse.json({ error: 'Failed to fetch pulse' }, { status: 500 })
  }
}
