'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Telescope,
  Calendar,
  ExternalLink,
  Filter,
  Sparkles,
  ArrowUpDown,
  FileText,
  Clock,
  X,
  Copy,
  Check,
  Loader2,
  GitBranch,
  Trophy,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
  FolderKanban,
  User,
  Mail,
  Pencil,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  getPipelineBoard,
  type PipelineOpportunity,
  type PipelineBoard,
  type PipelineBoardData,
} from '@/lib/api'

// --- Types ---

interface UnifiedOpportunity {
  id: string
  source: 'grant' | 'ghl' | 'fundraising'
  name: string
  type: string
  projectCodes: string[]
  amount: { min?: number; max?: number }
  deadline?: string
  fitScore?: number
  status: string
  provider?: string
  url?: string
  discoveredAt?: string
  contact?: {
    name: string
    email?: string
    company?: string
  }
  recentEmails?: Array<{
    subject: string
    date: string
    direction: 'inbound' | 'outbound'
    channel: string
  }>
  relationshipTemp?: number
  daysSinceContact?: number
}

interface Summary {
  total: number
  grants: number
  ghl: number
  fundraising: number
  totalValue: number
  highFit: number
}

interface GrantCard {
  id: string
  name: string
  status: string
  amount: number
  outcomeAmount: number | null
  projectCode: string | null
  leadContact: string | null
  submittedAt: string | null
  provider: string | null
  deadline: string | null
  fitScore: number | null
  url: string | null
  ghlStage: string | null
  ghlValue: number | null
  milestones: Array<{ name: string; completed: boolean; due?: string }>
  notes: string | null
}

interface GrantPipelineData {
  stages: string[]
  grouped: Record<string, GrantCard[]>
}

interface GrantMetricsData {
  pipelineValue: number
  activeCount: number
  winRate: number
  totalAwarded: number
  nextDeadline: string | null
  nextDeadlineName: string | null
  upcomingDeadlines: Array<{
    name: string
    closesAt: string
    fitScore: number
    daysRemaining: number
  }>
}

// --- Helpers ---

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

