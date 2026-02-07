'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, AlertCircle, FileText, CheckCircle2, Clock, Plus, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComplianceItem {
  id: string
  title: string
  category: 'tax' | 'insurance' | 'permit' | 'registration' | 'reporting' | 'safety' | 'grant-acquittal'
  dueDate: string
  responsiblePerson: string
  status: 'overdue' | 'due-soon' | 'upcoming' | 'completed'
  frequency?: string
  notes?: string
}

interface Document {
  id: string
  name: string
  type: string
  expiryDate: string
  category: 'tax' | 'insurance' | 'permit' | 'registration' | 'reporting' | 'safety' | 'grant-acquittal'
  status: 'expired' | 'expiring-soon' | 'valid'
}

interface ComplianceData {
  items: ComplianceItem[]
  documents: Document[]
  itemsDueThisMonth: number
  overdueItems: number
  totalDocuments: number
  nextDeadline: { item: string; daysUntil: number }
}

const EMPTY_STATE: ComplianceData = {
  items: [],
  documents: [],
  itemsDueThisMonth: 0,
  overdueItems: 0,
  totalDocuments: 0,
  nextDeadline: { item: 'No deadlines', daysUntil: 0 },
}

const categoryConfig = {
  tax: { label: 'Tax', color: 'bg-blue-500', dotColor: 'bg-blue-500' },
  insurance: { label: 'Insurance', color: 'bg-purple-500', dotColor: 'bg-purple-500' },
  permit: { label: 'Permit', color: 'bg-amber-500', dotColor: 'bg-amber-500' },
  registration: { label: 'Registration', color: 'bg-green-500', dotColor: 'bg-green-500' },
  reporting: { label: 'Reporting', color: 'bg-teal-500', dotColor: 'bg-teal-500' },
  safety: { label: 'Safety', color: 'bg-red-500', dotColor: 'bg-red-500' },
  'grant-acquittal': { label: 'Grant', color: 'bg-pink-500', dotColor: 'bg-pink-500' },
}

