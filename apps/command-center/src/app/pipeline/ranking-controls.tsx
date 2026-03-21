'use client'

import { cn } from '@/lib/utils'

interface RankingControlsProps {
  loveScore: number
  moneyScore: number
  strategicScore: number
  urgencyScore: number
  onChange: (dimension: 'love' | 'money' | 'strategic' | 'urgency', value: number) => void
}

const DIMENSIONS = [
  { key: 'love' as const, label: 'Love / Mission', icon: '❤️', activeColor: 'text-pink-400' },
  { key: 'money' as const, label: 'Money / Value', icon: '💰', activeColor: 'text-green-400' },
  { key: 'strategic' as const, label: 'Strategic', icon: '⭐', activeColor: 'text-yellow-400' },
  { key: 'urgency' as const, label: 'Urgency', icon: '🔥', activeColor: 'text-orange-400' },
]

export function RankingControls({ loveScore, moneyScore, strategicScore, urgencyScore, onChange }: RankingControlsProps) {
  const scores = { love: loveScore, money: moneyScore, strategic: strategicScore, urgency: urgencyScore }

  return (
    <div className="space-y-3">
      {DIMENSIONS.map((dim) => {
        const current = scores[dim.key]
        return (
          <div key={dim.key} className="flex items-center gap-3">
            <span className="text-xs text-white/40 w-20 flex-shrink-0">{dim.label}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => onChange(dim.key, current === n ? 0 : n)}
                  className={cn(
                    'w-7 h-7 rounded-md text-sm transition-all',
                    n <= current
                      ? 'bg-white/[0.1] scale-100'
                      : 'bg-white/[0.03] opacity-30 hover:opacity-60'
                  )}
                  title={`${dim.label}: ${n}/5`}
                >
                  {dim.icon}
                </button>
              ))}
            </div>
            <span className={cn('text-xs tabular-nums ml-1', current > 0 ? dim.activeColor : 'text-white/20')}>
              {current}/5
            </span>
          </div>
        )
      })}
    </div>
  )
}
