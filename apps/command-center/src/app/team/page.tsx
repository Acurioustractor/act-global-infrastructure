'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, AlertTriangle, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  name: string
  role: string
  employment: 'full-time' | 'part-time' | 'contractor'
  availableHours: number
  allocatedHours: number
  projects: Array<{ name: string; hours: number }>
}

interface TeamData {
  teamMembers: TeamMember[]
  totalWeeklyHours: number
  utilisationPercent: number
  availableCapacity: number
  zoneCapacity: Record<string, number>
  skillsInventory: string[]
  hiringAlerts: Array<{ zone: string; deficit: number }>
  monthlyCost: number
}

const EMPTY_STATE: TeamData = {
  teamMembers: [],
  totalWeeklyHours: 0,
  utilisationPercent: 0,
  availableCapacity: 0,
  zoneCapacity: {},
  skillsInventory: [],
  hiringAlerts: [],
  monthlyCost: 0,
}

export default function TeamPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const response = await fetch('/api/team')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    },
  })

  const teamData: TeamData = data ?? EMPTY_STATE

  const StatCard = ({ label, value, icon: Icon, trend }: { label: string; value: string | number; icon: any; trend?: string }) => (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-sm font-medium">{label}</p>
          <p className="text-white text-2xl font-bold mt-2">{value}</p>
          {trend && <p className="text-green-400 text-xs mt-1">{trend}</p>}
        </div>
        <Icon className="w-8 h-8 text-white/30" />
      </div>
    </div>
  )

  const getUtilisationColor = (percent: number) => {
    if (percent < 80) return 'from-green-500 to-emerald-500'
    if (percent < 95) return 'from-amber-500 to-yellow-500'
    return 'from-red-500 to-rose-500'
  }

  const getUtilisationBg = (percent: number) => {
    if (percent < 80) return 'bg-green-500/10'
    if (percent < 95) return 'bg-amber-500/10'
    return 'bg-red-500/10'
  }

  const projects = Array.from(
    new Set(teamData.teamMembers.flatMap((m) => m.projects.map((p) => p.name)))
  )


  const getDemandColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-blue-500/30 border-blue-500/50'
      case 'normal':
        return 'bg-green-500/30 border-green-500/50'
      case 'high':
        return 'bg-amber-500/30 border-amber-500/50'
      case 'peak':
        return 'bg-red-500/30 border-red-500/50'
      default:
        return 'bg-white/5 border-white/10'
    }
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-white" />
          <h1 className="text-4xl font-bold text-white">Team & Resources</h1>
        </div>
        <p className="text-white/60">Manage allocation, capacity and team utilisation</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Team Members"
          value={teamData.teamMembers.length}
          icon={Users}
          trend="+1 this quarter"
        />
        <StatCard
          label="Total Weekly Hours"
          value={teamData.totalWeeklyHours}
          icon={Clock}
          trend="+12 hours vs last week"
        />
        <StatCard
          label="Utilisation %"
          value={`${teamData.utilisationPercent}%`}
          icon={TrendingUp}
          trend="Amber zone"
        />
        <StatCard
          label="Available Capacity"
          value={`${teamData.availableCapacity}h/week`}
          icon={AlertCircle}
          trend="Add 25+ hours available"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Team Overview */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold text-lg mb-6">Team Overview</h2>
            {teamData.teamMembers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-400 text-sm">No team members found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {teamData.teamMembers.map((member) => {
                  const utilizationPercent = (member.allocatedHours / member.availableHours) * 100
                  const colorClass = getUtilisationColor(utilizationPercent)
                  const bgClass = getUtilisationBg(utilizationPercent)

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'border border-white/10 rounded-lg p-4 transition-colors hover:bg-white/10',
                        bgClass
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-white font-semibold">{member.name}</h3>
                          <p className="text-white/60 text-sm">
                            {member.role} • {member.employment}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {member.allocatedHours} / {member.availableHours}h
                          </p>
                          <p className="text-white/60 text-xs">{utilizationPercent.toFixed(0)}% utilised</p>
                        </div>
                      </div>

                      {/* Utilisation Bar */}
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4 border border-white/10">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            `bg-gradient-to-r ${colorClass}`
                          )}
                          style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                        />
                      </div>

                      {/* Projects */}
                      <div className="flex flex-wrap gap-2">
                        {member.projects.map((project, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-1 bg-white/10 rounded-full border border-white/20 text-white/80 text-xs"
                          >
                            {project.name} <span className="text-white/60">({project.hours}h)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Allocation Matrix */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold text-lg mb-6">Project Allocation Matrix</h2>
            <div className="overflow-x-auto">
              <div className="min-w-full inline-block">
                <div className="grid gap-1" style={{ gridTemplateColumns: `150px repeat(${teamData.teamMembers.length}, 80px)` }}>
                  {/* Header Row */}
                  <div className="font-semibold text-white/60 text-xs py-2">Project</div>
                  {teamData.teamMembers.map((member) => (
                    <div key={member.id} className="font-semibold text-white/60 text-xs py-2 px-1 text-center truncate">
                      {member.name}
                    </div>
                  ))}

                  {/* Data Rows */}
                  {projects.map((project) => (
                    <div key={project}>
                      <div className="text-white/70 text-xs py-2 truncate">{project}</div>
                      {teamData.teamMembers.map((member) => {
                        const allocation = member.projects.find((p) => p.name === project)?.hours || 0
                        const intensity = allocation > 0 ? Math.min((allocation / 20) * 100, 100) : 0

                        return (
                          <div
                            key={`${project}-${member.id}`}
                            className={cn(
                              'py-2 px-1 rounded text-center text-white text-xs font-medium border',
                              intensity > 75
                                ? 'bg-red-500/40 border-red-500/60'
                                : intensity > 50
                                  ? 'bg-amber-500/40 border-amber-500/60'
                                  : intensity > 0
                                    ? 'bg-green-500/40 border-green-500/60'
                                    : 'bg-white/5 border-white/10'
                            )}
                          >
                            {allocation > 0 ? `${allocation}h` : '-'}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Seasonal Demand Heatmap */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold text-lg mb-6">Seasonal Demand Heatmap</h2>
            {teamData.teamMembers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-400 text-sm">No demand data available.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <div className="min-w-full inline-block">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `150px repeat(12, 50px)` }}>
                      {/* Header Row */}
                      <div className="font-semibold text-white/60 text-xs py-2">Project</div>
                      {months.map((month) => (
                        <div key={month} className="font-semibold text-white/60 text-xs py-2 text-center">
                          {month}
                        </div>
                      ))}

                      {/* Data Rows - will be populated when API returns data */}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500/30 rounded border border-blue-500/50" />
                    <span className="text-white/70 text-xs">Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500/30 rounded border border-green-500/50" />
                    <span className="text-white/70 text-xs">Normal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-500/30 rounded border border-amber-500/50" />
                    <span className="text-white/70 text-xs">High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500/30 rounded border border-red-500/50" />
                    <span className="text-white/70 text-xs">Peak</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Capacity Summary */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold text-lg mb-6">Capacity by Zone</h3>
            <div className="space-y-4">
              {Object.entries(teamData.zoneCapacity).map(([zone, capacity]) => (
                <div key={zone}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/70 text-sm">{zone}</span>
                    <span className="text-white font-semibold text-sm">{capacity}h/week</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      style={{ width: `${(capacity / 100) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Inventory */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold text-lg mb-6">Skills Inventory</h3>
            {teamData.skillsInventory.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-gray-400 text-sm">No skills data available.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {teamData.skillsInventory.map((skill, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80 text-sm"
                  >
                    {skill}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hiring Alerts */}
          {teamData.hiringAlerts.length > 0 && (
            <div className="glass-card p-6 border-red-500/30 bg-red-500/5">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <h3 className="text-white font-semibold text-lg">Hiring Needs</h3>
              </div>
              <div className="space-y-3">
                {teamData.hiringAlerts.map((alert, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <p className="text-white/80 text-sm">
                      <span className="font-semibold">{alert.zone}</span> requires{' '}
                      <span className="text-red-400 font-semibold">+{alert.deficit}h/week</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Labour Cost */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold text-lg mb-6">Labour Cost Summary</h3>
            <div>
              <p className="text-white/60 text-xs font-medium mb-2 uppercase">Monthly Cost</p>
              <p className="text-white text-3xl font-bold mb-4">
                {new Intl.NumberFormat('en-AU', {
                  style: 'currency',
                  currency: 'AUD',
                }).format(teamData.monthlyCost)}
              </p>
              <div className="pt-4 border-t border-white/10 space-y-2 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Weekly rate:</span>
                  <span className="text-white">
                    {new Intl.NumberFormat('en-AU', {
                      style: 'currency',
                      currency: 'AUD',
                    }).format(teamData.monthlyCost / 4.33)}
                  </span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Cost per hour:</span>
                  <span className="text-white">
                    {new Intl.NumberFormat('en-AU', {
                      style: 'currency',
                      currency: 'AUD',
                    }).format(teamData.monthlyCost / (teamData.totalWeeklyHours * 4.33))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Actions */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold text-lg mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg text-sm font-medium transition-all">
                Add Team Member
              </button>
              <button className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-sm font-medium transition-all">
                Edit Allocations
              </button>
              <button className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-sm font-medium transition-all">
                View Reports
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
