#!/usr/bin/env node
/**
 * Memory Lifecycle: Consolidation & Decay Engine
 *
 * Manages the lifecycle of knowledge in the ACT system:
 * - Decay: Reduces relevance scores over time for stale knowledge
 * - Consolidation: Merges similar chunks, promotes raw → structured
 * - Access tracking: Records retrieval to maintain freshness
 *
 * Part of: Advanced Memory System (Phase 1)
 *
 * Usage:
 *   import { MemoryLifecycle } from './lib/memory-lifecycle.mjs';
 *   const lifecycle = new MemoryLifecycle();
 *   await lifecycle.runDecayCycle();
 *   await lifecycle.findConsolidationCandidates();
 *
 * CLI:
 *   node scripts/lib/memory-lifecycle.mjs --run-decay
 *   node scripts/lib/memory-lifecycle.mjs --consolidate
 *   node scripts/lib/memory-lifecycle.mjs --stats
 */

import { createClient } from '@supabase/supabase-js';
import '../../lib/load-env.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export class MemoryLifecycle {
  constructor(options = {}) {
    this.supabase = options.supabase || supabase;
    this.verbose = options.verbose || false;
    this.similarityThreshold = options.similarityThreshold || 0.85;
    this.minChunksForConsolidation = options.minChunksForConsolidation || 3;
  }

  /**
   * Record an access to a knowledge item (bumps counters)
   */
  async recordAccess(table, id) {
    const { error } = await this.supabase.rpc('record_memory_access', {
      p_table: table,
      p_id: id
    });
    if (error) {
      console.warn(`Failed to record access for ${table}:${id}:`, error.message);
    }
  }

  /**
   * Record access for multiple items at once
   */
  async recordBatchAccess(items) {
    const promises = items.map(({ table, id }) =>
      this.recordAccess(table, id)
    );
    await Promise.allSettled(promises);
  }

  /**
   * Run the decay cycle — updates all decay scores
   */
  async runDecayCycle() {
    if (this.verbose) {
      console.log('Running memory decay cycle...');
    }

    const { data, error } = await this.supabase.rpc('run_memory_decay');

    if (error) {
      console.error('Decay cycle failed:', error.message);
      throw error;
    }

    const result = data?.[0] || data;
    if (this.verbose) {
      console.log(`Decay cycle complete:`);
      console.log(`  Chunks updated: ${result?.updated_chunks || 0}`);
      console.log(`  Knowledge updated: ${result?.updated_knowledge || 0}`);
      console.log(`  Archived: ${result?.archived || 0}`);
    }

    return result;
  }

  /**
   * Find near-duplicate knowledge chunks that could be consolidated
   */
  async findConsolidationCandidates(limit = 20) {
    // Find chunks with similar embeddings using vector search
    const { data: chunks, error } = await this.supabase
      .from('knowledge_chunks')
      .select('id, content, embedding, confidence, source_type, access_count, decay_score')
      .is('consolidated_into', null)
      .gt('decay_score', 0.1)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch chunks:', error.message);
      return [];
    }

    if (!chunks || chunks.length < 2) {
      if (this.verbose) console.log('Not enough chunks for consolidation.');
      return [];
    }

    // Group similar chunks by finding near-duplicates
    const candidates = [];
    const processed = new Set();

    for (const chunk of chunks) {
      if (processed.has(chunk.id) || !chunk.embedding) continue;

      // Find similar chunks via vector search
      const { data: similar, error: searchError } = await this.supabase
        .rpc('find_similar_chunks', {
          query_embedding: chunk.embedding,
          match_threshold: this.similarityThreshold,
          match_count: 10,
          exclude_id: chunk.id
        });

      if (searchError) {
        // Fallback: manual search if RPC not available
        continue;
      }

      const group = (similar || [])
        .filter(s => !processed.has(s.id) && s.id !== chunk.id)
        .map(s => s.id);

      if (group.length >= this.minChunksForConsolidation - 1) {
        const allIds = [chunk.id, ...group];
        allIds.forEach(id => processed.add(id));
        candidates.push({
          primaryChunkId: chunk.id,
          relatedChunkIds: group,
          totalChunks: allIds.length,
          primaryContent: chunk.content?.substring(0, 200)
        });
      }

      if (candidates.length >= limit) break;
    }

    if (this.verbose) {
      console.log(`Found ${candidates.length} consolidation candidate groups`);
      candidates.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.totalChunks} chunks — "${c.primaryContent?.substring(0, 80)}..."`);
      });
    }

    return candidates;
  }

  /**
   * Consolidate a group of similar chunks into one project_knowledge entry
   */
  async consolidateChunks(chunkIds, metadata = {}) {
    if (!chunkIds || chunkIds.length < 2) {
      throw new Error('Need at least 2 chunk IDs to consolidate');
    }

    // Fetch all chunks
    const { data: chunks, error } = await this.supabase
      .from('knowledge_chunks')
      .select('id, content, confidence, source_type, embedding, created_at')
      .in('id', chunkIds);

    if (error) throw error;
    if (!chunks || chunks.length < 2) {
      throw new Error('Could not fetch enough chunks');
    }

    // Merge content (take the most confident + comprehensive)
    const sorted = chunks.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const primary = sorted[0];

    // Build merged content
    const mergedContent = sorted.map(c => c.content).join('\n\n---\n\n');
    const avgConfidence = sorted.reduce((s, c) => s + (c.confidence || 0.5), 0) / sorted.length;

    // Create project_knowledge entry
    const { data: knowledge, error: insertError } = await this.supabase
      .from('project_knowledge')
      .insert({
        title: metadata.title || `Consolidated: ${primary.content?.substring(0, 60)}...`,
        content: mergedContent,
        knowledge_type: metadata.knowledgeType || 'insight',
        importance: metadata.importance || 'normal',
        confidence: Math.min(avgConfidence + 0.1, 1.0), // Boost for consolidation
        embedding: primary.embedding,
        consolidation_source_ids: chunkIds,
        provenance: {
          consolidated_from: chunkIds.length,
          consolidated_at: new Date().toISOString(),
          agent_id: metadata.agentId || 'memory-lifecycle',
          source_types: [...new Set(sorted.map(c => c.source_type))]
        }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Mark source chunks as consolidated
    const { error: updateError } = await this.supabase
      .from('knowledge_chunks')
      .update({ consolidated_into: knowledge.id })
      .in('id', chunkIds);

    if (updateError) {
      console.error('Failed to mark chunks as consolidated:', updateError.message);
    }

    // Log the consolidation
    await this.supabase.from('memory_consolidation_log').insert({
      consolidation_type: 'merge',
      source_ids: chunkIds,
      target_id: knowledge.id,
      agent_id: metadata.agentId || 'memory-lifecycle',
      reasoning: metadata.reasoning || `Merged ${chunkIds.length} similar chunks`,
      confidence_before: avgConfidence,
      confidence_after: knowledge.confidence
    });

    if (this.verbose) {
      console.log(`Consolidated ${chunkIds.length} chunks → ${knowledge.id}`);
    }

    return knowledge;
  }

  /**
   * Promote a single raw chunk to project_knowledge
   */
  async promoteChunk(chunkId, knowledgeType = 'insight', metadata = {}) {
    const { data: chunk, error } = await this.supabase
      .from('knowledge_chunks')
      .select('*')
      .eq('id', chunkId)
      .single();

    if (error) throw error;

    const { data: knowledge, error: insertError } = await this.supabase
      .from('project_knowledge')
      .insert({
        title: metadata.title || chunk.content?.substring(0, 100),
        content: chunk.content,
        knowledge_type: knowledgeType,
        importance: metadata.importance || 'normal',
        confidence: chunk.confidence || 0.7,
        embedding: chunk.embedding,
        project_code: metadata.projectCode,
        consolidation_source_ids: [chunkId],
        provenance: {
          promoted_from: chunkId,
          promoted_at: new Date().toISOString(),
          agent_id: metadata.agentId || 'memory-lifecycle',
          original_source: chunk.source_type
        }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Mark chunk as consolidated
    await this.supabase
      .from('knowledge_chunks')
      .update({ consolidated_into: knowledge.id })
      .eq('id', chunkId);

    // Log
    await this.supabase.from('memory_consolidation_log').insert({
      consolidation_type: 'promote',
      source_ids: [chunkId],
      target_id: knowledge.id,
      agent_id: metadata.agentId || 'memory-lifecycle',
      reasoning: metadata.reasoning || 'Promoted raw chunk to structured knowledge',
      confidence_before: chunk.confidence,
      confidence_after: knowledge.confidence
    });

    if (this.verbose) {
      console.log(`Promoted chunk ${chunkId} → ${knowledge.id}`);
    }

    return knowledge;
  }

  /**
   * Record that new evidence strengthens existing knowledge
   */
  async strengthenKnowledge(knowledgeId, evidence = {}) {
    const { error } = await this.supabase
      .from('project_knowledge')
      .update({
        validation_count: this.supabase.rpc ? undefined : undefined, // handled via SQL
        access_count: this.supabase.rpc ? undefined : undefined
      })
      .eq('id', knowledgeId);

    // Use raw SQL for atomic increment
    const { error: rpcError } = await this.supabase.rpc('record_memory_access', {
      p_table: 'project_knowledge',
      p_id: knowledgeId
    });

    // Increment validation_count
    const { error: valError } = await this.supabase
      .from('project_knowledge')
      .update({
        validation_count: this.supabase.sql`validation_count + 1`
      })
      .eq('id', knowledgeId);

    // Log consolidation
    await this.supabase.from('memory_consolidation_log').insert({
      consolidation_type: 'strengthen',
      source_ids: evidence.sourceIds || [],
      target_id: knowledgeId,
      agent_id: evidence.agentId || 'memory-lifecycle',
      reasoning: evidence.reasoning || 'New evidence supports existing knowledge'
    });

    if (this.verbose) {
      console.log(`Strengthened knowledge ${knowledgeId}`);
    }
  }

  /**
   * Record that new evidence contradicts existing knowledge
   */
  async contradictKnowledge(knowledgeId, evidence = {}) {
    const { error } = await this.supabase
      .from('project_knowledge')
      .update({
        contradiction_count: this.supabase.sql`contradiction_count + 1`
      })
      .eq('id', knowledgeId);

    await this.supabase.from('memory_consolidation_log').insert({
      consolidation_type: 'contradict',
      source_ids: evidence.sourceIds || [],
      target_id: knowledgeId,
      agent_id: evidence.agentId || 'memory-lifecycle',
      reasoning: evidence.reasoning || 'New evidence contradicts existing knowledge'
    });

    if (this.verbose) {
      console.log(`Recorded contradiction for knowledge ${knowledgeId}`);
    }
  }

  /**
   * Supersede old knowledge with new knowledge
   */
  async supersedeKnowledge(oldId, newId, reasoning = '') {
    await this.supabase
      .from('project_knowledge')
      .update({ superseded_by: newId })
      .eq('id', oldId);

    await this.supabase.from('memory_consolidation_log').insert({
      consolidation_type: 'supersede',
      source_ids: [oldId],
      target_id: newId,
      reasoning: reasoning || 'Knowledge superseded by newer version'
    });

    if (this.verbose) {
      console.log(`Knowledge ${oldId} superseded by ${newId}`);
    }
  }

  /**
   * Get memory system stats
   */
  async getStats() {
    const [chunks, knowledge, logs] = await Promise.all([
      this.supabase.from('knowledge_chunks').select('id, decay_score, consolidated_into', { count: 'exact', head: true }),
      this.supabase.from('project_knowledge').select('id, decay_score, superseded_by', { count: 'exact', head: true }),
      this.supabase.from('memory_consolidation_log').select('consolidation_type', { count: 'exact', head: true })
    ]);

    // Get decay distribution
    const { data: decayDist } = await this.supabase
      .from('knowledge_chunks')
      .select('decay_score')
      .is('consolidated_into', null)
      .limit(1000);

    const scores = (decayDist || []).map(d => d.decay_score || 1.0);
    const fresh = scores.filter(s => s > 0.7).length;
    const aging = scores.filter(s => s > 0.3 && s <= 0.7).length;
    const stale = scores.filter(s => s <= 0.3).length;

    return {
      totalChunks: chunks.count || 0,
      totalKnowledge: knowledge.count || 0,
      totalConsolidations: logs.count || 0,
      decayDistribution: {
        fresh: fresh,
        aging: aging,
        stale: stale,
        total: scores.length
      }
    };
  }
}

export default MemoryLifecycle;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const lifecycle = new MemoryLifecycle({ verbose: true });

  console.log('Memory Lifecycle Engine');
  console.log('='.repeat(50));

  if (args.includes('--run-decay')) {
    console.log('\nRunning decay cycle...\n');
    const result = await lifecycle.runDecayCycle();
    console.log('\nDone:', JSON.stringify(result, null, 2));
  } else if (args.includes('--consolidate')) {
    console.log('\nFinding consolidation candidates...\n');
    const candidates = await lifecycle.findConsolidationCandidates();
    console.log(`\nFound ${candidates.length} candidate groups`);
  } else if (args.includes('--stats')) {
    console.log('\nMemory System Stats:\n');
    const stats = await lifecycle.getStats();
    console.log(`  Knowledge chunks: ${stats.totalChunks}`);
    console.log(`  Project knowledge: ${stats.totalKnowledge}`);
    console.log(`  Consolidation logs: ${stats.totalConsolidations}`);
    console.log(`  Decay distribution:`);
    console.log(`    Fresh (>0.7): ${stats.decayDistribution.fresh}`);
    console.log(`    Aging (0.3-0.7): ${stats.decayDistribution.aging}`);
    console.log(`    Stale (<0.3): ${stats.decayDistribution.stale}`);
  } else {
    console.log(`
Usage:
  node scripts/lib/memory-lifecycle.mjs --run-decay      Run decay cycle
  node scripts/lib/memory-lifecycle.mjs --consolidate    Find consolidation candidates
  node scripts/lib/memory-lifecycle.mjs --stats          Show memory stats
`);
  }
}