export default function AdminPage() {
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'due-date' | 'status'>('due-date')
  const [showAddForm, setShowAddForm] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['compliance'],
    queryFn: async () => {
      const response = await fetch('/api/compliance')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    },
  })

  const complianceData: ComplianceData = data ?? EMPTY_STATE

  const StatCard = ({ label, value, icon: Icon, highlight }: { label: string; value: string | number; icon: any; highlight?: boolean }) => (
    <div className={cn(
      'glass-card p-6 border bg-white/5',
      highlight ? 'border-red-500/30 bg-red-500/10' : 'border-white/10'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn('text-sm font-medium', highlight ? 'text-red-300' : 'text-white/60')}>{label}</p>
          <p className={cn('text-2xl font-bold mt-2', highlight ? 'text-red-400' : 'text-white')}>{value}</p>
        </div>
        <Icon className={cn('w-8 h-8', highlight ? 'text-red-400' : 'text-white/30')} />
      </div>
    </div>
  )

  const getDaysUntilExpiry = (dateString: string) => {
    const today = new Date()
    const date = new Date(dateString)
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-500/20 border-red-500/50 text-red-300'
      case 'due-soon':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-300'
      case 'upcoming':
        return 'bg-green-500/20 border-green-500/50 text-green-300'
      case 'completed':
        return 'bg-gray-500/20 border-gray-500/50 text-gray-300'
      default:
        return 'bg-white/10 border-white/20 text-white/70'
    }
  }

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'expired':
        return 'bg-red-500/20 border-red-500/50 text-red-300'
      case 'expiring-soon':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-300'
      case 'valid':
        return 'bg-green-500/20 border-green-500/50 text-green-300'
      default:
        return 'bg-white/10 border-white/20 text-white/70'
    }
  }

  const filteredItems = filterCategory
    ? complianceData.items.filter((item: ComplianceItem) => item.category === filterCategory)
    : complianceData.items

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'due-date') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    } else {
      const statusOrder = { overdue: 0, 'due-soon': 1, upcoming: 2, completed: 3 }
      return (statusOrder as any)[a.status] - (statusOrder as any)[b.status]
    }
  })

  const categoryBreakdown = complianceData.items.reduce((acc: Record<string, number>, item: ComplianceItem) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {})

  const upcomingDeadlines = sortedItems.slice(0, 5)

  // Calendar data for February 2024
  const calendarDays = Array.from({ length: 29 }, (_, i) => i + 1)
  const firstDayOfWeek = 3 // Wednesday

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-white" />
          <h1 className="text-4xl font-bold text-white">Administration & Compliance</h1>
        </div>
        <p className="text-white/60">Track compliance deadlines, documents and regulatory requirements</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Items Due This Month"
          value={complianceData.itemsDueThisMonth}
          icon={Calendar}
        />
        <StatCard
          label="Overdue Items"
          value={complianceData.overdueItems}
          icon={AlertCircle}
          highlight={true}
        />
        <StatCard
          label="Tracked Documents"
          value={complianceData.totalDocuments}
          icon={FileText}
        />
        <StatCard
          label="Next Deadline"
          value={`${Math.abs(complianceData.nextDeadline.daysUntil)} days`}
          icon={Clock}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-8 gap-8 mb-8">
        {/* Left Column */}
        <div className="col-span-5 space-y-6">
          {/* Compliance Calendar */}
          <div className="glass-card p-6 border border-white/10 bg-white/5">
            <h2 className="text-white font-semibold text-lg mb-6">Compliance Calendar - February 2024</h2>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-white/60 text-xs font-semibold py-2">
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-white/5 rounded" />
              ))}

              {/* Calendar days */}
              {calendarDays.map((day) => {
                const dayStr = `2024-02-${String(day).padStart(2, '0')}`
                const dayItems = complianceData.items.filter((item: ComplianceItem) => item.dueDate.startsWith(dayStr))

                return (
                  <div
                    key={day}
                    className={cn(
                      'aspect-square rounded-lg border p-1 transition-all',
                      dayItems.length > 0
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <p className="text-white text-xs font-semibold mb-1">{day}</p>
                    <div className="flex flex-wrap gap-0.5">
                      {dayItems.slice(0, 3).map((item: ComplianceItem, idx: number) => (
                        <div
                          key={idx}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            (categoryConfig as any)[item.category]?.dotColor || 'bg-white/40'
                          )}
                          title={item.title}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="pt-4 border-t border-white/10 grid grid-cols-4 gap-3 text-xs">
              {Object.entries(categoryConfig).map(([key, config]: [string, any]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', config.dotColor)} />
                  <span className="text-white/70">{config.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Items List */}
          <div className="glass-card p-6 border border-white/10 bg-white/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg">Compliance Items</h2>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white/80 text-sm focus:outline-none"
                >
                  <option value="due-date">Sort by Due Date</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>

            {sortedItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-400 text-sm">No compliance items found.</p>
              </div>
            ) : (
              <>
                {/* Category Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setFilterCategory(null)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                      filterCategory === null
                        ? 'bg-white/20 border-white/40 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                    )}
                  >
                    All Items
                  </button>
                  {Object.entries(categoryConfig).map(([key, config]: [string, any]) => (
                    <button
                      key={key}
                      onClick={() => setFilterCategory(key)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                        filterCategory === key
                          ? `${config.color}/30 border-white/40 text-white`
                          : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                      )}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-white/60 font-medium py-3 px-4">Title</th>
                        <th className="text-left text-white/60 font-medium py-3 px-4">Category</th>
                        <th className="text-left text-white/60 font-medium py-3 px-4">Due Date</th>
                        <th className="text-left text-white/60 font-medium py-3 px-4">Responsible</th>
                        <th className="text-left text-white/60 font-medium py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((item: ComplianceItem) => (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="text-white py-3 px-4 font-medium">{item.title}</td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              'px-2 py-1 rounded text-xs font-medium border',
                              (categoryConfig as any)[item.category]?.color + '/30'
                            )}>
                              {(categoryConfig as any)[item.category]?.label}
                            </span>
                          </td>
                          <td className="text-white/80 py-3 px-4">
                            {new Date(item.dueDate).toLocaleDateString('en-AU')}
                          </td>
                          <td className="text-white/70 py-3 px-4">{item.responsiblePerson}</td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              'px-3 py-1 rounded-full text-xs font-medium border inline-block',
                              getStatusColor(item.status)
                            )}>
                              {item.status.replace('-', ' ').charAt(0).toUpperCase() + item.status.replace('-', ' ').slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Document Tracker */}
          <div className="glass-card p-6 border border-white/10 bg-white/5">
            <h2 className="text-white font-semibold text-lg mb-6">Document Tracker</h2>
            {complianceData.documents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-400 text-sm">No documents found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {complianceData.documents.map((doc: Document) => {
                  const daysUntil = getDaysUntilExpiry(doc.expiryDate)
                  const statusLabel = daysUntil < 0 ? 'Expired' : daysUntil <= 30 ? 'Expiring Soon' : 'Valid'

                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        'border rounded-lg p-4 transition-all',
                        doc.status === 'expired'
                          ? 'bg-red-500/10 border-red-500/30'
                          : doc.status === 'expiring-soon'
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-green-500/10 border-green-500/30'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-white font-semibold text-sm">{doc.name}</h3>
                          <p className="text-white/60 text-xs">{doc.type}</p>
                        </div>
                        {doc.status === 'expired' ? (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        ) : doc.status === 'expiring-soon' ? (
                          <Clock className="w-5 h-5 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-xs">Expires</span>
                          <span className="text-white font-medium text-xs">
                            {new Date(doc.expiryDate).toLocaleDateString('en-AU')}
                          </span>
                        </div>
                        <span className={cn(
                          'inline-block px-2 py-1 rounded text-xs font-medium border',
                          getDocumentStatusColor(doc.status)
                        )}>
                          {daysUntil < 0
                            ? `${Math.abs(daysUntil)} days overdue`
                            : daysUntil === 0
                              ? 'Expires today'
                              : `${daysUntil} days until expiry`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-3 space-y-6">
          {/* Category Breakdown */}
          <div className="glass-card p-6 border border-white/10 bg-white/5">
            <h3 className="text-white font-semibold text-lg mb-6">Category Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(categoryBreakdown).map(([category, count]) => (
                <div key={category}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', (categoryConfig as any)[category]?.dotColor)} />
                      <span className="text-white/70 text-sm">{(categoryConfig as any)[category]?.label}</span>
                    </div>
                    <span className="text-white font-semibold text-sm">{count}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden border border-white/10">
                    <div
                      className={cn('h-full transition-all', (categoryConfig as any)[category]?.color)}
                      style={{ width: `${(count / complianceData.items.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="glass-card p-6 border border-white/10 bg-white/5">
            <h3 className="text-white font-semibold text-lg mb-6">Next 5 Deadlines</h3>
            <div className="space-y-3">
              {upcomingDeadlines.map((item: ComplianceItem) => {
                const daysUntil = Math.ceil(
                  (new Date(item.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                )

                return (
                  <div key={item.id} className="flex items-start justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{item.title}</p>
                      <p className="text-white/60 text-xs mt-1">{new Date(item.dueDate).toLocaleDateString('en-AU')}</p>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 border',
                      getStatusColor(item.status)
                    )}>
                      {daysUntil < 0 ? `${Math.abs(daysUntil)}d ago` : `${daysUntil}d left`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Overdue Items */}
          {complianceData.overdueItems > 0 && (
            <div className="glass-card p-6 border border-red-500/30 bg-red-500/10">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <h3 className="text-white font-semibold text-lg">Overdue Action Items</h3>
              </div>
              <div className="space-y-3">
                {complianceData.items
                  .filter((item: ComplianceItem) => item.status === 'overdue')
                  .map((item: ComplianceItem) => (
                    <div key={item.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-white text-sm font-medium">{item.title}</p>
                      <p className="text-red-400 text-xs mt-1">
                        Due: {new Date(item.dueDate).toLocaleDateString('en-AU')}
                      </p>
                      <p className="text-white/60 text-xs mt-2">Assigned: {item.responsiblePerson}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Quick Add Form */}
          <div className="glass-card p-6 border border-white/10 bg-white/5">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Compliance Item
            </button>

            {showAddForm && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                <div>
                  <label className="block text-white text-xs font-medium mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="Item title"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/40"
                  />
                </div>
                <div>
                  <label className="block text-white text-xs font-medium mb-1">Category</label>
                  <select className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-white/40">
                    {Object.entries(categoryConfig).map(([key, config]: [string, any]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white text-xs font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-white/40"
                  />
                </div>
                <button className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-sm font-medium transition-all">
                  Save Item
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
