'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getConnectors, getAgents, getInfrastructureHealth, getDataFreshness, getCronHealth } from '@/lib/api'
import type { DataFreshnessSource, CronScript } from '@/lib/api'
import {
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Bot,
  Plug,
  Activity,
  RefreshCw,
  Clock,
  Cpu,
  Database,
  Wifi,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Timer,
} from 'lucide-react'
import { useState } from 'react'
import { cn, formatRelativeDate } from '@/lib/utils'
import { LoadingPage } from '@/components/ui/loading'
import { DonutChart, ProgressBar } from '@tremor/react'
import { AgentApprovals } from '@/components/agent-approvals'
import { LiveActivityFeed } from '@/components/live-activity-feed'

export default function SystemPage() {
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['infrastructure', 'health'],
    queryFn: getInfrastructureHealth,
  })

  const { data: connectorsData, isLoading: connectorsLoading } = useQuery({
    queryKey: ['connectors'],
    queryFn: getConnectors,
  })

  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  })

  const { data: freshnessData } = useQuery({
    queryKey: ['data-freshness'],
    queryFn: getDataFreshness,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  const { data: cronData } = useQuery({
    queryKey: ['cron-health'],
    queryFn: getCronHealth,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  })

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const isLoading = healthLoading || connectorsLoading || agentsLoading

  if (isLoading) {
    return <LoadingPage />
  }

  const connectors = connectorsData?.connectors || []
  const agents = agentsData?.agents || []

  // Composite health score
  const connectorScore = connectors.length > 0
    ? (connectors.filter((c: any) => c.status === 'connected').length / connectors.length) * 100
    : 100
  const freshnessScore = freshnessData
    ? (freshnessData.summary.healthy / freshnessData.summary.total) * 100
    : 100
  const cronScore = cronData
    ? (cronData.summary.total > 0 ? (cronData.summary.running / cronData.summary.total) * 100 : 100)
    : 100
  const overallScore = Math.round(0.25 * connectorScore + 0.25 * freshnessScore + 0.50 * cronScore)

  // Count statuses
  const configuredConnectors = connectors.filter((c: any) => c.status === 'connected').length
  const missingConnectors = connectors.filter((c: any) => c.status === 'disconnected').length
  const activeAgents = agents.filter((a: any) => a.status === 'active').length
  const idleAgents = agents.filter((a: any) => a.status === 'idle').length

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Settings className="h-8 w-8 text-indigo-400" />
              System
            </h1>
            <p className="text-lg text-white/60 mt-1">
              Infrastructure health and monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Supabase
            </a>
            <a
              href="https://vercel.com/actforact"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Vercel
            </a>
          </div>
        </div>
      </header>

      {/* Health Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {/* Overall Score */}
        <div className="glass-card p-5 col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Health Score</h2>
            {overallScore >= 80 ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : overallScore >= 50 ? (
              <AlertCircle className="h-5 w-5 text-orange-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
          </div>
          <p className={cn(
            'text-4xl font-bold',
            overallScore >= 80 ? 'text-green-400' :
            overallScore >= 50 ? 'text-orange-400' : 'text-red-400'
          )}>
            {overallScore}%
          </p>
          <ProgressBar
            value={overallScore}
            color={overallScore >= 80 ? 'green' : overallScore >= 50 ? 'orange' : 'red'}
            className="mt-3"
          />
        </div>

        {/* Connectors Status */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Plug className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Connectors</p>
              <p className="text-2xl font-bold text-white">{connectors.length}</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
              {configuredConnectors} ready
            </span>
            {missingConnectors > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                {missingConnectors} missing
              </span>
            )}
          </div>
        </div>

        {/* Agents Status */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Agents</p>
              <p className="text-2xl font-bold text-white">{agents.length}</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
              {activeAgents} active
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/50">
              {idleAgents} idle
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <button className="w-full btn-glass text-sm flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync All
            </button>
            <button className="w-full btn-glass text-sm flex items-center justify-center gap-2">
              <Activity className="h-4 w-4" />
              View Logs
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Connectors List */}
        <div className="col-span-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plug className="h-5 w-5 text-blue-400" />
                Connectors
              </h2>
              <span className="text-sm text-white/50">{connectors.length} total</span>
            </div>

            <div className="space-y-2">
              {connectors.map((connector: any) => {
                const isConfigured = connector.status === 'connected'
                return (
                  <div key={connector.name} className="glass-card-sm p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center',
                        isConfigured ? 'bg-green-500/20' : 'bg-orange-500/20'
                      )}>
                        <Plug className={cn(
                          'h-4 w-4',
                          isConfigured ? 'text-green-400' : 'text-orange-400'
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{connector.name}</p>
                        <p className="text-xs text-white/40">{connector.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isConfigured && connector.missingVars?.length > 0 && (
                        <span className="text-xs text-orange-400">
                          Missing: {connector.missingVars.join(', ')}
                        </span>
                      )}
                      {isConfigured ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-400" />
                      )}
                    </div>
                  </div>
                )
              })}
              {connectors.length === 0 && (
                <p className="py-4 text-center text-white/40">No connectors configured</p>
              )}
            </div>
          </div>
        </div>

        {/* Agents List */}
        <div className="col-span-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-400" />
                Agents
              </h2>
              <Link href="/agent" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                Full Dashboard →
              </Link>
            </div>

            <div className="space-y-2">
              {agents.map((agent: any) => {
                const isActive = agent.status === 'active'
                return (
                  <div key={agent.id} className="glass-card-sm p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center',
                        isActive ? 'bg-purple-500/20' : 'bg-white/10'
                      )}>
                        <Bot className={cn(
                          'h-4 w-4',
                          isActive ? 'text-purple-400' : 'text-white/40'
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{agent.name}</p>
                        <p className="text-xs text-white/40">{agent.type}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      isActive ? 'bg-green-500/20 text-green-400' :
                      agent.status === 'idle' ? 'bg-white/10 text-white/50' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {agent.status}
                    </span>
                  </div>
                )
              })}
              {agents.length === 0 && (
                <p className="py-4 text-center text-white/40">No agents registered</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Freshness */}
      {freshnessData && (
        <div className="mt-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-cyan-400" />
                Data Freshness
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  {freshnessData.summary.healthy} healthy
                </span>
                {freshnessData.summary.warning > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                    {freshnessData.summary.warning} warning
                  </span>
                )}
                {freshnessData.summary.critical > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                    {freshnessData.summary.critical} critical
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {freshnessData.sources.map((source: DataFreshnessSource) => (
                <div key={source.table} className={cn(
                  'glass-card-sm p-3 rounded-lg border',
                  source.status === 'ok' ? 'border-green-500/20' :
                  source.status === 'warn' ? 'border-orange-500/20' :
                  'border-red-500/20'
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-white/80 truncate">{source.label}</p>
                    {source.status === 'ok' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    ) : source.status === 'warn' ? (
                      <AlertCircle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    )}
                  </div>
                  <p className={cn(
                    'text-lg font-bold',
                    source.status === 'ok' ? 'text-green-400' :
                    source.status === 'warn' ? 'text-orange-400' :
                    'text-red-400'
                  )}>
                    {source.age_hours != null ? `${source.age_hours}h` : '—'}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {source.row_count != null ? `${source.row_count.toLocaleString()} rows` : ''}
                    {source.note ? ` · ${source.note}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PM2 Operations */}
      {cronData && (
        <div className="mt-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Timer className="h-5 w-5 text-emerald-400" />
                Operations
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  {cronData.summary.running} running
                </span>
                {cronData.summary.stopped > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                    {cronData.summary.stopped} stopped
                  </span>
                )}
                {cronData.summary.errored > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                    {cronData.summary.errored} errored
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {cronData.groups.map((group) => {
                const isExpanded = expandedGroups.has(group.frequency)
                const groupErrored = group.scripts.filter(s => s.status === 'errored').length
                const groupRunning = group.scripts.filter(s => s.status === 'online').length
                return (
                  <div key={group.frequency}>
                    <button
                      onClick={() => {
                        setExpandedGroups(prev => {
                          const next = new Set(prev)
                          if (next.has(group.frequency)) next.delete(group.frequency)
                          else next.add(group.frequency)
                          return next
                        })
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-white/40" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white/40" />
                        )}
                        <span className="text-sm font-medium text-white">{group.label}</span>
                        <span className="text-xs text-white/40">({group.scripts.length})</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        {groupRunning > 0 && (
                          <span className="text-green-400">{groupRunning} online</span>
                        )}
                        {groupErrored > 0 && (
                          <span className="text-red-400">{groupErrored} errored</span>
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-1 space-y-1 ml-6">
                        {group.scripts.map((script: CronScript) => (
                          <div key={script.name} className="glass-card-sm p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {script.status === 'online' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                              ) : script.status === 'errored' ? (
                                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-orange-400 shrink-0" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-white">{script.name}</p>
                                {script.recent_errors.length > 0 && (
                                  <p className="text-[10px] text-red-400/70 truncate max-w-md">
                                    {script.recent_errors[script.recent_errors.length - 1]}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              {script.unstable && (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                                  UNSTABLE
                                </span>
                              )}
                              {script.restarts > 0 && (
                                <span className="text-white/40">{script.restarts} restarts</span>
                              )}
                              {script.memory_mb > 0 && (
                                <span className="text-white/40">{script.memory_mb}MB</span>
                              )}
                              <span className={cn(
                                'px-2 py-0.5 rounded-full font-medium',
                                script.status === 'online' ? 'bg-green-500/20 text-green-400' :
                                script.status === 'errored' ? 'bg-red-500/20 text-red-400' :
                                'bg-orange-500/20 text-orange-400'
                              )}>
                                {script.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Agent Approvals + Live Activity Feed */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgentApprovals />
        <LiveActivityFeed maxEvents={25} />
      </div>

      {/* Status Chart */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Connector Status</h3>
          <DonutChart
            data={[
              { name: 'Configured', value: configuredConnectors },
              { name: 'Missing', value: missingConnectors },
            ]}
            category="value"
            index="name"
            colors={['green', 'orange']}
            className="h-40"
            showAnimation={true}
          />
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Agent Status</h3>
          <DonutChart
            data={[
              { name: 'Active', value: activeAgents },
              { name: 'Idle', value: idleAgents },
              { name: 'Error', value: agents.filter((a: any) => a.status === 'error').length },
            ]}
            category="value"
            index="name"
            colors={['green', 'slate', 'red']}
            className="h-40"
            showAnimation={true}
          />
        </div>
      </div>
    </div>
  )
}
