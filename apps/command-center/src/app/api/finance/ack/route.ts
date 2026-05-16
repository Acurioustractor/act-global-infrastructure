import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Pass 2C C2 — POST an ack for a compliance obligation or an idea reminder.
//
//   POST /api/finance/ack
//   { kind: 'compliance', id: 'bas-q4-fy26', ack_by: 'ben', via?: 'command-page' }
//   { kind: 'idea',       id: '<uuid>',     ack_by: 'ben', reminder_id?: '...' }

interface AckBody {
  kind: 'compliance' | 'idea'
  id: string
  ack_by?: string
  via?: string
  reminder_id?: string
}

export async function POST(req: NextRequest) {
  let body: AckBody
  try {
    body = (await req.json()) as AckBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  if (!body.id || !body.kind) {
    return NextResponse.json({ error: 'kind + id required' }, { status: 400 })
  }
  const ackBy = body.ack_by?.trim() || 'ben'

  if (body.kind === 'compliance') {
    const { data, error } = await supabase
      .from('compliance_ack')
      .insert({ obligation_id: body.id, acked_by: ackBy, acked_via: body.via ?? 'command-page' })
      .select('id, acked_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, ack: data })
  }

  if (body.kind === 'idea') {
    const { data, error } = await supabase
      .from('idea_ack')
      .insert({ idea_id: body.id, acked_by: ackBy, reminder_id: body.reminder_id ?? null })
      .select('id, acked_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, ack: data })
  }

  return NextResponse.json({ error: `unknown kind: ${body.kind}` }, { status: 400 })
}
