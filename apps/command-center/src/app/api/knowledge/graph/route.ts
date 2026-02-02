import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/knowledge/graph?nodeType=...&nodeId=...&depth=1|2
 *
 * Returns knowledge graph neighbors for a given node.
 * depth=1 uses get_knowledge_neighbors (1-hop)
 * depth=2 uses get_knowledge_subgraph (2-hop)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nodeType = searchParams.get('nodeType') || 'project_knowledge'
    const nodeId = searchParams.get('nodeId')
    const depth = parseInt(searchParams.get('depth') || '1')

    if (!nodeId) {
      return NextResponse.json(
        { success: false, error: 'nodeId is required' },
        { status: 400 }
      )
    }

    if (depth === 2) {
      const { data, error } = await supabase.rpc('get_knowledge_subgraph', {
        p_node_type: nodeType,
        p_node_id: nodeId,
        p_max_depth: 2,
        p_limit: 50,
      })
      if (error) throw error

      // Build nodes + edges from subgraph
      const nodesMap = new Map<string, { id: string; type: string }>()
      const edges: Array<{
        id: string
        edgeType: string
        sourceType: string
        sourceId: string
        targetType: string
        targetId: string
        strength: number
        direction: string
      }> = []

      // Add center node
      nodesMap.set(`${nodeType}:${nodeId}`, { id: nodeId, type: nodeType })

      for (const row of data || []) {
        nodesMap.set(`${row.neighbor_type}:${row.neighbor_id}`, {
          id: row.neighbor_id,
          type: row.neighbor_type,
        })
        edges.push({
          id: row.edge_id,
          edgeType: row.edge_type,
          sourceType: row.direction === 'outgoing' ? nodeType : row.neighbor_type,
          sourceId: row.direction === 'outgoing' ? nodeId : row.neighbor_id,
          targetType: row.direction === 'outgoing' ? row.neighbor_type : nodeType,
          targetId: row.direction === 'outgoing' ? row.neighbor_id : nodeId,
          strength: row.strength,
          direction: row.direction,
        })
      }

      return NextResponse.json({
        success: true,
        center: { id: nodeId, type: nodeType },
        nodes: Array.from(nodesMap.values()),
        edges,
        depth,
      })
    }

    // Default: 1-hop neighbors
    const { data, error } = await supabase.rpc('get_knowledge_neighbors', {
      p_node_type: nodeType,
      p_node_id: nodeId,
      p_limit: 30,
    })
    if (error) throw error

    const neighbors = (data || []).map((row: {
      edge_id: string
      edge_type: string
      neighbor_type: string
      neighbor_id: string
      direction: string
      strength: number
      confidence: number
      reasoning: string
    }) => ({
      edgeId: row.edge_id,
      edgeType: row.edge_type,
      neighborType: row.neighbor_type,
      neighborId: row.neighbor_id,
      direction: row.direction,
      strength: row.strength,
      confidence: row.confidence,
      reasoning: row.reasoning,
    }))

    return NextResponse.json({
      success: true,
      center: { id: nodeId, type: nodeType },
      neighbors,
      count: neighbors.length,
      depth: 1,
    })
  } catch (e) {
    console.error('Knowledge graph error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
