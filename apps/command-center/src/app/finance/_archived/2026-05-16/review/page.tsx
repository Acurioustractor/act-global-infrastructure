'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Star,
  Zap,
  Moon,
  Archive,
  Target,
  Eye,
  XCircle,
  Phone,
  Calendar,
  AlertTriangle,
  FileX,
  ChevronRight,
  Undo2,
  Layers,
  DollarSign,
  Handshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'

// --- Types ---

interface ProjectItem {
  code: string
  name: string
  tier: string | null
  status: string
  priority: string | null
  category: string | null
  revenue: number
  expenses: number
  net: number
  months_active: number
  pending_receivables: number
  pending_count: number
  weighted_pipeline: number
  pipeline_count: number
}

interface PipelineItem {
  id: string
  title: string
  contact_name: string | null
  value_low: number | null
  value_mid: number | null
  value_high: number | null
  probability: number | null
  stage: string
  project_codes: string[] | null
  source_system: string
  expected_close: string | null
  days_in_stage: number
  metadata?: { watching?: boolean }
}

interface ReceivableItem {
  id: string
  invoice_number: string | null
  contact_name: string | null
  total: number
  amount_due: number | null
  amount_paid: number | null
  status: string
  date: string | null
  due_date: string | null
  line_items: unknown
  project_code: string | null
  chase_status: string | null
  days_overdue: number
}

interface Stats {
  projects: {
    total: number
    focus: number
    active: number
    background: number
    unreviewed: number
  }
  pipeline: {
    total: number
    pursuing: number
    submitted: number
    realized: number
    researching: number
    totalValue: number
  }
  receivables: {
    total: number
    totalAmount: number
    chasing: number
    chasingAmount: number
    disputed: number
    disputedAmount: number
    paymentPlan: number
    paymentPlanAmount: number
    unreviewed: number
    unreviewedAmount: number
    overdue60: number
  }
}

interface ReviewData {
  projects: ProjectItem[]
  pipeline: PipelineItem[]
  receivables: ReceivableItem[]
  stats: Stats
}

type Tab = 'projects' | 'pipeline' | 'receivables'

interface UndoEntry {
  type: 'project' | 'pipeline' | 'receivable'
  id: string
  label: string
  timestamp: number
}

// --- Tier/Category badges ---

