import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { vote } = await req.json()

    if (!vote || !['up', 'down'].includes(vote)) {
      return NextResponse.json({ error: 'vote must be "up" or "down"' }, { status: 400 })
    }

    // Get latest activity timestamp for this contact (for downvote suppression)
    const { data: latestComm } = await supabase
      .from('communications_history')
      .select('occurred_at')
      .eq('ghl_contact_id', id)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .single()

    const { error } = await supabase.from('contact_votes').insert({
      ghl_contact_id: id,
      vote_type: vote,
      activity_snapshot_at: latestComm?.occurred_at || null,
    })

    if (error) {
      console.error('Vote insert error:', error)
      return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Vote error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
