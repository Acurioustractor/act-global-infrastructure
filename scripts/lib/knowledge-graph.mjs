#!/usr/bin/env node
/**
 * Knowledge Graph: Edge Management & Traversal
 *
 * Creates and queries edges between knowledge items, entities,
 * decisions, and communications in the ACT ecosystem.
 *
 * Part of: Advanced Memory System (Phase 2)
 *
 * Usage:
 *   import { KnowledgeGraph } from './lib/knowledge-graph.mjs';
 *   const graph = new KnowledgeGraph();
 *   await graph.addEdge('project_knowledge', id1, 'entity', id2, 'about');
 *   const neighbors = await graph.getNeighbors('entity', entityId);
 */

import { createClient } from '@supabase/supabase-js';
import '../../lib/load-env.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const VALID_NODE_TYPES = [
  'knowledge_chunk', 'project_knowledge', 'decision_trace',
  'agent_learning', 'entity', 'communication',
  'calendar_event', 'grant', 'finance_item'
];

const VALID_EDGE_TYPES = [
  'derived_from', 'supports', 'contradicts', 'supersedes',
  'related_to', 'caused_by', 'about', 'decided_in',
  'learned_from', 'context_for',
  'mentioned_in', 'funded_by', 'scheduled_for', 'follows_up'
];

export class KnowledgeGraph {
  constructor(options = {}) {
    this.supabase = options.supabase || supabase;
    this.verbose = options.verbose || false;
    this.minAutoLinkConfidence = options.minAutoLinkConfidence || 0.5;
  }

  /**
   * Add an edge between two knowledge nodes
   */
  async addEdge(sourceType, sourceId, targetType, targetId, edgeType, metadata = {}) {
    if (!VALID_NODE_TYPES.includes(sourceType)) {
      throw new Error(`Invalid source type: ${sourceType}`);
    }
    if (!VALID_NODE_TYPES.includes(targetType)) {
      throw new Error(`Invalid target type: ${targetType}`);
    }
    if (!VALID_EDGE_TYPES.includes(edgeType)) {
      throw new Error(`Invalid edge type: ${edgeType}`);
    }

    const { data, error } = await this.supabase
      .from('knowledge_edges')
      .upsert({
        source_type: sourceType,
        source_id: sourceId,
        target_type: targetType,
        target_id: targetId,
        edge_type: edgeType,
        strength: metadata.strength || 0.5,
        confidence: metadata.confidence || 0.8,
        created_by: metadata.createdBy || 'knowledge-graph',
        reasoning: metadata.reasoning || null
      }, {
        onConflict: 'source_type,source_id,target_type,target_id,edge_type'
      })
      .select()
      .single();

    if (error) {
      // Duplicate edge is OK — just update strength
      if (error.code === '23505') {
        return this.updateEdgeStrength(sourceType, sourceId, targetType, targetId, edgeType, metadata.strength || 0.5);
      }
      throw error;
    }

    if (this.verbose) {
      console.log(`Edge: ${sourceType}:${sourceId} --[${edgeType}]--> ${targetType}:${targetId}`);
    }

    return data;
  }

