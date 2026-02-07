'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  AlertTriangle,
  Wrench,
  Users,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Home,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Asset {
  id: string
  name: string
  type: string
  zone: 'farm' | 'harvest' | 'studio' | 'lodgings' | 'common'
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  value: number
  nextMaintenanceDate: string
  lastMaintenanceDate?: string
}

interface MaintenanceTask {
  id: string
  assetName: string
  task: string
  dueDate: string
  status: 'overdue' | 'due-soon' | 'scheduled'
  priority: 'low' | 'medium' | 'high'
}

interface Lodging {
  id: string
  name: string
  type: 'cabin' | 'caravan' | 'yurt' | 'glamping'
  capacity: number
  status: 'available' | 'occupied' | 'maintenance'
  currentOccupant?: string
  nightlyRate: number
}

interface AssetsData {
  totalAssetValue: number
  assetsNeedingAttention: number
  upcomingMaintenanceCount: number
  lodgingCapacity: number
  assets: Asset[]
  maintenanceTasks: MaintenanceTask[]
  lodgings: Lodging[]
}

const ZONES = {
  farm: { label: 'Farm Area', color: '#10B981', icon: '🌾' },
  harvest: { label: 'Harvest & Storage', color: '#F59E0B', icon: '🏭' },
  studio: { label: 'Studio', color: '#8B5CF6', icon: '🎬' },
  lodgings: { label: 'Lodgings', color: '#3B82F6', icon: '🏠' },
  common: { label: 'Common Areas', color: '#EC4899', icon: '🏘️' },
}

const CONDITION_CONFIG = {
  excellent: { label: 'Excellent', color: '#10B981', bgColor: 'bg-green-500/20', badge: '✓' },
  good: { label: 'Good', color: '#3B82F6', bgColor: 'bg-blue-500/20', badge: '○' },
  fair: { label: 'Fair', color: '#F59E0B', bgColor: 'bg-amber-500/20', badge: '△' },
  poor: { label: 'Poor', color: '#EF4444', bgColor: 'bg-red-500/20', badge: '⚠' },
  critical: { label: 'Critical', color: '#DC2626', bgColor: 'bg-red-600/20', badge: '✕' },
}

const EMPTY_STATE: AssetsData = {
  totalAssetValue: 0,
  assetsNeedingAttention: 0,
  upcomingMaintenanceCount: 0,
  lodgingCapacity: 0,
  assets: [],
  maintenanceTasks: [],
  lodgings: []
}

