/**
 * Knowledge Search
 *
 * Unified search across all knowledge sources:
 * meetings, decisions, actions, notes, and the knowledge graph.
 */

export class KnowledgeSearch {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase
  }

  /**
   * Search across all knowledge sources.
   *
   * @param {string} query - Natural language search query
   * @param {object} [options]
   * @param {string} [options.projectCode] - Filter by project
   * @param {string} [options.type] - Filter by type
   * @param {number} [options.limit] - Max results (default: 10)
   * @param {boolean} [options.includeGraph] - Also search knowledge graph entities (default: true)
   * @returns {Promise<Array<{ id: string, title: string, type: string, snippet: string, score: number, source: string }>>}
   */
  async search(query, options = {}) {
    const { projectCode, type, limit = 10, includeGraph = true } = options
    const results = []

    // Search knowledge items (full-text)
    const knowledgeResults = await this._searchKnowledgeItems(query, { projectCode, type, limit })
    results.push(...knowledgeResults)

    // Search meetings
    const meetingResults = await this._searchMeetings(query, { projectCode, limit: Math.min(limit, 5) })
    results.push(...meetingResults)

    // Search knowledge graph entities
    if (includeGraph) {
      const graphResults = await this._searchGraph(query, { limit: Math.min(limit, 5) })
      results.push(...graphResults)
    }

    // Deduplicate and sort by score
    const seen = new Set()
    return results
      .filter(r => {
        if (seen.has(r.id)) return false
        seen.add(r.id)
        return true
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Search knowledge_items table.
   * @private
   */
  async _searchKnowledgeItems(query, { projectCode, type, limit }) {
    let q = this.supabase
      .from('knowledge_items')
      .select('id, title, type, content, project_code')
      .textSearch('content', query, { type: 'websearch' })
      .limit(limit)

    if (projectCode) q = q.eq('project_code', projectCode)
    if (type) q = q.eq('type', type)

    const { data, error } = await q
    if (error || !data) return []

    return data.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      snippet: (item.content || '').slice(0, 200),
      score: 0.8,
      source: 'knowledge_items',
    }))
  }

  /**
   * Search meetings table.
   * @private
   */
  async _searchMeetings(query, { projectCode, limit }) {
    let q = this.supabase
      .from('meetings')
      .select('id, title, summary, project_code, date')
      .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
      .order('date', { ascending: false })
      .limit(limit)

    if (projectCode) q = q.eq('project_code', projectCode)

    const { data, error } = await q
    if (error || !data) return []

    return data.map(m => ({
      id: m.id,
      title: m.title,
      type: 'meeting',
      snippet: (m.summary || '').slice(0, 200),
      score: 0.7,
      source: 'meetings',
    }))
  }

  /**
   * Search knowledge graph entities.
   * @private
   */
  async _searchGraph(query, { limit }) {
    const { data, error } = await this.supabase
      .from('knowledge_entities')
      .select('id, name, entity_type, metadata')
      .ilike('name', `%${query}%`)
      .limit(limit)

    if (error || !data) return []

    return data.map(e => ({
      id: e.id,
      title: e.name,
      type: `entity:${e.entity_type}`,
      snippet: `${e.entity_type}: ${e.name}`,
      score: 0.6,
      source: 'knowledge_graph',
    }))
  }
}
