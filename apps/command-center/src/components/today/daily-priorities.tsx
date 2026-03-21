'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Target,
  Receipt,
  FileText,
  Users,
  Mail,
  ListChecks,
  TrendingUp,
  Check,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const REFRESH_INTERVAL = 60 * 1000

const SOURCE_CONFIG: Record<string, { icon: typeof Target; color: string; bg: string; label: string }> = {
  invoice_chase: { icon: Receipt, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Invoice' },
  grant_deadline: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Grant' },
  deal_risk: { icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Deal' },
  email_followup: { icon: Mail, color: 'text-violet-400', bg: 'bg-violet-500/20', label: 'Email' },
  overdue_action: { icon: ListChecks, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Action' },
  pipeline_progression: { icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Pipeline' },
  insight: { icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Insight' },
  calendar_deadline: { icon: Target, color: 'text-pink-400', bg: 'bg-pink-500/20', label: 'Deadline' },
}

async function fetchPriorities() {
  const res = await fetch('/api/briefing/morning')
  const data = await res.json()
  return data.priorities || { items: [], nowCount: 0, nextCount: 0, totalCount: 0 }
}

async function dismissPriority(id: string) {
  const res = await fetch('/api/sprint-suggestions/dismiss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return res.json()
}

export function DailyPriorities() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['daily-priorities'],
    queryFn: fetchPriorities,
    refetchInterval: REFRESH_INTERVAL,
  })

  const dismiss = useMutation({
    mutationFn: dismissPriority,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-priorities'] })
    },
  })

  if (isLoading) {
    return (
      <div className="glass-card p-5 glow-amber">
        <div className="h-5 w-40 bg-white/5 rounded mb-4 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const items = data?.items || []
  const nowItems = items.filter((i: any) => i.priority === 'now')
  const nextItems = items.filter((i: any) => i.priority === 'next')

  if (items.length === 0) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-emerald-400" />
          <h2 className="font-semibold text-white">Daily Priorities</h2>
        </div>
        <div className="text-center py-6 text-white/40">
          <Check className="h-8 w-8 mx-auto mb-2 text-emerald-400/50" />
          <p className="text-sm">All clear — nothing urgent today</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-5 glow-amber">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-400" />
          Daily Priorities
        </h2>
        <div className="flex items-center gap-2">
          {data?.nowCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
              {data.nowCount} NOW
            </span>
          )}
          {data?.nextCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              {data.nextCount} NEXT
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {nowItems.map((item: any, i: number) => (
          <PriorityItem key={item.id} item={item} rank={i + 1} onDismiss={() => dismiss.mutate(item.id)} />
        ))}
        {nextItems.length > 0 && nowItems.length > 0 && (
          <div className="border-t border-white/5 my-2" />
        )}
        {nextItems.map((item: any, i: number) => (
          <PriorityItem key={item.id} item={item} rank={nowItems.length + i + 1} onDismiss={() => dismiss.mutate(item.id)} />
        ))}
      </div>

      <Link href="/opportunities" className="block mt-3 text-center text-xs text-amber-400 hover:text-amber-300">
        View full pipeline <ChevronRight className="inline h-3 w-3" />
      </Link>
    </div>
  )
}

function PriorityItem({ item, rank, onDismiss }: { item: any; rank: number; onDismiss: () => void }) {
  const config = SOURCE_CONFIG[item.sourceType] || SOURCE_CONFIG.insight
  const Icon = config.icon

  return (
    <div className="glass-card-sm p-3 hover:border-white/20 transition-all group">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-white/30 w-4 text-right">{rank}</span>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
            <Icon className={cn('h-4 w-4', config.color)} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white leading-snug">{item.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              item.priority === 'now' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            )}>
              {item.priority === 'now' ? 'NOW' : 'NEXT'}
            </span>
            <span className="text-[10px] text-white/30">{config.label}</span>
            {item.projectCode && (
              <span className="text-[10px] text-indigo-400/70">{item.projectCode}</span>
            )}
            {item.value && (
              <span className="text-[10px] text-green-400/70">${Number(item.value).toLocaleString()}</span>
            )}
          </div>
          {item.action && (
            <p className="text-[11px] text-white/40 mt-1">{item.action}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-emerald-500/20 text-white/30 hover:text-emerald-400 transition-all shrink-0"
          title="Mark done"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
