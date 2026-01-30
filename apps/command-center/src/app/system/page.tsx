'use client'

import { useQuery } from '@tanstack/react-query'
import { getConnectors, getAgents, getInfrastructureHealth } from '@/lib/api'
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
} from 'lucide-react'
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

  const isLoading = healthLoading || connectorsLoading || agentsLoading

  if (isLoading) {
    return <LoadingPage />
  }

  const connectors = connectorsData?.connectors || []
  const agents = agentsData?.agents || []
  const overallScore = health?.overall_score || 80

  // Count statuses
  const configuredConnectors = connectors.filter((c: any) => c.status === 'configured').length
  const missingConnectors = connectors.filter((c: any) => c.status === 'missing_vars').length
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
                const isConfigured = connector.status === 'configured'
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
              <span className="text-sm text-white/50">{agents.length} registered</span>
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