export default function AssetsPage() {
  const [filterZone, setFilterZone] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    zone: 'farm' as const,
    value: '',
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await fetch('/api/assets')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    },
    staleTime: 1000 * 60 * 5,
  })

  const assetsData: AssetsData = data ?? EMPTY_STATE

  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return assetsData.assets.filter(asset => {
      if (filterZone && asset.zone !== filterZone) return false
      if (filterType && asset.type !== filterType) return false
      return true
    })
  }, [assetsData.assets, filterZone, filterType])

  // Get unique types
  const assetTypes = useMemo(() => {
    return [...new Set(assetsData.assets.map(a => a.type))].sort()
  }, [assetsData.assets])

  // Asset value by zone
  const valueByZone = useMemo(() => {
    const acc: Record<string, number> = {}
    assetsData.assets.forEach(asset => {
      acc[asset.zone] = (acc[asset.zone] || 0) + asset.value
    })
    return acc
  }, [assetsData.assets])

  // Condition breakdown
  const conditionBreakdown = useMemo(() => {
    const acc: Record<string, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      critical: 0,
    }
    assetsData.assets.forEach(asset => {
      acc[asset.condition]++
    })
    return acc
  }, [assetsData.assets])

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault()
    setShowAddAsset(false)
    setFormData({
      name: '',
      type: '',
      zone: 'farm',
      value: '',
    })
  }

  const maxZoneValue = Math.max(...Object.values(valueByZone))
  const occupiedLodgings = assetsData.lodgings.filter(l => l.status === 'occupied').length
  const totalOccupancy = assetsData.lodgings
    .filter(l => l.status !== 'maintenance')
    .reduce((sum, l) => sum + (l.status === 'occupied' ? l.capacity : 0), 0)
  const totalCapacity = assetsData.lodgings
    .filter(l => l.status !== 'maintenance')
    .reduce((sum, l) => sum + l.capacity, 0)
  const occupancyRate = totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Property & Assets</h1>
          </div>
          <p className="text-gray-400">Manage and track all facility assets and infrastructure</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">Total Asset Value</p>
                <p className="text-2xl font-bold text-white">{formatter.format(assetsData.totalAssetValue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">Assets Needing Attention</p>
                <p className="text-2xl font-bold text-white">{assetsData.assetsNeedingAttention}</p>
                <p className="text-red-400 text-sm mt-1">Action required</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">Upcoming Maintenance</p>
                <p className="text-2xl font-bold text-white">{assetsData.upcomingMaintenanceCount}</p>
                <p className="text-amber-400 text-sm mt-1">Next 30 days</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/20">
                <Wrench className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">Lodging Capacity</p>
                <p className="text-2xl font-bold text-white">{assetsData.lodgingCapacity}</p>
                <p className="text-emerald-400 text-sm mt-1">{occupiedLodgings} occupied</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/20">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Zone Map */}
            <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
              <h2 className="text-xl font-bold text-white mb-6">Asset Distribution by Zone</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(ZONES).map(([zoneId, zone]) => {
                  const zoneAssets = assetsData.assets.filter(a => a.zone === zoneId)
                  const zoneValue = valueByZone[zoneId] || 0
                  const zonePercentage = (zoneValue / assetsData.totalAssetValue) * 100

                  return (
                    <div
                      key={zoneId}
                      className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => setFilterZone(filterZone === zoneId ? '' : zoneId)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{zone.icon}</span>
                            <h3 className="font-semibold text-white">{zone.label}</h3>
                          </div>
                          <p className="text-sm text-gray-400">{zoneAssets.length} assets</p>
                        </div>
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: zone.color + '20' }}
                        >
                          <span className="font-bold" style={{ color: zone.color }}>{zoneAssets.length}</span>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-white mb-2">{formatter.format(zoneValue)}</p>
                      <div className="w-full bg-slate-800/50 rounded-full h-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${zonePercentage}%`,
                            backgroundColor: zone.color,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{zonePercentage.toFixed(1)}% of total value</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Asset List */}
            <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Asset Inventory</h2>
                <button
                  onClick={() => setShowAddAsset(!showAddAsset)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Asset
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-3 mb-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Filter:</span>
                </div>
                <button
                  onClick={() => setFilterZone('')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    filterZone === ''
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  )}
                >
                  All Zones
                </button>
                {Object.entries(ZONES).map(([zoneId, zone]) => (
                  <button
                    key={zoneId}
                    onClick={() => setFilterZone(filterZone === zoneId ? '' : zoneId)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      filterZone === zoneId
                        ? 'text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    )}
                    style={{
                      backgroundColor: filterZone === zoneId ? zone.color + '40' : undefined
                    }}
                  >
                    {zone.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mb-6 flex-wrap">
                <button
                  onClick={() => setFilterType('')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    filterType === ''
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  )}
                >
                  All Types
                </button>
                {assetTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(filterType === type ? '' : type)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      filterType === type
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {showAddAsset && (
                <form onSubmit={handleAddAsset} className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Asset Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 rounded bg-slate-700/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        placeholder="e.g., Farm Tractor"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Type</label>
                      <input
                        type="text"
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full px-3 py-2 rounded bg-slate-700/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        placeholder="e.g., Equipment"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Zone</label>
                      <select
                        value={formData.zone}
                        onChange={(e) => setFormData({...formData, zone: e.target.value as any})}
                        className="w-full px-3 py-2 rounded bg-slate-700/50 border border-white/10 text-white focus:outline-none focus:border-white/20"
                      >
                        {Object.entries(ZONES).map(([zoneId, zone]) => (
                          <option key={zoneId} value={zoneId}>{zone.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Value (AUD)</label>
                      <input
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({...formData, value: e.target.value})}
                        className="w-full px-3 py-2 rounded bg-slate-700/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        placeholder="50000"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      Add Asset
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddAsset(false)}
                      className="px-4 py-2 rounded-lg bg-slate-700/50 text-gray-400 hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {filteredAssets.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-400 text-sm">No assets found. The API endpoint is not returning data.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Asset Name</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Zone</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Condition</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Value</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Next Maintenance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredAssets.map((asset) => {
                          const config = CONDITION_CONFIG[asset.condition]
                          const zone = ZONES[asset.zone as keyof typeof ZONES]
                          return (
                            <tr key={asset.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-4 px-4 text-white font-medium">{asset.name}</td>
                              <td className="py-4 px-4 text-gray-400">{asset.type}</td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-2 text-sm text-gray-300">
                                  <span>{zone.icon}</span>
                                  {zone.label}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bgColor}`}
                                  style={{ color: config.color }}
                                >
                                  {config.badge} {config.label}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-white font-medium">{formatter.format(asset.value)}</td>
                              <td className="py-4 px-4 text-gray-400">
                                {new Date(asset.nextMaintenanceDate).toLocaleDateString('en-AU')}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 text-sm text-gray-400">Showing {filteredAssets.length} of {assetsData.assets.length} assets</p>
                </>
              )}
            </div>

            {/* Maintenance Schedule */}
            <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
              <h2 className="text-xl font-bold text-white mb-6">Upcoming Maintenance</h2>
              {assetsData.maintenanceTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-400 text-sm">No maintenance tasks found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assetsData.maintenanceTasks.map((task) => {
                    const dueDate = new Date(task.dueDate)
                    const today = new Date()
                    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                    const statusConfig = {
                      overdue: { label: 'Overdue', color: '#EF4444', bgColor: 'bg-red-500/20', icon: AlertTriangle },
                      'due-soon': { label: 'Due Soon', color: '#F59E0B', bgColor: 'bg-amber-500/20', icon: Clock },
                      scheduled: { label: 'Scheduled', color: '#10B981', bgColor: 'bg-green-500/20', icon: CheckCircle2 },
                    }

                    const config = statusConfig[task.status]
                    const StatusIcon = config.icon

                    return (
                      <div key={task.id} className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">{task.assetName}</h3>
                            <p className="text-sm text-gray-400 mb-3">{task.task}</p>
                            <div className="flex items-center gap-4 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bgColor}`}
                                style={{ color: config.color }}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {config.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                Due: {dueDate.toLocaleDateString('en-AU')}
                              </span>
                              {daysUntilDue >= 0 && (
                                <span className="text-xs text-gray-400">
                                  {daysUntilDue === 0 ? 'Today' : `${daysUntilDue} days remaining`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className={cn(
                              'px-3 py-1 rounded text-xs font-medium',
                              task.priority === 'high' && 'bg-red-500/20 text-red-400',
                              task.priority === 'medium' && 'bg-amber-500/20 text-amber-400',
                              task.priority === 'low' && 'bg-blue-500/20 text-blue-400',
                            )}
                          >
                            {task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'} Priority
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Lodgings */}
            <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
              <h2 className="text-xl font-bold text-white mb-6">Lodging Facilities</h2>
              {assetsData.lodgings.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-400 text-sm">No lodging facilities found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {assetsData.lodgings.map((lodging) => {
                    const statusConfig = {
                      available: { label: 'Available', color: '#10B981', bgColor: 'bg-green-500/20', icon: CheckCircle2 },
                      occupied: { label: 'Occupied', color: '#3B82F6', bgColor: 'bg-blue-500/20', icon: Users },
                      maintenance: { label: 'Maintenance', color: '#F59E0B', bgColor: 'bg-amber-500/20', icon: Wrench },
                    }

                    const config = statusConfig[lodging.status]
                    const StatusIcon = config.icon

                    return (
                      <div
                        key={lodging.id}
                        className="p-5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl mt-1">
                              {lodging.type === 'cabin' && '🏠'}
                              {lodging.type === 'caravan' && '🚐'}
                              {lodging.type === 'yurt' && '⛺'}
                              {lodging.type === 'glamping' && '🛖'}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{lodging.name}</h3>
                              <p className="text-xs text-gray-400 mt-1 capitalize">{lodging.type}</p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bgColor}`}
                            style={{ color: config.color }}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Capacity</span>
                            <span className="text-sm font-semibold text-white">{lodging.capacity} guests</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Nightly Rate</span>
                            <span className="text-sm font-semibold text-emerald-400">{formatter.format(lodging.nightlyRate)}</span>
                          </div>
                          {lodging.currentOccupant && (
                            <div className="flex items-center justify-between pt-2 border-t border-white/10">
                              <span className="text-sm text-gray-400">Current Guest</span>
                              <span className="text-sm font-semibold text-white">{lodging.currentOccupant}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Asset Value by Zone */}
            <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
              <h3 className="text-lg font-bold text-white mb-6">Value by Zone</h3>
              <div className="space-y-4">
                {Object.entries(ZONES).map(([zoneId, zone]) => {
                  const value = valueByZone[zoneId] || 0
                  const percentage = (value / assetsData.totalAssetValue) * 100
                  return (
                    <div key={zoneId}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{zone.icon}</span>
                          <span className="text-sm text-gray-400">{zone.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-white">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800/50 rounded-full h-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: zone.color,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatter.format(value)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Condition Overview */}
            <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
              <h3 className="text-lg font-bold text-white mb-6">Asset Condition</h3>
              <div className="space-y-4">
                {Object.entries(CONDITION_CONFIG).map(([condition, config]) => {
                  const count = conditionBreakdown[condition as keyof typeof conditionBreakdown]
                  const percentage = (count / assetsData.assets.length) * 100
                  return (
                    <div key={condition}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: config.color }}>
                            {config.badge}
                          </span>
                          <span className="text-sm text-gray-400">{config.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-white">{count}</span>
                      </div>
                      <div className="w-full bg-slate-800/50 rounded-full h-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: config.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Occupancy Overview */}
            <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
              <h3 className="text-lg font-bold text-white mb-4">Lodging Occupancy</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-sm text-gray-400">Occupied Units</span>
                  <span className="text-white font-semibold">{occupiedLodgings} / {assetsData.lodgings.filter(l => l.status !== 'maintenance').length}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-sm text-gray-400">Current Occupancy</span>
                  <span className="text-emerald-400 font-semibold">{totalOccupancy} / {totalCapacity} guests</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-400">Occupancy Rate</span>
                  <span className="text-white font-semibold">{occupancyRate.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-3 mt-4">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${occupancyRate}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
              <h3 className="text-lg font-bold text-white mb-4">Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-sm text-gray-400">Total Assets</span>
                  <span className="text-white font-semibold">{assetsData.assets.length}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-sm text-gray-400">Critical/Poor</span>
                  <span className="text-red-400 font-semibold">{conditionBreakdown.critical + conditionBreakdown.poor}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-400">Avg. Asset Value</span>
                  <span className="text-white font-semibold">{formatter.format(assetsData.totalAssetValue / assetsData.assets.length)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
