'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import { getProjects, getNotionProjectsRaw, getProjectsSummary, type Project, type NotionProject, type ProjectSummaryRow } from '@/lib/api'
import { TrendingUp, TrendingDown } from 'lucide-react'
import {
  Search,
  FolderKanban,
  AlertCircle,
  Ear,
  Lightbulb,
  Zap,
  Palette,
  ArrowUpRight,
  BookOpen,
  LayoutGrid,
  List,
  ArrowUpDown,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Star,
  Sparkles,
  Globe,
  BarChart3,
} from 'lucide-react'
import { LoadingPage } from '@/components/ui/loading'
import { ProgressBar } from '@tremor/react'
import { cn } from '@/lib/utils'

type StageColor = 'indigo' | 'violet' | 'emerald' | 'amber'
type ViewMode = 'cards' | 'table'
type SortField = 'name' | 'health' | 'contacts' | 'budget' | 'importance'

const stageConfig: Record<string, { icon: typeof Ear; color: StageColor; label: string; description: string }> = {
  listen: { icon: Ear, color: 'indigo', label: 'Listen', description: 'Understanding & observing' },
  curiosity: { icon: Lightbulb, color: 'violet', label: 'Curiosity', description: 'Exploring & questioning' },
  action: { icon: Zap, color: 'emerald', label: 'Action', description: 'Building & implementing' },
  art: { icon: Palette, color: 'amber', label: 'Art', description: 'Expressing & sharing' },
}

// Project image placeholders based on project type/name
const getProjectImage = (project: Project, notionData?: NotionProject): string | null => {
  // First try to get cover image from Notion
  if (notionData?.data?.coverImage) {
    return notionData.data.coverImage
  }
  // Return null for placeholder handling
  return null
}

// Generate gradient based on project code for consistent colors
const getProjectGradient = (code: string): string => {
  const gradients = [
    'from-indigo-500/30 to-purple-500/30',
    'from-emerald-500/30 to-teal-500/30',
    'from-amber-500/30 to-orange-500/30',
    'from-pink-500/30 to-rose-500/30',
    'from-blue-500/30 to-cyan-500/30',
    'from-violet-500/30 to-fuchsia-500/30',
  ]
  const hash = code?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0
  return gradients[hash % gradients.length]
}

