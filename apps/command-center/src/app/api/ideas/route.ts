import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const tag = searchParams.get('tag')
    const q = searchParams.get('q')

    let query = supabase
      .from('idea_board')
      .select('*, idea_snoozes(id)')
      .order('updated_at', { ascending: false })

    if (category) query = query.eq('category', category)
    if (status) query = query.eq('status', status)
    if (tag) query = query.contains('tags', [tag])
    if (q) query = query.ilike('text', `%${q}%`)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Flatten the embedded snooze rows into a count for client convenience.
    const enriched = (data ?? []).map((row: Record<string, unknown>) => {
      const snoozes = (row.idea_snoozes ?? []) as Array<unknown>
      const { idea_snoozes: _, ...rest } = row as { idea_snoozes?: unknown }
      return { ...rest, snooze_count: snoozes.length }
    })
    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('idea_board')
      .insert(body)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
