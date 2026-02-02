'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────

interface GraphNode {
  id: string
  nodeId: string
  type: string
  label: string
  knowledgeType: string | null
  projectCode: string | null
  // Simulation fields
  x: number
  y: number
  vx: number
  vy: number
  fx?: number | null
  fy?: number | null
}

interface GraphEdge {
  id: string
  source: string
  target: string
  edgeType: string
  strength: number
  confidence: number
  reasoning: string
}

interface KnowledgeGraphProps {
  nodes: Array<Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy'>>
  edges: GraphEdge[]
  className?: string
  width?: number
  height?: number
}

// ─── Color Maps ─────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  meeting: '#3b82f6',     // blue
  action: '#10b981',      // emerald
  decision: '#f59e0b',    // amber
  communication: '#8b5cf6', // violet
  insight: '#ec4899',     // pink
  default: '#6b7280',     // gray
}

const EDGE_COLORS: Record<string, string> = {
  derived_from: '#3b82f680',
  context_for: '#8b5cf680',
  decided_in: '#f59e0b80',
  supports: '#10b98180',
  contradicts: '#ef444480',
  related_to: '#6b728060',
}

const NODE_TYPE_LABELS: Record<string, string> = {
  meeting: 'Meeting',
  action: 'Action',
  decision: 'Decision',
  communication: 'Communication',
  insight: 'Insight',
}

// ─── Force Simulation ───────────────────────────────────────────

function initializeNodes(
  rawNodes: KnowledgeGraphProps['nodes'],
  width: number,
  height: number,
): GraphNode[] {
  const cx = width / 2
  const cy = height / 2
  return rawNodes.map((n, i) => {
    const angle = (i / rawNodes.length) * Math.PI * 2
    const r = Math.min(width, height) * 0.3
    return {
      ...n,
      x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 40,
      y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
    }
  })
}

function simulationStep(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  alpha: number,
): void {
  const cx = width / 2
  const cy = height / 2
  const nodeMap = new Map<string, GraphNode>()
  for (const n of nodes) nodeMap.set(n.id, n)

  // Repulsion (simplified Barnes-Hut — all-pairs for <400 nodes)
  const repulsion = 800
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (repulsion * alpha) / (dist * dist)
      dx = (dx / dist) * force
      dy = (dy / dist) * force
      a.vx -= dx
      a.vy -= dy
      b.vx += dx
      b.vy += dy
    }
  }

  // Attraction (edges)
  const springLength = 80
  const springStrength = 0.05
  for (const edge of edges) {
    const a = nodeMap.get(edge.source)
    const b = nodeMap.get(edge.target)
    if (!a || !b) continue
    let dx = b.x - a.x
    let dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const force = (dist - springLength) * springStrength * alpha
    dx = (dx / dist) * force
    dy = (dy / dist) * force
    a.vx += dx
    a.vy += dy
    b.vx -= dx
    b.vy -= dy
  }

  // Center gravity
  const gravity = 0.02 * alpha
  for (const n of nodes) {
    n.vx += (cx - n.x) * gravity
    n.vy += (cy - n.y) * gravity
  }

  // Apply velocity with damping
  const damping = 0.6
  const padding = 20
  for (const n of nodes) {
    if (n.fx != null) { n.x = n.fx; n.vx = 0 }
    else { n.vx *= damping; n.x += n.vx }
    if (n.fy != null) { n.y = n.fy; n.vy = 0 }
    else { n.vy *= damping; n.y += n.vy }
    // Constrain to bounds
    n.x = Math.max(padding, Math.min(width - padding, n.x))
    n.y = Math.max(padding, Math.min(height - padding, n.y))
  }
}

// ─── Component ──────────────────────────────────────────────────

