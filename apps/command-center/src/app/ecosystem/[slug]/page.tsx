'use client'

import { use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  ExternalLink,
  Github,
  Globe,
  Database,
  Server,
  Clock,
  RefreshCw,
  Shield,
  Activity,
  GitCommit,
  GitPullRequest,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Scale,
  Wheat,
  Apple,
  Code2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getEcosystemSiteDetails,
  getEcosystemHealthHistory,
  getEcosystemDeployments,
  triggerHealthCheck,
} from '@/lib/api'
import { formatDistanceToNow, format } from 'date-fns'
import { AreaChart, Card } from '@tremor/react'

// Map slugs to icons and colors
const siteConfig: Record<string, { icon: typeof Globe; color: string; bg: string }> = {
  'act-main': { icon: Globe, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  'justicehub': { icon: Scale, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  'empathy-ledger': { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  'harvest': { icon: Apple, color: 'text-green-400', bg: 'bg-green-500/20' },
  'goods': { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  'command-center': { icon: Server, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
}

function getStatusBadge(status: string) {
  if (status === 'healthy') return 'bg-green-500/20 text-green-400'
  if (status === 'degraded') return 'bg-amber-500/20 text-amber-400'
  return 'bg-red-500/20 text-red-400'
}

function getStatusIcon(status: string) {
  if (status === 'healthy') return <CheckCircle2 className="h-5 w-5 text-green-400" />
  if (status === 'degraded') return <AlertTriangle className="h-5 w-5 text-amber-400" />
  return <AlertCircle className="h-5 w-5 text-red-400" />
}

interface PageParams {
  params: Promise<{ slug: string }>
}

export default function EcosystemSiteDetailPage({ params }: PageParams) {
  const { slug } = use(params)
  const queryClient = useQueryClient()

  const { data: siteData, isLoading, error } = useQuery({
    queryKey: ['ecosystem', 'site', slug],
    queryFn: () => getEcosystemSiteDetails(slug),
  })

  const { data: historyData } = useQuery({
    queryKey: ['ecosystem', 'history', slug],
    queryFn: () => getEcosystemHealthHistory(slug, 30),
  })

  const { data: deploymentsData } = useQuery({
    queryKey: ['ecosystem', 'deployments', slug],
    queryFn: () => getEcosystemDeployments(slug, 10),
  })

  const healthCheckMutation = useMutation({
    mutationFn: () => triggerHealthCheck(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecosystem'] })
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (error || !siteData?.site) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-white">Site not found</h1>
          <p className="mt-2 text-white/60">Slug: {slug}</p>
          <Link href="/ecosystem" className="btn-glass mt-4 inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Ecosystem
          </Link>
        </div>
      </div>
    )
  }

  const site = siteData.site
  const latestCheck = siteData.latestCheck
  const history = historyData?.history || []
  const deployments = deploymentsData?.deployments || []

  const config = siteConfig[slug] || { icon: Globe, color: 'text-white/60', bg: 'bg-white/10' }
  const Icon = config.icon

  // Prepare chart data
  const chartData = history.slice().reverse().map(h => ({
    date: format(new Date(h.checked_at), 'MMM d HH:mm'),
    'Health Score': h.health_score,
    'Response Time': h.http_response_time_ms,
  }))

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <Link href="/ecosystem" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Ecosystem
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0', config.bg)}>
              <Icon className={cn('h-8 w-8', config.color)} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{site.name}</h1>
                <span className={cn('px-3 py-1 rounded-lg text-sm font-medium', getStatusBadge(site.status))}>
                  {site.status}
                </span>
              </div>
              <p className="mt-2 text-white/60">{site.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-white/40">
                <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {site.url}
                </a>
                {site.github_repo && (
                  <a href={`https://github.com/${site.github_repo}`} target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-1">
                    <Github className="h-3 w-3" />
                    {site.github_repo}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => healthCheckMutation.mutate()}
              disabled={healthCheckMutation.isPending}
              className="btn-glass px-4 py-2 flex items-center gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', healthCheckMutation.isPending && 'animate-spin')} />
              Run Health Check
            </button>
            <a href={site.url} target="_blank" rel="noopener noreferrer" className="btn-primary px-4 py-2 flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Visit Site
            </a>
          </div>
        </div>
      </header>

      {/* Health Score Hero */}
      <div className="glass-card p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
          <div className="col-span-2 md:col-span-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              {getStatusIcon(site.status)}
              <span className={cn(
                'text-4xl md:text-5xl font-bold',
                site.health_score >= 80 ? 'text-green-400' :
                site.health_score >= 60 ? 'text-amber-400' : 'text-red-400'
              )}>
                {site.health_score}
              </span>
              <span className="text-xl text-white/40">/100</span>
            </div>
            <p className="text-sm text-white/50 mt-1">Health Score</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-white">{site.response_time_ms || '--'}</p>
            <p className="text-xs text-white/50">Response (ms)</p>
          </div>

          <div className="text-center">
            <p className={cn('text-2xl font-bold', latestCheck?.ssl_valid ? 'text-green-400' : 'text-red-400')}>
              {latestCheck?.ssl_valid ? 'Valid' : 'Invalid'}
            </p>
            <p className="text-xs text-white/50">SSL Status</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {latestCheck?.http_status || '--'}
            </p>
            <p className="text-xs text-white/50">HTTP Status</p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-white">
              {site.last_check_at ? formatDistanceToNow(new Date(site.last_check_at), { addSuffix: true }) : 'Never'}
            </p>
            <p className="text-xs text-white/50">Last Check</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Charts & History */}
        <div className="lg:col-span-8 space-y-6">
          {/* Health Score Chart */}
          {chartData.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-indigo-400" />
                Health History (Last 30 Checks)
              </h2>
              <AreaChart
                className="h-72"
                data={chartData}
                index="date"
                categories={['Health Score']}
                colors={['indigo']}
                valueFormatter={(v) => `${v}`}
                showLegend={false}
                showGridLines={false}
              />
            </div>
          )}

          {/* Response Time Chart */}
          {chartData.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-cyan-400" />
                Response Time History
              </h2>
              <AreaChart
                className="h-48"
                data={chartData}
                index="date"
                categories={['Response Time']}
                colors={['cyan']}
                valueFormatter={(v) => `${v}ms`}
                showLegend={false}
                showGridLines={false}
              />
            </div>
          )}

          {/* Recent Health Checks */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Recent Health Checks
            </h2>
            {history.length === 0 ? (
              <p className="text-white/40 text-center py-8">No health check history</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 10).map((check) => (
                  <div key={check.id} className="glass-card-sm p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        check.health_status === 'healthy' ? 'bg-green-400' :
                        check.health_status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
                      )} />
                      <span className="text-sm text-white">
                        {format(new Date(check.checked_at), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={cn(
                        'font-medium',
                        check.health_score >= 80 ? 'text-green-400' :
                        check.health_score >= 60 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {check.health_score}/100
                      </span>
                      <span className="text-white/40">{check.http_response_time_ms}ms</span>
                      <span className="text-white/40">HTTP {check.http_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-4 space-y-6">
          {/* GitHub Stats */}
          {site.github_repo && latestCheck && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Github className="h-5 w-5 text-white/60" />
                GitHub Status
              </h2>
              <div className="space-y-3">
                {latestCheck.github_last_commit_at && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/60">
                      <GitCommit className="h-4 w-4" />
                      <span className="text-sm">Last Commit</span>
                    </div>
                    <span className="text-sm text-white">
                      {formatDistanceToNow(new Date(latestCheck.github_last_commit_at), { addSuffix: true })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60">
                    <GitPullRequest className="h-4 w-4" />
                    <span className="text-sm">Open PRs</span>
                  </div>
                  <span className="text-sm text-white">{latestCheck.github_open_prs || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Security Alerts</span>
                  </div>
                  <span className={cn(
                    'text-sm',
                    (latestCheck.github_security_alerts || 0) > 0 ? 'text-red-400' : 'text-green-400'
                  )}>
                    {latestCheck.github_security_alerts || 0}
                  </span>
                </div>
                <a
                  href={`https://github.com/${site.github_repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass w-full flex items-center justify-center gap-2 mt-4"
                >
                  <Github className="h-4 w-4" />
                  View Repository
                </a>
              </div>
            </div>
          )}

          {/* Vercel Status */}
          {site.vercel_project_name && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Server className="h-5 w-5 text-cyan-400" />
                Vercel Status
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Project</span>
                  <span className="text-sm text-white font-mono">{site.vercel_project_name}</span>
                </div>
                {latestCheck?.vercel_deployment_status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Deployment</span>
                    <span className={cn(
                      'text-sm px-2 py-0.5 rounded',
                      latestCheck.vercel_deployment_status === 'READY' ? 'bg-green-500/20 text-green-400' :
                      latestCheck.vercel_deployment_status === 'BUILDING' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {latestCheck.vercel_deployment_status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SSL Info */}
          {site.ssl_expires_at && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-green-400" />
                SSL Certificate
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Status</span>
                  <span className={cn(
                    'text-sm px-2 py-0.5 rounded',
                    latestCheck?.ssl_valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  )}>
                    {latestCheck?.ssl_valid ? 'Valid' : 'Invalid'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Expires</span>
                  <span className="text-sm text-white">
                    {formatDistanceToNow(new Date(site.ssl_expires_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Deployments */}
          {deployments.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-amber-400" />
                Recent Deployments
              </h2>
              <div className="space-y-2">
                {deployments.slice(0, 5).map((deploy) => (
                  <div key={deploy.id} className="glass-card-sm p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        deploy.status === 'READY' ? 'bg-green-500/20 text-green-400' :
                        deploy.status === 'BUILDING' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      )}>
                        {deploy.status}
                      </span>
                      <span className="text-xs text-white/40">
                        {formatDistanceToNow(new Date(deploy.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {deploy.commit_message && (
                      <p className="text-xs text-white/60 truncate">{deploy.commit_message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <ExternalLink className="h-5 w-5 text-indigo-400" />
              Quick Links
            </h2>
            <div className="space-y-2">
              <a href={site.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                <Globe className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-white">Visit Site</span>
              </a>
              {site.github_repo && (
                <a href={`https://github.com/${site.github_repo}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                  <Github className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white">GitHub Repo</span>
                </a>
              )}
              {site.supabase_project && (
                <a href={`https://supabase.com/dashboard/project/${site.supabase_project}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                  <Database className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-white">Supabase Dashboard</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
