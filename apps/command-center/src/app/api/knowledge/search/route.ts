import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/embeddings'

/** Fire-and-forget: record that search results were accessed (feeds back into decay scoring) */
function trackAccess(results: Array<{ source_table?: string; id?: string; source_id?: string }>) {
  for (const r of results.slice(0, 5)) {
    const table = r.source_table || 'project_knowledge'
    const id = r.source_id || r.id
    if (id) {
      void supabase.rpc('record_memory_access', { p_table: table, p_id: id })
    }
  }
}

/**
 * GET /api/knowledge/search?q=...&type=...&project=...&limit=...&mode=vector|text
 *
 * Search across all knowledge: meetings, actions, decisions.
 * Default mode is vector (semantic similarity). Falls back to text if no embeddings or no OPENAI_API_KEY.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const type = searchParams.get('type') // meeting, action, decision, or null for all
    const project = searchParams.get('project')
    const limit = parseInt(searchParams.get('limit') || '20')
    const mode = searchParams.get('mode') || 'vector'

    if (!q) {
      return NextResponse.json({ success: true, results: [], count: 0, query: '', mode: 'none' })
    }

    // Hybrid search: vector similarity (60%) + decay/freshness (20%) + graph connectivity (20%)
    if (mode === 'vector' && process.env.OPENAI_API_KEY) {
      try {
        const embedding = await generateEmbedding(q)

        const { data, error } = await supabase.rpc('hybrid_memory_search', {
          query_embedding: JSON.stringify(embedding),
          p_project_code: project || null,
          match_threshold: 0.2,
          match_count: limit,
        })

        if (error) throw error

        // Map hybrid results to standard format, filtering by type if needed
        const results = (data || [])
          .filter((r: { metadata: { knowledge_type?: string } }) =>
            !type || r.metadata?.knowledge_type === type
          )
          .map((r: { source_id: string; title: string; content: string; vector_score: number; decay_score: number; graph_score: number; combined_score: number; source_table: string; metadata: { knowledge_type?: string; importance?: string } }) => ({
            id: r.source_id,
            title: r.title,
            content: r.content,
            knowledge_type: r.metadata?.knowledge_type,
            importance: r.metadata?.importance,
            similarity: r.combined_score,
            vector_score: r.vector_score,
            decay_score: r.decay_score,
            graph_score: r.graph_score,
            source_table: r.source_table,
          }))

        trackAccess(results)

        return NextResponse.json({
          success: true,
          results,
          count: results.length,
          query: q,
          mode: 'hybrid',
        })
      } catch (hybridError) {
        console.warn('Hybrid search failed, falling back to text:', hybridError)
        // Fall through to text search
      }
    }

    // Text fallback
    let query = supabase
      .from('project_knowledge')
      .select('id, title, summary, content, knowledge_type, project_code, project_name, recorded_at, participants, topics, sentiment, action_required, importance, source_url, created_at')
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq('knowledge_type', type)
    } else {
      query = query.in('knowledge_type', ['meeting', 'action', 'decision'])
    }

    if (project) {
      query = query.eq('project_code', project)
    }

    query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%,summary.ilike.%${q}%`)

    const { data, error } = await query

    if (error) throw error

    trackAccess(data || [])

    return NextResponse.json({
      success: true,
      results: data || [],
      count: data?.length || 0,
      query: q,
      mode: 'text',
    })
  } catch (e) {
    console.error('Knowledge search error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
