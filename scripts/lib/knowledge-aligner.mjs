/**
 * Knowledge Aligner: Cross-Source Vector Similarity Matching
 *
 * Finds connections between knowledge_chunks from different sources
 * (meetings, emails, actions, decisions) and creates knowledge_edges.
 *
 * Usage:
 *   import { KnowledgeAligner } from './lib/knowledge-aligner.mjs';
 *   const aligner = new KnowledgeAligner();
 *   const results = await aligner.runAlignment(24); // last 24 hours
 */

import { createClient } from '@supabase/supabase-js';
import '../../lib/load-env.mjs';
import { KnowledgeGraph } from './knowledge-graph.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export class KnowledgeAligner {
  constructor(options = {}) {
    this.supabase = options.supabase || supabase;
    this.graph = new KnowledgeGraph({ supabase: this.supabase });
    this.verbose = options.verbose || false;
    this.similarityThreshold = options.similarityThreshold || 0.75;
    this.maxEdgesPerRun = options.maxEdgesPerRun || 50;
  }

  /**
   * Run alignment on recently added/updated knowledge chunks
   * @param {number} hoursBack - How far back to look
   * @returns {{ processed: number, edgesCreated: number }}
   */
  async runAlignment(hoursBack = 24) {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    // Get recent chunks with embeddings
    const { data: recentChunks, error } = await this.supabase
      .from('knowledge_chunks')
      .select('id, knowledge_type, title, source_type, project_id, embedding')
      .gt('created_at', since)
      .not('embedding', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Aligner] Failed to fetch chunks:', error.message);
      return { processed: 0, edgesCreated: 0 };
    }

    if (!recentChunks || recentChunks.length === 0) {
      if (this.verbose) console.log('[Aligner] No recent chunks to align');
      return { processed: 0, edgesCreated: 0 };
    }

    if (this.verbose) console.log(`[Aligner] Processing ${recentChunks.length} recent chunks`);

    let edgesCreated = 0;

    for (const chunk of recentChunks) {
      if (edgesCreated >= this.maxEdgesPerRun) break;

      // Find similar chunks from OTHER sources
      const { data: similar } = await this.supabase.rpc('match_knowledge_chunks', {
        query_embedding: chunk.embedding,
        match_threshold: this.similarityThreshold,
        match_count: 5,
      });

      if (!similar) continue;

      for (const match of similar) {
        // Skip self and same-source matches
        if (match.id === chunk.id) continue;
        if (match.source_type === chunk.source_type && match.knowledge_type === chunk.knowledge_type) continue;

        // Determine edge type
        const edgeType = this.inferEdgeType(chunk, match);

        try {
          await this.graph.addEdge(
            'knowledge_chunk', chunk.id,
            'knowledge_chunk', match.id,
            edgeType,
            {
              strength: match.similarity || 0.8,
              confidence: match.similarity || 0.8,
              createdBy: 'knowledge-aligner',
              reasoning: `Cross-source alignment: ${chunk.source_type || chunk.knowledge_type} ↔ ${match.source_type || match.knowledge_type} (${((match.similarity || 0.8) * 100).toFixed(0)}% similar)`,
            }
          );
          edgesCreated++;
        } catch (err) {
          // Duplicate edge — skip
          if (!err.message?.includes('duplicate')) {
            console.error(`[Aligner] Edge creation failed:`, err.message);
          }
        }
      }
    }

    if (this.verbose) {
      console.log(`[Aligner] Processed ${recentChunks.length} chunks, created ${edgesCreated} edges`);
    }

    return { processed: recentChunks.length, edgesCreated };
  }

  /**
   * Infer edge type from source/target metadata
   */
  inferEdgeType(source, target) {
    const types = [source.knowledge_type, target.knowledge_type].sort();

    if (types.includes('action') && types.includes('meeting')) return 'derived_from';
    if (types.includes('decision') && types.includes('meeting')) return 'decided_in';
    if (types.includes('communication')) return 'mentioned_in';
    if (types.includes('action')) return 'follows_up';
    return 'related_to';
  }
}

export default KnowledgeAligner;
