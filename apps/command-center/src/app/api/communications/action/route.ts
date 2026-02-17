import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { communicationId, action } = await request.json() as {
      communicationId: string
      action: 'archived' | 'important' | 'follow_up_today'
    }

    if (!communicationId || !action) {
      return NextResponse.json({ error: 'communicationId and action required' }, { status: 400 })
    }

    if (!['archived', 'important', 'follow_up_today'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error } = await supabase
      .from('communication_user_actions')
      .upsert(
        { communication_id: communicationId, action, created_at: new Date().toISOString() },
        { onConflict: 'communication_id' }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Communication action error:', error)
    return NextResponse.json({ error: 'Failed to save action' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { communicationId } = await request.json() as { communicationId: string }

    if (!communicationId) {
      return NextResponse.json({ error: 'communicationId required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('communication_user_actions')
      .delete()
      .eq('communication_id', communicationId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Communication action delete error:', error)
    return NextResponse.json({ error: 'Failed to remove action' }, { status: 500 })
  }
}
