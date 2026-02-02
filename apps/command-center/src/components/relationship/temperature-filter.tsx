'use client'

import { type RelationshipHealth } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Flame, Sun, Snowflake } from 'lucide-react'

interface TemperatureFilterProps {
  health?: RelationshipHealth
  selected: string | null
  onSelect: (temp: string | null) => void
}

const temperatures = [
  {
    key: 'hot',
    label: 'Hot',
    icon: Flame,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    activeBg: 'bg-red-500/20',
    border: 'border-red-500/30',
  },
  {
    key: 'warm',
    label: 'Warm',
    icon: Sun,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    activeBg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
  },
  {
    key: 'cool',
    label: 'Cool',
    icon: Snowflake,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    activeBg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
  },
]

export function TemperatureFilter({
  health,
  selected,
  onSelect,
}: TemperatureFilterProps) {
  return (
    <div className="flex gap-3">
      {temperatures.map((temp) => {
        const Icon = temp.icon
        const count = health?.[temp.key as 'hot' | 'warm' | 'cool'] ?? 0
        const isSelected = selected === temp.key

        return (
          <button
            key={temp.key}
            onClick={() => onSelect(isSelected ? null : temp.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl border p-4 transition-all',
              isSelected
                ? `${temp.activeBg} ${temp.border}`
                : `${temp.bg} border-transparent hover:${temp.activeBg}`
            )}
          >
            <Icon className={cn('h-5 w-5', temp.color)} />
            <div className="flex flex-col items-start">
              <span className={cn('text-xl font-semibold', temp.color)}>
                {count}
              </span>
              <span className="text-xs text-text-muted">{temp.label}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
