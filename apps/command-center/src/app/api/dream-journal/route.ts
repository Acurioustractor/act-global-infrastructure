import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/dream-journal — list dream journal entries
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('dream_journal')
    .select('id, title, content, category, tags, media_url, media_type, source, author, ai_summary, ai_themes, ai_linked_projects, ai_connections, created_at, updated_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  if (search) {
    query = query.or(`content.ilike.%${search}%,title.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also get total count
  let countQuery = supabase
    .from('dream_journal')
    .select('id', { count: 'exact', head: true })

  if (category && category !== 'all') {
    countQuery = countQuery.eq('category', category)
  }

  const { count } = await countQuery

  return NextResponse.json({ entries: data || [], total: count || 0 })
}

// POST /api/dream-journal — add a new entry from the web UI
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, content, category, tags, media_url, media_type } = body

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('dream_journal')
      .insert({
        title: title || content.split(/[.!?\n]/)[0].trim().slice(0, 60),
        content,
        category: category || 'dream',
        tags: tags || [],
        source: 'web',
        author: 'benjamin',
        media_url: media_url || null,
        media_type: media_type || null,
        ai_linked_projects: [],
        ai_themes: tags?.slice(0, 5) || [],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry: data })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
