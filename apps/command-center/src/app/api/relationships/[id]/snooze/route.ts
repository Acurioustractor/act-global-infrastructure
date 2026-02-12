import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { days } = await req.json()

    if (!days || typeof days !== 'number' || days < 1) {
      return NextResponse.json({ error: 'days must be a positive number' }, { status: 400 })
    }

    const snoozedUntil = new Date()
    snoozedUntil.setDate(snoozedUntil.getDate() + days)

    const { error } = await supabase
      .from('relationship_health')
      .update({ snoozed_until: snoozedUntil.toISOString() })
      .eq('ghl_contact_id', id)

    if (error) {
      console.error('Snooze error:', error)
      return NextResponse.json({ error: 'Failed to snooze contact' }, { status: 500 })
    }

    return NextResponse.json({ success: true, snoozed_until: snoozedUntil.toISOString() })
  } catch (err) {
    console.error('Snooze error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
