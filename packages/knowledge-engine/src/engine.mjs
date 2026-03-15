/**
 * Knowledge Engine - Core orchestrator
 *
 * Coordinates between graph, extraction, memory, and search subsystems.
 */

import { KnowledgeGraph } from './graph.mjs'
import { KnowledgeExtractor } from './extractor.mjs'
import { MemorySystem } from './memory.mjs'
import { KnowledgeSearch } from './search.mjs'

export class KnowledgeEngine {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   * @param {object} [options]
   * @param {object} [options.llm] - LLM client for extraction (e.g. Anthropic)
   */
  constructor(supabase, options = {}) {
    this.supabase = supabase
    this.graph = new KnowledgeGraph(supabase)
    this.extractor = new KnowledgeExtractor(supabase, options.llm)
    this.memory = new MemorySystem(supabase)
    this.search = new KnowledgeSearch(supabase)
  }

  /**
   * Ingest a knowledge item through the full pipeline:
   * extract → store → index → link to graph
   *
   * @param {object} item
   * @param {string} item.type - 'meeting' | 'decision' | 'action' | 'note' | 'document'
   * @param {string} item.content - Raw text content
   * @param {string} [item.title] - Title or subject
   * @param {string} [item.projectCode] - Project code (e.g. 'ACT-JH')
   * @param {object} [item.metadata] - Additional metadata
   * @returns {Promise<{ id: string, entities: Array, relations: Array }>}
   */
  async ingest(item) {
    // 1. Extract structured knowledge
    const extracted = await this.extractor.extract(item.content, {
      type: item.type,
      projectCode: item.projectCode,
    })

    // 2. Store the knowledge item
    const { data, error } = await this.supabase
      .from('knowledge_items')
      .upsert({
        title: item.title || extracted.title,
        content: item.content,
        type: item.type,
        project_code: item.projectCode,
        entities: extracted.entities,
        relations: extracted.relations,
        key_phrases: extracted.keyPhrases,
        metadata: { ...item.metadata, extracted_at: new Date().toISOString() },
      }, { onConflict: 'title' })
      .select()
      .single()

    if (error) {
      console.error('[KnowledgeEngine] Failed to store item:', error.message)
      return { id: null, entities: [], relations: [] }
    }

    // 3. Update the knowledge graph
    if (extracted.entities.length > 0) {
      await this.graph.addEntities(extracted.entities, data.id)
    }
    if (extracted.relations.length > 0) {
      await this.graph.addRelations(extracted.relations, data.id)
    }

    // 4. Record in episodic memory
    await this.memory.recordEpisode({
      type: item.type,
      sourceId: data.id,
      summary: extracted.summary || item.title,
      projectCode: item.projectCode,
    })

    return {
      id: data.id,
      entities: extracted.entities,
      relations: extracted.relations,
    }
  }

  /**
   * Search across all knowledge sources.
   *
   * @param {string} query - Natural language search query
   * @param {object} [options]
   * @param {string} [options.projectCode] - Filter by project
   * @param {string} [options.type] - Filter by item type
   * @param {number} [options.limit] - Max results (default: 10)
   * @returns {Promise<Array>}
   */
  async search(query, options = {}) {
    return this.search.search(query, options)
  }

  /**
   * Get the knowledge graph for a project.
   *
   * @param {string} projectCode
   * @returns {Promise<{ nodes: Array, edges: Array }>}
   */
  async getGraph(projectCode) {
    return this.graph.getProjectGraph(projectCode)
  }

  /**
   * Get recent memories for context building.
   *
   * @param {object} [options]
   * @param {number} [options.hours] - Lookback window (default: 24)
   * @param {string} [options.projectCode] - Filter by project
   * @returns {Promise<Array>}
   */
  async getRecentContext(options = {}) {
    return this.memory.getRecentEpisodes(options)
  }
}
