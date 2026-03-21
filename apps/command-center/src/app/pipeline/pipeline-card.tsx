'use client'

import { cn } from '@/lib/utils'
import { entityColor, entityTextColor, formatValue, type RelationshipItem } from './utils'

interface PipelineCardProps {
  item: RelationshipItem
  compact?: boolean
  isSelected?: boolean
  isDragging?: boolean
}

export function PipelineCard({ item, compact, isSelected, isDragging }: PipelineCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border transition-all cursor-pointer',
        'bg-white/[0.04] border-white/[0.08]',
        'hover:bg-white/[0.07] hover:border-white/[0.14]',
        isSelected && 'ring-1 ring-indigo-500/50 border-indigo-500/30',
        isDragging && 'shadow-xl shadow-black/40 ring-1 ring-indigo-500/50'
      )}
    >
      <div className={cn('p-3', compact && 'p-2')}>
        {/* Top row: type badge + project color */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', entityColor(item.entity_type))} />
          <span className={cn('text-[10px] font-semibold uppercase tracking-wider', entityTextColor(item.entity_type))}>
            {item.entity_type}
          </span>
          {item.color && (
            <span
              className="w-2 h-2 rounded-full ml-auto flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
          )}
        </div>

        {/* Name */}
        <h3 className={cn(
          'font-medium text-white leading-tight',
          compact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-2'
        )}>
          {item.entity_name}
        </h3>

        {/* Subtitle */}
        {!compact && item.subtitle && (
          <p className="text-xs text-white/40 mt-0.5 truncate">{item.subtitle}</p>
        )}

        {/* Value */}
        {!compact && (item.value_low || item.value_high) && (
          <p className="text-xs text-green-400 font-medium mt-1">
            {formatValue(item.value_low, item.value_high)}
          </p>
        )}

        {/* Score icons row */}
        {!compact && (
          <div className="flex items-center gap-2 mt-2">
            <ScoreDisplay icon="❤️" score={item.love_score} />
            <ScoreDisplay icon="💰" score={item.money_score} />
            <ScoreDisplay icon="⭐" score={item.strategic_score} />
            <ScoreDisplay icon="🔥" score={item.urgency_score} />
          </div>
        )}

        {/* Next action */}
        {!compact && item.next_action && (
          <p className="text-[11px] text-amber-400/70 mt-1.5 truncate">
            → {item.next_action}
          </p>
        )}
      </div>
    </div>
  )
}

function ScoreDisplay({ icon, score }: { icon: string; score: number }) {
  if (score === 0) return null
  return (
    <span className="flex items-center gap-0.5 text-[10px] text-white/50" title={`${icon} ${score}/5`}>
      <span className="text-xs">{icon}</span>
      <span className="tabular-nums">{score}</span>
    </span>
  )
}
