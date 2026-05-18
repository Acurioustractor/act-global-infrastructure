import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Save an inline note on a transaction by mutating line_items[0]._note in jsonb.
// Pattern mirrors the _ocr blob we use elsewhere — no schema migration needed.
export async function POST(request: NextRequest) {
  try {
    const { id, source, note } = (await request.json()) as { id: string; source: 'bill' | 'spend' | 'spend-overpay' | 'receive'; note: string }
    if (!id || !source) return NextResponse.json({ error: 'id + source required' }, { status: 400 })
    const table = source === 'bill' ? 'xero_invoices' : 'xero_transactions'

    const { data: existing, error: e1 } = await supabase.from(table).select('id, line_items').eq('id', id).single()
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
    const li: any[] = Array.isArray(existing.line_items) ? [...existing.line_items] : []
    if (!li.length) li.push({ description: '' })
    li[0] = { ...li[0], _note: note ? { text: note, updated_at: new Date().toISOString() } : null }
    const { error: e2 } = await supabase.from(table).update({ line_items: li }).eq('id', id)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
