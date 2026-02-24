'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import {
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  Shield,
  CircleCheck,
  CircleDashed,
  AlertCircle,
  FolderOpen,
  FileDown,
  Mail,
  Clock,
  ChevronRight,
  CheckCircle2,
  Circle,
  BarChart3,
  Link2,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef } from 'react'
import Link from 'next/link'

const GHL_APP_URL = 'https://app.gohighlevel.com'
const GHL_LOCATION_ID = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || 'agzsSZWgovjwgpcoASWG'

// ─── Types ───────────────────────────────────────────────────

interface EligibilityCriterion {
  criterion: string
  description: string
  category: string
  is_met: boolean | null
}

interface AssessmentCriterion {
  name: string
  description: string
  weight_pct: number
  sort_order: number
}

interface TimelineStage {
  stage: string
  date: string
  description: string
  is_completed: boolean
  sort_order: number
}

interface FunderInfo {
  org_name: string
  org_short?: string
  website?: string
  contact_email?: string
  contact_note?: string
  about?: string
}

interface GrantStructure {
  amount_per_year?: number
  duration_years?: number
  total_amount?: number
  currency?: string
  stages?: string[]
  evaluation_budget?: number
  evaluation_note?: string
  number_of_grants?: string
  priority_cohorts?: string[]
  priority_circumstances?: string[]
}

interface FunderDocument {
  id: string
  name: string
  doc_type: string
  file_url: string | null
  content_summary: {
    pages?: number
    format?: string
    sections?: string[]
    key_points?: string[]
    fillable_fields?: string[]
  } | null
  original_filename: string | null
  sort_order: number
}

interface GrantOpportunity {
  id: string
  name: string
  description: string | null
  provider: string | null
  program: string | null
  amount_min: number | null
  amount_max: number | null
  closes_at: string | null
  deadline: string | null
  application_status: string | null
  fit_score: number | null
  relevance_score: number | null
  aligned_projects: string[] | null
  categories: string[] | null
  focus_areas: string[] | null
  url: string | null
  ghl_opportunity_id: string | null
  discovered_by: string | null
  created_at: string | null
  eligibility_criteria: EligibilityCriterion[] | null
  assessment_criteria: AssessmentCriterion[] | null
  timeline_stages: TimelineStage[] | null
  funder_info: FunderInfo | null
  grant_structure: GrantStructure | null
}

interface GrantAsset {
  id: string
  category: string
  asset_type: string
  name: string
  description: string | null
  file_url: string | null
  is_current: boolean
  expires_at: string | null
}

interface AssetsData {
  assets: GrantAsset[]
  grouped: Record<string, GrantAsset[]>
  summary: { total: number; ready: number; missing: number; expired: number; readinessPct: number }
}

interface SectionTemplate {
  label: string
  words: number
  description: string
}

// ─── Helpers ─────────────────────────────────────────────────

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

const docTypeIcons: Record<string, string> = {
  guidelines: '📋',
  faq: '❓',
  mou_template: '🤝',
  budget_template: '💰',
  template: '📝',
  other: '📄',
}

const docTypeLabels: Record<string, string> = {
  guidelines: 'Guidelines',
  faq: 'FAQ',
  mou_template: 'MOU Template',
  budget_template: 'Budget Template',
  template: 'Template',
  other: 'Document',
}

const categoryLabels: Record<string, { label: string; icon: string }> = {
  financial: { label: 'Financial', icon: '💰' },
  legal: { label: 'Legal & Registration', icon: '📋' },
  organisational: { label: 'Organisational', icon: '🏢' },
  support: { label: 'Letters & Support', icon: '🤝' },
  personnel: { label: 'People', icon: '👤' },
  project: { label: 'Project Docs', icon: '📊' },
}

// ─── Component ───────────────────────────────────────────────