export default function ProjectsPage() {
  const [stage, setStage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [sortField, setSortField] = useState<SortField>('importance')
  const [sortAsc, setSortAsc] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', 'enriched'],
    queryFn: () => getProjects(),
  })

  const { data: notionData } = useQuery({
    queryKey: ['projects', 'notion'],
    queryFn: getNotionProjectsRaw,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['projects', 'summary'],
    queryFn: () => getProjectsSummary(),
  })

  // Create a map of project summaries by code for quick lookup
  const summaryMap = new Map<string, ProjectSummaryRow>()
  summaryData?.projects?.forEach(p => {
    summaryMap.set(p.project_code, p)
  })

  // Create a map of notion projects by name for quick lookup
  const notionMap = new Map<string, NotionProject>()
  notionData?.projects?.forEach(p => {
    notionMap.set(p.name.toLowerCase(), p)
  })

  const allProjects = data?.projects || []

  // Filter projects by stage and search
  const filteredProjects = allProjects.filter((project) => {
    if (stage && project.lcaa_stage !== stage) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        project.name?.toLowerCase().includes(q) ||
        project.code?.toLowerCase().includes(q) ||
        project.description?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Sort projects
  const projects = [...filteredProjects].sort((a, b) => {
    let comparison = 0
    const aNotion = notionMap.get(a.name?.toLowerCase() || '')
    const bNotion = notionMap.get(b.name?.toLowerCase() || '')

    switch (sortField) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '')
        break
      case 'health':
        comparison = (a.health_score ?? a.healthScore ?? 0) - (b.health_score ?? b.healthScore ?? 0)
        break
      case 'contacts':
        comparison = (a.contacts || 0) - (b.contacts || 0)
        break
      case 'budget':
        comparison = (aNotion?.data?.budget || 0) - (bNotion?.data?.budget || 0)
        break
      case 'importance':
        comparison = (a.importance_weight ?? 5) - (b.importance_weight ?? 5)
        break
    }
    return sortAsc ? comparison : -comparison
  })

  // Count by stage
  const stageCounts: Record<string, number> = {
    listen: allProjects.filter((p) => p.lcaa_stage === 'listen').length,
    curiosity: allProjects.filter((p) => p.lcaa_stage === 'curiosity').length,
    action: allProjects.filter((p) => p.lcaa_stage === 'action').length,
    art: allProjects.filter((p) => p.lcaa_stage === 'art').length,
  }

  const total = allProjects.length || 1

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FolderKanban className="h-8 w-8 text-indigo-400" />
              All Projects
            </h1>
            <p className="text-lg text-white/60 mt-1">
              {allProjects.length} active projects across the ACT ecosystem
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/projects/alignment"
              className="btn-glass flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
            >
              <BarChart3 className="h-4 w-4" />
              Alignment
            </Link>
            <Link
              href="/projects/archived"
              className="btn-glass flex items-center gap-2 text-white/50 hover:text-white/80"
            >
              <Pause className="h-4 w-4" />
              Archived
            </Link>
            <Link
              href="/compendium"
              className="btn-glass flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              View Compendium
            </Link>
          </div>
        </div>

        {/* LCAA Stage Stats */}
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(stageConfig).map(([key, config]) => {
            const Icon = config.icon
            const count = stageCounts[key]
            const pct = Math.round((count / total) * 100)
            const colorClasses = {
              indigo: 'bg-indigo-500/20 text-indigo-400 ring-indigo-500/50',
              violet: 'bg-violet-500/20 text-violet-400 ring-violet-500/50',
              emerald: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/50',
              amber: 'bg-amber-500/20 text-amber-400 ring-amber-500/50',
            }
            const textColor = {
              indigo: 'text-indigo-400',
              violet: 'text-violet-400',
              emerald: 'text-emerald-400',
              amber: 'text-amber-400',
            }
            const progressColor: Record<StageColor, 'indigo' | 'violet' | 'emerald' | 'amber'> = {
              indigo: 'indigo',
              violet: 'violet',
              emerald: 'emerald',
              amber: 'amber',
            }

            return (
              <button
                key={key}
                onClick={() => setStage(stage === key ? null : key)}
                className={cn(
                  'glass-card p-4 text-left transition-all',
                  stage === key ? `ring-2 ${colorClasses[config.color].split(' ')[2]}` : 'hover:border-white/20'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorClasses[config.color].split(' ').slice(0, 2).join(' '))}>
                    <Icon className={cn('h-5 w-5', textColor[config.color])} />
                  </div>
                  <div>
                    <p className={cn('text-2xl font-bold', textColor[config.color])}>{count}</p>
                    <p className="text-xs text-white/50">{config.label}</p>
                  </div>
                </div>
                <ProgressBar value={pct} color={progressColor[config.color]} className="mt-2" />
                <p className="text-xs text-white/40 mt-2">{config.description}</p>
              </button>
            )
          })}
        </div>
      </header>

      {/* Project Health Dashboard */}
      {allProjects.length > 0 && (() => {
        const withHealth = allProjects.filter(p => (p.health_score ?? p.healthScore ?? 0) > 0)
        const atRisk = allProjects.filter(p => {
          const hs = p.health_score ?? p.healthScore ?? 0
          return hs > 0 && hs < 50
        })
        const activeCount = allProjects.filter(p => p.status === 'active' || !p.status).length
        const pausedCount = allProjects.filter(p => p.status === 'paused').length
        const avgHealth = withHealth.length > 0
          ? Math.round(withHealth.reduce((sum, p) => sum + (p.health_score ?? p.healthScore ?? 0), 0) / withHealth.length)
          : 0

        return (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-white/40">Avg Health</p>
                  <p className={cn(
                    'text-xl font-bold tabular-nums',
                    avgHealth >= 70 ? 'text-green-400' : avgHealth >= 40 ? 'text-orange-400' : avgHealth > 0 ? 'text-red-400' : 'text-white/30'
                  )}>
                    {avgHealth > 0 ? `${avgHealth}%` : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', atRisk.length > 0 ? 'bg-red-500/20' : 'bg-green-500/20')}>
                  {atRisk.length > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-white/40">At Risk</p>
                  <p className={cn('text-xl font-bold tabular-nums', atRisk.length > 0 ? 'text-red-400' : 'text-green-400')}>
                    {atRisk.length}
                  </p>
                  {atRisk.length > 0 && (
                    <p className="text-xs text-white/30">{atRisk.map(p => p.code || p.name).slice(0, 2).join(', ')}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-white/40">Active</p>
                  <p className="text-xl font-bold text-blue-400 tabular-nums">{activeCount}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Pause className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-white/40">Paused</p>
                  <p className={cn('text-xl font-bold tabular-nums', pausedCount > 0 ? 'text-orange-400' : 'text-white/30')}>
                    {pausedCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Search and View Toggle */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search projects by name, code, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'cards' ? 'bg-indigo-500/30 text-indigo-400' : 'text-white/40 hover:text-white/60'
              )}
              title="Card view"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'table' ? 'bg-indigo-500/30 text-indigo-400' : 'text-white/40 hover:text-white/60'
              )}
              title="Table view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {stage && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-white/60">Filtered by:</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              stage === 'listen' && 'bg-indigo-500/20 text-indigo-400',
              stage === 'curiosity' && 'bg-violet-500/20 text-violet-400',
              stage === 'action' && 'bg-emerald-500/20 text-emerald-400',
              stage === 'art' && 'bg-amber-500/20 text-amber-400'
            )}>
              {stageConfig[stage as keyof typeof stageConfig]?.label}
            </span>
            <button
              onClick={() => setStage(null)}
              className="text-xs text-white/40 hover:text-white/60"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Project List — grouped by tier */}
      {isLoading ? (
        <LoadingPage />
      ) : error ? (
        <div className="glass-card p-6 border-red-500/30">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load projects. Is the API running?</span>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card p-6 py-12 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-white/60">No projects found</p>
          <p className="text-sm text-white/40">
            {search || stage ? 'Try a different filter' : 'Start creating projects'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Ecosystem — the 5 core platforms */}
          {(() => {
            const ecosystem = projects.filter(p => p.tier === 'ecosystem')
            if (ecosystem.length === 0) return null
            return (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Star className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Ecosystem</h2>
                    <p className="text-xs text-white/40">The 5 core ACT platforms</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {ecosystem.map((project) => (
                    <ProjectCard
                      key={project.code || project.id}
                      project={project}
                      notionProject={notionMap.get(project.name?.toLowerCase() || '')}
                      summary={summaryMap.get(project.code || '')}
                      highlight
                    />
                  ))}
                </div>
              </section>
            )
          })()}

          {/* The Studio — art & storytelling */}
          {(() => {
            const studio = projects.filter(p => p.tier === 'studio')
            if (studio.length === 0) return null
            return (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-pink-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">The Studio</h2>
                    <p className="text-xs text-white/40">Art, storytelling, and creative projects — the lifeblood of the ecosystem</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {studio.map((project) => (
                    <ProjectCard
                      key={project.code || project.id}
                      project={project}
                      notionProject={notionMap.get(project.name?.toLowerCase() || '')}
                      summary={summaryMap.get(project.code || '')}
                    />
                  ))}
                </div>
              </section>
            )
          })()}

          {/* Satellite projects */}
          {(() => {
            const satellite = projects.filter(p => p.tier === 'satellite' || !p.tier)
            if (satellite.length === 0) return null
            return (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-white/50" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Satellite</h2>
                    <p className="text-xs text-white/40">Supporting projects, partnerships, and community initiatives</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {satellite.map((project) => (
                    <ProjectCard
                      key={project.code || project.id}
                      project={project}
                      notionProject={notionMap.get(project.name?.toLowerCase() || '')}
                      summary={summaryMap.get(project.code || '')}
                    />
                  ))}
                </div>
              </section>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project,
  notionProject,
  summary,
  highlight,
}: {
  project: Project
  notionProject?: NotionProject
  summary?: ProjectSummaryRow
  highlight?: boolean
}) {
  const imageUrl = getProjectImage(project, notionProject)
  const healthScore = project.health_score ?? project.healthScore ?? 0

  return (
    <Link
      key={project.code || project.id}
      href={`/projects/${project.code || project.id}`}
      className={cn(
        'glass-card-sm overflow-hidden transition-all group',
        highlight ? 'hover:border-indigo-500/30 ring-1 ring-indigo-500/10' : 'hover:border-white/20'
      )}
    >
      {/* Project Image */}
      <div className={cn(
        'h-32 relative bg-gradient-to-br',
        getProjectGradient(project.code || '')
      )}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={project.name || 'Project'}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {project.lcaa_stage === 'listen' && <Ear className="h-12 w-12 text-white/20" />}
            {project.lcaa_stage === 'curiosity' && <Lightbulb className="h-12 w-12 text-white/20" />}
            {project.lcaa_stage === 'action' && <Zap className="h-12 w-12 text-white/20" />}
            {project.lcaa_stage === 'art' && <Palette className="h-12 w-12 text-white/20" />}
            {!project.lcaa_stage && <FolderKanban className="h-12 w-12 text-white/20" />}
          </div>
        )}

        {healthScore > 0 && (
          <div className={cn(
            'absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm',
            healthScore >= 70 && 'bg-green-500/30 text-green-300',
            healthScore >= 40 && healthScore < 70 && 'bg-orange-500/30 text-orange-300',
            healthScore < 40 && 'bg-red-500/30 text-red-300'
          )}>
            {healthScore}%
          </div>
        )}

        {project.lcaa_stage && (
          <div className={cn(
            'absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm',
            project.lcaa_stage === 'listen' && 'bg-indigo-500/30 text-indigo-300',
            project.lcaa_stage === 'curiosity' && 'bg-violet-500/30 text-violet-300',
            project.lcaa_stage === 'action' && 'bg-emerald-500/30 text-emerald-300',
            project.lcaa_stage === 'art' && 'bg-amber-500/30 text-amber-300'
          )}>
            {stageConfig[project.lcaa_stage]?.label}
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
              {project.name}
            </h3>
            {project.code && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 font-mono">{project.code}</span>
                {(project.importance_weight ?? 0) >= 7 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">
                    W{project.importance_weight}
                  </span>
                )}
              </div>
            )}
          </div>
          <ArrowUpRight className="h-4 w-4 text-white/20 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-1" />
        </div>

        {project.description && (
          <p className="text-sm text-white/50 line-clamp-2 mt-2">{project.description}</p>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
          {summary && (
            <>
              {summary.total_income > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>${summary.total_income >= 1000 ? `${(summary.total_income / 1000).toFixed(0)}k` : summary.total_income.toLocaleString()}</span>
                </div>
              )}
              {summary.total_expenses > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-400">
                  <TrendingDown className="h-3 w-3" />
                  <span>${summary.total_expenses >= 1000 ? `${(summary.total_expenses / 1000).toFixed(0)}k` : summary.total_expenses.toLocaleString()}</span>
                </div>
              )}
              {summary.pipeline_value > 0 && (
                <div className="flex items-center gap-1 text-xs text-indigo-400">
                  <DollarSign className="h-3 w-3" />
                  <span>${summary.pipeline_value >= 1000 ? `${(summary.pipeline_value / 1000).toFixed(0)}k` : summary.pipeline_value.toLocaleString()}</span>
                </div>
              )}
            </>
          )}
          {(project.contacts ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Users className="h-3 w-3" />
              <span>{project.contacts}</span>
            </div>
          )}
          {project.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40 ml-auto">
              {project.category}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
