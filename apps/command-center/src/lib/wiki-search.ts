import { supabase } from '@/lib/supabase'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

export interface HybridSearchResult {
  path: string
  title: string
  snippet: string
  section: string
  score: number
}

async function generateQueryEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
      dimensions: 384,
    }),
  })

  if (!response.ok) throw new Error(`OpenAI embeddings: ${response.status}`)

  const data = await response.json()
  return data.data[0].embedding
}

export async function hybridSearch(query: string, limit = 15): Promise<HybridSearchResult[]> {
  const embedding = await generateQueryEmbedding(query)

  const { data, error } = await supabase.rpc('wiki_hybrid_search', {
    query_text: query,
    query_embedding: embedding,
    match_count: limit,
    rrf_k: 60,
  })

  if (error) throw error
  if (!data || data.length === 0) return []

  return data.map((row: { article_path: string; title: string; snippet: string; section_id: string; rrf_score: number }) => ({
    path: row.article_path,
    title: row.title,
    snippet: (row.snippet || '').replace(/\*\*/g, ''),
    section: row.section_id,
    score: row.rrf_score,
  }))
}
