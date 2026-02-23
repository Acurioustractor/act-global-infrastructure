import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('sprint_items')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.action === 'toggle') {
    // Toggle done/today
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
    const { id, ...fields } = body
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

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
