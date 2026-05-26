import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/knowledge/stats
 *
 * Returns memory system health: chunk counts, edge counts,
 * decay scores, embedding coverage, etc.
 */
export async function GET() {
  try {
    // Run all stat queries in parallel
    const [
      chunkStats,
      knowledgeStats,
      edgeStats,
      edgesByType,
      decayStats,
      consolidationStats,
      commEmbedded,
    ] = await Promise.all([
      supabase.from('knowledge_chunks').select('id', { count: 'exact', head: true }),
      supabase.from('project_knowledge').select('id', { count: 'exact', head: true }),
      supabase.from('knowledge_edges').select('id', { count: 'exact', head: true }),
      supabase.rpc('get_edge_type_counts').then(r => r, () => ({ data: null })),
      supabase.rpc('get_decay_stats').then(r => r, () => ({ data: null })),
      // memory_consolidation_log table removed from DB — returns 0 until a backend exists
      Promise.resolve({ count: 0 }),
      supabase
        .from('knowledge_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('source_type', 'communication'),
    ])

    // Count chunks with/without embeddings
    const [withEmbedding, withoutEmbedding] = await Promise.all([
      supabase
        .from('knowledge_chunks')
        .select('id', { count: 'exact', head: true })
        .not('embedding', 'is', null),
      supabase
        .from('knowledge_chunks')
        .select('id', { count: 'exact', head: true })
        .is('embedding', null),
    ])

    // Episode, procedural, and agent stats
    // procedural_memory, agent_working_memory, agent_learnings tables removed from DB — return 0 until a backend exists
    const [episodes, procedures, workingMemory, proposals, learnings] = await Promise.all([
      supabase.from('memory_episodes').select('id', { count: 'exact', head: true }),
      Promise.resolve({ count: 0 }),
      Promise.resolve({ count: 0 }),
      supabase.from('agent_proposals').select('id', { count: 'exact', head: true }),
      Promise.resolve({ count: 0 }),
    ])

    const stats = {
      chunks: {
        total: chunkStats.count || 0,
        withEmbedding: withEmbedding.count || 0,
        withoutEmbedding: withoutEmbedding.count || 0,
        coveragePercent: chunkStats.count
          ? Math.round(((withEmbedding.count || 0) / chunkStats.count) * 100)
          : 0,
      },
      knowledge: {
        total: knowledgeStats.count || 0,
      },
      graph: {
        totalEdges: edgeStats.count || 0,
        byType: edgesByType.data || [],
      },
      memory: {
        episodes: episodes.count || 0,
        procedures: procedures.count || 0,
        activeWorkingSessions: workingMemory.count || 0,
        consolidationEvents: consolidationStats.count || 0,
      },
      agents: {
        proposals: proposals.count || 0,
        learnings: learnings.count || 0,
      },
      communications: {
        embedded: commEmbedded.count || 0,
      },
      decay: decayStats.data || null,
    }

    return NextResponse.json({ success: true, stats })
  } catch (e) {
    console.error('Knowledge stats error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