  /**
   * Update the strength of an existing edge
   */
  async updateEdgeStrength(sourceType, sourceId, targetType, targetId, edgeType, newStrength) {
    const { data, error } = await this.supabase
      .from('knowledge_edges')
      .update({
        strength: newStrength,
        validated_at: new Date().toISOString()
      })
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('edge_type', edgeType)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get 1-hop neighbors for a node
   */
  async getNeighbors(nodeType, nodeId, options = {}) {
    const { data, error } = await this.supabase.rpc('get_knowledge_neighbors', {
      p_node_type: nodeType,
      p_node_id: nodeId,
      p_edge_types: options.edgeTypes || null,
      p_min_strength: options.minStrength || 0.0,
      p_limit: options.limit || 20
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get multi-hop subgraph around a node
   */
  async getSubgraph(nodeType, nodeId, options = {}) {
    const { data, error } = await this.supabase.rpc('get_knowledge_subgraph', {
      p_node_type: nodeType,
      p_node_id: nodeId,
      p_hops: options.hops || 2,
      p_min_strength: options.minStrength || 0.3,
      p_limit: options.limit || 50
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Auto-link a decision trace to referenced entities and knowledge
   *
   * After a decision is made, parse its context and create edges
   * to entities and knowledge items it references.
   */
  async autoLinkDecision(decisionTraceId) {
    const { data: decision, error } = await this.supabase
      .from('decision_traces')
      .select('*')
      .eq('id', decisionTraceId)
      .single();

    if (error || !decision) {
      console.warn(`Decision trace ${decisionTraceId} not found`);
      return [];
    }

    const edges = [];

    // Link to entities mentioned in input context
    const entityIds = this._extractEntityIds(decision.input_context);
    for (const entityId of entityIds) {
      const edge = await this.addEdge(
        'decision_trace', decisionTraceId,
        'entity', entityId,
        'about',
        {
          strength: 0.7,
          confidence: 0.9,
          createdBy: 'system:auto-link',
          reasoning: 'Entity referenced in decision context'
        }
      );
      edges.push(edge);
    }

    // Link to knowledge chunks in retrieved_context
    const knowledgeIds = this._extractKnowledgeIds(decision.retrieved_context);
    for (const knowledgeId of knowledgeIds) {
      const edge = await this.addEdge(
        'decision_trace', decisionTraceId,
        'project_knowledge', knowledgeId,
        'derived_from',
        {
          strength: 0.8,
          confidence: 0.85,
          createdBy: 'system:auto-link',
          reasoning: 'Knowledge used in decision context'
        }
      );
      edges.push(edge);
    }

    if (this.verbose) {
      console.log(`Auto-linked decision ${decisionTraceId}: ${edges.length} edges created`);
    }

    return edges;
  }

  /**
   * Auto-link a project_knowledge item to related items via vector similarity
   */
  async autoLinkKnowledge(projectKnowledgeId) {
    const { data: knowledge, error } = await this.supabase
      .from('project_knowledge')
      .select('id, embedding, project_code, knowledge_type')
      .eq('id', projectKnowledgeId)
      .single();

    if (error || !knowledge?.embedding) {
      return [];
    }

    // Find similar project_knowledge items
    const { data: similar } = await this.supabase
      .rpc('search_project_knowledge', {
        query_embedding: knowledge.embedding,
        match_threshold: 0.75,
        match_count: 5
      });

    const edges = [];
    for (const item of (similar || [])) {
      if (item.id === projectKnowledgeId) continue;

      const edge = await this.addEdge(
        'project_knowledge', projectKnowledgeId,
        'project_knowledge', item.id,
        'related_to',
        {
          strength: item.similarity || 0.5,
          confidence: this.minAutoLinkConfidence,
          createdBy: 'system:auto-link',
          reasoning: `Vector similarity: ${(item.similarity || 0).toFixed(3)}`
        }
      );
      edges.push(edge);
    }

    if (this.verbose) {
      console.log(`Auto-linked knowledge ${projectKnowledgeId}: ${edges.length} related items`);
    }

    return edges;
  }

  /**
   * Get graph connectivity score for a node
   * (Used by hybrid retrieval)
   */
  async getConnectivityScore(nodeType, nodeId, entityId = null) {
    const { data, error } = await this.supabase
      .from('knowledge_edges')
      .select('strength')
      .or(`and(source_type.eq.${nodeType},source_id.eq.${nodeId}),and(target_type.eq.${nodeType},target_id.eq.${nodeId})`)
      .gt('decay_score', 0.05);

    if (error || !data || data.length === 0) return 0;

    let avgStrength = data.reduce((s, e) => s + e.strength, 0) / data.length;

    // Boost if connected to the specified entity
    if (entityId) {
      const { data: entityEdges } = await this.supabase
        .from('knowledge_edges')
        .select('strength')
        .or(
          `and(source_id.eq.${nodeId},target_id.eq.${entityId}),and(source_id.eq.${entityId},target_id.eq.${nodeId})`
        );

      if (entityEdges && entityEdges.length > 0) {
        avgStrength *= 1.5; // 50% boost for entity connection
      }
    }

    return Math.min(avgStrength, 1.0);
  }

  /**
   * Get graph stats
   */
  async getStats() {
    const { count: edgeCount } = await this.supabase
      .from('knowledge_edges')
      .select('id', { count: 'exact', head: true });

    const { data: typeCounts } = await this.supabase
      .from('knowledge_edges')
      .select('edge_type')
      .limit(10000);

    const byType = {};
    (typeCounts || []).forEach(e => {
      byType[e.edge_type] = (byType[e.edge_type] || 0) + 1;
    });

    return { totalEdges: edgeCount || 0, byType };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  _extractEntityIds(context) {
    if (!context) return [];
    const ids = [];

    // Check for entity_id, entity_ids, or contact references
    if (context.entity_id) ids.push(context.entity_id);
    if (context.entity_ids) ids.push(...context.entity_ids);
    if (context.contact_id) ids.push(context.contact_id);

    // Recurse into nested objects
    if (typeof context === 'object') {
      for (const value of Object.values(context)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          ids.push(...this._extractEntityIds(value));
        }
      }
    }

    return [...new Set(ids)].filter(id => id && typeof id === 'string' && id.length > 10);
  }

  _extractKnowledgeIds(context) {
    if (!context) return [];
    const ids = [];

    if (context.knowledge_ids) ids.push(...context.knowledge_ids);
    if (context.chunk_ids) ids.push(...context.chunk_ids);
    if (Array.isArray(context)) {
      context.forEach(item => {
        if (item?.id) ids.push(item.id);
        if (item?.knowledge_id) ids.push(item.knowledge_id);
      });
    }

    return [...new Set(ids)].filter(id => id && typeof id === 'string' && id.length > 10);
  }
}

export default KnowledgeGraph;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const graph = new KnowledgeGraph({ verbose: true });

  console.log('Knowledge Graph');
  console.log('='.repeat(50));

  if (args.includes('--stats')) {
    const stats = await graph.getStats();
    console.log(`\nTotal edges: ${stats.totalEdges}`);
    console.log('\nBy type:');
    Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  } else if (args.includes('--neighbors') && args.length >= 4) {
    const nodeType = args[args.indexOf('--neighbors') + 1];
    const nodeId = args[args.indexOf('--neighbors') + 2];
    const neighbors = await graph.getNeighbors(nodeType, nodeId);
    console.log(`\nNeighbors of ${nodeType}:${nodeId}:`);
    neighbors.forEach((n, i) => {
      console.log(`  ${i + 1}. [${n.direction}] ${n.neighbor_type}:${n.neighbor_id} --${n.edge_type}--> (strength: ${n.strength})`);
    });
  } else if (args.includes('--auto-link-decision') && args.length >= 2) {
    const decisionId = args[args.indexOf('--auto-link-decision') + 1];
    const edges = await graph.autoLinkDecision(decisionId);
    console.log(`\nCreated ${edges.length} edges`);
  } else {
    console.log(`
Usage:
  node scripts/lib/knowledge-graph.mjs --stats                          Show graph stats
  node scripts/lib/knowledge-graph.mjs --neighbors <type> <id>         Get 1-hop neighbors
  node scripts/lib/knowledge-graph.mjs --auto-link-decision <id>       Auto-link a decision
`);
  }
}
