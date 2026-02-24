import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const [itemsRes, suggestionsRes] = await Promise.all([
    supabase
      .from('sprint_items')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabase
      .from('sprint_suggestions')
      .select('*')
      .eq('dismissed', false)
      .is('promoted_to', null)
      .order('due_date', { ascending: true }),
  ])

  if (itemsRes.error) {
    return NextResponse.json({ error: itemsRes.error.message }, { status: 500 })
  }

  return NextResponse.json({
    items: itemsRes.data,
    suggestions: suggestionsRes.data || [],
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.action === 'toggle') {
    const { id, done } = body
    const update = done
      ? { status: 'done', done_date: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { status: 'today', done_date: null, updated_at: new Date().toISOString() }

    const { error } = await supabase
      .from('sprint_items')
      .update(update)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'update') {
    const { id, action: _action, ...fields } = body
    const { error } = await supabase
      .from('sprint_items')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'add') {
    const { title, stream, priority, owner, project_code, time_est } = body
    const { error } = await supabase
      .from('sprint_items')
      .insert({
        title,
        stream: stream || 'Infrastructure',
        status: 'today',
        priority: priority || 'now',
        owner: owner || 'Ben',
        project_code,
        time_est,
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'move_to_today') {
    const { id } = body
    const { error } = await supabase
      .from('sprint_items')
      .update({ status: 'today', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'move_to_backlog') {
    const { id } = body
    const { error } = await supabase
      .from('sprint_items')
      .update({ status: 'backlog', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'accept_suggestion') {
    const { suggestion_id } = body

    // Fetch the suggestion
    const { data: suggestion, error: fetchErr } = await supabase
      .from('sprint_suggestions')
      .select('*')
      .eq('id', suggestion_id)
      .single()

    if (fetchErr || !suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    // Create a sprint item from it
    const { data: newItem, error: insertErr } = await supabase
      .from('sprint_items')
      .insert({
        title: suggestion.title,
        stream: suggestion.stream,
        status: 'today',
        priority: suggestion.priority,
        owner: suggestion.owner || 'Ben',
        project_code: suggestion.project_code,
        notes: suggestion.notes,
        source_type: suggestion.source_type,
        source_ref: suggestion.source_ref,
      })
      .select('id')
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    // Mark suggestion as promoted
    await supabase
      .from('sprint_suggestions')
      .update({ promoted_to: newItem.id })
      .eq('id', suggestion_id)

    return NextResponse.json({ ok: true, item_id: newItem.id })
  }

  if (body.action === 'dismiss_suggestion') {
    const { suggestion_id } = body
    const { error } = await supabase
      .from('sprint_suggestions')
      .update({ dismissed: true })
      .eq('id', suggestion_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
