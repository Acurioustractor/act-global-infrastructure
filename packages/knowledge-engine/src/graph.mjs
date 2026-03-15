/**
 * Knowledge Graph
 *
 * Manages entities and relationships extracted from knowledge items.
 * Stored in Supabase with support for graph traversal queries.
 */

export class KnowledgeGraph {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase
  }

  /**
   * Add entities to the graph.
   *
   * @param {Array<{ name: string, type: string, metadata?: object }>} entities
   * @param {string} sourceId - Knowledge item ID that produced these entities
   */
  async addEntities(entities, sourceId) {
    const records = entities.map(e => ({
      name: e.name,
      entity_type: e.type,
      source_id: sourceId,
      metadata: e.metadata || {},
    }))

    const { error } = await this.supabase
      .from('knowledge_entities')
      .upsert(records, { onConflict: 'name,entity_type' })

    if (error) {
      console.error('[KnowledgeGraph] Failed to add entities:', error.message)
    }
  }

  /**
   * Add relations between entities.
   *
   * @param {Array<{ from: string, to: string, type: string, metadata?: object }>} relations
   * @param {string} sourceId - Knowledge item ID that produced these relations
   */
  async addRelations(relations, sourceId) {
    const records = relations.map(r => ({
      from_entity: r.from,
      to_entity: r.to,
      relation_type: r.type,
      source_id: sourceId,
      metadata: r.metadata || {},
    }))

    const { error } = await this.supabase
      .from('knowledge_relations')
      .upsert(records, { onConflict: 'from_entity,to_entity,relation_type' })

    if (error) {
      console.error('[KnowledgeGraph] Failed to add relations:', error.message)
    }
  }

  /**
   * Get the knowledge graph for a specific project.
   *
   * @param {string} projectCode
   * @returns {Promise<{ nodes: Array, edges: Array }>}
   */
  async getProjectGraph(projectCode) {
    // Get entities linked to this project
    const { data: entities } = await this.supabase
      .from('knowledge_entities')
      .select('id, name, entity_type, metadata')
      .eq('metadata->>project_code', projectCode)

    if (!entities || entities.length === 0) {
      return { nodes: [], edges: [] }
    }

    const entityNames = entities.map(e => e.name)

    // Get relations involving these entities
    const { data: relations } = await this.supabase
      .from('knowledge_relations')
      .select('from_entity, to_entity, relation_type, metadata')
      .or(`from_entity.in.(${entityNames.join(',')}),to_entity.in.(${entityNames.join(',')})`)

    return {
      nodes: entities.map(e => ({
        id: e.id,
        label: e.name,
        type: e.entity_type,
        ...e.metadata,
      })),
      edges: (relations || []).map(r => ({
        from: r.from_entity,
        to: r.to_entity,
        label: r.relation_type,
        ...r.metadata,
      })),
    }
  }

  /**
   * Find entities connected to a given entity.
   *
   * @param {string} entityName
   * @param {number} [depth] - Traversal depth (default: 1)
   * @returns {Promise<Array<{ entity: string, relation: string, direction: 'from' | 'to' }>>}
   */
  async getConnected(entityName, depth = 1) {
    const { data: relations } = await this.supabase
      .from('knowledge_relations')
      .select('from_entity, to_entity, relation_type')
      .or(`from_entity.eq.${entityName},to_entity.eq.${entityName}`)

    if (!relations) return []

    return relations.map(r => ({
      entity: r.from_entity === entityName ? r.to_entity : r.from_entity,
      relation: r.relation_type,
      direction: r.from_entity === entityName ? 'to' : 'from',
    }))
  }
}
