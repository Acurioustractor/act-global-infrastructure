import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const q = new URL(request.url).searchParams.get('q')
    if (!q) return NextResponse.json({ results: [] })

    const { data } = await supabase
      .from('project_knowledge')
      .select('id, title, content, project_code, type')
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .limit(20)

    const results = (data || []).map((r) => ({
      path: r.id,
      title: r.title,
      snippet: r.content?.substring(0, 200) || '',
      section: r.project_code || r.type || 'General',
    }))

    return NextResponse.json({ results })
  } catch (e) {
    console.error('Wiki search error:', e)
    return NextResponse.json({ results: [] })
  }
}
