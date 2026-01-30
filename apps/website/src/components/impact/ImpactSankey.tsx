
'use client';

import React, { useMemo } from 'react';
import { REAL_INITIATIVES, REAL_CONTEXTS, Initiative } from '@/data/alma-seeds';

// Configuration
const HEIGHT = 400;
const WIDTH = 800;
const NODE_WIDTH = 120;
const COL_GAP = 200;
const NODE_PADDING = 20;

type NodeType = 'context' | 'type' | 'evidence';

interface Node {
    id: string;
    label: string;
    column: number;
    value: number;
    color: string;
    y?: number;
    h?: number;
}

interface Link {
    source: string;
    target: string;
    value: number;
    sourceNode?: Node;
    targetNode?: Node;
    sy?: number; // source Y offset
    ty?: number; // target Y offset
}

const COLORS = {
    context: '#6B5A45',
    type: '#D87D4A',
    evidence: '#4CAF50'
};

export default function ImpactSankey() {
    const { nodes, links } = useMemo(() => {
        // 1. Aggregation
        const nodesMap = new Map<string, Node>();
        const linksMap = new Map<string, Link>();

        // Helper to add/update nodes
        const addNode = (id: string, label: string, column: number, color: string) => {
            if (!nodesMap.has(id)) {
                nodesMap.set(id, { id, label, column, value: 0, color });
            }
            nodesMap.get(id)!.value++;
        };

        // Helper to add/update links
        const addLink = (source: string, target: string) => {
            const key = `${source}->${target}`;
            if (!linksMap.has(key)) {
                linksMap.set(key, { source, target, value: 0 });
            }
            linksMap.get(key)!.value++;
        };

        // Process Initiatives to build graph
        // Flow: Context Type (via context lookup) -> Initiative Type -> Evidence Strength
        REAL_INITIATIVES.forEach(init => {
            // lookup context type from the first matching context tag or default to 'Studio' contexts if ambiguous
            // Actually, Initiatives have `type` (Land/Studio/Harvest).
            // Let's deduce Context Type from the Contexts list? 
            // The Initiatives don't explicitly link to a specific Context Object in the seed types, just strings.
            // Let's use Initiative Type as the CENTER column.
            // Left Column: Status? Or Context Tag Category?
            // Let's use: ALMA Type -> Status -> Evidence Strength for now as it is deterministic.

            // Actually, let's map: 
            // Col 1: ALMA Type (Land, Studio, Harvest)
            // Col 2: Outcome Focus (Grouped?) -> Too many unique strings.
            // Let's do: ALMA Type -> Evidence Strength -> Community Authority

            const typeId = `type_${init.type}`;
            const evidenceId = `ev_${init.evidence_strength}`;
            const authId = `auth_${init.community_authority}`;

            // Nodes
            addNode(typeId, init.type, 0, COLORS.type);
            addNode(evidenceId, `Evidence: ${init.evidence_strength}`, 1, COLORS.evidence);
            addNode(authId, `Authority: ${init.community_authority}`, 2, COLORS.context);

            // Links
            addLink(typeId, evidenceId);
            addLink(evidenceId, authId);
        });

        // Convert to arrays
        const nodes = Array.from(nodesMap.values());
        const links = Array.from(linksMap.values());

        // 2. Layout Calculation
        const totalValue = REAL_INITIATIVES.length; // Approximate scaling

        // Group nodes by column
        const colNodes = [
            nodes.filter(n => n.column === 0).sort((a, b) => b.value - a.value),
            nodes.filter(n => n.column === 1).sort((a, b) => b.value - a.value),
            nodes.filter(n => n.column === 2).sort((a, b) => b.value - a.value)
        ];

        // Calculate Y positions
        colNodes.forEach(col => {
            let currentY = (HEIGHT - (col.length * NODE_PADDING) - (totalValue * 5)) / 2; // rudimentary centering
            // This scaling is tricky without a fixed pixel-per-unit.
            // Let's use flexible height.
            let usedHeight = 0;
            const availableHeight = HEIGHT - ((col.length - 1) * NODE_PADDING);
            const scaleFactor = availableHeight / Math.max(totalValue, 1); // Avoid div zero

            // Simple stack
            let yCursor = 20;
            col.forEach(node => {
                node.h = Math.max(node.value * 8, 20); // Min height 20px
                node.y = yCursor;
                yCursor += node.h + NODE_PADDING;
            });
        });

        // Calculate Link Coordinates
        // We need to track "used" source and target offsets for efficient stacking
        const sourceOffsets: Record<string, number> = {};
        const targetOffsets: Record<string, number> = {};

        links.forEach(link => {
            link.sourceNode = nodesMap.get(link.source);
            link.targetNode = nodesMap.get(link.target);

            if (link.sourceNode && link.targetNode) {
                const thickness = Math.max(link.value * 8, 2);

                // Init offsets
                sourceOffsets[link.source] = sourceOffsets[link.source] || 0;
                targetOffsets[link.target] = targetOffsets[link.target] || 0;

                link.sy = (link.sourceNode.y || 0) + sourceOffsets[link.source] + (thickness / 2);
                link.ty = (link.targetNode.y || 0) + targetOffsets[link.target] + (thickness / 2);

                // Increment offsets
                sourceOffsets[link.source] += thickness;
                targetOffsets[link.target] += thickness;
            }
        });

        return { nodes, links };
    }, []);

    return (
        <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full bg-[#F6F1E7]/50 rounded-xl border border-[#E1D3BA]">
            {/* Links */}
            {links.map((link, i) => {
                if (!link.sourceNode || !link.targetNode) return null;

                const sx = (link.sourceNode.column * (NODE_WIDTH + COL_GAP)) + NODE_WIDTH;
                const tx = (link.targetNode.column * (NODE_WIDTH + COL_GAP));
                const sy = link.sy || 0;
                const ty = link.ty || 0;

                // Bezier curve
                const midX = (sx + tx) / 2;
                const path = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;

                return (
                    <path
                        key={i}
                        d={path}
                        stroke={link.sourceNode.color}
                        strokeWidth={Math.max(link.value * 8, 2)}
                        fill="none"
                        opacity="0.3"
                        className="transition-opacity hover:opacity-80"
                    />
                );
            })}

            {/* Nodes */}
            {nodes.map(node => (
                <g key={node.id} transform={`translate(${node.column * (NODE_WIDTH + COL_GAP)}, ${node.y})`}>
                    <rect
                        width={NODE_WIDTH}
                        height={node.h}
                        fill={node.color}
                        rx="8"
                        opacity="0.9"
                        className="transition-all hover:scale-105 origin-center"
                    />
                    <text
                        x={NODE_WIDTH / 2}
                        y={(node.h || 20) / 2}
                        dy=".35em"
                        textAnchor="middle"
                        className="text-[10px] font-bold uppercase tracking-wider fill-white pointer-events-none"
                    >
                        {node.value}
                    </text>
                    <text
                        x={NODE_WIDTH / 2}
                        y={-10}
                        textAnchor="middle"
                        className="text-[10px] font-semibold fill-[#6B5A45]"
                    >
                        {node.label.split(':')[0]} {/* Simplify label */}
                    </text>
                </g>
            ))}

            {/* Column Headers */}
            <text x={NODE_WIDTH / 2} y={15} textAnchor="middle" className="text-xs font-bold uppercase fill-[#2F3E2E]">Initiative Type</text>
            <text x={NODE_WIDTH / 2 + NODE_WIDTH + COL_GAP} y={15} textAnchor="middle" className="text-xs font-bold uppercase fill-[#2F3E2E]">Evidence Level</text>
            <text x={NODE_WIDTH / 2 + (NODE_WIDTH + COL_GAP) * 2} y={15} textAnchor="middle" className="text-xs font-bold uppercase fill-[#2F3E2E]">Community Authority</text>
        </svg>
    );
}
