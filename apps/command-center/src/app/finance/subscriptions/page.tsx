'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  CreditCard,
  ArrowLeft,
  Plus,
  Search,
  AlertTriangle,
  Calendar,
  DollarSign,
  Tag,
  ExternalLink,
  MoreVertical,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import {
  getSubscriptions,
  getSubscriptionsSummary,
  getProjectCodes,
  updateSubscription,
  createSubscription,
  getPendingSubscriptions,
  getSubscriptionAlerts,
  confirmPendingSubscription,
  rejectPendingSubscription,
  runSubscriptionDiscovery,
  type Subscription,
  type ProjectCode,
  type PendingSubscription,
  type SubscriptionAlert,
} from '@/lib/api'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, string> = {
  development: 'bg-blue-500/20 text-blue-400',
  design: 'bg-pink-500/20 text-pink-400',
  marketing: 'bg-green-500/20 text-green-400',
  operations: 'bg-orange-500/20 text-orange-400',
  finance: 'bg-yellow-500/20 text-yellow-400',
  communication: 'bg-purple-500/20 text-purple-400',
  ai: 'bg-cyan-500/20 text-cyan-400',
  infrastructure: 'bg-indigo-500/20 text-indigo-400',
  other: 'bg-gray-500/20 text-gray-400',
}

const CATEGORY_ICONS: Record<string, string> = {
  development: '🔧',
  design: '🎨',
  marketing: '📣',
  operations: '⚙️',
  finance: '💰',
  communication: '💬',
  ai: '🤖',
  infrastructure: '🏗️',
  other: '📦',
}

// Format payment method for display
function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    'visa_8815': 'NAB Visa ****8815',
    'visa_4242': 'Visa ****4242',
    'mastercard_5555': 'MC ****5555',
    'amex_1234': 'Amex ****1234',
    'bank_everyday': 'ACT Everyday',
    'bank_maximiser': 'ACT Maximiser',
    'bank_transfer': 'Bank Transfer',
    'personal': 'Personal',
    'paypal': 'PayPal',
  }
  return map[method] || method.replace('_', ' ****')
}

