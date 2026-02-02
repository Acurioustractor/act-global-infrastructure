import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/embeddings'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KnowledgeRow = Record<string, any>

/** Fire-and-forget: record that results were accessed (feeds into decay scoring) */
function trackAccess(results: KnowledgeRow[]) {
  for (const r of results.slice(0, 5)) {
    const table = r.source_table || 'project_knowledge'
    const id = r.source_id || r.id
    if (id) {
      void supabase.rpc('record_memory_access', { p_table: table, p_id: id })
    }
  }
}

/**
 * POST /api/knowledge/ask
 * Body: { question: string, project?: string }
 *
 * Ask a natural language question across all knowledge.
 * Uses vector similarity to find relevant content, then LLM to synthesize an answer.
 * Falls back to text search if vector search unavailable.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, project } = body

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'question is required' },
        { status: 400 }
      )
    }

    let results: KnowledgeRow[] = []
    let searchMode = 'text'

    // Step 1: Find relevant knowledge via hybrid search (vector + decay + graph)
    if (OPENAI_API_KEY) {
      try {
        const embedding = await generateEmbedding(question)

        const { data, error } = await supabase.rpc('hybrid_memory_search', {
          query_embedding: JSON.stringify(embedding),
          p_project_code: project || null,
          match_threshold: 0.2,
          match_count: 15,
        })

        if (error) throw error

        if (data && data.length > 0) {
          results = data.map((r: KnowledgeRow) => ({
            id: r.source_id,
            title: r.title,
            content: r.content,
            knowledge_type: r.metadata?.knowledge_type,
            importance: r.metadata?.importance,
            relevance: r.combined_score,
            vector_score: r.vector_score,
            decay_score: r.decay_score,
            graph_score: r.graph_score,
            source_table: r.source_table,
          }))
          searchMode = 'hybrid'
        }
      } catch (hybridError) {
        console.warn('Hybrid search failed, falling back to text:', hybridError)
      }
    }

    // Fallback: text-based keyword search
    if (results.length === 0) {
      const keywords = question
        .toLowerCase()
        .replace(/[?.,!'"]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !['what', 'when', 'where', 'does', 'have', 'about', 'this', 'that', 'with', 'from', 'they', 'been', 'were', 'will', 'would', 'could', 'should'].includes(w))

      if (keywords.length > 0) {
        const searches = await Promise.all([
          supabase
            .from('project_knowledge')
            .select('id, title, summary, content, knowledge_type, project_code, project_name, recorded_at, participants, topics, decision_status, decision_rationale, action_items, importance')
            .in('knowledge_type', ['meeting', 'action', 'decision'])
            .or(keywords.map((k: string) => `title.ilike.%${k}%`).join(','))
            .order('recorded_at', { ascending: false })
            .limit(20),
          supabase
            .from('project_knowledge')
            .select('id, title, summary, content, knowledge_type, project_code, project_name, recorded_at, participants, topics, decision_status, decision_rationale, action_items, importance')
            .in('knowledge_type', ['meeting', 'action', 'decision'])
            .or(keywords.map((k: string) => `content.ilike.%${k}%`).join(','))
            .order('recorded_at', { ascending: false })
            .limit(20),
        ])

        const seen = new Set<string>()
        for (const search of searches) {
          for (const item of search.data || []) {
            if (!seen.has(item.id)) {
              seen.add(item.id)
              if (!project || item.project_code === project) {
                const text = `${item.title} ${item.summary || ''} ${item.content || ''}`.toLowerCase()
                let score = 0
                for (const kw of keywords) {
                  if (text.includes(kw)) score++
                }
                results.push({ ...item, relevance: score / keywords.length })
              }
            }
          }
        }
        results.sort((a, b) => b.relevance - a.relevance)
        results = results.slice(0, 10)
        searchMode = 'text'
      }
    }

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        answer: "I couldn't find any relevant knowledge matching your question. Try rephrasing or using different keywords.",
        sources: [],
        question,
        searchMode,
      })
    }

    // Track access for top results (feeds into decay scoring)
    trackAccess(results)

    // Step 2: Build context for LLM
    const context = results.map((r, i) => {
      const type = r.knowledge_type === 'meeting' ? 'MEETING' : r.knowledge_type === 'action' ? 'ACTION ITEM' : 'DECISION'
      const date = r.recorded_at ? new Date(r.recorded_at as string).toLocaleDateString() : 'unknown date'
      const proj = r.project_name || r.project_code || 'unassigned'
      const content = (r.summary || (r.content as string)?.slice(0, 2000) || 'No content')
      const sim = searchMode === 'vector' ? ` [similarity: ${(r.relevance * 100).toFixed(0)}%]` : ''
      return `[${i + 1}] ${type} — "${r.title}" (${proj}, ${date})${sim}\n${content}\n`
    }).join('\n---\n')

    // Step 3: Call LLM to synthesize answer
    const systemPrompt = `You are an organizational intelligence assistant for ACT (A Curious Tractor), a social enterprise ecosystem. Answer questions using ONLY the provided context. Be specific, cite source numbers [1], [2], etc. If the context doesn't contain enough information, say so. Keep answers concise but thorough.`

    const userPrompt = `CONTEXT:\n${context}\n\nQUESTION: ${question}\n\nAnswer the question using the context above. Cite sources with [1], [2] etc.`

    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    let answer = "Could not generate answer — LLM unavailable."
    if (llmResponse.ok) {
      const llmData = await llmResponse.json()
      answer = llmData.choices?.[0]?.message?.content || answer
    }

    // Build source references
    const sources = results.map(r => ({
      id: r.id,
      title: r.title,
      type: r.knowledge_type,
      project: r.project_code,
      projectName: r.project_name,
      date: r.recorded_at,
      relevance: r.relevance,
    }))

    return NextResponse.json({
      success: true,
      answer,
      sources,
      question,
      searchMode,
      resultsSearched: results.length,
    })
  } catch (e) {
    console.error('Ask error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
