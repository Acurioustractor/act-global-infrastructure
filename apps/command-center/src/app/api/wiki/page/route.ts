import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const path = new URL(request.url).searchParams.get('path')
    if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

    // Try to find page by ID or path
    const { data } = await supabase
      .from('project_knowledge')
      .select('*')
      .or(`id.eq.${path},metadata->>slug.eq.${path}`)
      .eq('type', 'wiki')
      .single()

    if (data) {
      return NextResponse.json({
        path: data.id,
        title: data.title,
        frontmatter: data.metadata || {},
        content: data.content || data.summary || '',
      })
    }

    return NextResponse.json({ path, title: path, frontmatter: {}, content: 'Page not found.' })
  } catch (e) {
    console.error('Wiki page error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
