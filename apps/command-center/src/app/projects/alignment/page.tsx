'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getProjectAlignment, getProjectFinancialsSummary, type ProjectAlignment, type ProjectFinancialSummary } from '@/lib/api'
import {
  ArrowLeft,
  Mail,
  Calendar,
  DollarSign,
  Users,
  BookOpen,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Star,
  Sparkles,
  Globe,
  Shield,
} from 'lucide-react'
import { LoadingPage } from '@/components/ui/loading'
import { cn } from '@/lib/utils'

const coverageColumns = [
  { key: 'has_gmail_coverage' as const, label: 'Gmail', icon: Mail, color: 'text-red-400' },
  { key: 'has_calendar_coverage' as const, label: 'Calendar', icon: Calendar, color: 'text-blue-400' },
  { key: 'has_xero_coverage' as const, label: 'Xero', icon: DollarSign, color: 'text-green-400' },
  { key: 'has_contacts' as const, label: 'Contacts', icon: Users, color: 'text-purple-400' },
  { key: 'has_notion_page' as const, label: 'Notion', icon: BookOpen, color: 'text-orange-400' },
]

const tierConfig: Record<string, { icon: typeof Star; label: string; color: string }> = {
  ecosystem: { icon: Star, label: 'Ecosystem', color: 'text-indigo-400' },
  studio: { icon: Sparkles, label: 'Studio', color: 'text-pink-400' },
  satellite: { icon: Globe, label: 'Satellite', color: 'text-white/50' },
}

function CoverageCell({ value }: { value: boolean }) {
  return (
    <div className="flex items-center justify-center">
      {value ? (
        <CheckCircle2 className="h-4 w-4 text-green-400" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-white/10" />
      )}
    </div>
  )
}

function CoverageBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : score >= 20 ? 'bg-orange-500' : 'bg-red-500'
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn(
        'text-xs font-mono tabular-nums w-8 text-right',
        score >= 80 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : score >= 20 ? 'text-orange-400' : 'text-red-400'
      )}>
        {score}
      </span>
    </div>
  )
}

function ImportanceBadge({ weight }: { weight: number }) {
  const bars = Math.ceil(weight / 2) // 1-5 bars for weights 1-10
  return (
    <div className="flex items-center gap-0.5" title={`Importance: ${weight}/10`}>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full',
            i < bars ? 'bg-indigo-400' : 'bg-white/10',
            i < bars ? 'h-3' : 'h-2'
          )}
        />
      ))}
    </div>
  )
}

export default function AlignmentPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', 'alignment'],
    queryFn: getProjectAlignment,
  })

  const { data: financialData } = useQuery({
    queryKey: ['projects', 'financials-summary'],
    queryFn: getProjectFinancialsSummary,
  })

  const projects = data?.projects || []
  const summary = data?.summary || { total: 0, with_gaps: 0, avg_coverage: 0 }
  const financialMap = new Map<string, ProjectFinancialSummary>()
  for (const f of financialData?.projects || []) {
    financialMap.set(f.code, f)
  }

  // Group by tier
  const ecosystem = projects.filter(p => p.tier === 'ecosystem')
  const studio = projects.filter(p => p.tier === 'studio')
  const satellite = projects.filter(p => p.tier === 'satellite' || !p.tier)

  // Active only for gap analysis
  const activeProjects = projects.filter(p => p.status !== 'archived')
  const activeWithGaps = activeProjects.filter(p => p.has_coverage_gaps)

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/projects" className="text-white/40 hover:text-white/60 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Project Alignment</h1>
            <p className="text-white/60 mt-1">Cross-system coverage for all {summary.total} projects</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 mb-1">Avg Coverage</p>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              summary.avg_coverage >= 60 ? 'text-green-400' : summary.avg_coverage >= 30 ? 'text-amber-400' : 'text-red-400'
            )}>
              {summary.avg_coverage}%
            </p>
          </div>

          <div className="glass-card p-4">
            <p className="text-xs text-white/40 mb-1">Ecosystem Gaps</p>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              activeWithGaps.length > 0 ? 'text-red-400' : 'text-green-400'
            )}>
              {activeWithGaps.length}
            </p>
            {activeWithGaps.length > 0 && (
              <p className="text-xs text-white/30 mt-1">
                {activeWithGaps.map(p => p.code).join(', ')}
              </p>
            )}
          </div>

          <div className="glass-card p-4">
            <p className="text-xs text-white/40 mb-1">Full Coverage</p>
            <p className="text-2xl font-bold text-green-400 tabular-nums">
              {activeProjects.filter(p => p.coverage_score === 100).length}
            </p>
          </div>

          <div className="glass-card p-4">
            <p className="text-xs text-white/40 mb-1">No Coverage</p>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              activeProjects.filter(p => p.coverage_score === 0).length > 0 ? 'text-red-400' : 'text-white/30'
            )}>
              {activeProjects.filter(p => p.coverage_score === 0).length}
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <LoadingPage />
      ) : error ? (
        <div className="glass-card p-6 border-red-500/30">
          <p className="text-red-400">Failed to load alignment data</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Ecosystem Projects — highlighted */}
          {ecosystem.length > 0 && (
            <AlignmentSection
              title="Ecosystem"
              subtitle="Core platforms — should have full coverage"
              icon={Star}
              iconColor="text-indigo-400"
              projects={ecosystem}
              financialMap={financialMap}
              highlight
            />
          )}

          {/* Studio */}
          {studio.length > 0 && (
            <AlignmentSection
              title="Studio"
              subtitle="Art & storytelling projects"
              icon={Sparkles}
              iconColor="text-pink-400"
              projects={studio}
              financialMap={financialMap}
            />
          )}

          {/* Satellite */}
          {satellite.length > 0 && (
            <AlignmentSection
              title="Satellite"
              subtitle="Supporting projects & partnerships"
              icon={Globe}
              iconColor="text-white/50"
              projects={satellite}
              financialMap={financialMap}
            />
          )}
        </div>
      )}
    </div>
  )
}

