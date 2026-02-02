'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  Receipt,
  ArrowLeft,
  Flame,
  Trophy,
  Sparkles,
  Check,
  X,
  Mail,
  Upload,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  RefreshCw,
  Filter,
  Plane,
  CreditCard,
  Package,
  Car,
} from 'lucide-react'
import {
  getUnmatchedReceipts,
  getReceiptScore,
  getReceiptAchievements,
  matchReceipt,
  skipReceipt,
  scanForReceipts,
  type Receipt as ReceiptType,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import ReceiptSearch from '@/components/finance/ReceiptSearch'

const CATEGORY_CONFIG: Record<string, { icon: typeof Plane; color: string; label: string }> = {
  travel: { icon: Plane, color: 'text-blue-400 bg-blue-500/20', label: 'Travel' },
  subscription: { icon: CreditCard, color: 'text-purple-400 bg-purple-500/20', label: 'Subscriptions' },
  other: { icon: Package, color: 'text-gray-400 bg-gray-500/20', label: 'Other' },
}

export default function ReceiptsPage() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [vendorFilter, setVendorFilter] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const { data: receiptsData, isLoading } = useQuery({
    queryKey: ['receipts', 'unmatched'],
    queryFn: () => getUnmatchedReceipts({ limit: 500 }),
  })

  const { data: scoreData } = useQuery({
    queryKey: ['receipts', 'score'],
    queryFn: getReceiptScore,
  })

  const { data: achievementsData } = useQuery({
    queryKey: ['receipts', 'achievements'],
    queryFn: getReceiptAchievements,
  })

  const matchMutation = useMutation({
    mutationFn: (receiptId: string) => matchReceipt(receiptId, 'manual'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
    },
  })

  const skipMutation = useMutation({
    mutationFn: ({ receiptId, reason }: { receiptId: string; reason: string }) =>
      skipReceipt(receiptId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
    },
  })

  const scanMutation = useMutation({
    mutationFn: () => scanForReceipts({ daysBack: 120, skipAI: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
    },
  })

  const allReceipts = receiptsData?.receipts || []

  // Group by vendor for summary
  const vendorSummary = useMemo(() => {
    const summary: Record<string, { count: number; amount: number; category: string }> = {}
    allReceipts.forEach((r) => {
      const vendor = r.vendor_name || 'Unknown'
      if (!summary[vendor]) summary[vendor] = { count: 0, amount: 0, category: r.category || 'other' }
      summary[vendor].count++
      summary[vendor].amount += r.amount || 0
    })
    return Object.entries(summary)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
  }, [allReceipts])

  // Group by category for summary
  const categorySummary = useMemo(() => {
    const summary: Record<string, { count: number; amount: number }> = {}
    allReceipts.forEach((r) => {
      const cat = r.category || 'other'
      if (!summary[cat]) summary[cat] = { count: 0, amount: 0 }
      summary[cat].count++
      summary[cat].amount += r.amount || 0
    })
    return summary
  }, [allReceipts])

  // Filter receipts
  const filteredReceipts = useMemo(() => {
    let filtered = allReceipts
    if (vendorFilter) {
      filtered = filtered.filter((r) => r.vendor_name === vendorFilter)
    }
    if (categoryFilter) {
      filtered = filtered.filter((r) => (r.category || 'other') === categoryFilter)
    }
    return filtered
  }, [allReceipts, vendorFilter, categoryFilter])

  const displayedReceipts = showAll ? filteredReceipts : filteredReceipts.slice(0, 50)
  const score = scoreData?.score || 0
  const streak = scoreData?.streak || 0

  const clearFilters = () => {
    setVendorFilter(null)
    setCategoryFilter(null)
  }

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
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Receipt className="h-8 w-8 text-green-400" />
                Receipt Reconciliation
              </h1>
              <p className="text-lg text-white/60 mt-1">
                {allReceipts.length} transactions need receipts
              </p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 text-orange-400">
                <Flame className="h-5 w-5" />
                <span className="font-semibold">{streak}-week streak!</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="btn-glass flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Find Receipt
            </button>
            <button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="btn-action flex items-center gap-2"
            >
              {scanMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {scanMutation.isPending ? 'Scanning...' : 'Run AI Match'}
            </button>
          </div>
        </div>
      </header>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(categorySummary).map(([category, stats]) => {
          const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other
          const Icon = config.icon
          const isActive = categoryFilter === category
          return (
            <button
              key={category}
              onClick={() => setCategoryFilter(isActive ? null : category)}
              className={cn(
                'glass-card p-4 text-left transition-all',
                isActive && 'ring-2 ring-green-500'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('p-2 rounded-lg', config.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-white font-medium">{config.label}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{stats.count}</span>
                <span className="text-sm text-white/50">${stats.amount.toLocaleString()}</span>
              </div>
            </button>
          )
        })}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
              <Check className="h-4 w-4" />
            </div>
            <span className="text-white font-medium">Reconciled</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{score}%</span>
            <span className="text-sm text-white/50">this week</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Vendor Filter Sidebar */}
        <div className="col-span-3">
          <div className="glass-card p-4 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Vendor
              </h3>
              {(vendorFilter || categoryFilter) && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-white/50 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1">
              {vendorSummary.map(([vendor, stats]) => {
                const isActive = vendorFilter === vendor
                return (
                  <button
                    key={vendor}
                    onClick={() => setVendorFilter(isActive ? null : vendor)}
                    className={cn(
                      'w-full p-2 rounded-lg text-left text-sm flex items-center justify-between transition-colors',
                      isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'hover:bg-white/5 text-white/70'
                    )}
                  >
                    <span className="truncate">{vendor}</span>
                    <span className={cn(
                      'ml-2 px-2 py-0.5 rounded-full text-xs',
                      isActive ? 'bg-green-500/30' : 'bg-white/10'
                    )}>
                      {stats.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Quick Capture */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Quick Capture
              </h3>

              {/* Email Forward */}
              <div className="p-3 rounded-lg bg-white/5 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-blue-400" />
                  <p className="text-xs font-medium text-white">Forward to Dext</p>
                </div>
                <code className="text-xs bg-white/10 px-2 py-1 rounded text-blue-400 block">
                  nicmarchesi@dext.cc
                </code>
              </div>

              {/* Search Email */}
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2 text-sm text-white/70"
              >
                <Search className="h-4 w-4" />
                Search Gmail...
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="col-span-9">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {vendorFilter || categoryFilter ? (
                  <>
                    {vendorFilter && <span>{vendorFilter}</span>}
                    {categoryFilter && !vendorFilter && (
                      <span className="capitalize">{categoryFilter}</span>
                    )}
                    <span className="text-white/50 ml-2">({filteredReceipts.length})</span>
                  </>
                ) : (
                  <>Unmatched Transactions ({allReceipts.length})</>
                )}
              </h2>
              {filteredReceipts.length > 50 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm text-green-400 hover:text-green-300"
                >
                  {showAll ? 'Show less' : `Show all ${filteredReceipts.length}`}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-white/40">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading transactions...
              </div>
            ) : displayedReceipts.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <p className="text-lg font-medium text-green-400">
                  {vendorFilter || categoryFilter ? 'No matches for filter' : 'All caught up!'}
                </p>
                <p className="text-sm text-white/50 mt-1">
                  {vendorFilter || categoryFilter
                    ? 'Try a different filter'
                    : 'No transactions need receipts'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedReceipts.map((receipt) => (
                  <TransactionCard
                    key={receipt.id}
                    receipt={receipt}
                    isExpanded={expandedId === receipt.id}
                    onToggle={() => setExpandedId(expandedId === receipt.id ? null : receipt.id)}
                    onMatch={() => matchMutation.mutate(receipt.id)}
                    onSkip={(reason) => skipMutation.mutate({ receiptId: receipt.id, reason })}
                    isMatching={matchMutation.isPending}
                    isSkipping={skipMutation.isPending}
                    onSearch={() => setSearchOpen(true)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <ReceiptSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onMatch={(txId, emailId) => {
          console.log('Link:', txId, 'to', emailId)
          setSearchOpen(false)
          queryClient.invalidateQueries({ queryKey: ['receipts'] })
        }}
      />
    </div>
  )
}

function TransactionCard({
  receipt,
  isExpanded,
  onToggle,
  onMatch,
  onSkip,
  isMatching,
  isSkipping,
  onSearch,
}: {
  receipt: ReceiptType
  isExpanded: boolean
  onToggle: () => void
  onMatch: () => void
  onSkip: (reason: string) => void
  isMatching: boolean
  isSkipping: boolean
  onSearch: () => void
}) {
  const hasSuggestion = receipt.suggested_email_subject && receipt.match_confidence
  const confidence = receipt.match_confidence || 0
  const categoryConfig = CATEGORY_CONFIG[receipt.category || 'other'] || CATEGORY_CONFIG.other
  const CategoryIcon = categoryConfig.icon

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      hasSuggestion
        ? 'border-green-500/30 bg-green-500/5'
        : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'
    )}>
      {/* Main Row */}
      <div
        className="p-3 flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn('p-2 rounded-lg', categoryConfig.color)}>
            <CategoryIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{receipt.vendor_name || 'Unknown'}</p>
            <p className="text-xs text-white/40">
              {receipt.transaction_date ? format(new Date(receipt.transaction_date), 'MMM d, yyyy') : 'No date'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white tabular-nums">
            ${receipt.amount?.toLocaleString() || '0'}
          </span>

          {!isExpanded && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onMatch(); }}
                disabled={isMatching}
                className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                title="Mark as reconciled"
              >
                {isMatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onSkip('no_receipt_needed'); }}
                disabled={isSkipping}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 transition-colors"
                title="Skip"
              >
                {isSkipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </button>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-white/40" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/40" />
          )}
        </div>
      </div>

      {/* Suggestion Row */}
      {hasSuggestion && !isExpanded && (
        <div className="px-3 pb-3">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">
                {Math.round(confidence * 100)}% match
              </span>
              <span className="text-xs text-white/50 truncate max-w-[200px]">
                {receipt.suggested_email_subject}
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onMatch(); }}
              disabled={isMatching}
              className="text-xs text-green-400 hover:text-green-300 font-medium"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-white/10">
          <div className="pt-3 space-y-3">
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onMatch}
                disabled={isMatching}
                className="flex-1 btn-action flex items-center justify-center gap-2 text-sm py-2"
              >
                {isMatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Mark Reconciled
              </button>
              <button
                onClick={onSearch}
                className="btn-glass flex items-center gap-2 text-sm py-2"
              >
                <Search className="h-4 w-4" />
                Find in Gmail
              </button>
            </div>

            {/* Skip Options */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-white/40">Skip:</span>
              <button
                onClick={() => onSkip('no_receipt_needed')}
                disabled={isSkipping}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white/70 transition-colors"
              >
                No receipt needed
              </button>
              <button
                onClick={() => onSkip('bank_fee')}
                disabled={isSkipping}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white/70 transition-colors"
              >
                Bank fee
              </button>
              <button
                onClick={() => onSkip('deferred')}
                disabled={isSkipping}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white/70 transition-colors"
              >
                Check later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