export function KnowledgeGraph({
  nodes: rawNodes,
  edges,
  className,
  width: propWidth,
  height: propHeight,
}: KnowledgeGraphProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const nodesRef = React.useRef<GraphNode[]>([])
  const animRef = React.useRef<number>(0)
  const alphaRef = React.useRef(1.0)
  const [hoveredNode, setHoveredNode] = React.useState<GraphNode | null>(null)
  const [dragNode, setDragNode] = React.useState<GraphNode | null>(null)
  const [dimensions, setDimensions] = React.useState({ w: propWidth || 800, h: propHeight || 500 })
  const [selectedEdgeType, setSelectedEdgeType] = React.useState<string | null>(null)

  // Resize observer
  React.useEffect(() => {
    if (propWidth && propHeight) return
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setDimensions({ w: width, h: height })
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [propWidth, propHeight])

  const width = dimensions.w
  const height = dimensions.h

  // Initialize nodes when data changes
  React.useEffect(() => {
    nodesRef.current = initializeNodes(rawNodes, width, height)
    alphaRef.current = 1.0
  }, [rawNodes, width, height])

  // Filter edges by selected type
  const filteredEdges = React.useMemo(
    () => selectedEdgeType ? edges.filter((e) => e.edgeType === selectedEdgeType) : edges,
    [edges, selectedEdgeType],
  )

  // Animation loop
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let running = true

    function render() {
      if (!running || !ctx) return

      const nodes = nodesRef.current
      if (nodes.length === 0) { animRef.current = requestAnimationFrame(render); return }

      // Step simulation
      if (alphaRef.current > 0.001) {
        simulationStep(nodes, filteredEdges, width, height, alphaRef.current)
        alphaRef.current *= 0.995
      }

      // Clear
      ctx.clearRect(0, 0, width, height)

      // Build lookup for rendering
      const renderMap = new Map<string, GraphNode>()
      for (const n of nodes) renderMap.set(n.id, n)

      // Draw edges
      for (const edge of filteredEdges) {
        const source = renderMap.get(edge.source)
        const target = renderMap.get(edge.target)
        if (!source || !target) continue

        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.strokeStyle = EDGE_COLORS[edge.edgeType] || '#ffffff20'
        ctx.lineWidth = Math.max(0.5, edge.strength * 2)
        ctx.stroke()
      }

      // Draw nodes — compute degree for sizing
      const degree = new Map<string, number>()
      for (const e of filteredEdges) {
        degree.set(e.source, (degree.get(e.source) || 0) + 1)
        degree.set(e.target, (degree.get(e.target) || 0) + 1)
      }

      for (const node of nodes) {
        const d = degree.get(node.id) || 0
        const radius = Math.max(3, Math.min(12, 3 + d * 0.8))
        const nodeType = node.knowledgeType || node.type
        const color = NODE_COLORS[nodeType] || NODE_COLORS.default
        const isHovered = hoveredNode?.id === node.id
        const isDragged = dragNode?.id === node.id

        // Glow for hovered/dragged
        if (isHovered || isDragged) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2)
          ctx.fillStyle = color + '30'
          ctx.fill()
        }

        // Node circle
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = isHovered || isDragged ? color : color + 'cc'
        ctx.fill()
        ctx.strokeStyle = isHovered || isDragged ? '#ffffff' : '#ffffff30'
        ctx.lineWidth = isHovered || isDragged ? 2 : 0.5
        ctx.stroke()

        // Label for hovered or high-degree nodes
        if (isHovered || d >= 6) {
          const label = node.label.length > 40 ? node.label.slice(0, 37) + '...' : node.label
          ctx.font = isHovered ? 'bold 11px system-ui' : '10px system-ui'
          ctx.fillStyle = '#ffffffcc'
          ctx.textAlign = 'center'
          ctx.fillText(label, node.x, node.y - radius - 6)
        }
      }

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [filteredEdges, width, height, hoveredNode, dragNode])

  // Mouse interactions
  const findNodeAt = React.useCallback((mx: number, my: number): GraphNode | null => {
    const nodes = nodesRef.current
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      const dx = n.x - mx
      const dy = n.y - my
      if (dx * dx + dy * dy < 144) return n // radius 12
    }
    return null
  }, [])

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (dragNode) {
      dragNode.fx = mx
      dragNode.fy = my
      alphaRef.current = Math.max(alphaRef.current, 0.3)
      return
    }

    const node = findNodeAt(mx, my)
    setHoveredNode(node)
    if (canvasRef.current) {
      canvasRef.current.style.cursor = node ? 'grab' : 'default'
    }
  }, [dragNode, findNodeAt])

  const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const node = findNodeAt(mx, my)
    if (node) {
      node.fx = node.x
      node.fy = node.y
      setDragNode(node)
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
    }
  }, [findNodeAt])

  const handleMouseUp = React.useCallback(() => {
    if (dragNode) {
      dragNode.fx = null
      dragNode.fy = null
      setDragNode(null)
      if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    }
  }, [dragNode])

  // Edge type counts for filter
  const edgeTypeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of edges) {
      counts[e.edgeType] = (counts[e.edgeType] || 0) + 1
    }
    return counts
  }, [edges])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Edge type filters */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedEdgeType(null)}
          className={cn(
            'px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
            !selectedEdgeType
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-white/40 hover:bg-white/10',
          )}
        >
          All ({edges.length})
        </button>
        {Object.entries(edgeTypeCounts).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setSelectedEdgeType(selectedEdgeType === type ? null : type)}
            className={cn(
              'px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
              selectedEdgeType === type
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/10',
            )}
          >
            {type.replace(/_/g, ' ')} ({count})
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
        {Object.entries(NODE_COLORS).filter(([k]) => k !== 'default').map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-white/40">{NODE_TYPE_LABELS[type] || type}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div className="absolute top-3 right-3 z-10 max-w-[240px] p-3 rounded-lg bg-black/80 border border-white/10 backdrop-blur-sm">
          <div className="text-xs font-medium text-white mb-1 line-clamp-2">{hoveredNode.label}</div>
          <div className="flex items-center gap-2 text-[10px] text-white/50">
            <span
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: (NODE_COLORS[hoveredNode.knowledgeType || hoveredNode.type] || NODE_COLORS.default) + '30' }}
            >
              {hoveredNode.knowledgeType || hoveredNode.type}
            </span>
            {hoveredNode.projectCode && <span>{hoveredNode.projectCode}</span>}
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="rounded-xl"
      />
    </div>
  )
}