function formatCurrency(value: number): string {
  if (value === 0) return '-'
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

function AlignmentSection({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  projects,
  financialMap,
  highlight,
}: {
  title: string
  subtitle: string
  icon: typeof Star
  iconColor: string
  projects: ProjectAlignment[]
  financialMap: Map<string, ProjectFinancialSummary>
  highlight?: boolean
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', highlight ? 'bg-indigo-500/20' : 'bg-white/5')}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-xs text-white/40">{subtitle}</p>
        </div>
      </div>

      <div className={cn('glass-card overflow-hidden', highlight && 'ring-1 ring-indigo-500/20')}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-medium text-white/40 py-3 px-4">Project</th>
              <th className="text-center text-xs font-medium text-white/40 py-3 px-2 w-10">Wt</th>
              {coverageColumns.map(col => (
                <th key={col.key} className="text-center text-xs font-medium text-white/40 py-3 px-2 w-16">
                  <col.icon className={cn('h-3.5 w-3.5 mx-auto', col.color)} />
                  <span className="block mt-0.5">{col.label}</span>
                </th>
              ))}
              <th className="text-center text-xs font-medium text-white/40 py-3 px-2 w-10">
                <Brain className="h-3.5 w-3.5 mx-auto text-cyan-400" />
                <span className="block mt-0.5">KB</span>
              </th>
              <th className="text-left text-xs font-medium text-white/40 py-3 px-4 w-32">Coverage</th>
              <th className="text-right text-xs font-medium text-white/40 py-3 px-2 w-16">FY Inc</th>
              <th className="text-right text-xs font-medium text-white/40 py-3 px-2 w-16">FY Exp</th>
              <th className="text-right text-xs font-medium text-white/40 py-3 px-2 w-16">Pipeline</th>
              <th className="text-center text-xs font-medium text-white/40 py-3 px-2 w-10">Gaps</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr
                key={project.code}
                className={cn(
                  'border-b border-white/5 hover:bg-white/5 transition-colors',
                  project.has_coverage_gaps && highlight && 'bg-red-500/5'
                )}
              >
                <td className="py-3 px-4">
                  <Link href={`/projects/${project.code}`} className="hover:text-indigo-400 transition-colors">
                    <span className="text-sm font-medium text-white">{project.name}</span>
                    <span className="text-xs text-white/30 ml-2 font-mono">{project.code}</span>
                  </Link>
                  {project.cultural_protocols && (
                    <span title="Cultural protocols apply">
                      <Shield className="inline h-3 w-3 text-amber-400 ml-1.5" />
                    </span>
                  )}
                </td>
                <td className="py-3 px-2 text-center">
                  <ImportanceBadge weight={project.importance_weight} />
                </td>
                {coverageColumns.map(col => (
                  <td key={col.key} className="py-3 px-2">
                    <CoverageCell value={project[col.key]} />
                  </td>
                ))}
                <td className="py-3 px-2 text-center">
                  <span className={cn(
                    'text-xs font-mono tabular-nums',
                    project.knowledge_count > 0 ? 'text-cyan-400' : 'text-white/20'
                  )}>
                    {project.knowledge_count || '-'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <CoverageBar score={project.coverage_score} />
                </td>
                {(() => {
                  const fin = financialMap.get(project.code)
                  return (
                    <>
                      <td className="py-3 px-2 text-right">
                        <span className={cn('text-xs font-mono tabular-nums', fin?.fy_income ? 'text-green-400' : 'text-white/20')}>
                          {fin ? formatCurrency(fin.fy_income) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={cn('text-xs font-mono tabular-nums', fin?.fy_expenses ? 'text-red-400' : 'text-white/20')}>
                          {fin ? formatCurrency(fin.fy_expenses) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={cn('text-xs font-mono tabular-nums', fin?.pipeline_value ? 'text-amber-400' : 'text-white/20')}>
                          {fin ? formatCurrency(fin.pipeline_value) : '-'}
                        </span>
                      </td>
                    </>
                  )
                })()}
                <td className="py-3 px-2 text-center">
                  {project.has_coverage_gaps && (
                    <AlertTriangle className="h-4 w-4 text-red-400 mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
