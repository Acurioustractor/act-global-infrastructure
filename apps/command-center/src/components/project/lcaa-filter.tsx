'use client'

import { cn } from '@/lib/utils'
import { Ear, Search, Zap, Palette } from 'lucide-react'

interface LCAAFilterProps {
  counts: {
    listen: number
    curiosity: number
    action: number
    art: number
  }
  selected: string | null
  onSelect: (stage: string | null) => void
}

const stages = [
  {
    key: 'listen',
    label: 'Listen',
    icon: Ear,
    color: 'text-listen-400',
    bg: 'bg-listen/10',
    activeBg: 'bg-listen/20',
    border: 'border-listen/30',
  },
  {
    key: 'curiosity',
    label: 'Curiosity',
    icon: Search,
    color: 'text-curiosity-400',
    bg: 'bg-curiosity/10',
    activeBg: 'bg-curiosity/20',
    border: 'border-curiosity/30',
  },
  {
    key: 'action',
    label: 'Action',
    icon: Zap,
    color: 'text-action-400',
    bg: 'bg-action/10',
    activeBg: 'bg-action/20',
    border: 'border-action/30',
  },
  {
    key: 'art',
    label: 'Art',
    icon: Palette,
    color: 'text-art-400',
    bg: 'bg-art/10',
    activeBg: 'bg-art/20',
    border: 'border-art/30',
  },
]

export function LCAAFilter({ counts, selected, onSelect }: LCAAFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {stages.map((stage) => {
        const Icon = stage.icon
        const count = counts[stage.key as keyof typeof counts] || 0
        const isSelected = selected === stage.key

        return (
          <button
            key={stage.key}
            onClick={() => onSelect(isSelected ? null : stage.key)}
            className={cn(
              'flex flex-1 min-w-[80px] items-center justify-center gap-2 rounded-xl border p-3 transition-all',
              isSelected
                ? `${stage.activeBg} ${stage.border}`
                : `${stage.bg} border-transparent hover:${stage.activeBg}`
            )}
          >
            <Icon className={cn('h-4 w-4', stage.color)} />
            <div className="flex flex-col items-start">
              <span className={cn('text-lg font-semibold', stage.color)}>
                {count}
              </span>
              <span className="text-xs text-text-muted">{stage.label}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