export default function SubscriptionsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'active' | 'needs_review' | 'cancelled' | 'discovered' | 'alerts'>('active')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const { data: subscriptionsData, isLoading } = useQuery({
    queryKey: ['subscriptions', filter === 'all' || filter === 'cancelled' ? 'all' : 'active'],
    queryFn: () => getSubscriptions({ status: filter === 'all' || filter === 'cancelled' ? 'all' : 'active' }),
  })

  const { data: summary } = useQuery({
    queryKey: ['subscriptions', 'summary'],
    queryFn: getSubscriptionsSummary,
  })

  const { data: projectCodes } = useQuery({
    queryKey: ['project-codes'],
    queryFn: getProjectCodes,
  })

  const { data: pendingData } = useQuery({
    queryKey: ['subscriptions', 'pending'],
    queryFn: getPendingSubscriptions,
  })

  const { data: alertsData } = useQuery({
    queryKey: ['subscriptions', 'alerts'],
    queryFn: getSubscriptionAlerts,
  })

  const pendingSubscriptions = pendingData?.pending || []
  const alerts = alertsData?.alerts || []

  const handleScanXero = async () => {
    setIsScanning(true)
    try {
      await runSubscriptionDiscovery({ sources: ['xero_repeating', 'transactions'], daysBack: 180, autoUpdate: true })
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      setIsScanning(false)
    }
  }

  const subscriptions = subscriptionsData?.subscriptions || []

  // Filter subscriptions
  let filteredSubs = subscriptions
  if (filter === 'needs_review') {
    filteredSubs = subscriptions.filter(s => s.status !== 'cancelled' && (!s.project_codes || s.project_codes.length === 0))
  } else if (filter === 'cancelled') {
    filteredSubs = subscriptions.filter(s => s.status === 'cancelled')
  } else if (filter === 'active') {
    filteredSubs = subscriptions.filter(s => s.status !== 'cancelled')
  }
  if (search) {
    const searchLower = search.toLowerCase()
    filteredSubs = filteredSubs.filter(s =>
      s.name.toLowerCase().includes(searchLower) ||
      s.provider.toLowerCase().includes(searchLower)
    )
  }

  // Group unassigned (excluding cancelled)
  const unassignedSubs = subscriptions.filter(s => s.status !== 'cancelled' && (!s.project_codes || s.project_codes.length === 0))
  const cancelledSubs = subscriptions.filter(s => s.status === 'cancelled')

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <Link
          href="/finance"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Finance
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-purple-400" />
              Subscriptions
            </h1>
            <p className="text-lg text-white/60 mt-1">
              Track recurring costs and assign to projects
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleScanXero}
              disabled={isScanning}
              className="btn-glass flex items-center gap-2"
            >
              {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isScanning ? 'Scanning...' : 'Scan Xero'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-action flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Subscription
            </button>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5">
          <p className="text-sm text-white/50">Monthly Total</p>
          <p className="text-2xl font-bold text-white">
            ${Math.round((summary?.total_monthly_aud || 0) + (summary?.total_monthly_usd || 0) * 1.55).toLocaleString()}
            <span className="text-sm font-normal text-white/50 ml-1">AUD</span>
          </p>
          {summary?.total_monthly_usd ? (
            <p className="text-xs text-white/40 mt-1">
              (${summary.total_monthly_aud} + ${summary.total_monthly_usd} USD @ 1.55)
            </p>
          ) : null}
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-white/50">Active</p>
          <p className="text-2xl font-bold text-green-400">{summary?.count || 0}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-white/50">Unassigned</p>
          <p className="text-2xl font-bold text-orange-400">{summary?.unassigned || 0}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-white/50">Due Soon</p>
          <p className="text-2xl font-bold text-yellow-400">{summary?.dueSoon || 0}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === 'all'
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === 'active'
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('needs_review')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === 'needs_review'
                ? 'bg-orange-500/20 text-orange-400'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            Needs Review ({unassignedSubs.length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === 'cancelled'
                ? 'bg-red-500/20 text-red-400'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            Cancelled ({cancelledSubs.length})
          </button>
          <button
            onClick={() => setFilter('discovered')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === 'discovered'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            Discovered ({pendingSubscriptions.length})
          </button>
          <button
            onClick={() => setFilter('alerts')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === 'alerts'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            Alerts ({alerts.length})
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 w-64"
          />
        </div>
      </div>

      {/* Unassigned Alert */}
      {filter !== 'needs_review' && unassignedSubs.length > 0 && (
        <div className="glass-card p-4 mb-6 border-orange-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <div>
                <p className="text-sm font-medium text-orange-400">
                  {unassignedSubs.length} subscriptions need project assignment
                </p>
                <p className="text-xs text-white/50">
                  Assign projects to track costs accurately
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilter('needs_review')}
              className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              Review →
            </button>
          </div>
        </div>
      )}

      {/* Discovered Subscriptions */}
      {filter === 'discovered' && (
        <div className="glass-card overflow-hidden">
          {pendingSubscriptions.length === 0 ? (
            <div className="py-12 text-center text-white/40">No pending subscriptions discovered</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">Vendor</th>
                  <th className="text-right text-sm font-medium text-white/50 px-6 py-4">Amount</th>
                  <th className="text-center text-sm font-medium text-white/50 px-6 py-4">Cycle</th>
                  <th className="text-center text-sm font-medium text-white/50 px-6 py-4">Confidence</th>
                  <th className="text-center text-sm font-medium text-white/50 px-6 py-4">Payments</th>
                  <th className="text-right text-sm font-medium text-white/50 px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingSubscriptions.map((pending) => (
                  <PendingSubscriptionRow
                    key={pending.id}
                    pending={pending}
                    onConfirm={() => {
                      confirmPendingSubscription(pending.id).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
                      })
                    }}
                    onReject={() => {
                      rejectPendingSubscription(pending.id).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
                      })
                    }}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Subscription Alerts */}
      {filter === 'alerts' && (
        <div className="glass-card overflow-hidden">
          {alerts.length === 0 ? (
            <div className="py-12 text-center text-white/40">No subscription alerts</div>
          ) : (
            <div className="divide-y divide-white/10">
              {alerts.map((alert, idx) => (
                <AlertRow key={idx} alert={alert} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Table */}
      {filter !== 'discovered' && filter !== 'alerts' && (
        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-white/40">Loading subscriptions...</div>
          ) : filteredSubs.length === 0 ? (
            <div className="py-12 text-center text-white/40">
              {search ? 'No subscriptions match your search' : 'No subscriptions found'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">Vendor</th>
                  <th className="text-right text-sm font-medium text-white/50 px-6 py-4">Amount</th>
                  <th className="text-center text-sm font-medium text-white/50 px-6 py-4">Cycle</th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">Account</th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">Payment</th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">Project</th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">Next Due</th>
                  <th className="text-right text-sm font-medium text-white/50 px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((sub) => (
                  <SubscriptionRow
                    key={sub.id}
                    subscription={sub}
                    onEdit={() => setEditingSub(sub)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddSubscriptionModal
          projectCodes={projectCodes?.codes || []}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
            setShowAddModal(false)
          }}
        />
      )}

      {/* Edit Modal */}
      {editingSub && (
        <EditSubscriptionModal
          subscription={editingSub}
          projectCodes={projectCodes?.codes || []}
          onClose={() => setEditingSub(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
            setEditingSub(null)
          }}
        />
      )}
    </div>
  )
}

function SubscriptionRow({
  subscription,
  onEdit,
}: {
  subscription: Subscription
  onEdit: () => void
}) {
  const isUnassigned = !subscription.project_codes || subscription.project_codes.length === 0
  const isCancelled = subscription.status === 'cancelled'
  const daysUntilRenewal = subscription.renewal_date
    ? Math.ceil((new Date(subscription.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const categoryClass = CATEGORY_COLORS[subscription.category] || CATEGORY_COLORS.other
  const categoryIcon = CATEGORY_ICONS[subscription.category] || CATEGORY_ICONS.other

  return (
    <tr className={cn(
      'border-b border-white/5 hover:bg-white/5 transition-colors',
      isUnassigned && !isCancelled && 'bg-orange-500/5',
      isCancelled && 'opacity-50'
    )}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">{categoryIcon}</span>
          <div>
            <p className={cn("font-medium text-white", isCancelled && "line-through")}>
              {subscription.name}
            </p>
            <p className="text-xs text-white/40">{subscription.provider}</p>
            {isCancelled && (
              <span className="text-xs text-red-400">Cancelled</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <span className={cn("font-semibold text-white tabular-nums", isCancelled && "line-through")}>
          ${subscription.cost_per_cycle}
        </span>
        <span className="text-xs text-white/40 ml-1">{subscription.currency}</span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={cn('px-2 py-1 rounded text-xs font-medium', categoryClass)}>
          {subscription.billing_cycle}
        </span>
      </td>
      <td className="px-6 py-4">
        {subscription.account_email ? (
          <span className="text-xs text-white/60">{subscription.account_email}</span>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        {subscription.payment_method ? (
          <span className="text-xs text-white/60 flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            {formatPaymentMethod(subscription.payment_method)}
          </span>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        {subscription.project_codes && subscription.project_codes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {subscription.project_codes.map(code => (
              <span
                key={code}
                className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/70"
              >
                {code}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-orange-400 text-sm flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Unassigned
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        {subscription.renewal_date ? (
          <div>
            <p className="text-sm text-white">
              {format(new Date(subscription.renewal_date), 'MMM d')}
            </p>
            {daysUntilRenewal !== null && daysUntilRenewal <= 14 && daysUntilRenewal >= 0 && (
              <p className="text-xs text-yellow-400">{daysUntilRenewal} days</p>
            )}
          </div>
        ) : (
          <span className="text-white/40 text-sm">—</span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {subscription.login_url && (
            <a
              href={subscription.login_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={onEdit}
            className="px-3 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Edit
          </button>
        </div>
      </td>
    </tr>
  )
}

function EditSubscriptionModal({
  subscription,
  projectCodes,
  onClose,
  onSuccess,
}: {
  subscription: Subscription
  projectCodes: ProjectCode[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: subscription.name,
    provider: subscription.provider,
    category: subscription.category,
    billing_cycle: subscription.billing_cycle as 'monthly' | 'annual' | 'quarterly' | 'one-time' | 'usage',
    cost_per_cycle: subscription.cost_per_cycle,
    currency: subscription.currency,
    renewal_date: subscription.renewal_date || '',
    project_codes: subscription.project_codes || [],
    status: subscription.status,
    notes: subscription.notes || '',
    account_email: subscription.account_email || '',
    payment_method: subscription.payment_method || '',
    login_url: subscription.login_url || '',
  })
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Subscription>) => updateSubscription(subscription.id, data),
    onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const handleCancel = () => {
    updateMutation.mutate({ status: 'cancelled' })
  }

  const handleReactivate = () => {
    updateMutation.mutate({ status: 'active' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Subscription</h2>
          {subscription.status === 'cancelled' && (
            <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
              Cancelled
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/50 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Provider</label>
              <input
                type="text"
                required
                value={formData.provider}
                onChange={(e) => setFormData(d => ({ ...d, provider: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-white/50 mb-1">Amount</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.cost_per_cycle}
                onChange={(e) => setFormData(d => ({ ...d, cost_per_cycle: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(d => ({ ...d, currency: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="AUD">AUD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Cycle</label>
              <select
                value={formData.billing_cycle}
                onChange={(e) => setFormData(d => ({ ...d, billing_cycle: e.target.value as 'monthly' | 'annual' | 'quarterly' | 'one-time' }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="one-time">One-time</option>
                <option value="usage">Usage-based</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/50 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(d => ({ ...d, category: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="development">Development</option>
                <option value="design_creative">Design & Creative</option>
                <option value="marketing_crm">Marketing & CRM</option>
                <option value="productivity">Productivity</option>
                <option value="accounting">Accounting & Finance</option>
                <option value="ai_tools">AI Tools</option>
                <option value="hosting_domains">Hosting & Domains</option>
                <option value="media_entertainment">Media & Entertainment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Next Renewal</label>
              <input
                type="date"
                value={formData.renewal_date}
                onChange={(e) => setFormData(d => ({ ...d, renewal_date: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Project(s)</label>
            <select
              multiple
              value={formData.project_codes}
              onChange={(e) => setFormData(d => ({
                ...d,
                project_codes: Array.from(e.target.selectedOptions, opt => opt.value)
              }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white h-24"
            >
              {projectCodes.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-white/40 mt-1">Hold Cmd/Ctrl to select multiple</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/50 mb-1">Account Email</label>
              <input
                type="email"
                value={formData.account_email}
                onChange={(e) => setFormData(d => ({ ...d, account_email: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(d => ({ ...d, payment_method: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select card...</option>
                <option value="visa_8815">NAB Visa ****8815 (ACT)</option>
                <option value="bank_everyday">ACT Everyday Account</option>
                <option value="bank_maximiser">ACT Maximiser Account</option>
                <option value="personal">Personal Account</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Login URL</label>
            <input
              type="url"
              value={formData.login_url}
              onChange={(e) => setFormData(d => ({ ...d, login_url: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(d => ({ ...d, notes: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white h-20"
              placeholder="Optional notes..."
            />
          </div>

          {/* Cancel/Reactivate Section */}
          <div className="border-t border-white/10 pt-4 mt-4">
            {subscription.status === 'cancelled' ? (
              <button
                type="button"
                onClick={handleReactivate}
                disabled={updateMutation.isPending}
                className="w-full py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 font-medium transition-colors"
              >
                Reactivate Subscription
              </button>
            ) : showCancelConfirm ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-red-400 mb-3">Are you sure you want to cancel this subscription?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm"
                  >
                    Keep Active
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={updateMutation.isPending}
                    className="flex-1 py-2 rounded-lg bg-red-500/30 hover:bg-red-500/40 text-red-400 text-sm font-medium"
                  >
                    {updateMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="w-full py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 text-sm transition-colors"
              >
                Cancel Subscription
              </button>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-glass"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn-action flex items-center gap-2"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddSubscriptionModal({
  projectCodes,
  onClose,
  onSuccess,
}: {
  projectCodes: ProjectCode[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState<{
    name: string
    provider: string
    category: string
    billing_cycle: 'monthly' | 'annual' | 'quarterly' | 'one-time'
    cost_per_cycle: number
    currency: string
    renewal_date: string
    project_codes: string[]
    notes: string
    account_email: string
    payment_method: string
    login_url: string
  }>({
    name: '',
    provider: '',
    category: 'other',
    billing_cycle: 'monthly',
    cost_per_cycle: 0,
    currency: 'AUD',
    renewal_date: '',
    project_codes: [],
    notes: '',
    account_email: '',
    payment_method: '',
    login_url: '',
  })

  const createMutation = useMutation({
    mutationFn: createSubscription,
    onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-6">Add Subscription</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/50 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                placeholder="e.g. Claude Pro"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Provider</label>
              <input
                type="text"
                required
                value={formData.provider}
                onChange={(e) => setFormData(d => ({ ...d, provider: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                placeholder="e.g. Anthropic"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-white/50 mb-1">Amount</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.cost_per_cycle}
                onChange={(e) => setFormData(d => ({ ...d, cost_per_cycle: parseFloat(e.target.value) }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(d => ({ ...d, currency: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="AUD">AUD</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Cycle</label>
              <select
                value={formData.billing_cycle}
                onChange={(e) => setFormData(d => ({ ...d, billing_cycle: e.target.value as 'monthly' | 'annual' | 'quarterly' | 'one-time' }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="usage">Usage-based</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/50 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(d => ({ ...d, category: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="development">Development</option>
                <option value="design_creative">Design & Creative</option>
                <option value="marketing_crm">Marketing & CRM</option>
                <option value="productivity">Productivity</option>
                <option value="accounting">Accounting & Finance</option>
                <option value="ai_tools">AI Tools</option>
                <option value="hosting_domains">Hosting & Domains</option>
                <option value="media_entertainment">Media & Entertainment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Next Renewal</label>
              <input
                type="date"
                value={formData.renewal_date}
                onChange={(e) => setFormData(d => ({ ...d, renewal_date: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Project(s)</label>
            <select
              multiple
              value={formData.project_codes}
              onChange={(e) => setFormData(d => ({
                ...d,
                project_codes: Array.from(e.target.selectedOptions, opt => opt.value)
              }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white h-24"
            >
              {projectCodes.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-white/40 mt-1">Hold Cmd/Ctrl to select multiple</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/50 mb-1">Account Email</label>
              <input
                type="email"
                value={formData.account_email}
                onChange={(e) => setFormData(d => ({ ...d, account_email: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(d => ({ ...d, payment_method: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select card...</option>
                <option value="visa_8815">NAB Visa ****8815 (ACT)</option>
                <option value="bank_everyday">ACT Everyday Account</option>
                <option value="bank_maximiser">ACT Maximiser Account</option>
                <option value="personal">Personal Account</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Login URL</label>
            <input
              type="url"
              value={formData.login_url}
              onChange={(e) => setFormData(d => ({ ...d, login_url: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(d => ({ ...d, notes: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white h-20"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-glass"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-action flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Subscription
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PendingSubscriptionRow({
  pending,
  onConfirm,
  onReject,
}: {
  pending: PendingSubscription
  onConfirm: () => void
  onReject: () => void
}) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const handleConfirm = async () => {
    setIsConfirming(true)
    await onConfirm()
    setIsConfirming(false)
  }

  const handleReject = async () => {
    setIsRejecting(true)
    await onReject()
    setIsRejecting(false)
  }

  const confidenceColor = pending.discovery_confidence >= 90
    ? 'text-green-400'
    : pending.discovery_confidence >= 75
      ? 'text-yellow-400'
      : 'text-orange-400'

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-white">{pending.vendor_name}</p>
          <p className="text-xs text-white/40">via {pending.discovery_source}</p>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="font-semibold text-white tabular-nums">
          ${pending.detected_amount.toFixed(2)}
        </span>
        <span className="text-xs text-white/40 ml-1">{pending.detected_currency}</span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className="px-2 py-1 rounded text-xs font-medium bg-white/10 text-white/70">
          {pending.detected_cycle}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={cn('font-semibold', confidenceColor)}>
          {pending.discovery_confidence}%
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className="text-white/70">{pending.payment_count}</span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleReject}
            disabled={isRejecting}
            className="p-1.5 rounded hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-colors"
            title="Reject (not a subscription)"
          >
            {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="px-3 py-1 rounded text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors flex items-center gap-1"
          >
            {isConfirming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Confirm
          </button>
        </div>
      </td>
    </tr>
  )
}

function AlertRow({ alert }: { alert: SubscriptionAlert }) {
  const name = alert.vendor_name || alert.name || alert.provider || 'Unknown'

  const alertIcon = alert.alert_status === 'possibly_cancelled' ? '❌'
    : alert.alert_status === 'price_change' ? '💰'
      : alert.alert_status === 'overdue_renewal' ? '📅' : '⚠️'

  const alertBg = alert.alert_status === 'possibly_cancelled' ? 'bg-red-500/10'
    : alert.alert_status === 'price_change' ? 'bg-yellow-500/10'
      : 'bg-orange-500/10'

  const alertText = alert.alert_status === 'possibly_cancelled' ? 'text-red-400'
    : alert.alert_status === 'price_change' ? 'text-yellow-400'
      : 'text-orange-400'

  return (
    <div className={cn('px-6 py-4 flex items-center justify-between', alertBg)}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{alertIcon}</span>
        <div>
          <p className="font-medium text-white">{name}</p>
          <p className={cn('text-sm', alertText)}>
            {alert.alert_status === 'possibly_cancelled' && (
              <>Possibly cancelled - {alert.missed_payments} missed payments</>
            )}
            {alert.alert_status === 'price_change' && (
              <>Price changed: ${alert.expected_amount?.toFixed(2)} → ${alert.actual_amount?.toFixed(2)} ({alert.variance_pct}%)</>
            )}
            {alert.alert_status === 'overdue_renewal' && (
              <>Renewal overdue</>
            )}
          </p>
        </div>
      </div>
      <span className={cn(
        'px-2 py-1 rounded text-xs font-medium',
        alert.alert_priority === 'high' ? 'bg-red-500/20 text-red-400'
          : alert.alert_priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-white/10 text-white/50'
      )}>
        {alert.alert_priority}
      </span>
    </div>
  )
}
