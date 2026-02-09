'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Tag,
  ArrowLeft,
  Search,
  Check,
  Zap,
  Filter,
  FlaskConical,
} from 'lucide-react'
import { ProgressBar } from '@tremor/react'
import { getUntaggedTransactions, tagTransactions, type UntaggedGroup } from '@/lib/api'
import { cn } from '@/lib/utils'

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toLocaleString()}`
}

type ViewTab = 'tagger' | 'rd'

export default function TaggerPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ViewTab>('tagger')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'SPEND' | 'RECEIVE'>('all')
  const [selectedCodes, setSelectedCodes] = useState<Record<string, string>>({})
  const [taggedGroups, setTaggedGroups] = useState<Set<string>>(new Set())
  const [skippedGroups, setSkippedGroups] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'untagged'],
    queryFn: getUntaggedTransactions,
  })

  const tagMutation = useMutation({
    mutationFn: tagTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'untagged'] })
    },
  })

  const groups = data?.groups || []
  const projectCodes = data?.projectCodes || []
  const totalUntagged = data?.totalUntagged || 0
  const totalTransactions = data?.totalTransactions || 0
  const rd = data?.rd
  const tagged = totalTransactions - totalUntagged

  // Count newly tagged in this session
  const sessionTaggedCount = useMemo(() => {
    let count = 0
    for (const key of taggedGroups) {
      const g = groups.find(g => `${g.contactName}::${g.type}` === key)
      if (g) count += g.count
    }
    return count
  }, [taggedGroups, groups])

  const effectiveCoverage = totalTransactions > 0
    ? Math.round(((tagged + sessionTaggedCount) / totalTransactions) * 100)
    : 0

  // Filter groups
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (taggedGroups.has(`${g.contactName}::${g.type}`)) return false
      if (skippedGroups.has(`${g.contactName}::${g.type}`)) return false
      if (typeFilter !== 'all' && g.type !== typeFilter) return false
      if (searchQuery) {
        return g.contactName.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })
  }, [groups, typeFilter, searchQuery, taggedGroups, skippedGroups])

  // Groups with suggestions
  const suggestedGroups = useMemo(() => {
    return filteredGroups.filter(g => g.suggestedCode)
  }, [filteredGroups])

  // R&D eligible groups (for R&D tab)
  const rdGroups = useMemo(() => {
    return filteredGroups.filter(g => g.rdEligible)
  }, [filteredGroups])

  async function handleTag(group: UntaggedGroup) {
    const key = `${group.contactName}::${group.type}`
    const code = selectedCodes[key] || group.suggestedCode
    if (!code) return

    await tagMutation.mutateAsync({
      contactName: group.contactName,
      type: group.type,
      projectCode: code,
    })
    setTaggedGroups(prev => new Set(prev).add(key))
  }

  async function handleTagAll() {
    const targetGroups = activeTab === 'rd' ? rdGroups.filter(g => g.suggestedCode) : suggestedGroups
    for (const group of targetGroups) {
      const key = `${group.contactName}::${group.type}`
      const code = selectedCodes[key] || group.suggestedCode
      if (!code) continue

      await tagMutation.mutateAsync({
        contactName: group.contactName,
        type: group.type,
        projectCode: code,
      })
      setTaggedGroups(prev => new Set(prev).add(key))
    }
  }

  function handleSkip(group: UntaggedGroup) {
    const key = `${group.contactName}::${group.type}`
    setSkippedGroups(prev => new Set(prev).add(key))
  }

  function handleCodeChange(group: UntaggedGroup, code: string) {
    const key = `${group.contactName}::${group.type}`
    setSelectedCodes(prev => ({ ...prev, [key]: code }))
  }

  const displayGroups = activeTab === 'rd' ? rdGroups : filteredGroups
  const displaySuggested = activeTab === 'rd' ? rdGroups.filter(g => g.suggestedCode) : suggestedGroups

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/finance" className="text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Tag className="h-8 w-8 text-amber-400" />
            Transaction Tagger
          </h1>
        </div>
        <p className="text-lg text-white/60">
          {totalUntagged.toLocaleString()} untagged of {totalTransactions.toLocaleString()} transactions
        </p>

        {/* Coverage bar */}
        <div className="mt-4 glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Project code coverage</span>
            <span className="text-sm font-semibold text-white">
              {effectiveCoverage}%
              {sessionTaggedCount > 0 && (
                <span className="text-green-400 ml-2">+{sessionTaggedCount} this session</span>
              )}
            </span>
          </div>
          <ProgressBar
            value={effectiveCoverage}
            color={effectiveCoverage >= 80 ? 'green' : effectiveCoverage >= 50 ? 'yellow' : 'red'}
            className="h-3"
          />
        </div>

        {/* R&D Summary Card */}
        {rd && (
          <div className="mt-4 glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-semibold text-white">R&D Tax Incentive Tracker</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-white/40">R&D Spend (tagged)</div>
                <div className="text-lg font-semibold text-white tabular-nums">{formatMoney(rd.totalSpend)}</div>
              </div>
              <div>
                <div className="text-xs text-white/40">$20K Threshold</div>
                <div className={cn(
                  'text-lg font-semibold tabular-nums',
                  rd.totalSpend >= rd.threshold ? 'text-green-400' : 'text-amber-400'
                )}>
                  {Math.round((rd.totalSpend / rd.threshold) * 100)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40">43.5% Refund Potential</div>
                <div className="text-lg font-semibold text-purple-400 tabular-nums">
                  {formatMoney(Math.round(rd.totalSpend * rd.refundRate))}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40">Note</div>
                <div className="text-xs text-white/50">
                  Excludes wages (biggest R&D item). With payroll: ~$62K/yr refund potential.
                </div>
              </div>
            </div>
            {/* R&D by project mini-bar */}
            {Object.keys(rd.byProject).length > 0 && (
              <div className="mt-3 flex gap-1">
                {Object.entries(rd.byProject)
                  .sort(([, a], [, b]) => b - a)
                  .map(([code, amount]) => {
                    const pct = rd.totalSpend > 0 ? (amount / rd.totalSpend) * 100 : 0
                    return (
                      <div
                        key={code}
                        className="bg-purple-500/30 rounded px-2 py-1 text-xs text-purple-300"
                        title={`${code}: ${formatMoney(amount)}`}
                        style={{ flex: Math.max(pct, 5) }}
                      >
                        {code}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('tagger')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors',
            activeTab === 'tagger' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/70'
          )}
        >
          <Tag className="h-4 w-4" />
          All Untagged
        </button>
        <button
          onClick={() => setActiveTab('rd')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors',
            activeTab === 'rd' ? 'bg-purple-500/20 text-purple-300' : 'text-white/50 hover:text-white/70'
          )}
        >
          <FlaskConical className="h-4 w-4" />
          R&D Eligible ({rdGroups.length})
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <Filter className="h-4 w-4 text-white/40 ml-2" />
          {(['all', 'SPEND', 'RECEIVE'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                typeFilter === t
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/70'
              )}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        {/* Tag All Suggested */}
        {displaySuggested.length > 0 && (
          <button
            onClick={handleTagAll}
            disabled={tagMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            Tag All Suggested ({displaySuggested.length})
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="glass-card p-12 text-center text-white/40">Loading transactions...</div>
      ) : displayGroups.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Check className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white">
            {activeTab === 'rd' ? 'No untagged R&D transactions' : 'All caught up!'}
          </p>
          <p className="text-white/50 mt-1">
            {activeTab === 'rd'
              ? 'All R&D-eligible transactions have been tagged.'
              : 'No more untagged transactions to review.'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Type</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-white/50">Count</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-white/50">Total</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Dates</th>
                {activeTab === 'rd' && (
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/50">R&D</th>
                )}
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Project Code</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-white/50">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayGroups.map(group => {
                const key = `${group.contactName}::${group.type}`
                const currentCode = selectedCodes[key] || group.suggestedCode || ''

                return (
                  <tr
                    key={key}
                    className={cn(
                      'border-b border-white/5 hover:bg-white/5 transition-colors',
                      group.suggestedCode && 'bg-amber-500/5',
                      activeTab === 'rd' && 'bg-purple-500/5'
                    )}
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm text-white">{group.contactName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        group.type === 'SPEND'
                          ? 'bg-red-500/20 text-red-400'
                          : group.type === 'RECEIVE'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/10 text-white/50'
                      )}>
                        {group.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-white tabular-nums">{group.count}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-white tabular-nums">{formatMoney(group.total)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-white/40">
                        {group.sampleDates.join(', ')}
                      </span>
                    </td>
                    {activeTab === 'rd' && (
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                          R&D
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <select
                        value={currentCode}
                        onChange={e => handleCodeChange(group, e.target.value)}
                        className={cn(
                          'bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white w-48',
                          'focus:outline-none focus:border-white/30',
                          group.suggestedCode && !selectedCodes[key] && 'border-amber-500/30'
                        )}
                      >
                        <option value="">Select project...</option>
                        {projectCodes.map(pc => (
                          <option key={pc.code} value={pc.code}>
                            {pc.code} - {pc.name}
                          </option>
                        ))}
                      </select>
                      {group.suggestedCode && !selectedCodes[key] && (
                        <span className="text-xs text-amber-400 mt-0.5 block">suggested</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTag(group)}
                          disabled={!currentCode || tagMutation.isPending}
                          className={cn(
                            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                            currentCode
                              ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                              : 'bg-white/5 text-white/30 cursor-not-allowed'
                          )}
                        >
                          Tag {group.count}
                        </button>
                        <button
                          onClick={() => handleSkip(group)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 text-white/40 transition-colors"
                        >
                          Skip
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary footer */}
      <div className="mt-4 text-sm text-white/40 text-center">
        Showing {displayGroups.length} vendor groups
        {skippedGroups.size > 0 && ` (${skippedGroups.size} skipped)`}
        {taggedGroups.size > 0 && ` (${taggedGroups.size} tagged)`}
      </div>
    </div>
  )
}
