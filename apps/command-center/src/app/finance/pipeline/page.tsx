'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'

// --- Types ---

interface PipelineItem {
  id: string
  title: string
  funder: string
  value: number
  weighted: number
  probability: number
  stage: string
  stageIndex: number
  type: string
  projectCodes: string[]
  expectedClose: string | null
  daysInStage: number
  isWon: boolean
}

interface ProjectRef {
  code: string
  name: string
  tier: string
}

interface PipelineResponse {
  items: PipelineItem[]
  projects: ProjectRef[]
  types: Record<string, { count: number; value: number }>
  stages: Record<string, { count: number; value: number }>
  stats: {
    totalPipeline: number
    totalWeighted: number
    confirmed: { total: number; count: number }
    totalItems: number
  }
}

type FilterKey = 'all' | string

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  researching: { label: 'Researching', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  pursuing: { label: 'Pursuing', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  submitted: { label: 'Submitted', color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  shortlisted: { label: 'Shortlisted', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  realized: { label: 'Won', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  won: { label: 'Won', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(d))
}

export default function PipelineReviewPage() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<FilterKey>('all')
  const [stageFilter, setStageFilter] = useState<FilterKey>('all')
  const [projectFilter, setProjectFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery<PipelineResponse>({
    queryKey: ['finance', 'pipeline-review'],
    queryFn: () => fetch('/api/finance/pipeline-review').then(r => r.json()),
    staleTime: 30_000,
  })

  // Update confidence via existing pipeline-update endpoint
  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; stage?: string; project_codes?: string[]; note?: string }) => {
      const res = await fetch('/api/finance/pipeline-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'pipeline-review'] })
    },
  })

  const items = data?.items || []
  const projects = data?.projects || []
  const stats = data?.stats
  const types = data?.types || {}

  // Filter
  const filteredItems = useMemo(() => {
    let filtered = items

    if (typeFilter !== 'all') {
      filtered = filtered.filter(i => i.type === typeFilter)
    }
    if (stageFilter !== 'all') {
      filtered = filtered.filter(i => i.stage === stageFilter)
    }
    if (projectFilter) {
      filtered = filtered.filter(i => i.projectCodes.includes(projectFilter))
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.funder.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [items, typeFilter, stageFilter, projectFilter, searchFilter])

  // Compute filtered stats
  const filteredStats = useMemo(() => {
    const total = filteredItems.reduce((s, i) => s + i.value, 0)
    const weighted = filteredItems.reduce((s, i) => s + i.weighted, 0)
    return { total, weighted, count: filteredItems.length }
  }, [filteredItems])

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <Target className="h-10 w-10 text-indigo-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading pipeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Target className="h-7 w-7 text-indigo-400" />
            Pipeline Confidence
          </h1>
          <span className="text-sm text-white/30">{stats?.totalItems || 0} opportunities</span>
        </div>
      </header>

      {/* Hero Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-indigo-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Total Pipeline</span>
            </div>
            <p className="text-2xl font-bold text-indigo-400 tabular-nums">{formatMoney(stats.totalPipeline)}</p>
            <p className="text-xs text-white/30">{stats.totalItems} opportunities</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Weighted Value</span>
            </div>
            <p className="text-2xl font-bold text-purple-400 tabular-nums">{formatMoney(stats.totalWeighted)}</p>
            <p className="text-xs text-white/30">Probability-adjusted</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Confirmed / Won</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatMoney(stats.confirmed.total)}</p>
            <p className="text-xs text-white/30">{stats.confirmed.count} secured</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Type pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs transition-colors border',
                typeFilter === 'all'
                  ? 'bg-white/15 border-white/20 text-white'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
              )}
            >
              All
            </button>
            {Object.entries(types).map(([type, info]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs transition-colors border capitalize',
                  typeFilter === type
                    ? 'bg-white/15 border-white/20 text-white'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                )}
              >
                {type} <span className="opacity-50 ml-1">{info.count}</span>
              </button>
            ))}
          </div>

          <div className="w-px bg-white/10 self-stretch" />

          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="bg-transparent border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/50 focus:outline-none"
          >
            <option value="all">All Stages</option>
            {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          {/* Project filter */}
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="bg-transparent border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/50 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20" />
            <input
              type="text"
              placeholder="Search..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-48 pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20"
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Filtered summary */}
        {(typeFilter !== 'all' || stageFilter !== 'all' || projectFilter || searchFilter) && (
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-4 text-xs text-white/30">
            <span>{filteredStats.count} shown</span>
            <span>Total: {formatMoneyCompact(filteredStats.total)}</span>
            <span>Weighted: {formatMoneyCompact(filteredStats.weighted)}</span>
          </div>
        )}
      </div>

      {/* Opportunity cards */}
      {filteredItems.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-white/40">No opportunities match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => {
            const isExpanded = expandedId === item.id
            const stageConf = STAGE_CONFIG[item.stage] || STAGE_CONFIG.researching
            const probPct = Math.min(100, Math.max(0, item.probability))

            return (
              <div key={item.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className={cn(
                    'px-5 py-4 rounded-xl cursor-pointer transition-colors border',
                    isExpanded
                      ? 'bg-white/[0.06] border-white/15'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]',
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Title + funder */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/90 truncate">{item.title}</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize', stageConf.bg, stageConf.color)}>
                          {stageConf.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-white/30">{item.funder}</span>
                        {item.type && (
                          <span className="text-[10px] text-white/20 capitalize">{item.type}</span>
                        )}
                        {item.expectedClose && (
                          <span className="text-[10px] text-white/20">Expected: {formatDate(item.expectedClose)}</span>
                        )}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="text-right shrink-0 w-28">
                      <p className="text-sm font-bold text-white/80 tabular-nums">{formatMoneyCompact(item.value)}</p>
                      <p className="text-[10px] text-white/25 tabular-nums">
                        Weighted: {formatMoneyCompact(item.weighted)}
                      </p>
                    </div>

                    {/* Confidence bar */}
                    <div className="w-32 shrink-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              probPct >= 70 ? 'bg-emerald-400' :
                              probPct >= 40 ? 'bg-amber-400' :
                              'bg-red-400'
                            )}
                            style={{ width: `${probPct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-white/40 w-8 text-right">{probPct}%</span>
                      </div>
                    </div>

                    {/* Project codes */}
                    <div className="w-24 shrink-0 flex flex-wrap gap-1 justify-end">
                      {item.projectCodes.length > 0 ? (
                        item.projectCodes.slice(0, 2).map(pc => (
                          <span key={pc} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                            {pc}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-white/15">—</span>
                      )}
                    </div>

                    {/* Expand icon */}
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-white/20 shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-white/20 shrink-0" />
                    }
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="ml-5 mt-1 mb-2 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Total Value</p>
                        <p className="text-sm text-white/80 tabular-nums">{formatMoney(item.value)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Weighted</p>
                        <p className="text-sm text-white/80 tabular-nums">{formatMoney(item.weighted)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Days In Stage</p>
                        <p className="text-sm text-white/80 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-white/20" />
                          {item.daysInStage} days
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Expected Close</p>
                        <p className="text-sm text-white/80">{formatDate(item.expectedClose)}</p>
                      </div>
                    </div>

                    {/* Stage progression */}
                    <div className="mb-4">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Stage Progression</p>
                      <div className="flex gap-1">
                        {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (key !== item.stage) {
                                updateMutation.mutate({ id: item.id, stage: key })
                              }
                            }}
                            disabled={updateMutation.isPending}
                            className={cn(
                              'flex-1 py-2 rounded-lg text-[10px] transition-colors border text-center',
                              key === item.stage
                                ? `${cfg.bg} border-current ${cfg.color} font-medium`
                                : 'bg-white/[0.02] border-white/5 text-white/20 hover:bg-white/[0.05] hover:text-white/40',
                            )}
                          >
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Project assignment */}
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
                        Project Assignment
                        {item.projectCodes.length > 0 && (
                          <span className="normal-case text-white/50 ml-1">— {item.projectCodes.join(', ')}</span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {projects.map(project => {
                          const isAssigned = item.projectCodes.includes(project.code)
                          return (
                            <button
                              key={project.code}
                              onClick={(e) => {
                                e.stopPropagation()
                                const newCodes = isAssigned
                                  ? item.projectCodes.filter(c => c !== project.code)
                                  : [...item.projectCodes, project.code]
                                updateMutation.mutate({ id: item.id, project_codes: newCodes })
                              }}
                              disabled={updateMutation.isPending}
                              className={cn(
                                'px-2.5 py-1.5 rounded-lg text-xs transition-colors border',
                                isAssigned
                                  ? 'bg-blue-500/15 border-blue-500/25 text-blue-400'
                                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70',
                                'disabled:opacity-30',
                              )}
                            >
                              {project.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Link to Kanban */}
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3">
                      <Link
                        href="/finance/pipeline-kanban"
                        className="text-xs text-indigo-400/60 hover:text-indigo-400 transition-colors"
                      >
                        View in Kanban →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
