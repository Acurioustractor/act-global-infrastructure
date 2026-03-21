/**
 * Knowledge search — text search across project_knowledge with optional
 * knowledge_links graph enrichment.
 *
 * Merges agent-tools (executeSearchKnowledge) and
 * Notion Workers (search_knowledge_graph).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface KnowledgeSearchOptions {
  query: string
  project_code?: string
  limit?: number
  includeLinks?: boolean
}

export interface KnowledgeSearchEntry {
  id: string
  project_code: string
  type: string
  title: string
  summary: string | null
  key_points: string | null
  content_preview: string | null
  participants: string[] | null
  action_required: boolean | null
  follow_up_date: string | null
  importance: string | null
  recorded_at: string
  topics: string[] | null
  links: Array<{ link_type: string; reason: string | null }> | null
}

export interface KnowledgeSearchResult {
  query: string
  project_code: string
  count: number
  items: KnowledgeSearchEntry[]
}

export async function searchKnowledge(
  supabase: SupabaseQueryClient,
  opts: KnowledgeSearchOptions
): Promise<KnowledgeSearchResult> {
  const { query, limit = 10, includeLinks = false } = opts
  const searchTerm = `%${query}%`

  let dbQuery = supabase
    .from('project_knowledge')
    .select('id, project_code, knowledge_type, title, summary, content, key_points, participants, action_required, follow_up_date, importance, recorded_at, topics')
    .or(`title.ilike.${searchTerm},content.ilike.${searchTerm},summary.ilike.${searchTerm},key_points.ilike.${searchTerm}`)
    .order('recorded_at', { ascending: false })
    .limit(limit)

  if (opts.project_code) {
    dbQuery = dbQuery.eq('project_code', opts.project_code.toUpperCase())
  }

  const { data, error } = await dbQuery
  if (error) throw new Error(`Knowledge search failed: ${error.message}`)

  const rows = (data || []) as Array<Record<string, unknown>>

  // Optionally fetch knowledge_links for top results
  let linksMap: Record<string, Array<{ link_type: string; reason: string | null }>> = {}
  if (includeLinks && rows.length > 0) {
    const topIds = rows.slice(0, 3).map((d) => d.id as string)
    const { data: links } = await supabase
      .from('knowledge_links')
      .select('source_id, target_id, link_type, reason')
      .or(`source_id.in.(${topIds.join(',')}),target_id.in.(${topIds.join(',')})`)
      .limit(10)

    for (const link of ((links || []) as Array<Record<string, unknown>>)) {
      const sourceId = link.source_id as string
      const targetId = link.target_id as string
      const entry = { link_type: link.link_type as string, reason: link.reason as string | null }
      for (const id of topIds) {
        if (sourceId === id || targetId === id) {
          if (!linksMap[id]) linksMap[id] = []
          linksMap[id].push(entry)
        }
      }
    }
  }

  const items: KnowledgeSearchEntry[] = rows.map((k) => ({
    id: k.id as string,
    project_code: k.project_code as string,
    type: k.knowledge_type as string,
    title: k.title as string,
    summary: k.summary as string | null,
    key_points: k.key_points as string | null,
    content_preview: k.content ? (k.content as string).substring(0, 200) : null,
    participants: k.participants as string[] | null,
    action_required: k.action_required as boolean | null,
    follow_up_date: k.follow_up_date as string | null,
    importance: k.importance as string | null,
    recorded_at: k.recorded_at as string,
    topics: k.topics as string[] | null,
    links: linksMap[k.id as string] || null,
  }))

  return {
    query,
    project_code: opts.project_code || 'all',
    count: items.length,
    items,
  }
}
