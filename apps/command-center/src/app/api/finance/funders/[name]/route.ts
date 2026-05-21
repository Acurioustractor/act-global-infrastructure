import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const funderName = decodeURIComponent(name)

    // 1. Warmth + summary
    const { data: warmthData, error: wErr } = await supabase
      .from('v_funder_next_move')
      .select('*')
      .eq('funder_name', funderName)
      .maybeSingle()
    if (wErr) throw wErr

    // 2. Allocation (if seeded) + drawdowns
    const { data: allocation, error: aErr } = await supabase
      .from('project_funding_allocations')
      .select('*')
      .eq('funder_org_name', funderName)
      .maybeSingle()
    if (aErr) throw aErr

    let drawdowns: any[] = []
    if (allocation?.id) {
      const { data, error } = await supabase
        .from('project_funding_drawdowns')
        .select('*')
        .eq('allocation_id', allocation.id)
        .order('drawn_at')
      if (error) throw error
      drawdowns = data || []
    }

    // 3. Full invoice history
    const { data: invoices, error: iErr } = await supabase
      .from('xero_invoices')
      .select('xero_id, invoice_number, date, total, amount_due, status, project_code, line_items')
      .eq('contact_name', funderName)
      .eq('type', 'ACCREC')
      .not('status', 'in', '(DELETED,VOIDED)')
      .order('date')
    if (iErr) throw iErr

    return NextResponse.json({
      funderName,
      warmth: warmthData ? {
        band: warmthData.warmth_band,
        score: warmthData.warmth_score,
        nextMove: warmthData.next_move,
        daysSinceLast: warmthData.days_since_last,
      } : null,
      summary: {
        grossRevenue: Number(warmthData?.gross_revenue || 0),
        paidRevenue: Number(warmthData?.paid_revenue || 0),
        outstanding: Number(warmthData?.outstanding || 0),
        invoiceCount: warmthData?.invoice_count || 0,
        paidCount: warmthData?.paid_count || 0,
        authorisedCount: warmthData?.authorised_count || 0,
        firstInvoice: warmthData?.first_invoice,
        lastInvoice: warmthData?.last_invoice,
        yearsActive: warmthData?.years_active || 0,
        projects: warmthData?.projects || [],
      },
      allocation: allocation ? {
        id: allocation.id,
        projectCode: allocation.project_code,
        committedAmount: Number(allocation.committed_amount),
        status: allocation.status,
        grantRef: allocation.grant_or_contract_ref,
        periodStart: allocation.period_start,
        periodEnd: allocation.period_end,
        drawdownMethod: allocation.drawdown_method,
        pileTag: allocation.pile_tag,
        notes: allocation.notes,
        updatedAt: allocation.updated_at,
      } : null,
      drawdowns: drawdowns.map((d: any) => ({
        id: d.id,
        drawnAmount: Number(d.drawn_amount),
        drawnAt: d.drawn_at,
        xeroInvoiceId: d.xero_invoice_id,
        source: d.source,
        notes: d.notes,
      })),
      invoices: (invoices || []).map((i: any) => ({
        xeroId: i.xero_id,
        invoiceNumber: i.invoice_number,
        date: i.date,
        total: Number(i.total),
        amountDue: Number(i.amount_due || 0),
        status: i.status,
        projectCode: i.project_code,
        description: i.line_items?.[0]?.description || null,
      })),
    })
  } catch (error: any) {
    console.error('GET /api/finance/funders/[name] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const funderName = decodeURIComponent(name)
    const body = await request.json()

    // Find allocation
    const { data: alloc, error: findErr } = await supabase
      .from('project_funding_allocations')
      .select('id')
      .eq('funder_org_name', funderName)
      .maybeSingle()
    if (findErr) throw findErr
    if (!alloc) {
      return NextResponse.json({ error: 'No allocation found for this funder. Create one first via POST /api/finance/funders.' }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    const editable = [
      'committed_amount', 'status', 'grant_or_contract_ref', 'period_start',
      'period_end', 'drawdown_method', 'pile_tag', 'notes', 'project_code',
    ]
    for (const f of editable) {
      if (f in body) updates[f] = body[f]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_funding_allocations')
      .update(updates)
      .eq('id', alloc.id)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ allocation: data })
  } catch (error: any) {
    console.error('PATCH /api/finance/funders/[name] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
