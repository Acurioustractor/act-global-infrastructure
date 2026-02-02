import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/knowledge/graph/overview
 *
 * Returns the full knowledge graph for visualization:
 * - All edges from knowledge_edges
 * - Node metadata (title, type) from project_knowledge
 * - Aggregated into a force-graph-ready format
 *
 * Query params:
 *   edgeType - filter to specific edge type (derived_from, context_for, decided_in)
 *   limit    - max edges to return (default 500)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const edgeType = searchParams.get('edgeType')
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000)

    // Fetch edges
    let edgeQuery = supabase
      .from('knowledge_edges')
      .select('id, source_type, source_id, target_type, target_id, edge_type, strength, confidence, reasoning, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (edgeType) {
      edgeQuery = edgeQuery.eq('edge_type', edgeType)
    }

    const { data: edges, error: edgesError } = await edgeQuery
    if (edgesError) throw edgesError

    // Collect unique node IDs
    const nodeKeys = new Set<string>()
    const knowledgeIds = new Set<string>()

    for (const edge of edges || []) {
      nodeKeys.add(`${edge.source_type}::${edge.source_id}`)
      nodeKeys.add(`${edge.target_type}::${edge.target_id}`)
      if (edge.source_type === 'project_knowledge') knowledgeIds.add(edge.source_id)
      if (edge.target_type === 'project_knowledge') knowledgeIds.add(edge.target_id)
    }

    // Fetch titles for project_knowledge nodes
    const knowledgeIdArray = Array.from(knowledgeIds)
    const titleMap = new Map<string, { title: string; knowledge_type: string; project_code: string | null }>()

    if (knowledgeIdArray.length > 0) {
      // Supabase .in() has a limit, batch if needed
      const batchSize = 200
      for (let i = 0; i < knowledgeIdArray.length; i += batchSize) {
        const batch = knowledgeIdArray.slice(i, i + batchSize)
        const { data: knowledgeData } = await supabase
          .from('project_knowledge')
          .select('id, title, knowledge_type, project_code')
          .in('id', batch)

        for (const k of knowledgeData || []) {
          titleMap.set(k.id, {
            title: k.title,
            knowledge_type: k.knowledge_type,
            project_code: k.project_code,
          })
        }
      }
    }

    // Build nodes array
    const nodes = Array.from(nodeKeys).map((key) => {
      const [type, id] = key.split('::')
      const meta = titleMap.get(id)
      return {
        id: key,
        nodeId: id,
        type,
        label: meta?.title || (type === 'communication' ? 'Communication' : id.slice(0, 8)),
        knowledgeType: meta?.knowledge_type || null,
        projectCode: meta?.project_code || null,
      }
    })

    // Build edges array (referencing composite keys)
    const graphEdges = (edges || []).map((e) => ({
      id: e.id,
      source: `${e.source_type}::${e.source_id}`,
      target: `${e.target_type}::${e.target_id}`,
      edgeType: e.edge_type,
      strength: e.strength,
      confidence: e.confidence,
      reasoning: e.reasoning,
    }))

    // Summary stats
    const edgeTypeCounts: Record<string, number> = {}
    const nodeTypeCounts: Record<string, number> = {}
    for (const e of graphEdges) {
      edgeTypeCounts[e.edgeType] = (edgeTypeCounts[e.edgeType] || 0) + 1
    }
    for (const n of nodes) {
      nodeTypeCounts[n.type] = (nodeTypeCounts[n.type] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      nodes,
      edges: graphEdges,
      stats: {
        nodeCount: nodes.length,
        edgeCount: graphEdges.length,
        edgeTypes: edgeTypeCounts,
        nodeTypes: nodeTypeCounts,
      },
    })
  } catch (e) {
    console.error('Knowledge graph overview error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 },
    )
  }
}
