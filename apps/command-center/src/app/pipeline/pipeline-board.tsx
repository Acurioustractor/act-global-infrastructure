'use client'

import * as React from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import { cn } from '@/lib/utils'
import { PipelineCard } from './pipeline-card'
import type { RelationshipItem } from './utils'

const STAGES = [
  { id: 'cold', label: 'Cold', icon: '🧊', color: 'border-blue-500/30' },
  { id: 'warm', label: 'Warm', icon: '🌤', color: 'border-yellow-500/30' },
  { id: 'engaged', label: 'Engaged', icon: '🤝', color: 'border-orange-500/30' },
  { id: 'active', label: 'Active', icon: '🔥', color: 'border-red-500/30' },
  { id: 'partner', label: 'Partner', icon: '💎', color: 'border-purple-500/30' },
  { id: 'dormant', label: 'Dormant', icon: '💤', color: 'border-white/10' },
  { id: 'lost', label: 'Lost', icon: '❌', color: 'border-white/10' },
]

interface PipelineBoardProps {
  board: Record<string, RelationshipItem[]>
  onStageChange: (itemId: string, newStage: string) => void
  onSelect: (id: string) => void
  selectedId: string | null
}

export function PipelineBoard({ board, onStageChange, onSelect, selectedId }: PipelineBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStage = destination.droppableId
    onStageChange(draggableId, newStage)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 p-4 overflow-x-auto min-h-[calc(100vh-10rem)]">
        {STAGES.map((stage) => {
          const items = board[stage.id] || []
          const isTerminal = stage.id === 'dormant' || stage.id === 'lost'

          return (
            <Droppable key={stage.id} droppableId={stage.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex-shrink-0 rounded-xl border transition-colors',
                    isTerminal ? 'w-44' : 'w-64',
                    stage.color,
                    snapshot.isDraggingOver
                      ? 'bg-white/[0.06] border-indigo-500/40'
                      : 'bg-white/[0.02]'
                  )}
                >
                  {/* Column header */}
                  <div className="sticky top-0 px-3 py-2.5 border-b border-white/[0.06] bg-inherit rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{stage.icon}</span>
                        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                          {stage.label}
                        </span>
                      </div>
                      <span className="text-xs text-white/30 tabular-nums">
                        {items.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[4rem]">
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => onSelect(item.id)}
                          >
                            <PipelineCard
                              item={item}
                              compact={isTerminal}
                              isSelected={item.id === selectedId}
                              isDragging={dragSnapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          )
        })}
      </div>
    </DragDropContext>
  )
}
