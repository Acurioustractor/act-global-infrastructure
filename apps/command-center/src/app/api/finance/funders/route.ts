import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Warmth + invoice summary for every funder
    const { data: warmth, error: warmthErr } = await supabase
      .from('v_funder_next_move')
      .select('*')
      .order('warmth_score', { ascending: false })
    if (warmthErr) throw warmthErr

    // Allocation overlay — link funders that have a project_funding_allocations row
    const { data: allocations, error: allocErr } = await supabase
      .from('v_project_funding_position')
      .select('*')
    if (allocErr) throw allocErr

    const allocByFunder = new Map<string, any>()
    for (const a of allocations || []) {
      allocByFunder.set(a.funder_org_name, a)
    }

    const rows = (warmth || []).map((w: any) => {
      const alloc = allocByFunder.get(w.funder_name)
      return {
        funderName: w.funder_name,
        warmthBand: w.warmth_band,
        warmthScore: w.warmth_score,
        nextMove: w.next_move,
        invoiceCount: w.invoice_count,
        paidCount: w.paid_count,
        authorisedCount: w.authorised_count,
        grossRevenue: Number(w.gross_revenue || 0),
        paidRevenue: Number(w.paid_revenue || 0),
        outstanding: Number(w.outstanding || 0),
        firstInvoice: w.first_invoice,
        lastInvoice: w.last_invoice,
        daysSinceLast: w.days_since_last,
        yearsActive: w.years_active,
        projects: w.projects || [],
        // From allocation table if seeded:
        allocationId: alloc?.allocation_id ?? null,
        committedAmount: alloc?.committed_amount != null ? Number(alloc.committed_amount) : null,
        drawnAmount: alloc?.drawn_amount != null ? Number(alloc.drawn_amount) : null,
        remainingAmount: alloc?.remaining_amount != null ? Number(alloc.remaining_amount) : null,
        drawnPct: alloc?.drawn_pct != null ? Number(alloc.drawn_pct) : null,
        allocationStatus: alloc?.status ?? null,
        grantRef: alloc?.grant_or_contract_ref ?? null,
        pileTag: alloc?.pile_tag ?? null,
        periodStart: alloc?.period_start ?? null,
        periodEnd: alloc?.period_end ?? null,
        notes: alloc?.notes ?? null,
      }
    })

    return NextResponse.json({
      rows,
      summary: {
        total: rows.length,
        byBand: {
          HOT: rows.filter(r => r.warmthBand === 'HOT').length,
          WARM: rows.filter(r => r.warmthBand === 'WARM').length,
          STEADY: rows.filter(r => r.warmthBand === 'STEADY').length,
          COOLING: rows.filter(r => r.warmthBand === 'COOLING').length,
          COLD: rows.filter(r => r.warmthBand === 'COLD').length,
        },
        totalGross: rows.reduce((s, r) => s + r.grossRevenue, 0),
        totalOutstanding: rows.reduce((s, r) => s + r.outstanding, 0),
        totalCommitted: rows.reduce((s, r) => s + (r.committedAmount || 0), 0),
      },
    })
  } catch (error: any) {
    console.error('GET /api/finance/funders error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const required = ['project_code', 'funder_org_name', 'committed_amount']
    for (const f of required) {
      if (!body[f]) {
        return NextResponse.json({ error: `Missing required field: ${f}` }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('project_funding_allocations')
      .insert({
        project_code: body.project_code,
        funder_org_name: body.funder_org_name,
        committed_amount: Number(body.committed_amount),
        grant_or_contract_ref: body.grant_or_contract_ref || null,
        period_start: body.period_start || null,
        period_end: body.period_end || null,
        status: body.status || 'proposed',
        drawdown_method: body.drawdown_method || null,
        pile_tag: body.pile_tag || null,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ allocation: data })
  } catch (error: any) {
    console.error('POST /api/finance/funders error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
