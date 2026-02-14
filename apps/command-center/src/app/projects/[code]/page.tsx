'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  FolderKanban,
  ExternalLink,
  Github,
  Globe,
  BookOpen,
  Calendar,
  DollarSign,
  Activity,
  Clock,
  Building2,
  TrendingUp,
  FileText,
  Link2,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Heart,
  Scale,
  Wheat,
  Apple,
  Palette,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  Receipt,
  CreditCard,
  GitBranch,
  MessageSquare,
} from 'lucide-react'
import { cn, formatRelativeDate } from '@/lib/utils'
import { AlmaImpact } from '@/components/alma-impact'
import {
  getNotionProjectsRaw,
  getProjectByCode,
  getRelationships,
  getGHLOpportunities,
  getProjectFinancials,
  getKnowledgeMeetings,
  getActivityStream,
  getContactName,
  getTemperatureCategory,
  type Contact,
  type NotionProject,
  type ProjectFinancials,
} from '@/lib/api'
import { ActivityTimeline } from '@/components/activity-timeline'
import { formatDistanceToNow, format } from 'date-fns'

// Map project names to icons and ACT website slugs
// URL structure: https://act.place/projects/{slug}
const projectConfig: Record<string, {
  icon: typeof FolderKanban
  color: string
  bg: string
  actPlaceSlug?: string
  github?: string
  website?: string
}> = {
  'justicehub': {
    icon: Scale,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    actPlaceSlug: 'justicehub',
    github: 'act-now-coalition/justicehub',
    website: 'https://justicehub.com.au',
  },
  'empathy ledger': {
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-500/20',
    actPlaceSlug: 'empathy-ledger',
    github: 'act-now-coalition/empathy-ledger-v2',
    website: 'https://empathy-ledger.vercel.app',
  },
  'empathy ledger platform': {
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-500/20',
    actPlaceSlug: 'empathy-ledger',
    github: 'act-now-coalition/empathy-ledger-v2',
    website: 'https://empathy-ledger.vercel.app',
  },
  'the harvest': {
    icon: Apple,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    actPlaceSlug: 'the-harvest',
    website: 'https://theharvestwitta.com.au',
  },
  'goods': {
    icon: ShoppingBag,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    actPlaceSlug: 'goods-on-country',
    website: 'https://goodsoncountry.netlify.app',
  },
  'goods.': {
    icon: ShoppingBag,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    actPlaceSlug: 'goods-on-country',
    website: 'https://goodsoncountry.netlify.app',
  },
  'the studio': {
    icon: Palette,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    github: 'act-now-coalition/act-regenerative-studio',
    website: 'https://regenerative.studio',
  },
  'the farm': {
    icon: Wheat,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
  },
  'oonchiumpa': {
    icon: FolderKanban,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    actPlaceSlug: 'oonchiumpa',
  },
  'diagrama': {
    icon: FolderKanban,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    actPlaceSlug: 'diagrama-spain',
  },
}

function getProjectConfig(name: string) {
  // Try exact match first
  const key = name.toLowerCase()
  if (projectConfig[key]) {
    return projectConfig[key]
  }

  // Try partial matching
  for (const [configKey, config] of Object.entries(projectConfig)) {
    if (key.includes(configKey) || configKey.includes(key)) {
      return config
    }
  }

  return {
    icon: FolderKanban,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/20',
  }
}

type TabId = 'overview' | 'financials' | 'pipeline' | 'alma'
const validTabs: TabId[] = ['overview', 'financials', 'pipeline', 'alma']

interface PageParams {
  params: Promise<{ code: string }>
  searchParams: Promise<{ tab?: string }>
}

