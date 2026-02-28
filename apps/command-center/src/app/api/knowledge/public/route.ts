import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')
    const type = searchParams.get('type')
    const search = searchParams.get('q')
    const format = searchParams.get('format') || 'json'

    let query = supabase
      .from('project_knowledge')
      .select('id, title, content, summary, knowledge_type, project_code, project_name, topics, recorded_at, published_at')
      .eq('public', true)
      .order('published_at', { ascending: false })
      .limit(100)

    if (project) query = query.eq('project_code', project)
    if (type) query = query.eq('knowledge_type', type)
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,summary.ilike.%${search}%`)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const items = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      summary: item.summary || item.content?.substring(0, 300) || '',
      content: format === 'full' ? item.content : undefined,
      type: item.knowledge_type,
      project: item.project_code,
      projectName: item.project_name,
      topics: item.topics || [],
      publishedAt: item.published_at,
      recordedAt: item.recorded_at,
    }))

    // If markdown format requested
    if (format === 'markdown') {
      const md = items.map((item: any) =>
        `## ${item.title}\n\n` +
        `**Project:** ${item.projectName || item.project} | **Type:** ${item.type} | **Published:** ${item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-AU') : 'Unknown'}\n\n` +
        `${item.summary}\n\n` +
        (item.topics.length > 0 ? `**Topics:** ${item.topics.join(', ')}\n\n` : '') +
        `---\n`
      ).join('\n')

      return new NextResponse(md, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      })
    }

    return NextResponse.json({
      count: items.length,
      items,
    })
  } catch (error) {
    console.error('Error in public knowledge:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

// Toggle public status
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, public: isPublic } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updates: any = {
      public: isPublic,
      updated_at: new Date().toISOString(),
    }
    if (isPublic) {
      updates.published_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('project_knowledge')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error toggling public status:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
