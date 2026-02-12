import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const VALID_ACTIONS = ['dismiss', 'act', 'upvote', 'downvote', 'important'] as const
type InsightAction = (typeof VALID_ACTIONS)[number]

const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const

function bumpPriority(current: string, direction: 'up' | 'down'): string {
  const idx = PRIORITY_LEVELS.indexOf(current as typeof PRIORITY_LEVELS[number])
  if (idx === -1) return current
  if (direction === 'up') return PRIORITY_LEVELS[Math.min(idx + 1, PRIORITY_LEVELS.length - 1)]
  return PRIORITY_LEVELS[Math.max(idx - 1, 0)]
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { action } = body as { action: InsightAction }

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Use one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 }
    )
  }

  // For vote actions, fetch the insight first to denormalize fields
  if (action === 'upvote' || action === 'downvote' || action === 'important') {
    const { data: insight, error: fetchErr } = await supabase
      .from('intelligence_insights')
      .select('id, insight_type, priority, data')
      .eq('id', id)
      .single()

    if (fetchErr || !insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 })
    }

    const contactId = (insight.data as Record<string, unknown>)?.contact_id as string | undefined
    const projectCodes = (insight.data as Record<string, unknown>)?.project_codes as string[] | undefined

    // Insert vote
    const voteType = action === 'upvote' ? 'up' : action === 'downvote' ? 'down' : 'important'
    await supabase.from('insight_votes').insert({
      insight_id: id,
      vote_type: voteType,
      insight_type: insight.insight_type,
      project_codes: projectCodes || null,
      contact_id: contactId || null,
    })

    // Update insight priority
    const newPriority = action === 'important'
      ? 'critical'
      : bumpPriority(insight.priority, action === 'upvote' ? 'up' : 'down')

    const { data, error } = await supabase
      .from('intelligence_insights')
      .update({ priority: newPriority, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ insight: data })
  }

  // Original dismiss/act logic
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