export default function ProjectPage({ params, searchParams }: PageParams) {
  const { code } = use(params)
  const { tab: initialTab } = use(searchParams)

  // Fetch Notion projects
  const { data: notionData, isLoading: notionLoading } = useQuery({
    queryKey: ['projects', 'notion', 'raw'],
    queryFn: getNotionProjectsRaw,
  })

  // Fetch enriched project data
  const { data: enrichedProject } = useQuery({
    queryKey: ['project', 'enriched', code],
    queryFn: () => getProjectByCode(code),
  })

  // Fetch GHL opportunities
  const { data: ghlData } = useQuery({
    queryKey: ['ghl', 'opportunities'],
    queryFn: () => getGHLOpportunities(),
  })

  // Fetch contacts
  const { data: contactsData } = useQuery({
    queryKey: ['relationships', 'project', code],
    queryFn: () => getRelationships({ limit: 50 }),
  })

  // Fetch project financials
  const { data: financialsData } = useQuery({
    queryKey: ['project', 'financials', code],
    queryFn: () => getProjectFinancials(code),
  })

  // Fetch recent meetings for this project
  const { data: meetingsData } = useQuery({
    queryKey: ['project', 'meetings', code],
    queryFn: () => getKnowledgeMeetings({ project: code, days: 90, limit: 5 }),
  })

  // Fetch activity stream for this project
  const { data: activityData } = useQuery({
    queryKey: ['project', 'activity', code],
    queryFn: () => getActivityStream({ project: code, limit: 15 }),
  })

  // Tab state (supports ?tab=financials deep-linking from Notion)
  const defaultTab: TabId = initialTab && validTabs.includes(initialTab as TabId) ? initialTab as TabId : 'overview'
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  // Find the matching Notion project
  const notionProject = notionData?.projects?.find(p => {
    const projectName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const searchCode = code.toLowerCase().replace(/[^a-z0-9]/g, '')
    return projectName.includes(searchCode) || searchCode.includes(projectName) ||
      p.name.toLowerCase().replace(/\s+/g, '-') === code.toLowerCase()
  })

  if (notionLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (!notionProject && !enrichedProject) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-white">Project not found</h1>
          <p className="mt-2 text-white/60">Code: {code}</p>
          <Link href="/projects" className="btn-glass mt-4 inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  const projectName = notionProject?.name || enrichedProject?.name || code
  const config = getProjectConfig(projectName)
  const Icon = config.icon
  const projectData = notionProject?.data

  // Filter contacts (would need project tag matching in real implementation)
  const contacts = contactsData?.relationships?.slice(0, 10) || []

  // Filter GHL opportunities that might be related to this project
  const opportunities = ghlData?.opportunities?.filter(opp =>
    opp.pipeline_name?.toLowerCase().includes(projectName.toLowerCase().split(' ')[0]) ||
    opp.name?.toLowerCase().includes(projectName.toLowerCase().split(' ')[0])
  ) || []

  const totalOpportunityValue = opportunities.reduce((sum, opp) => sum + (opp.monetary_value || 0), 0)

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <Link href="/projects" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0', config.bg)}>
              <Icon className={cn('h-8 w-8', config.color)} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{projectName}</h1>
                {notionProject?.status && (
                  <span className={cn(
                    'px-3 py-1 rounded-lg text-sm font-medium',
                    notionProject.status.includes('Active') ? 'bg-green-500/20 text-green-400' :
                    notionProject.status.includes('Archived') ? 'bg-gray-500/20 text-gray-400' :
                    'bg-amber-500/20 text-amber-400'
                  )}>
                    {notionProject.status.replace(/\s*[🔥📦⏸️]/g, '').trim()}
                  </span>
                )}
              </div>
              {projectData?.description && (
                <p className="mt-2 text-white/60">{projectData.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-white/40 flex-wrap">
                {projectData?.projectType && (
                  <span className="flex items-center gap-1">
                    <FolderKanban className="h-3 w-3" />
                    {projectData.projectType}
                  </span>
                )}
                {projectData?.projectLead?.name && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Lead: {projectData.projectLead.name}
                  </span>
                )}
                {projectData?.themes && projectData.themes.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {projectData.themes.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {config.github && (
              <a href={`https://github.com/${config.github}`} target="_blank" rel="noopener noreferrer" className="btn-glass p-3">
                <Github className="h-5 w-5" />
              </a>
            )}
            {config.website && (
              <a href={config.website} target="_blank" rel="noopener noreferrer" className="btn-glass p-3">
                <Globe className="h-5 w-5" />
              </a>
            )}
            {projectData?.notionUrl && (
              <a href={projectData.notionUrl} target="_blank" rel="noopener noreferrer" className="btn-glass p-3">
                <FileText className="h-5 w-5" />
              </a>
            )}
            {config.actPlaceSlug && (
              <a
                href={`https://act.place/projects/${config.actPlaceSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glass p-3"
                title="View on ACT website"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            )}
            <Link
              href={`/compendium/${code}`}
              className="btn-primary px-4 py-3 flex items-center gap-2"
            >
              <BookOpen className="h-5 w-5" />
              View Compendium
            </Link>
          </div>
        </div>
      </header>

      {/* Health Score Hero (if available) */}
      {enrichedProject && (
        <div className="glass-card p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Activity className="h-5 w-5 text-indigo-400" />
                <span className={cn(
                  'text-3xl font-bold',
                  enrichedProject.healthScore >= 70 ? 'text-green-400' :
                  enrichedProject.healthScore >= 40 ? 'text-amber-400' : 'text-red-400'
                )}>
                  {enrichedProject.healthScore}
                </span>
                <span className="text-white/40">/100</span>
              </div>
              <p className="text-sm text-white/50 mt-1">Health Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{enrichedProject.contacts || 0}</p>
              <p className="text-sm text-white/50">Contacts</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{opportunities.length}</p>
              <p className="text-sm text-white/50">Opportunities</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">
                ${(totalOpportunityValue / 1000).toFixed(0)}K
              </p>
              <p className="text-sm text-white/50">Pipeline Value</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
        {[
          { id: 'overview' as const, label: 'Overview', icon: Activity },
          { id: 'financials' as const, label: 'Financials', icon: DollarSign },
          { id: 'pipeline' as const, label: 'Pipeline', icon: GitBranch },
          { id: 'alma' as const, label: 'ALMA Impact', icon: Heart },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Financials Tab */}
      {activeTab === 'financials' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {financialsData ? (
              <>
                {/* Revenue & Expense Summary */}
                <div className="glass-card p-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    Financial Summary
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-card-sm p-4 text-center">
                      <p className="text-2xl font-bold text-green-400 tabular-nums">
                        ${(financialsData.revenue / 1000).toFixed(1)}K
                      </p>
                      <p className="text-xs text-white/40 mt-1">Revenue</p>
                    </div>
                    <div className="glass-card-sm p-4 text-center">
                      <p className="text-2xl font-bold text-red-400 tabular-nums">
                        ${(financialsData.expenses / 1000).toFixed(1)}K
                      </p>
                      <p className="text-xs text-white/40 mt-1">Expenses</p>
                    </div>
                    <div className="glass-card-sm p-4 text-center">
                      <p className={cn('text-2xl font-bold tabular-nums', financialsData.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        ${(Math.abs(financialsData.net) / 1000).toFixed(1)}K
                      </p>
                      <p className="text-xs text-white/40 mt-1">Net</p>
                    </div>
                    <div className="glass-card-sm p-4 text-center">
                      <p className="text-2xl font-bold text-amber-400 tabular-nums">
                        ${(financialsData.receivable / 1000).toFixed(1)}K
                      </p>
                      <p className="text-xs text-white/40 mt-1">Receivable</p>
                    </div>
                  </div>
                </div>

                {/* Subscriptions */}
                {financialsData.subscriptions.count > 0 && (
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <CreditCard className="h-5 w-5 text-purple-400" />
                      Subscriptions
                      <span className="text-sm text-white/40 font-normal ml-auto">
                        ${financialsData.subscriptions.monthlyTotal}/mo
                      </span>
                    </h2>
                    <div className="space-y-2">
                      {financialsData.subscriptions.items.map((sub, i) => (
                        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                          <div>
                            <span className="text-sm font-medium text-white">{sub.name}</span>
                            <span className="text-xs text-white/40 ml-2">{sub.provider}</span>
                          </div>
                          <span className="text-sm text-white/70 tabular-nums">${sub.monthlyCost}/mo</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoices */}
                {financialsData.invoices.length > 0 && (
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <Receipt className="h-5 w-5 text-blue-400" />
                      Invoices
                    </h2>
                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5">
                            <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-2">Number</th>
                            <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-2">Contact</th>
                            <th className="text-right text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-2">Total</th>
                            <th className="text-right text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-2">Due</th>
                            <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financialsData.invoices.map(inv => (
                            <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="px-4 py-2 text-sm text-white">{inv.number || '-'}</td>
                              <td className="px-4 py-2 text-sm text-white/70">
                                {inv.contact ? (
                                  <Link href={`/people?search=${encodeURIComponent(inv.contact)}`} className="hover:text-indigo-400 transition-colors">
                                    {inv.contact}
                                  </Link>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-white/70 text-right tabular-nums">${inv.total.toLocaleString()}</td>
                              <td className="px-4 py-2 text-sm text-white/70 text-right tabular-nums">${inv.due.toLocaleString()}</td>
                              <td className="px-4 py-2">
                                <span className={cn(
                                  'text-xs px-2 py-0.5 rounded',
                                  inv.status === 'PAID' ? 'bg-green-500/20 text-green-400' :
                                  inv.status === 'AUTHORISED' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-white/10 text-white/60'
                                )}>
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Grant Funding */}
                {financialsData.grants && financialsData.grants.length > 0 && (
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-amber-400" />
                      Grant Funding
                    </h2>
                    <div className="space-y-2">
                      {financialsData.grants.map((grant, i) => (
                        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-white">{grant.name}</span>
                            {grant.provider && <span className="text-xs text-white/40 ml-2">{grant.provider}</span>}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-sm text-white/70 tabular-nums">
                              ${(grant.outcomeAmount || grant.amountRequested).toLocaleString()}
                            </span>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded capitalize',
                              grant.status === 'successful' ? 'bg-green-500/20 text-green-400' :
                              grant.status === 'submitted' || grant.status === 'under_review' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-white/10 text-white/60'
                            )}>
                              {grant.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monthly Trend Chart */}
                {financialsData.monthlyTrend && financialsData.monthlyTrend.some(m => m.income > 0 || m.expenses > 0) && (
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <Activity className="h-5 w-5 text-blue-400" />
                      Monthly Trend
                    </h2>
                    <div className="space-y-2">
                      {financialsData.monthlyTrend.filter(m => m.income > 0 || m.expenses > 0).map((m, i) => {
                        const maxVal = Math.max(...financialsData.monthlyTrend.map(t => Math.max(t.income, t.expenses)))
                        const incPct = maxVal > 0 ? (m.income / maxVal) * 100 : 0
                        const expPct = maxVal > 0 ? (m.expenses / maxVal) * 100 : 0
                        const [yr, mo] = m.month.split('-')
                        const label = new Date(parseInt(yr), parseInt(mo) - 1).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-14 text-white/40">{label}</span>
                            <div className="flex-1 flex gap-1">
                              <div className="h-4 rounded bg-emerald-500/60" style={{ width: `${incPct}%`, minWidth: incPct > 0 ? '2px' : '0' }} />
                              <div className="h-4 rounded bg-red-500/60" style={{ width: `${expPct}%`, minWidth: expPct > 0 ? '2px' : '0' }} />
                            </div>
                            <span className="w-16 text-right text-white/50 tabular-nums">${Math.round(m.income - m.expenses).toLocaleString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* === Project-Specific Deep Widgets === */}

                {/* Harvest (ACT-HV): Grant scenario modeling + staff projections */}
                {financialsData.projectCode === 'ACT-HV' && (
                  <div className="glass-card p-6 border border-green-500/20">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <Apple className="h-5 w-5 text-green-400" />
                      Harvest Deep View
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="glass-card-sm p-4 text-center">
                        <p className="text-xl font-bold text-green-400">$100K</p>
                        <p className="text-xs text-white/40 mt-1">Grant Target</p>
                      </div>
                      <div className="glass-card-sm p-4 text-center">
                        <p className="text-xl font-bold text-amber-400">$45K</p>
                        <p className="text-xs text-white/40 mt-1">RAA Grant</p>
                      </div>
                      <div className="glass-card-sm p-4 text-center">
                        <p className="text-xl font-bold text-blue-400">$26K/yr</p>
                        <p className="text-xs text-white/40 mt-1">Staff (Susie)</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {financialsData.grants?.filter(g => g.status === 'successful').map((g, i) => (
                        <div key={i} className="flex justify-between items-center py-1.5 px-3 rounded bg-green-500/10">
                          <span className="text-sm text-white/70">{g.name}</span>
                          <span className="text-sm text-green-400 font-medium">${(g.outcomeAmount || g.amountRequested).toLocaleString()}</span>
                        </div>
                      ))}
                      {financialsData.ecosystemActivity && (
                        <p className="text-xs text-white/40 mt-2">
                          Storyteller activity: {financialsData.ecosystemActivity.crmTouches} contacts, {financialsData.ecosystemActivity.emailCount} emails
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Goods (ACT-GD): Manufacturing costs + content metrics */}
                {financialsData.projectCode === 'ACT-GD' && (
                  <div className="glass-card p-6 border border-orange-500/20">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <ShoppingBag className="h-5 w-5 text-orange-400" />
                      Goods Deep View
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="glass-card-sm p-4 text-center">
                        <p className="text-xl font-bold text-orange-400">
                          {financialsData.ecosystemActivity?.contentCount || 0}
                        </p>
                        <p className="text-xs text-white/40 mt-1">Content Library</p>
                      </div>
                      <div className="glass-card-sm p-4 text-center">
                        <p className="text-xl font-bold text-red-400">
                          ${(financialsData.recentTransactions
                            .filter(tx => tx.contactName?.toLowerCase().includes('defy'))
                            .reduce((s, tx) => s + Math.abs(tx.amount), 0) / 1000).toFixed(1)}K
                        </p>
                        <p className="text-xs text-white/40 mt-1">Defy Mfg Costs</p>
                      </div>
                      <div className="glass-card-sm p-4 text-center">
                        <p className="text-xl font-bold text-blue-400">
                          {financialsData.revenue > 0 && financialsData.grants?.some(g => g.status === 'successful')
                            ? `${Math.round((financialsData.revenue / (financialsData.revenue + financialsData.grants.filter(g => g.status === 'successful').reduce((s, g) => s + (g.outcomeAmount || 0), 0))) * 100)}%`
                            : '0%'}
                        </p>
                        <p className="text-xs text-white/40 mt-1">Earned vs Grant</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Farm: Infrastructure + capex/opex */}
                {(code === 'the-farm' || financialsData.projectCode === 'ACT-FM') && (
                  <div className="glass-card p-6 border border-amber-500/20">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <Wheat className="h-5 w-5 text-amber-400" />
                      Farm Deep View
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-card-sm p-4 text-center">
                        <p className="text-xl font-bold text-amber-400">$30K</p>
                        <p className="text-xs text-white/40 mt-1">Infrastructure Allocation</p>
                      </div>
                      <div className="glass-card-sm p-4 text-center">
                        <p className="text-xl font-bold text-blue-400">
                          {financialsData.recentTransactions.length}
                        </p>
                        <p className="text-xs text-white/40 mt-1">Transactions</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Transactions */}
                {financialsData.recentTransactions.length > 0 && (
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                      Recent Transactions
                    </h2>
                    <div className="space-y-1">
                      {financialsData.recentTransactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                          <div>
                            <span className="text-sm text-white">{tx.description}</span>
                            <span className="text-xs text-white/30 ml-2">{tx.date}</span>
                          </div>
                          <span className={cn(
                            'text-sm font-medium tabular-nums',
                            tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                          )}>
                            {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card p-12 text-center">
                <DollarSign className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">Loading financial data...</p>
              </div>
            )}
          </div>
          {/* Right column - enhanced sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Budget vs Actual */}
            {financialsData && financialsData.budget && financialsData.budget > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-400" />
                  Budget vs Actual
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Budget</span>
                    <span className="text-white font-medium">${(financialsData.budget / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        financialsData.budgetUsed > 100 ? 'bg-red-500' :
                        financialsData.budgetUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${Math.min(financialsData.budgetUsed, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-white/50">
                    <span>{financialsData.budgetUsed}% used</span>
                    <span>${((financialsData.budget - financialsData.expenses) / 1000).toFixed(1)}K remaining</span>
                  </div>
                </div>
              </div>
            )}

            {/* Budget from Notion if available (fallback when no API budget) */}
            {projectData?.budget && projectData.budget > 0 && !(financialsData?.budget && financialsData.budget > 0) && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-400" />
                  Notion Budget
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Budget</span>
                    <span className="text-white font-medium">${(projectData.budget / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Actual Revenue</span>
                    <span className="text-green-400 font-medium">${(projectData.revenueActual / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Potential</span>
                    <span className="text-amber-400 font-medium">${(projectData.revenuePotential / 1000).toFixed(0)}K</span>
                  </div>
                  {financialsData && (
                    <div className="pt-3 mt-3 border-t border-white/10">
                      <div className="flex justify-between">
                        <span className="text-white/40">Xero Expenses</span>
                        <span className="text-red-400 font-medium">${(financialsData.expenses / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-white/40">Budget Remaining</span>
                        <span className={cn('font-medium', (projectData.budget - financialsData.expenses) >= 0 ? 'text-green-400' : 'text-red-400')}>
                          ${((projectData.budget - financialsData.expenses) / 1000).toFixed(1)}K
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ecosystem Activity */}
            {financialsData?.ecosystemActivity && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  Ecosystem Activity
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold text-blue-400">{financialsData.ecosystemActivity.emailCount}</p>
                    <p className="text-xs text-white/40">Emails</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-purple-400">{financialsData.ecosystemActivity.crmTouches}</p>
                    <p className="text-xs text-white/40">CRM</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-pink-400">{financialsData.ecosystemActivity.contentCount}</p>
                    <p className="text-xs text-white/40">Content</p>
                  </div>
                </div>
              </div>
            )}

            {/* Key Stakeholders */}
            {financialsData?.keyStakeholders && financialsData.keyStakeholders.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-400" />
                  Key Stakeholders
                </h3>
                <div className="space-y-2">
                  {financialsData.keyStakeholders.slice(0, 8).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/people?search=${encodeURIComponent(s.name)}`} className="text-sm text-white/80 truncate block hover:text-indigo-400 transition-colors">{s.name}</Link>
                        {s.company && <p className="text-xs text-white/40 truncate">{s.company}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fundraising */}
            {financialsData?.fundraising && financialsData.fundraising.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  Fundraising
                </h3>
                <div className="space-y-2">
                  {financialsData.fundraising.map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-sm text-white/70 truncate">{f.name}</span>
                      <span className="text-sm text-white/60 tabular-nums ml-2">${f.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Health Score */}
            {financialsData?.healthScore != null && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-400" />
                  Health Score
                </h3>
                <div className="text-center">
                  <span className={cn(
                    'text-4xl font-bold',
                    financialsData.healthScore >= 60 ? 'text-green-400' :
                    financialsData.healthScore >= 30 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {financialsData.healthScore}
                  </span>
                  <span className="text-white/40 text-lg">/100</span>
                </div>
              </div>
            )}

            {/* Data Completeness */}
            {financialsData?.dataCompleteness && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                  Data Completeness
                </h3>
                <div className="text-center mb-3">
                  <span className={cn(
                    'text-2xl font-bold',
                    financialsData.dataCompleteness.score >= 70 ? 'text-emerald-400' :
                    financialsData.dataCompleteness.score >= 40 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {financialsData.dataCompleteness.score}%
                  </span>
                  <span className="text-white/40 text-sm ml-1">aligned</span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(financialsData.dataCompleteness.sources).map(([source, has]) => (
                    <div key={source} className="flex items-center justify-between text-xs">
                      <span className="text-white/50 capitalize">{source}</span>
                      <span className={has ? 'text-emerald-400' : 'text-white/20'}>
                        {has ? '●' : '○'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GHL Pipeline (from API) */}
            {financialsData?.opportunities && financialsData.opportunities.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-purple-400" />
                  GHL Pipeline
                </h3>
                <div className="space-y-2">
                  {financialsData.opportunities.slice(0, 5).map((opp) => (
                    <div key={opp.id} className="py-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80 truncate flex-1">{opp.name}</span>
                        {opp.value > 0 && (
                          <span className="text-xs text-green-400 font-medium ml-2">
                            ${(opp.value / 1000).toFixed(0)}K
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/40">{opp.pipeline} · {opp.stage || opp.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {opportunities.length > 0 ? (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <GitBranch className="h-5 w-5 text-indigo-400" />
                Pipeline Opportunities
                <span className="text-sm text-white/40 font-normal ml-auto">
                  {opportunities.length} deal{opportunities.length !== 1 ? 's' : ''} &middot; ${(totalOpportunityValue / 1000).toFixed(0)}K total
                </span>
              </h2>
              <div className="space-y-3">
                {opportunities.map((opp: any) => (
                  <div key={opp.id} className="glass-card-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{opp.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-white/40">{opp.pipeline_name}</span>
                          <span className="text-xs text-white/20">&bull;</span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded',
                            opp.status === 'won' ? 'bg-green-500/20 text-green-400' :
                            opp.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-white/10 text-white/60'
                          )}>
                            {opp.stage_name}
                          </span>
                        </div>
                      </div>
                      {opp.monetary_value > 0 && (
                        <span className="text-lg font-semibold text-green-400 tabular-nums">
                          ${(opp.monetary_value / 1000).toFixed(0)}K
                        </span>
                      )}
                    </div>
                    {opp.contact_name && (
                      <p className="text-sm text-white/50 mt-2">
                        Contact: <Link href={`/people?search=${encodeURIComponent(opp.contact_name)}`} className="hover:text-indigo-400 transition-colors">{opp.contact_name}</Link>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <GitBranch className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white/60 mb-2">No pipeline opportunities</h2>
              <p className="text-white/40">No GHL opportunities linked to this project yet.</p>
              <Link href="/opportunities" className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                View full pipeline &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ALMA Impact Tab */}
      {activeTab === 'alma' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <AlmaImpact projectName={projectName} />
          </div>
          <div className="lg:col-span-4">
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-3">About ALMA</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                The ALMA framework measures project impact through four dimensions
                that reflect ACT's commitment to community-led development.
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500/40 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">Autonomy</span>
                    <span className="text-white/40"> - Can the community operate independently?</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500/40 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">Legibility</span>
                    <span className="text-white/40"> - Is the impact transparent and measurable?</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500/40 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">Mutuality</span>
                    <span className="text-white/40"> - Does value flow both ways?</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/40 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">Accountability</span>
                    <span className="text-white/40"> - Is the project answerable to its community?</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Tab - Main Grid */}
      {activeTab === 'overview' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-8 space-y-6">
          {/* Budget (from Notion) */}
          {projectData?.budget && projectData.budget > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-400" />
                Budget & Funding
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">
                    ${(projectData.budget / 1000).toFixed(0)}K
                  </p>
                  <p className="text-sm text-white/50">Total Budget</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    ${(projectData.revenueActual / 1000).toFixed(0)}K
                  </p>
                  <p className="text-sm text-white/50">Actual Revenue</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">
                    ${(projectData.revenuePotential / 1000).toFixed(0)}K
                  </p>
                  <p className="text-sm text-white/50">Potential Revenue</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-400">
                    ${(projectData.totalFunding / 1000).toFixed(0)}K
                  </p>
                  <p className="text-sm text-white/50">Total Funding</p>
                </div>
              </div>
              {projectData.budget > 0 && projectData.revenueActual > 0 && (
                <>
                  <div className="h-3 rounded-full bg-white/10 overflow-hidden mt-4">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                      style={{ width: `${Math.min((projectData.revenueActual / projectData.budget) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    {Math.round((projectData.revenueActual / projectData.budget) * 100)}% of budget realized
                  </p>
                </>
              )}
            </div>
          )}

          {/* Opportunities from enriched data */}
          {enrichedProject?.opportunities && enrichedProject.opportunities.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Action Items
              </h2>
              <div className="space-y-3">
                {enrichedProject.opportunities.map((opp, idx) => (
                  <div key={idx} className="glass-card-sm p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-2',
                          opp.priority === 'high' ? 'bg-red-400' :
                          opp.priority === 'medium' ? 'bg-amber-400' : 'bg-green-400'
                        )} />
                        <div>
                          <h3 className="font-medium text-white">{opp.title}</h3>
                          <p className="text-sm text-white/50 mt-1">{opp.description}</p>
                          {opp.action && (
                            <p className="text-xs text-indigo-400 mt-2">{opp.action}</p>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        opp.type === 'relationship' ? 'bg-pink-500/20 text-pink-400' :
                        opp.type === 'storytelling' ? 'bg-purple-500/20 text-purple-400' :
                        opp.type === 'communication' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/10 text-white/60'
                      )}>
                        {opp.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GHL Opportunities */}
          {opportunities.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
                Pipeline Opportunities
              </h2>
              <div className="space-y-3">
                {opportunities.slice(0, 5).map((opp) => (
                  <div key={opp.id} className="glass-card-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{opp.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-white/40">{opp.pipeline_name}</span>
                          <span className="text-xs text-white/20">•</span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded',
                            opp.status === 'won' ? 'bg-green-500/20 text-green-400' :
                            opp.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-white/10 text-white/60'
                          )}>
                            {opp.stage_name}
                          </span>
                        </div>
                      </div>
                      {opp.monetary_value && (
                        <span className="text-lg font-semibold text-green-400">
                          ${(opp.monetary_value / 1000).toFixed(0)}K
                        </span>
                      )}
                    </div>
                    {opp.contact_name && (
                      <p className="text-sm text-white/50 mt-2">
                        Contact: {opp.contact_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Meetings */}
          {meetingsData && meetingsData.meetings.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                Recent Meetings
                <span className="text-sm text-white/40 font-normal ml-auto">
                  {meetingsData.count} in last 90 days
                </span>
              </h2>
              <div className="space-y-3">
                {meetingsData.meetings.map((m) => (
                  <div key={m.id} className="glass-card-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white text-sm truncate">{m.title}</h3>
                        {m.summary && (
                          <p className="text-xs text-white/50 mt-1 line-clamp-2">{m.summary}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {m.recorded_at && (
                            <span className="text-xs text-white/30">
                              {format(new Date(m.recorded_at), 'MMM d, yyyy')}
                            </span>
                          )}
                          {m.participants && m.participants.length > 0 && (
                            <span className="text-xs text-white/30 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {m.participants.length}
                            </span>
                          )}
                        </div>
                      </div>
                      {m.source_url && (
                        <a
                          href={m.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/30 hover:text-white/70 transition-colors shrink-0 mt-1"
                          title="Open in Notion"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href={`/knowledge/meetings?project=${code}`}
                className="btn-glass w-full flex items-center justify-center gap-2 mt-4"
              >
                <MessageSquare className="h-4 w-4" />
                View All Meetings
              </Link>
            </div>
          )}

          {/* Activity Timeline */}
          {activityData && activityData.activities.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-indigo-400" />
                Recent Activity
                <span className="text-sm text-white/40 font-normal ml-auto">
                  {activityData.activities.length} events
                </span>
              </h2>
              <ActivityTimeline activities={activityData.activities} showFilters={true} />
            </div>
          )}

          {/* Milestones */}
          {projectData?.nextMilestoneDate && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-orange-400" />
                Timeline
              </h2>
              <div className="space-y-3">
                {projectData.startDate && (
                  <div className="flex items-center justify-between py-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                      <span className="text-white">Project Start</span>
                    </div>
                    <span className="text-sm text-white/50">
                      {format(new Date(projectData.startDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <span className="text-white">Next Milestone</span>
                  </div>
                  <span className="text-sm text-white/50">
                    {format(new Date(projectData.nextMilestoneDate), 'MMM d, yyyy')}
                  </span>
                </div>
                {projectData.endDate && (
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <span className="text-white">Target End Date</span>
                    </div>
                    <span className="text-sm text-white/50">
                      {format(new Date(projectData.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Project Lead */}
          {projectData?.projectLead && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-cyan-400" />
                Project Lead
              </h2>
              <div className="flex items-center gap-3">
                {projectData.projectLead.avatarUrl ? (
                  <img
                    src={projectData.projectLead.avatarUrl}
                    alt={projectData.projectLead.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-lg font-medium text-white">
                      {projectData.projectLead.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-white">{projectData.projectLead.name}</p>
                  <p className="text-sm text-white/50">Project Lead</p>
                </div>
              </div>
            </div>
          )}

          {/* Related Contacts */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Link2 className="h-5 w-5 text-pink-400" />
              Related Contacts
            </h2>
            {contacts.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">
                No contacts linked yet
              </p>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => {
                  const name = getContactName(contact)
                  const tempCategory = getTemperatureCategory(contact.temperature)
                  return (
                    <div key={contact.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        tempCategory === 'hot' ? 'bg-red-500/20' :
                        tempCategory === 'warm' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                      )}>
                        <span className="text-xs font-medium text-white">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate capitalize">{name}</p>
                        {contact.tags && contact.tags.length > 0 && (
                          <p className="text-xs text-white/40 truncate">{contact.tags.slice(0, 2).join(', ')}</p>
                        )}
                      </div>
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        tempCategory === 'hot' ? 'bg-red-400' :
                        tempCategory === 'warm' ? 'bg-orange-400' : 'bg-blue-400'
                      )} />
                    </div>
                  )
                })}
              </div>
            )}
            <Link
              href={`/people`}
              className="btn-glass w-full flex items-center justify-center gap-2 mt-4"
            >
              <Users className="h-4 w-4" />
              View All Contacts
            </Link>
          </div>

          {/* Quick Links */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <ExternalLink className="h-5 w-5 text-indigo-400" />
              Quick Links
            </h2>
            <div className="space-y-2">
              {config.actPlaceSlug && (
                <a
                  href={`https://act.place/projects/${config.actPlaceSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <BookOpen className="h-4 w-4 text-orange-400" />
                  <span className="text-sm text-white">ACT Project Page</span>
                </a>
              )}
              {config.github && (
                <a
                  href={`https://github.com/${config.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Github className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white">GitHub Repository</span>
                </a>
              )}
              {config.website && (
                <a
                  href={config.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Globe className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm text-white">Live Website</span>
                </a>
              )}
              {projectData?.notionUrl && (
                <a
                  href={projectData.notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <FileText className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white">Notion Page</span>
                </a>
              )}
              <Link
                href={`/finance`}
                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white">Finance Dashboard</span>
              </Link>
            </div>
          </div>

          {/* Metadata */}
          {notionProject && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-white/40" />
                Metadata
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Last Synced</span>
                  <span className="text-white/70">
                    {formatDistanceToNow(new Date(notionProject.last_synced), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Updated</span>
                  <span className="text-white/70">
                    {formatDistanceToNow(new Date(notionProject.updated_at), { addSuffix: true })}
                  </span>
                </div>
                {projectData?.relatedActions && projectData.relatedActions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Related Actions</span>
                    <span className="text-white/70">{projectData.relatedActions.length}</span>
                  </div>
                )}
                {projectData?.relatedOrganisations && projectData.relatedOrganisations.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Related Orgs</span>
                    <span className="text-white/70">{projectData.relatedOrganisations.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
