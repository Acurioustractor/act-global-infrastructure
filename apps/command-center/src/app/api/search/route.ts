import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const q = new URL(request.url).searchParams.get('q')
    if (!q) return NextResponse.json({ results: [] })

    const results: Array<{ type: string; id: string; name: string; score: number }> = []

    // Search contacts
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('id, full_name')
      .ilike('full_name', `%${q}%`)
      .limit(5)

    for (const c of contacts || []) {
      results.push({ type: 'contact', id: c.id, name: c.full_name, score: 1 })
    }

    // Search knowledge
    const { data: knowledge } = await supabase
      .from('project_knowledge')
      .select('id, title')
      .ilike('title', `%${q}%`)
      .limit(5)

    for (const k of knowledge || []) {
      results.push({ type: 'knowledge', id: k.id, name: k.title, score: 0.8 })
    }

    // Search projects
    const { data: projects } = await supabase
      .from('notion_projects')
      .select('id, name')
      .ilike('name', `%${q}%`)
      .limit(5)

    for (const p of projects || []) {
      results.push({ type: 'project', id: p.id, name: p.name, score: 0.9 })
    }

    return NextResponse.json({ results: results.sort((a, b) => b.score - a.score) })
  } catch (e) {
    console.error('Search error:', e)
    return NextResponse.json({ results: [] })
  }
}