function formatCurrencyCompact(amount: number | undefined | null) {
  if (amount == null) return '$0'
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`
  return `$${amount.toLocaleString('en-AU')}`
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })
}

const sourceBadge: Record<string, { label: string; color: string }> = {
  grant: { label: 'Grant', color: 'bg-amber-500/20 text-amber-400' },
  ghl: { label: 'Partnership', color: 'bg-blue-500/20 text-blue-400' },
  fundraising: { label: 'Fundraising', color: 'bg-purple-500/20 text-purple-400' },
}

const stageLabels: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  under_review: 'Under Review',
  successful: 'Successful',
}

const stageColors: Record<string, string> = {
  draft: 'border-white/20',
  in_progress: 'border-blue-500/40',
  submitted: 'border-purple-500/40',
  under_review: 'border-amber-500/40',
  successful: 'border-emerald-500/40',
}

// --- Inline Editable Cells ---

function EditableAmount({
  value,
  onSave,
  saving,
}: {
  value: number | undefined
  onSave: (val: number) => void
  saving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const start = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraft(value ? String(value) : '')
    setEditing(true)
  }

  const commit = () => {
    const num = parseFloat(draft.replace(/[,$]/g, ''))
    if (!isNaN(num) && num !== (value || 0)) onSave(num)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        onClick={e => e.stopPropagation()}
        className="w-24 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm text-right text-white outline-none focus:border-blue-400"
      />
    )
  }

  return (
    <span
      className="group inline-flex items-center gap-1 cursor-pointer"
      onClick={start}
    >
      {saving ? (
        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
      ) : (
        <>
          {value ? (
            <span className="text-sm text-emerald-400">{formatCurrency(value)}</span>
          ) : (
            <span className="text-sm text-white/20">-</span>
          )}
          <Pencil className="w-3 h-3 text-white/0 group-hover:text-white/30 transition-colors" />
        </>
      )}
    </span>
  )
}

function EditableSelect({
  value,
  options,
  onSave,
  saving,
  displayValue,
}: {
  value: string
  options: { value: string; label: string }[]
  onSave: (val: string) => void
  saving: boolean
  displayValue?: string
}) {
  const [editing, setEditing] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (editing) selectRef.current?.focus()
  }, [editing])

  const start = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(true)
  }

  const commit = (val: string) => {
    if (val !== value) onSave(val)
    setEditing(false)
  }

  if (editing) {
    return (
      <select
        ref={selectRef}
        value={value}
        onChange={e => commit(e.target.value)}
        onBlur={() => setEditing(false)}
        onClick={e => e.stopPropagation()}
        className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white outline-none focus:border-blue-400 max-w-[140px]"
      >
        <option value="">-</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }

  return (
    <span
      className="group inline-flex items-center gap-1 cursor-pointer"
      onClick={start}
    >
      {saving ? (
        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
      ) : (
        <>
          <span className="text-xs text-white/60">{displayValue || value || '-'}</span>
          <Pencil className="w-3 h-3 text-white/0 group-hover:text-white/30 transition-colors" />
        </>
      )}
    </span>
  )
}

const GHL_APP_URL = 'https://app.gohighlevel.com'

function ghlOpportunityUrl(locationId: string, oppGhlId: string) {
  if (!locationId || !oppGhlId) return null
  return `${GHL_APP_URL}/v2/location/${locationId}/opportunities/list?opportunityId=${oppGhlId}`
}

function ghlPipelineUrl(locationId: string, pipelineGhlId: string) {
  if (!locationId || !pipelineGhlId) return null
  return `${GHL_APP_URL}/v2/location/${locationId}/opportunities/list?pipelineId=${pipelineGhlId}`
}

// --- Types ---

type TabFilter = 'all' | 'grant' | 'sales' | 'fundraising'
type SortField = 'fitScore' | 'deadline' | 'amount' | 'name' | 'discovered'
type DeadlineFilter = 'all' | '7d' | '30d' | '90d' | 'none'
type StatusFilter = '' | 'open' | 'applied' | 'won' | 'lost' | 'closed'
type ViewMode = 'table' | 'board'

// --- Grant Kanban Card ---

function GrantKanbanCard({
  card,
  stages,
  currentStage,
  onMove,
}: {
  card: GrantCard
  stages: string[]
  currentStage: string
  onMove: (newStatus: string) => void
}) {
  const [showMove, setShowMove] = useState(false)
  const nextStages = stages.filter(s => s !== currentStage)

  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <Link href={`/grants/${card.id}`} className="text-white/90 text-sm font-medium leading-tight hover:text-blue-400 transition-colors block">
        {card.name}
      </Link>

      {card.provider && (
        <p className="text-white/40 text-xs mt-1">{card.provider}</p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {card.amount > 0 && (
          <span className="text-xs text-emerald-400 font-medium">{formatCurrency(card.amount)}</span>
        )}
        {card.projectCode && (
          <span className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded">{card.projectCode}</span>
        )}
        {card.fitScore && (
          <span className="text-xs text-white/40">Fit: {card.fitScore}%</span>
        )}
      </div>

      {card.deadline && (
        <div className="flex items-center gap-1 mt-2 text-white/40 text-xs">
          <Clock className="w-3 h-3" />
          {new Date(card.deadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
        </div>
      )}

      {/* Milestone Progress */}
      {card.milestones && card.milestones.length > 0 && (() => {
        const completed = card.milestones.filter(m => m.completed).length
        const total = card.milestones.length
        const pct = Math.round((completed / total) * 100)
        const nextMilestone = card.milestones.find(m => !m.completed)
        const nextDue = nextMilestone?.due ? Math.ceil((new Date(nextMilestone.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

        return (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/40">{completed}/{total}</span>
              <span className={cn(
                'text-xs',
                pct < 30 ? 'text-red-400' : pct < 70 ? 'text-amber-400' : 'text-emerald-400'
              )}>{pct}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  pct < 30 ? 'bg-red-400' : pct < 70 ? 'bg-amber-400' : 'bg-emerald-400'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            {nextMilestone && (
              <p className="text-xs text-white/30 mt-1 truncate">
                Next: {nextMilestone.name}{nextDue !== null ? ` (${nextDue}d)` : ''}
              </p>
            )}
          </div>
        )
      })()}

      {card.ghlStage && (
        <div className="mt-2 text-xs text-blue-400/70">
          GHL: {card.ghlStage}
        </div>
      )}

      {/* Move dropdown */}
      <div className="mt-2 relative">
        <button
          onClick={() => setShowMove(!showMove)}
          className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1"
        >
          Move to <ChevronDown className="w-3 h-3" />
        </button>
        {showMove && (
          <div className="absolute z-10 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl py-1 w-36">
            {nextStages.map(s => (
              <button
                key={s}
                onClick={() => { onMove(s); setShowMove(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
              >
                {stageLabels[s] || s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- GHL Opportunity Card ---

function GHLOpportunityCard({ opp, locationId }: { opp: PipelineOpportunity; locationId: string }) {
  const isStale = opp.daysInStage > 14
  const ghlUrl = ghlOpportunityUrl(locationId, opp.ghlId)

  return (
    <div className={cn(
      'rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors',
      isStale && 'border-amber-500/30'
    )}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-sm font-medium text-white truncate flex-1">{opp.name}</h4>
        <div className="flex items-center gap-1.5 shrink-0">
          {opp.value > 0 && (
            <span className="text-sm font-semibold text-green-400 tabular-nums">
              {formatCurrencyCompact(opp.value)}
            </span>
          )}
          {ghlUrl && (
            <a
              href={ghlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/20 hover:text-indigo-400 transition-colors"
              title="Open in GHL"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
      {opp.contactName && (
        <Link
          href={`/people?search=${encodeURIComponent(opp.contactName)}`}
          className="text-xs text-white/50 hover:text-indigo-400 transition-colors mb-1.5 block truncate"
        >
          {opp.contactName}
        </Link>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {opp.projectCode && (
          <Link
            href={`/projects/${opp.projectCode}`}
            className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors flex items-center gap-1"
          >
            <FolderKanban className="h-3 w-3" />
            {opp.projectCode}
          </Link>
        )}
        <span className={cn(
          'text-xs flex items-center gap-1',
          isStale ? 'text-amber-400' : 'text-white/30'
        )}>
          <Clock className="h-3 w-3" />
          {opp.daysInStage}d in stage
        </span>
        {opp.updatedAt && (
          <span className="text-xs text-white/20 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(opp.updatedAt)}
          </span>
        )}
        {opp.status === 'won' && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Won</span>
        )}
        {opp.status === 'lost' && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Lost</span>
        )}
      </div>
    </div>
  )
}

// --- GHL Stage Column ---

function GHLStageColumn({ stage, locationId }: { stage: { id: string; name: string; opportunities: PipelineOpportunity[] }; locationId: string }) {
  const stageValue = stage.opportunities.reduce((sum, o) => sum + o.value, 0)

  return (
    <div className="flex-1 min-w-[240px] max-w-[300px]">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">{stage.name}</h3>
          <span className="text-xs text-white/30 tabular-nums">{stage.opportunities.length}</span>
        </div>
        {stageValue > 0 && (
          <p className="text-xs text-green-400/70 tabular-nums">{formatCurrencyCompact(stageValue)}</p>
        )}
      </div>
      <div className="space-y-2">
        {stage.opportunities.map(opp => (
          <GHLOpportunityCard key={opp.id} opp={opp} locationId={locationId} />
        ))}
        {stage.opportunities.length === 0 && (
          <div className="py-6 text-center text-xs text-white/20">No deals</div>
        )}
      </div>
    </div>
  )
}

// --- GHL Pipeline Section ---

function GHLPipelineSection({ pipeline, defaultExpanded }: { pipeline: PipelineBoard; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const ghlUrl = ghlPipelineUrl(pipeline.ghlLocationId, pipeline.ghlId)
  const hasOpps = pipeline.stages.some(s => s.opportunities.length > 0)

  return (
    <div className="glass-card overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
          )}
          <GitBranch className="h-5 w-5 text-indigo-400 shrink-0" />
          <h2 className="text-base font-semibold text-white">{pipeline.name}</h2>
          <span className="text-xs text-white/30 tabular-nums">{pipeline.openCount} open</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-green-400 font-semibold tabular-nums">{formatCurrencyCompact(pipeline.totalValue)}</span>
          {ghlUrl && (
            <a
              href={ghlUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-indigo-400/70 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              Open in GHL
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </button>
      {expanded && hasOpps && (
        <div className="px-5 pb-5">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {pipeline.stages.map(stage => (
              <GHLStageColumn key={stage.id} stage={stage} locationId={pipeline.ghlLocationId} />
            ))}
          </div>
        </div>
      )}
      {expanded && !hasOpps && (
        <div className="px-5 pb-5 text-center text-sm text-white/30 py-4">
          No opportunities in this pipeline yet.
        </div>
      )}
    </div>
  )
}

// --- Main Page ---

export default function OpportunitiesPage() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [tab, setTab] = useState<TabFilter>('all')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all')
  const [sortField, setSortField] = useState<SortField>('fitScore')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedOpp, setSelectedOpp] = useState<UnifiedOpportunity | null>(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [fitFilter, setFitFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'unscored'>('all')
  const [amountFilter, setAmountFilter] = useState<'all' | '10k' | '50k' | '100k' | '500k'>('all')
  const [enrichedFilter, setEnrichedFilter] = useState<'all' | 'enriched' | 'unenriched'>('all')
  const [providerFilter, setProviderFilter] = useState('')

  // Table view data
  const { data, isLoading } = useQuery<{ opportunities: UnifiedOpportunity[]; summary: Summary }>({
    queryKey: ['opportunities'],
    queryFn: () => fetch('/api/opportunities').then(r => r.json()),
  })

  const { data: projectsData } = useQuery<{ projects: Array<{ code: string; name: string }> }>({
    queryKey: ['projects-list'],
    queryFn: () => fetch('/api/projects/alignment').then(r => r.json()),
  })

  // Board view data — only fetch when board tab is active
  const { data: grantPipeline, isLoading: grantPipelineLoading } = useQuery<GrantPipelineData>({
    queryKey: ['grants', 'pipeline'],
    queryFn: () => fetch('/api/grants/pipeline').then(r => r.json()),
    enabled: viewMode === 'board',
  })

  const { data: grantMetrics } = useQuery<GrantMetricsData>({
    queryKey: ['grants', 'metrics'],
    queryFn: () => fetch('/api/grants/metrics').then(r => r.json()),
    enabled: viewMode === 'board',
  })

  const { data: ghlData, isLoading: ghlLoading } = useQuery<PipelineBoardData>({
    queryKey: ['pipeline', 'board'],
    queryFn: getPipelineBoard,
    enabled: viewMode === 'board',
  })

  // Track which cell is currently saving
  const [savingCell, setSavingCell] = useState<string | null>(null)

  // Opportunity update mutation (Supabase + GHL bi-directional sync)
  const updateMutation = useMutation({
    mutationFn: async ({ id, source, changes }: { id: string; source: string; changes: Record<string, unknown> }) => {
      const res = await fetch('/api/opportunities/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, source, changes }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Update failed')
      }
      return res.json()
    },
    onMutate: ({ id, source }) => {
      setSavingCell(`${source}-${id}`)
    },
    onSettled: () => {
      setSavingCell(null)
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })

  const saveField = (opp: UnifiedOpportunity, field: string, value: unknown) => {
    updateMutation.mutate({ id: opp.id, source: opp.source, changes: { [field]: value } })
  }

  // Grant stage move mutation
  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/grants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
    },
  })

  // Draft section templates
  const sectionTemplates: Record<string, { label: string; words: number; description: string }> = {
    executive_summary: { label: 'Executive Summary', words: 200, description: 'High-level project + grant alignment' },
    project_description: { label: 'Project Description', words: 500, description: 'What we\'ll do, how it connects to our work' },
    budget_justification: { label: 'Budget Justification', words: 300, description: 'Why the money is needed' },
    impact_statement: { label: 'Impact Statement', words: 300, description: 'Expected outcomes, measurement' },
    team_expertise: { label: 'Team Expertise', words: 200, description: 'Who\'s involved, track record' },
  }

  const generateMutation = useMutation({
    mutationFn: async ({ grantId, section }: { grantId: string; section: string }) => {
      const res = await fetch(`/api/grants/${grantId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectCode: selectedProject, sections: [section] }),
      })
      if (!res.ok) throw new Error('Draft generation failed')
      return res.json() as Promise<{ drafts: Record<string, string> }>
    },
    onSuccess: (data) => {
      setDrafts(prev => ({ ...prev, ...data.drafts }))
    },
  })

  const generateAllMutation = useMutation({
    mutationFn: async ({ grantId }: { grantId: string }) => {
      const res = await fetch(`/api/grants/${grantId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectCode: selectedProject, sections: Object.keys(sectionTemplates) }),
      })
      if (!res.ok) throw new Error('Draft generation failed')
      return res.json() as Promise<{ drafts: Record<string, string> }>
    },
    onSuccess: (data) => {
      setDrafts(prev => ({ ...prev, ...data.drafts }))
    },
  })

  const copyToClipboard = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedSection(key)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const copyAll = async () => {
    const allText = Object.entries(drafts)
      .map(([key, text]) => `## ${sectionTemplates[key]?.label || key}\n\n${text}`)
      .join('\n\n---\n\n')
    await navigator.clipboard.writeText(allText)
    setCopiedSection('all')
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const opportunities = data?.opportunities || []
  const summary = data?.summary || { total: 0, grants: 0, ghl: 0, fundraising: 0, totalValue: 0, highFit: 0 }
  const projects = projectsData?.projects || []

  const providers = useMemo(() => {
    const set = new Set(opportunities.map(o => o.provider).filter(Boolean))
    return [...set].sort() as string[]
  }, [opportunities])

  const activeFilterCount = [
    projectFilter,
    statusFilter,
    deadlineFilter !== 'all' ? deadlineFilter : '',
    searchQuery,
    fitFilter !== 'all' ? fitFilter : '',
    amountFilter !== 'all' ? amountFilter : '',
    enrichedFilter !== 'all' ? enrichedFilter : '',
    providerFilter,
  ].filter(Boolean).length

  const filtered = useMemo(() => {
    let result = opportunities

    if (tab === 'grant') result = result.filter(o => o.source === 'grant' || o.type === 'grant')
    if (tab === 'sales') result = result.filter(o => o.source === 'ghl')
    if (tab === 'fundraising') result = result.filter(o => o.source === 'fundraising')

    if (projectFilter) result = result.filter(o => o.projectCodes.includes(projectFilter))
    if (statusFilter) result = result.filter(o => o.status === statusFilter)

    if (deadlineFilter !== 'all') {
      const now = Date.now()
      if (deadlineFilter === 'none') {
        result = result.filter(o => !o.deadline)
      } else {
        const days = parseInt(deadlineFilter)
        const cutoff = now + days * 24 * 60 * 60 * 1000
        result = result.filter(o => o.deadline && new Date(o.deadline).getTime() <= cutoff)
      }
    }

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(o =>
        o.name.toLowerCase().includes(q) ||
        o.provider?.toLowerCase().includes(q) ||
        o.contact?.name.toLowerCase().includes(q) ||
        o.contact?.company?.toLowerCase().includes(q) ||
        o.projectCodes.some(p => p.toLowerCase().includes(q))
      )
    }

    // Fit score ranges
    if (fitFilter === 'high') result = result.filter(o => (o.fitScore || 0) >= 70)
    else if (fitFilter === 'medium') result = result.filter(o => (o.fitScore || 0) >= 40 && (o.fitScore || 0) < 70)
    else if (fitFilter === 'low') result = result.filter(o => o.fitScore != null && o.fitScore < 40)
    else if (fitFilter === 'unscored') result = result.filter(o => o.fitScore == null)

    // Amount minimum
    if (amountFilter !== 'all') {
      const min = parseInt(amountFilter) * 1000
      result = result.filter(o => (o.amount.max || o.amount.min || 0) >= min)
    }

    // Enrichment status
    if (enrichedFilter === 'enriched') result = result.filter(o => o.fitScore != null)
    else if (enrichedFilter === 'unenriched') result = result.filter(o => o.fitScore == null)

    // Provider
    if (providerFilter) result = result.filter(o => o.provider === providerFilter)

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'fitScore':
          cmp = (b.fitScore || 0) - (a.fitScore || 0)
          break
        case 'deadline':
          if (!a.deadline && !b.deadline) cmp = 0
          else if (!a.deadline) cmp = 1
          else if (!b.deadline) cmp = -1
          else cmp = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          break
        case 'amount':
          cmp = (b.amount.max || b.amount.min || 0) - (a.amount.max || a.amount.min || 0)
          break
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'discovered':
          if (!a.discoveredAt && !b.discoveredAt) cmp = 0
          else if (!a.discoveredAt) cmp = 1
          else if (!b.discoveredAt) cmp = -1
          else cmp = new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime()
          break
      }
      return sortAsc ? -cmp : cmp
    })

    return result
  }, [opportunities, tab, projectFilter, statusFilter, deadlineFilter, searchQuery, fitFilter, amountFilter, enrichedFilter, providerFilter, sortField, sortAsc])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setProjectFilter('')
    setStatusFilter('')
    setDeadlineFilter('all')
    setFitFilter('all')
    setAmountFilter('all')
    setEnrichedFilter('all')
    setProviderFilter('')
  }

  // Combined metrics for board view
  const ghlSummary = ghlData?.summary
  const combinedPipelineValue = (grantMetrics?.pipelineValue || 0) + (ghlSummary?.totalValue || 0)
  const combinedActiveDeals = (grantMetrics?.activeCount || 0) + (ghlSummary?.openDeals || 0)

  // Grant pipeline data
  const grantStages = grantPipeline?.stages || []
  const grantGrouped = grantPipeline?.grouped || {}

  const SortHeader = ({ field, label, align = 'left' }: { field: SortField; label: string; align?: 'left' | 'right' }) => (
    <th
      className={cn('p-3 cursor-pointer hover:text-white/70 transition-colors select-none', align === 'right' ? 'text-right' : 'text-left')}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && (
          <ArrowUpDown className={cn('w-3 h-3', sortAsc ? 'rotate-180' : '')} />
        )}
      </span>
    </th>
  )

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-white">Pipeline & Grants</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 glass-card rounded-lg animate-pulse bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Telescope className="w-8 h-8 text-blue-400" />
          Pipeline & Grants
        </h1>
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition-colors',
              viewMode === 'table' ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:text-white/60'
            )}
          >
            <List className="h-4 w-4" />
            Table
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition-colors',
              viewMode === 'board' ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:text-white/60'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </button>
        </div>
      </div>

      {/* Metrics Bar — adapts based on view */}
      {viewMode === 'table' ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card p-4 rounded-lg bg-blue-500/10">
            <p className="text-white/60 text-xs mb-1">Total</p>
            <p className="text-xl font-bold text-blue-400">{summary.total}</p>
          </div>
          <div className="glass-card p-4 rounded-lg bg-emerald-500/10">
            <p className="text-white/60 text-xs mb-1">Total Value</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(summary.totalValue)}</p>
          </div>
          <div className="glass-card p-4 rounded-lg bg-amber-500/10">
            <p className="text-white/60 text-xs mb-1">Grants</p>
            <p className="text-xl font-bold text-amber-400">{summary.grants}</p>
          </div>
          <div className="glass-card p-4 rounded-lg bg-purple-500/10">
            <p className="text-white/60 text-xs mb-1">Fundraising</p>
            <p className="text-xl font-bold text-purple-400">{summary.fundraising}</p>
          </div>
          <div className="glass-card p-4 rounded-lg">
            <p className="text-white/60 text-xs mb-1">High Fit (70%+)</p>
            <p className="text-xl font-bold text-white">{summary.highFit}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card p-4 rounded-lg bg-blue-500/10">
            <p className="text-white/60 text-xs mb-1">Pipeline Value</p>
            <p className="text-xl font-bold text-blue-400">{formatCurrency(combinedPipelineValue)}</p>
          </div>
          <div className="glass-card p-4 rounded-lg bg-purple-500/10">
            <p className="text-white/60 text-xs mb-1">Active Grants</p>
            <p className="text-xl font-bold text-purple-400">{grantMetrics?.activeCount || 0}</p>
          </div>
          <div className="glass-card p-4 rounded-lg bg-indigo-500/10">
            <p className="text-white/60 text-xs mb-1">Open Deals</p>
            <p className="text-xl font-bold text-indigo-400">{ghlSummary?.openDeals || 0}</p>
          </div>
          <div className="glass-card p-4 rounded-lg bg-emerald-500/10">
            <p className="text-white/60 text-xs mb-1">Win Rate</p>
            <p className="text-xl font-bold text-emerald-400">{ghlSummary?.winRate || grantMetrics?.winRate || 0}%</p>
          </div>
          <div className="glass-card p-4 rounded-lg bg-amber-500/10">
            <p className="text-white/60 text-xs mb-1">Total Awarded</p>
            <p className="text-xl font-bold text-amber-400">{formatCurrency(grantMetrics?.totalAwarded || 0)}</p>
          </div>
        </div>
      )}

      {/* Tab Bar + Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {([
            ['all', 'All'],
            ['grant', 'Grants'],
            ['sales', 'Partnerships & Sales'],
            ['fundraising', 'Fundraising'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                tab === key ? 'bg-white/10 text-white font-medium' : 'text-white/50 hover:text-white/70'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {viewMode === 'table' && (
          <span className="text-white/40 text-sm ml-auto">{filtered.length} results</span>
        )}
      </div>

      {/* Search + Filters — table view only */}
      {viewMode === 'table' && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search grants, contacts, projects..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
            />
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-white/40" />

            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-white/30"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-white/30"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="reviewing">Reviewing</option>
              <option value="will_apply">Will Apply</option>
              <option value="applied">Applied</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="not_relevant">Not Relevant</option>
              <option value="next_round">Next Round</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={deadlineFilter}
              onChange={e => setDeadlineFilter(e.target.value as DeadlineFilter)}
              className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-white/30"
            >
              <option value="all">Any Deadline</option>
              <option value="7d">Within 7 days</option>
              <option value="30d">Within 30 days</option>
              <option value="90d">Within 90 days</option>
              <option value="none">No deadline</option>
            </select>

            <select
              value={fitFilter}
              onChange={e => setFitFilter(e.target.value as typeof fitFilter)}
              className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-white/30"
            >
              <option value="all">Any Fit Score</option>
              <option value="high">High (70%+)</option>
              <option value="medium">Medium (40-69%)</option>
              <option value="low">Low (&lt;40%)</option>
              <option value="unscored">Unscored</option>
            </select>

            <select
              value={amountFilter}
              onChange={e => setAmountFilter(e.target.value as typeof amountFilter)}
              className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-white/30"
            >
              <option value="all">Any Amount</option>
              <option value="10k">$10K+</option>
              <option value="50k">$50K+</option>
              <option value="100k">$100K+</option>
              <option value="500k">$500K+</option>
            </select>

            <select
              value={enrichedFilter}
              onChange={e => setEnrichedFilter(e.target.value as typeof enrichedFilter)}
              className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-white/30"
            >
              <option value="all">All Enrichment</option>
              <option value="enriched">Enriched</option>
              <option value="unenriched">Unenriched</option>
            </select>

            {providers.length > 0 && (
              <select
                value={providerFilter}
                onChange={e => setProviderFilter(e.target.value)}
                className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-white/30"
              >
                <option value="">All Providers</option>
                {providers.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-white/40 hover:text-white/60 text-xs flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* ==================== TABLE VIEW ==================== */}
      {viewMode === 'table' && (
        <>
          <div className="glass-card rounded-lg overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                  <SortHeader field="name" label="Name" />
                  <th className="text-left p-3">Source</th>
                  <th className="text-left p-3">Contact</th>
                  <th className="text-left p-3">Last Activity</th>
                  <th className="text-left p-3">Projects</th>
                  <SortHeader field="amount" label="Amount" align="right" />
                  <SortHeader field="deadline" label="Deadline" align="right" />
                  <SortHeader field="fitScore" label="Fit" align="right" />
                  <th className="text-left p-3">Status</th>
                  <th className="text-center p-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-white/30 py-12">
                      No opportunities found
                    </td>
                  </tr>
                ) : (
                  filtered.map(opp => {
                    const badge = sourceBadge[opp.source]
                    const daysUntil = opp.deadline
                      ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null

                    return (
                      <tr
                        key={`${opp.source}-${opp.id}`}
                        onClick={() => setSelectedOpp(selectedOpp?.id === opp.id && selectedOpp?.source === opp.source ? null : opp)}
                        className={cn(
                          'border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors',
                          selectedOpp?.id === opp.id && selectedOpp?.source === opp.source && 'bg-white/5'
                        )}
                      >
                        <td className="p-3">
                          {opp.source === 'grant' ? (
                            <Link
                              href={`/grants/${opp.id}`}
                              onClick={e => e.stopPropagation()}
                              className="text-white/90 text-sm font-medium hover:text-blue-400 transition-colors block"
                            >
                              {opp.name}
                            </Link>
                          ) : (
                            <p className="text-white/90 text-sm font-medium">{opp.name}</p>
                          )}
                          {opp.provider && (
                            <p className="text-white/40 text-xs">{opp.provider}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full', badge.color)}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-3">
                          {opp.contact ? (
                            <div>
                              <Link
                                href={`/people?search=${encodeURIComponent(opp.contact.name)}`}
                                onClick={e => e.stopPropagation()}
                                className="text-sm text-white/80 hover:text-blue-400 transition-colors"
                              >
                                {opp.contact.name}
                              </Link>
                              {opp.contact.company && (
                                <p className="text-xs text-white/40">{opp.contact.company}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-white/20">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {opp.recentEmails && opp.recentEmails.length > 0 ? (() => {
                            const latest = opp.recentEmails[0]
                            const daysAgo = Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24))
                            const tempColor = opp.relationshipTemp != null
                              ? opp.relationshipTemp >= 60 ? 'bg-emerald-400' : opp.relationshipTemp >= 30 ? 'bg-amber-400' : 'bg-red-400'
                              : 'bg-white/20'
                            return (
                              <div className="flex items-start gap-2">
                                <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', tempColor)} title={opp.relationshipTemp != null ? `Temp: ${opp.relationshipTemp}` : 'No data'} />
                                <div className="min-w-0">
                                  <p className="text-xs text-white/70 truncate max-w-[180px]">{latest.subject}</p>
                                  <p className="text-xs text-white/40">{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`} · {latest.direction === 'inbound' ? 'In' : 'Out'}</p>
                                </div>
                              </div>
                            )
                          })() : (
                            <div className="flex items-center gap-2">
                              {opp.relationshipTemp != null && (
                                <span className={cn('w-2 h-2 rounded-full shrink-0',
                                  opp.relationshipTemp >= 60 ? 'bg-emerald-400' : opp.relationshipTemp >= 30 ? 'bg-amber-400' : 'bg-red-400'
                                )} />
                              )}
                              <span className="text-xs text-white/20">-</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <EditableSelect
                            value={opp.projectCodes[0] || ''}
                            options={projects.map(p => ({ value: p.code, label: p.code }))}
                            onSave={val => saveField(opp, 'projectCode', val)}
                            saving={savingCell === `${opp.source}-${opp.id}`}
                            displayValue={opp.projectCodes.length > 1
                              ? `${opp.projectCodes[0]} +${opp.projectCodes.length - 1}`
                              : opp.projectCodes[0] || undefined}
                          />
                        </td>
                        <td className="p-3 text-right">
                          <EditableAmount
                            value={opp.amount.max || opp.amount.min}
                            onSave={val => saveField(opp, 'value', val)}
                            saving={savingCell === `${opp.source}-${opp.id}`}
                          />
                        </td>
                        <td className="p-3 text-right">
                          {opp.deadline ? (
                            <div>
                              <p className="text-sm text-white/70">
                                {new Date(opp.deadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                              </p>
                              {daysUntil !== null && (
                                <p className={cn(
                                  'text-xs',
                                  daysUntil <= 7 ? 'text-red-400' :
                                  daysUntil <= 30 ? 'text-amber-400' : 'text-white/40'
                                )}>
                                  {daysUntil}d
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-white/20">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {opp.fitScore != null ? (
                            <span className={cn(
                              'text-sm font-medium',
                              opp.fitScore >= 70 ? 'text-emerald-400' :
                              opp.fitScore >= 40 ? 'text-amber-400' : 'text-white/40'
                            )}>
                              {opp.fitScore}%
                            </span>
                          ) : (
                            <span className="text-sm text-white/20">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <EditableSelect
                            value={opp.status}
                            options={
                              opp.source === 'grant'
                                ? [
                                    { value: 'open', label: 'Open' },
                                    { value: 'reviewing', label: 'Reviewing' },
                                    { value: 'will_apply', label: 'Will Apply' },
                                    { value: 'applied', label: 'Applied' },
                                    { value: 'won', label: 'Won' },
                                    { value: 'lost', label: 'Lost' },
                                    { value: 'not_relevant', label: 'Not Relevant' },
                                    { value: 'next_round', label: 'Next Round' },
                                  ]
                                : [{ value: 'open', label: 'Open' }, { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' }, { value: 'abandoned', label: 'Abandoned' }]
                            }
                            onSave={val => saveField(opp, 'status', val)}
                            saving={savingCell === `${opp.source}-${opp.id}`}
                            displayValue={opp.status.replace(/_/g, ' ')}
                          />
                        </td>
                        <td className="p-3 text-center">
                          {opp.url && (
                            <a
                              href={opp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-white/30 hover:text-white/60"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Detail Drawer */}
          {selectedOpp && (
            <div className="glass-card rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedOpp.name}</h2>
                  {selectedOpp.provider && (
                    <p className="text-white/50 text-sm">{selectedOpp.provider}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', sourceBadge[selectedOpp.source].color)}>
                    {sourceBadge[selectedOpp.source].label}
                  </span>
                  <button
                    onClick={() => { setSelectedOpp(null); setDrafts({}); setSelectedProject('') }}
                    className="text-white/30 hover:text-white/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-white/40 text-xs mb-1">Amount</p>
                  <p className="text-white font-medium">
                    {selectedOpp.amount.min && selectedOpp.amount.max
                      ? `${formatCurrency(selectedOpp.amount.min)} - ${formatCurrency(selectedOpp.amount.max)}`
                      : selectedOpp.amount.max
                        ? formatCurrency(selectedOpp.amount.max)
                        : selectedOpp.amount.min
                          ? `From ${formatCurrency(selectedOpp.amount.min)}`
                          : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Deadline</p>
                  <p className="text-white font-medium">
                    {selectedOpp.deadline
                      ? new Date(selectedOpp.deadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'No deadline'}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Fit Score</p>
                  <p className={cn(
                    'font-medium',
                    selectedOpp.fitScore != null
                      ? selectedOpp.fitScore >= 70 ? 'text-emerald-400' : selectedOpp.fitScore >= 40 ? 'text-amber-400' : 'text-white/40'
                      : 'text-white/40'
                  )}>
                    {selectedOpp.fitScore != null ? `${selectedOpp.fitScore}%` : 'Not scored'}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Status</p>
                  <p className="text-white font-medium capitalize">{selectedOpp.status.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* Contact Info */}
              {selectedOpp.contact && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-white/40" />
                  </div>
                  <div>
                    <Link
                      href={`/people?search=${encodeURIComponent(selectedOpp.contact.name)}`}
                      className="text-sm text-white/90 hover:text-blue-400 transition-colors font-medium"
                    >
                      {selectedOpp.contact.name}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      {selectedOpp.contact.company && <span>{selectedOpp.contact.company}</span>}
                      {selectedOpp.contact.email && <span>{selectedOpp.contact.email}</span>}
                    </div>
                  </div>
                  {selectedOpp.relationshipTemp != null && (
                    <span className={cn(
                      'ml-auto text-xs px-2 py-0.5 rounded-full',
                      selectedOpp.relationshipTemp >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
                      selectedOpp.relationshipTemp >= 30 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {selectedOpp.relationshipTemp}% warm
                    </span>
                  )}
                </div>
              )}

              {/* Recent Emails */}
              {selectedOpp.recentEmails && selectedOpp.recentEmails.length > 0 && (
                <div>
                  <p className="text-white/40 text-xs mb-2 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Recent Activity
                  </p>
                  <div className="space-y-1.5">
                    {selectedOpp.recentEmails.map((email, i) => {
                      const daysAgo = Math.floor((Date.now() - new Date(email.date).getTime()) / (1000 * 60 * 60 * 24))
                      return (
                        <div key={i} className="flex items-center gap-3 p-2 rounded bg-white/5 text-xs">
                          <span className={cn(
                            'shrink-0 px-1.5 py-0.5 rounded',
                            email.direction === 'inbound' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                          )}>
                            {email.direction === 'inbound' ? 'In' : 'Out'}
                          </span>
                          <span className="text-white/70 truncate flex-1">{email.subject}</span>
                          <span className="text-white/30 shrink-0">{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>
                          <span className="text-white/20 shrink-0 capitalize">{email.channel}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedOpp.projectCodes.length > 0 && (
                <div>
                  <p className="text-white/40 text-xs mb-2">Aligned Projects</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedOpp.projectCodes.map(code => (
                      <span key={code} className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-lg">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedOpp.discoveredAt && (
                <p className="text-white/30 text-xs">
                  Discovered {new Date(selectedOpp.discoveredAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}

              {/* Action Links */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                {selectedOpp.source === 'grant' && (
                  <Link
                    href={`/grants/${selectedOpp.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Full Detail Page
                  </Link>
                )}
                {selectedOpp.url && (
                  <a
                    href={selectedOpp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Link
                  </a>
                )}
              </div>

              {/* Inline Draft Generator — grants only */}
              {selectedOpp.source === 'grant' && (
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      Draft Generator
                    </h3>
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedProject}
                        onChange={e => setSelectedProject(e.target.value)}
                        className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none"
                      >
                        <option value="">Select project...</option>
                        {projects.map(p => (
                          <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => generateAllMutation.mutate({ grantId: selectedOpp.id })}
                        disabled={!selectedProject || generateAllMutation.isPending}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-lg flex items-center gap-2',
                          selectedProject
                            ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                        )}
                      >
                        {generateAllMutation.isPending ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="w-3 h-3" /> Generate All</>
                        )}
                      </button>
                      {Object.keys(drafts).length > 0 && (
                        <button
                          onClick={copyAll}
                          className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/60 hover:text-white/80 flex items-center gap-1"
                        >
                          {copiedSection === 'all' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy All
                        </button>
                      )}
                    </div>
                  </div>

                  {!selectedProject && (
                    <p className="text-white/30 text-sm text-center py-2">
                      Select a project above to generate draft application sections
                    </p>
                  )}

                  {selectedProject && (
                    <div className="space-y-3">
                      {Object.entries(sectionTemplates).map(([key, template]) => (
                        <div key={key} className="border border-white/10 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-white/5">
                            <div>
                              <h4 className="text-sm font-medium text-white">{template.label}</h4>
                              <p className="text-xs text-white/40">{template.description} (~{template.words} words)</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {drafts[key] && (
                                <button
                                  onClick={() => copyToClipboard(key, drafts[key])}
                                  className="text-white/40 hover:text-white/60"
                                >
                                  {copiedSection === key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                              )}
                              <button
                                onClick={() => generateMutation.mutate({ grantId: selectedOpp.id, section: key })}
                                disabled={generateMutation.isPending}
                                className="px-2 py-1 text-xs rounded flex items-center gap-1 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                              >
                                {generateMutation.isPending && generateMutation.variables?.section === key ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                                Generate
                              </button>
                            </div>
                          </div>
                          {drafts[key] && (
                            <div className="p-4">
                              <textarea
                                value={drafts[key]}
                                onChange={e => setDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                                className="w-full bg-transparent text-white/80 text-sm leading-relaxed outline-none resize-y min-h-[100px]"
                                rows={Math.max(4, Math.ceil(drafts[key].length / 80))}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ==================== BOARD VIEW ==================== */}
      {viewMode === 'board' && (
        <>
          {(grantPipelineLoading || ghlLoading) && (
            <div className="py-12 text-center text-white/40">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-blue-400 mx-auto mb-3" />
              Loading pipeline data...
            </div>
          )}

          {/* Section A: Grant Applications Pipeline */}
          {(tab === 'all' || tab === 'grant') && !grantPipelineLoading && grantStages.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-400" />
                Grant Applications
              </h2>
              <div className="overflow-x-auto">
                <div className="flex gap-4 min-w-max pb-4">
                  {grantStages.map(stage => {
                    const cards = grantGrouped[stage] || []
                    const stageTotal = cards.reduce((s, c) => s + c.amount, 0)

                    return (
                      <div
                        key={stage}
                        className={cn(
                          'w-64 flex-shrink-0 rounded-lg border bg-white/5 flex flex-col',
                          stageColors[stage] || 'border-white/10'
                        )}
                      >
                        <div className="p-3 border-b border-white/10">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">{stageLabels[stage] || stage}</h3>
                            <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                              {cards.length}
                            </span>
                          </div>
                          {stageTotal > 0 && (
                            <p className="text-xs text-white/50 mt-1">{formatCurrency(stageTotal)}</p>
                          )}
                        </div>
                        <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[600px]">
                          {cards.map(card => (
                            <GrantKanbanCard
                              key={card.id}
                              card={card}
                              stages={grantStages}
                              currentStage={stage}
                              onMove={(newStatus) => moveMutation.mutate({ id: card.id, status: newStatus })}
                            />
                          ))}
                          {cards.length === 0 && (
                            <p className="text-white/20 text-xs text-center py-4">No grants</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Section B: GHL Sales Pipeline */}
          {(tab === 'all' || tab === 'sales') && !ghlLoading && ghlData?.pipelines && ghlData.pipelines.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-indigo-400" />
                Partnerships & Sales Pipeline
              </h2>
              {ghlData.pipelines.map((pipeline, i) => (
                <GHLPipelineSection
                  key={pipeline.id}
                  pipeline={pipeline}
                  defaultExpanded={i < 3 && pipeline.openCount > 0}
                />
              ))}
            </div>
          )}

          {/* Empty states */}
          {!grantPipelineLoading && !ghlLoading && (tab === 'all' || tab === 'grant') && grantStages.length === 0 && (
            <div className="glass-card p-8 text-center">
              <Trophy className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No grant applications yet</p>
            </div>
          )}

          {!grantPipelineLoading && !ghlLoading && (tab === 'all' || tab === 'sales') && (!ghlData?.pipelines || ghlData.pipelines.length === 0) && (
            <div className="glass-card p-8 text-center">
              <GitBranch className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No sales pipelines configured</p>
            </div>
          )}

          {/* Stale Deals Alert */}
          {ghlSummary && ghlSummary.staleDealsList && ghlSummary.staleDealsList.length > 0 && (
            <div className="glass-card p-6 border-amber-500/20">
              <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5" />
                Stale Deals (14+ days without update)
              </h2>
              <div className="space-y-2">
                {ghlSummary.staleDealsList.map((deal, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                    <div>
                      <span className="text-sm font-medium text-white">{deal.name}</span>
                      {deal.contact && (
                        <span className="text-xs text-white/40 ml-2">{deal.contact}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {deal.value > 0 && (
                        <span className="text-sm text-green-400 tabular-nums">{formatCurrencyCompact(deal.value)}</span>
                      )}
                      <span className="text-xs text-amber-400">{deal.daysSinceUpdate}d ago</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Deadlines sidebar */}
          {grantMetrics?.upcomingDeadlines && grantMetrics.upcomingDeadlines.length > 0 && (tab === 'all' || tab === 'grant') && (
            <div className="glass-card p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Upcoming Grant Deadlines
              </h3>
              <div className="space-y-2">
                {grantMetrics.upcomingDeadlines.slice(0, 8).map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5">
                    <div className="min-w-0 flex-1">
                      <p className="text-white/80 text-xs truncate">{d.name}</p>
                      <p className="text-white/40 text-xs">
                        {new Date(d.closesAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs font-medium ml-2',
                      d.daysRemaining <= 7 ? 'text-red-400' :
                      d.daysRemaining <= 30 ? 'text-amber-400' : 'text-white/50'
                    )}>
                      {d.daysRemaining}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
