'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Brain,
  GitBranch,
  Loader2,
  MessageSquare,
  ListChecks,
  Gavel,
  Filter,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import {
  getKnowledgeGraphOverview,
  type KnowledgeGraphOverviewNode,
  type KnowledgeGraphOverviewEdge,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import { KnowledgeGraph } from '@/components/knowledge-graph'

export default function KnowledgeGraphPage() {
  const [projectFilter, setProjectFilter] = React.useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [selectedNode, setSelectedNode] = React.useState<KnowledgeGraphOverviewNode | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-graph-overview'],
    queryFn: () => getKnowledgeGraphOverview(),
  })

  // Extract unique project codes for filter
  const projectCodes = React.useMemo(() => {
    if (!data?.nodes) return []
    const codes = new Set<string>()
    for (const n of data.nodes) {
      if (n.projectCode) codes.add(n.projectCode)
    }
    return Array.from(codes).sort()
  }, [data])

  // Filter nodes and edges by project code
  const filtered = React.useMemo(() => {
    if (!data) return { nodes: [], edges: [] }
    if (!projectFilter) return { nodes: data.nodes, edges: data.edges }

    const filteredNodes = data.nodes.filter(
      (n) => n.projectCode === projectFilter || n.type === 'communication'
    )
    const nodeIds = new Set(filteredNodes.map((n) => n.id))
    const filteredEdges = data.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    )
    // Remove orphan communication nodes
    const connectedIds = new Set<string>()
    for (const e of filteredEdges) {
      connectedIds.add(e.source)
      connectedIds.add(e.target)
    }
    return {
      nodes: filteredNodes.filter((n) => connectedIds.has(n.id)),
      edges: filteredEdges,
    }
  }, [data, projectFilter])

  // Find edges connected to selected node
  const selectedNodeEdges = React.useMemo(() => {
    if (!selectedNode || !data) return []
    return data.edges.filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id
    )
  }, [selectedNode, data])

  // Find neighbor nodes of selected node
  const selectedNeighbors = React.useMemo(() => {
    if (!selectedNode || !data) return []
    const neighborIds = new Set<string>()
    for (const e of selectedNodeEdges) {
      if (e.source === selectedNode.id) neighborIds.add(e.target)
      else neighborIds.add(e.source)
    }
    return data.nodes.filter((n) => neighborIds.has(n.id))
  }, [selectedNode, selectedNodeEdges, data])

  // Fullscreen toggle
  const toggleFullscreen = React.useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }, [])

  React.useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const typeConfig: Record<string, { icon: typeof Brain; color: string; label: string }> = {
    meeting: { icon: MessageSquare, color: 'text-blue-400', label: 'Meeting' },
    action: { icon: ListChecks, color: 'text-emerald-400', label: 'Action' },
    decision: { icon: Gavel, color: 'text-amber-400', label: 'Decision' },
    communication: { icon: Brain, color: 'text-violet-400', label: 'Communication' },
  }

  return (
    <div ref={containerRef} className={cn('min-h-screen flex flex-col', isFullscreen && 'bg-[#0a0a0f]')}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link
            href="/knowledge"
            className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-violet-400" />
              Knowledge Graph
            </h1>
            {data?.stats && (
              <p className="text-xs text-white/40">
                {filtered.nodes.length} nodes &middot; {filtered.edges.length} edges
                {projectFilter && (
                  <span className="text-violet-400 ml-1">
                    (filtered: {projectFilter})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Project filter */}
          <div className="relative">
            <select
              value={projectFilter || ''}
              onChange={(e) => setProjectFilter(e.target.value || null)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-8 text-xs text-white focus:outline-none focus:border-violet-500/50"
            >
              <option value="">All Projects</option>
              {projectCodes.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Graph */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          ) : filtered.nodes.length > 0 ? (
            <KnowledgeGraph
              nodes={filtered.nodes}
              edges={filtered.edges}
              className="w-full h-full min-h-[600px]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <GitBranch className="h-12 w-12 mb-3" />
              <p className="text-sm">No graph data available</p>
              {projectFilter && (
                <button
                  onClick={() => setProjectFilter(null)}
                  className="mt-2 text-xs text-violet-400 hover:text-violet-300"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Detail panel (shown when node selected) */}
        {selectedNode && (
          <div className="w-80 border-l border-white/5 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Node Details</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="h-4 w-4 text-white/40" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Node info */}
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const config = typeConfig[selectedNode.knowledgeType || selectedNode.type]
                    const Icon = config?.icon || Brain
                    return <Icon className={cn('h-4 w-4', config?.color || 'text-white/50')} />
                  })()}
                  <span className="text-xs text-white/50 capitalize">
                    {selectedNode.knowledgeType || selectedNode.type}
                  </span>
                </div>
                <p className="text-sm text-white">{selectedNode.label}</p>
                {selectedNode.projectCode && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-violet-500/20 text-xs text-violet-400">
                    {selectedNode.projectCode}
                  </span>
                )}
              </div>

              {/* Connected edges */}
              <div>
                <h4 className="text-xs text-white/40 mb-2">
                  Connections ({selectedNodeEdges.length})
                </h4>
                <div className="space-y-1.5">
                  {selectedNodeEdges.map((edge) => {
                    const isSource = edge.source === selectedNode.id
                    const neighborId = isSource ? edge.target : edge.source
                    const neighbor = selectedNeighbors.find((n) => n.id === neighborId)
                    if (!neighbor) return null

                    return (
                      <button
                        key={edge.id}
                        onClick={() => setSelectedNode(neighbor)}
                        className="w-full text-left p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/30 shrink-0">
                            {isSource ? '→' : '←'}
                          </span>
                          <span className="text-xs text-white truncate flex-1">
                            {neighbor.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 ml-4">
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/40">
                            {edge.edgeType.replace(/_/g, ' ')}
                          </span>
                          {edge.reasoning && (
                            <span className="text-[10px] text-white/20 truncate">
                              {edge.reasoning}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