const TIER_STYLES: Record<string, string> = {
  ecosystem: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  studio: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  satellite: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  community: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

const STAGE_STYLES: Record<string, string> = {
  realized: 'bg-emerald-500/20 text-emerald-400',
  approved: 'bg-emerald-500/20 text-emerald-400',
  shortlisted: 'bg-blue-500/20 text-blue-400',
  submitted: 'bg-blue-500/20 text-blue-400',
  negotiating: 'bg-amber-500/20 text-amber-400',
  pursuing: 'bg-amber-500/20 text-amber-400',
  researching: 'bg-white/10 text-white/50',
}

const SOURCE_STYLES: Record<string, string> = {
  ghl: 'bg-orange-500/20 text-orange-400',
  grantscope: 'bg-indigo-500/20 text-indigo-400',
  manual: 'bg-white/10 text-white/40',
}

// --- Main Component ---

export default function ReviewPage() {
  const [tab, setTab] = useState<Tab>('projects')
  const [lastUndo, setLastUndo] = useState<UndoEntry | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const queryClient = useQueryClient()

  // Track which items have been actioned in this session
  const [actionedProjects, setActionedProjects] = useState<Set<string>>(new Set())
  const [actionedPipeline, setActionedPipeline] = useState<Set<string>>(new Set())
  const [actionedReceivables, setActionedReceivables] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery<ReviewData>({
    queryKey: ['finance', 'review'],
    queryFn: () => fetch('/api/finance/review').then(r => r.json()),
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/finance/review/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'review'] })
    },
  })

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      // 1-4 map to actions based on current tab
      // z = undo
      if (e.key === 'z' && lastUndo) {
        e.preventDefault()
        // In a real impl we'd reverse the action; for now just clear
        setLastUndo(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lastUndo])

  // Auto-clear undo after 5s
  useEffect(() => {
    if (lastUndo) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(() => setLastUndo(null), 5000)
    }
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [lastUndo])

  // --- Action handlers ---

  const handleProjectAction = useCallback((code: string, action: string, name: string) => {
    mutation.mutate({ type: 'project', code, action })
    setActionedProjects(prev => new Set(prev).add(code))
    setLastUndo({ type: 'project', id: code, label: `${name} → ${action}`, timestamp: Date.now() })
  }, [mutation])

  const handlePipelineAction = useCallback((id: string, action: string, title: string) => {
    mutation.mutate({ type: 'pipeline', id, action })
    setActionedPipeline(prev => new Set(prev).add(id))
    setLastUndo({ type: 'pipeline', id, label: `${title} → ${action}`, timestamp: Date.now() })
  }, [mutation])

  const handleReceivableAction = useCallback((invoiceId: string, action: string, label: string) => {
    mutation.mutate({ type: 'receivable', invoiceId, action })
    setActionedReceivables(prev => new Set(prev).add(invoiceId))
    setLastUndo({ type: 'receivable', id: invoiceId, label: `${label} → ${action}`, timestamp: Date.now() })
  }, [mutation])

  // --- Filtered lists (exclude already-actioned items) ---

  const unreviewedProjects = useMemo(() => {
    if (!data?.projects) return []
    return data.projects.filter(p => !actionedProjects.has(p.code))
  }, [data?.projects, actionedProjects])

  const unreviewedPipeline = useMemo(() => {
    if (!data?.pipeline) return []
    return data.pipeline.filter(p => !actionedPipeline.has(p.id))
  }, [data?.pipeline, actionedPipeline])

  const unreviewedReceivables = useMemo(() => {
    if (!data?.receivables) return []
    return data.receivables.filter(r => !actionedReceivables.has(r.id))
  }, [data?.receivables, actionedReceivables])

  const stats = data?.stats

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <Layers className="h-10 w-10 text-amber-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading The Review...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white">The Review</h1>
          <span className="text-sm text-white/30">Triage & focus</span>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="glass-card p-3 mb-4">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-white/30 uppercase tracking-wider text-[10px]">Projects</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {stats.projects.focus > 0 && <span className="text-emerald-400">{stats.projects.focus} Focus</span>}
                {stats.projects.active > 0 && <span className="text-blue-400">{stats.projects.active} Active</span>}
                {stats.projects.background > 0 && <span className="text-white/40">{stats.projects.background} Bg</span>}
                <span className="text-white/20">{unreviewedProjects.length} left</span>
              </div>
            </div>
            <div>
              <span className="text-white/30 uppercase tracking-wider text-[10px]">Pipeline</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-amber-400">{formatMoneyCompact(stats.pipeline.totalValue)} wtd</span>
                <span className="text-white/20">{unreviewedPipeline.length} left</span>
              </div>
            </div>
            <div>
              <span className="text-white/30 uppercase tracking-wider text-[10px]">Receivables</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-red-400">{formatMoneyCompact(stats.receivables.totalAmount)}</span>
                <span className="text-white/20">{unreviewedReceivables.length} left</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {([
          { id: 'projects' as Tab, label: 'Projects', icon: Layers, count: unreviewedProjects.length },
          { id: 'pipeline' as Tab, label: 'Pipeline', icon: Handshake, count: unreviewedPipeline.length },
          { id: 'receivables' as Tab, label: 'Receivables', icon: DollarSign, count: unreviewedReceivables.length },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
              tab === t.id
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white/[0.03] border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.06]'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className={cn(
              'ml-1 px-1.5 py-0.5 rounded-full text-[10px] tabular-nums',
              tab === t.id ? 'bg-white/15 text-white/70' : 'bg-white/5 text-white/30'
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      {data && (
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500"
              style={{
                width: tab === 'projects'
                  ? `${((data.projects.length - unreviewedProjects.length) / Math.max(1, data.projects.length)) * 100}%`
                  : tab === 'pipeline'
                    ? `${((data.pipeline.length - unreviewedPipeline.length) / Math.max(1, data.pipeline.length)) * 100}%`
                    : `${((data.receivables.length - unreviewedReceivables.length) / Math.max(1, data.receivables.length)) * 100}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-white/20 mt-1 tabular-nums">
            {tab === 'projects' && `${data.projects.length - unreviewedProjects.length} of ${data.projects.length} reviewed`}
            {tab === 'pipeline' && `${data.pipeline.length - unreviewedPipeline.length} of ${data.pipeline.length} reviewed`}
            {tab === 'receivables' && `${data.receivables.length - unreviewedReceivables.length} of ${data.receivables.length} reviewed`}
          </p>
        </div>
      )}

      {/* Undo Toast */}
      {lastUndo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
          <div className="glass-card px-4 py-2.5 flex items-center gap-3 border border-white/10 shadow-2xl">
            <Undo2 className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-white/70">{lastUndo.label}</span>
            <span className="text-[10px] text-white/20">auto-saved</span>
          </div>
        </div>
      )}

      {/* Card Stack */}
      <div className="space-y-3">
        {tab === 'projects' && unreviewedProjects.map(project => (
          <ProjectCard
            key={project.code}
            project={project}
            onAction={handleProjectAction}
          />
        ))}
        {tab === 'projects' && unreviewedProjects.length === 0 && (
          <EmptyState message="All projects reviewed!" />
        )}

        {tab === 'pipeline' && unreviewedPipeline.map(item => (
          <PipelineCard
            key={item.id}
            item={item}
            onAction={handlePipelineAction}
          />
        ))}
        {tab === 'pipeline' && unreviewedPipeline.length === 0 && (
          <EmptyState message="All pipeline items reviewed!" />
        )}

        {tab === 'receivables' && unreviewedReceivables.map(item => (
          <ReceivableCard
            key={item.id}
            item={item}
            onAction={handleReceivableAction}
          />
        ))}
        {tab === 'receivables' && unreviewedReceivables.length === 0 && (
          <EmptyState message="All receivables reviewed!" />
        )}
      </div>
    </div>
  )
}

// --- Sub Components ---

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card p-12 text-center">
      <div className="text-4xl mb-3">&#10003;</div>
      <p className="text-white/60 text-lg">{message}</p>
      <p className="text-white/30 text-sm mt-1">Nice work.</p>
    </div>
  )
}

function ProjectCard({
  project,
  onAction,
}: {
  project: ProjectItem
  onAction: (code: string, action: string, name: string) => void
}) {
  const [confirmArchive, setConfirmArchive] = useState(false)
  const totalActivity = Math.abs(Number(project.revenue)) + Math.abs(Number(project.expenses))

  return (
    <div className="glass-card p-4 group hover:border-white/10 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-white/50">{project.code}</span>
          <ChevronRight className="h-3 w-3 text-white/20" />
          <span className="text-sm font-medium text-white">{project.name}</span>
        </div>
        {project.tier && (
          <span className={cn(
            'px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border',
            TIER_STYLES[project.tier] || 'bg-white/5 text-white/30 border-white/10'
          )}>
            {project.tier}
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <span className="text-[10px] text-white/30 uppercase">Revenue</span>
          <p className={cn('text-sm font-bold tabular-nums', Number(project.revenue) > 0 ? 'text-emerald-400' : 'text-white/20')}>
            {formatMoney(Number(project.revenue))}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-white/30 uppercase">Expenses</span>
          <p className="text-sm font-bold tabular-nums text-red-400/70">
            {formatMoney(Math.abs(Number(project.expenses)))}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-white/30 uppercase">Receivables</span>
          <p className={cn('text-sm font-bold tabular-nums', Number(project.pending_receivables) > 0 ? 'text-amber-400' : 'text-white/20')}>
            {Number(project.pending_receivables) > 0 ? formatMoney(Number(project.pending_receivables)) : '$0'}
            {Number(project.pending_count) > 0 && (
              <span className="text-[10px] text-white/20 font-normal ml-1">({project.pending_count})</span>
            )}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-white/30 uppercase">Pipeline</span>
          <p className={cn('text-sm font-bold tabular-nums', Number(project.weighted_pipeline) > 0 ? 'text-indigo-400' : 'text-white/20')}>
            {Number(project.weighted_pipeline) > 0 ? formatMoneyCompact(Number(project.weighted_pipeline)) : '$0'}
            {Number(project.pipeline_count) > 0 && (
              <span className="text-[10px] text-white/20 font-normal ml-1">({project.pipeline_count})</span>
            )}
          </p>
        </div>
      </div>

      {/* Activity bar */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-white/20">{project.months_active}mo active</span>
        {totalActivity === 0 && (
          <span className="text-[10px] text-white/15 italic">No financial activity</span>
        )}
        {project.priority && (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded',
            project.priority === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
            project.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
            'bg-white/5 text-white/30'
          )}>
            current: {project.priority}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onAction(project.code, 'focus', project.name)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                     bg-emerald-500/15 text-emerald-400 border border-emerald-500/20
                     hover:bg-emerald-500/25 transition-all active:scale-95"
        >
          <Star className="h-3.5 w-3.5" /> Focus
        </button>
        <button
          onClick={() => onAction(project.code, 'active', project.name)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                     bg-blue-500/15 text-blue-400 border border-blue-500/20
                     hover:bg-blue-500/25 transition-all active:scale-95"
        >
          <Zap className="h-3.5 w-3.5" /> Active
        </button>
        <button
          onClick={() => onAction(project.code, 'background', project.name)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                     bg-white/5 text-white/40 border border-white/10
                     hover:bg-white/10 transition-all active:scale-95"
        >
          <Moon className="h-3.5 w-3.5" /> Background
        </button>
        {!confirmArchive ? (
          <button
            onClick={() => setConfirmArchive(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                       bg-red-500/10 text-red-400/60 border border-red-500/10
                       hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-95"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={() => { onAction(project.code, 'archive', project.name); setConfirmArchive(false) }}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                       bg-red-500/20 text-red-400 border border-red-500/30
                       hover:bg-red-500/30 transition-all animate-pulse"
          >
            <Archive className="h-3.5 w-3.5" /> Confirm
          </button>
        )}
      </div>
    </div>
  )
}

function PipelineCard({
  item,
  onAction,
}: {
  item: PipelineItem
  onAction: (id: string, action: string, title: string) => void
}) {
  const value = Number(item.value_mid) || Number(item.value_low) || 0
  const prob = Number(item.probability) || 10
  const weighted = value * prob / 100

  return (
    <div className="glass-card p-4 group hover:border-white/10 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{item.title}</p>
          {item.contact_name && (
            <p className="text-xs text-white/30 truncate">{item.contact_name}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <span className={cn(
            'px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider',
            STAGE_STYLES[item.stage] || 'bg-white/10 text-white/40'
          )}>
            {item.stage}
          </span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[10px] uppercase',
            SOURCE_STYLES[item.source_system] || 'bg-white/5 text-white/30'
          )}>
            {item.source_system}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          <span className="text-[10px] text-white/30 uppercase">Value</span>
          <p className="text-sm font-bold tabular-nums text-white/80">
            {value > 0 ? formatMoneyCompact(value) : '—'}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-white/30 uppercase">Probability</span>
          <p className="text-sm font-bold tabular-nums text-white/60">{prob}%</p>
        </div>
        <div>
          <span className="text-[10px] text-white/30 uppercase">Weighted</span>
          <p className={cn('text-sm font-bold tabular-nums', weighted > 10000 ? 'text-emerald-400' : 'text-white/50')}>
            {weighted > 0 ? formatMoneyCompact(weighted) : '—'}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-white/30 uppercase">Days in Stage</span>
          <p className={cn('text-sm font-bold tabular-nums', item.days_in_stage > 90 ? 'text-red-400' : item.days_in_stage > 30 ? 'text-amber-400' : 'text-white/50')}>
            {item.days_in_stage}d
          </p>
        </div>
      </div>

      {/* Project badges */}
      {item.project_codes && item.project_codes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.project_codes.map(code => (
            <span key={code} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/40 font-mono">
              {code}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onAction(item.id, 'pursue', item.title)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                     bg-emerald-500/15 text-emerald-400 border border-emerald-500/20
                     hover:bg-emerald-500/25 transition-all active:scale-95"
        >
          <Target className="h-3.5 w-3.5" /> Pursue
        </button>
        <button
          onClick={() => onAction(item.id, 'watch', item.title)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                     bg-amber-500/15 text-amber-400 border border-amber-500/20
                     hover:bg-amber-500/25 transition-all active:scale-95"
        >
          <Eye className="h-3.5 w-3.5" /> Watch
        </button>
        <button
          onClick={() => onAction(item.id, 'dismiss', item.title)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                     bg-red-500/15 text-red-400/70 border border-red-500/15
                     hover:bg-red-500/25 hover:text-red-400 transition-all active:scale-95"
        >
          <XCircle className="h-3.5 w-3.5" /> Dismiss
        </button>
      </div>
    </div>
  )
}

function ReceivableCard({
  item,
  onAction,
}: {
  item: ReceivableItem
  onAction: (invoiceId: string, action: string, label: string) => void
}) {
  const amount = Number(item.amount_due) || Number(item.total) || 0
  const overdue = Number(item.days_overdue) || 0
  const label = `${item.contact_name || 'Unknown'} #${item.invoice_number || '?'}`

  // Extract first line item description
  let description = ''
  if (item.line_items && Array.isArray(item.line_items) && item.line_items.length > 0) {
    const first = item.line_items[0] as Record<string, unknown>
    description = (first?.Description || first?.description || '') as string
  }

  return (
    <div className={cn(
      'glass-card p-4 group hover:border-white/10 transition-all',
      overdue > 60 && 'border-l-2 border-l-red-500/50',
      overdue > 30 && overdue <= 60 && 'border-l-2 border-l-amber-500/50',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{item.contact_name || 'Unknown'}</p>
          <p className="text-xs text-white/30 font-mono">#{item.invoice_number || '—'}</p>
        </div>
        <div className="text-right ml-2 shrink-0">
          <p className="text-lg font-bold tabular-nums text-white">{formatMoney(amount)}</p>
          {item.due_date && (
            <p className="text-[10px] text-white/30">
              Due {new Date(item.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 mb-3">
        {overdue > 0 && (
          <span className={cn(
            'text-xs font-medium tabular-nums',
            overdue > 60 ? 'text-red-400' : overdue > 30 ? 'text-amber-400' : 'text-white/50'
          )}>
            {overdue}d overdue
          </span>
        )}
        {item.project_code && (
          <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/40 font-mono">
            {item.project_code}
          </span>
        )}
        {item.chase_status && (
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[10px]',
            item.chase_status === 'chasing' ? 'bg-emerald-500/20 text-emerald-400' :
            item.chase_status === 'payment_plan' ? 'bg-amber-500/20 text-amber-400' :
            item.chase_status === 'dispute' ? 'bg-red-500/20 text-red-400' :
            'bg-white/5 text-white/30'
          )}>
            {item.chase_status.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-white/20 truncate mb-3">{description}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onAction(item.id, 'chasing', label)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                     bg-emerald-500/15 text-emerald-400 border border-emerald-500/20
                     hover:bg-emerald-500/25 transition-all active:scale-95"
        >
          <Phone className="h-3.5 w-3.5" /> Chasing
        </button>
        <button
          onClick={() => onAction(item.id, 'payment_plan', label)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                     bg-amber-500/15 text-amber-400 border border-amber-500/20
                     hover:bg-amber-500/25 transition-all active:scale-95"
        >
          <Calendar className="h-3.5 w-3.5" /> Plan
        </button>
        <button
          onClick={() => onAction(item.id, 'dispute', label)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                     bg-red-500/15 text-red-400/70 border border-red-500/15
                     hover:bg-red-500/25 hover:text-red-400 transition-all active:scale-95"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Dispute
        </button>
        <button
          onClick={() => onAction(item.id, 'write_off', label)}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                     bg-white/5 text-white/30 border border-white/5
                     hover:bg-white/10 transition-all active:scale-95"
        >
          <FileX className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
