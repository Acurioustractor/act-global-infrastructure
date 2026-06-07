import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST a new drawdown against a funder's allocation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const funderName = decodeURIComponent(name)
    const body = await request.json()

    if (!body.drawn_amount || !body.drawn_at) {
      return NextResponse.json({ error: 'Missing drawn_amount or drawn_at' }, { status: 400 })
    }

    const { data: alloc, error: findErr } = await supabase
      .from('project_funding_allocations')
      .select('id')
      .eq('funder_org_name', funderName)
      .maybeSingle()
    if (findErr) throw findErr
    if (!alloc) {
      return NextResponse.json({ error: 'No allocation exists for this funder' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('project_funding_drawdowns')
      .insert({
        allocation_id: alloc.id,
        drawn_amount: Number(body.drawn_amount),
        drawn_at: body.drawn_at,
        xero_invoice_id: body.xero_invoice_id || null,
        source: body.source || 'manual',
        notes: body.notes || null,
      })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ drawdown: data })
  } catch (error: any) {
    console.error('POST drawdown error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE a drawdown by id (passed in body)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const funderName = decodeURIComponent(name)
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Missing drawdown id' }, { status: 400 })
    }

    // Verify the drawdown belongs to this funder
    const { data: drawdown } = await supabase
      .from('project_funding_drawdowns')
      .select('id, allocation_id, project_funding_allocations!inner(funder_org_name)')
      .eq('id', body.id)
      .maybeSingle()
    if (!drawdown || (drawdown as any).project_funding_allocations?.funder_org_name !== funderName) {
      return NextResponse.json({ error: 'Drawdown not found for this funder' }, { status: 404 })
    }

    const { error } = await supabase
      .from('project_funding_drawdowns')
      .delete()
      .eq('id', body.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('DELETE drawdown error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
