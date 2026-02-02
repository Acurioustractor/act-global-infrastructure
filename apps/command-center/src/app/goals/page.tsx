'use client'

import { useState } from 'react'
import { Target, TrendingUp, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock data - will be replaced with API call
const mockGoals = [
  {
    id: '1',
    title: 'Launch Empathy Ledger V2',
    lane: 'A',
    status: 'on_track',
    progress: 75,
    deadline: '2026-Q1',
  },
  {
    id: '2',
    title: 'Complete PICC Elders Room',
    lane: 'A',
    status: 'on_track',
    progress: 60,
    deadline: '2026-Q1',
  },
  {
    id: '3',
    title: 'JusticeHub Phase 2',
    lane: 'A',
    status: 'at_risk',
    progress: 40,
    deadline: '2026-Q2',
  },
  {
    id: '4',
    title: 'Harvest Website Launch',
    lane: 'B',
    status: 'on_track',
    progress: 85,
    deadline: '2026-Q1',
  },
  {
    id: '5',
    title: 'ACT Monthly Dinners x12',
    lane: 'B',
    status: 'on_track',
    progress: 8,
    deadline: '2026-Q4',
  },
  {
    id: '6',
    title: 'Regional Arts Fellowship',
    lane: 'B',
    status: 'blocked',
    progress: 20,
    deadline: '2026-Q2',
  },
  {
    id: '7',
    title: 'Gold Phone MVP',
    lane: 'C',
    status: 'on_track',
    progress: 50,
    deadline: '2026-Q2',
  },
  {
    id: '8',
    title: 'Custodian Economy Research',
    lane: 'C',
    status: 'at_risk',
    progress: 30,
    deadline: '2026-Q3',
  },
]

type GoalStatus = 'on_track' | 'at_risk' | 'blocked' | 'completed'
type Lane = 'A' | 'B' | 'C'

interface Goal {
  id: string
  title: string
  lane: Lane
  status: GoalStatus
  progress: number
  deadline: string
}

const statusConfig: Record<GoalStatus, { label: string; icon: typeof TrendingUp; color: string }> = {
  on_track: { label: 'On Track', icon: TrendingUp, color: 'text-action' },
  at_risk: { label: 'At Risk', icon: AlertTriangle, color: 'text-orange-400' },
  blocked: { label: 'Blocked', icon: XCircle, color: 'text-red-400' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-action' },
}

const laneConfig: Record<Lane, { label: string; description: string }> = {
  A: { label: 'A - Critical', description: 'Must achieve this year' },
  B: { label: 'B - Important', description: 'Strong priority' },
  C: { label: 'C - Nice to Have', description: 'If capacity allows' },
}

export default function GoalsPage() {
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null)
  const goals = mockGoals as Goal[]

  // Count by status
  const statusCounts = {
    on_track: goals.filter((g) => g.status === 'on_track').length,
    at_risk: goals.filter((g) => g.status === 'at_risk').length,
    blocked: goals.filter((g) => g.status === 'blocked').length,
    completed: goals.filter((g) => g.status === 'completed').length,
  }

  // Filter goals
  const filteredGoals = selectedLane
    ? goals.filter((g) => g.lane === selectedLane)
    : goals

  // Group by lane
  const goalsByLane = {
    A: filteredGoals.filter((g) => g.lane === 'A'),
    B: filteredGoals.filter((g) => g.lane === 'B'),
    C: filteredGoals.filter((g) => g.lane === 'C'),
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-listen" />
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">2026 Goals</h1>
            <p className="text-sm text-text-muted">{goals.length} strategic goals</p>
          </div>
        </div>
      </header>

      {/* Status Summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.entries(statusConfig) as [GoalStatus, typeof statusConfig.on_track][]).map(
          ([status, config]) => {
            const Icon = config.icon
            return (
              <div key={status} className="card">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <span className={cn('text-xl font-semibold', config.color)}>
                    {statusCounts[status]}
                  </span>
                </div>
                <span className="text-xs text-text-muted">{config.label}</span>
              </div>
            )
          }
        )}
      </div>

      {/* Lane Filter */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setSelectedLane(null)}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            !selectedLane
              ? 'bg-listen text-white'
              : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
          )}
        >
          All Lanes
        </button>
        {(Object.entries(laneConfig) as [Lane, typeof laneConfig.A][]).map(
          ([lane, config]) => (
            <button
              key={lane}
              onClick={() => setSelectedLane(selectedLane === lane ? null : lane)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                selectedLane === lane
                  ? 'bg-listen text-white'
                  : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
              )}
            >
              Lane {lane}
            </button>
          )
        )}
      </div>

      {/* Goals by Lane */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {(Object.entries(goalsByLane) as [Lane, Goal[]][]).map(([lane, laneGoals]) => (
          <div key={lane} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-text-primary">
                  {laneConfig[lane].label}
                </h2>
                <p className="text-xs text-text-muted">
                  {laneConfig[lane].description}
                </p>
              </div>
              <span className="text-sm text-text-muted">{laneGoals.length}</span>
            </div>

            <div className="space-y-2">
              {laneGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
              {laneGoals.length === 0 && (
                <p className="py-4 text-center text-sm text-text-muted">
                  No goals in this lane
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  const status = statusConfig[goal.status]
  const StatusIcon = status.icon

  return (
    <div className="card hover:border-listen/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-text-primary text-sm">{goal.title}</h3>
        <StatusIcon className={cn('h-4 w-4 flex-shrink-0', status.color)} />
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-text-muted mb-1">
          <span>{goal.progress}%</span>
          <span>{goal.deadline}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-bg-elevated">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              goal.status === 'on_track' || goal.status === 'completed'
                ? 'bg-action'
                : goal.status === 'at_risk'
                  ? 'bg-orange-400'
                  : 'bg-red-400'
            )}
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
