import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { action } = body // 'dismiss' or 'act'

  if (!['dismiss', 'act'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Use "dismiss" or "act".' }, { status: 400 })
  }

  const update: Record<string, unknown> = {
    status: action === 'dismiss' ? 'dismissed' : 'acted',
    updated_at: new Date().toISOString(),
  }

  if (action === 'dismiss') {
    update.dismissed_at = new Date().toISOString()
  } else {
    update.acted_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('intelligence_insights')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ insight: data })
}
