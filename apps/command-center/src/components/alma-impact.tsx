'use client'

import { cn } from '@/lib/utils'

/**
 * ALMA Impact Scoring Framework
 *
 * Measures project impact across 4 dimensions:
 * - Autonomy: Community self-determination and ownership
 * - Legibility: Transparency and clarity of impact
 * - Mutuality: Reciprocal benefit and shared value
 * - Accountability: Responsibility to community and stakeholders
 *
 * Migrated from the archived Intelligence Platform (ImpactFlow.tsx)
 */

export interface AlmaScores {
  autonomy: number    // 0-100
  legibility: number  // 0-100
  mutuality: number   // 0-100
  accountability: number // 0-100
}

interface AlmaImpactProps {
  scores?: AlmaScores | null
  projectName?: string
}

const dimensions = [
  {
    key: 'autonomy' as const,
    label: 'Autonomy',
    description: 'Community self-determination and ownership',
    color: 'from-indigo-500 to-indigo-400',
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-400',
    ringColor: 'ring-indigo-500/30',
  },
  {
    key: 'legibility' as const,
    label: 'Legibility',
    description: 'Transparency and clarity of impact',
    color: 'from-cyan-500 to-cyan-400',
    bgColor: 'bg-cyan-500/20',
    textColor: 'text-cyan-400',
    ringColor: 'ring-cyan-500/30',
  },
  {
    key: 'mutuality' as const,
    label: 'Mutuality',
    description: 'Reciprocal benefit and shared value',
    color: 'from-amber-500 to-amber-400',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    ringColor: 'ring-amber-500/30',
  },
  {
    key: 'accountability' as const,
    label: 'Accountability',
    description: 'Responsibility to community and stakeholders',
    color: 'from-emerald-500 to-emerald-400',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    ringColor: 'ring-emerald-500/30',
  },
]

// Placeholder scores shown when no data is available
const placeholderScores: AlmaScores = {
  autonomy: 0,
  legibility: 0,
  mutuality: 0,
  accountability: 0,
}

export function AlmaImpact({ scores, projectName }: AlmaImpactProps) {
  const data = scores || placeholderScores
  const hasData = scores != null
  const overallScore = hasData
    ? Math.round((data.autonomy + data.legibility + data.mutuality + data.accountability) / 4)
    : null

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
              A
            </span>
            ALMA Impact Score
          </h2>
          <p className="text-sm text-white/40 mt-1">
            Autonomy, Legibility, Mutuality, Accountability
          </p>
        </div>
        {overallScore != null && (
          <div className="text-right">
            <span className={cn(
              'text-3xl font-bold tabular-nums',
              overallScore >= 70 ? 'text-emerald-400' :
              overallScore >= 40 ? 'text-amber-400' : 'text-white/40'
            )}>
              {overallScore}
            </span>
            <span className="text-white/30 text-lg">/100</span>
            <p className="text-xs text-white/40">Overall</p>
          </div>
        )}
      </div>

      {/* Dimension Scores */}
      <div className="space-y-4">
        {dimensions.map((dim) => {
          const value = data[dim.key]
          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', dim.bgColor)} />
                  <span className="text-sm font-medium text-white">{dim.label}</span>
                  <span className="text-xs text-white/30 hidden sm:inline">{dim.description}</span>
                </div>
                <span className={cn(
                  'text-sm font-semibold tabular-nums',
                  hasData ? dim.textColor : 'text-white/20'
                )}>
                  {hasData ? value : '--'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                {hasData ? (
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', dim.color)}
                    style={{ width: `${value}%` }}
                  />
                ) : (
                  <div className="h-full w-full bg-white/5 flex items-center justify-center">
                    {/* Empty state - dashed placeholder */}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state message */}
      {!hasData && (
        <div className="mt-5 py-3 px-4 rounded-lg bg-white/5 border border-white/10 text-center">
          <p className="text-sm text-white/40">
            ALMA scores not yet assessed for this project.
          </p>
          <p className="text-xs text-white/25 mt-1">
            Scores are calculated from community impact data in Supabase.
          </p>
        </div>
      )}
    </div>
  )
}
