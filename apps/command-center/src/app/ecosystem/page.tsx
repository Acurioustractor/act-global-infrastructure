'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import {
  Layers,
  Github,
  Globe,
  Database,
  ExternalLink,
  Search,
  Server,
  Code2,
  BookOpen,
  Link2,
  Activity,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  Bot,
  Heart,
  Scale,
  Wheat,
  Apple,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getEcosystem,
  getConnectors,
  getKnowledgeStats,
  getRelationshipHealth,
  getAgentsList,
  getProposals,
  type EcosystemSite,
} from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

// Map project slugs to icons and colors
const projectMeta: Record<string, { icon: typeof Globe; color: string; bg: string }> = {
  'act-main': { icon: Globe, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  'justicehub': { icon: Scale, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  'empathy-ledger': { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  'harvest': { icon: Wheat, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  'the-farm': { icon: Apple, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  'goods': { icon: Apple, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  'command-center': { icon: Server, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
}

// Category display config aligned with tier system
const categoryConfig: Record<string, { name: string; icon: typeof Globe; color: string }> = {
  ecosystem: { name: 'Ecosystem Platforms', icon: Layers, color: 'text-indigo-400' },
  infrastructure: { name: 'Infrastructure', icon: Server, color: 'text-cyan-400' },
  studio: { name: 'The Studio', icon: Heart, color: 'text-pink-400' },
  // fallbacks
  core: { name: 'Core', icon: Server, color: 'text-indigo-400' },
  platform: { name: 'Platforms', icon: Layers, color: 'text-purple-400' },
  community: { name: 'Community', icon: Users, color: 'text-green-400' },
}

function getStatusIcon(status: string) {
  if (status === 'healthy') return <CheckCircle2 className="h-4 w-4 text-green-400" />
  if (status === 'degraded') return <AlertTriangle className="h-4 w-4 text-amber-400" />
  return <AlertCircle className="h-4 w-4 text-red-400" />
}

function getStatusBadge(status: string) {
  if (status === 'healthy') return 'badge-cool'
  if (status === 'degraded') return 'badge-warm'
  return 'badge-hot'
}

function getTrendIcon(trend: string) {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-400" />
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-400" />
  return <Minus className="h-3 w-3 text-white/40" />
}

export default function EcosystemPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch all real data
  const { data: ecosystemData, isLoading: ecosystemLoading, refetch: refetchEcosystem } = useQuery({
    queryKey: ['ecosystem'],
    queryFn: getEcosystem,
    refetchInterval: 60000, // Refresh every minute
  })

  const { data: connectorsData } = useQuery({
    queryKey: ['connectors'],
    queryFn: getConnectors,
  })

  const { data: knowledgeStats } = useQuery({
    queryKey: ['knowledge', 'stats'],
    queryFn: getKnowledgeStats,
  })

  const { data: healthData } = useQuery({
    queryKey: ['relationships', 'health'],
    queryFn: getRelationshipHealth,
  })

  const { data: agentsData } = useQuery({
    queryKey: ['agents', 'list'],
    queryFn: getAgentsList,
  })

  const { data: proposalsData } = useQuery({
    queryKey: ['proposals', 'pending'],
    queryFn: () => getProposals('pending'),
  })

  const sites = ecosystemData?.sites || []
  const categories = ecosystemData?.categories || {}
  const health = ecosystemData?.health || { healthy: 0, total: 0, percentage: 0 }

  const connectors = connectorsData?.connectors || []
  const configuredConnectors = connectors.filter(c => c.status === 'configured')
  const agents = Array.isArray(agentsData) ? agentsData : []
  const proposals = proposalsData?.proposals || []

  // Filter sites based on search
  const filteredSites = sites.filter(site =>
    !searchQuery ||
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Layers className="h-7 w-7 md:h-8 md:w-8 text-indigo-400" />
              ACT Ecosystem
            </h1>
            <p className="mt-1 md:mt-2 text-sm md:text-base text-white/60">
              Real-time health monitoring for all platforms and integrations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search platforms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-glass pl-10 w-48 md:w-64"
              />
            </div>
            <button
              onClick={() => refetchEcosystem()}
              className="btn-glass p-2.5"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", ecosystemLoading && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      {/* Health Summary Bar */}
      <div className="glass-card p-4 mb-6 md:mb-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">{sites.length}</p>
            <p className="text-xs text-white/50">Platforms</p>
          </div>
          <div className="text-center">
            <p className={cn(
              "text-2xl md:text-3xl font-bold",
              health.percentage >= 70 ? "text-green-400" : health.percentage >= 40 ? "text-amber-400" : "text-red-400"
            )}>
              {health.healthy}/{health.total}
            </p>
            <p className="text-xs text-white/50">Healthy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-blue-400">{healthData?.total || 0}</p>
            <p className="text-xs text-white/50">Contacts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-purple-400">{configuredConnectors.length}</p>
            <p className="text-xs text-white/50">Integrations</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-cyan-400">{agents.length}</p>
            <p className="text-xs text-white/50">Agents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-amber-400">{proposals.length}</p>
            <p className="text-xs text-white/50">Pending</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Platforms - Left side */}
        <div className="lg:col-span-8 space-y-6">
          {/* Platform Cards by Category */}
          {Object.entries(categories).map(([catKey, category]) => {
            const catSites = category.sites.filter(site =>
              !searchQuery ||
              site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              site.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            if (catSites.length === 0) return null

            return (
              <div key={catKey} className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    {(() => {
                      const catConf = categoryConfig[catKey]
                      const CatIcon = catConf?.icon || Globe
                      return <CatIcon className={cn('h-5 w-5', catConf?.color || 'text-white/60')} />
                    })()}
                    {categoryConfig[catKey]?.name || category.name}
                  </h2>
                  <span className="text-sm text-white/50">{catSites.length} sites</span>
                </div>

                <div className="space-y-3">
                  {catSites.map((site) => {
                    const meta = projectMeta[site.slug] || { icon: Globe, color: 'text-white/60', bg: 'bg-white/10' }
                    const Icon = meta.icon

                    return (
                      <div key={site.id} className="glass-card-sm p-4 hover:border-indigo-500/30 transition-all group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', meta.bg)}>
                              <Icon className={cn('h-6 w-6', meta.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-lg font-semibold text-white">{site.name}</h3>
                                <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusBadge(site.status))}>
                                  {site.status}
                                </span>
                                {site.health_score > 0 && (
                                  <span className="text-xs text-white/40 flex items-center gap-1">
                                    {site.health_score}/100
                                    {getTrendIcon(site.health_trend)}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-white/60">{site.description}</p>

                              {/* Stats row */}
                              <div className="flex items-center gap-4 mt-2 text-xs text-white/40 flex-wrap">
                                {site.response_time_ms > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {site.response_time_ms}ms
                                  </span>
                                )}
                                {site.last_check_at && (
                                  <span>
                                    Checked {formatDistanceToNow(new Date(site.last_check_at), { addSuffix: true })}
                                  </span>
                                )}
                                {site.ssl_expires_at && (
                                  <span className="text-amber-400/70">
                                    SSL expires {formatDistanceToNow(new Date(site.ssl_expires_at), { addSuffix: true })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Links */}
                          <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            {getStatusIcon(site.status)}
                            <Link
                              href={`/ecosystem/${site.slug}`}
                              className="btn-glass p-2"
                              title="View details"
                            >
                              <Activity className="h-4 w-4" />
                            </Link>
                            <a
                              href={site.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-glass p-2"
                              title="Open site"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Agents Section */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Bot className="h-5 w-5 text-cyan-400" />
                Registered Agents
              </h2>
              <Link href="/system" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                View All <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {agents.slice(0, 8).map((agent) => (
                <div key={agent.id} className="glass-card-sm p-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      agent.status === 'active' ? 'bg-green-400' : 'bg-white/30'
                    )} />
                    <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1 capitalize">{agent.domain}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Knowledge Base */}
          <div className="glass-card-accent p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">ACT Compendium</h2>
                <p className="text-sm text-white/50">Living knowledge wiki</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{knowledgeStats?.stats?.chunks?.total || 0}</p>
                <p className="text-xs text-white/50">Chunks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400">{knowledgeStats?.stats?.knowledge?.total || 0}</p>
                <p className="text-xs text-white/50">Knowledge</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{knowledgeStats?.stats?.graph?.totalEdges || 0}</p>
                <p className="text-xs text-white/50">Graph Edges</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="glass-card-sm p-2 text-center">
                <p className="text-lg font-bold text-pink-400">{knowledgeStats?.stats?.memory?.episodes || 0}</p>
                <p className="text-xs text-white/50">Episodes</p>
              </div>
              <div className="glass-card-sm p-2 text-center">
                <p className="text-lg font-bold text-purple-400">{knowledgeStats?.stats?.communications?.embedded || 0}</p>
                <p className="text-xs text-white/50">Comms Embedded</p>
              </div>
            </div>
            <Link
              href="/wiki"
              className="btn-glass w-full flex items-center justify-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Open Wiki
            </Link>
          </div>

          {/* Integrations */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Link2 className="h-5 w-5 text-indigo-400" />
                Integrations
              </h2>
              <span className="text-xs text-white/50">{configuredConnectors.length}/{connectors.length} active</span>
            </div>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <div key={connector.name} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      connector.status === 'configured' ? 'bg-green-500/20' : 'bg-red-500/20'
                    )}>
                      {connector.type === 'database' && <Database className={cn('h-4 w-4', connector.status === 'configured' ? 'text-green-400' : 'text-red-400')} />}
                      {connector.type === 'crm' && <Users className={cn('h-4 w-4', connector.status === 'configured' ? 'text-green-400' : 'text-red-400')} />}
                      {connector.type === 'finance' && <Activity className={cn('h-4 w-4', connector.status === 'configured' ? 'text-green-400' : 'text-red-400')} />}
                      {connector.type === 'ai' && <Zap className={cn('h-4 w-4', connector.status === 'configured' ? 'text-green-400' : 'text-red-400')} />}
                      {connector.type === 'api' && <Code2 className={cn('h-4 w-4', connector.status === 'configured' ? 'text-green-400' : 'text-red-400')} />}
                      {!['database', 'crm', 'finance', 'ai', 'api'].includes(connector.type) && (
                        <Link2 className={cn('h-4 w-4', connector.status === 'configured' ? 'text-green-400' : 'text-red-400')} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{connector.name}</p>
                      <p className="text-xs text-white/40 capitalize">{connector.type}</p>
                    </div>
                  </div>
                  {connector.status === 'configured' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Relationship Health */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Relationships
              </h2>
              <Link href="/people" className="text-xs text-blue-400 hover:text-blue-300">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="glass-card-sm p-3 text-center">
                <p className="text-xl font-bold text-red-400">{healthData?.hot || 0}</p>
                <p className="text-xs text-white/50">Hot</p>
              </div>
              <div className="glass-card-sm p-3 text-center">
                <p className="text-xl font-bold text-orange-400">{healthData?.warm || 0}</p>
                <p className="text-xs text-white/50">Warm</p>
              </div>
              <div className="glass-card-sm p-3 text-center">
                <p className="text-xl font-bold text-blue-400">{healthData?.cool || 0}</p>
                <p className="text-xs text-white/50">Cool</p>
              </div>
            </div>
            {healthData?.needsAttention && healthData.needsAttention > 0 && (
              <div className="mt-3 glass-card-sm p-2 bg-amber-500/10 border-amber-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-amber-400">
                    {healthData.needsAttention} need attention
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-white/60" />
              Quick Links
            </h2>
            <div className="space-y-2">
              <a href="https://github.com/act-now-coalition" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                <Github className="h-4 w-4 text-white/60" />
                <span className="text-sm text-white">GitHub Organization</span>
              </a>
              <a href="https://vercel.com/act-now-coalition" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                <Globe className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-white">Vercel Dashboard</span>
              </a>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                <Database className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white">Supabase Dashboard</span>
              </a>
              <Link href="/wiki" className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                <BookOpen className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-white">ACT Compendium</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