export default function GrantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selectedProject, setSelectedProject] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [editingUrl, setEditingUrl] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Load grant details + funder documents
  const { data, isLoading } = useQuery<{ grant: GrantOpportunity; funderDocuments: FunderDocument[] }>({
    queryKey: ['grant', id],
    queryFn: async () => {
      const res = await fetch(`/api/grants/${id}`)
      if (!res.ok) throw new Error('Grant not found')
      return res.json()
    },
  })

  const grant = data?.grant
  const funderDocs = data?.funderDocuments || []

  // Load grant assets (org-wide readiness)
  const { data: assetsData } = useQuery<AssetsData>({
    queryKey: ['grant-assets'],
    queryFn: () => fetch('/api/grants/assets').then(r => r.json()),
  })

  // Load section templates
  const { data: templatesData } = useQuery<{ sections: Record<string, SectionTemplate> }>({
    queryKey: ['grant-sections', id],
    queryFn: () => fetch(`/api/grants/${id}/draft`).then(r => r.json()),
  })

  // Load projects for dropdown
  const { data: projectsData } = useQuery<{ projects: Array<{ code: string; name: string }> }>({
    queryKey: ['projects-list'],
    queryFn: () => fetch('/api/projects/alignment').then(r => r.json()),
  })

  // Eligibility update mutation
  const eligibilityMutation = useMutation({
    mutationFn: async (criteria: EligibilityCriterion[]) => {
      const res = await fetch(`/api/grants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eligibility_criteria: criteria }),
      })
      if (!res.ok) throw new Error('Update failed')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grant', id] }),
  })

  // URL update mutation
  const urlMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch(`/api/grants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error('Update failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant', id] })
      setEditingUrl(false)
    },
  })

  // Draft generation mutation
  const generateMutation = useMutation({
    mutationFn: async ({ section }: { section: string }) => {
      const res = await fetch(`/api/grants/${id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectCode: selectedProject, sections: [section] }),
      })
      if (!res.ok) throw new Error('Draft generation failed')
      return res.json() as Promise<{ drafts: Record<string, string> }>
    },
    onSuccess: (data) => setDrafts(prev => ({ ...prev, ...data.drafts })),
  })

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const sectionKeys = Object.keys(templatesData?.sections || {})
      const res = await fetch(`/api/grants/${id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectCode: selectedProject, sections: sectionKeys }),
      })
      if (!res.ok) throw new Error('Draft generation failed')
      return res.json() as Promise<{ drafts: Record<string, string> }>
    },
    onSuccess: (data) => setDrafts(prev => ({ ...prev, ...data.drafts })),
  })

  const copyToClipboard = async (section: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const copyAll = async () => {
    const allText = Object.entries(drafts)
      .map(([key, text]) => {
        const template = templatesData?.sections?.[key]
        return `## ${template?.label || key}\n\n${text}`
      })
      .join('\n\n---\n\n')
    await navigator.clipboard.writeText(allText)
    setCopiedSection('all')
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const toggleEligibility = (index: number) => {
    if (!grant?.eligibility_criteria) return
    const updated = [...grant.eligibility_criteria]
    const current = updated[index].is_met
    updated[index] = { ...updated[index], is_met: current === true ? null : true }
    eligibilityMutation.mutate(updated)
  }

  const sections = templatesData?.sections || {}
  const projects = projectsData?.projects || []

  // Auto-select first aligned project
  if (!selectedProject && grant?.aligned_projects?.length) {
    const firstAligned = grant.aligned_projects[0]
    if (projects.some(p => p.code === firstAligned)) {
      setSelectedProject(firstAligned)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
        <div className="h-48 glass-card rounded-lg animate-pulse bg-white/5" />
      </div>
    )
  }

  if (!grant) {
    return (
      <div className="p-8">
        <p className="text-white/50">Grant not found.</p>
        <Link href="/opportunities" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
          Back to Opportunities
        </Link>
      </div>
    )
  }

  const effectiveDeadline = grant.closes_at || grant.deadline
  const daysUntil = effectiveDeadline
    ? Math.ceil((new Date(effectiveDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const fitScore = grant.fit_score ?? grant.relevance_score
  const structure = grant.grant_structure
  const funderInfo = grant.funder_info
  const eligibility = grant.eligibility_criteria || []
  const criteria = grant.assessment_criteria || []
  const timeline = (grant.timeline_stages || []).sort((a, b) => a.sort_order - b.sort_order)

  const eligibilityMet = eligibility.filter(e => e.is_met === true).length
  const eligibilityTotal = eligibility.length

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/opportunities" className="text-white/40 hover:text-white/60 text-sm flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Opportunities
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white/60 text-sm">{grant.provider}</span>
      </div>

      {/* ─── Header Card ─── */}
      <div className="glass-card p-6 rounded-lg space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{grant.name}</h1>
            <p className="text-white/50">{grant.provider}{grant.program ? ` — ${grant.program}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {funderInfo?.contact_email && (
              <a
                href={`mailto:${funderInfo.contact_email}`}
                className="text-white/40 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/5"
                title={funderInfo.contact_note || 'Email funder'}
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
            {grant.ghl_opportunity_id && (
              <a
                href={`${GHL_APP_URL}/v2/location/${GHL_LOCATION_ID}/opportunities/list?opportunityId=${grant.ghl_opportunity_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20"
              >
                GHL <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {grant.url && (
              <a
                href={grant.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20"
              >
                Apply <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Grant URL — prominent link bar */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
          <Link2 className="w-4 h-4 text-white/30 shrink-0" />
          {grant.url && !editingUrl ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <a
                href={grant.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 truncate flex-1"
              >
                {grant.url}
              </a>
              <button
                onClick={() => { setUrlDraft(grant.url || ''); setEditingUrl(true); setTimeout(() => urlInputRef.current?.focus(), 50) }}
                className="text-white/20 hover:text-white/40 shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          ) : editingUrl ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                ref={urlInputRef}
                type="url"
                value={urlDraft}
                onChange={e => setUrlDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') urlMutation.mutate(urlDraft)
                  if (e.key === 'Escape') setEditingUrl(false)
                }}
                placeholder="https://..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              />
              <button
                onClick={() => urlMutation.mutate(urlDraft)}
                disabled={urlMutation.isPending}
                className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/10"
              >
                {urlMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </button>
              <button
                onClick={() => setEditingUrl(false)}
                className="text-xs text-white/30 hover:text-white/50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-white/30">No grant URL — </span>
              <button
                onClick={() => { setUrlDraft(''); setEditingUrl(true); setTimeout(() => urlInputRef.current?.focus(), 50) }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Add link
              </button>
            </div>
          )}
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-white/40 text-xs mb-1">Funding</p>
            <p className="text-white font-medium text-sm">
              {structure?.amount_per_year
                ? `${formatCurrency(structure.amount_per_year)}/yr`
                : grant.amount_max ? formatCurrency(grant.amount_max)
                : 'Not specified'}
            </p>
            {structure?.duration_years && (
              <p className="text-white/30 text-xs">{structure.duration_years} years ({formatCurrency(structure.total_amount || 0)} total)</p>
            )}
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Deadline</p>
            <p className={cn(
              'font-medium text-sm',
              daysUntil !== null && daysUntil <= 7 ? 'text-red-400' :
              daysUntil !== null && daysUntil <= 30 ? 'text-amber-400' : 'text-white'
            )}>
              {effectiveDeadline
                ? `${formatDate(effectiveDeadline)}${daysUntil !== null ? ` (${daysUntil}d)` : ''}`
                : 'No deadline'}
            </p>
            {structure?.stages && (
              <p className="text-white/30 text-xs">{structure.stages.join(' → ')}</p>
            )}
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Fit Score</p>
            <p className={cn(
              'font-medium text-sm',
              (fitScore || 0) >= 70 ? 'text-emerald-400' :
              (fitScore || 0) >= 40 ? 'text-amber-400' : 'text-white/40'
            )}>
              {fitScore != null ? `${fitScore}%` : 'Not scored'}
            </p>
            {structure?.number_of_grants && (
              <p className="text-white/30 text-xs">{structure.number_of_grants}</p>
            )}
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Status</p>
            <p className="text-white font-medium text-sm capitalize">
              {(grant.application_status || 'not_applied').replace(/_/g, ' ')}
            </p>
            {structure?.evaluation_budget && (
              <p className="text-white/30 text-xs">{formatCurrency(structure.evaluation_budget)} eval req.</p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-4 flex-wrap">
          {grant.categories && grant.categories.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {grant.categories.map(c => (
                <span key={c} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
          )}
          {grant.aligned_projects && grant.aligned_projects.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {grant.aligned_projects.map(p => (
                <span key={p} className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-lg">{p}</span>
              ))}
            </div>
          )}
          {structure?.priority_cohorts?.map(c => (
            <span key={c} className="text-xs bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full">{c}</span>
          ))}
        </div>

        {grant.description && (
          <p className="text-white/50 text-sm leading-relaxed">{grant.description}</p>
        )}
      </div>

      {/* ─── Two-column layout: Timeline + Eligibility ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="glass-card p-5 rounded-lg">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Timeline
            </h2>
            <div className="space-y-0">
              {timeline.map((stage, i) => {
                const stageDate = new Date(stage.date)
                const isPast = stageDate < new Date()
                const isNext = !isPast && (i === 0 || new Date(timeline[i - 1].date) < new Date())
                return (
                  <div key={i} className="flex items-start gap-3 relative">
                    {/* Vertical line */}
                    {i < timeline.length - 1 && (
                      <div className={cn(
                        'absolute left-[9px] top-[20px] w-[2px] h-[calc(100%)]',
                        isPast ? 'bg-emerald-400/30' : 'bg-white/10'
                      )} />
                    )}
                    {/* Dot */}
                    <div className="shrink-0 mt-0.5">
                      {stage.is_completed || isPast ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isNext ? (
                        <div className="w-5 h-5 rounded-full border-2 border-amber-400 bg-amber-400/20 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5 text-white/20" />
                      )}
                    </div>
                    {/* Content */}
                    <div className={cn('pb-4 flex-1', isNext && 'pb-4')}>
                      <p className={cn(
                        'text-sm font-medium',
                        isPast || stage.is_completed ? 'text-white/50' : isNext ? 'text-amber-400' : 'text-white/70'
                      )}>
                        {stage.stage}
                      </p>
                      <p className="text-xs text-white/30">{formatDate(stage.date)}</p>
                      {stage.description && isNext && (
                        <p className="text-xs text-white/40 mt-0.5">{stage.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Eligibility Checklist */}
        {eligibility.length > 0 && (
          <div className="glass-card p-5 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Eligibility
              </h2>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                eligibilityMet === eligibilityTotal ? 'bg-emerald-500/20 text-emerald-400' :
                eligibilityMet > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/40'
              )}>
                {eligibilityMet}/{eligibilityTotal}
              </span>
            </div>
            <div className="space-y-1">
              {eligibility.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleEligibility(i)}
                  className="flex items-start gap-2.5 py-1.5 w-full text-left hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
                >
                  {item.is_met === true ? (
                    <CircleCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <CircleDashed className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-xs',
                      item.is_met ? 'text-white/70' : 'text-white/50'
                    )}>
                      {item.criterion}
                    </p>
                    <p className="text-[10px] text-white/25 leading-snug">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Assessment Criteria ─── */}
      {criteria.length > 0 && (
        <div className="glass-card p-5 rounded-lg">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Assessment Criteria
          </h2>
          <div className="space-y-3">
            {criteria.sort((a, b) => a.sort_order - b.sort_order).map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="shrink-0 w-12 text-right">
                  <span className={cn(
                    'text-lg font-bold',
                    c.weight_pct >= 30 ? 'text-purple-400' :
                    c.weight_pct >= 20 ? 'text-blue-400' : 'text-white/40'
                  )}>
                    {c.weight_pct}%
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white/80">{c.name}</p>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          c.weight_pct >= 30 ? 'bg-purple-400/60' :
                          c.weight_pct >= 20 ? 'bg-blue-400/60' : 'bg-white/20'
                        )}
                        style={{ width: `${c.weight_pct}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Funder Documents ─── */}
      {funderDocs.length > 0 && (
        <div className="glass-card p-5 rounded-lg">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <FileDown className="w-4 h-4 text-amber-400" />
            Funder Documents
            <span className="text-xs text-white/30 ml-auto">{funderDocs.length} documents</span>
          </h2>
          <div className="space-y-2">
            {funderDocs.map(doc => {
              const isExpanded = expandedDoc === doc.id
              const summary = doc.content_summary
              return (
                <div key={doc.id} className="border border-white/10 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="text-lg">{docTypeIcons[doc.doc_type] || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80">{doc.name}</p>
                      <p className="text-xs text-white/30">
                        {docTypeLabels[doc.doc_type] || doc.doc_type}
                        {summary?.pages ? ` — ${summary.pages} pages` : ''}
                        {summary?.format ? ` (${summary.format.toUpperCase()})` : ''}
                      </p>
                    </div>
                    <ChevronRight className={cn(
                      'w-4 h-4 text-white/20 transition-transform',
                      isExpanded && 'rotate-90'
                    )} />
                  </button>
                  {isExpanded && summary && (
                    <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
                      {/* Key Points */}
                      {summary.key_points && summary.key_points.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">Key Points</p>
                          <ul className="space-y-1">
                            {summary.key_points.map((point, i) => (
                              <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
                                <span className="text-white/20 mt-0.5">-</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Sections */}
                      {summary.sections && summary.sections.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">Sections</p>
                          <div className="flex flex-wrap gap-1">
                            {summary.sections.map((s, i) => (
                              <span key={i} className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Fillable Fields */}
                      {summary.fillable_fields && summary.fillable_fields.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">Fields to Complete</p>
                          <div className="space-y-0.5">
                            {summary.fillable_fields.map((f, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <CircleDashed className="w-3 h-3 text-white/20" />
                                <span className="text-xs text-white/40">{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Application Readiness (Org Assets) ─── */}
      {assetsData && (
        <div className="glass-card p-5 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-400" />
              Application Readiness
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400">{assetsData.summary.ready} ready</span>
                <span className="text-white/20">|</span>
                <span className="text-amber-400">{assetsData.summary.missing} needed</span>
                {assetsData.summary.expired > 0 && (
                  <>
                    <span className="text-white/20">|</span>
                    <span className="text-red-400">{assetsData.summary.expired} expired</span>
                  </>
                )}
              </div>
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    assetsData.summary.readinessPct >= 70 ? 'bg-emerald-400' :
                    assetsData.summary.readinessPct >= 40 ? 'bg-amber-400' : 'bg-red-400'
                  )}
                  style={{ width: `${assetsData.summary.readinessPct}%` }}
                />
              </div>
              <span className="text-xs text-white/40">{assetsData.summary.readinessPct}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(assetsData.grouped).map(([category, assets]) => {
              const catInfo = categoryLabels[category] || { label: category, icon: '📁' }
              return (
                <div key={category} className="border border-white/10 rounded-lg p-3">
                  <h3 className="text-xs font-medium text-white/60 mb-2 flex items-center gap-2">
                    <span>{catInfo.icon}</span>
                    {catInfo.label}
                    <span className="text-white/20 ml-auto">
                      {assets.filter(a => a.is_current).length}/{assets.length}
                    </span>
                  </h3>
                  <div className="space-y-1">
                    {assets.map(asset => {
                      const isExpired = asset.expires_at && new Date(asset.expires_at) < new Date()
                      return (
                        <div key={asset.id} className="flex items-center gap-2 py-0.5">
                          {asset.is_current && !isExpired ? (
                            <CircleCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : isExpired ? (
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          ) : (
                            <CircleDashed className="w-3.5 h-3.5 text-white/20 shrink-0" />
                          )}
                          <span className={cn(
                            'text-xs flex-1',
                            asset.is_current && !isExpired ? 'text-white/60' : 'text-white/30'
                          )}>
                            {asset.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Draft Generator ─── */}
      <div className="glass-card p-5 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Draft Generator
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-white/5 border border-white/10 text-white/80 text-xs rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="">Select project...</option>
              {projects.map(p => (
                <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
              ))}
            </select>
            <button
              onClick={() => generateAllMutation.mutate()}
              disabled={!selectedProject || generateAllMutation.isPending}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg flex items-center gap-2',
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
                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/60 hover:text-white/80 flex items-center gap-1"
              >
                {copiedSection === 'all' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy All
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {Object.entries(sections).map(([key, template]) => (
            <div key={key} className="border border-white/10 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-white/5">
                <div>
                  <h3 className="text-xs font-medium text-white">{template.label}</h3>
                  <p className="text-[10px] text-white/30">{template.description} (~{template.words} words)</p>
                </div>
                <div className="flex items-center gap-2">
                  {drafts[key] && (
                    <button
                      onClick={() => copyToClipboard(key, drafts[key])}
                      className="text-white/40 hover:text-white/60"
                    >
                      {copiedSection === key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => generateMutation.mutate({ section: key })}
                    disabled={!selectedProject || generateMutation.isPending}
                    className={cn(
                      'px-2 py-1 text-[10px] rounded flex items-center gap-1',
                      selectedProject
                        ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                    )}
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
                    className="w-full bg-transparent text-white/80 text-sm leading-relaxed outline-none resize-y min-h-[120px]"
                    rows={Math.max(4, Math.ceil(drafts[key].length / 80))}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {!selectedProject && (
          <p className="text-white/30 text-xs text-center py-4">
            Select a project to generate draft application sections
          </p>
        )}
      </div>
    </div>
  )
}
